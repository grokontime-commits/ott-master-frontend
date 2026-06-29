(function () {
  const state = {
    lastCargoRows: [],
    selectedMawb: null,
    statusTypes: [],
    payors: [],
    airlines: []
  };

  const $ = (id) => document.getElementById(id);
  const output = $('output');
  const status = $('status');

  function showOk(label, payload) {
    status.innerHTML = `<span class="pass">PASS</span> ${escapeHtml(label)}`;
    output.textContent = JSON.stringify(payload, null, 2);
  }

  function showError(label, error) {
    status.innerHTML = `<span class="fail">FAIL</span> ${escapeHtml(label)}`;
    output.textContent = JSON.stringify({ message: error.message, status: error.status, payload: error.payload }, null, 2);
  }

  async function run(label, fn) {
    status.textContent = `Running ${label}...`;
    try {
      const payload = await fn();
      showOk(label, payload);
      return payload;
    } catch (error) {
      showError(label, error);
      throw error;
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function dataOf(payload) {
    return payload?.data ?? payload;
  }

  function rowsOf(payload) {
    const data = dataOf(payload);
    return data?.rows ?? [];
  }

  function countOf(payload) {
    const data = dataOf(payload);
    return Number(data?.count ?? rowsOf(payload).length ?? 0);
  }

  function requireValue(id, label) {
    const value = $(id).value.trim();
    if (!value) throw new Error(`${label} is required.`);
    return value;
  }

  function setLoginBadge() {
    const badge = $('loginBadge');
    if (window.OTTAuth?.isLoggedIn()) {
      badge.className = 'badge ok';
      badge.textContent = 'Logged in';
    } else {
      badge.className = 'badge';
      badge.textContent = 'Not logged in';
    }
  }

  function displayName(row, fallback = '—') {
    return row?.display_name || row?.payor_name || row?.payor_code || row?.airline_name || row?.airline_code || row?.location_name || fallback;
  }

  function nestedPayor(mawb) {
    return mawb?.payors || mawb?.payor || null;
  }

  function nestedAirline(mawb) {
    return mawb?.airlines || mawb?.airline || null;
  }

  function statusPill(statusValue) {
    const value = String(statusValue || '—');
    const lower = value.toLowerCase();
    let cls = 'status-pill';
    if (value === 'NEW') cls += ' new';
    if (lower.includes('damage') || lower.includes('block')) cls += ' blocked';
    if (lower.includes('pending') || lower.includes('inspection')) cls += ' warn';
    return `<span class="${cls}">${escapeHtml(value)}</span>`;
  }

  function fillSelect(selectId, rows, labelFn, valueFn = (row) => row.id, emptyLabel = 'All') {
    const select = $(selectId);
    select.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>`;
    rows.forEach((row) => {
      const option = document.createElement('option');
      option.value = valueFn(row);
      option.textContent = labelFn(row);
      select.appendChild(option);
    });
  }

  function fillStatusSelect(rows) {
    const unique = [];
    const seen = new Set();
    rows.forEach((row) => {
      const key = row.status_key || row.status_code || row.cargo_status || row.status || row.key;
      if (!key || seen.has(key)) return;
      seen.add(key);
      unique.push(row);
    });
    fillSelect(
      'statusFilter',
      unique,
      (row) => `${row.status_key || row.status_code || row.cargo_status || row.status || row.key}${row.display_name ? ` — ${row.display_name}` : ''}`,
      (row) => row.status_key || row.status_code || row.cargo_status || row.status || row.key,
      'All statuses'
    );
  }

  function buildCargoQuery(overrides = {}) {
    return {
      q: $('cargoSearch').value.trim(),
      status: $('statusFilter').value,
      payorId: $('payorFilter').value,
      airlineId: $('airlineFilter').value,
      includeHawbs: true,
      limit: Number($('limit').value || 20),
      offset: 0,
      ...overrides
    };
  }

  function renderCargoRows(payload) {
    const rows = rowsOf(payload);
    state.lastCargoRows = rows;
    const tbody = $('cargoTable').querySelector('tbody');
    tbody.innerHTML = '';

    rows.forEach((mawb) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${statusPill(mawb.cargo_status)}</td>
        <td><strong>${escapeHtml(mawb.mawb_number_display || mawb.mawb_number || '—')}</strong></td>
        <td>${escapeHtml(displayName(nestedPayor(mawb)))}</td>
        <td>${escapeHtml(displayName(nestedAirline(mawb)))}</td>
        <td>${escapeHtml(mawb.total_pieces_expected ?? '—')}</td>
        <td>${escapeHtml(mawb.total_weight_kg ?? '—')}</td>
        <td>${escapeHtml(mawb.last_free_day || '—')}</td>
        <td>${escapeHtml(mawb.created_at || '—')}</td>
        <td><button data-mawb-id="${escapeHtml(mawb.id)}">Select</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-mawb-id]').forEach((button) => {
      button.addEventListener('click', () => {
        $('selectedMawbId').value = button.getAttribute('data-mawb-id');
      });
    });

    updateKpis(payload);
    return rows;
  }

  function updateKpis(payload) {
    const rows = rowsOf(payload);
    $('kpiRows').textContent = String(rows.length);
    $('kpiCount').textContent = String(countOf(payload));
    $('kpiNew').textContent = String(rows.filter((row) => row.cargo_status === 'NEW').length);
    $('kpiHawbs').textContent = String(getHawbLinks(state.selectedMawb).length);
  }

  function detailItem(label, value) {
    return `
      <div class="detail-item">
        <div class="detail-label">${escapeHtml(label)}</div>
        <div class="detail-value">${value === '__HTML__' ? '' : escapeHtml(value ?? '—')}</div>
      </div>
    `;
  }

  function renderMawbDetail(mawb) {
    state.selectedMawb = mawb;
    const html = [
      detailItem('MAWB', mawb.mawb_number_display || mawb.mawb_number),
      `<div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusPill(mawb.cargo_status)}</div></div>`,
      detailItem('Payor', displayName(nestedPayor(mawb))),
      detailItem('Airline', displayName(nestedAirline(mawb))),
      detailItem('PCS Expected', mawb.total_pieces_expected),
      detailItem('Weight KG', mawb.total_weight_kg),
      detailItem('Chargeable KG', mawb.chargeable_weight_kg),
      detailItem('Origin', mawb.origin_code),
      detailItem('Destination', mawb.destination_code),
      detailItem('Flight', mawb.flight_number),
      detailItem('Last Free Day', mawb.last_free_day),
      detailItem('Created Source', mawb.source_type || mawb.source_reference)
    ].join('');
    $('mawbDetail').innerHTML = html;
    renderHawbs(mawb);
    renderStatusHistory(mawb.status_history || []);
    $('kpiHawbs').textContent = String(getHawbLinks(mawb).length);
  }

  function getHawbLinks(mawb) {
    return mawb?.mawb_hawb_links || mawb?.hawb_links || [];
  }

  function hawbFromLink(link) {
    return link?.hawbs || link?.hawb || link;
  }

  function renderHawbs(mawb) {
    const tbody = $('hawbTable').querySelector('tbody');
    tbody.innerHTML = '';
    getHawbLinks(mawb).forEach((link) => {
      const hawb = hawbFromLink(link);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${statusPill(hawb?.cargo_status || link?.link_status)}</td>
        <td><strong>${escapeHtml(hawb?.hawb_number || '—')}</strong></td>
        <td>${escapeHtml(hawb?.total_pieces_expected ?? link?.expected_pieces ?? '—')}</td>
        <td>${escapeHtml(hawb?.total_weight_kg ?? link?.expected_weight_kg ?? '—')}</td>
        <td>${escapeHtml(hawb?.shipper_name || '—')}</td>
        <td>${escapeHtml(hawb?.consignee_name || '—')}</td>
        <td>${escapeHtml(hawb?.cargo_description || '—')}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderStatusHistory(rows) {
    const tbody = $('historyTable').querySelector('tbody');
    tbody.innerHTML = '';
    rows.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(item.created_at || item.changed_at || '—')}</td>
        <td>${escapeHtml(item.old_status || item.previous_status || '—')}</td>
        <td>${statusPill(item.new_status || item.status || '—')}</td>
        <td>${escapeHtml(item.action_key || item.action || '—')}</td>
        <td>${escapeHtml(item.notes || item.reason || '—')}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function loadCargo(overrides = {}) {
    const payload = await window.OTTApi.cargoMawbs(buildCargoQuery(overrides));
    renderCargoRows(payload);
    return payload;
  }

  async function loadSelectedMawb() {
    const mawbId = requireValue('selectedMawbId', 'Selected Final MAWB ID');
    const payload = await window.OTTApi.cargoMawb(mawbId);
    const mawb = dataOf(payload);
    renderMawbDetail(mawb);
    return payload;
  }

  $('btnHealth').addEventListener('click', () => run('/health', () => window.OTTApi.health()));
  $('btnVersion').addEventListener('click', () => run('/api/v1/version', () => window.OTTApi.version()));
  $('btnMe').addEventListener('click', () => run('/api/v1/auth/me', () => window.OTTApi.me()));

  $('btnLogin').addEventListener('click', () => run('Supabase login', async () => {
    const email = requireValue('email', 'Email');
    const password = requireValue('password', 'Password');
    const payload = await window.OTTAuth.loginWithPassword(email, password);
    setLoginBadge();
    return payload;
  }));

  $('btnLogout').addEventListener('click', () => {
    window.OTTAuth.logout();
    setLoginBadge();
    showOk('Logged out', { loggedOut: true });
  });

  $('btnLoadCatalogs').addEventListener('click', () => run('Load Cargo catalogs', async () => {
    const [statusPayload, payorPayload, airlinePayload] = await Promise.all([
      window.OTTApi.cargoStatusTypes({ entityType: 'MAWB' }),
      window.OTTApi.adminPayors({ isActive: true, limit: 200 }),
      window.OTTApi.adminAirlines({ isActive: true, limit: 200 })
    ]);
    state.statusTypes = dataOf(statusPayload) || [];
    state.payors = rowsOf(payorPayload);
    state.airlines = rowsOf(airlinePayload);
    fillStatusSelect(state.statusTypes);
    fillSelect('payorFilter', state.payors, (row) => displayName(row, row.id), (row) => row.id, 'All payors');
    fillSelect('airlineFilter', state.airlines, (row) => displayName(row, row.id), (row) => row.id, 'All airlines');
    return { statuses: state.statusTypes, payors: state.payors, airlines: state.airlines };
  }));

  $('btnLoadNew').addEventListener('click', () => run('Load NEW MAWBs', () => loadCargo({ status: 'NEW' })));
  $('btnLoadRecent').addEventListener('click', () => run('Load Recent MAWBs', () => loadCargo({ status: '' })));
  $('btnSearchCargo').addEventListener('click', () => run('Search Cargo MAWBs', () => loadCargo()));

  $('btnClearFilters').addEventListener('click', () => {
    $('cargoSearch').value = '';
    $('statusFilter').value = '';
    $('payorFilter').value = '';
    $('airlineFilter').value = '';
    showOk('Filters cleared', { cleared: true });
  });

  $('btnLoadSelected').addEventListener('click', () => run('Load selected Cargo MAWB', loadSelectedMawb));

  $('btnConfirmNew').addEventListener('click', () => run('Confirm selected status = NEW', async () => {
    const payload = await loadSelectedMawb();
    const mawb = dataOf(payload);
    if (mawb.cargo_status !== 'NEW') {
      throw new Error(`Selected MAWB status is ${mawb.cargo_status}; expected NEW.`);
    }
    return { mawbId: mawb.id, mawb: mawb.mawb_number, status: mawb.cargo_status };
  }));

  setLoginBadge();
})();
