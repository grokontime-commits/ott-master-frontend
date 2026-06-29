
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
    if (!state.cargoMawbs.length) { body.innerHTML = '<tr><td colspan="5">No cargo MAWBs loaded.</td></tr>'; return; }
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
    if (!hawbs.length) { body.innerHTML = '<tr><td colspan="5">Load a MAWB detail to see HAWBs.</td></tr>'; return; }
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
    $('accountName').value = `Customer Portal Test ${new Date().toISOString().slice(0,10)}`;
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
        notes: 'Created from Customer Portal.',
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
      const body = { userProfileId: $('userProfileId').value.trim(), portalRole: $('portalRole').value, portalUserStatus: 'ACTIVE', canViewStatus: true, canViewHawbs: true, canViewDamagePhotos: true, canViewReleaseStatus: true, canViewCustomerReports: true, canDownloadFiles: false, notes: 'Linked from Customer Portal.', metadata: { source: 'customer_portal' } };
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
      const body = { mawbId: $('selectedMawbId').value.trim(), canViewStatus: true, canViewHawbs: true, canViewDamagePhotos: true, canViewReleaseStatus: true, canViewCustomerReports: true, canViewReleaseDocuments: false, notes: 'Assigned from Customer Portal.', metadata: { source: 'customer_portal' } };
      const p = await run('Assign MAWB to Customer Portal', () => window.OTTApi.assignCustomerPortalMawb(accountId, body));
      if (p) $('setupDetail').textContent = JSON.stringify(data(p), null, 2);
    });
    $('btnAssignHawb').addEventListener('click', async () => {
      const accountId = $('selectedAccountId').value.trim();
      const body = { mawbId: $('selectedMawbId').value.trim(), hawbId: $('selectedHawbId').value.trim(), canViewStatus: true, canViewDamagePhotos: true, canViewReleaseStatus: true, canViewCustomerReports: true, notes: 'Assigned from Customer Portal.', metadata: { source: 'customer_portal' } };
      const p = await run('Assign HAWB to Customer Portal', () => window.OTTApi.assignCustomerPortalHawb(accountId, body));
      if (p) $('setupDetail').textContent = JSON.stringify(data(p), null, 2);
    });
    $('btnAssignFile').addEventListener('click', async () => {
      const accountId = $('selectedAccountId').value.trim();
      const body = { fileRecordId: $('fileRecordId').value.trim(), mawbId: $('selectedMawbId').value.trim() || null, hawbId: $('fileHawbId').value.trim() || null, canView: true, canDownload: false, notes: 'Assigned from Customer Portal.', metadata: { source: 'customer_portal' } };
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
})();
