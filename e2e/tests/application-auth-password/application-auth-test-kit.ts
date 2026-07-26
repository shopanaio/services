import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';
import postgres from 'postgres';

export type Api = ApiFixtures['api'];
export type Sql = ReturnType<typeof postgres>;

export interface Realm {
  applicationId: string;
  clientId: string;
  organizationId: string;
  resource: string;
}

export interface RealmMatrix {
  a: Realm;
  a2: Realm;
  b: Realm;
}

export interface RealmPolicy {
  realmEnabled?: boolean;
  registrationMode?: 'open' | 'disabled';
  passwordSignUpEnabled?: boolean;
  passwordSignInEnabled?: boolean;
  passwordResetEnabled?: boolean;
  emailVerificationRequired?: boolean;
  emailOtpSignInEnabled?: boolean;
  emailOtpSignUpEnabled?: boolean;
}

interface ApplicationCreateResponse {
  data?: {
    applicationMutation: {
      applicationCreate: {
        application: { id: string; resource: string } | null;
        userErrors: Array<{ code: string; message: string }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

export const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:15432/portal';
export const adminGraphqlUrl =
  process.env.ADMIN_GRAPHQL_URL ?? 'http://127.0.0.1:14001/graphql';
export const iamBaseUrl = process.env.IAM_HTTP_URL ?? 'http://127.0.0.1:11010';
export const defaultPassword = 'Application-password-123!';
export const minimumPassword = '1234567890';
export const invalidCredentials = {
  error: 'invalid_credentials',
  error_description: 'Email or password is invalid',
} as const;

const stateTables = [
  'application_user',
  'application_account',
  'application_session',
  'application_verification',
  'application_authorization_context',
  'application_oauth_access_token',
  'application_oauth_refresh_token',
  'application_oauth_consent',
] as const;
export type StateTable = (typeof stateTables)[number];

export async function createRealmMatrix(
  api: Api,
  request: APIRequestContext,
  policy: RealmPolicy = {},
): Promise<RealmMatrix> {
  await api.session.setupUser();
  const organizationA = await api.session.setupOrganization({
    displayName: `Password auth organization A ${crypto.randomUUID().slice(0, 8)}`,
  });
  const a = await createRealm(api, request, organizationA.id, 'a', policy);
  const a2 = await createRealm(api, request, organizationA.id, 'a2', policy);
  const organizationB = await api.session.setupOrganization({
    displayName: `Password auth organization B ${crypto.randomUUID().slice(0, 8)}`,
  });
  const b = await createRealm(api, request, organizationB.id, 'b', policy);
  return { a, a2, b };
}

export async function createRealm(
  api: Api,
  request: APIRequestContext,
  organizationGlobalId?: string,
  suffix = 'realm',
  policy: RealmPolicy = {},
): Promise<Realm> {
  if (!organizationGlobalId) {
    await api.session.setupUser();
  }
  const organization =
    organizationGlobalId ??
    (
      await api.session.setupOrganization({
        displayName: `Password auth organization ${crypto.randomUUID().slice(0, 8)}`,
      })
    ).id;
  const response = await request.post(adminGraphqlUrl, {
    headers: {
      authorization: `Bearer ${api.session.accessToken}`,
      'content-type': 'application/json',
      'x-organization-id': organization,
    },
    data: {
      query: `
        mutation CreatePasswordAuthApplication($input: ApplicationCreateInput!) {
          applicationMutation {
            applicationCreate(input: $input) {
              application { id resource }
              userErrors { code message }
            }
          }
        }
      `,
      variables: {
        input: {
          organizationId: organization,
          name: `password-${suffix}-${crypto.randomUUID().slice(0, 8)}`,
          displayName: `Password ${suffix.toUpperCase()}`,
        },
      },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const json = (await response.json()) as ApplicationCreateResponse;
  expect(json.errors).toBeUndefined();
  const payload = json.data?.applicationMutation.applicationCreate;
  expect(payload?.userErrors).toEqual([]);
  expect(payload?.application).not.toBeNull();

  const applicationId = decodeGlobalId(payload!.application!.id).id;
  const organizationId = decodeGlobalId(organization).id;
  const resource = payload!.application!.resource;
  const provisionalRealm = { applicationId, clientId: '', organizationId, resource };

  await updatePolicy(provisionalRealm, {
    realmEnabled: true,
    registrationMode: 'open',
    passwordSignUpEnabled: true,
    passwordSignInEnabled: true,
    passwordResetEnabled: false,
    emailVerificationRequired: false,
    emailOtpSignInEnabled: false,
    emailOtpSignUpEnabled: false,
    ...policy,
  });
  await withDb(async (sql) => {
    await sql`
      insert into iam.application_auth_origin (application_id, origin)
      values (${applicationId}, ${iamBaseUrl})
      on conflict (application_id, origin) do nothing
    `;
  });
  const { data } = await api.admin.mutation('application-admin-api/ApplicationOAuthClientCreate', {
    variables: {
      input: {
        organizationId: organization,
        applicationId: payload!.application!.id,
        name: `Password ${suffix}`,
        clientType: 'PUBLIC',
        environment: 'DEVELOPMENT',
        redirectUris: [redirectUri(provisionalRealm)],
        postLogoutRedirectUris: [postLogoutUri(provisionalRealm)],
        enableEndSession: true,
        skipConsent: false,
      },
    },
  });
  const clientPayload = data.applicationMutation.applicationOAuthClientCreate;
  expect(clientPayload.userErrors).toEqual([]);
  expect(clientPayload.client).not.toBeNull();
  return {
    ...provisionalRealm,
    clientId: clientPayload.client!.clientId,
  };
}

export async function updatePolicy(realm: Realm, policy: RealmPolicy): Promise<void> {
  await withDb(async (sql) => {
    const [current] = await sql<{
      realm_enabled: boolean;
      registration_mode: 'open' | 'disabled';
      password_sign_up_enabled: boolean;
      password_sign_in_enabled: boolean;
      password_reset_enabled: boolean;
      email_verification_required: boolean;
      email_otp_sign_in_enabled: boolean;
      email_otp_sign_up_enabled: boolean;
    }[]>`
      select realm_enabled, registration_mode, password_sign_up_enabled,
             password_sign_in_enabled, password_reset_enabled,
             email_verification_required, email_otp_sign_in_enabled,
             email_otp_sign_up_enabled
      from iam.application_auth_configuration
      where application_id = ${realm.applicationId}
    `;
    expect(current).toBeDefined();
    await sql`
      update iam.application_auth_configuration
      set realm_enabled = ${policy.realmEnabled ?? current!.realm_enabled},
          registration_mode = ${policy.registrationMode ?? current!.registration_mode},
          password_sign_up_enabled =
            ${policy.passwordSignUpEnabled ?? current!.password_sign_up_enabled},
          password_sign_in_enabled =
            ${policy.passwordSignInEnabled ?? current!.password_sign_in_enabled},
          password_reset_enabled =
            ${policy.passwordResetEnabled ?? current!.password_reset_enabled},
          email_verification_required =
            ${policy.emailVerificationRequired ?? current!.email_verification_required},
          email_otp_sign_in_enabled =
            ${policy.emailOtpSignInEnabled ?? current!.email_otp_sign_in_enabled},
          email_otp_sign_up_enabled =
            ${policy.emailOtpSignUpEnabled ?? current!.email_otp_sign_up_enabled},
          revision = revision + 1,
          updated_at = now()
      where application_id = ${realm.applicationId}
    `;
  });
}

export async function configureDelivery(realm: Realm, prefix = 'password-auth'): Promise<void> {
  await withDb(
    (sql) => sql`
      insert into iam.application_auth_delivery_profile (
        application_id, transport_profile, sender_identity,
        email_verification_template_id, password_reset_template_id,
        email_otp_sign_in_template_id, updated_by
      )
      values (
        ${realm.applicationId}, ${`${prefix}-transport`},
        ${`${prefix}+${realm.applicationId}@playwright.dev`},
        ${`${prefix}-verify`}, ${`${prefix}-reset`}, ${`${prefix}-otp`}, 'e2e'
      )
      on conflict (application_id) do update set
        transport_profile = excluded.transport_profile,
        sender_identity = excluded.sender_identity,
        email_verification_template_id = excluded.email_verification_template_id,
        password_reset_template_id = excluded.password_reset_template_id,
        email_otp_sign_in_template_id = excluded.email_otp_sign_in_template_id,
        updated_by = excluded.updated_by,
        updated_at = now()
    `,
  );
}

export function signUp(
  request: APIRequestContext,
  realm: Realm,
  email: string,
  password = defaultPassword,
  name = 'Password User',
  options: { headers?: Record<string, string> } = {},
): Promise<APIResponse> {
  return request.post(endpoint(realm, '/sign-up/email'), {
    headers: { ...jsonHeaders(), ...options.headers },
    data: { name, email, password },
  });
}

export async function expectSignUp(
  request: APIRequestContext,
  realm: Realm,
  email = uniqueEmail(),
  password = defaultPassword,
): Promise<APIResponse> {
  const response = await signUp(request, realm, email, password);
  expect(response.ok(), await response.text()).toBe(true);
  return response;
}

export function signIn(
  request: APIRequestContext,
  realm: Realm,
  email: string,
  password = defaultPassword,
  headers: Record<string, string> = {},
): Promise<APIResponse> {
  return request.post(endpoint(realm, '/sign-in/email'), {
    headers: { ...jsonHeaders(), ...headers },
    data: { email, password },
  });
}

export async function expectInvalidSignIn(
  request: APIRequestContext,
  realm: Realm,
  email: string,
  password: string,
): Promise<APIResponse> {
  const response = await signIn(request, realm, email, password);
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual(invalidCredentials);
  return response;
}

export function requestPasswordReset(
  request: APIRequestContext,
  realm: Realm,
  email: string,
  redirectTo = endpoint(realm, '/password/reset'),
): Promise<APIResponse> {
  return request.post(endpoint(realm, '/request-password-reset'), {
    headers: jsonHeaders(),
    data: { email, redirectTo },
  });
}

export function completePasswordReset(
  request: APIRequestContext,
  realm: Realm,
  token: string,
  newPassword: string,
): Promise<APIResponse> {
  return request.post(endpoint(realm, '/reset-password'), {
    headers: jsonHeaders(),
    data: { token, newPassword },
  });
}

export function beginAuthorization(
  request: APIRequestContext,
  realm: Realm,
  overrides: Partial<{
    clientId: string;
    redirectUri: string;
    scope: string;
    state: string;
    nonce: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    resource: string;
  }> = {},
): Promise<APIResponse> {
  return request.get(authorizeUrl(realm, overrides), {
    headers: { accept: 'text/html' },
    maxRedirects: 0,
  });
}

export function authorizeUrl(
  realm: Realm,
  overrides: Partial<{
    clientId: string;
    redirectUri: string;
    scope: string;
    state: string;
    nonce: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    resource: string;
  }> = {},
): string {
  const params = new URLSearchParams({
    client_id: overrides.clientId ?? realm.clientId,
    response_type: 'code',
    redirect_uri: overrides.redirectUri ?? redirectUri(realm),
    scope: overrides.scope ?? 'openid profile email offline_access',
    state: overrides.state ?? crypto.randomUUID(),
    nonce: overrides.nonce ?? crypto.randomUUID(),
    code_challenge: overrides.codeChallenge ?? 'A'.repeat(43),
    code_challenge_method: overrides.codeChallengeMethod ?? 'S256',
    resource: overrides.resource ?? realm.resource,
  });
  return `${endpoint(realm, '/oauth2/authorize')}?${params}`;
}

export function tokenRequest(
  request: APIRequestContext,
  realm: Realm,
  form: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<APIResponse> {
  return request.post(endpoint(realm, '/oauth2/token'), {
    headers: { ...formHeaders(), ...headers },
    form,
  });
}

export async function expectOAuthError(
  response: APIResponse,
  expectedError?: string,
): Promise<Record<string, unknown>> {
  expect(response.status()).toBeGreaterThanOrEqual(400);
  const body = (await response.json()) as Record<string, unknown>;
  expect(body).toEqual(expect.objectContaining({ error: expectedError ?? expect.any(String) }));
  expect(JSON.stringify(body)).not.toMatch(
    /(?:application_id|organization_id|postgres|select\s|stack|node_modules|password)/iu,
  );
  return body;
}

export function endpoint(realm: Pick<Realm, 'applicationId'>, path: string): string {
  return `${iamBaseUrl}/auth/applications/${realm.applicationId}${path}`;
}

export function redirectUri(realm: Pick<Realm, 'applicationId'>): string {
  return `${iamBaseUrl}/e2e/oauth/callback/${realm.applicationId}`;
}

export function postLogoutUri(realm: Pick<Realm, 'applicationId'>): string {
  return `${iamBaseUrl}/e2e/oauth/signed-out/${realm.applicationId}`;
}

export function jsonHeaders(origin = iamBaseUrl): Record<string, string> {
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    origin,
  };
}

export function formHeaders(origin = iamBaseUrl): Record<string, string> {
  return {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
    origin,
  };
}

export function cookiePair(response: APIResponse, fragment: string): string {
  const cookie = setCookieHeaders(response)
    .map((header) => header.split(';', 1)[0]!)
    .find((candidate) => candidate.includes(fragment));
  expect(cookie, `Set-Cookie containing "${fragment}"`).toBeDefined();
  return cookie!;
}

export function applicationCookie(response: APIResponse, realm: Realm): string {
  return cookiePair(response, `shopana_application_${realm.applicationId}`);
}

export function setCookieHeaders(response: APIResponse): string[] {
  return response
    .headersArray()
    .filter(({ name }) => name.toLowerCase() === 'set-cookie')
    .map(({ value }) => value);
}

export function uniqueEmail(prefix = 'password'): string {
  return `${prefix}-${crypto.randomUUID()}@playwright.dev`;
}

export async function withDb<T>(callback: (sql: Sql) => Promise<T>): Promise<T> {
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    return await callback(sql);
  } finally {
    await sql.end();
  }
}

export async function count(
  sql: Sql,
  table: StateTable,
  applicationId: string,
): Promise<number> {
  const query = {
    application_user: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_user
      where application_id = ${applicationId}
    `,
    application_account: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_account
      where application_id = ${applicationId}
    `,
    application_session: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_session
      where application_id = ${applicationId}
    `,
    application_verification: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_verification
      where application_id = ${applicationId}
    `,
    application_authorization_context: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_authorization_context
      where application_id = ${applicationId}
    `,
    application_oauth_access_token: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_oauth_access_token
      where application_id = ${applicationId}
    `,
    application_oauth_refresh_token: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_oauth_refresh_token
      where application_id = ${applicationId}
    `,
    application_oauth_consent: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_oauth_consent
      where application_id = ${applicationId}
    `,
  }[table];
  const [row] = await query();
  return row!.count;
}

export async function realmState(realm: Realm): Promise<Record<StateTable, number>> {
  return withDb(async (sql) => {
    const values = await Promise.all(
      stateTables.map((table) => count(sql, table, realm.applicationId)),
    );
    return Object.fromEntries(stateTables.map((table, index) => [table, values[index]!])) as Record<
      StateTable,
      number
    >;
  });
}

export async function expectRealmState(
  realm: Realm,
  expected: Record<StateTable, number>,
): Promise<void> {
  expect(await realmState(realm)).toEqual(expected);
}

export async function userForEmail(
  realm: Realm,
  email: string,
): Promise<{
  id: string;
  email: string;
  emailVerified: boolean;
  status: 'active' | 'blocked';
} | null> {
  return withDb(async (sql) => {
    const [row] = await sql<
      { id: string; email: string; emailVerified: boolean; status: 'active' | 'blocked' }[]
    >`
      select id, email, email_verified as "emailVerified", status
      from iam.application_user
      where application_id = ${realm.applicationId} and email = ${email.trim().toLowerCase()}
    `;
    return row ?? null;
  });
}

export async function setUserState(
  realm: Realm,
  email: string,
  state: Partial<{ status: 'active' | 'blocked'; emailVerified: boolean }>,
): Promise<void> {
  await withDb(
    (sql) => sql`
      update iam.application_user
      set status = coalesce(${state.status ?? null}, status),
          email_verified = coalesce(${state.emailVerified ?? null}, email_verified),
          updated_at = now()
      where application_id = ${realm.applicationId}
        and email = ${email.trim().toLowerCase()}
    `,
  );
}

export async function copyPasswordIdentity(
  source: Realm,
  target: Realm,
  email: string,
): Promise<void> {
  await withDb(async (sql) => {
    const [sourceUser] = await sql<
      {
        name: string;
        email: string;
        email_verified: boolean;
        status: 'active' | 'blocked';
      }[]
    >`
      select name, email, email_verified, status
      from iam.application_user
      where application_id = ${source.applicationId} and email = ${email.trim().toLowerCase()}
    `;
    const [sourceAccount] = await sql<
      { provider_id: string; account_id: string; password: string | null }[]
    >`
      select account.provider_id, account.account_id, account.password
      from iam.application_account account
      join iam.application_user app_user
        on app_user.application_id = account.application_id and app_user.id = account.user_id
      where account.application_id = ${source.applicationId}
        and app_user.email = ${email.trim().toLowerCase()}
    `;
    expect(sourceUser).toBeDefined();
    expect(sourceAccount?.password).toBeTruthy();
    const userId = crypto.randomUUID();
    await sql`
      insert into iam.application_user
        (id, application_id, name, email, email_verified, status)
      values (
        ${userId}, ${target.applicationId}, ${sourceUser!.name}, ${sourceUser!.email},
        ${sourceUser!.email_verified}, ${sourceUser!.status}
      )
    `;
    await sql`
      insert into iam.application_account
        (id, application_id, user_id, account_id, provider_id, password)
      values (
        ${crypto.randomUUID()}, ${target.applicationId}, ${userId},
        ${userId}, ${sourceAccount!.provider_id}, ${sourceAccount!.password}
      )
    `;
  });
}

export async function setClientDisabled(api: Api, realm: Realm, disabled: boolean): Promise<void> {
  const revision = await withDb(async (sql) => {
    const [row] = await sql<{ revision: number }[]>`
      select revision from iam.application_oauth_client
      where application_id = ${realm.applicationId} and client_id = ${realm.clientId}
    `;
    return row!.revision;
  });
  const { data } = await api.admin.mutation(
    'application-admin-api/ApplicationOAuthClientEnabledSet',
    {
      variables: {
        input: {
          organizationId: composeGlobalId('Organization', realm.organizationId),
          applicationId: composeGlobalId('Application', realm.applicationId),
          clientId: realm.clientId,
          enabled: !disabled,
          expectedRevision: revision,
        },
      },
    },
  );
  const payload = data.applicationMutation.applicationOAuthClientEnabledSet;
  expect(payload.userErrors).toEqual([]);
  expect(payload.client?.disabled).toBe(disabled);
}

export async function expireSessions(realm: Realm): Promise<void> {
  await withDb(
    (sql) => sql`
      update iam.application_session
      set expires_at = now() - interval '1 second', updated_at = now()
      where application_id = ${realm.applicationId}
    `,
  );
}

export async function seedVerification(
  realm: Realm,
  purpose: 'verify-email' | 'reset-password',
  email: string,
  options: { expired?: boolean; value?: string } = {},
): Promise<string> {
  const value = options.value ?? crypto.randomUUID();
  await withDb(
    (sql) => sql`
      insert into iam.application_verification
        (id, application_id, identifier, value, expires_at)
      values (
        ${crypto.randomUUID()}, ${realm.applicationId}, ${`${purpose}:${email}`}, ${value},
        ${options.expired ? new Date(Date.now() - 1_000) : new Date(Date.now() + 15 * 60_000)}
      )
    `,
  );
  return value;
}

export async function serializedRealmRows(realm: Realm): Promise<string> {
  return withDb(async (sql) => {
    const [users, accounts, sessions, verifications, contexts, clients] = await Promise.all([
      sql`select * from iam.application_user where application_id = ${realm.applicationId}`,
      sql`select * from iam.application_account where application_id = ${realm.applicationId}`,
      sql`select * from iam.application_session where application_id = ${realm.applicationId}`,
      sql`select * from iam.application_verification where application_id = ${realm.applicationId}`,
      sql`select * from iam.application_authorization_context where application_id = ${realm.applicationId}`,
      sql`select * from iam.application_oauth_client where application_id = ${realm.applicationId}`,
    ]);
    return JSON.stringify({ users, accounts, sessions, verifications, contexts, clients });
  });
}

export function expectSecretFree(value: unknown, secrets: readonly string[] = []): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toMatch(
    /(?:stack|node_modules|postgres|select\s.+from|password_hash|client_secret)/iu,
  );
  for (const secret of secrets) {
    expect(serialized).not.toContain(secret);
  }
}
