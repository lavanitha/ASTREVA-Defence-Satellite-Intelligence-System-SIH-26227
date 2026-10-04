import { create } from 'zustand';
import {
  AOI,
  ChangeCandidate,
  SceneRecord,
  ExportPackage,
  AuditLog,
  CandidateStatus,
} from '../types/geoint';
import { apiService } from '../services/api';

export interface UserSession {
  username: string;
  name: string;
  role: string;
  badgeNumber: string;
  securityClearance: string;
  isAuthenticated: boolean;
  isOffline: boolean;
}

interface GeointState {
  user: UserSession;
  activeAoiId: string;
  selectedCandidateId: string | null;
  candidates: ChangeCandidate[];
  aois: AOI[];
  scenes: SceneRecord[];
  exports: ExportPackage[];
  auditLogs: AuditLog[];
  isLoadingApi: boolean;
  apiError: string | null;

  mapLayer: 'satellite' | 'hybrid' | 'streets' | 'terrain' | 'topographic';
  evidenceActiveLayer: 'rgb' | 'ndvi' | 'ndbi' | 'sar' | 'mask';
  comparisonMode: 'swipe' | 'split' | 'opacity';
  opacityValue: number;
  searchQuery: string;
  searchHistory: string[];
  activeChangeTypeFilter: string;
  activeSensorFilter: string;
  minConfidenceFilter: number;

  // Actions
  initApiData: () => Promise<void>;
  login: (username: string, role?: string) => void;
  loginAsGuest: () => void;
  logout: () => void;
  setActiveAoi: (aoiId: string) => void;
  selectCandidate: (candidateId: string | null) => void;
  setCandidateStatus: (candidateId: string, status: CandidateStatus, note?: string) => Promise<void>;
  addAnalystNote: (candidateId: string, note: string) => Promise<void>;
  setMapLayer: (layer: 'satellite' | 'hybrid' | 'streets' | 'terrain' | 'topographic') => void;
  setEvidenceActiveLayer: (layer: 'rgb' | 'ndvi' | 'ndbi' | 'sar' | 'mask') => void;
  setComparisonMode: (mode: 'swipe' | 'split' | 'opacity') => void;
  setOpacityValue: (val: number) => void;
  setSearchQuery: (query: string) => void;
  addSearchHistory: (query: string) => void;
  setFilterChangeType: (type: string) => void;
  setFilterSensor: (sensor: string) => void;
  setFilterConfidence: (confidence: number) => void;
  createExport: (title: string, format: ExportPackage['format'], aoi: string, candidateIds?: string[]) => Promise<void>;
  addAuditLog: (eventType: AuditLog['eventType'], details: string, status?: AuditLog['status']) => Promise<void>;
}

