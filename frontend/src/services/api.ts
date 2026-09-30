import {
  AOI,
  ChangeCandidate,
  SceneRecord,
  ExportPackage,
  AuditLog,
  IncrementalIngestResponse,
  AuditVerificationResponse,
  ZeroEgressProofResponse,
  HeldoutEvaluationMetricsResponse,
  EarliestChangeBacktracking,
  ExplainableFalseAlarm6Factor,
  OpticalSarCrossValidation,
  CoRegistrationRadiometricValidation,
} from '../types/geoint';

const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? 'https://astreva-backend.onrender.com'
  : 'http://localhost:8000';
const API_BASE_URL = (
  import.meta.env.PROD
    ? DEFAULT_API_BASE_URL
    : import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

function normalizeApiUrls<T>(value: T): T {
  if (typeof value === 'string') {
    if (value.startsWith('/api/') || value.startsWith('/static/')) {
      return `${API_BASE_URL}${value}` as T;
    }

    try {
      const url = new URL(value);
      if (
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
        (url.pathname.startsWith('/api/') || url.pathname.startsWith('/static/'))
      ) {
        return `${API_BASE_URL}${url.pathname}${url.search}${url.hash}` as T;
      }
    } catch {
      return value;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeApiUrls) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeApiUrls(nestedValue)])
    ) as T;
  }

  return value;
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  return normalizeApiUrls(await response.json());
}

export const apiService = {
  // Health
  async getHealth() {
    return fetchJson<{
      status: string;
      sih_ml_active: boolean;
      sih_ml_import_error?: string | null;
      faiss_index_tiles: number;
      mean_latency_ms: number;
      components: any[];
    }>('/api/health');
  },

  // AOIs
  async getAois(): Promise<AOI[]> {
    return fetchJson<AOI[]>('/api/aois');
  },

  // Candidates
  async getCandidates(params?: {
    aoi_id?: string;
    status?: string;
    change_type?: string;
    min_confidence?: number;
  }): Promise<ChangeCandidate[]> {
    const searchParams = new URLSearchParams();
    if (params?.aoi_id && params.aoi_id !== 'ALL') searchParams.append('aoi_id', params.aoi_id);
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.change_type && params.change_type !== 'ALL') searchParams.append('change_type', params.change_type);
    if (params?.min_confidence !== undefined && params.min_confidence > 0) searchParams.append('min_confidence', params.min_confidence.toString());

    const queryStr = searchParams.toString();
    return fetchJson<ChangeCandidate[]>(`/api/candidates${queryStr ? `?${queryStr}` : ''}`);
  },

  async getCandidateById(id: string): Promise<ChangeCandidate> {
    return fetchJson<ChangeCandidate>(`/api/candidates/${id}`);
  },

  async updateCandidateStatus(id: string, status: string, note?: string) {
    return fetchJson<{ status: string; message: string }>(`/api/candidates/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    });
  },

  async addAnalystNote(id: string, note: string) {
    return fetchJson<{ status: string; message: string }>(`/api/candidates/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  // ─── 10 SIH PRIORITY FEATURE SERVICE METHODS ───────────────────────────────

  // 1. Earliest-Change Backtracking
  async getBacktracking(candidateId: string): Promise<EarliestChangeBacktracking> {
    return fetchJson<EarliestChangeBacktracking>(`/api/candidates/${candidateId}/backtracking`);
  },

  // 2. Incremental Ingestion
  async ingestSceneIncremental(payload: {
    scene_name: string;
    sensor?: string;
    acquisition_date?: string;
    lat?: number;
    lon?: number;
  }): Promise<IncrementalIngestResponse> {
    return fetchJson<IncrementalIngestResponse>('/api/ingest/incremental', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 3. Explainable 6-Factor False-Alarm Suppression
  async getFalseAlarmExplanation(candidateId: string): Promise<ExplainableFalseAlarm6Factor> {
    return fetchJson<ExplainableFalseAlarm6Factor>(`/api/candidates/${candidateId}/false-alarm-explain`);
  },

  // 4. Sentinel-2 + Sentinel-1 Cross-Validation
  async getCrossValidation(candidateId: string): Promise<OpticalSarCrossValidation> {
    return fetchJson<OpticalSarCrossValidation>(`/api/candidates/${candidateId}/cross-validation`);
  },

  // 5. Cryptographic Audit Trail Verification
  async verifyAuditTrail(): Promise<AuditVerificationResponse> {
    return fetchJson<AuditVerificationResponse>('/api/audit/verify');
  },

  // 6. Full STAC Provenance
  async getStacItem(itemId: string): Promise<any> {
    return fetchJson<any>(`/api/stac/items/${itemId}`);
  },

  async getStacCatalog(): Promise<any> {
    return fetchJson<any>('/api/stac/catalog');
  },

  // 7. Zero-Egress Offline Proof
  async getZeroEgressProof(): Promise<ZeroEgressProofResponse> {
    return fetchJson<ZeroEgressProofResponse>('/api/system/zero-egress-proof');
  },

  // 8. Held-Out Evaluation Metrics
  async getEvaluationMetrics(): Promise<HeldoutEvaluationMetricsResponse> {
    return fetchJson<HeldoutEvaluationMetricsResponse>('/api/evaluation/metrics');
  },

  // 10. Radiometric + Co-Registration Validation
  async getCoRegistration(candidateId: string): Promise<CoRegistrationRadiometricValidation> {
    return fetchJson<CoRegistrationRadiometricValidation>(`/api/candidates/${candidateId}/co-registration`);
  },

  // Vector / Semantic Search
  async searchTiles(params: {
    query?: string;
    image_tile?: string;
    top_k?: number;
    min_confidence?: number;
    date_from?: string;
    date_to?: string;
    aoi_id?: string;
    sensor?: string;
    change_type?: string;
  }) {
    return fetchJson<{
      query: string;
      results_count: number;
      results: Array<{
        rank: number;
        score: number;
        similarity_pct: number;
        tile_file: string;
        acquisition_date: string;
        lat_min: number;
        lat_max: number;
        lon_min: number;
        lon_max: number;
        sensor: string;
        image_url: string;
      }>;
    }>('/api/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Clusters & Discovery
  async getClusters() {
    return fetchJson<Array<{
      cluster_id: number;
      id: string;
      name: string;
      total_tiles: number;
      exemplar_tile: string;
      exemplar_image_url: string;
      coordinates: [number, number];
      members: Array<{
        tile_file: string;
        date: string;
        coordinates: [number, number];
        dist_to_center: number;
        image_url: string;
      }>;
    }>>('/api/clusters');
  },

  async findSimilarSites(tile_file: string, top_k = 5) {
    return fetchJson<{
      target_tile: string;
      count: number;
      similar_sites: Array<{
        rank: number;
        similarity_score: number;
        tile_file: string;
        date: string;
        lat: number;
        lon: number;
        sensor: string;
        image_url: string;
      }>;
    }>('/api/discovery/similar', {
      method: 'POST',
      body: JSON.stringify({ tile_file, top_k }),
    });
  },

  // Change Detection Pipeline Execution
  async triggerChangeDetection() {
    return fetchJson<{ status: string; message: string }>('/api/change-detection/run', {
      method: 'POST',
    });
  },

  // Scenes Catalogue
  async getScenes(): Promise<SceneRecord[]> {
    return fetchJson<SceneRecord[]>('/api/scenes');
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return fetchJson<AuditLog[]>('/api/audit');
  },

  async addAuditLog(entry: Partial<AuditLog>) {
    return fetchJson<{ status: string; entry: AuditLog }>('/api/audit', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },
};
