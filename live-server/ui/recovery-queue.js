(function () {
  const state = {
    jobs: [],
    drivers: [],
    selectedJob: null,
    selectedAttemptId: ''
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
  function countOf(payload) { return Number(dataOf(payload)?.count ?? rowsOf(payload).length ?? 0); }

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

  function displayName(row, fallback = '—') {
    return row?.display_name || row?.payor_name || row?.payor_code || row?.airline_name || row?.airline_code || row?.location_name || row?.mawb_number_display || row?.mawb_number || fallback;
  }

  function jobMawb(job) {
    return job?.mawbs?.mawb_number_display || job?.mawbs?.mawb_number || job?.mawb_number_display || job?.mawb_number || job?.mawb_id || '—';
  }



  function normalizeSearchText(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function mawbSearchValue() {
    return $("mawbSearchInput")?.value?.trim() || "";
  }

  function filteredJobsForMawb() {
    const raw = mawbSearchValue();
    const needle = normalizeSearchText(raw);
    if (!needle) return state.jobs;

    return state.jobs.filter((job) => {
      const mawb = normalizeSearchText(jobMawb(job));
      const jobNumber = normalizeSearchText(job?.recovery_job_number || job?.id);
      return mawb.includes(needle) || jobNumber.includes(needle);
    });
  }

  function updateMawbSearchBadge(filteredCount) {
    const badge = $("mawbSearchBadge");
    if (!badge) return;

    const raw = mawbSearchValue();
    if (!raw) {
      badge.className = "badge";
      badge.textContent = "No MAWB filter";
      return;
    }

    badge.className = filteredCount > 0 ? "badge ok" : "badge fail";
    badge.textContent = `Showing ${filteredCount} of ${state.jobs.length}`;
  }

  function renderJobsForCurrentFilter() {
    const filtered = filteredJobsForMawb();
    renderJobs(filtered);
    updateMawbSearchBadge(filtered.length);
  }

  function driverName(job) {
    return job?.assigned_driver?.display_name || job?.employee_profiles?.display_name || job?.assigned_driver_employee_id || '—';
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

  function updateKpis() {
    $('kpiJobs').textContent = String(state.jobs.length);
    $('kpiDrivers').textContent = String(state.drivers.length);
    $('kpiAttempts').textContent = String(state.selectedJob?.attempts?.length ?? 0);
    $('kpiEvents').textContent = String(state.selectedJob?.driver_events?.length ?? state.selectedJob?.events?.length ?? 0);
  }

  function renderDrivers() {
    const select = $('driverSelect');
    select.innerHTML = '<option value="">Select driver</option>' + state.drivers.map((driver) => (
      `<option value="${escapeHtml(driver.id)}">${escapeHtml(displayName(driver))}${driver.employee_number ? ` (${escapeHtml(driver.employee_number)})` : ''}</option>`
    )).join('');
    updateKpis();
  }

  function renderJobs(rows) {
    const tbody = $('jobsTable').querySelector('tbody');
    tbody.innerHTML = rows.map((job) => {
      const selected = state.selectedJob?.id === job.id || $('selectedJobId').value === job.id;
      return `<tr class="${selected ? 'selected' : ''}">
        <td><span class="status-pill">${escapeHtml(job.recovery_status)}</span></td>
        <td>${escapeHtml(job.priority || '—')}</td>
        <td>${escapeHtml(job.recovery_job_number || job.id)}</td>
        <td>${escapeHtml(jobMawb(job))}</td>
        <td>${escapeHtml(driverName(job))}</td>
        <td>${escapeHtml(fmtDate(job.created_at))}</td>
        <td><button data-select-job="${escapeHtml(job.id)}">Select</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">No Recovery Queue jobs loaded.</td></tr>';

    tbody.querySelectorAll('[data-select-job]').forEach((button) => {
      button.addEventListener('click', () => {
        $('selectedJobId').value = button.getAttribute('data-select-job');
        const job = state.jobs.find((row) => row.id === $('selectedJobId').value);
        if (job) state.selectedJob = job;
        renderJobsForCurrentFilter();
      });
    });
    updateKpis();
  }

  function renderJobDetail(job) {
    state.selectedJob = job;
    $('selectedJobId').value = job?.id || '';

    const detailRows = [
      ['Recovery Job ID', job?.id],
      ['Job Number', job?.recovery_job_number],
      ['Status', job?.recovery_status],
      ['Priority', job?.priority],
      ['MAWB', jobMawb(job)],
      ['Payor', displayName(job?.payors)],
      ['Airline', displayName(job?.airlines)],
      ['PTT Required', job?.ptt_required],
      ['PTT Status', job?.ptt_status_snapshot],
      ['Expected PCS', job?.total_pieces_expected],
      ['Recovered PCS', job?.total_pieces_recovered],
      ['Short PCS', job?.total_pieces_short],
      ['Driver', driverName(job)],
      ['Created', fmtDate(job?.created_at)],
      ['Notes', job?.notes]
    ];
    $('detailTable').querySelector('tbody').innerHTML = detailRows.map(([label, value]) => (
      `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value ?? '—')}</td></tr>`
    )).join('');

    const attempts = job?.attempts || [];
    if (attempts.length && !$('attemptId').value) {
      const latestAttempt = attempts[attempts.length - 1];
      $('attemptId').value = latestAttempt.id || '';
      state.selectedAttemptId = latestAttempt.id || '';
    }

    const events = job?.driver_events || job?.events || [];
    const hawbs = job?.hawb_links || job?.hawbs || [];
    const rows = [];
    for (const hawbLink of hawbs) {
      const hawb = hawbLink?.hawbs || hawbLink?.hawb || hawbLink;
      rows.push(['HAWB', hawb?.cargo_status || hawbLink?.link_status, hawb?.hawb_number || hawbLink?.source_reference || hawbLink?.id, hawb?.total_pieces_expected || hawbLink?.expected_pieces, hawb?.cargo_description || '']);
    }
    for (const attempt of attempts) {
      rows.push(['Attempt', attempt.attempt_status, `Attempt ${attempt.attempt_no || ''} ${attempt.id || ''}`.trim(), `${attempt.pieces_recovered ?? 0} rec / ${attempt.pieces_short ?? 0} short`, attempt.notes || attempt.partial_reason || attempt.failure_reason || '']);
    }
    for (const event of events) {
      rows.push(['Driver Event', event.event_type, fmtDate(event.event_at), '', event.event_note || '']);
    }
    $('subTable').querySelector('tbody').innerHTML = rows.map(([type, statusValue, ref, pcs, notes]) => (
      `<tr><td>${escapeHtml(type)}</td><td>${escapeHtml(statusValue || '—')}</td><td>${escapeHtml(ref || '—')}</td><td>${escapeHtml(pcs || '—')}</td><td>${escapeHtml(notes || '—')}</td></tr>`
    )).join('') || '<tr><td colspan="5">No HAWBs, attempts, or driver events loaded.</td></tr>';

    updateKpis();
  }

  function selectedDriverId() {
    return requireValue('driverSelect', 'Driver');
  }

  function selectedJobId() {
    return requireValue('selectedJobId', 'Selected Recovery Job ID');
  }

  function getNowIso() { return new Date().toISOString(); }

  async function loadJobs(statusOverride = null) {
    const params = {
      q: $('q').value.trim(),
      status: statusOverride ?? $('statusFilter').value,
      includeDetails: false,
      limit: $('limit').value || 20,
      offset: 0
    };
    const payload = await window.OTTApi.recoveryJobs(params);
    const rows = rowsOf(payload);
    state.jobs = rows;
    renderJobsForCurrentFilter();
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

    $('btnStats').addEventListener('click', () => run('/api/v1/recovery/stats', () => window.OTTApi.recoveryStats()));

    $('btnDrivers').addEventListener('click', () => run('/api/v1/recovery/drivers', async () => {
      const payload = await window.OTTApi.recoveryDrivers({ limit: 50, offset: 0 });
      state.drivers = rowsOf(payload);
      renderDrivers();
      return payload;
    }));

    $('btnJobs').addEventListener('click', () => run('/api/v1/recovery/jobs', () => loadJobs()));

    $("btnMawbSearch").addEventListener("click", () => run("MAWB Recovery Queue search", async () => {
      const mawb = mawbSearchValue();
      if (mawb) $("q").value = mawb;
      return loadJobs();
    }));

    $("btnMawbClear").addEventListener("click", () => run("Clear MAWB Recovery Queue search", async () => {
      $("mawbSearchInput").value = "";
      $("q").value = "";
      return loadJobs();
    }));

    $("mawbSearchInput").addEventListener("input", () => {
      renderJobsForCurrentFilter();
    });

    $("mawbSearchInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        $("btnMawbSearch").click();
      }
    });

    $('btnCreateJob').addEventListener('click', () => run('Create Recovery Queue job', async () => {
      const payload = await window.OTTApi.createRecoveryJob({
        mawbId: requireValue('newMawbId', 'NEW MAWB ID'),
        priority: 'NORMAL',
        notes: 'Created from Recovery Queue.',
        metadata: { source: 'recovery_queue' }
      });
      const job = dataOf(payload);
      if (job?.id) $('selectedJobId').value = job.id;
      await loadJobs();
      return payload;
    }));

    $('btnLoadJob').addEventListener('click', () => run('/api/v1/recovery/jobs/:id', async () => {
      const payload = await window.OTTApi.recoveryJob(selectedJobId());
      renderJobDetail(dataOf(payload));
      return payload;
    }));

    $('btnAssignDriver').addEventListener('click', () => run('Assign Recovery Driver', async () => {
      const payload = await window.OTTApi.assignRecoveryDriver(selectedJobId(), {
        driverEmployeeId: selectedDriverId(),
        notes: 'Assigned from Recovery Queue.',
        metadata: { source: 'recovery_queue' }
      });
      const detail = await window.OTTApi.recoveryJob(selectedJobId());
      renderJobDetail(dataOf(detail));
      return payload;
    }));

    $('btnDispatch').addEventListener('click', () => run('Mark Driver Dispatched', async () => {
      const payload = await window.OTTApi.updateRecoveryJobStatus(selectedJobId(), {
        status: 'DRIVER_DISPATCHED',
        reason: 'Driver dispatched from Recovery Queue.',
        metadata: { source: 'recovery_queue' }
      });
      const detail = await window.OTTApi.recoveryJob(selectedJobId());
      renderJobDetail(dataOf(detail));
      return payload;
    }));

    $('btnCreateAttempt').addEventListener('click', () => run('Create recovery attempt', async () => {
      const payload = await window.OTTApi.createRecoveryAttempt(selectedJobId(), {
        isNewVisit: true,
        notes: 'Recovery attempt created from Recovery Queue.',
        metadata: { source: 'recovery_queue' }
      });
      const attempt = dataOf(payload);
      if (attempt?.id) $('attemptId').value = attempt.id;
      const detail = await window.OTTApi.recoveryJob(selectedJobId());
      renderJobDetail(dataOf(detail));
      return payload;
    }));

    $('btnUpdateAttempt').addEventListener('click', () => run('Update recovery attempt', async () => {
      const payload = await window.OTTApi.updateRecoveryAttempt(requireValue('attemptId', 'Recovery Attempt ID'), {
        attemptStatus: $('attemptStatus').value,
        timeInAt: getNowIso(),
        piecesRecovered: Number($('piecesRecovered').value || 0),
        piecesShort: Number($('piecesShort').value || 0),
        notes: 'Attempt updated from Recovery Queue.',
        metadata: { source: 'recovery_queue' }
      });
      const detail = await window.OTTApi.recoveryJob(selectedJobId());
      renderJobDetail(dataOf(detail));
      return payload;
    }));

    $('btnEventAtAirline').addEventListener('click', () => run('Driver event: At Airline', async () => {
      const payload = await window.OTTApi.createDriverRecoveryEvent(selectedJobId(), {
        recoveryAttemptId: $('attemptId').value.trim() || null,
        driverEmployeeId: $('driverSelect').value || null,
        eventType: 'DRIVER_AT_AIRLINE',
        eventAt: getNowIso(),
        eventNote: 'Driver arrived at airline from Recovery Queue.',
        metadata: { source: 'recovery_queue' }
      });
      const detail = await window.OTTApi.recoveryJob(selectedJobId());
      renderJobDetail(dataOf(detail));
      return payload;
    }));

    $('btnEventComplete').addEventListener('click', () => run('Driver event: Cargo Recovered Complete', async () => {
      const payload = await window.OTTApi.createDriverRecoveryEvent(selectedJobId(), {
        recoveryAttemptId: $('attemptId').value.trim() || null,
        driverEmployeeId: $('driverSelect').value || null,
        eventType: 'CARGO_RECOVERED_COMPLETE',
        eventAt: getNowIso(),
        eventNote: 'Cargo recovered complete from Recovery Queue.',
        metadata: { source: 'recovery_queue' }
      });
      const detail = await window.OTTApi.recoveryJob(selectedJobId());
      renderJobDetail(dataOf(detail));
      return payload;
    }));
  });
})();
