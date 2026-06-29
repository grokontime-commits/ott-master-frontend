import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const projectRoot = path.resolve(scriptDir, '..');
const apiBase = process.env.OTT_API_BASE_URL || 'http://127.0.0.1:4000';

let pass = 0;
let warn = 0;
let fail = 0;

function log(kind, message) {
  if (kind === 'PASS') pass += 1;
  if (kind === 'WARN') warn += 1;
  if (kind === 'FAIL') fail += 1;
  console.log(`${kind.padEnd(5)} ${message}`);
}

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), 'utf8');
}

function exists(relPath) {
  const ok = fs.existsSync(path.join(projectRoot, relPath));
  log(ok ? 'PASS' : 'FAIL', `${relPath} ${ok ? 'exists' : 'missing'}`);
  return ok;
}

async function fetchJson(pathname) {
  const response = await fetch(`${apiBase}${pathname}`);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, payload };
}

async function checkPublicEndpoint(pathname, label) {
  try {
    const { response, payload } = await fetchJson(pathname);
    if (!response.ok) {
      log('FAIL', `${label} returned HTTP ${response.status}`);
      return;
    }
    log('PASS', `${label} — ${payload?.success === true ? 'success=true' : 'reachable'}`);
  } catch (error) {
    log('FAIL', `${label} failed: ${error.message}`);
  }
}

async function checkProtectedEndpointExists(pathname, label) {
  try {
    const { response, payload } = await fetchJson(pathname);
    const code = payload?.error?.code;
    if (response.status === 401 || response.status === 403 || code === 'UNAUTHORIZED' || code === 'FORBIDDEN') {
      log('PASS', `${label} exists and is protected (${code || response.status})`);
      return;
    }
    if (response.ok || payload?.success === true) {
      log('PASS', `${label} exists and returned success`);
      return;
    }
    if (response.status === 404) {
      log('FAIL', `${label} returned 404`);
      return;
    }
    if (response.status >= 500) {
      log('FAIL', `${label} returned ${response.status}`);
      return;
    }
    log('WARN', `${label} returned ${response.status} / ${code || 'unknown code'}`);
  } catch (error) {
    log('FAIL', `${label} failed: ${error.message}`);
  }
}

console.log('OTT Master Frontend — Phase 3N Operational Dashboard Smoke Test');
console.log(`API base: ${apiBase}`);
console.log(`Started: ${new Date().toISOString()}`);
console.log(`Smoke script folder: ${scriptDir}`);
console.log(`Project root: ${projectRoot}\n`);

const htmlOk = exists('live-server/ui/operational-integration-dashboard.html');
const jsOk = exists('live-server/ui/operational-integration-dashboard.html.js');
exists('live-server/ui/phase3n.css');
const apiOk = exists('live-server/api/ott-api-client.js');

if (htmlOk) {
  const html = read('live-server/ui/operational-integration-dashboard.html');
  const expected = [
    'Operational Integration Dashboard',
    'Run Read-Only Operational Test',
    'data-check="manifest"',
    'data-check="cargo"',
    'data-check="recovery"',
    'data-check="ptt"',
    'data-check="warehouse"',
    'data-check="damage"',
    'data-check="release"',
    'data-check="forklift"',
    'data-check="equipment"',
    'data-check="accounting"',
    'data-check="customerPortal"',
    '../api/ott-api-client.js',
    '../auth/ott-auth.js'
  ];
  for (const token of expected) {
    log(html.includes(token) ? 'PASS' : 'FAIL', `HTML includes ${token}`);
  }
}

if (jsOk) {
  const js = read('live-server/ui/operational-integration-dashboard.html.js');
  const expected = [
    'runAllReadOnly',
    'manifestStats',
    'cargoMawbs',
    'recoveryStats',
    'warehouseStats',
    'damageStats',
    'releaseStats',
    'forkliftStats',
    'equipmentStats',
    'accountingStats',
    'customerPortalStats',
    'pttStats',
    'pttDocuments'
  ];
  for (const token of expected) {
    log(js.includes(token) ? 'PASS' : 'FAIL', `Dashboard JS includes ${token}`);
  }
  const forbiddenDefaultWrites = [
    'createRecoveryJob(',
    'createWarehouseInspection(',
    'createReleaseOrder(',
    'createForkliftJob(',
    'createEquipmentReturnJob(',
    'createInvoicePreview('
  ];
  for (const token of forbiddenDefaultWrites) {
    log(!js.includes(token) ? 'PASS' : 'FAIL', `Dashboard default test avoids write method ${token}`);
  }
}

if (apiOk) {
  const api = read('live-server/api/ott-api-client.js');
  const requiredApiTokens = [
    'manifestStats',
    'cargoMawbs',
    'recoveryStats',
    'warehouseStats',
    'damageStats',
    'releaseStats',
    'forkliftStats',
    'equipmentStats',
    'accountingStats',
    'customerPortalStats',
    'pttStats',
    'pttDocuments'
  ];
  for (const token of requiredApiTokens) {
    log(api.includes(token) ? 'PASS' : 'FAIL', `API client includes ${token}`);
  }
  const pttRoutes = [
    '/api/v1/ptt/stats',
    '/api/v1/ptt/documents',
    '/api/v1/ptt/recovery-jobs/',
    '/api/v1/ptt/documents/${encodeURIComponent(documentId)}/use-for-recovery'
  ];
  for (const token of pttRoutes) {
    log(api.includes(token) ? 'PASS' : 'FAIL', `API client includes PTT route ${token}`);
  }
}

await checkPublicEndpoint('/health', '/health');
await checkPublicEndpoint('/api/v1/version', '/api/v1/version');
await checkProtectedEndpointExists('/api/v1/manifest/stats', 'manifest stats');
await checkProtectedEndpointExists('/api/v1/recovery/stats', 'recovery stats');
await checkProtectedEndpointExists('/api/v1/warehouse/stats', 'warehouse stats');
await checkProtectedEndpointExists('/api/v1/damage/stats', 'damage stats');
await checkProtectedEndpointExists('/api/v1/release/stats', 'release stats');
await checkProtectedEndpointExists('/api/v1/forklift/stats', 'forklift stats');
await checkProtectedEndpointExists('/api/v1/equipment/stats', 'equipment stats');
await checkProtectedEndpointExists('/api/v1/accounting/stats', 'accounting stats');
await checkProtectedEndpointExists('/api/v1/ptt/stats', 'ptt stats');
await checkProtectedEndpointExists('/api/v1/ptt/documents?limit=5&offset=0', 'ptt documents');
await checkProtectedEndpointExists('/api/v1/customer-portal/stats', 'customer portal stats');

console.log('\n=== Smoke Test Summary ===');
console.log(`PASS: ${pass}`);
console.log(`WARN: ${warn}`);
console.log(`FAIL: ${fail}`);

if (fail > 0) {
  console.log('\nResult: FAIL — fix failed items before continuing.');
  process.exitCode = 1;
} else {
  console.log(warn > 0 ? '\nResult: PASS WITH WARNINGS' : '\nResult: PASS');
}
