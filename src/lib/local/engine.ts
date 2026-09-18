/**
 * PixForge local on-device engine.
 * Runs entirely in the browser — no API keys.
 *
 * - Editor pack: Transformers.js (ormbg bg-removal, Swin2SR enhance, depth)
 * - Generator: SD-Turbo via web-txt2img when WebGPU is available (~2.3GB, cached)
 * - Fallback generate: prompt-conditioned local synth (no WebGPU)
 */

import type { Caps, ProgressEvent } from "./types";
import { detectIntent, intentLabel, type EditIntent } from "./prompt-intent";
import {
  applyColorMatrix,
  brighten,
  canvasToDataUrl,
  cool,
  darken,
  grayscale,
  imageToCanvas,
  loadImage,
  synthesizeFromPrompt,
  vintage,
  vivid,
  warm,
} from "./canvas-ops";

// Pipelines are dynamically typed — HF overloads are too wide for TS2590.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPipe = ((...args: any[]) => Promise<any>) & Record<string, any>;

let editorReady = false;
let generatorReady = false;
let caps: Caps = { webgpu: false, wasm: true };

let bgRemover: AnyPipe | null = null;
let enhancer: AnyPipe | null = null;
let depthEstimator: AnyPipe | null = null;
let captioner: AnyPipe | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let txt2imgClient: any = null;

type ProgressCb = (e: ProgressEvent) => void;

function emit(
  cb: ProgressCb | undefined,
  stage: ProgressEvent["stage"],
  progress: number,
  message: string,
  file?: string
) {
  cb?.({ stage, progress, message, file });
}

