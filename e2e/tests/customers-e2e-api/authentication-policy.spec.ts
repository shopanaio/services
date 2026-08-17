import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createCustomer, getCustomer } from '../customers-admin-api/helpers';
import {
  completeEmailOtpThroughHostedUi,
  createStorefrontEmailOtpRealm,
  openOAuthTestApplication,
  setCustomerAuthMethods,
} from '../application-auth-email-otp/application-auth-email-otp-test-kit';
import {
  endpoint,
  jsonHeaders,
  signIn,
} from '../application-auth-password/application-auth-test-kit';
import { CustomersE2ETestKit } from './customers-e2e-test-kit';

test.describe('Customers E2E API — authentication policy', () => {
  let kit: CustomersE2ETestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersE2ETestKit(api, request);
    await kit.setup({ customer: false });
  });
  test.afterEach(async () => kit.close());

  test('admin enabling password authentication allows storefront enrollment and sign-in', async () => {
    expect((await kit.adminAccountSettingsUpdate(['PASSWORD'])).userErrors).toEqual([]);
    const email = `password-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    await kit.enrollAdminCustomer(guest, email);
    expect((await signIn(kit.request, kit.realm, email)).ok()).toBe(true);
    expect(await kit.storefrontCustomerOrNull()).toEqual(expect.objectContaining({ id: guest.id }));
  });

  test('admin disabling password authentication rejects storefront password enrollment', async () => {
    expect((await kit.adminAccountSettingsUpdate([])).userErrors).toEqual([]);
    const email = `closed-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    const signup = await kit.signUpWithPassword(email);
    expect(signup.ok()).toBe(false);
    expect(await kit.adminCustomer(guest.id)).toEqual(
      expect.objectContaining({ accountStatus: 'GUEST', iamPrincipalId: null }),
    );
  });

  test('admin disabling password authentication rejects new storefront password sign-ins', async () => {
    expect((await kit.adminAccountSettingsUpdate(['PASSWORD'])).userErrors).toEqual([]);
    const email = `disabled-signin-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    await kit.enrollAdminCustomer(guest, email);
    expect((await kit.adminAccountSettingsUpdate([])).userErrors).toEqual([]);
    const signin = await signIn(kit.request, kit.realm, email);
    expect(signin.ok()).toBe(false);
    expect(await kit.adminCustomer(guest.id)).toEqual(
      expect.objectContaining({
        accountStatus: 'REGISTERED',
        iamPrincipalId: kit.customer.iamPrincipalId,
      }),
    );
  });

  test('admin enabling email OTP allows the existing customer to sign in through storefront', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(210_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    const email = `otp-policy-${crypto.randomUUID()}@playwright.dev`;
    const guest = await createCustomer(api, { email });
    await setCustomerAuthMethods(api, request, realm.revision, ['EMAIL_OTP']);
    await openOAuthTestApplication(page, realm);
    await page.locator('[data-testid="login-button"]').click();
    await completeEmailOtpThroughHostedUi(page, realm, email);
    await expect
      .poll(async () => (await getCustomer(api, guest.id))?.accountStatus, { timeout: 20_000 })
      .toBe('REGISTERED');
    expect((await getCustomer(api, guest.id)).iamPrincipalId).toEqual(expect.any(String));
  });

  test('admin disabling every authentication method closes customer enrollment', async () => {
    expect((await kit.adminAccountSettingsUpdate([])).userErrors).toEqual([]);
    const email = `no-method-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    expect((await kit.signUpWithPassword(email)).ok()).toBe(false);
    const otp = await kit.request.post(endpoint(kit.realm, '/sign-in/email-otp'), {
      headers: jsonHeaders(kit.realm.origin),
      data: { email, otp: '123456' },
    });
    expect(otp.ok()).toBe(false);
    expect(await kit.adminCustomer(guest.id)).toEqual(
      expect.objectContaining({ accountStatus: 'GUEST', iamPrincipalId: null }),
    );
  });

  test('authentication policy changes apply only to the selected store', async ({
    api,
    request,
  }) => {
    const projectA = api.session.project;
    expect((await kit.adminAccountSettingsUpdate(['PASSWORD'])).userErrors).toEqual([]);
    const storeB = new CustomersE2ETestKit(api, request);
    try {
      await storeB.setup({ customer: false });
      expect((await storeB.adminAccountSettingsUpdate([])).userErrors).toEqual([]);
      const email = `policy-store-${crypto.randomUUID()}@playwright.dev`;
      const guestB = await storeB.adminCreate({ email });
      expect((await storeB.signUpWithPassword(email)).ok()).toBe(false);
      const guestA = await kit.inProject(projectA, () => kit.adminCreate({ email }));
      await kit.enrollAdminCustomer(guestA, email);
      expect(await kit.storefrontCustomerOrNull()).toEqual(
        expect.objectContaining({ id: guestA.id }),
      );
      expect(await storeB.adminCustomer(guestB.id)).toEqual(
        expect.objectContaining({ accountStatus: 'GUEST' }),
      );
    } finally {
      await storeB.close();
      api.session.project = projectA;
    }
  });

  test('stale admin authentication settings update does not alter storefront behavior', async () => {
    const before = await kit.adminAccountSettings();
    expect(
      (await kit.adminAccountSettingsUpdate(['PASSWORD'], before.revision)).userErrors,
    ).toEqual([]);
    const stale = await kit.adminAccountSettingsUpdate(['EMAIL_OTP'], before.revision);
    expect(stale.settings).toBeNull();
    expect(stale.userErrors.length).toBeGreaterThan(0);
    const email = `stale-policy-${crypto.randomUUID()}@playwright.dev`;
    const guest = await kit.adminCreate({ email });
    await kit.enrollAdminCustomer(guest, email);
    expect(await kit.storefrontCustomerOrNull()).toEqual(expect.objectContaining({ id: guest.id }));
  });
});
