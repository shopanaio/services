/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';
import postgres from 'postgres';

export type Api = ApiFixtures['api'];
export type Json = Record<string, any>;
export interface UserError {
  code?: string | null;
  field?: string[] | null;
  message: string;
}

export const future = (days = 30) => new Date(Date.now() + days * 86_400_000).toISOString();
export const past = (days = 30) => new Date(Date.now() - days * 86_400_000).toISOString();
export const unique = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 12)}`;
export const customerEmail = () => `${unique('customer')}@playwright.dev`;

export async function setupStore(api: Api) {
  await api.session.setupUserAndStore();
  return api.session.project;
}

export async function inviteWithPermissions(
  api: Api,
  permissions: { resource: string; action: 'read' | 'write' | 'admin' }[],
  domain = `store:${rawId(api.session.project.id)}`,
) {
  const owner = { accessToken: api.session.tenant.accessToken, userId: api.session.tenant.userId };
  const organizationId = required(api.session.organizationId, 'organization ID');
  const user = await api.admin.user.create();
  const role = unique('customers-role');
  const roleResult = await api.admin.mutation<Json>('roles-api/RoleCreate', {
    variables: {
      input: { organizationId, domain, name: role, displayName: 'Customers E2E role', permissions },
    },
  });
  expect(roleResult.data.roleMutation.roleCreate.userErrors).toHaveLength(0);
  const invite = await api.admin.mutation<Json>('iam-api/MemberInvite', {
    variables: { input: { organizationId, email: user.data.email, roles: [{ domain, role }] } },
  });
  expect(invite.data.organizationMutation.memberInvite.userErrors).toHaveLength(0);
  api.session.tenant.accessToken = user.accessToken;
  api.session.tenant.userId = user.userId;
  return { owner, user };
}

export async function createCustomer(api: Api, input: Json = {}) {
  const { data, errors } = await api.admin.mutation<Json>('customers-admin-api/CustomerCreate', {
    throwOnError: false,
    variables: { input },
  });
  expectNoTransportErrors(errors);
  const payload = data?.customersMutation?.customerCreate;
  if (!payload) throw new Error(`customerCreate returned no payload: ${JSON.stringify(errors)}`);
  expectNoUserErrors(payload);
  return required(payload.customer, 'created customer');
}

export async function requestCustomerCreate(api: Api, input: Json) {
  const { data, errors } = await api.admin.mutation<Json>('customers-admin-api/CustomerCreate', {
    throwOnError: false,
    variables: { input },
  });
  return { payload: data?.customersMutation?.customerCreate, errors };
}

export async function updateCustomer(
  api: Api,
  customer: Json,
  operations: Json,
  expectedRevision = customer.revision,
) {
  const { data, errors } = await api.admin.mutation<Json>('customers-admin-api/CustomerUpdate', {
    throwOnError: false,
    variables: { customerId: customer.id, expectedRevision, operations },
  });
  expectNoTransportErrors(errors);
  const payload = data?.customersMutation?.customerUpdate;
  if (!payload) throw new Error(`customerUpdate returned no payload: ${JSON.stringify(errors)}`);
  return payload;
}

export async function getCustomer(api: Api, id: string) {
  const { data, errors } = await api.admin.query<Json>('customers-admin-api/Customer', {
    throwOnError: false,
    variables: { id },
  });
  expectNoTransportErrors(errors);
  return data?.customersQuery?.customer ?? null;
}

export async function getCustomerByEmail(api: Api, email: string) {
  const { data, errors } = await api.admin.query<Json>('customers-admin-api/CustomerByEmail', {
    throwOnError: false,
    variables: { email },
  });
  expectNoTransportErrors(errors);
  return data?.customersQuery?.customerByEmail ?? null;
}

export async function listCustomers(api: Api, variables: Json = {}) {
  const { data, errors } = await api.admin.query<Json>('customers-admin-api/Customers', {
    throwOnError: false,
    variables,
  });
  expectNoTransportErrors(errors);
  const connection = data?.customersQuery?.customers;
  if (!connection) throw new Error(`customers returned no connection: ${JSON.stringify(errors)}`);
  return connection;
}

export async function deleteCustomer(api: Api, id: string, expectedRevision?: number) {
  const { data, errors } = await api.admin.mutation<Json>('customers-admin-api/CustomerDelete', {
    throwOnError: false,
    variables: { input: { id, ...(expectedRevision === undefined ? {} : { expectedRevision }) } },
  });
  expectNoTransportErrors(errors);
  const payload = data?.customersMutation?.customerDelete;
  if (!payload) throw new Error(`customerDelete returned no payload: ${JSON.stringify(errors)}`);
  return payload;
}

export async function createGroup(api: Api, input: Json = {}) {
  const { data } = await api.admin.mutation<Json>('customers-admin-api/CustomerGroupCreate', {
    variables: { input: { code: unique('group'), name: unique('Group'), ...input } },
  });
  const payload = data.customersMutation.customerGroupCreate;
  expectNoUserErrors(payload);
  return required(payload.group, 'created group');
}

export async function updateGroup(
  api: Api,
  group: Json,
  operations: Json,
  expectedRevision = group.revision,
) {
  const { data, errors } = await api.admin.mutation<Json>(
    'customers-admin-api/CustomerGroupUpdate',
    {
      throwOnError: false,
      variables: { groupId: group.id, expectedRevision, operations },
    },
  );
  expectNoTransportErrors(errors);
  return data.customersMutation.customerGroupUpdate;
}

export async function createTag(api: Api, input: Json = {}) {
  const { data } = await api.admin.mutation<Json>('customers-admin-api/CustomerTagCreate', {
    variables: { input: { name: unique('Tag'), ...input } },
  });
  const payload = data.customersMutation.customerTagCreate;
  expectNoUserErrors(payload);
  return required(payload.tag, 'created tag');
}

export async function updateTag(api: Api, tag: Json, operations?: Json | null) {
  const { data, errors } = await api.admin.mutation<Json>(
    'customers-admin-api/CustomerTagUpdate',
    {
      throwOnError: false,
      variables: { tagId: tag.id, operations },
    },
  );
  expectNoTransportErrors(errors);
  return data.customersMutation.customerTagUpdate;
}

export async function createSegment(api: Api, input: Json = {}) {
  const { data, errors } = await api.admin.mutation<Json>(
    'customers-admin-api/CustomerSegmentCreate',
    {
      throwOnError: false,
      variables: { input: { name: unique('Segment'), type: 'MANUAL', ...input } },
    },
  );
  expectNoTransportErrors(errors);
  const payload = data.customersMutation.customerSegmentCreate;
  expectNoUserErrors(payload);
  return required(payload.segment, 'created segment');
}

export async function updateSegment(
  api: Api,
  segment: Json,
  operations: Json,
  expectedRevision = segment.revision,
) {
  const { data, errors } = await api.admin.mutation<Json>(
    'customers-admin-api/CustomerSegmentUpdate',
    {
      throwOnError: false,
      variables: { segmentId: segment.id, expectedRevision, operations },
    },
  );
  expectNoTransportErrors(errors);
  return data.customersMutation.customerSegmentUpdate;
}

export async function createMerge(
  api: Api,
  sourceCustomerId: string,
  targetCustomerId: string,
  input: Json = {},
) {
  const { data, errors } = await api.admin.mutation<Json>(
    'customers-admin-api/CustomerMergeCreate',
    {
      throwOnError: false,
      variables: { input: { sourceCustomerId, targetCustomerId, ...input } },
    },
  );
  expectNoTransportErrors(errors);
  return data.customersMutation.customerMergeCreate;
}

export async function createDataRequest(
  api: Api,
  customerId: string,
  type = 'ACCESS',
  input: Json = {},
) {
  const { data, errors } = await api.admin.mutation<Json>(
    'customers-admin-api/CustomerDataRequestCreate',
    {
      throwOnError: false,
      variables: { input: { customerId, type, ...input } },
    },
  );
  expectNoTransportErrors(errors);
  return data.customersMutation.customerDataRequestCreate;
}

export function expectNoTransportErrors(errors: Json[] | undefined) {
  expect(errors ?? []).toHaveLength(0);
}

export function expectNoUserErrors(payload: Json) {
  expect(payload.userErrors).toEqual([]);
}

export function expectUserError(payload: Json, code: string, field?: string[]) {
  expect(payload.userErrors).toEqual(expect.arrayContaining([expect.objectContaining({ code })]));
  if (field)
    expect(payload.userErrors.map((error: UserError) => error.field)).toContainEqual(field);
}

export function expectSuccessfulUpdate(payload: Json, operationTypes?: string[]) {
  expectNoUserErrors(payload);
  expect(
    payload.customer ??
      payload.group ??
      payload.tag ??
      payload.segment ??
      payload.merge ??
      payload.dataRequest,
  ).not.toBeNull();
  expect(
    payload.operationResults.every((result: Json) => result.applied && result.errors.length === 0),
  ).toBe(true);
  if (operationTypes)
    expect(payload.operationResults.map((result: Json) => result.type)).toEqual(operationTypes);
}

export function expectRelayConnection(connection: Json, count?: number) {
  expect(connection.edges).toBeInstanceOf(Array);
  expect(connection.totalCount).toBeGreaterThanOrEqual(0);
  expect(connection.pageInfo).toEqual({
    hasNextPage: expect.any(Boolean),
    hasPreviousPage: expect.any(Boolean),
    startCursor: connection.edges.length ? expect.any(String) : null,
    endCursor: connection.edges.length ? expect.any(String) : null,
  });
  if (count !== undefined) expect(connection.totalCount).toBe(count);
}

export function expectSafeTransportErrors(errors: Json[] | undefined, code: RegExp) {
  expect(JSON.stringify(errors ?? [])).toMatch(code);
  expect(JSON.stringify(errors ?? [])).not.toMatch(
    /password|token|secret|postgres|stack|internal store/iu,
  );
}

export async function selectFreshStore(api: Api) {
  const previous = api.session.project;
  await api.session.setupProject();
  const next = api.session.project;
  return { previous, next };
}

export function selectStore(api: Api, store: Json) {
  api.session.project = store;
}

export function wrongTypeId(type = 'Product') {
  return composeGlobalId(type, crypto.randomUUID());
}
export function missingId(type = 'Customer') {
  return composeGlobalId(type, crypto.randomUUID());
}
export function rawId(globalId: string) {
  return decodeGlobalId(globalId).id;
}
export function required<T>(value: T | null | undefined, label: string): T {
  if (value == null) throw new Error(`Missing ${label}`);
  return value;
}

export function openCustomersSql() {
  return postgres(
    process.env.E2E_DATABASE_URL ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:15432/portal',
    { max: 1 },
  );
}

export async function eventually<T>(
  read: () => Promise<T>,
  accept: (value: T) => boolean,
  timeoutMs = 10_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!accept(value) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    value = await read();
  }
  expect(accept(value)).toBe(true);
  return value;
}
