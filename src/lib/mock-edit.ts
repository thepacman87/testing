/**
 * Deterministic mock edit: returns a lightly tinted / labeled SVG
 * so the UI can be exercised without API keys.
 */
export async function editWithMock(
  imageDataUrl: string,
  prompt: string
): Promise<{ imageUrl: string }> {
  // Prefer echoing the input so iteration still feels real.
  // Overlay a small SVG badge as a "edited" marker when possible.
  if (imageDataUrl.startsWith("data:image")) {
    // Return the same image — UI still advances history with the prompt.
    // Add a tiny cache-buster query isn't needed for data URLs.
    void prompt;
    await delay(600 + Math.random() * 400);
    return { imageUrl: imageDataUrl };
  }

  const safe = escapeXml(prompt.slice(0, 80) || "mock edit");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="50%" y="46%" text-anchor="middle" fill="#a78bfa" font-family="system-ui,sans-serif" font-size="36" font-weight="600">PixForge Demo</text>
  <text x="50%" y="54%" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="20">${safe}</text>
</svg>`;

  const encoded = Buffer.from(svg).toString("base64");
  await delay(500);
  return { imageUrl: `data:image/svg+xml;base64,${encoded}` };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
