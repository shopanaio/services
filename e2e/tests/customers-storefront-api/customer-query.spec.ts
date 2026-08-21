import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  ADDRESS_FIELDS,
  CONSENT_FIELDS,
  CUSTOMER_SUMMARY_FIELDS,
  DATA_REQUEST_FIELDS,
  PAGE_INFO_FIELDS,
  TAX_IDENTIFIER_FIELDS,
  WISHLIST_FIELDS,
  CustomersStorefrontTestKit,
  USER_ERROR_FIELDS,
  uniqueKey,
  type CustomerUserError,
} from './customers-storefront-test-kit';

test.describe('Customers Storefront API — customer query', () => {
  let kit: CustomersStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersStorefrontTestKit(api, request);
    await kit.setup();
  });

  test.afterEach(async () => {
    await kit.close();
  });

  test('authenticated customer reads the complete storefront profile', async () => {
    const response = await kit.customerQuery(`
      ${CUSTOMER_SUMMARY_FIELDS}
      defaultShippingAddress { ${ADDRESS_FIELDS} }
      defaultBillingAddress { ${ADDRESS_FIELDS} }
      addresses(first: 10) { nodes { id } totalCount pageInfo { ${PAGE_INFO_FIELDS} } }
      marketingConsents { ${CONSENT_FIELDS} }
      taxIdentifiers(first: 10) { nodes { ${TAX_IDENTIFIER_FIELDS} } totalCount }
      taxExemptions(first: 10) { nodes { id code status } totalCount }
      dataRequests(first: 10) { nodes { ${DATA_REQUEST_FIELDS} } totalCount }
      wishlists(first: 10) { nodes { ${WISHLIST_FIELDS} } totalCount }
      defaultWishlist { ${WISHLIST_FIELDS} }
    `);
    expect(response.errors).toBeUndefined();
    expect(response.data?.customer).toEqual(
      expect.objectContaining({
        id: kit.customer.id,
        revision: expect.any(Number),
        accountStatus: 'REGISTERED',
        displayName: expect.any(String),
        emailAddress: expect.objectContaining({
          emailAddress: kit.customer.email,
          verified: expect.any(Boolean),
        }),
        addresses: expect.objectContaining({ totalCount: 0 }),
        marketingConsents: expect.any(Array),
        taxIdentifiers: expect.objectContaining({ totalCount: 0 }),
        taxExemptions: expect.objectContaining({ totalCount: 0 }),
        dataRequests: expect.objectContaining({ totalCount: 0 }),
        wishlists: expect.objectContaining({ totalCount: 0 }),
      }),
    );
  });

  test('customer session is rejected when its customer link cannot be resolved', async () => {
    await kit.sql`
      update customers.customer
      set iam_principal_id = ${randomUUID()}, iam_principal_status = 'active'
      where id = ${kit.customer.rawId}
    `;
    const response = await kit.customerQuery<{ id: string }>('id');
    expect(response.data ?? null).toBeNull();
    expect(response.errors?.[0]?.extensions?.code).toBe('STOREFRONT_CUSTOMER_INVALID');
  });

  test('customer display name falls back deterministically for partial profiles', async () => {
    const cases = [
      {
        values: { firstName: 'Ada', lastName: 'Lovelace', companyName: 'Analytical' },
        expected: 'Ada Lovelace',
      },
      {
        values: { firstName: null, lastName: null, companyName: 'Analytical Engines' },
        expected: 'Analytical Engines',
      },
      {
        values: { companyName: null },
        expected: kit.customer.email,
      },
    ];
    for (const { values, expected } of cases) {
      await kit.updateCustomerRow(values);
      expect((await kit.currentCustomer<{ displayName: string }>('displayName')).displayName).toBe(
        expected,
      );
    }
  });

  test('email and phone projections preserve IAM verification state', async () => {
    await kit.updateCustomerRow({
      emailVerified: true,
      phoneE164: '+380501234567',
      phoneVerified: false,
    });
    const customer = await kit.currentCustomer<{
      emailAddress: { emailAddress: string; verified: boolean };
      phoneNumber: { phoneNumber: string; verified: boolean };
    }>('emailAddress { emailAddress verified } phoneNumber { phoneNumber verified }');
    expect(customer).toEqual({
      emailAddress: { emailAddress: kit.customer.email, verified: true },
      phoneNumber: { phoneNumber: '+380501234567', verified: false },
    });
    expect(JSON.stringify(customer)).not.toMatch(/password|credential|session|token/iu);
  });

  test('customer query resolves nested fields without cross-customer cache leakage', async () => {
    const owned = await kit.seedAddress({ address1: 'Owned address' });
    const foreignCustomer = await kit.createGuestCustomer();
    const foreign = await kit.seedAddress({
      customerId: foreignCustomer.id,
      address1: 'Foreign secret address',
    });
    const ownedResponse = await kit.customerQuery<{
      address: { id: string; address1: string } | null;
      addresses: { nodes: { id: string; address1: string }[] };
    }>(
      `
        address(id: $id) { id address1 }
        addresses(first: 10) { nodes { id address1 } }
      `,
      { id: owned.globalId },
      '$id: ID!',
    );
    const foreignResponse = await kit.customerQuery<{
      address: { id: string; address1: string } | null;
    }>('address(id: $id) { id address1 }', { id: foreign.globalId }, '$id: ID!');
    expect(ownedResponse.errors).toBeUndefined();
    expect(foreignResponse.errors).toBeUndefined();
    expect(ownedResponse.data?.customer).toEqual({
      address: { id: owned.globalId, address1: 'Owned address' },
      addresses: { nodes: [{ id: owned.globalId, address1: 'Owned address' }] },
    });
    expect(foreignResponse.data?.customer?.address).toBeNull();
  });

  test('recently committed self-service writes are visible in the mutation response and next query', async () => {
    const revision = await kit.revision();
    const response = await kit.mutation<{
      customer: { revision: number; firstName: string } | null;
      userErrors: CustomerUserError[];
    }>(
      'customerUpdate',
      'CustomerUpdateInput',
      {
        firstName: 'ReadYourWrites',
        
        idempotencyKey: uniqueKey(),
      },
      `customer { revision firstName } userErrors { ${USER_ERROR_FIELDS} }`,
    );
    expect(response.errors).toBeUndefined();
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customer).toEqual({
      revision: revision + 1,
      firstName: 'ReadYourWrites',
    });
    expect(await kit.currentCustomer('revision firstName')).toEqual(
      response.data?.payload.customer,
    );
  });
});
