import { createHash } from 'node:crypto';
import type {
  APIRequestContext,
  APIResponse,
  Page,
} from '@playwright/test';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';
import { waitForEmailOtp } from '@utils/mailpit';
import {
  defaultPassword,
  endpoint,
  formHeaders,
  jsonHeaders,
  type Realm,
  withDb,
} from '../application-auth-password/application-auth-test-kit';

type Api = ApiFixtures['api'];

interface ProvisionedStorefrontEmailOtpRealm extends Realm {
  storeId: string;
  origin: string;
  redirectUri: string;
  revision: number;
}

export interface StorefrontEmailOtpRealm
  extends ProvisionedStorefrontEmailOtpRealm {
  storeGlobalId: string;
  storeName: string;
  storeDisplayName: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
}

export interface EmailOtpAuthorizationAttempt {
  authorizationCookie: string;
  csrf: string;
  otp: string;
  state: string;
  verifier: string;
}

export interface ApplicationCustomerIdentity {
  id: string;
  email: string;
  emailVerified: boolean;
}

export interface CustomerProjection {
  id: string;
  iamPrincipalId: string;
  email: string;
  emailVerified: boolean;
  accountStatus: 'GUEST' | 'INVITED' | 'REGISTERED';
}

export interface RenderedOAuthApplicationSession {
  userId: string;
  sessionId: string;
  idTokenClaims: Record<string, unknown>;
  accessTokenClaims: Record<string, unknown>;
}

const adminGraphqlUrl =
  process.env.ADMIN_GRAPHQL_URL ?? 'http://127.0.0.1:14001/graphql';

export async function createStorefrontEmailOtpRealm(
  api: Api,
): Promise<StorefrontEmailOtpRealm> {
  await api.session.setupUserAndStore({
    email: `mailpit-sender-${crypto.randomUUID()}@playwright.dev`,
  });
  return createCurrentStorefrontEmailOtpRealm(api);
}

export async function createAdditionalStorefrontEmailOtpRealm(
  api: Api,
): Promise<StorefrontEmailOtpRealm> {
  await api.session.setupProject({
    email: `mailpit-sender-${crypto.randomUUID()}@playwright.dev`,
  });
  return createCurrentStorefrontEmailOtpRealm(api);
}

export function selectStorefrontRealm(
  api: Api,
  realm: StorefrontEmailOtpRealm,
): void {
  api.session.project = {
    id: realm.storeGlobalId,
    name: realm.storeName,
    displayName: realm.storeDisplayName,
  };
}

async function createCurrentStorefrontEmailOtpRealm(
  api: Api,
): Promise<StorefrontEmailOtpRealm> {
  const project = api.session.project;
  const storeId = decodeGlobalId(api.session.project.id).id;
  let realm: ProvisionedStorefrontEmailOtpRealm | null = null;
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

  await installMailpitSmtp(api);
  return {
    ...realm!,
    storeGlobalId: project.id,
    storeName: project.name,
    storeDisplayName: project.displayName,
  };
}

