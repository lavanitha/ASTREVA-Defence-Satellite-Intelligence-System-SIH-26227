import argparse
import csv
import json
import os
import shutil
from pathlib import Path

import faiss


ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET_LINK = ROOT_DIR / "runtime" / "SIH-2026" / "Dataset"
DATASET_BUNDLE = DATASET_LINK.with_name("Dataset.bundle")
REQUIRED_FILES = (
    "tile_catalogue.csv",
    "Index/tiles.faiss",
    "Index/tile_metadata.json",
    "Index/stretch_bounds.json",
    "Index/review_queue.json",
    "Index/change_candidates_audited.json",
    "Index/tile_clusters.json",
)
STATE_FILES = ("analyst_decisions.json", "audit_trail.json")


def source_dataset_dir() -> Path:
    if DATASET_LINK.is_symlink() and DATASET_BUNDLE.is_dir():
        return DATASET_BUNDLE
    return DATASET_LINK


def load_indexed_tile_names(source_dir: Path) -> set[str]:
    with (source_dir / "Index" / "tile_metadata.json").open(encoding="utf-8") as metadata_file:
        metadata = json.load(metadata_file)
    if not isinstance(metadata, list):
        raise RuntimeError("Tile metadata must be a JSON array")

    indexed_tile_names = {item.get("tile_file") for item in metadata if isinstance(item, dict)}
    if len(indexed_tile_names) != len(metadata) or None in indexed_tile_names:
        raise RuntimeError("Tile metadata contains missing or duplicate tile filenames")

    index = faiss.read_index(str(source_dir / "Index" / "tiles.faiss"))
    if index.ntotal != len(metadata):
        raise RuntimeError("FAISS index row count does not match tile metadata")

    with (source_dir / "tile_catalogue.csv").open(encoding="utf-8", newline="") as catalogue_file:
        catalogue_names = {row.get("tile_file") for row in csv.DictReader(catalogue_file)}
    if not indexed_tile_names.issubset(catalogue_names):
        raise RuntimeError("Tile catalogue is missing indexed imagery rows")

    return indexed_tile_names


def write_indexed_catalogue(source_path: Path, target_path: Path, indexed_tile_names: set[str]) -> None:
    with source_path.open(encoding="utf-8", newline="") as catalogue_file:
        reader = csv.DictReader(catalogue_file)
        fieldnames = reader.fieldnames or []
        rows = []
        seen_names = set()
        for row in reader:
            tile_name = row.get("tile_file")
            if tile_name in indexed_tile_names and tile_name not in seen_names:
                rows.append(row)
                seen_names.add(tile_name)

    if seen_names != indexed_tile_names:
        raise RuntimeError("Could not create a complete, deduplicated tile catalogue")

    target_path.parent.mkdir(parents=True, exist_ok=True)
    with target_path.open("w", encoding="utf-8", newline="") as catalogue_file:
        writer = csv.DictWriter(catalogue_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def verify_source_dataset(source_dir: Path) -> int:
    for relative_path in REQUIRED_FILES:
        if not (source_dir / relative_path).is_file():
            raise RuntimeError(f"Required runtime data is missing: {relative_path}")

    indexed_tile_names = load_indexed_tile_names(source_dir)
    tiles_dir = source_dir / "Tiles"
    available_tile_names = {tile_path.name for tile_path in tiles_dir.glob("*.tif")}
    if not indexed_tile_names:
        raise RuntimeError(f"No GeoTIFF tiles found under {tiles_dir}")
    missing_tile_names = indexed_tile_names - available_tile_names
    if missing_tile_names:
        raise RuntimeError(f"Indexed GeoTIFF is missing: {sorted(missing_tile_names)[0]}")

    for tile_name in indexed_tile_names:
        tile_path = tiles_dir / tile_name
        with tile_path.open("rb") as tile_file:
            if tile_file.read(80).startswith(b"version https://git-lfs.github.com/spec/v1"):
                raise RuntimeError(f"Git LFS pointer was not materialized: {tile_path.name}")

    return len(indexed_tile_names)


def prepare_persistent_dataset(source_dir: Path, dataset_dir: Path, data_version: str) -> int:
    tile_count = verify_source_dataset(source_dir)
    indexed_tile_names = load_indexed_tile_names(source_dir)
    if source_dir.resolve() == dataset_dir.resolve():
        for state_file in STATE_FILES:
            state_path = dataset_dir / state_file
            if not state_path.exists():
                state_path.write_text(json.dumps([]), encoding="utf-8")
        return tile_count

    marker = dataset_dir / ".astreva-data-version"
    marker_matches = marker.is_file() and marker.read_text(encoding="utf-8").strip() == data_version
    required_present = all((dataset_dir / path).is_file() for path in REQUIRED_FILES)
    deployed_tile_names = {tile_path.name for tile_path in (dataset_dir / "Tiles").glob("*.tif")}

    if not (marker_matches and required_present and indexed_tile_names.issubset(deployed_tile_names)):
        dataset_dir.mkdir(parents=True, exist_ok=True)
        for source_path in source_dir.iterdir():
            if source_path.name in STATE_FILES or source_path.name == "search_results":
                continue
            target_path = dataset_dir / source_path.name
            if source_path.name == "Tiles" and source_path.is_dir():
                target_path.mkdir(parents=True, exist_ok=True)
                for tile_name in indexed_tile_names:
                    shutil.copy2(source_path / tile_name, target_path / tile_name)
            elif source_path.name == "tile_catalogue.csv":
                write_indexed_catalogue(source_path, target_path, indexed_tile_names)
            elif source_path.is_dir():
                shutil.copytree(source_path, target_path, dirs_exist_ok=True)
            else:
                shutil.copy2(source_path, target_path)
        (dataset_dir / "search_results").mkdir(exist_ok=True)

        temporary_marker = marker.with_suffix(".tmp")
        temporary_marker.write_text(data_version, encoding="utf-8")
        temporary_marker.replace(marker)

    for state_file in STATE_FILES:
        state_path = dataset_dir / state_file
        if not state_path.exists():
            state_path.write_text(json.dumps([]), encoding="utf-8")

    return tile_count


def link_dataset_to_disk(dataset_dir: Path) -> None:
    if DATASET_LINK.is_symlink():
        return
    if DATASET_LINK.resolve() == dataset_dir.resolve():
        return
    if not DATASET_BUNDLE.exists():
        DATASET_LINK.rename(DATASET_BUNDLE)
    relative_target = os.path.relpath(dataset_dir, DATASET_LINK.parent)
    DATASET_LINK.symlink_to(relative_target, target_is_directory=True)


def prepare_runtime() -> None:
    source_dir = source_dataset_dir()
    dataset_dir = Path(os.environ.get("ASTREVA_DATASET_DIR", DATASET_LINK)).resolve()
    data_version = os.environ.get("ASTREVA_DATA_VERSION", "sih2026-v1")
    tile_count = prepare_persistent_dataset(source_dir, dataset_dir, data_version)
    link_dataset_to_disk(dataset_dir)

    for cache_variable in ("HF_HOME", "TORCH_HOME"):
        cache_dir = os.environ.get(cache_variable)
        if cache_dir:
            Path(cache_dir).mkdir(parents=True, exist_ok=True)

    print(f"ASTREVA runtime data ready: {tile_count} tiles at {dataset_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify-source-only", action="store_true")
    args = parser.parse_args()
    source_dir = source_dataset_dir()
    tile_count = verify_source_dataset(source_dir)

    if args.verify_source_only:
        print(f"Verified {tile_count} GeoTIFF runtime assets")
    else:
        prepare_runtime()
