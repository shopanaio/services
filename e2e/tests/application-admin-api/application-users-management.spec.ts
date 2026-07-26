import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';
import postgres from 'postgres';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:15432/portal';
const PASSWORD_HASH = 'sensitive-password-hash';
const PROVIDER_ACCESS_TOKEN = 'sensitive-provider-access-token';
const PROVIDER_REFRESH_TOKEN = 'sensitive-provider-refresh-token';
const PROVIDER_ID_TOKEN = 'sensitive-provider-id-token';
const APPLICATION_PASSWORD = 'Application-user-password-123!';
const IAM_HTTP_URL = process.env.IAM_HTTP_URL ?? 'http://127.0.0.1:11010';
const ADMIN_GRAPHQL_URL = process.env.ADMIN_GRAPHQL_URL ?? 'http://127.0.0.1:14001/graphql';

type Sql = ReturnType<typeof postgres>;
type Api = ApiFixtures['api'];

interface ApplicationScope {
  organizationId: string;
  applicationA: ApplicationRef;
  applicationB: ApplicationRef;
}

interface ApplicationRef {
  id: string;
  rawId: string;
}

interface SeededUser {
  id: string;
  globalId: string;
  applicationId: string;
  email: string;
  accountIds: string[];
  accountGlobalIds: string[];
  sessionTokens: string[];
}

interface SeedUserInput {
  id?: string;
  email?: string;
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified?: boolean;
  status?: 'active' | 'blocked';
  createdAt?: Date;
  accounts?: string[];
  sessionCount?: number;
}

