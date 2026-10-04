import React, { useState } from 'react';
import { useGeointStore } from '../stores/geointStore';
import { SceneRecord } from '../types/geoint';
import { apiService } from '../services/api';
import {
  Database,
  Search,
  Filter,
  Layers,
  Calendar,
  Cloud,
  HardDrive,
  Download,
  Eye,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  UploadCloud,
  ChevronDown,
} from 'lucide-react';

export const ScenesScreen: React.FC = () => {
  const { scenes, aois } = useGeointStore();

  const [selectedSensor, setSelectedSensor] = useState<string>('ALL');
  const [selectedAoi, setSelectedAoi] = useState<string>('ALL');
  const [maxCloudCover, setMaxCloudCover] = useState<number>(20);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStacScene, setSelectedStacScene] = useState<SceneRecord | null>(null);
  const [stacRecord, setStacRecord] = useState<unknown>(null);
  const [stacError, setStacError] = useState<string | null>(null);
  const [isLoadingStac, setIsLoadingStac] = useState(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [ingestSceneName, setIngestSceneName] = useState('');
  const [ingestAcquisitionDate, setIngestAcquisitionDate] = useState('');
  const [ingestLatitude, setIngestLatitude] = useState('');
  const [ingestLongitude, setIngestLongitude] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // Filter scenes
  const filteredScenes = scenes.filter((scene) => {
    if (selectedSensor !== 'ALL' && !scene.sensor.includes(selectedSensor)) return false;
    if (selectedAoi !== 'ALL' && !scene.aoiName.includes(selectedAoi)) return false;
    if (scene.cloudCover !== null && scene.cloudCover > maxCloudCover) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        scene.id.toLowerCase().includes(q) ||
        scene.aoiName.toLowerCase().includes(q) ||
        scene.stacItemId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const [measuredLatency, setMeasuredLatency] = useState<number | null>(null);

  const handleIngest = async () => {
    if (!ingestSceneName.trim() || !ingestAcquisitionDate || !ingestLatitude || !ingestLongitude) {
      setIngestError('Enter a source TIFF filename, acquisition date, and scene coordinates.');
      return;
    }
    setIsIngesting(true);
    setIngestError(null);
    try {
      const res = await apiService.ingestSceneIncremental({
        scene_name: ingestSceneName.trim(),
        sensor: 'Sentinel-2 Optical',
        acquisition_date: ingestAcquisitionDate,
        lat: Number(ingestLatitude),
        lon: Number(ingestLongitude),
      });
      setMeasuredLatency(res.ingestion_time_ms);
      setIsIngestModalOpen(false);
    } catch (error) {
      setIngestError(error instanceof Error ? error.message : 'Scene ingestion failed.');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleOpenStac = async (scene: SceneRecord) => {
    setSelectedStacScene(scene);
    setStacRecord(null);
    setStacError(null);
    setIsLoadingStac(true);
    try {
      setStacRecord(await apiService.getStacItem(scene.stacItemId));
    } catch (error) {
      setStacError(error instanceof Error ? error.message : 'STAC record is unavailable.');
    } finally {
      setIsLoadingStac(false);
    }
  };

  const acquisitionDates = [...new Set(scenes.map((scene) => scene.acquisitionDate))].sort();
  const checksumCount = scenes.filter((scene) => scene.checksum).length;

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-5 overflow-y-auto">
      {/* Title & Metadata Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">
              <Database className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 tracking-wider font-semibold">
              LOCAL STAC SPECIFICATION V1.0.0 REPOSITORY
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide mt-1">
            Scene Archive & STAC Spatio-Temporal Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Air-gapped satellite imagery granules with cryptographic checksums, multispectral bands, and radar backscatter assets.
          </p>
        </div>

        <button
          onClick={() => setIsIngestModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-glow-sm flex items-center space-x-1.5"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Ingest New STAC Scene</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">INDEXED SCENES</span>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {scenes.length} Granules
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Sentinel-2 512x512 GeoTIFF Chips</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">SURVEILLANCE EPOCHS</span>
          <div className="text-2xl font-bold font-mono text-white">6 Temporal Passes</div>
          <p className="text-[11px] text-slate-400 font-mono">2020 to 2024 Multi-Temporal</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">CHECKSUM METADATA</span>
          <div className="text-2xl font-bold font-mono text-cyan-300">{checksumCount} / {scenes.length}</div>
          <p className="text-[11px] text-slate-400 font-mono">Catalogue records with stored checksums</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">OPTICAL CLOUD / NODATA</span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {scenes.some((scene) => scene.cloudCover !== null)
              ? `${(scenes.reduce((total, scene) => total + (scene.cloudCover ?? 0), 0) / scenes.filter((scene) => scene.cloudCover !== null).length).toFixed(1)}% Avg`
              : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Real Catalogue Quality Metric</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Search */}
        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">SEARCH GRANULE / ID</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search scene ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070B14] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Sensor */}
        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">SENSOR CONSTELLATION</label>
          <select
            value={selectedSensor}
            onChange={(e) => setSelectedSensor(e.target.value)}
            className="w-full bg-[#070B14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Sensors (Optical + SAR)</option>
            <option value="Sentinel-2">Sentinel-2 (MSI Optical L2A)</option>
            <option value="Sentinel-1">Sentinel-1 (SAR GRD C-Band)</option>
            <option value="Landsat">Landsat-8/9</option>
          </select>
        </div>

        {/* Sector */}
        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">SURVEILLANCE SECTOR</label>
          <select
            value={selectedAoi}
            onChange={(e) => setSelectedAoi(e.target.value)}
            className="w-full bg-[#070B14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Sectors</option>
            {aois.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Max Cloud Cover */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
            <span className="text-slate-400">MAX CLOUD COVER</span>
            <span className="text-cyan-400 font-bold">&le; {maxCloudCover}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={maxCloudCover}
            onChange={(e) => setMaxCloudCover(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Scene Records List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span>MATCHING SCENES: <span className="text-cyan-300 font-bold">{filteredScenes.length}</span></span>
          <span>STAC CONFORMANCE: PROJECTION • EO • SAR EXTENSIONS</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filteredScenes.map((scene) => (
            <div
              key={scene.id}
              className="p-4 rounded-xl bg-[#0B1120]/95 border border-cyan-500/20 hover:border-cyan-400/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-panel"
            >
              {/* Scene Specs */}
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      scene.sensor.includes('Sentinel-1')
                        ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                        : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {scene.sensor}
                  </span>

                  <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                    {scene.processingState}
                  </span>

                  <span className="text-xs font-mono text-slate-400">
                    GSD: {scene.resolutionMeters === null ? 'N/A' : `${scene.resolutionMeters}m`}
                  </span>
                </div>

                <div className="font-mono text-xs font-bold text-white break-all">
                  {scene.id}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-400">
                  <span>SECTOR: <span className="text-slate-200">{scene.aoiName}</span></span>
                  <span>ACQUISITION: <span className="text-cyan-300">{scene.acquisitionDate}</span></span>
                  <span>CLOUD COVER: <span className={scene.cloudCover === null ? 'text-slate-400' : scene.cloudCover > 10 ? 'text-amber-400' : 'text-emerald-400'}>{scene.cloudCover === null ? 'N/A' : `${scene.cloudCover}%`}</span></span>
                </div>

                <div className="text-[10px] font-mono text-slate-500 truncate max-w-xl">
                  CHECKSUM: {scene.checksum}
                </div>
              </div>

              {/* Actions & Size */}
              <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                <div className="text-right mr-2 hidden lg:block font-mono text-[11px]">
                  <span className="text-slate-400 block">FILE SIZE</span>
                  <span className="text-cyan-300 font-bold">
                    {(scene.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>

                <button
                  onClick={() => void handleOpenStac(scene)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>STAC JSON</span>
                </button>

                {scene.tile_file && (
                  <a
                    href={apiService.getTileDownloadUrl(scene.tile_file)}
                    download={scene.tile_file}
                    className="px-3 py-1.5 rounded-lg bg-[#0E172A] hover:bg-[#162238] text-slate-200 border border-slate-700 text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Download Source TIFF</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STAC Metadata Viewer Modal */}
      {selectedStacScene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-[#0B1120] border border-cyan-500/40 rounded-xl shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                  STAC ITEM SPECIFICATION (JSON)
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {selectedStacScene.stacItemId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStacScene(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Formatted Code View */}
            <pre className="flex-1 bg-[#070B14] p-4 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-y-auto leading-relaxed">
              {isLoadingStac
                ? 'Loading STAC item from backend...'
                : stacError
                  ? `STAC item unavailable: ${stacError}`
                  : JSON.stringify(stacRecord, null, 2)}
            </pre>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedStacScene(null)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingest STAC Scene Modal */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B1120] border border-cyan-500/40 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                Ingest New Satellite Granule / STAC Scene
              </h3>
              <button
                onClick={() => setIsIngestModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  Target Surveillance Sector:
                </label>
                <input
                  type="text"
                  value={ingestSceneName}
                  onChange={(event) => setIngestSceneName(event.target.value)}
                  placeholder="Existing TIFF filename on the backend"
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Acquisition date:</label>
                <input type="date" value={ingestAcquisitionDate} onChange={(event) => setIngestAcquisitionDate(event.target.value)} className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-[10px] font-mono text-slate-400">Latitude
                  <input type="number" value={ingestLatitude} onChange={(event) => setIngestLatitude(event.target.value)} className="mt-1 w-full bg-[#070B14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200" />
                </label>
                <label className="text-[10px] font-mono text-slate-400">Longitude
                  <input type="number" value={ingestLongitude} onChange={(event) => setIngestLongitude(event.target.value)} className="mt-1 w-full bg-[#070B14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200" />
                </label>
              </div>

              {measuredLatency !== null && (
                <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-xs font-mono text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Backend ingestion completed in <strong>{measuredLatency} ms</strong>.</span>
                </div>
              )}
              {ingestError && <p role="alert" className="text-xs text-rose-300">Ingestion failed: {ingestError}</p>}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsIngestModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#0E172A] text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleIngest()}
                disabled={isIngesting}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono"
              >
                {isIngesting ? 'Ingesting...' : 'Run Backend Ingest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
