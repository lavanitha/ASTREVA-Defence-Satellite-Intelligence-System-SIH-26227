from pathlib import Path

readme = r'''# ASTREVA — Defence Satellite Intelligence System

> **“Describe what you seek. Trace what changed.”**

ASTREVA is a defence-oriented satellite intelligence platform developed for **Smart India Hackathon 2026 — SIH26227: Semantic Retrieval and Multi-Temporal Change Analysis of Satellite Imagery**.

It is designed to help authorised analysts **discover relevant satellite evidence using natural-language and image-to-image queries, trace changes across time, suppress false alarms, review evidence, and maintain provenance** in a secure, on-premises/offline workflow.

---

## 1. Project Overview

### Problem

Earth-observation archives are increasingly large, multi-temporal and multi-sensor. Conventional catalogue search relies heavily on coordinates, dates, platforms and product metadata, which can require analysts to already know where and when to look.

The SIH problem statement also highlights the difficulty of distinguishing genuine ground changes from differences caused by **weather, seasons, shadows, viewing conditions and image errors**.

### ASTREVA's Approach

ASTREVA adds an intelligence layer over satellite imagery by combining:

- **Semantic text retrieval**
- **Image-to-image retrieval**
- **Multi-temporal change analysis**
- **False-change suppression**
- **Similar-location discovery**
- **Analyst review and verification**
- **Evidence and provenance**
- **Incremental local indexing**
- **On-premises / offline operation**

The project proposal describes the core workflow as:

**Search by meaning → Detect real change → Verify evidence → Deliver actionable intelligence.**

---

## 2. Core Capabilities

| Capability | What ASTREVA does |
|---|---|
| 🔎 Semantic Discovery | Finds relevant satellite scenes from natural-language queries |
| 🛰️ Image-to-Image Retrieval | Retrieves visually similar satellite locations |
| 🕒 Multi-Temporal Analysis | Compares imagery across acquisition periods |
| 🗺️ AOI Analysis | Focuses analysis on a defined Area of Interest |
| 🔄 Change Monitoring | Identifies meaningful infrastructure, land-cover, border and waterway changes |
| 🧹 False-Change Suppression | Accounts for seasonal, cloud, atmospheric, geometric and sensor-related differences |
| 🧩 Similar-Site Discovery | Finds locations with similar spatial patterns |
| 👤 Analyst Review | Supports confirmation/rejection of detected candidates |
| 📑 Evidence & Provenance | Retains source, acquisition and processing information for traceability |
| 🔐 Offline Deployment | Designed for controlled on-premises environments |

These capabilities follow the solution framing and technical approach presented in the SIH submission. fileciteturn14file0L55-L79

---

## 3. How ASTREVA Works

```text
Analyst Query
     │
     ├── Natural Language
     ├── AOI
     ├── Time Range
     ├── Image Query
     └── Sensor Filter
            │
            ▼
   Ingestion & Preprocessing
            │
            ├── Metadata indexing
            ├── Image preparation
            └── Tile generation
            │
            ▼
      AI / ML Processing
            │
            ├── Semantic Search
            ├── Change Detection
            ├── False-Change Suppression
            ├── Similar-Site Discovery
            └── Result Ranking
            │
            ▼
       Analyst Workspace
            │
            ├── Map overlays
            ├── Before / After comparison
            ├── Change evidence
            ├── Review / confirmation
            └── Provenance / audit
            │
            ▼
       Intelligence Output
