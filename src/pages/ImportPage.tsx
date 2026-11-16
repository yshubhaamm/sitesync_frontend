import React, { useRef, useState } from 'react';
import { FileText, Loader2, MessageSquareText, Upload } from 'lucide-react';
import type { ApiErrorInfo, NormalizedImportResult } from '../types/api';
import {
  importWhatsAppChat,
  importWhatsAppFile,
  SiteSyncApiError,
} from '../services/sitesyncApi';
import { ApiErrorBanner } from '../components/StatusFeedback';
import { ImportResultView } from '../components/ImportResultView';

interface ImportPageProps {
  projectId: string;
  onProjectIdChange: (projectId: string) => void;
  lastImportResult: NormalizedImportResult | null;
  onImportSuccess: (projectId: string, result: NormalizedImportResult) => void;
  onNavigateToReports: () => void;
  onNavigateToProgress: () => void;
}

type ImportTab = 'paste' | 'file';

export function ImportPage({
  projectId,
  onProjectIdChange,
  lastImportResult,
  onImportSuccess,
  onNavigateToReports,
  onNavigateToProgress,
}: ImportPageProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('paste');
  const [localProjectId, setLocalProjectId] = useState(projectId);
  const [chatText, setChatText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiErrorInfo | null>(null);

  React.useEffect(() => {
    setLocalProjectId(projectId);
  }, [projectId]);

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedProjectId = localProjectId.trim();
    const trimmedChat = chatText.trim();

    if (!trimmedProjectId) {
      setValidationError('Project ID is required.');
      return;
    }
    if (!trimmedChat) {
      setValidationError('Paste WhatsApp chat lines before importing.');
      return;
    }

    setValidationError(null);
    setApiError(null);
    setSubmitting(true);
    onProjectIdChange(trimmedProjectId);

    try {
      const result = await importWhatsAppChat({
        project_id: trimmedProjectId,
        chat_text: chatText,
      });
      onImportSuccess(trimmedProjectId, result);
    } catch (err) {
      if (err instanceof SiteSyncApiError) {
        setApiError(err.info);
      } else {
        setApiError({
          kind: 'HTTP_ERROR',
          message: err instanceof Error ? err.message : 'Unexpected error during import.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedProjectId = localProjectId.trim();
    if (!trimmedProjectId) {
      setValidationError('Project ID is required.');
      return;
    }
    if (!selectedFile) {
      setValidationError('Select a WhatsApp exported .txt file to upload.');
      return;
    }

    setValidationError(null);
    setApiError(null);
    setSubmitting(true);
    onProjectIdChange(trimmedProjectId);

    try {
      const result = await importWhatsAppFile(trimmedProjectId, selectedFile);
      onImportSuccess(trimmedProjectId, result);
    } catch (err) {
      if (err instanceof SiteSyncApiError) {
        setApiError(err.info);
      } else {
        setApiError({
          kind: 'HTTP_ERROR',
          message: err instanceof Error ? err.message : 'Unexpected error during file upload.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (validationError) setValidationError(null);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">WhatsApp Import</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Parse WhatsApp site chats into construction events, duplicate checks, and milestone updates.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Import method"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'paste'}
              onClick={() => {
                setActiveTab('paste');
                setValidationError(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                activeTab === 'paste'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Paste Chat</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'file'}
              onClick={() => {
                setActiveTab('file');
                setValidationError(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                activeTab === 'file'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Export</span>
            </button>
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'paste' ? (
            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="paste-project-id"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Project ID
                  </label>
                  <input
                    id="paste-project-id"
                    type="text"
                    value={localProjectId}
                    onChange={(e) => {
                      setLocalProjectId(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g. sw-basic"
                    disabled={submitting}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F294A] focus:border-[#0F294A] disabled:bg-slate-50"
                  />
                </div>
                <div className="flex items-end text-xs text-slate-500 pb-2">
                  <span>
                    Endpoint: <code className="font-mono text-slate-700">POST /api/v1/whatsapp/import</code>
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="whatsapp-chat-text"
                    className="block text-xs font-medium text-slate-700"
                  >
                    WhatsApp Chat Text
                  </label>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setChatText(
                        '12/08/24, 9:15 am - Ramesh Kumar: ground floor brickwork shuru ho gaya\n12/08/24, 11:30 am - Suresh Site: waterproofing 50% complete hai\n12/08/24, 2:10 pm - Mahesh Store: cement aaya nahi\n12/08/24, 4:00 pm - Ramesh Kumar: kal plastering start hoga'
                      );
                      setValidationError(null);
                    }}
                    className="text-xs font-medium text-[#0F294A] hover:underline disabled:opacity-50"
                  >
                    Insert sample chat lines
                  </button>
                </div>
                <textarea
                  id="whatsapp-chat-text"
                  rows={8}
                  value={chatText}
                  onChange={(e) => {
                    setChatText(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={submitting}
                  placeholder="12/08/24, 9:15 am - Ramesh Kumar: ground floor brickwork shuru ho gaya"
                  className="w-full px-3 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F294A] focus:border-[#0F294A] disabled:bg-slate-50"
                />
              </div>

              {validationError && (
                <p role="alert" className="text-xs font-medium text-[#DC2626]">
                  {validationError}
                </p>
              )}

              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-xs text-slate-500">
                  Duplicate messages are automatically detected by the backend.
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0F294A] rounded-md hover:bg-[#163864] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submitting ? 'Importing Chat...' : 'Import Chat'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="file-project-id"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Project ID
                  </label>
                  <input
                    id="file-project-id"
                    type="text"
                    value={localProjectId}
                    onChange={(e) => {
                      setLocalProjectId(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g. sw-basic"
                    disabled={submitting}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F294A] focus:border-[#0F294A] disabled:bg-slate-50"
                  />
                </div>
                <div className="flex items-end text-xs text-slate-500 pb-2">
                  <span>
                    Endpoint:{' '}
                    <code className="font-mono text-slate-700">POST /api/v1/whatsapp/import-file</code>
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="whatsapp-export-file"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  WhatsApp Export File (.txt)
                </label>
                <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50/50 space-y-3">
                  <input
                    ref={fileInputRef}
                    id="whatsapp-export-file"
                    type="file"
                    accept=".txt,text/plain"
                    onChange={handleFileChange}
                    disabled={submitting}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
                  />

                  {selectedFile ? (
                    <div className="inline-flex items-center gap-2 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-md">
                      <FileText className="w-3.5 h-3.5 text-[#0F294A]" />
                      <span className="font-mono font-medium">{selectedFile.name}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Select an exported WhatsApp chat `.txt` file. Uploaded directly as multipart form-data.
                    </p>
                  )}
                </div>
              </div>

              {validationError && (
                <p role="alert" className="text-xs font-medium text-[#DC2626]">
                  {validationError}
                </p>
              )}

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#0F294A] rounded-md hover:bg-[#163864] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submitting ? 'Uploading & Processing...' : 'Upload & Import'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {apiError && <ApiErrorBanner error={apiError} title="WhatsApp Import Failed" />}

      {lastImportResult && (
        <ImportResultView
          result={lastImportResult}
          onNavigateToReports={onNavigateToReports}
          onNavigateToProgress={onNavigateToProgress}
        />
      )}
    </div>
  );
}
