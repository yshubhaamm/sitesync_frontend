import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  FileText,
  HardHat,
  LayoutDashboard,
  Menu,
  MessageSquarePlus,
  RefreshCw,
  X,
} from 'lucide-react';
import type { NavSection, NormalizedHealth } from '../types/api';
import { API_BASE_URL } from '../services/sitesyncApi';

interface LayoutShellProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  projectId: string;
  health: NormalizedHealth | null;
  healthLoading: boolean;
  onRefreshHealth: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'import', label: 'WhatsApp Import', icon: MessageSquarePlus },
  { id: 'progress', label: 'Project Progress', icon: BarChart3 },
  { id: 'reports', label: 'Daily Reports', icon: FileText },
];

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  import: 'WhatsApp Import',
  progress: 'Project Progress',
  reports: 'Daily Reports',
};

export function LayoutShell({
  activeSection,
  onNavigate,
  projectId,
  health,
  healthLoading,
  onRefreshHealth,
  children,
}: LayoutShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectNav = (id: NavSection) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  const healthLabel = healthLoading
    ? 'Checking API'
    : health?.online
      ? 'API Online'
      : 'API Offline';

  const healthColorClass = healthLoading
    ? 'text-slate-600'
    : health?.online
      ? 'text-[#16A34A]'
      : 'text-[#DC2626]';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-20">
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-slate-200 shrink-0">
          <div className="w-7 h-7 rounded-md bg-[#0F294A] text-white flex items-center justify-center shrink-0">
            <HardHat className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-base tracking-tight text-[#0F294A] whitespace-nowrap">
            SiteSync AI
          </span>
        </div>

        <nav aria-label="Primary Navigation" className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium whitespace-nowrap ${
                  active
                    ? 'bg-[#0F294A] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3.5 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span>Selected Project</span>
            <span className="font-mono text-slate-800 truncate max-w-[110px]">
              {projectId.trim() || 'None'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Backend</span>
            <span className={`font-medium ${healthColorClass}`}>{healthLabel}</span>
          </div>
          <div className="pt-1 font-mono text-[11px] text-slate-400 truncate" title={API_BASE_URL}>
            {API_BASE_URL}
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full border-r border-slate-200 flex flex-col z-50">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#0F294A] text-white flex items-center justify-center">
                  <HardHat className="w-4 h-4" />
                </div>
                <span className="font-display font-bold text-base text-[#0F294A]">
                  SiteSync AI
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav aria-label="Mobile Navigation" className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#0F294A] text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>Project</span>
                <span className="font-mono text-slate-800">{projectId.trim() || 'None'}</span>
              </div>
              <div className="font-mono text-[11px] text-slate-400 truncate">{API_BASE_URL}</div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">SiteSync AI</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
              <h1 className="font-display font-semibold text-slate-900 truncate">
                {SECTION_TITLES[activeSection]}
              </h1>
              {projectId.trim() && (
                <>
                  <span className="text-slate-300 hidden md:inline" aria-hidden="true">·</span>
                  <span className="hidden md:inline font-mono text-xs text-slate-600 truncate max-w-[180px]">
                    {projectId.trim()}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium ${healthColorClass} whitespace-nowrap`}>
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>{healthLabel}</span>
            </div>
            <button
              type="button"
              onClick={onRefreshHealth}
              disabled={healthLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Health</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
