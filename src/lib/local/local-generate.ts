/**
 * Client helper for local open-weight generate via Next /api/generate → sidecar.
 * No third-party AI endpoints.
 */

export const LOCAL_GENERATE_LABEL = "Local model · SD-Turbo · no external AI";

export type LocalGenOptions = {
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  timeoutMs?: number;
};

export async function generateLocalPhotoreal(
  prompt: string,
  opts: LocalGenOptions = {}
): Promise<{ imageDataUrl: string; meta: string; device?: string }> {
  if (!prompt.trim()) throw new Error("Prompt is required");
  const timeoutMs = opts.timeoutMs ?? 300_000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            width: opts.width ?? 512,
            height: opts.height ?? 512,
            steps: opts.steps ?? 1,
            seed:
              attempt === 1
                ? opts.seed ?? Math.floor(Math.random() * 1e9)
                : Math.floor(Math.random() * 1e9),
          }),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Generate HTTP ${res.status}`);
      }
      if (!data.imageDataUrl) {
        throw new Error("Local generate returned no image");
      }
      return {
        imageDataUrl: data.imageDataUrl,
        meta: data.meta || LOCAL_GENERATE_LABEL,
        device: data.device,
      };
    } catch (err) {
      lastError =
        err instanceof Error
          ? err.name === "AbortError"
            ? new Error(
                "Local generate timed out (CPU SD-Turbo can take several minutes)"
              )
            : err
          : new Error("Local generate failed");
      if (attempt === 1) await new Promise((r) => setTimeout(r, 800));
    }
  }

  throw lastError ?? new Error("Local generate failed");
}

/** Poll sidecar readiness through Next health or direct message. */
export async function fetchGenerateStatus(): Promise<{
  sidecar: boolean;
  message: string;
}> {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    return {
      sidecar: Boolean(data.sidecarReady),
      message: data.message || "",
    };
  } catch {
    return { sidecar: false, message: "Health check failed" };
  }
}
