import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Code2, ServerOff } from 'lucide-react';
import type { ApiErrorInfo } from '../types/api';
import { API_BASE_URL } from '../services/sitesyncApi';

interface ApiErrorBannerProps {
  error: ApiErrorInfo;
  title?: string;
}

export function ApiErrorBanner({ error, title }: ApiErrorBannerProps) {
  const [showCorsGuide, setShowCorsGuide] = useState(false);

  const heading =
    title ||
    (error.kind === 'NOT_FOUND'
      ? 'Resource Not Found (404)'
      : error.kind === 'VALIDATION_ERROR'
        ? 'Validation Error (422)'
        : error.kind === 'SERVER_ERROR'
          ? `Backend Server Error (${error.status ?? 500})`
          : error.kind === 'NETWORK_OR_CORS'
            ? 'Backend Unreachable or Blocked by CORS'
            : `Request Failed (${error.status ?? 'Error'})`);

  return (
    <div
      role="alert"
      className="bg-red-50/70 border border-red-200 rounded-lg p-4 text-sm text-red-900 space-y-2.5"
    >
      <div className="flex items-start gap-2.5">
        {error.kind === 'NETWORK_OR_CORS' ? (
          <ServerOff className="w-4 h-4 text-[#DC2626] mt-0.5 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-[#DC2626] mt-0.5 shrink-0" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-semibold text-[#DC2626]">{heading}</div>
          <p className="text-red-800 break-words">{error.message}</p>
          {error.details && error.details.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-red-800 space-y-0.5 pt-1 font-mono">
              {error.details.map((detail, idx) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error.kind === 'NETWORK_OR_CORS' && (
        <div className="pt-2 border-t border-red-200/80 space-y-2">
          <button
            type="button"
            onClick={() => setShowCorsGuide((v) => !v)}
            aria-expanded={showCorsGuide}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-900 hover:underline whitespace-nowrap"
          >
            {showCorsGuide ? (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>FastAPI CORS setup guide</span>
          </button>

          {showCorsGuide && (
            <div className="space-y-2 text-xs text-slate-700">
              <p>
                Ensure FastAPI is running at{' '}
                <code className="font-mono bg-white px-1 py-0.5 rounded border border-red-200">
                  {API_BASE_URL}
                </code>{' '}
                with <code className="font-mono bg-white px-1 py-0.5 rounded border border-red-200">CORSMiddleware</code>:
              </p>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-[11px] overflow-x-auto leading-relaxed">
{`from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)`}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RawResponseDrawerProps {
  data: unknown;
  label?: string;
  defaultOpen?: boolean;
}

export function RawResponseDrawer({
  data,
  label = 'Inspect Raw API Response',
  defaultOpen = false,
}: RawResponseDrawerProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (data === undefined) return null;

  const formatted =
    typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-slate-500" />
          <span>{label}</span>
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && (
        <pre className="p-4 border-t border-slate-200 bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
          {formatted}
        </pre>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
      <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-9 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
}
