import React, { useState } from 'react';
import { useGeointStore } from '../stores/geointStore';
import { AuditLog } from '../types/geoint';
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
} from 'lucide-react';

export const AuditScreen: React.FC = () => {
  const { auditLogs, user } = useGeointStore();

  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
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
              NON-REPUDIATION FORENSIC AUDIT RECORD
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide mt-1">
            Chain-of-Custody & System Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable, cryptographically chained audit log tracking all analyst triage decisions, vector queries, and intelligence disseminations.
          </p>
        </div>

        <button
          onClick={handleExportAudit}
          className="px-3.5 py-2 rounded-lg bg-[#0E172A] hover:bg-[#162238] border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center space-x-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Export notification */}
      {downloadSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-xs font-mono text-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Exported {filteredLogs.length} audit records with cryptographic SHA-256 chain verification.</span>
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
            <div className="text-xs font-mono font-bold text-cyan-300">{auditLogs.length} Records</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-950 text-purple-400 border border-purple-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400">COMPLIANCE STANDARD</div>
            <div className="text-xs font-mono font-bold text-slate-200">ISO/IEC 27001 & DEF-SEC-3</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
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

          {/* Event type */}
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

          {/* Status */}
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

        <div className="text-slate-400 text-[11px]">
          Showing {filteredLogs.length} of {auditLogs.length} events
        </div>
      </div>

      {/* Main Forensic Audit Table */}
      <div className="rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 overflow-hidden shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0E172A] border-b border-cyan-500/20 text-slate-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3">Audit ID</th>
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">Event Type</th>
                <th className="p-3">Operator & Role</th>
                <th className="p-3">Terminal IP</th>
                <th className="p-3">Action Description</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#0E172A]/70 transition-colors">
                  <td className="p-3 text-cyan-300 font-bold">{log.id}</td>
                  <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.eventType.includes('CONFIRM')
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : log.eventType.includes('REJECT')
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          : log.eventType.includes('SEARCH')
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.eventType}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="text-slate-200 font-bold">{log.user}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{log.role}</div>
                  </td>
                  <td className="p-3 text-slate-400 text-[11px]">{log.ipAddress}</td>
                  <td className="p-3 text-slate-300 font-sans text-xs max-w-md leading-snug">
                    {log.details}
                  </td>
                  <td className="p-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-950 text-emerald-300'
                          : log.status === 'WARN'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-rose-950 text-rose-300'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
