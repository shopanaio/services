/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId } from '@utils/globalid';
import {
  createCustomer,
  createDataRequest,
  eventually,
  expectNoUserErrors,
  expectRelayConnection,
  expectUserError,
  future,
  getCustomer,
  missingId,
  openCustomersSql,
  past,
  rawId,
  setupStore,
  wrongTypeId,
} from './helpers';

async function request(api: any, id: string) {
  return (
    (
      await api.admin.query<any>('customers-admin-api/CustomerDataRequest', {
        throwOnError: false,
        variables: { id },
      })
    ).data?.customersQuery?.customerDataRequest ?? null
  );
}
async function terminal(api: any, id: string) {
  return eventually(
    () => request(api, id),
    (value) => ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(value?.status),
    20_000,
  );
}
async function update(api: any, id: string, operations: any) {
  return (
    await api.admin.mutation<any>('customers-admin-api/CustomerDataRequestUpdate', {
      variables: { dataRequestId: id, operations },
    })
  ).data.customersMutation.customerDataRequestUpdate;
}

async function seedPendingRequest(api: any, customerId: string, type = 'ACCESS') {
  const sql = openCustomersSql();
  const id = crypto.randomUUID();
  try {
    await sql`
      insert into customers.customer_data_request (
        id, store_id, customer_id, type, status, requested_by_type,
        requested_by_id, idempotency_key, request_metadata
      ) values (
        ${id}, ${rawId(api.session.project.id)}, ${rawId(customerId)}, ${type}, 'PENDING',
        'user', ${api.session.tenant.userId ?? null}, ${crypto.randomUUID()}, '{}'::jsonb
      )
    `;
  } finally {
    await sql.end();
  }
  return { id: composeGlobalId('CustomerDataRequest', id) };
}

