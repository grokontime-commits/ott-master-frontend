
(function () {
  const $ = (id) => document.getElementById(id);
  const state = { eligible: [], orders: [], packets: [], documents: [], selectedOrder: null, selectedPacket: null };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setOutput(label, payload, ok = true) {
    $('output').textContent = `${ok ? 'PASS' : 'FAIL'} ${label}\n` + JSON.stringify(payload, null, 2);
  }

  async function run(label, fn) {
    try {
      const result = await fn();
      setOutput(label, result, true);
      return result;
    } catch (error) {
      setOutput(label, { message: error.message, status: error.status, payload: error.payload }, false);
      return null;
    }
  }

  function rows(payload) {
    const data = payload?.data ?? payload;
    return data?.rows || (Array.isArray(data) ? data : []);
  }

  function data(payload) {
    return payload?.data ?? payload;
  }

  function mawbDisplay(row) {
    return row?.mawbs?.mawb_number_display || row?.mawbs?.mawb_number || row?.mawb_number_display || row?.mawb_number || row?.mawb_id || '—';
  }

  function hawbDisplay(row) {
    return row?.hawbs?.hawb_number || row?.hawb_number || row?.hawb_id || '—';
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

  function updateKpis(stats) {
    const s = data(stats) || {};
    $('kpiOrders').textContent = s.releaseOrders ?? '—';
    $('kpiReady').textContent = s.readyForForklift ?? '—';
    $('kpiPackets').textContent = s.pickupPackets ?? '—';
    $('kpiUnverified').textContent = s.unverifiedPickupPackets ?? '—';
    $('kpiDocs').textContent = s.activePickupDocuments ?? '—';
  }

  function renderDetail(row) {
    const tbody = $('orderDetailTable').querySelector('tbody');
    if (!row) {
      tbody.innerHTML = '<tr><td>No order loaded.</td></tr>';
      return;
    }
    const safe = Object.entries(row).slice(0, 50).map(([key, value]) => {
      let printable = value;
      if (value && typeof value === 'object') printable = JSON.stringify(value);
      return `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(printable ?? '—')}</td></tr>`;
    }).join('');
    tbody.innerHTML = safe || '<tr><td>No detail loaded.</td></tr>';
  }

  function renderEligible(list) {
    state.eligible = list;
    const tbody = $('eligibleTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => {
      const selected = $('selectedHawbId').value === row.hawb_id;
      return `<tr class="${selected ? 'selected' : ''}">
        <td><span class="status-pill">${escapeHtml(row.inspection_status || '—')}</span></td>
        <td>${escapeHtml(mawbDisplay(row))}</td>
        <td>${escapeHtml(hawbDisplay(row))}</td>
        <td>${escapeHtml(row.received_pieces ?? row.expected_pieces ?? '—')}</td>
        <td>${escapeHtml(row.damage_photo_requirement_status || '—')}</td>
        <td>${escapeHtml(row.hawb_id || '—')}</td>
        <td><button data-select-eligible="${escapeHtml(row.id)}">Select</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">No release-eligible HAWBs loaded.</td></tr>';
    tbody.querySelectorAll('[data-select-eligible]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-select-eligible');
        const row = state.eligible.find((item) => item.id === id);
        if (!row) return;
        $('selectedMawbId').value = row.mawb_id || '';
        $('selectedHawbId').value = row.hawb_id || '';
        renderEligible(state.eligible);
        setOutput('Selected eligible HAWB', row, true);
      });
    });
  }

  function renderOrders(list) {
    state.orders = list;
    const tbody = $('ordersTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => {
      const selected = $('selectedOrderId').value === row.id;
      const approval = row.customer_approval_required ? (row.customer_approved ? 'Approved' : 'Required') : 'Not required';
      const packet = row.pickup_packet_required ? (row.pickup_packet_verified ? 'Verified' : 'Required') : 'Not required';
      return `<tr class="${selected ? 'selected' : ''}">
        <td><span class="status-pill">${escapeHtml(row.release_status || '—')}</span></td>
        <td>${escapeHtml(row.release_number || '—')}</td>
        <td>${escapeHtml(mawbDisplay(row))}</td>
        <td>${escapeHtml(row.total_hawbs ?? '—')}</td>
        <td>${escapeHtml(approval)}</td>
        <td>${escapeHtml(packet)}</td>
        <td><button data-select-order="${escapeHtml(row.id)}">Select</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">No release orders loaded.</td></tr>';
    tbody.querySelectorAll('[data-select-order]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.getAttribute('data-select-order');
        $('selectedOrderId').value = id;
        renderOrders(state.orders);
        await loadSelectedOrder();
      });
    });
  }

  function renderDocuments(list) {
    state.documents = list;
    const tbody = $('documentsTable').querySelector('tbody');
    tbody.innerHTML = list.map((row) => `<tr>
      <td><span class="status-pill">${escapeHtml(row.document_status || '—')}</span></td>
      <td>${escapeHtml(row.document_type || '—')}</td>
      <td>${escapeHtml(row.file_records?.original_filename || row.file_records?.object_path || '—')}</td>
      <td>${escapeHtml(row.is_required_document ? 'Yes' : 'No')}</td>
      <td>${escapeHtml(row.id || '—')}</td>
    </tr>`).join('') || '<tr><td colspan="5">No pickup documents loaded.</td></tr>';
  }

  function renderPackets(list) {
    state.packets = list;
    const open = list.find((packet) => packet.release_order_id === $('selectedOrderId').value) || list[0];
    if (open?.id && !$('selectedPacketId').value) $('selectedPacketId').value = open.id;
  }

  async function loadStats() {
    const result = await run('Release Stats', () => window.OTTApi.releaseStats());
    if (result) updateKpis(result);
    return result;
  }

  async function loadEligible() {
    const params = { limit: 50, offset: 0, mawbId: $('filterMawbId').value.trim() || undefined };
    const result = await run('Load Eligible HAWBs', () => window.OTTApi.releaseEligibleHawbs(params));
    if (result) renderEligible(rows(result));
    return result;
  }

  async function loadOrders(extra = {}) {
    const status = $('orderStatusFilter').value || undefined;
    const params = { limit: 50, offset: 0, status, ...extra };
    const result = await run('Load Release Orders', () => window.OTTApi.releaseOrders(params));
    if (result) renderOrders(rows(result));
    return result;
  }

  async function loadSelectedOrder() {
    const id = $('selectedOrderId').value.trim();
    if (!id) return setOutput('Load Selected Order', { message: 'Select or enter a Release Order ID first.' }, false);
    const result = await run('Load Selected Order', () => window.OTTApi.releaseOrder(id));
    if (result) {
      state.selectedOrder = data(result);
      renderDetail(state.selectedOrder);
      const packets = state.selectedOrder?.pickup_document_packets || [];
      if (packets.length && !$('selectedPacketId').value) $('selectedPacketId').value = packets[0].id;
    }
    return result;
  }

  async function checkReadiness() {
    const id = $('selectedOrderId').value.trim();
    if (!id) return setOutput('Check Readiness', { message: 'Select or enter a Release Order ID first.' }, false);
    return run('Check Release Order Readiness', () => window.OTTApi.releaseOrderReadiness(id));
  }

  async function createOrder() {
    const mawbId = $('selectedMawbId').value.trim();
    const hawbId = $('selectedHawbId').value.trim();
    if (!mawbId || !hawbId) return setOutput('Create Release Order', { message: 'Select an eligible HAWB first.' }, false);
    const body = {
      mawbId,
      releaseType: 'CUSTOMER_PICKUP',
      customerApprovalRequired: $('approvalRequired').checked,
      pickupPacketRequired: $('packetRequired').checked,
      releaseToCompany: $('releaseToCompany').value.trim() || null,
      releaseToDriverName: $('releaseDriverName').value.trim() || null,
      releaseToDriverPhone: $('releaseDriverPhone').value.trim() || null,
      truckerName: $('releaseToCompany').value.trim() || null,
      truckPlateNumber: $('truckPlate').value.trim() || null,
      notes: 'Created from Cargo Release.',
      metadata: { source: 'cargo_release_pickup' },
      hawbIds: [hawbId]
    };
    const result = await run('Create Release Order', () => window.OTTApi.createReleaseOrder(body));
    if (result) {
      const order = data(result);
      $('selectedOrderId').value = order.id || '';
      state.selectedOrder = order;
      renderDetail(order);
      await loadOrders();
    }
    return result;
  }

  async function approveCustomer() {
    const id = $('selectedOrderId').value.trim();
    if (!id) return setOutput('Approve Customer Release', { message: 'Select or create a Release Order first.' }, false);
    const body = {
      approvalStatus: 'APPROVED',
      customerContactName: 'Frontend Test Customer',
      customerContactEmail: 'customer.test@ontimetruckers.com',
      approvalReference: `PH3G-${Date.now()}`,
      notes: 'Customer approval recorded from Cargo Release.'
    };
    const result = await run('Approve Customer Release', () => window.OTTApi.recordCustomerApproval(id, body));
    if (result) await loadSelectedOrder();
    return result;
  }

  async function createPacket() {
    const id = $('selectedOrderId').value.trim();
    if (!id) return setOutput('Create Pickup Packet', { message: 'Select or create a Release Order first.' }, false);
    const result = await run('Create Pickup Packet', () => window.OTTApi.createPickupPacket(id, { notes: 'Pickup packet created from Cargo Release.' }));
    if (result) {
      const packet = data(result);
      $('selectedPacketId').value = packet.id || '';
      state.selectedPacket = packet;
      await loadSelectedOrder();
      await loadPickupDocs();
    }
    return result;
  }

  async function loadPackets() {
    const params = { limit: 25, offset: 0, releaseOrderId: $('selectedOrderId').value.trim() || undefined };
    const result = await run('Load Pickup Packets', () => window.OTTApi.pickupPackets(params));
    if (result) renderPackets(rows(result));
    return result;
  }

  async function loadPacket() {
    const id = $('selectedPacketId').value.trim();
    if (!id) return setOutput('Load Selected Packet', { message: 'Select or create a Pickup Packet first.' }, false);
    const result = await run('Load Selected Packet', () => window.OTTApi.pickupPacket(id));
    if (result) state.selectedPacket = data(result);
    return result;
  }

  async function addDocument() {
    const packetId = $('selectedPacketId').value.trim();
    const fileRecordId = $('pickupFileRecordId').value.trim();
    if (!packetId) return setOutput('Add Document', { message: 'Select or create a Pickup Packet first.' }, false);
    if (!fileRecordId) return setOutput('Add Document', { message: 'Paste an existing public.file_records.id first.' }, false);
    const body = {
      fileRecordId,
      documentType: $('documentType').value,
      isRequiredDocument: true,
      notes: 'Pickup document added from Cargo Release.',
      metadata: { source: 'cargo_release_pickup' }
    };
    const result = await run('Add Pickup Packet Document', () => window.OTTApi.addPickupPacketDocument(packetId, body));
    if (result) await loadPickupDocs();
    return result;
  }

  async function verifyPacket() {
    const packetId = $('selectedPacketId').value.trim();
    if (!packetId) return setOutput('Verify Packet', { message: 'Select or create a Pickup Packet first.' }, false);
    const body = {
      verificationStatus: 'VERIFIED',
      notes: 'Pickup packet verified from Cargo Release.',
      checklist: { customer_approval_checked: true, delivery_order_checked: true, source: 'cargo_release_pickup' }
    };
    const result = await run('Verify Pickup Packet', () => window.OTTApi.verifyPickupPacket(packetId, body));
    if (result) {
      await loadSelectedOrder();
      await checkReadiness();
    }
    return result;
  }

  async function loadPickupDocs() {
    const params = { limit: 50, offset: 0, releaseOrderId: $('selectedOrderId').value.trim() || undefined, packetId: $('selectedPacketId').value.trim() || undefined };
    const result = await run('Load Pickup Documents', () => window.OTTApi.pickupDocuments(params));
    if (result) renderDocuments(rows(result));
    return result;
  }

  $('btnHealth').addEventListener('click', () => run('Test /health', () => window.OTTApi.health()));
  $('btnVersion').addEventListener('click', () => run('Test /api/v1/version', () => window.OTTApi.version()));
  $('btnLogin').addEventListener('click', async () => {
    const email = $('email').value.trim();
    const password = $('password').value;
    await run('Supabase Login', () => window.OTTAuth.loginWithPassword(email, password));
    setLoginBadge();
  });
  $('btnLogout').addEventListener('click', () => { window.OTTAuth.logout(); setLoginBadge(); setOutput('Logout', { ok: true }, true); });
  $('btnMe').addEventListener('click', () => run('Test /auth/me', () => window.OTTApi.me()));
  $('btnStats').addEventListener('click', loadStats);
  $('btnEligible').addEventListener('click', loadEligible);
  $('btnEligible2').addEventListener('click', loadEligible);
  $('btnOrders').addEventListener('click', () => loadOrders());
  $('btnOrders2').addEventListener('click', () => loadOrders());
  $('btnReadyOrders').addEventListener('click', () => loadOrders({ readyForForklift: true }));
  $('btnCreateOrder').addEventListener('click', createOrder);
  $('btnLoadOrder').addEventListener('click', loadSelectedOrder);
  $('btnReadiness').addEventListener('click', checkReadiness);
  $('btnReadiness2').addEventListener('click', checkReadiness);
  $('btnCustomerApproval').addEventListener('click', approveCustomer);
  $('btnCreatePacket').addEventListener('click', createPacket);
  $('btnLoadPackets').addEventListener('click', loadPackets);
  $('btnLoadPacket').addEventListener('click', loadPacket);
  $('btnAddDocument').addEventListener('click', addDocument);
  $('btnVerifyPacket').addEventListener('click', verifyPacket);
  $('btnPickupDocs').addEventListener('click', loadPickupDocs);

  setLoginBadge();
})();
