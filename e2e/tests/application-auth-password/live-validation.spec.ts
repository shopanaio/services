import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import { composeGlobalId } from '@utils/globalid';
import {
  authorizeUrl,
  createRealm,
  createRealmMatrix,
  defaultPassword,
  endpoint,
  expectSignUp,
  formHeaders,
  redirectUri,
  setClientDisabled,
  tokenRequest,
  uniqueEmail,
  updatePolicy,
  userForEmail,
  withDb,
} from './application-auth-test-kit';

test.describe('Application password auth — live validation', () => {
  test('token is active only when every cryptographic and live-state binding matches', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('active');
    await expectSignUp(request, realm, email);
    const token = await issueAccessToken(page, request, realm, email);
    expect(await introspect(request, realm, token)).toEqual(
      expect.objectContaining({ active: true }),
    );
  });

  test('block makes artifacts inactive and unblock does not revive revoked artifacts', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('block');
    await expectSignUp(request, realm, email);
    const token = await issueAccessToken(page, request, realm, email);
    const user = await userForEmail(realm, email);
    expect(user).not.toBeNull();
    await setApplicationUserStatus(api, realm, user!.id, 'block');
    expect(await introspect(request, realm, token)).toMatchObject({ active: false });
    await setApplicationUserStatus(api, realm, user!.id, 'unblock');
    expect(await introspect(request, realm, token)).toMatchObject({ active: false });
  });

  test('session revoke makes bound token inactive according to policy', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('session-revoke');
    await expectSignUp(request, realm, email);
    const token = await issueAccessToken(page, request, realm, email);
    const user = await userForEmail(realm, email);
    expect(user).not.toBeNull();
    const { data } = await api.admin.mutation(
      'application-admin-api/ApplicationUserSessionsRevokeAll',
      { variables: { input: applicationUserInput(realm, user!.id) } },
    );
    expect(data.applicationMutation.applicationUserSessionsRevokeAll.userErrors).toEqual([]);
    expect(await introspect(request, realm, token)).toMatchObject({ active: false });
  });

  test('client disable invalidates only that client artifacts', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const emailA = uniqueEmail('client-a');
    const emailB = uniqueEmail('client-b');
    await expectSignUp(request, realms.a, emailA);
    await expectSignUp(request, realms.b, emailB);
    const tokenA = await issueAccessToken(page, request, realms.a, emailA);
    const tokenB = await issueAccessToken(page, request, realms.b, emailB);
    expect(await introspect(request, realms.a, tokenA)).toMatchObject({ active: true });
    expect(await introspect(request, realms.b, tokenB)).toMatchObject({ active: true });
    await setClientDisabled(api, realms.a, true);
    expect(await introspect(request, realms.a, tokenA)).toEqual({ active: false });
    expect(await introspect(request, realms.b, tokenB)).toMatchObject({ active: true });
    await withDb(async (sql) => {
      const [clientB] = await sql<{ disabled: boolean }[]>`
        select disabled from iam.application_oauth_client
        where application_id = ${realms.b.applicationId} and client_id = ${realms.b.clientId}
      `;
      expect(clientB?.disabled).toBe(false);
    });
  });

  test('application disable invalidates its realm without deleting users', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('realm-disable');
    await expectSignUp(request, realm, email);
    const token = await issueAccessToken(page, request, realm, email);
    expect(await introspect(request, realm, token)).toMatchObject({ active: true });
    await updatePolicy(realm, { realmEnabled: false });
    const response = await request.post(endpoint(realm, '/oauth2/introspect'), {
      headers: formHeaders(),
      form: { token, client_id: realm.clientId },
    });
    expect(response.status()).toBe(404);
    await withDb(async (sql) => {
      const [row] = await sql<{ count: number }[]>`
        select count(*)::int as count from iam.application_user
        where application_id = ${realm.applicationId}
      `;
      expect(row!.count).toBe(1);
    });
  });

  test('organization disable invalidates child realms without affecting other organizations', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const emailA = uniqueEmail('organization-a');
    const emailB = uniqueEmail('organization-b');
    await expectSignUp(request, realms.a, emailA);
    await expectSignUp(request, realms.b, emailB);
    const tokenA = await issueAccessToken(page, request, realms.a, emailA);
    const tokenB = await issueAccessToken(page, request, realms.b, emailB);
    expect(await introspect(request, realms.a, tokenA)).toMatchObject({ active: true });
    expect(await introspect(request, realms.b, tokenB)).toMatchObject({ active: true });
    await withDb(
      (sql) => sql`
        update iam.organization set deleted_at = now()
        where id = ${realms.a.organizationId}
      `,
    );
    const disabled = await request.post(endpoint(realms.a, '/oauth2/introspect'), {
      headers: formHeaders(),
      form: { token: tokenA, client_id: realms.a.clientId },
    });
    expect(disabled.status()).toBe(404);
    expect(await introspect(request, realms.b, tokenB)).toMatchObject({ active: true });
  });

  test('token family revoke preserves unrelated families according to policy', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const emailA = uniqueEmail('family-a');
    const emailB = uniqueEmail('family-b');
    await expectSignUp(request, realm, emailA);
    await expectSignUp(request, realm, emailB);
    const familyA = await issueTokens(page, request, realm, emailA);
    const familyB = await issueTokens(page, request, realm, emailB);
    expect(await introspect(request, realm, familyA.access_token)).toMatchObject({ active: true });
    expect(await introspect(request, realm, familyB.access_token)).toMatchObject({ active: true });
    const revoke = await request.post(endpoint(realm, '/oauth2/revoke'), {
      headers: formHeaders(),
      form: {
        token: familyA.refresh_token,
        token_type_hint: 'refresh_token',
        client_id: realm.clientId,
      },
    });
    expect(revoke.ok(), await revoke.text()).toBe(true);
    expect(await introspect(request, realm, familyA.access_token)).toEqual({ active: false });
    expect(await introspect(request, realm, familyB.access_token)).toMatchObject({ active: true });
  });

  test('revision fallback enforces invalidation when the event is lost', async () => {
    test.fixme(
      true,
      'E2E runtime needs a controllable invalidation transport to drop one event and observe the 30s revision fallback',
    );
  });

  test('database or cache timeout returns inactive outside allowed cache TTL', async () => {
    test.fixme(
      true,
      'E2E runtime needs controllable validation repository/cache failures and an injectable clock',
    );
  });

  test('unknown signing or encryption key version fails closed', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const token = unsignedJwt({
      iss: endpoint(realm, ''),
      aud: realm.resource,
      sub: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 600,
    }, 'unknown-key-version');
    expect(await introspect(request, realm, token)).toEqual({ active: false });
  });

  test('token missing a mandatory claim is inactive', async () => {
    test.fixme(
      true,
      'A signed E2E token factory is required; unsigned tokens only exercise signature rejection',
    );
  });

  test('userless or non-application actor token is inactive', async () => {
    test.fixme(
      true,
      'A signed E2E token factory is required to reach actor/sub validation after signature verification',
    );
  });

  test('expected application or audience mismatch is inactive despite valid signature', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('audience-mismatch');
    await expectSignUp(request, realms.a, email);
    const token = await issueAccessToken(page, request, realms.a, email);
    expect(await introspect(request, realms.a, token)).toMatchObject({ active: true });
    expect(await introspect(request, realms.b, token)).toEqual({ active: false });
  });

  test('external introspection response hides internal reason and tenant details', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const result = await introspect(request, realm, `invalid-${crypto.randomUUID()}`);
    expect(result).toEqual({ active: false });
    expect(JSON.stringify(result)).not.toMatch(
      /reason|application_id|organization_id|database|signature|cache/iu,
    );
  });
});

