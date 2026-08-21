/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  DATA_REQUEST_FIELDS,
  USER_ERROR_FIELDS,
  uniqueKey,
  type CustomerUserError,
} from '../customers-storefront-api/customers-storefront-test-kit';
import { CustomersE2ETestKit } from './customers-e2e-test-kit';

type RequestPayload = { dataRequest: Record<string, any> | null; userErrors: CustomerUserError[] };

test.describe('Customers E2E API — privacy data request synchronization', () => {
  let kit: CustomersE2ETestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersE2ETestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  const create = (type: string, correctionDetails?: unknown) =>
    kit.mutation<RequestPayload>(
      'customerDataRequestCreate',
      'CustomerDataRequestCreateInput',
      {
        type,
        ...(correctionDetails === undefined ? {} : { correctionDetails }),
        idempotencyKey: uniqueKey(),
      },
      `dataRequest { ${DATA_REQUEST_FIELDS} } userErrors { ${USER_ERROR_FIELDS} }`,
    );
  const adminRequest = async (id: string) => {
    const { data, errors } = await kit.api.admin.query<any>(
      'customers-admin-api/CustomerDataRequest',
      { throwOnError: false, variables: { id } },
    );
    expect(errors ?? []).toHaveLength(0);
    return data?.customersQuery?.customerDataRequest ?? null;
  };
  const terminal = async (id: string) => {
    let value: any;
    await expect
      .poll(
        async () => {
          value = await adminRequest(id);
          return value?.status;
        },
        { timeout: 20_000 },
      )
      .toMatch(/COMPLETED|REJECTED|CANCELLED/);
    return value;
  };

  test('storefront-created privacy request is visible through admin', async () => {
    for (const type of ['ACCESS', 'EXPORT', 'CORRECTION', 'ERASURE']) {
      const details =
        type === 'CORRECTION'
          ? { fields: [{ path: 'firstName', value: 'Ada' }], reason: 'Typo' }
          : undefined;
      const response = await create(type, details);
      expect(response.data?.payload.userErrors).toEqual([]);
      const request = await adminRequest(response.data!.payload.dataRequest!.id);
      expect(request).toEqual(
        expect.objectContaining({
          id: response.data!.payload.dataRequest!.id,
          type,
          customer: { id: kit.customer.id },
        }),
      );
    }
  });

  test('admin processing status is visible through storefront', async () => {
    const response = await create('ACCESS');
    const id = response.data!.payload.dataRequest!.id;
    const result = await terminal(id);
    const customer = await kit.currentCustomer<any>(
      'dataRequests(first: 20) { nodes { id status requestedAt startedAt finishedAt updatedAt } }',
    );
    expect(customer.dataRequests.nodes.find((item: any) => item.id === id)).toEqual(
      expect.objectContaining({
        status: result.status,
        requestedAt: result.requestedAt,
        finishedAt: result.finishedAt,
      }),
    );
  });

  test('admin-produced export result is downloadable by the owning storefront customer', async () => {
    const response = await create('EXPORT');
    const id = response.data!.payload.dataRequest!.id;
    const result = await terminal(id);
    expect(result).toEqual(
      expect.objectContaining({ status: 'COMPLETED', resultFileId: expect.any(String) }),
    );
    const owner = await kit.currentCustomer<any>(
      'dataRequests(first: 10) { nodes { id resultFile { id } } }',
    );
    expect(owner.dataRequests.nodes.find((item: any) => item.id === id).resultFile).toEqual({
      id: result.resultFileId,
    });
    const foreign = await kit.createGuestCustomer();
    const foreignRequest = await kit.seedDataRequest({
      customerId: foreign.id,
      status: 'COMPLETED',
      resultFileId: kit.headless.rawId(result.resultFileId),
    });
    const hidden = await kit.customerQuery<any>(
      'dataRequest(id: $id) { id resultFile { id } }',
      { id: foreignRequest.globalId },
      '$id: ID!',
    );
    expect(hidden.data?.customer?.dataRequest).toBeNull();
  });

  test('storefront cancellation is visible and terminal through admin', async () => {
    const seeded = await kit.seedDataRequest();
    const response = await kit.mutation<RequestPayload>(
      'customerDataRequestCancel',
      'CustomerDataRequestCancelInput',
      {
        dataRequestId: seeded.globalId,
        expectedUpdatedAt: seeded.updatedAt,
        idempotencyKey: uniqueKey(),
      },
      `dataRequest { ${DATA_REQUEST_FIELDS} } userErrors { ${USER_ERROR_FIELDS} }`,
    );
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(await adminRequest(seeded.globalId)).toEqual(
      expect.objectContaining({ status: 'CANCELLED', finishedAt: expect.any(String) }),
    );
    const retry = await kit.api.admin.mutation<any>(
      'customers-admin-api/CustomerDataRequestUpdate',
      { variables: { dataRequestId: seeded.globalId, operations: { legalBasis: 'Too late' } } },
    );
    expect(retry.data.customersMutation.customerDataRequestUpdate.userErrors[0].code).toBe(
      'INVALID_STATE',
    );
  });

  test('admin-completed correction is reflected in the next storefront profile query', async () => {
    await kit.storefrontUpdate({
      firstName: 'Before',
      
      idempotencyKey: uniqueKey(),
    });
    const response = await create('CORRECTION', {
      fields: [{ path: 'firstName', value: 'After' }],
      reason: 'Correct the profile',
    });
    const result = await terminal(response.data!.payload.dataRequest!.id);
    expect(result.status).toBe('COMPLETED');
    expect(await kit.currentCustomer('firstName revision')).toEqual(
      expect.objectContaining({ firstName: 'After' }),
    );
  });

  test('admin-completed erasure revokes storefront access and redacts admin data', async () => {
    const response = await create('ERASURE');
    const result = await terminal(response.data!.payload.dataRequest!.id);
    expect(result.status).toBe('COMPLETED');
    expect(await kit.storefrontCustomerOrNull()).toBeNull();
    expect(await kit.adminCustomer()).toEqual(
      expect.objectContaining({
        lifecycleStatus: 'REDACTED',
        email: null,
        firstName: null,
        redactedAt: expect.any(String),
      }),
    );
  });
});
