# PixForge

**PixForge** generates and edits images with **open-weight models on your machine**.  
Default generate does **not** call Pollinations, FAL, OpenAI, Replicate, or any other remote AI API.

> Local SD-Turbo is **not** Grok Imagine. Expect research-quality Turbo images, slower on CPU, and a one-time weight download.

## Quick start

```bash
# 1) Node deps
npm install

# 2) Python sidecar venv (one-time; run.sh creates it if missing)
python3 -m venv .venv-ai
.venv-ai/bin/pip install -U pip wheel
.venv-ai/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv-ai/bin/pip install -r ai-sidecar/requirements.txt

# 3) Run Next + local AI together
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Or separately:

```bash
npm run ai          # SD-Turbo on http://127.0.0.1:8100
npm run dev:web     # Next only
```

Production web build (sidecar still needed at runtime for generate):

```bash
npm run build && npm start
# in another terminal: npm run ai
```

## How generate works (default)

| Path | Role |
|------|------|
| **Local SD-Turbo** (`stabilityai/sd-turbo`) | Default txt2img / reimagine via Python sidecar (`ai-sidecar/server.py`) on **127.0.0.1:8100** |
| On-device WASM edits | Background remove, enhance, grades, bokeh (Transformers.js) |
| Browser WebGPU SD-Turbo | Optional Settings preload |
| FAL FLUX | Optional cloud edit only if `FAL_KEY` set — **not** default generate |

`POST /api/generate` proxies **only** to the localhost sidecar.

### Hardware expectations

| Hardware | 512×512, 1-step SD-Turbo (approx.) |
|----------|-------------------------------------|
| CPU (modern, 8+ threads) | ~30s–3+ minutes first gens after load |
| NVIDIA CUDA | Much faster (seconds) if torch sees GPU |
| WebGPU browser path | Optional; not required |

**Disk:** first run downloads ~2–3 GB weights into `.cache/huggingface/` (gitignored).

### Privacy

- Default generate stays on your machine (localhost).
- No prompts are sent to third-party AI endpoints unless you enable optional cloud mode.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js + AI sidecar (concurrently) |
| `npm run ai` | Sidecar only |
| `npm run dev:web` | Next.js only |
| `npm run build` / `start` | Production Next app |

## Optional env

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PIXFORGE_AI_URL` | No | Sidecar base URL (default `http://127.0.0.1:8100`) |
| `FAL_KEY` | No | Optional cloud edit upgrade only |
| `ENABLE_EXTERNAL_GENERATE` | No | Must stay unset/false — external generate is not the default |

## Limitations

- SD-Turbo is a **1–4 step distilled** model (research); faces/hands can look off vs large cloud models.
- CPU generation is slow; keep the sidecar warm.
- Next `build` does not bundle multi-GB weights; the sidecar downloads them at runtime.

## License

MIT — SD-Turbo has its own research/model license from Stability AI.
