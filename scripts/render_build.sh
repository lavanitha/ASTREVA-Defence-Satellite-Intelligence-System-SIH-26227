#!/usr/bin/env bash
set -euo pipefail

export PIP_NO_CACHE_DIR=1
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1
export OPENBLAS_NUM_THREADS=1

python -m pip install --upgrade pip
python -m pip install --index-url https://download.pytorch.org/whl/cpu "torch==2.4.1" "torchvision==0.19.1"
python -m pip install --no-cache-dir -r requirements.txt
python -m pip install --no-cache-dir "faiss-cpu==1.15.1"

if ! git lfs version >/dev/null 2>&1; then
  version=3.7.1
  archive="$(mktemp)"
  curl -fsSL "https://github.com/git-lfs/git-lfs/releases/download/v${version}/git-lfs-linux-amd64-v${version}.tar.gz" -o "$archive"
  tar -xzf "$archive" -C /tmp
  mkdir -p "$HOME/.local/bin"
  install -m 0755 "/tmp/git-lfs-${version}/git-lfs" "$HOME/.local/bin/git-lfs"
  export PATH="$HOME/.local/bin:$PATH"
fi

git lfs install --local
git lfs pull
python scripts/prepare_render_runtime.py --verify-source-only
