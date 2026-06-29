import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const cwd = process.cwd();
const configPath = path.join(cwd, 'live-server', 'ott-config.js');
const started = new Date().toISOString();
const results = [];

function pass(label, detail = '') { results.push({ type: 'PASS', label, detail }); console.log(`PASS  ${label}${detail ? ` — ${detail}` : ''}`); }
function warn(label, detail = '') { results.push({ type: 'WARN', label, detail }); console.log(`WARN  ${label}${detail ? ` — ${detail}` : ''}`); }
function fail(label, detail = '') { results.push({ type: 'FAIL', label, detail }); console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`); }
function requireAssert(condition, message) { if (!condition) throw new Error(message); }

async function readFrontendConfig() {
  requireAssert(fs.existsSync(configPath), `Missing ${configPath}`);
  const source = fs.readFileSync(configPath, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: configPath });
  return sandbox.window.OTT_CONFIG || {};
}

async function request(apiBase, pathValue, options = {}) {
  const response = await fetch(`${apiBase}${pathValue}`, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function login(config) {
  const email = process.env.OTT_TEST_USER_EMAIL;
  const password = process.env.OTT_TEST_USER_PASSWORD;
  if (!email || !password) {
    warn('authenticated frontend checks skipped', 'Set OTT_TEST_USER_EMAIL and OTT_TEST_USER_PASSWORD to test login/admin/manifest endpoints.');
    return null;
  }

  const response = await fetch(`${String(config.SUPABASE_URL).replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: config.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${config.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Supabase login failed: ${JSON.stringify(payload)}`);
  requireAssert(payload.access_token, 'Supabase login did not return access_token');
  pass('Supabase login', email);
  return payload.access_token;
}

async function main() {
  console.log('OTT Master Frontend — Phase 3B smoke test');
  console.log(`Started: ${started}`);

  try {
    const config = await readFrontendConfig();
    requireAssert(config.API_BASE_URL, 'API_BASE_URL is missing in live-server/ott-config.js');
    requireAssert(config.SUPABASE_URL, 'SUPABASE_URL is missing in live-server/ott-config.js');
    requireAssert(config.SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY is missing in live-server/ott-config.js');
    pass('frontend config loaded', config.API_BASE_URL);

    const apiBase = String(config.API_BASE_URL).replace(/\/$/, '');
    const health = await request(apiBase, '/health');
    pass('/health', health?.data?.status || 'ok');

    const version = await request(apiBase, '/api/v1/version');
    pass('/api/v1/version', `${version?.data?.version || 'unknown'} ${version?.data?.phase || ''}`.trim());

    const token = await login(config);
    if (token) {
      const headers = { Authorization: `Bearer ${token}` };
      const me = await request(apiBase, '/api/v1/auth/me', { headers });
      pass('/api/v1/auth/me', `roles=${(me?.data?.roles || []).map((r) => r.roleKey || r.role_key || r).join(',')}`);
      const payors = await request(apiBase, '/api/v1/admin/payors?isActive=true&limit=10', { headers });
      pass('/api/v1/admin/payors', `rows=${payors?.data?.rows?.length ?? 0}`);
      const manifestStats = await request(apiBase, '/api/v1/manifest/stats', { headers });
      pass('/api/v1/manifest/stats', JSON.stringify(manifestStats?.data || {}));
      const reviewQueue = await request(apiBase, '/api/v1/manifest/review-queue?limit=5', { headers });
      pass('/api/v1/manifest/review-queue', `rows=${reviewQueue?.data?.rows?.length ?? 0}`);
    }
  } catch (error) {
    fail('Phase 3B frontend smoke test', error.message);
  }

  const counts = {
    PASS: results.filter((r) => r.type === 'PASS').length,
    WARN: results.filter((r) => r.type === 'WARN').length,
    FAIL: results.filter((r) => r.type === 'FAIL').length
  };

  console.log('\n=== Phase 3B Frontend Smoke Summary ===');
  console.log(`PASS: ${counts.PASS}`);
  console.log(`WARN: ${counts.WARN}`);
  console.log(`FAIL: ${counts.FAIL}`);

  if (counts.FAIL > 0) {
    console.log('\nResult: FAIL — fix the failed item before moving to Phase 3C.');
    process.exit(1);
  }

  console.log('\nResult: PASS — Phase 3B frontend foundation checks completed.');
}

main();
