#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:4000';
let pass = 0, warn = 0, fail = 0;
function ok(label, detail='') { pass++; console.log(`PASS  ${label}${detail ? ' — ' + detail : ''}`); }
function bad(label, detail='') { fail++; console.log(`FAIL  ${label}${detail ? ' — ' + detail : ''}`); }
async function getJson(url) { const r = await fetch(url); const t = await r.text(); let p; try { p = JSON.parse(t); } catch { p = t; } if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${t}`); return p; }

console.log('OTT Master Frontend — Phase 3J Accounting / Billing Integration Smoke Test');
console.log(`API base: ${API_BASE}`);
console.log(`Started: ${new Date().toISOString()}\n`);

try {
  const htmlPath = new URL('../live-server/ui/accounting-billing.html', import.meta.url).pathname;
  const jsPath = new URL('../live-server/ui/accounting-billing.js', import.meta.url).pathname;
  const apiPath = new URL('../live-server/api/ott-api-client.js', import.meta.url).pathname;
  if (existsSync(htmlPath)) ok('accounting-billing.html exists'); else bad('accounting-billing.html missing');
  if (existsSync(jsPath)) ok('accounting-billing.js exists'); else bad('accounting-billing.js missing');
  if (existsSync(apiPath)) {
    const api = await readFile(apiPath, 'utf8');
    if (api.includes('accountingStats') && api.includes('/api/v1/accounting/invoice-preview')) ok('API client includes accounting endpoints'); else bad('API client missing accounting endpoints');
  } else bad('ott-api-client.js missing');
  const health = await getJson(`${API_BASE}/health`);
  ok('/health', health?.success === true ? 'success=true' : 'responded');
  const version = await getJson(`${API_BASE}/api/v1/version`);
  ok('/api/v1/version', `${version?.data?.version || 'unknown'} ${version?.data?.phase || ''}`.trim());
} catch (e) {
  bad('smoke test error', e.message);
}
console.log('\n=== Smoke Test Summary ===');
console.log(`PASS: ${pass}`); console.log(`WARN: ${warn}`); console.log(`FAIL: ${fail}`);
if (fail) { console.log('\nResult: FAIL — fix the failed item before continuing.'); process.exit(1); }
console.log('\nResult: PASS — Phase 3J frontend package checks completed.');
