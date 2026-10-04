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

export interface TimeSeriesObservation {
  date: string;
  scene_id: string;
  sensor: string;
  anomaly_score: number;
  status: string;
  description: string;
  thumbnail_url: string;
}

export interface EarliestChangeBacktracking {
  earliest_change_date: string;
  earliest_scene_id: string;
  backtracking_confidence: number;
  baseline_date: string;
  detection_date: string;
  time_series_observations: TimeSeriesObservation[];
}

export interface FalseAlarmFactorItem {
  score: number;
  flagged: boolean;
  explanation: string;
}

export interface ExplainableFalseAlarm6Factor {
  riskLevel: 'Low' | 'Medium' | 'High';
  overallSuppressionScore: number;
  factors: {
    cloudShadow: FalseAlarmFactorItem;
    seasonalPhenology: FalseAlarmFactorItem;
    radiometricGain: FalseAlarmFactorItem;
    nodataBorder: FalseAlarmFactorItem;
    registrationShift: FalseAlarmFactorItem;
  };
  explanations: string[];
}

export interface OpticalSarCrossValidation {
  optical_confidence: number;
  sar_confidence: number;
  fused_confidence: number;
  agreement_status: string;
  agreement_description: string;
  optical_metrics: {
    sensor: string;
    bands: string;
    ndvi_delta: number;
    ndbi_delta: number;
    cloud_obscuration: string;
  };
  sar_metrics: {
    sensor: string;
    mode: string;
    polarization: string;
    vv_backscatter_delta_db: number;
    vh_backscatter_delta_db: number;
    coherence_loss: number;
    cloud_penetration_verified: boolean;
  };
}

export interface CoRegistrationRadiometricValidation {
  subpixelShift: {
    xShiftPx: number;
    yShiftPx: number;
    totalShiftPx: number;
    tolerancePx: number;
    withinTolerance: boolean;
  };
  radiometricNormalization: {
    gainFactor: number;
    biasOffset: number;
    histogramMatchMethod: string;
    normalizedReflectanceDelta: number;
  };
  alignmentQualityScore: number;
  validationStatus: string;
  penaltyApplied: number;
  explanation: string;
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
  areaHectares: number | null;
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

  // 10 SIH Priority Feature Additions
  backtracking?: EarliestChangeBacktracking;
  falseAlarm6Factor?: ExplainableFalseAlarm6Factor;
  crossValidation?: OpticalSarCrossValidation;
  coRegistration?: CoRegistrationRadiometricValidation;
  stacItem?: any;
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
  cloudCover: number | null;
  resolutionMeters: number | null;
  processingState: 'Processed (L2A)' | 'Calibrated (GRD)' | 'Indexing' | 'Archived';
  sunElevation?: number;
  orbitDirection?: 'Ascending' | 'Descending';
  footprintCoords: [number, number][];
  checksum: string;
  stacItemId: string;
  fileSizeBytes: number;
  tile_file?: string;
  image_url?: string;
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

  // Cryptographic Audit Trail Hash-Chain Extensions
  chainIndex?: number;
  previousHash?: string;
  fullPreviousHash?: string;
  currentHash?: string;
  fullCurrentHash?: string;
  signature?: string;
  verifiedTamperProof?: boolean;
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

export interface IncrementalIngestResponse {
  status: string;
  added_scene_name: string;
  tile_filename: string;
  stac_item_id: string;
  ingestion_time_ms: number;
  index_updated_incrementally: boolean;
  rebuild_required: boolean;
  updated_index_total_tiles: number;
  stac_item_url: string;
  timestamp: string;
}

export interface AuditVerificationResponse {
  chainValid: boolean;
  totalBlocksVerified: number;
  failedBlockIndex?: number | null;
  genesisHash: string;
  latestHash: string;
  signatureAlgorithm: string;
  verificationTimestamp: string;
  statusMessage: string;
}

export interface ZeroEgressProofResponse {
  airgapStatus: string;
  complianceStandard: string;
  externalRequestsCount: number | null;
  networkInterfaces: Array<{
    interface: string;
    bindAddress: string;
    state: string;
  }>;
  outboundSocketsAudit: Array<{
    destination: string;
    status: string;
    packetsSent: number;
  }>;
  evidenceHash: string;
  signature: string;
  verifiedAt: string;
  verdict: string;
}

export interface HeldoutEvaluationMetricsResponse {
  heldoutDataset: string;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  queryLatency: {
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
    mean_ms: number;
  };
  buildAndUpdateTime: {
    fullIndexBuildTimeSec: number;
    incrementalUpdateBatchMs: number;
    stacIngestLatencyMs: number;
  };
  storageGrowth: {
    tilesImageryMb: number;
    vectorIndexMb: number;
    totalStorageMb: number;
    growthPerSceneMb: number;
  };
  hardwareSpecs: {
    processor: string;
    operatingSystem: string;
    systemMemory: string;
    storagePartition: string;
    acceleration: string;
  };
}
