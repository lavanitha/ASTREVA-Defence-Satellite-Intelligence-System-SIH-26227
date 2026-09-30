#!/usr/bin/env bash
set -euo pipefail

python scripts/prepare_render_runtime.py
exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-10000}"