export async function setCustomerAuthMethods(
  api: Api,
  request: APIRequestContext,
  expectedRevision: number,
  enabledMethods: Array<'PASSWORD' | 'EMAIL_OTP'>,
): Promise<number> {
  const response = await request.post(adminGraphqlUrl, {
    headers: adminHeaders(api),
    data: {
      query: `
        mutation UpdateCustomerAccountMethods($input: CustomerAccountsSettingsUpdateInput!) {
          customersMutation {
            customerAccountsSettingsUpdate(input: $input) {
              settings {
                revision
                methods {
                  method
                  enabled
                  configured
                }
              }
              userErrors {
                code
                message
                field
              }
            }
          }
        }
      `,
      variables: {
        input: {
          enabledMethods,
          expectedRevision,
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
    expect(payload!.settings!.methods).toContainEqual(
      expect.objectContaining({
        method,
        enabled: true,
        configured: true,
      }),
    );
  }
  return payload!.settings!.revision;
}

export async function seedExistingCustomerWithPassword(
  request: APIRequestContext,
  realm: StorefrontEmailOtpRealm,
  email: string,
): Promise<ApplicationCustomerIdentity> {
  const response = await request.post(endpoint(realm, '/sign-up/email'), {
    headers: jsonHeaders(realm.origin),
    data: {
      name: 'Existing OTP Customer',
      email,
      password: defaultPassword,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return waitForApplicationCustomer(realm, email);
}

export async function blockApplicationUser(
  realm: StorefrontEmailOtpRealm,
  userId: string,
): Promise<void> {
  await withDb(async (sql) => {
    const rows = await sql<{ id: string; status: string }[]>`
      update iam.application_user
      set status = 'blocked', updated_at = now()
      where application_id = ${realm.applicationId}
        and id = ${userId}
      returning id, status
    `;
    expect(rows).toEqual([{ id: userId, status: 'blocked' }]);
  });
}

export async function clearSeedApplicationSessions(
  realm: StorefrontEmailOtpRealm,
  userId: string,
): Promise<void> {
  await withDb(
    (sql) => sql`
      delete from iam.application_session
      where application_id = ${realm.applicationId}
        and user_id = ${userId}
    `,
  );
}

export async function openOAuthTestApplication(
  page: Page,
  realm: StorefrontEmailOtpRealm,
): Promise<void> {
  expect(new URL(realm.redirectUri).origin).toBe(realm.origin);
  const applicationUrl = new URL(realm.origin);
  applicationUrl.search = new URLSearchParams({
    authorize_endpoint: endpoint(realm, '/oauth2/authorize'),
    token_endpoint: endpoint(realm, '/oauth2/token'),
    userinfo_endpoint: endpoint(realm, '/oauth2/userinfo'),
    client_id: realm.clientId,
    redirect_uri: realm.redirectUri,
    resource: realm.resource,
  }).toString();
  await page.goto(applicationUrl.toString());
}

export async function completeEmailOtpThroughHostedUi(
  page: Page,
  realm: StorefrontEmailOtpRealm,
  email: string,
): Promise<RenderedOAuthApplicationSession> {
  await expect(page).toHaveURL(
    new RegExp(
      `/auth/applications/${realm.applicationId}/login$`,
      'u',
    ),
  );
  await page.locator('a[href="./email-otp"]').click();
  await page
    .locator('form[action="./email-otp/request"] input[name="email"]')
    .fill(email);
  await page
    .locator('form[action="./email-otp/request"] button[type="submit"]')
    .click();
  const otp = await waitForEmailOtp(email.trim().toLowerCase(), 30_000);
  const verifyForm = page.locator('form[action="./verify"]');
  await verifyForm.locator('input[name="email"]').fill(email);
  await verifyForm.locator('input[name="otp"]').fill(otp);
  await verifyForm.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(
    new RegExp(`^${escapeRegExp(realm.redirectUri)}(?:\\?.*)?$`, 'u'),
  );
  await expect(page.locator('[data-testid="authenticated-session"]')).toBeVisible();
  await expect(page.locator('[data-testid="oauth-error"]')).toBeHidden();

  const userId = await page.locator('[data-testid="user-id"]').textContent();
  const sessionId = await page
    .locator('[data-testid="session-id"]')
    .textContent();
  const idTokenClaims = JSON.parse(
    (await page
      .locator('[data-testid="id-token-claims"]')
      .getAttribute('data-claims'))!,
  ) as Record<string, unknown>;
  const accessTokenClaims = JSON.parse(
    (await page
      .locator('[data-testid="access-token-claims"]')
      .getAttribute('data-claims'))!,
  ) as Record<string, unknown>;
  expect(userId).toBeTruthy();
  expect(sessionId).toBeTruthy();
  return {
    userId: userId!,
    sessionId: sessionId!,
    idTokenClaims,
    accessTokenClaims,
  };
}

export async function completeEmailOtpAuthorization(
  page: Page,
  request: APIRequestContext,
  realm: StorefrontEmailOtpRealm,
  email: string,
): Promise<OAuthTokenResponse> {
  const attempt = await beginEmailOtpAuthorization(page, realm, email);
  const callback = await submitEmailOtpForCallback(
    page,
    realm,
    email,
    attempt.otp,
  );
  expect(callback.searchParams.get('state')).toBe(attempt.state);
  const code = callback.searchParams.get('code');
  expect(code).toBeTruthy();

  const tokenResponse = await request.post(endpoint(realm, '/oauth2/token'), {
    headers: formHeaders(realm.origin),
    form: {
      grant_type: 'authorization_code',
      code: code!,
      client_id: realm.clientId,
      redirect_uri: realm.redirectUri,
      code_verifier: attempt.verifier,
      resource: realm.resource,
    },
  });
  expect(tokenResponse.ok(), await tokenResponse.text()).toBe(true);
  const tokens = (await tokenResponse.json()) as OAuthTokenResponse;
  expect(tokens).toEqual(
    expect.objectContaining({
      access_token: expect.any(String),
      id_token: expect.any(String),
      refresh_token: expect.any(String),
      token_type: expect.stringMatching(/^Bearer$/iu),
    }),
  );
  return tokens;
}

export async function beginEmailOtpAuthorization(
  page: Page,
  realm: StorefrontEmailOtpRealm,
  email: string,
): Promise<EmailOtpAuthorizationAttempt> {
  const verifier = crypto.randomUUID().replaceAll('-', '').repeat(2);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomUUID();
  const authorize = new URL(endpoint(realm, '/oauth2/authorize'));
  authorize.search = new URLSearchParams({
    client_id: realm.clientId,
    response_type: 'code',
    redirect_uri: realm.redirectUri,
    scope: 'openid profile email offline_access',
    state,
    nonce: crypto.randomUUID(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: realm.resource,
  }).toString();

  await requestEmailOtp(page, realm, email, authorize);

  const otp = await waitForEmailOtp(email.trim().toLowerCase(), 30_000);
  const csrf = await page
    .locator('form[action="./verify"] input[name="csrf"]')
    .inputValue();
  const authorizationCookie = (await page.context().cookies())
    .filter(({ name }) => name.endsWith('.authorization_context'))
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
  expect(authorizationCookie).not.toBe('');
  return { authorizationCookie, csrf, otp, state, verifier };
}

export async function requestEmailOtp(
  page: Page,
  realm: StorefrontEmailOtpRealm,
  email: string,
  authorizeUrl?: URL,
): Promise<void> {
  const authorize =
    authorizeUrl ??
    new URL(
      `${endpoint(realm, '/oauth2/authorize')}?${new URLSearchParams({
        client_id: realm.clientId,
        response_type: 'code',
        redirect_uri: realm.redirectUri,
        scope: 'openid profile email offline_access',
        state: crypto.randomUUID(),
        nonce: crypto.randomUUID(),
        code_challenge: 'A'.repeat(43),
        code_challenge_method: 'S256',
        resource: realm.resource,
      })}`,
    );
  await page.context().clearCookies();
  await page.goto(authorize.toString());
  await expect(page.locator('form[action="./login/password"]')).toHaveCount(0);
  await page.locator('a[href="./email-otp"]').click();
  await page
    .locator('form[action="./email-otp/request"] input[name="email"]')
    .fill(email);
  await page
    .locator('form[action="./email-otp/request"] button[type="submit"]')
    .click();
  await expect(page).toHaveURL(
    new RegExp(
      `/auth/applications/${realm.applicationId}/email-otp/verify$`,
      'u',
    ),
  );
}

export async function submitEmailOtpForCallback(
  page: Page,
  realm: StorefrontEmailOtpRealm,
  email: string,
  otp: string,
): Promise<URL> {
  const verifyForm = page.locator('form[action="./verify"]');
  await verifyForm.locator('input[name="email"]').fill(email);
  await verifyForm.locator('input[name="otp"]').fill(otp);
  const callbackRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      `${url.origin}${url.pathname}` === realm.redirectUri &&
      url.searchParams.has('code')
    );
  });
  await verifyForm.locator('button[type="submit"]').click();
  return new URL((await callbackRequest).url());
}

export async function submitEmailOtpExpectRejected(
  page: Page,
  realm: StorefrontEmailOtpRealm,
  email: string,
  otp: string,
): Promise<void> {
  const verifyForm = page.locator('form[action="./verify"]');
  await verifyForm.locator('input[name="email"]').fill(email);
  await verifyForm.locator('input[name="otp"]').fill(otp);
  await verifyForm.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(
    new RegExp(
      `/auth/applications/${realm.applicationId}/email-otp/verify$`,
      'u',
    ),
  );
  await expect(page.locator('.error')).toBeVisible();
}

export function replayEmailOtpAuthorization(
  request: APIRequestContext,
  realm: StorefrontEmailOtpRealm,
  email: string,
  attempt: EmailOtpAuthorizationAttempt,
): Promise<APIResponse> {
  return request.post(endpoint(realm, '/email-otp/verify'), {
    headers: {
      cookie: attempt.authorizationCookie,
      origin: new URL(applicationIssuer(realm)).origin,
      'sec-fetch-site': 'same-origin',
    },
    form: {
      csrf: attempt.csrf,
      email,
      otp: attempt.otp,
    },
    maxRedirects: 0,
  });
}

export async function waitForApplicationCustomer(
  realm: StorefrontEmailOtpRealm,
  email: string,
): Promise<ApplicationCustomerIdentity> {
  let identity: ApplicationCustomerIdentity | null = null;
  await expect
    .poll(
      async () => {
        identity = await withDb(async (sql) => {
          const [row] = await sql<ApplicationCustomerIdentity[]>`
            select id, email, email_verified as "emailVerified"
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

export async function waitForCustomerProjection(
  realm: StorefrontEmailOtpRealm,
  iamPrincipalId: string,
): Promise<CustomerProjection> {
  let customer: CustomerProjection | null = null;
  await expect
    .poll(
      async () => {
        customer = await withDb(async (sql) => {
          const [row] = await sql<CustomerProjection[]>`
            select id, iam_principal_id as "iamPrincipalId", email,
                   email_verified as "emailVerified",
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

export function applicationSessionCount(
  realm: StorefrontEmailOtpRealm,
): Promise<number> {
  return withDb(async (sql) => {
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from iam.application_session
      where application_id = ${realm.applicationId}
    `;
    return row!.count;
  });
}

export function applicationSessionIdForUser(
  realm: StorefrontEmailOtpRealm,
  userId: string,
): Promise<string | null> {
  return withDb(async (sql) => {
    const [row] = await sql<{ id: string }[]>`
      select id
      from iam.application_session
      where application_id = ${realm.applicationId}
        and user_id = ${userId}
      order by created_at desc
      limit 1
    `;
    return row?.id ?? null;
  });
}

export function customerCount(
  realm: StorefrontEmailOtpRealm,
  email: string,
): Promise<number> {
  return withDb(async (sql) => {
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from customers.customer
      where store_id = ${realm.storeId}
        and normalized_email = ${email.trim().toLowerCase()}
        and deleted_at is null
    `;
    return row!.count;
  });
}

export function applicationIdentityCount(
  realm: StorefrontEmailOtpRealm,
  email: string,
): Promise<number> {
  return withDb(async (sql) => {
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from iam.application_user
      where application_id = ${realm.applicationId}
        and email = ${email.trim().toLowerCase()}
    `;
    return row!.count;
  });
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  expect(payload).toBeTruthy();
  return JSON.parse(
    Buffer.from(payload!, 'base64url').toString('utf8'),
  ) as Record<string, unknown>;
}

export function applicationIssuer(realm: StorefrontEmailOtpRealm): string {
  return endpoint(realm, '');
}

async function findStorefrontRealm(
  storeId: string,
): Promise<ProvisionedStorefrontEmailOtpRealm | null> {
  return withDb(async (sql) => {
    const [row] = await sql<
      Array<{
        applicationId: string;
        clientId: string;
        organizationId: string;
        resource: string;
        storeId: string;
        origin: string;
        redirectUri: string;
        revision: number;
      }>
    >`
      select storefront.application_id as "applicationId",
             client.client_id as "clientId",
             application.organization_id as "organizationId",
             configuration.resource,
             storefront.store_id as "storeId",
             origin.origin,
             client.redirect_uris[1] as "redirectUri",
             configuration.revision
      from customers.storefront_auth_configuration storefront
      join iam.application application
        on application.id = storefront.application_id
      join iam.application_auth_configuration configuration
        on configuration.application_id = storefront.application_id
      join iam.application_auth_origin origin
        on origin.application_id = storefront.application_id
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

async function installMailpitSmtp(api: Api): Promise<void> {
  const install = await api.admin.mutation('apps-admin-api/AppInstall', {
    variables: {
      input: {
        appCode: 'shopana-smtp',
        configuration: {
          host: '127.0.0.1',
          port: 11025,
          security: 'NONE',
        },
        clientMutationId: crypto.randomUUID(),
      },
    },
  });
  const payload = install.data.appsMutation.appInstall;
  expect(payload.userErrors).toEqual([]);
  expect(payload.installation).not.toBeNull();
  await expect
    .poll(
      async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id: payload.installation!.id },
        });
        return response.data.appsQuery.appInstallation?.status;
      },
      {
        message: 'Mailpit SMTP application did not become active',
        timeout: 20_000,
      },
    )
    .toBe('ACTIVE');
}

function adminHeaders(api: Api): Record<string, string> {
  return {
    authorization: `Bearer ${api.session.accessToken}`,
    'content-type': 'application/json',
    'x-organization-id': api.session.organizationId!,
    'x-store-name': api.session.project.name,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
