/** Lightweight NL intent router for local photo edits (no network). */

export type EditIntent =
  | "remove-bg"
  | "enhance"
  | "grayscale"
  | "warm"
  | "cool"
  | "vivid"
  | "vintage"
  | "blur-bg"
  | "brighten"
  | "darken"
  | "reimagine";

const RULES: Array<{ intent: EditIntent; patterns: RegExp }> = [
  {
    intent: "remove-bg",
    patterns:
      /\b(remove|cut\s*out|delete|erase|transparent)\b.*\b(bg|background)\b|\b(background)\b.*\b(remove|cut|delete|erase)\b|\bcut\s*out\b|\bno\s*background\b|\bisolate\s*(the\s*)?(subject|person|object)\b/i,
  },
  {
    intent: "enhance",
    patterns:
      /\b(enhance|upscale|sharpen|super[\s-]?res|denoise|restore|clarify|clearer|hd|4k|improve\s+quality)\b/i,
  },
  {
    intent: "grayscale",
    patterns: /\b(black\s*and\s*white|b&w|bw|grayscale|greyscale|monochrome)\b/i,
  },
  {
    intent: "warm",
    patterns: /\b(warm(er)?|golden\s*hour|sunset\s*tone|orange\s*tint|cozy)\b/i,
  },
  {
    intent: "cool",
    patterns: /\b(cool(er)?|blue\s*tint|cold|icy|moonlight)\b/i,
  },
  {
    intent: "vivid",
    patterns: /\b(vivid|saturat|vibrant|punchy|pop|colorful|colourful)\b/i,
  },
  {
    intent: "vintage",
    patterns: /\b(vintage|retro|film\s*grain|nostalgic|sepia|old\s*photo|polaroid)\b/i,
  },
  {
    intent: "blur-bg",
    patterns:
      /\b(blur\s*(the\s*)?background|bokeh|portrait\s*mode|shallow\s*depth|defocus\s*bg)\b/i,
  },
  {
    intent: "brighten",
    patterns: /\b(brighten|lighter|increase\s*exposure|too\s*dark|underexposed)\b/i,
  },
  {
    intent: "darken",
    patterns: /\b(darken|dimmer|decrease\s*exposure|too\s*bright|overexposed)\b/i,
  },
];

export function detectIntent(prompt: string): EditIntent {
  const p = prompt.trim();
  for (const rule of RULES) {
    if (rule.patterns.test(p)) return rule.intent;
  }
  return "reimagine";
}

export function intentLabel(intent: EditIntent): string {
  switch (intent) {
    case "remove-bg":
      return "Background removal (ormbg)";
    case "enhance":
      return "Super-resolution enhance (Swin2SR)";
    case "grayscale":
      return "Monochrome grade";
    case "warm":
      return "Warm color grade";
    case "cool":
      return "Cool color grade";
    case "vivid":
      return "Vivid saturation";
    case "vintage":
      return "Vintage film look";
    case "blur-bg":
      return "Portrait bokeh (depth)";
    case "brighten":
      return "Exposure lift";
    case "darken":
      return "Exposure drop";
    case "reimagine":
      return "Creative reimagine (SD-Turbo / local synth)";
  }
}
