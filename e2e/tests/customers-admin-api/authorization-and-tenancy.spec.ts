/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  createGroup,
  createSegment,
  createTag,
  deleteCustomer,
  expectSafeTransportErrors,
  inviteWithPermissions,
  missingId,
  requestCustomerCreate,
  setupStore,
  updateCustomer,
  updateGroup,
  updateSegment,
  updateTag,
  wrongTypeId,
} from './helpers';

test.describe('Customers Admin API - authorization and tenancy', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('unauthenticated actor cannot read Customers Admin API', async ({ api }) => {
    api.session.clearSession();
    for (const [query, variables] of [
      ['Customers', { first: 1 }],
      ['Node', { id: missingId() }],
      ['CustomerGroups', { first: 1 }],
    ]) {
      const result = await api.admin.query<any>(`customers-admin-api/${query}` as any, {
        throwOnError: false,
        variables,
      });
      expectSafeTransportErrors(result.errors, /UNAUTHENTICATED/iu);
      expect(result.data?.customersQuery).toBeUndefined();
    }
  });

  test('unauthenticated actor cannot mutate Customers Admin API', async ({ api }) => {
    api.session.clearSession();
    const result = await requestCustomerCreate(api, { firstName: 'Forbidden' });
    expectSafeTransportErrors(result.errors, /UNAUTHENTICATED/iu);
    expect(result.payload).toBeUndefined();
  });

  test('user without customer read permission cannot query customers', async ({ api }) => {
    await inviteWithPermissions(api, [{ resource: 'store.profile', action: 'read' }]);
    const result = await api.admin.query<any>('customers-admin-api/Customers', {
      throwOnError: false,
      variables: { first: 1 },
    });
    expect(JSON.stringify(result.errors ?? result.data)).toMatch(/FORBIDDEN/iu);
  });

  test('user with customer read permission can query customers', async ({ api }) => {
    await inviteWithPermissions(api, [{ resource: 'store.data', action: 'read' }]);
    const result = await api.admin.query<any>('customers-admin-api/Customers', {
      throwOnError: false,
      variables: { first: 1 },
    });
    expect(result.errors ?? []).toHaveLength(0);
    expect(result.data.customersQuery.customers.totalCount).toBe(0);
  });

  test('user without customer write permission cannot mutate customers', async ({ api }) => {
    await inviteWithPermissions(api, [{ resource: 'store.data', action: 'read' }]);
    const result = await requestCustomerCreate(api, { firstName: 'Forbidden' });
    expect(JSON.stringify(result.errors ?? result.payload)).toMatch(/FORBIDDEN/iu);
  });

  test('user with customer write permission can mutate customers', async ({ api }) => {
    await inviteWithPermissions(api, [{ resource: 'store.data', action: 'write' }]);
    const result = await requestCustomerCreate(api, { firstName: 'Allowed' });
    expect(result.payload.userErrors).toHaveLength(0);
    expect(result.payload.customer).not.toBeNull();
  });

  test('classification permissions protect groups tags and segments', async ({ api }) => {
    await inviteWithPermissions(api, [{ resource: 'store.data', action: 'read' }]);
    for (const [name, input] of [
      ['CustomerGroupCreate', { code: 'x', name: 'X' }],
      ['CustomerTagCreate', { name: 'X' }],
      ['CustomerSegmentCreate', { name: 'X', type: 'MANUAL' }],
    ]) {
      const result = await api.admin.mutation<any>(`customers-admin-api/${name}` as any, {
        throwOnError: false,
        variables: { input },
      });
      expect(JSON.stringify(result.errors ?? result.data)).toMatch(/FORBIDDEN/iu);
    }
  });

  test('privacy permissions protect merges and data requests', async ({ api }) => {
    const left = await createCustomer(api);
    const right = await createCustomer(api);
    await inviteWithPermissions(api, [{ resource: 'store.data', action: 'write' }]);
    for (const [name, input] of [
      ['CustomerMergeCreate', { sourceCustomerId: left.id, targetCustomerId: right.id }],
      ['CustomerDataRequestCreate', { customerId: left.id, type: 'ACCESS' }],
    ]) {
      const result = await api.admin.mutation<any>(`customers-admin-api/${name}` as any, {
        throwOnError: false,
        variables: { input },
      });
      expect(JSON.stringify(result.errors ?? result.data)).toMatch(/FORBIDDEN/iu);
    }
  });

  test('store A cannot read any customer-owned entity from store B', async ({ api }) => {
    let customer = await createCustomer(api, { email: 'foreign@playwright.dev' });
    const group = await createGroup(api);
    const tag = await createTag(api);
    const segment = await createSegment(api);
    customer = (
      await updateCustomer(api, customer, {
        addresses: { create: [{ address1: 'A', city: 'A', countryCode: 'US' }] },
        consents: {
          set: [{ channel: 'EMAIL', state: 'SUBSCRIBED', contactPoint: customer.email }],
        },
        taxIdentifiers: { create: [{ identifierType: 'VAT', value: 'A' }] },
        taxExemptions: { create: [{ code: 'A' }] },
        groups: { memberships: [{ groupId: group.id }] },
        tags: { tagIds: [tag.id] },
        segments: { segmentIds: [segment.id] },
      })
    ).customer;
    await api.session.setupProject();
    const ids = [
      customer.id,
      customer.addresses.edges[0].node.id,
      customer.consents[0].id,
      customer.taxIdentifiers.edges[0].node.id,
      customer.taxExemptions.edges[0].node.id,
      group.id,
      tag.id,
      segment.id,
    ];
    const nodes = await api.admin.query<any>('customers-admin-api/Nodes', { variables: { ids } });
    expect(nodes.data.customersQuery.nodes).toEqual(ids.map(() => null));
  });

  test('store A cannot mutate any customer-owned entity from store B', async ({ api }) => {
    const customer = await createCustomer(api);
    const group = await createGroup(api);
    const tag = await createTag(api);
    const segment = await createSegment(api);
    await api.session.setupProject();
    expect(
      (await updateCustomer(api, customer, { profile: { firstName: 'No' } })).userErrors.length,
    ).toBeGreaterThan(0);
    expect(
      (await updateGroup(api, group, { definition: { name: 'No' } })).userErrors.length,
    ).toBeGreaterThan(0);
    expect((await updateTag(api, tag, { name: 'No' })).userErrors.length).toBeGreaterThan(0);
    expect(
      (await updateSegment(api, segment, { details: { name: 'No' } })).userErrors.length,
    ).toBeGreaterThan(0);
  });

  test('changing an untrusted store selector cannot retarget Customers Admin context', async ({
    api,
  }) => {
    const trusted = api.session.project;
    const foreign = await api.admin.project.create({
      organizationId: api.session.organizationId as string,
    });
    const customer = await createCustomer(api);
    api.session.project = { ...trusted, name: foreign.name };
    const result = await api.admin.query<any>('customers-admin-api/Customer', {
      throwOnError: false,
      variables: { id: customer.id },
    });
    expect(result.data?.customersQuery?.customer ?? null).toBeNull();
  });

  test('global IDs with the wrong entity type are rejected safely', async ({ api }) => {
    const customer = await createCustomer(api);
    for (const id of [wrongTypeId(), customer.id]) {
      const payload = await deleteCustomer(
        api,
        id === customer.id ? wrongTypeId('CustomerGroup') : id,
      );
      expect(payload.userErrors.length).toBeGreaterThan(0);
      expect(JSON.stringify(payload)).not.toMatch(/stack|postgres/iu);
    }
  });

  test('malformed global IDs are rejected safely', async ({ api }) => {
    for (const id of ['', ' ', 'random', '%%%']) {
      const result = await api.admin.query<any>('customers-admin-api/Node', {
        throwOnError: false,
        variables: { id },
      });
      expect(result.data?.customersQuery?.node ?? null).toBeNull();
    }
  });

  test('deleted entities are not returned by active reads', async ({ api }) => {
    const customer = await createCustomer(api);
    await deleteCustomer(api, customer.id);
    const result = await api.admin.query<any>('customers-admin-api/Nodes', {
      variables: { ids: [customer.id] },
    });
    expect(result.data.customersQuery.nodes).toEqual([null]);
  });

  test('admin responses do not expose authentication secrets or internal store IDs', async ({
    api,
  }) => {
    const customer = await createCustomer(api, { email: 'safe@playwright.dev' });
    const result = await api.admin.query<any>('customers-admin-api/Customer', {
      variables: { id: customer.id },
    });
    const serialized = JSON.stringify(result.data);
    expect(serialized).not.toMatch(/password|hash|token|otp|providerSecret|storeId|store_id/iu);
    expect(serialized).not.toContain(api.session.project.id);
  });
});
