import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PROMPT = 2000;
const SIDECAR =
  process.env.PIXFORGE_AI_URL?.replace(/\/$/, "") || "http://127.0.0.1:8100";

/**
 * Proxy to the local open-weight sidecar (SD-Turbo).
 * Default path never calls Pollinations/FAL/OpenAI/etc.
 * Optional external endpoint only if ENABLE_EXTERNAL_GENERATE=true (opt-in).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT) {
      return NextResponse.json({ error: "Prompt is too long" }, { status: 400 });
    }

    const width = clampInt(body.width, 256, 768, 512);
    const height = clampInt(body.height, 256, 768, 512);
    const steps = clampInt(body.steps, 1, 4, 1);
    const seed =
      typeof body.seed === "number"
        ? body.seed
        : Math.floor(Math.random() * 1e9);

    // Opt-in external (disabled by default)
    if (
      body.useExternal === true &&
      process.env.ENABLE_EXTERNAL_GENERATE === "true"
    ) {
      return NextResponse.json(
        {
          error:
            "External generate is disabled in this build’s default path. Start the local AI sidecar.",
        },
        { status: 403 }
      );
    }

    // Probe sidecar
    let healthOk = false;
    let healthMsg = "";
    try {
      const h = await fetch(`${SIDECAR}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (h.ok) {
        const hj = await h.json();
        healthOk = true;
        if (!hj.ready && hj.loading) {
          return NextResponse.json(
            {
              error:
                "Local model is still downloading/loading. Wait for the AI sidecar, then retry.",
              loading: true,
              progress: hj.progress ?? 0,
              message: hj.message,
            },
            { status: 503 }
          );
        }
        if (!hj.ready && hj.error) {
          return NextResponse.json(
            { error: `Local model failed: ${hj.error}` },
            { status: 503 }
          );
        }
      } else {
        healthMsg = `sidecar health HTTP ${h.status}`;
      }
    } catch {
      healthMsg = "sidecar unreachable";
    }

    if (!healthOk) {
      return NextResponse.json(
        {
          error:
            "Local AI sidecar is not running. Start it with `npm run ai` (or `npm run dev`, which starts both). No external AI is used by default.",
          hint: healthMsg,
          sidecar: SIDECAR,
        },
        { status: 503 }
      );
    }

    let lastError = "unknown";
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 280_000);
        let res: Response;
        try {
          res = await fetch(`${SIDECAR}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              width,
              height,
              steps,
              seed: attempt === 1 ? seed : seed + attempt,
            }),
            signal: ctrl.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        const data = await res.json();
        if (!res.ok) {
          lastError = data.detail || data.error || `HTTP ${res.status}`;
          if (attempt === 1) await sleep(500);
          continue;
        }
        if (!data.imageDataUrl) {
          lastError = "empty image from sidecar";
          continue;
        }
        return NextResponse.json({
          imageDataUrl: data.imageDataUrl,
          meta: data.meta || "Local model · SD-Turbo · no external AI",
          provider: "local-sd-turbo",
          device: data.device,
          model: data.model,
          elapsed_sec: data.elapsed_sec,
          seed: data.seed,
        });
      } catch (err) {
        lastError =
          err instanceof Error
            ? err.name === "AbortError"
              ? "timeout (CPU generate can take several minutes)"
              : err.message
            : "fetch failed";
        if (attempt === 1) await sleep(500);
      }
    }

    return NextResponse.json(
      { error: `Local generate failed (${lastError})` },
      { status: 502 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
