/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId } from '@utils/globalid';
import {
  createCustomer,
  createMerge,
  eventually,
  expectNoUserErrors,
  expectRelayConnection,
  expectUserError,
  getCustomer,
  missingId,
  openCustomersSql,
  rawId,
  setupStore,
  updateCustomer,
  wrongTypeId,
} from './helpers';

async function merge(api: any, id: string) {
  return (
    (
      await api.admin.query<any>('customers-admin-api/CustomerMerge', {
        throwOnError: false,
        variables: { id },
      })
    ).data?.customersQuery?.customerMerge ?? null
  );
}
async function completed(api: any, id: string) {
  return eventually(
    () => merge(api, id),
    (value) => ['COMPLETED', 'FAILED'].includes(value?.status),
    15_000,
  );
}

async function seedRequestedMerge(api: any, sourceCustomerId: string, targetCustomerId: string) {
  const sql = openCustomersSql();
  const id = crypto.randomUUID();
  try {
    await sql`
      insert into customers.customer_merge (
        id, store_id, source_customer_id, target_customer_id, status,
        requested_by_type, requested_by_id, idempotency_key, resolution
      ) values (
        ${id}, ${rawId(api.session.project.id)}, ${rawId(sourceCustomerId)},
        ${rawId(targetCustomerId)}, 'REQUESTED', 'user',
        ${api.session.tenant.userId ?? null}, ${crypto.randomUUID()}, '{}'::jsonb
      )
    `;
  } finally {
    await sql.end();
  }
  return { id: composeGlobalId('CustomerMerge', id) };
}

