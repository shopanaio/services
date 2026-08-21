import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import { decodeGlobalId } from '@utils/globalid';
import { installTestTwilioSmsProxy } from '@utils/sms-proxy';
import {
  endpoint,
  type Realm,
  withDb,
} from '../application-auth-password/application-auth-test-kit';

type Api = ApiFixtures['api'];

export interface StorefrontPhoneOtpRealm extends Realm {
  storeId: string;
  revision: number;
  smsInstallationId: string;
}

export interface ApplicationPhoneIdentity {
  id: string;
  phoneNumber: string;
  phoneNumberVerified: boolean;
  syntheticEmail: boolean;
}

export interface ApplicationEmailIdentity {
  id: string;
  email: string;
  phoneNumber: string | null;
  phoneNumberVerified: boolean;
}

export interface PhoneCustomerProjection {
  id: string;
  iamPrincipalId: string;
  email: string | null;
  phoneE164: string;
  phoneVerified: boolean;
  accountStatus: 'GUEST' | 'INVITED' | 'REGISTERED';
}

const adminGraphqlUrl =
  process.env.ADMIN_GRAPHQL_URL ?? 'http://127.0.0.1:14001/graphql';

export async function createStorefrontPhoneOtpRealm(
  api: Api,
): Promise<StorefrontPhoneOtpRealm> {
  await api.session.setupUserAndStore();
  const storeId = decodeGlobalId(api.session.project.id).id;
  let realm: Omit<StorefrontPhoneOtpRealm, 'smsInstallationId'> | null = null;
  await expect
    .poll(
      async () => {
        realm = await findStorefrontRealm(storeId);
        return realm;
      },
      {
        message: 'storefront application auth provisioning did not complete',
        timeout: 20_000,
      },
    )
    .not.toBeNull();

  const smsInstallationId = await installTestTwilioSmsProxy(api);
  return { ...realm!, smsInstallationId };
}

export async function setCustomerAuthMethods(
  api: Api,
  request: APIRequestContext,
  
  enabledMethods: Array<'PASSWORD' | 'PHONE_OTP'>,
): Promise<number> {
  const response = await request.post(adminGraphqlUrl, {
    headers: {
      authorization: `Bearer ${api.session.accessToken}`,
      'content-type': 'application/json',
      'x-organization-id': api.session.organizationId!,
      'x-store-name': api.session.project.name,
    },
    data: {
      query: `
        mutation UpdateCustomerAccountMethods($input: CustomerAccountsSettingsUpdateInput!) {
          customersMutation {
            customerAccountsSettingsUpdate(input: $input) {
              settings {
                revision
                methods { method enabled configured }
              }
              userErrors { code message field }
            }
          }
        }
      `,
      variables: {
        input: {
          enabledMethods,
          
        },
      },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as {
    data?: {
      customersMutation: {
        customerAccountsSettingsUpdate: {
          settings: {
            revision: number;
            methods: Array<{
              method: 'PASSWORD' | 'EMAIL_OTP' | 'PHONE_OTP';
              enabled: boolean;
              configured: boolean;
            }>;
          } | null;
          userErrors: Array<{ code?: string; message: string; field?: string[] }>;
        };
      };
    };
    errors?: Array<{ message: string }>;
  };
  expect(body.errors).toBeUndefined();
  const payload = body.data?.customersMutation.customerAccountsSettingsUpdate;
  expect(payload?.userErrors).toEqual([]);
  expect(payload?.settings).not.toBeNull();
  for (const method of enabledMethods) {
    expect(payload!.settings!.methods).toContainEqual({
      method,
      enabled: true,
      configured: true,
    });
  }
  return payload!.settings!.revision;
}

export async function waitForApplicationEmailIdentity(
  realm: StorefrontPhoneOtpRealm,
  email: string,
): Promise<ApplicationEmailIdentity> {
  let identity: ApplicationEmailIdentity | null = null;
  await expect
    .poll(
      async () => {
        identity = await withDb(async (sql) => {
          const [row] = await sql<ApplicationEmailIdentity[]>`
            select id, email, phone_number as "phoneNumber",
                   phone_number_verified as "phoneNumberVerified"
            from iam.application_user
            where application_id = ${realm.applicationId}
              and email = ${email.trim().toLowerCase()}
          `;
          return row ?? null;
        });
        return identity;
      },
      {
        message: `application user ${email} was not created`,
        timeout: 15_000,
      },
    )
    .not.toBeNull();
  return identity!;
}

export async function waitForApplicationPhoneIdentity(
  realm: StorefrontPhoneOtpRealm,
  phoneNumber: string,
): Promise<ApplicationPhoneIdentity> {
  let identity: ApplicationPhoneIdentity | null = null;
  await expect
    .poll(
      async () => {
        identity = await withDb(async (sql) => {
          const [row] = await sql<ApplicationPhoneIdentity[]>`
            select id, phone_number as "phoneNumber",
                   phone_number_verified as "phoneNumberVerified",
                   synthetic_email as "syntheticEmail"
            from iam.application_user
            where application_id = ${realm.applicationId}
              and phone_number = ${phoneNumber}
          `;
          return row ?? null;
        });
        return identity;
      },
      {
        message: `application user for ${phoneNumber} was not created`,
        timeout: 15_000,
      },
    )
    .not.toBeNull();
  return identity!;
}

export async function waitForPhoneCustomerProjection(
  realm: StorefrontPhoneOtpRealm,
  iamPrincipalId: string,
): Promise<PhoneCustomerProjection> {
  let customer: PhoneCustomerProjection | null = null;
  await expect
    .poll(
      async () => {
        customer = await withDb(async (sql) => {
          const [row] = await sql<PhoneCustomerProjection[]>`
            select id, iam_principal_id as "iamPrincipalId", email,
                   phone_e164 as "phoneE164",
                   phone_verified as "phoneVerified",
                   account_status as "accountStatus"
            from customers.customer
            where store_id = ${realm.storeId}
              and iam_principal_id = ${iamPrincipalId}
              and deleted_at is null
          `;
          return row ?? null;
        });
        return customer;
      },
      {
        message: `customer projection for application user ${iamPrincipalId} was not created`,
        timeout: 20_000,
      },
    )
    .not.toBeNull();
  return customer!;
}

export function phoneOtpEndpoint(
  realm: StorefrontPhoneOtpRealm,
  path: '/phone-number/send-otp' | '/phone-number/verify',
): string {
  return endpoint(realm, path);
}

async function findStorefrontRealm(
  storeId: string,
): Promise<Omit<StorefrontPhoneOtpRealm, 'smsInstallationId'> | null> {
  return withDb(async (sql) => {
    const [row] = await sql<
      Array<Omit<StorefrontPhoneOtpRealm, 'smsInstallationId'>>
    >`
      select storefront.application_id as "applicationId",
             client.client_id as "clientId",
             application.organization_id as "organizationId",
             configuration.resource,
             storefront.store_id as "storeId",
             configuration.revision
      from customers.storefront_auth_configuration storefront
      join iam.application application
        on application.id = storefront.application_id
      join iam.application_auth_configuration configuration
        on configuration.application_id = storefront.application_id
      join iam.application_oauth_client client
        on client.application_id = storefront.application_id
       and client.disabled = false
       and client.deleted_at is null
      where storefront.store_id = ${storeId}
      limit 1
    `;
    return row ?? null;
  });
}
