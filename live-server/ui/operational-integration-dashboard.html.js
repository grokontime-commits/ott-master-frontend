(function () {
  const $ = (id) => document.getElementById(id);
  const state = { results: [] };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function data(payload) { return payload?.data ?? payload; }
  function rows(payload) {
    const d = data(payload);
    return d?.rows || (Array.isArray(d) ? d : []);
  }

  function setOutput(label, payload, ok = true) {
    $('output').textContent = `${ok ? 'PASS' : 'FAIL'} ${label}\n` + JSON.stringify(payload, null, 2);
  }

  function setStatus(id, message, kind = 'wait') {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.className = `status-line ${kind}`;
  }

  function setLoginBadge() {
    const hasToken = Boolean(window.OTTApi?.getAccessToken?.());
    const badge = $('loginBadge');
    badge.className = hasToken ? 'badge ok' : 'badge';
    badge.textContent = hasToken ? 'Logged in' : 'Not logged in';
    $('kpiToken').textContent = hasToken ? 'Yes' : 'No';
  }

  function normalizeError(error) {
    return {
      message: error.message,
      status: error.status,
      code: error.payload?.error?.code,
      payload: error.payload
    };
  }

  function isAuthExpected(error) {
    const code = error?.payload?.error?.code;
    return code === 'UNAUTHORIZED' || code === 'FORBIDDEN' || error.status === 401 || error.status === 403;
  }

  function summarizePayload(payload) {
    const d = data(payload);
    if (Array.isArray(d)) return `${d.length} rows`;
    if (d?.rows) return `${d.rows.length} rows${typeof d.count === 'number' ? ` / count ${d.count}` : ''}`;
    if (d && typeof d === 'object') {
      const keys = Object.keys(d).slice(0, 6);
      return keys.length ? keys.map((key) => `${key}: ${typeof d[key] === 'object' ? '[object]' : d[key]}`).join(', ') : 'object';
    }
    return String(d ?? 'ok');
  }

  function recordResult(moduleName, status, detail, payload) {
    const result = { moduleName, status, detail, payload, at: new Date().toISOString() };
    state.results = state.results.filter((r) => r.moduleName !== moduleName);
    state.results.push(result);
    renderResults();
    return result;
  }

  function renderResults() {
    const pass = state.results.filter((r) => r.status === 'PASS').length;
    const warn = state.results.filter((r) => r.status === 'WARN').length;
    const fail = state.results.filter((r) => r.status === 'FAIL').length;
    $('kpiPass').textContent = pass;
    $('kpiWarn').textContent = warn;
    $('kpiFail').textContent = fail;
    $('kpiTotal').textContent = state.results.length;

    const list = $('resultList');
    if (!state.results.length) {
      list.innerHTML = '<div class="hint">No module checks have been run yet.</div>';
      return;
    }
    list.innerHTML = state.results.map((r) => `
      <div class="result-row">
        <div class="name">${escapeHtml(r.moduleName)}</div>
        <div><div>${escapeHtml(r.detail)}</div><div class="detail">${escapeHtml(r.at)}</div></div>
        <span class="pill ${r.status.toLowerCase()}">${escapeHtml(r.status)}</span>
      </div>
    `).join('');
  }

  async function run(label, fn) {
    try {
      const result = await fn();
      setOutput(label, result, true);
      return result;
    } catch (error) {
      const normalized = normalizeError(error);
      setOutput(label, normalized, false);
      return null;
    }
  }

  async function callReadOnly(moduleName, statusId, calls) {
    setStatus(statusId, 'Testing...', 'wait');
    const payloads = [];
    try {
      for (const item of calls) {
        const payload = await item.fn();
        payloads.push({ name: item.name, summary: summarizePayload(payload), payload });
      }
      const detail = payloads.map((p) => `${p.name}: ${p.summary}`).join(' | ');
      setStatus(statusId, detail || 'PASS', 'pass');
      recordResult(moduleName, 'PASS', detail || 'PASS', payloads);
      setOutput(`${moduleName} Read-Only`, payloads, true);
      return payloads;
    } catch (error) {
      const normalized = normalizeError(error);
      if (isAuthExpected(error)) {
        const detail = `${normalized.code || normalized.status}: ${normalized.message}`;
        setStatus(statusId, detail, 'warn');
        recordResult(moduleName, 'WARN', detail, normalized);
        setOutput(`${moduleName} Read-Only Auth Required`, normalized, true);
        return null;
      }
      const detail = `${normalized.status || ''} ${normalized.code || ''}: ${normalized.message}`.trim();
      setStatus(statusId, detail, 'fail');
      recordResult(moduleName, 'FAIL', detail, normalized);
      setOutput(`${moduleName} Read-Only`, normalized, false);
      return null;
    }
  }

  const checks = {
    manifest: () => callReadOnly('Manifest', 'statusManifest', [
      { name: 'Stats', fn: () => window.OTTApi.manifestStats() },
      { name: 'Uploads', fn: () => window.OTTApi.manifestUploads({ limit: 5, offset: 0 }) },
      { name: 'Review Queue', fn: () => window.OTTApi.manifestReviewQueue({ limit: 5, offset: 0 }) }
    ]),
    cargo: () => callReadOnly('Cargo', 'statusCargo', [
      { name: 'Status Types', fn: () => window.OTTApi.cargoStatusTypes({ limit: 20, offset: 0 }) },
      { name: 'MAWBs', fn: () => window.OTTApi.cargoMawbs({ limit: 5, offset: 0 }) }
    ]),
    recovery: () => callReadOnly('Recovery', 'statusRecovery', [
      { name: 'Stats', fn: () => window.OTTApi.recoveryStats() },
      { name: 'Drivers', fn: () => window.OTTApi.recoveryDrivers({ limit: 5, offset: 0 }) },
      { name: 'Jobs', fn: () => window.OTTApi.recoveryJobs({ limit: 5, offset: 0 }) }
    ]),
    ptt: () => callReadOnly('PTT', 'statusPtt', [
      { name: 'Stats', fn: () => window.OTTApi.pttStats() },
      { name: 'Documents', fn: () => window.OTTApi.pttDocuments({ limit: 5, offset: 0 }) }
    ]),
    warehouse: () => callReadOnly('Warehouse', 'statusWarehouse', [
      { name: 'Stats', fn: () => window.OTTApi.warehouseStats() },
      { name: 'Inspections', fn: () => window.OTTApi.warehouseInspections({ limit: 5, offset: 0 }) },
      { name: 'Ready for Release', fn: () => window.OTTApi.readyForReleaseHawbs({ limit: 5, offset: 0 }) }
    ]),
    damage: () => callReadOnly('Damage', 'statusDamage', [
      { name: 'Stats', fn: () => window.OTTApi.damageStats() },
      { name: 'Records', fn: () => window.OTTApi.damageRecords({ limit: 5, offset: 0 }) },
      { name: 'Requirements', fn: () => window.OTTApi.damageRequirements({ limit: 5, offset: 0 }) },
      { name: 'Release Blocks', fn: () => window.OTTApi.damageReleaseBlocks({ limit: 5, offset: 0 }) }
    ]),
    release: () => callReadOnly('Release', 'statusRelease', [
      { name: 'Stats', fn: () => window.OTTApi.releaseStats() },
      { name: 'Eligible HAWBs', fn: () => window.OTTApi.releaseEligibleHawbs({ limit: 5, offset: 0 }) },
      { name: 'Orders', fn: () => window.OTTApi.releaseOrders({ limit: 5, offset: 0 }) },
      { name: 'Pickup Packets', fn: () => window.OTTApi.pickupPackets({ limit: 5, offset: 0 }) }
    ]),
    forklift: () => callReadOnly('Forklift', 'statusForklift', [
      { name: 'Stats', fn: () => window.OTTApi.forkliftStats() },
      { name: 'Driver Board', fn: () => window.OTTApi.forkliftDriverBoard({ limit: 5, offset: 0 }) },
      { name: 'Jobs', fn: () => window.OTTApi.forkliftJobs({ limit: 5, offset: 0 }) }
    ]),
    equipment: () => callReadOnly('Equipment', 'statusEquipment', [
      { name: 'Stats', fn: () => window.OTTApi.equipmentStats() },
      { name: 'Types', fn: () => window.OTTApi.equipmentTypes() },
      { name: 'Records', fn: () => window.OTTApi.equipmentRecords({ limit: 5, offset: 0 }) },
      { name: 'Return Jobs', fn: () => window.OTTApi.equipmentReturnJobs({ limit: 5, offset: 0 }) }
    ]),
    accounting: () => callReadOnly('Accounting', 'statusAccounting', [
      { name: 'Stats', fn: () => window.OTTApi.accountingStats() },
      { name: 'Billing Ready MAWBs', fn: () => window.OTTApi.accountingBillingReadyMawbs({ limit: 5, offset: 0 }) },
      { name: 'Release Orders', fn: () => window.OTTApi.accountingReleaseOrders({ limit: 5, offset: 0 }) }
    ]),
    customerPortal: () => callReadOnly('Customer Portal', 'statusCustomerPortal', [
      { name: 'Stats', fn: () => window.OTTApi.customerPortalStats() },
      { name: 'Accounts', fn: () => window.OTTApi.customerPortalAccounts({ limit: 5, offset: 0 }) },
      { name: 'Audit Events', fn: () => window.OTTApi.customerPortalAuditEvents({ limit: 5, offset: 0 }) }
    ])
  };

  async function runAllReadOnly() {
    state.results = [];
    renderResults();
    const sequence = ['manifest', 'cargo', 'recovery', 'ptt', 'warehouse', 'damage', 'release', 'forklift', 'equipment', 'accounting', 'customerPortal'];
    for (const key of sequence) {
      await checks[key]();
    }
    const failed = state.results.filter((r) => r.status === 'FAIL');
    setOutput('Phase 3N-C Read-Only Operational Summary', {
      pass: state.results.filter((r) => r.status === 'PASS').length,
      warn: state.results.filter((r) => r.status === 'WARN').length,
      fail: failed.length,
      results: state.results
    }, failed.length === 0);
  }

  $('btnHealth').addEventListener('click', () => run('Health', () => window.OTTApi.health()));
  $('btnVersion').addEventListener('click', () => run('Version', () => window.OTTApi.version()));
  $('btnMe').addEventListener('click', async () => { const result = await run('Auth Me', () => window.OTTApi.me()); setLoginBadge(); return result; });
  $('btnLogin').addEventListener('click', async () => {
    const result = await run('Login', () => window.OTTAuth.loginWithPassword($('email').value.trim(), $('password').value));
    setLoginBadge();
    return result;
  });
  $('btnLogout').addEventListener('click', () => { window.OTTAuth.logout(); setLoginBadge(); setOutput('Logout', { success: true }); });
  $('btnRunReadOnly').addEventListener('click', runAllReadOnly);
  $('btnRunReadOnly2').addEventListener('click', runAllReadOnly);
  $('btnClear').addEventListener('click', () => { $('output').textContent = 'Ready.'; state.results = []; renderResults(); });

  document.querySelectorAll('[data-check]').forEach((btn) => {
    btn.addEventListener('click', () => checks[btn.dataset.check]());
  });

  setLoginBadge();
  renderResults();
})();
