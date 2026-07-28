import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import { expectNoEmailOtp } from '@utils/mailpit';
import {
  applicationIssuer,
  applicationIdentityCount,
  applicationSessionIdForUser,
  applicationSessionCount,
  beginEmailOtpAuthorization,
  completeEmailOtpThroughHostedUi,
  completeEmailOtpAuthorization,
  createStorefrontEmailOtpRealm,
  customerCount,
  decodeJwtPayload,
  openOAuthTestApplication,
  replayEmailOtpAuthorization,
  requestEmailOtp,
  setCustomerAuthMethods,
  submitEmailOtpForCallback,
  waitForApplicationCustomer,
  waitForCustomerProjection,
} from './application-auth-email-otp-test-kit';
import { updatePolicy } from '../application-auth-password/application-auth-test-kit';

test.describe('Application email OTP auth UI — customer registration', () => {
  test('a new customer registers through the hosted OAuth UI and Mailpit OTP', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(150_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    await setCustomerAuthMethods(api, request, realm.revision, ['EMAIL_OTP']);
    const email = `otp-signup-${crypto.randomUUID()}@playwright.dev`;
    const sessionsBeforeOtp = await applicationSessionCount(realm);
    await openOAuthTestApplication(page, realm);
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    expect(page.context().pages()).toHaveLength(1);

    await page.locator('[data-testid="login-button"]').click();
    const renderedSession = await completeEmailOtpThroughHostedUi(
      page,
      realm,
      email,
    );

    const identity = await waitForApplicationCustomer(realm, email);
    expect(identity).toMatchObject({
      email,
      emailVerified: true,
    });
    const customer = await waitForCustomerProjection(realm, identity.id);
    expect(customer).toMatchObject({
      iamPrincipalId: identity.id,
      email,
      emailVerified: true,
      accountStatus: 'REGISTERED',
    });
    expect(await customerCount(realm, email)).toBe(1);
    expect(renderedSession.userId).toBe(identity.id);
    expect(renderedSession.idTokenClaims).toMatchObject({
      sub: identity.id,
      email,
      iss: applicationIssuer(realm),
      aud: realm.clientId,
    });
    expect(renderedSession.accessTokenClaims).toMatchObject({
      sub: identity.id,
      application_id: realm.applicationId,
      actor_type: 'application_user',
      client_id: realm.clientId,
      aud: realm.resource,
    });
    expect(await applicationSessionIdForUser(realm, identity.id)).toBe(
      renderedSession.sessionId,
    );
    expect(page.context().pages()).toHaveLength(1);
    expect(await applicationSessionCount(realm)).toBeGreaterThan(
      sessionsBeforeOtp,
    );
  });

  test('signup-disabled realm does not create a user for an unknown email', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(150_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    await setCustomerAuthMethods(api, request, realm.revision, ['EMAIL_OTP']);
    await updatePolicy(realm, {
      registrationMode: 'disabled',
      emailOtpSignInEnabled: true,
      emailOtpSignUpEnabled: false,
    });
    const email = `otp-closed-${crypto.randomUUID()}@playwright.dev`;
    const sessionsBeforeOtp = await applicationSessionCount(realm);
    await requestEmailOtp(page, realm, email);
    await expectNoEmailOtp(email);

    expect(await applicationIdentityCount(realm, email)).toBe(0);
    expect(await customerCount(realm, email)).toBe(0);
    expect(await applicationSessionCount(realm)).toBe(sessionsBeforeOtp);
  });

  test('OTP signup normalizes email before creating the identity', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(150_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    await setCustomerAuthMethods(api, request, realm.revision, ['EMAIL_OTP']);
    const email = `OTP-SIGNUP-${crypto.randomUUID()}@PLAYWRIGHT.DEV`;
    const normalizedEmail = email.toLowerCase();

    const tokens = await completeEmailOtpAuthorization(
      page,
      request,
      realm,
      email,
    );

    const identity = await waitForApplicationCustomer(realm, normalizedEmail);
    expect(identity.email).toBe(normalizedEmail);
    const customer = await waitForCustomerProjection(realm, identity.id);
    expect(customer.email).toBe(normalizedEmail);
    expect(decodeJwtPayload(tokens.id_token).email).toBe(normalizedEmail);
    expect(await applicationIdentityCount(realm, normalizedEmail)).toBe(1);
    expect(await customerCount(realm, normalizedEmail)).toBe(1);
  });

  test('replaying a signup OTP cannot create another user or session', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(150_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    await setCustomerAuthMethods(api, request, realm.revision, ['EMAIL_OTP']);
    const email = `otp-replay-${crypto.randomUUID()}@playwright.dev`;
    const attempt = await beginEmailOtpAuthorization(page, realm, email);

    await submitEmailOtpForCallback(page, realm, email, attempt.otp);
    const identity = await waitForApplicationCustomer(realm, email);
    await waitForCustomerProjection(realm, identity.id);
    const sessionsAfterFirstUse = await applicationSessionCount(realm);

    const replay = await replayEmailOtpAuthorization(
      request,
      realm,
      email,
      attempt,
    );

    expect(replay.status()).toBe(400);
    expect(await applicationIdentityCount(realm, email)).toBe(1);
    expect(await customerCount(realm, email)).toBe(1);
    expect(await applicationSessionCount(realm)).toBe(sessionsAfterFirstUse);
  });
});
