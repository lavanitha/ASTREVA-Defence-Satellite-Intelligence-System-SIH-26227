import React, { useState } from 'react';
import { useGeointStore } from '../stores/geointStore';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Zap,
  Filter,
  RefreshCw,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { apiService } from '../services/api';

const SUGGESTIONS = [
  'New construction near river embankment',
  'Dense urban buildings and paved roads',
  'River water channel and sandbars',
  'Step terraced open cast pit excavation',
  'Agricultural fields and green vegetation',
  'Road expansion and highway corridors',
];

export const SearchScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    candidates,
    aois,
    scenes,
    searchHistory,
    addSearchHistory,
    selectCandidate,
    addAuditLog,
  } = useGeointStore();

  const [query, setQuery] = useState('');
  const [selectedSensor, setSelectedSensor] = useState<string>('ALL');
  const [selectedChangeType, setSelectedChangeType] = useState<string>('ALL');
  const [selectedAoi, setSelectedAoi] = useState<string>('ALL');
  const [searchMode, setSearchMode] = useState<'text' | 'image'>('text');
  const [selectedImagePatch, setSelectedImagePatch] = useState<string>('construction');
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [vectorSearchResults, setVectorSearchResults] = useState<any[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const executeSearch = async (searchStr: string) => {
    if (!searchStr && searchMode === 'text') return;
    setIsSearching(true);
    setSearchError(null);
    setVectorSearchResults([]); // Clear previous results immediately
    setLastSearchedQuery(searchStr);
    addSearchHistory(searchStr || (searchMode === 'image' ? `Patch: ${selectedImagePatch}` : 'Archive Search'));
    addAuditLog('SEMANTIC_SEARCH', `Executed OpenCLIP vector search: "${searchStr}"`, 'SUCCESS');

    try {
      let patchTile = 'ranchi_2021_06_tile_0_0.tif';
      if (selectedImagePatch === 'road') patchTile = 'ranchi_2021_06_tile_0_4.tif';
      else if (selectedImagePatch === 'river') patchTile = 'ranchi_2021_06_tile_1_5.tif';
      else if (selectedImagePatch === 'clearing') patchTile = 'ranchi_2021_06_tile_4_2.tif';

      const res = await apiService.searchTiles({
        query: searchMode === 'text' ? (searchStr || undefined) : undefined,
        image_tile: searchMode === 'image' ? patchTile : undefined,
        top_k: 12,
        change_type: selectedChangeType !== 'ALL' ? selectedChangeType : undefined,
        sensor: selectedSensor !== 'ALL' ? selectedSensor : undefined,
        aoi_id: selectedAoi !== 'ALL' ? selectedAoi : undefined,
      });

      // Filter only relevant vector search hits (top matches above relevance threshold)
      const rawResults = res.results || [];
      const relevantResults = rawResults.filter((r: any) => (r.score ?? 0) >= 0.22);
      // If none above strict 0.22, keep top 4 highest scoring matches if available
      const finalResults = relevantResults.length > 0 ? relevantResults : rawResults.slice(0, 4);

      setVectorSearchResults(finalResults);
    } catch (err) {
      console.warn('Vector search error:', err);
      setVectorSearchResults([]);
      setSearchError(err instanceof Error ? err.message : 'Semantic search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeSearch(query);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setLastSearchedQuery('');
    setVectorSearchResults(null);
    setSelectedAoi('ALL');
    setSelectedChangeType('ALL');
    setSelectedSensor('ALL');
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-5 overflow-y-auto">
      {/* Screen Title & AI Semantic Capability Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#7E9F71]/20 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-[#556E4A]/20 text-[#A3BF99]">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-[#A3BF99] tracking-wider font-semibold">
              OPENCLIP VIT-B/32 TEXT EMBEDDING (512-DIM) + EXISTING FAISS INDEX
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide mt-1">
            Semantic Satellite Imagery Retrieval
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Query satellite archives using natural language prompts or multi-spectral image patch embeddings across {scenes.length} indexed granules.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg bg-[#0B1120] border border-[#7E9F71]/30 text-xs font-mono">
            <button
              onClick={() => setSearchMode('text')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors ${
                searchMode === 'text'
                  ? 'bg-[#556E4A]/30 text-[#A3BF99] font-bold border border-[#7E9F71]/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Prompt Search</span>
            </button>
            <button
              onClick={() => setSearchMode('image')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors ${
                searchMode === 'image'
                  ? 'bg-[#556E4A]/30 text-[#A3BF99] font-bold border border-[#7E9F71]/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Query By Patch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Search Bar & Query Input Container */}
      <div className="p-4 rounded-xl bg-[#0B1120]/95 border border-[#7E9F71]/25 shadow-panel space-y-4">
        {searchMode === 'text' ? (
          <div>
            <div className="relative">
              <Search className="w-5 h-5 text-[#A3BF99] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe satellite anomaly (e.g., 'new construction near river embankment', 'dense urban buildings and paved roads')..."
                className="w-full bg-[#070B14] border border-[#7E9F71]/30 rounded-xl pl-11 pr-32 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#7E9F71] focus:ring-1 focus:ring-[#7E9F71] transition-all font-sans shadow-inner"
              />
              <button
                onClick={() => executeSearch(query)}
                disabled={isSearching || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-[#556E4A] hover:bg-[#658459] text-white font-bold text-xs tracking-wide transition-all shadow-md disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{isSearching ? 'Embedding...' : 'Vector Search'}</span>
              </button>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span className="text-[11px] font-mono text-slate-500 mr-1">TESTED PROMPTS:</span>
              {SUGGESTIONS.map((sugg, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(sugg);
                    executeSearch(sugg);
                  }}
                  className="px-2.5 py-1 rounded bg-[#0E172A] hover:bg-[#24331F] text-[11px] font-sans text-slate-300 hover:text-[#A3BF99] border border-slate-800 hover:border-[#7E9F71]/40 transition-colors"
                >
                  "{sugg}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Image Patch Query Mode */
          <div className="space-y-3">
            <div className="text-xs font-mono text-[#A3BF99] font-semibold">
              SELECT REFERENCE ANOMALY TEMPLATE:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'construction', label: 'Concrete Foundation Pad', type: 'Construction' },
                { id: 'road', label: 'Linear Paved Highway Corridors', type: 'Road Development' },
                { id: 'river', label: 'Riverbed Silt & Channel Shift', type: 'Water Change' },
                { id: 'clearing', label: 'Step-Terraced Open Cast Pit', type: 'Land Clearing' },
              ].map((patch) => (
                <button
                  key={patch.id}
                  onClick={() => {
                    setSelectedImagePatch(patch.id);
                    executeSearch(patch.label);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    selectedImagePatch === patch.id
                      ? 'bg-[#24331F] border-[#7E9F71] text-[#A3BF99] shadow-sm'
                      : 'bg-[#0E172A] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{patch.label}</div>
                  <div className="text-[10px] font-mono text-[#7E9F71] mt-1">{patch.type}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          {/* AOI Filter */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">SURVEILLANCE SECTOR</label>
            <select
              value={selectedAoi}
              onChange={(e) => setSelectedAoi(e.target.value)}
              className="w-full bg-[#070B14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#7E9F71]"
            >
              <option value="ALL">All Sectors (National)</option>
              {aois.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Change Type Filter */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">CHANGE CLASSIFICATION</label>
            <select
              value={selectedChangeType}
              onChange={(e) => setSelectedChangeType(e.target.value)}
              className="w-full bg-[#070B14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#7E9F71]"
            >
              <option value="ALL">All Change Types</option>
              <option value="Construction">Construction</option>
              <option value="Road Development">Road Development</option>
              <option value="Land Clearing">Land Clearing</option>
              <option value="Water Change">Water Change</option>
              <option value="Agriculture Change">Agriculture Change</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={handleClearSearch}
              className="w-full py-1.5 px-3 rounded-lg bg-[#0E172A] hover:bg-[#162238] text-slate-300 border border-slate-700 text-xs font-mono flex items-center justify-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Search & Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Header / Telemetry Readout */}
      {vectorSearchResults !== null && (
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <div className="flex items-center space-x-2">
            <span>VECTOR HITS FOUND:</span>
            <span className="text-[#A3BF99] font-bold px-2 py-0.5 rounded bg-[#24331F] border border-[#7E9F71]/40">
              {vectorSearchResults.length} VECTOR HITS
            </span>
            {lastSearchedQuery && (
              <span className="text-slate-500">
                for query <span className="text-slate-300">"{lastSearchedQuery}"</span>
              </span>
            )}
          </div>

          <div className="text-slate-500 hidden sm:block">
            OPENCLIP VIT-B/32 • FAISS FLATIP ({scenes.length} TILES)
          </div>
        </div>
      )}

      {/* Results Rendering */}
      {isSearching ? (
        <div className="p-12 text-center rounded-xl bg-[#0B1120]/60 border border-slate-800 space-y-3">
          <RefreshCw className="w-8 h-8 text-[#A3BF99] mx-auto animate-spin" />
          <div className="text-sm font-bold text-slate-200">Executing OpenCLIP Semantic Inference...</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Computing a 512-dimensional OpenCLIP text embedding and querying the existing FAISS FlatIP index across 180 satellite granules.
          </p>
        </div>
      ) : searchError ? (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-8 text-center text-sm text-rose-200">
          Semantic search unavailable: {searchError}
        </div>
      ) : vectorSearchResults !== null ? (
        vectorSearchResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {vectorSearchResults.map((res: any, idx: number) => (
              <div
                key={idx}
                className="flex flex-col rounded-xl bg-[#0B1120]/95 border border-[#7E9F71]/20 hover:border-[#7E9F71]/50 transition-all overflow-hidden shadow-panel group"
              >
                {/* Visual Tile Image */}
                <div className="relative aspect-video w-full bg-[#070B14] overflow-hidden">
                  <img
                    src={res.image_url}
                    alt={res.tile_file}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-[#7E9F71]/40 text-[10px] font-mono text-[#A3BF99] font-bold">
                    RANK #{res.rank || idx + 1}
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#24331F]/90 border border-[#7E9F71]/50 text-[10px] font-mono text-[#A3BF99] font-bold">
                    COSINE: {typeof res.score === 'number' ? res.score.toFixed(4) : 'N/A'}
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-300">
                    DATE: {res.acquisition_date}
                  </div>
                </div>

                {/* Metadata Info */}
                <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#A3BF99] truncate max-w-[200px]">
                        {res.tile_file}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {res.sensor || 'Sensor not recorded'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Sector Bounding Box: ({res.lat_min?.toFixed(4)}°N, {res.lon_min?.toFixed(4)}°E) to ({res.lat_max?.toFixed(4)}°N, {res.lon_max?.toFixed(4)}°E)
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-[10px] font-mono text-slate-400">
                      <span>Ranchi Subarnarekha Basin</span>
                    </div>

                    <button
                      onClick={() => navigate('/change-analysis')}
                      className="px-3 py-1.5 rounded bg-[#556E4A]/25 hover:bg-[#556E4A]/40 text-[#A3BF99] border border-[#7E9F71]/40 text-xs font-mono font-medium flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Granule</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-xl bg-[#0B1120]/60 border border-slate-800 space-y-3">
            <Search className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-sm font-bold text-slate-300">No vector matches found</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No satellite granules met the vector similarity threshold for "{lastSearchedQuery}". Try selecting one of the recommended prompts above.
            </p>
            <button
              onClick={handleClearSearch}
              className="px-3 py-1.5 rounded bg-[#556E4A]/25 text-[#A3BF99] border border-[#7E9F71]/40 text-xs font-mono"
            >
              Reset Search
            </button>
          </div>
        )
      ) : (
        /* Standby state when no search has been executed yet */
        <div className="p-12 text-center rounded-xl bg-[#0B1120]/40 border border-slate-800/80 space-y-3">
          <Sparkles className="w-8 h-8 text-[#A3BF99]/60 mx-auto" />
          <div className="text-sm font-bold text-slate-300">Ready for Satellite Vector Retrieval</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Type a natural-language anomaly query or select one of the tested prompt suggestions above to search {scenes.length} indexed satellite tiles.
          </p>
        </div>
      )}
    </div>
  );
};
