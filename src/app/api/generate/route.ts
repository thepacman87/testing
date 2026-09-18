import { NextRequest, NextResponse } from "next/server";
import {
  buildPollinationsUrl,
  POLLINATIONS_LABEL,
} from "@/lib/local/pollinations";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_PROMPT = 2000;

/**
 * Keyless text-to-image proxy → Pollinations.ai
 * No user API key. Prompts are sent to the public Pollinations service.
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

    const width = clampInt(body.width, 256, 1280, 768);
    const height = clampInt(body.height, 256, 1280, 768);
    const seed =
      typeof body.seed === "number"
        ? body.seed
        : Math.floor(Math.random() * 1e9);

    let lastError = "unknown";
    for (let attempt = 1; attempt <= 2; attempt++) {
      const url = buildPollinationsUrl(prompt, {
        width,
        height,
        seed: attempt === 1 ? seed : seed + attempt,
      });
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 120_000);
        let res: Response;
        try {
          res = await fetch(url, {
            signal: ctrl.signal,
            headers: { Accept: "image/*" },
            cache: "no-store",
          });
        } finally {
          clearTimeout(timer);
        }
        if (!res.ok) {
          lastError = `HTTP ${res.status}`;
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1000) {
          lastError = "empty image";
          continue;
        }
        const contentType = res.headers.get("content-type") || "image/jpeg";
        if (!contentType.startsWith("image/")) {
          lastError = "non-image response";
          continue;
        }
        const imageDataUrl = `data:${contentType};base64,${buf.toString("base64")}`;
        return NextResponse.json({
          imageDataUrl,
          meta: POLLINATIONS_LABEL,
          provider: "pollinations",
        });
      } catch (err) {
        lastError =
          err instanceof Error
            ? err.name === "AbortError"
              ? "timeout"
              : err.message
            : "fetch failed";
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    return NextResponse.json(
      {
        error: `Free public generate failed (${lastError}). Try again in a moment.`,
      },
      { status: 502 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function clampInt(
  v: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