export const useGeointStore = create<GeointState>((set, get) => ({
  user: {
    username: 'admin.defence',
    name: 'Cmdr. R. K. Sharma',
    role: 'Senior GEOINT Officer (Level-3)',
    badgeNumber: 'DEF-GEO-8902',
    securityClearance: 'SECRET / NATIONAL ENCLAVE',
    isAuthenticated: true,
    isOffline: false,
  },
  activeAoiId: 'AOI-IND-03',
  selectedCandidateId: null,
  candidates: [],
  aois: [],
  scenes: [],
  exports: [],
  auditLogs: [],
  isLoadingApi: false,
  apiError: null,

  mapLayer: 'satellite',
  evidenceActiveLayer: 'rgb',
  comparisonMode: 'swipe',
  opacityValue: 50,
  searchQuery: '',
  searchHistory: [],
  activeChangeTypeFilter: 'ALL',
  activeSensorFilter: 'ALL',
  minConfidenceFilter: 0,

  initApiData: async () => {
    set({ isLoadingApi: true, apiError: null });
    const results = await Promise.allSettled([
      apiService.getAois(),
      apiService.getCandidates(),
      apiService.getScenes(),
      apiService.getAuditLogs(),
      apiService.getExports(),
    ]);
    const [aoiResult, candidateResult, sceneResult, auditResult, exportResult] = results;
    const currentState = get();
    const aois = aoiResult.status === 'fulfilled' ? aoiResult.value : currentState.aois;
    const candidates = candidateResult.status === 'fulfilled' ? candidateResult.value : currentState.candidates;
    const scenes = sceneResult.status === 'fulfilled' ? sceneResult.value : currentState.scenes;
    const auditLogs = auditResult.status === 'fulfilled' ? auditResult.value : currentState.auditLogs;
    const exports = exportResult.status === 'fulfilled' ? exportResult.value : currentState.exports;
    const failedResults = results.filter((result) => result.status === 'rejected');
    const selectedCandidateId =
      candidates.find((candidate) => candidate.id === currentState.selectedCandidateId)?.id ??
      candidates[0]?.id ??
      null;

    failedResults.forEach((result) => {
      if (result.status === 'rejected') console.error('Backend data request failed', result.reason);
    });

    set({
      aois,
      candidates,
      scenes,
      auditLogs,
      exports,
      selectedCandidateId,
      isLoadingApi: false,
      apiError: failedResults.length ? `${failedResults.length} backend data request(s) failed` : null,
    });
  },

  login: (username: string, role = 'Senior GEOINT Officer (Level-3)') => {
    set({
      user: {
        username,
        name: username === 'admin' ? 'Cmdr. R. K. Sharma' : username,
        role,
        badgeNumber: 'DEF-GEO-9114',
        securityClearance: 'SECRET / NATIONAL ENCLAVE',
        isAuthenticated: true,
        isOffline: true,
      },
    });
    get().addAuditLog('LOGIN', `User ${username} authenticated into Offline Secure Enclave.`, 'SUCCESS');
  },

  loginAsGuest: () => {
    set({
      user: {
        username: 'guest.evaluator',
        name: 'Guest Defence Evaluator',
        role: 'SIH 2026 Jury / Guest Analyst',
        badgeNumber: 'SIH-JURY-2026',
        securityClearance: 'DEMO EVALUATION ENCLAVE',
        isAuthenticated: true,
        isOffline: true,
      },
    });
    get().addAuditLog('LOGIN', 'Guest evaluator signed in via Demo Mode.', 'SUCCESS');
  },

  logout: () => {
    const username = get().user.username;
    set((state) => ({
      user: {
        ...state.user,
        isAuthenticated: false,
      },
    }));
    get().addAuditLog('LOGIN', `User ${username} session terminated.`, 'SUCCESS');
  },

  setActiveAoi: (aoiId: string) => {
    set({ activeAoiId: aoiId });
    const aoi = get().aois.find((a) => a.id === aoiId);
    if (aoi) {
      get().addAuditLog('UPDATE_AOI', `Switched active surveillance Area of Interest to ${aoi.name} (${aoi.region}).`, 'SUCCESS');
    }
  },

  selectCandidate: (candidateId: string | null) => {
    set({ selectedCandidateId: candidateId });
  },

  setCandidateStatus: async (candidateId: string, status: CandidateStatus, note?: string) => {
    const userRole = get().user.name;
    await apiService.updateCandidateStatus(candidateId, status, note);
    const updatedCandidate = await apiService.getCandidateById(candidateId);
    set((state) => ({
      candidates: state.candidates.map((candidate) => candidate.id === candidateId ? updatedCandidate : candidate),
    }));
    const event = status === 'confirmed' ? 'CONFIRM_CANDIDATE' : status === 'rejected' ? 'REJECT_CANDIDATE' : 'CONFIRM_CANDIDATE';
    await get().addAuditLog(
      event,
      `Candidate ${candidateId} transitioned to ${status.toUpperCase()} by ${userRole}.${note ? ` Note: "${note}"` : ''}`,
      'SUCCESS'
    );
  },

  addAnalystNote: async (candidateId: string, note: string) => {
    const userRole = get().user.name;
    await apiService.addAnalystNote(candidateId, note);
    const updatedCandidate = await apiService.getCandidateById(candidateId);
    set((state) => ({
      candidates: state.candidates.map((candidate) => candidate.id === candidateId ? updatedCandidate : candidate),
    }));
    await get().addAuditLog('ADD_NOTE', `Note appended to ${candidateId} by ${userRole}.`, 'SUCCESS');
  },

  setMapLayer: (layer) => set({ mapLayer: layer }),
  setEvidenceActiveLayer: (layer) => set({ evidenceActiveLayer: layer }),
  setComparisonMode: (mode) => set({ comparisonMode: mode }),
  setOpacityValue: (val) => set({ opacityValue: val }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  addSearchHistory: (query: string) => {
    if (!query.trim()) return;
    set((state) => ({
      searchHistory: [query, ...state.searchHistory.filter((q) => q !== query)].slice(0, 10),
    }));
  },

  setFilterChangeType: (type: string) => set({ activeChangeTypeFilter: type }),
  setFilterSensor: (sensor: string) => set({ activeSensorFilter: sensor }),
  setFilterConfidence: (confidence: number) => set({ minConfidenceFilter: confidence }),

  createExport: async (title, format, aoi, candidateIds) => {
    const newExport = await apiService.createExportPackage({
      title,
      format,
      aoi,
      exportedBy: get().user.name,
      candidate_ids: candidateIds,
    });
    set((state) => ({ exports: [newExport, ...state.exports.filter((item) => item.id !== newExport.id)] }));
  },

  addAuditLog: async (eventType, details, status = 'SUCCESS') => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const user = get().user;
    const newLog: AuditLog = {
      id: `AUD-${crypto.randomUUID()}`,
      timestamp,
      eventType,
      user: user.name,
      role: user.role,
      ipAddress: 'Not recorded',
      details,
      status,
    };

    try {
      const response = await apiService.addAuditLog(newLog);
      set((state) => ({ auditLogs: [response.entry, ...state.auditLogs].slice(0, 100) }));
    } catch (error) {
      console.error('Backend audit write failed:', error);
      set({ apiError: error instanceof Error ? error.message : 'Backend audit write failed' });
    }
  },
}));

// Auto-trigger API fetch when module loads
useGeointStore.getState().initApiData();
