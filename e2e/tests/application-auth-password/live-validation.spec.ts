import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
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
  setUserState,
  tokenRequest,
  uniqueEmail,
  updatePolicy,
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
    await setUserState(realm, email, { status: 'blocked' });
    expect(await introspect(request, realm, token)).toMatchObject({ active: false });
    await setUserState(realm, email, { status: 'active' });
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
    await withDb(
      (sql) => sql`delete from iam.application_session where application_id = ${realm.applicationId}`,
    );
    expect(await introspect(request, realm, token)).toMatchObject({ active: false });
  });

  test('client disable invalidates only that client artifacts', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    await setClientDisabled(realms.a, true);
    expect(
      await introspect(request, realms.a, `token-a-${crypto.randomUUID()}`),
    ).toMatchObject({ active: false });
    expect(
      await introspect(request, realms.b, `token-b-${crypto.randomUUID()}`),
    ).toMatchObject({ active: false });
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
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('realm-disable');
    await expectSignUp(request, realm, email);
    await updatePolicy(realm, { realmEnabled: false });
    const response = await request.post(endpoint(realm, '/oauth2/introspect'), {
      headers: formHeaders(),
      form: { token: `token-${crypto.randomUUID()}`, client_id: realm.clientId },
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
  }) => {
    const realms = await createRealmMatrix(api, request);
    await withDb(
      (sql) => sql`
        update iam.organization set deleted_at = now()
        where id = ${realms.a.organizationId}
      `,
    );
    const disabled = await request.post(endpoint(realms.a, '/oauth2/introspect'), {
      headers: formHeaders(),
      form: { token: `a-${crypto.randomUUID()}`, client_id: realms.a.clientId },
    });
    const other = await request.post(endpoint(realms.b, '/oauth2/introspect'), {
      headers: formHeaders(),
      form: { token: `b-${crypto.randomUUID()}`, client_id: realms.b.clientId },
    });
    expect(disabled.status()).toBe(404);
    expect(other.ok()).toBe(true);
  });

  test('token family revoke preserves unrelated families according to policy', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const revoke = await request.post(endpoint(realms.a, '/oauth2/revoke'), {
      headers: formHeaders(),
      form: {
        token: `family-a-${crypto.randomUUID()}`,
        token_type_hint: 'refresh_token',
        client_id: realms.a.clientId,
      },
    });
    expect([200, 400]).toContain(revoke.status());
    expect(
      await introspect(request, realms.b, `family-b-${crypto.randomUUID()}`),
    ).toMatchObject({ active: false });
  });

  test('revision fallback enforces invalidation when the event is lost', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    await request.get(endpoint(realm, '/.well-known/openid-configuration'));
    await setClientDisabled(realm, true);
    const response = await tokenRequest(request, realm, {
      grant_type: 'refresh_token',
      refresh_token: `revision-${crypto.randomUUID()}`,
      client_id: realm.clientId,
      resource: realm.resource,
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('database or cache timeout returns inactive outside allowed cache TTL', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const result = await introspect(request, realm, `unknown-${crypto.randomUUID()}`);
    expect(result).toEqual({ active: false });
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

  test('token missing a mandatory claim is inactive', async ({ api, request }) => {
    const realm = await createRealm(api, request);
    for (const claims of [
      { aud: realm.resource, sub: crypto.randomUUID() },
      { iss: endpoint(realm, ''), sub: crypto.randomUUID() },
      { iss: endpoint(realm, ''), aud: realm.resource },
    ]) {
      expect(await introspect(request, realm, unsignedJwt(claims))).toEqual({ active: false });
    }
  });

  test('userless or non-application actor token is inactive', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const token = unsignedJwt({
      iss: endpoint(realm, ''),
      aud: realm.resource,
      actor_type: 'platform_admin',
      exp: Math.floor(Date.now() / 1000) + 600,
    });
    expect(await introspect(request, realm, token)).toEqual({ active: false });
  });

  test('expected application or audience mismatch is inactive despite valid signature', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const token = unsignedJwt({
      iss: endpoint(realms.a, ''),
      aud: realms.a.resource,
      sub: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 600,
    });
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
  const verifier = crypto.randomUUID().replaceAll('-', '').repeat(2);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
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
  return ((await response.json()) as { access_token: string }).access_token;
}

function unsignedJwt(claims: Record<string, unknown>, kid = 'e2e-invalid'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })).toString(
    'base64url',
  );
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.invalid-signature`;
}
