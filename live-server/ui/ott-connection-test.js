(function () {
  const output = document.getElementById('output');
  const status = document.getElementById('status');

  function showOk(label, payload) {
    status.innerHTML = `<span class="ok">PASS</span> ${label}`;
    output.textContent = JSON.stringify(payload, null, 2);
  }

  function showError(label, error) {
    status.innerHTML = `<span class="bad">FAIL</span> ${label}`;
    output.textContent = JSON.stringify({ message: error.message, status: error.status, payload: error.payload }, null, 2);
  }

  async function run(label, fn) {
    status.textContent = `Running ${label}...`;
    try {
      const payload = await fn();
      showOk(label, payload);
    } catch (error) {
      showError(label, error);
    }
  }

  document.getElementById('btnHealth').addEventListener('click', () => run('/health', () => window.OTTApi.health()));
  document.getElementById('btnDbHealth').addEventListener('click', () => run('/health/db', () => window.OTTApi.dbHealth()));
  document.getElementById('btnVersion').addEventListener('click', () => run('/api/v1/version', () => window.OTTApi.version()));

  document.getElementById('btnLogin').addEventListener('click', () => run('Supabase login', () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    return window.OTTAuth.loginWithPassword(email, password);
  }));

  document.getElementById('btnMe').addEventListener('click', () => run('/api/v1/auth/me', () => window.OTTApi.me()));

  document.getElementById('btnLogout').addEventListener('click', () => {
    window.OTTAuth.logout();
    showOk('Logged out', { loggedOut: true });
  });

  document.getElementById('btnModuleAccess').addEventListener('click', () => run('Module access', async () => {
    const me = await window.OTTApi.me();
    const modules = [
      'dashboard', 'upload', 'cargo', 'recovery', 'ptt', 'warehouse', 'damage',
      'release', 'forklift', 'equipment', 'accounting', 'customerPortal', 'admin'
    ];
    return {
      user: me.data?.user || me.data || null,
      roles: window.OTTPermissions.normalizeRoles(me),
      permissions: window.OTTPermissions.normalizePermissions(me),
      modules: modules.map((moduleKey) => ({
        moduleKey,
        allowed: window.OTTPermissions.canAccessModule(me, moduleKey)
      }))
    };
  }));
})();
