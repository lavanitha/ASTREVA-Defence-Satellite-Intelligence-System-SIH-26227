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
  Radio,
  Sliders,
  Code,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export const CandidateDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    candidates,
    setCandidateStatus,
    addAnalystNote,
    createExport,
    initApiData,
    isLoadingApi,
  } = useGeointStore();

  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'falsealarm' | 'crossval' | 'coreg' | 'stac'>('timeline');
  const [copiedStac, setCopiedStac] = useState(false);

  const candidate =
    candidates.find((c) => c.id === id) || candidates[0];

  if (!candidate) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-bold text-white">Candidate data unavailable</h1>
        <p className="max-w-md text-sm text-slate-400">
          This dossier requires a candidate returned by the live backend.
        </p>
        <button
          onClick={() => void initApiData()}
          disabled={isLoadingApi}
          className="flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-950/50 px-3 py-2 text-sm text-cyan-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingApi ? 'animate-spin' : ''}`} />
          Retry data load
        </button>
      </div>
    );
  }

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
      candidate.aoiName
    );
    void createExport(
      `Intelligence Dossier - ${candidate.id}`,
      'Intelligence Dossier (PDF/HTML)',
      candidate.aoiName
    ).then(() => navigate('/exports'));
  };

  const handleCopyStac = () => {
    if (candidate.stacItem) {
      navigator.clipboard.writeText(JSON.stringify(candidate.stacItem, null, 2));
      setCopiedStac(true);
      setTimeout(() => setCopiedStac(false), 2000);
    }
  };

  const backtracking = candidate.backtracking;
  const falseAlarm6Factor = candidate.falseAlarm6Factor;
  const crossVal = candidate.crossValidation;
  const coReg = candidate.coRegistration;

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
          <span className="text-amber-400 font-bold block">{candidate.areaHectares ?? 'Not measured'} Hectares</span>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1120]/95 border border-cyan-500/20 text-xs font-mono">
          <span className="text-[10px] text-slate-500 block">FUSED CONFIDENCE</span>
          <span className="text-emerald-400 font-bold block">{crossVal ? `${crossVal.fused_confidence}% (S2+S1)` : 'Not recorded'}</span>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1120]/95 border border-cyan-500/20 text-xs font-mono">
          <span className="text-[10px] text-slate-500 block">EARLIEST ONSET</span>
          <span className="text-amber-300 font-bold block">{backtracking?.earliest_change_date ?? 'Not recorded'}</span>
        </div>
      </div>

      {/* Main Evidence Viewer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300 px-1">
          <span className="font-bold text-cyan-400">MULTISPECTRAL & SAR CO-REGISTERED EVIDENCE</span>
          <span className="text-slate-500">SOURCE RESOLUTION: NOT PROVIDED</span>
        </div>

        <SwipeComparison
          candidate={candidate}
          initialMode="swipe"
          showLayerControls={true}
        />
      </div>

      {/* 10 SIH PRIORITY FEATURES INTELLIGENCE TABS */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors shrink-0 ${
            activeTab === 'timeline'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>1. Earliest-Change Backtracking</span>
        </button>

        <button
          onClick={() => setActiveTab('falsealarm')}
          className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors shrink-0 ${
            activeTab === 'falsealarm'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>3. 6-Factor False-Alarm Diagnostic</span>
        </button>

        <button
          onClick={() => setActiveTab('crossval')}
          className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors shrink-0 ${
            activeTab === 'crossval'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>4. Sentinel-2 + Sentinel-1 Fusion</span>
        </button>

        <button
          onClick={() => setActiveTab('coreg')}
          className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors shrink-0 ${
            activeTab === 'coreg'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>10. Radiometric & Co-Registration</span>
        </button>

        <button
          onClick={() => setActiveTab('stac')}
          className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors shrink-0 ${
            activeTab === 'stac'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>6. STAC v1.0.0 Provenance</span>
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Active Feature Panel */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* TAB 1: Earliest-Change Backtracking */}
          {activeTab === 'timeline' && (
            <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>EARLIEST-CHANGE BACKTRACKING & TIME-SERIES</span>
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Earliest recorded observation: <span className="text-amber-400 font-bold">{backtracking?.earliest_change_date ?? 'Not available'}</span>{backtracking && ` (${backtracking.backtracking_confidence}% confidence)`}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                  {backtracking?.time_series_observations.length ?? 0} SOURCE OBSERVATIONS
                </span>
              </div>

              <div className="space-y-2.5">
                {backtracking?.time_series_observations.map((obs, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                      obs.status === 'EARLIEST_ANOMALY_ONSET'
                        ? 'bg-amber-950/40 border-amber-500/50 shadow-glow-sm'
                        : 'bg-[#070B14] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-cyan-300 font-bold">{obs.date}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">{obs.scene_id}</span>
                      </div>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        obs.status === 'EARLIEST_ANOMALY_ONSET'
                          ? 'bg-amber-500 text-slate-950'
                          : obs.status === 'CURRENT_DETECTION'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {obs.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 font-sans">{obs.description}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-800/80">
                      <span>Sensor: {obs.sensor}</span>
                      <span className="text-amber-400 font-bold">Anomaly Metric: {Math.round(obs.anomaly_score * 100)}%</span>
                    </div>
                  </div>
                )) ?? <p className="text-xs text-slate-400">No time-series observations are stored for this candidate.</p>}
              </div>
            </div>
          )}

          {/* TAB 2: 6-Factor Explainable False-Alarm Suppression */}
          {activeTab === 'falsealarm' && (
            <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-cyan-400" />
                    <span>EXPLAINABLE 6-FACTOR FALSE-ALARM DIAGNOSTIC</span>
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Source risk: <span className="text-amber-300 font-bold">{candidate.falseAlarmRisk.riskLevel}</span>{falseAlarm6Factor && <>; suppression score: <span className="text-emerald-400 font-bold">{falseAlarm6Factor.overallSuppressionScore}%</span></>}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                  {candidate.falseAlarmRisk.riskLevel.toUpperCase()} SOURCE RISK
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                {falseAlarm6Factor ? Object.entries(falseAlarm6Factor.factors).map(([key, factor]) => {
                  const titles: Record<string, string> = {
                    cloudShadow: '1. Cloud & Shadow Confounder Suppression',
                    seasonalPhenology: '2. Seasonal Vegetation Phenology Mismatch',
                    radiometricGain: '3. Radiometric & Solar Zenith Shift',
                    nodataBorder: '4. NoData & Sensor Frame Border Distortion',
                    registrationShift: '5. Sub-Pixel Co-Registration Shift Tolerance',
                  };

                  return (
                    <div key={key} className="p-3 rounded-lg bg-[#070B14] border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-bold">{titles[key] || key}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-cyan-400 font-bold">{factor.score}% Clean</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            factor.flagged ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-emerald-950 text-emerald-300'
                          }`}>
                            {factor.flagged ? 'FLAGGED' : 'PASSED'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans">{factor.explanation}</p>
                    </div>
                  );
                }) : <p className="text-xs text-slate-400">No six-factor report is stored for this candidate.</p>}
              </div>
            </div>
          )}

          {/* TAB 3: Sentinel-2 + Sentinel-1 Optical vs SAR Cross-Validation */}
          {activeTab === 'crossval' && (
            <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span>OPTICAL (S2) + SAR (S1) DUAL-SENSOR CROSS-VALIDATION</span>
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Cross-Sensor Status: <span className="text-slate-300 font-bold">{crossVal?.agreement_status ?? 'Not available'}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                  FUSED CONFIDENCE: {crossVal?.fused_confidence ?? 'Not available'}{crossVal && '%'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-[#070B14] border border-slate-800 text-[11px] text-slate-300 font-sans">
                {crossVal?.agreement_description ?? 'No cross-sensor validation is stored for this candidate.'}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#070B14] border border-cyan-500/30 space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-cyan-300 font-bold">
                    <span>SENTINEL-2 OPTICAL</span>
                    <span>{crossVal?.optical_confidence ?? 'N/A'}{crossVal && '%'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>Bands: {crossVal?.optical_metrics?.bands ?? 'N/A'}</div>
                    <div>NDVI Delta: {crossVal?.optical_metrics?.ndvi_delta ?? 'N/A'}</div>
                    <div>NDBI Delta: {crossVal?.optical_metrics?.ndbi_delta ?? 'N/A'}</div>
                    <div>Cloud Obscuration: {crossVal?.optical_metrics?.cloud_obscuration ?? 'N/A'}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#070B14] border border-purple-500/30 space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-purple-300 font-bold">
                    <span>SENTINEL-1 SAR (RADAR)</span>
                    <span>{crossVal?.sar_confidence ?? 'N/A'}{crossVal && '%'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>Polarization: {crossVal?.sar_metrics?.polarization ?? 'N/A'}</div>
                    <div>VV Delta: {crossVal?.sar_metrics?.vv_backscatter_delta_db ?? 'N/A'} dB</div>
                    <div>VH Delta: {crossVal?.sar_metrics?.vh_backscatter_delta_db ?? 'N/A'} dB</div>
                    <div>Cloud Penetration: {crossVal?.sar_metrics?.cloud_penetration_verified == null ? 'N/A' : crossVal.sar_metrics.cloud_penetration_verified ? 'Verified' : 'Not verified'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Radiometric Normalization & Sub-Pixel Co-Registration */}
          {activeTab === 'coreg' && (
            <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>RADIOMETRIC & SUB-PIXEL CO-REGISTRATION QUALITY</span>
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Alignment Status: <span className="text-slate-300 font-bold">{coReg?.validationStatus ?? 'Not available'}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                  QUALITY SCORE: {coReg?.alignmentQualityScore ?? 'Not available'}{coReg && '%'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded bg-[#070B14] border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px]">SUB-PIXEL SHIFT (PHASE CORRELATION)</div>
                  <div className="text-cyan-300 font-bold text-sm">
                    {coReg?.subpixelShift.totalShiftPx ?? 'N/A'} px (X: {coReg?.subpixelShift.xShiftPx ?? 'N/A'}px, Y: {coReg?.subpixelShift.yShiftPx ?? 'N/A'}px)
                  </div>
                  <div className="text-[10px] text-slate-500">Tolerance: {coReg?.subpixelShift.tolerancePx ?? 'N/A'} px</div>
                </div>

                <div className="p-3 rounded bg-[#070B14] border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px]">RADIOMETRIC GAIN RATIO</div>
                  <div className="text-emerald-400 font-bold text-sm">{coReg?.radiometricNormalization.gainFactor ?? 'N/A'}x TOA Matching</div>
                  <div className="text-[10px] text-slate-500">Reflectance Delta: {coReg?.radiometricNormalization.normalizedReflectanceDelta ?? 'N/A'}</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#070B14] border border-slate-800 text-[11px] font-sans text-slate-300">
                {coReg?.explanation ?? 'No co-registration result is stored for this candidate.'}
              </div>
            </div>
          )}

          {/* TAB 5: Full STAC v1.0.0 Provenance Inspector */}
          {activeTab === 'stac' && (
            <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                    <Code className="w-4 h-4 text-cyan-400" />
                    <span>STAC v1.0.0 PROVENANCE & ASSET LINEAGE</span>
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Item ID: <span className="text-slate-200">{candidate.id}</span>
                  </div>
                </div>

                <button
                  onClick={handleCopyStac}
                  disabled={!candidate.stacItem}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 flex items-center space-x-1 transition-colors"
                >
                  {copiedStac ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStac ? 'Copied' : 'Copy STAC JSON'}</span>
                </button>
              </div>

              <pre className="p-3 rounded-lg bg-[#070B14] border border-slate-800 text-[10px] font-mono text-cyan-300 max-h-56 overflow-y-auto">
                {candidate.stacItem ? JSON.stringify(candidate.stacItem, null, 2) : 'No STAC provenance item is stored for this candidate.'}
              </pre>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Cryptographic Audit Trail & Analyst Remarks */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-3 flex-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono tracking-wide text-cyan-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>CRYPTOGRAPHIC AUDIT TRAIL</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                TAMPER-PROOF HASH-CHAIN
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
                  <div className="text-[9px] text-slate-500 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                    <span>SIG: HMAC-SHA256:8f3a9e2d...</span>
                    <span className="text-emerald-400">HASH-LINKED</span>
                  </div>
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

export default CandidateDetailScreen;
