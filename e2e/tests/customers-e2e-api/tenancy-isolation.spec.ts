/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { getCustomer } from '../customers-admin-api/helpers';
import {
  USER_ERROR_FIELDS,
  uniqueKey,
} from '../customers-storefront-api/customers-storefront-test-kit';
import { CustomersE2ETestKit } from './customers-e2e-test-kit';

test.describe('Customers E2E API — tenancy isolation', () => {
  let storeA: CustomersE2ETestKit;
  let storeB: CustomersE2ETestKit;
  let projectA: any;
  let projectB: any;
  let customerA: any;
  let customerB: any;
  let email: string;

  test.beforeEach(async ({ api, request }) => {
    email = `tenant-${crypto.randomUUID()}@playwright.dev`;
    storeA = new CustomersE2ETestKit(api, request);
    await storeA.setup({ customer: false });
    expect((await storeA.adminAccountSettingsUpdate(['PASSWORD'])).userErrors).toEqual([]);
    projectA = api.session.project;
    customerA = await storeA.adminCreate({ email, firstName: 'Store A' });
    await storeA.enrollAdminCustomer(customerA, email);

    storeB = new CustomersE2ETestKit(api, request);
    await storeB.setup({ customer: false });
    expect((await storeB.adminAccountSettingsUpdate(['PASSWORD'])).userErrors).toEqual([]);
    projectB = api.session.project;
    customerB = await storeB.adminCreate({ email, firstName: 'Store B' });
  });

  test.afterEach(async ({ api }) => {
    await Promise.all([storeA.close(), storeB.close()]);
    api.session.project = projectA;
  });

  test('an admin-created customer can enroll only in the matching store application', async () => {
    expect(await storeA.storefrontCustomerOrNull()).toEqual(
      expect.objectContaining({ id: customerA.id }),
    );
    const a = await storeA.inProject(projectA, () => storeA.adminCustomer(customerA.id));
    const b = await storeB.inProject(projectB, () => storeB.adminCustomer(customerB.id));
    expect(a).toEqual(
      expect.objectContaining({ accountStatus: 'REGISTERED', iamPrincipalId: expect.any(String) }),
    );
    expect(b).toEqual(expect.objectContaining({ accountStatus: 'GUEST', iamPrincipalId: null }));
  });

  test('storefront token from one store cannot resolve an admin customer from another store', async () => {
    const response = await storeB.customerQuery<{ id: string; firstName: string }>(
      'id firstName',
      undefined,
      '',
      { accessToken: storeA.accessToken },
    );
    expect(response.data ?? null).toBeNull();
    expect(response.errors?.[0]?.extensions?.code).toBe('STOREFRONT_CUSTOMER_INVALID');
    expect(JSON.stringify(response)).not.toContain('Store A');
  });

  test('global IDs cannot bridge admin and storefront store boundaries', async () => {
    const owned = await storeA.inProject(projectA, async () => {
      const payload = await storeA.adminUpdate({
        addresses: { create: [{ address1: 'A secret', city: 'Kyiv', countryCode: 'UA' }] },
        taxIdentifiers: { create: [{ identifierType: 'VAT', value: 'A-TAX' }] },
      });
      const dataRequest = await storeA.seedDataRequest();
      return {
        addressId: payload.customer.addresses.edges[0].node.id,
        dataRequestId: dataRequest.globalId,
      };
    });
    expect(
      await storeB.inProject(projectB, () => getCustomer(storeB.api, customerA.id)),
    ).toBeNull();
    await storeB.enrollAdminCustomer(customerB, email);
    const foreign = await storeB.customerQuery<any>(
      'address(id: $addressId) { id } dataRequest(id: $dataRequestId) { id }',
      owned,
      '$addressId: ID!, $dataRequestId: ID!',
    );
    expect(foreign.data?.customer).toEqual({ address: null, dataRequest: null });
  });

  test('cross-store admin lifecycle changes do not affect storefront access', async () => {
    const disabledB = await storeB.inProject(projectB, () =>
      storeB.adminUpdate(
        { status: { status: 'BLOCKED', blockedReason: 'Store B only' } },
        customerB,
      ),
    );
    expect(disabledB.userErrors).toEqual([]);
    expect(await storeA.storefrontCustomerOrNull()).toEqual(
      expect.objectContaining({ id: customerA.id }),
    );
    expect(await storeA.inProject(projectA, () => storeA.adminCustomer(customerA.id))).toEqual(
      expect.objectContaining({ lifecycleStatus: 'ACTIVE' }),
    );
  });

  test('same-email customers keep profiles addresses consents and tax data isolated', async () => {
    const a = await storeA.inProject(projectA, () =>
      storeA.adminUpdate({
        profile: { firstName: 'Only A' },
        addresses: { create: [{ address1: 'Address A', city: 'Kyiv', countryCode: 'UA' }] },
        consents: { set: [{ channel: 'EMAIL', state: 'SUBSCRIBED', contactPoint: email }] },
        taxIdentifiers: { create: [{ identifierType: 'VAT', value: 'TAX-A' }] },
      }),
    );
    expect(a.userErrors).toEqual([]);
    const b = await storeB.inProject(projectB, () =>
      storeB.adminUpdate(
        {
          profile: { firstName: 'Only B' },
          addresses: { create: [{ address1: 'Address B', city: 'Lviv', countryCode: 'UA' }] },
          consents: { set: [{ channel: 'EMAIL', state: 'UNSUBSCRIBED', contactPoint: email }] },
          taxIdentifiers: { create: [{ identifierType: 'VAT', value: 'TAX-B' }] },
        },
        customerB,
      ),
    );
    expect(b.userErrors).toEqual([]);
    const current = await storeA.currentCustomer<any>(
      'firstName addresses(first: 10) { nodes { address1 } } marketingConsents { channel state } taxIdentifiers(first: 10) { nodes { value } }',
    );
    expect(current).toEqual(
      expect.objectContaining({
        firstName: 'Only A',
        addresses: { nodes: [{ address1: 'Address A' }] },
      }),
    );
    expect(JSON.stringify(current)).not.toMatch(/Only B|Address B|TAX-B/);
  });

  test('untrusted store and identity headers cannot retarget a cross-api customer flow', async () => {
    const response = await storeA.customerQuery<{ id: string }>('id', undefined, '', {
      headers: {
        'x-store-name': storeB.realm.storeName,
        'x-organization-id': storeB.realm.organizationId,
        'x-user-id': crypto.randomUUID(),
        'x-customer-id': storeB.headless.rawId(customerB.id),
        'x-shopana-storefront-context': 'forged',
      },
    });
    expect(response.errors).toBeUndefined();
    expect(response.data?.customer?.id).toBe(customerA.id);
    const mutation = await storeA.mutation<any>(
      'customerUpdate',
      'CustomerUpdateInput',
      {
        firstName: 'Still A',
        expectedRevision: await storeA.revision(),
        idempotencyKey: uniqueKey(),
      },
      `customer { id firstName } userErrors { ${USER_ERROR_FIELDS} }`,
      { headers: { 'x-customer-id': storeB.headless.rawId(customerB.id) } },
    );
    expect(mutation.data?.payload).toEqual(
      expect.objectContaining({
        customer: expect.objectContaining({ id: customerA.id }),
        userErrors: [],
      }),
    );
  });
});
