# PixForge

**PixForge** is an Imagine-style AI photo studio that runs **on your device by default** — no API key, no account, no paid cloud required.

Upload a photo or generate from a text prompt, describe edits in natural language, iterate with a history strip, and download results.

> Honest expectations: on-device open-weight models are **not** as strong as cloud Grok Imagine / FLUX. PixForge prioritizes privacy, zero cost, and a real local ML pipeline you can actually run with `npm install && npm run dev`.

## Quick start (no `.env` needed)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build && npm start   # production
```

## What runs locally

| Capability | Model / method | Notes |
|------------|----------------|-------|
| Background removal | `onnx-community/ormbg-ONNX` (Transformers.js) | Real neural matting |
| Enhance / upscale | `Xenova/swin2SR-classical-sr` | Image-to-image SR |
| Portrait bokeh | Depth Anything (Transformers.js) + composite | Depth-guided blur |
| Color grades | On-device canvas ops | Warm / cool / B&W / vivid / vintage… via NL intent |
| Creative reimagine | Caption (`vit-gpt2`) + **SD-Turbo** | Needs WebGPU; blends with original |
| Text-to-image | **SD-Turbo** via `web-txt2img` | ~2.3 GB one-time download, browser-cached |
| Generate fallback | Prompt-conditioned local synth | When WebGPU / SD-Turbo unavailable |

Stack: **Next.js (App Router) + TypeScript + Tailwind**, client-side **`@huggingface/transformers`** + **`web-txt2img`** / **ONNX Runtime Web**.

Models download on first use into the browser cache. A first-run progress UI explains what is loading.

### Browser requirements

- **Best:** Chrome or Edge 113+ with **WebGPU** (for SD-Turbo generate / reimagine).
- **Still works without WebGPU:** editor pack on WASM (bg remove, enhance, grades, depth when available) + synth generate fallback.

## Optional cloud upgrade

If you set `FAL_KEY` on the server, Settings → **Cloud upgrade** unlocks FAL **FLUX.1 Kontext [pro]** for higher-quality instruct edits. This is **off by default**; local mode needs no key.

```bash
cp .env.example .env.local
# FAL_KEY=...   # optional only
```

| Variable   | Required | Description                                      |
|------------|----------|--------------------------------------------------|
| `FAL_KEY`  | No       | Enables optional cloud mode                      |
| `MOCK_MODE`| No       | Force cloud route into demo mock if set `true`   |

## Imagine-style workflow

1. **Upload** a photo *or* **Generate** from a text prompt.
2. Type a natural-language edit (`remove the background`, `enhance`, `cinematic reimagine`…).
3. Iterate — each edit uses the selected history frame.
4. Download anytime.

## Project layout

```
src/
  app/                  # Next.js app + optional /api/edit (cloud)
  components/           # Editor UI, history, model loader
  lib/local/            # On-device engine, intent router, canvas ops
  lib/fal-edit.ts       # Optional cloud provider
public/ort/             # ONNX Runtime Web WASM assets
```

## Limitations

- Open-ended “change the shirt to red” edits are weaker than cloud instruct models; PixForge routes those through caption + SD-Turbo reimagine (WebGPU) or creative grades.
- SD-Turbo download is large (~2.3 GB) and needs a capable GPU via WebGPU.
- First load needs network to fetch models from Hugging Face; later runs use cache.

## License

MIT
