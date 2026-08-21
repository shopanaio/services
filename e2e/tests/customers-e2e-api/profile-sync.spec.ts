/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { uniqueKey } from '../customers-storefront-api/customers-storefront-test-kit';
import { CustomersE2ETestKit, onlyUserError } from './customers-e2e-test-kit';

test.describe('Customers E2E API — profile synchronization', () => {
  let kit: CustomersE2ETestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersE2ETestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('admin profile update is visible in the next storefront customer query', async () => {
    const values = {
      prefix: 'Dr',
      firstName: 'Ada',
      middleName: 'Augusta',
      lastName: 'Lovelace',
      suffix: 'Countess',
      preferredLocale: 'en-GB',
      dateOfBirth: '1990-02-28',
      gender: 'female',
    };
    const payload = await kit.adminUpdate({
      profile: values,
      company: { companyName: 'Analytical Engines', jobTitle: 'Programmer' },
    });
    expect(payload.userErrors).toEqual([]);
    expect(
      await kit.currentCustomer(
        'prefix firstName middleName lastName suffix preferredLocale dateOfBirth gender companyName jobTitle',
      ),
    ).toEqual(
      expect.objectContaining({
        ...values,
        companyName: 'Analytical Engines',
        jobTitle: 'Programmer',
      }),
    );
  });

  test('storefront profile update is visible in the next admin customer query', async () => {
    const before = await kit.revision();
    const response = await kit.storefrontUpdate({
      firstName: 'Grace',
      lastName: 'Hopper',
      companyName: 'US Navy',
      jobTitle: 'Rear admiral',
      
      idempotencyKey: uniqueKey(),
    });
    expect(response.errors).toBeUndefined();
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(await kit.adminCustomer()).toEqual(
      expect.objectContaining({
        firstName: 'Grace',
        lastName: 'Hopper',
        companyName: 'US Navy',
        jobTitle: 'Rear admiral',
        revision: before + 1,
      }),
    );
  });

  test('admin and storefront writes share one optimistic revision sequence', async () => {
    const before = await kit.revision();
    const admin = await kit.adminUpdate({ profile: { firstName: 'Admin wins' } });
    expect(admin.userErrors).toEqual([]);
    const stale = await kit.storefrontUpdate({
      firstName: 'Stale storefront',
      
      idempotencyKey: uniqueKey(),
    });
    onlyUserError(stale.data!.payload, 'REVISION_CONFLICT');
    expect(await kit.currentCustomer('firstName revision')).toEqual({
      firstName: 'Admin wins',
      revision: before + 1,
    });
  });

  test('storefront and admin concurrent updates allow one aggregate revision winner', async () => {
    const customer = await kit.adminCustomer();
    const [admin, storefront] = await Promise.all([
      kit.adminUpdate({ profile: { firstName: 'Admin winner' } }, customer, customer.revision),
      kit.storefrontUpdate({
        firstName: 'Storefront winner',
        
        idempotencyKey: uniqueKey(),
      }),
    ]);
    const outcomes = [admin.userErrors, storefront.data!.payload.userErrors];
    expect(outcomes.filter((errors) => errors.length === 0)).toHaveLength(1);
    expect(outcomes.filter((errors) => errors[0]?.code === 'REVISION_CONFLICT')).toHaveLength(1);
    const final = await kit.currentCustomer<{ firstName: string; revision: number }>(
      'firstName revision',
    );
    expect(['Admin winner', 'Storefront winner']).toContain(final.firstName);
    expect(final.revision).toBe(customer.revision + 1);
  });

  test('admin-only customer fields never appear in storefront schema or responses', async () => {
    const payload = await kit.adminUpdate({
      note: { note: 'private note' },
      moderation: { moderationNote: 'private moderation' },
    });
    expect(payload.userErrors).toEqual([]);
    const schema = await kit.graphql<{ __type: { fields: { name: string }[] } | null }>(
      'query CustomerBoundary { __type(name: "Customer") { fields { name } } }',
    );
    const names = schema.data?.__type?.fields.map(({ name }) => name) ?? [];
    expect(names).not.toEqual(
      expect.arrayContaining([
        'note',
        'moderationNote',
        'blockedReason',
        'iamPrincipalId',
        'source',
        'statistics',
      ]),
    );
    const rejected = await kit.customerQuery(
      'note moderationNote blockedReason iamPrincipalId source statistics',
    );
    expect(rejected.data ?? null).toBeNull();
    expect(rejected.errors).toHaveLength(6);
  });

  test('IAM email verification state is projected consistently to both APIs', async () => {
    const storefront = await kit.currentCustomer<{
      emailAddress: { emailAddress: string; verified: boolean };
    }>('emailAddress { emailAddress verified }');
    const admin = await kit.adminCustomer();
    expect(storefront.emailAddress).toEqual({
      emailAddress: admin.email,
      verified: admin.emailVerified,
    });
  });

  test('storefront identity data does not overwrite newer merchant-managed profile changes', async () => {
    const payload = await kit.adminUpdate({
      profile: { firstName: 'Merchant', lastName: 'Managed' },
    });
    expect(payload.userErrors).toEqual([]);
    kit.accessToken = await kit.issueCustomerAccessToken();
    expect(await kit.currentCustomer('firstName lastName')).toEqual({
      firstName: 'Merchant',
      lastName: 'Managed',
    });
  });
});
