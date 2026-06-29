export const frontendEnv = {
  apiBaseUrl: (import.meta.env.VITE_OTT_API_BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, ''),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  appEnv: import.meta.env.VITE_APP_ENV || 'development'
};

export function assertFrontendEnv(): void {
  const missing: string[] = [];
  if (!frontendEnv.apiBaseUrl) missing.push('VITE_OTT_API_BASE_URL');
  if (!frontendEnv.supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!frontendEnv.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing frontend env values: ${missing.join(', ')}`);
  }
}
