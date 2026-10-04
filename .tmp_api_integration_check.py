import json
import os
import sys
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import backend.main as api


with tempfile.TemporaryDirectory() as temp_dir:
    api.EXPORTS_FILE = str(Path(temp_dir) / "exports.json")
    api.EXPORTS_DIR = str(Path(temp_dir) / "exports")
    api.AUDIT_FILE = str(Path(temp_dir) / "audit.json")
    api.DECISIONS_FILE = str(Path(temp_dir) / "decisions.json")

    with TestClient(api.app) as client:
        health = client.get("/api/health")
        aois = client.get("/api/aois")
        candidates = client.get("/api/candidates")
        scenes = client.get("/api/scenes")
        audits = client.get("/api/audit")
        catalog = client.get("/api/stac/catalog")

        assert health.status_code == 200, health.text
        assert len(aois.json()) == 1
        assert round(aois.json()[0]["areaSqKm"], 1) == 807.2
        assert len(candidates.json()) == 34
        assert len(scenes.json()) == 180
        assert audits.json() == []
        assert len(catalog.json()["links"]) == 181

        scene = scenes.json()[0]
        stac_item = client.get(f"/api/stac/items/{scene['stacItemId']}")
        assert stac_item.status_code == 200, stac_item.text
        assert stac_item.json()["id"] == scene["stacItemId"]

        tile_image = client.get(f"/api/tiles/{scene['tile_file']}/image")
        assert tile_image.status_code == 200, tile_image.text[:200]
        assert tile_image.headers["content-type"] == "image/png"

        candidate = candidates.json()[0]
        candidate_id = candidate["id"]
        decision = client.post(
            f"/api/candidates/{candidate_id}/status",
            json={"status": "confirmed", "note": "integration test"},
        )
        note = client.post(
            f"/api/candidates/{candidate_id}/notes",
            json={"note": "integration note"},
        )
        assert decision.status_code == 200, decision.text
        assert note.status_code == 200, note.text

        missing_feature_codes = {}
        for route in (
            "backtracking",
            "false-alarm-explain",
            "cross-validation",
            "co-registration",
        ):
            response = client.get(f"/api/candidates/{candidate_id}/{route}")
            missing_feature_codes[route] = response.status_code
            assert response.status_code == 404, response.text

        egress = client.get("/api/system/zero-egress-proof")
        metrics = client.get("/api/evaluation/metrics")
        assert egress.status_code == 200
        assert egress.json()["airgapStatus"] == "NOT VERIFIED"
        assert metrics.status_code == 404

        export_ids = []
        for export_format in ("GeoJSON", "Analyst CSV", "STAC Item Catalog", "Intelligence Dossier (PDF/HTML)"):
            created = client.post("/api/exports", json={
                "title": f"Integration {export_format}",
                "format": export_format,
                "aoi": "All Active AOIs (National)",
                "exportedBy": "Integration Test",
            })
            assert created.status_code == 200, created.text
            package = created.json()
            assert package["candidateCount"] == 34
            download = client.get(package["downloadUrl"])
            assert download.status_code == 200, download.text[:200]
            export_ids.append(package["id"])

        query = client.post("/api/search", json={
            "query": "River water channel and sandbars",
            "top_k": 5,
        })
        assert query.status_code == 200, query.text
        hits = query.json()["results"]
        assert len(hits) == 5, query.text
        assert all(left["score"] >= right["score"] for left, right in zip(hits, hits[1:]))
        assert all(os.path.isfile(os.path.join(api.SIH_TILES_DIR, hit["tile_file"])) for hit in hits)

        final_health = client.get("/api/health").json()
        assert final_health["faiss_index_tiles"] == 180
        assert final_health["sih_ml_active"] is True
        assert client.get("/api/audit").status_code == 200

        print(json.dumps({
            "health_status": final_health["status"],
            "aoi_count": len(aois.json()),
            "candidate_count": len(candidates.json()),
            "scene_count": len(scenes.json()),
            "stac_items": len(catalog.json()["links"]) - 1,
            "tile_image_status": tile_image.status_code,
            "review_status_status": decision.status_code,
            "analyst_note_status": note.status_code,
            "missing_optional_evidence_status": missing_feature_codes,
            "egress_status": egress.json()["airgapStatus"],
            "evaluation_status": metrics.status_code,
            "export_ids": export_ids,
            "semantic_query": query.json()["query"],
            "faiss_vectors": final_health["faiss_index_tiles"],
            "ranked_hits": [{"score": hit["score"], "tile": hit["tile_file"], "date": hit["acquisition_date"]} for hit in hits],
        }, indent=2))
