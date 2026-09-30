"""
Satellite Intelligence Dashboard
SIH Problem Statement 26227 — Ministry of Defence

Run:
    streamlit run CODE\\analyst_dashboard.py
"""

import os
import sys
import json
import datetime
import pandas as pd
import streamlit as st
from PIL import Image

# ─── FIX: Add CODE folder to Python path so imports work ─────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

# ─── PATH RESOLUTION ─────────────────────────────────────────────────────────
SIH_DIR      = os.path.dirname(SCRIPT_DIR) if os.path.basename(SCRIPT_DIR).upper() == "CODE" else SCRIPT_DIR
DATASET_DIR  = os.path.join(SIH_DIR, "Dataset")
INDEX_DIR    = os.path.join(DATASET_DIR, "Index")
TILES_DIR    = os.path.join(DATASET_DIR, "Tiles")
PREVIEWS_DIR = os.path.join(DATASET_DIR, "change_previews")
SEARCH_DIR   = os.path.join(DATASET_DIR, "search_results")

REVIEW_QUEUE_FILE = os.path.join(INDEX_DIR, "review_queue.json")
CLUSTERS_FILE     = os.path.join(INDEX_DIR, "tile_clusters.json")
DECISIONS_FILE    = os.path.join(DATASET_DIR, "analyst_decisions.json")

