(function () {
  const $ = (id) => document.getElementById(id);
  const state = { mawbs: [], records: [], drivers: [], jobs: [], items: [], me: null, selectedRecord: null, selectedItem: null };

  function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function setOutput(label, payload, ok = true) { $('output').textContent = `${ok ? 'PASS' : 'FAIL'} ${label}\n` + JSON.stringify(payload, null, 2); }
  async function run(label, fn) { try { const result = await fn(); setOutput(label, result, true); return result; } catch (error) { setOutput(label, { message: error.message, status: error.status, payload: error.payload }, false); return null; } }
  function data(payload) { return payload?.data ?? payload; }
  function rows(payload) { const d = data(payload); return d?.rows || (Array.isArray(d) ? d : []); }
  function setLoginBadge() { const badge = $('loginBadge'); if (window.OTTAuth?.isLoggedIn()) { badge.className = 'badge ok'; badge.textContent = 'Logged in'; } else { badge.className = 'badge'; badge.textContent = 'Not logged in'; } }
  function mawbDisplay(row) { return row?.mawbs?.mawb_number_display || row?.mawbs?.mawb_number || row?.mawb_number_display || row?.mawb_number || row?.mawb_id || '—'; }
  function payorDisplay(row) { return row?.payors?.display_name || row?.payors?.payor_name || row?.payor_name || '—'; }
  function airlineDisplay(row) { return row?.airlines?.display_name || row?.airlines?.airline_name || row?.airlines?.airline_code || row?.airline_name || row?.airline_id || '—'; }
  function recordNumber(row) { return `${row?.equipment_type_key || '—'} ${row?.equipment_number || '—'}`; }
  function updateKpis(stats) { const s = data(stats) || {}; $('kpiRecords').textContent = s.equipmentRecords ?? '—'; $('kpiPending').textContent = s.pendingReturn ?? '—'; $('kpiReturned').textContent = s.returned ?? '—'; $('kpiReadyBill').textContent = s.readyToBill ?? '—'; $('kpiOpenJobs').textContent = s.openReturnJobs ?? '—'; }

  function renderMawbs(list) {
    state.mawbs = list;
    const tbody = $('mawbsTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => {
      const selected = $('selectedMawbId').value === row.id;
      return `<tr class="${selected ? 'selected' : ''}"><td><span class="status-pill">${escapeHtml(row.cargo_status || '—')}</span></td><td>${escapeHtml(mawbDisplay(row))}</td><td>${escapeHtml(row.total_pieces_expected ?? row.total_pieces ?? '—')}</td><td>${escapeHtml(payorDisplay(row))}</td><td>${escapeHtml(airlineDisplay(row))}</td><td>${escapeHtml(row.id)}</td><td><button data-select-mawb="${escapeHtml(row.id)}">Select</button></td></tr>`;
    }).join('') || '<tr><td colspan="7">No MAWBs loaded.</td></tr>';
    tbody.querySelectorAll('[data-select-mawb]').forEach((button) => button.addEventListener('click', () => {
      const id = button.getAttribute('data-select-mawb') || '';
      $('selectedMawbId').value = id;
      const mawb = state.mawbs.find((item) => item.id === id);
      if (mawb?.airline_id && !$('equipmentAirlineId').value) $('equipmentAirlineId').value = mawb.airline_id;
      if (!$('equipmentNumber').value) $('equipmentNumber').value = `PMC3I${Date.now().toString().slice(-7)}`;
      renderMawbs(state.mawbs);
      setOutput('Selected MAWB', mawb, true);
    }));
  }

  function renderRecords(list) {
    state.records = list;
    const tbody = $('recordsTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => {
      const selected = $('selectedEquipmentRecordId').value === row.id;
      return `<tr class="${selected ? 'selected' : ''}"><td>${escapeHtml(row.equipment_type_key || '—')}</td><td>${escapeHtml(row.equipment_number || '—')}</td><td><span class="status-pill">${escapeHtml(row.return_status || '—')}</span></td><td>${escapeHtml(row.billing_status || '—')}</td><td>${escapeHtml(mawbDisplay(row))}</td><td>${escapeHtml(airlineDisplay(row))}</td><td>${escapeHtml(row.id)}</td><td><button data-select-record="${escapeHtml(row.id)}">Select</button></td></tr>`;
    }).join('') || '<tr><td colspan="8">No equipment records loaded.</td></tr>';
    tbody.querySelectorAll('[data-select-record]').forEach((button) => button.addEventListener('click', () => selectRecord(button.getAttribute('data-select-record'))));
  }

  function selectRecord(recordId) {
    const record = state.records.find((item) => item.id === recordId);
    if (!record) return;
    state.selectedRecord = record;
    $('selectedEquipmentRecordId').value = record.id;
    $('searchEquipmentNumber').value = record.equipment_number || '';
    $('scanValue').value = record.equipment_number || '';
    renderRecords(state.records);
    setOutput('Selected Equipment Record', record, true);
  }

  function renderDrivers(list) {
    state.drivers = list;
    const tbody = $('driversTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => `<tr><td>${escapeHtml(row.display_name || row.employee_number || '—')}</td><td>${escapeHtml(row.email || '—')}</td><td>${escapeHtml(row.user_id || '—')}</td><td><button data-driver-user="${escapeHtml(row.user_id || '')}">Use</button></td></tr>`).join('') || '<tr><td colspan="4">No drivers loaded. You can use current user id from /auth/me for staging tests.</td></tr>';
    tbody.querySelectorAll('[data-driver-user]').forEach((button) => button.addEventListener('click', () => {
      const userId = button.getAttribute('data-driver-user') || '';
      if (!userId) return setOutput('Select Driver', { message: 'This driver row has no linked user_id. Use current auth user id or another driver.' }, false);
      $('selectedDriverUserId').value = userId;
      setOutput('Selected Driver User', { userId }, true);
    }));
  }

  function renderJobs(list) {
    state.jobs = list;
    const tbody = $('jobsTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => {
      const selected = $('selectedReturnJobId').value === row.id;
      return `<tr class="${selected ? 'selected' : ''}"><td><span class="status-pill">${escapeHtml(row.job_status || '—')}</span></td><td>${escapeHtml(row.job_number || '—')}</td><td>${escapeHtml(row.total_equipment_count ?? '—')}</td><td>${escapeHtml(row.returned_equipment_count ?? '—')}</td><td>${escapeHtml(row.assigned_driver?.display_name || row.assigned_driver_user_id || '—')}</td><td>${escapeHtml(row.id)}</td><td><button data-select-job="${escapeHtml(row.id)}">Select</button></td></tr>`;
    }).join('') || '<tr><td colspan="7">No return jobs loaded.</td></tr>';
    tbody.querySelectorAll('[data-select-job]').forEach((button) => button.addEventListener('click', async () => {
      $('selectedReturnJobId').value = button.getAttribute('data-select-job') || '';
      renderJobs(state.jobs);
      await loadReturnJob();
    }));
  }

  function renderItems(list) {
    state.items = list;
    const tbody = $('itemsTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => {
      const selected = $('selectedReturnItemId').value === row.id;
      const rec = row.equipment_records || {};
      return `<tr class="${selected ? 'selected' : ''}"><td><span class="status-pill">${escapeHtml(row.item_status || '—')}</span></td><td>${escapeHtml(rec.equipment_number ? `${rec.equipment_type_key || ''} ${rec.equipment_number}` : row.equipment_record_id)}</td><td>${escapeHtml(mawbDisplay(row))}</td><td>${escapeHtml(row.return_condition || '—')}</td><td>${escapeHtml(row.id)}</td><td><button data-select-item="${escapeHtml(row.id)}">Select</button></td></tr>`;
    }).join('') || '<tr><td colspan="6">No return items loaded.</td></tr>';
    tbody.querySelectorAll('[data-select-item]').forEach((button) => button.addEventListener('click', () => selectItem(button.getAttribute('data-select-item'))));
  }

  function selectItem(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    state.selectedItem = item;
    $('selectedReturnItemId').value = item.id;
    $('selectedEquipmentRecordId').value = item.equipment_record_id || $('selectedEquipmentRecordId').value;
    $('scanValue').value = item.equipment_records?.equipment_number || $('scanValue').value || '';
    renderItems(state.items);
    setOutput('Selected Return Item', item, true);
  }

  async function loadMe() {
    const result = await run('/auth/me', () => window.OTTApi.me());
    const d = data(result);
    if (d?.user?.id) {
      state.me = d;
      if (!$('selectedDriverUserId').value) $('selectedDriverUserId').value = d.user.id;
    }
    return result;
  }

  async function loadStats() { const result = await run('Equipment Stats', () => window.OTTApi.equipmentStats()); if (result) updateKpis(result); return result; }
  async function loadTypes() { return run('Load Equipment Types', () => window.OTTApi.equipmentTypes()); }
  async function loadMawbs() { const status = $('mawbStatus').value || undefined; const result = await run('Load Cargo MAWBs', () => window.OTTApi.cargoMawbs({ status, limit: 50, offset: 0 })); if (result) renderMawbs(rows(result)); return result; }
  async function addEquipment() {
    const mawbId = $('selectedMawbId').value.trim();
    if (!mawbId) return setOutput('Add Equipment to MAWB', { message: 'Select or enter a MAWB ID first.' }, false);
    const equipmentNumber = $('equipmentNumber').value.trim();
    if (!equipmentNumber) return setOutput('Add Equipment to MAWB', { message: 'Enter an equipment number.' }, false);
    const body = { equipmentTypeKey: $('equipmentTypeKey').value, equipmentNumber, airlineId: $('equipmentAirlineId').value.trim() || null, notes: 'Created from Equipment Return.' };
    const result = await run('Add Equipment to MAWB', () => window.OTTApi.addMawbEquipment(mawbId, body));
    if (result) {
      const rec = data(result);
      $('selectedEquipmentRecordId').value = rec.id || '';
      $('searchEquipmentNumber').value = rec.equipment_number || equipmentNumber;
      $('scanValue').value = rec.equipment_number || equipmentNumber;
      await loadRecords({ pendingOnly: true });
    }
    return result;
  }
  async function loadRecords(extra = {}) {
    const params = { limit: 50, offset: 0, returnStatus: $('returnStatusFilter').value || undefined, ...extra };
    const result = await run('Load Equipment Records', () => window.OTTApi.equipmentRecords(params));
    if (result) renderRecords(rows(result));
    return result;
  }
  async function searchEquipment() {
    const equipmentNumber = $('searchEquipmentNumber').value.trim();
    if (!equipmentNumber) return setOutput('Search Equipment', { message: 'Enter an equipment number.' }, false);
    const result = await run('Search Equipment', () => window.OTTApi.searchEquipment(equipmentNumber));
    if (result) renderRecords(rows(result));
    return result;
  }
  async function loadDrivers() {
    const result = await run('Load Drivers', () => window.OTTApi.recoveryDrivers({ limit: 50, offset: 0 }));
    if (result) renderDrivers(rows(result));
    return result;
  }
  async function createReturnJob() {
    const equipmentRecordId = $('selectedEquipmentRecordId').value.trim();
    if (!equipmentRecordId) return setOutput('Create Return Job', { message: 'Select an equipment record first.' }, false);
    const body = { driverUserId: $('selectedDriverUserId').value.trim() || null, equipmentRecordIds: [equipmentRecordId], scheduledReturnAt: new Date().toISOString(), notes: 'Equipment Return job created.' };
    const result = await run('Create Return Job', () => window.OTTApi.createEquipmentReturnJob(body));
    if (result) {
      const job = data(result);
      $('selectedReturnJobId').value = job.id || '';
      await loadReturnJobItems();
      await loadReturnJobs();
    }
    return result;
  }
  async function loadReturnJobs(extra = {}) {
    const params = { limit: 50, offset: 0, status: $('returnJobStatusFilter').value || undefined, ...extra };
    const result = await run('Load Return Jobs', () => window.OTTApi.equipmentReturnJobs(params));
    if (result) renderJobs(rows(result));
    return result;
  }
  async function loadReturnJob() {
    const jobId = $('selectedReturnJobId').value.trim();
    if (!jobId) return setOutput('Load Return Job', { message: 'Select a return job first.' }, false);
    const result = await run('Load Return Job', () => window.OTTApi.equipmentReturnJob(jobId));
    if (result) {
      const job = data(result);
      if (job.assigned_driver_user_id && !$('selectedDriverUserId').value) $('selectedDriverUserId').value = job.assigned_driver_user_id;
      if (Array.isArray(job.equipment_return_job_items)) renderItems(job.equipment_return_job_items);
    }
    return result;
  }
  async function assignDriver() {
    const jobId = $('selectedReturnJobId').value.trim();
    const driverUserId = $('selectedDriverUserId').value.trim();
    if (!jobId) return setOutput('Assign Driver', { message: 'Select a return job first.' }, false);
    if (!driverUserId) return setOutput('Assign Driver', { message: 'Select a driver user id first. Use /auth/me or Load Drivers.' }, false);
    const body = { driverUserId, scheduledReturnAt: new Date().toISOString(), notes: 'Driver assigned from Equipment Return.' };
    const result = await run('Assign Driver', () => window.OTTApi.assignEquipmentReturnDriver(jobId, body));
    if (result) await loadReturnJobs();
    return result;
  }
  async function loadReturnJobItems() {
    const jobId = $('selectedReturnJobId').value.trim();
    if (!jobId) return setOutput('Load Job Items', { message: 'Select a return job first.' }, false);
    const result = await run('Load Job Items', () => window.OTTApi.equipmentReturnJobItems(jobId));
    if (result) renderItems(rows(result));
    return result;
  }
  async function loadAllItems(extra = {}) {
    const result = await run('Load Return Items', () => window.OTTApi.equipmentReturnItems({ limit: 100, offset: 0, itemStatus: 'PENDING', ...extra }));
    if (result) renderItems(rows(result));
    return result;
  }
  async function confirmReturn() {
    const itemId = $('selectedReturnItemId').value.trim();
    if (!itemId) return setOutput('Confirm Return', { message: 'Select a return item first.' }, false);
    const body = { returnedByDriverUserId: $('selectedDriverUserId').value.trim() || null, returnedAt: new Date().toISOString(), returnCondition: $('returnCondition').value, scanValue: $('scanValue').value.trim() || null, notes: 'Equipment returned to airline.' };
    const result = await run('Confirm Equipment Returned', () => window.OTTApi.confirmEquipmentReturn(itemId, body));
    if (result) {
      await loadReturnJobItems();
      await loadRecords({ billingReadyOnly: true });
      await loadStats();
    }
    return result;
  }
  async function loadEquipmentDetail() {
    const id = $('selectedEquipmentRecordId').value.trim();
    if (!id) return setOutput('Load Equipment Detail', { message: 'Select equipment record first.' }, false);
    return run('Load Equipment Detail', () => window.OTTApi.equipmentRecord(id));
  }
  async function loadConfirmations() {
    const params = { limit: 100, offset: 0, jobId: $('selectedReturnJobId').value.trim() || undefined, equipmentRecordId: $('selectedEquipmentRecordId').value.trim() || undefined };
    return run('Load Confirmations', () => window.OTTApi.equipmentConfirmations(params));
  }
  async function loadHistory() {
    const params = { limit: 100, offset: 0, equipmentRecordId: $('selectedEquipmentRecordId').value.trim() || undefined, returnJobId: $('selectedReturnJobId').value.trim() || undefined };
    return run('Load History', () => window.OTTApi.equipmentHistory(params));
  }

  $('btnHealth').addEventListener('click', () => run('/health', () => window.OTTApi.health()));
  $('btnVersion').addEventListener('click', () => run('/api/v1/version', () => window.OTTApi.version()));
  $('btnLogin').addEventListener('click', async () => { const result = await run('Supabase Login', () => window.OTTAuth.login($('email').value.trim(), $('password').value)); if (result) setLoginBadge(); });
  $('btnLogout').addEventListener('click', async () => { await window.OTTAuth.logout(); setLoginBadge(); setOutput('Logout', { ok: true }, true); });
  $('btnMe').addEventListener('click', loadMe);
  $('btnStats').addEventListener('click', loadStats);
  $('btnTypes').addEventListener('click', loadTypes);
  $('btnLoadMawbs').addEventListener('click', loadMawbs);
  $('btnAddEquipment').addEventListener('click', addEquipment);
  $('btnRecords').addEventListener('click', () => loadRecords());
  $('btnPendingRecords').addEventListener('click', () => loadRecords({ pendingOnly: true, returnStatus: undefined }));
  $('btnBillingReady').addEventListener('click', () => loadRecords({ billingReadyOnly: true, returnStatus: undefined }));
  $('btnSearchEquipment').addEventListener('click', searchEquipment);
  $('btnDrivers').addEventListener('click', loadDrivers);
  $('btnCreateReturnJob').addEventListener('click', createReturnJob);
  $('btnAssignDriver').addEventListener('click', assignDriver);
  $('btnReturnJobs').addEventListener('click', () => loadReturnJobs());
  $('btnOpenReturnJobs').addEventListener('click', () => loadReturnJobs({ openOnly: true }));
  $('btnLoadReturnJob').addEventListener('click', loadReturnJob);
  $('btnJobItems').addEventListener('click', loadReturnJobItems);
  $('btnAllItems').addEventListener('click', () => loadAllItems());
  $('btnConfirmReturn').addEventListener('click', confirmReturn);
  $('btnRecordDetail').addEventListener('click', loadEquipmentDetail);
  $('btnConfirmations').addEventListener('click', loadConfirmations);
  $('btnHistory').addEventListener('click', loadHistory);

  setLoginBadge();
})();
