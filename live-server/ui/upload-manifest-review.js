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
        source: 'upload_manifest_review',
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
          cargoDescription: 'Manifest review cargo',
          extractionConfidence: 0.96,
          reviewStatus: 'PENDING_REVIEW',
          reviewFlags: [],
          rawExtraction: {
            source: 'upload_manifest_review',
            note: 'AI/OCR cannot save directly to final MAWB/HAWB.'
          },
          hawbs: [
            {
              extractedHawbNumber: `HWB-${suffix}-001`,
              payorId,
              shipperName: 'Test Shipper',
              consigneeName: 'Test Consignee',
              cargoDescription: 'Frontend demo HAWB 1',
              totalPiecesExpected: Math.max(1, Math.floor(pieces / 2)),
              totalWeightKg: Math.max(1, Math.round(weight / 2)),
              chargeableWeightKg: Math.max(1, Math.round(weight / 2)),
              extractionConfidence: 0.95,
              reviewStatus: 'PENDING_REVIEW',
              reviewFlags: [],
              rawExtraction: { source: 'upload_manifest_review' }
            },
            {
              extractedHawbNumber: `HWB-${suffix}-002`,
              payorId,
              shipperName: 'Test Shipper',
              consigneeName: 'Test Consignee',
              cargoDescription: 'Frontend demo HAWB 2',
              totalPiecesExpected: Math.max(1, pieces - Math.floor(pieces / 2)),
              totalWeightKg: Math.max(1, Math.round(weight / 2)),
              chargeableWeightKg: Math.max(1, Math.round(weight / 2)),
              extractionConfidence: 0.94,
              reviewStatus: 'PENDING_REVIEW',
              reviewFlags: [],
              rawExtraction: { source: 'upload_manifest_review' }
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
      batchName: localFile?.name ? `${localFile.name}` : `Manifest Upload ${new Date().toISOString()}`,
      manifestType: 'AIR_CFS',
      selectedBillToPayor: false,
      originalPageCount: 1,
      fileReceivedAt: new Date().toISOString(),
      notes: 'Created from Upload Center.',
      metadata: {
        source: 'upload_manifest_review',
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
      extractionProvider: 'UPLOAD_MANIFEST_REVIEW',
      extractionModel: 'UI_REFERENCE_DEMO',
      extractionVersion: 'P3B',
      metadata: { source: 'upload_manifest_review' }
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
    const notes = $('reviewNotes').value.trim() || 'Office reviewed from Upload Center.';
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
    const notes = $('reviewNotes').value.trim() || 'Approved from Upload Center.';
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
    return window.OTTApi.rejectReviewQueue(reviewQueueId, { reason: 'Rejected from Upload Center.' });
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

  $('manifestFile').addEventListener('change', () => run('Create Manifest File Record Metadata', async () => {
    return await createManifestFileRecordFromSelectedFile();
  }));

function getManifestFileRecordInput() {
    const preferredIds = [
      'uploadFileId',
      'fileRecordId',
      'file_record_id',
      'existingFileRecordId',
      'existingFileRecordID',
      'manifestFileRecordId',
      'uploadFileRecordId'
    ];

    for (const id of preferredIds) {
      const el = $(id);
      if (el) return el;
    }

    const inputs = Array.from(document.querySelectorAll('input'));
    const match = inputs.find((input) => {
      const id = String(input.id || '').toLowerCase();
      const name = String(input.name || '').toLowerCase();
      const placeholder = String(input.placeholder || '').toLowerCase();
      const aria = String(input.getAttribute('aria-label') || '').toLowerCase();

      return (
        id.includes('filerecord') ||
        id.includes('file_record') ||
        id.includes('uploadfile') ||
        name.includes('filerecord') ||
        name.includes('file_record') ||
        name.includes('uploadfile') ||
        placeholder.includes('file_record') ||
        placeholder.includes('file record') ||
        placeholder.includes('upload file') ||
        aria.includes('file_record') ||
        aria.includes('file record') ||
        aria.includes('upload file')
      );
    });

    if (match) return match;

    const manifestFile = $('manifestFile');
    const created = document.createElement('input');
    created.id = 'uploadFileId';
    created.placeholder = 'Auto-created file_record_id';
    created.readOnly = true;
    created.style.marginTop = '8px';

    if (manifestFile && manifestFile.parentElement) {
      manifestFile.parentElement.appendChild(created);
    } else {
      document.body.appendChild(created);
    }

    return created;
  }

  function setManifestFileRecordId(fileRecordId) {
    const ids = [
      'uploadFileId',
      'fileRecordId',
      'file_record_id',
      'existingFileRecordId',
      'existingFileRecordID',
      'manifestFileRecordId',
      'uploadFileRecordId'
    ];

    for (const id of ids) {
      const el = $(id);
      if (el && 'value' in el) el.value = fileRecordId;
    }

    const input = getManifestFileRecordInput();
    if (input && 'value' in input) input.value = fileRecordId;
  }

  async function createManifestFileRecordFromSelectedFile() {
    const fileInput = $('manifestFile');
    const selectedFile = fileInput?.files?.[0] || null;

    if (!selectedFile) {
      throw new Error('Choose a PDF / manifest file first.');
    }

    const accessToken = window.OTTApi?.getAccessToken?.();
    if (!accessToken) {
      throw new Error('Login required before creating manifest file metadata.');
    }

    const apiBaseUrl = String(window.OTTApi?.API_BASE_URL || '').replace(/\/$/, '');
    if (!apiBaseUrl) {
      throw new Error('OTT API base URL is not configured.');
    }

    const safeName = String(selectedFile.name || 'manifest.pdf');
    const contentType = String(selectedFile.type || 'application/pdf');
    const fileSizeBytes = Number(selectedFile.size || 0);

    showWarn('Creating file_record_id metadata for selected manifest file...', {
      originalFilename: safeName,
      contentType,
      fileSizeBytes
    });

    const response = await fetch(apiBaseUrl + '/api/v1/manifest/file-records', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        originalFilename: safeName,
        storedFilename: safeName,
        contentType,
        fileSizeBytes,
        metadata: {
          source: 'upload_manifest_review_ui',
          phase: '7I-D',
          selected_from_browser: true
        }
      })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || 'Create file record failed with HTTP ' + response.status + '.';
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    const data = payload?.data ?? payload;
    const fileRecordId = data?.id || data?.fileRecordId || data?.file_record_id;

    if (!fileRecordId) {
      const error = new Error('Backend created file record response but no file_record_id was returned.');
      error.payload = payload;
      throw error;
    }

    setManifestFileRecordId(fileRecordId);

    showOk('Manifest file_record_id created. You can now click Create Manifest Upload.', {
      fileRecordId,
      originalFilename: data?.original_filename || safeName,
      bucketId: data?.bucket_id,
      categoryKey: data?.category_key,
      fileStatus: data?.file_status
    });

    return {
      success: true,
      fileRecordId,
      fileRecord: data
    };
  }



  // PHASE 7I-D CREATE UPLOAD GUARD START
  function findManifestFileRecordInputForGuard() {
    const ids = [
      'uploadFileId',
      'fileRecordId',
      'file_record_id',
      'existingFileRecordId',
      'existingFileRecordID',
      'manifestFileRecordId',
      'uploadFileRecordId'
    ];

    for (const id of ids) {
      const el = $(id);
      if (el) return el;
    }

    const inputs = Array.from(document.querySelectorAll('input'));
    return inputs.find((input) => {
      const id = String(input.id || '').toLowerCase();
      const name = String(input.name || '').toLowerCase();
      const placeholder = String(input.placeholder || '').toLowerCase();
      const labelText = String(input.closest('.field')?.textContent || '').toLowerCase();

      return (
        id.includes('file') ||
        name.includes('file') ||
        placeholder.includes('file_record') ||
        placeholder.includes('public.file_records') ||
        labelText.includes('existing file_record_id') ||
        labelText.includes('file_record_id from staging')
      );
    }) || null;
  }

  function getManifestFileRecordIdForGuard() {
    const input = findManifestFileRecordInputForGuard();
    return input && 'value' in input ? String(input.value || '').trim() : '';
  }

  function installCreateManifestUploadGuard() {
    const btn = $('btnCreateUpload');
    if (!btn || btn.dataset.phase7idCreateGuard === '1') return;

    btn.dataset.phase7idCreateGuard = '1';

    btn.addEventListener('click', async (event) => {
      if (window.__phase7idAllowCreateManifestUpload === true) {
        window.__phase7idAllowCreateManifestUpload = false;
        return;
      }

      const existingFileRecordId = getManifestFileRecordIdForGuard();
      if (existingFileRecordId) return;

      const selectedFile = $('manifestFile')?.files?.[0] || null;
      if (!selectedFile) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      await run('Create File Record, then Manifest Upload', async () => {
        const created = await createManifestFileRecordFromSelectedFile();

        const newFileRecordId = getManifestFileRecordIdForGuard();
        if (!newFileRecordId) {
          throw new Error('file_record_id was created but the UUID field was not filled.');
        }

        showOk('file_record_id created. Continuing with Create Manifest Upload...', {
          fileRecordId: newFileRecordId,
          created
        });

        window.__phase7idAllowCreateManifestUpload = true;
        setTimeout(() => btn.click(), 100);

        return {
          success: true,
          fileRecordId: newFileRecordId,
          next: 'Create Manifest Upload will continue automatically.'
        };
      });
    }, true);
  }

  installCreateManifestUploadGuard();
  setTimeout(installCreateManifestUploadGuard, 300);
  setTimeout(installCreateManifestUploadGuard, 1000);
  // PHASE 7I-D CREATE UPLOAD GUARD END


  wireClaudeManifestSandboxPanel();
  wireClaudeManifestSaveToReviewButton();
  setLoginBadge();
  fillDemoDefaults();

  function claudeSampleManifestText() {
    return `MAWB 880-31338227
Airline: Test Airline
Origin: LAX
Destination: MIA
Total Pieces: 10
Gross Weight: 1200 KG
Payor: OTT INTERNAL TEST

HAWB ABC123
Pieces: 5
Weight: 600 KG
Shipper: Test Shipper A
Consignee: Test Consignee A
Description: General cargo

HAWB DEF456
Pieces: 5
Weight: 600 KG
Shipper: Test Shipper B
Consignee: Test Consignee B
Description: Machinery parts

Equipment: PMC 12345AA`;
  }

  async function testClaudeManifestExtractionSandbox() {
    const textEl = $('claudeManifestText');
    const outputEl = $('claudeExtractionOutput');
    const rawEl = $('claudeExtractionRaw');

    const manifestText = textEl?.value?.trim() || '';
    if (!manifestText) {
      throw new Error('Manifest text is required for Claude extraction test.');
    }

    const accessToken = window.OTTApi?.getAccessToken?.();
    if (!accessToken) {
      throw new Error('Login required before running Claude extraction test.');
    }

    const apiBaseUrl = String(window.OTTApi?.API_BASE_URL || '').replace(/\/$/, '');
    if (!apiBaseUrl) {
      throw new Error('OTT API base URL is not configured.');
    }

    if (outputEl) outputEl.textContent = 'Running Claude extraction sandbox...';
    if (rawEl) rawEl.textContent = 'Waiting for Claude response...';

    const response = await fetch(`${apiBaseUrl}/api/v1/ai/claude/manifest-extract-test`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ manifestText })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || `Claude extraction failed with HTTP ${response.status}.`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    const extraction = payload?.data?.extraction ?? payload?.data ?? payload;

    if (outputEl) {
      outputEl.textContent = JSON.stringify(extraction, null, 2);
    }

    if (rawEl) {
      rawEl.textContent = JSON.stringify(payload, null, 2);
    }

    return payload;
  }



  async function saveClaudeManifestExtractionToReviewQueue() {
    const manifestUploadId = requireValue('manifestUploadId', 'Manifest Upload ID');
    const textEl = $('claudeManifestText');
    const outputEl = $('claudeExtractionOutput');
    const rawEl = $('claudeExtractionRaw');

    const manifestText = textEl?.value?.trim() || '';
    if (!manifestText) {
      throw new Error('Manifest text is required before saving Claude extraction to review.');
    }

    const accessToken = window.OTTApi?.getAccessToken?.();
    if (!accessToken) {
      throw new Error('Login required before saving Claude extraction to review.');
    }

    const apiBaseUrl = String(window.OTTApi?.API_BASE_URL || '').replace(/\/$/, '');
    if (!apiBaseUrl) {
      throw new Error('OTT API base URL is not configured.');
    }

    if (outputEl) outputEl.textContent = 'Saving Claude extraction to manifest review holding tables...';
    if (rawEl) rawEl.textContent = 'Waiting for save response...';

    const response = await fetch(`${apiBaseUrl}/api/v1/ai/claude/manifest-to-review`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        manifestUploadId,
        manifestText
      })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || `Save Claude extraction failed with HTTP ${response.status}.`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    const data = payload?.data ?? payload;

    if (outputEl) {
      outputEl.textContent = JSON.stringify({
        savedToReviewHolding: true,
        manifestUploadId: data?.manifestUploadId,
        extractionSessionId: data?.extractionSessionId,
        insertedMawbs: data?.insertedMawbs,
        insertedHawbs: data?.insertedHawbs,
        reviewQueueCreatedCount: data?.reviewQueueCreatedCount,
        warning: data?.warning || 'Saved to manifest review holding tables only. No final cargo records were created.'
      }, null, 2);
    }

    if (rawEl) {
      rawEl.textContent = JSON.stringify(payload, null, 2);
    }

    const reviewPayload = await window.OTTApi.manifestReviewQueue({ status: 'PENDING_REVIEW', limit: 25, offset: 0 });
    const rows = rowsOf(reviewPayload);
    renderReviewQueue(rows);

    return {
      saveResult: data,
      reviewQueue: {
        count: rows.length,
        rows
      }
    };
  }

  function wireClaudeManifestSandboxPanel() {
    const btnClaudeManifestSample = $('btnClaudeManifestSample');
    if (btnClaudeManifestSample) {
      btnClaudeManifestSample.addEventListener('click', () => {
        $('claudeManifestText').value = claudeSampleManifestText();
        $('claudeExtractionOutput').textContent = 'Sample manifest text loaded. Click Test Claude Extraction.';
        $('claudeExtractionRaw').textContent = 'No raw Claude response yet.';
      });
    }

    const btnClaudeManifestClear = $('btnClaudeManifestClear');
    if (btnClaudeManifestClear) {
      btnClaudeManifestClear.addEventListener('click', () => {
        $('claudeManifestText').value = '';
        $('claudeExtractionOutput').textContent = 'No Claude extraction run yet.';
        $('claudeExtractionRaw').textContent = 'No raw Claude response yet.';
      });
    }

    const btnClaudeManifestTest = $('btnClaudeManifestTest');
    if (btnClaudeManifestTest) {
      btnClaudeManifestTest.addEventListener('click', () => run('Claude Manifest Extraction Sandbox', testClaudeManifestExtractionSandbox));
    }
  }


  function wireClaudeManifestSaveToReviewButton() {
    const btnClaudeManifestSaveToReview = $('btnClaudeManifestSaveToReview');
    if (btnClaudeManifestSaveToReview) {
      btnClaudeManifestSaveToReview.addEventListener('click', () => {
        run('Save Claude Extraction to Review Queue', saveClaudeManifestExtractionToReviewQueue);
      });
    }
  }

})();
