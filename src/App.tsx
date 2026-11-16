/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  ApiErrorInfo,
  NavSection,
  NormalizedDailyReport,
  NormalizedHealth,
  NormalizedImportResult,
  NormalizedProjectState,
} from './types/api';
import {
  fetchDailyReport,
  fetchHealth,
  fetchProjectState,
  SiteSyncApiError,
} from './services/sitesyncApi';
import { LayoutShell } from './components/LayoutShell';
import { DashboardPage } from './pages/DashboardPage';
import { ImportPage } from './pages/ImportPage';
import { ProgressPage } from './pages/ProgressPage';
import { ReportsPage } from './pages/ReportsPage';

const STORAGE_PROJECT_KEY = 'sitesync_active_project_id';

function toErrorInfo(err: unknown, fallback: string): ApiErrorInfo {
  if (err instanceof SiteSyncApiError) return err.info;
  return {
    kind: 'HTTP_ERROR',
    message: err instanceof Error ? err.message : fallback,
  };
}

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [projectId, setProjectId] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_PROJECT_KEY) || '';
    } catch {
      return '';
    }
  });

  // Health state
  const [health, setHealth] = useState<NormalizedHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<ApiErrorInfo | null>(null);

  // Project state
  const [projectState, setProjectState] = useState<NormalizedProjectState | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState<ApiErrorInfo | null>(null);
  const [includeHistory, setIncludeHistory] = useState(false);

  // Recent import state (current session)
  const [lastImportResult, setLastImportResult] = useState<NormalizedImportResult | null>(null);

  // Daily report state
  const [reportDate, setReportDate] = useState('');
  const [reportFormat, setReportFormat] = useState<'json' | 'markdown'>('json');
  const [dailyReport, setDailyReport] = useState<NormalizedDailyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<ApiErrorInfo | null>(null);

  const handleProjectIdChange = useCallback((nextId: string) => {
    setProjectId(nextId);
    try {
      window.localStorage.setItem(STORAGE_PROJECT_KEY, nextId);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err) {
      setHealth(null);
      setHealthError(toErrorInfo(err, 'Unable to reach /health endpoint.'));
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadProjectState = useCallback(
    async (targetProjectId: string, withHistory = includeHistory) => {
      const trimmed = targetProjectId.trim();
      if (!trimmed) return;

      setProjectLoading(true);
      setProjectError(null);
      try {
        const data = await fetchProjectState(trimmed, withHistory);
        setProjectState(data);
      } catch (err) {
        setProjectState(null);
        setProjectError(toErrorInfo(err, `Failed to load state for ${trimmed}.`));
      } finally {
        setProjectLoading(false);
      }
    },
    [includeHistory]
  );

  const loadDailyReport = useCallback(
    async (
      targetProjectId: string,
      date: string,
      format: 'json' | 'markdown'
    ) => {
      const trimmed = targetProjectId.trim();
      if (!trimmed) return;

      setReportLoading(true);
      setReportError(null);
      try {
        const data = await fetchDailyReport({
          project_id: trimmed,
          date: date || undefined,
          format,
        });
        setDailyReport(data);
      } catch (err) {
        setDailyReport(null);
        setReportError(toErrorInfo(err, `Failed to load daily report for ${trimmed}.`));
      } finally {
        setReportLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    refreshHealth();
    if (projectId.trim()) {
      loadProjectState(projectId, includeHistory);
    }
    // Initial mount load only; subsequent project switches trigger handlers explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImportSuccess = useCallback(
    (importedProjectId: string, result: NormalizedImportResult) => {
      setLastImportResult(result);
      handleProjectIdChange(importedProjectId);

      if (result.projectState) {
        setProjectState(result.projectState);
        setProjectError(null);
      }
      if (result.latestReport && reportFormat === 'json' && !reportDate) {
        setDailyReport(result.latestReport);
        setReportError(null);
      }

      // Refresh authoritative state and daily report after successful import
      void loadProjectState(importedProjectId, includeHistory);
      void loadDailyReport(importedProjectId, reportDate, reportFormat);
    },
    [handleProjectIdChange, includeHistory, loadDailyReport, loadProjectState, reportDate, reportFormat]
  );

  const handleAfterRecompute = useCallback(
    async (targetProjectId: string, withHistory: boolean) => {
      await Promise.all([
        loadProjectState(targetProjectId, withHistory),
        loadDailyReport(targetProjectId, reportDate, reportFormat),
      ]);
    },
    [loadDailyReport, loadProjectState, reportDate, reportFormat]
  );

  return (
    <LayoutShell
      activeSection={activeSection}
      onNavigate={setActiveSection}
      projectId={projectId}
      health={health}
      healthLoading={healthLoading}
      onRefreshHealth={refreshHealth}
    >
      {activeSection === 'dashboard' && (
        <DashboardPage
          projectId={projectId}
          onProjectIdSubmit={handleProjectIdChange}
          health={health}
          healthLoading={healthLoading}
          healthError={healthError}
          projectState={projectState}
          projectLoading={projectLoading}
          projectError={projectError}
          onLoadProjectState={(id) => loadProjectState(id, includeHistory)}
          lastImportResult={lastImportResult}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'import' && (
        <ImportPage
          projectId={projectId}
          onProjectIdChange={handleProjectIdChange}
          lastImportResult={lastImportResult}
          onImportSuccess={handleImportSuccess}
          onNavigateToReports={() => setActiveSection('reports')}
          onNavigateToProgress={() => setActiveSection('progress')}
        />
      )}

      {activeSection === 'progress' && (
        <ProgressPage
          projectId={projectId}
          onProjectIdChange={handleProjectIdChange}
          projectState={projectState}
          loading={projectLoading}
          error={projectError}
          includeHistory={includeHistory}
          onIncludeHistoryChange={setIncludeHistory}
          onFetchState={loadProjectState}
          onAfterRecompute={handleAfterRecompute}
        />
      )}

      {activeSection === 'reports' && (
        <ReportsPage
          projectId={projectId}
          onProjectIdChange={handleProjectIdChange}
          reportDate={reportDate}
          onReportDateChange={setReportDate}
          viewFormat={reportFormat}
          onViewFormatChange={setReportFormat}
          report={dailyReport}
          loading={reportLoading}
          error={reportError}
          onFetchReport={loadDailyReport}
        />
      )}
    </LayoutShell>
  );
}
