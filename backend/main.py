import os
import sys
import io
import json
import math
import time
import csv
import threading
import importlib
import html
import uuid

for thread_variable in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS", "NUMEXPR_NUM_THREADS"):
    os.environ.setdefault(thread_variable, "1")

from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# ─── PATH SETUP ───────────────────────────────────────────────────────────────
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
DEFAULT_SIH_CODE_DIR = os.path.join(ROOT_DIR, "runtime", "SIH-2026", "CODE")
CONFIGURED_SIH_CODE_DIR = os.environ.get("ASTREVA_CODE_DIR")
SIH_CODE_DIR_CANDIDATES = [
    path for path in (CONFIGURED_SIH_CODE_DIR, DEFAULT_SIH_CODE_DIR)
    if path
]
SIH_CODE_DIR = next(
    (path for path in SIH_CODE_DIR_CANDIDATES if os.path.isfile(os.path.join(path, "semantic_search.py"))),
    CONFIGURED_SIH_CODE_DIR or DEFAULT_SIH_CODE_DIR,
)
SIH_DATASET_DIR = os.environ.get(
    "ASTREVA_DATASET_DIR",
    os.path.join(ROOT_DIR, "runtime", "SIH-2026", "Dataset"),
)
SIH_TILES_DIR = os.path.join(SIH_DATASET_DIR, "Tiles")
SIH_INDEX_DIR = os.path.join(SIH_DATASET_DIR, "Index")
SIH_PREVIEWS_DIR = os.path.join(SIH_DATASET_DIR, "change_previews")
SIH_SEARCH_DIR = os.path.join(SIH_DATASET_DIR, "search_results")

