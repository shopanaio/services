import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  applicationIdentityCount,
  applicationIssuer,
  applicationSessionCount,
  beginEmailOtpAuthorization,
  blockApplicationUser,
  clearSeedApplicationSessions,
  completeEmailOtpAuthorization,
  createAdditionalStorefrontEmailOtpRealm,
  createStorefrontEmailOtpRealm,
  customerCount,
  decodeJwtPayload,
  replayEmailOtpAuthorization,
  selectStorefrontRealm,
  seedExistingCustomerWithPassword,
  setCustomerAuthMethods,
  submitEmailOtpExpectRejected,
  submitEmailOtpForCallback,
  waitForCustomerProjection,
} from './application-auth-email-otp-test-kit';

test.describe('Application email OTP auth UI — customer sign in', () => {
  test('an existing customer signs in through the hosted OAuth UI and Mailpit OTP', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(210_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    const foreignRealm = await createAdditionalStorefrontEmailOtpRealm(api);
    expect(foreignRealm.applicationId).not.toBe(realm.applicationId);
    expect(foreignRealm.organizationId).toBe(realm.organizationId);
    await setCustomerAuthMethods(api, request, foreignRealm.revision, [
      'EMAIL_OTP',
    ]);
    selectStorefrontRealm(api, realm);
    const passwordRevision = await setCustomerAuthMethods(
      api,
      request,
      realm.revision,
      ['PASSWORD'],
    );
    const email = `otp-signin-${crypto.randomUUID()}@playwright.dev`;
    const identity = await seedExistingCustomerWithPassword(
      request,
      realm,
      email,
    );
    const existingCustomer = await waitForCustomerProjection(
      realm,
      identity.id,
    );
    await clearSeedApplicationSessions(realm, identity.id);
    const foreignSessionsBeforeOtp =
      await applicationSessionCount(foreignRealm);
    await setCustomerAuthMethods(api, request, passwordRevision, ['EMAIL_OTP']);
    const sessionsBeforeOtp = await applicationSessionCount(realm);

    const tokens = await completeEmailOtpAuthorization(
      page,
      request,
      realm,
      email,
    );

    const customerAfterOtp = await waitForCustomerProjection(
      realm,
      identity.id,
    );
    expect(customerAfterOtp.id).toBe(existingCustomer.id);
    expect(customerAfterOtp.iamPrincipalId).toBe(identity.id);
    expect(await customerCount(realm, email)).toBe(1);
    expect(await applicationSessionCount(realm)).toBeGreaterThan(
      sessionsBeforeOtp,
    );
    expect(await applicationIdentityCount(foreignRealm, email)).toBe(0);
    expect(await customerCount(foreignRealm, email)).toBe(0);
    expect(await applicationSessionCount(foreignRealm)).toBe(
      foreignSessionsBeforeOtp,
    );
    expect(decodeJwtPayload(tokens.id_token)).toMatchObject({
      sub: identity.id,
      email,
      iss: applicationIssuer(realm),
      aud: realm.clientId,
    });
    expect(decodeJwtPayload(tokens.access_token)).toMatchObject({
      sub: identity.id,
      application_id: realm.applicationId,
      actor_type: 'application_user',
      client_id: realm.clientId,
      aud: realm.resource,
    });
    expect(tokens.refresh_token).toBeTruthy();
  });

  test('an invalid OTP creates no session or token', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(210_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    const passwordRevision = await setCustomerAuthMethods(
      api,
      request,
      realm.revision,
      ['PASSWORD'],
    );
    const email = `otp-invalid-${crypto.randomUUID()}@playwright.dev`;
    const identity = await seedExistingCustomerWithPassword(
      request,
      realm,
      email,
    );
    await waitForCustomerProjection(realm, identity.id);
    await clearSeedApplicationSessions(realm, identity.id);
    await setCustomerAuthMethods(api, request, passwordRevision, ['EMAIL_OTP']);
    const sessionsBeforeOtp = await applicationSessionCount(realm);
    const attempt = await beginEmailOtpAuthorization(page, realm, email);
    const invalidOtp = attempt.otp === '000000' ? '111111' : '000000';

    await submitEmailOtpExpectRejected(page, realm, email, invalidOtp);

    expect(await applicationIdentityCount(realm, email)).toBe(1);
    expect(await customerCount(realm, email)).toBe(1);
    expect(await applicationSessionCount(realm)).toBe(sessionsBeforeOtp);
  });

  test('a consumed OTP cannot be replayed', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(210_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    const passwordRevision = await setCustomerAuthMethods(
      api,
      request,
      realm.revision,
      ['PASSWORD'],
    );
    const email = `otp-signin-replay-${crypto.randomUUID()}@playwright.dev`;
    const identity = await seedExistingCustomerWithPassword(
      request,
      realm,
      email,
    );
    await waitForCustomerProjection(realm, identity.id);
    await clearSeedApplicationSessions(realm, identity.id);
    await setCustomerAuthMethods(api, request, passwordRevision, ['EMAIL_OTP']);
    const sessionsBeforeOtp = await applicationSessionCount(realm);
    const attempt = await beginEmailOtpAuthorization(page, realm, email);

    await submitEmailOtpForCallback(page, realm, email, attempt.otp);
    const sessionsAfterFirstUse = await applicationSessionCount(realm);
    expect(sessionsAfterFirstUse).toBeGreaterThan(sessionsBeforeOtp);
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

  test('a blocked user cannot create a new session with a valid OTP', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(210_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    const passwordRevision = await setCustomerAuthMethods(
      api,
      request,
      realm.revision,
      ['PASSWORD'],
    );
    const email = `otp-blocked-${crypto.randomUUID()}@playwright.dev`;
    const identity = await seedExistingCustomerWithPassword(
      request,
      realm,
      email,
    );
    await waitForCustomerProjection(realm, identity.id);
    await clearSeedApplicationSessions(realm, identity.id);
    await setCustomerAuthMethods(api, request, passwordRevision, ['EMAIL_OTP']);
    const attempt = await beginEmailOtpAuthorization(page, realm, email);
    await blockApplicationUser(realm, identity.id);
    const sessionsBeforeOtp = await applicationSessionCount(realm);

    await submitEmailOtpExpectRejected(page, realm, email, attempt.otp);

    expect(await applicationIdentityCount(realm, email)).toBe(1);
    expect(await customerCount(realm, email)).toBe(1);
    expect(await applicationSessionCount(realm)).toBe(sessionsBeforeOtp);
  });
});
