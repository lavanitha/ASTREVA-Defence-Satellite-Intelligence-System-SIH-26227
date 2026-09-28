# ASTREVA: Defence Satellite Intelligence System
### Semantic Retrieval and Multi-Temporal Change Analysis of Satellite Imagery

**Smart India Hackathon 2026**  
**Problem Statement ID**: SIH26227  
**Organization**: Ministry of Defence — Directorate General of Information Systems (DGIS), Indian Army  
**Theme**: Space Technology  
**Category**: Software  
**Team**: Impacteers  

---

## Executive Summary

ASTREVA is a defence-oriented satellite intelligence platform for semantic retrieval and multi-temporal analysis of Earth observation imagery. Developed as an engineering prototype for Smart India Hackathon 2026 under problem statement SIH26227, the platform addresses the operational limitations of legacy geospatial archive retrieval systems. 

Traditional Earth observation workflows restrict imagery retrieval to scalar metadata parameters (geographic bounding boxes, acquisition timestamps, and sensor identities). ASTREVA introduces multi-modal vector search and temporal change inference, allowing imagery analysts to search satellite catalogues by semantic description and trace structural and physical changes over multi-year observation intervals.

> **Operational Concept**: *"Describe what you seek. Trace what changed."*

---

## Operational Workflow

ASTREVA operates across a five-stage intelligence sequence:

$$\text{DISCOVER} \longrightarrow \text{RETRIEVE} \longrightarrow \text{TRACE} \longrightarrow \text{VERIFY} \longrightarrow \text{ACT}$$

1. **Discover**: Define surveillance sectors, monitor regional Areas of Interest (AOIs), or identify terrain groupings through unsupervised representation clustering.
2. **Retrieve**: Formulate natural-language descriptions or provide reference image patches to retrieve top-$k$ relevant granules using cross-modal vector similarity.
3. **Trace**: Perform multi-temporal pairwise evaluation between historical baseline passes and recent acquisitions to compute spectral deltas and morphological anomalies.
4. **Verify**: Evaluate automated false-change suppression metrics (seasonal confounders, nodata coverage, atmospheric interference) and inspect synchronized before/after/mask raster layers in the analyst review queue.
5. **Act**: Record official analyst validation decisions (Confirmed / Rejected / Pending) with structured justifications, establishing an immutable provenance trail for mission dossier export.

---

## Operational Background and Problem Definition

### Context
Defence commands and intelligence directorates ingest massive volumes of high- and medium-resolution satellite imagery daily from sovereign constellations and open Earth-observation platforms (such as Sentinel, Landsat, and Cartosat). The primary operational bottleneck is not sensor throughput, but the human cognitive load required to identify tactical developments across petabyte-scale archives.

### Limitations of Conventional Systems
1. **Metadata-Constrained Discovery**: Keyword or catalogue search cannot identify visual features such as "newly built structures near a river embankment" or "linear clearing in forested terrain." Analysts must manually scan hundreds of square kilometers.
2. **High False-Alarm Rates in Temporal Comparison**: Traditional pixel-differencing algorithms misclassify seasonal agricultural harvesting, cloud shadows, sun-angle shifts, and vegetative phenology as physical military or infrastructural developments.
3. **Cloud Dependency vs. Sovereign Security**: Many commercial AI services rely on external cloud APIs, violating defence enclave isolation, air-gapped security doctrines, and sovereign data governance mandates.
4. **Fragmented Provenance**: Automated alerts frequently lack traceable sensor parameters, georeferencing lineage, and recorded human-in-the-loop decisions.

---

## Core Capabilities

### 1. Semantic Satellite Retrieval
- **Natural-Language Search**: Vectorizes arbitrary textual queries into a shared cross-modal latent space.
- **Text-to-Image Retrieval**: Matches textual tactical descriptions directly to indexed satellite tile embeddings.
- **Image-to-Image Retrieval**: Takes an uploaded or selected satellite image patch and returns visually and spectrally similar scenes across the archive.
- **Embedding-Based Similarity Search**: Employs exact inner-product vector indexing (cosine similarity over L2-normalized embeddings).
- **Ranked Results**: Returns confidence-ranked candidates with georeferenced bounding boxes and acquisition dates.