test.describe('Customers Admin API - customer data requests', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin creates ACCESS EXPORT CORRECTION and ERASURE requests', async ({ api }) => {
    for (const type of ['ACCESS', 'EXPORT', 'CORRECTION', 'ERASURE']) {
      const customer = await createCustomer(api);
      const payload = await createDataRequest(api, customer.id, type, {
        legalBasis: 'GDPR',
        requestMetadata:
          type === 'CORRECTION'
            ? { correctionDetails: { firstName: 'Corrected' } }
            : { source: 'e2e' },
        dueAt: future(),
      });
      expectNoUserErrors(payload);
      expect(payload.dataRequest).toMatchObject({
        customer: { id: customer.id },
        type,
        status: 'PENDING',
        requestedByType: 'user',
        legalBasis: 'GDPR',
        dueAt: expect.any(String),
      });
    }
  });

  test('past or invalid dueAt and malformed request metadata are rejected', async ({ api }) => {
    const customer = await createCustomer(api);
    for (const input of [
      { dueAt: past() },
      { dueAt: 'invalid' },
      { requestMetadata: ['not-object'] },
    ]) {
      const { data, errors } = await api.admin.mutation<any>(
        'customers-admin-api/CustomerDataRequestCreate',
        {
          throwOnError: false,
          variables: { input: { customerId: customer.id, type: 'ACCESS', ...input } },
        },
      );
      expect(
        errors?.length || data?.customersMutation?.customerDataRequestCreate?.userErrors?.length,
      ).toBeTruthy();
    }
  });

  test('admin updates pending request metadata customer type legal basis and due date', async ({
    api,
  }) => {
    const first = await createCustomer(api);
    const second = await createCustomer(api);
    const created = await seedPendingRequest(api, first.id);
    const payload = await update(api, created.id, {
      customerId: second.id,
      type: 'EXPORT',
      legalBasis: 'Updated',
      requestMetadata: { updated: true },
      dueAt: future(60),
    });
    expectNoUserErrors(payload);
    expect(payload.dataRequest).toMatchObject({
      customer: { id: second.id },
      type: 'EXPORT',
      legalBasis: 'Updated',
      requestMetadata: { updated: true },
    });
  });

  test('admin cancels a pending request with an optional reason', async ({ api }) => {
    const created = await seedPendingRequest(api, (await createCustomer(api)).id);
    const payload = await update(api, created.id, { cancel: { reason: 'Withdrawn' } });
    expectNoUserErrors(payload);
    expect(payload.dataRequest).toMatchObject({
      status: 'CANCELLED',
      rejectionReason: 'Withdrawn',
      finishedAt: expect.any(String),
    });
  });

  test('cancel cannot be combined with conflicting updates', async ({ api }) => {
    const created = await seedPendingRequest(api, (await createCustomer(api)).id);
    const payload = await update(api, created.id, {
      legalBasis: 'conflict',
      cancel: { reason: 'cancel' },
    });
    expect(payload.dataRequest).toBeNull();
    expectUserError(payload, 'CONFLICTING_OPERATION', ['operations']);
    expect((await request(api, created.id)).status).toBe('PENDING');
  });

  test('terminal request cannot be edited cancelled or deleted', async ({ api }) => {
    const created = await createDataRequest(api, (await createCustomer(api)).id);
    await terminal(api, created.dataRequest.id);
    expectUserError(
      await update(api, created.dataRequest.id, { legalBasis: 'No' }),
      'INVALID_STATE',
    );
    expectUserError(await update(api, created.dataRequest.id, { cancel: {} }), 'INVALID_STATE');
    const deleted = (
      await api.admin.mutation<any>('customers-admin-api/CustomerDataRequestDelete', {
        variables: { input: { id: created.dataRequest.id } },
      })
    ).data.customersMutation.customerDataRequestDelete;
    expectUserError(deleted, 'INVALID_STATE');
  });

  test('ACCESS and EXPORT processing produce a customer-owned result file', async ({ api }) => {
    for (const type of ['ACCESS', 'EXPORT']) {
      const customer = await createCustomer(api);
      const created = await createDataRequest(api, customer.id, type);
      const result = await terminal(api, created.dataRequest.id);
      expect(result.status).toBe('COMPLETED');
      expect(result.resultFileId).toEqual(expect.any(String));
      expect(result.resultFile?.id).toBe(result.resultFileId);
    }
  });

  test('CORRECTION processing applies only authorized requested changes', async ({ api }) => {
    const customer = await createCustomer(api, { firstName: 'Before', companyName: 'Stable' });
    const created = await createDataRequest(api, customer.id, 'CORRECTION', {
      requestMetadata: { correctionDetails: { firstName: 'After' } },
    });
    const result = await terminal(api, created.dataRequest.id);
    expect(result.status).toBe('COMPLETED');
    expect(await getCustomer(api, customer.id)).toMatchObject({
      firstName: 'After',
      companyName: 'Stable',
      revision: customer.revision + 1,
    });
  });

  test('ERASURE processing redacts PII while preserving required audit facts', async ({ api }) => {
    const customer = await createCustomer(api, {
      email: 'erase@playwright.dev',
      firstName: 'Erase',
      note: 'PII',
    });
    const created = await createDataRequest(api, customer.id, 'ERASURE');
    const result = await terminal(api, created.dataRequest.id);
    expect(result.status).toBe('COMPLETED');
    const redacted = await getCustomer(api, customer.id);
    expect(redacted).toMatchObject({
      lifecycleStatus: 'REDACTED',
      email: null,
      firstName: null,
      note: null,
      redactedAt: expect.any(String),
    });
    expect(result.requestedAt).toEqual(expect.any(String));
  });

  test('unsupported correction fields are rejected with a safe reason', async ({ api }) => {
    const customer = await createCustomer(api);
    const created = await createDataRequest(api, customer.id, 'CORRECTION', {
      requestMetadata: { correctionDetails: { unsupportedField: 'x' } },
    });
    const result = await terminal(api, created.dataRequest.id);
    expect(result.status).toBe('REJECTED');
    expect(result.rejectionReason).toEqual(expect.any(String));
    expect(result.rejectionReason).toContain('Unsupported correction fields');
    expect(result.rejectionReason).not.toMatch(/password|token|secret|stack|postgres/iu);
  });

  test('terminal data request reads preserve status file and completion timestamp', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const created = await createDataRequest(api, customer.id, 'ACCESS');
    const first = await terminal(api, created.dataRequest.id);
    const second = await request(api, created.dataRequest.id);
    expect(second).toMatchObject({
      status: first.status,
      resultFileId: first.resultFileId,
      finishedAt: first.finishedAt,
    });
  });

  test('data request direct query and ID-filtered list return the same request', async ({
    api,
  }) => {
    const created = await createDataRequest(api, (await createCustomer(api)).id, 'ACCESS');
    expect((await request(api, created.dataRequest.id)).id).toBe(created.dataRequest.id);
    const list = (
      await api.admin.query<any>('customers-admin-api/CustomerDataRequests', {
        variables: {
          first: 1,
          where: { id: { _eq: created.dataRequest.id } },
          orderBy: [{ field: 'requestedAt', direction: 'desc' }],
        },
      })
    ).data.customersQuery.customerDataRequests;
    expectRelayConnection(list, 1);
  });

  test('result file from another store cannot be attached or resolved', async ({ api }) => {
    const created = await createDataRequest(api, (await createCustomer(api)).id, 'ACCESS');
    const result = await terminal(api, created.dataRequest.id);
    await api.session.setupProject();
    expect(await request(api, created.dataRequest.id)).toBeNull();
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/storeId|store_id/iu);
  });

  test('missing malformed foreign-customer and cross-store request operations are safe', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    expectUserError(await createDataRequest(api, missingId()), 'NOT_FOUND');
    for (const id of [missingId('CustomerDataRequest'), 'malformed', wrongTypeId()])
      expect(await request(api, id)).toBeNull();
    const created = await createDataRequest(api, customer.id);
    await api.session.setupProject();
    expect(await request(api, created.dataRequest.id)).toBeNull();
    expect(
      (await update(api, created.dataRequest.id, { legalBasis: 'No' })).userErrors.length,
    ).toBeGreaterThan(0);
  });
});
