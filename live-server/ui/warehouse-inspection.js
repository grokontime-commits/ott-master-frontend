(function () {
  const state = {
    inspections: [],
    hawbs: [],
    readyRows: [],
    selectedInspection: null
  };

  const $ = (id) => document.getElementById(id);
  const output = $('output');
  const status = $('status');

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

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

  function dataOf(payload) { return payload?.data ?? payload; }
  function rowsOf(payload) { return dataOf(payload)?.rows ?? []; }
  function displayName(row, fallback = '—') {
    return row?.display_name || row?.payor_name || row?.airline_name || row?.mawb_number_display || row?.mawb_number || row?.hawb_number || fallback;
  }
  function fmtDate(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleString(); } catch { return String(value); }
  }
  function requireValue(id, label) {
    const value = $(id).value.trim();
    if (!value) throw new Error(`${label} is required.`);
    return value;
  }
  function boolText(value) { return value === true ? 'Yes' : value === false ? 'No' : '—'; }

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

  function mawbDisplay(row) {
    const mawb = row?.mawbs || row?.mawb || row;
    return mawb?.mawb_number_display || mawb?.mawb_number || row?.mawb_number_display || row?.mawb_id || '—';
  }

  function hawbDisplay(row) {
    const hawb = row?.hawbs || row?.hawb || row;
    return hawb?.hawb_number || row?.hawb_number || row?.hawb_id || '—';
  }

  function updateKpis() {
    $('kpiInspections').textContent = String(state.inspections.length);
    $('kpiHawbs').textContent = String(state.hawbs.length);
    $('kpiReady').textContent = String(state.readyRows.length);
    $('kpiSelectedStatus').textContent = state.selectedInspection?.inspection_status || '—';
  }

  function renderInspections(rows) {
    const tbody = $('inspectionsTable').querySelector('tbody');
    tbody.innerHTML = rows.map((row) => {
      const selected = state.selectedInspection?.id === row.id || $('selectedInspectionId').value === row.id;
      return `<tr class="${selected ? 'selected' : ''}">
        <td><span class="status-pill">${escapeHtml(row.inspection_status || row.status || '—')}</span></td>
        <td>${escapeHtml(mawbDisplay(row))}</td>
        <td>${escapeHtml(row.arrival_type || '—')}</td>
        <td>${escapeHtml(row.total_hawbs ?? row.hawb_count ?? '—')}</td>
        <td>${escapeHtml(row.open_damage_requirements ?? row.open_damage_count ?? '—')}</td>
        <td>${escapeHtml(fmtDate(row.created_at))}</td>
        <td><button data-select-inspection="${escapeHtml(row.id)}">Select</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">No warehouse inspections loaded.</td></tr>';

    tbody.querySelectorAll('[data-select-inspection]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-select-inspection');
        $('selectedInspectionId').value = id;
        const found = state.inspections.find((row) => row.id === id);
        if (found) state.selectedInspection = found;
        renderInspections(state.inspections);
        updateKpis();
      });
    });
    updateKpis();
  }

  function renderInspectionDetail(row) {
    state.selectedInspection = row;
    $('selectedInspectionId').value = row?.id || '';
    const detailRows = [
      ['Warehouse Inspection ID', row?.id],
      ['Inspection Status', row?.inspection_status || row?.status],
      ['MAWB', mawbDisplay(row)],
      ['MAWB ID', row?.mawb_id],
      ['Recovery Job ID', row?.recovery_job_id],
      ['Arrival Type', row?.arrival_type],
      ['Total HAWBs', row?.total_hawbs ?? row?.hawb_count],
      ['Inspected HAWBs', row?.inspected_hawbs],
      ['Open Damage Requirements', row?.open_damage_requirements],
      ['Created', fmtDate(row?.created_at)],
      ['Completed', fmtDate(row?.completed_at)],
      ['Notes', row?.notes]
    ];
    $('detailTable').querySelector('tbody').innerHTML = detailRows.map(([label, value]) => (
      `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value ?? '—')}</td></tr>`
    )).join('');
    updateKpis();
  }

  function renderHawbs(rows) {
    state.hawbs = rows;
    const tbody = $('hawbsTable').querySelector('tbody');
    tbody.innerHTML = rows.map((row) => {
      const selected = $('selectedHawbInspectionId').value === row.id;
      const expected = row.expected_pieces ?? row.pieces_expected ?? row.total_pieces_expected ?? row.hawbs?.total_pieces_expected ?? '—';
      const received = row.received_pieces ?? row.pieces_received ?? '—';
      const damaged = row.damaged_pieces ?? row.damage_pieces ?? '—';
      return `<tr class="${selected ? 'selected' : ''}">
        <td><span class="status-pill">${escapeHtml(row.inspection_status || row.status || '—')}</span></td>
        <td>${escapeHtml(hawbDisplay(row))}</td>
        <td>${escapeHtml(expected)}</td>
        <td>${escapeHtml(received)}</td>
        <td>${escapeHtml(damaged)}</td>
        <td>${escapeHtml(row.damage_photo_requirement_status || row.damage_requirement_status || '—')}</td>
        <td><button data-select-hawb="${escapeHtml(row.id)}">Select</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">No HAWB inspections loaded.</td></tr>';

    tbody.querySelectorAll('[data-select-hawb]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-select-hawb');
        $('selectedHawbInspectionId').value = id;
        const found = state.hawbs.find((row) => row.id === id);
        if (found) {
          $('receivedPieces').value = Number(found.received_pieces ?? found.expected_pieces ?? found.hawbs?.total_pieces_expected ?? 1);
          $('damagedPieces').value = Number(found.damaged_pieces ?? 0);
          $('damagePresent').checked = Boolean(found.damage_present || Number(found.damaged_pieces || 0) > 0);
          $('damageClass').value = found.damage_class || '';
          $('packagingType').value = found.packaging_type || 'UNKNOWN';
        }
        renderHawbs(state.hawbs);
      });
    });
    updateKpis();
  }

  function renderReady(rows) {
    state.readyRows = rows;
    $('readyTable').querySelector('tbody').innerHTML = rows.map((row) => {
      const hawb = row?.hawbs || row?.hawb || row;
      const mawb = row?.mawbs || row?.mawb || hawb?.mawbs || row;
      return `<tr>
        <td>${escapeHtml(mawb?.mawb_number_display || mawb?.mawb_number || row?.mawb_id || '—')}</td>
        <td>${escapeHtml(hawb?.hawb_number || row?.hawb_number || row?.hawb_id || '—')}</td>
        <td><span class="status-pill">${escapeHtml(row.ready_status || row.release_status || row.cargo_status || hawb?.cargo_status || 'READY')}</span></td>
        <td>${escapeHtml(row.received_pieces ?? row.pieces_received ?? hawb?.total_pieces_expected ?? '—')}</td>
        <td>${escapeHtml(row.warehouse_inspection_id || row.inspection_id || '—')}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5">No ready-for-release HAWBs loaded.</td></tr>';
    updateKpis();
  }

  function selectedInspectionId() { return requireValue('selectedInspectionId', 'Selected Warehouse Inspection ID'); }
  function selectedHawbInspectionId() { return requireValue('selectedHawbInspectionId', 'Selected HAWB Inspection ID'); }

  async function loadInspections(statusOverride = null) {
    const payload = await window.OTTApi.warehouseInspections({
      q: $('q').value.trim(),
      status: statusOverride ?? $('statusFilter').value,
      includeDetails: false,
      limit: $('limit').value || 20,
      offset: 0
    });
    const rows = rowsOf(payload);
    state.inspections = rows;
    renderInspections(rows);
    return payload;
  }

  document.addEventListener('DOMContentLoaded', () => {
    setLoginBadge();

    $('btnHealth').addEventListener('click', () => run('/health', () => window.OTTApi.health()));
    $('btnVersion').addEventListener('click', () => run('/api/v1/version', () => window.OTTApi.version()));
    $('btnMe').addEventListener('click', () => run('/api/v1/auth/me', () => window.OTTApi.me()));

    $('btnLogin').addEventListener('click', async () => {
      await run('Supabase login', async () => {
        const result = await window.OTTAuth.loginWithPassword(requireValue('email', 'Email'), requireValue('password', 'Password'));
        setLoginBadge();
        return { user: result.user, hasAccessToken: Boolean(result.access_token) };
      });
    });

    $('btnLogout').addEventListener('click', () => {
      window.OTTAuth.logout();
      setLoginBadge();
      showOk('Logged out', { loggedOut: true });
    });

    $('btnStats').addEventListener('click', () => run('/api/v1/warehouse/stats', () => window.OTTApi.warehouseStats()));
    $('btnInspections').addEventListener('click', () => run('/api/v1/warehouse/inspections', () => loadInspections()));

    $('btnCreateInspection').addEventListener('click', () => run('Open Warehouse Inspection', async () => {
      const payload = await window.OTTApi.createWarehouseInspection({
        mawbId: requireValue('createMawbId', 'Create inspection MAWB ID'),
        recoveryJobId: null,
        arrivalType: $('arrivalType').value,
        notes: 'Opened from Phase 3E frontend integration page.',
        metadata: { phase: '3E', frontend_test: true }
      });
      const row = dataOf(payload);
      if (row?.id) $('selectedInspectionId').value = row.id;
      await loadInspections();
      return payload;
    }));

    $('btnLoadInspection').addEventListener('click', () => run('/api/v1/warehouse/inspections/:id', async () => {
      const payload = await window.OTTApi.warehouseInspection(selectedInspectionId());
      renderInspectionDetail(dataOf(payload));
      return payload;
    }));

    $('btnLoadHawbs').addEventListener('click', () => run('/api/v1/warehouse/inspections/:id/hawbs', async () => {
      const payload = await window.OTTApi.warehouseInspectionHawbs(selectedInspectionId(), { limit: 100, offset: 0 });
      renderHawbs(rowsOf(payload));
      return payload;
    }));

    $('btnAddInspectionNote').addEventListener('click', () => run('Add Warehouse Inspection Note', async () => {
      const payload = await window.OTTApi.addWarehouseInspectionNote(selectedInspectionId(), {
        noteScope: 'GENERAL',
        noteText: requireValue('inspectionNote', 'Inspection note'),
        isInternal: true
      });
      return payload;
    }));

    $('btnMarkHawbInspected').addEventListener('click', () => run('Mark HAWB Inspected', async () => {
      const damageLabels = $('damageLabels').value.split(',').map((item) => item.trim()).filter(Boolean);
      const damagePresent = $('damagePresent').checked || Number($('damagedPieces').value || 0) > 0;
      const payload = await window.OTTApi.markHawbInspected(selectedHawbInspectionId(), {
        receivedPieces: Number($('receivedPieces').value || 0),
        damagedPieces: Number($('damagedPieces').value || 0),
        damagePresent,
        damageClass: $('damageClass').value || null,
        damageLabels,
        packagingType: $('packagingType').value,
        notes: $('hawbNotes').value.trim() || 'Marked inspected from Phase 3E frontend page.',
        metadata: { phase: '3E', frontend_test: true }
      });
      const hawbs = await window.OTTApi.warehouseInspectionHawbs(selectedInspectionId(), { limit: 100, offset: 0 });
      renderHawbs(rowsOf(hawbs));
      const detail = await window.OTTApi.warehouseInspection(selectedInspectionId());
      renderInspectionDetail(dataOf(detail));
      return payload;
    }));

    $('btnAddHawbNote').addEventListener('click', () => run('Add HAWB Inspection Note', async () => {
      const payload = await window.OTTApi.addHawbInspectionNote(selectedHawbInspectionId(), {
        noteScope: Number($('damagedPieces').value || 0) > 0 ? 'DAMAGE' : 'HAWB',
        noteText: requireValue('hawbNotes', 'HAWB notes'),
        isInternal: true
      });
      return payload;
    }));

    $('btnReadyRelease').addEventListener('click', () => run('/api/v1/warehouse/ready-for-release', async () => {
      const params = { limit: 100, offset: 0 };
      if ($('selectedInspectionId').value.trim()) params.warehouseInspectionId = $('selectedInspectionId').value.trim();
      const payload = await window.OTTApi.readyForReleaseHawbs(params);
      renderReady(rowsOf(payload));
      return payload;
    }));
  });
})();
