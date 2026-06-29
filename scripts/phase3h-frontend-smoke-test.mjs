#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const required = [
  'live-server/ui/forklift-driver-board.html',
  'live-server/ui/forklift-driver-board.js',
  'live-server/ui/phase3h.css',
  'live-server/api/ott-api-client.js',
  'live-server/auth/ott-auth.js',
  'live-server/auth/ott-permissions.js'
];

let fail = 0;
for (const file of required) {
  if (fs.existsSync(path.join(process.cwd(), file))) console.log(`PASS ${file}`);
  else { console.log(`FAIL missing ${file}`); fail++; }
}
const api = fs.readFileSync(path.join(process.cwd(), 'live-server/api/ott-api-client.js'), 'utf8');
for (const fn of ['forkliftStats', 'forkliftDriverBoard', 'createForkliftJob', 'confirmForkliftCargo', 'recordForkliftPalletExchange', 'captureForkliftSignature', 'finalizeForkliftJob']) {
  if (api.includes(fn)) console.log(`PASS API helper ${fn}`);
  else { console.log(`FAIL missing API helper ${fn}`); fail++; }
}
console.log(`\nResult: ${fail ? 'FAIL' : 'PASS'} — Phase 3H frontend package file check ${fail ? 'failed' : 'completed'}.`);
process.exit(fail ? 1 : 0);
