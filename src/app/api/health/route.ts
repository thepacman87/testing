import { NextResponse } from "next/server";
import { providerLabel, resolveProvider } from "@/lib/provider";

export async function GET() {
  const provider = resolveProvider();
  return NextResponse.json({
    ok: true,
    provider,
    providerLabel: providerLabel(provider),
    mock: provider === "mock",
  });
}
