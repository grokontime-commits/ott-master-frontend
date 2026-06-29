(function () {
  const MODULE_ROLE_ACCESS = {
    admin: ['ADMIN'],
    manifest: ['ADMIN', 'OFFICE'],
    cargo: ['ADMIN', 'OFFICE'],
    recovery: ['ADMIN', 'OFFICE', 'DRIVER'],
    warehouse: ['ADMIN', 'OFFICE', 'WAREHOUSE'],
    damage: ['ADMIN', 'OFFICE', 'WAREHOUSE'],
    release: ['ADMIN', 'OFFICE', 'WAREHOUSE'],
    forklift: ['ADMIN', 'WAREHOUSE'],
    equipment: ['ADMIN', 'OFFICE', 'DRIVER'],
    accounting: ['ADMIN', 'ACCOUNTING'],
    customerPortal: ['ADMIN', 'OFFICE', 'CUSTOMER']
  };

  const MODULE_LABELS = {
    admin: 'Admin Data Center',
    manifest: 'Upload Manifest Review',
    cargo: 'Cargo Management',
    recovery: 'Recovery Queue',
    warehouse: 'Warehouse Inspection',
    damage: 'Damage Photos',
    release: 'Cargo Release',
    forklift: 'Forklift Driver Board',
    equipment: 'Equipment Return',
    accounting: 'Accounting Billing',
    customerPortal: 'Customer Portal'
  };

  function getModuleKey() {
    return document.body?.dataset?.moduleKey || '';
  }

  function getRoles(mePayload) {
    const roles = mePayload?.data?.roles || mePayload?.roles || [];
    return Array.isArray(roles) ? roles.map((role) => String(role).toUpperCase()) : [];
  }

  function canAccess(moduleKey, mePayload) {
    const roles = getRoles(mePayload);
    if (roles.includes('ADMIN')) return true;
    const allowedRoles = MODULE_ROLE_ACCESS[moduleKey] || [];
    return allowedRoles.some((role) => roles.includes(role));
  }

  function ensureBanner() {
    let banner = document.getElementById('ottPageGuardBanner');
    if (banner) return banner;

    banner = document.createElement('div');
    banner.id = 'ottPageGuardBanner';
    banner.style.display = 'none';
    banner.style.margin = '12px';
    banner.style.padding = '12px 14px';
    banner.style.borderRadius = '10px';
    banner.style.border = '1px solid #b45309';
    banner.style.background = '#fffbeb';
    banner.style.color = '#78350f';
    banner.style.fontWeight = '700';
    banner.style.lineHeight = '1.4';

    const header = document.querySelector('header');
    if (header?.parentNode) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }

    return banner;
  }

  function isLoginOrConnectionControl(el) {
    const id = String(el.id || '').toLowerCase();
    const text = String(el.textContent || '').toLowerCase();
    const label = String(el.getAttribute('aria-label') || '').toLowerCase();

    return id.includes('email') ||
      id.includes('password') ||
      id.includes('login') ||
      id.includes('logout') ||
      id.includes('health') ||
      id.includes('version') ||
      id === 'btnme' ||
      text.includes('login') ||
      text.includes('logout') ||
      text.includes('/health') ||
      text.includes('/api/v1/version') ||
      text.includes('/auth/me') ||
      label.includes('login') ||
      label.includes('logout');
  }

  function lockModuleControls() {
    document.querySelectorAll('button, input, select, textarea').forEach((el) => {
      if (isLoginOrConnectionControl(el)) return;
      el.disabled = true;
      el.setAttribute('data-guard-disabled', 'true');
    });
  }

  function unlockModuleControls() {
    document.querySelectorAll('[data-guard-disabled="true"]').forEach((el) => {
      el.disabled = false;
      el.removeAttribute('data-guard-disabled');
    });
  }

  function showBanner(message, mode) {
    const banner = ensureBanner();
    banner.style.display = 'block';
    banner.style.borderColor = mode === 'ok' ? '#15803d' : '#b45309';
    banner.style.background = mode === 'ok' ? '#f0fdf4' : '#fffbeb';
    banner.style.color = mode === 'ok' ? '#14532d' : '#78350f';
    banner.textContent = message;
  }

  function hideBanner() {
    const banner = ensureBanner();
    banner.style.display = 'none';
  }

  async function runGuard() {
    const moduleKey = getModuleKey();
    if (!moduleKey) return;

    const moduleLabel = MODULE_LABELS[moduleKey] || moduleKey;
    const hasToken = Boolean(window.OTTApi?.getAccessToken?.());

    if (!hasToken) {
      lockModuleControls();
      showBanner('Login required for ' + moduleLabel + '. Enter your credentials, then continue.', 'warn');
      return;
    }

    try {
      const payload = await window.OTTApi.me();
      const me = payload?.data ?? payload;
      if (canAccess(moduleKey, me)) {
        unlockModuleControls();
        hideBanner();
        return;
      }

      lockModuleControls();
      showBanner('Not authorized for ' + moduleLabel + '. Contact an administrator if you need access.', 'warn');
    } catch (error) {
      lockModuleControls();
      showBanner('Could not verify access for ' + moduleLabel + '. Please log in again.', 'warn');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    runGuard();

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (target?.id === 'btnLogin') {
        setTimeout(runGuard, 1500);
      }
      if (target?.id === 'btnLogout') {
        setTimeout(runGuard, 300);
      }
    });
  });

  window.OTTPageGuard = {
    runGuard
  };
})();

