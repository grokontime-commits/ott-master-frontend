export type AuthMePayload = {
  data?: {
    user?: { id?: string; email?: string };
    roles?: string[];
    permissions?: string[];
  };
};

const roleToModules: Record<string, string[]> = {
  ADMIN: ['dashboard', 'upload', 'cargo', 'recovery', 'ptt', 'warehouse', 'damage', 'release', 'forklift', 'equipment', 'accounting', 'customerPortal', 'admin'],
  OFFICE: ['dashboard', 'upload', 'cargo', 'recovery', 'ptt', 'warehouse', 'damage', 'release', 'forklift', 'equipment', 'customerPortal'],
  DISPATCHER: ['dashboard', 'recovery', 'ptt', 'equipment'],
  WAREHOUSE: ['dashboard', 'warehouse', 'damage', 'release', 'forklift', 'equipment'],
  RECOVERY_DRIVER: ['dashboard', 'recovery', 'ptt'],
  FORKLIFT_DRIVER: ['dashboard', 'forklift'],
  ACCOUNTING: ['dashboard', 'accounting'],
  CUSTOMER: ['customerPortal']
};

export function getRoles(me: AuthMePayload): string[] {
  return me.data?.roles || [];
}

export function getPermissions(me: AuthMePayload): string[] {
  return me.data?.permissions || [];
}

export function hasRole(me: AuthMePayload, role: string): boolean {
  return getRoles(me).includes(role);
}

export function hasPermission(me: AuthMePayload, permission: string): boolean {
  return getPermissions(me).includes(permission);
}

export function canAccessModule(me: AuthMePayload, moduleKey: string): boolean {
  const roles = getRoles(me);
  if (roles.includes('ADMIN')) return true;
  return roles.some((role) => (roleToModules[role] || []).includes(moduleKey));
}

export function filterModules<T extends { moduleKey: string }>(me: AuthMePayload, modules: T[]): T[] {
  return modules.filter((module) => canAccessModule(me, module.moduleKey));
}
