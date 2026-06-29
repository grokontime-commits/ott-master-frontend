#!/usr/bin/env node

const API_BASE = (process.env.SMOKE_API_BASE_URL || process.env.API_BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const email = process.env.SMOKE_TEST_USER_EMAIL;
const password = process.env.SMOKE_TEST_USER_PASSWORD;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const results = { pass: 0, warn: 0, fail: 0 };
function log(kind, label, detail = '') {
  results[kind]++;
  const prefix = kind === 'pass' ? 'PASS' : kind === 'warn' ? 'WARN' : 'FAIL';
  console.log(`${prefix}  ${label}${detail ? ` — ${detail}` : ''}`);
}
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
  return json;
}
async function login() {
  if (!email || !password || !supabaseUrl || !supabaseAnonKey) return null;
  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Supabase login failed ${res.status}: ${JSON.stringify(json)}`);
  return json.access_token;
}
console.log('OTT Master Frontend — Phase 3G Cargo Release + Pickup Packet smoke test');
console.log(`API base: ${API_BASE}`);
console.log(`Started: ${new Date().toISOString()}\n`);
try {
  const health = await request('/health');
  log('pass', '/health', health?.data?.status || 'ok');
  const version = await request('/api/v1/version');
  log('pass', '/api/v1/version', `${version?.data?.version || ''} ${version?.data?.phase || ''}`.trim());
  const token = await login();
  if (!token) {
    log('warn', 'authenticated release checks skipped', 'Set SMOKE_TEST_USER_EMAIL, SMOKE_TEST_USER_PASSWORD, SUPABASE_URL, and SUPABASE_ANON_KEY to check protected endpoints.');
  } else {
    const headers = { Authorization: `Bearer ${token}` };
    const me = await request('/api/v1/auth/me', { headers });
    log('pass', '/api/v1/auth/me', `roles=${(me?.data?.roles || []).map((r) => r.role_key || r).join(',')}`);
    const stats = await request('/api/v1/release/stats', { headers });
    log('pass', '/api/v1/release/stats', `releaseOrders=${stats?.data?.releaseOrders ?? 'loaded'}`);
    const eligible = await request('/api/v1/release/eligible-hawbs?limit=5&offset=0', { headers });
    log('pass', '/api/v1/release/eligible-hawbs', `rows=${eligible?.data?.rows?.length ?? 0}`);
    const orders = await request('/api/v1/release/orders?limit=5&offset=0', { headers });
    log('pass', '/api/v1/release/orders', `rows=${orders?.data?.rows?.length ?? 0}`);
    const packets = await request('/api/v1/release/pickup-packets?limit=5&offset=0', { headers });
    log('pass', '/api/v1/release/pickup-packets', `rows=${packets?.data?.rows?.length ?? 0}`);
    const docs = await request('/api/v1/release/pickup-documents?limit=5&offset=0', { headers });
    log('pass', '/api/v1/release/pickup-documents', `rows=${docs?.data?.rows?.length ?? 0}`);
  }
} catch (error) {
  log('fail', 'Phase 3G smoke test', error.message);
}
console.log('\n=== Phase 3G Frontend Smoke Summary ===');
console.log(`PASS: ${results.pass}`);
console.log(`WARN: ${results.warn}`);
console.log(`FAIL: ${results.fail}`);
if (results.fail > 0) {
  console.log('\nResult: FAIL — fix the failed item before continuing.');
  process.exit(1);
}
console.log('\nResult: PASS — Phase 3G frontend API foundation checks completed.');
