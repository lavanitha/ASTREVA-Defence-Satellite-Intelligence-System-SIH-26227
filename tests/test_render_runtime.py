import csv
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import faiss
import numpy as np
import pytest

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.prepare_render_runtime import (
    REQUIRED_FILES,
    prepare_persistent_dataset,
    verify_source_dataset,
)
from backend.services.sih_features import perform_incremental_ingest


def create_source_dataset(source_dir: Path, tile_bytes: bytes = b"II*\x00") -> None:
    (source_dir / "Tiles").mkdir(parents=True)
    (source_dir / "Tiles" / "sample.tif").write_bytes(tile_bytes)
    (source_dir / "Tiles" / "unindexed_test.tif").write_bytes(b"test-only")
    for relative_path in REQUIRED_FILES:
        required_path = source_dir / relative_path
        required_path.parent.mkdir(parents=True, exist_ok=True)
        if relative_path == "Index/tile_metadata.json":
            required_path.write_text(json.dumps([{"tile_file": "sample.tif"}]), encoding="utf-8")
        elif relative_path == "Index/tiles.faiss":
            index = faiss.IndexFlatIP(2)
            index.add(np.asarray([[1.0, 0.0]], dtype=np.float32))
            faiss.write_index(index, str(required_path))
        else:
            required_path.write_text("[]", encoding="utf-8")

    with (source_dir / "tile_catalogue.csv").open("w", encoding="utf-8", newline="") as catalogue_file:
        writer = csv.DictWriter(catalogue_file, fieldnames=["tile_file", "acquisition_date"])
        writer.writeheader()
        writer.writerow({"tile_file": "sample.tif", "acquisition_date": "2024-01-01"})


def test_data_seed_preserves_audit_state_when_assets_update(tmp_path: Path) -> None:
    source_dir = tmp_path / "bundle"
    dataset_dir = tmp_path / "persistent"
    create_source_dataset(source_dir)

    assert prepare_persistent_dataset(source_dir, dataset_dir, "v1") == 1
    assert not (dataset_dir / "Tiles" / "unindexed_test.tif").exists()
    audit_file = dataset_dir / "audit_trail.json"
    audit_file.write_text(json.dumps([{"id": "AUD-1"}]), encoding="utf-8")
    catalogue_file = dataset_dir / "tile_catalogue.csv"
    with catalogue_file.open("a", encoding="utf-8", newline="") as file:
        file.write("sample.tif,2024-01-01\n")

    prepare_persistent_dataset(source_dir, dataset_dir, "v2")

    assert (dataset_dir / "Tiles" / "sample.tif").read_bytes() == b"II*\x00"
    assert json.loads(audit_file.read_text(encoding="utf-8")) == [{"id": "AUD-1"}]
    with catalogue_file.open(encoding="utf-8", newline="") as file:
        assert len(list(csv.DictReader(file))) == 1


def test_data_bootstrap_keeps_local_source_in_place(tmp_path: Path) -> None:
    source_dir = tmp_path / "local-dataset"
    create_source_dataset(source_dir)

    assert prepare_persistent_dataset(source_dir, source_dir, "local") == 1
    assert (source_dir / "Tiles" / "sample.tif").is_file()
    assert (source_dir / "Tiles" / "unindexed_test.tif").is_file()
    assert json.loads((source_dir / "audit_trail.json").read_text(encoding="utf-8")) == []


def test_source_verifier_rejects_unresolved_lfs_pointer(tmp_path: Path) -> None:
    source_dir = tmp_path / "bundle"
    create_source_dataset(source_dir, b"version https://git-lfs.github.com/spec/v1\n")

    with pytest.raises(RuntimeError, match="Git LFS pointer was not materialized"):
        verify_source_dataset(source_dir)


def test_new_tile_ingest_persists_index_metadata_and_catalogue(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    index = faiss.IndexFlatIP(2)
    index.add(np.asarray([[1.0, 0.0]], dtype=np.float32))
    semantic_search = SimpleNamespace(
        index=index,
        metadata=[{"tile_file": "existing.tif", "acquisition_date": "2024-01-01"}],
        embed_image_tile=lambda _: np.asarray([[0.0, 1.0]], dtype=np.float32),
    )
    monkeypatch.setitem(sys.modules, "semantic_search", semantic_search)

    tiles_dir = tmp_path / "Tiles"
    index_dir = tmp_path / "Index"
    tiles_dir.mkdir()
    index_dir.mkdir()
    (tiles_dir / "new_scene.tif").write_bytes(b"source-raster")
    catalogue_file = tmp_path / "tile_catalogue.csv"
    with catalogue_file.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["tile_file", "source_file", "acquisition_date", "lon_min", "lat_min", "lon_max", "lat_max", "sensor", "nodata_fraction"])
        writer.writeheader()
        writer.writerow({"tile_file": "existing.tif", "acquisition_date": "2024-01-01"})

    result = perform_incremental_ingest(
        scene_name="new_scene.tif",
        sensor="Sentinel-2 L2A",
        acquisition_date="2025-01-01",
        lat=23.3,
        lon=85.3,
        catalogue_file=str(catalogue_file),
        tiles_dir=str(tiles_dir),
        index_dir=str(index_dir),
    )

    persisted_index = faiss.read_index(str(index_dir / "tiles.faiss"))
    persisted_metadata = json.loads((index_dir / "tile_metadata.json").read_text(encoding="utf-8"))
    with catalogue_file.open(encoding="utf-8", newline="") as file:
        catalogue_rows = list(csv.DictReader(file))
    assert result["updated_index_total_tiles"] == 2
    assert persisted_index.ntotal == len(persisted_metadata) == len(semantic_search.metadata) == 2
    assert persisted_metadata[-1]["tile_file"] == "new_scene.tif"
    assert catalogue_rows[-1]["tile_file"] == "new_scene.tif"