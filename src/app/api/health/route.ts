import { NextResponse } from "next/server";

export async function GET() {
  const fal = Boolean(process.env.FAL_KEY);
  const mockForced = process.env.MOCK_MODE === "true";
  const cloudAvailable = fal && !mockForced;
  const sidecarUrl =
    process.env.PIXFORGE_AI_URL?.replace(/\/$/, "") || "http://127.0.0.1:8100";

  let sidecarReady = false;
  let sidecar: Record<string, unknown> | null = null;
  try {
    const r = await fetch(`${sidecarUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (r.ok) {
      sidecar = await r.json();
      sidecarReady = Boolean(sidecar?.ready);
    }
  } catch {
    sidecar = null;
  }

  return NextResponse.json({
    ok: true,
    defaultMode: "local",
    defaultGenerate: "local-sd-turbo",
    defaultGenerateLabel: "Local model · SD-Turbo · no external AI",
    externalGenerateDefault: false,
    sidecarReady,
    sidecar,
    cloudAvailable,
    provider: "local-sd-turbo",
    providerLabel: sidecarReady
      ? "Local model · SD-Turbo · no external AI"
      : "Local model (start `npm run ai`)",
    mock: false,
    message:
      "Default generate uses local open-weight SD-Turbo via localhost sidecar. No Pollinations/FAL/OpenAI.",
  });
}