### 2. Multi-Temporal Change Analysis
- **Before/After Comparison**: Synchronized dual-window inspection supporting swipe slider, side-by-side split, and opacity cross-fading.
- **Multi-Date Temporal Trajectories**: Tracks geographical coordinates across multi-year observation epochs to isolate inflection points.
- **Taxonomy of Detected Changes**:
  - Linear road development and earthworks
  - Structural construction and site foundation preparation
  - Land clearance and vegetation loss
  - Water extent shifts, alluvial accretion, and embankment breaches
  - Object extraction using morphological boundary localization

### 3. False-Change Suppression
ASTREVA integrates an explicit confidence calibration and false-alarm suppression mechanism designed to mitigate non-tactical anomalies:
- **Seasonal Variation Filtering**: Restricts direct comparative inference to matched season windows (Dry/Winter to Dry/Winter, Monsoon to Monsoon), applying numerical confidence penalties to mismatched comparisons.
- **Cloud and Quality Indexing**: Evaluates valid pixel ratios and penalizes granules with excessive nodata fractions.
- **Atmospheric and Illumination Normalization**: Uses percentile stretch bounds ($p_2$ and $p_{98}$) computed across calibrated Level-2A surface reflectance data.

### 4. Similar-Location Discovery
- **Unsupervised Vector Clustering**: Partitions satellite granule embeddings into distinct semantic terrain clusters using $k$-means clustering.
- **One-Click Site Discovery**: Given any detected candidate or reference tile, queries the vector space to uncover geographically disparate sites exhibiting identical physical characteristics.

### 5. Analyst Review Queue and Human-in-the-Loop Decisioning
- **Prioritized Queue**: Orders candidates strictly by adjusted confidence scores.
- **Decision Capture**: Provides atomic confirmation and rejection actions with mandatory analyst rationale.
- **Persistent State**: Stores decision records, analyst identifiers, and timestamps directly into structured decision logs.

### 6. Evidence, Provenance, and Intelligence Dossiers
Preserves the full analytical chain of custody:
- Source scene identifier and STAC item reference
- Sensor platform (e.g., Sentinel-2 MSI, Sentinel-1 SAR)
- Coordinate boundaries (WGS84 lat/lon and UTM projections)
- Acquisition timestamp and temporal interval
- Spectral indices (RGB, NDVI, NDBI, SAR amplitude approximations)
- Human decision logs and audit trail entries

### 7. Air-Gapped and Sovereign On-Premises Design
- All model weights, vector indices, geospatial processing libraries, and database logs reside strictly inside the host infrastructure.
- Zero network requests are made to third-party inference services during evaluation or runtime.

---

## Technical Architecture

The ASTREVA architecture is structured into modular layers, decoupling user presentation, geospatial raster processing, vector search, and model execution.

```mermaid
graph TD
    User([Defence Analyst / Evaluator]) --> UI[ASTREVA Analyst Interface<br/><i>React 18 / Vite / TypeScript / Tailwind / Leaflet</i><br/><b>[Implemented Prototype]</b>]
    
    UI --> API[Security & REST API Layer<br/><i>FastAPI / CORS Middleware / Pydantic</i><br/><b>[Implemented Prototype]</b>]
    
    subgraph Data & Preprocessing Layer
        API --> Ingest[Ingestion & Preprocessing Engine<br/><i>Rasterio / GDAL / PyProj / Tiling 512x512</i><br/><b>[Implemented Prototype]</b>]
        DataStore[(Satellite Imagery Archive<br/><i>GeoTIFF / Level-2A BOA Reflectance</i><br/><b>[Implemented Prototype]</b>)]
        Ingest <--> DataStore
    end
    
    subgraph AI/ML & Retrieval Engines
        Ingest --> RetEng[Semantic Retrieval Engine<br/><i>OpenCLIP ViT-B/32 Encoder</i><br/><b>[Implemented Prototype]</b>]
        RetEng --> VSearch[(Vector Index<br/><i>FAISS IndexFlatIP 512-dim</i><br/><b>[Implemented Prototype]</b>)]
        VSearch --> RetRes[Ranked Tile Candidates]
        
        Ingest --> DetEng[Multi-Temporal Change Detector<br/><i>Pairwise Embedding Distance + Spectral Delta</i><br/><b>[Implemented Prototype]</b>]
        DetEng --> Suppress[False-Change Suppression Module<br/><i>Seasonal Matching + Quality Factor Penalization</i><br/><b>[Implemented Prototype]</b>]
        
        VSearch --> Cluster[Similar-Site Discovery Engine<br/><i>KMeans k=8 Clustering + Cosine Search</i><br/><b>[Implemented Prototype]</b>]
    end
    
    RetRes --> Queue[Analyst Review Queue<br/><i>Ranked Prioritization</i><br/><b>[Implemented Prototype]</b>]
    Suppress --> Queue
    Cluster --> Queue
    
    subgraph Governance & Output Layer
        Queue --> Review[Analyst Confirmation / Rejection<br/><i>Interactive Human-in-the-Loop</i><br/><b>[Implemented Prototype]</b>]
        Review --> Audit[(Audit Trail & Provenance Store<br/><i>JSON / CSV Logging</i><br/><b>[Implemented Prototype]</b>)]
        Audit --> Export[Intelligence Dossier Export<br/><i>GeoJSON / GeoTIFF / Analytical Reports</i><br/><b>[Implemented Prototype]</b>]
    end

    subgraph Production Hardening Path
        Hardening1[Prithvi-EO-2.0 Multi-Spectral Backbone<br/><b>[Planned / Production Hardening]</b>]
        Hardening2[Qdrant Distributed Vector Cluster<br/><b>[Planned / Production Hardening]</b>]
        Hardening3[Automated STAC Ingestion Pipelines<br/><b>[Planned / Production Hardening]</b>]
    end
```

