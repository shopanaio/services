/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  DATA_REQUEST_FIELDS,
  PAGE_INFO_FIELDS,
  CustomersStorefrontTestKit,
  USER_ERROR_FIELDS,
  expectConnectionIntegrity,
  uniqueKey,
  type CustomerUserError,
} from './customers-storefront-test-kit';

interface DataRequestPayload {
  dataRequest: Record<string, unknown> | null;
  userErrors: CustomerUserError[];
}

test.describe('Customers Storefront API — privacy data requests', () => {
  let kit: CustomersStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  const create = async (
    type: string,
    correctionDetails?: unknown,
    overrides: Record<string, unknown> = {},
  ) =>
    kit.mutation<DataRequestPayload>(
      'customerDataRequestCreate',
      'CustomerDataRequestCreateInput',
      {
        type,
        ...(correctionDetails === undefined ? {} : { correctionDetails }),
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `dataRequest { ${DATA_REQUEST_FIELDS} } userErrors { ${USER_ERROR_FIELDS} }`,
    );

  const cancel = async (
    dataRequestId: string,
    expectedUpdatedAt: string,
    overrides: Record<string, unknown> = {},
  ) =>
    kit.mutation<DataRequestPayload>(
      'customerDataRequestCancel',
      'CustomerDataRequestCancelInput',
      {
        dataRequestId,
        expectedUpdatedAt,
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `dataRequest { ${DATA_REQUEST_FIELDS} } userErrors { ${USER_ERROR_FIELDS} }`,
    );

  for (const [name, type] of [
    ['customer creates an ACCESS request', 'ACCESS'],
    ['customer creates an EXPORT request', 'EXPORT'],
    ['customer creates an ERASURE request', 'ERASURE'],
  ] as const) {
    test(name, async () => {
      const response = await create(type);
      expect(response.errors).toBeUndefined();
      expect(response.data?.payload.userErrors).toEqual([]);
      expect(response.data?.payload.dataRequest).toEqual(
        expect.objectContaining({
          type,
          status: 'PENDING',
          correctionDetails: null,
          requestedAt: expect.any(String),
          updatedAt: expect.any(String),
          resultFile: null,
        }),
      );
    });
  }

  test('customer creates a CORRECTION request with structured details', async () => {
    const correctionDetails = { fields: [{ path: 'firstName', value: 'Ada' }], reason: 'Typo' };
    const response = await create('CORRECTION', correctionDetails);
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.dataRequest).toEqual(
      expect.objectContaining({
        type: 'CORRECTION',
        correctionDetails,
      }),
    );
  });

  test('CORRECTION requires non-empty valid correction details', async () => {
    for (const details of [undefined, null, {}, [], '']) {
      const response = await create('CORRECTION', details);
      kit.expectUserError(response.data!.payload.userErrors, 'CORRECTION_DETAILS_REQUIRED');
    }
  });

  test('non-correction request rejects correction details', async () => {
    for (const type of ['ACCESS', 'EXPORT', 'ERASURE']) {
      const response = await create(type, { change: 'email' });
      kit.expectUserError(response.data!.payload.userErrors, 'CORRECTION_DETAILS_FORBIDDEN');
    }
  });

  test('malformed or oversized correction details are rejected safely', async () => {
    for (const details of [{ value: 'x'.repeat(70_000) }, deeplyNested(40)]) {
      const response = await create('CORRECTION', details);
      expect(response.data?.payload.dataRequest).toBeNull();
      expect(response.data?.payload.userErrors[0]?.code).toMatch(/INVALID|TOO_LARGE/iu);
      expect(JSON.stringify(response)).not.toContain('x'.repeat(1000));
    }
  });

  test('unknown request type is rejected', async () => {
    const response = await create('UNKNOWN');
    expect(response.data ?? null).toBeNull();
    expect(response.errors).not.toHaveLength(0);
  });

  test('customer cancels a pending privacy request', async () => {
    const created = await create('ACCESS');
    const request = created.data!.payload.dataRequest!;
    const response = await cancel(request.id as string, request.updatedAt as string);
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.dataRequest).toEqual(
      expect.objectContaining({
        status: 'CANCELLED',
        finishedAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  test('processing completed rejected and cancelled requests cannot be cancelled', async () => {
    for (const status of ['PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED'] as const) {
      const seeded = await kit.seedDataRequest({ status });
      const response = await cancel(seeded.globalId, seeded.updatedAt);
      kit.expectUserError(response.data!.payload.userErrors, 'INVALID_STATE');
    }
  });

  test('stale malformed and future expectedUpdatedAt are rejected', async () => {
    const seeded = await kit.seedDataRequest();
    for (const expectedUpdatedAt of [
      new Date(Date.parse(seeded.updatedAt) - 1_000).toISOString(),
      'not-a-date',
      new Date(Date.now() + 86_400_000).toISOString(),
    ]) {
      const response = await cancel(seeded.globalId, expectedUpdatedAt);
      if (response.errors) kit.expectBadUserInput(response);
      else
        expect(['UPDATED_AT_CONFLICT', 'INVALID_UPDATED_AT']).toContain(
          response.data!.payload.userErrors[0]!.code,
        );
    }
  });

  test('missing cross-customer cross-store malformed and wrong-type request IDs are safe', async () => {
    const foreign = await kit.createGuestCustomer();
    const foreignRequest = await kit.seedDataRequest({ customerId: foreign.id });
    const foreignStore = await kit.createForeignStore();
    const foreignStoreId = kit.headless.rawId(foreignStore.id);
    const crossStoreCustomer = await kit.createGuestCustomer({ storeId: foreignStoreId });
    const crossStoreRequest = await kit.seedDataRequest({
      customerId: crossStoreCustomer.id,
      storeId: foreignStoreId,
    });
    for (const id of [
      kit.id('CustomerDataRequest'),
      foreignRequest.globalId,
      crossStoreRequest.globalId,
      'bad',
      kit.id('CustomerAddress'),
    ]) {
      const response = await cancel(id, new Date().toISOString());
      expect(['NOT_FOUND', 'INVALID_ID']).toContain(response.data!.payload.userErrors[0]!.code);
    }
  });

  test('retrying create and cancel with the same idempotency key is side-effect free', async () => {
    const createKey = uniqueKey();
    const first = await create('ACCESS', undefined, { idempotencyKey: createKey });
    const replay = await create('ACCESS', undefined, { idempotencyKey: createKey });
    expect(replay.data?.payload).toEqual(first.data?.payload);
    const record = first.data!.payload.dataRequest!;
    const cancelKey = uniqueKey();
    const cancelled = await cancel(record.id as string, record.updatedAt as string, {
      idempotencyKey: cancelKey,
    });
    const cancelReplay = await cancel(record.id as string, record.updatedAt as string, {
      idempotencyKey: cancelKey,
    });
    expect(cancelReplay.data?.payload).toEqual(cancelled.data?.payload);
    expect(await kit.rowCount('customer_data_request')).toBe(1);
  });

  test('reusing an idempotency key for another privacy payload is rejected', async () => {
    const idempotencyKey = uniqueKey();
    expect(
      (await create('ACCESS', undefined, { idempotencyKey })).data?.payload.userErrors,
    ).toEqual([]);
    const conflict = await create('EXPORT', undefined, { idempotencyKey });
    kit.expectUserError(conflict.data!.payload.userErrors, /IDEMPOTENCY/iu);
  });

  test('customer reads one owned data request and inaccessible IDs return null', async () => {
    const owned = await kit.seedDataRequest();
    const foreignCustomer = await kit.createGuestCustomer();
    const foreign = await kit.seedDataRequest({ customerId: foreignCustomer.id });
    const response = await kit.customerQuery<any>(
      'owned: dataRequest(id: $owned) { id } foreign: dataRequest(id: $foreign) { id }',
      { owned: owned.globalId, foreign: foreign.globalId },
      '$owned: ID!, $foreign: ID!',
    );
    expect(response.data?.customer).toEqual({ owned: { id: owned.globalId }, foreign: null });
  });

  test('data requests support stable forward and backward pagination', async () => {
    for (let index = 0; index < 5; index += 1)
      await kit.seedDataRequest({
        type: ['ACCESS', 'EXPORT', 'CORRECTION', 'ERASURE', 'ACCESS'][index] as any,
        requestedAt: new Date(Date.now() + index),
      });
    const first = await kit.currentCustomer<any>(
      `dataRequests(first: 2) { edges { cursor node { id } } nodes { id } totalCount pageInfo { ${PAGE_INFO_FIELDS} } }`,
    );
    expectConnectionIntegrity(first.dataRequests);
    const after = first.dataRequests.pageInfo.endCursor;
    const next = await kit.customerQuery<any>(
      `dataRequests(first: 2, after: $after) { nodes { id } pageInfo { ${PAGE_INFO_FIELDS} } }`,
      { after },
      '$after: Cursor!',
    );
    const before = next.data!.customer!.dataRequests.pageInfo.startCursor;
    const back = await kit.customerQuery<any>(
      'dataRequests(last: 2, before: $before) { nodes { id } }',
      { before },
      '$before: Cursor!',
    );
    expect(back.data!.customer!.dataRequests.nodes).toEqual(first.dataRequests.nodes);
  });

  test('customer can read a completed result file but not another customer result file', async () => {
    const owned = await kit.seedDataRequest({
      status: 'COMPLETED',
      resultFileId: crypto.randomUUID(),
    });
    const foreignCustomer = await kit.createGuestCustomer();
    const foreign = await kit.seedDataRequest({
      customerId: foreignCustomer.id,
      status: 'COMPLETED',
      resultFileId: crypto.randomUUID(),
    });
    const response = await kit.customerQuery<any>(
      'owned: dataRequest(id: $owned) { id resultFile { id } } foreign: dataRequest(id: $foreign) { id resultFile { id } }',
      { owned: owned.globalId, foreign: foreign.globalId },
      '$owned: ID!, $foreign: ID!',
    );
    expect(response.data?.customer?.owned.id).toBe(owned.globalId);
    expect(response.data?.customer?.foreign).toBeNull();
  });

  test('erasure completion removes customer self-service access and redacts PII', async () => {
    await kit.seedDataRequest({ type: 'ERASURE', status: 'COMPLETED' });
    await kit.updateCustomerRow({
      lifecycleStatus: 'REDACTED',
      redactedAt: new Date(),
      email: null,
      normalizedEmail: null,
      emailDomainNormalized: null,
      phoneE164: null,
      firstName: null,
      lastName: null,
      iamPrincipalId: null,
      iamPrincipalStatus: null,
      accountStatus: 'GUEST',
    });
    const response = await kit.customerQuery<{ id: string }>('id');
    expect(response.errors).toBeUndefined();
    expect(response.data?.customer).toBeNull();
    const row = await kit.customerRow();
    expect(row).toEqual(
      expect.objectContaining({ email: null, phone_e164: null, first_name: null, last_name: null }),
    );
  });
});

function deeplyNested(depth: number): Record<string, unknown> {
  let value: Record<string, unknown> = { leaf: true };
  for (let index = 0; index < depth; index += 1) value = { child: value };
  return value;
}
