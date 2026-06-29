(function () {
  const roleToModules = {
    ADMIN: ['dashboard', 'upload', 'cargo', 'recovery', 'ptt', 'warehouse', 'damage', 'release', 'forklift', 'equipment', 'accounting', 'customerPortal', 'admin'],
    OFFICE: ['dashboard', 'upload', 'cargo', 'recovery', 'ptt', 'warehouse', 'damage', 'release', 'forklift', 'equipment', 'customerPortal'],
    DISPATCHER: ['dashboard', 'recovery', 'ptt', 'equipment'],
    WAREHOUSE: ['dashboard', 'warehouse', 'damage', 'release', 'forklift', 'equipment'],
    RECOVERY_DRIVER: ['dashboard', 'recovery', 'ptt'],
    FORKLIFT_DRIVER: ['dashboard', 'forklift'],
    ACCOUNTING: ['dashboard', 'accounting'],
    CUSTOMER: ['customerPortal']
  };

  function normalizeRoles(mePayload) {
    const roles = mePayload?.data?.roles || mePayload?.roles || [];
    return Array.isArray(roles) ? roles.map(String) : [];
  }

  function normalizePermissions(mePayload) {
    const permissions = mePayload?.data?.permissions || mePayload?.permissions || [];
    return Array.isArray(permissions) ? permissions.map(String) : [];
  }

  function hasRole(mePayload, role) {
    return normalizeRoles(mePayload).includes(role);
  }

  function hasPermission(mePayload, permission) {
    return normalizePermissions(mePayload).includes(permission);
  }

  function canAccessModule(mePayload, moduleKey) {
    const roles = normalizeRoles(mePayload);
    if (roles.includes('ADMIN')) return true;
    return roles.some((role) => (roleToModules[role] || []).includes(moduleKey));
  }

  function filterModuleCards(mePayload, cards) {
    return cards.filter((card) => canAccessModule(mePayload, card.moduleKey));
  }

  window.OTTPermissions = {
    normalizeRoles,
    normalizePermissions,
    hasRole,
    hasPermission,
    canAccessModule,
    filterModuleCards
  };
})();
