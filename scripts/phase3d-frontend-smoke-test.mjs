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
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(payload).slice(0, 1000)}`);
  return payload;
}

async function login(config) {
  const email = process.env.OTT_TEST_USER_EMAIL || process.env.SMOKE_TEST_USER_EMAIL;
  const password = process.env.OTT_TEST_USER_PASSWORD || process.env.SMOKE_TEST_USER_PASSWORD;
  if (!email || !password) {
    warn('authenticated frontend checks skipped', 'Set OTT_TEST_USER_EMAIL and OTT_TEST_USER_PASSWORD to test Recovery Queue endpoints.');
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

function rowsOf(payload) {
  return payload?.data?.rows ?? payload?.rows ?? [];
}

async function main() {
  console.log('OTT Master Frontend — Phase 3D Recovery Queue / Driver smoke test');
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
      pass('/api/v1/auth/me', `roles=${(me?.data?.roles || []).join(',') || 'none'}`);

      const stats = await request(apiBase, '/api/v1/recovery/stats', { headers });
      pass('/api/v1/recovery/stats', `recoveryJobs=${stats?.data?.recoveryJobs ?? 'n/a'}`);

      const drivers = await request(apiBase, '/api/v1/recovery/drivers?limit=20', { headers });
      pass('/api/v1/recovery/drivers', `rows=${rowsOf(drivers).length}, count=${drivers?.data?.count ?? rowsOf(drivers).length}`);

      const jobs = await request(apiBase, '/api/v1/recovery/jobs?limit=10&includeDetails=false', { headers });
      pass('/api/v1/recovery/jobs', `rows=${rowsOf(jobs).length}, count=${jobs?.data?.count ?? rowsOf(jobs).length}`);

      const firstJob = rowsOf(jobs)[0];
      if (firstJob?.id) {
        const detail = await request(apiBase, `/api/v1/recovery/jobs/${encodeURIComponent(firstJob.id)}`, { headers });
        pass('/api/v1/recovery/jobs/:id', `job=${detail?.data?.recovery_job_number || firstJob.id}`);
      } else {
        warn('job detail skipped', 'No Recovery Queue job rows were returned.');
      }
    }

    const passCount = results.filter((r) => r.type === 'PASS').length;
    const warnCount = results.filter((r) => r.type === 'WARN').length;
    const failCount = results.filter((r) => r.type === 'FAIL').length;
    console.log('\n=== Phase 3D Frontend Smoke Summary ===');
    console.log(`PASS: ${passCount}`);
    console.log(`WARN: ${warnCount}`);
    console.log(`FAIL: ${failCount}`);
    console.log(`Finished: ${new Date().toISOString()}`);

    if (failCount > 0) process.exit(1);
    console.log('\nResult: PASS — Phase 3D Recovery Queue frontend checks completed.');
  } catch (error) {
    fail('Phase 3D frontend smoke test', error.message);
    console.log('\nResult: FAIL — fix the frontend/backend connection issue before moving on.');
    process.exit(1);
  }
}

main();