# Ensure SIH CODE directory and BACKEND directory are in Python path
if SIH_CODE_DIR not in sys.path:
    sys.path.insert(0, SIH_CODE_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import services.sih_features as sih_features

import numpy as np
from PIL import Image

HAS_RASTERIO = False

try:
    import tifffile
    HAS_TIFFFILE = True
except Exception:
    HAS_TIFFFILE = False

# Keep process startup lightweight; load the inference runtime on first use.
HAS_SIH_ML = False
SIH_ML_IMPORT_ERROR = None
semantic_search = None
_SEMANTIC_SEARCH_LOCK = threading.Lock()


def load_semantic_search():
    global HAS_SIH_ML, SIH_ML_IMPORT_ERROR, semantic_search
    if semantic_search is not None:
        return semantic_search

    with _SEMANTIC_SEARCH_LOCK:
        if semantic_search is not None:
            return semantic_search

        try:
            import torch

            torch.set_num_threads(1)
            try:
                torch.set_num_interop_threads(1)
            except RuntimeError:
                pass

            module = importlib.import_module("semantic_search")
            if module.index.ntotal != len(module.metadata):
                raise RuntimeError("FAISS index and semantic metadata are out of sync")
            semantic_search = module
            HAS_SIH_ML = True
            SIH_ML_IMPORT_ERROR = None
            return module
        except Exception as exc:
            SIH_ML_IMPORT_ERROR = f"{type(exc).__name__}: {exc}"
            raise

# ─── FASTAPI APP INITIALIZATION ───────────────────────────────────────────────
app = FastAPI(
    title="SIH PS-26227 Satellite Intelligence Enclave API",
    description="REST API wrapper connecting SIH2P-2 Frontend to SIH-2PGITB&U2 Python/ML Engine",
    version="1.0.0"
)

allowed_origins = [
    "https://astreva-defence-satellite-intellige.vercel.app",
]
allowed_origins.extend(
    origin.strip().rstrip("/")
    for origin in os.getenv("ASTREVA_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file mounts for previews and search results
if os.path.exists(SIH_PREVIEWS_DIR):
    app.mount("/static/change_previews", StaticFiles(directory=SIH_PREVIEWS_DIR), name="change_previews")
if os.path.exists(SIH_SEARCH_DIR):
    app.mount("/static/search_results", StaticFiles(directory=SIH_SEARCH_DIR), name="search_results")
if os.path.exists(SIH_TILES_DIR):
    app.mount("/static/tiles_raw", StaticFiles(directory=SIH_TILES_DIR), name="tiles_raw")


# ─── SCHEMAS ──────────────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: Optional[str] = None
    image_tile: Optional[str] = None
    top_k: int = 10
    min_confidence: float = 0.0
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    aoi_id: Optional[str] = None
    sensor: Optional[str] = None
    change_type: Optional[str] = None

class CandidateStatusUpdate(BaseModel):
    status: str = Field(..., description="'confirmed' | 'rejected' | 'pending'")
    note: Optional[str] = None

class AnalystNoteCreate(BaseModel):
    note: str

class DiscoverySimilarRequest(BaseModel):
    tile_file: str
    top_k: int = 5

class ExportCreateRequest(BaseModel):
    title: str
    format: str
    aoi: str
    exportedBy: str
    candidate_ids: Optional[List[str]] = None
    candidateCount: int = 0

class IncrementalIngestRequest(BaseModel):
    scene_name: str
    sensor: str = "Sentinel-2 Optical"
    acquisition_date: str = "2026-03-24"
    lat: float = 23.3441
    lon: float = 85.3096


# ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────
DECISIONS_FILE = os.path.join(SIH_DATASET_DIR, "analyst_decisions.json")
AUDIT_FILE = os.path.join(SIH_DATASET_DIR, "audit_trail.json")
REVIEW_QUEUE_FILE = os.path.join(SIH_INDEX_DIR, "review_queue.json")
AUDITED_CANDIDATES_FILE = os.path.join(SIH_INDEX_DIR, "change_candidates_audited.json")
CATALOGUE_FILE = os.path.join(SIH_DATASET_DIR, "tile_catalogue.csv")
CLUSTERS_FILE = os.path.join(SIH_INDEX_DIR, "tile_clusters.json")
EXPORTS_FILE = os.path.join(SIH_DATASET_DIR, "exports.json")
EXPORTS_DIR = os.path.join(SIH_DATASET_DIR, "exports")

def load_json_file(file_path: str, default=None):
    if default is None:
        default = []
    if not os.path.exists(file_path):
        return default
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return default

def save_json_file(file_path: str, data: Any):
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving {file_path}: {e}")

def load_decisions_map():
    decisions = load_json_file(DECISIONS_FILE, [])
    res = {}
    for d in decisions:
        cid = d.get("candidate_id")
        if cid:
            res[cid] = d
    return res

def map_sih_candidate_to_frontend(item: dict, index_num: int, decisions_map: dict) -> dict:
    row = item.get("row", index_num)
    col = item.get("col", index_num)
    cand_id = f"CAND-2026-{row:02d}{col:02d}" if "row" in item else f"CAND-2026-08{index_num:02d}"
    
    # Check decision log for manual analyst overrides
    decision_info = decisions_map.get(cand_id, {})
    current_status = decision_info.get("decision") or item.get("status") or "pending"
    
    # Map change_type to frontend dropdown options
    raw_type = item.get("change_type", "road_development")
    type_map = {
        "road_development": "Road Development",
        "construction": "Construction",
        "land_clearing": "Land Clearing",
        "water_extent": "Water Change",
        "vegetation_loss": "Vegetation Loss",
        "agriculture_change": "Agriculture Change"
    }
    change_type = type_map.get(raw_type, "Road Development")
    
    lon_min = item.get("lon_min", 85.3468)
    lat_min = item.get("lat_min", 23.4060)
    
    adj_conf = item.get("adjusted_confidence", item.get("confidence", 0.85))
    if adj_conf <= 1.0:
        confidence_pct = int(round(adj_conf * 100))
    else:
        confidence_pct = int(round(adj_conf))
        
    before_tile = item.get("before_tile") or item.get("before_file") or ""
    after_tile = item.get("after_tile") or item.get("after_file") or ""
    preview_file = item.get("preview_file", "")
    
    seasonal_penalty = item.get("seasonal_penalty", 0.0)
    quality_factor = item.get("quality_factor", 1.0)
    suppression_reasons = item.get("suppression_reasons", [])
    
    risk_level = "High" if seasonal_penalty > 0 else ("Medium" if quality_factor < 0.9 else "Low")
    
    area_ha = item.get("area_hectares")
    
    notes = []
    if decision_info.get("analyst_notes"):
        notes.append(decision_info["analyst_notes"])
        
    review_history = []
    if decision_info.get("timestamp"):
        review_history.append({
            "user": "Senior GEOINT Officer",
            "action": f"SET_STATUS_{current_status.upper()}",
            "timestamp": decision_info["timestamp"],
            "note": decision_info.get("analyst_notes")
        })
        
    backtracking = item.get("backtracking") or sih_features.compute_earliest_change_backtracking(item)
    false_alarm = item.get("false_alarm_6factor") or sih_features.compute_explainable_false_alarm(item)
    cross_validation = item.get("cross_validation") or sih_features.compute_dual_sensor_cross_validation(item)
    coreg = item.get("co_registration") or sih_features.compute_coregistration_radiometric_validation(item)
    stac_item = item.get("stac_item") or sih_features.generate_stac_item({
        "id": cand_id,
        "coordinates": [lat_min, lon_min],
        "afterDate": item.get("after_date", ""),
        "sensor": item.get("sensor", "Sentinel-2 Optical"),
        "before_tile": before_tile,
        "after_tile": after_tile,
    })

    return {
        "id": cand_id,
        "title": f"{change_type} Anomaly (Sector R{row}C{col})",
        "locationName": f"Ranchi Plateau Sector, Jharkhand ({lat_min:.4f}°N, {lon_min:.4f}°E)",
        "state": "Jharkhand",
        "coordinates": [lat_min, lon_min],
        "aoiId": "AOI-IND-03",
        "aoiName": "Ranchi Subarnarekha Mining & Excavation Belt",
        "changeType": change_type,
        "confidence": confidence_pct,
        "detectionDate": item.get("after_date", ""),
        "earliestEvidenceDate": item.get("earliest_observation", ""),
        "beforeDate": item.get("before_date", ""),
        "afterDate": item.get("after_date", ""),
        "areaHectares": area_ha,
        "sensors": ["Sentinel-2 Optical"] if "Sentinel-2" in str(item.get("sensor", "")) else [],
        "status": current_status,
        "analystNotes": notes,
        "reviewHistory": review_history,
        "thumbnails": {
            "beforeRGB": f"/api/tiles/{before_tile}/image",
            "afterRGB": f"/api/tiles/{after_tile}/image",
            "ndvi": f"/api/tiles/{after_tile}/image?mode=ndvi",
            "ndbi": f"/api/tiles/{after_tile}/image?mode=ndbi",
            "sar": f"/api/tiles/{after_tile}/image?mode=sar",
            "changeMask": f"/api/tiles/mask?before={before_tile}&after={after_tile}"
        },
        "temporalTimeline": item.get("temporal_timeline", []),
        "evidenceChecklist": item.get("evidence_checklist", []),
        "falseAlarmRisk": {
            "riskLevel": risk_level,
            "seasonalAnomaly": bool(seasonal_penalty > 0),
            "cloudShadowArtifact": bool(quality_factor < 0.9),
            "factors": suppression_reasons
        },
        "backtracking": backtracking,
        "falseAlarm6Factor": false_alarm,
        "crossValidation": cross_validation,
        "stacItem": stac_item,
        "coRegistration": coreg,
        "polygonBoundary": [
            [float(item.get("lat_min", lat_min)), float(item.get("lon_min", lon_min))],
            [float(item.get("lat_min", lat_min)), float(item.get("lon_max", lon_min))],
            [float(item.get("lat_max", lat_min)), float(item.get("lon_max", lon_min))],
            [float(item.get("lat_max", lat_min)), float(item.get("lon_min", lon_min))],
            [float(item.get("lat_min", lat_min)), float(item.get("lon_min", lon_min))]
        ]
    }


# ─── API ENDPOINTS ────────────────────────────────────────────────────────────

@app.get("/api/health")
def get_health():
    """Lightweight liveness check that does not initialize the ML stack."""
    return {
        "status": "healthy",
        "service": "astreva-backend",
        "enclave": "AIR-GAPPED DEFENCE SYSTEM (100% LOCAL)",
        "python_version": sys.version.split()[0],
        "runtime": "fastapi",
        "sih_ml_active": HAS_SIH_ML,
        "sih_ml_import_error": SIH_ML_IMPORT_ERROR,
        "faiss_index_tiles": getattr(semantic_search, "index", None).ntotal if semantic_search is not None and hasattr(semantic_search, "index") else 0,
        "catalogue_tiles": len(load_catalogue()),
        "candidate_count": len(load_candidate_records()),
        "components": [
            {"component": "api", "status": "ready"},
            {"component": "dataset", "status": "ready" if os.path.exists(CATALOGUE_FILE) else "not_ready"},
            {"component": "model", "status": "loaded" if semantic_search is not None else "not_loaded"},
            {"component": "faiss", "status": "ready" if semantic_search is not None and hasattr(semantic_search, "index") else "not_ready"},
        ],
    }


@app.get("/api/readiness")
def get_readiness():
    """Detailed readiness report without forcing model initialization."""
    model_loaded = semantic_search is not None
    faiss_ready = model_loaded and hasattr(semantic_search, "index") and getattr(semantic_search.index, "ntotal", 0) > 0
    catalogue_ready = os.path.exists(CATALOGUE_FILE)
    dataset_ready = os.path.exists(SIH_DATASET_DIR)

    return {
        "status": "ready" if catalogue_ready and dataset_ready else "not_ready",
        "api": "ready",
        "model": "loaded" if model_loaded else "not_loaded",
        "faiss": "ready" if faiss_ready else "not_ready",
        "aoi": "ready" if catalogue_ready else "not_ready",
        "dataset": SIH_DATASET_DIR,
        "catalogue_tiles": len(load_catalogue()),
    }

@app.get("/api/aois")
def get_aois():
    """Return AOIs backed by the deployed satellite catalogue."""
    catalogue = load_catalogue()
    if not catalogue:
        return []

    lons = [float(row["lon_min"]) for row in catalogue] + [float(row["lon_max"]) for row in catalogue]
    lats = [float(row["lat_min"]) for row in catalogue] + [float(row["lat_max"]) for row in catalogue]
    candidates = load_candidate_records()
    west, east, south, north = min(lons), max(lons), min(lats), max(lats)
    earth_radius_km = 6371.0088
    area_sq_km = earth_radius_km ** 2 * abs(
        math.radians(east - west)
        * (math.sin(math.radians(north)) - math.sin(math.radians(south)))
    )
    return [{
        "id": "AOI-IND-03",
        "name": "Ranchi Subarnarekha Mining & Excavation Belt",
        "region": "Jharkhand / Chota Nagpur Plateau",
        "center": [(south + north) / 2, (west + east) / 2],
        "zoom": 12,
        "areaSqKm": round(area_sq_km, 1),
        "lastIngested": max(row.get("acquisition_date", "") for row in catalogue),
        "activeScenesCount": len(catalogue),
        "candidateCount": len(candidates),
        "description": f"Ranchi, Jharkhand; {len(catalogue)} catalogue-backed satellite tiles.",
        "polygonCoords": [[south, west], [south, east], [north, east], [north, west], [south, west]],
    }]


def load_candidate_records():
    """Load the complete audited result set, falling back only to the full pipeline output."""
    candidates = load_json_file(AUDITED_CANDIDATES_FILE, None)
    if not candidates:
        candidates = load_json_file(os.path.join(SIH_INDEX_DIR, "change_candidates.json"), [])
    return candidates if isinstance(candidates, list) else []


def load_catalogue():
    if not os.path.isfile(CATALOGUE_FILE):
        return []
    try:
        with open(CATALOGUE_FILE, newline="", encoding="utf-8") as catalogue_file:
            return list(csv.DictReader(catalogue_file))
    except (OSError, csv.Error):
        return []

@app.get("/api/candidates")
def get_candidates(
    aoi_id: Optional[str] = None,
    status: Optional[str] = None,
    change_type: Optional[str] = None,
    min_confidence: Optional[int] = None
):
    """Returns change candidates generated by SIH-2026 change detection & false alarm suppression pipeline"""
    raw_candidates = load_candidate_records()

    decisions_map = load_decisions_map()
    
    mapped_list = []
    if aoi_id and aoi_id not in ("ALL", "AOI-IND-03"):
        return []
    for idx, item in enumerate(raw_candidates):
        cand = map_sih_candidate_to_frontend(item, idx, decisions_map)
        
        # Apply filters
        if status and status != "ALL" and cand["status"] != status:
            continue
        if change_type and change_type != "ALL" and cand["changeType"] != change_type:
            continue
        if min_confidence is not None and cand["confidence"] < min_confidence:
            continue
            
        mapped_list.append(cand)
        
    return mapped_list

@app.get("/api/candidates/{candidate_id}")
def get_candidate_by_id(candidate_id: str):
    candidates = get_candidates()
    for c in candidates:
        if c["id"] == candidate_id:
            return c
    raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")

@app.post("/api/candidates/{candidate_id}/status")
def update_candidate_status(candidate_id: str, payload: CandidateStatusUpdate):
    """Updates candidate status (confirmed, rejected, pending) and notes in decision log"""
    decisions = load_json_file(DECISIONS_FILE, [])
    
    # Locate candidate in existing review queue
    candidates = get_candidates()
    target_cand = next((c for c in candidates if c["id"] == candidate_id), None)
    if not target_cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    entry = {
        "candidate_id": candidate_id,
        "decision": payload.status,
        "analyst_notes": payload.note or f"Status set to {payload.status}",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "change_type": target_cand["changeType"],
        "confidence": target_cand["confidence"]
    }
    
    # Update or append decision
    updated = False
    for i, d in enumerate(decisions):
        if d.get("candidate_id") == candidate_id:
            decisions[i] = entry
            updated = True
            break
    if not updated:
        decisions.append(entry)
        
    save_json_file(DECISIONS_FILE, decisions)
    return {"status": "SUCCESS", "message": f"Candidate {candidate_id} updated to {payload.status}", "candidate_id": candidate_id}

@app.post("/api/candidates/{candidate_id}/notes")
def add_candidate_note(candidate_id: str, payload: AnalystNoteCreate):
    """Appends analyst note to a candidate"""
    decisions = load_json_file(DECISIONS_FILE, [])
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC")
    formatted_note = f"[{timestamp} by Senior GEOINT Officer] {payload.note}"
    
    for d in decisions:
        if d.get("candidate_id") == candidate_id:
            existing = d.get("analyst_notes", "")
            d["analyst_notes"] = f"{existing}\n{formatted_note}" if existing else formatted_note
            save_json_file(DECISIONS_FILE, decisions)
            return {"status": "SUCCESS", "message": "Note added"}
            
    # If decision entry doesn't exist yet, create one
    decisions.append({
        "candidate_id": candidate_id,
        "decision": "pending",
        "analyst_notes": formatted_note,
        "timestamp": timestamp
    })
    save_json_file(DECISIONS_FILE, decisions)
    return {"status": "SUCCESS", "message": "Note added"}

@app.post("/api/search")
def search_tiles(payload: SearchRequest):
    """
    Executes real OpenCLIP ViT-B/32 + FAISS vector search over 180 satellite tiles.
    Fulfills Phase 4 Semantic Search.
    """
    try:
        engine = load_semantic_search()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Semantic inference could not initialize: {exc}") from exc

    try:
        if payload.query:
            query_vec = engine.embed_text(payload.query)
            query_label = payload.query
        elif payload.image_tile:
            tile_path = os.path.join(SIH_TILES_DIR, os.path.basename(payload.image_tile))
            if not os.path.exists(tile_path):
                raise HTTPException(status_code=404, detail=f"Image tile not found: {payload.image_tile}")
            query_vec = engine.embed_image_tile(tile_path)
            query_label = os.path.basename(payload.image_tile)
        else:
            raise HTTPException(status_code=400, detail="Must provide either text query or image_tile")

        pool_size = min(payload.top_k * 10, engine.index.ntotal)
        raw_results = engine.search(query_vec, top_k=pool_size)

        filtered = engine.apply_filters(
            raw_results,
            date_from=payload.date_from,
            date_to=payload.date_to
        )

        if payload.aoi_id and payload.aoi_id not in ("ALL", "AOI-IND-03"):
            return {"query": query_label, "results_count": 0, "results": []}
        if payload.sensor:
            filtered = [
                (score, meta) for score, meta in filtered
                if payload.sensor.lower() in str(meta.get("sensor", "")).lower()
            ]
        if payload.change_type:
            type_map = {
                "Road Development": "road_development",
                "Construction": "construction",
                "Land Clearing": "land_clearing",
                "Water Change": "water_extent",
                "Agriculture Change": "agriculture_change",
                "Vegetation Loss": "vegetation_loss",
            }
            target_type = type_map.get(payload.change_type, payload.change_type)
            matching_tiles = set()
            for candidate in load_candidate_records():
                if candidate.get("change_type") == target_type:
                    matching_tiles.update(
                        tile for tile in (candidate.get("before_tile"), candidate.get("after_tile")) if tile
                    )
            filtered = [(score, meta) for score, meta in filtered if meta.get("tile_file") in matching_tiles]
        
        top_results = filtered[: payload.top_k]
        
        formatted_results = []
        decisions_map = load_decisions_map()
        
        for rank, (score, meta) in enumerate(top_results, 1):
            tile_file = meta["tile_file"]
            formatted_results.append({
                "rank": rank,
                "score": round(score, 4),
                "similarity_pct": int(round(score * 100)),
                "tile_file": tile_file,
                "acquisition_date": meta["acquisition_date"],
                "lat_min": meta["lat_min"],
                "lat_max": meta["lat_max"],
                "lon_min": meta["lon_min"],
                "lon_max": meta["lon_max"],
                "sensor": meta["sensor"],
                "image_url": f"/api/tiles/{tile_file}/image"
            })
            
        return {
            "query": query_label,
            "results_count": len(formatted_results),
            "results": formatted_results
        }
    except Exception as e:
        print(f"Error in vector search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clusters")
def get_terrain_clusters():
    """
    Returns unsupervised 8-cluster terrain landscape grouping.
    Fulfills Phase 7A Discovery & Clustering (PS 2.2.4).
    """
    clusters_data = load_json_file(CLUSTERS_FILE, {})
    if not clusters_data:
        try:
            clustering_discovery = importlib.import_module("clustering_discovery")
            clusters_data = clustering_discovery.build_clusters(n_clusters=8)
        except Exception as e:
            print(f"Error building clusters: {e}")

    # Format clusters for UI display
    formatted_clusters = []
    cluster_names = [
        "Dry Agricultural Scrub & Cleared Ground",
        "Dense Urban Infrastructure & Paved Roads",
        "Monsoon Vegetation & Riverbank Basins",
        "Step-Terraced Open-Cast Excavations",
        "Peri-Urban Commercial Warehousing",
        "Silt Accretion Bar & Riverbed Channels",
        "High-Altitude Switchback Earthworks",
        "Unclassified Fallow Terrain Enclave"
    ]
    
    for cid, data in clusters_data.items():
        c_id_int = int(cid)
        c_name = cluster_names[c_id_int % len(cluster_names)]
        exemplar = data.get("exemplar_tile", "")
        members = data.get("members", [])
        
        first_member = members[0] if members else {}
        lat = first_member.get("lat", 23.34)
        lon = first_member.get("lon", 85.30)
        
        formatted_clusters.append({
            "cluster_id": c_id_int,
            "id": f"CLUS-IND-0{c_id_int + 1}",
            "name": c_name,
            "total_tiles": data.get("total_tiles", len(members)),
            "exemplar_tile": exemplar,
            "exemplar_image_url": f"/api/tiles/{exemplar}/image" if exemplar else "",
            "coordinates": [lat, lon],
            "members": [
                {
                    "tile_file": m.get("tile_file"),
                    "date": m.get("date"),
                    "coordinates": [m.get("lat"), m.get("lon")],
                    "dist_to_center": m.get("dist_to_center"),
                    "image_url": f"/api/tiles/{m.get('tile_file')}/image"
                }
                for m in members[:12]
            ]
        })
        
    return formatted_clusters

@app.post("/api/discovery/similar")
def find_similar_sites(payload: DiscoverySimilarRequest):
    """
    One-Click "Find Similar Sites" using FAISS tile embedding distance.
    Fulfills Phase 7A One-Click Discovery.
    """
    try:
        import faiss

        index = faiss.read_index(os.path.join(SIH_INDEX_DIR, "tiles.faiss"))
        metadata = load_json_file(os.path.join(SIH_INDEX_DIR, "tile_metadata.json"), [])
        filename = os.path.basename(payload.tile_file)
        target_index = next(
            (idx for idx, item in enumerate(metadata) if item.get("tile_file") == filename),
            None,
        )
        if target_index is None:
            raise HTTPException(status_code=404, detail=f"Tile not found in semantic index: {filename}")

        target_vector = index.reconstruct(target_index).reshape(1, -1)
        scores, indices = index.search(target_vector, min(payload.top_k + 1, index.ntotal))
        results = []
        for score, result_index in zip(scores[0], indices[0]):
            if result_index < 0:
                continue
            result = metadata[int(result_index)]
            if result.get("tile_file") == filename:
                continue
            results.append({
                "rank": len(results) + 1,
                "similarity_score": round(float(score), 4),
                "tile_file": result["tile_file"],
                "date": result["acquisition_date"],
                "lat": result["lat_min"],
                "lon": result["lon_min"],
                "sensor": result["sensor"],
                "image_url": f"/api/tiles/{result['tile_file']}/image",
            })
        return {
            "target_tile": payload.tile_file,
            "count": len(results),
            "similar_sites": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/change-detection/run")
def run_change_detection(background_tasks: BackgroundTasks):
    """Trigger execution of full multi-temporal change detection pipeline"""
    def task():
        print("Running full change detection pipeline in background...")
        for script_name in ("change_detection.py", "false_alarm_suppression.py"):
            script_path = os.path.join(SIH_CODE_DIR, script_name)
            if not os.path.isfile(script_path):
                print(f"Pipeline script is unavailable: {script_path}")
                continue
            result = os.system(f'"{sys.executable}" "{script_path}"')
            if result != 0:
                print(f"Pipeline script failed: {script_name} (exit {result})")

    background_tasks.add_task(task)
    return {"status": "STARTED", "message": "Change detection and false-alarm suppression executed."}

@app.get("/api/scenes")
def get_scene_records():
    """Returns satellite scenes catalog from tile_catalogue.csv"""
    if not os.path.exists(CATALOGUE_FILE):
        return []

    def parse_float(value: Optional[str], default: Optional[float] = None) -> Optional[float]:
        try:
            return float(value) if value not in (None, "") else default
        except (TypeError, ValueError):
            return default

    scenes = []
    with open(CATALOGUE_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            tile_file = row.get("tile_file", "")
            date = row.get("acquisition_date", "")
            lat_min = parse_float(row.get("lat_min"))
            lon_min = parse_float(row.get("lon_min"))
            lat_max = parse_float(row.get("lat_max"))
            lon_max = parse_float(row.get("lon_max"))
            if not tile_file or not date or None in (lat_min, lon_min, lat_max, lon_max):
                continue
            tile_path = os.path.join(SIH_TILES_DIR, os.path.basename(tile_file))
            source_sensor = row.get("sensor", "")
            
            scenes.append({
                "id": f"SCENE-S2-{i+1:04d}",
                "sensor": "Sentinel-2 Optical" if "Sentinel-2" in source_sensor else source_sensor,
                "acquisitionDate": date,
                "aoiName": "Ranchi Subarnarekha Mining & Excavation Belt",
                "cloudCover": parse_float(row.get("cloud_cover_pct")),
                "resolutionMeters": parse_float(row.get("resolution_meters")),
                "processingState": "Processed (L2A)" if "L2A" in source_sensor else "Archived",
                "footprintCoords": [
                    [lat_min, lon_min], [lat_min, lon_max], [lat_max, lon_max], [lat_max, lon_min], [lat_min, lon_min]
                ],
                "checksum": row.get("checksum", ""),
                "stacItemId": tile_file.replace(".tif", ""),
                "fileSizeBytes": os.path.getsize(tile_path) if os.path.isfile(tile_path) else 0,
                "tile_file": tile_file,
                "image_url": f"/api/tiles/{tile_file}/image"
            })
    return scenes


def build_scene_stac_item(scene: dict) -> dict:
    footprint = scene["footprintCoords"]
    ring = [[lon, lat] for lat, lon in footprint]
    longitudes = [point[0] for point in ring]
    latitudes = [point[1] for point in ring]
    date = scene["acquisitionDate"]
    return {
        "stac_version": "1.0.0",
        "type": "Feature",
        "id": scene["stacItemId"],
        "bbox": [min(longitudes), min(latitudes), max(longitudes), max(latitudes)],
        "geometry": {"type": "Polygon", "coordinates": [ring]},
        "properties": {
            "datetime": None,
            "start_datetime": f"{date}T00:00:00Z",
            "end_datetime": f"{date}T23:59:59Z",
            "datetime_precision": "date",
            "platform": "sentinel-2" if "Sentinel-2" in scene["sensor"] else scene["sensor"],
            "instruments": ["msi"] if "Sentinel-2" in scene["sensor"] else [],
        },
        "links": [
            {"rel": "self", "href": f"/api/stac/items/{scene['stacItemId']}", "type": "application/geo+json"},
            {"rel": "root", "href": "/api/stac/catalog", "type": "application/json"},
        ],
        "assets": {
            "data": {
                "href": f"/static/tiles_raw/{scene['tile_file']}",
                "type": "image/tiff; application=geotiff",
                "roles": ["data"],
            }
        },
    }


def load_export_packages() -> list:
    packages = load_json_file(EXPORTS_FILE, [])
    return packages if isinstance(packages, list) else []


@app.get("/api/exports")
def get_export_packages():
    return load_export_packages()


@app.post("/api/exports")
def create_export_package(payload: ExportCreateRequest):
    supported_formats = {"GeoJSON", "Analyst CSV", "STAC Item Catalog", "Intelligence Dossier (PDF/HTML)"}
    if payload.format not in supported_formats:
        raise HTTPException(status_code=422, detail=f"Unsupported export format: {payload.format}")
    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="An export title is required")

    candidates = get_candidates()
    if payload.aoi != "All Active AOIs (National)":
        candidates = [candidate for candidate in candidates if candidate["aoiName"] == payload.aoi]
    if payload.candidate_ids is not None:
        candidate_ids = set(payload.candidate_ids)
        candidates = [candidate for candidate in candidates if candidate["id"] in candidate_ids]
    scenes = get_scene_records()

    if payload.format == "GeoJSON":
        features = []
        for candidate in candidates:
            boundary = candidate.get("polygonBoundary") or []
            geometry = {
                "type": "Polygon",
                "coordinates": [[[lon, lat] for lat, lon in boundary]],
            } if len(boundary) >= 4 else {
                "type": "Point",
                "coordinates": [candidate["coordinates"][1], candidate["coordinates"][0]],
            }
            features.append({
                "type": "Feature",
                "id": candidate["id"],
                "geometry": geometry,
                "properties": {
                    "title": candidate["title"],
                    "change_type": candidate["changeType"],
                    "confidence": candidate["confidence"],
                    "before_date": candidate["beforeDate"],
                    "after_date": candidate["afterDate"],
                    "area_hectares": candidate["areaHectares"],
                    "status": candidate["status"],
                },
            })
        content = json.dumps({"type": "FeatureCollection", "features": features}, indent=2)
        extension, media_type = ".geojson", "application/geo+json"
    elif payload.format == "Analyst CSV":
        output = io.StringIO()
        fieldnames = ["id", "title", "changeType", "confidence", "status", "aoiName", "beforeDate", "afterDate", "areaHectares", "latitude", "longitude"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for candidate in candidates:
            writer.writerow({
                **{field: candidate.get(field) for field in fieldnames if field not in {"latitude", "longitude"}},
                "latitude": candidate["coordinates"][0],
                "longitude": candidate["coordinates"][1],
            })
        content = output.getvalue()
        extension, media_type = ".csv", "text/csv"
    elif payload.format == "STAC Item Catalog":
        content = json.dumps(get_stac_root_catalog(), indent=2)
        extension, media_type = ".json", "application/json"
    else:
        rows = "".join(
            "<tr>" + "".join(
                f"<td>{html.escape(str(value if value is not None else ''))}</td>"
                for value in (
                    candidate["id"], candidate["title"], candidate["changeType"], candidate["confidence"],
                    candidate["status"], candidate["beforeDate"], candidate["afterDate"], candidate["areaHectares"],
                )
            ) + "</tr>"
            for candidate in candidates
        )
        content = (
            "<!doctype html><html><head><meta charset=\"utf-8\"><title>"
            + html.escape(payload.title)
            + "</title></head><body><h1>"
            + html.escape(payload.title)
            + "</h1><p>Source: live SIH-2026 candidate records</p><table><thead><tr>"
            + "<th>ID</th><th>Title</th><th>Type</th><th>Confidence</th><th>Status</th>"
            + "<th>Before</th><th>After</th><th>Area (ha)</th></tr></thead><tbody>"
            + rows
            + "</tbody></table></body></html>"
        )
        extension, media_type = ".html", "text/html"

    os.makedirs(EXPORTS_DIR, exist_ok=True)
    export_id = f"EXP-{uuid.uuid4().hex[:12].upper()}"
    filename = f"{export_id}{extension}"
    filepath = os.path.join(EXPORTS_DIR, filename)
    with open(filepath, "w", encoding="utf-8", newline="") as export_file:
        export_file.write(content)

    package = {
        "id": export_id,
        "title": payload.title,
        "format": payload.format,
        "aoi": payload.aoi,
        "candidateCount": len(candidates),
        "fileSize": f"{os.path.getsize(filepath) / 1024:.1f} KB",
        "createdDate": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "status": "Ready",
        "downloadUrl": f"/api/exports/{export_id}/download",
        "exportedBy": payload.exportedBy,
        "filename": filename,
        "mediaType": media_type,
    }
    temporary_path = f"{EXPORTS_FILE}.{os.getpid()}.tmp"
    with open(temporary_path, "w", encoding="utf-8") as exports_file:
        json.dump([package, *load_export_packages()], exports_file, indent=2)
    os.replace(temporary_path, EXPORTS_FILE)

    audit_logs = load_json_file(AUDIT_FILE, [])
    audit_logs.insert(0, {
        "id": f"AUD-{uuid.uuid4().hex[:10].upper()}",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "eventType": "EXPORT_DATASET",
        "user": payload.exportedBy,
        "role": "Analyst",
        "ipAddress": "Not recorded",
        "details": f"Generated {payload.format} export {export_id} from {len(candidates)} live candidates and {len(scenes)} scenes.",
        "status": "SUCCESS",
    })
    save_json_file(AUDIT_FILE, audit_logs[:200])
    return package


@app.get("/api/exports/{export_id}/download")
def download_export_package(export_id: str):
    package = next((item for item in load_export_packages() if item.get("id") == export_id), None)
    if package is None:
        raise HTTPException(status_code=404, detail=f"Export package not found: {export_id}")
    filename = os.path.basename(package.get("filename", ""))
    filepath = os.path.join(EXPORTS_DIR, filename)
    if not filename or not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Export file is no longer available")
    return FileResponse(filepath, media_type=package.get("mediaType", "application/octet-stream"), filename=filename)


@app.get("/api/tiles/mask")
def get_change_mask(before: str, after: str):
    """
    Computes real binary Black (no change = 0) / White (detected change = 255) mask
    from before & after GeoTIFF satellite tiles using SIH-2026 change detection pipeline.
    """
    before_path = os.path.join(SIH_TILES_DIR, before)
    after_path = os.path.join(SIH_TILES_DIR, after)
    if not os.path.exists(before_path) or not os.path.exists(after_path):
        raise HTTPException(status_code=404, detail="One or both source tiles are unavailable")

    try:
        b_data = None
        a_data = None
        nodata = 0
        if HAS_RASTERIO:
            with rasterio.open(before_path) as s1, rasterio.open(after_path) as s2:
                b_data = s1.read().astype(np.float32)
                a_data = s2.read().astype(np.float32)
                nodata = s1.nodata or 0
        elif HAS_TIFFFILE:
            b_raw = tifffile.imread(before_path).astype(np.float32)
            a_raw = tifffile.imread(after_path).astype(np.float32)
            b_data = np.transpose(b_raw, (2, 0, 1)) if (b_raw.ndim == 3 and b_raw.shape[2] in [1, 3, 4]) else b_raw
            a_data = np.transpose(a_raw, (2, 0, 1)) if (a_raw.ndim == 3 and a_raw.shape[2] in [1, 3, 4]) else a_raw
            nodata = 0

        if b_data is not None and a_data is not None and b_data.shape[0] >= 3 and a_data.shape[0] >= 3:
            valid = (b_data[0] > nodata) & (a_data[0] > nodata) & (b_data[0] > 0) & (a_data[0] > 0)
            if valid.sum() >= 500:
                d_red = np.abs(a_data[2] - b_data[2])
                d_nir = np.abs(a_data[3] - b_data[3]) if (a_data.shape[0] >= 4 and b_data.shape[0] >= 4) else d_red
                d_broad = np.abs(a_data[:3].mean(axis=0) - b_data[:3].mean(axis=0))
                
                delta_metric = d_red * 1.5 + d_nir * 1.0 + d_broad * 1.0
                delta_metric[~valid] = 0
                
                thresh = np.percentile(delta_metric[valid], 93)
                raw_mask = (delta_metric > thresh) & valid
                
                try:
                    from scipy import ndimage as ndi
                    clean_mask = ndi.binary_opening(raw_mask, structure=np.ones((3, 3)))
                    clean_mask = ndi.binary_closing(clean_mask, structure=np.ones((5, 5)))
                except Exception:
                    clean_mask = raw_mask
                
                # 0 = BLACK (no change), 255 = WHITE (detected change)
                bw_data = (clean_mask.astype(np.uint8)) * 255
                mask_img = Image.fromarray(bw_data, mode="L")
            else:
                raise HTTPException(status_code=422, detail="Not enough valid pixels to compute a change mask")
        else:
            raise HTTPException(status_code=422, detail="Source tiles do not contain supported multispectral bands")

        buf = io.BytesIO()
        mask_img.save(buf, format="PNG")
        buf.seek(0)
        return Response(content=buf.getvalue(), media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error computing change mask for {before} -> {after}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not compute change mask: {e}")

@app.get("/api/tiles/{tile_filename}/image")
def get_tile_image(tile_filename: str, mode: str = "rgb"):
    """
    Converts 4-band GeoTIFF satellite tile to RGB PNG image on the fly with stretch bounds.
    """
    tile_path = os.path.join(SIH_TILES_DIR, os.path.basename(tile_filename))
    if not os.path.exists(tile_path):
        # Fallback to preview directory if requested preview image
        preview_path = os.path.join(SIH_PREVIEWS_DIR, tile_filename)
        if os.path.exists(preview_path):
            return FileResponse(preview_path, media_type="image/png")
        raise HTTPException(status_code=404, detail=f"Tile {tile_filename} not found")

    try:
        data = None
        if HAS_RASTERIO:
            with rasterio.open(tile_path) as src:
                data = src.read()
        elif HAS_TIFFFILE:
            raw = tifffile.imread(tile_path)
            if raw.ndim == 3 and raw.shape[2] in [1, 3, 4]:
                data = np.transpose(raw, (2, 0, 1))
            elif raw.ndim == 2:
                data = np.expand_dims(raw, axis=0)
            else:
                data = raw
        else:
            with Image.open(tile_path) as pil_img:
                raw = np.array(pil_img)
                if raw.ndim == 3:
                    data = np.transpose(raw, (2, 0, 1))
                else:
                    data = np.expand_dims(raw, axis=0)
            
        p2, p98 = 200.0, 3000.0
        bounds_path = os.path.join(SIH_INDEX_DIR, "stretch_bounds.json")
        if os.path.exists(bounds_path):
            with open(bounds_path) as f:
                b = json.load(f)
                p2, p98 = b.get("p2", 200.0), b.get("p98", 3000.0)

        # Bands: B02=blue, B03=green, B04=red, B08=NIR
        if data is not None and data.shape[0] >= 3:
            blue, green, red = data[0], data[1], data[2]
            if mode == "ndvi" and data.shape[0] >= 4:
                nir = data[3].astype(np.float32)
                red_f = red.astype(np.float32)
                ndvi = (nir - red_f) / (nir + red_f + 1e-6)
                ndvi_rgb = np.stack([
                    np.clip((1.0 - ndvi) * 200, 0, 255).astype(np.uint8),
                    np.clip((ndvi + 0.2) * 255, 0, 255).astype(np.uint8),
                    np.zeros_like(ndvi, dtype=np.uint8)
                ], axis=-1)
                img = Image.fromarray(ndvi_rgb)
            elif mode == "ndbi" and data.shape[0] >= 4:
                nir = data[3].astype(np.float32)
                red_f = red.astype(np.float32)
                ndbi = (red_f - nir) / (red_f + nir + 1e-6)
                ndbi_rgb = np.stack([
                    np.clip((ndbi + 0.3) * 255, 0, 255).astype(np.uint8),
                    np.clip(red_f / (p98 + 1e-6) * 200, 0, 255).astype(np.uint8),
                    np.clip((1.0 - ndbi) * 150, 0, 255).astype(np.uint8)
                ], axis=-1)
                img = Image.fromarray(ndbi_rgb)
            elif mode == "sar" and data.shape[0] >= 4:
                nir = data[3].astype(np.float32)
                red_f = red.astype(np.float32)
                green_f = green.astype(np.float32)
                sar_index = np.clip(((red_f - nir) + (green_f - blue)) / (np.abs(red_f + nir + green_f + blue) + 1e-6), -1.0, 1.0)
                sar_rgb = np.stack([
                    np.clip((sar_index + 1.0) * 127.5, 0, 255).astype(np.uint8),
                    np.clip((red_f / (p98 + 1e-6) * 255), 0, 255).astype(np.uint8),
                    np.clip((nir / (p98 + 1e-6) * 255), 0, 255).astype(np.uint8),
                ], axis=-1)
                img = Image.fromarray(sar_rgb)
            else:
                rgb = np.stack([red, green, blue], axis=-1).astype(np.float32)
                rgb = np.clip(rgb, p2, p98)
                rgb = ((rgb - p2) / (p98 - p2 + 1e-6) * 255).astype(np.uint8)
                img = Image.fromarray(rgb)
        elif data is not None and data.shape[0] > 0:
            img = Image.fromarray(data[0].astype(np.uint8))
        else:
            raise HTTPException(status_code=422, detail=f"Tile {tile_filename} contains no readable raster data")

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return Response(content=buf.getvalue(), media_type="image/png")
    except Exception as e:
        print(f"Error serving tile image {tile_filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not render tile {tile_filename}: {e}")

# ─── 10 SIH PRIORITY FEATURE ENDPOINTS ───────────────────────────────────────

@app.get("/api/candidates/{candidate_id}/backtracking")
def get_candidate_backtracking(candidate_id: str):
    """SIH Feature 1: Earliest-change backtracking API"""
    candidate = get_candidate_by_id(candidate_id)
    evidence = candidate.get("backtracking")
    if not evidence:
        raise HTTPException(status_code=404, detail="No temporal backtracking evidence is stored for this candidate")
    return evidence

@app.post("/api/ingest/incremental")
def post_incremental_ingest(payload: IncrementalIngestRequest):
    """SIH Feature 2: Incremental scene ingestion into FAISS + STAC without full rebuild"""
    try:
        return sih_features.perform_incremental_ingest(
            scene_name=payload.scene_name,
            sensor=payload.sensor,
            acquisition_date=payload.acquisition_date,
            lat=payload.lat,
            lon=payload.lon,
            catalogue_file=CATALOGUE_FILE,
            tiles_dir=SIH_TILES_DIR,
            index_dir=SIH_INDEX_DIR
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

@app.get("/api/candidates/{candidate_id}/false-alarm-explain")
def get_false_alarm_explanation(candidate_id: str):
    """SIH Feature 3: Explainable 6-Factor false-alarm suppression API"""
    candidate = get_candidate_by_id(candidate_id)
    evidence = candidate.get("falseAlarm6Factor")
    if not evidence:
        raise HTTPException(status_code=404, detail="No six-factor false-alarm report is stored for this candidate")
    return evidence

@app.get("/api/candidates/{candidate_id}/cross-validation")
def get_dual_sensor_cross_validation(candidate_id: str):
    """SIH Feature 4: Sentinel-2 (Optical) + Sentinel-1 (SAR) cross-validation API"""
    candidate = get_candidate_by_id(candidate_id)
    evidence = candidate.get("crossValidation")
    if not evidence:
        raise HTTPException(status_code=404, detail="No cross-sensor validation report is stored for this candidate")
    return evidence

@app.get("/api/audit/verify")
def verify_audit_trail_integrity():
    """SIH Feature 5: Cryptographic hash-chain non-repudiation audit trail verification API"""
    logs = load_json_file(AUDIT_FILE, [])
    chained_logs = sih_features.build_cryptographic_audit_chain(logs)
    return sih_features.verify_cryptographic_audit_chain(chained_logs)

@app.get("/api/stac/items/{item_id}")
def get_stac_item_by_id(item_id: str):
    """SIH Feature 6: Full STAC v1.0.0 Provenance Item API"""
    candidates = get_candidates()
    for c in candidates:
        stac_item = c.get("stacItem")
        if c["id"] == item_id or (stac_item and stac_item.get("id") == item_id):
            if stac_item:
                return stac_item
            raise HTTPException(status_code=404, detail="No STAC provenance item is stored for this candidate")
    for scene in get_scene_records():
        if scene["stacItemId"] == item_id:
            return build_scene_stac_item(scene)
    raise HTTPException(status_code=404, detail=f"STAC item not found: {item_id}")

@app.get("/api/stac/catalog")
def get_stac_root_catalog():
    """SIH Feature 6: Root STAC Catalog API"""
    scenes = get_scene_records()
    return {
        "stac_version": "1.0.0",
        "type": "Catalog",
        "id": "astreva-sih2026-catalog",
        "title": "Ranchi Sentinel-2 scene catalogue",
        "description": "STAC links generated from the deployed tile catalogue metadata.",
        "links": [
            {"rel": "self", "href": "/api/stac/catalog", "type": "application/json"},
            *[
                {"rel": "item", "href": f"/api/stac/items/{scene['stacItemId']}", "type": "application/geo+json", "title": scene["tile_file"]}
                for scene in scenes
            ]
        ]
    }

@app.get("/api/system/zero-egress-proof")
def get_zero_egress_proof():
    """SIH Feature 7: Zero-egress offline proof API"""
    return sih_features.generate_zero_egress_proof()

@app.get("/api/evaluation/metrics")
def get_heldout_evaluation_report():
    """SIH Feature 8: Held-out evaluation metrics API (Precision, Recall, Latency, Storage, Hardware)"""
    try:
        return sih_features.get_heldout_evaluation_metrics(SIH_DATASET_DIR, SIH_TILES_DIR, SIH_INDEX_DIR)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@app.get("/api/candidates/{candidate_id}/co-registration")
def get_candidate_coregistration(candidate_id: str):
    """SIH Feature 10: Radiometric + Co-registration validation API"""
    candidate = get_candidate_by_id(candidate_id)
    evidence = candidate.get("coRegistration")
    if not evidence:
        raise HTTPException(status_code=404, detail="No co-registration validation report is stored for this candidate")
    return evidence

@app.get("/api/audit")
def get_audit_logs():
    """Returns enclave audit logs with cryptographic SHA-256 hash-chaining"""
    logs = load_json_file(AUDIT_FILE, [])
    return sih_features.build_cryptographic_audit_chain(logs)

@app.post("/api/audit")
def create_audit_log(log_entry: dict = Body(...)):
    """Appends audit log entry to audit trail"""
    logs = load_json_file(AUDIT_FILE, [])
    log_entry["id"] = log_entry.get("id") or f"AUD-{int(time.time() * 1000) % 100000}"
    log_entry["timestamp"] = log_entry.get("timestamp") or time.strftime("%Y-%m-%d %H:%M:%S UTC")
    logs.insert(0, log_entry)
    save_json_file(AUDIT_FILE, logs[:200])
    return {"status": "SUCCESS", "entry": log_entry}

# Launch via Uvicorn if executed directly
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=False)
