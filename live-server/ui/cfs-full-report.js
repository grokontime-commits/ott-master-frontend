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
        <td><span class="cfs-mawb-number">${escapeHtml(row.mawbNumber)}</span><span class="cfs-row-id" title="${escapeHtml(row.id)}">${escapeHtml(row.id)}</span></td>
        <td>${escapeHtml(row.payor)}</td>
        <td>${escapeHtml(row.airline)}</td>
        <td>${escapeHtml(row.pieces)}</td>
        <td>${escapeHtml(row.weight)}</td>
        <td>${escapeHtml(row.hawbCount)}</td>
        <td>${escapeHtml(row.readyHawbCount)}</td>
        <td><span class="cfs-release-cell">${escapeHtml(row.releaseNumber)}<br>${escapeHtml(row.releaseStatus)}</span></td>
        <td>${escapeHtml(row.pickupPacket)}</td>
        <td>${escapeHtml(row.invoiceNumber)}</td>
        <td><span class="cfs-equipment-cell">${escapeHtml(row.equipmentBilling)}</span></td>
        <td>${escapeHtml(row.statusSource)}</td>
        <td><button data-row-index="${index}">Details</button></td>
      </tr>
    `).join('') || '<tr><td colspan="14">No report rows found.</td></tr>';

    updatePrintHeader();

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

  // PHASE 9B-A CFS REPORT COLUMN CONTROLS CUSTOMER SAFE EXPORT
  const reportColumns = [
    { key: 'status', label: 'Status', index: 1, customerSafe: true },
    { key: 'mawb', label: 'MAWB', index: 2, customerSafe: true },
    { key: 'payor', label: 'Payor', index: 3, customerSafe: true },
    { key: 'airline', label: 'Airline', index: 4, customerSafe: true },
    { key: 'pieces', label: 'PCS', index: 5, customerSafe: true },
    { key: 'weight', label: 'Weight KG', index: 6, customerSafe: true },
    { key: 'hawbs', label: 'HAWBs', index: 7, customerSafe: true },
    { key: 'readyHawbs', label: 'Ready HAWBs', index: 8, customerSafe: true },
    { key: 'release', label: 'Release', index: 9, customerSafe: true },
    { key: 'pickupPacket', label: 'Pickup Packet', index: 10, customerSafe: true },
    { key: 'invoice', label: 'Invoice #', index: 11, customerSafe: false },
    { key: 'equipment', label: 'Equipment/Billing', index: 12, customerSafe: false },
    { key: 'source', label: 'Status Source', index: 13, customerSafe: false },
    { key: 'action', label: 'Action', index: 14, customerSafe: false }
  ];

  function selectedColumnKeys(customerSafeOnly) {
    if (customerSafeOnly) {
      return reportColumns.filter((column) => column.customerSafe && column.key !== 'action').map((column) => column.key);
    }

    const controls = document.querySelectorAll('[data-report-column]');
    if (!controls.length) {
      return reportColumns.filter((column) => column.key !== 'action').map((column) => column.key);
    }

    return Array.from(controls)
      .filter((input) => input.checked)
      .map((input) => input.getAttribute('data-report-column'))
      .filter((key) => key && key !== 'action');
  }

  function columnByKey(key) {
    return reportColumns.find((column) => column.key === key);
  }

  function applyColumnVisibility() {
    const controls = document.querySelectorAll('[data-report-column]');
    if (!controls.length) return;

    const visible = new Set(
      Array.from(controls)
        .filter((input) => input.checked)
        .map((input) => input.getAttribute('data-report-column'))
    );

    reportColumns.forEach((column) => {
      const display = visible.has(column.key) ? '' : 'none';
      document.querySelectorAll('#reportTable tr > *:nth-child(' + column.index + ')').forEach((cell) => {
        cell.style.display = display;
      });
    });
  }

  function setColumnPreset(mode) {
    const tools = $('columnTools');
    if (tools) tools.classList.toggle('customer-safe-active', mode === 'customer');

    document.querySelectorAll('[data-report-column]').forEach((input) => {
      const key = input.getAttribute('data-report-column');
      const column = columnByKey(key);

      if (!column) return;

      if (mode === 'all') input.checked = true;
      if (mode === 'customer') input.checked = Boolean(column.customerSafe);
      if (mode === 'internal') input.checked = key !== 'action';
    });

    applyColumnVisibility();
  }

  function initColumnControls() {
    const grid = $('columnControlsGrid');
    if (!grid || grid.dataset.ready === '1') return;

    grid.dataset.ready = '1';

    grid.innerHTML = reportColumns.map((column) => {
      const checked = column.key === 'action' ? '' : ' checked';
      return '<label class="column-option"><input type="checkbox" data-report-column="' + escapeHtml(column.key) + '"' + checked + ' /> ' + escapeHtml(column.label) + '</label>';
    }).join('');

    grid.querySelectorAll('[data-report-column]').forEach((input) => {
      input.addEventListener('change', applyColumnVisibility);
    });

    $('btnShowAllColumns')?.addEventListener('click', () => setColumnPreset('all'));
    $('btnCustomerSafeColumns')?.addEventListener('click', () => setColumnPreset('customer'));
    $('btnResetInternalColumns')?.addEventListener('click', () => setColumnPreset('internal'));
    $('btnExportCustomerCsv')?.addEventListener('click', () => exportCsv(true));
    $('btnCustomerPrintView')?.addEventListener('click', enableCustomerPrintView);
    $('btnPrintCustomerReport')?.addEventListener('click', printCustomerReport);

    $('btnLoadCargo')?.addEventListener('click', () => {
      setTimeout(applyColumnVisibility, 500);
      setTimeout(applyColumnVisibility, 1200);
    });

    $('btnBuildReport')?.addEventListener('click', () => {
      setTimeout(applyColumnVisibility, 500);
      setTimeout(applyColumnVisibility, 1200);
    });
  }

  function reportCellValue(row, key) {
    switch (key) {
      case 'status': return row.status;
      case 'mawb': return row.mawbNumber;
      case 'payor': return row.payor;
      case 'airline': return row.airline;
      case 'pieces': return row.pieces;
      case 'weight': return row.weight;
      case 'hawbs': return row.hawbCount;
      case 'readyHawbs': return row.readyHawbCount;
      case 'release': return (row.releaseNumber || '—') + ' ' + (row.releaseStatus || '—');
      case 'pickupPacket': return row.pickupPacket;
      case 'invoice': return row.invoiceNumber;
      case 'equipment': return row.equipmentBilling;
      case 'source': return row.statusSource;
      default: return '';
    }
  }

  function csvEscape(value) {
    return '"' + String(value ?? '').replace(/"/g, '""') + '"';
  }

  // PHASE 9C-A CFS REPORT CUSTOMER PRINT VIEW
  function updatePrintHeader() {
    const now = new Date();
    const dateText = now.toLocaleString();

    if ($('printReportDate')) $('printReportDate').textContent = dateText;
    if ($('printTotalMawbs')) $('printTotalMawbs').textContent = String(state.reportRows.length);
    if ($('printTotalHawbs')) {
      $('printTotalHawbs').textContent = String(
        state.reportRows.reduce((sum, row) => sum + Number(row.hawbCount || 0), 0)
      );
    }
  }

  function enableCustomerPrintView() {
    if (!state.reportRows.length) renderReport();

    setColumnPreset('customer');
    updatePrintHeader();
    document.body.classList.add('customer-print-mode');

    setOutput('Customer Print View Ready', {
      customerSafeColumns: true,
      hiddenColumns: ['Invoice #', 'Equipment/Billing', 'Status Source', 'Action'],
      printInstruction: 'Use Print / Save PDF. Browser print dialog should use landscape orientation.'
    }, true);

    setTimeout(applyColumnVisibility, 100);
  }

  function printCustomerReport() {
    enableCustomerPrintView();

    setTimeout(() => {
      window.print();
    }, 250);
  }

  function exportCsv(customerSafeOnly = false) {
    if (!state.reportRows.length) renderReport();

    const keys = selectedColumnKeys(customerSafeOnly);
    const columns = keys.map(columnByKey).filter(Boolean);
    const headers = columns.map((column) => column.label);

    const lines = [headers.map(csvEscape).join(',')];

    state.reportRows.forEach((row) => {
      lines.push(columns.map((column) => csvEscape(reportCellValue(row, column.key))).join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = (customerSafeOnly ? 'OTT_CFS_CUSTOMER_SAFE_REPORT_' : 'OTT_CFS_FULL_REPORT_') + new Date().toISOString().slice(0, 10) + '.csv';

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setOutput(customerSafeOnly ? 'Exported Customer-Safe CSV' : 'Exported CSV', {
      rows: state.reportRows.length,
      columns: headers,
      customerSafe: customerSafeOnly
    }, true);
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
  initColumnControls();
  applyColumnVisibility();
})();
