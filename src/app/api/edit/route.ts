import { NextRequest, NextResponse } from "next/server";
import { editWithFal } from "@/lib/fal-edit";
import { editWithMock } from "@/lib/mock-edit";
import { providerLabel, resolveProvider } from "@/lib/provider";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_PROMPT = 2000;
const MAX_IMAGE_CHARS = 12_000_000; // ~9MB base64-ish ceiling

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

    const provider = resolveProvider();

    if (provider === "fal") {
      try {
        const result = await editWithFal(image, prompt);
        return NextResponse.json({
          imageUrl: result.imageUrl,
          provider: "fal",
          providerLabel: providerLabel("fal"),
          seed: result.seed,
          mock: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "FAL edit failed";
        console.error("[edit] FAL error:", message);
        return NextResponse.json(
          { error: `Image edit failed: ${message}` },
          { status: 502 }
        );
      }
    }

    const result = await editWithMock(image, prompt);
    return NextResponse.json({
      imageUrl: result.imageUrl,
      provider: "mock",
      providerLabel: providerLabel("mock"),
      mock: true,
      notice:
        "Running in demo/mock mode. Set FAL_KEY in .env.local for real AI edits.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[edit] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
