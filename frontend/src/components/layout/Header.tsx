import React, { useState, useEffect } from 'react';
import { useGeointStore } from '../../stores/geointStore';
import {
  Shield,
  WifiOff,
  Clock,
  Radio,
  User,
  ChevronDown,
  LogOut,
  MapPin,
  Bell,
  CheckCircle2,
  Wifi,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, aois, activeAoiId, setActiveAoi, logout, loginAsGuest } = useGeointStore();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [aoiDropdownOpen, setAoiDropdownOpen] = useState(false);
  const [utcTime, setUtcTime] = useState('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  const currentAoi = aois.find((a) => a.id === activeAoiId) || aois[0];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isActive = true;
    const checkHealth = () => {
      apiService.getHealth().then(() => {
        if (isActive) setApiStatus('connected');
      }).catch(() => {
        if (isActive) setApiStatus('offline');
      });
    };

    checkHealth();
    const interval = window.setInterval(checkHealth, 30_000);
    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-16 bg-[#0B1120]/95 backdrop-blur-md border-b border-[#7E9F71]/20 px-4 flex items-center justify-between z-30 select-none">
      {/* Left: ASTREVA & SIH 26227 Branding Block */}
      <div
        className="flex items-center space-x-3.5 cursor-pointer select-none"
        onClick={() => navigate('/')}
      >
        {/* Left Side: ASTREVA Primary Identity */}
        <div className="flex items-center space-x-2.5">
          <img
            src="/assets/sih2plogo.png"
            alt="ASTREVA SIH2P Logo"
            className="h-14 sm:h-15 w-auto max-w-[90px] sm:max-w-[110px] object-contain drop-shadow-md shrink-0"
          />
          <div className="flex flex-col justify-center">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-white font-sans leading-none">
              ASTREVA
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-300 font-sans tracking-normal whitespace-nowrap leading-tight mt-0.5">
              Defence Satellite Intelligence System
            </span>
          </div>
        </div>

        {/* Thin Vertical Divider */}
        <div className="h-9 w-px bg-slate-700/80 mx-1"></div>

        {/* Right Side: SIH 26227 Title Block */}
        <div className="flex flex-col justify-center">
          <span className="text-xs sm:text-sm font-bold tracking-wide text-slate-200 font-mono leading-none">
            SIH 26227
          </span>
          <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-sans tracking-tight whitespace-nowrap leading-tight mt-0.5">
            Semantic Retrieval &amp; Multi-Temporal Change
          </span>
          <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-sans tracking-tight whitespace-nowrap leading-tight">
            Analysis of Satellite Imagery
          </span>
        </div>
      </div>

      {/* Center: Active AOI Selector & UTC Clock */}
      <div className="hidden lg:flex items-center space-x-4">
        {/* Active AOI Dropdown Selector */}
        <div className="relative">
          <button
            onClick={() => setAoiDropdownOpen(!aoiDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#0E172A]/90 border border-[#7E9F71]/25 hover:border-[#A3BF99]/50 transition-colors text-xs text-slate-200"
          >
            <MapPin className="w-3.5 h-3.5 text-[#A3BF99]" />
            <span className="text-slate-400">AOI:</span>
            <span className="font-semibold text-[#A3BF99] max-w-[180px] truncate">
              {currentAoi?.name ?? 'Loading AOI data...'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {aoiDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-72 bg-[#0E172A] border border-[#7E9F71]/30 rounded-lg shadow-xl py-1.5 z-50 backdrop-blur-xl">
              <div className="px-3 py-1.5 text-[11px] font-mono uppercase text-[#A3BF99]/70 border-b border-slate-800">
                Active Surveillance Sectors
              </div>
              {aois.map((aoi) => (
                <button
                  key={aoi.id}
                  onClick={() => {
                    setActiveAoi(aoi.id);
                    setAoiDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#7E9F71]/10 transition-colors ${aoi.id === activeAoiId ? 'bg-[#7E9F71]/20 text-[#A3BF99] font-semibold' : 'text-slate-300'
                    }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-medium text-slate-200">{aoi.name}</div>
                    <div className="text-[10px] text-slate-400">{aoi.region}</div>
                  </div>
                  {aoi.id === activeAoiId && <CheckCircle2 className="w-4 h-4 text-[#A3BF99] shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* UTC Synchronized Clock */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#0E172A]/80 border border-slate-800 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{utcTime || '2026-03-24 12:00:00 UTC'}</span>
        </div>
      </div>

      {/* Right side: Offline Mode, Version, User & Role */}
      <div className="flex items-center space-x-3">
        {/* Backend Connection Status */}
        <div
          title={apiStatus === 'connected' ? 'Backend API is reachable' : apiStatus === 'offline' ? 'Backend API is unavailable' : 'Checking backend API'}
          aria-live="polite"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium shadow-sm ${
            apiStatus === 'connected'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : apiStatus === 'offline'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-slate-900/60 border-slate-600/40 text-slate-300'
          }`}
        >
          {apiStatus === 'connected' ? (
            <Wifi className="w-3 h-3 text-emerald-400" />
          ) : (
            <WifiOff className={`w-3 h-3 ${apiStatus === 'offline' ? 'text-rose-400' : 'text-slate-400'}`} />
          )}
          <span className="hidden sm:inline">
            {apiStatus === 'connected' ? 'API CONNECTED' : apiStatus === 'offline' ? 'OFFLINE MODE' : 'CHECKING API'}
          </span>
        </div>

        {/* Version Badge */}
        <div className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-slate-400">
          v0.1.0
        </div>

        {/* User / Role Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center space-x-2.5 pl-2 pr-3 py-1.5 rounded-md bg-[#0E172A] border border-[#7E9F71]/20 hover:border-[#A3BF99]/40 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#556E4A] to-[#A3BF99] flex items-center justify-center text-slate-950 font-bold text-xs">
              {user.name.charAt(0)}
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-semibold text-slate-200 leading-tight">
                {user.name}
              </div>
              <div className="text-[10px] text-[#A3BF99]/80 font-mono leading-tight truncate max-w-[140px]">
                {user.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-64 bg-[#0E172A] border border-[#7E9F71]/30 rounded-lg shadow-2xl py-2 z-50 backdrop-blur-xl">
              <div className="px-3.5 py-2 border-b border-slate-800/80">
                <div className="text-xs font-semibold text-white">{user.name}</div>
                <div className="text-[11px] text-slate-400 font-mono">{user.role}</div>
                <div className="mt-1.5 inline-block text-[10px] px-1.5 py-0.5 bg-[#24331F]/60 text-[#A3BF99] border border-[#556E4A]/50 rounded font-mono">
                  {user.securityClearance}
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    loginAsGuest();
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-[#7E9F71]/10 hover:text-[#A3BF99] flex items-center space-x-2"
                >
                  <Radio className="w-3.5 h-3.5 text-[#A3BF99]" />
                  <span>Switch to Jury / Demo Mode</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setUserDropdownOpen(false);
                    navigate('/login');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect / Exit Enclave</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
