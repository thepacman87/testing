#!/usr/bin/env python3
"""
PixForge local txt2img sidecar — open-weight SD-Turbo on CPU/CUDA.
Listens on 127.0.0.1 only. No external AI APIs.
"""

from __future__ import annotations

import argparse
import base64
import io
import os
import threading
import time
from contextlib import asynccontextmanager
from typing import Any

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_ID = os.environ.get("PIXFORGE_MODEL", "stabilityai/sd-turbo")
CACHE_DIR = os.environ.get(
    "PIXFORGE_CACHE",
    os.path.join(os.path.dirname(__file__), "..", ".cache", "huggingface"),
)
HOST = os.environ.get("PIXFORGE_AI_HOST", "127.0.0.1")
PORT = int(os.environ.get("PIXFORGE_AI_PORT", "8100"))

_lock = threading.Lock()
_pipe: Any = None
_device = "cpu"
_dtype = torch.float32
_load_error: str | None = None
_status = {
    "ready": False,
    "loading": False,
    "progress": 0,
    "message": "idle",
    "model": MODEL_ID,
    "device": "cpu",
}


def _set_status(**kwargs):
    _status.update(kwargs)


def load_pipeline(progress_cb=None):
    global _pipe, _device, _dtype, _load_error
    if _pipe is not None:
        return _pipe

    _set_status(loading=True, ready=False, progress=5, message="Importing diffusers…")
    os.makedirs(CACHE_DIR, exist_ok=True)
    os.environ.setdefault("HF_HOME", CACHE_DIR)
    os.environ.setdefault("HUGGINGFACE_HUB_CACHE", os.path.join(CACHE_DIR, "hub"))

    if torch.cuda.is_available():
        _device = "cuda"
        _dtype = torch.float16
    else:
        _device = "cpu"
        _dtype = torch.float32

    try:
        from diffusers import AutoPipelineForText2Image

        _set_status(
            progress=15,
            message=f"Downloading/loading {MODEL_ID} (first run caches weights locally)…",
            device=_device,
        )
        pipe = AutoPipelineForText2Image.from_pretrained(
            MODEL_ID,
            torch_dtype=_dtype,
            variant="fp16" if _device == "cuda" else None,
            cache_dir=os.path.join(CACHE_DIR, "hub"),
        )
        # CPU: disable safety checker overhead if present
        if hasattr(pipe, "safety_checker"):
            pipe.safety_checker = None
        if hasattr(pipe, "requires_safety_checker"):
            pipe.requires_safety_checker = False

        _set_status(progress=80, message=f"Moving pipeline to {_device}…")
        pipe = pipe.to(_device)

        # Slight CPU speedups
        if _device == "cpu":
            try:
                pipe.set_progress_bar_config(disable=True)
            except Exception:
                pass

        _pipe = pipe
        _load_error = None
        _set_status(
            ready=True,
            loading=False,
            progress=100,
            message="Local SD-Turbo ready",
            device=_device,
            model=MODEL_ID,
        )
        return _pipe
    except Exception as e:
        _load_error = str(e)
        _set_status(
            ready=False,
            loading=False,
            progress=0,
            message=f"Failed to load model: {e}",
        )
        raise


def generate_image(
    prompt: str,
    width: int = 512,
    height: int = 512,
    steps: int = 1,
    seed: int | None = None,
) -> tuple[bytes, dict]:
    pipe = load_pipeline()
    width = max(256, min(768, int(width)))
    height = max(256, min(768, int(height)))
    # Snap to multiples of 8
    width = width - (width % 8)
    height = height - (height % 8)
    steps = max(1, min(4, int(steps)))

    if seed is None:
        seed = int(time.time() * 1000) % (2**31 - 1)
    generator = torch.Generator(device="cpu" if _device == "cpu" else _device)
    generator.manual_seed(int(seed))

    t0 = time.time()
    with _lock:
        # SD-Turbo: guidance_scale=0.0, 1–4 steps
        result = pipe(
            prompt=prompt,
            num_inference_steps=steps,
            guidance_scale=0.0,
            width=width,
            height=height,
            generator=generator,
        )
    image = result.images[0]
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=92)
    meta = {
        "model": MODEL_ID,
        "device": _device,
        "steps": steps,
        "width": width,
        "height": height,
        "seed": seed,
        "elapsed_sec": round(time.time() - t0, 2),
        "provider": "local-sd-turbo",
        "meta": "Local model · SD-Turbo · no external AI",
    }
    return buf.getvalue(), meta


class GenRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    width: int = 512
    height: int = 512
    steps: int = 1
    seed: int | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eager-load in background so /health shows progress
    def _bg():
        try:
            load_pipeline()
        except Exception as e:
            print(f"[pixforge-ai] model load failed: {e}", flush=True)

    threading.Thread(target=_bg, daemon=True).start()
    yield


app = FastAPI(title="PixForge Local AI", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "ok": True,
        "local": True,
        "external_ai": False,
        **_status,
        "error": _load_error,
    }


@app.post("/generate")
def generate(req: GenRequest):
    if not req.prompt.strip():
        raise HTTPException(400, "Prompt is required")
    try:
        jpeg, meta = generate_image(
            req.prompt.strip(),
            width=req.width,
            height=req.height,
            steps=req.steps,
            seed=req.seed,
        )
    except Exception as e:
        raise HTTPException(500, f"Local generation failed: {e}") from e

    b64 = base64.b64encode(jpeg).decode("ascii")
    return {
        "imageDataUrl": f"data:image/jpeg;base64,{b64}",
        **meta,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=HOST)
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--preload", action="store_true", help="Block until model loads")
    args = parser.parse_args()

    # Safety: only bind loopback by default
    if args.host not in ("127.0.0.1", "localhost", "::1"):
        print(
            f"[pixforge-ai] WARNING: binding {args.host}; prefer 127.0.0.1",
            flush=True,
        )

    if args.preload:
        load_pipeline()

    import uvicorn

    print(
        f"[pixforge-ai] Local SD-Turbo sidecar on http://{args.host}:{args.port}",
        flush=True,
    )
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
