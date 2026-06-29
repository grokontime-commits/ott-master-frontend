#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:4000';
let pass = 0;
let warn = 0;
let fail = 0;

function ok(label, detail = '') {
  pass += 1;
  console.log(`PASS  ${label}${detail ? ' — ' + detail : ''}`);
}

function note(label, detail = '') {
  warn += 1;
  console.log(`WARN  ${label}${detail ? ' — ' + detail : ''}`);
}

function bad(label, detail = '') {
  fail += 1;
  console.log(`FAIL  ${label}${detail ? ' — ' + detail : ''}`);
}

async function getJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  let payload;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return payload;
}

console.log('OTT Master Frontend — Phase 3L Admin Data Center Rebuild Smoke Test v6');
console.log(`API base: ${API_BASE}`);
console.log(`Started: ${new Date().toISOString()}`);
console.log(`Smoke script folder: ${__dirname}`);
console.log(`Project root: ${PROJECT_ROOT}\n`);

try {
  const htmlPath = path.join(PROJECT_ROOT, 'live-server', 'ui', 'admin-data-center.html');
  const jsPath = path.join(PROJECT_ROOT, 'live-server', 'ui', 'admin-data-center.html.js');
  const cssPath = path.join(PROJECT_ROOT, 'live-server', 'ui', 'phase3l.css');
  const apiPath = path.join(PROJECT_ROOT, 'live-server', 'api', 'ott-api-client.js');

  if (existsSync(htmlPath)) ok('admin-data-center.html exists'); else bad('admin-data-center.html missing', htmlPath);
  if (existsSync(jsPath)) ok('admin-data-center.html.js exists'); else bad('admin-data-center.html.js missing', jsPath);
  if (existsSync(cssPath)) ok('phase3l.css exists'); else bad('phase3l.css missing', cssPath);

  const duplicateContactPhoneLiteral = 'contact_' + 'contact_phone';

  if (existsSync(apiPath)) {
    ok('ott-api-client.js exists');
    const api = await readFile(apiPath, 'utf8');
    if (api.includes('createAdminPayor') && api.includes('cleanAdminPayorBody')) ok('API client includes clean admin payor create method'); else bad('API client missing clean admin payor create method');
    if (api.includes(duplicateContactPhoneLiteral)) bad('duplicate contact-phone literal present in API client'); else ok('duplicate contact-phone literal absent from API client');
    if (api.includes('metadata') && api.includes('forbiddenKeys')) ok('API client blocks metadata in admin payloads'); else note('metadata guard not detected');
    if (api.includes('adminAuditLogs') && api.includes('adminEmployees') && api.includes('adminOrganizations')) ok('API client includes Phase 3L admin endpoints'); else bad('API client missing one or more Phase 3L admin endpoints');
  } else {
    bad('ott-api-client.js missing', apiPath);
  }

  const html = existsSync(htmlPath) ? await readFile(htmlPath, 'utf8') : '';
  if (html.includes('Create Test Payor Clean') && html.includes('Admin Data Center Clean Rebuild')) ok('Admin UI includes clean payor test flow'); else bad('Admin UI missing clean payor test flow');

  const ui = existsSync(jsPath) ? await readFile(jsPath, 'utf8') : '';
  if (ui.includes('forbidInternalKeys') && ui.includes('Create Test Payor Clean')) ok('Admin UI has frontend payload guard'); else bad('Admin UI missing payload guard');
  if (ui.includes("nowCode('P3LPAYOR'") && !ui.includes("nowCode('P3L-PAYOR'")) ok('Admin UI uses DB-safe payor code format'); else bad('Admin UI payor code format may violate database constraint');
  if (ui.includes(duplicateContactPhoneLiteral)) bad('duplicate contact-phone literal present in Admin UI'); else ok('duplicate contact-phone literal absent from Admin UI');

  if (ui.includes("billingEmail: 'phase3l-payor@example.com'") && ui.includes("phone: '555-0100'") && ui.includes('requiredPayorDefaults')) ok('Admin UI create payor fills required email and phone'); else bad('Admin UI create payor does not fill required email and phone');
  if (ui.includes('forceCreateDefaults') && ui.includes('validatePayorCreateBody')) ok('Admin UI create payor protects required fields before request'); else bad('Admin UI create payor missing required-field validation');

  const apiForEmptyStringCheck = existsSync(apiPath) ? await readFile(apiPath, 'utf8') : '';
  if (apiForEmptyStringCheck.includes("if (!trimmed) return") && apiForEmptyStringCheck.includes('function compactObject')) ok('API client omits empty strings before validation'); else bad('API client does not omit empty strings');

  const health = await getJson(`${API_BASE}/health`);
  ok('/health', health?.success === true ? 'success=true' : 'responded');

  const version = await getJson(`${API_BASE}/api/v1/version`);
  ok('/api/v1/version', `${version?.data?.version || 'unknown'} ${version?.data?.phase || ''}`.trim());
} catch (error) {
  bad('smoke test error', error.message);
}

console.log('\n=== Smoke Test Summary ===');
console.log(`PASS: ${pass}`);
console.log(`WARN: ${warn}`);
console.log(`FAIL: ${fail}`);

if (fail) {
  console.log('\nResult: FAIL — fix the failed item before continuing.');
  process.exitCode = 1;
} else {
  console.log('\nResult: PASS — Phase 3L frontend package checks completed.');
}
