(function () {
  const state = {
    payors: [],
    lastReviewItem: null,
    lastApproval: null
  };

  const $ = (id) => document.getElementById(id);
  const output = $('output');
  const status = $('status');

  function showOk(label, payload) {
    status.innerHTML = `<span class="pass">PASS</span> ${escapeHtml(label)}`;
    output.textContent = JSON.stringify(payload, null, 2);
  }

  function showWarn(label, payload) {
    status.innerHTML = `<span class="fail">WARN</span> ${escapeHtml(label)}`;
    output.textContent = JSON.stringify(payload, null, 2);
  }

  function showError(label, error) {
    status.innerHTML = `<span class="fail">FAIL</span> ${escapeHtml(label)}`;
    output.textContent = JSON.stringify({ message: error.message, status: error.status, payload: error.payload }, null, 2);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
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

  function dataOf(payload) {
    return payload?.data ?? payload;
  }

  function rowsOf(payload) {
    const data = dataOf(payload);
    return data?.rows ?? [];
  }

  function todayDateOnly(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  function randomDigits(count) {
    let result = '';
    for (let i = 0; i < count; i += 1) result += Math.floor(Math.random() * 10);
    return result;
  }

  function defaultMawb() {
    return `999-${randomDigits(8)}`;
  }

  function requireValue(id, label) {
    const value = $(id).value.trim();
    if (!value) throw new Error(`${label} is required.`);
    return value;
  }

  function selectedPayorIdOrNull() {
    return $('payorSelect').value || null;
  }

  function selectedFileMetadata() {
    const file = $('manifestFile').files?.[0];
    if (!file) return null;
    return {
      name: file.name,
      type: file.type || null,
      size: file.size,
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
    };
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

  function fillDemoDefaults() {
    if (!$('demoMawb').value.trim()) $('demoMawb').value = defaultMawb();
  }

  function buildDemoExtractionPayload() {
    const mawbNumber = requireValue('demoMawb', 'Demo MAWB');
    const payorId = selectedPayorIdOrNull();
    const pieces = Number($('demoPieces').value || 10);
    const weight = Number($('demoWeight').value || 1200);
    const suffix = randomDigits(5);

    return {
      overallConfidence: 0.96,
      metadata: {
        frontend_phase: '3B',
        created_from: 'upload-manifest-review.html',
        local_file: selectedFileMetadata()
      },
      extractedMawbs: [
        {
          extractedMawbNumber: mawbNumber,
          payorId,
          originCode: 'LAX',
          destinationCode: 'LAX',
          flightNumber: `OTT${suffix.slice(0, 3)}`,
          flightDate: todayDateOnly(),
          etaAt: new Date().toISOString(),
          lastFreeDay: todayDateOnly(3),
          totalPiecesExpected: pieces,
          totalWeightKg: weight,
          chargeableWeightKg: weight,
          cargoDescription: 'Phase 3B frontend integration demo cargo',
          extractionConfidence: 0.96,
          reviewStatus: 'PENDING_REVIEW',
          reviewFlags: [],
          rawExtraction: {
            source: 'phase3b_frontend_demo',
            note: 'AI/OCR cannot save directly to final MAWB/HAWB.'
          },
          hawbs: [
            {
              extractedHawbNumber: `HWB-${suffix}-001`,
              payorId,
              shipperName: 'Phase 3B Test Shipper',
              consigneeName: 'Phase 3B Test Consignee',
              cargoDescription: 'Frontend demo HAWB 1',
              totalPiecesExpected: Math.max(1, Math.floor(pieces / 2)),
              totalWeightKg: Math.max(1, Math.round(weight / 2)),
              chargeableWeightKg: Math.max(1, Math.round(weight / 2)),
              extractionConfidence: 0.95,
              reviewStatus: 'PENDING_REVIEW',
              reviewFlags: [],
              rawExtraction: { source: 'phase3b_frontend_demo' }
            },
            {
              extractedHawbNumber: `HWB-${suffix}-002`,
              payorId,
              shipperName: 'Phase 3B Test Shipper',
              consigneeName: 'Phase 3B Test Consignee',
              cargoDescription: 'Frontend demo HAWB 2',
              totalPiecesExpected: Math.max(1, pieces - Math.floor(pieces / 2)),
              totalWeightKg: Math.max(1, Math.round(weight / 2)),
              chargeableWeightKg: Math.max(1, Math.round(weight / 2)),
              extractionConfidence: 0.94,
              reviewStatus: 'PENDING_REVIEW',
              reviewFlags: [],
              rawExtraction: { source: 'phase3b_frontend_demo' }
            }
          ]
        }
      ]
    };
  }

  function fillPayorSelect(rows) {
    const select = $('payorSelect');
    select.innerHTML = '<option value="">No payor selected</option>';
    rows.forEach((payor) => {
      const option = document.createElement('option');
      option.value = payor.id;
      option.textContent = payor.display_name || payor.payor_name || payor.payor_code || payor.id;
      select.appendChild(option);
    });
  }

  function renderReviewQueue(rows) {
    const tbody = $('reviewQueueTable').querySelector('tbody');
    tbody.innerHTML = '';

    rows.forEach((item) => {
      const tr = document.createElement('tr');
      const mawb = item.manifest_extracted_mawbs?.extracted_mawb_number || item.extracted_mawb_number || item.extracted_mawb_id || '—';
      tr.innerHTML = `
        <td>${escapeHtml(item.queue_status || item.status || '—')}</td>
        <td>${escapeHtml(item.priority || '—')}</td>
        <td>${escapeHtml(mawb)}</td>
        <td>${escapeHtml(item.created_at || '—')}</td>
        <td><button data-review-id="${escapeHtml(item.id)}">Select</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-review-id]').forEach((button) => {
      button.addEventListener('click', () => {
        $('reviewQueueId').value = button.getAttribute('data-review-id');
      });
    });
  }

  function hydrateReviewFields(item) {
    state.lastReviewItem = item;
    const extractedMawbId = item.extracted_mawb_id || item.manifest_extracted_mawbs?.id || '';
    const firstHawb = Array.isArray(item.extracted_hawbs) ? item.extracted_hawbs[0] : null;
    $('extractedMawbId').value = extractedMawbId;
    $('extractedHawbId').value = firstHawb?.id || '';
    if (item.manifest_extracted_mawbs?.extracted_mawb_number) {
      $('cargoSearch').value = item.manifest_extracted_mawbs.extracted_mawb_number;
    }
  }

  function findFinalMawbId(payload) {
    const data = dataOf(payload);
    return data?.final_mawb_id || data?.finalMawbId || data?.mawb_id || data?.final_mawb?.id || data?.id || null;
  }

  async function searchCargoByMawb(mawbNumber) {
    const payload = await window.OTTApi.cargoMawbs({ q: mawbNumber, includeHawbs: true, limit: 10 });
    const rows = rowsOf(payload);
    return { payload, rows };
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

  $('btnLoadPayors').addEventListener('click', () => run('Load Payors', async () => {
    const payload = await window.OTTApi.adminPayors({ isActive: true, limit: 200 });
    const rows = rowsOf(payload);
    state.payors = rows;
    fillPayorSelect(rows);
    return { count: rows.length, rows };
  }));

  $('btnManifestStats').addEventListener('click', () => run('/manifest/stats', () => window.OTTApi.manifestStats()));

  $('btnCreateUpload').addEventListener('click', () => run('Create Manifest Upload', async () => {
    const uploadFileId = requireValue('fileRecordId', 'Existing file_record_id');
    const payorId = selectedPayorIdOrNull();
    const localFile = selectedFileMetadata();
    const body = {
      uploadFileId,
      payorId,
      uploadReference: `UI-P3B-${Date.now()}`,
      batchName: localFile?.name ? `Phase 3B ${localFile.name}` : `Phase 3B Upload ${new Date().toISOString()}`,
      manifestType: 'AIR_CFS',
      selectedBillToPayor: false,
      originalPageCount: 1,
      fileReceivedAt: new Date().toISOString(),
      notes: 'Created from Phase 3B frontend Upload Center integration page.',
      metadata: {
        frontend_phase: '3B',
        local_file: localFile,
        browser: navigator.userAgent
      }
    };
    const payload = await window.OTTApi.createManifestUpload(body);
    const upload = dataOf(payload);
    $('manifestUploadId').value = upload?.id || '';
    return payload;
  }));

  $('btnListUploads').addEventListener('click', () => run('List Manifest Uploads', () => window.OTTApi.manifestUploads({ limit: 10, offset: 0 })));

  $('btnCompleteDemoExtraction').addEventListener('click', () => run('Start + Complete Demo Extraction', async () => {
    const manifestUploadId = requireValue('manifestUploadId', 'Manifest Upload ID');
    const sessionPayload = await window.OTTApi.createExtractionSession({
      manifestUploadId,
      extractionProvider: 'PHASE3B_FRONTEND_DEMO',
      extractionModel: 'UI_REFERENCE_DEMO',
      extractionVersion: 'P3B',
      metadata: { frontend_phase: '3B' }
    });
    const session = dataOf(sessionPayload);
    const completedPayload = await window.OTTApi.completeExtractionSession(session.id, buildDemoExtractionPayload());
    return { session: dataOf(sessionPayload), completed: dataOf(completedPayload) };
  }));

  $('btnLoadReviewQueue').addEventListener('click', () => run('Load Review Queue', async () => {
    const payload = await window.OTTApi.manifestReviewQueue({ status: 'PENDING_REVIEW', limit: 25, offset: 0 });
    const rows = rowsOf(payload);
    renderReviewQueue(rows);
    return { count: rows.length, rows };
  }));

  $('btnLoadReviewItem').addEventListener('click', () => run('Load Review Item', async () => {
    const reviewQueueId = requireValue('reviewQueueId', 'Review Queue ID');
    const payload = await window.OTTApi.manifestReviewQueueItem(reviewQueueId);
    const item = dataOf(payload);
    hydrateReviewFields(item);
    return item;
  }));

  $('btnSaveReviewNotes').addEventListener('click', () => run('Save Office Review Notes', async () => {
    const extractedMawbId = requireValue('extractedMawbId', 'Extracted MAWB ID');
    const notes = $('reviewNotes').value.trim() || 'Office reviewed from Phase 3B.';
    const mawbPayload = await window.OTTApi.updateExtractedMawb(extractedMawbId, {
      reviewNotes: notes,
      reviewStatus: 'PENDING_REVIEW'
    });

    const extractedHawbId = $('extractedHawbId').value.trim();
    let hawbPayload = null;
    if (extractedHawbId) {
      hawbPayload = await window.OTTApi.updateExtractedHawb(extractedHawbId, {
        reviewNotes: notes,
        reviewStatus: 'PENDING_REVIEW'
      });
    }

    return { mawb: dataOf(mawbPayload), hawb: hawbPayload ? dataOf(hawbPayload) : null };
  }));

  $('btnApproveReview').addEventListener('click', () => run('Approve Review', async () => {
    const reviewQueueId = requireValue('reviewQueueId', 'Review Queue ID');
    const notes = $('reviewNotes').value.trim() || 'Approved from Phase 3B frontend integration page.';
    const payload = await window.OTTApi.approveReviewQueue(reviewQueueId, { notes });
    state.lastApproval = payload;
    const finalMawbId = findFinalMawbId(payload);
    if (finalMawbId) $('finalMawbId').value = finalMawbId;
    const mawbNumber = $('demoMawb').value.trim() || state.lastReviewItem?.manifest_extracted_mawbs?.extracted_mawb_number;
    if (mawbNumber) $('cargoSearch').value = mawbNumber;
    return { approval: dataOf(payload), finalMawbId };
  }));

  $('btnRejectReview').addEventListener('click', () => run('Reject Review', async () => {
    const reviewQueueId = requireValue('reviewQueueId', 'Review Queue ID');
    return window.OTTApi.rejectReviewQueue(reviewQueueId, { reason: 'Rejected from Phase 3B frontend test page.' });
  }));

  $('btnLoadFinalCargo').addEventListener('click', () => run('Load Final Cargo MAWB', async () => {
    const finalMawbId = $('finalMawbId').value.trim();
    if (finalMawbId) return window.OTTApi.cargoMawb(finalMawbId);
    const mawbNumber = requireValue('cargoSearch', 'Search MAWB');
    const { rows } = await searchCargoByMawb(mawbNumber);
    if (!rows.length) throw new Error(`No Cargo Management MAWB found for ${mawbNumber}.`);
    $('finalMawbId').value = rows[0].id;
    return window.OTTApi.cargoMawb(rows[0].id);
  }));

  $('btnSearchCargo').addEventListener('click', () => run('Search Cargo', async () => {
    const mawbNumber = requireValue('cargoSearch', 'Search MAWB');
    const { payload, rows } = await searchCargoByMawb(mawbNumber);
    if (rows[0]?.cargo_status === 'NEW') {
      showOk('Search Cargo — final approved MAWB status is NEW', payload);
    }
    return payload;
  }));

  $('manifestFile').addEventListener('change', () => {
    const file = selectedFileMetadata();
    if (file) showWarn('Local file selected. Enter an existing file_record_id to save manifest metadata.', file);
  });

  setLoginBadge();
  fillDemoDefaults();
})();
