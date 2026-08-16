/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  createGroup,
  expectNoUserErrors,
  expectRelayConnection,
  expectUserError,
  future,
  missingId,
  setupStore,
  updateGroup,
  wrongTypeId,
} from './helpers';

test.describe('Customers Admin API - customer groups', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin creates an active non-default group', async ({ api }) => {
    const group = await createGroup(api, { code: '  VIP_Gold  ', name: 'VIP Gold' });
    expect(group).toMatchObject({
      code: 'vip_gold',
      name: 'VIP Gold',
      isDefault: false,
      isActive: true,
      revision: 1,
      customersCount: 0,
    });
  });

  test('admin creates the first default group', async ({ api }) => {
    const group = await createGroup(api, { isDefault: true });
    expect(group.isDefault).toBe(true);
    const { data } = await api.admin.query<any>('customers-admin-api/CustomerGroups', {
      variables: { first: 10, where: { isDefault: { _eq: true } } },
    });
    expect(data.customersQuery.customerGroups.totalCount).toBe(1);
  });

  test('making another group default atomically replaces the previous default', async ({ api }) => {
    const first = await createGroup(api, { isDefault: true });
    const second = await createGroup(api);
    const payload = await updateGroup(api, second, { state: { isDefault: true } });
    expectNoUserErrors(payload);
    const { data } = await api.admin.query<any>('customers-admin-api/CustomerGroups', {
      variables: { first: 10, where: { isDefault: { _eq: true } } },
    });
    expect(data.customersQuery.customerGroups.edges.map(({ node }: any) => node.id)).toEqual([
      second.id,
    ]);
    expect(
      (
        await api.admin.query<any>('customers-admin-api/CustomerGroup', {
          variables: { id: first.id },
        })
      ).data.customersQuery.customerGroup.isDefault,
    ).toBe(false);
  });

  test('inactive group cannot be default', async ({ api }) => {
    const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerGroupCreate', {
      variables: {
        input: { code: 'inactive', name: 'Inactive', isActive: false, isDefault: true },
      },
    });
    expectUserError(data.customersMutation.customerGroupCreate, 'DEFAULT_GROUP_INACTIVE');
    const group = await createGroup(api);
    expectUserError(
      await updateGroup(api, group, { state: { isActive: false, isDefault: true } }),
      'DEFAULT_GROUP_INACTIVE',
    );
  });

  test('blank invalid and duplicate normalized group codes or names are rejected', async ({
    api,
  }) => {
    const original = await createGroup(api, { code: 'vip', name: 'VIP' });
    for (const input of [
      { code: '', name: 'A' },
      { code: 'bad code!', name: 'A' },
      { code: 'a', name: '' },
      { code: ' VIP ', name: 'Other' },
    ]) {
      const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerGroupCreate', {
        variables: { input },
      });
      expect(data.customersMutation.customerGroupCreate.userErrors.length).toBeGreaterThan(0);
    }
    expect(original.id).toEqual(expect.any(String));
  });

  test('admin updates group definition state and memberships in one revision', async ({ api }) => {
    const group = await createGroup(api);
    const customer = await createCustomer(api);
    const payload = await updateGroup(api, group, {
      definition: { code: 'updated', name: 'Updated', description: 'D' },
      state: { isActive: true },
      memberships: { create: [{ customerId: customer.id, isPrimary: true }] },
    });
    expectNoUserErrors(payload);
    expect(payload.group).toMatchObject({
      code: 'updated',
      name: 'Updated',
      description: 'D',
      revision: group.revision + 1,
      customersCount: 1,
    });
  });

  test('group update creates updates and deletes memberships', async ({ api }) => {
    const group = await createGroup(api);
    const a = await createCustomer(api);
    const b = await createCustomer(api);
    let payload = await updateGroup(api, group, {
      memberships: { create: [{ customerId: a.id }, { customerId: b.id }] },
    });
    const [update, remove] = payload.group.customerMemberships.edges.map(({ node }: any) => node);
    payload = await updateGroup(api, payload.group, {
      memberships: {
        update: [{ membershipId: update.id, isPrimary: true, expiresAt: future() }],
        deleteIds: [remove.id],
      },
    });
    expect(payload.group.customerMemberships.totalCount).toBe(1);
    expect(payload.group.customerMemberships.edges[0].node.isPrimary).toBe(true);
  });

  test('group membership set rejects duplicates conflicts missing customers and invalid expiry', async ({
    api,
  }) => {
    const group = await createGroup(api);
    const customer = await createCustomer(api);
    for (const memberships of [
      { create: [{ customerId: customer.id }, { customerId: customer.id }] },
      { create: [{ customerId: missingId() }] },
      { create: [{ customerId: customer.id, expiresAt: 'invalid' }] },
    ]) {
      const result = await updateGroup(api, group, { memberships });
      expect(result.userErrors.length || result.group === null).toBeTruthy();
    }
  });

  test('stale group revision rejects definition and membership changes atomically', async ({
    api,
  }) => {
    const group = await createGroup(api);
    const customer = await createCustomer(api);
    const winner = await updateGroup(api, group, { definition: { name: 'Winner' } });
    const stale = await updateGroup(
      api,
      group,
      { definition: { name: 'Loser' }, memberships: { create: [{ customerId: customer.id }] } },
      group.revision,
    );
    expectUserError(stale, 'REVISION_CONFLICT');
    expect(
      (
        await api.admin.query<any>('customers-admin-api/CustomerGroup', {
          variables: { id: group.id },
        })
      ).data.customersQuery.customerGroup,
    ).toMatchObject({ name: 'Winner', customersCount: 0, revision: winner.group.revision });
  });

  test('concurrent group membership updates allow one winner', async ({ api }) => {
    const group = await createGroup(api);
    const a = await createCustomer(api);
    const b = await createCustomer(api);
    const results = await Promise.all([
      updateGroup(api, group, { memberships: { create: [{ customerId: a.id }] } }),
      updateGroup(api, group, { memberships: { create: [{ customerId: b.id }] } }),
    ]);
    expect(results.filter(({ group }) => group).length).toBe(1);
    expect(
      results.filter(({ userErrors }) =>
        userErrors.some(({ code }: any) => code === 'REVISION_CONFLICT'),
      ).length,
    ).toBe(1);
  });

  test('group direct query list filters ordering and Relay pagination are correct', async ({
    api,
  }) => {
    await createGroup(api, { code: 'b', name: 'B' });
    const a = await createGroup(api, { code: 'a', name: 'A' });
    await createGroup(api, { code: 'hidden', name: 'Hidden', isActive: false });
    const variables = {
      first: 1,
      where: { isActive: { _eq: true } },
      orderBy: [{ field: 'code', direction: 'asc' }],
    };
    const first = (
      await api.admin.query<any>('customers-admin-api/CustomerGroups', {
        variables,
      })
    ).data.customersQuery.customerGroups;
    expectRelayConnection(first, 2);
    expect(first.edges[0].node.id).toBe(a.id);
    const second = (
      await api.admin.query<any>('customers-admin-api/CustomerGroups', {
        variables: { ...variables, after: first.pageInfo.endCursor },
      })
    ).data.customersQuery.customerGroups;
    expect(second.edges).toHaveLength(1);
    expect(second.edges[0].node.code).toBe('b');
    const backward = (
      await api.admin.query<any>('customers-admin-api/CustomerGroups', {
        variables: {
          last: 1,
          before: second.pageInfo.startCursor,
          where: variables.where,
          orderBy: variables.orderBy,
        },
      })
    ).data.customersQuery.customerGroups;
    expect(backward.edges.map(({ node }: any) => node.id)).toEqual([a.id]);
    expect(
      (await api.admin.query<any>('customers-admin-api/CustomerGroup', { variables: { id: a.id } }))
        .data.customersQuery.customerGroup.id,
    ).toBe(a.id);
  });

  test('group update returns both active memberships with unique Relay cursors', async ({
    api,
  }) => {
    const group = await createGroup(api);
    const a = await createCustomer(api);
    const b = await createCustomer(api);
    const updated = await updateGroup(api, group, {
      memberships: {
        create: [
          { customerId: a.id, isPrimary: true },
          { customerId: b.id, expiresAt: future() },
        ],
      },
    });
    expectRelayConnection(updated.group.customerMemberships, 2);
    expect(
      updated.group.customerMemberships.edges.filter(({ node }: any) => node.isActive),
    ).toHaveLength(2);
    expect(
      new Set(updated.group.customerMemberships.edges.map(({ cursor }: any) => cursor)).size,
    ).toBe(2);
  });

  test('admin deletes an empty non-default group', async ({ api }) => {
    const group = await createGroup(api);
    const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerGroupDelete', {
      variables: { input: { id: group.id } },
    });
    expect(data.customersMutation.customerGroupDelete).toMatchObject({
      deletedGroupId: group.id,
      userErrors: [],
    });
  });

  test('deleting default or populated group follows explicit dependency policy', async ({
    api,
  }) => {
    const defaultGroup = await createGroup(api, { isDefault: true });
    const populated = await createGroup(api);
    const customer = await createCustomer(api);
    await updateGroup(api, populated, { memberships: { create: [{ customerId: customer.id }] } });
    for (const id of [defaultGroup.id, populated.id]) {
      const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerGroupDelete', {
        variables: { input: { id } },
      });
      expect(data.customersMutation.customerGroupDelete.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('missing malformed and cross-store group operations are safe', async ({ api }) => {
    for (const id of [missingId('CustomerGroup'), 'malformed', wrongTypeId()]) {
      const { data } = await api.admin.query<any>('customers-admin-api/CustomerGroup', {
        throwOnError: false,
        variables: { id },
      });
      expect(data?.customersQuery?.customerGroup ?? null).toBeNull();
    }
    const foreign = await createGroup(api);
    await api.session.setupProject();
    const result = await updateGroup(api, foreign, { definition: { name: 'No' } });
    expectUserError(result, 'NOT_FOUND');
  });
});
