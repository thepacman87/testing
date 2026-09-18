import { NextRequest, NextResponse } from "next/server";
import { editWithFal } from "@/lib/fal-edit";
import { editWithMock } from "@/lib/mock-edit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_PROMPT = 2000;
const MAX_IMAGE_CHARS = 12_000_000;

/**
 * Optional cloud edit endpoint (FAL). Default product path is local/on-device
 * in the browser — this route is only used when the user enables Cloud mode
 * and FAL_KEY is configured on the server.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const image = typeof body.image === "string" ? body.image : "";

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT) {
      return NextResponse.json({ error: "Prompt is too long" }, { status: 400 });
    }
    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }
    if (image.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ error: "Image is too large" }, { status: 400 });
    }
    if (!image.startsWith("data:image/") && !image.startsWith("https://")) {
      return NextResponse.json(
        { error: "Image must be a data URL or https URL" },
        { status: 400 }
      );
    }

    if (process.env.MOCK_MODE === "true" || !process.env.FAL_KEY) {
      const result = await editWithMock(image, prompt);
      return NextResponse.json({
        imageUrl: result.imageUrl,
        provider: "mock",
        providerLabel: "Cloud unavailable — use Local mode",
        mock: true,
        notice:
          "No FAL_KEY on server. Switch to Local mode (default) for on-device AI.",
      });
    }

    try {
      const result = await editWithFal(image, prompt);
      return NextResponse.json({
        imageUrl: result.imageUrl,
        provider: "fal",
        providerLabel: "FAL · FLUX.1 Kontext [pro]",
        seed: result.seed,
        mock: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "FAL edit failed";
      console.error("[edit] FAL error:", message);
      return NextResponse.json(
        { error: `Cloud edit failed: ${message}` },
        { status: 502 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[edit] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
