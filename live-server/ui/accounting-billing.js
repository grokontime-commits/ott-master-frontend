(function () {
  const $ = (id) => document.getElementById(id);
  const state = { me: null, payors: [], airlines: [], mawbs: [], releases: [], equipment: [], pallets: [] };

  // PHASE_8E_H_ACCOUNTING_BILLING_UI_POLISH
  // Frontend-only invoice number helper for preview UI. Backend sequence/export can replace this later.
  function nextAccountingInvoiceNumber() {
    const tail = String(Date.now()).slice(-6);
    return `41000${tail}`;
  }

  function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function setOutput(label, payload, ok = true) { $('output').textContent = `${ok ? 'PASS' : 'FAIL'} ${label}\n` + JSON.stringify(payload, null, 2); }
  async function run(label, fn) { try { const result = await fn(); setOutput(label, result, true); return result; } catch (error) { setOutput(label, { message: error.message, status: error.status, payload: error.payload }, false); return null; } }
  function data(payload) { return payload?.data ?? payload; }
  function rows(payload) { const d = data(payload); return d?.rows || (Array.isArray(d) ? d : []); }
  function count(payload) { const d = data(payload); return d?.count ?? rows(payload).length ?? 0; }
  function setLoginBadge() { const badge = $('loginBadge'); if (window.OTTAuth?.isLoggedIn()) { badge.className = 'badge ok'; badge.textContent = 'Logged in'; } else { badge.className = 'badge'; badge.textContent = 'Not logged in'; } }
  function textListToIds(value) { return String(value || '').split(/[\n,]+/).map((v) => v.trim()).filter(Boolean); }
  function appendId(id, fieldId) { if (!id) return; const field = $(fieldId); const ids = new Set(textListToIds(field.value)); ids.add(id); field.value = Array.from(ids).join('\n'); }
  function mawbDisplay(row) { return row?.mawb_number_display || row?.mawb_number || row?.mawbs?.mawb_number_display || row?.mawbs?.mawb_number || row?.mawb_id || '—'; }
  function payorDisplay(row) { return row?.payors?.display_name || row?.payors?.payor_name || row?.payor_name || row?.payor_id || '—'; }
  function airlineDisplay(row) { return row?.airlines?.display_name || row?.airlines?.airline_name || row?.airlines?.airline_code || row?.airline_name || row?.airline_id || '—'; }
  function moneyLike(value) { return value == null ? '—' : String(value); }

  function updateKpis(statsPayload) {
    const s = data(statsPayload) || {};
    $('kpiOpen').textContent = s.openAccountingItems ?? '—';
    $('kpiMawbs').textContent = s.billingReadyMawbs ?? s.mawbsReadyToBill ?? '—';
    $('kpiEquipment').textContent = s.equipmentReturnsReadyToBill ?? s.equipmentReadyToBill ?? '—';
    $('kpiPallets').textContent = s.billablePalletExchanges ?? s.palletExchangesReadyToBill ?? '—';
  }

  function renderOptions(selectId, list, labelFn) {
    const select = $(selectId);
    const first = select.options[0]?.outerHTML || '<option value="">All</option>';
    select.innerHTML = first + list.map((row) => `<option value="${escapeHtml(row.id)}">${escapeHtml(labelFn(row))}</option>`).join('');
  }

  function baseFilters() {
    return {
      q: $('q').value.trim() || undefined,
      payorId: $('payorFilter').value || undefined,
      airlineId: $('airlineFilter').value || undefined,
      limit: $('limit').value || 50,
      offset: 0
    };
  }

  function renderMawbs(list) {
    state.mawbs = list;
    const tbody = $('mawbsTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => `<tr><td><span class="status-pill">${escapeHtml(row.cargo_status || '—')}</span></td><td>${escapeHtml(mawbDisplay(row))}</td><td>${escapeHtml(payorDisplay(row))}</td><td>${escapeHtml(airlineDisplay(row))}</td><td>${escapeHtml(row.total_pieces_expected ?? row.total_pieces ?? '—')}</td><td>${escapeHtml(row.chargeable_weight_kg ?? row.total_weight_kg ?? '—')}</td><td>${escapeHtml(row.id)}</td><td><button data-add-mawb="${escapeHtml(row.id)}">Add</button></td></tr>`).join('') || '<tr><td colspan="8">No billing-ready MAWBs found.</td></tr>';
    tbody.querySelectorAll('[data-add-mawb]').forEach((button) => button.addEventListener('click', () => { appendId(button.getAttribute('data-add-mawb'), 'selectedMawbIds'); setOutput('Selected MAWB for invoice preview', { mawbIds: textListToIds($('selectedMawbIds').value) }, true); }));
  }

  function renderReleases(list) {
    state.releases = list;
    const tbody = $('releasesTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => `<tr><td><span class="status-pill">${escapeHtml(row.release_status || '—')}</span></td><td>${escapeHtml(row.release_number || '—')}</td><td>${escapeHtml(mawbDisplay(row))}</td><td>${escapeHtml(row.customer_approved_at ? 'YES' : 'NO')}</td><td>${escapeHtml(row.pickup_packet_status || row.pickup_packets?.packet_status || '—')}</td><td>${escapeHtml(row.id)}</td><td><button data-release-mawb="${escapeHtml(row.mawb_id || '')}">Add MAWB</button></td></tr>`).join('') || '<tr><td colspan="7">No release orders found.</td></tr>';
    tbody.querySelectorAll('[data-release-mawb]').forEach((button) => button.addEventListener('click', () => { appendId(button.getAttribute('data-release-mawb'), 'selectedMawbIds'); setOutput('Selected Release MAWB for invoice preview', { mawbIds: textListToIds($('selectedMawbIds').value) }, true); }));
  }

  function renderEquipment(list) {
    state.equipment = list;
    const tbody = $('equipmentTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => `<tr><td><span class="status-pill">${escapeHtml(row.billing_status || '—')}</span></td><td>${escapeHtml(row.return_status || '—')}</td><td>${escapeHtml((row.equipment_type_key || '') + ' ' + (row.equipment_number || ''))}</td><td>${escapeHtml(mawbDisplay(row))}</td><td>${escapeHtml(airlineDisplay(row))}</td><td>${escapeHtml(row.id)}</td><td><button data-add-equipment="${escapeHtml(row.id)}">Add</button> <button data-bill-equipment="${escapeHtml(row.id)}">Bill</button></td></tr>`).join('') || '<tr><td colspan="7">No equipment returns found.</td></tr>';
    tbody.querySelectorAll('[data-add-equipment]').forEach((button) => button.addEventListener('click', () => { appendId(button.getAttribute('data-add-equipment'), 'selectedEquipmentIds'); setOutput('Selected Equipment for invoice preview', { equipmentRecordIds: textListToIds($('selectedEquipmentIds').value) }, true); }));
    tbody.querySelectorAll('[data-bill-equipment]').forEach((button) => button.addEventListener('click', () => { $('billEquipmentRecordId').value = button.getAttribute('data-bill-equipment'); setOutput('Selected Equipment for mark billed', { equipmentRecordId: $('billEquipmentRecordId').value }, true); }));
  }

  function renderPallets(list) {
    state.pallets = list;
    const tbody = $('palletsTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => `<tr><td><span class="status-pill">${escapeHtml(row.exchange_status || '—')}</span></td><td>${escapeHtml(mawbDisplay(row))}</td><td>${escapeHtml(row.billable ? 'YES' : 'NO')}</td><td>${escapeHtml(row.billable_pallets ?? row.pallet_count ?? '—')}</td><td>${escapeHtml(row.release_order_id || '—')}</td><td>${escapeHtml(row.id)}</td><td><button data-add-pallet="${escapeHtml(row.id)}">Add</button></td></tr>`).join('') || '<tr><td colspan="7">No pallet exchanges found.</td></tr>';
    tbody.querySelectorAll('[data-add-pallet]').forEach((button) => button.addEventListener('click', () => { appendId(button.getAttribute('data-add-pallet'), 'selectedPalletIds'); setOutput('Selected Pallet Exchange for invoice preview', { palletExchangeRecordIds: textListToIds($('selectedPalletIds').value) }, true); }));
  }

  async function loadMe() {
    const result = await run('/auth/me', () => window.OTTApi.me());
    const d = data(result);
    if (d?.user?.id) state.me = d;
    return result;
  }
  async function loadStats() { const result = await run('Accounting Stats', () => window.OTTApi.accountingStats()); if (result) updateKpis(result); return result; }
  async function loadPayors() { const result = await run('Load Payors', () => window.OTTApi.adminPayors({ limit: 200, offset: 0 })); if (result) { const list = rows(result); state.payors = list; renderOptions('payorFilter', list, (r) => r.display_name || r.payor_name || r.payor_code || r.id); } return result; }
  async function loadAirlines() { const result = await run('Load Airlines', () => window.OTTApi.adminAirlines({ limit: 200, offset: 0 })); if (result) { const list = rows(result); state.airlines = list; renderOptions('airlineFilter', list, (r) => r.display_name || r.airline_name || r.airline_code || r.id); } return result; }
  async function loadMawbs() { const result = await run('Load Billing-Ready MAWBs', () => window.OTTApi.accountingBillingReadyMawbs({ ...baseFilters(), includeHawbs: false })); if (result) renderMawbs(rows(result)); return result; }
  async function loadReleases() { const result = await run('Load Release Orders', () => window.OTTApi.accountingReleaseOrders({ q: $('q').value.trim() || undefined, payorId: $('payorFilter').value || undefined, billingReadyOnly: true, limit: $('limit').value || 50, offset: 0 })); if (result) renderReleases(rows(result)); return result; }
  async function loadEquipment() { const result = await run('Load Equipment Returns', () => window.OTTApi.accountingBillingReadyEquipmentReturns({ ...baseFilters(), equipmentTypeKey: $('equipmentTypeKey').value || undefined, billingStatus: $('billingStatus').value || undefined })); if (result) renderEquipment(rows(result)); return result; }
  async function loadPallets() { const result = await run('Load Pallet Exchanges', () => window.OTTApi.accountingBillablePalletExchanges({ q: $('q').value.trim() || undefined, billableOnly: true, limit: $('limit').value || 50, offset: 0 })); if (result) renderPallets(rows(result)); return result; }

  async function createPreview() {
    const body = {
      invoiceType: $('invoiceType').value || 'MIXED',
      invoiceNumber: $('invoiceNumber').value.trim() || nextAccountingInvoiceNumber(),
      invoiceDate: $('invoiceDate').value || null,
      payorId: $('selectedPayorId').value.trim() || $('payorFilter').value || null,
      mawbIds: textListToIds($('selectedMawbIds').value),
      equipmentRecordIds: textListToIds($('selectedEquipmentIds').value),
      palletExchangeRecordIds: textListToIds($('selectedPalletIds').value),
      notes: $('invoiceNotes').value.trim() || null,
      metadata: { source: 'accounting_billing' }
    };
    const result = await run('Create Invoice Preview', () => window.OTTApi.createInvoicePreview(body));
    if (result) {
      const d = data(result);
      $('previewBox').textContent = JSON.stringify({ invoicePreview: d.invoicePreview, sourceCounts: d.sourceCounts, lineItems: d.lineItems }, null, 2);
    }
    return result;
  }

  async function markBilled() {
    const equipmentRecordId = $('billEquipmentRecordId').value.trim();
    if (!equipmentRecordId) return setOutput('Mark Equipment Billed', { message: 'Select or enter an equipment record ID first.' }, false);
    const body = {
      invoiceNumber: $('billInvoiceNumber').value.trim() || nextAccountingInvoiceNumber(),
      invoiceDate: $('billInvoiceDate').value || null,
      notes: $('billNotes').value.trim() || null,
      metadata: { source: 'accounting_billing' }
    };
    const result = await run('Mark Equipment Billed', () => window.OTTApi.markEquipmentRecordBilled(equipmentRecordId, body));
    if (result) await loadEquipment();
    return result;
  }

  $('btnHealth').addEventListener('click', () => run('/health', () => window.OTTApi.health()));
  $('btnVersion').addEventListener('click', () => run('/api/v1/version', () => window.OTTApi.version()));
  $('btnLogin').addEventListener('click', async () => { const result = await run('Supabase Login', () => window.OTTAuth.login($('email').value.trim(), $('password').value)); if (result) setLoginBadge(); });
  $('btnLogout').addEventListener('click', async () => { await window.OTTAuth.logout(); setLoginBadge(); setOutput('Logout', { ok: true }, true); });
  $('btnMe').addEventListener('click', loadMe);
  $('btnStats').addEventListener('click', loadStats);
  $('btnPayors').addEventListener('click', loadPayors);
  $('btnAirlines').addEventListener('click', loadAirlines);
  $('btnLoadMawbs').addEventListener('click', loadMawbs);
  $('btnLoadReleases').addEventListener('click', loadReleases);
  $('btnLoadEquipment').addEventListener('click', loadEquipment);
  $('btnLoadPallets').addEventListener('click', loadPallets);
  $('btnCreatePreview').addEventListener('click', createPreview);
  $('btnClearSelections').addEventListener('click', () => { $('selectedMawbIds').value = ''; $('selectedEquipmentIds').value = ''; $('selectedPalletIds').value = ''; $('previewBox').textContent = 'Selections cleared.'; });
  $('btnMarkBilled').addEventListener('click', markBilled);

  setLoginBadge();
  $('invoiceDate').value = new Date().toISOString().slice(0, 10);
  $('billInvoiceDate').value = new Date().toISOString().slice(0, 10);
  $('invoiceNumber').value = nextAccountingInvoiceNumber();
  $('billInvoiceNumber').value = $('invoiceNumber').value;
})();
