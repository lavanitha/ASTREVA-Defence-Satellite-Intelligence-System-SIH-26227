"""
Phase 3: Build embeddings + FAISS index for all tiles
SIH Problem Statement 26227 — Ministry of Defence

Reads ../Dataset/tile_catalogue.csv, converts each Sentinel-2 tile
(B02/B03/B04/B08) into an RGB image, encodes it with a pretrained
CLIP model, and stores the embedding in a FAISS index.

Model: open_clip ViT-B-32, pretrained on laion2b_s34b_b79k
  (open license, weights are cached locally after first download —
   package the ~600MB cache folder for fully offline use later)

Incremental: re-running this script only embeds tiles that are new
in the catalogue since the last run — it does not rebuild the index.

Usage:
    pip install open-clip-torch faiss-cpu pillow rasterio numpy pandas
    python build_embeddings_index.py

Output:
    ../Dataset/Index/tiles.faiss        (vector index)
    ../Dataset/Index/tile_metadata.json (id -> tile info, in index order)
"""

import os
import json
import numpy as np
import pandas as pd
import rasterio
import torch
import open_clip
import faiss
from PIL import Image

DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Dataset"))
TILES_DIR = os.path.join(DATASET_DIR, "Tiles")
CATALOGUE_FILE = os.path.join(DATASET_DIR, "tile_catalogue.csv")

INDEX_DIR = os.path.join(DATASET_DIR, "Index")
INDEX_FILE = os.path.join(INDEX_DIR, "tiles.faiss")
METADATA_FILE = os.path.join(INDEX_DIR, "tile_metadata.json")
STRETCH_FILE  = os.path.join(INDEX_DIR, "stretch_bounds.json")

os.makedirs(INDEX_DIR, exist_ok=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
BATCH_SIZE = 16

# ─── LOAD MODEL ───────────────────────────────────────────────────────────────

print("=" * 55)
print("  SIH-26227 | Embedding + index builder")
print("=" * 55)
print(f"Device: {DEVICE}")
print("Loading CLIP model (ViT-B-32, laion2b_s34b_b79k)...")
print("(First run will download ~600MB model weights — please wait)\n")

model, _, preprocess = open_clip.create_model_and_transforms(
    "ViT-B-32", pretrained="laion2b_s34b_b79k"
)
model = model.to(DEVICE).eval()

with torch.no_grad():
    _dummy = torch.zeros(1, 3, 224, 224).to(DEVICE)
    EMBED_DIM = model.encode_image(_dummy).shape[-1]
print(f"Model loaded. Embedding dimension: {EMBED_DIM}\n")


def compute_global_stretch_bounds(catalogue, tiles_dir, sample_size=40):
    """
    Computes ONE fixed (p2, p98) reflectance range from a sample of tiles
    across the whole catalogue. Using the same bounds for every tile keeps
    brightness/contrast consistent across dates — important for change
    detection so we don't introduce radiometric inconsistency.
    """
    sample = catalogue.sample(min(sample_size, len(catalogue)), random_state=42)
    pixels = []
    for _, row in sample.iterrows():
        tile_path = os.path.join(tiles_dir, row["tile_file"])
        if not os.path.exists(tile_path):
            continue
        with rasterio.open(tile_path) as src:
            rgb_bands = src.read([1, 2, 3])
        pixels.append(rgb_bands[rgb_bands > 0].ravel())

    all_pixels = np.concatenate(pixels)
    p2, p98 = np.percentile(all_pixels, [2, 98])
    print(f"Global stretch bounds (p2={p2:.0f}, p98={p98:.0f}) from {len(sample)} sampled tiles\n")
    return float(p2), float(p98)


def tile_to_rgb(tile_path, p2, p98):
    """
    Reads a 4-band tile (B02, B03, B04, B08) and converts first 3 bands
    (Blue, Green, Red) into an 8-bit RGB PIL image using dataset-wide
    stretch bounds for consistent brightness across dates.
    """
    with rasterio.open(tile_path) as src:
        data = src.read()  # (4, 512, 512)

    blue, green, red = data[0], data[1], data[2]
    rgb = np.stack([red, green, blue], axis=-1).astype(np.float32)
    rgb = np.clip(rgb, p2, p98)
    rgb = ((rgb - p2) / (p98 - p2 + 1e-6) * 255).astype(np.uint8)
    return Image.fromarray(rgb)


def embed_batch(tile_paths, p2, p98):
    tensors = [preprocess(tile_to_rgb(p, p2, p98)) for p in tile_paths]
    batch = torch.stack(tensors).to(DEVICE)
    with torch.no_grad():
        embeddings = model.encode_image(batch)
        embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)
    return embeddings.cpu().numpy().astype("float32")


