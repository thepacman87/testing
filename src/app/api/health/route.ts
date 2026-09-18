import { NextResponse } from "next/server";

export async function GET() {
  const fal = Boolean(process.env.FAL_KEY);
  const mockForced = process.env.MOCK_MODE === "true";
  const cloudAvailable = fal && !mockForced;

  return NextResponse.json({
    ok: true,
    defaultMode: "local",
    cloudAvailable,
    provider: cloudAvailable ? "fal" : "local",
    providerLabel: cloudAvailable
      ? "Cloud available (optional)"
      : "Local on-device (default)",
    mock: false,
    message:
      "PixForge defaults to in-browser models. No API key required.",
  });
}
