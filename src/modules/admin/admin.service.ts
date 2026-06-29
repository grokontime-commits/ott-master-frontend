import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase.js';
import { recordAuditEvent } from '../../services/audit-log.service.js';
import type { AuthContext } from '../../types/auth.js';
import { AppError, notFound } from '../../utils/app-error.js';
import { throwDbError } from '../../utils/db-error.js';
import type {
  AssignUserRoleBody,
  CreateAirlineBody,
  CreateEmployeeBody,
  CreatePayorBody,
  ListAuditLogsQuery,
  ListEmployeesQuery,
  ListMasterRowsQuery,
  ListUsersQuery,
  UpdateAirlineBody,
  UpdateEmployeeBody,
  UpdatePayorBody,
  UpdateUserActiveBody,
  UpdateUserRoleBody
} from './admin.schemas.js';

type ServiceContext = {
  client: SupabaseClient;
  actor: AuthContext;
  requestId: string;
};

function valueOrNull<T>(value: T | null | undefined): T | null {
  return value === undefined ? null : value;
}

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function actorOrganizationId(ctx: ServiceContext, explicitOrganizationId?: string | null): string | null {
  return explicitOrganizationId ?? ctx.actor.profile.organizationId ?? ctx.actor.organizationIds[0] ?? null;
}

async function countTable(table: string, filters?: (request: ReturnType<typeof supabaseAdmin.from> extends never ? never : any) => any) {
  let request = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });
  if (filters) request = filters(request);
  const { error, count } = await request;
  if (error) throwDbError(`Unable to count ${table}`, error);
  return count ?? 0;
}

export async function getPhase2LAdminStats() {
  const [organizations, payors, airlines, employees, drivers, users, roles, permissions, activeUserRoles, auditLogs] = await Promise.all([
    countTable('organizations'),
    countTable('payors'),
    countTable('airlines'),
    countTable('employee_profiles'),
    countTable('employee_profiles', (request) => request.eq('is_driver', true).eq('is_active', true)),
    countTable('user_profiles'),
    countTable('roles', (request) => request.eq('is_active', true)),
    countTable('permissions'),
    countTable('user_roles', (request) => request.eq('is_active', true)),
    countTable('audit_logs')
  ]);

  return {
    organizations,
    payors,
    airlines,
    employees,
    drivers,
    users,
    roles,
    permissions,
    activeUserRoles,
    auditLogs
  };
}

export async function listOrganizations(ctx: ServiceContext, query: ListMasterRowsQuery) {
  let request = ctx.client
    .from('organizations')
    .select('id, organization_code, legal_name, display_name, organization_type, is_active, created_at, updated_at', { count: 'exact' })
    .order('display_name', { ascending: true })
    .range(query.offset, query.offset + query.limit - 1);

  if (query.isActive !== undefined) request = request.eq('is_active', query.isActive);
  if (query.q) request = request.or(`display_name.ilike.%${query.q}%,legal_name.ilike.%${query.q}%,organization_code.ilike.%${query.q}%`);

  const { data, error, count } = await request;
  if (error) throwDbError('Unable to list organizations', error);
  return { rows: data ?? [], count: count ?? 0, limit: query.limit, offset: query.offset };
}

export async function listPayors(ctx: ServiceContext, query: ListMasterRowsQuery) {
  let request = ctx.client
    .from('payors')
    .select('id, organization_id, payor_code, payor_name, display_name, billing_email:contact_email, phone:contact_phone, default_cfs_free_days, storage_rule_key, quickbooks_customer_ref, notes:billing_notes, is_active, created_at, updated_at', { count: 'exact' })
    .order('display_name', { ascending: true })
    .range(query.offset, query.offset + query.limit - 1);

  if (query.organizationId) request = request.eq('organization_id', query.organizationId);
  if (query.isActive !== undefined) request = request.eq('is_active', query.isActive);
  if (query.q) request = request.or(`display_name.ilike.%${query.q}%,payor_name.ilike.%${query.q}%,payor_code.ilike.%${query.q}%,contact_email.ilike.%${query.q}%`);

  const { data, error, count } = await request;
  if (error) throwDbError('Unable to list payors', error);
  return { rows: data ?? [], count: count ?? 0, limit: query.limit, offset: query.offset };
}

