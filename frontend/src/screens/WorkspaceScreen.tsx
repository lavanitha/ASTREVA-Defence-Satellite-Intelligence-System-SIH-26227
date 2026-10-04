import React, { useState } from 'react';
import { useGeointStore } from '../stores/geointStore';
import { TacticalMap } from '../components/map/TacticalMap';
import { AnalysisPanels } from '../components/workspace/AnalysisPanels';
import { ChangeCandidate } from '../types/geoint';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Layers,
  Sparkles,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Eye,
  Crosshair,
  AlertTriangle,
} from 'lucide-react';
import { apiService } from '../services/api';

export const WorkspaceScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    aois,
    activeAoiId,
    candidates,
    selectedCandidateId,
    selectCandidate,
    setCandidateStatus,
    addAuditLog,
  } = useGeointStore();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'high'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const currentAoi = aois.find((a) => a.id === activeAoiId) || aois[0];
  const aoiCandidates = candidates.filter((c) => c.aoiId === activeAoiId);
  const averageConfidence = aoiCandidates.length
    ? aoiCandidates.reduce((total, candidate) => total + candidate.confidence, 0) / aoiCandidates.length
    : null;

  // Filtered candidate list
  const filteredCandidates = aoiCandidates.filter((cand) => {
    const matchesSearch =
      cand.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      cand.locationName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      cand.id.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'pending') return cand.status === 'pending';
    if (activeTab === 'confirmed') return cand.status === 'confirmed';
    if (activeTab === 'high') return cand.confidence >= 90;
    return true;
  });

  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) ||
    filteredCandidates[0] ||
    candidates[0];

  return (
    <div className="flex flex-col h-full p-4 lg:p-5 space-y-4">
      {/* Top Telemetry & Status Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0B1120]/90 border border-cyan-500/20 backdrop-blur-md">
        {/* Left: Active Sector Info */}
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shadow-glow-sm">
            <Crosshair className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider font-semibold">
                ACTIVE SECTOR
              </span>
              <span className="text-xs font-mono text-slate-400">
                {currentAoi?.region ?? 'Loading sector data...'}
              </span>
            </div>
            <h1 className="text-base font-bold text-white tracking-wide mt-0.5">
              {currentAoi?.name ?? 'Loading AOI data...'}
            </h1>
          </div>
        </div>

        {/* Center: Live Stats HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-[#0E172A]/80 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">TOTAL AREA</span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              {currentAoi ? `${currentAoi.areaSqKm} km²` : '-- km²'}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#0E172A]/80 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">ANOMALIES</span>
            <span className="text-xs font-mono font-bold text-white">
              {aoiCandidates.length} Detected
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#0E172A]/80 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">PENDING REVIEW</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {aoiCandidates.filter((c) => c.status === 'pending').length} Actionable
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#0E172A]/80 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">AVG CONFIDENCE</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {averageConfidence === null ? 'N/A' : `${averageConfidence.toFixed(1)}%`}
            </span>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/sectors')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#0E172A] hover:bg-[#162238] border border-cyan-500/20 text-xs font-medium text-slate-300 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Manage Sectors</span>
          </button>
        </div>
      </div>

      {/* Main Tactical Workspace Layout: Map + Live Candidate Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[520px]">
        {/* Center & Left: Full Tactical Map */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[460px]">
          <TacticalMap
            height="100%"
            onSelectCandidate={(cand) => selectCandidate(cand.id)}
          />
        </div>

        {/* Right: Operational Threat Ticker & Candidate Quick Inspector */}
        <div className="lg:col-span-4 flex flex-col space-y-3.5 h-full overflow-hidden">
          {/* Candidate Filter & Search Panel */}
          <div className="p-3 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>SECTOR ANOMALY FEED ({filteredCandidates.length})</span>
              </span>
              <button
                onClick={() => navigate('/review-queue')}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center space-x-1"
              >
                <span>Full Queue</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates by name/ID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#070B14] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px] font-mono">
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'high', label: 'High Conf (>90%)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'bg-[#0E172A] text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Candidate Card Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
            {filteredCandidates.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#0B1120]/60 border border-slate-800 text-xs text-slate-400">
                No anomalies matching current criteria in this sector.
              </div>
            ) : (
              filteredCandidates.map((cand) => {
                const isSelected = cand.id === selectedCandidate?.id;
                return (
                  <div
                    key={cand.id}
                    onClick={() => selectCandidate(cand.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                        : 'bg-[#0B1120]/80 border-slate-800/80 hover:border-cyan-500/30 hover:bg-[#0E172A]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-mono font-bold text-cyan-300">
                            {cand.id}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                              cand.status === 'confirmed'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : cand.status === 'rejected'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            {cand.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">
                          {cand.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {cand.locationName}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {cand.confidence}%
                        </span>
                        <span className="text-[10px] text-slate-500 block">AI MATCH</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                      <span>TYPE: {cand.changeType}</span>
                      <span>Δ {cand.areaHectares} ha</span>
                      <span>{cand.detectionDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Card: Selected Candidate Quick Preview */}
          {selectedCandidate && (
            <div className="p-3.5 rounded-xl bg-[#0B1120]/95 border border-cyan-500/30 flex flex-col space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                    INSPECTION FOCUS
                  </div>
                  <div className="text-xs font-bold text-white">
                    {selectedCandidate.title}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {selectedCandidate.confidence}% Confidence
                  </span>
                </div>
              </div>

              {/* Side-by-side miniature thumbnail comparison */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative rounded overflow-hidden border border-slate-800 aspect-video">
                  <img
                    src={selectedCandidate.thumbnails.beforeRGB}
                    alt="Baseline"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-cyan-300">
                    BEFORE
                  </div>
                </div>
                <div className="relative rounded overflow-hidden border border-cyan-500/40 aspect-video">
                  <img
                    src={selectedCandidate.thumbnails.afterRGB}
                    alt="Current"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-cyan-950/80 text-[9px] font-mono text-cyan-300">
                    CURRENT
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    selectCandidate(selectedCandidate.id);
                    navigate('/change-analysis');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Deep Inspector</span>
                </button>

                <button
                  onClick={() => navigate(`/candidate/${selectedCandidate.id}`)}
                  className="px-3 py-1.5 rounded-lg bg-[#0E172A] hover:bg-[#162238] text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Full Dossier</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Analysis Panels — Temporal / Change Detection / Elevation */}
      <AnalysisPanels />
    </div>
  );
};