---

## Prototype Evidence

The following captures demonstrate the working ASTREVA engineering prototype during local operational testing.

### Multi-Temporal Change Analysis
*Dual-pane comparative analysis evaluating structural construction within the Ranchi Subarnarekha monitoring sector. The interface displays calibrated RGB true-color tiles, analytical confidence metrics, and false-alarm risk assessments.*

![Multi-Temporal Change Analysis](frontend/public/assets/change%20detcetion-i1.jpeg)

### ASTREVA Intelligence Workspace
*Semantic satellite retrieval interface executing natural-language text vector queries ("Dense urban buildings and paved roads") against the 180-granule FAISS vector index, returning ranked results with cosine similarity scores in real time.*

![ASTREVA Intelligence Workspace](frontend/public/assets/i2.jpeg)

---

## Implemented Prototype System Specifications

The engineering prototype developed in this repository includes the following verified implementations:

| Subsystem | Component Specification | Prototype Implementation Status |
| :--- | :--- | :--- |
| **User Interface** | React 18, Vite 5, TypeScript, Tailwind CSS, Lucide icons, Leaflet / CartoDB integration | **Implemented** |
| **API Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic schemas, Static file mountings | **Implemented** |
| **Visual Encoder** | OpenCLIP ViT-B/32 (`laion2b_s34b_b79k` pre-trained checkpoint, 512-dim embeddings) | **Implemented** |
| **Vector Engine** | FAISS CPU (`IndexFlatIP`, exact cosine distance search, 368 KB footprint) | **Implemented** |
| **Dataset Granules** | 180 calibrated $512 \times 512$ 4-band GeoTIFF chips (Sentinel-2 L2A surface reflectance) | **Implemented** |
| **Coverage Area** | $868\text{ km}^2$ surveillance footprint over Ranchi Plateau, Jharkhand ($85.15^\circ\text{E}$ to $85.45^\circ\text{E}$, $23.20^\circ\text{N}$ to $23.45^\circ\text{N}$) | **Implemented** |
| **Temporal Epochs** | 6 distinct temporal baselines spanning 2020 through 2024 | **Implemented** |
| **Spectral Rendering** | Dynamic conversion of 4-band GeoTIFF to RGB, NDVI, NDBI, and SAR representations | **Implemented** |
| **Change Processing** | Spectral delta calculation, pairwise embedding distance, morphological segmentation | **Implemented** |
| **False-Alarm Mitigation** | Same-season pairing validation, nodata penalization, calibrated confidence adjustment | **Implemented** |
| **Decision Logging** | Persistent JSON and CSV audit records tracking analyst overrides, timestamps, and classifications | **Implemented** |
| **Query Latency** | Mean retrieval time of $88.28\text{ ms}$ on standard multi-core CPU architecture | **Verified** |

---