export async function getPayor(ctx: ServiceContext, payorId: string) {
  const { data, error } = await ctx.client
    .from('payors')
    .select('id, organization_id, payor_code, payor_name, display_name, billing_email:contact_email, phone:contact_phone, default_cfs_free_days, storage_rule_key, quickbooks_customer_ref, notes:billing_notes, is_active, created_at, updated_at')
    .eq('id', payorId)
    .single();
  if (error) throwDbError('Unable to read payor', error);
  return data;
}

export async function createPayor(ctx: ServiceContext, body: CreatePayorBody) {
  const row = {
    organization_id: actorOrganizationId(ctx, body.organizationId),
    payor_code: cleanText(body.payorCode),
    payor_name: body.payorName,
    display_name: cleanText(body.displayName) ?? body.payorName,
    contact_email: cleanText(body.billingEmail),
    contact_phone: cleanText(body.phone),
    is_active: body.isActive,
    billing_notes: valueOrNull(body.notes),
  };

  const { data, error } = await ctx.client.from('payors').insert(row).select('*').single();
  if (error) throwDbError('Unable to create payor', error);

  await recordAuditEvent({
    actionKey: 'PAYOR_CREATED',
    moduleKey: 'admin',
    entityType: 'payor',
    entityId: String(data.id),
    entityRef: String(data.display_name ?? data.payor_name),
    newValues: data as Record<string, unknown>,
    metadata: { phase: '2L' },
    actor: ctx.actor,
    requestId: ctx.requestId
  });

  return data;
}

export async function updatePayor(ctx: ServiceContext, payorId: string, body: UpdatePayorBody) {
  const current = await getPayor(ctx, payorId);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.organizationId !== undefined) patch.organization_id = valueOrNull(body.organizationId);
  if (body.payorCode !== undefined) patch.payor_code = cleanText(body.payorCode);
  if (body.payorName !== undefined) patch.payor_name = body.payorName;
  if (body.displayName !== undefined) patch.display_name = cleanText(body.displayName);
  if (body.billingEmail !== undefined) patch.contact_email = cleanText(body.billingEmail);
  if (body.phone !== undefined) patch.contact_phone = cleanText(body.phone);
  if (body.isActive !== undefined) patch.is_active = body.isActive;
  if (body.notes !== undefined) patch.billing_notes = valueOrNull(body.notes);

  const { data, error } = await ctx.client.from('payors').update(patch).eq('id', payorId).select('*').single();
  if (error) throwDbError('Unable to update payor', error);

  await recordAuditEvent({
    actionKey: 'PAYOR_UPDATED',
    moduleKey: 'admin',
    entityType: 'payor',
    entityId: payorId,
    entityRef: String(data.display_name ?? data.payor_name),
    oldValues: current as Record<string, unknown>,
    newValues: data as Record<string, unknown>,
    metadata: { phase: '2L' },
    actor: ctx.actor,
    requestId: ctx.requestId
  });

  return data;
}

export async function listAirlines(ctx: ServiceContext, query: ListMasterRowsQuery) {
  let request = ctx.client
    .from('airlines')
    .select('id, organization_id, airline_code, airline_name, display_name, airline_type, iata_code, icao_code, mawb_prefix, default_pickup_location_id, phone:contact_phone, is_active, notes, created_at, updated_at', { count: 'exact' })
    .order('display_name', { ascending: true })
    .range(query.offset, query.offset + query.limit - 1);

  if (query.organizationId) request = request.eq('organization_id', query.organizationId);
  if (query.isActive !== undefined) request = request.eq('is_active', query.isActive);
  if (query.q) request = request.or(`display_name.ilike.%${query.q}%,airline_name.ilike.%${query.q}%,airline_code.ilike.%${query.q}%,mawb_prefix.ilike.%${query.q}%`);

  const { data, error, count } = await request;
  if (error) throwDbError('Unable to list airlines', error);
  return { rows: data ?? [], count: count ?? 0, limit: query.limit, offset: query.offset };
}

