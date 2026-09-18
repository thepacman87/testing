#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="${ROOT}/.venv-ai"
export PIXFORGE_CACHE="${PIXFORGE_CACHE:-$ROOT/.cache/huggingface}"
export HF_HOME="${HF_HOME:-$PIXFORGE_CACHE}"
export HUGGINGFACE_HUB_CACHE="${HUGGINGFACE_HUB_CACHE:-$PIXFORGE_CACHE/hub}"
export PIXFORGE_AI_HOST="${PIXFORGE_AI_HOST:-127.0.0.1}"
export PIXFORGE_AI_PORT="${PIXFORGE_AI_PORT:-8100}"

if [[ ! -x "$VENV/bin/python" ]]; then
  echo "[pixforge-ai] Creating .venv-ai …"
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -U pip wheel setuptools
  "$VENV/bin/pip" install torch --index-url https://download.pytorch.org/whl/cpu
  "$VENV/bin/pip" install -r "$ROOT/ai-sidecar/requirements.txt"
fi

exec "$VENV/bin/python" "$ROOT/ai-sidecar/server.py" "$@"