## Application Modules

The ASTREVA workstation interface comprises eight primary operational modules:

1. **Workspace (`/workspace`)**: Overview terminal providing overall fleet health, active AOI bounding summaries, recent candidate alerts, and real-time system diagnostic feeds.
2. **Semantic Search (`/search`)**: Multi-modal query interface allowing analysts to perform natural-language prompt searches or query by uploaded image chip.
3. **Change Analysis (`/change-analysis`)**: Side-by-side inspection console featuring swipe sliders, opacity blending, multi-spectral band switching (RGB, NDVI, NDBI, SAR), and change mask overlays.
4. **Discovery (`/discovery`)**: Unsupervised clustering visualizer displaying the 8-cluster terrain segmentation and the one-click similar site search utility.
5. **Review Queue (`/review-queue`)**: Filterable, confidence-ranked triage queue enabling rapid validation, false-alarm rejection, and status updating.
6. **Scene Archive (`/scenes`)**: Metadata catalogue detailing raw ingested scenes, cloud coverage percentages, coordinate footprints, and sensor checksums.
7. **Exports & Dossiers (`/exports`)**: Intelligence packaging utility for compiling verified change candidates into GeoJSON vectors, raster clips, and formatted briefing summaries.
8. **System Diagnostics (`/system`)**: Hardware utilization tracker, model latency benchmarks, and enclave status monitor confirming zero external network egress.
9. **Sector Manager (`/sectors`)**: AOI registry for configuring geographic surveillance zones and monitoring parameters.
10. **Audit Trail (`/audit`)**: Tamper-evident operational log recording every analyst decision, system diagnostic, and search query.

---

## Technology Stack

### Frontend Architecture
- **Framework**: React 18.3.1
- **Build Tool**: Vite 5.4.2
- **Language**: TypeScript 5.5.3
- **Styling**: Tailwind CSS 3.4.10, PostCSS, Autoprefixer
- **State Management**: Zustand 4.5.5, TanStack React Query 5.56.2
- **Mapping & GIS**: Leaflet 1.9.4, OpenLayers 9.2.4
- **Iconography**: Lucide React 0.441.0

### Backend & API Framework
- **Runtime**: Python 3.11.9
- **Web Framework**: FastAPI 0.119.0
- **ASGI Server**: Uvicorn 0.37.0
- **Data Validation**: Pydantic 2.x, Pydantic-Settings
- **Multi-Part / File I/O**: Python-Multipart

### Geospatial & Remote Sensing Libraries
- **Raster Processing**: Rasterio 1.4.4, GDAL
- **Geospatial Projections**: PyProj 3.7.2, Affine 3.0.1
- **Vector Operations**: GeoPandas 1.1.4, Shapely 2.1.2, PyOgrio 0.13.0
- **Catalogue & Ingestion**: PySTAC 1.15.2, OpenEO 0.52.0

### AI, Machine Learning, and Vector Indexing
- **Deep Learning Framework**: PyTorch 2.14.0 (CPU inference operational)
- **Vision Transforms**: TorchVision 0.29.0
- **Cross-Modal Foundation Model**: OpenCLIP 3.3.0 (ViT-B/32 architecture)
- **Vector Index Engine**: FAISS (`faiss-cpu` 1.15.0, `IndexFlatIP`)
- **Scientific Computing**: NumPy 2.4.6, SciPy 1.17.1 (morphological labeling)
- **Clustering & Diagnostics**: Scikit-Learn 1.9.0 ($k$-means, silhouette scoring)

---

## Deployment Architecture

ASTREVA supports two distinct deployment modes to satisfy both public hackathon evaluation requirements and sovereign operational mandates:

### 1. Public Demonstration Deployment (Dual-Cloud Staging)
*Designed strictly for hackathon jury evaluation and remote interactive review.*

- **Frontend Tier**: Hosted on **Vercel** as an optimized Single Page Application (SPA) with automated client-side rewrites configured via `frontend/vercel.json`.
- **Backend Tier**: Hosted on **Render** (or equivalent container service) executing `uvicorn backend.main:app` within a standardized Linux container defined by `render.yaml` and `Dockerfile`.
- **Communication**: Frontend directs asynchronous REST requests to the backend using the environment variable `VITE_API_BASE_URL`.
- *Security Note*: This public deployment model is utilized solely for remote judging accessibility.

