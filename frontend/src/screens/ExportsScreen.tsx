import React, { useState } from 'react';
import { useGeointStore } from '../stores/geointStore';
import { ExportPackage } from '../types/geoint';
import {
  Download,
  FileText,
  FileCode,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Trash2,
  ExternalLink,
  Plus,
  Lock,
} from 'lucide-react';

export const ExportsScreen: React.FC = () => {
  const { exports, aois, createExport } = useGeointStore();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportPackage['format']>('GeoJSON');
  const [selectedAoi, setSelectedAoi] = useState<string>('All Active AOIs (National)');
  const [exportTitle, setExportTitle] = useState('');
  const [downloadAlert, setDownloadAlert] = useState<string | null>(null);

  const handleCreatePackage = async () => {
    const title =
      exportTitle.trim() ||
      `${selectedAoi.split('&')[0].trim()} Change Intelligence Package`;

    try {
      await createExport(title, selectedFormat, selectedAoi);
      setIsExportModalOpen(false);
      setExportTitle('');
      setDownloadAlert('Export package generated from live backend records.');
    } catch (error) {
      setDownloadAlert(error instanceof Error ? `Export failed: ${error.message}` : 'Export failed.');
    }
  };

  const handleDownload = (pkg: ExportPackage) => {
    window.location.assign(pkg.downloadUrl);
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-5 overflow-y-auto">
      {/* Title & Classification Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">
              <Download className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 tracking-wider font-semibold">
              BACKEND-GENERATED DATA PRODUCTS
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide mt-1">
            Intelligence Dissemination & Export Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate downloadable packages from live candidate and scene records.
          </p>
        </div>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-glow-sm flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Export</span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-300">
        <div className="flex items-center space-x-2">
          <Lock className="w-4 h-4 text-cyan-400" />
          <span>EXPORT SOURCE: CONNECTED RENDER DATASET</span>
        </div>
        <span className="text-[10px] text-slate-400">Formats reflect available source records</span>
      </div>

      {/* Download Alert Toast */}
      {downloadAlert && (
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-950/90 border border-emerald-400/50 text-xs font-mono text-emerald-200 shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{downloadAlert}</span>
          </div>
          <span className="text-[10px] text-emerald-300 uppercase">BACKEND</span>
        </div>
      )}

      {/* Package Formats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            title: 'GeoJSON Vector Layers',
            desc: 'Polygons, centroid coordinates, and temporal metadata attributes for GIS.',
            format: 'GeoJSON',
            badge: 'OGC Standard',
          },
          {
            title: 'Analyst CSV',
            desc: 'Tabular attributes from the selected live candidates.',
            format: 'Analyst CSV',
            badge: 'SOURCE ATTRIBUTES',
          },
          {
            title: 'STAC Catalog Archives',
            desc: 'JSON spatio-temporal catalog with assets and footprint geometry.',
            format: 'STAC Item Catalog',
            badge: 'STAC v1.0.0',
          },
          {
            title: 'Intelligence Dossier',
            desc: 'Formally formatted operational military report with spectral evidence figures.',
            format: 'Intelligence Dossier (PDF/HTML)',
            badge: 'DEFENCE READY',
          },
        ].map((fmt, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-2 hover:border-cyan-400/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300">
                {fmt.badge}
              </span>
              <FileCode className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-white leading-snug">
              {fmt.title}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {fmt.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Export Packages Table */}
      <div className="rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 overflow-hidden shadow-panel">
        <div className="p-3.5 border-b border-cyan-500/20 flex items-center justify-between text-xs font-mono text-slate-300 bg-[#0E172A]">
          <span className="font-bold text-cyan-400">READY INTELLIGENCE PACKAGES ({exports.length})</span>
          <span className="text-slate-500">FORMATS: GEOJSON, CSV, STAC, HTML DOSSIER</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#0E172A]/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3">Package ID & Title</th>
                <th className="p-3">Format</th>
                <th className="p-3">Surveillance Sector</th>
                <th className="p-3">Anomalies</th>
                <th className="p-3">File Size</th>
                <th className="p-3">Created Date</th>
                <th className="p-3">Author</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {exports.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-[#0E172A]/70 transition-colors">
                  <td className="p-3">
                    <div className="text-cyan-300 font-bold">{pkg.id}</div>
                    <div className="text-slate-200 font-sans font-medium mt-0.5 line-clamp-1 max-w-sm">
                      {pkg.title}
                    </div>
                  </td>

                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                      {pkg.format}
                    </span>
                  </td>

                  <td className="p-3 text-slate-300 truncate max-w-[200px]">
                    {pkg.aoi}
                  </td>

                  <td className="p-3 text-amber-300 font-bold">
                    {pkg.candidateCount}
                  </td>

                  <td className="p-3 text-cyan-400 font-bold">
                    {pkg.fileSize}
                  </td>

                  <td className="p-3 text-slate-400 text-[11px]">
                    {pkg.createdDate}
                  </td>

                  <td className="p-3 text-slate-400">
                    {pkg.exportedBy}
                  </td>

                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDownload(pkg)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium inline-flex items-center space-x-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Custom Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B1120] border border-cyan-500/40 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                Create Intelligence Export Package
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  Package Custom Title:
                </label>
                <input
                  type="text"
                  placeholder="e.g., Hinjawadi Corridor Weekly Change Vectors"
                  value={exportTitle}
                  onChange={(e) => setExportTitle(e.target.value)}
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  Target Sector:
                </label>
                <select
                  value={selectedAoi}
                  onChange={(e) => setSelectedAoi(e.target.value)}
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="All Active AOIs (National)">All Active AOIs (National)</option>
                  {aois.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  Export Format:
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as any)}
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="GeoJSON">GeoJSON Vector Polygons (with Attributes)</option>
                  <option value="Analyst CSV">Analyst CSV</option>
                  <option value="STAC Item Catalog">STAC Item Catalog (JSON)</option>
                  <option value="Intelligence Dossier (PDF/HTML)">Classified Intelligence Dossier (PDF/HTML)</option>
                </select>
              </div>

              <div className="p-2.5 rounded bg-[#070B14] border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                <div className="text-cyan-400 font-bold">CLASSIFICATION SPEC:</div>
                <div>Datum: WGS-84 / UTM Projection 43N</div>
                <div>Payload Encryption: AES-256-GCM Hardware Token Key</div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#0E172A] text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>

              <button
                onClick={handleCreatePackage}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono shadow-glow-sm"
              >
                Generate Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