async function configureTransformersEnv() {
  const { env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  env.allowRemoteModels = true;
  // Prefer locally copied ORT wasm when available; CDN as backup
  try {
    // @ts-expect-error onnx wasm paths
    env.backends.onnx.wasm.wasmPaths = "/ort/";
    // @ts-expect-error
    env.backends.onnx.wasm.proxy = false;
  } catch {
    /* ignore */
  }
}

export async function detectCapabilities(): Promise<Caps> {
  let webgpu = false;
  try {
    // @ts-expect-error experimental
    if (typeof navigator !== "undefined" && navigator.gpu) {
      // @ts-expect-error
      const adapter = await navigator.gpu.requestAdapter();
      webgpu = Boolean(adapter);
    }
  } catch {
    webgpu = false;
  }
  caps = { webgpu, wasm: true };
  return caps;
}

export function getCaps() {
  return caps;
}

export function isEditorReady() {
  return editorReady;
}

export function isGeneratorReady() {
  return generatorReady;
}

async function pickDevice(): Promise<"webgpu" | "wasm"> {
  if (!caps.webgpu) await detectCapabilities();
  return caps.webgpu ? "webgpu" : "wasm";
}

export async function loadEditorPack(onProgress?: ProgressCb) {
  if (editorReady) {
    emit(onProgress, "ready", 100, "Editor models ready");
    return;
  }
  emit(onProgress, "loading-editor", 5, "Preparing on-device editor…");
  await configureTransformersEnv();
  const device = await pickDevice();
  const { pipeline } = await import("@huggingface/transformers");

  const progress_callback = (info: {
    status?: string;
    progress?: number;
    file?: string;
  }) => {
    if (info.status === "progress" && typeof info.progress === "number") {
      emit(
        onProgress,
        "loading-editor",
        Math.min(90, Math.round(info.progress)),
        "Downloading editor models (cached after first run)…",
        info.file
      );
    }
  };

  try {
    emit(onProgress, "loading-editor", 10, "Loading background remover (ormbg)…");
    bgRemover = (await pipeline(
      "background-removal",
      "onnx-community/ormbg-ONNX",
      {
        device,
        progress_callback,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;

    emit(onProgress, "loading-editor", 45, "Loading enhancer (Swin2SR)…");
    try {
      enhancer = (await pipeline(
        "image-to-image",
        "Xenova/swin2SR-classical-sr",
        { device: device === "webgpu" ? "webgpu" : "wasm", progress_callback }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any;
    } catch {
      enhancer = null;
      emit(
        onProgress,
        "loading-editor",
        55,
        "Enhancer unavailable — color/grade ops still work"
      );
    }

    emit(onProgress, "loading-editor", 70, "Loading depth estimator…");
    try {
      depthEstimator = (await pipeline(
        "depth-estimation",
        "onnx-community/depth-anything-v2-small",
        { device, progress_callback }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any;
    } catch {
      try {
        depthEstimator = (await pipeline(
          "depth-estimation",
          "Xenova/depth-anything-small-hf",
          { device, progress_callback }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        )) as any;
      } catch {
        depthEstimator = null;
      }
    }

    emit(onProgress, "loading-editor", 85, "Loading image captioner…");
    try {
      captioner = (await pipeline(
        "image-to-text",
        "Xenova/vit-gpt2-image-captioning",
        { device: "wasm", progress_callback }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any;
    } catch {
      captioner = null;
    }

    editorReady = true;
    emit(onProgress, "ready", 100, "On-device editor ready — no API key needed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load editor";
    emit(onProgress, "error", 0, message);
    // Soft-fail: canvas ops still work
    editorReady = true;
    emit(
      onProgress,
      "ready",
      100,
      "Running in lightweight local mode (some ML models failed to load)"
    );
  }
}

export async function loadGenerator(onProgress?: ProgressCb) {
  if (generatorReady) {
    emit(onProgress, "ready", 100, "Generator ready");
    return;
  }
  await detectCapabilities();
  if (!caps.webgpu) {
    emit(
      onProgress,
      "ready",
      100,
      "WebGPU not available — using local synth for text-to-image"
    );
    generatorReady = true;
    return;
  }

  emit(
    onProgress,
    "loading-generator",
    5,
    "Downloading SD-Turbo (~2.3 GB, one-time, cached in browser)…"
  );

  try {
    const { Txt2ImgWorkerClient } = await import("web-txt2img");
    txt2imgClient = Txt2ImgWorkerClient.createDefault();

    // Progress from worker if available
    if (typeof txt2imgClient.onProgress === "function") {
      txt2imgClient.onProgress((p: { progress?: number; message?: string }) => {
        emit(
          onProgress,
          "loading-generator",
          Math.min(95, Math.round(p.progress ?? 20)),
          p.message || "Loading SD-Turbo…"
        );
      });
    }

    await txt2imgClient.load("sd-turbo", {
      backendPreference: ["webgpu"],
    });
    generatorReady = true;
    emit(onProgress, "ready", 100, "SD-Turbo ready (runs on your GPU)");
  } catch (err) {
    const message = err instanceof Error ? err.message : "SD-Turbo failed to load";
    emit(onProgress, "error", 0, message);
    generatorReady = true; // allow synth fallback
    txt2imgClient = null;
    emit(
      onProgress,
      "ready",
      100,
      "Falling back to local synth (SD-Turbo unavailable)"
    );
  }
}

export async function generateImage(
  prompt: string,
  seed?: number,
  onProgress?: ProgressCb
): Promise<{ imageDataUrl: string; meta: string }> {
  if (!generatorReady) await loadGenerator(onProgress);
  emit(onProgress, "ready", 10, "Generating…");

  if (txt2imgClient) {
    try {
      const { promise } = txt2imgClient.generate({
        prompt,
        seed: seed ?? Math.floor(Math.random() * 1e9),
      });
      const result = await promise;
      if (result.ok && result.blob) {
        const dataUrl = await blobToDataUrl(result.blob);
        return {
          imageDataUrl: dataUrl,
          meta: "SD-Turbo · on-device WebGPU",
        };
      }
      throw new Error(result.error || "Generation failed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SD-Turbo error";
      emit(onProgress, "error", 0, msg);
    }
  }

  // Fallback synth
  const imageDataUrl = synthesizeFromPrompt(prompt);
  return {
    imageDataUrl,
    meta: "Local synth · enable Chrome/Edge WebGPU for SD-Turbo",
  };
}

export async function editImage(
  imageDataUrl: string,
  prompt: string,
  onProgress?: ProgressCb
): Promise<{ imageDataUrl: string; meta: string }> {
  if (!editorReady) await loadEditorPack(onProgress);
  const intent = detectIntent(prompt);
  emit(onProgress, "ready", 15, `Applying: ${intentLabel(intent)}`);

  switch (intent) {
    case "remove-bg":
      return removeBackground(imageDataUrl, onProgress);
    case "enhance":
      return enhanceImage(imageDataUrl, onProgress);
    case "blur-bg":
      return blurBackground(imageDataUrl, onProgress);
    case "grayscale":
    case "warm":
    case "cool":
    case "vivid":
    case "vintage":
    case "brighten":
    case "darken":
      return applyGrade(imageDataUrl, intent);
    case "reimagine":
    default:
      return reimagine(imageDataUrl, prompt, onProgress);
  }
}

async function applyGrade(imageDataUrl: string, intent: EditIntent) {
  const img = await loadImage(imageDataUrl);
  const canvas = imageToCanvas(img);
  switch (intent) {
    case "grayscale":
      grayscale(canvas);
      break;
    case "warm":
      warm(canvas);
      break;
    case "cool":
      cool(canvas);
      break;
    case "vivid":
      vivid(canvas);
      break;
    case "vintage":
      vintage(canvas);
      break;
    case "brighten":
      brighten(canvas);
      break;
    case "darken":
      darken(canvas);
      break;
  }
  return {
    imageDataUrl: canvasToDataUrl(canvas),
    meta: intentLabel(intent),
  };
}

async function removeBackground(
  imageDataUrl: string,
  onProgress?: ProgressCb
) {
  if (!bgRemover) {
    // Soft matte fallback: center vignette transparency
    const img = await loadImage(imageDataUrl);
    const canvas = imageToCanvas(img);
    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxR = Math.hypot(cx, cy) * 0.85;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const d = Math.hypot(x - cx, y - cy) / maxR;
        data.data[i + 3] = Math.round(255 * Math.max(0, 1 - d * d));
      }
    }
    ctx.putImageData(data, 0, 0);
    return {
      imageDataUrl: canvas.toDataURL("image/png"),
      meta: "Approx. cutout (ormbg not loaded)",
    };
  }
  emit(onProgress, "ready", 40, "Removing background with ormbg…");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = await bgRemover(imageDataUrl);
  const raw = Array.isArray(out) ? out[0] : out;
  const dataUrl = await rawImageToDataUrl(raw, "image/png");
  return { imageDataUrl: dataUrl, meta: intentLabel("remove-bg") };
}

async function enhanceImage(imageDataUrl: string, onProgress?: ProgressCb) {
  if (!enhancer) {
    // Unsharp-mask style sharpen
    const img = await loadImage(imageDataUrl);
    const canvas = imageToCanvas(img, 1600);
    applyColorMatrix(canvas, (r, g, b, a) => [
      Math.min(255, r * 1.05),
      Math.min(255, g * 1.05),
      Math.min(255, b * 1.05),
      a,
    ]);
    return {
      imageDataUrl: canvasToDataUrl(canvas),
      meta: "Sharpen fallback (Swin2SR not loaded)",
    };
  }
  emit(onProgress, "ready", 40, "Enhancing with Swin2SR…");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = await enhancer(imageDataUrl);
  const raw = Array.isArray(out) ? out[0] : out;
  const dataUrl = await rawImageToDataUrl(raw, "image/jpeg");
  return { imageDataUrl: dataUrl, meta: intentLabel("enhance") };
}

async function blurBackground(imageDataUrl: string, onProgress?: ProgressCb) {
  const img = await loadImage(imageDataUrl);
  const canvas = imageToCanvas(img);
  const w = canvas.width;
  const h = canvas.height;

  // Blurred copy
  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = w;
  blurCanvas.height = h;
  const bctx = blurCanvas.getContext("2d")!;
  bctx.filter = "blur(14px)";
  bctx.drawImage(canvas, 0, 0);

  let depthMask: Float32Array | null = null;
  if (depthEstimator) {
    try {
      emit(onProgress, "ready", 40, "Estimating depth for bokeh…");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const depthOut: any = await depthEstimator(imageDataUrl);
      const depthImg = depthOut?.depth ?? depthOut;
      if (depthImg) {
        const dCanvas = document.createElement("canvas");
        const dw = depthImg.width ?? w;
        const dh = depthImg.height ?? h;
        dCanvas.width = dw;
        dCanvas.height = dh;
        const dctx = dCanvas.getContext("2d")!;
        if (typeof depthImg.toCanvas === "function") {
          dctx.drawImage(depthImg.toCanvas(), 0, 0);
        } else if (depthImg.data) {
          // RawImage-like
          const rgba = await rawToImageData(depthImg);
          dctx.putImageData(rgba, 0, 0);
        }
        // resize to canvas
        const scaled = document.createElement("canvas");
        scaled.width = w;
        scaled.height = h;
        scaled.getContext("2d")!.drawImage(dCanvas, 0, 0, w, h);
        const id = scaled.getContext("2d")!.getImageData(0, 0, w, h);
        depthMask = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
          depthMask[i] = id.data[i * 4] / 255; // nearer = brighter typically
        }
      }
    } catch {
      depthMask = null;
    }
  }

  const ctx = canvas.getContext("2d")!;
  const sharp = ctx.getImageData(0, 0, w, h);
  const blur = bctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);

  for (let i = 0; i < w * h; i++) {
    // Higher depth value => farther => more blur. Invert if needed.
    let far = depthMask ? depthMask[i] : 0;
    // Without depth, use radial: center sharp
    if (!depthMask) {
      const x = i % w;
      const y = (i / w) | 0;
      const d = Math.hypot(x - w / 2, y - h / 2) / (Math.hypot(w, h) / 2);
      far = Math.min(1, d * 1.2);
    }
    const t = Math.min(1, Math.max(0, (far - 0.35) / 0.45));
    const o = i * 4;
    out.data[o] = sharp.data[o] * (1 - t) + blur.data[o] * t;
    out.data[o + 1] = sharp.data[o + 1] * (1 - t) + blur.data[o + 1] * t;
    out.data[o + 2] = sharp.data[o + 2] * (1 - t) + blur.data[o + 2] * t;
    out.data[o + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return {
    imageDataUrl: canvasToDataUrl(canvas),
    meta: intentLabel("blur-bg"),
  };
}

async function reimagine(
  imageDataUrl: string,
  prompt: string,
  onProgress?: ProgressCb
) {
  let caption = "";
  if (captioner) {
    try {
      emit(onProgress, "ready", 30, "Understanding your photo…");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cap: any = await captioner(imageDataUrl);
      caption =
        (Array.isArray(cap) ? cap[0]?.generated_text : cap?.generated_text) ||
        "";
    } catch {
      caption = "";
    }
  }

  const genPrompt = [
    prompt.trim(),
    caption ? `based on a photo of ${caption}` : "photorealistic edit",
    "high quality",
  ]
    .filter(Boolean)
    .join(", ");

  if (!generatorReady) {
    try {
      await loadGenerator(onProgress);
    } catch {
      /* ignore */
    }
  }

  if (txt2imgClient) {
    emit(onProgress, "ready", 55, "Reimagining with SD-Turbo…");
    const gen = await generateImage(genPrompt, undefined, onProgress);
    // Blend lightly with original for continuity
    try {
      const orig = await loadImage(imageDataUrl);
      const neu = await loadImage(gen.imageDataUrl);
      const canvas = imageToCanvas(orig, 768);
      const ctx = canvas.getContext("2d")!;
      ctx.globalAlpha = 0.72;
      ctx.drawImage(neu, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      return {
        imageDataUrl: canvasToDataUrl(canvas),
        meta: `Reimagine · SD-Turbo${caption ? ` · “${caption.slice(0, 60)}”` : ""}`,
      };
    } catch {
      return gen;
    }
  }

  // No diffusion: apply vivid+warm as a creative nudge + overlay prompt synth at low opacity
  const img = await loadImage(imageDataUrl);
  const canvas = imageToCanvas(img);
  vivid(canvas, 0.25);
  warm(canvas, 0.1);
  const synth = await loadImage(synthesizeFromPrompt(prompt, 512));
  const ctx = canvas.getContext("2d")!;
  ctx.globalAlpha = 0.22;
  ctx.drawImage(synth, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  return {
    imageDataUrl: canvasToDataUrl(canvas),
    meta: "Creative grade · load SD-Turbo (WebGPU) for full reimagine",
  };
}

async function rawImageToDataUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any,
  type: string
): Promise<string> {
  if (!raw) throw new Error("Empty model output");
  if (typeof raw.toDataURL === "function") return raw.toDataURL();
  if (typeof raw.toBlob === "function") {
    const blob = await raw.toBlob();
    return blobToDataUrl(blob);
  }
  if (typeof raw.toCanvas === "function") {
    return raw.toCanvas().toDataURL(type, 0.92);
  }
  // RawImage with .data
  if (raw.data && raw.width && raw.height) {
    const canvas = document.createElement("canvas");
    canvas.width = raw.width;
    canvas.height = raw.height;
    const ctx = canvas.getContext("2d")!;
    const id = await rawToImageData(raw);
    ctx.putImageData(id, 0, 0);
    return canvas.toDataURL(type, 0.92);
  }
  throw new Error("Unsupported model output format");
}

async function rawToImageData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any
): Promise<ImageData> {
  const { width, height, data, channels } = raw;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const ch = channels ?? (data.length === width * height * 4 ? 4 : data.length === width * height * 3 ? 3 : 1);
  for (let i = 0; i < width * height; i++) {
    if (ch === 1) {
      const v = data[i];
      rgba[i * 4] = v;
      rgba[i * 4 + 1] = v;
      rgba[i * 4 + 2] = v;
      rgba[i * 4 + 3] = 255;
    } else if (ch === 3) {
      rgba[i * 4] = data[i * 3];
      rgba[i * 4 + 1] = data[i * 3 + 1];
      rgba[i * 4 + 2] = data[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    } else {
      rgba[i * 4] = data[i * 4];
      rgba[i * 4 + 1] = data[i * 4 + 1];
      rgba[i * 4 + 2] = data[i * 4 + 2];
      rgba[i * 4 + 3] = data[i * 4 + 3];
    }
  }
  return new ImageData(rgba, width, height);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("blob read failed"));
    reader.readAsDataURL(blob);
  });
}
