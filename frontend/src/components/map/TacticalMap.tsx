import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useGeointStore } from '../../stores/geointStore';
import { ChangeCandidate } from '../../types/geoint';
import {
  Layers,
  Crosshair,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MapPin,
  Eye,
  Activity,
  Compass,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TacticalMapProps {
  height?: string;
  className?: string;
  onSelectCandidate?: (candidate: ChangeCandidate) => void;
  showAllControls?: boolean;
}

const getCartoKeyParam = (): string => {
  const key = import.meta.env.VITE_CARTO_API_KEY || '';
  return key ? `?key=${key}` : '';
};

const TILE_LAYERS = {
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri World Imagery, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  hybrid: {
    name: 'Hybrid',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelsUrl: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png${getCartoKeyParam()}`,
    attribution: 'Esri, Maxar, Earthstar &middot; Labels &copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  streets: {
    name: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  terrain: {
    name: 'Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri Physical Terrain, USGS',
    maxZoom: 16,
  },
  topographic: {
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
} as Record<string, { name: string; url: string; labelsUrl?: string; attribution: string; maxZoom: number }>;

export const TacticalMap: React.FC<TacticalMapProps> = ({
  height = '100%',
  className = '',
  onSelectCandidate,
  showAllControls = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const aoiLayerRef = useRef<L.LayerGroup | null>(null);
  const navigate = useNavigate();

  const {
    aois,
    activeAoiId,
    candidates,
    selectedCandidateId,
    selectCandidate,
    mapLayer,
    setMapLayer,
  } = useGeointStore();

  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(5);
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState({
    aoiBoundaries: true,
    changePolygons: true,
    markers: true,
    radarGrid: true,
  });

  const activeAoi = aois.find((a) => a.id === activeAoiId) || aois[0];

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center on India
    const map = L.map(mapContainerRef.current, {
      center: activeAoi ? activeAoi.center : [22.5937, 78.9629],
      zoom: activeAoi ? activeAoi.zoom : 5,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Base Tile Layer
    const layerConfig = TILE_LAYERS[mapLayer];
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
      subdomains: 'abcd',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Labels overlay for hybrid mode
    if (layerConfig.labelsUrl) {
      const labels = L.tileLayer(layerConfig.labelsUrl, {
        maxZoom: layerConfig.maxZoom,
        subdomains: 'abcd',
        pane: 'overlayPane',
      }).addTo(map);
      labelsLayerRef.current = labels;
    }

    // Layer groups for AOIs and markers
    const aoiGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    aoiLayerRef.current = aoiGroup;
    markersLayerRef.current = markersGroup;

    // Tracking mouse movement for HUD
    map.on('mousemove', (e) => {
      setMouseCoords({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });
    });

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    // Fix black boxes: force Leaflet to recalculate tile positions on container resize
    const resizeTimer = setTimeout(() => map.invalidateSize(), 200);
    const resizeTimer2 = setTimeout(() => map.invalidateSize(), 600);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(mapContainerRef.current);

    const handleWindowResize = () => map.invalidateSize({ animate: false });
    window.addEventListener('resize', handleWindowResize);

    // Cleanup
    return () => {
      clearTimeout(resizeTimer);
      clearTimeout(resizeTimer2);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update base tile layer on layer change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const config = TILE_LAYERS[mapLayer];

    // Remove existing base + label layers
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    // Add new base tile layer
    const newTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: 'abcd',
    }).addTo(map);
    tileLayerRef.current = newTileLayer;

    // Add labels overlay for hybrid mode
    if (config.labelsUrl) {
      const labels = L.tileLayer(config.labelsUrl, {
        maxZoom: config.maxZoom,
        subdomains: 'abcd',
        pane: 'overlayPane',
      }).addTo(map);
      labelsLayerRef.current = labels;
    }

    // Ensure existing overlays stay on top by re-adding them
    if (aoiLayerRef.current) {
      aoiLayerRef.current.eachLayer((l) => l.addTo(mapInstanceRef.current!));
    }
    if (markersLayerRef.current) {
      markersLayerRef.current.eachLayer((l) => l.addTo(mapInstanceRef.current!));
    }

    // Fix any tile rendering issues after layer swap
    setTimeout(() => map.invalidateSize(), 100);
  }, [mapLayer]);

  // Center on Active AOI when changed
  useEffect(() => {
    if (!mapInstanceRef.current || !activeAoi) return;
    mapInstanceRef.current.flyTo(activeAoi.center, activeAoi.zoom, {
      animate: true,
      duration: 1.2,
    });
  }, [activeAoiId]);

  // Draw AOI Polygons and Candidates
  useEffect(() => {
    if (!mapInstanceRef.current || !aoiLayerRef.current || !markersLayerRef.current) return;

    aoiLayerRef.current.clearLayers();
    markersLayerRef.current.clearLayers();

    // 1. Draw AOI Boundaries
    if (layerVisibility.aoiBoundaries) {
      aois.forEach((aoi) => {
        const isActive = aoi.id === activeAoiId;
        const polygon = L.polygon(aoi.polygonCoords, {
          color: isActive ? '#7E9F71' : '#556E4A',
          weight: isActive ? 2.5 : 1.5,
          opacity: isActive ? 0.95 : 0.6,
          fillColor: isActive ? '#7E9F71' : '#556E4A',
          fillOpacity: isActive ? 0.08 : 0.03,
          dashArray: isActive ? '6, 6' : undefined,
        });

        polygon.bindTooltip(`<b>${aoi.name}</b><br/>Area: ${aoi.areaSqKm} km²`, {
          className: 'tactical-tooltip',
          direction: 'top',
        });

        polygon.on('click', () => {
          useGeointStore.getState().setActiveAoi(aoi.id);
        });

        aoiLayerRef.current?.addLayer(polygon);
      });
    }

    // 2. Draw Candidate Markers
    if (layerVisibility.markers) {
      candidates.forEach((cand) => {
        const isSelected = cand.id === selectedCandidateId;
        const isConfirmed = cand.status === 'confirmed';
        const isRejected = cand.status === 'rejected';

        const color = isConfirmed ? '#10b981' : isRejected ? '#f43f5e' : '#7E9F71';
        const pulseAnim = !isRejected ? 'animate-ping' : '';

        // Tactical Custom HTML Marker
        const iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <span class="${pulseAnim} absolute inline-flex h-7 w-7 rounded-full" style="background-color: ${color}; opacity: 0.35;"></span>
            <div class="relative flex items-center justify-center w-6 h-6 rounded-full border-2 shadow-glow-sm" style="background-color: #0b1120; border-color: ${color};">
              <div class="w-2 h-2 rounded-full" style="background-color: ${color};"></div>
            </div>
            ${
              isSelected
                ? `<div class="absolute -top-7 px-2 py-0.5 rounded bg-[#0b1120] border border-[#7E9F71] text-[10px] font-mono text-[#A3BF99] font-bold whitespace-nowrap shadow-lg">
                    ${cand.id} [${cand.confidence}%]
                   </div>`
                : ''
            }
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-tactical-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker(cand.coordinates, { icon: customIcon });

        // Popup Content
        const popupContent = `
          <div class="p-2 space-y-1.5 font-sans min-w-[220px]">
            <div class="flex items-center justify-between border-b border-slate-700/60 pb-1">
              <span class="font-mono text-[11px] font-bold text-[#A3BF99]">${cand.id}</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isConfirmed ? 'bg-emerald-950 text-emerald-300' : isRejected ? 'bg-rose-950 text-rose-300' : 'bg-[#24331F] text-[#A3BF99]'
              }">${cand.confidence}% CONF</span>
            </div>
            <div class="text-xs font-semibold text-white leading-snug">${cand.title}</div>
            <div class="text-[10px] text-slate-400 font-mono">${cand.locationName}</div>
            <div class="grid grid-cols-2 gap-1 pt-1 text-[10px] font-mono border-t border-slate-800">
              <div><span class="text-slate-500">TYPE:</span> <span class="text-slate-200">${cand.changeType}</span></div>
              <div><span class="text-slate-500">AREA:</span> <span class="text-slate-200">${cand.areaHectares == null ? 'Not measured' : `${cand.areaHectares} ha`}</span></div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 280 });

        marker.on('click', () => {
          selectCandidate(cand.id);
          if (onSelectCandidate) {
            onSelectCandidate(cand);
          }
        });

        markersLayerRef.current?.addLayer(marker);

        // Draw Candidate Polygon Boundary if available
        if (layerVisibility.changePolygons && cand.polygonBoundary) {
          const boundaryPoly = L.polygon(cand.polygonBoundary, {
            color: color,
            weight: 2,
            dashArray: '4, 4',
            fillColor: color,
            fillOpacity: 0.15,
          });
          markersLayerRef.current?.addLayer(boundaryPoly);
        }
      });
    }
  }, [aois, candidates, activeAoiId, selectedCandidateId, layerVisibility]);

  // Center on India button
  const resetToIndia = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([22.5937, 78.9629], 5, { duration: 1.2 });
  };

  const zoomIn = () => mapInstanceRef.current?.zoomIn();
  const zoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-cyan-500/20 bg-[#070B14] ${className}`} style={{ height }}>
      {/* Actual Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Tactical HUD Overlay Corners */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-10" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400 pointer-events-none z-10" />

      {/* Top Left: Active Sector Readout */}
      <div className="absolute top-3 left-4 z-10 bg-[#0E172A]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/20 shadow-lg flex items-center space-x-2 text-xs">
        <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
        <span className="font-mono text-slate-400">SECTOR:</span>
        <span className="font-bold text-white tracking-wide truncate max-w-[200px]">
          {activeAoi ? activeAoi.name : 'National Territory'}
        </span>
      </div>

      {/* Top Right: Layer Switcher & Overlays */}
      {showAllControls && (
        <div className="absolute top-3 right-4 z-10 flex items-center space-x-2">
          {/* Map Layer Selector Button */}
          <div className="relative">
            <button
              onClick={() => setLayerMenuOpen(!layerMenuOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#0E172A]/90 hover:bg-[#121F38] backdrop-blur-md border border-cyan-500/30 text-xs text-slate-200 transition-colors shadow-lg"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium capitalize">{TILE_LAYERS[mapLayer].name}</span>
            </button>

            {layerMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-[#0E172A] border border-cyan-500/30 rounded-lg shadow-2xl py-1 z-50 backdrop-blur-xl">
                <div className="px-3 py-1 text-[10px] font-mono text-cyan-400/70 border-b border-slate-800">
                  BASE MAP TILES
                </div>
                {(Object.keys(TILE_LAYERS) as Array<'satellite' | 'hybrid' | 'streets' | 'terrain' | 'topographic'>).map((layerKey) => (
                  <button
                    key={layerKey}
                    onClick={() => {
                      setMapLayer(layerKey);
                      setLayerMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-cyan-500/10 transition-colors ${
                      mapLayer === layerKey ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <span>{TILE_LAYERS[layerKey].name}</span>
                    {mapLayer === layerKey && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  </button>
                ))}

                <div className="px-3 py-1 text-[10px] font-mono text-cyan-400/70 border-t border-b border-slate-800 mt-1">
                  TACTICAL OVERLAYS
                </div>
                <div className="px-3 py-1.5 space-y-1 text-[11px] text-slate-300">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>AOI Boundaries</span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.aoiBoundaries}
                      onChange={(e) => setLayerVisibility({ ...layerVisibility, aoiBoundaries: e.target.checked })}
                      className="accent-cyan-400 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Change Polygons</span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.changePolygons}
                      onChange={(e) => setLayerVisibility({ ...layerVisibility, changePolygons: e.target.checked })}
                      className="accent-cyan-400 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Candidate Markers</span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.markers}
                      onChange={(e) => setLayerVisibility({ ...layerVisibility, markers: e.target.checked })}
                      className="accent-cyan-400 rounded"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Tactical Navigation Controls (Zoom & Reset) & N/E/S/W Compass */}
      <div className="absolute right-4 bottom-12 z-10 flex flex-col items-center space-y-2">
        {/* N/E/S/W Institutional Compass Control */}
        <div className="w-10 h-10 rounded-full bg-[#0E172A]/90 border border-sky-500/30 flex items-center justify-center text-sky-300 shadow-lg relative group">
          <svg className="w-8 h-8 transform group-hover:rotate-45 transition-transform duration-300" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="3,3" />
            <polygon points="50,12 56,44 50,38 44,44" fill="#38bdf8" />
            <polygon points="50,88 56,56 50,62 44,56" fill="#64748b" />
            <polygon points="88,50 56,56 62,50 56,44" fill="#64748b" />
            <polygon points="12,50 44,56 38,50 44,44" fill="#64748b" />
            <text x="50" y="24" fontSize="11" fontWeight="bold" fill="#38bdf8" textAnchor="middle">N</text>
            <text x="50" y="84" fontSize="9" fill="#94a3b8" textAnchor="middle">S</text>
            <text x="80" y="53" fontSize="9" fill="#94a3b8" textAnchor="middle">E</text>
            <text x="20" y="53" fontSize="9" fill="#94a3b8" textAnchor="middle">W</text>
          </svg>
        </div>

        <button
          onClick={zoomIn}
          title="Zoom In"
          className="w-8 h-8 rounded-md bg-[#0E172A]/90 hover:bg-[#121F38] border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:text-cyan-100 transition-colors shadow-lg"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out"
          className="w-8 h-8 rounded-md bg-[#0E172A]/90 hover:bg-[#121F38] border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:text-cyan-100 transition-colors shadow-lg"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetToIndia}
          title="Reset to India Overview"
          className="w-8 h-8 rounded-md bg-[#0E172A]/90 hover:bg-[#121F38] border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:text-cyan-100 transition-colors shadow-lg"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Bar: Telemetry, Scale & Cursor Coordinates HUD */}
      <div className="absolute bottom-2 left-4 z-10 flex items-center space-x-3 bg-[#0E172A]/90 backdrop-blur-md px-3 py-1 rounded-md border border-[#7E9F71]/30 text-[11px] font-mono text-slate-300 shadow-md">
        <div className="flex items-center space-x-1.5">
          <Crosshair className="w-3 h-3 text-[#A3BF99]" />
          <span>
            {mouseCoords ? `${mouseCoords.lat}° N, ${mouseCoords.lng}° E` : '22.5937° N, 78.9629° E'}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div className="flex items-center space-x-1">
          <span className="text-slate-500">SCALE:</span>
          <span className="text-[#A3BF99] font-bold">5 km</span>
          <span className="w-8 h-1 bg-[#556E4A]/40 inline-block border-l border-r border-[#7E9F71]" />
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div>
          <span className="text-slate-500">ZOOM:</span> <span className="text-[#A3BF99]">{zoomLevel}</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div>
          <span className="text-slate-500">CRS:</span> <span className="text-slate-300">WGS-84 / EPSG:4326</span>
        </div>
      </div>
    </div>
  );
};