export async function getAirline(ctx: ServiceContext, airlineId: string) {
  const { data, error } = await ctx.client
    .from('airlines')
    .select('id, organization_id, airline_code, airline_name, display_name, airline_type, iata_code, icao_code, mawb_prefix, default_pickup_location_id, phone:contact_phone, is_active, notes, created_at, updated_at')
    .eq('id', airlineId)
    .single();
  if (error) throwDbError('Unable to read airline', error);
  return data;
}

export async function createAirline(ctx: ServiceContext, body: CreateAirlineBody) {
  const row = {
    organization_id: actorOrganizationId(ctx, body.organizationId),
    airline_code: cleanText(body.airlineCode),
    airline_name: body.airlineName,
    display_name: cleanText(body.displayName) ?? body.airlineName,
    mawb_prefix: cleanText(body.mawbPrefix),
    contact_phone: cleanText(body.phone),
    is_active: body.isActive,
    notes: valueOrNull(body.notes),
  };

  const { data, error } = await ctx.client.from('airlines').insert(row).select('*').single();
  if (error) throwDbError('Unable to create airline', error);

  await recordAuditEvent({
    actionKey: 'AIRLINE_CREATED',
    moduleKey: 'admin',
    entityType: 'airline',
    entityId: String(data.id),
    entityRef: String(data.display_name ?? data.airline_name),
    newValues: data as Record<string, unknown>,
    metadata: { phase: '2L' },
    actor: ctx.actor,
    requestId: ctx.requestId
  });

  return data;
}

export async function updateAirline(ctx: ServiceContext, airlineId: string, body: UpdateAirlineBody) {
  const current = await getAirline(ctx, airlineId);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.organizationId !== undefined) patch.organization_id = valueOrNull(body.organizationId);
  if (body.airlineCode !== undefined) patch.airline_code = cleanText(body.airlineCode);
  if (body.airlineName !== undefined) patch.airline_name = body.airlineName;
  if (body.displayName !== undefined) patch.display_name = cleanText(body.displayName);
  if (body.mawbPrefix !== undefined) patch.mawb_prefix = cleanText(body.mawbPrefix);
  if (body.phone !== undefined) patch.contact_phone = cleanText(body.phone);
  if (body.isActive !== undefined) patch.is_active = body.isActive;
  if (body.notes !== undefined) patch.notes = valueOrNull(body.notes);

  const { data, error } = await ctx.client.from('airlines').update(patch).eq('id', airlineId).select('*').single();
  if (error) throwDbError('Unable to update airline', error);

  await recordAuditEvent({
    actionKey: 'AIRLINE_UPDATED',
    moduleKey: 'admin',
    entityType: 'airline',
    entityId: airlineId,
    entityRef: String(data.display_name ?? data.airline_name),
    oldValues: current as Record<string, unknown>,
    newValues: data as Record<string, unknown>,
    metadata: { phase: '2L' },
    actor: ctx.actor,
    requestId: ctx.requestId
  });

  return data;
}

export async function listEmployees(ctx: ServiceContext, query: ListEmployeesQuery) {
  let request = ctx.client
    .from('employee_profiles')
    .select('id, organization_id, user_id, employee_number, display_name, email, phone, employee_type, is_driver, is_active, notes, created_at, updated_at', { count: 'exact' })
    .order('display_name', { ascending: true })
    .range(query.offset, query.offset + query.limit - 1);

  if (query.organizationId) request = request.eq('organization_id', query.organizationId);
  if (query.employeeType) request = request.eq('employee_type', query.employeeType);
  if (query.isActive !== undefined) request = request.eq('is_active', query.isActive);
  if (query.isDriver !== undefined) request = request.eq('is_driver', query.isDriver);
  if (query.q) request = request.or(`display_name.ilike.%${query.q}%,employee_number.ilike.%${query.q}%,email.ilike.%${query.q}%,phone.ilike.%${query.q}%`);

  const { data, error, count } = await request;
  if (error) throwDbError('Unable to list employees', error);
  return { rows: data ?? [], count: count ?? 0, limit: query.limit, offset: query.offset };
}

