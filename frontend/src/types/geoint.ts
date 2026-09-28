export type ChangeType =
  | 'Construction'
  | 'Land Clearing'
  | 'Vegetation Loss'
  | 'Water Change'
  | 'Road Development'
  | 'Agriculture Change'
  | 'Other';

export type SensorType =
  | 'Sentinel-2 Optical'
  | 'Sentinel-1 SAR'
  | 'Landsat-8/9'
  | 'PlanetScope';

export type CandidateStatus = 'pending' | 'confirmed' | 'rejected';

export interface EvidenceChecklistItem {
  item: string;
  verified: boolean;
  confidenceScore: number;
}

export interface FalseAlarmAnalysis {
  riskLevel: 'Low' | 'Medium' | 'High';
  seasonalAnomaly: boolean;
  cloudShadowArtifact: boolean;
  factors: string[];
}

export interface TemporalStage {
  date: string;
  stage: string;
  metric: number;
  sensor: string;
}

export interface ReviewLog {
  user: string;
  action: string;
  timestamp: string;
  note?: string;
}

export interface ChangeCandidate {
  id: string;
  title: string;
  locationName: string;
  state: string;
  coordinates: [number, number]; // [lat, lng]
  aoiId: string;
  aoiName: string;
  changeType: ChangeType;
  confidence: number; // 0-100
  detectionDate: string;
  earliestEvidenceDate: string;
  beforeDate: string;
  afterDate: string;
  areaHectares: number;
  sensors: SensorType[];
  status: CandidateStatus;
  analystNotes: string[];
  reviewHistory: ReviewLog[];
  thumbnails: {
    beforeRGB: string;
    afterRGB: string;
    ndvi: string;
    ndbi: string;
    sar: string;
    changeMask: string;
  };
  temporalTimeline: TemporalStage[];
  evidenceChecklist: EvidenceChecklistItem[];
  falseAlarmRisk: FalseAlarmAnalysis;
  polygonBoundary?: [number, number][];
}

export interface AOI {
  id: string;
  name: string;
  region: string;
  center: [number, number];
  zoom: number;
  areaSqKm: number;
  lastIngested: string;
  activeScenesCount: number;
  candidateCount: number;
  polygonCoords: [number, number][];
  description: string;
}

export interface SceneRecord {
  id: string;
  sensor: SensorType;
  acquisitionDate: string;
  aoiName: string;
  cloudCover: number;
  resolutionMeters: number;
  processingState: 'Processed (L2A)' | 'Calibrated (GRD)' | 'Indexing' | 'Archived';
  sunElevation?: number;
  orbitDirection?: 'Ascending' | 'Descending';
  footprintCoords: [number, number][];
  checksum: string;
  stacItemId: string;
  fileSizeBytes: number;
}

export interface ExportPackage {
  id: string;
  title: string;
  format: 'GeoJSON' | 'Cloud-Optimized GeoTIFF (COG)' | 'STAC Item Catalog' | 'Analyst CSV' | 'Intelligence Dossier (PDF/HTML)';
  aoi: string;
  candidateCount: number;
  fileSize: string;
  createdDate: string;
  status: 'Ready' | 'Generating' | 'Expired';
  downloadUrl: string;
  exportedBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  eventType:
    | 'LOGIN'
    | 'SEMANTIC_SEARCH'
    | 'RUN_CHANGE_ANALYSIS'
    | 'CONFIRM_CANDIDATE'
    | 'REJECT_CANDIDATE'
    | 'EXPORT_DATASET'
    | 'UPDATE_AOI'
    | 'ADD_NOTE'
    | 'SYSTEM_CHECK';
  user: string;
  role: string;
  ipAddress: string;
  details: string;
  status: 'SUCCESS' | 'WARN' | 'DENIED';
}

export interface SystemHealthComponent {
  component: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'STANDBY';
  latencyMs: number;
  memoryUsage: string;
  version: string;
  details: string;
  lastTested: string;
}

export interface MapLayerConfig {
  id: 'satellite' | 'hybrid' | 'streets' | 'terrain' | 'topographic';
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}
