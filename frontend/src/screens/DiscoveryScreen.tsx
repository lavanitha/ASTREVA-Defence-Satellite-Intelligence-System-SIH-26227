import React, { useState, useEffect } from 'react';
import { useGeointStore } from '../stores/geointStore';
import { TacticalMap } from '../components/map/TacticalMap';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Layers,
  ArrowRight,
  Eye,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { apiService } from '../services/api';

export const DiscoveryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { aois, setActiveAoi, candidates } = useGeointStore();
  const [realClusters, setRealClusters] = useState<any[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string>('CLUS-IND-01');
  const [similarSites, setSimilarSites] = useState<any[] | null>(null);
  const [targetSimilarTile, setTargetSimilarTile] = useState<string>('');
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  useEffect(() => {
    apiService.getClusters().then((res) => {
      if (res && res.length > 0) {
        setRealClusters(res);
        setSelectedClusterId(res[0].id);
      }
    }).catch((err) => console.warn('Clusters API error:', err));
  }, []);

  const selectedCluster =
    realClusters.find((c) => c.id === selectedClusterId) || realClusters[0] || null;

  const totalAnomalies = candidates.length;
  const highConfidenceCount = candidates.filter((c) => c.confidence >= 80).length;
  const totalTiles = realClusters.reduce((acc, c) => acc + (c.total_tiles || 0), 0);

  const handleFindSimilar = async (tileFile: string) => {
    if (!tileFile) return;
    setIsLoadingSimilar(true);
    setTargetSimilarTile(tileFile);
    try {
      const res = await apiService.findSimilarSites(tileFile, 6);
      setSimilarSites(res.similar_sites || []);
    } catch (err) {
      console.warn('Find similar error:', err);
      setSimilarSites([]);
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-5 overflow-y-auto">
      {/* Title & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">
              <Compass className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 tracking-wider font-semibold">
              UNSUPERVISED TERRAIN PARTITIONING & SIMILARITY DISCOVERY
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide mt-1">
            Discovery & Cluster Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated KMeans 8-cluster embedding landscape partitioning and one-click FAISS vector similarity discovery.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="px-3 py-1.5 rounded-lg bg-[#0B1120] border border-cyan-500/30 text-xs font-mono text-slate-300">
            CLUSTER MODEL: <span className="text-cyan-300 font-bold">KMeans (K=8, 512-dim FAISS vectors)</span>
          </div>
        </div>
      </div>

      {/* Real KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">IDENTIFIED CLUSTERS</span>
          <div className="text-2xl font-bold font-mono text-cyan-300">{realClusters.length} PARTITIONS</div>
          <p className="text-[11px] text-slate-400 font-mono">Unsupervised Terrain Classes</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">INDEXED SATELLITE TILES</span>
          <div className="text-2xl font-bold font-mono text-white">{totalTiles} TILES</div>
          <p className="text-[11px] text-slate-400 font-mono">Multi-Temporal Granules</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">HIGH-CONFIDENCE ANOMALIES</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {highConfidenceCount} OF {totalAnomalies}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">&gt;= 80% Spectral & Delta Score</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">SURVEILLANCE SECTOR</span>
          <div className="text-2xl font-bold font-mono text-amber-400">868.0 km²</div>
          <p className="text-[11px] text-slate-400 font-mono">Ranchi Subarnarekha Mining Basin</p>
        </div>
      </div>

      {/* Main Grid: Real Clusters List + Cluster Detail Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (5 cols): Cluster Cards from Backend */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300 px-1">
            <span className="font-bold text-cyan-400">KMEANS LANDSCAPE CLUSTERS</span>
            <span className="text-slate-500">{realClusters.length} PARTITIONS</span>
          </div>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {realClusters.map((cluster) => {
              const isSelected = cluster.id === selectedClusterId;
              return (
                <div
                  key={cluster.id}
                  onClick={() => {
                    setSelectedClusterId(cluster.id);
                    setSimilarSites(null);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-glow-sm'
                      : 'bg-[#0B1120]/90 border-slate-800 hover:border-cyan-500/30 hover:bg-[#0E172A]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-mono font-bold text-cyan-300">
                          {cluster.id}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                          {cluster.total_tiles} TILES
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1">
                        {cluster.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Exemplar: {cluster.exemplar_tile}
                      </p>
                    </div>

                    {cluster.exemplar_image_url && (
                      <img
                        src={cluster.exemplar_image_url}
                        alt="Exemplar"
                        className="w-12 h-12 rounded object-cover border border-cyan-500/30 ml-2"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                    <span>COORDS: ({cluster.coordinates[0]?.toFixed(3)}°N, {cluster.coordinates[1]?.toFixed(3)}°E)</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFindSimilar(cluster.exemplar_tile);
                      }}
                      className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center space-x-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Find Similar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 cols): Selected Cluster Exemplar & Members */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {selectedCluster && (
            <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/25 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                    CLUSTER MEMBERS & TERRAIN EXEMPLAR
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    {selectedCluster.name} ({selectedCluster.id})
                  </h3>
                </div>

                <button
                  onClick={() => handleFindSimilar(selectedCluster.exemplar_tile)}
                  disabled={isLoadingSimilar}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors"
                >
                  {isLoadingSimilar ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Find Vector Similar</span>
                </button>
              </div>

              {/* Exemplar Preview and Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800 space-y-2">
                  <span className="text-[10px] text-cyan-400 font-bold block">CENTROID EXEMPLAR TILE</span>
                  {selectedCluster.exemplar_image_url ? (
                    <img
                      src={selectedCluster.exemplar_image_url}
                      alt="Exemplar"
                      className="w-full h-36 rounded object-cover border border-cyan-500/30"
                    />
                  ) : (
                    <div className="w-full h-36 rounded bg-slate-900 flex items-center justify-center text-slate-500">No Image</div>
                  )}
                  <div className="text-[11px] text-slate-300 truncate">{selectedCluster.exemplar_tile}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">TOTAL TILES IN CLUSTER:</span>{' '}
                      <span className="text-cyan-300 font-bold">{selectedCluster.total_tiles}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">APPROX CENTROID:</span>{' '}
                      <span className="text-slate-200">
                        {selectedCluster.coordinates[0]?.toFixed(4)}°N, {selectedCluster.coordinates[1]?.toFixed(4)}°E
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">SENSOR:</span>{' '}
                      <span className="text-slate-200">Sentinel-2 MSI (10m Optical)</span>
                    </div>
                    <div>
                      <span className="text-slate-500">SECTOR:</span>{' '}
                      <span className="text-slate-200">Ranchi Subarnarekha Mining Belt</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/workspace')}
                    className="w-full mt-3 py-1.5 rounded bg-[#0E172A] hover:bg-[#162238] text-slate-300 border border-slate-700 text-xs font-mono flex items-center justify-center space-x-1"
                  >
                    <span>View in Tactical Map</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Similar Sites Section */}
              {similarSites && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-300 font-bold">
                    <span>ONE-CLICK SIMILAR SITES (FAISS VECTOR DISTANCE)</span>
                    <span className="text-slate-500 text-[10px]">Target: {targetSimilarTile}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {similarSites.map((site, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-[#070B14] border border-cyan-500/20 space-y-1.5"
                      >
                        <img
                          src={site.image_url}
                          alt={site.tile_file}
                          className="w-full h-20 rounded object-cover"
                        />
                        <div className="text-[10px] font-mono text-cyan-300 font-bold flex items-center justify-between">
                          <span>#{site.rank} MATCH</span>
                          <span>{site.similarity_score ? (site.similarity_score * 100).toFixed(1) : ''}%</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 truncate">{site.tile_file}</div>
                        <div className="text-[9px] font-mono text-slate-500">DATE: {site.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cluster Member Tile Granules */}
              {selectedCluster.members && selectedCluster.members.length > 0 && !similarSites && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-xs font-mono text-slate-400 block font-semibold">
                    SAMPLE MEMBER TILES ({selectedCluster.members.length} SHOWN):
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {selectedCluster.members.slice(0, 8).map((m: any, i: number) => (
                      <div key={i} className="p-1.5 rounded bg-[#070B14] border border-slate-800 text-center space-y-1">
                        <img
                          src={m.image_url}
                          alt={m.tile_file}
                          className="w-full h-16 rounded object-cover"
                        />
                        <div className="text-[9px] font-mono text-slate-400 truncate">{m.tile_file}</div>
                        <div className="text-[8px] font-mono text-slate-500">{m.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
