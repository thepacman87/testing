/**
 * Keyless public text-to-image via Pollinations.ai
 * https://image.pollinations.ai/prompt/{encodeURIComponent(prompt)}
 *
 * No API key. Prompts leave the device (privacy tradeoff).
 */

export const POLLINATIONS_LABEL = "Free public generate (Pollinations · no key)";

export type PollinationsOptions = {
  width?: number;
  height?: number;
  seed?: number;
  model?: string;
  /** Abort after ms (default 90s) */
  timeoutMs?: number;
};

export function buildPollinationsUrl(
  prompt: string,
  opts: PollinationsOptions = {}
): string {
  const width = opts.width ?? 768;
  const height = opts.height ?? 768;
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: "true",
    enhance: "true",
    seed: String(seed),
  });
  if (opts.model) params.set("model", opts.model);
  const encoded = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      // cache-bust occasional CDN quirks on retry
      cache: "no-store",
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  // Prefer FileReader in browser; Buffer path for Node proxy tests
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image blob"));
      reader.readAsDataURL(blob);
    });
  }
  const ab = await blob.arrayBuffer();
  const b64 = Buffer.from(ab).toString("base64");
  const type = blob.type || "image/jpeg";
  return `data:${type};base64,${b64}`;
}

/**
 * Fetch an image from Pollinations with one automatic retry.
 * Tries direct public URL first; on failure the caller may use /api/generate proxy.
 */
export async function generateViaPollinations(
  prompt: string,
  opts: PollinationsOptions = {}
): Promise<{ imageDataUrl: string; url: string; meta: string }> {
  if (!prompt.trim()) {
    throw new Error("Prompt is required");
  }
  const timeoutMs = opts.timeoutMs ?? 120_000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const seed =
      attempt === 1
        ? opts.seed
        : (opts.seed ?? Math.floor(Math.random() * 1e9)) + attempt;
    const url = buildPollinationsUrl(prompt, { ...opts, seed });
    try {
      const res = await fetchWithTimeout(url, timeoutMs);
      if (!res.ok) {
        throw new Error(`Pollinations HTTP ${res.status}`);
      }
      const blob = await res.blob();
      if (!blob || blob.size < 1000) {
        throw new Error("Pollinations returned an empty image");
      }
      const type = blob.type || "image/jpeg";
      if (!type.startsWith("image/")) {
        throw new Error("Pollinations did not return an image");
      }
      const imageDataUrl = await blobToDataUrl(blob);
      return {
        imageDataUrl,
        url,
        meta: POLLINATIONS_LABEL,
      };
    } catch (err) {
      lastError =
        err instanceof Error
          ? err.name === "AbortError"
            ? new Error("Pollinations timed out")
            : err
          : new Error("Pollinations request failed");
      // brief pause before retry
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  throw lastError ?? new Error("Free public generate failed");
}

/**
 * Prefer same-origin proxy (avoids rare CORS/network blocks), then direct.
 */
export async function generateViaPollinationsWithProxy(
  prompt: string,
  opts: PollinationsOptions = {}
): Promise<{ imageDataUrl: string; meta: string }> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  let lastError: Error | null = null;

  // 1) Same-origin API proxy (no user API key)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const seed =
        attempt === 1
          ? opts.seed ?? Math.floor(Math.random() * 1e9)
          : Math.floor(Math.random() * 1e9);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            width: opts.width ?? 768,
            height: opts.height ?? 768,
            seed,
          }),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Generate proxy HTTP ${res.status}`);
      }
      if (!data.imageDataUrl) {
        throw new Error("Generate proxy returned no image");
      }
      return {
        imageDataUrl: data.imageDataUrl,
        meta: data.meta || POLLINATIONS_LABEL,
      };
    } catch (err) {
      lastError =
        err instanceof Error
          ? err.name === "AbortError"
            ? new Error("Free public generate timed out")
            : err
          : new Error("Free public generate failed");
      if (attempt === 1) await new Promise((r) => setTimeout(r, 500));
    }
  }

  // 2) Direct Pollinations from the browser
  try {
    const direct = await generateViaPollinations(prompt, opts);
    return { imageDataUrl: direct.imageDataUrl, meta: direct.meta };
  } catch (err) {
    const msg =
      (err instanceof Error ? err.message : "unknown") ||
      (lastError ? lastError.message : "unknown");
    throw new Error(
      `Free public generate failed (${msg}). Check your network or try again.`
    );
  }
}
