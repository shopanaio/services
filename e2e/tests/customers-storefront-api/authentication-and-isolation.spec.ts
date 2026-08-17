/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  ADDRESS_FIELDS,
  CUSTOMER_SUMMARY_FIELDS,
  CustomersStorefrontTestKit,
  USER_ERROR_FIELDS,
  uniqueKey,
  type CustomerUserError,
} from './customers-storefront-test-kit';

test.describe('Customers Storefront API — authentication and isolation', () => {
  let kit: CustomersStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersStorefrontTestKit(api, request);
    await kit.setup();
  });

  test.afterEach(async () => {
    await kit.close();
  });

  test('storefront channel credential without a customer session returns null customer', async () => {
    const response = await kit.customerQuery<{ id: string }>('id', undefined, '', {
      accessToken: null,
    });
    expect(response.errors).toBeUndefined();
    expect(response.data?.customer).toBeNull();
  });

  test('missing storefront channel credential is rejected before Customers resolution', async () => {
    const response = await kit.customerQuery<{ id: string }>('id', undefined, '', {
      channelToken: null,
    });
    expect(response.data ?? null).toBeNull();
    expect(response.errors?.[0]?.extensions?.code).toBe('STOREFRONT_CREDENTIAL_REQUIRED');
  });

  test('invalid customer bearer token is rejected', async () => {
    const response = await kit.customerQuery<{ id: string }>('id', undefined, '', {
      accessToken: 'not-a-customer-token',
    });
    expect(response.data ?? null).toBeNull();
    expect(response.errors?.[0]?.extensions?.code).toBe('STOREFRONT_CUSTOMER_INVALID');
  });

  test('tokens with expired sessions, revoked tokens and malformed tokens are rejected identically', async () => {
    const expiredSessionToken = await kit.issueCustomerAccessToken();
    const revokedToken = await kit.issueCustomerAccessToken();
    await kit.expireAccessTokenSession(expiredSessionToken);
    await kit.revokeAccessToken(revokedToken);
    const invalidTokens = ['malformed', revokedToken, expiredSessionToken];
    const responses = await Promise.all(
      invalidTokens.map((accessToken) =>
        kit.customerQuery<{ id: string }>('id', undefined, '', { accessToken }),
      ),
    );
    expect(
      responses.map((response) => ({
        data: response.data ?? null,
        code: response.errors?.[0]?.extensions?.code,
        message: response.errors?.[0]?.message,
      })),
    ).toEqual(
      responses.map(() => ({
        data: null,
        code: 'STOREFRONT_CUSTOMER_INVALID',
        message: responses[0]!.errors![0]!.message,
      })),
    );
  });

  test('valid session resolves only its linked active customer', async () => {
    const customer = await kit.currentCustomer<{ id: string; accountStatus: string }>(
      'id accountStatus',
    );
    expect(customer).toEqual({ id: kit.customer.id, accountStatus: 'REGISTERED' });
  });

  test('customer token for store A cannot be used with store B storefront', async ({
    api,
    request,
  }) => {
    const storeB = new CustomersStorefrontTestKit(api, request);
    try {
      await storeB.setup({ reuseSession: true });
      const response = await storeB.customerQuery<{ id: string }>('id', undefined, '', {
        accessToken: kit.accessToken,
      });
      expect(response.data ?? null).toBeNull();
      expect(response.errors?.[0]?.extensions?.code).toBe('STOREFRONT_CUSTOMER_INVALID');
    } finally {
      await storeB.close();
    }
  });

  test('customer A cannot read customer B owned entities by global ID', async () => {
    const foreign = await kit.createGuestCustomer();
    const address = await kit.seedAddress({ customerId: foreign.id });
    const request = await kit.seedDataRequest({ customerId: foreign.id });
    const wishlist = await kit.seedWishlist({ customerId: foreign.id, isDefault: true });
    const response = await kit.customerQuery<{
      address: unknown;
      dataRequest: unknown;
      wishlist: unknown;
    }>(
      `
        address(id: $addressId) { id }
        dataRequest(id: $requestId) { id }
        wishlist(id: $wishlistId) { id }
      `,
      {
        addressId: address.globalId,
        requestId: request.globalId,
        wishlistId: wishlist.globalId,
      },
      '$addressId: ID!, $requestId: ID!, $wishlistId: ID!',
    );
    expect(response.errors).toBeUndefined();
    expect(response.data?.customer).toEqual({
      address: null,
      dataRequest: null,
      wishlist: null,
    });
  });

  test('customer A cannot mutate customer B owned entities by global ID', async () => {
    const foreign = await kit.createGuestCustomer();
    const address = await kit.seedAddress({ customerId: foreign.id });
    const before = await kit.sql`
      select address1, updated_at from customers.customer_address where id = ${address.id}
    `;
    const response = await kit.mutation<{
      customerAddress: unknown;
      userErrors: CustomerUserError[];
    }>(
      'customerAddressUpdate',
      'CustomerAddressUpdateInput',
      {
        addressId: address.globalId,
        address: { address1: 'Forged', city: 'Kyiv', countryCode: 'UA' },
        expectedRevision: await kit.revision(),
        idempotencyKey: uniqueKey(),
      },
      `customerAddress { id } userErrors { ${USER_ERROR_FIELDS} }`,
    );
    expect(response.errors).toBeUndefined();
    expect(response.data?.payload.customerAddress).toBeNull();
    kit.expectUserError(response.data!.payload.userErrors, 'NOT_FOUND');
    expect(
      await kit.sql`
        select address1, updated_at from customers.customer_address where id = ${address.id}
      `,
    ).toEqual(before);
  });

  test('blocked disabled merged and redacted customers cannot use self-service mutations', async () => {
    const target = await kit.createGuestCustomer();
    for (const state of ['BLOCKED', 'DISABLED', 'MERGED', 'REDACTED'] as const) {
      await kit.updateCustomerRow({
        lifecycleStatus: state,
        blockedReason: state === 'BLOCKED' ? 'e2e' : null,
        mergedIntoCustomerId: state === 'MERGED' ? target.id : null,
        redactedAt: state === 'REDACTED' ? new Date() : null,
      });
      const response = await kit.mutation<{
        customer: unknown;
        userErrors: CustomerUserError[];
      }>(
        'customerUpdate',
        'CustomerUpdateInput',
        {
          firstName: 'Unavailable',
          expectedRevision: kit.customer.revision,
          idempotencyKey: uniqueKey(state),
        },
        `customer { id } userErrors { ${USER_ERROR_FIELDS} }`,
      );
      expect(response.errors).toBeUndefined();
      expect(response.data?.payload.customer).toBeNull();
      kit.expectUserError(response.data!.payload.userErrors, 'CUSTOMER_UNAVAILABLE', {
        retryable: false,
      });
    }
  });

  test('blocked disabled merged and redacted customers are not returned by customer query', async () => {
    const target = await kit.createGuestCustomer();
    for (const state of ['BLOCKED', 'DISABLED', 'MERGED', 'REDACTED'] as const) {
      await kit.updateCustomerRow({
        lifecycleStatus: state,
        blockedReason: state === 'BLOCKED' ? 'e2e' : null,
        mergedIntoCustomerId: state === 'MERGED' ? target.id : null,
        redactedAt: state === 'REDACTED' ? new Date() : null,
      });
      const response = await kit.customerQuery<{ id: string }>('id');
      expect(response.errors).toBeUndefined();
      expect(response.data?.customer).toBeNull();
    }
  });

  test('storefront never exposes admin-only PII notes moderation lifecycle IAM or statistics fields', async () => {
    const forbidden = [
      'note',
      'moderationNote',
      'blockedReason',
      'lifecycleStatus',
      'iamPrincipalId',
      'statistics',
      'createdByUserId',
    ];
    const response = await kit.graphql<{
      __type: { fields: { name: string }[] } | null;
    }>(`query CustomerSchemaBoundary { __type(name: "Customer") { fields { name } } }`);
    expect(response.errors).toBeUndefined();
    const fieldNames = response.data?.__type?.fields.map(({ name }) => name) ?? [];
    expect(fieldNames).not.toEqual(expect.arrayContaining(forbidden));

    const invalidOperation = await kit.customerQuery('note moderationNote lifecycleStatus');
    expect(invalidOperation.data ?? null).toBeNull();
    expect(invalidOperation.errors).toHaveLength(3);
  });

  test('untrusted identity and store headers cannot replace gateway signed context', async () => {
    const response = await kit.customerQuery<{ id: string }>('id', undefined, '', {
      headers: {
        'x-store-name': `forged-${crypto.randomUUID()}`,
        'x-organization-id': crypto.randomUUID(),
        'x-user-id': crypto.randomUUID(),
        'x-customer-id': crypto.randomUUID(),
        'x-shopana-storefront-context': 'forged',
      },
    });
    expect(response.errors).toBeUndefined();
    expect(response.data?.customer?.id).toBe(kit.customer.id);
  });

  test('malformed and wrong-type global IDs return safe field errors', async () => {
    for (const id of ['not-base64', kit.id('CustomerTaxIdentifier')]) {
      const response = await kit.customerQuery<{ address: unknown }>(
        `address(id: $id) { ${ADDRESS_FIELDS} }`,
        { id },
        '$id: ID!',
      );
      expect(response.errors).toBeUndefined();
      expect(response.data?.customer?.address).toBeNull();
      expect(JSON.stringify(response)).not.toMatch(/stack|node_modules|postgres|select\s/iu);
    }
  });

  test('all user errors expose stable code field message and retryable values', async () => {
    const currentRevision = await kit.revision();
    const applied = await kit.mutation<{
      customer: unknown;
      userErrors: CustomerUserError[];
    }>(
      'customerUpdate',
      'CustomerUpdateInput',
      {
        firstName: 'Revision advanced',
        expectedRevision: currentRevision,
        idempotencyKey: uniqueKey(),
      },
      `customer { id } userErrors { ${USER_ERROR_FIELDS} }`,
    );
    expect(applied.data?.payload.userErrors).toEqual([]);
    const validation = await kit.mutation<{
      customer: unknown;
      userErrors: CustomerUserError[];
    }>(
      'customerUpdate',
      'CustomerUpdateInput',
      {
        firstName: 'x'.repeat(129),
        expectedRevision: await kit.revision(),
        idempotencyKey: uniqueKey(),
      },
      `customer { ${CUSTOMER_SUMMARY_FIELDS} } userErrors { ${USER_ERROR_FIELDS} }`,
    );
    const conflict = await kit.mutation<{
      customer: unknown;
      userErrors: CustomerUserError[];
    }>(
      'customerUpdate',
      'CustomerUpdateInput',
      {
        firstName: 'Stale',
        expectedRevision: currentRevision,
        idempotencyKey: uniqueKey(),
      },
      `customer { id } userErrors { ${USER_ERROR_FIELDS} }`,
    );
    for (const error of [
      validation.data!.payload.userErrors[0],
      conflict.data!.payload.userErrors[0],
    ]) {
      expect(error).toEqual({
        code: expect.any(String),
        field: expect.anything(),
        message: expect.any(String),
        retryable: expect.any(Boolean),
      });
    }
  });
});
