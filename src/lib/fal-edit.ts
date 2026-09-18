import { fal } from "@fal-ai/client";

const MODEL = "fal-ai/flux-pro/kontext";

function ensureFalConfig() {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error("FAL_KEY is not configured");
  }
  fal.config({ credentials: key });
}

/**
 * Upload a data-URL or remote URL image to fal storage when needed,
 * then run FLUX Kontext instruct-edit.
 */
export async function editWithFal(
  imageDataUrl: string,
  prompt: string
): Promise<{ imageUrl: string; seed?: number }> {
  ensureFalConfig();

  let imageUrl = imageDataUrl;

  // Upload data URLs / blobs to fal storage so the model can fetch them
  if (imageDataUrl.startsWith("data:")) {
    const blob = await dataUrlToBlob(imageDataUrl);
    const file = new File([blob], "input.png", { type: blob.type || "image/png" });
    imageUrl = await fal.storage.upload(file);
  }

  const result = await fal.subscribe(MODEL, {
    input: {
      prompt,
      image_url: imageUrl,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "jpeg",
      safety_tolerance: "2",
    },
    logs: false,
  });

  const data = result.data as {
    images?: Array<{ url: string }>;
    seed?: number;
  };

  const out = data.images?.[0]?.url;
  if (!out) {
    throw new Error("FAL returned no images");
  }

  return { imageUrl: out, seed: data.seed };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
