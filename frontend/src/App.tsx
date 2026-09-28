import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { WorkspaceScreen } from './screens/WorkspaceScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ChangeAnalysisScreen } from './screens/ChangeAnalysisScreen';
import { DiscoveryScreen } from './screens/DiscoveryScreen';
import { ReviewQueueScreen } from './screens/ReviewQueueScreen';
import { ScenesScreen } from './screens/ScenesScreen';
import { ExportsScreen } from './screens/ExportsScreen';
import { SystemScreen } from './screens/SystemScreen';
import { LoginScreen } from './screens/LoginScreen';
import { CandidateDetailScreen } from './screens/CandidateDetailScreen';
import { AoiManagerScreen } from './screens/AoiManagerScreen';
import { AuditScreen } from './screens/AuditScreen';
import { useGeointStore } from './stores/geointStore';

export const App: React.FC = () => {
  const { user } = useGeointStore();

  return (
    <Routes>
      {/* Standalone Authentication Terminal */}
      <Route path="/login" element={<LoginScreen />} />

      {/* Main Operational Enclave Application Shell */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        
        {/* 8 Primary Sidebar Operations Modules */}
        <Route path="/workspace" element={<WorkspaceScreen />} />
        <Route path="/search" element={<SearchScreen />} />
        <Route path="/change-analysis" element={<ChangeAnalysisScreen />} />
        <Route path="/discovery" element={<DiscoveryScreen />} />
        <Route path="/review-queue" element={<ReviewQueueScreen />} />
        <Route path="/scenes" element={<ScenesScreen />} />
        <Route path="/exports" element={<ExportsScreen />} />
        <Route path="/system" element={<SystemScreen />} />

        {/* 4 Specialized Operational Intelligence Screens */}
        <Route path="/candidate/:id" element={<CandidateDetailScreen />} />
        <Route path="/sectors" element={<AoiManagerScreen />} />
        <Route path="/aoi" element={<Navigate to="/sectors" replace />} />
        <Route path="/audit" element={<AuditScreen />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
