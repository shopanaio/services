/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  createTag,
  expectNoUserErrors,
  expectRelayConnection,
  missingId,
  setupStore,
  updateTag,
  wrongTypeId,
} from './helpers';

test.describe('Customers Admin API - customer tags', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin creates a normalized customer tag', async ({ api }) => {
    const tag = await createTag(api, { name: '  ＶＩＰ  Customer  ' });
    expect(tag).toMatchObject({
      name: 'VIP Customer',
      normalizedName: 'vip customer',
      customersCount: 0,
    });
  });

  test('blank oversized and duplicate normalized tag names are rejected', async ({ api }) => {
    await createTag(api, { name: 'VIP' });
    for (const name of ['', '   ', 'x'.repeat(1001), ' ＶＩＰ ']) {
      const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerTagCreate', {
        variables: { input: { name } },
      });
      expect(data.customersMutation.customerTagCreate.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('admin renames a tag and preserves assignments', async ({ api }) => {
    const tag = await createTag(api);
    const customer = await createCustomer(api);
    const assigned = await updateTag(api, tag, {
      assignments: { create: [{ customerId: customer.id }] },
    });
    const renamed = await updateTag(api, assigned.tag, { name: 'Renamed' });
    expectNoUserErrors(renamed);
    expect(renamed.tag).toMatchObject({
      name: 'Renamed',
      normalizedName: 'renamed',
      customersCount: 1,
    });
    expect(renamed.tag.customerAssignments.edges[0].node.customer.id).toBe(customer.id);
  });

  test('tag update creates and deletes assignments atomically', async ({ api }) => {
    const tag = await createTag(api);
    const a = await createCustomer(api);
    const b = await createCustomer(api);
    let payload = await updateTag(api, tag, {
      assignments: { create: [{ customerId: a.id }, { customerId: b.id }] },
    });
    const remove = payload.tag.customerAssignments.edges[0].node.id;
    payload = await updateTag(api, payload.tag, { assignments: { deleteIds: [remove] } });
    expectNoUserErrors(payload);
    expect(payload.tag.customersCount).toBe(1);
  });

  test('duplicate conflicting missing and foreign assignments are rejected', async ({ api }) => {
    const tag = await createTag(api);
    const customer = await createCustomer(api);
    for (const assignments of [
      { create: [{ customerId: customer.id }, { customerId: customer.id }] },
      { create: [{ customerId: missingId() }] },
    ]) {
      expect((await updateTag(api, tag, { assignments })).userErrors.length).toBeGreaterThan(0);
    }
    const assigned = await updateTag(api, tag, {
      assignments: { create: [{ customerId: customer.id }] },
    });
    const id = assigned.tag.customerAssignments.edges[0].node.id;
    expect(
      (await updateTag(api, assigned.tag, { assignments: { deleteIds: [id, id] } })).userErrors
        .length,
    ).toBeGreaterThan(0);
  });

  test('tag direct query list filters ordering and Relay pagination are correct', async ({
    api,
  }) => {
    const b = await createTag(api, { name: 'B' });
    const a = await createTag(api, { name: 'A' });
    const variables = {
      first: 1,
      where: { name: { _in: ['A', 'B'] } },
      orderBy: [{ field: 'name', direction: 'asc' }],
    };
    const list = (
      await api.admin.query<any>('customers-admin-api/CustomerTags', {
        variables,
      })
    ).data.customersQuery.customerTags;
    expectRelayConnection(list, 2);
    expect(list.edges[0].node.id).toBe(a.id);
    const next = (
      await api.admin.query<any>('customers-admin-api/CustomerTags', {
        variables: { ...variables, after: list.pageInfo.endCursor },
      })
    ).data.customersQuery.customerTags;
    expect(next.edges.map(({ node }: any) => node.id)).toEqual([b.id]);
    const back = (
      await api.admin.query<any>('customers-admin-api/CustomerTags', {
        variables: {
          last: 1,
          before: next.pageInfo.startCursor,
          where: variables.where,
          orderBy: variables.orderBy,
        },
      })
    ).data.customersQuery.customerTags;
    expect(back.edges.map(({ node }: any) => node.id)).toEqual([a.id]);
    expect(
      (await api.admin.query<any>('customers-admin-api/CustomerTag', { variables: { id: b.id } }))
        .data.customersQuery.customerTag.id,
    ).toBe(b.id);
  });

  test('tag update returns both assignments with unique Relay cursors', async ({ api }) => {
    const tag = await createTag(api);
    const customers = await Promise.all([createCustomer(api), createCustomer(api)]);
    const updated = await updateTag(api, tag, {
      assignments: { create: customers.map(({ id }) => ({ customerId: id })) },
    });
    expectRelayConnection(updated.tag.customerAssignments, 2);
    expect(
      new Set(updated.tag.customerAssignments.edges.map(({ cursor }: any) => cursor)).size,
    ).toBe(2);
  });

  test('deleting a tag removes active assignments without deleting customers', async ({ api }) => {
    const tag = await createTag(api);
    const customer = await createCustomer(api);
    await updateTag(api, tag, { assignments: { create: [{ customerId: customer.id }] } });
    const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerTagDelete', {
      variables: { input: { id: tag.id } },
    });
    expect(data.customersMutation.customerTagDelete).toMatchObject({
      deletedTagId: tag.id,
      userErrors: [],
    });
    expect(
      (
        await api.admin.query<any>('customers-admin-api/Customer', {
          variables: { id: customer.id },
        })
      ).data.customersQuery.customer.id,
    ).toBe(customer.id);
  });

  test('missing malformed and cross-store tag operations are safe', async ({ api }) => {
    for (const id of [missingId('CustomerTag'), 'malformed', wrongTypeId()]) {
      const { data } = await api.admin.query<any>('customers-admin-api/CustomerTag', {
        throwOnError: false,
        variables: { id },
      });
      expect(data?.customersQuery?.customerTag ?? null).toBeNull();
    }
    const foreign = await createTag(api);
    await api.session.setupProject();
    expect((await updateTag(api, foreign, { name: 'No' })).userErrors.length).toBeGreaterThan(0);
  });

  test('concurrent equivalent tag assignment creates do not duplicate membership', async ({
    api,
  }) => {
    const tag = await createTag(api);
    const customer = await createCustomer(api);
    const operation = { assignments: { create: [{ customerId: customer.id }] } };
    const results = await Promise.all([
      updateTag(api, tag, operation),
      updateTag(api, tag, operation),
    ]);
    const loaded = (
      await api.admin.query<any>('customers-admin-api/CustomerTag', { variables: { id: tag.id } })
    ).data.customersQuery.customerTag;
    expect(loaded.customerAssignments.totalCount).toBe(1);
    expect(results.some(({ userErrors }) => userErrors.length === 0)).toBe(true);
  });
});
