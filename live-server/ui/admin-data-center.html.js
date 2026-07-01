// PHASE_8E_I_ADMIN_DATA_CENTER_UI_POLISH
(function () {
  const $ = (id) => document.getElementById(id);
  const state = { me: null, organizations: [], payors: [], airlines: [], employees: [], users: [], roles: [], permissions: [], auditLogs: [], genericRows: [] };

  function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function data(payload) { return payload?.data ?? payload; }
  function rows(payload) { const d = data(payload); return d?.rows || (Array.isArray(d) ? d : []); }
  function boolText(value) { return value ? '<span class="ok-pill">Yes</span>' : '<span class="bad-pill">No</span>'; }
  function statusPill(status) { return `<span class="status-pill">${escapeHtml(status ?? '—')}</span>`; }
  function nowCode(prefix, maxLength = 24) {
    return `${prefix}${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, maxLength);
  }
  function setOutput(label, payload, ok = true) { $('output').textContent = `${ok ? 'PASS' : 'FAIL'} ${label}\n` + JSON.stringify(payload, null, 2); }
  async function run(label, fn) { try { const result = await fn(); setOutput(label, result, true); return result; } catch (error) { setOutput(label, { message: error.message, status: error.status, payload: error.payload }, false); return null; } }
  function setLoginBadge() { const badge = $('loginBadge'); if (window.OTTAuth?.isLoggedIn()) { badge.className = 'badge ok'; badge.textContent = 'Logged in'; } else { badge.className = 'badge'; badge.textContent = 'Not logged in'; } }

  function forbidInternalKeys(body, label) {
    const duplicateContactPhoneKey = 'contact_' + 'contact_phone';
    const duplicateContactPhoneCamelKey = 'contact' + 'ContactPhone';
    const forbidden = ['metadata', 'contact_phone', 'contactPhone', duplicateContactPhoneKey, duplicateContactPhoneCamelKey];
    const found = forbidden.filter((key) => Object.prototype.hasOwnProperty.call(body, key));
    if (found.length) throw new Error(`${label} body contains forbidden keys: ${found.join(', ')}`);
    return body;
  }

  function updateStats(payload) {
    const s = data(payload) || {};
    $('kpiOrganizations').textContent = s.organizations ?? '—';
    $('kpiPayors').textContent = s.payors ?? '—';
    $('kpiAirlines').textContent = s.airlines ?? '—';
    $('kpiEmployees').textContent = s.employees ?? '—';
    $('kpiUsers').textContent = s.users ?? '—';
  }

  function selectedOrganizationId() {
    return state.organizations[0]?.id || null;
  }

  function requiredPayorDefaults(code = nowCode('P3LPAYOR', 24)) {
    return {
      code,
      name: `OTT Test Payor ${code}`,
      billingEmail: '',
      phone: '555-0100',
      notes: 'Created from Admin Data Center.'
    };
  }

  function fillDefaultPayor() {
    const defaults = requiredPayorDefaults();
    $('selectedPayorId').value = '';
    $('payorCode').value = defaults.code;
    $('payorName').value = defaults.name;
    $('payorDisplayName').value = defaults.name;
    $('payorBillingEmail').value = defaults.billingEmail;
    $('payorPhone').value = defaults.phone;
    $('payorNotes').value = defaults.notes;
  }

  function validatePayorCreateBody(body) {
    const missing = [];
    if (!body.payorCode) missing.push('payorCode');
    if (!body.payorName) missing.push('payorName');
    if (!body.billingEmail) missing.push('billingEmail');
    if (!body.phone) missing.push('phone');
    if (missing.length) throw new Error(`Create Payor missing required fields: ${missing.join(', ')}`);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.billingEmail)) throw new Error(`Create Payor has invalid billingEmail: ${body.billingEmail}`);
    return body;
  }

  function buildPayorBody(options = {}) {
    const forceCreateDefaults = Boolean(options.forceCreateDefaults);
    const fallback = forceCreateDefaults ? requiredPayorDefaults($('payorCode').value.trim() || undefined) : null;
    const body = {
      organizationId: selectedOrganizationId(),
      payorCode: $('payorCode').value.trim() || fallback?.code || '',
      payorName: $('payorName').value.trim() || fallback?.name || '',
      displayName: $('payorDisplayName').value.trim() || fallback?.name || '',
      billingEmail: $('payorBillingEmail').value.trim() || fallback?.billingEmail || '',
      phone: $('payorPhone').value.trim() || fallback?.phone || '',
      isActive: true,
      notes: $('payorNotes').value.trim() || fallback?.notes || ''
    };
    if (!body.organizationId) delete body.organizationId;
    forbidInternalKeys(body, 'Payor');
    return forceCreateDefaults ? validatePayorCreateBody(body) : body;
  }

  function selectPayor(id) {
    const p = state.payors.find((row) => row.id === id);
    $('selectedPayorId').value = id || '';
    if (p) {
      $('payorCode').value = p.payor_code || p.payorCode || '';
      $('payorName').value = p.payor_name || p.payorName || '';
      $('payorDisplayName').value = p.display_name || p.displayName || '';
      $('payorBillingEmail').value = p.billing_email || p.contact_email || p.billingEmail || '';
      $('payorPhone').value = p.phone || p.contact_phone || '';
      $('payorNotes').value = p.notes || p.billing_notes || '';
    }
    renderPayors();
  }

  function renderPayors() {
    const body = $('payorsBody');
    if (!state.payors.length) { body.innerHTML = '<tr><td colspan="6">No payors loaded.</td></tr>'; return; }
    const selected = $('selectedPayorId').value;
    body.innerHTML = state.payors.map((p) => `
      <tr class="${p.id === selected ? 'selected' : ''}">
        <td><b>${escapeHtml(p.display_name || p.payor_name || p.displayName || p.payorName || p.id)}</b><br><span class="muted">${escapeHtml(p.id)}</span></td>
        <td>${escapeHtml(p.payor_code || p.payorCode || '—')}</td>
        <td>${escapeHtml(p.billing_email || p.contact_email || p.billingEmail || '—')}</td>
        <td>${escapeHtml(p.phone || p.contact_phone || '—')}</td>
        <td>${boolText(p.is_active ?? p.isActive)}</td>
        <td><button class="mini" data-payor-id="${escapeHtml(p.id)}">Select</button></td>
      </tr>`).join('');
    body.querySelectorAll('[data-payor-id]').forEach((btn) => btn.addEventListener('click', () => selectPayor(btn.dataset.payorId)));
  }

  function fillDefaultAirline() {
    const code = nowCode('P3LAIR', 24);
    $('selectedAirlineId').value = '';
    $('airlineCode').value = code;
    $('airlineName').value = `OTT Test Airline ${code}`;
    $('airlineMawbPrefix').value = String(Math.floor(100 + Math.random() * 899));
    $('airlinePhone').value = '555-0200';
    $('airlineNotes').value = 'Created from Admin Data Center.';
  }

  function buildAirlineBody() {
    const body = {
      organizationId: selectedOrganizationId(),
      airlineCode: $('airlineCode').value.trim(),
      airlineName: $('airlineName').value.trim(),
      displayName: $('airlineName').value.trim(),
      mawbPrefix: $('airlineMawbPrefix').value.trim(),
      phone: $('airlinePhone').value.trim(),
      isActive: true,
      notes: $('airlineNotes').value.trim()
    };
    if (!body.organizationId) delete body.organizationId;
    return forbidInternalKeys(body, 'Airline');
  }

  function selectAirline(id) {
    const a = state.airlines.find((row) => row.id === id);
    $('selectedAirlineId').value = id || '';
    if (a) {
      $('airlineCode').value = a.airline_code || a.airlineCode || '';
      $('airlineName').value = a.display_name || a.airline_name || a.airlineName || '';
      $('airlineMawbPrefix').value = a.mawb_prefix || a.mawbPrefix || '';
      $('airlinePhone').value = a.phone || a.contact_phone || '';
      $('airlineNotes').value = a.notes || '';
    }
    renderAirlines();
  }

  function renderAirlines() {
    const body = $('airlinesBody');
    if (!state.airlines.length) { body.innerHTML = '<tr><td colspan="6">No airlines loaded.</td></tr>'; return; }
    const selected = $('selectedAirlineId').value;
    body.innerHTML = state.airlines.map((a) => `
      <tr class="${a.id === selected ? 'selected' : ''}">
        <td><b>${escapeHtml(a.display_name || a.airline_name || a.airlineName || a.id)}</b><br><span class="muted">${escapeHtml(a.id)}</span></td>
        <td>${escapeHtml(a.airline_code || a.airlineCode || '—')}</td>
        <td>${escapeHtml(a.mawb_prefix || a.mawbPrefix || '—')}</td>
        <td>${escapeHtml(a.phone || a.contact_phone || '—')}</td>
        <td>${boolText(a.is_active ?? a.isActive)}</td>
        <td><button class="mini" data-airline-id="${escapeHtml(a.id)}">Select</button></td>
      </tr>`).join('');
    body.querySelectorAll('[data-airline-id]').forEach((btn) => btn.addEventListener('click', () => selectAirline(btn.dataset.airlineId)));
  }

  function fillDefaultEmployee() {
    const code = nowCode('EMP');
    $('selectedEmployeeId').value = '';
    $('employeeNumber').value = code;
    $('employeeDisplayName').value = `OTT Test Employee ${code}`;
    $('employeeEmail').value = `${code.toLowerCase()}@example.com`;
    $('employeePhone').value = '555-0177';
    $('employeeType').value = 'WAREHOUSE';
    $('employeeIsDriver').value = 'false';
    $('employeeIsWarehouse').value = 'true';
  }

  function buildEmployeeBody() {
    const type = $('employeeType').value;
    const isDriver = $('employeeIsDriver').value === 'true' || type === 'DRIVER';
    const isWarehouse = $('employeeIsWarehouse').value === 'true' || type === 'WAREHOUSE';
    const body = {
      organizationId: selectedOrganizationId(),
      employeeNumber: $('employeeNumber').value.trim(),
      displayName: $('employeeDisplayName').value.trim(),
      email: $('employeeEmail').value.trim(),
      phone: $('employeePhone').value.trim(),
      employeeType: type,
      isDriver,
      isWarehouse,
      isActive: true,
      notes: 'Created from Admin Data Center.'
    };
    if (!body.organizationId) delete body.organizationId;
    return body;
  }

  function selectEmployee(id) {
    const e = state.employees.find((row) => row.id === id);
    $('selectedEmployeeId').value = id || '';
    if (e) {
      $('employeeNumber').value = e.employee_number || e.employeeNumber || '';
      $('employeeDisplayName').value = e.display_name || e.displayName || '';
      $('employeeEmail').value = e.email || '';
      $('employeePhone').value = e.phone || '';
      $('employeeType').value = e.employee_type || e.employeeType || 'WAREHOUSE';
      $('employeeIsDriver').value = String(Boolean(e.is_driver ?? e.isDriver));
      $('employeeIsWarehouse').value = String(Boolean(e.is_warehouse_user ?? e.isWarehouse));
    }
    renderEmployees();
  }

  function renderEmployees() {
    const body = $('employeesBody');
    if (!state.employees.length) { body.innerHTML = '<tr><td colspan="6">No employees loaded.</td></tr>'; return; }
    const selected = $('selectedEmployeeId').value;
    body.innerHTML = state.employees.map((e) => `
      <tr class="${e.id === selected ? 'selected' : ''}">
        <td><b>${escapeHtml(e.display_name || e.displayName || e.id)}</b><br><span class="muted">${escapeHtml(e.employee_number || e.employeeNumber || e.id)}</span></td>
        <td>${escapeHtml(e.email || '—')}</td>
        <td>${escapeHtml(e.phone || '—')}</td>
        <td>${statusPill(e.employee_type || e.employeeType || '—')}</td>
        <td>${boolText(e.is_driver ?? e.isDriver)}</td>
        <td><button class="mini" data-employee-id="${escapeHtml(e.id)}">Select</button></td>
      </tr>`).join('');
    body.querySelectorAll('[data-employee-id]').forEach((btn) => btn.addEventListener('click', () => selectEmployee(btn.dataset.employeeId)));
  }

  function renderGeneric(title, list) {
    const head = $('genericHead');
    const body = $('genericBody');
    if (!list.length) { head.innerHTML = `<tr><th>${escapeHtml(title)}</th></tr>`; body.innerHTML = '<tr><td>No rows loaded.</td></tr>'; return; }
    head.innerHTML = '<tr><th>Primary</th><th>Secondary</th><th>Status / Type</th><th>Select</th></tr>';
    body.innerHTML = list.map((row) => {
      const primary = row.display_name || row.displayName || row.email || row.role_name || row.permission_name || row.action_key || row.entity_ref || row.id;
      const secondary = row.organization_code || row.role_key || row.permission_key || row.module_key || row.entity_type || row.id;
      const status = row.profile_type || (row.is_active ?? row.severity ?? row.action_key ?? '—');
      const selectUser = row.email ? `<button class="mini" data-user-id="${escapeHtml(row.id)}">User</button>` : '';
      const selectRole = row.role_key ? `<button class="mini" data-role-id="${escapeHtml(row.id)}">Role</button>` : '';
      return `<tr><td><b>${escapeHtml(primary)}</b><br><span class="muted">${escapeHtml(row.id)}</span></td><td>${escapeHtml(secondary || '—')}</td><td>${escapeHtml(status)}</td><td>${selectUser} ${selectRole}</td></tr>`;
    }).join('');
    body.querySelectorAll('[data-user-id]').forEach((btn) => btn.addEventListener('click', () => { $('selectedUserId').value = btn.dataset.userId; }));
    body.querySelectorAll('[data-role-id]').forEach((btn) => btn.addEventListener('click', () => { $('selectedRoleId').value = btn.dataset.roleId; }));
  }

  async function loadStats() { const result = await run('Admin Stats', () => window.OTTApi.adminStats()); if (result) updateStats(result); }
  async function loadOrganizations() { const result = await run('Organizations', () => window.OTTApi.adminOrganizations({ limit: 50, offset: 0 })); if (result) { state.organizations = rows(result); renderGeneric('Organizations', state.organizations); } }
  async function loadPayors() { const result = await run('Payors', () => window.OTTApi.adminPayors({ limit: 50, offset: 0 })); if (result) { state.payors = rows(result); renderPayors(); } }
  async function loadAirlines() { const result = await run('Airlines', () => window.OTTApi.adminAirlines({ limit: 50, offset: 0 })); if (result) { state.airlines = rows(result); renderAirlines(); } }
  async function loadEmployees() { const result = await run('Employees', () => window.OTTApi.adminEmployees({ limit: 50, offset: 0 })); if (result) { state.employees = rows(result); renderEmployees(); } }
  async function loadUsers() { const result = await run('Users', () => window.OTTApi.adminUsers({ limit: 50, offset: 0 })); if (result) { state.users = rows(result); renderGeneric('Users', state.users); } }
  async function loadRoles() { const result = await run('Roles', () => window.OTTApi.adminRoles()); if (result) { state.roles = rows(result); renderGeneric('Roles', state.roles); } }
  async function loadPermissions() { const result = await run('Permissions', () => window.OTTApi.adminPermissions()); if (result) { state.permissions = rows(result); renderGeneric('Permissions', state.permissions); } }

  $('btnHealth').addEventListener('click', () => run('/health', () => window.OTTApi.health()));
  $('btnVersion').addEventListener('click', () => run('/api/v1/version', () => window.OTTApi.version()));
  $('btnLogin').addEventListener('click', async () => { const result = await run('Login', () => window.OTTAuth.login($('email').value.trim(), $('password').value)); setLoginBadge(); return result; });
  $('btnLogout').addEventListener('click', () => { window.OTTAuth.logout(); setLoginBadge(); setOutput('Logout', { loggedIn: false }, true); });
  $('btnMe').addEventListener('click', async () => { const result = await run('/auth/me', () => window.OTTApi.me()); if (result) state.me = data(result); setLoginBadge(); });

  $('btnStats').addEventListener('click', loadStats);
  $('btnOrganizations').addEventListener('click', loadOrganizations);
  $('btnPayors').addEventListener('click', loadPayors);
  $('btnAirlines').addEventListener('click', loadAirlines);
  $('btnEmployees').addEventListener('click', loadEmployees);
  $('btnUsers').addEventListener('click', loadUsers);
  $('btnRoles').addEventListener('click', loadRoles);
  $('btnPermissions').addEventListener('click', loadPermissions);
  $('btnAuditLogs').addEventListener('click', async () => { const result = await run('Audit Logs', () => window.OTTApi.adminAuditLogs({ limit: 50, offset: 0 })); if (result) { state.auditLogs = rows(result); renderGeneric('Audit Logs', state.auditLogs); } });

  $('btnLoadPayors').addEventListener('click', loadPayors);
  $('btnCreatePayor').addEventListener('click', async () => { fillDefaultPayor(); const body = buildPayorBody({ forceCreateDefaults: true }); const result = await run('Create Payor', () => window.OTTApi.createAdminPayor(body)); if (result) { $('selectedPayorId').value = data(result).id; await loadPayors(); await loadStats(); } });
  $('btnUpdatePayor').addEventListener('click', async () => { const id = $('selectedPayorId').value.trim(); if (!id) return setOutput('Update Selected Payor', { message: 'Select a payor first.' }, false); const result = await run('Update Selected Payor', () => window.OTTApi.updateAdminPayor(id, buildPayorBody())); if (result) { await loadPayors(); } });

  $('btnLoadAirlines').addEventListener('click', loadAirlines);
  $('btnCreateAirline').addEventListener('click', async () => { fillDefaultAirline(); const result = await run('Create Test Airline Clean', () => window.OTTApi.createAdminAirline(buildAirlineBody())); if (result) { $('selectedAirlineId').value = data(result).id; await loadAirlines(); await loadStats(); } });
  $('btnUpdateAirline').addEventListener('click', async () => { const id = $('selectedAirlineId').value.trim(); if (!id) return setOutput('Update Selected Airline', { message: 'Select an airline first.' }, false); const result = await run('Update Selected Airline', () => window.OTTApi.updateAdminAirline(id, buildAirlineBody())); if (result) { await loadAirlines(); } });

  $('btnLoadEmployees').addEventListener('click', loadEmployees);
  $('btnCreateEmployee').addEventListener('click', async () => { fillDefaultEmployee(); const result = await run('Create Test Employee', () => window.OTTApi.createAdminEmployee(buildEmployeeBody())); if (result) { $('selectedEmployeeId').value = data(result).id; await loadEmployees(); await loadStats(); } });

  $('btnLoadUsers2').addEventListener('click', loadUsers);
  $('btnLoadRoles2').addEventListener('click', loadRoles);
  $('btnLoadPermissions2').addEventListener('click', loadPermissions);
  $('btnLoadUserRoles').addEventListener('click', () => { const id = $('selectedUserId').value.trim(); if (!id) return setOutput('Selected User Roles', { message: 'Select or paste a user id first.' }, false); return run('Selected User Roles', () => window.OTTApi.adminUserRoles(id)); });
  $('btnLoadRolePermissions').addEventListener('click', () => { const id = $('selectedRoleId').value.trim(); if (!id) return setOutput('Selected Role Permissions', { message: 'Select or paste a role id first.' }, false); return run('Selected Role Permissions', () => window.OTTApi.adminRolePermissions(id)); });

  setLoginBadge();
  fillDefaultPayor();
  fillDefaultAirline();
  fillDefaultEmployee();
  setOutput('Admin Data Center Ready', { apiBaseUrl: window.OTTApi?.API_BASE_URL, loggedIn: window.OTTAuth?.isLoggedIn?.() }, true);
})();
