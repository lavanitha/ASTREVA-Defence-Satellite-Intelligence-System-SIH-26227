import React, { useState } from 'react';
import { useGeointStore } from '../stores/geointStore';
import { ChangeCandidate, CandidateStatus } from '../types/geoint';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  Eye,
  Download,
  ShieldCheck,
  Layers,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const ReviewQueueScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    candidates,
    aois,
    setCandidateStatus,
    selectCandidate,
    createExport,
    addAuditLog,
  } = useGeointStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'rejected' | 'all'>('pending');
  const [selectedAoi, setSelectedAoi] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quickInspectCandidate, setQuickInspectCandidate] = useState<ChangeCandidate | null>(null);
  const [triageNote, setTriageNote] = useState('');

  // Counts for tabs
  const pendingCount = candidates.filter((c) => c.status === 'pending').length;
  const confirmedCount = candidates.filter((c) => c.status === 'confirmed').length;
  const rejectedCount = candidates.filter((c) => c.status === 'rejected').length;

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    if (activeTab === 'pending' && c.status !== 'pending') return false;
    if (activeTab === 'confirmed' && c.status !== 'confirmed') return false;
    if (activeTab === 'rejected' && c.status !== 'rejected') return false;

    if (selectedAoi !== 'ALL' && c.aoiId !== selectedAoi) return false;
    if (selectedType !== 'ALL' && c.changeType !== selectedType) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.locationName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Bulk actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredCandidates.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchStatus = (status: CandidateStatus) => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => {
      setCandidateStatus(id, status, `Batch action applied to ${selectedIds.length} candidates.`);
    });
    setSelectedIds([]);
  };

  const handleBatchExport = () => {
    if (selectedIds.length === 0) return;
    void createExport(
      `Batch Verified Candidates Export (${selectedIds.length} Items)`,
      'GeoJSON',
      'All Active AOIs (National)',
      selectedIds
    ).then(() => navigate('/exports'));
  };

  const executeQuickTriage = (status: CandidateStatus) => {
    if (!quickInspectCandidate) return;
    setCandidateStatus(quickInspectCandidate.id, status, triageNote || undefined);
    setQuickInspectCandidate(null);
    setTriageNote('');
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-5 overflow-y-auto">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">
              <CheckSquare className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 tracking-wider font-semibold">
              OFFLINE DEFENCE ENCLAVE TRIAGE
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide mt-1">
            Analyst Review & Verification Queue
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-sensor change candidate verification, false-alarm mitigation, and formal intelligence sign-off.
          </p>
        </div>

        {/* Tab Badges */}
        <div className="flex items-center p-1 rounded-lg bg-[#0B1120] border border-cyan-500/30 text-xs font-mono">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-2 transition-colors ${
              activeTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Pending Review</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[10px]">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('confirmed')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-2 transition-colors ${
              activeTab === 'confirmed'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Confirmed</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px]">
              {confirmedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-2 transition-colors ${
              activeTab === 'rejected'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>False Alarms</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-200 text-[10px]">
              {rejectedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>All ({candidates.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Bulk Action Toolbar */}
      <div className="p-3.5 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filters & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#070B14] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-52"
            />
          </div>

          {/* Sector filter */}
          <select
            value={selectedAoi}
            onChange={(e) => setSelectedAoi(e.target.value)}
            className="bg-[#070B14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Sectors</option>
            {aois.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Change Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#070B14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Types</option>
            <option value="Construction">Construction</option>
            <option value="Road Development">Road Development</option>
            <option value="Land Clearing">Land Clearing</option>
            <option value="Water Change">Water Change</option>
            <option value="Agriculture Change">Agriculture Change</option>
          </select>
        </div>

        {/* Right: Bulk Action buttons */}
        <div className="flex items-center space-x-2">
          {selectedIds.length > 0 && (
            <>
              <span className="text-xs font-mono text-cyan-300 font-bold mr-1">
                {selectedIds.length} SELECTED:
              </span>
              <button
                onClick={() => handleBatchStatus('confirmed')}
                className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-medium flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm All</span>
              </button>
              <button
                onClick={() => handleBatchStatus('rejected')}
                className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-mono font-medium flex items-center space-x-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject All</span>
              </button>
              <button
                onClick={handleBatchExport}
                className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export GeoJSON</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Review Queue Table */}
      <div className="rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 overflow-hidden shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#0E172A] border-b border-cyan-500/20 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredCandidates.length > 0 &&
                      selectedIds.length === filteredCandidates.length
                    }
                    onChange={handleSelectAll}
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                </th>
                <th className="p-3">ID & Classification</th>
                <th className="p-3">Sector & Coordinates</th>
                <th className="p-3">Area (ha)</th>
                <th className="p-3">AI Confidence</th>
                <th className="p-3">Detection Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    No candidates found for selected queue criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => {
                  const isChecked = selectedIds.includes(cand.id);
                  return (
                    <tr
                      key={cand.id}
                      className={`hover:bg-[#0E172A]/70 transition-colors ${
                        isChecked ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(cand.id)}
                          className="accent-cyan-400 rounded cursor-pointer"
                        />
                      </td>

                      {/* ID & Title */}
                      <td className="p-3">
                        <div className="font-mono font-bold text-cyan-300">
                          {cand.id}
                        </div>
                        <div className="font-medium text-slate-200 mt-0.5 line-clamp-1 max-w-[280px]">
                          {cand.title}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {cand.changeType} • {cand.sensors.join(', ')}
                        </div>
                      </td>

                      {/* Sector */}
                      <td className="p-3 font-mono text-[11px]">
                        <div className="text-slate-200 truncate max-w-[180px]">
                          {cand.aoiName}
                        </div>
                        <div className="text-slate-500">
                          {cand.coordinates[0].toFixed(3)}°N, {cand.coordinates[1].toFixed(3)}°E
                        </div>
                      </td>

                      {/* Area */}
                      <td className="p-3 font-mono text-amber-300 font-semibold">
                        {cand.areaHectares === null ? 'Not measured' : `${cand.areaHectares} ha`}
                      </td>

                      {/* Confidence Meter */}
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-cyan-400 font-bold w-10">
                            {cand.confidence}%
                          </span>
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-cyan-400 h-full rounded-full"
                              style={{ width: `${cand.confidence}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Detection Date */}
                      <td className="p-3 font-mono text-slate-400 text-[11px]">
                        {cand.detectionDate}
                      </td>

                      {/* Status */}
                      <td className="p-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            cand.status === 'confirmed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : cand.status === 'rejected'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {cand.status}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setQuickInspectCandidate(cand)}
                            title="Quick Triage Modal"
                            className="p-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              selectCandidate(cand.id);
                              navigate('/change-analysis');
                            }}
                            title="Deep Evidence Inspector"
                            className="p-1.5 rounded bg-[#0E172A] hover:bg-[#162238] text-slate-200 border border-slate-700"
                          >
                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          </button>

                          <button
                            onClick={() => navigate(`/candidate/${cand.id}`)}
                            title="Classified Intelligence Dossier"
                            className="p-1.5 rounded bg-[#0E172A] hover:bg-[#162238] text-slate-200 border border-slate-700"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Triage Modal Dialog */}
      {quickInspectCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0B1120] border border-cyan-500/40 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                  RAPID ANALYST TRIAGE
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {quickInspectCandidate.id}: {quickInspectCandidate.title}
                </h3>
              </div>
              <button
                onClick={() => setQuickInspectCandidate(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Thumbnail visual */}
            <div className="grid grid-cols-2 gap-3 aspect-video">
              <div className="relative rounded overflow-hidden border border-slate-800">
                <img
                  src={quickInspectCandidate.thumbnails.beforeRGB}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-cyan-300">
                  BASELINE: {quickInspectCandidate.beforeDate}
                </div>
              </div>

              <div className="relative rounded overflow-hidden border border-cyan-500/40">
                <img
                  src={quickInspectCandidate.thumbnails.afterRGB}
                  alt="After"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-cyan-950/80 text-[10px] font-mono text-cyan-300 border border-cyan-500/40">
                  CURRENT: {quickInspectCandidate.afterDate}
                </div>
              </div>
            </div>

            {/* Key factors */}
            <div className="p-2.5 rounded bg-[#070B14] border border-slate-800 text-xs font-mono space-y-1">
              <div><span className="text-slate-400">Sector:</span> {quickInspectCandidate.aoiName}</div>
              <div><span className="text-slate-400">Area:</span> {quickInspectCandidate.areaHectares === null ? 'Not measured' : `${quickInspectCandidate.areaHectares} ha`} | <span className="text-slate-400">Confidence:</span> {quickInspectCandidate.confidence}%</div>
              <div><span className="text-slate-400">False Alarm Risk:</span> {quickInspectCandidate.falseAlarmRisk.riskLevel} (Seasonality: {quickInspectCandidate.falseAlarmRisk.seasonalAnomaly ? 'Yes' : 'No'})</div>
            </div>

            {/* Reason / Note input */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Triage Justification / Reason:
              </label>
              <input
                type="text"
                placeholder="Optional explanation for confirmation or rejection..."
                value={triageNote}
                onChange={(e) => setTriageNote(e.target.value)}
                className="w-full bg-[#070B14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setQuickInspectCandidate(null)}
                className="px-4 py-2 rounded-lg bg-[#0E172A] hover:bg-[#162238] text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>

              <button
                onClick={() => executeQuickTriage('rejected')}
                className="px-4 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold flex items-center space-x-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Mark False Alarm</span>
              </button>

              <button
                onClick={() => executeQuickTriage('confirmed')}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-glow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Intelligence</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
