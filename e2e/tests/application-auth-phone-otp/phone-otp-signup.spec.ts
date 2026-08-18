import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import { waitForSmsOtp } from '@utils/sms-proxy';
import {
  applicationCookie,
  expectSignUp,
  jsonHeaders,
} from '../application-auth-password/application-auth-test-kit';
import {
  createStorefrontPhoneOtpRealm,
  phoneOtpEndpoint,
  setCustomerAuthMethods,
  waitForApplicationEmailIdentity,
  waitForApplicationPhoneIdentity,
  waitForPhoneCustomerProjection,
} from './application-auth-phone-otp-test-kit';

test.describe('Application phone OTP auth — signup', () => {
  test('registers a customer with an OTP intercepted through the SMS proxy', async ({
    api,
    request,
  }) => {
    test.setTimeout(90_000);
    const realm = await createStorefrontPhoneOtpRealm(api);
    await setCustomerAuthMethods(api, request, realm.revision, ['PHONE_OTP']);
    const phoneNumber = uniquePhoneNumber();

    const requested = await request.post(
      phoneOtpEndpoint(realm, '/phone-number/send-otp'),
      {
        headers: jsonHeaders(),
        data: { phoneNumber },
      },
    );
    expect(requested.status(), await requested.text()).toBe(200);

    const intercepted = await waitForSmsOtp(request, {
      storeId: realm.storeId,
      installationId: realm.smsInstallationId,
      recipient: phoneNumber,
    });
    expect(intercepted.message.storeId).toBe(realm.storeId);
    expect(intercepted.message.to).toBe(phoneNumber);
    expect(intercepted.message.text).toContain(intercepted.otp);

    const verified = await request.post(
      phoneOtpEndpoint(realm, '/phone-number/verify'),
      {
        headers: jsonHeaders(),
        data: { phoneNumber, code: intercepted.otp },
      },
    );
    expect(verified.status(), await verified.text()).toBe(200);
    const verification = (await verified.json()) as {
      status: boolean;
      token: string | null;
      user: {
        id: string;
        phoneNumber: string;
        phoneNumberVerified: boolean;
      };
    };
    expect(verification).toMatchObject({
      status: true,
      token: expect.any(String),
      user: {
        phoneNumber,
        phoneNumberVerified: true,
      },
    });

    const identity = await waitForApplicationPhoneIdentity(realm, phoneNumber);
    expect(identity).toMatchObject({
      id: verification.user.id,
      phoneNumber,
      phoneNumberVerified: true,
      syntheticEmail: true,
    });
    const customer = await waitForPhoneCustomerProjection(realm, identity.id);
    expect(customer).toMatchObject({
      iamPrincipalId: identity.id,
      email: null,
      phoneE164: phoneNumber,
      phoneVerified: true,
      accountStatus: 'REGISTERED',
    });
  });

  test('adds a verified phone to an existing customer only after SMS OTP', async ({
    api,
    request,
  }) => {
    test.setTimeout(90_000);
    const realm = await createStorefrontPhoneOtpRealm(api);
    const passwordRevision = await setCustomerAuthMethods(
      api,
      request,
      realm.revision,
      ['PASSWORD'],
    );
    const email = `phone-existing-${crypto.randomUUID()}@playwright.dev`;
    const signup = await expectSignUp(request, realm, email);
    const sessionCookie = applicationCookie(signup, realm);
    const existingIdentity = await waitForApplicationEmailIdentity(realm, email);
    expect(existingIdentity).toMatchObject({
      email,
      phoneNumber: null,
      phoneNumberVerified: false,
    });
    await setCustomerAuthMethods(api, request, passwordRevision, ['PHONE_OTP']);
    const phoneNumber = uniquePhoneNumber();

    const requested = await request.post(
      phoneOtpEndpoint(realm, '/phone-number/send-otp'),
      {
        headers: jsonHeaders(),
        data: { phoneNumber },
      },
    );
    expect(requested.status(), await requested.text()).toBe(200);

    const intercepted = await waitForSmsOtp(request, {
      storeId: realm.storeId,
      installationId: realm.smsInstallationId,
      recipient: phoneNumber,
    });

    const verified = await request.post(
      phoneOtpEndpoint(realm, '/phone-number/verify'),
      {
        headers: { ...jsonHeaders(), cookie: sessionCookie },
        data: {
          phoneNumber,
          code: intercepted.otp,
          updatePhoneNumber: true,
        },
      },
    );
    expect(verified.status(), await verified.text()).toBe(200);
    const verification = (await verified.json()) as {
      status: boolean;
      user: {
        id: string;
        phoneNumber: string;
        phoneNumberVerified: boolean;
      };
    };
    expect(verification).toMatchObject({
      status: true,
      user: {
        id: existingIdentity.id,
        phoneNumber,
        phoneNumberVerified: true,
      },
    });

    const identity = await waitForApplicationPhoneIdentity(realm, phoneNumber);
    expect(identity.id).toBe(existingIdentity.id);
    const customer = await waitForPhoneCustomerProjection(realm, identity.id);
    expect(customer).toMatchObject({
      iamPrincipalId: identity.id,
      email,
      phoneE164: phoneNumber,
      phoneVerified: true,
      accountStatus: 'REGISTERED',
    });
  });
});

function uniquePhoneNumber(): string {
  const suffix = (
    BigInt(`0x${crypto.randomUUID().replaceAll('-', '')}`) % 10_000_000n
  )
    .toString()
    .padStart(7, '0');
  return `+38050${suffix}`;
}
