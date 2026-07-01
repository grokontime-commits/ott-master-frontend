(function () {
  const state = {
    me: null,
    cargo: [],
    readyHawbs: [],
    releases: [],
    billingMawbs: [],
    equipment: [],
    pallets: [],
    reportRows: [],
    selectedMawb: null
  };

  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function dataOf(payload) { return payload?.data ?? payload; }
  function rowsOf(payload) {
    const d = dataOf(payload);
    if (Array.isArray(d)) return d;
    return d?.rows || [];
  }

  function setOutput(label, payload, ok = true) {
    $('output').textContent = label + "\n" + JSON.stringify(payload ?? {}, null, 2);
    $('output').style.borderColor = ok ? '#166534' : '#991b1b';
  }

  async function run(label, fn) {
    try {
      const result = await fn();
      setOutput('PASS ' + label, result, true);
      return result;
    } catch (error) {
      setOutput('FAIL ' + label, { message: error.message, status: error.status, payload: error.payload }, false);
      return null;
    }
  }

  // PHASE 9A-F CLEAN CFS REPORT AUTH HELPERS
  async function reportAuthLogin(email, password) {
    if (!email || !password) {
      throw new Error("Enter email and password first.");
    }

    if (!window.OTTAuth) {
      throw new Error("OTTAuth is not loaded. Confirm the page loads ../auth/ott-auth.js before cfs-full-report.js.");
    }

    if (typeof window.OTTAuth.login === "function") {
      return window.OTTAuth.login(email, password);
    }

    if (typeof window.OTTAuth.loginWithPassword === "function") {
      return window.OTTAuth.loginWithPassword(email, password);
    }

    throw new Error("OTTAuth login function was not found.");
  }

  async function reportAuthLogout() {
    if (window.OTTAuth && typeof window.OTTAuth.logout === "function") {
      return window.OTTAuth.logout();
    }

    if (window.OTTAuth && typeof window.OTTAuth.signOut === "function") {
      return window.OTTAuth.signOut();
    }

    try { localStorage.removeItem("ott_access_token"); } catch {}
    try { localStorage.removeItem("OTT_ACCESS_TOKEN"); } catch {}
    try { sessionStorage.removeItem("ott_access_token"); } catch {}

    return { loggedIn: false };
  }

  function reportIsLoggedIn() {
    if (window.OTTAuth && typeof window.OTTAuth.isLoggedIn === "function") {
      return window.OTTAuth.isLoggedIn();
    }

    if (window.OTTApi && typeof window.OTTApi.getAccessToken === "function") {
      return Boolean(window.OTTApi.getAccessToken());
    }

    try {
      return Boolean(
        localStorage.getItem("ott_access_token") ||
        localStorage.getItem("OTT_ACCESS_TOKEN") ||
        sessionStorage.getItem("ott_access_token")
      );
    } catch {
      return false;
    }
  }

  function setLoginBadge() {
    const badge = $('loginBadge');
    if (reportIsLoggedIn()) {
      badge.className = 'badge ok';
      badge.textContent = 'Logged in';
    } else {
      badge.className = 'badge';
      badge.textContent = 'Not logged in';
    }
  }

  function displayName(row) {
    return row?.display_name || row?.payor_name || row?.airline_name || row?.name || row?.code || '—';
  }

  function mawbDisplay(row) {
    return row?.mawb_number_display || row?.mawb_number || row?.mawbs?.mawb_number_display || row?.mawbs?.mawb_number || row?.mawb_id || '—';
  }

  function mawbId(row) {
    return row?.id || row?.mawb_id || row?.mawbs?.id || '';
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function hawbLinks(mawb) {
    return mawb?.mawb_hawb_links || mawb?.hawb_links || [];
  }

  function hawbFromLink(link) {
    return link?.hawbs || link?.hawb || link;
  }

  function statusPill(status) {
    const value = String(status || '—');
    const upper = value.toUpperCase();
    let cls = 'status-pill';
    if (upper.includes('READY') || upper.includes('RELEASED') || upper.includes('COMPLETE')) cls += ' status-ready';
    else if (upper.includes('NEW')) cls += ' status-new';
    else if (upper.includes('PENDING') || upper.includes('INSPECTION')) cls += ' status-warn';
    else if (upper.includes('BLOCK') || upper.includes('DAMAGE') || upper.includes('HOLD')) cls += ' status-block';
    return '<span class="' + cls + '">' + escapeHtml(value) + '</span>';
  }

  function findByMawb(list, mawb) {
    const id = normalize(mawbId(mawb));
    const display = normalize(mawbDisplay(mawb));
    return list.find((row) => {
      const rowId = normalize(row.mawb_id || row.id || row.mawbs?.id);
      const rowDisplay = normalize(mawbDisplay(row));
      return (id && rowId === id) || (display && rowDisplay === display);
    }) || null;
  }

  function findAllByMawb(list, mawb) {
    const id = normalize(mawbId(mawb));
    const display = normalize(mawbDisplay(mawb));
    return list.filter((row) => {
      const rowId = normalize(row.mawb_id || row.id || row.mawbs?.id);
      const rowDisplay = normalize(mawbDisplay(row));
      return (id && rowId === id) || (display && rowDisplay === display);
    });
  }

  function deriveOperationalStatus(mawb, release, readyCount, billing) {
    if (release?.release_status === 'READY_FOR_FORKLIFT') return { status: 'READY_FOR_FORKLIFT', source: 'Cargo Release' };
    if (release?.release_status) return { status: release.release_status, source: 'Cargo Release' };
    if (billing) return { status: 'BILLING_READY', source: 'Accounting/Billing' };
    if (readyCount > 0) return { status: 'READY_FOR_RELEASE', source: 'Warehouse Ready HAWBs' };
    if (mawb?.cargo_status) return { status: mawb.cargo_status, source: 'Cargo Management' };
    return { status: 'UNKNOWN', source: 'Fallback' };
  }

  function buildReportRows() {
    const q = normalize($('q').value);
    const rows = state.cargo.filter((mawb) => {
      if (!q) return true;
      const hay = normalize([
        mawbDisplay(mawb),
        displayName(mawb.payors || mawb.payor),
        displayName(mawb.airlines || mawb.airline),
        mawb.cargo_status
      ].join(' '));
      return hay.includes(q);
    }).map((mawb) => {
      const release = findByMawb(state.releases, mawb);
      const billing = findByMawb(state.billingMawbs, mawb);
      const equipment = findAllByMawb(state.equipment, mawb);
      const readyRows = findAllByMawb(state.readyHawbs, mawb);
      const links = hawbLinks(mawb);
      const derived = deriveOperationalStatus(mawb, release, readyRows.length, billing);

      return {
        id: mawbId(mawb),
        mawb,
        mawbNumber: mawbDisplay(mawb),
        status: derived.status,
        statusSource: derived.source,
        payor: displayName(mawb.payors || mawb.payor),
        airline: displayName(mawb.airlines || mawb.airline),
        pieces: mawb.total_pieces_expected ?? mawb.total_pieces ?? '—',
        weight: mawb.chargeable_weight_kg ?? mawb.total_weight_kg ?? '—',
        hawbCount: links.length,
        readyHawbCount: readyRows.length,
        releaseNumber: release?.release_number || '—',
        releaseStatus: release?.release_status || '—',
        pickupPacket: release?.pickup_packet_status || release?.pickup_packets?.packet_status || '—',
        invoiceNumber: billing?.invoice_number || billing?.invoiceNumber || mawb.invoice_number || '—',
        equipmentBilling: equipment.length ? equipment.map((e) => (e.equipment_type_key || '') + ' ' + (e.equipment_number || '') + ' / ' + (e.billing_status || '—')).join('; ') : '—'
      };
    });

    state.reportRows = rows;
    return rows;
  }

  function renderReport() {
    const tbody = $('reportTable').querySelector('tbody');
    const rows = buildReportRows();

    $('kpiMawbs').textContent = String(rows.length);
    $('kpiHawbs').textContent = String(rows.reduce((sum, r) => sum + Number(r.hawbCount || 0), 0));
    $('kpiReady').textContent = String(rows.reduce((sum, r) => sum + Number(r.readyHawbCount || 0), 0));
    $('kpiReleased').textContent = String(rows.filter((r) => String(r.status).includes('RELEASE')).length);
    $('kpiBilling').textContent = String(rows.filter((r) => r.invoiceNumber !== '—' || r.equipmentBilling !== '—').length);

    tbody.innerHTML = rows.map((row, index) => `
      <tr>
        <td>${statusPill(row.status)}</td>
        <td><strong>${escapeHtml(row.mawbNumber)}</strong><br><span class="muted">${escapeHtml(row.id)}</span></td>
        <td>${escapeHtml(row.payor)}</td>
        <td>${escapeHtml(row.airline)}</td>
        <td>${escapeHtml(row.pieces)}</td>
        <td>${escapeHtml(row.weight)}</td>
        <td>${escapeHtml(row.hawbCount)}</td>
        <td>${escapeHtml(row.readyHawbCount)}</td>
        <td>${escapeHtml(row.releaseNumber)}<br>${escapeHtml(row.releaseStatus)}</td>
        <td>${escapeHtml(row.pickupPacket)}</td>
        <td>${escapeHtml(row.invoiceNumber)}</td>
        <td>${escapeHtml(row.equipmentBilling)}</td>
        <td>${escapeHtml(row.statusSource)}</td>
        <td><button data-row-index="${index}">Details</button></td>
      </tr>
    `).join('') || '<tr><td colspan="14">No report rows found.</td></tr>';

    tbody.querySelectorAll('[data-row-index]').forEach((button) => {
      button.addEventListener('click', () => showDetails(Number(button.dataset.rowIndex)));
    });
  }

  function showDetails(index) {
    const row = state.reportRows[index];
    if (!row) return;

    const links = hawbLinks(row.mawb);
    const hawbs = links.map((link) => {
      const hawb = hawbFromLink(link);
      return {
        hawb: hawb?.hawb_number || hawb?.id || '—',
        status: hawb?.cargo_status || link?.link_status || '—',
        pcs: hawb?.total_pieces_expected ?? link?.expected_pieces ?? '—',
        weight: hawb?.total_weight_kg ?? link?.expected_weight_kg ?? '—',
        description: hawb?.cargo_description || '—'
      };
    });

    state.selectedMawb = row.mawb;
    $('detailBox').textContent = JSON.stringify({
      mawb: row.mawbNumber,
      operationalStatus: row.status,
      statusSource: row.statusSource,
      release: {
        releaseNumber: row.releaseNumber,
        releaseStatus: row.releaseStatus,
        pickupPacket: row.pickupPacket
      },
      billing: {
        invoiceNumber: row.invoiceNumber,
        equipmentBilling: row.equipmentBilling
      },
      hawbs
    }, null, 2);
  }

  async function loadCargo() {
    const payload = await run('Load Cargo MAWBs', () => window.OTTApi.cargoMawbs({
      q: $('q').value.trim() || undefined,
      status: $('statusFilter').value || undefined,
      includeHawbs: true,
      limit: Number($('limit').value || 100),
      offset: 0
    }));
    if (payload) state.cargo = rowsOf(payload);
    return payload;
  }

  async function optionalCall(label, fnName, params) {
    if (!window.OTTApi || typeof window.OTTApi[fnName] !== 'function') {
      setOutput('SKIP ' + label, { message: fnName + ' is not available in OTTApi yet.' }, true);
      return [];
    }
    const payload = await run(label, () => window.OTTApi[fnName](params));
    return payload ? rowsOf(payload) : [];
  }

  async function buildFullReport() {
    await loadCargo();

    const limit = Number($('limit').value || 100);
    const q = $('q').value.trim() || undefined;

    state.readyHawbs = await optionalCall('Load Ready HAWBs', 'readyForReleaseHawbs', { q, limit, offset: 0 });
    state.releases = await optionalCall('Load Accounting Release Orders', 'accountingReleaseOrders', { q, limit, offset: 0 });
    state.billingMawbs = await optionalCall('Load Billing Ready MAWBs', 'accountingBillingReadyMawbs', { q, limit, offset: 0 });
    state.equipment = await optionalCall('Load Equipment Billing', 'accountingBillingReadyEquipmentReturns', { q, limit, offset: 0 });

    renderReport();

    return {
      cargo: state.cargo.length,
      readyHawbs: state.readyHawbs.length,
      releases: state.releases.length,
      billingMawbs: state.billingMawbs.length,
      equipment: state.equipment.length,
      reportRows: state.reportRows.length
    };
  }

  function exportCsv() {
    if (!state.reportRows.length) renderReport();
    const headers = ['Status','MAWB','Payor','Airline','PCS','Weight KG','HAWBs','Ready HAWBs','Release','Pickup Packet','Invoice #','Equipment/Billing','Status Source'];
    const lines = [headers.join(',')];

    state.reportRows.forEach((row) => {
      const values = [
        row.status, row.mawbNumber, row.payor, row.airline, row.pieces, row.weight, row.hawbCount,
        row.readyHawbCount, row.releaseNumber + ' ' + row.releaseStatus, row.pickupPacket,
        row.invoiceNumber, row.equipmentBilling, row.statusSource
      ].map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"');
      lines.push(values.join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OTT_CFS_FULL_REPORT_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  $('btnLogin').addEventListener('click', async () => {
    const result = await run('Login', () => reportAuthLogin($('email').value.trim(), $('password').value));
    if (result) setLoginBadge();
  });

  $('btnLogout').addEventListener('click', async () => {
    await reportAuthLogout();
    setLoginBadge();
    setOutput('Logout', { loggedIn: false }, true);
  });

  $('btnMe').addEventListener('click', async () => {
    const result = await run('/auth/me', () => window.OTTApi.me());
    if (result) state.me = dataOf(result);
    setLoginBadge();
  });

  $('btnLoadCargo').addEventListener('click', async () => {
    const payload = await loadCargo();
    if (payload) renderReport();
  });

  $('btnBuildReport').addEventListener('click', () => run('Build CFS Full Report', buildFullReport));
  $('btnExportCsv').addEventListener('click', exportCsv);

  setLoginBadge();
})();
