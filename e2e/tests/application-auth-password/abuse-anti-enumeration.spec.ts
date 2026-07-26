import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  configureDelivery,
  createRealm,
  createRealmMatrix,
  endpoint,
  expectSecretFree,
  expectSignUp,
  invalidCredentials,
  requestPasswordReset,
  setUserState,
  signIn,
  uniqueEmail,
} from './application-auth-test-kit';

const wrongPassword = 'Wrong-password-123!';

test.describe('Application password auth — abuse and anti-enumeration', () => {
  test('password signin identity limit follows the safe baseline', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('identity-limit');
    await expectSignUp(request, realm, email);

    const responses = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(await signIn(request, realm, email, wrongPassword));
    }

    expect(responses.slice(0, 5).every((response) => response.status() === 401)).toBe(true);
    expect(responses[5]!.status()).toBe(429);
  });

  test('password signin IP limit covers attempts distributed across emails', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const responses = [];
    for (let attempt = 0; attempt < 31; attempt += 1) {
      responses.push(
        await signIn(request, realm, uniqueEmail(`distributed-${attempt}`), wrongPassword),
      );
    }

    expect(responses.some((response) => response.status() === 429)).toBe(true);
    expect(responses.at(-1)!.headers()['retry-after']).toBeTruthy();
  });

  test('email normalization variants cannot bypass identity limits', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const local = `Normalization-${crypto.randomUUID()}`;
    const email = `${local.toLowerCase()}@playwright.dev`;
    await expectSignUp(request, realm, email);
    const variants = [
      email,
      email.toUpperCase(),
      ` ${email} `,
      `${local}@PLAYWRIGHT.DEV`,
      email,
      email.toUpperCase(),
    ];

    const responses = [];
    for (const variant of variants) {
      responses.push(await signIn(request, realm, variant, wrongPassword));
    }

    expect(responses.at(-1)!.status()).toBe(429);
  });

  test('identity limiter quota is realm-scoped', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('realm-limit');
    await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
    ]);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await signIn(request, realms.a, email, wrongPassword)).status()).toBe(401);
    }

    const foreign = await signIn(request, realms.b, email, wrongPassword);

    expect(foreign.status()).toBe(401);
  });

  test('identity limiter backend key contains no raw email', async () => {
    test.fixme(
      true,
      'E2E runtime needs a queryable rate-limit adapter capture to inspect backend keys',
    );
  });

  test('shared limiter enforces one baseline across IAM replicas', async () => {
    test.fixme(
      true,
      'The current E2E runtime starts one IAM instance and cannot route attempts across replicas',
    );
  });

  test('password reset identity hourly limit is enforced', async ({
    api,
    request,
  }) => {
    const realm = await resetRealm(api, request);
    const email = uniqueEmail('reset-hour');
    await expectSignUp(request, realm, email);
    const responses = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      responses.push(await requestPasswordReset(request, realm, email));
    }

    expect(responses.slice(0, 3).every((response) => response.ok())).toBe(true);
    expect(responses[3]!.status()).toBe(429);
  });

  test('password reset IP/hour window is enforced across identities', async ({
    api,
    request,
  }) => {
    const realm = await resetRealm(api, request);
    const responses = [];
    for (let attempt = 0; attempt < 21; attempt += 1) {
      responses.push(
        await requestPasswordReset(request, realm, uniqueEmail(`reset-ip-${attempt}`)),
      );
    }

    expect(responses.some((response) => response.status() === 429)).toBe(true);
  });

  test('password reset identity/day window remains enforced after hourly rollover', async () => {
    test.fixme(true, 'E2E runtime needs an injectable limiter clock to cross window boundaries');
  });

  test('limited response is generic and provides the approved Retry-After', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('retry');
    await expectSignUp(request, realm, email);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await signIn(request, realm, email, wrongPassword);
    }

    const limited = await signIn(request, realm, email, wrongPassword);

    expect(limited.status()).toBe(429);
    expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
    expectSecretFree(await limited.text(), [email, wrongPassword]);
  });

  test('unavailable limiter makes reset fail closed without delivery', async () => {
    test.fixme(true, 'E2E runtime needs a controllable rate-limit adapter failure');
  });

  test('unavailable limiter never creates unlimited permissive signin', async () => {
    test.fixme(true, 'E2E runtime needs a controllable rate-limit adapter failure');
  });

  test('existing and absent identities have equivalent public failure contracts', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const existing = uniqueEmail('existing');
    await expectSignUp(request, realm, existing);

    const [wrong, absent] = await Promise.all([
      signIn(request, realm, existing, wrongPassword),
      signIn(request, realm, uniqueEmail('absent'), wrongPassword),
    ]);

    expect(wrong.status()).toBe(absent.status());
    expect(await wrong.json()).toEqual(invalidCredentials);
    expect(await absent.json()).toEqual(invalidCredentials);
  });

  test('existing and absent identities have no stable material timing distinction', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const existing = Array.from({ length: 10 }, () => uniqueEmail('timing-existing'));
    const absent = Array.from({ length: 10 }, () => uniqueEmail('timing-absent'));
    await Promise.all(existing.map((email) => expectSignUp(request, realm, email)));
    await request.get(endpoint(realm, '/login'));
    const existingDurations: number[] = [];
    const absentDurations: number[] = [];
    for (let index = 0; index < existing.length; index += 1) {
      existingDurations.push(await measureSignin(request, realm, existing[index]!, 1).then(first));
      absentDurations.push(await measureSignin(request, realm, absent[index]!, 1).then(first));
    }
    const existingMedian = median(existingDurations);
    const absentMedian = median(absentDurations);

    expect(Math.abs(existingMedian - absentMedian)).toBeLessThan(50);
    expect(Math.max(existingMedian, absentMedian) / Math.min(existingMedian, absentMedian)).toBeLessThan(
      1.2,
    );
  });

  test('blocked, disabled, and unverified state is not over-disclosed', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const blocked = uniqueEmail('blocked');
    const unverified = uniqueEmail('unverified');
    await Promise.all([
      expectSignUp(request, realm, blocked),
      expectSignUp(request, realm, unverified),
    ]);
    await setUserState(realm, blocked, { status: 'blocked' });
    await setUserState(realm, unverified, { emailVerified: false });

    const responses = await Promise.all([
      signIn(request, realm, blocked),
      signIn(request, realm, unverified, wrongPassword),
      signIn(request, realm, uniqueEmail('missing'), wrongPassword),
    ]);

    expect(responses.map((response) => response.status())).toEqual([401, 401, 401]);
    expect(await responses[0]!.json()).toEqual(invalidCredentials);
    expect(await responses[1]!.json()).toEqual(invalidCredentials);
    expect(await responses[2]!.json()).toEqual(invalidCredentials);
  });

  test('parallel brute force cannot exceed limits through races', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('parallel');
    await expectSignUp(request, realm, email);

    const responses = await Promise.all(
      Array.from({ length: 50 }, () => signIn(request, realm, email, wrongPassword)),
    );

    expect(responses.filter((response) => response.status() === 401)).toHaveLength(5);
    expect(responses.filter((response) => response.status() === 429)).toHaveLength(45);
  });

  test('successful signin cannot reset independent abuse counters as a bypass', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('success-bypass');
    await expectSignUp(request, realm, email);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect((await signIn(request, realm, email, wrongPassword)).status()).toBe(401);
    }
    expect((await signIn(request, realm, email)).ok()).toBe(true);

    expect((await signIn(request, realm, email, wrongPassword)).status()).toBe(429);
  });
});

async function resetRealm(
  api: Parameters<typeof createRealm>[0],
  request: Parameters<typeof createRealm>[1],
) {
  const realm = await createRealm(api, request, undefined, 'abuse-reset', {
    passwordResetEnabled: true,
  });
  await configureDelivery(realm, 'abuse-reset');
  return realm;
}

async function measureSignin(
  request: Parameters<typeof signIn>[0],
  realm: Parameters<typeof signIn>[1],
  email: string,
  attempts: number,
): Promise<number[]> {
  const durations = [];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const startedAt = performance.now();
    await signIn(request, realm, email, wrongPassword);
    durations.push(performance.now() - startedAt);
  }
  return durations;
}

function median(values: number[]): number {
  return [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)]!;
}

function first(values: number[]): number {
  return values[0]!;
}