test.describe('Application Admin API - application user management', () => {
  let sql: Sql;
  let scope: ApplicationScope;

  test.beforeEach(async ({ api }) => {
    sql = postgres(
      process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
      { max: 1 },
    );
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    scope = {
      organizationId: organization.id,
      applicationA: await createApplication(api, organization.id, 'a'),
      applicationB: await createApplication(api, organization.id, 'b'),
    };
  });

  test.afterEach(async () => {
    await sql.end();
  });

  test('admin can list application users inside one application only', async ({
    api,
  }) => {
    const userA = await seedUser(sql, scope.applicationA, {
      email: uniqueEmail('list-a'),
    });
    const userB = await seedUser(sql, scope.applicationB, {
      email: uniqueEmail('list-b'),
    });

    const connection = await listUsers(api, scope);

    expect(connection.totalCount).toBe(1);
    expect(connection.edges.map(({ node }) => node.id)).toEqual([userA.globalId]);
    expect(connection.edges.map(({ node }) => node.id)).not.toContain(userB.globalId);
    expect(connection.edges[0]?.node.applicationId).toBe(scope.applicationA.id);
  });

  test('application user connection filters by status and search without leaking users from another realm', async ({
    api,
  }) => {
    const match = await seedUser(sql, scope.applicationA, {
      name: 'Blocked Search Match',
      email: uniqueEmail('match'),
      status: 'blocked',
    });
    await seedUser(sql, scope.applicationA, {
      name: 'Active Search Match',
      email: uniqueEmail('active'),
    });
    await seedUser(sql, scope.applicationB, {
      name: 'Blocked Search Match',
      email: uniqueEmail('foreign'),
      status: 'blocked',
    });

    const connection = await listUsers(api, scope, {
      where: { search: 'search match', status: ['BLOCKED'] },
    });

    expect(connection.totalCount).toBe(1);
    expect(connection.edges.map(({ node }) => node.id)).toEqual([match.globalId]);
    expect(connection.edges[0]?.node.status).toBe('BLOCKED');
  });

  test('application user connection ordering and cursor pagination are stable', async ({
    api,
  }) => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const alpha = await seedUser(sql, scope.applicationA, {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Same Name',
      email: uniqueEmail('alpha'),
      createdAt,
    });
    const beta = await seedUser(sql, scope.applicationA, {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Same Name',
      email: uniqueEmail('beta'),
      createdAt,
    });
    const gamma = await seedUser(sql, scope.applicationA, {
      id: '00000000-0000-4000-8000-000000000003',
      name: 'Same Name',
      email: uniqueEmail('gamma'),
      createdAt,
    });

    const firstPage = await listUsers(api, scope, {
      first: 2,
      orderBy: [{ field: 'NAME', direction: 'asc' }],
    });
    const secondPage = await listUsers(api, scope, {
      first: 2,
      after: firstPage.pageInfo.endCursor,
      orderBy: [{ field: 'NAME', direction: 'asc' }],
    });
    const repeatedFirstPage = await listUsers(api, scope, {
      first: 2,
      orderBy: [{ field: 'NAME', direction: 'asc' }],
    });
    const backwardPage = await listUsers(api, scope, {
      last: 2,
      before: required(secondPage.edges[0], 'second-page edge').cursor,
      orderBy: [{ field: 'NAME', direction: 'asc' }],
    });

    expect(firstPage.edges.map(({ node }) => node.id)).toEqual([alpha.globalId, beta.globalId]);
    expect(firstPage.pageInfo.hasNextPage).toBe(true);
    expect(secondPage.edges.map(({ node }) => node.id)).toEqual([gamma.globalId]);
    expect(backwardPage.edges.map(({ node }) => node.id)).toEqual([alpha.globalId, beta.globalId]);
    expect(backwardPage.pageInfo.hasPreviousPage).toBe(false);
    expect(new Set([...firstPage.edges, ...secondPage.edges].map(({ node }) => node.id)).size).toBe(
      3,
    );
    expect(repeatedFirstPage.edges.map(({ cursor }) => cursor)).toEqual(
      firstPage.edges.map(({ cursor }) => cursor),
    );
  });

  test('admin can get one application user by global ID only within the selected application', async ({
    api,
  }) => {
    const seeded = await seedUser(sql, scope.applicationA, {
      name: 'One User',
      email: uniqueEmail('get'),
      accounts: ['credential', 'google'],
      sessionCount: 1,
    });

    const user = await getUser(api, scope, seeded.globalId);

    expect(user).toMatchObject({
      id: seeded.globalId,
      applicationId: scope.applicationA.id,
      name: 'One User',
      email: seeded.email,
      status: 'ACTIVE',
      security: {
        activeSessionCount: 1,
        linkedAccountCount: 1,
        hasPasswordLogin: true,
      },
    });
  });

  test('get user with ID from another application returns null or safe not-found without revealing existence', async ({
    api,
  }) => {
    const foreign = await seedUser(sql, scope.applicationB, {
      email: uniqueEmail('foreign-get'),
    });

    const result = await api.admin.query('application-admin-api/ApplicationUser', {
      variables: {
        organizationId: scope.organizationId,
        applicationId: scope.applicationA.id,
        userId: foreign.globalId,
      },
      throwOnError: false,
    });
    const missingResult = await api.admin.query('application-admin-api/ApplicationUser', {
      variables: {
        organizationId: scope.organizationId,
        applicationId: scope.applicationA.id,
        userId: composeGlobalId('ApplicationUser', crypto.randomUUID()),
      },
      throwOnError: false,
    });

    expect(result.data?.applicationQuery?.application?.user ?? null).toBeNull();
    expect(notFoundSignature(result)).toEqual(notFoundSignature(missingResult));
    expect(JSON.stringify(result)).not.toContain(foreign.email);
    expect(JSON.stringify(result)).not.toContain(scope.applicationB.rawId);
  });

  test('application user response exposes security metadata without password hash, OTP, session token, or refresh token', async ({
    api,
    request,
  }) => {
    const seeded = await seedUser(sql, scope.applicationA, {
      email: uniqueEmail('safe-response'),
      accounts: ['credential', 'google'],
      sessionCount: 1,
    });

    const user = await getUser(api, scope, seeded.globalId);
    const schema = await readApplicationUserSchema(request, api);
    const serialized = JSON.stringify(user);

    expect(user?.security).toEqual({
      activeSessionCount: 1,
      linkedAccountCount: 1,
      hasPasswordLogin: true,
    });
    expect(serialized).not.toContain(PASSWORD_HASH);
    expect(serialized).not.toContain(PROVIDER_ACCESS_TOKEN);
    expect(serialized).not.toContain(PROVIDER_REFRESH_TOKEN);
    expect(serialized).not.toContain(PROVIDER_ID_TOKEN);
    expect(serialized).not.toContain(required(seeded.sessionTokens[0], 'seeded session token'));
    expect(Object.keys(user ?? {})).toEqual(
      expect.not.arrayContaining([
        'password',
        'passwordHash',
        'otp',
        'sessionToken',
        'refreshToken',
      ]),
    );
    expect(schema.applicationUser?.fields.map(({ name }) => name)).toEqual([
      'id',
      'applicationId',
      'name',
      'firstName',
      'lastName',
      'email',
      'emailVerified',
      'imageUrl',
      'status',
      'security',
      'linkedAccounts',
      'createdAt',
      'updatedAt',
    ]);
    expect(schema.applicationUserSecurityMetadata?.fields.map(({ name }) => name)).toEqual([
      'activeSessionCount',
      'linkedAccountCount',
      'hasPasswordLogin',
    ]);
  });

  test('block user prevents new signin and immediately invalidates an existing application session', async ({
    api,
    request,
  }) => {
    await configurePasswordAuth(sql, scope.applicationA);
    const email = uniqueEmail('block');
    const signup = await signUpApplicationUser(request, scope.applicationA, email);
    const existingCookie = applicationSessionCookie(signup, scope.applicationA.rawId);
    const seeded = await readSeededUserByEmail(sql, scope.applicationA, email);
    await expectApplicationSessionActive(request, scope.applicationA, existingCookie);

    const payload = await blockUser(api, scope, seeded.globalId);
    const persisted = await readUserState(sql, seeded);
    const blockedSignin = await signInApplicationUser(
      request,
      scope.applicationA,
      email,
      APPLICATION_PASSWORD,
    );

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.user).toMatchObject({
      id: seeded.globalId,
      status: 'BLOCKED',
      security: { activeSessionCount: 0 },
    });
    expect(persisted).toEqual({ status: 'blocked', sessionCount: 0 });
    await expectApplicationSessionInactive(request, scope.applicationA, existingCookie);
    expect(blockedSignin.status()).toBe(401);
    expect(await blockedSignin.json()).toEqual({
      error: 'invalid_credentials',
      error_description: 'Email or password is invalid',
    });
  });

  test('unblock user permits a new signin without reviving the revoked session', async ({
    api,
    request,
  }) => {
    await configurePasswordAuth(sql, scope.applicationA);
    const email = uniqueEmail('unblock');
    const signup = await signUpApplicationUser(request, scope.applicationA, email);
    const revokedCookie = applicationSessionCookie(signup, scope.applicationA.rawId);
    const seeded = await readSeededUserByEmail(sql, scope.applicationA, email);
    await blockUser(api, scope, seeded.globalId);

    const payload = await unblockUser(api, scope, seeded.globalId);
    const signin = await signInApplicationUser(
      request,
      scope.applicationA,
      email,
      APPLICATION_PASSWORD,
    );
    expect(signin.ok(), await signin.text()).toBe(true);
    const newCookie = applicationSessionCookie(signin, scope.applicationA.rawId);
    const persisted = await readUserState(sql, seeded);

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.user).toMatchObject({
      status: 'ACTIVE',
      security: { activeSessionCount: 0 },
    });
    expect(newCookie).not.toBe(revokedCookie);
    await expectApplicationSessionInactive(request, scope.applicationA, revokedCookie);
    await expectApplicationSessionActive(request, scope.applicationA, newCookie);
    expect(persisted).toEqual({ status: 'active', sessionCount: 1 });
  });

  test('block user in application A does not affect same-email user in application B', async ({
    api,
  }) => {
    const email = uniqueEmail('shared');
    const userA = await seedUser(sql, scope.applicationA, {
      email,
      accounts: ['credential'],
      sessionCount: 1,
    });
    const userB = await seedUser(sql, scope.applicationB, {
      email,
      accounts: ['credential'],
      sessionCount: 1,
    });

    await blockUser(api, scope, userA.globalId);

    expect(await readUserState(sql, userA)).toEqual({
      status: 'blocked',
      sessionCount: 0,
    });
    expect(await readUserState(sql, userB)).toEqual({
      status: 'active',
      sessionCount: 1,
    });
  });

  test('revoke all sessions revokes only sessions in the target application', async ({
    api,
  }) => {
    const userA = await seedUser(sql, scope.applicationA, {
      email: uniqueEmail('revoke-a'),
      sessionCount: 2,
    });
    const userB = await seedUser(sql, scope.applicationB, {
      email: uniqueEmail('revoke-b'),
      sessionCount: 2,
    });

    const payload = await revokeAllSessions(api, scope, userA.globalId);

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.revokedCount).toBe(2);
    expect(await readUserState(sql, userA)).toEqual({
      status: 'active',
      sessionCount: 0,
    });
    expect(await readUserState(sql, userB)).toEqual({
      status: 'active',
      sessionCount: 2,
    });
  });

  test('revoke all sessions returns accurate revoked count and is idempotent', async ({
    api,
  }) => {
    const seeded = await seedUser(sql, scope.applicationA, {
      email: uniqueEmail('revoke-count'),
      sessionCount: 3,
    });

    const first = await revokeAllSessions(api, scope, seeded.globalId);
    const second = await revokeAllSessions(api, scope, seeded.globalId);

    expect(first.userErrors).toHaveLength(0);
    expect(first.revokedCount).toBe(3);
    expect(second.userErrors).toHaveLength(0);
    expect(second.revokedCount).toBe(0);
    expect(await countSessions(sql, seeded)).toBe(0);
  });

  test('linked account list shows provider/account metadata without encrypted provider tokens', async ({
    api,
    request,
  }) => {
    const seeded = await seedUser(sql, scope.applicationA, {
      email: uniqueEmail('linked-list'),
      accounts: ['credential', 'google', 'github'],
    });

    const user = await getUser(api, scope, seeded.globalId);
    const schema = await readApplicationUserSchema(request, api);
    const serialized = JSON.stringify(user?.linkedAccounts);

    expect(user?.linkedAccounts.map(({ provider }) => provider)).toEqual(['github', 'google']);
    expect(user?.linkedAccounts.every(({ id }) => id.length > 0)).toBe(true);
    expect(serialized).not.toContain(PROVIDER_ACCESS_TOKEN);
    expect(serialized).not.toContain(PROVIDER_REFRESH_TOKEN);
    expect(serialized).not.toContain(PROVIDER_ID_TOKEN);
    expect(Object.keys(user?.linkedAccounts[0] ?? {})).toEqual(
      expect.not.arrayContaining(['accountId', 'accessToken', 'refreshToken', 'idToken']),
    );
    expect(schema.applicationUserLinkedAccount?.fields.map(({ name }) => name)).toEqual([
      'id',
      'provider',
      'isOnlyLoginMethod',
      'createdAt',
      'updatedAt',
    ]);
  });

  test('unlink account removes only the selected account in the target application', async ({
    api,
  }) => {
    const seeded = await seedUser(sql, scope.applicationA, {
      email: uniqueEmail('unlink'),
      accounts: ['credential', 'google', 'github'],
    });
    const googleIndex = 1;

    const payload = await unlinkAccount(
      api,
      scope,
      seeded.globalId,
      required(seeded.accountGlobalIds[googleIndex], 'seeded Google account'),
    );

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.unlinkedAccountId).toBe(seeded.accountGlobalIds[googleIndex]);
    expect(payload.user?.linkedAccounts.map(({ provider }) => provider)).toEqual(['github']);
    expect(await readAccountProviders(sql, seeded)).toEqual(['credential', 'github']);
  });

  test('unlink account from another application is rejected without changing either realm', async ({
    api,
  }) => {
    const userA = await seedUser(sql, scope.applicationA, {
      email: uniqueEmail('unlink-a'),
      accounts: ['credential', 'google'],
    });
    const userB = await seedUser(sql, scope.applicationB, {
      email: uniqueEmail('unlink-b'),
      accounts: ['credential', 'github'],
    });

    const payload = await unlinkAccount(
      api,
      scope,
      userA.globalId,
      required(userB.accountGlobalIds[1], 'foreign linked account'),
    );

    expect(payload.user).toBeNull();
    expect(payload.unlinkedAccountId).toBeNull();
    expect(payload.userErrors).toEqual([
      expect.objectContaining({ code: 'APPLICATION_USER_ACCOUNT_NOT_FOUND' }),
    ]);
    expect(await readAccountProviders(sql, userA)).toEqual(['credential', 'google']);
    expect(await readAccountProviders(sql, userB)).toEqual(['credential', 'github']);
  });

  test('unlink cannot remove the last usable sign-in method for the user', async ({
    api,
  }) => {
    const seeded = await seedUser(sql, scope.applicationA, {
      email: uniqueEmail('last-method'),
      accounts: ['google'],
    });

    const payload = await unlinkAccount(
      api,
      scope,
      seeded.globalId,
      required(seeded.accountGlobalIds[0], 'last linked account'),
    );

    expect(payload.user).toBeNull();
    expect(payload.unlinkedAccountId).toBeNull();
    expect(payload.userErrors).toEqual([expect.objectContaining({ code: 'LAST_LOGIN_METHOD' })]);
    expect(await readAccountProviders(sql, seeded)).toEqual(['google']);
  });

  test('application user admin operations require org.application-users permissions', async ({
    api,
  }) => {
    const seeded = await seedUser(sql, scope.applicationA, {
      email: uniqueEmail('permission'),
      sessionCount: 1,
    });
    const ownerToken = api.session.tenant.accessToken;
    const ownerId = api.session.tenant.userId;
    const member = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId: scope.organizationId,
          email: member.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });
    api.session.tenant.accessToken = member.accessToken;
    api.session.tenant.userId = member.userId;

    try {
      expect(
        await checkOrgPermission(api, scope.organizationId, 'org.application-users', 'read'),
      ).toBe(false);
      expect(
        await checkOrgPermission(api, scope.organizationId, 'org.application-users', 'write'),
      ).toBe(false);
      const read = await api.admin.query('application-admin-api/ApplicationUsers', {
        variables: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
          first: 10,
        },
        throwOnError: false,
      });
      const write = await api.admin.mutation('application-admin-api/ApplicationUserBlock', {
        variables: { input: userMutationInput(scope, seeded.globalId) },
        throwOnError: false,
      });

      expect(read.data?.applicationQuery?.application ?? null).toBeNull();
      expect(JSON.stringify(read)).not.toContain(seeded.email);
      expect(write.data?.applicationMutation.applicationUserBlock).toMatchObject({
        user: null,
        userErrors: [expect.objectContaining({ code: 'FORBIDDEN' })],
      });
      expect(await readUserState(sql, seeded)).toEqual({
        status: 'active',
        sessionCount: 1,
      });
    } finally {
      api.session.tenant.accessToken = ownerToken;
      api.session.tenant.userId = ownerId;
    }
  });

  test('block mutation writes a safe audit record without email, tokens, or account secrets', async ({
    api,
  }) => {
    const seeded = await seedUser(sql, scope.applicationA, {
      email: uniqueEmail('audit'),
      accounts: ['credential', 'google'],
      sessionCount: 1,
    });

    await blockUser(api, scope, seeded.globalId);
    const [audit] = await sql<
      {
        action: string;
        outcome: string;
        actorType: string;
        organizationId: string;
        applicationId: string;
        targetId: string;
        safeDiff: Record<string, unknown>;
      }[]
    >`
      SELECT
        action,
        outcome,
        actor_type AS "actorType",
        organization_id::text AS "organizationId",
        application_id::text AS "applicationId",
        target_id AS "targetId",
        safe_diff_json AS "safeDiff"
      FROM iam.application_auth_admin_audit
      WHERE application_id = ${scope.applicationA.rawId}::uuid
        AND target_id = ${seeded.id}
        AND action = 'application_user_block'
      ORDER BY occurred_at DESC
      LIMIT 1
    `;
    const serialized = JSON.stringify(audit);

    expect(audit).toMatchObject({
      action: 'application_user_block',
      outcome: 'success',
      actorType: 'platform_admin',
      organizationId: decodeGlobalId(scope.organizationId).id,
      applicationId: scope.applicationA.rawId,
      targetId: seeded.id,
      safeDiff: {
        status: 'blocked',
        changedFields: ['status'],
      },
    });
    expect(serialized).not.toContain(seeded.email);
    expect(serialized).not.toContain(PASSWORD_HASH);
    expect(serialized).not.toContain(PROVIDER_ACCESS_TOKEN);
    expect(serialized).not.toContain(PROVIDER_REFRESH_TOKEN);
    expect(serialized).not.toContain(required(seeded.sessionTokens[0], 'seeded session token'));
  });

  test('application user admin API rejects a valid application session as an administrative actor', async ({
    api,
    request,
  }) => {
    await configurePasswordAuth(sql, scope.applicationA);
    const email = uniqueEmail('public-actor');
    const signup = await signUpApplicationUser(request, scope.applicationA, email);
    const cookie = applicationSessionCookie(signup, scope.applicationA.rawId);
    const seeded = await readSeededUserByEmail(sql, scope.applicationA, email);
    await expectApplicationSessionActive(request, scope.applicationA, cookie);
    const ownerToken = api.session.tenant.accessToken;
    api.session.tenant.accessToken = required(
      seeded.sessionTokens[0],
      'real application session token',
    );

    try {
      const result = await api.admin.query('application-admin-api/ApplicationUsers', {
        variables: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
          first: 10,
        },
        throwOnError: false,
      });

      expect(result.data?.applicationQuery?.application ?? null).toBeNull();
      expect(result.errors?.length ?? 0).toBeGreaterThan(0);
      expect(JSON.stringify(result)).not.toContain(seeded.email);
      await expectApplicationSessionActive(request, scope.applicationA, cookie);
    } finally {
      api.session.tenant.accessToken = ownerToken;
    }
  });
});

