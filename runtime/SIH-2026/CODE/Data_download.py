"""
Phase 1: Sentinel-2 Data Download for Ranchi AOI
SIH Problem Statement 26227 — Ministry of Defence

Downloads median-composite GeoTIFFs from Copernicus Data Space (OpenEO)
for 6 time windows between 2020–2025.

Usage:
    Activate venv, then run:
        python Data_download.py

Output:
    ../Dataset/ranchi_<year>_<month>.tif   (one file per snapshot)
    ../Dataset/download_log.csv            (catalogue of downloaded files)
"""

import os
import csv
import time
import openeo

# ─── CONFIG ──────────────────────────────────────────────────────────────────

RANCHI_BBOX = {
    "west":  85.15,
    "south": 23.20,
    "east":  85.45,
    "north": 23.45,
}

# Bands: Blue, Green, Red, NIR  (will be saved as 4-band GeoTIFF)
BANDS = ["B02", "B03", "B04", "B08"]

# 6 snapshots across 5 years (approx. every 6 months)
SNAPSHOT_DATES = [
    ("2020-01-01", "2020-01-31"),
    ("2020-06-01", "2020-06-30"),
    ("2021-06-01", "2021-06-30"),
    ("2022-12-01", "2022-12-31"),
    ("2023-06-01", "2023-06-30"),
    ("2024-12-01", "2024-12-31"),
]

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Dataset"))
LOG_FILE   = os.path.join(OUTPUT_DIR, "download_log.csv")

# ─── SETUP ───────────────────────────────────────────────────────────────────

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 55)
print("  SIH-26227 | Ranchi Sentinel-2 Data Downloader")
print("=" * 55)
print(f"Output folder : {OUTPUT_DIR}")
print(f"Total snapshots: {len(SNAPSHOT_DATES)}\n")

# ─── CONNECT ─────────────────────────────────────────────────────────────────

print("[1/3] Connecting to Copernicus Data Space...")
connection = openeo.connect("openeo.dataspace.copernicus.eu")

print("[2/3] Authenticating (browser/device flow)...")
connection.authenticate_oidc()
print("      ✓ Authenticated!\n")

# ─── DOWNLOAD LOOP ───────────────────────────────────────────────────────────

log_rows = []
failed   = []

for idx, (start, end) in enumerate(SNAPSHOT_DATES, start=1):
    year  = start[:4]
    month = start[5:7]
    fname = f"ranchi_{year}_{month}.tif"
    fpath = os.path.join(OUTPUT_DIR, fname)

    print(f"[{idx}/{len(SNAPSHOT_DATES)}] Fetching {start} → {end}  →  {fname}")

    # Skip if already downloaded (resume support)
    if os.path.exists(fpath) and os.path.getsize(fpath) > 10_000:
        print(f"      ↩  Already exists, skipping.\n")
        log_rows.append({
            "filename": fname, "start": start, "end": end,
            "bands": ",".join(BANDS), "status": "skipped",
            "size_bytes": os.path.getsize(fpath),
        })
        continue

    try:
        t0 = time.time()

        # Load Sentinel-2 Level-2A collection
        cube = connection.load_collection(
            "SENTINEL2_L2A",
            spatial_extent=RANCHI_BBOX,
            temporal_extent=[start, end],
            bands=BANDS,
        )

        # Cloud masking using SCL (Scene Classification Layer)
        scl = connection.load_collection(
            "SENTINEL2_L2A",
            spatial_extent=RANCHI_BBOX,
            temporal_extent=[start, end],
            bands=["SCL"],
        )
        # Keep only: vegetation(4), bare soil(5), water(6), built-up(11)
        cloud_mask = (scl.band("SCL") == 4) | \
                     (scl.band("SCL") == 5) | \
                     (scl.band("SCL") == 6) | \
                     (scl.band("SCL") == 11)
        cube = cube.mask(~cloud_mask)

        # Temporal median composite → single image
        cube = cube.reduce_dimension(dimension="t", reducer="median")

        # Download as GeoTIFF
        cube.download(fpath, format="GTiff")

        elapsed = time.time() - t0
        size_mb = os.path.getsize(fpath) / (1024 * 1024)
        print(f"      ✓ Saved ({size_mb:.1f} MB, {elapsed:.0f}s)\n")

        log_rows.append({
            "filename": fname, "start": start, "end": end,
            "bands": ",".join(BANDS), "status": "ok",
            "size_bytes": os.path.getsize(fpath),
        })

    except Exception as e:
        print(f"      ✗ FAILED: {e}\n")
        failed.append((start, end, str(e)))
        log_rows.append({
            "filename": fname, "start": start, "end": end,
            "bands": ",".join(BANDS), "status": f"error: {e}",
            "size_bytes": 0,
        })

# ─── WRITE CATALOGUE CSV ─────────────────────────────────────────────────────

print("[3/3] Writing download catalogue...")
with open(LOG_FILE, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["filename","start","end","bands","status","size_bytes"])
    writer.writeheader()
    writer.writerows(log_rows)
print(f"      ✓ Log saved: {LOG_FILE}\n")

# ─── SUMMARY ─────────────────────────────────────────────────────────────────

ok_count   = sum(1 for r in log_rows if r["status"] == "ok")
skip_count = sum(1 for r in log_rows if r["status"] == "skipped")
fail_count = len(failed)

print("=" * 55)
print(f"  Download complete!")
print(f"  ✓ Downloaded : {ok_count}")
print(f"  ↩ Skipped    : {skip_count}")
print(f"  ✗ Failed     : {fail_count}")
if failed:
    print("\n  Failed snapshots:")
    for s, e, err in failed:
        print(f"    {s} → {e} : {err}")
print("=" * 55)
