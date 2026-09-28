import React, { useState } from 'react';
import { useGeointStore } from '../stores/geointStore';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  WifiOff,
  Radio,
  CheckCircle2,
  HardDrive,
  KeyRound,
  UserCheck,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginAsGuest } = useGeointStore();

  const [username, setUsername] = useState('admin.defence');
  const [password, setPassword] = useState('••••••••••••');
  const [clearance, setClearance] = useState('SECRET / NATIONAL ENCLAVE');

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(username, 'Senior GEOINT Officer (Level-3)');
    navigate('/workspace');
  };

  const handleJuryLogin = () => {
    loginAsGuest();
    navigate('/workspace');
  };

  return (
    <div className="min-h-screen w-screen bg-[#070B14] flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Background Graticule Lines & Subtle Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      {/* Top Banner: Air-Gapped Defence Notice */}
      <div className="relative z-10 flex items-center justify-between p-3 rounded-lg bg-[#0B1120]/90 border border-cyan-500/20 backdrop-blur-md text-xs font-mono">
        <div className="flex items-center space-x-2 text-cyan-300">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="font-bold tracking-wider">SIH 26227 // DEFENCE AIR-GAPPED WORKSTATION</span>
        </div>
        <div className="flex items-center space-x-2 text-emerald-400">
          <WifiOff className="w-3.5 h-3.5" />
          <span>ZERO EXTERNAL NETWORK LEAKAGE</span>
        </div>
      </div>

      {/* Center: Main Authentication Terminal Card */}
      <div className="relative z-10 max-w-md w-full mx-auto my-auto">
        <div className="rounded-2xl bg-[#0B1120]/95 border border-cyan-500/30 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Emblem & Branding */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-950 to-[#0E172A] border border-cyan-500/40 shadow-glow-cyan">
              <Shield className="w-7 h-7 text-cyan-400" />
            </div>

            <h2 className="text-xl font-bold text-white tracking-wider font-display">
              GEOINT OPERATIONAL ENCLAVE
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Semantic Retrieval & Multi-Temporal Change Analysis
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleStandardLogin} className="space-y-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">
                SERVICE ID / BADGE NUMBER:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#070B14] border border-cyan-500/30 rounded-lg p-2.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">
                CRYPTOGRAPHIC TOKEN PIN:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#070B14] border border-cyan-500/30 rounded-lg p-2.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">
                SECURITY CLEARANCE PROFILE:
              </label>
              <select
                value={clearance}
                onChange={(e) => setClearance(e.target.value)}
                className="w-full bg-[#070B14] border border-cyan-500/30 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="SECRET / NATIONAL ENCLAVE">SECRET / NATIONAL ENCLAVE</option>
                <option value="TOP SECRET / DEFENCE CORRIDOR">TOP SECRET / DEFENCE CORRIDOR</option>
                <option value="LEVEL-3 GEOINT OFFICER">LEVEL-3 GEOINT OFFICER</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-glow-sm flex items-center justify-center space-x-1.5"
            >
              <KeyRound className="w-4 h-4" />
              <span>AUTHENTICATE INTO ENCLAVE</span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative px-3 bg-[#0B1120] text-[10px] font-mono text-slate-500 uppercase">
              OR DIRECT EVALUATION ACCESS
            </span>
          </div>

          {/* Quick Jury / Demo Access Button */}
          <button
            type="button"
            onClick={handleJuryLogin}
            className="w-full py-2.5 rounded-lg bg-[#0E172A] hover:bg-[#162238] border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs transition-colors flex items-center justify-center space-x-2"
          >
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>1-CLICK SIH 2026 JURY / DEMO ACCESS</span>
            <ChevronRight className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Bottom Telemetry HUD */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 gap-2 border-t border-slate-800/80 pt-3">
        <div className="flex items-center space-x-3">
          <span>HOST: AIRGAP-WORKSTATION-DEF4</span>
          <span>•</span>
          <span>LOCAL STAC: 4,892 SCENES</span>
          <span>•</span>
          <span>INFERENCE ENGINE: LOADED</span>
        </div>
        <div>SIH 2026 DEFENCE ENCLAVE PROTOCOL // HARDENED</div>
      </div>
    </div>
  );
};