export async function getEmployee(ctx: ServiceContext, employeeId: string) {
  const { data, error } = await ctx.client
    .from('employee_profiles')
    .select('id, organization_id, user_id, employee_number, display_name, email, phone, employee_type, is_driver, is_active, notes, created_at, updated_at')
    .eq('id', employeeId)
    .single();
  if (error) throwDbError('Unable to read employee', error);
  return data;
}

export async function createEmployee(ctx: ServiceContext, body: CreateEmployeeBody) {
  const row = {
    organization_id: actorOrganizationId(ctx, body.organizationId),
    user_id: valueOrNull(body.userId),
    employee_number: cleanText(body.employeeNumber),
    display_name: body.displayName,
    email: cleanText(body.email),
    phone: cleanText(body.phone),
    employee_type: body.employeeType,
    is_driver: body.isDriver,
    is_warehouse_user: body.isWarehouse,
    is_office_user: body.employeeType === 'OFFICE',
    is_accounting_user: body.employeeType === 'ACCOUNTING',
    is_active: body.isActive,
    notes: valueOrNull(body.notes),
  };

  const { data, error } = await ctx.client.from('employee_profiles').insert(row).select('*').single();
  if (error) throwDbError('Unable to create employee', error);

  await recordAuditEvent({
    actionKey: 'EMPLOYEE_CREATED',
    moduleKey: 'admin',
    entityType: 'employee_profile',
    entityId: String(data.id),
    entityRef: String(data.display_name),
    newValues: data as Record<string, unknown>,
    metadata: { phase: '2L' },
    actor: ctx.actor,
    requestId: ctx.requestId
  });

  return data;
}

export async function updateEmployee(ctx: ServiceContext, employeeId: string, body: UpdateEmployeeBody) {
  const current = await getEmployee(ctx, employeeId);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.organizationId !== undefined) patch.organization_id = valueOrNull(body.organizationId);
  if (body.userId !== undefined) patch.user_id = valueOrNull(body.userId);
  if (body.employeeNumber !== undefined) patch.employee_number = cleanText(body.employeeNumber);
  if (body.displayName !== undefined) patch.display_name = body.displayName;
  if (body.email !== undefined) patch.email = cleanText(body.email);
  if (body.phone !== undefined) patch.contact_phone = cleanText(body.phone);
  if (body.employeeType !== undefined) patch.employee_type = body.employeeType;
  if (body.isDriver !== undefined) patch.is_driver = body.isDriver;
  if (body.isWarehouse !== undefined) patch.is_warehouse_user = body.isWarehouse;
  if (body.employeeType !== undefined) {
    patch.is_office_user = body.employeeType === 'OFFICE';
    patch.is_accounting_user = body.employeeType === 'ACCOUNTING';
  }
  if (body.isActive !== undefined) patch.is_active = body.isActive;
  if (body.notes !== undefined) patch.notes = valueOrNull(body.notes);

  const { data, error } = await ctx.client.from('employee_profiles').update(patch).eq('id', employeeId).select('*').single();
  if (error) throwDbError('Unable to update employee', error);

  await recordAuditEvent({
    actionKey: 'EMPLOYEE_UPDATED',
    moduleKey: 'admin',
    entityType: 'employee_profile',
    entityId: employeeId,
    entityRef: String(data.display_name),
    oldValues: current as Record<string, unknown>,
    newValues: data as Record<string, unknown>,
    metadata: { phase: '2L' },
    actor: ctx.actor,
    requestId: ctx.requestId
  });

  return data;
}