async function introspect(
  request: Parameters<typeof tokenRequest>[0],
  realm: Parameters<typeof tokenRequest>[1],
  token: string,
): Promise<Record<string, unknown>> {
  const response = await request.post(endpoint(realm, '/oauth2/introspect'), {
    headers: formHeaders(),
    form: {
      token,
      token_type_hint: 'access_token',
      client_id: realm.clientId,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json() as Promise<Record<string, unknown>>;
}

async function issueAccessToken(
  page: Page,
  request: Parameters<typeof tokenRequest>[0],
  realm: Parameters<typeof tokenRequest>[1],
  email: string,
): Promise<string> {
  return (await issueTokens(page, request, realm, email)).access_token;
}

async function issueTokens(
  page: Page,
  request: Parameters<typeof tokenRequest>[0],
  realm: Parameters<typeof tokenRequest>[1],
  email: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const verifier = crypto.randomUUID().replaceAll('-', '').repeat(2);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  await page.context().clearCookies();
  await page.goto(authorizeUrl(realm, { codeChallenge: challenge }));
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(defaultPassword);
  await page.locator('form[action="./login/password"] button').click();
  if (await page.locator('form[action="./consent"]').isVisible().catch(() => false)) {
    await page.locator('button[name="decision"][value="allow"]').click();
  }
  await page.waitForURL((url) => url.searchParams.has('code'));
  const code = new URL(page.url()).searchParams.get('code');
  const response = await tokenRequest(request, realm, {
    grant_type: 'authorization_code',
    code: code!,
    client_id: realm.clientId,
    redirect_uri: redirectUri(realm),
    code_verifier: verifier,
    resource: realm.resource,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as { access_token: string; refresh_token: string };
}

function unsignedJwt(claims: Record<string, unknown>, kid = 'e2e-invalid'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })).toString(
    'base64url',
  );
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.invalid-signature`;
}

function applicationUserInput(
  realm: Parameters<typeof tokenRequest>[1],
  userId: string,
): { organizationId: string; applicationId: string; userId: string } {
  return {
    organizationId: composeGlobalId('Organization', realm.organizationId),
    applicationId: composeGlobalId('Application', realm.applicationId),
    userId: composeGlobalId('ApplicationUser', userId),
  };
}

async function setApplicationUserStatus(
  api: Parameters<typeof createRealm>[0],
  realm: Parameters<typeof tokenRequest>[1],
  userId: string,
  action: 'block' | 'unblock',
): Promise<void> {
  const variables = { input: applicationUserInput(realm, userId) };
  if (action === 'block') {
    const { data } = await api.admin.mutation('application-admin-api/ApplicationUserBlock', {
      variables,
    });
    expect(data.applicationMutation.applicationUserBlock.userErrors).toEqual([]);
    return;
  }
  const { data } = await api.admin.mutation('application-admin-api/ApplicationUserUnblock', {
    variables,
  });
  expect(data.applicationMutation.applicationUserUnblock.userErrors).toEqual([]);
}
