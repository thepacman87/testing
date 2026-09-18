/** Canvas-based photo ops used by the local editor (CPU, always available). */

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export function imageToCanvas(img: HTMLImageElement, maxSide = 1280): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.92) {
  return canvas.toDataURL(type, quality);
}

export function applyColorMatrix(
  canvas: HTMLCanvasElement,
  fn: (r: number, g: number, b: number, a: number) => [number, number, number, number]
) {
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b, a] = fn(d[i], d[i + 1], d[i + 2], d[i + 3]);
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
}

export function grayscale(canvas: HTMLCanvasElement) {
  applyColorMatrix(canvas, (r, g, b, a) => {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    return [y, y, y, a];
  });
}

export function warm(canvas: HTMLCanvasElement, amount = 0.18) {
  applyColorMatrix(canvas, (r, g, b, a) => [
    Math.min(255, r + 255 * amount * 0.55),
    Math.min(255, g + 255 * amount * 0.2),
    Math.max(0, b - 255 * amount * 0.25),
    a,
  ]);
}

export function cool(canvas: HTMLCanvasElement, amount = 0.18) {
  applyColorMatrix(canvas, (r, g, b, a) => [
    Math.max(0, r - 255 * amount * 0.2),
    Math.min(255, g + 255 * amount * 0.05),
    Math.min(255, b + 255 * amount * 0.45),
    a,
  ]);
}

export function vivid(canvas: HTMLCanvasElement, amount = 0.35) {
  applyColorMatrix(canvas, (r, g, b, a) => {
    const avg = (r + g + b) / 3;
    return [
      clamp(avg + (r - avg) * (1 + amount)),
      clamp(avg + (g - avg) * (1 + amount)),
      clamp(avg + (b - avg) * (1 + amount)),
      a,
    ];
  });
}

export function brighten(canvas: HTMLCanvasElement, amount = 0.18) {
  applyColorMatrix(canvas, (r, g, b, a) => [
    clamp(r + 255 * amount),
    clamp(g + 255 * amount),
    clamp(b + 255 * amount),
    a,
  ]);
}

export function darken(canvas: HTMLCanvasElement, amount = 0.18) {
  applyColorMatrix(canvas, (r, g, b, a) => [
    clamp(r - 255 * amount),
    clamp(g - 255 * amount),
    clamp(b - 255 * amount),
    a,
  ]);
}

export function vintage(canvas: HTMLCanvasElement) {
  applyColorMatrix(canvas, (r, g, b, a) => {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    return [
      clamp(y * 1.05 + 25),
      clamp(y * 0.95 + 10),
      clamp(y * 0.75),
      a,
    ];
  });
  // light grain
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    d[i] = clamp(d[i] + n);
    d[i + 1] = clamp(d[i + 1] + n);
    d[i + 2] = clamp(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

function clamp(v: number) {
  return Math.max(0, Math.min(255, v));
}

/** Deterministic prompt-conditioned synth when diffusion isn't available. */
export function synthesizeFromPrompt(prompt: string, size = 768): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const seed = hash(prompt);
  const rng = mulberry32(seed);

  const hues = [
    260 + (seed % 40),
    190 + ((seed >> 3) % 50),
    320 + ((seed >> 5) % 30),
  ];
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, `hsl(${hues[0]} 55% 18%)`);
  g.addColorStop(0.5, `hsl(${hues[1]} 50% 28%)`);
  g.addColorStop(1, `hsl(${hues[2]} 45% 14%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 18; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 40 + rng() * 180;
    const rad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const h = hues[i % hues.length] + rng() * 40;
    rad.addColorStop(0, `hsla(${h} 70% 60% / ${0.15 + rng() * 0.35})`);
    rad.addColorStop(1, "transparent");
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // soft vignette
  const vig = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.2,
    size / 2,
    size / 2,
    size * 0.75
  );
  vig.addColorStop(0, "transparent");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "600 22px system-ui,sans-serif";
  ctx.textAlign = "center";
  const lines = wrap(prompt.slice(0, 120) || "PixForge", 32);
  lines.forEach((line, i) => {
    ctx.fillText(line, size / 2, size * 0.78 + i * 28);
  });
  ctx.font = "500 13px system-ui,sans-serif";
  ctx.fillStyle = "rgba(200,200,255,0.7)";
  ctx.fillText("Local synth · enable WebGPU for SD-Turbo", size / 2, size * 0.92);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap(text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > width) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}