async function createApplication(
  api: Api,
  organizationId: string,
  suffix: string,
): Promise<ApplicationRef> {
  const unique = crypto.randomUUID();
  const { data } = await api.admin.mutation('application-admin-api/ApplicationCreate', {
    variables: {
      input: {
        organizationId,
        name: `users-${suffix}-${unique}`,
        displayName: `Application users ${suffix}`,
      },
    },
  });
  const payload = data.applicationMutation.applicationCreate;
  expect(payload.userErrors).toHaveLength(0);
  expect(payload.application).not.toBeNull();
  const id = required(payload.application, 'created application').id;
  return { id, rawId: decodeGlobalId(id).id };
}

async function seedUser(
  sql: Sql,
  application: ApplicationRef,
  input: SeedUserInput = {},
): Promise<SeededUser> {
  const id = input.id ?? crypto.randomUUID();
  const email = input.email ?? uniqueEmail('user');
  const createdAt = input.createdAt ?? new Date();
  const accounts = input.accounts ?? [];
  const sessionCount = input.sessionCount ?? 0;

  await sql`
    INSERT INTO iam.application_user (
      id,
      application_id,
      name,
      first_name,
      last_name,
      email,
      email_verified,
      status,
      created_at,
      updated_at
    )
    VALUES (
      ${id},
      ${application.rawId}::uuid,
      ${input.name ?? email},
      ${input.firstName ?? 'Application'},
      ${input.lastName ?? 'User'},
      ${email},
      ${input.emailVerified ?? true},
      ${input.status ?? 'active'},
      ${createdAt},
      ${createdAt}
    )
  `;

  const accountIds: string[] = [];
  for (const [index, provider] of accounts.entries()) {
    const accountId = crypto.randomUUID();
    accountIds.push(accountId);
    await sql`
      INSERT INTO iam.application_account (
        id,
        application_id,
        user_id,
        account_id,
        provider_id,
        access_token,
        refresh_token,
        id_token,
        password,
        created_at,
        updated_at
      )
      VALUES (
        ${accountId},
        ${application.rawId}::uuid,
        ${id},
        ${`${provider}-${id}`},
        ${provider},
        ${provider === 'credential' ? null : `${PROVIDER_ACCESS_TOKEN}-${index}`},
        ${provider === 'credential' ? null : `${PROVIDER_REFRESH_TOKEN}-${index}`},
        ${provider === 'credential' ? null : `${PROVIDER_ID_TOKEN}-${index}`},
        ${provider === 'credential' ? PASSWORD_HASH : null},
        ${createdAt},
        ${createdAt}
      )
    `;
  }

  const sessionTokens: string[] = [];
  for (let index = 0; index < sessionCount; index += 1) {
    const sessionId = crypto.randomUUID();
    const token = `application-session-${crypto.randomUUID()}`;
    sessionTokens.push(token);
    await sql`
      INSERT INTO iam.application_session (
        id,
        application_id,
        user_id,
        token,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (
        ${sessionId},
        ${application.rawId}::uuid,
        ${id},
        ${token},
        now() + interval '1 hour',
        ${createdAt},
        ${createdAt}
      )
    `;
  }

  return {
    id,
    globalId: composeGlobalId('ApplicationUser', id),
    applicationId: application.rawId,
    email,
    accountIds,
    accountGlobalIds: accountIds.map((accountId) =>
      composeGlobalId('ApplicationUserLinkedAccount', accountId),
    ),
    sessionTokens,
  };
}

