/**
 * Image edit provider abstraction.
 * Prefers FAL (flux-pro/kontext), falls back to mock when no key / MOCK_MODE.
 */

export type EditProvider = "fal" | "mock";

export function resolveProvider(): EditProvider {
  if (process.env.MOCK_MODE === "true") return "mock";
  if (process.env.FAL_KEY) return "fal";
  return "mock";
}

export function providerLabel(provider: EditProvider): string {
  switch (provider) {
    case "fal":
      return "FAL · FLUX.1 Kontext [pro]";
    case "mock":
      return "Demo / mock mode";
  }
}