# ─── LOAD CATALOGUE ────────────────────────────────────────────────────────────

catalogue = pd.read_csv(CATALOGUE_FILE)
print(f"Catalogue has {len(catalogue)} tiles\n")

# ─── LOAD EXISTING INDEX (resume / incremental) ────────────────────────────────

if os.path.exists(INDEX_FILE) and os.path.exists(METADATA_FILE):
    index = faiss.read_index(INDEX_FILE)
    with open(METADATA_FILE) as f:
        metadata = json.load(f)
    already_indexed = {m["tile_file"] for m in metadata}
    print(f"Loaded existing index with {index.ntotal} vectors — will add new tiles only.\n")
else:
    index = faiss.IndexFlatIP(EMBED_DIM)
    metadata = []
    already_indexed = set()
    print("No existing index found — creating a new one.\n")

new_tiles = catalogue[~catalogue["tile_file"].isin(already_indexed)].reset_index(drop=True)
print(f"{len(new_tiles)} new tiles to embed\n")

if len(new_tiles) == 0:
    print("Nothing to do — index is already up to date!")
    exit(0)

if os.path.exists(STRETCH_FILE):
    with open(STRETCH_FILE) as f:
        bounds = json.load(f)
    p2, p98 = bounds["p2"], bounds["p98"]
    print(f"Loaded saved stretch bounds: p2={p2:.0f}, p98={p98:.0f}\n")
else:
    p2, p98 = compute_global_stretch_bounds(catalogue, TILES_DIR)

# ─── EMBED IN BATCHES + ADD ─────────────────────────────────────────────────────

new_vectors = []
n_embedded = 0

for batch_start in range(0, len(new_tiles), BATCH_SIZE):
    batch_rows = new_tiles.iloc[batch_start: batch_start + BATCH_SIZE]

    valid_rows = []
    valid_paths = []
    for _, row in batch_rows.iterrows():
        tile_path = os.path.join(TILES_DIR, row["tile_file"])
        if not os.path.exists(tile_path):
            print(f"  ! Missing file, skipping: {row['tile_file']}")
            continue
        valid_rows.append(row)
        valid_paths.append(tile_path)

    if not valid_paths:
        continue

    batch_vectors = embed_batch(valid_paths, p2, p98)
    new_vectors.append(batch_vectors)

    for row in valid_rows:
        metadata.append({
            "tile_file": row["tile_file"],
            "source_file": row["source_file"],
            "acquisition_date": row["acquisition_date"],
            "lon_min": row["lon_min"], "lat_min": row["lat_min"],
            "lon_max": row["lon_max"], "lat_max": row["lat_max"],
            "sensor": row["sensor"],
        })

    n_embedded += len(valid_paths)
    print(f"  Embedded {n_embedded}/{len(new_tiles)} tiles...")

if new_vectors:
    index.add(np.vstack(new_vectors))

# ─── SAVE ────────────────────────────────────────────────────────────────────

faiss.write_index(index, INDEX_FILE)
with open(METADATA_FILE, "w") as f:
    json.dump(metadata, f, indent=2)
if not os.path.exists(STRETCH_FILE):
    with open(STRETCH_FILE, "w") as f:
        json.dump({"p2": p2, "p98": p98}, f, indent=2)
    print(f"Stretch bounds saved: {STRETCH_FILE}")

print("\n" + "=" * 55)
print(f"  Index build complete!")
print(f"  Newly embedded : {n_embedded}")
print(f"  Total in index : {index.ntotal}")
print(f"  Saved index    : {INDEX_FILE}")
print(f"  Saved metadata : {METADATA_FILE}")
print("=" * 55)
