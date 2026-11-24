import type { NormalizedImportResult, WhatsAppImportRequest } from '../types/api';
import { normalizeImportResponse } from '../utils/apiAdapters';
import { apiRequest } from './apiClient';

/**
 * POST /api/v1/whatsapp/import — Import pasted WhatsApp chat text.
 * Supports optional reference_date (YYYY-MM-DD).
 */
export async function importWhatsAppChat(
  payload: WhatsAppImportRequest
): Promise<NormalizedImportResult> {
  const body: WhatsAppImportRequest = {
    project_id: payload.project_id.trim(),
    chat_text: payload.chat_text,
  };
  if (payload.reference_date && payload.reference_date.trim()) {
    body.reference_date = payload.reference_date.trim();
  }

  return apiRequest(
    '/api/v1/whatsapp/import',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    },
    normalizeImportResponse
  );
}

/**
 * POST /api/v1/whatsapp/import-file — Import an exported WhatsApp .txt file.
 * Does NOT set Content-Type manually so the browser includes the multipart boundary.
 */
export async function importWhatsAppFile(
  projectId: string,
  file: File,
  referenceDate?: string
): Promise<NormalizedImportResult> {
  const formData = new FormData();
  formData.append('project_id', projectId.trim());
  formData.append('file', file);
  if (referenceDate && referenceDate.trim()) {
    formData.append('reference_date', referenceDate.trim());
  }

  return apiRequest(
    '/api/v1/whatsapp/import-file',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    },
    normalizeImportResponse
  );
}