### 2. Sovereign On-Premises Deployment (Air-Gapped Enclave)
*The intended production operational architecture for defence applications.*

- **Hardware**: Secure local workstation or internal secure cluster.
- **Network Profile**: Completely disconnected from the public internet (air-gapped).
- **Inference**: PyTorch and FAISS operate locally using pre-staged model weights (`hf-hub:laion/CLIP-ViT-B-32-laion2B-s34B-b79K`) and pre-computed index files.
- **Data Archive**: Satellite imagery is ingested directly from sovereign storage archives into the local file system.
- **Execution**: Launched with a single script:
  ```bash
  start_astreva_local.bat
  ```

---

## Local Development and Evaluation Setup

### Prerequisites
- Python 3.10 or 3.11 (64-bit)
- Node.js 18+ and npm
- Git with Git LFS installed (`git lfs install`)

### 1. Clone Repository and Staged Data
```bash
git clone https://github.com/MR-ROGUE01/SIH-PS-26227.git
cd SIH-PS-26227
```

### 2. Backend Setup
```bash
# Navigate to backend root
cd Change-Detection-

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run FastAPI backend service
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*The interactive API documentation is accessible at `http://localhost:8000/docs`.*

### 3. Frontend Setup
```bash
# Open a separate terminal and navigate to frontend
cd Change-Detection-/frontend

# Install node dependencies
npm install

# Verify local environment variables
# Copy template if necessary:
cp .env.production.example .env

# Launch Vite development server
npm run dev
```
*The ASTREVA workstation will launch at `http://localhost:5173` (or `http://localhost:3001`).*

### 4. 1-Click Offline Execution (Windows)
For single-step local testing without manual terminal orchestration, execute:
```cmd
start_astreva_local.bat
```

---

## Feasibility, Viability, and Impact

### Feasibility
- **Demonstrated Engineering**: The prototype proves that multi-modal foundation models (OpenCLIP) can generalize zero-shot to multispectral Earth observation tiles without task-specific retraining.
- **Resource Efficiency**: Exact FAISS inner-product vector indexing over 180 tiles requires only 368 KB of memory and operates with sub-100ms latency on commodity CPU hardware, eliminating mandatory GPU infrastructure for inference.

### Viability
- **Standardized Formats**: Built upon open remote sensing standards (Cloud-Optimized GeoTIFF, OGC compliant geometries, STAC catalog structures).
- **Low Operational Overhead**: Can be integrated into existing defence command center environments without re-architecting legacy GIS databases.

### Defence and Strategic Impact
- **Drastic Reduction in Triage Latency**: Shrinks the search and verification cycle from hours of manual visual inspection down to seconds.
- **Intelligence Traceability**: Provides immutable, human-verified evidence packages suitable for command briefing and tactical reporting.
- **Sovereign Independence**: Ensures that sensitive coordinates, target profiles, and surveillance priorities remain entirely within sovereign infrastructure boundaries.

---

## Project Status and Roadmap

- [x] **Phase 1: Ingestion & Tiling Prototype**: $512 \times 512$ tile segmentation over Ranchi AOI (Sentinel-2 L2A).
- [x] **Phase 2: Semantic Vector Indexing**: OpenCLIP ViT-B/32 + FAISS vector indexing.
- [x] **Phase 3: Multi-Temporal Spectral Delta**: Pairwise change candidate generation.
- [x] **Phase 4: False-Change Suppression**: Seasonal matching and nodata penalty calibration.
- [x] **Phase 5: Analyst Station Interface**: Full React/TypeScript operational workstation.
- [x] **Phase 6: Audit & Provenance**: Persistent human decision logging and dossier exports.
- [ ] **Phase 7 (Planned / Production Hardening)**: Integration of geospatial foundation models (e.g., NASA/IBM Prithvi-EO-2.0, RemoteCLIP).
- [ ] **Phase 8 (Planned / Production Hardening)**: Distributed vector indexing via Qdrant for multi-million tile national archives.
- [ ] **Phase 9 (Planned / Production Hardening)**: Native integration of SAR coherence change detection (Sentinel-1 and NISAR).

---

*ASTREVA | Smart India Hackathon 2026 | Problem Statement SIH26227 | Ministry of Defence (DGIS) — Indian Army*