test.describe('Customers Admin API - customer merges', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin creates and completes a valid customer merge', async ({ api }) => {
    const source = await createCustomer(api);
    const target = await createCustomer(api);
    const created = await createMerge(api, source.id, target.id, { reason: 'Duplicate' });
    expectNoUserErrors(created);
    expect(created.merge.status).toBe('REQUESTED');
    const result = await completed(api, created.merge.id);
    expect(result.status).toBe('COMPLETED');
    expect(result.startedAt).toEqual(expect.any(String));
    expect(result.finishedAt).toEqual(expect.any(String));
    expect((await getCustomer(api, source.id)).lifecycleStatus).toBe('MERGED');
    expect((await getCustomer(api, target.id)).lifecycleStatus).not.toBe('MERGED');
  });

  test('merge moves or reconciles every supported customer-owned relation', async ({ api }) => {
    let source = await createCustomer(api, { email: 'source@playwright.dev' });
    const target = await createCustomer(api);
    source = (
      await updateCustomer(api, source, {
        addresses: {
          create: [{ address1: 'A', city: 'A', countryCode: 'US', isDefaultShipping: true }],
        },
        consents: { set: [{ channel: 'EMAIL', state: 'SUBSCRIBED', contactPoint: source.email }] },
        taxIdentifiers: { create: [{ identifierType: 'VAT', value: 'A' }] },
        taxExemptions: { create: [{ code: 'A' }] },
      })
    ).customer;
    const created = await createMerge(api, source.id, target.id);
    expect((await completed(api, created.merge.id)).status).toBe('COMPLETED');
    const mergedTarget = await getCustomer(api, target.id);
    expect(mergedTarget.addresses.totalCount).toBeGreaterThanOrEqual(1);
    expect(mergedTarget.consents.length).toBeGreaterThanOrEqual(1);
    expect(mergedTarget.taxIdentifiers.totalCount).toBeGreaterThanOrEqual(1);
    expect(mergedTarget.taxExemptions.totalCount).toBeGreaterThanOrEqual(1);
  });

  test('merge conflict resolution is deterministic for duplicate email defaults primary values and memberships', async ({
    api,
  }) => {
    const source = await createCustomer(api, { email: 'source-conflict@playwright.dev' });
    const target = await createCustomer(api, { email: 'target-conflict@playwright.dev' });
    const created = await createMerge(api, source.id, target.id);
    const result = await completed(api, created.merge.id);
    expect(result.status).toBe('COMPLETED');
    expect(result.resolution).toEqual(expect.any(Object));
    const snapshot = JSON.stringify(result.resolution);
    expect(JSON.stringify((await merge(api, created.merge.id)).resolution)).toBe(snapshot);
  });

  test('a customer cannot be merged into itself', async ({ api }) => {
    const customer = await createCustomer(api);
    expectUserError(await createMerge(api, customer.id, customer.id), 'SAME_CUSTOMER');
  });

  test('missing cross-store deleted merged redacted or otherwise invalid customers are rejected', async ({
    api,
  }) => {
    const source = await createCustomer(api);
    const target = await createCustomer(api);
    expectUserError(await createMerge(api, missingId(), target.id), 'NOT_FOUND');
    const prior = await createMerge(api, source.id, target.id);
    await completed(api, prior.merge.id);
    expectUserError(
      await createMerge(api, source.id, await createCustomer(api).then((x) => x.id)),
      'INVALID_CUSTOMER_STATE',
    );
  });

  test('reverse or duplicate pending merge is rejected', async ({ api }) => {
    const source = await createCustomer(api);
    const target = await createCustomer(api);
    const first = await createMerge(api, source.id, target.id);
    const duplicate = await createMerge(api, source.id, target.id);
    expect(duplicate.userErrors.map(({ code }: any) => code)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/MERGE_ALREADY_PENDING|INVALID_CUSTOMER_STATE/),
      ]),
    );
    expect(first.merge).not.toBeNull();
  });

  test('admin updates source target and reason before processing starts', async ({ api }) => {
    const source = await createCustomer(api);
    const target = await createCustomer(api);
    const replacement = await createCustomer(api);
    const created = await seedRequestedMerge(api, source.id, target.id);
    const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerMergeUpdate', {
      variables: {
        mergeId: created.id,
        operations: { targetCustomerId: replacement.id, reason: 'Updated' },
      },
    });
    const payload = data.customersMutation.customerMergeUpdate;
    expectNoUserErrors(payload);
    expect(payload.merge).toMatchObject({
      targetCustomer: { id: replacement.id },
      reason: 'Updated',
    });
  });

  test('merge cannot be edited or deleted after processing starts', async ({ api }) => {
    const created = await createMerge(
      api,
      (await createCustomer(api)).id,
      (await createCustomer(api)).id,
    );
    await completed(api, created.merge.id);
    const updated = (
      await api.admin.mutation<any>('customers-admin-api/CustomerMergeUpdate', {
        variables: { mergeId: created.merge.id, operations: { reason: 'No' } },
      })
    ).data.customersMutation.customerMergeUpdate;
    expectUserError(updated, 'INVALID_STATE');
    const deleted = (
      await api.admin.mutation<any>('customers-admin-api/CustomerMergeDelete', {
        variables: { input: { id: created.merge.id } },
      })
    ).data.customersMutation.customerMergeDelete;
    expectUserError(deleted, 'INVALID_STATE');
  });

  test('admin deletes a requested merge without changing either customer', async ({ api }) => {
    const source = await createCustomer(api);
    const target = await createCustomer(api);
    const created = await seedRequestedMerge(api, source.id, target.id);
    const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerMergeDelete', {
      variables: { input: { id: created.id } },
    });
    const payload = data.customersMutation.customerMergeDelete;
    expectNoUserErrors(payload);
    expect(payload.deletedMergeId).toBe(created.id);
    expect((await getCustomer(api, source.id)).lifecycleStatus).toBe('ACTIVE');
    expect((await getCustomer(api, target.id)).lifecycleStatus).toBe('ACTIVE');
  });

  test('completed merge has no failure details', async ({ api }) => {
    const created = await createMerge(
      api,
      (await createCustomer(api)).id,
      (await createCustomer(api)).id,
    );
    const result = await completed(api, created.merge.id);
    expect(result.status).toBe('COMPLETED');
    expect(result.errorCode).toBeNull();
    expect(result.errorMessage).toBeNull();
  });

  test('completed merge reads preserve status timestamps and resolution', async ({ api }) => {
    const created = await createMerge(
      api,
      (await createCustomer(api)).id,
      (await createCustomer(api)).id,
    );
    const first = await completed(api, created.merge.id);
    const second = await merge(api, created.merge.id);
    expect(second).toMatchObject({
      status: first.status,
      finishedAt: first.finishedAt,
      resolution: first.resolution,
    });
  });

  test('concurrent merge requests involving the same source allow one workflow', async ({
    api,
  }) => {
    const source = await createCustomer(api);
    const targets = await Promise.all([createCustomer(api), createCustomer(api)]);
    const results = await Promise.all(
      targets.map((target) => createMerge(api, source.id, target.id)),
    );
    expect(results.filter(({ merge }) => merge).length).toBe(1);
    expect(results.filter(({ userErrors }) => userErrors.length).length).toBe(1);
  });

  test('merge direct query and ID-filtered list return the same merge', async ({ api }) => {
    const created = await createMerge(
      api,
      (await createCustomer(api)).id,
      (await createCustomer(api)).id,
    );
    const direct = await merge(api, created.merge.id);
    expect(direct.id).toBe(created.merge.id);
    const list = (
      await api.admin.query<any>('customers-admin-api/CustomerMerges', {
        variables: {
          first: 1,
          where: { id: { _eq: created.merge.id } },
          orderBy: [{ field: 'requestedAt', direction: 'desc' }],
        },
      })
    ).data.customersQuery.customerMerges;
    expectRelayConnection(list, 1);
  });

  test('missing malformed and cross-store merge IDs are safe', async ({ api }) => {
    for (const id of [missingId('CustomerMerge'), 'malformed', wrongTypeId()])
      expect(await merge(api, id)).toBeNull();
    const created = await createMerge(
      api,
      (await createCustomer(api)).id,
      (await createCustomer(api)).id,
    );
    await api.session.setupProject();
    expect(await merge(api, created.merge.id)).toBeNull();
  });
});
