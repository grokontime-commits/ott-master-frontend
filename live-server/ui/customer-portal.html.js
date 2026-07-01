// PHASE_8E_J_CUSTOMER_PORTAL_UI_POLISH

(function () {
  const $ = (id) => document.getElementById(id);
  const state = { me: null, payors: [], accounts: [], users: [], cargoMawbs: [], currentMawb: null, myAccounts: [], myMawbs: [], myHawbs: [], myReleases: [], myDamage: [], myFiles: [] };

  function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function setOutput(label, payload, ok = true) { $('output').textContent = `${ok ? 'PASS' : 'FAIL'} ${label}\n` + JSON.stringify(payload, null, 2); }
  async function run(label, fn) { try { const result = await fn(); setOutput(label, result, true); return result; } catch (error) { setOutput(label, { message: error.message, status: error.status, payload: error.payload }, false); return null; } }
  function data(payload) { return payload?.data ?? payload; }
  function rows(payload) { const d = data(payload); return d?.rows || (Array.isArray(d) ? d : []); }
  function count(payload) { const d = data(payload); return d?.count ?? rows(payload).length ?? 0; }
  function setLoginBadge() { const badge = $('loginBadge'); if (window.OTTAuth?.isLoggedIn()) { badge.className = 'badge ok'; badge.textContent = 'Logged in'; } else { badge.className = 'badge'; badge.textContent = 'Not logged in'; } }
  function mawbDisplay(row) { return row?.mawb_number_display || row?.mawb_number || row?.mawbs?.mawb_number_display || row?.mawb_id || '—'; }
  function hawbDisplay(row) { return row?.hawb_number || row?.hawbs?.hawb_number || row?.hawb_id || '—'; }
  function payorDisplay(row) { return row?.payors?.display_name || row?.payors?.payor_name || row?.payor_name || row?.payor_id || '—'; }
  function airlineDisplay(row) { return row?.airlines?.display_name || row?.airlines?.airline_name || row?.airlines?.airline_code || row?.airline_name || row?.airline_id || '—'; }
  function statusPill(status) { return `<span class="status-pill">${escapeHtml(status || '—')}</span>`; }

  function updateKpis(statsPayload) {
    const s = data(statsPayload) || {};
    $('kpiAccounts').textContent = s.portalAccounts ?? '—';
    $('kpiUsers').textContent = s.portalUsers ?? '—';
    $('kpiMawbs').textContent = s.activeMawbAssignments ?? '—';
    $('kpiFiles').textContent = s.activeFileAssignments ?? '—';
    $('kpiEvents').textContent = s.accessEvents ?? '—';
  }

  function renderPayors() {
    $('payorSelect').innerHTML = '<option value="">Select Payor</option>' + state.payors.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.display_name || p.payor_name || p.payor_code || p.id)}</option>`).join('');
  }

  function selectAccount(accountId) {
    $('selectedAccountId').value = accountId || '';
    $('eventPortalAccountId').value = accountId || $('eventPortalAccountId').value;
    renderAccounts();
  }

  function renderAccounts() {
    const body = $('accountsBody');
    if (!state.accounts.length) { body.innerHTML = '<tr><td colspan="5">No accounts loaded.</td></tr>'; return; }
    const selected = $('selectedAccountId').value;
    body.innerHTML = state.accounts.map((a) => `
      <tr class="${a.id === selected ? 'selected' : ''}">
        <td><b>${escapeHtml(a.account_name)}</b><br><span class="muted">${escapeHtml(a.account_code || a.id)}</span></td>
        <td>${statusPill(a.account_status)}</td>
        <td>${escapeHtml(payorDisplay(a))}</td>
        <td>${escapeHtml(a.visibility_level || '—')}</td>
        <td><button class="mini" data-account-id="${escapeHtml(a.id)}">Select</button></td>
      </tr>`).join('');
    body.querySelectorAll('[data-account-id]').forEach((btn) => btn.addEventListener('click', () => selectAccount(btn.dataset.accountId)));
  }

  function selectCargoMawb(mawbId) {
    $('selectedMawbId').value = mawbId || '';
    $('myMawbId').value = mawbId || $('myMawbId').value;
    renderCargoMawbs();
  }

  function renderCargoMawbs() {
    const body = $('cargoBody');
    if (!state.cargoMawbs.length) { body.innerHTML = '<tr><td colspan="5">No customer-visible cargo loaded.</td></tr>'; return; }
    const selected = $('selectedMawbId').value;
    body.innerHTML = state.cargoMawbs.map((m) => `
      <tr class="${m.id === selected ? 'selected' : ''}">
        <td><b>${escapeHtml(mawbDisplay(m))}</b><br><span class="muted">${escapeHtml(m.id)}</span></td>
        <td>${statusPill(m.cargo_status)}</td>
        <td>${escapeHtml(payorDisplay(m))}</td>
        <td>${escapeHtml(airlineDisplay(m))}</td>
        <td><button class="mini" data-mawb-id="${escapeHtml(m.id)}">Select</button></td>
      </tr>`).join('');
    body.querySelectorAll('[data-mawb-id]').forEach((btn) => btn.addEventListener('click', () => selectCargoMawb(btn.dataset.mawbId)));
  }

  function selectHawb(hawbId) {
    $('selectedHawbId').value = hawbId || '';
    $('fileHawbId').value = hawbId || $('fileHawbId').value;
    $('myHawbId').value = hawbId || $('myHawbId').value;
    renderHawbs();
  }

  function getCurrentHawbs() {
    const links = state.currentMawb?.mawb_hawb_links || [];
    return links.map((link) => ({ link, hawb: link.hawbs || {} })).filter((x) => x.hawb.id);
  }

  function renderHawbs() {
    const body = $('hawbBody');
    const hawbs = getCurrentHawbs();
    if (!hawbs.length) { body.innerHTML = '<tr><td colspan="5">Load a MAWB detail to see customer-visible HAWBs.</td></tr>'; return; }
    const selected = $('selectedHawbId').value;
    body.innerHTML = hawbs.map(({ link, hawb }) => `
      <tr class="${hawb.id === selected ? 'selected' : ''}">
        <td><b>${escapeHtml(hawb.hawb_number)}</b><br><span class="muted">${escapeHtml(hawb.id)}</span></td>
        <td>${statusPill(hawb.cargo_status)}</td>
        <td>${escapeHtml(link.expected_pieces ?? hawb.total_pieces_expected ?? '—')}</td>
        <td>${escapeHtml(link.expected_weight_kg ?? hawb.total_weight_kg ?? '—')}</td>
        <td><button class="mini" data-hawb-id="${escapeHtml(hawb.id)}">Select</button></td>
      </tr>`).join('');
    body.querySelectorAll('[data-hawb-id]').forEach((btn) => btn.addEventListener('click', () => selectHawb(btn.dataset.hawbId)));
  }

  function renderReadOnly(type) {
    const head = $('readOnlyHead');
    const body = $('readOnlyBody');
    const set = state[type] || [];
    if (!set.length) { head.innerHTML = '<tr><th>Result</th></tr>'; body.innerHTML = '<tr><td>No rows loaded.</td></tr>'; return; }
    if (type === 'myAccounts') {
      head.innerHTML = '<tr><th>Account</th><th>Status</th><th>Payor</th><th>Visibility</th></tr>';
      body.innerHTML = set.map((a) => `<tr><td><b>${escapeHtml(a.account_name)}</b><br>${escapeHtml(a.id)}</td><td>${statusPill(a.account_status)}</td><td>${escapeHtml(payorDisplay(a))}</td><td>${escapeHtml(a.visibility_level)}</td></tr>`).join('');
      return;
    }
    if (type === 'myMawbs') {
      head.innerHTML = '<tr><th>MAWB</th><th>Status</th><th>Payor</th><th>Airline</th><th>Select</th></tr>';
      body.innerHTML = set.map((m) => `<tr><td><b>${escapeHtml(mawbDisplay(m))}</b><br>${escapeHtml(m.mawb_id)}</td><td>${statusPill(m.cargo_status)}</td><td>${escapeHtml(m.payor_name || '—')}</td><td>${escapeHtml(m.airline_name || '—')}</td><td><button class="mini" data-my-mawb="${escapeHtml(m.mawb_id)}">Select</button></td></tr>`).join('');
      body.querySelectorAll('[data-my-mawb]').forEach((btn) => btn.addEventListener('click', () => $('myMawbId').value = btn.dataset.myMawb));
      return;
    }
    if (type === 'myHawbs') {
      head.innerHTML = '<tr><th>HAWB</th><th>MAWB</th><th>Status</th><th>PCS</th><th>Select</th></tr>';
      body.innerHTML = set.map((h) => `<tr><td><b>${escapeHtml(h.hawb_number)}</b><br>${escapeHtml(h.hawb_id)}</td><td>${escapeHtml(h.mawb_number_display || h.mawb_id)}</td><td>${statusPill(h.cargo_status)}</td><td>${escapeHtml(h.expected_pieces ?? h.total_pieces_expected ?? '—')}</td><td><button class="mini" data-my-hawb="${escapeHtml(h.hawb_id)}">Select</button></td></tr>`).join('');
      body.querySelectorAll('[data-my-hawb]').forEach((btn) => btn.addEventListener('click', () => $('myHawbId').value = btn.dataset.myHawb));
      return;
    }
    if (type === 'myReleases') {
      head.innerHTML = '<tr><th>Release</th><th>MAWB</th><th>Status</th><th>Packet</th></tr>';
      body.innerHTML = set.map((r) => `<tr><td><b>${escapeHtml(r.release_number)}</b><br>${escapeHtml(r.release_order_id)}</td><td>${escapeHtml(r.mawb_number_display || r.mawb_id)}</td><td>${statusPill(r.release_status)}</td><td>${r.pickup_packet_verified ? '<span class="read-only">VERIFIED</span>' : '<span class="blocked">PENDING</span>'}</td></tr>`).join('');
      return;
    }
    if (type === 'myDamage') {
      head.innerHTML = '<tr><th>Damage</th><th>MAWB/HAWB</th><th>Status</th><th>Photos</th></tr>';
      body.innerHTML = set.map((d) => `<tr><td><b>${escapeHtml(d.damage_class || 'Damage')}</b><br>${escapeHtml(d.damage_record_id)}</td><td>${escapeHtml(d.mawb_number_display || '')}<br>${escapeHtml(d.hawb_number || '')}</td><td>${statusPill(d.damage_record_status)}</td><td>${escapeHtml(d.uploaded_photo_count ?? 0)} / ${escapeHtml(d.required_photo_count ?? '—')}</td></tr>`).join('');
      return;
    }
    if (type === 'myFiles') {
      head.innerHTML = '<tr><th>File</th><th>Category</th><th>Bucket</th><th>Customer Visible</th></tr>';
      body.innerHTML = set.map((f) => `<tr><td><b>${escapeHtml(f.original_filename || f.object_path)}</b><br>${escapeHtml(f.id)}</td><td>${escapeHtml(f.category_key || '—')}</td><td>${escapeHtml(f.bucket_id || '—')}</td><td>${f.is_customer_visible ? '<span class="read-only">YES</span>' : '<span class="blocked">NO</span>'}</td></tr>`).join('');
    }
  }

  async function loadMy(type, fn) {
    const payload = await run(type, () => fn({ limit: 50, offset: 0 }));
    if (!payload) return;
    state[type] = rows(payload);
    renderReadOnly(type);
    $('readOnlyDetail').textContent = JSON.stringify(data(payload), null, 2);
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('accountCode').value = `PH3K_${Date.now().toString(36).toUpperCase()}`;
    $('accountName').value = `Customer Portal Account ${new Date().toISOString().slice(0,10)}`;
    setLoginBadge();

    $('btnHealth').addEventListener('click', () => run('/health', () => window.OTTApi.health()));
    $('btnVersion').addEventListener('click', () => run('/api/v1/version', () => window.OTTApi.version()));
    $('btnLogin').addEventListener('click', async () => {
      const payload = await run('Supabase Login', () => window.OTTAuth.login($('email').value.trim(), $('password').value));
      setLoginBadge();
      return payload;
    });
    $('btnLogout').addEventListener('click', () => { window.OTTAuth.logout(); setLoginBadge(); setOutput('Logout', { loggedIn: false }); });
    $('btnMe').addEventListener('click', async () => {
      const payload = await run('/auth/me', () => window.OTTApi.me());
      if (payload?.data) {
        state.me = payload.data;
        $('userProfileId').value = payload.data.profile?.id || payload.data.user?.id || '';
      }
    });

    $('btnStats').addEventListener('click', async () => { const p = await run('Customer Portal Stats', () => window.OTTApi.customerPortalStats()); if (p) updateKpis(p); });
    $('btnPayors').addEventListener('click', async () => { const p = await run('Load Payors', () => window.OTTApi.adminPayors({ limit: 200, offset: 0 })); if (p) { state.payors = rows(p); renderPayors(); } });
    $('btnAccounts').addEventListener('click', async () => { const p = await run('Load Portal Accounts', () => window.OTTApi.customerPortalAccounts({ status: $('accountStatusFilter').value || undefined, limit: 100, offset: 0 })); if (p) { state.accounts = rows(p); renderAccounts(); } });
    $('btnReloadAccounts').addEventListener('click', () => $('btnAccounts').click());
    $('btnAudit').addEventListener('click', async () => { const p = await run('Portal Audit Events', () => window.OTTApi.customerPortalAuditEvents({ limit: 20, offset: 0 })); if (p) $('setupDetail').textContent = JSON.stringify(data(p), null, 2); });

    $('btnCreateAccount').addEventListener('click', async () => {
      const body = {
        payorId: $('payorSelect').value || null,
        accountCode: $('accountCode').value.trim() || null,
        accountName: $('accountName').value.trim(),
        visibilityLevel: $('visibilityLevel').value,
        autoGrantPayorMawbs: false,
        allowStatusView: true,
        allowHawbView: true,
        allowDamagePhotos: true,
        allowReleaseStatus: true,
        allowCustomerReports: true,
        allowReleaseDocuments: false,
        notes: 'Created from Customer Portal account setup.',
        metadata: { source: 'customer_portal' }
      };
      const p = await run('Create Portal Account', () => window.OTTApi.createCustomerPortalAccount(body));
      if (p?.data?.id || p?.id) { selectAccount(p.data?.id || p.id); $('btnAccounts').click(); }
    });

    $('btnLoadUsers').addEventListener('click', async () => {
      const accountId = $('selectedAccountId').value.trim();
      const p = await run('Load Account Users', () => window.OTTApi.customerPortalUsers(accountId));
      if (p) { state.users = rows(p); $('setupDetail').textContent = JSON.stringify(data(p), null, 2); }
    });
    $('btnLinkUser').addEventListener('click', async () => {
      const accountId = $('selectedAccountId').value.trim();
      const body = { userProfileId: $('userProfileId').value.trim(), portalRole: $('portalRole').value, portalUserStatus: 'ACTIVE', canViewStatus: true, canViewHawbs: true, canViewDamagePhotos: true, canViewReleaseStatus: true, canViewCustomerReports: phase10bReportAccessEnabled(), canDownloadFiles: false, notes: 'Linked from Customer Portal account setup.', metadata: { source: 'customer_portal' } };
      const p = await run('Link User to Portal Account', () => window.OTTApi.linkCustomerPortalUser(accountId, body));
      if (p) $('setupDetail').textContent = JSON.stringify(data(p), null, 2);
    });

    $('btnCargoMawbs').addEventListener('click', () => $('btnCargoSearch').click());
    $('btnCargoSearch').addEventListener('click', async () => {
      const p = await run('Load Cargo MAWBs', () => window.OTTApi.cargoMawbs({ q: $('cargoQ').value.trim() || undefined, status: $('cargoStatus').value || undefined, includeHawbs: false, limit: 50, offset: 0 }));
      if (p) { state.cargoMawbs = rows(p); renderCargoMawbs(); }
    });
    $('btnLoadMawbDetail').addEventListener('click', async () => {
      const mawbId = $('selectedMawbId').value.trim();
      const p = await run('Load MAWB Detail', () => window.OTTApi.cargoMawb(mawbId));
      if (p) { state.currentMawb = data(p); renderHawbs(); $('setupDetail').textContent = JSON.stringify(state.currentMawb, null, 2); }
    });
    $('btnAssignMawb').addEventListener('click', async () => {
      const accountId = $('selectedAccountId').value.trim();
      const body = { mawbId: $('selectedMawbId').value.trim(), canViewStatus: true, canViewHawbs: true, canViewDamagePhotos: true, canViewReleaseStatus: true, canViewCustomerReports: phase10bReportAccessEnabled(), canViewReleaseDocuments: false, notes: 'Assigned from Customer Portal assignment workflow.', metadata: { source: 'customer_portal' } };
      const p = await run('Assign MAWB to Customer Portal', () => window.OTTApi.assignCustomerPortalMawb(accountId, body));
      if (p) $('setupDetail').textContent = JSON.stringify(data(p), null, 2);
    });
    $('btnAssignHawb').addEventListener('click', async () => {
      const accountId = $('selectedAccountId').value.trim();
      const body = { mawbId: $('selectedMawbId').value.trim(), hawbId: $('selectedHawbId').value.trim(), canViewStatus: true, canViewDamagePhotos: true, canViewReleaseStatus: true, canViewCustomerReports: phase10bReportAccessEnabled(), notes: 'Assigned from Customer Portal assignment workflow.', metadata: { source: 'customer_portal' } };
      const p = await run('Assign HAWB to Customer Portal', () => window.OTTApi.assignCustomerPortalHawb(accountId, body));
      if (p) $('setupDetail').textContent = JSON.stringify(data(p), null, 2);
    });
    $('btnAssignFile').addEventListener('click', async () => {
      const accountId = $('selectedAccountId').value.trim();
      const body = { fileRecordId: $('fileRecordId').value.trim(), mawbId: $('selectedMawbId').value.trim() || null, hawbId: $('fileHawbId').value.trim() || null, canView: true, canDownload: false, notes: 'Assigned from Customer Portal assignment workflow.', metadata: { source: 'customer_portal' } };
      const p = await run('Assign File to Customer Portal', () => window.OTTApi.assignCustomerPortalFile(accountId, body));
      if (p) $('setupDetail').textContent = JSON.stringify(data(p), null, 2);
    });

    $('btnMyAccounts').addEventListener('click', () => loadMy('myAccounts', window.OTTApi.myPortalAccounts));
    $('btnMyMawbs').addEventListener('click', () => loadMy('myMawbs', window.OTTApi.myPortalMawbs));
    $('btnMyHawbs').addEventListener('click', () => loadMy('myHawbs', window.OTTApi.myPortalHawbs));
    $('btnMyReleases').addEventListener('click', () => loadMy('myReleases', window.OTTApi.myPortalReleaseOrders));
    $('btnMyDamage').addEventListener('click', () => loadMy('myDamage', window.OTTApi.myPortalDamageRecords));
    $('btnMyFiles').addEventListener('click', () => loadMy('myFiles', window.OTTApi.myPortalFiles));
    document.querySelectorAll('[data-render]').forEach((btn) => btn.addEventListener('click', () => renderReadOnly(btn.dataset.render)));

    $('btnViewMyMawb').addEventListener('click', async () => { const p = await run('View Customer MAWB Read-Only', () => window.OTTApi.myPortalMawb($('myMawbId').value.trim())); if (p) $('readOnlyDetail').textContent = JSON.stringify(data(p), null, 2); });
    $('btnViewMyHawb').addEventListener('click', async () => { const p = await run('View Customer HAWB Read-Only', () => window.OTTApi.myPortalHawb($('myHawbId').value.trim())); if (p) $('readOnlyDetail').textContent = JSON.stringify(data(p), null, 2); });
    $('btnLogViewEvent').addEventListener('click', async () => {
      const body = { eventType: 'VIEW_STATUS', portalAccountId: $('eventPortalAccountId').value.trim() || null, entityType: 'customer_portal_dashboard', entityRef: 'Customer Portal status view', mawbId: $('myMawbId').value.trim() || null, accessGranted: true, metadata: { source: 'customer_portal' } };
      const p = await run('Log Customer Portal VIEW_STATUS Event', () => window.OTTApi.logCustomerPortalAccess(body));
      if (p) $('readOnlyDetail').textContent = JSON.stringify(data(p), null, 2);
    });
  });

  // PHASE 10A-A CUSTOMER PORTAL CFS REPORT ACCESS
  function phase10aRows(payload) {
    const d = payload?.data ?? payload;
    if (Array.isArray(d)) return d;
    return d?.rows || [];
  }

  function phase10aMawbId(row) {
    return row?.mawb_id || row?.id || row?.mawbs?.id || '';
  }

  function phase10aMawbNumber(row) {
    return row?.mawb_number_display || row?.mawb_number || row?.mawbs?.mawb_number_display || row?.mawbs?.mawb_number || row?.mawb_id || '—';
  }

  function phase10aNormalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function phase10aMatchesMawb(row, mawb) {
    const mawbId = phase10aNormalize(phase10aMawbId(mawb));
    const mawbNumber = phase10aNormalize(phase10aMawbNumber(mawb));
    const rowMawbId = phase10aNormalize(row?.mawb_id || row?.mawbs?.id || row?.mawb?.id || '');
    const rowMawbNumber = phase10aNormalize(row?.mawb_number_display || row?.mawb_number || row?.mawbs?.mawb_number_display || row?.mawbs?.mawb_number || '');

    return Boolean(
      (mawbId && rowMawbId && mawbId === rowMawbId) ||
      (mawbNumber && rowMawbNumber && mawbNumber === rowMawbNumber)
    );
  }

  function phase10aCustomerReportRows() {
    const mawbs = state.myMawbs || [];
    const hawbs = state.myHawbs || [];
    const releases = state.myReleases || [];
    const damages = state.myDamage || [];
    const files = state.myFiles || [];

    state.myCfsReportRows = mawbs.map((mawb) => {
      const relatedHawbs = hawbs.filter((row) => phase10aMatchesMawb(row, mawb));
      const relatedReleases = releases.filter((row) => phase10aMatchesMawb(row, mawb));
      const relatedDamage = damages.filter((row) => phase10aMatchesMawb(row, mawb));
      const relatedFiles = files.filter((row) => phase10aMatchesMawb(row, mawb));

      const release = relatedReleases[0] || null;

      return {
        mawb,
        mawbId: phase10aMawbId(mawb),
        mawbNumber: phase10aMawbNumber(mawb),
        status: mawb?.cargo_status || mawb?.status || release?.release_status || '—',
        payor: mawb?.payor_name || mawb?.payors?.display_name || mawb?.payors?.payor_name || '—',
        airline: mawb?.airline_name || mawb?.airlines?.display_name || mawb?.airlines?.airline_name || '—',
        hawbCount: relatedHawbs.length || mawb?.hawb_count || mawb?.total_hawbs || '—',
        releaseStatus: release?.release_status || release?.pickup_packet_status || '—',
        damagePhotos: relatedDamage.length ? relatedDamage.length + ' record(s)' : '—',
        files: relatedFiles.length ? relatedFiles.length + ' file(s)' : '—',
        hawbs: relatedHawbs,
        releases: relatedReleases,
        damages: relatedDamage,
        fileRows: relatedFiles
      };
    });

    return state.myCfsReportRows;
  }

  function phase10aUpdatePrintHeader() {
    const rows = state.myCfsReportRows || [];

    if ($('myCfsPrintDate')) $('myCfsPrintDate').textContent = new Date().toLocaleString();
    if ($('myCfsPrintMawbs')) $('myCfsPrintMawbs').textContent = String(rows.length);
    if ($('myCfsPrintHawbs')) {
      const totalHawbs = rows.reduce((sum, row) => sum + Number(row.hawbCount === '—' ? 0 : row.hawbCount || 0), 0);
      $('myCfsPrintHawbs').textContent = String(totalHawbs);
    }
  }

  function phase10aRenderCustomerReport() {
    const rows = phase10aCustomerReportRows();
    const tbody = $('myCfsReportTable')?.querySelector('tbody');

    if (!tbody) return;

    tbody.innerHTML = rows.map((row, index) => `
      <tr>
        <td><strong>${escapeHtml(row.mawbNumber)}</strong></td>
        <td>${statusPill(row.status)}</td>
        <td>${escapeHtml(row.payor)}</td>
        <td>${escapeHtml(row.airline)}</td>
        <td>${escapeHtml(row.hawbCount)}</td>
        <td>${escapeHtml(row.releaseStatus)}</td>
        <td>${escapeHtml(row.damagePhotos)}</td>
        <td>${escapeHtml(row.files)}</td>
        <td><button class="mini" data-my-cfs-report-row="${index}">Details</button></td>
      </tr>
    `).join('') || '<tr><td colspan="9">No assigned customer cargo found for report.</td></tr>';

    tbody.querySelectorAll('[data-my-cfs-report-row]').forEach((button) => {
      button.addEventListener('click', () => phase10aShowCustomerReportDetail(Number(button.dataset.myCfsReportRow)));
    });

    phase10aUpdatePrintHeader();
  }

  function phase10aShowCustomerReportDetail(index) {
    const row = (state.myCfsReportRows || [])[index];
    if (!row || !$('myCfsReportDetail')) return;

    $('myCfsReportDetail').textContent = JSON.stringify({
      mawb: row.mawbNumber,
      status: row.status,
      releaseStatus: row.releaseStatus,
      hawbs: row.hawbs,
      damages: row.damages,
      files: row.fileRows
    }, null, 2);
  }

  async function phase10aBuildCustomerReport() {
    const [mawbsPayload, hawbsPayload, releasesPayload, damagePayload, filesPayload] = await Promise.all([
      window.OTTApi.myPortalMawbs({ limit: 100, offset: 0 }),
      window.OTTApi.myPortalHawbs({ limit: 250, offset: 0 }),
      window.OTTApi.myPortalReleaseOrders({ limit: 100, offset: 0 }),
      window.OTTApi.myPortalDamageRecords({ limit: 250, offset: 0 }),
      window.OTTApi.myPortalFiles({ limit: 250, offset: 0 })
    ]);

    state.myMawbs = phase10aRows(mawbsPayload);
    state.myHawbs = phase10aRows(hawbsPayload);
    state.myReleases = phase10aRows(releasesPayload);
    state.myDamage = phase10aRows(damagePayload);
    state.myFiles = phase10aRows(filesPayload);

    phase10aRenderCustomerReport();

    if (typeof renderReadOnly === 'function') {
      state.myCfsReport = state.myCfsReportRows || [];
    }

    setOutput('Customer-Safe CFS Report Loaded', {
      mawbs: state.myMawbs.length,
      hawbs: state.myHawbs.length,
      releases: state.myReleases.length,
      damage: state.myDamage.length,
      files: state.myFiles.length,
      reportRows: (state.myCfsReportRows || []).length
    }, true);
  }

  function phase10aCsvEscape(value) {
    return '"' + String(value ?? '').replace(/"/g, '""') + '"';
  }

  function phase10aExportCustomerReportCsv() {
    const rows = state.myCfsReportRows || [];

    if (!rows.length) {
      phase10aRenderCustomerReport();
    }

    const headers = ['MAWB', 'Status', 'Payor', 'Airline', 'HAWBs', 'Release', 'Damage / Photos', 'Files'];
    const lines = [headers.map(phase10aCsvEscape).join(',')];

    (state.myCfsReportRows || []).forEach((row) => {
      lines.push([
        row.mawbNumber,
        row.status,
        row.payor,
        row.airline,
        row.hawbCount,
        row.releaseStatus,
        row.damagePhotos,
        row.files
      ].map(phase10aCsvEscape).join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'OTT_CUSTOMER_CFS_REPORT_' + new Date().toISOString().slice(0, 10) + '.csv';

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setOutput('Exported Customer CFS Report CSV', { rows: (state.myCfsReportRows || []).length }, true);
  }

  async function phase10aPrintCustomerReport() {
    if (!(state.myCfsReportRows || []).length) {
      await phase10aBuildCustomerReport();
    }

    document.body.classList.add('phase10a-print-customer-report');
    phase10aUpdatePrintHeader();

    setTimeout(() => window.print(), 250);
  }

  function phase10aInitCustomerReport() {
    $('btnMyCfsReport')?.addEventListener('click', () => run('Build My Customer-Safe CFS Report', phase10aBuildCustomerReport));
    $('btnMyCfsCustomerSafeCsv')?.addEventListener('click', phase10aExportCustomerReportCsv);
    $('btnMyCfsPrint')?.addEventListener('click', phase10aPrintCustomerReport);
  }

  phase10aInitCustomerReport();


  // PHASE 10B-A CUSTOMER PORTAL ASSIGNMENT WORKFLOW POLISH
  function phase10bValue(id) {
    const el = $(id);
    return el && "value" in el ? String(el.value || "").trim() : "";
  }

  function phase10bAssignmentSummary() {
    const reportAccess = phase10bValue("phase10bReportAccess") || "ENABLED";
    const lines = [
      "Customer Report Assignment Checklist",
      "------------------------------------",
      "Portal Account ID: " + (phase10bValue("selectedAccountId") || "not selected"),
      "User Profile ID: " + (phase10bValue("userProfileId") || "not selected"),
      "Selected MAWB ID: " + (phase10bValue("selectedMawbId") || "not selected"),
      "Selected HAWB ID: " + (phase10bValue("selectedHawbId") || "optional / not selected"),
      "File Record ID: " + (phase10bValue("fileRecordId") || "optional / not selected"),
      "Report Access: " + reportAccess,
      "",
      "Customer-safe requirements:",
      "- Assigned cargo only",
      "- No invoice number",
      "- No internal billing",
      "- No equipment billing",
      "- No internal status source",
      "- Read-only customer view"
    ];

    const box = $("phase10bAssignmentStatus");
    if (box) box.textContent = lines.join("\n");
  }

  function phase10bReportAccessEnabled() {
    return phase10bValue("phase10bReportAccess") !== "DISABLED";
  }

  function phase10bInitAssignmentWorkflow() {
    [
      "selectedAccountId",
      "userProfileId",
      "selectedMawbId",
      "selectedHawbId",
      "fileRecordId",
      "phase10bReportAccess"
    ].forEach((id) => {
      const el = $(id);
      if (el) {
        el.addEventListener("input", phase10bAssignmentSummary);
        el.addEventListener("change", phase10bAssignmentSummary);
      }
    });

    document.addEventListener("click", () => {
      setTimeout(phase10bAssignmentSummary, 150);
      setTimeout(phase10bAssignmentSummary, 700);
    });

    phase10bAssignmentSummary();
  }

  phase10bInitAssignmentWorkflow();

})();
