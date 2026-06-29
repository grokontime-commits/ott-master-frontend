import { frontendEnv } from '../config/env';
import { supabase } from '../auth/supabaseAuth';

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

export class OttApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'OttApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function ottApiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${frontendEnv.apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok || payload?.success === false) {
    throw new OttApiError(
      payload?.error?.message || response.statusText || 'API request failed',
      response.status,
      payload
    );
  }

  return payload as ApiEnvelope<T>;
}

export const ottApi = {
  health: () => ottApiRequest('/health'),
  dbHealth: () => ottApiRequest('/health/db'),
  version: () => ottApiRequest('/api/v1/version'),
  me: () => ottApiRequest('/api/v1/auth/me'),
  manifestStats: () => ottApiRequest('/api/v1/manifest/stats'),
  cargoMawbs: () => ottApiRequest('/api/v1/cargo/mawbs'),
  recoveryStats: () => ottApiRequest('/api/v1/recovery/stats'),
  warehouseStats: () => ottApiRequest('/api/v1/warehouse/stats'),
  damageStats: () => ottApiRequest('/api/v1/damage/stats'),
  releaseStats: () => ottApiRequest('/api/v1/release/stats'),
  forkliftStats: () => ottApiRequest('/api/v1/forklift/stats'),
  equipmentStats: () => ottApiRequest('/api/v1/equipment/stats'),
  accountingStats: () => ottApiRequest('/api/v1/accounting/stats'),
  customerPortalStats: () => ottApiRequest('/api/v1/customer-portal/stats'),
  adminStats: () => ottApiRequest('/api/v1/admin/stats')
};
