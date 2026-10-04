import React, { useState } from 'react';
import { useGeointStore } from '../../stores/geointStore';
import {
  TrendingUp,
  BarChart3,
  Droplets,
  Building2,
  Calendar,
  Layers,
  MapPin,
  Clock,
  ShieldCheck,
  Activity,
  ArrowRight,
} from 'lucide-react';

type IndexTab = 'NDVI' | 'NDBI' | 'Change Mask';

export const AnalysisPanels: React.FC = () => {
  const { candidates, selectedCandidateId } = useGeointStore();
  const [activeIndex, setActiveIndex] = useState<IndexTab>('NDVI');

  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  if (!selectedCandidate) return null;

  const [lat, lon] = selectedCandidate.coordinates;

  const currentStats = {
    title: activeIndex === 'NDVI'
      ? 'NDVI source-raster visualization'
      : activeIndex === 'NDBI'
        ? 'NDBI source-raster visualization'
        : 'Computed spectral change mask',
    color: activeIndex === 'NDVI' ? '#10b981' : activeIndex === 'NDBI' ? '#f97316' : '#f43f5e',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Real Temporal Analysis Main Panel (Spans 12 columns, clean & organized) */}
      <div className="lg:col-span-12 rounded-xl bg-[#0B132B]/95 border border-sky-500/25 p-4 backdrop-blur-md overflow-hidden space-y-4 shadow-panel">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <BarChart3 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center space-x-2">
                <span>TEMPORAL ANALYSIS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  REAL SATELLITE MEASUREMENTS
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Multi-temporal observation timeline for {selectedCandidate.id} ({selectedCandidate.changeType})
              </p>
            </div>
          </div>

          {/* Index Selector Tabs */}
          <div className="flex items-center space-x-1 bg-[#070B14] p-1 rounded-lg border border-slate-800">
            {(['NDVI', 'NDBI', 'SAR Radar', 'Change Mask'] as IndexTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveIndex(tab)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                  activeIndex === tab
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Real Temporal Measurements & Selected Candidate Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
          {/* Tile 1: Target Location */}
          <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">TARGET COORDINATES</span>
            <div className="text-sky-300 font-bold text-xs flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{lat.toFixed(4)}°N, {lon.toFixed(4)}°E</span>
            </div>
            <div className="text-[10px] text-slate-400">{selectedCandidate.locationName}</div>
          </div>

          {/* Tile 2: First & Latest Detection */}
          <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">TEMPORAL BOUNDS</span>
            <div className="text-slate-200 font-bold text-xs flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{selectedCandidate.beforeDate} → {selectedCandidate.afterDate}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              First Detection: <span className="text-amber-300 font-bold">{selectedCandidate.earliestEvidenceDate}</span>
            </div>
          </div>

          {/* Tile 3: Measured Index Delta */}
          <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">{currentStats.title}</span>
            <div className="font-bold text-xs" style={{ color: currentStats.color }}>
              {currentStats.title}
            </div>
            <div className="text-[10px] text-slate-400">No numeric index statistics are stored for this candidate.</div>
          </div>

          {/* Tile 4: Change Summary */}
          <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">CHANGE IMPACT</span>
            <div className="text-amber-400 font-bold text-xs">
              {selectedCandidate.changeType} ({selectedCandidate.confidence}%)
            </div>
            <div className="text-[10px] text-slate-400">
              Area: <span className="text-sky-300 font-bold">{selectedCandidate.areaHectares} hectares</span>
            </div>
          </div>
        </div>

        {/* Real Temporal Imagery Cards Strip */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="text-sky-300 font-bold flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>REAL SATELLITE TEMPORAL IMAGERY THUMBNAILS</span>
            </span>
            <span>Sentinel-2 L2A 10m Resolution (Ranchi Sector)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Baseline Card */}
            <div className="p-2 rounded-lg bg-[#070B14] border border-slate-800 space-y-1.5 group cursor-pointer">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="font-bold text-slate-300">BASELINE</span>
                <span className="text-sky-400">{selectedCandidate.beforeDate}</span>
              </div>
              <div className="aspect-video rounded overflow-hidden bg-slate-900 border border-slate-800 relative">
                <img
                  src={selectedCandidate.thumbnails.beforeRGB}
                  alt="Baseline RGB"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 block text-center">
                True Color RGB
              </span>
            </div>

            {/* Current Observation Card */}
            <div className="p-2 rounded-lg bg-[#070B14] border border-slate-800 space-y-1.5 group cursor-pointer">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="font-bold text-amber-300">CURRENT OBS</span>
                <span className="text-sky-400">{selectedCandidate.afterDate}</span>
              </div>
              <div className="aspect-video rounded overflow-hidden bg-slate-900 border border-slate-800 relative">
                <img
                  src={selectedCandidate.thumbnails.afterRGB}
                  alt="Current RGB"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 block text-center">
                True Color RGB
              </span>
            </div>

            {/* Spectral Index / Layer Card */}
            <div className="p-2 rounded-lg bg-[#070B14] border border-slate-800 space-y-1.5 group cursor-pointer">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="font-bold text-emerald-400">{activeIndex}</span>
                <span className="text-sky-400">{selectedCandidate.afterDate}</span>
              </div>
              <div className="aspect-video rounded overflow-hidden bg-slate-900 border border-slate-800 relative">
                <img
                  src={
                    activeIndex === 'NDVI'
                      ? selectedCandidate.thumbnails.ndvi
                      : activeIndex === 'NDBI'
                        ? selectedCandidate.thumbnails.ndbi
                        : selectedCandidate.thumbnails.changeMask
                  }
                  alt={activeIndex}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 block text-center">
                {currentStats.title}
              </span>
            </div>

            {/* Real Black & White Change Mask Card */}
            <div className="p-2 rounded-lg bg-[#070B14] border border-slate-800 space-y-1.5 group cursor-pointer">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="font-bold text-rose-400">CHANGE MASK</span>
                <span className="text-rose-400 font-bold">BLACK/WHITE</span>
              </div>
              <div className="aspect-video rounded overflow-hidden bg-slate-900 border border-slate-800 relative">
                <img
                  src={selectedCandidate.thumbnails.changeMask}
                  alt="Real Black/White Change Mask"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 block text-center">
                Real ML Binary Mask
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
