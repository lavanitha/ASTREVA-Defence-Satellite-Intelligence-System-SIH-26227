import React, { useState } from 'react';
import { useGeointStore } from '../stores/geointStore';
import { SwipeComparison } from '../components/evidence/SwipeComparison';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  ChevronDown,
  Download,
  Send,
  MapPin,
  FileText,
  Sparkles,
} from 'lucide-react';

export const ChangeAnalysisScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    candidates,
    selectedCandidateId,
    selectCandidate,
    setCandidateStatus,
    addAnalystNote,
    createExport,
  } = useGeointStore();

  const [newNote, setNewNote] = useState('');

  const candidate =
    candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addAnalystNote(candidate.id, newNote);
    setNewNote('');
  };

  const handleExportDossier = () => {
    createExport(
      `Intelligence Dossier - ${candidate.id} (${candidate.title})`,
      'Intelligence Dossier (PDF/HTML)',
      candidate.aoiName,
      1
    );
    navigate('/exports');
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-5 overflow-y-auto">
      {/* Top Header / Candidate Selector & Status Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/25 shadow-panel">
        {/* Left: Candidate Selector & Key Info */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Candidate Dropdown Selector */}
          <div className="relative">
            <select
              value={candidate.id}
              onChange={(e) => selectCandidate(e.target.value)}
              className="appearance-none bg-[#070B14] border border-cyan-500/40 rounded-lg px-3 py-2 pr-8 text-xs font-mono text-cyan-300 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.changeType} ({c.confidence}%)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-400">
                {candidate.aoiName}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-mono text-slate-400">
                {candidate.coordinates[0].toFixed(4)}°N, {candidate.coordinates[1].toFixed(4)}°E
              </span>
            </div>
            <h1 className="text-base font-bold text-white tracking-wide mt-0.5">
              {candidate.title}
            </h1>
          </div>
        </div>

        {/* Right: Analyst Verdict Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setCandidateStatus(candidate.id, 'confirmed', 'Analyst verified change vector.')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono flex items-center space-x-1.5 transition-all shadow-sm ${
              candidate.status === 'confirmed'
                ? 'bg-emerald-600 text-slate-950 border border-emerald-400'
                : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>CONFIRM ANOMALY</span>
          </button>

          <button
            onClick={() => setCandidateStatus(candidate.id, 'rejected', 'False alarm or non-threat classification.')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono flex items-center space-x-1.5 transition-all shadow-sm ${
              candidate.status === 'rejected'
                ? 'bg-rose-600 text-white border border-rose-400'
                : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>REJECT (FALSE ALARM)</span>
          </button>

          <button
            onClick={handleExportDossier}
            className="px-3.5 py-2 rounded-lg bg-[#0E172A] hover:bg-[#162238] border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOSSIER</span>
          </button>
        </div>
      </div>

      {/* Main Inspection Grid: Swipe Comparison + Simplified Evidence Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Deep Multi-Temporal Swipe & Band Inspector */}
        <div className="xl:col-span-8 flex flex-col space-y-4">
          <SwipeComparison
            candidate={candidate}
            initialMode="swipe"
            showLayerControls={true}
          />
        </div>

        {/* Right Column (4 cols): Concise "What Changed?" Summary, Risk & Notes */}
        <div className="xl:col-span-4 flex flex-col space-y-4">
          {/* Simplified "WHAT CHANGED?" Inspection Summary */}
          <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/25 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>WHAT CHANGED? — INSPECTION SUMMARY</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                {candidate.confidence}% CONFIDENCE
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#070B14] border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Detected Change Type</div>
                <div className="text-sm font-bold text-white font-sans">{candidate.changeType}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-[#070B14] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Time Period</div>
                  <div className="text-xs text-slate-200 mt-0.5">{candidate.beforeDate} → {candidate.afterDate}</div>
                </div>
                <div className="p-2 rounded bg-[#070B14] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Affected Area</div>
                  <div className="text-xs text-cyan-300 font-bold mt-0.5">{candidate.areaHectares} ha</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#070B14] border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Location</div>
                <div className="text-xs text-slate-200 mt-0.5">{candidate.locationName}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">({candidate.coordinates[0].toFixed(4)}°N, {candidate.coordinates[1].toFixed(4)}°E)</div>
              </div>

              <div className="p-2.5 rounded bg-[#070B14] border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase mb-1">Visual Comparison Summary</div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Comparing the baseline pass ({candidate.beforeDate}) against current satellite acquisition ({candidate.afterDate}) confirms {candidate.areaHectares} hectares of new {candidate.changeType.toLowerCase()} across this sector.
                </p>
              </div>
            </div>
          </div>

          {/* False Alarm Risk Assessment */}
          <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-cyan-400" />
                <span>FALSE ALARM ASSESSMENT</span>
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  candidate.falseAlarmRisk.riskLevel === 'Low'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                }`}
              >
                {candidate.falseAlarmRisk.riskLevel} Risk
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-[#070B14] border border-slate-800">
                <span className="text-slate-400">Seasonality Confounder:</span>
                <span className={candidate.falseAlarmRisk.seasonalAnomaly ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {candidate.falseAlarmRisk.seasonalAnomaly ? 'DETECTED' : 'RULED OUT'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[#070B14] border border-slate-800">
                <span className="text-slate-400">Cloud / Shadow Artifact:</span>
                <span className={candidate.falseAlarmRisk.cloudShadowArtifact ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {candidate.falseAlarmRisk.cloudShadowArtifact ? 'PRESENT' : 'ZERO ARTIFACT'}
                </span>
              </div>
            </div>
          </div>

          {/* Analyst Observation Log & Append Note Box */}
          <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>ANALYST OBSERVATIONS</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {candidate.analystNotes.length} ENTRIES
                </span>
              </div>

              {/* Scrollable notes */}
              <div className="space-y-2 mt-2 max-h-36 overflow-y-auto pr-1">
                {candidate.analystNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-[#070B14] border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </div>

            {/* Note input field */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="relative">
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Append observation or classification remark..."
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none font-sans"
                />
              </div>
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="w-full py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40"
              >
                <Send className="w-3 h-3" />
                <span>Save Analyst Note</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