# ─── PAGE CONFIG ─────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Satellite Intelligence — SIH 26227",
    page_icon="🛰️",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    .main { background-color: #0e1117; }
    .stMetric { background-color: #1a1f2c; padding: 12px; border-radius: 8px; border: 1px solid #2d3748; }
    .mod-badge {
        background-color: #1e3a8a;
        color: #93c5fd;
        padding: 4px 10px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.85rem;
        display: inline-block;
        margin-bottom: 8px;
    }
</style>
""", unsafe_allow_html=True)


# ─── DECISIONS FILE INIT ─────────────────────────────────────────────────────

if not os.path.exists(DECISIONS_FILE):
    with open(DECISIONS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)

def load_decisions():
    try:
        with open(DECISIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_decision(candidate_id, decision, notes, candidate_data):
    decisions = load_decisions()
    entry = {
        "candidate_id": candidate_id,
        "decision": decision,
        "analyst_notes": notes,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "change_type": candidate_data.get("change_type"),
        "confidence": candidate_data.get("adjusted_confidence", candidate_data.get("confidence")),
        "before_date": candidate_data.get("before_date"),
        "after_date": candidate_data.get("after_date"),
        "before_tile": candidate_data.get("before_tile", candidate_data.get("before_file")),
        "after_tile": candidate_data.get("after_tile", candidate_data.get("after_file")),
        "lat": candidate_data.get("lat_min"),
        "lon": candidate_data.get("lon_min"),
        "sensor": candidate_data.get("sensor", "Sentinel-2 L2A")
    }
    existing_ids = [d.get("candidate_id") for d in decisions]
    if candidate_id in existing_ids:
        for idx, d in enumerate(decisions):
            if d.get("candidate_id") == candidate_id:
                decisions[idx] = entry
    else:
        decisions.append(entry)
    with open(DECISIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(decisions, f, indent=2)


# ─── SIDEBAR ─────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown('<div class="mod-badge">MINISTRY OF DEFENCE | DGIS</div>', unsafe_allow_html=True)
    st.title("🛰️ SIH PS-26227")
    st.caption("Satellite Semantic Retrieval & Change Analysis")
    st.divider()

    st.markdown("**Area Details:**")
    st.markdown("- **Location**: Ranchi, Jharkhand")
    st.markdown("- **Total Tiles**: 180 (512×512 each)")
    st.markdown("- **Years Covered**: 2020 — 2024")
    st.markdown("- **Satellite**: Sentinel-2 L2A (10m)")
    st.divider()

    decisions = load_decisions()
    confirmed_count = sum(1 for d in decisions if d["decision"] == "CONFIRMED")
    rejected_count  = sum(1 for d in decisions if d["decision"] == "REJECTED")
    st.metric("✅ Confirmed Changes", confirmed_count)
    st.metric("❌ Rejected (False Alarms)", rejected_count)


# ─── MAIN TABS ───────────────────────────────────────────────────────────────

tab1, tab2, tab3, tab4 = st.tabs([
    "📋 Change Review Queue",
    "🔍 Smart Search",
    "🌐 Find Similar Locations",
    "📑 Analyst Decisions"
])


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: CHANGE REVIEW QUEUE
# ═══════════════════════════════════════════════════════════════════════════════

with tab1:
    st.header("📋 Change Review Queue")
    st.caption("Review and verify multi-temporal change detections — Validate or dismiss flagged anomalies")

    if not os.path.exists(REVIEW_QUEUE_FILE):
        st.warning("Review queue not found. Please execute the suppression pipeline: `python CODE/false_alarm_suppression.py`")
    else:
        with open(REVIEW_QUEUE_FILE, "r", encoding="utf-8") as f:
            queue = json.load(f)

        if not queue:
            st.info("No candidates currently pending review.")
        else:
            col_filter1, col_filter2 = st.columns([2, 1])
            with col_filter1:
                type_options = ["ALL"] + sorted(list(set(c["change_type"] for c in queue)))
                selected_type = st.selectbox("Change Type Filter:", type_options)
            with col_filter2:
                min_conf = st.slider("Min Confidence:", 0.20, 0.95, 0.35, 0.05)

            filtered_queue = [
                c for c in queue
                if (selected_type == "ALL" or c["change_type"] == selected_type)
                and c.get("adjusted_confidence", c.get("confidence", 0)) >= min_conf
            ]

            st.write(f"**{len(filtered_queue)}** candidates identified:")

            options = [
                f"#{i+1} | {c['change_type'].upper()} | Conf: {c.get('adjusted_confidence', c['confidence']):.3f} | {c['before_date']} → {c['after_date']} | Objects: {c.get('num_objects_marked', 0)}"
                for i, c in enumerate(filtered_queue)
            ]

            if options:
                selected_idx = st.selectbox("Select Target Candidate:", range(len(options)), format_func=lambda i: options[i])
                cand = filtered_queue[selected_idx]
                cand_id = f"{cand.get('row',0)}_{cand.get('col',0)}_{cand['before_date']}_{cand['after_date']}"

                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Change Type", cand["change_type"].upper().replace("_", " "))
                m2.metric("Confidence", f"{cand.get('adjusted_confidence', cand['confidence']):.3f}")
                m3.metric("Objects Marked", cand.get("num_objects_marked", "N/A"))
                m4.metric("First Seen", cand.get("earliest_observation", cand["after_date"]))

                preview_file = cand.get("preview_file")
                preview_path = os.path.join(PREVIEWS_DIR, preview_file) if preview_file else None

                if preview_path and os.path.exists(preview_path):
                    st.image(preview_path, use_container_width=True, caption=f"BEFORE | AFTER (with marked objects) | CHANGE HEATMAP — {preview_file}")
                else:
                    st.warning("Preview imagery unavailable.")

                with st.expander("🔍 Full Details (Location, Sensor, Suppression info)", expanded=False):
                    p_col1, p_col2 = st.columns(2)
                    with p_col1:
                        st.markdown(f"**Before Tile**: `{cand.get('before_tile', cand.get('before_file'))}`")
                        st.markdown(f"**After Tile**: `{cand.get('after_tile', cand.get('after_file'))}`")
                        st.markdown(f"**Satellite**: `{cand.get('sensor', 'Sentinel-2 L2A')}`")
                        st.markdown(f"**Embedding Distance**: `{cand.get('embedding_distance', 'N/A')}`")
                    with p_col2:
                        st.markdown(f"**Lat Range**: `[{cand.get('lat_min',0):.4f}, {cand.get('lat_max',0):.4f}]`")
                        st.markdown(f"**Lon Range**: `[{cand.get('lon_min',0):.4f}, {cand.get('lon_max',0):.4f}]`")
                        st.markdown(f"**Seasonal Penalty**: `{cand.get('seasonal_penalty', 0.0)}`")
                        st.markdown(f"**Suppression Flags**: `{', '.join(cand.get('suppression_reasons', ['None']))}`")

                st.subheader("Analyst Verification")
                notes_input = st.text_area("Notes (optional):", placeholder="e.g., New road confirmed near river bend.", key=f"note_{cand_id}")

                col_btn1, col_btn2, _ = st.columns([1, 1, 3])
                with col_btn1:
                    if st.button("✅ Confirm Change", type="primary", use_container_width=True):
                        save_decision(cand_id, "CONFIRMED", notes_input, cand)
                        st.success("Confirmed! Event recorded in audit trail.")
                        st.rerun()
                with col_btn2:
                    if st.button("❌ Reject (False Alarm)", use_container_width=True):
                        save_decision(cand_id, "REJECTED", notes_input, cand)
                        st.warning("Rejected! False alarm logged in audit trail.")
                        st.rerun()


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: SMART SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

with tab2:
    st.header("🔍 Smart Search")
    st.caption("Semantic natural language and image-to-image similarity search over satellite archives")

    query_type = st.radio("Search Modality:", ["Text Query (Natural Language)", "Image Query (Reference Tile)"], horizontal=True)

    search_query = ""
    image_tile_name = ""

    if query_type == "Text Query (Natural Language)":
        st.markdown("**Example queries:**")
        q_cols = st.columns(4)
        if q_cols[0].button("🌊 Structures near river"):
            st.session_state["sq"] = "newly built structures near a river"
        if q_cols[1].button("🚜 Vehicle concentrations"):
            st.session_state["sq"] = "large vehicle concentrations on open ground"
        if q_cols[2].button("🛣️ Road development"):
            st.session_state["sq"] = "road development area"
        if q_cols[3].button("🏗️ Construction site"):
            st.session_state["sq"] = "construction site"

        search_query = st.text_input("Enter search prompt:", value=st.session_state.get("sq", "dense urban area"))
    else:
        all_tiles = sorted(os.listdir(TILES_DIR)) if os.path.exists(TILES_DIR) else []
        image_tile_name = st.selectbox("Select reference tile:", all_tiles)

    col_opt1, col_opt2 = st.columns(2)
    with col_opt1:
        top_k = st.slider("Top Results (K):", 3, 10, 5)
    with col_opt2:
        date_filter = st.selectbox("Temporal Filter (Year):", ["All Dates", "2020", "2021", "2022", "2023", "2024"])

    if st.button("🔎 Execute Search", type="primary"):
        with st.spinner("Searching satellite tiles..."):
            date_arg = f"--date-from {date_filter}-01-01 --date-to {date_filter}-12-31" if date_filter != "All Dates" else ""
            if query_type == "Text Query (Natural Language)":
                cmd = f'python CODE/semantic_search.py --query "{search_query}" --top {top_k} {date_arg}'
            else:
                cmd = f'python CODE/semantic_search.py --image "{image_tile_name}" --top {top_k} {date_arg}'
            os.system(cmd)

        csv_path = os.path.join(SEARCH_DIR, "search_results.csv")
        if os.path.exists(csv_path):
            df_results = pd.read_csv(csv_path)
            st.success(f"{len(df_results)} matching tiles retrieved successfully.")

            cols = st.columns(min(len(df_results), 5))
            for i, (_, row) in enumerate(df_results.iterrows()):
                if i < len(cols):
                    with cols[i]:
                        st.markdown(f"**Rank #{row['rank']}**")
                        st.caption(f"Score: **{row['score']:.4f}**")
                        st.caption(f"Date: `{row['acquisition_date']}`")
                        t_path = os.path.join(TILES_DIR, row["tile_file"])
                        if os.path.exists(t_path):
                            try:
                                from semantic_search import tile_to_rgb
                                img = tile_to_rgb(t_path)
                                st.image(img, use_container_width=True, caption=row["tile_file"])
                            except Exception:
                                st.code(row["tile_file"])
                        else:
                            st.code(row["tile_file"])

            st.dataframe(df_results, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: FIND SIMILAR LOCATIONS
# ═══════════════════════════════════════════════════════════════════════════════

with tab3:
    st.header("🌐 Find Similar Locations")
    st.caption("Unsupervised site discovery — retrieve locations with equivalent semantic and spectral signatures")

    subtab1, subtab2 = st.tabs(["🎯 Similar Sites Retrieval", "📊 Latent Terrain Clusters"])

    with subtab1:
        st.subheader("Reference Tile Selection")

        all_tiles = sorted(os.listdir(TILES_DIR)) if os.path.exists(TILES_DIR) else []
        chosen_tile = st.selectbox("Select Target Tile:", all_tiles, key="disc_tile")

        if st.button("⚡ Discover Similar Sites", type="primary"):
            with st.spinner("Searching similar locations..."):
                try:
                    from clustering_discovery import find_similar_sites
                    similar_results = find_similar_sites(chosen_tile, top_k=6)
                    if similar_results:
                        st.success(f"{len(similar_results)} similar locations discovered.")
                        cols = st.columns(len(similar_results))
                        from semantic_search import tile_to_rgb
                        for idx, res in enumerate(similar_results):
                            with cols[idx]:
                                st.markdown(f"**Match #{res['rank']}**")
                                st.caption(f"Similarity: **{res['similarity_score']:.4f}**")
                                st.caption(f"Date: `{res['date']}`")
                                t_path = os.path.join(TILES_DIR, res["tile_file"])
                                if os.path.exists(t_path):
                                    try:
                                        img = tile_to_rgb(t_path)
                                        st.image(img, use_container_width=True, caption=res["tile_file"])
                                    except Exception:
                                        st.code(res["tile_file"])
                    else:
                        st.info("No matching locations found above similarity threshold.")
                except Exception as e:
                    st.error(f"Error: {e}")

    with subtab2:
        st.subheader("8 Unsupervised Terrain Archetypes (KMeans k=8 Clustering)")
        if os.path.exists(CLUSTERS_FILE):
            with open(CLUSTERS_FILE, "r", encoding="utf-8") as f:
                c_data = json.load(f)

            summary_list = []
            for c_id, info in c_data.items():
                summary_list.append({
                    "Cluster ID": c_id,
                    "Total Tiles": info["total_tiles"],
                    "Example Tile": info["exemplar_tile"]
                })
            st.dataframe(pd.DataFrame(summary_list), use_container_width=True)
        else:
            st.info("Cluster index not yet generated. Initialize below:")
            if st.button("Initialize Clustering Pipeline"):
                os.system("python CODE/clustering_discovery.py --build_clusters")
                st.rerun()


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: ANALYST DECISIONS
# ═══════════════════════════════════════════════════════════════════════════════

with tab4:
    st.header("📑 Analyst Decisions")
    st.caption("Comprehensive audit trail and forensic verification log of analyst decisions")

    decisions = load_decisions()
    if decisions:
        df_dec = pd.DataFrame(decisions)
        st.subheader(f"Total {len(df_dec)} decisions recorded")
        st.dataframe(df_dec, use_container_width=True)

        csv_data = df_dec.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download Decisions (CSV)",
            data=csv_data,
            file_name="analyst_decisions.csv",
            mime="text/csv"
        )
    else:
        st.info("No analyst decisions recorded yet. Review pending candidates in the Change Review Queue.")

    st.divider()
    st.subheader("📊 System Info")
    eval_metrics = {
        "Location": "Ranchi Urban & Peri-Urban, Jharkhand, India",
        "Bounding Box": "85.15°E–85.45°E, 23.20°N–23.45°N (~868 km²)",
        "Time Period": "2020-01-01 to 2024-12-31 (6 time points)",
        "Satellite": "Sentinel-2 MSI Level-2A (10m resolution, 4 bands)",
        "Total Tiles": 180,
        "Embedding Dimensions": 512,
        "Search Index": "FAISS IndexFlatIP (Cosine Similarity)",
        "Change Detection": "Multi-Temporal Vector Distance + Spectral Morphology",
        "False Alarm Filter": "Seasonal Mismatch Penalty + Quality Masking"
    }
    st.json(eval_metrics)
