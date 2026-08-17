/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createMerge, deleteCustomer, getCustomer } from '../customers-admin-api/helpers';
import {
  USER_ERROR_FIELDS,
  uniqueKey,
} from '../customers-storefront-api/customers-storefront-test-kit';
import { CustomersE2ETestKit } from './customers-e2e-test-kit';

test.describe('Customers E2E API — lifecycle synchronization', () => {
  let kit: CustomersE2ETestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersE2ETestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  const unavailableMutation = () =>
    kit.mutation<any>(
      'customerUpdate',
      'CustomerUpdateInput',
      {
        firstName: 'Must not write',
        expectedRevision: kit.customer.revision,
        idempotencyKey: uniqueKey(),
      },
      `customer { id } userErrors { ${USER_ERROR_FIELDS} }`,
    );

  test('admin blocking an enrolled customer immediately denies storefront self-service', async () => {
    const blocked = await kit.lifecycle('BLOCKED', 'Fraud review');
    expect(blocked.lifecycleStatus).toBe('BLOCKED');
    expect(await kit.storefrontCustomerOrNull()).toBeNull();
    const mutation = await unavailableMutation();
    kit.expectUserError(mutation.data!.payload.userErrors, 'CUSTOMER_UNAVAILABLE', {
      retryable: false,
    });
    const fresh = await kit.issueCustomerAccessToken();
    expect(await kit.storefrontCustomerOrNull({ accessToken: fresh })).toBeNull();
  });

  test('admin disabling an enrolled customer denies storefront access', async () => {
    expect((await kit.lifecycle('DISABLED')).lifecycleStatus).toBe('DISABLED');
    expect(await kit.storefrontCustomerOrNull()).toBeNull();
    kit.expectUserError(
      (await unavailableMutation()).data!.payload.userErrors,
      'CUSTOMER_UNAVAILABLE',
    );
  });

  test('admin reactivation restores storefront access for the linked principal', async () => {
    await kit.lifecycle('DISABLED');
    expect(await kit.storefrontCustomerOrNull()).toBeNull();
    const active = await kit.lifecycle('ACTIVE');
    expect(active.lifecycleStatus).toBe('ACTIVE');
    kit.accessToken = await kit.issueCustomerAccessToken();
    expect(await kit.storefrontCustomerOrNull()).toEqual(
      expect.objectContaining({ id: kit.customer.id }),
    );
  });

  test('IAM block and unblock are projected to admin lifecycle and storefront access', async () => {
    const input = {
      organizationId: kit.id('Organization', kit.realm.organizationId),
      applicationId: kit.id('Application', kit.realm.applicationId),
      userId: kit.id('ApplicationUser', kit.customer.iamPrincipalId),
    };
    const blocked = await kit.api.admin.mutation<any>(
      'application-admin-api/ApplicationUserBlock',
      { variables: { input } },
    );
    expect(blocked.data.applicationMutation.applicationUserBlock.userErrors).toEqual([]);
    await expect.poll(async () => (await kit.adminCustomer()).lifecycleStatus).toBe('BLOCKED');
    expect(await kit.storefrontCustomerOrNull()).toBeNull();
    const unblocked = await kit.api.admin.mutation<any>(
      'application-admin-api/ApplicationUserUnblock',
      { variables: { input } },
    );
    expect(unblocked.data.applicationMutation.applicationUserUnblock.userErrors).toEqual([]);
    await expect.poll(async () => (await kit.adminCustomer()).lifecycleStatus).toBe('ACTIVE');
    expect(await kit.storefrontCustomerOrNull()).toEqual(
      expect.objectContaining({ id: kit.customer.id }),
    );
  });

  test('admin deletion invalidates storefront access and owned entity reads', async () => {
    const address = await kit.seedAddress();
    const deleted = await deleteCustomer(kit.api, kit.customer.id, await kit.revision());
    expect(deleted.userErrors).toEqual([]);
    expect(await kit.storefrontCustomerOrNull()).toBeNull();
    const query = await kit.customerQuery<any>(
      'address(id: $id) { id }',
      { id: address.globalId },
      '$id: ID!',
    );
    expect(query.data?.customer ?? null).toBeNull();
    expect(await getCustomer(kit.api, kit.customer.id)).toBeNull();
  });

  test('admin merge moves supported data and prevents the source storefront identity from resolving', async () => {
    const source = await kit.adminUpdate({
      addresses: { create: [{ address1: 'Merged', city: 'Kyiv', countryCode: 'UA' }] },
      taxIdentifiers: { create: [{ identifierType: 'VAT', value: 'MERGE' }] },
    });
    expect(source.userErrors).toEqual([]);
    const target = await kit.adminCreate({ firstName: 'Target' });
    const created = await createMerge(kit.api, source.customer.id, target.id, {
      reason: 'Duplicate',
    });
    expect(created.userErrors).toEqual([]);
    await expect
      .poll(async () => (await getCustomer(kit.api, source.customer.id))?.lifecycleStatus, {
        timeout: 20_000,
      })
      .toBe('MERGED');
    const merged = await getCustomer(kit.api, target.id);
    expect(merged.addresses.totalCount).toBe(1);
    expect(merged.taxIdentifiers.totalCount).toBe(1);
    expect(await kit.storefrontCustomerOrNull()).toBeNull();
  });

  test('storefront session cache cannot bypass a newer admin lifecycle restriction', async () => {
    expect(await kit.storefrontCustomerOrNull()).toEqual(
      expect.objectContaining({ id: kit.customer.id }),
    );
    await kit.lifecycle('BLOCKED', 'Immediate restriction');
    const responses = await Promise.all([
      kit.storefrontCustomerOrNull(),
      kit.storefrontCustomerOrNull(),
      kit.storefrontCustomerOrNull(),
    ]);
    expect(responses).toEqual([null, null, null]);
  });
});
