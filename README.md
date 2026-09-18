# PixForge

**PixForge** is an Imagine-style AI photo editor: upload a photo, describe the change in plain English, iterate on the latest result, browse edit history, and download.

It is built as a modern Next.js web app with a polished dark UI inspired by contemporary AI image tools.

## Features

- Drag-and-drop or click-to-upload (JPEG, PNG, WebP, GIF)
- Natural-language edit prompts with suggestion chips
- Iterative editing — each prompt applies to the currently selected image
- Session history rail with thumbnails (original + each edit)
- Download the active result
- Real image editing via **FAL FLUX.1 Kontext [pro]** (`fal-ai/flux-pro/kontext`)
- Automatic **demo/mock mode** when `FAL_KEY` is missing (clearly labeled)

## Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- Tailwind CSS v4
- [FAL AI](https://fal.ai/) client (`@fal-ai/client`)
- Lucide icons

## Setup

```bash
git clone https://github.com/thepacman87/testing.git
cd testing
npm install
cp .env.example .env.local
```

Edit `.env.local` and set your key:

```bash
FAL_KEY=your_fal_api_key_here
```

Optional:

```bash
# Force demo mode (no external API calls)
MOCK_MODE=true
```

Get a FAL key at [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys).

## Run

```bash
# development
npm run dev

# production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable     | Required | Description                                      |
|--------------|----------|--------------------------------------------------|
| `FAL_KEY`    | Yes*     | FAL API key for FLUX Kontext image editing       |
| `MOCK_MODE`  | No       | Set to `true` to force demo/mock mode            |

\* Without `FAL_KEY` (and without forcing mock off), the app still runs in **demo/mock mode** so you can explore the UI. Mock mode echoes/returns a placeholder and shows an amber banner — it does not call a paid API.

## How editing works

1. Client uploads an image (as a data URL) and a text prompt to `POST /api/edit`.
2. The server uploads the image to FAL storage (when needed) and calls `fal-ai/flux-pro/kontext` with `{ prompt, image_url }`.
3. The edited image URL is returned; the UI appends it to session history and sets it as the new base for follow-up prompts.

This matches the Imagine / instruct-edit workflow: **image + instruction → edited image**, then repeat.

## API

### `POST /api/edit`

```json
{
  "prompt": "Make the sky look like a dramatic sunset",
  "image": "data:image/jpeg;base64,..."
}
```

Response:

```json
{
  "imageUrl": "https://...",
  "provider": "fal",
  "providerLabel": "FAL · FLUX.1 Kontext [pro]",
  "mock": false
}
```

### `GET /api/health`

Returns the active provider and whether mock mode is on.

## Project layout

```
src/
  app/
    api/edit/route.ts    # image edit endpoint
    api/health/route.ts  # provider status
    page.tsx             # editor UI
  components/            # Upload, canvas, history, prompt bar
  lib/                   # FAL + mock providers
```

## License

MIT
