# PixForge

**PixForge** is an Imagine-style AI photo studio. **No API key is required** for the default experience.

Upload a photo or generate from a text prompt, describe edits in natural language, iterate with a history strip, and download.

> On-device open-weight edits are not as strong as cloud Grok Imagine / FLUX. Default **generate** uses a free public endpoint so results look like real photos even without WebGPU or paid keys.

## Quick start (no `.env` needed)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build && npm start
```

## How generate works (default)

| Path | When | Needs key? | Notes |
|------|------|------------|-------|
| **Pollinations.ai** | Default for text-to-image + open-ended “reimagine” | **No** | Public URL `https://image.pollinations.ai/prompt/...` — photographic-style images |
| On-device WASM tools | Matched intents (bg remove, enhance, grades, bokeh…) | No | Fully local after model download |
| SD-Turbo (WebGPU) | Optional Settings preload | No | Private on-device generate when WebGPU exists |
| FAL FLUX Kontext | Optional Settings → Cloud | Server `FAL_KEY` | Paid/quality upgrade |

### Privacy

- **Generate / reimagine (Pollinations):** your **text prompt leaves the device** and is sent to the public Pollinations service (no PixForge API key; their terms/rate limits apply).
- **Matched local edits** (remove background, enhance, color grades, etc.): stay **on-device** via Transformers.js / WASM.
- **Fully offline:** use only local edit intents; skip Generate / open-ended reimagine.

## Local edit models

| Capability | Model / method |
|------------|----------------|
| Background removal | `onnx-community/ormbg-ONNX` |
| Enhance / upscale | `Xenova/swin2SR-classical-sr` |
| Portrait bokeh | Depth Anything + composite |
| Color grades | Canvas ops via NL intent |
| Caption (for reimagine) | `Xenova/vit-gpt2-image-captioning` |

Stack: Next.js App Router, TypeScript, Tailwind, `@huggingface/transformers`, optional `web-txt2img` / ONNX Runtime Web.

## Optional env (cloud upgrade only)

```bash
cp .env.example .env.local
# FAL_KEY=...   # optional
```

| Variable | Required | Description |
|----------|----------|-------------|
| `FAL_KEY` | No | Enables optional cloud mode |
| `MOCK_MODE` | No | Force cloud route mock if `true` |

## API

- `POST /api/generate` — keyless proxy to Pollinations (`{ prompt, width?, height?, seed? }`)
- `POST /api/edit` — optional FAL cloud edit when configured
- `GET /api/health` — status / capability flags

## Limitations

- Pollinations is a third-party free service (availability, safety filters, and rate limits are outside PixForge’s control).
- Open-ended photo edits are “reimagine” (new image guided by caption + prompt), not pixel-perfect instruct-edit like FLUX Kontext.
- First load of on-device editor models needs network to Hugging Face; then they cache in the browser.

## License

MIT
