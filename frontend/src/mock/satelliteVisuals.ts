/**
 * High-fidelity Geospatial and Multispectral Visual Generator
 * Produces authentic-looking Sentinel-2 (RGB, NDVI, NDBI), Sentinel-1 (SAR C-Band),
 * and Change Mask imagery as SVG Data URIs for offline/mock GEOINT operations.
 */

interface SiteVisualProps {
  siteType: 'construction' | 'road' | 'river' | 'land_clearing' | 'industrial' | 'border_post';
  stage: 'before' | 'after';
  label?: string;
}

export function generateSatelliteVisual(props: SiteVisualProps, layer: 'rgb' | 'ndvi' | 'ndbi' | 'sar' | 'mask'): string {
  const { siteType, stage, label = '' } = props;
  const isAfter = stage === 'after';

  // Base dimensions 600x400 for high resolution
  const width = 600;
  const height = 400;

  let bgFill = '#1c2826';
  let terrainElements = '';
  let changeElements = '';
  let hudOverlay = '';

  if (layer === 'rgb') {
    // True Color Optical Sentinel-2
    if (siteType === 'construction' || siteType === 'industrial') {
      bgFill = isAfter ? '#242b26' : '#2b3a29';
      terrainElements = `
        <!-- Surrounding agricultural plots and scrub -->
        <rect x="0" y="0" width="300" height="200" fill="#2d3b24" opacity="0.9"/>
        <rect x="300" y="0" width="300" height="180" fill="#35462a" opacity="0.85"/>
        <rect x="0" y="200" width="260" height="200" fill="#283420" opacity="0.9"/>
        <path d="M 260 400 L 290 200 L 320 0" stroke="#4a4436" stroke-width="8" fill="none" opacity="0.6"/>
        <!-- Drainage ditch / stream -->
        <path d="M 0 320 Q 180 340 340 280 T 600 310" stroke="#1a2d33" stroke-width="14" fill="none"/>
      `;

      if (isAfter) {
        changeElements = `
          <!-- Cleared foundation pad -->
          <polygon points="180,110 460,95 480,290 190,310" fill="#a49378" stroke="#8a795f" stroke-width="2"/>
          <!-- Compacted gravel sub-base -->
          <polygon points="210,130 430,120 445,270 220,285" fill="#7a7874" opacity="0.95"/>
          <!-- Active building foundation grids & structural concrete slabs -->
          <rect x="240" y="150" width="80" height="50" fill="#c4c9d0" stroke="#00e5ff" stroke-width="1.5"/>
          <rect x="340" y="150" width="70" height="95" fill="#bcc3cb" stroke="#00e5ff" stroke-width="1.5"/>
          <rect x="250" y="220" width="70" height="45" fill="#9fa7b0" stroke="#00e5ff" stroke-width="1.5"/>
          <!-- Tower cranes / equipment shadow -->
          <line x1="330" y1="140" x2="330" y2="180" stroke="#0f172a" stroke-width="3"/>
          <line x1="330" y1="140" x2="370" y2="135" stroke="#f59e0b" stroke-width="2.5"/>
          <!-- Access haul roads -->
          <path d="M 290 200 L 240 180" stroke="#94846c" stroke-width="12" stroke-linecap="round"/>
          <path d="M 445 230 L 580 250" stroke="#94846c" stroke-width="10" stroke-linecap="round"/>
        `;
      } else {
        changeElements = `
          <!-- Undeveloped vegetative scrub and fallow field -->
          <polygon points="180,110 460,95 480,290 190,310" fill="#3a4d2e" opacity="0.9"/>
          <circle cx="280" cy="180" r="22" fill="#2d3f23"/>
          <circle cx="380" cy="220" r="28" fill="#28381f"/>
          <circle cx="340" cy="150" r="18" fill="#324427"/>
        `;
      }
    } else if (siteType === 'road') {
      bgFill = '#2a3b26';
      terrainElements = `
        <!-- Rural parcels & woodland patch -->
        <rect x="0" y="0" width="600" height="400" fill="#2a3822"/>
        <path d="M 50 0 Q 80 180 30 400" stroke="#16221c" stroke-width="25" fill="none"/>
        <circle cx="140" cy="90" r="50" fill="#1f2d19"/>
        <circle cx="480" cy="310" r="65" fill="#1c2817"/>
      `;

      if (isAfter) {
        changeElements = `
          <!-- Cut & fill embankment corridor -->
          <path d="M 0 160 Q 280 210 600 130" stroke="#877c6a" stroke-width="38" fill="none"/>
          <!-- Dual carriageway asphalt paved surface -->
          <path d="M 0 160 Q 280 210 600 130" stroke="#33383f" stroke-width="22" fill="none"/>
          <path d="M 0 160 Q 280 210 600 130" stroke="#f1f5f9" stroke-width="1.5" stroke-dasharray="12,12" fill="none"/>
          <!-- Overpass bridge piers -->
          <rect x="270" y="180" width="30" height="12" fill="#d1d5db" stroke="#00e5ff" stroke-width="1"/>
          <circle cx="450" cy="160" r="20" fill="#6b7280" opacity="0.6"/>
        `;
      } else {
        changeElements = `
          <!-- Primitive dirt trail -->
          <path d="M 0 160 Q 280 210 600 130" stroke="#473f32" stroke-width="4" stroke-dasharray="6,4" fill="none" opacity="0.6"/>
        `;
      }
    } else if (siteType === 'river') {
      bgFill = '#223023';
      terrainElements = `
        <rect x="0" y="0" width="600" height="400" fill="#2e3d27"/>
      `;

      if (isAfter) {
        changeElements = `
          <!-- Shifted river course & extensive sand deposition -->
          <path d="M 0 80 Q 220 160 380 290 T 600 340" stroke="#1e3a47" stroke-width="70" fill="none"/>
          <path d="M 120 130 Q 320 220 540 260" stroke="#d5c8a8" stroke-width="42" fill="none" opacity="0.85"/>
          <path d="M 20 240 Q 180 310 320 370" stroke="#a48c66" stroke-width="28" fill="none"/>
        `;
      } else {
        changeElements = `
          <!-- Original stable river channel -->
          <path d="M 0 60 Q 240 100 420 190 T 600 240" stroke="#1a3340" stroke-width="85" fill="none"/>
          <path d="M 280 140 Q 340 160 400 180" stroke="#253520" stroke-width="25" fill="none"/>
        `;
      }
    } else {
      // Land clearing / Border logistics
      bgFill = isAfter ? '#383226' : '#1e3020';
      terrainElements = `
        <rect x="0" y="0" width="600" height="400" fill="${isAfter ? '#2a261f' : '#23331f'}"/>
        <path d="M 100 0 L 140 400" stroke="#3d372e" stroke-width="8" fill="none" opacity="0.5"/>
      `;
      if (isAfter) {
        changeElements = `
          <!-- Extensive bare soil deforestation scar -->
          <polygon points="120,60 520,40 550,330 140,360" fill="#8c775a" stroke="#715f45" stroke-width="3"/>
          <polygon points="200,100 450,90 480,260 210,270" fill="#a89270"/>
          <!-- Perimeter security fence & observation tower -->
          <rect x="220" y="120" width="180" height="90" fill="#4b5563" stroke="#00e5ff" stroke-width="1.5"/>
          <circle cx="310" cy="165" r="14" fill="#00e5ff" opacity="0.8"/>
        `;
      } else {
        changeElements = `
          <!-- Dense canopy forest -->
          <polygon points="120,60 520,40 550,330 140,360" fill="#1b2a18"/>
          <circle cx="220" cy="140" r="35" fill="#152413"/>
          <circle cx="340" cy="200" r="45" fill="#132211"/>
          <circle cx="450" cy="170" r="40" fill="#182715"/>
        `;
      }
    }
  } else if (layer === 'ndvi') {
    // False color Normalized Difference Vegetation Index: healthy veg = crimson/bright red, soil = pale olive/cyan
    bgFill = '#0a101d';
    if (isAfter) {
      terrainElements = `
        <rect x="0" y="0" width="600" height="400" fill="#4a0f16"/>
        <!-- Degraded/cleared non-vegetative patch (NDVI < 0.2) -->
        <polygon points="160,90 490,75 510,320 170,340" fill="#164e63" stroke="#06b6d4" stroke-width="2"/>
        <rect x="240" y="150" width="180" height="120" fill="#0e7490" opacity="0.9"/>
      `;
    } else {
      terrainElements = `
        <rect x="0" y="0" width="600" height="400" fill="#7f1d1d"/>
        <!-- Healthy continuous canopy (NDVI > 0.75) -->
        <polygon points="160,90 490,75 510,320 170,340" fill="#991b1b"/>
        <circle cx="330" cy="200" r="90" fill="#b91c1c"/>
      `;
    }
  } else if (layer === 'ndbi') {
    // Normalized Difference Built-Up Index: concrete/steel/impervious = electric cyan/bright white, background = dark
    bgFill = '#030712';
    if (isAfter) {
      terrainElements = `
        <rect x="0" y="0" width="600" height="400" fill="#0b1120"/>
        <!-- Impervious footprint signature -->
        <polygon points="170,100 480,85 500,310 180,330" fill="#083344" stroke="#00e5ff" stroke-width="2"/>
        <rect x="230" y="140" width="90" height="60" fill="#22d3ee" stroke="#ffffff" stroke-width="1.5"/>
        <rect x="340" y="140" width="80" height="100" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
        <line x1="0" y1="160" x2="600" y2="140" stroke="#00e5ff" stroke-width="5" opacity="0.8"/>
      `;
    } else {
      terrainElements = `
        <rect x="0" y="0" width="600" height="400" fill="#030712"/>
        <!-- Background noise, no built-up signature -->
        <circle cx="300" cy="200" r="40" fill="#1e293b" opacity="0.3"/>
      `;
    }
  } else if (layer === 'sar') {
    // Sentinel-1 SAR C-Band Backscatter (speckle radar texture + metallic corner reflector returns)
    bgFill = '#111827';
    terrainElements = `
      <rect x="0" y="0" width="600" height="400" fill="#1f2937"/>
      <!-- Radar speckle texture -->
      <filter id="sarSpeckle" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise"/>
        <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0.45 0"/>
      </filter>
      <rect x="0" y="0" width="600" height="400" filter="url(#sarSpeckle)"/>
    `;
    if (isAfter) {
      changeElements = `
        <!-- High dielectric / corner reflector SAR signature (structures) -->
        <polygon points="220,130 430,120 440,280 230,290" fill="#374151" stroke="#9ca3af" stroke-width="1"/>
        <rect x="250" y="150" width="70" height="40" fill="#ffffff" opacity="0.95"/>
        <circle cx="370" cy="180" r="18" fill="#ffffff"/>
        <line x1="250" y1="210" x2="410" y2="210" stroke="#f3f4f6" stroke-width="4"/>
      `;
    } else {
      changeElements = `
        <!-- Low diffuse vegetative backscatter -->
        <polygon points="220,130 430,120 440,280 230,290" fill="#1f2937" opacity="0.7"/>
      `;
    }
  } else if (layer === 'mask') {
    // Change Vector Mask with bounding geometry
    bgFill = '#070b14';
    terrainElements = `
      <rect x="0" y="0" width="600" height="400" fill="#070b14" opacity="0.9"/>
      <!-- Change polygon mask -->
      <polygon points="170,95 485,80 505,315 175,335" fill="rgba(0, 229, 255, 0.25)" stroke="#00e5ff" stroke-width="3" stroke-dasharray="8,4"/>
      <rect x="170" y="70" width="140" height="22" fill="#00e5ff"/>
      <text x="176" y="86" fill="#070b14" font-family="monospace" font-size="12" font-weight="bold">CHANGE DETECTED</text>
      <!-- Sub-centroid crosshairs -->
      <circle cx="340" cy="210" r="28" fill="none" stroke="#f43f5e" stroke-width="2"/>
      <line x1="340" y1="172" x2="340" y2="248" stroke="#f43f5e" stroke-width="1.5"/>
      <line x1="302" y1="210" x2="378" y2="210" stroke="#f43f5e" stroke-width="1.5"/>
      <text x="382" y="215" fill="#f43f5e" font-family="monospace" font-size="11" font-weight="bold">Δ AREA: 8.42 ha</text>
    `;
  }

  // HUD Tactical Coordinates Overlay
  hudOverlay = `
    <!-- HUD Graticule & Coordinates -->
    <line x1="20" y1="20" x2="50" y2="20" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <line x1="20" y1="20" x2="20" y2="50" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <line x1="580" y1="20" x2="550" y2="20" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <line x1="580" y1="20" x2="580" y2="50" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <line x1="20" y1="380" x2="50" y2="380" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <line x1="20" y1="380" x2="20" y2="350" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <line x1="580" y1="380" x2="550" y2="380" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <line x1="580" y1="380" x2="580" y2="350" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <!-- Stamp text -->
    <rect x="25" y="25" width="220" height="24" fill="rgba(7,11,20,0.85)" rx="3" stroke="rgba(56,189,248,0.3)" stroke-width="1"/>
    <text x="32" y="41" fill="#38bdf8" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="600">${label || `${stage.toUpperCase()} | ${layer.toUpperCase()}`}</text>
  `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${bgFill}"/>
    ${terrainElements}
    ${changeElements}
    ${hudOverlay}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