export async function listUsers(ctx: ServiceContext, query: ListUsersQuery) {
  let request = ctx.client
    .from('user_profiles')
    .select('id, organization_id, email, display_name, profile_type, is_active, created_at, updated_at, organizations:organization_id(id, display_name, organization_code)', { count: 'exact' })
    .order('display_name', { ascending: true })
    .range(query.offset, query.offset + query.limit - 1);

  if (query.organizationId) request = request.eq('organization_id', query.organizationId);
  if (query.profileType) request = request.eq('profile_type', query.profileType);
  if (query.isActive !== undefined) request = request.eq('is_active', query.isActive);
  if (query.q) request = request.or(`display_name.ilike.%${query.q}%,email.ilike.%${query.q}%`);

  const { data, error, count } = await request;
  if (error) throwDbError('Unable to list users', error);
  return { rows: data ?? [], count: count ?? 0, limit: query.limit, offset: query.offset };
}

export async function getUserProfile(ctx: ServiceContext, userId: string) {
  const { data, error } = await ctx.client
    .from('user_profiles')
    .select('id, organization_id, email, display_name, profile_type, is_active, created_at, updated_at, organizations:organization_id(id, display_name, organization_code)')
    .eq('id', userId)
    .single();
  if (error) throwDbError('Unable to read user profile', error);
  return data;
}

