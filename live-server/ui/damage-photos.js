(function () {
  const state = {
    records: [],
    requirements: [],
    photos: [],
    blocks: []
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
  function countOf(payload) { return dataOf(payload)?.count ?? rowsOf(payload).length; }

  function requireValue(id, label) {
    const value = $(id).value.trim();
    if (!value) throw new Error(`${label} is required.`);
    return value;
  }

  function optValue(id) {
    const value = $(id).value.trim();
    return value.length ? value : null;
  }

  function mawbDisplay(row) {
    const mawb = row?.mawbs || row?.mawb || row?.hawbs?.mawbs || row;
    return mawb?.mawb_number_display || mawb?.mawb_number || row?.mawb_number_display || row?.mawb_id || '—';
  }

  function hawbDisplay(row) {
    const hawb = row?.hawbs || row?.hawb || row;
    return hawb?.hawb_number || row?.hawb_number || row?.hawb_id || '—';
  }

  function fileDisplay(row) {
    const file = row?.file_records || row?.file || row;
    return file?.original_filename || file?.object_path || row?.file_record_id || '—';
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

  function updateKpis() {
    $('kpiRecords').textContent = String(state.records.length);
    $('kpiRequirements').textContent = String(state.requirements.length);
    $('kpiPhotos').textContent = String(state.photos.length);
    $('kpiBlocks').textContent = String(state.blocks.length);
  }

  function renderDetail(row) {
    const tbody = $('detailTable').querySelector('tbody');
    if (!row) {
      tbody.innerHTML = '<tr><td>No detail loaded.</td></tr>';
      return;
    }
    const safe = Object.entries(row).slice(0, 40).map(([key, value]) => {
      let printable = value;
      if (value && typeof value === 'object') printable = JSON.stringify(value);
      return `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(printable ?? '—')}</td></tr>`;
    }).join('');
    tbody.innerHTML = safe || '<tr><td>No detail loaded.</td></tr>';
  }

  function renderRecords(rows) {
    state.records = rows;
    const tbody = $('recordsTable').querySelector('tbody');
    tbody.innerHTML = rows.map((row) => {
      const selected = $('selectedDamageRecordId').value === row.id;
      return `<tr class="${selected ? 'selected' : ''}">
        <td><span class="status-pill">${escapeHtml(row.damage_status || row.status || '—')}</span></td>
        <td>${escapeHtml(mawbDisplay(row))}</td>
        <td>${escapeHtml(hawbDisplay(row))}</td>
        <td>${escapeHtml(row.damage_class || row.damage_severity_class || '—')}</td>
        <td>${escapeHtml(row.required_photo_count ?? row.photo_count_required ?? '—')}</td>
        <td>${escapeHtml(row.uploaded_photo_count ?? row.active_photo_count ?? row.photo_count_uploaded ?? '—')}</td>
        <td><button data-select-record="${escapeHtml(row.id)}">Select</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">No damage records loaded.</td></tr>';
    tbody.querySelectorAll('[data-select-record]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-select-record');
        $('selectedDamageRecordId').value = id;
        const row = state.records.find((item) => item.id === id);
        if (row) renderDetail(row);
        renderRecords(state.records);
      });
    });
    updateKpis();
  }

  function renderRequirements(rows) {
    state.requirements = rows;
    const tbody = $('requirementsTable').querySelector('tbody');
    tbody.innerHTML = rows.map((row) => {
      const selected = $('selectedRequirementId').value === row.id;
      return `<tr class="${selected ? 'selected' : ''}">
        <td><span class="status-pill">${escapeHtml(row.requirement_status || row.status || '—')}</span></td>
        <td>${escapeHtml(row.requirement_type || '—')}</td>
        <td>${escapeHtml(mawbDisplay(row))}</td>
        <td>${escapeHtml(hawbDisplay(row))}</td>
        <td>${escapeHtml(row.required_photo_count ?? row.photo_count_required ?? '—')}</td>
        <td>${escapeHtml(row.uploaded_photo_count ?? row.active_photo_count ?? row.photo_count_uploaded ?? '—')}</td>
        <td><button data-select-requirement="${escapeHtml(row.id)}">Select</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">No damage requirements loaded.</td></tr>';
    tbody.querySelectorAll('[data-select-requirement]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-select-requirement');
        $('selectedRequirementId').value = id;
        const row = state.requirements.find((item) => item.id === id);
        if (row) {
          if (row.damage_record_id) $('selectedDamageRecordId').value = row.damage_record_id;
          renderDetail(row);
        }
        renderRequirements(state.requirements);
      });
    });
    updateKpis();
  }

  function renderPhotos(rows) {
    state.photos = rows;
    const tbody = $('photosTable').querySelector('tbody');
    tbody.innerHTML = rows.map((row) => {
      const selected = $('selectedPhotoId').value === row.id;
      return `<tr class="${selected ? 'selected' : ''}">
        <td><span class="status-pill">${escapeHtml(row.photo_status || row.status || '—')}</span></td>
        <td>${escapeHtml(row.photo_type || '—')}</td>
        <td>${escapeHtml(fileDisplay(row))}</td>
        <td>${escapeHtml(mawbDisplay(row))}</td>
        <td>${escapeHtml(hawbDisplay(row))}</td>
        <td>${escapeHtml(row.caption || '—')}</td>
        <td><button data-select-photo="${escapeHtml(row.id)}">Select</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">No damage photos loaded.</td></tr>';
    tbody.querySelectorAll('[data-select-photo]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-select-photo');
        $('selectedPhotoId').value = id;
        const row = state.photos.find((item) => item.id === id);
        if (row) renderDetail(row);
        renderPhotos(state.photos);
      });
    });
    updateKpis();
  }

  function renderBlocks(rows) {
    state.blocks = rows;
    const tbody = $('blocksTable').querySelector('tbody');
    tbody.innerHTML = rows.map((row) => `<tr>
      <td>${escapeHtml(mawbDisplay(row))}</td>
      <td>${escapeHtml(hawbDisplay(row))}</td>
      <td>${escapeHtml(row.block_type || row.release_block_type || 'DAMAGE_PHOTOS')}</td>
      <td><span class="status-pill">${escapeHtml(row.requirement_status || row.status || 'OPEN')}</span></td>
      <td>${escapeHtml(row.reason || row.requirement_id || row.damage_requirement_id || '—')}</td>
    </tr>`).join('') || '<tr><td colspan="5">No release blocks loaded.</td></tr>';
    updateKpis();
  }

  function selectedRecordId() { return requireValue('selectedDamageRecordId', 'Selected Damage Record ID'); }
  function selectedRequirementId() { return requireValue('selectedRequirementId', 'Selected Requirement ID'); }
  function selectedPhotoId() { return requireValue('selectedPhotoId', 'Selected Photo ID'); }

  async function loadRecords() {
    const payload = await window.OTTApi.damageRecords({
      q: $('q').value.trim(),
      status: $('recordStatus').value,
      includeDetails: true,
      limit: $('limit').value || 25,
      offset: 0
    });
    renderRecords(rowsOf(payload));
    return payload;
  }

  async function loadRequirements(openOnly = false) {
    const payload = await window.OTTApi.damageRequirements({
      status: $('requirementStatus').value,
      openOnly,
      includePhotos: true,
      limit: $('limit').value || 25,
      offset: 0
    });
    renderRequirements(rowsOf(payload));
    return payload;
  }

  async function loadPhotos() {
    const payload = await window.OTTApi.damagePhotos({
      limit: $('limit').value || 25,
      offset: 0
    });
    renderPhotos(rowsOf(payload));
    return payload;
  }

  async function loadBlocks() {
    const payload = await window.OTTApi.damageReleaseBlocks({
      limit: $('limit').value || 25,
      offset: 0
    });
    renderBlocks(rowsOf(payload));
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

    $('btnStats').addEventListener('click', () => run('/api/v1/damage/stats', () => window.OTTApi.damageStats()));
    $('btnRecords').addEventListener('click', () => run('/api/v1/damage/records', () => loadRecords()));
    $('btnRequirements').addEventListener('click', () => run('/api/v1/damage/requirements', () => loadRequirements(false)));
    $('btnPhotos').addEventListener('click', () => run('/api/v1/damage/photos', () => loadPhotos()));
    $('btnReleaseBlocks').addEventListener('click', () => run('/api/v1/damage/release-blocks', () => loadBlocks()));

    $('btnEnsureRecord').addEventListener('click', () => run('Ensure Damage Record', async () => {
      const payload = await window.OTTApi.ensureDamageRecord(requireValue('hawbInspectionId', 'HAWB Inspection ID'), {
        requiredPhotoCount: Number($('requiredPhotoCount').value || 0),
        metadata: { source: 'damage_photos' }
      });
      const row = dataOf(payload);
      if (row?.id) $('selectedDamageRecordId').value = row.id;
      if (row?.requirements?.[0]?.id) $('selectedRequirementId').value = row.requirements[0].id;
      await loadRecords();
      await loadRequirements(true);
      return payload;
    }));

    $('btnLoadRecord').addEventListener('click', () => run('/api/v1/damage/records/:id', async () => {
      const payload = await window.OTTApi.damageRecord(selectedRecordId());
      renderDetail(dataOf(payload));
      return payload;
    }));

    $('btnLoadRequirement').addEventListener('click', () => run('/api/v1/damage/requirements/:id', async () => {
      const payload = await window.OTTApi.damageRequirement(selectedRequirementId());
      renderDetail(dataOf(payload));
      return payload;
    }));

    $('btnLoadPhoto').addEventListener('click', () => run('/api/v1/damage/photos/:id', async () => {
      const payload = await window.OTTApi.damagePhoto(selectedPhotoId());
      renderDetail(dataOf(payload));
      return payload;
    }));

    $('btnRegisterPhoto').addEventListener('click', () => run('Register Damage Photo', async () => {
      const payload = await window.OTTApi.registerDamagePhoto(selectedRequirementId(), {
        fileRecordId: requireValue('fileRecordId', 'Existing damage photo file_record_id'),
        photoType: $('photoType').value,
        pieceIdentifier: optValue('pieceIdentifier'),
        caption: optValue('caption'),
        metadata: { source: 'damage_photos' }
      });
      const row = dataOf(payload);
      if (row?.id) $('selectedPhotoId').value = row.id;
      await loadRequirements(false);
      await loadPhotos();
      await loadBlocks();
      return payload;
    }));

    $('btnWaiveRequirement').addEventListener('click', () => run('Waive Damage Requirement', async () => {
      const payload = await window.OTTApi.waiveDamageRequirement(selectedRequirementId(), {
        waiverReason: requireValue('actionReason', 'Reason'),
        metadata: { source: 'damage_photos' }
      });
      await loadRequirements(false);
      await loadRecords();
      await loadBlocks();
      return payload;
    }));

    $('btnRejectPhoto').addEventListener('click', () => run('Reject Damage Photo', async () => {
      const payload = await window.OTTApi.rejectDamagePhoto(selectedPhotoId(), {
        rejectionReason: requireValue('actionReason', 'Reason'),
        metadata: { source: 'damage_photos' }
      });
      await loadPhotos();
      await loadRequirements(false);
      return payload;
    }));

    $('btnVoidPhoto').addEventListener('click', () => run('Void Damage Photo', async () => {
      const payload = await window.OTTApi.voidDamagePhoto(selectedPhotoId(), {
        voidReason: requireValue('actionReason', 'Reason'),
        metadata: { source: 'damage_photos' }
      });
      await loadPhotos();
      await loadRequirements(false);
      return payload;
    }));
  });
})();