async function configurePasswordAuth(sql: Sql, application: ApplicationRef): Promise<void> {
  await sql`
    UPDATE iam.application_auth_configuration
    SET realm_enabled = true,
        registration_mode = 'open',
        password_sign_in_enabled = true,
        password_sign_up_enabled = true,
        password_reset_enabled = false,
        email_verification_required = false,
        revision = revision + 1,
        updated_at = now()
    WHERE application_id = ${application.rawId}::uuid
  `;
  await sql`
    INSERT INTO iam.application_auth_origin (application_id, origin)
    VALUES (${application.rawId}::uuid, ${IAM_HTTP_URL})
    ON CONFLICT (application_id, origin) DO NOTHING
  `;
}

async function signUpApplicationUser(
  request: APIRequestContext,
  application: ApplicationRef,
  email: string,
): Promise<APIResponse> {
  const response = await request.post(applicationAuthEndpoint(application, '/sign-up/email'), {
    headers: applicationAuthHeaders(),
    data: {
      name: 'Application User',
      email,
      password: APPLICATION_PASSWORD,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response;
}

function signInApplicationUser(
  request: APIRequestContext,
  application: ApplicationRef,
  email: string,
  password: string,
): Promise<APIResponse> {
  return request.post(applicationAuthEndpoint(application, '/sign-in/email'), {
    headers: applicationAuthHeaders(),
    data: { email, password },
  });
}

async function expectApplicationSessionActive(
  request: APIRequestContext,
  application: ApplicationRef,
  cookie: string,
): Promise<void> {
  const response = await request.get(
    applicationAuthEndpoint(application, '/account/connections'),
    {
      headers: { accept: 'text/html', cookie },
    },
  );
  const body = await response.text();
  expect(response.ok(), body).toBe(true);
  expect(body).toContain('<!doctype html>');
}

async function expectApplicationSessionInactive(
  request: APIRequestContext,
  application: ApplicationRef,
  cookie: string,
): Promise<void> {
  const response = await request.get(
    applicationAuthEndpoint(application, '/account/connections'),
    {
      headers: { accept: 'text/html', cookie },
    },
  );
  const body = await response.text();
  expect(response.status(), body).toBe(400);
  expect(body).toContain('Authentication unavailable');
}

function applicationAuthEndpoint(application: ApplicationRef, path: string): string {
  return `${IAM_HTTP_URL}/auth/applications/${application.rawId}${path}`;
}

function applicationAuthHeaders(): Record<string, string> {
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    origin: IAM_HTTP_URL,
  };
}

function applicationSessionCookie(response: APIResponse, applicationId: string): string {
  const cookie = response
    .headersArray()
    .filter(({ name }) => name.toLowerCase() === 'set-cookie')
    .map(({ value }) => value.split(';', 1)[0]!)
    .find((value) => value.includes(`shopana_application_${applicationId}.session_token`));
  return required(cookie, 'application session cookie');
}

async function readSeededUserByEmail(
  sql: Sql,
  application: ApplicationRef,
  email: string,
): Promise<SeededUser> {
  const [user] = await sql<{ id: string; email: string }[]>`
    SELECT id, email
    FROM iam.application_user
    WHERE application_id = ${application.rawId}::uuid
      AND email = ${email}
  `;
  const found = required(user, 'application user created through signup');
  const accounts = await sql<{ id: string }[]>`
    SELECT id
    FROM iam.application_account
    WHERE application_id = ${application.rawId}::uuid
      AND user_id = ${found.id}
    ORDER BY id
  `;
  const sessions = await sql<{ token: string }[]>`
    SELECT token
    FROM iam.application_session
    WHERE application_id = ${application.rawId}::uuid
      AND user_id = ${found.id}
    ORDER BY created_at, id
  `;
  return {
    id: found.id,
    globalId: composeGlobalId('ApplicationUser', found.id),
    applicationId: application.rawId,
    email: found.email,
    accountIds: accounts.map(({ id }) => id),
    accountGlobalIds: accounts.map(({ id }) => composeGlobalId('ApplicationUserLinkedAccount', id)),
    sessionTokens: sessions.map(({ token }) => token),
  };
}

async function readApplicationUserSchema(request: APIRequestContext, api: Api) {
  const response = await request.post(ADMIN_GRAPHQL_URL, {
    headers: {
      authorization: `Bearer ${required(api.session.tenant.accessToken, 'admin access token')}`,
      'content-type': 'application/json',
      'x-organization-id': required(api.session.organizationId, 'organization ID'),
    },
    data: {
      query: `
        query ApplicationAdminApplicationUserSchema {
          applicationUser: __type(name: "ApplicationUser") {
            fields { name }
          }
          applicationUserSecurityMetadata: __type(name: "ApplicationUserSecurityMetadata") {
            fields { name }
          }
          applicationUserLinkedAccount: __type(name: "ApplicationUserLinkedAccount") {
            fields { name }
          }
        }
      `,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const result = (await response.json()) as {
    data?: {
      applicationUser: { fields: Array<{ name: string }> } | null;
      applicationUserSecurityMetadata: { fields: Array<{ name: string }> } | null;
      applicationUserLinkedAccount: { fields: Array<{ name: string }> } | null;
    };
    errors?: Array<{ message: string }>;
  };
  expect(result.errors).toBeUndefined();
  return required(result.data, 'application user schema introspection');
}

async function checkOrgPermission(
  api: Api,
  organizationId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  const { data } = await api.admin.query('roles-api/Authorize', {
    variables: {
      input: {
        organizationId,
        domain: 'org',
        resource,
        action,
      },
    },
  });
  return (
    data as unknown as {
      userQuery: { authorize: { allowed: boolean } };
    }
  ).userQuery.authorize.allowed;
}

async function listUsers(
  api: Api,
  scope: ApplicationScope,
  variables: Record<string, unknown> = {},
) {
  const defaultPagination = 'first' in variables || 'last' in variables ? {} : { first: 20 };
  const { data } = await api.admin.query('application-admin-api/ApplicationUsers', {
    variables: {
      organizationId: scope.organizationId,
      applicationId: scope.applicationA.id,
      ...defaultPagination,
      ...variables,
    },
  });
  const application = data.applicationQuery.application;
  expect(application).not.toBeNull();
  return required(application, 'application users connection').users;
}

async function getUser(api: Api, scope: ApplicationScope, userId: string) {
  const { data } = await api.admin.query('application-admin-api/ApplicationUser', {
    variables: {
      organizationId: scope.organizationId,
      applicationId: scope.applicationA.id,
      userId,
    },
  });
  return data.applicationQuery.application?.user ?? null;
}

async function blockUser(api: Api, scope: ApplicationScope, userId: string) {
  const { data } = await api.admin.mutation('application-admin-api/ApplicationUserBlock', {
    variables: { input: userMutationInput(scope, userId) },
  });
  return data.applicationMutation.applicationUserBlock;
}

async function unblockUser(api: Api, scope: ApplicationScope, userId: string) {
  const { data } = await api.admin.mutation('application-admin-api/ApplicationUserUnblock', {
    variables: { input: userMutationInput(scope, userId) },
  });
  return data.applicationMutation.applicationUserUnblock;
}

async function revokeAllSessions(api: Api, scope: ApplicationScope, userId: string) {
  const { data } = await api.admin.mutation(
    'application-admin-api/ApplicationUserSessionsRevokeAll',
    { variables: { input: userMutationInput(scope, userId) } },
  );
  return data.applicationMutation.applicationUserSessionsRevokeAll;
}

async function unlinkAccount(api: Api, scope: ApplicationScope, userId: string, accountId: string) {
  const { data } = await api.admin.mutation('application-admin-api/ApplicationUserAccountUnlink', {
    variables: {
      input: {
        ...userMutationInput(scope, userId),
        accountId,
      },
    },
  });
  return data.applicationMutation.applicationUserAccountUnlink;
}

function userMutationInput(scope: ApplicationScope, userId: string) {
  return {
    organizationId: scope.organizationId,
    applicationId: scope.applicationA.id,
    userId,
  };
}

async function readUserState(sql: Sql, user: SeededUser) {
  const [row] = await sql<{ status: string; sessionCount: number }[]>`
    SELECT
      application_user.status,
      count(application_session.id)::int AS "sessionCount"
    FROM iam.application_user
    LEFT JOIN iam.application_session
      ON application_session.application_id = application_user.application_id
      AND application_session.user_id = application_user.id
    WHERE application_user.application_id = ${user.applicationId}::uuid
      AND application_user.id = ${user.id}
    GROUP BY application_user.status
  `;
  return row;
}

async function countSessions(sql: Sql, user: SeededUser): Promise<number> {
  const [row] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count
    FROM iam.application_session
    WHERE application_id = ${user.applicationId}::uuid
      AND user_id = ${user.id}
  `;
  return row?.count ?? 0;
}

async function readAccountProviders(sql: Sql, user: SeededUser): Promise<string[]> {
  const rows = await sql<{ provider: string }[]>`
    SELECT provider_id AS provider
    FROM iam.application_account
    WHERE application_id = ${user.applicationId}::uuid
      AND user_id = ${user.id}
    ORDER BY provider_id
  `;
  return rows.map(({ provider }) => provider);
}

function uniqueEmail(label: string): string {
  return `${label}-${crypto.randomUUID()}@playwright.dev`;
}

function notFoundSignature(result: {
  data?: unknown;
  errors?: readonly {
    message?: string;
    path?: readonly (string | number)[];
    extensions?: Record<string, unknown>;
  }[];
}) {
  return {
    data: result.data,
    errors:
      result.errors?.map(({ message, path, extensions }) => ({
        message,
        path,
        code: extensions?.code,
      })) ?? [],
  };
}

function required<T>(value: T | null | undefined, label: string): T {
  if (value == null) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}
