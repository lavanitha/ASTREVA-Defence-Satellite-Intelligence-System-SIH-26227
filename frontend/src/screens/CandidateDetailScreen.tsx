import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGeointStore } from '../stores/geointStore';
import { SwipeComparison } from '../components/evidence/SwipeComparison';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  MapPin,
  Calendar,
  Layers,
  Send,
  Printer,
  Compass,
} from 'lucide-react';

export const CandidateDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    candidates,
    setCandidateStatus,
    addAnalystNote,
    createExport,
  } = useGeointStore();

  const [newNote, setNewNote] = useState('');

  const candidate =
    candidates.find((c) => c.id === id) || candidates[0];

  const handleStatusChange = (status: 'confirmed' | 'rejected') => {
    setCandidateStatus(candidate.id, status, `Updated via Intelligence Dossier view.`);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addAnalystNote(candidate.id, newNote);
    setNewNote('');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportDossier = () => {
    createExport(
      `Intelligence Dossier - ${candidate.id}`,
      'Intelligence Dossier (PDF/HTML)',
      candidate.aoiName,
      1
    );
    navigate('/exports');
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-5 overflow-y-auto">
      {/* Top Header / Breadcrumb & Dossier Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-[#0B1120] hover:bg-[#121F38] border border-cyan-500/30 text-slate-300 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40 font-bold tracking-wider">
                SECRET // CLASSIFIED GEOINT DOSSIER
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {candidate.id}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide mt-1">
              {candidate.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-lg bg-[#0E172A] hover:bg-[#162238] border border-cyan-500/30 text-xs font-mono text-slate-200 flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Print Dossier</span>
          </button>

          <button
            onClick={handleExportDossier}
            className="px-3 py-2 rounded-lg bg-[#0E172A] hover:bg-[#162238] border border-cyan-500/30 text-xs font-mono text-slate-200 flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Package</span>
          </button>

          <button
            onClick={() => handleStatusChange('confirmed')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all ${
              candidate.status === 'confirmed'
                ? 'bg-emerald-500 text-slate-950 border border-emerald-400 shadow-glow-sm'
                : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirm</span>
          </button>

          <button
            onClick={() => handleStatusChange('rejected')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all ${
              candidate.status === 'rejected'
                ? 'bg-rose-500 text-white border border-rose-400'
                : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>
        </div>
      </div>

      {/* Military Grid Reference & Key Specs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-lg bg-[#0B1120]/95 border border-cyan-500/20 text-xs font-mono">
          <span className="text-[10px] text-slate-500 block">SECTOR</span>
          <span className="text-slate-200 font-bold truncate block">{candidate.aoiName}</span>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1120]/95 border border-cyan-500/20 text-xs font-mono">
          <span className="text-[10px] text-slate-500 block">MGRS / COORDINATES</span>
          <span className="text-cyan-300 font-bold block">
            {candidate.coordinates[0].toFixed(4)}°N, {candidate.coordinates[1].toFixed(4)}°E
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1120]/95 border border-cyan-500/20 text-xs font-mono">
          <span className="text-[10px] text-slate-500 block">CHANGE TYPE</span>
          <span className="text-slate-200 font-bold block">{candidate.changeType}</span>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1120]/95 border border-cyan-500/20 text-xs font-mono">
          <span className="text-[10px] text-slate-500 block">DELTA AREA</span>
          <span className="text-amber-400 font-bold block">{candidate.areaHectares} Hectares</span>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1120]/95 border border-cyan-500/20 text-xs font-mono">
          <span className="text-[10px] text-slate-500 block">AI CONFIDENCE</span>
          <span className="text-emerald-400 font-bold block">{candidate.confidence}% Verified</span>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1120]/95 border border-cyan-500/20 text-xs font-mono">
          <span className="text-[10px] text-slate-500 block">FIRST EVIDENCE</span>
          <span className="text-slate-200 font-bold block">{candidate.earliestEvidenceDate}</span>
        </div>
      </div>

      {/* Main Evidence Viewer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300 px-1">
          <span className="font-bold text-cyan-400">MULTISPECTRAL & SAR CO-REGISTERED EVIDENCE</span>
          <span className="text-slate-500">10m GROUND SAMPLE DISTANCE</span>
        </div>

        <SwipeComparison
          candidate={candidate}
          initialMode="swipe"
          showLayerControls={true}
        />
      </div>

      {/* Multi-Section Analysis: Evolution Timeline + Checklist + Audit History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Evolution Stages & False Alarm Evaluation */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Temporal Evolution Stages */}
          <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>CHRONOLOGICAL TEMPORAL STAGES</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {candidate.temporalTimeline.length} PASSES
              </span>
            </div>

            <div className="space-y-2.5">
              {candidate.temporalTimeline.map((stage, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-[#070B14] border border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <div className="space-y-0.5">
                    <div className="text-cyan-300 font-bold">{stage.date} • {stage.stage}</div>
                    <div className="text-[10px] text-slate-500">Sensor Platform: {stage.sensor}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 font-bold">
                      {Math.round(stage.metric * 100)}% Change
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* False Alarm Assessment */}
          <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-cyan-400" />
                <span>FALSE ALARM VERIFICATION REPORT</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold">
                {candidate.falseAlarmRisk.riskLevel} Risk
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#070B14] border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SEASONAL ANOMALY:</span>
                <span className={candidate.falseAlarmRisk.seasonalAnomaly ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {candidate.falseAlarmRisk.seasonalAnomaly ? 'Flagged Anomaly' : 'Ruled Out (Consistent)'}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#070B14] border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SHADOW / CLOUD ARTIFACT:</span>
                <span className={candidate.falseAlarmRisk.cloudShadowArtifact ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {candidate.falseAlarmRisk.cloudShadowArtifact ? 'Cloud Contamination' : 'Clear Sky Passes'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Audit Trail & Analyst Notes */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Audit History for this Candidate */}
          <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3 flex-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>CHAIN OF CUSTODY (NON-REPUDIATION)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {candidate.reviewHistory.length} ACTIONS
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {candidate.reviewHistory.map((rev, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-[#070B14] border border-slate-800 text-[11px] font-mono space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="text-cyan-400 font-bold">{rev.action}</span>
                    <span>{rev.timestamp}</span>
                  </div>
                  <div className="text-slate-300">By: {rev.user}</div>
                  {rev.note && <div className="text-slate-400 italic">"{rev.note}"</div>}
                </div>
              ))}
            </div>

            {/* Analyst Notes Appender */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <textarea
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Append classified remark to candidate dossier..."
                className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none font-sans"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="w-full py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
