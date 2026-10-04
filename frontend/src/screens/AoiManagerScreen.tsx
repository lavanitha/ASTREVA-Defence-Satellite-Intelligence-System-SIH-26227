import React from 'react';
import { useGeointStore } from '../stores/geointStore';
import { TacticalMap } from '../components/map/TacticalMap';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  MapPin,
  Crosshair,
  Calendar,
  Database,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const AoiManagerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { aois, activeAoiId, setActiveAoi, candidates } = useGeointStore();

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-5 overflow-y-auto">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">
              <Layers className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 tracking-wider font-semibold">
              SURVEILLANCE SECTOR CONFIGURATION
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide mt-1">
            Area of Interest (AOI) Sector Manager
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure geographic surveillance boundaries, ingest schedules, and multi-sensor change detection triggers.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          {aois.length} backend-defined sector{aois.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* AOI Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {aois.map((aoi) => {
          const isActive = aoi.id === activeAoiId;
          const aoiCandidates = candidates.filter((c) => c.aoiId === aoi.id);
          const pendingCount = aoiCandidates.filter((c) => c.status === 'pending').length;

          return (
            <div
              key={aoi.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-glow-sm'
                  : 'bg-[#0B1120]/95 border-slate-800 hover:border-cyan-500/30 hover:bg-[#0E172A]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-cyan-300">
                    {aoi.id}
                  </span>
                  {isActive ? (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400 text-[10px] font-mono font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ACTIVE SECTOR</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500">STANDBY</span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white mt-1.5 leading-snug">
                  {aoi.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {aoi.region}
                </p>

                <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed font-sans">
                  {aoi.description}
                </p>
              </div>

              {/* Specs & Stats */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2 font-mono text-xs">
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="p-1.5 rounded bg-[#070B14]">
                    <span className="text-[10px] text-slate-500 block">AREA</span>
                    <span className="text-cyan-300 font-bold">{aoi.areaSqKm} km²</span>
                  </div>
                  <div className="p-1.5 rounded bg-[#070B14]">
                    <span className="text-[10px] text-slate-500 block">SCENES</span>
                    <span className="text-slate-200 font-bold">{aoi.activeScenesCount}</span>
                  </div>
                  <div className="p-1.5 rounded bg-[#070B14]">
                    <span className="text-[10px] text-slate-500 block">PENDING</span>
                    <span className="text-amber-400 font-bold">{pendingCount}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span>LAST INGEST: {aoi.lastIngested}</span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setActiveAoi(aoi.id);
                      navigate('/workspace');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium flex items-center justify-center space-x-1 transition-colors ${
                      isActive
                        ? 'bg-cyan-400 text-slate-950 font-bold'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>{isActive ? 'Current Ops' : 'Activate Sector'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveAoi(aoi.id);
                      navigate('/search');
                    }}
                    className="py-1.5 px-2 rounded-lg bg-[#0E172A] hover:bg-[#162238] text-slate-200 border border-slate-700 text-xs font-mono flex items-center justify-center space-x-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Search Sector</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
