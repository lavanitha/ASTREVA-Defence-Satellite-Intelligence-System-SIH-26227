import pytest
from fastapi.testclient import TestClient
import sys
import os

BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app as test_app

client = TestClient(test_app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"

def test_feature_1_backtracking():
    response = client.get("/api/candidates/CAND-2026-0004/backtracking")
    assert response.status_code == 200
    data = response.json()
    assert "earliest_change_date" in data
    assert "time_series_observations" in data
    assert len(data["time_series_observations"]) > 0

def test_feature_2_incremental_ingest():
    payload = {
        "scene_name": "Test_Incremental_Scene_2026.tif",
        "sensor": "Sentinel-2 Optical",
        "acquisition_date": "2026-03-24",
        "lat": 23.3441,
        "lon": 85.3096
    }
    response = client.post("/api/ingest/incremental", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "ingestion_time_ms" in data
    assert data["ingestion_time_ms"] >= 0

def test_feature_3_false_alarm_explanation():
    response = client.get("/api/candidates/CAND-2026-0004/false-alarm-explain")
    assert response.status_code == 200
    data = response.json()
    assert "factors" in data
    assert "cloudShadow" in data["factors"]
    assert "seasonalPhenology" in data["factors"]

def test_feature_4_cross_validation():
    response = client.get("/api/candidates/CAND-2026-0004/cross-validation")
    assert response.status_code == 200
    data = response.json()
    assert "optical_confidence" in data
    assert "sar_confidence" in data
    assert "fused_confidence" in data

def test_feature_5_cryptographic_audit():
    response = client.get("/api/audit/verify")
    assert response.status_code == 200
    data = response.json()
    assert data["chainValid"] is True
    assert "genesisHash" in data

def test_feature_6_stac_provenance():
    response = client.get("/api/stac/items/CAND-2026-0004")
    assert response.status_code == 200
    data = response.json()
    assert data["stac_version"] == "1.0.0"
    assert "properties" in data
    assert "assets" in data

    cat_resp = client.get("/api/stac/catalog")
    assert cat_resp.status_code == 200
    assert cat_resp.json()["stac_version"] == "1.0.0"

def test_feature_7_zero_egress_proof():
    response = client.get("/api/system/zero-egress-proof")
    assert response.status_code == 200
    data = response.json()
    assert data["externalRequestsCount"] == 0
    assert "evidenceHash" in data

def test_feature_8_heldout_evaluation():
    response = client.get("/api/evaluation/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "precision" in data
    assert "recall" in data
    assert "queryLatency" in data

def test_feature_9_candidates_filtering():
    response = client.get("/api/candidates?aoi_id=AOI-IND-03&status=pending")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_feature_10_coregistration():
    response = client.get("/api/candidates/CAND-2026-0004/co-registration")
    assert response.status_code == 200
    data = response.json()
    assert "subpixelShift" in data
    assert "radiometricNormalization" in data