export async function updateUserActive(ctx: ServiceContext, userId: string, body: UpdateUserActiveBody) {
  const current = await getUserProfile(ctx, userId);
  if (userId === ctx.actor.user.id && body.isActive === false) {
    throw new AppError('You cannot deactivate your own active session user.', { statusCode: 409, code: 'CANNOT_DEACTIVATE_SELF' });
  }

  const { data, error } = await ctx.client
    .from('user_profiles')
    .update({ is_active: body.isActive, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throwDbError('Unable to update user active status', error);

  await recordAuditEvent({
    actionKey: body.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    moduleKey: 'admin',
    entityType: 'user_profile',
    entityId: userId,
    entityRef: String(data.email ?? data.display_name ?? userId),
    oldValues: current as Record<string, unknown>,
    newValues: data as Record<string, unknown>,
    notes: body.notes ?? null,
    metadata: { phase: '2L' },
    actor: ctx.actor,
    requestId: ctx.requestId
  });

  return data;
}

export async function listRoles(ctx: ServiceContext) {
  const { data, error } = await ctx.client
    .from('roles')
    .select('id, role_key, role_name, description:role_description, is_system_role, is_active, created_at, updated_at')
    .order('role_key', { ascending: true });
  if (error) throwDbError('Unable to list roles', error);
  return { rows: data ?? [], count: data?.length ?? 0 };
}

export async function listPermissions(ctx: ServiceContext) {
  const { data, error } = await ctx.client
    .from('permissions')
    .select('id, permission_key, permission_name:permission_key, module_key, action_key, description:permission_description, is_system_permission, created_at, updated_at')
    .order('module_key', { ascending: true })
    .order('permission_key', { ascending: true });
  if (error) throwDbError('Unable to list permissions', error);
  return { rows: data ?? [], count: data?.length ?? 0 };
}

export async function listRolePermissions(ctx: ServiceContext, roleId: string) {
  const { data, error } = await ctx.client
    .from('role_permissions')
    .select('id, role_id, permission_id, permissions:permission_id(id, permission_key, permission_name:permission_key, module_key, action_key, description:permission_description)')
    .eq('role_id', roleId)
    .order('permission_id', { ascending: true });
  if (error) throwDbError('Unable to list role permissions', error);
  return { rows: data ?? [], count: data?.length ?? 0 };
}

export async function listUserRoles(ctx: ServiceContext, userId: string) {
  const { data, error } = await ctx.client
    .from('user_roles')
    .select('id, user_id, organization_id, role_id, is_active, starts_at, ends_at, notes, created_at, updated_at, roles:role_id(id, role_key, role_name), organizations:organization_id(id, display_name, organization_code)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throwDbError('Unable to list user role assignments', error);
  return { rows: data ?? [], count: data?.length ?? 0 };
}

async function resolveRoleId(roleId: string | undefined, roleKey: string | undefined): Promise<string> {
  if (roleId) return roleId;
  if (!roleKey) throw new AppError('roleId or roleKey is required', { statusCode: 400, code: 'ROLE_REQUIRED' });

  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('role_key', roleKey.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !data?.id) {
    throw notFound(`Active role not found: ${roleKey}`);
  }

  return String(data.id);
}

export async function assignUserRole(ctx: ServiceContext, userId: string, body: AssignUserRoleBody) {
  const roleId = await resolveRoleId(body.roleId, body.roleKey);
  const organizationId = actorOrganizationId(ctx, body.organizationId);
  const insertRow = {
    user_id: userId,
    organization_id: organizationId,
    role_id: roleId,
    starts_at: valueOrNull(body.startsAt),
    ends_at: valueOrNull(body.endsAt),
    is_active: true,
    notes: valueOrNull(body.notes)
  };

  const { data, error } = await ctx.client
    .from('user_roles')
    .upsert(insertRow, { onConflict: 'user_id,organization_id,role_id' })
    .select('id, user_id, organization_id, role_id, is_active, starts_at, ends_at, notes, created_at, updated_at, roles:role_id(id, role_key, role_name)')
    .single();

  if (error) throwDbError('Unable to assign user role', error);

  await recordAuditEvent({
    actionKey: 'USER_ROLE_ASSIGNED',
    moduleKey: 'admin',
    entityType: 'user_role',
    entityId: String(data.id),
    entityRef: `${userId}:${roleId}`,
    newValues: data as Record<string, unknown>,
    metadata: { phase: '2L', user_id: userId, role_id: roleId },
    actor: ctx.actor,
    requestId: ctx.requestId
  });

  return data;
}

export async function updateUserRole(ctx: ServiceContext, userRoleId: string, body: UpdateUserRoleBody) {
  const { data: current, error: currentError } = await ctx.client
    .from('user_roles')
    .select('id, user_id, organization_id, role_id, is_active, starts_at, ends_at, notes, created_at, updated_at')
    .eq('id', userRoleId)
    .single();
  if (currentError) throwDbError('Unable to read user role assignment', currentError);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.isActive !== undefined) patch.is_active = body.isActive;
  if (body.startsAt !== undefined) patch.starts_at = valueOrNull(body.startsAt);
  if (body.endsAt !== undefined) patch.ends_at = valueOrNull(body.endsAt);
  if (body.notes !== undefined) patch.notes = valueOrNull(body.notes);

  const { data, error } = await ctx.client
    .from('user_roles')
    .update(patch)
    .eq('id', userRoleId)
    .select('id, user_id, organization_id, role_id, is_active, starts_at, ends_at, notes, created_at, updated_at, roles:role_id(id, role_key, role_name)')
    .single();

  if (error) throwDbError('Unable to update user role assignment', error);

  await recordAuditEvent({
    actionKey: body.isActive === false ? 'USER_ROLE_DEACTIVATED' : 'USER_ROLE_UPDATED',
    moduleKey: 'admin',
    entityType: 'user_role',
    entityId: userRoleId,
    entityRef: `${data.user_id}:${data.role_id}`,
    oldValues: current as Record<string, unknown>,
    newValues: data as Record<string, unknown>,
    metadata: { phase: '2L' },
    actor: ctx.actor,
    requestId: ctx.requestId
  });

  return data;
}

export async function listAuditLogs(ctx: ServiceContext, query: ListAuditLogsQuery) {
  let request = ctx.client
    .from('audit_logs')
    .select('id, action_key, module_key, entity_type, entity_id, entity_ref, organization_id, actor_user_id, actor_role_keys, actor_label, actor_source, request_id, severity, notes, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(query.offset, query.offset + query.limit - 1);

  if (query.organizationId) request = request.eq('organization_id', query.organizationId);
  if (query.actionKey) request = request.eq('action_key', query.actionKey.toUpperCase());
  if (query.moduleKey) request = request.eq('module_key', query.moduleKey.toLowerCase());
  if (query.actorUserId) request = request.eq('actor_user_id', query.actorUserId);
  if (query.entityType) request = request.eq('entity_type', query.entityType.toLowerCase());
  if (query.entityId) request = request.eq('entity_id', query.entityId);

  const { data, error, count } = await request;
  if (error) throwDbError('Unable to list audit logs', error);
  return { rows: data ?? [], count: count ?? 0, limit: query.limit, offset: query.offset };
}
