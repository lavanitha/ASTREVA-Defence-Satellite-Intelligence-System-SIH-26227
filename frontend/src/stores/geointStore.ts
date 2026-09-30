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
  createExport: (title: string, format: ExportPackage['format'], aoi: string, candidateCount: number) => void;
  addAuditLog: (eventType: AuditLog['eventType'], details: string, status?: AuditLog['status']) => void;
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
    try {
      // Fetch AOIs, candidates, scenes, and audit logs from real Python backend
      const [realAois, realCandidates, realScenes, realAuditLogs] = await Promise.all([
        apiService.getAois(),
        apiService.getCandidates(),
        apiService.getScenes(),
        apiService.getAuditLogs(),
      ]);

      const selectedId = realCandidates.length > 0 ? realCandidates[0].id : get().selectedCandidateId;

      set({
        aois: realAois,
        candidates: realCandidates,
        scenes: realScenes,
        auditLogs: realAuditLogs,
        selectedCandidateId: selectedId,
        isLoadingApi: false,
      });
    } catch (err: any) {
      console.error('Production API initialization failed', err);
      set({
        aois: [], candidates: [], scenes: [], auditLogs: [], selectedCandidateId: null,
        isLoadingApi: false, apiError: err?.message || 'Backend API unavailable',
      });
    }
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
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const userRole = get().user.name;

    // Optimistic UI update
    set((state) => ({
      candidates: state.candidates.map((cand) => {
        if (cand.id === candidateId) {
          const updatedHistory = [
            ...cand.reviewHistory,
            {
              user: userRole,
              action: status === 'confirmed' ? 'CONFIRMED_ANOMALY' : status === 'rejected' ? 'REJECTED_ANOMALY' : 'STATUS_RESET_PENDING',
              timestamp,
              note: note || undefined,
            },
          ];
          const updatedNotes = note ? [...cand.analystNotes, `[${status.toUpperCase()}] ${note}`] : cand.analystNotes;
          return {
            ...cand,
            status,
            reviewHistory: updatedHistory,
            analystNotes: updatedNotes,
          };
        }
        return cand;
      }),
    }));

    const event = status === 'confirmed' ? 'CONFIRM_CANDIDATE' : status === 'rejected' ? 'REJECT_CANDIDATE' : 'CONFIRM_CANDIDATE';
    get().addAuditLog(
      event,
      `Candidate ${candidateId} transitioned to ${status.toUpperCase()} by ${userRole}.${note ? ` Note: "${note}"` : ''}`,
      'SUCCESS'
    );

    // Sync with backend API
    try {
      await apiService.updateCandidateStatus(candidateId, status, note);
    } catch (err) {
      console.warn('Backend status update warning:', err);
    }
  },

  addAnalystNote: async (candidateId: string, note: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const userRole = get().user.name;

    set((state) => ({
      candidates: state.candidates.map((cand) => {
        if (cand.id === candidateId) {
          return {
            ...cand,
            analystNotes: [...cand.analystNotes, `[${timestamp} by ${userRole}] ${note}`],
            reviewHistory: [
              ...cand.reviewHistory,
              {
                user: userRole,
                action: 'ADDED_ANALYST_NOTE',
                timestamp,
                note,
              },
            ],
          };
        }
        return cand;
      }),
    }));

    get().addAuditLog('ADD_NOTE', `Note appended to ${candidateId} by ${userRole}.`, 'SUCCESS');

    try {
      await apiService.addAnalystNote(candidateId, note);
    } catch (err) {
      console.warn('Backend note add warning:', err);
    }
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

  createExport: (title, format, aoi, candidateCount) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const newExport: ExportPackage = {
      id: `EXP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      format,
      aoi,
      candidateCount,
      fileSize: `${(Math.random() * 12 + 2).toFixed(1)} MB`,
      createdDate: timestamp,
      status: 'Ready',
      downloadUrl: '#',
      exportedBy: get().user.name,
    };

    set((state) => ({
      exports: [newExport, ...state.exports],
    }));

    get().addAuditLog('EXPORT_DATASET', `Export package created: "${title}" (${format}) containing ${candidateCount} candidates.`, 'SUCCESS');
  },

  addAuditLog: (eventType, details, status = 'SUCCESS') => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const user = get().user;
    const newLog: AuditLog = {
      id: `AUD-${Math.floor(90000 + Math.random() * 9999)}`,
      timestamp,
      eventType,
      user: user.name,
      role: user.role,
      ipAddress: '10.24.120.4 (Local Enclave)',
      details,
      status,
    };

    set((state) => ({
      auditLogs: [newLog, ...state.auditLogs].slice(0, 100),
    }));

    apiService.addAuditLog(newLog).catch(() => {});
  },
}));

// Auto-trigger API fetch when module loads
useGeointStore.getState().initApiData();
