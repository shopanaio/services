/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { CustomersE2ETestKit } from './customers-e2e-test-kit';

test.describe('Customers E2E API — account enrollment', () => {
  let kit: CustomersE2ETestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersE2ETestKit(api, request);
    await kit.setup({ customer: false });
    const policy = await kit.adminAccountSettingsUpdate(['PASSWORD']);
    expect(policy.userErrors).toEqual([]);
  });
  test.afterEach(async () => kit.close());

  test('admin-created guest claims the existing customer during storefront sign-up', async () => {
    const email = `claim-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    await kit.enrollAdminCustomer(guest, email);
    expect(await kit.storefrontCustomerOrNull()).toEqual(expect.objectContaining({ id: guest.id }));
    expect(await kit.adminCustomer(guest.id)).toEqual(
      expect.objectContaining({ accountStatus: 'REGISTERED', iamPrincipalId: expect.any(String) }),
    );
  });

  test('admin-created customer can sign in through storefront after account enrollment', async () => {
    const email = `signin-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    await kit.enrollAdminCustomer(guest, email);
    kit.accessToken = '';
    kit.accessToken = await kit.issueCustomerAccessToken(email);
    expect(await kit.storefrontCustomerOrNull()).toEqual(expect.objectContaining({ id: guest.id }));
  });

  test('claiming an admin-created guest preserves merchant-managed profile data', async () => {
    const email = `profile-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({
      email,
      firstName: 'Merchant',
      lastName: 'Managed',
      companyName: 'Shop',
      note: 'Private',
      moderationNote: 'Admin only',
    });
    await kit.enrollAdminCustomer(guest, email);
    expect(await kit.currentCustomer('firstName lastName companyName')).toEqual({
      firstName: 'Merchant',
      lastName: 'Managed',
      companyName: 'Shop',
    });
    const schema = await kit.graphql<any>(
      'query Boundary { __type(name: "Customer") { fields { name } } }',
    );
    expect(schema.data.__type.fields.map(({ name }: any) => name)).not.toEqual(
      expect.arrayContaining(['note', 'moderationNote']),
    );
    expect(await kit.adminCustomer(guest.id)).toEqual(
      expect.objectContaining({ note: 'Private', moderationNote: 'Admin only' }),
    );
  });

  test('storefront sign-up matches an admin-created guest by normalized email', async () => {
    const local = `Mixed.${crypto.randomUUID().slice(0, 8)}`;
    const guest = await kit.adminCreate({ email: `${local}@PLAYWRIGHT.DEV` });
    await kit.enrollAdminCustomer(guest, `  ${local.toLowerCase()}@playwright.dev  `);
    const rows = await kit.sql<{ id: string; iamPrincipalId: string | null }[]>`
      select id, iam_principal_id as "iamPrincipalId" from customers.customer
      where store_id = ${kit.realm.storeId} and normalized_email = ${`${local.toLowerCase()}@playwright.dev`}
    `;
    expect(rows).toEqual([
      { id: kit.headless.rawId(guest.id), iamPrincipalId: expect.any(String) },
    ]);
  });

  test('an unverified storefront identity cannot claim an admin-created guest', async () => {
    const email = `unverified-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    await kit.sql`update iam.application_auth_configuration set email_verification_required = true where application_id = ${kit.realm.applicationId}`;
    const signup = await kit.signUpWithPassword(email);
    expect(signup.ok(), await signup.text()).toBe(true);
    const unchanged = await kit.adminCustomer(guest.id);
    expect(unchanged).toEqual(
      expect.objectContaining({ accountStatus: 'GUEST', iamPrincipalId: null }),
    );
  });

  test('a storefront identity cannot claim an inactive admin-created customer', async () => {
    const email = `inactive-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    const disabled = await kit.adminUpdate({ status: { status: 'DISABLED' } }, guest);
    expect(disabled.userErrors).toEqual([]);
    const signup = await kit.signUpWithPassword(email);
    expect(signup.ok(), await signup.text()).toBe(true);
    expect(await kit.adminCustomer(guest.id)).toEqual(
      expect.objectContaining({
        lifecycleStatus: 'DISABLED',
        accountStatus: 'GUEST',
        iamPrincipalId: null,
      }),
    );
  });

  test('an email already linked to another principal cannot be claimed again', async () => {
    const email = `linked-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    await kit.enrollAdminCustomer(guest, email);
    const principal = (await kit.adminCustomer(guest.id)).iamPrincipalId;
    const second = await kit.signUpWithPassword(email, { name: 'Second principal' });
    expect(second.ok()).toBe(false);
    expect((await kit.adminCustomer(guest.id)).iamPrincipalId).toBe(principal);
  });

  test('concurrent storefront enrollment claims an admin-created guest exactly once', async () => {
    const email = `race-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    const results = await Promise.all([
      kit.signUpWithPassword(email),
      kit.signUpWithPassword(email),
    ]);
    expect(results.filter((response) => response.ok())).toHaveLength(1);
    await expect
      .poll(async () => (await kit.adminCustomer(guest.id)).iamPrincipalId)
      .not.toBeNull();
    const [count] = await kit.sql<
      { count: number }[]
    >`select count(*)::int as count from customers.customer where store_id = ${kit.realm.storeId} and normalized_email = ${email}`;
    expect(count!.count).toBe(1);
  });
});
