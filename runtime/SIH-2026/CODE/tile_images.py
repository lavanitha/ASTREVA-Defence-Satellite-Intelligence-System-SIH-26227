"""
Phase 2: Tile Sentinel-2 composites into fixed-size chips (fixed version)
SIH Problem Statement 26227 — Ministry of Defence

Reads each ranchi_<year>_<month>.tif from ../Dataset, splits it into
512x512 pixel tiles (edge tiles are zero-padded to the full size), skips
tiles that are mostly nodata/cloud-masked, and writes a catalogue (CSV)
recording each tile's source file, pixel window, geographic bounding box
(lat/lon), date and sensor. Safe to re-run: already-tiled files are
skipped and their existing catalogue rows are preserved.

Usage:
    python tile_images.py

Output:
    ../Dataset/Tiles/<source_stem>_tile_<row>_<col>.tif
    ../Dataset/tile_catalogue.csv
"""

import os
import csv
import glob
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.warp import transform_bounds

TILE_SIZE = 512
MAX_NODATA_FRACTION = 0.40  # skip tile if more than 40% of pixels are nodata

DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Dataset"))
TILES_DIR = os.path.join(DATASET_DIR, "Tiles")
CATALOGUE_FILE = os.path.join(DATASET_DIR, "tile_catalogue.csv")
FIELDNAMES = ["tile_file", "source_file", "acquisition_date", "row", "col",
              "lon_min", "lat_min", "lon_max", "lat_max", "sensor", "nodata_fraction"]

os.makedirs(TILES_DIR, exist_ok=True)

# ─── RESUME SUPPORT: load any existing catalogue so re-runs don't lose it ────

existing_rows = {}
if os.path.exists(CATALOGUE_FILE):
    with open(CATALOGUE_FILE, newline="") as f:
        for r in csv.DictReader(f):
            existing_rows[r["tile_file"]] = r
    print(f"Found existing catalogue with {len(existing_rows)} tiles — will resume.\n")

catalogue_rows = []
total_written = 0
total_skipped = 0
total_resumed = 0

source_files = sorted(glob.glob(os.path.join(DATASET_DIR, "ranchi_*.tif")))

print("=" * 55)
print("  SIH-26227 | Tiling pipeline")
print("=" * 55)
print(f"Found {len(source_files)} source composites\n")

for src_path in source_files:
    fname = os.path.basename(src_path)
    parts = fname.replace(".tif", "").split("_")
    year, month = parts[1], parts[2]
    acquisition_date = f"{year}-{month}-01"

    with rasterio.open(src_path) as src:
        width, height = src.width, src.height
        # Only extract complete 512x512 tiles fully contained in the scene (no black padding)
        n_tiles_x = width // TILE_SIZE
        n_tiles_y = height // TILE_SIZE

        print(f"[{fname}] {width}x{height} px -> up to {n_tiles_x * n_tiles_y} tiles")

        for row in range(n_tiles_y):
            for col in range(n_tiles_x):
                tile_name = f"{fname.replace('.tif', '')}_tile_{row}_{col}.tif"
                tile_path = os.path.join(TILES_DIR, tile_name)

                # Resume: if this tile was already written and logged, keep it as-is
                if tile_name in existing_rows and os.path.exists(tile_path):
                    catalogue_rows.append(existing_rows[tile_name])
                    total_resumed += 1
                    continue

                x_off = col * TILE_SIZE
                y_off = row * TILE_SIZE

                # boundless read: edge tiles get zero-padded to full TILE_SIZE
                window = Window(x_off, y_off, TILE_SIZE, TILE_SIZE)
                data = src.read(window=window, boundless=True, fill_value=0)

                # Nodata check: use the file's actual nodata value if it has
                # one, otherwise fall back to "all bands zero at this pixel"
                nodata_value = src.nodata if src.nodata is not None else 0
                invalid = np.all(data == nodata_value, axis=0)
                nodata_fraction = float(np.mean(invalid))

                if nodata_fraction > MAX_NODATA_FRACTION:
                    total_skipped += 1
                    continue

                transform = src.window_transform(window)
                profile = src.profile.copy()
                profile.update({"height": TILE_SIZE, "width": TILE_SIZE, "transform": transform})

                with rasterio.open(tile_path, "w", **profile) as dst:
                    dst.write(data)

                tile_bounds = rasterio.windows.bounds(window, src.transform)
                lon_min, lat_min, lon_max, lat_max = transform_bounds(
                    src.crs, "EPSG:4326", *tile_bounds
                )

                catalogue_rows.append({
                    "tile_file": tile_name,
                    "source_file": fname,
                    "acquisition_date": acquisition_date,
                    "row": row,
                    "col": col,
                    "lon_min": round(lon_min, 6),
                    "lat_min": round(lat_min, 6),
                    "lon_max": round(lon_max, 6),
                    "lat_max": round(lat_max, 6),
                    "sensor": "Sentinel-2 L2A",
                    "nodata_fraction": round(nodata_fraction, 3),
                })
                total_written += 1

print(f"\nWriting catalogue -> {CATALOGUE_FILE}")
with open(CATALOGUE_FILE, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
    writer.writeheader()
    writer.writerows(catalogue_rows)

print("=" * 55)
print(f"  Tiling complete!")
print(f"  Newly written          : {total_written}")
print(f"  Resumed (already done) : {total_resumed}")
print(f"  Skipped (low quality)  : {total_skipped}")
print("=" * 55)
