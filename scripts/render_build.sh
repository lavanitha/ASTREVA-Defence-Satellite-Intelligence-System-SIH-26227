#!/usr/bin/env bash
set -euo pipefail

python -m pip install --upgrade pip
python -m pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision
python -m pip install -r requirements-full.txt

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
