import React, { useState, useRef } from 'react';
import { ChangeCandidate } from '../../types/geoint';
import {
  Sliders,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  Satellite,
  Radio,
  Eye,
  Columns,
  Sparkles,
} from 'lucide-react';

interface SwipeComparisonProps {
  candidate: ChangeCandidate;
  initialMode?: 'swipe' | 'split' | 'opacity';
  activeLayer?: 'rgb' | 'ndvi' | 'ndbi' | 'sar' | 'mask';
  onChangeLayer?: (layer: 'rgb' | 'ndvi' | 'ndbi' | 'sar' | 'mask') => void;
  className?: string;
  showLayerControls?: boolean;
}

export const SwipeComparison: React.FC<SwipeComparisonProps> = ({
  candidate,
  initialMode = 'swipe',
  activeLayer = 'rgb',
  onChangeLayer,
  className = '',
  showLayerControls = true,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100
  const [comparisonMode, setComparisonMode] = useState<'swipe' | 'split' | 'opacity'>(initialMode);
  const [opacityVal, setOpacityVal] = useState<number>(50); // 0 to 100
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [currentLayer, setCurrentLayer] = useState<'rgb' | 'ndvi' | 'ndbi' | 'sar' | 'mask'>(activeLayer);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  const handleLayerChange = (layer: 'rgb' | 'ndvi' | 'ndbi' | 'sar' | 'mask') => {
    setCurrentLayer(layer);
    if (onChangeLayer) {
      onChangeLayer(layer);
    }
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  };

  // Determine images based on active spectral layer
  const beforeImage = candidate.thumbnails.beforeRGB;
  let afterImage = candidate.thumbnails.afterRGB;
  if (currentLayer === 'ndvi') afterImage = candidate.thumbnails.ndvi;
  else if (currentLayer === 'ndbi') afterImage = candidate.thumbnails.ndbi;
  else if (currentLayer === 'sar') afterImage = candidate.thumbnails.sar;
  else if (currentLayer === 'mask') afterImage = candidate.thumbnails.changeMask;

  return (
    <div className={`relative flex flex-col rounded-xl border border-cyan-500/25 bg-[#0B1120] overflow-hidden shadow-panel ${className}`}>
      {/* Top Header / Mode & Layer Selection Toolbar */}
      <div className="px-4 py-2.5 bg-[#0E172A]/90 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 z-20">
        {/* Left: Mode Switcher (Swipe, Split, Opacity) */}
        <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-[#070B14]/80 border border-slate-800">
          <button
            onClick={() => setComparisonMode('swipe')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              comparisonMode === 'swipe' ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Swipe Slider</span>
          </button>
          <button
            onClick={() => setComparisonMode('split')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              comparisonMode === 'split' ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side Split</span>
          </button>
          <button
            onClick={() => setComparisonMode('opacity')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              comparisonMode === 'opacity' ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Opacity Fade</span>
          </button>
        </div>

        {/* Center: Multispectral Layer Controls (RGB, NDVI, NDBI, Change Mask) */}
        {showLayerControls && (
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-mono text-slate-400 mr-1 hidden sm:inline">LAYER:</span>
            {[
              { id: 'rgb', label: 'RGB True Color' },
              { id: 'ndvi', label: 'NDVI Vegetation' },
              { id: 'ndbi', label: 'NDBI Built-Up' },
              { id: 'mask', label: 'Change Mask' },
            ].map((layer) => (
              <button
                key={layer.id}
                onClick={() => handleLayerChange(layer.id as any)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  currentLayer === layer.id
                    ? 'bg-cyan-400 text-slate-950 font-bold shadow-glow-sm'
                    : 'bg-[#121F38]/70 text-slate-300 hover:bg-[#1A284E] border border-cyan-500/15'
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>
        )}

        {/* Right: Zoom controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
            className="p-1.5 rounded bg-[#121F38] hover:bg-[#1A284E] text-slate-300 border border-slate-700/60"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono px-1.5 text-cyan-300 font-medium">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
            className="p-1.5 rounded bg-[#121F38] hover:bg-[#1A284E] text-slate-300 border border-slate-700/60"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Image Canvas Display */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative w-full h-[460px] bg-[#070B14] overflow-hidden select-none flex items-center justify-center cursor-crosshair"
      >
        {/* MODE 1: Interactive Swipe Slider */}
        {comparisonMode === 'swipe' && (
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
          >
            {/* After Image (Background) */}
            <img
              src={afterImage}
              alt="After Satellite Capture"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />

            {/* Before Image (Clipped by slider position) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={beforeImage}
                alt="Before Satellite Capture"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%', maxWidth: 'none' }}
                draggable={false}
              />
            </div>

            {/* Draggable Divider Handle */}
            <div
              onMouseDown={handleMouseDown}
              className="absolute top-0 bottom-0 w-1 bg-cyan-400 cursor-ew-resize z-30 shadow-[0_0_10px_#00e5ff]"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#0E172A] border-2 border-cyan-400 flex items-center justify-center shadow-glow-cyan">
                <Sliders className="w-3.5 h-3.5 text-cyan-300 rotate-90" />
              </div>
            </div>

            {/* Tactical Badges for Before / After */}
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded bg-[#070B14]/85 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
              <span className="text-slate-400">BASELINE:</span> {candidate.beforeDate} (S2 RGB)
            </div>
            <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded bg-[#070B14]/85 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
              <span className="text-slate-400">CURRENT:</span> {candidate.afterDate} ({currentLayer.toUpperCase()})
            </div>
          </div>
        )}

        {/* MODE 2: Side-by-Side Split View */}
        {comparisonMode === 'split' && (
          <div
            className="w-full h-full grid grid-cols-2 gap-1 p-1 bg-[#070B14]"
            style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
          >
            {/* Left: Before */}
            <div className="relative w-full h-full rounded overflow-hidden border border-slate-800">
              <img src={beforeImage} alt="Before" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-cyan-300 border border-slate-700">
                BEFORE • {candidate.beforeDate}
              </div>
            </div>

            {/* Right: After */}
            <div className="relative w-full h-full rounded overflow-hidden border border-cyan-500/30">
              <img src={afterImage} alt="After" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-cyan-950/80 text-[10px] font-mono text-cyan-300 border border-cyan-500/40">
                AFTER • {candidate.afterDate} ({currentLayer.toUpperCase()})
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: Opacity Fade Blending */}
        {comparisonMode === 'opacity' && (
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
          >
            {/* Before (Base) */}
            <img src={beforeImage} alt="Before" className="absolute inset-0 w-full h-full object-cover" />

            {/* After (With variable opacity) */}
            <img
              src={afterImage}
              alt="After"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: opacityVal / 100 }}
            />

            {/* Bottom floating slider control */}
            <div className="absolute bottom-4 z-20 px-4 py-2 rounded-lg bg-[#0E172A]/90 border border-cyan-500/30 flex items-center space-x-3 backdrop-blur-md shadow-xl">
              <span className="text-[11px] font-mono text-slate-300">BEFORE</span>
              <input
                type="range"
                min="0"
                max="100"
                value={opacityVal}
                onChange={(e) => setOpacityVal(Number(e.target.value))}
                className="w-48 accent-cyan-400 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-cyan-300 font-bold">AFTER ({opacityVal}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Information Sub-bar */}
      <div className="px-4 py-2 bg-[#0E172A]/95 border-t border-cyan-500/15 flex items-center justify-between text-xs font-mono text-slate-300">
        <div className="flex items-center space-x-3">
          <span className="text-cyan-400 font-bold">{candidate.id}</span>
          <span className="text-slate-500">|</span>
          <span>{candidate.locationName}</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400">AREA: {candidate.areaHectares === null ? 'Not measured' : `${candidate.areaHectares} ha`}</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 text-[10px]">
            Source resolution: not provided in the candidate dataset
          </span>
        </div>
      </div>
    </div>
  );
};
