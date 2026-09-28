import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Map,
  Search,
  Layers,
  Compass,
  CheckSquare,
  Database,
  Download,
  ShieldCheck,
  Activity,
  HardDrive,
} from 'lucide-react';
import { useGeointStore } from '../../stores/geointStore';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const Sidebar: React.FC = () => {
  const { candidates } = useGeointStore();
  const pendingCount = candidates.filter((c) => c.status === 'pending').length;

  const navItems: NavItem[] = [
    { name: 'Workspace', path: '/workspace', icon: Map },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Change Analysis', path: '/change-analysis', icon: Layers },
    { name: 'Discovery', path: '/discovery', icon: Compass },
    { name: 'Review Queue', path: '/review-queue', icon: CheckSquare, badge: pendingCount },
    { name: 'Scene Archive', path: '/scenes', icon: Database },
    { name: 'Exports', path: '/exports', icon: Download },
    { name: 'System', path: '/system', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-[#0B1120]/95 backdrop-blur-xl border-r border-cyan-500/15 flex flex-col justify-between select-none z-20 shrink-0">
      {/* Navigation Section */}
      <div className="p-3">
        <div className="px-3 pt-2 pb-2 text-[10px] font-mono tracking-widest uppercase text-cyan-400/60 font-semibold">
          Operational Modules
        </div>

        <nav className="space-y-1.5 mt-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/60 to-cyan-900/20 text-cyan-200 border-l-2 border-cyan-400 shadow-[inset_0_0_12px_rgba(0,229,255,0.08)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E172A]/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-[10px] text-slate-500 group-hover:text-cyan-400/70 w-3">
                        {index + 1}
                      </span>
                      <Icon
                        className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]' : 'text-slate-400 group-hover:text-cyan-300'
                        }`}
                      />
                      <span className="tracking-wide">{item.name}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Subtle active indicator dot */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-cyan-400 rounded-r shadow-[0_0_8px_#00e5ff]" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / Telemetry HUD */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070B14]/40">
        <div className="rounded-lg p-2.5 bg-[#0E172A]/80 border border-cyan-500/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>INFERENCE ENGINE</span>
            </span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center space-x-1.5">
              <HardDrive className="w-3 h-3 text-slate-500" />
              <span>TILE CACHE</span>
            </span>
            <span className="text-cyan-300">48.2 GB (NVMe)</span>
          </div>

          <div className="w-full bg-slate-800/80 h-1 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full w-[24%]" />
          </div>
        </div>

        <div className="mt-2 text-center text-[10px] font-mono text-slate-500 tracking-wider">
          AIR-GAPPED DEFENCE WORKSTATION
        </div>
      </div>
    </aside>
  );
};
