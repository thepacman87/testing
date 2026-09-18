import { NextResponse } from "next/server";

export async function GET() {
  const fal = Boolean(process.env.FAL_KEY);
  const mockForced = process.env.MOCK_MODE === "true";
  const cloudAvailable = fal && !mockForced;

  return NextResponse.json({
    ok: true,
    defaultMode: "local",
    defaultGenerate: "pollinations",
    defaultGenerateLabel: "Free public generate (Pollinations · no key)",
    cloudAvailable,
    provider: cloudAvailable ? "fal-optional" : "pollinations+local",
    providerLabel: cloudAvailable
      ? "Pollinations default · FAL optional"
      : "Free public generate · no API key",
    mock: false,
    message:
      "Generate uses Pollinations (keyless). Matched edits run on-device. No user API key required.",
  });
}
