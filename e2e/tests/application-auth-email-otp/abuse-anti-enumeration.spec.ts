import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  applicationIdentityCount,
  applicationOAuthTokenCounts,
  applicationSessionCount,
  beginEmailOtpAuthorization,
  clearSeedApplicationSessions,
  createAdditionalStorefrontEmailOtpRealm,
  createStorefrontEmailOtpRealm,
  customerCount,
  replayEmailOtpAuthorization,
  seedExistingCustomerWithPassword,
  setCustomerAuthMethods,
  submitEmailOtpExpectRejected,
  waitForApplicationCustomer,
  waitForCustomerProjection,
  type StorefrontEmailOtpRealm,
} from './application-auth-email-otp-test-kit';
import {
  endpoint,
  jsonHeaders,
} from '../application-auth-password/application-auth-test-kit';

test.describe('Application email OTP auth — abuse and anti-enumeration', () => {
  test('OTP requests use the same public response for known and unknown emails', async ({
    api,
    request,
  }) => {
    test.setTimeout(180_000);
    const knownRealm = await createStorefrontEmailOtpRealm(api);
    const passwordRevision = await setCustomerAuthMethods(
      api,
      request,
      knownRealm.revision,
      ['PASSWORD'],
    );
    const knownEmail = uniqueEmail('known');
    const identity = await seedExistingCustomerWithPassword(
      request,
      knownRealm,
      knownEmail,
    );
    await clearSeedApplicationSessions(knownRealm, identity.id);
    await setCustomerAuthMethods(api, request, passwordRevision, ['EMAIL_OTP']);

    const unknownRealm = await createAdditionalStorefrontEmailOtpRealm(api);
    await setCustomerAuthMethods(api, request, unknownRealm.revision, [
      'EMAIL_OTP',
    ]);
    const [known, unknown] = await Promise.all([
      sendEmailOtp(request, knownRealm, knownEmail),
      sendEmailOtp(request, unknownRealm, uniqueEmail('unknown')),
    ]);

    expect(known.status()).toBe(202);
    expect(unknown.status()).toBe(202);
    expect(await known.json()).toEqual(await unknown.json());
  });

  test('OTP request cooldown is scoped to the application and normalized identity', async ({
    api,
    request,
  }) => {
    test.setTimeout(180_000);
    const realmA = await createStorefrontEmailOtpRealm(api);
    await setCustomerAuthMethods(api, request, realmA.revision, ['EMAIL_OTP']);
    const realmB = await createAdditionalStorefrontEmailOtpRealm(api);
    await setCustomerAuthMethods(api, request, realmB.revision, ['EMAIL_OTP']);
    const email = uniqueEmail('normalized-cooldown');

    const first = await sendEmailOtp(request, realmA, email);
    const normalizedReplay = await sendEmailOtp(
      request,
      realmA,
      email.toUpperCase(),
    );
    const foreignRealm = await sendEmailOtp(request, realmB, email);

    expect(first.status()).toBe(202);
    expect(normalizedReplay.status()).toBe(429);
    expect(Number(normalizedReplay.headers()['retry-after'])).toBeGreaterThan(0);
    expect(foreignRealm.status()).toBe(202);
  });

  test('OTP request identity and IP limits are enforced', async ({
    api,
    request,
  }) => {
    test.setTimeout(180_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    await setCustomerAuthMethods(api, request, realm.revision, ['EMAIL_OTP']);

    const first = await sendEmailOtp(request, realm, uniqueEmail('ip-first'));
    const limited = await sendEmailOtp(
      request,
      realm,
      uniqueEmail('ip-second'),
    );

    expect(first.status()).toBe(202);
    expect(limited.status()).toBe(429);
    expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
    expect(await limited.json()).toEqual({
      error: 'slow_down',
      error_description: 'Authentication request rate limit exceeded',
    });
  });

  test('OTP verification attempt limits invalidate the challenge', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    await setCustomerAuthMethods(api, request, realm.revision, ['EMAIL_OTP']);
    const email = uniqueEmail('verify-limit');
    const attempt = await beginEmailOtpAuthorization(page, realm, email);
    const sessionsBefore = await applicationSessionCount(realm);

    for (const invalidOtp of ['000000', '111111', '222222']) {
      await submitEmailOtpExpectRejected(
        page,
        realm,
        email,
        invalidOtp === attempt.otp ? '999999' : invalidOtp,
      );
    }
    await submitEmailOtpExpectRejected(page, realm, email, attempt.otp);

    expect(await applicationIdentityCount(realm, email)).toBe(0);
    expect(await customerCount(realm, email)).toBe(0);
    expect(await applicationSessionCount(realm)).toBe(sessionsBefore);
    expect(await applicationOAuthTokenCounts(realm)).toEqual({
      accessTokens: 0,
      refreshTokens: 0,
    });
  });

  test('parallel verification accepts a valid OTP at most once', async ({
    api,
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    const realm = await createStorefrontEmailOtpRealm(api);
    await setCustomerAuthMethods(api, request, realm.revision, ['EMAIL_OTP']);
    const email = uniqueEmail('parallel');
    const attempt = await beginEmailOtpAuthorization(page, realm, email);

    const responses = await Promise.all([
      replayEmailOtpAuthorization(request, realm, email, attempt),
      replayEmailOtpAuthorization(request, realm, email, attempt),
    ]);
    expect(responses.map((response) => response.status()).sort()).toEqual([
      302,
      400,
    ]);

    const identity = await waitForApplicationCustomer(realm, email);
    await waitForCustomerProjection(realm, identity.id);
    expect(await applicationIdentityCount(realm, email)).toBe(1);
    expect(await customerCount(realm, email)).toBe(1);
    expect(await applicationSessionCount(realm)).toBe(1);
  });
});

function sendEmailOtp(
  request: APIRequestContext,
  realm: StorefrontEmailOtpRealm,
  email: string,
): Promise<APIResponse> {
  return request.post(endpoint(realm, '/email-otp/send-verification-otp'), {
    headers: jsonHeaders(realm.origin),
    data: { email, type: 'sign-in' },
  });
}

function uniqueEmail(label: string): string {
  return `otp-${label}-${crypto.randomUUID()}@playwright.dev`;
}
