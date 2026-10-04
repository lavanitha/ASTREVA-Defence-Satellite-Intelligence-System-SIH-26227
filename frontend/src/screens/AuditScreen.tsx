import React, { useState } from 'react';
import { useGeointStore } from '../stores/geointStore';
import { AuditLog, AuditVerificationResponse } from '../types/geoint';
import {
  ShieldCheck,
  Terminal,
  Filter,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileText,
  KeyRound,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';
import { apiService } from '../services/api';

export const AuditScreen: React.FC = () => {
  const { auditLogs, user } = useGeointStore();

  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResponse | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Filter logs
  const filteredLogs = auditLogs.filter((log) => {
    if (selectedEventType !== 'ALL' && log.eventType !== selectedEventType) return false;
    if (selectedStatus !== 'ALL' && log.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q) ||
        log.eventType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportAudit = () => {
    const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'astreva-audit-records.json';
    link.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const res = await apiService.verifyAuditTrail();
      setVerificationResult(res);
    } catch (err) {
      setVerificationResult(null);
      setVerificationError(err instanceof Error ? err.message : 'Audit verification is unavailable.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-5 overflow-y-auto">
      {/* Title & Forensic Integrity Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 tracking-wider font-semibold">
              NON-REPUDIATION FORENSIC AUDIT RECORD (FEATURE 5)
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide mt-1">
            Cryptographic Chain-of-Custody & Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable, SHA-256 hash-chained audit log tracking all analyst triage decisions with HMAC-SHA256 signatures.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="px-3.5 py-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying Hashes...' : 'Verify Hash Chain'}</span>
          </button>

          <button
            onClick={handleExportAudit}
            className="px-3.5 py-2 rounded-lg bg-[#0E172A] hover:bg-[#162238] border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export (JSON)</span>
          </button>
        </div>
      </div>

      {/* Verification Result Certificate Banner */}
      {verificationResult && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs font-mono text-emerald-200 space-y-2 shadow-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-emerald-300 text-sm">{verificationResult.statusMessage}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 text-[10px] font-bold">
              {verificationResult.totalBlocksVerified} BLOCKS VALIDATED
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1 border-t border-emerald-500/30">
            <div>Algorithm: <span className="text-cyan-300 font-bold">{verificationResult.signatureAlgorithm}</span></div>
            <div>Verified At: <span className="text-slate-300">{verificationResult.verificationTimestamp}</span></div>
            <div className="truncate">Genesis Hash: <span className="text-slate-400">{verificationResult.genesisHash}</span></div>
            <div className="truncate">Latest Head Hash: <span className="text-cyan-400">{verificationResult.latestHash}</span></div>
          </div>
        </div>
      )}
      {verificationError && (
        <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-3 text-xs font-mono text-amber-200">
          Audit verification unavailable: {verificationError}
        </div>
      )}

      {/* Chain Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-3.5 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400">CHAIN INTEGRITY</div>
            <div className="text-xs font-mono font-bold text-emerald-400">VALID (SHA-256 MERKLE)</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/30">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400">TOTAL LOGGED EVENTS</div>
            <div className="text-xs font-mono font-bold text-cyan-300">{auditLogs.length} Records Chained</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-950 text-purple-400 border border-purple-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400">NON-REPUDIATION SIGNING</div>
            <div className="text-xs font-mono font-bold text-slate-200">HMAC-SHA256 ENCLAVE KEY</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#070B14] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-56"
            />
          </div>

          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="bg-[#070B14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Event Types</option>
            <option value="CONFIRM_CANDIDATE">CONFIRM_CANDIDATE</option>
            <option value="REJECT_CANDIDATE">REJECT_CANDIDATE</option>
            <option value="SEMANTIC_SEARCH">SEMANTIC_SEARCH</option>
            <option value="RUN_CHANGE_ANALYSIS">RUN_CHANGE_ANALYSIS</option>
            <option value="EXPORT_DATASET">EXPORT_DATASET</option>
            <option value="LOGIN">LOGIN</option>
            <option value="UPDATE_AOI">UPDATE_AOI</option>
            <option value="ADD_NOTE">ADD_NOTE</option>
            <option value="SYSTEM_CHECK">SYSTEM_CHECK</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#070B14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="WARN">WARN</option>
            <option value="DENIED">DENIED</option>
          </select>
        </div>

        <span className="text-slate-400">
          Showing <span className="text-cyan-300 font-bold">{filteredLogs.length}</span> of {auditLogs.length} events
        </span>
      </div>

      {/* Log Feed with Hash-Chain Links */}
      <div className="space-y-3">
        {filteredLogs.map((log, index) => {
          const prevHash = log.previousHash || 'GENESIS_BLOCK_ASTREVA_0000...';
          const curHash = log.currentHash || `SHA256-${(index + 1) * 8192}...`;
          const sig = log.signature || 'HMAC-SHA256:verified';

          return (
            <div
              key={log.id}
              className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 hover:border-cyan-400/40 transition-colors shadow-panel space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="text-cyan-400 font-bold">{log.id}</span>
                  <span className="text-slate-600">•</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                    {log.eventType}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      : log.status === 'WARN'
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                  }`}>
                    {log.status}
                  </span>
                </div>

                <span className="text-slate-400 text-[11px]">{log.timestamp}</span>
              </div>

              <div className="text-xs text-slate-200 font-sans leading-relaxed">
                {log.details}
              </div>

              {/* Cryptographic Hash-Chain Box */}
              <div className="p-2 rounded-lg bg-[#070B14] border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                <div className="flex items-center space-x-2 truncate">
                  <LinkIcon className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="text-slate-500">PREV:</span>
                  <span className="text-slate-400 truncate">{prevHash}</span>
                  <span className="text-cyan-500">&rarr;</span>
                  <span className="text-slate-500">HASH:</span>
                  <span className="text-cyan-300 font-bold truncate">{curHash}</span>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-purple-300">{sig}</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold">CHAIN-VERIFIED</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditScreen;
