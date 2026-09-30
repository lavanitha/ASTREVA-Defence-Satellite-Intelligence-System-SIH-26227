"""
Phase 7A: Discovery and Clustering (PS Section 2.2.4)
SIH Problem Statement 26227 — Ministry of Defence | Indian Army (DGIS)

Fulfills PS 2.2.4:
  "Support unsupervised or embedding-based grouping of similar sites across
   a wider area so that an analyst who identifies one location of interest can
   discover other locations with comparable visual or semantic characteristics
   without manually constructing a new query for each site."

Capabilities:
  1. Unsupervised Semantic Clustering:
     Groups all archive tile embeddings into distinct terrain/feature clusters
     (e.g., water bodies, dense settlements, cleared ground, agricultural zones).
  2. One-Click "Find Similar Sites":
     Given any candidate tile, instantly queries FAISS to retrieve all other
     locations with identical visual/semantic signatures across the archive.

Usage:
    python CODE\clustering_discovery.py --build_clusters
    python CODE\clustering_discovery.py --similar_to ranchi_2020_01_tile_0_0.tif --top_k 5

Output:
    ../Dataset/Index/tile_clusters.json    (cluster assignments & exemplars)
"""

import os
import json
import argparse
import numpy as np
import faiss
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
SIH_DIR       = os.path.dirname(SCRIPT_DIR) if os.path.basename(SCRIPT_DIR).upper() == "CODE" else SCRIPT_DIR
DATASET_DIR   = os.path.join(SIH_DIR, "Dataset")
INDEX_DIR     = os.path.join(DATASET_DIR, "Index")
INDEX_FILE    = os.path.join(INDEX_DIR, "tiles.faiss")
METADATA_FILE = os.path.join(INDEX_DIR, "tile_metadata.json")
CLUSTERS_FILE = os.path.join(INDEX_DIR, "tile_clusters.json")


def load_archive_vectors():
    if not os.path.exists(INDEX_FILE) or not os.path.exists(METADATA_FILE):
        raise FileNotFoundError("FAISS index or metadata not found. Run build_embeddings_index.py first.")

    index = faiss.read_index(INDEX_FILE)
    vectors = index.reconstruct_n(0, index.ntotal)
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    return index, vectors, metadata


def build_clusters(n_clusters=8):
    print("=" * 60)
    print("  SIH-26227 | Unsupervised Discovery & Clustering [PS 2.2.4]")
    print("=" * 60)

    _, vectors, metadata = load_archive_vectors()
    print(f"Loaded {len(vectors)} tile vectors (dim={vectors.shape[1]})")

    # Fit KMeans unsupervised clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(vectors)

    score = silhouette_score(vectors, labels)
    print(f"Clustering complete. Silhouette Score: {score:.3f} across {n_clusters} clusters")

    # Build cluster mapping
    clusters = {i: [] for i in range(n_clusters)}
    for idx, (lbl, meta) in enumerate(zip(labels, metadata)):
        dist_to_center = float(np.linalg.norm(vectors[idx] - kmeans.cluster_centers_[lbl]))
        clusters[int(lbl)].append({
            "tile_file": meta["tile_file"],
            "date": meta["acquisition_date"],
            "lat": meta["lat_min"],
            "lon": meta["lon_min"],
            "dist_to_center": round(dist_to_center, 4),
            "vector_idx": idx
        })

    # Pick exemplar tile for each cluster (closest to centroid)
    cluster_summary = {}
    for c_id, members in clusters.items():
        members_sorted = sorted(members, key=lambda x: x["dist_to_center"])
        exemplar = members_sorted[0]["tile_file"] if members_sorted else None
        cluster_summary[c_id] = {
            "cluster_id": c_id,
            "total_tiles": len(members),
            "exemplar_tile": exemplar,
            "members": members_sorted
        }
        print(f"  Cluster {c_id:2d}: {len(members):3d} tiles | Exemplar: {exemplar}")

    with open(CLUSTERS_FILE, "w", encoding="utf-8") as f:
        json.dump(cluster_summary, f, indent=2)

    print(f"\nCluster mapping saved -> {CLUSTERS_FILE}")
    print("=" * 60)
    return cluster_summary


def find_similar_sites(tile_identifier: str, top_k: int = 5):
    """
    PS 2.2.4: Discover other locations with comparable visual or semantic
    characteristics without manually constructing a new query for each site.
    """
    index, vectors, metadata = load_archive_vectors()
    filename = os.path.basename(tile_identifier)

    # Locate target tile
    target_idx = None
    for idx, m in enumerate(metadata):
        if m["tile_file"] == filename:
            target_idx = idx
            break

    if target_idx is None:
        print(f"Error: Tile '{filename}' not found in archive metadata.")
        return []

    target_vec = vectors[target_idx:target_idx+1]
    scores, indices = index.search(target_vec, top_k + 1)

    print(f"\nDiscovery: Finding similar sites to [{filename}]")
    print("=" * 60)
    results = []
    rank = 1
    for score, idx in zip(scores[0], indices[0]):
        meta = metadata[idx]
        if meta["tile_file"] == filename:
            continue  # Skip query tile itself
        results.append({
            "rank": rank,
            "similarity_score": round(float(score), 4),
            "tile_file": meta["tile_file"],
            "date": meta["acquisition_date"],
            "lat": meta["lat_min"],
            "lon": meta["lon_min"],
            "sensor": meta["sensor"]
        })
        print(f"  #{rank}  Score: {score:.4f}  |  Tile: {meta['tile_file']}  |  Date: {meta['acquisition_date']}  |  Loc: ({meta['lat_min']:.4f}, {meta['lon_min']:.4f})")
        rank += 1
        if rank > top_k:
            break
    print("=" * 60)
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SIH-26227 Discovery and Clustering Engine")
    parser.add_argument("--build_clusters", action="store_true", help="Run unsupervised KMeans clustering over all tiles")
    parser.add_argument("--clusters", type=int, default=8, help="Number of semantic clusters to form")
    parser.add_argument("--similar_to", type=str, default=None, help="Tile filename to find visually/semantically similar sites for")
    parser.add_argument("--top_k", type=int, default=5, help="Number of similar sites to return")

    args = parser.parse_args()

    if args.build_clusters:
        build_clusters(n_clusters=args.clusters)
    elif args.similar_to:
        find_similar_sites(args.similar_to, top_k=args.top_k)
    else:
        # Default: build clusters
        build_clusters(n_clusters=args.clusters)
