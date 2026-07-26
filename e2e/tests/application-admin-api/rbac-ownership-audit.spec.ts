import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import { composeGlobalId } from '@utils/globalid';
import {
  IAM_BASE_URL,
  archiveApplication,
  configureProvider,
  createOAuthClient,
  createOrganizationMember,
  getApplication,
  listApplications,
  listOAuthClients,
  mutateOAuthClient,
  openSql,
  readAdminAudits,
  required,
  serializedWithoutSecrets,
  setRealmEnabled,
  setupApplicationAdminScope,
  updateApplication,
  updateAuth,
  updateAuthMethod,
  type ApplicationAdminScope,
  type Sql,
} from './helpers';

test.describe('Application Admin API - RBAC, ownership, and audit', () => {
  let sql: Sql;
  let scope: ApplicationAdminScope;

  test.beforeEach(async ({ api }) => {
    sql = openSql();
    scope = await setupApplicationAdminScope(api);
  });

  test.afterEach(async () => {
    await sql.end();
  });

  test('APP-SEC-001: platform authentication is required for every applicationQuery and applicationMutation operation', async ({
    api,
  }) => {
    const owner = {
      token: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    api.session.clearSession();
    try {
      const query = await api.admin.query('application-admin-api/Applications', {
        variables: { organizationId: scope.organizationId, first: 10 },
        throwOnError: false,
      });
      const mutation = await api.admin.mutation('application-admin-api/ApplicationUpdate', {
        variables: {
          input: {
            organizationId: scope.organizationId,
            applicationId: scope.applicationA.id,
            expectedRevision: 1,
            displayName: 'Anonymous update',
          },
        },
        throwOnError: false,
      });

      expect(query.data?.applicationQuery ?? null).toBeNull();
      expect(query.errors?.length ?? 0).toBeGreaterThan(0);
      expect(mutation.data?.applicationMutation ?? null).toBeNull();
      expect(mutation.errors?.length ?? 0).toBeGreaterThan(0);
    } finally {
      api.session.tenant.accessToken = owner.token;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('APP-SEC-002: organization owner receives admin access to applications, auth, providers, OAuth clients, and users', async ({
    api,
  }) => {
    const application = await getApplication(api, scope.applicationA);
    const auth = await updateAuth(api, scope.applicationA, {
      branding: { displayName: 'Owner managed' },
    });
    const provider = await configureProvider(api, scope.applicationA);
    const client = await createOAuthClient(api, scope.applicationA, {
      clientType: 'CONFIDENTIAL',
    });
    const users = await api.admin.query('application-admin-api/ApplicationUsers', {
      variables: {
        organizationId: scope.organizationId,
        applicationId: scope.applicationA.id,
        first: 10,
      },
    });

    expect(application).not.toBeNull();
    expect(auth.userErrors).toHaveLength(0);
    expect(provider.userErrors).toHaveLength(0);
    expect(client.userErrors).toHaveLength(0);
    expect(users.data.applicationQuery.application?.users.totalCount).toBe(0);
  });

  test('APP-SEC-003: organization admin role follows RBAC hierarchy for read, write, and admin actions', async ({
    api,
  }) => {
    const admin = await createOrganizationMember(api, scope.organizationId, {
      systemRole: 'admin',
    });
    const owner = {
      token: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    api.session.tenant.accessToken = admin.accessToken;
    api.session.tenant.userId = admin.userId;
    try {
      const read = await listApplications(api, scope.organizationId);
      const write = await updateApplication(api, scope.applicationA, {
        displayName: 'Organization admin update',
      });
      const adminAction = await archiveApplication(
        api,
        scope.applicationA,
        required(write.application, 'updated application').revision,
      );

      expect(read.edges.map(({ node }) => node.id)).toContain(scope.applicationA.id);
      expect(write.userErrors).toHaveLength(0);
      expect(adminAction.userErrors).toHaveLength(0);
      expect(adminAction.application?.status).toBe('ARCHIVED');
    } finally {
      api.session.tenant.accessToken = owner.token;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('APP-SEC-004: organization member without custom policy cannot read application auth, providers, OAuth clients, or users', async ({
    api,
  }) => {
    const member = await createOrganizationMember(api, scope.organizationId, {
      systemRole: 'member',
    });
    const owner = {
      token: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    api.session.tenant.accessToken = member.accessToken;
    api.session.tenant.userId = member.userId;
    try {
      const application = await api.admin.query('application-admin-api/Application', {
        variables: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
        },
        throwOnError: false,
      });
      const clients = await api.admin.query('application-admin-api/ApplicationOAuthClients', {
        variables: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
          clientId: 'missing',
          first: 10,
        },
        throwOnError: false,
      });
      const users = await api.admin.query('application-admin-api/ApplicationUsers', {
        variables: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
          first: 10,
        },
        throwOnError: false,
      });

      for (const result of [application, clients, users]) {
        expect(result.errors?.length ?? 0).toBeGreaterThan(0);
      }
    } finally {
      api.session.tenant.accessToken = owner.token;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('APP-SEC-005: custom read policy permits queries but rejects write and admin mutations', async ({
    api,
  }) => {
    const reader = await createOrganizationMember(api, scope.organizationId, {
      permissions: [
        { resource: 'org.applications', action: 'read' },
        { resource: 'org.application-auth', action: 'read' },
        { resource: 'org.application-auth-providers', action: 'read' },
        { resource: 'org.application-oauth-clients', action: 'read' },
        { resource: 'org.application-users', action: 'read' },
      ],
    });
    const owner = {
      token: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    api.session.tenant.accessToken = reader.accessToken;
    api.session.tenant.userId = reader.userId;
    try {
      expect(await getApplication(api, scope.applicationA)).not.toBeNull();
      expect((await listOAuthClients(api, scope.applicationA)).totalCount).toBe(0);
      const write = await updateApplication(api, scope.applicationA, {
        displayName: 'Forbidden reader update',
      });
      const admin = await archiveApplication(api, scope.applicationA);

      expect(write.application).toBeNull();
      expect(write.userErrors).toEqual([expect.objectContaining({ code: 'FORBIDDEN' })]);
      expect(admin.application).toBeNull();
      expect(admin.userErrors).toEqual([expect.objectContaining({ code: 'FORBIDDEN' })]);
    } finally {
      api.session.tenant.accessToken = owner.token;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('APP-SEC-006: custom write policy permits non-secret updates but rejects secret rotation and archive actions', async ({
    api,
  }) => {
    const client = required(
      (
        await createOAuthClient(api, scope.applicationA, {
          clientType: 'CONFIDENTIAL',
        })
      ).client,
      'confidential client',
    );
    const writer = await createOrganizationMember(api, scope.organizationId, {
      permissions: [
        { resource: 'org.applications', action: 'write' },
        { resource: 'org.application-auth', action: 'write' },
        { resource: 'org.application-auth-providers', action: 'write' },
        { resource: 'org.application-oauth-clients', action: 'write' },
        { resource: 'org.application-users', action: 'write' },
      ],
    });
    const owner = {
      token: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    api.session.tenant.accessToken = writer.accessToken;
    api.session.tenant.userId = writer.userId;
    try {
      const update = await updateApplication(api, scope.applicationA, {
        displayName: 'Writer update',
      });
      const rotate = await mutateOAuthClient(
        api,
        'ApplicationOAuthClientSecretRotate',
        'applicationOAuthClientSecretRotate',
        scope.applicationA,
        client.clientId,
        1,
      );
      const archive = await archiveApplication(
        api,
        scope.applicationA,
        required(update.application, 'writer update').revision,
      );

      expect(update.userErrors).toHaveLength(0);
      expect(rotate.userErrors).toEqual([expect.objectContaining({ code: 'FORBIDDEN' })]);
      expect(archive.userErrors).toEqual([expect.objectContaining({ code: 'FORBIDDEN' })]);
    } finally {
      api.session.tenant.accessToken = owner.token;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('APP-SEC-007: organizationId input is treated as a selector and never as trusted authorization context', async ({
    api,
  }) => {
    const member = await createOrganizationMember(api, scope.foreignOrganizationId, {
      systemRole: 'admin',
    });
    const owner = {
      token: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    api.session.tenant.accessToken = member.accessToken;
    api.session.tenant.userId = member.userId;
    try {
      const result = await api.admin.query('application-admin-api/Application', {
        variables: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
        },
        throwOnError: false,
      });
      expect(result.data?.applicationQuery?.application ?? null).toBeNull();
      expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    } finally {
      api.session.tenant.accessToken = owner.token;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('APP-SEC-008: applicationId plus organizationId ownership predicate is enforced before every read and write', async ({
    api,
  }) => {
    const read = await api.admin.query('application-admin-api/Application', {
      variables: {
        organizationId: scope.foreignOrganizationId,
        applicationId: scope.applicationA.id,
      },
      throwOnError: false,
    });
    const write = await api.admin.mutation('application-admin-api/ApplicationAuthUpdate', {
      variables: {
        input: {
          organizationId: scope.foreignOrganizationId,
          applicationId: scope.applicationA.id,
          expectedRevision: 1,
          branding: { displayName: 'Cross-owned update' },
        },
      },
    });

    expect(read.data?.applicationQuery?.application ?? null).toBeNull();
    expect(write.data.applicationMutation.applicationAuthUpdate.configuration).toBeNull();
    expect(write.data.applicationMutation.applicationAuthUpdate.userErrors).toEqual([
      expect.objectContaining({ code: 'APPLICATION_NOT_FOUND' }),
    ]);
    expect(
      required(await getApplication(api, scope.applicationA), 'application').auth.branding,
    ).toMatchObject({});
  });

  test('APP-SEC-009: global ID type confusion is rejected before domain mutation and records safe failure audit when applicable', async ({
    api,
  }) => {
    const confusedId = composeGlobalId('ApplicationUser', scope.applicationA.rawId);
    const payload = await api.admin.mutation('application-admin-api/ApplicationUpdate', {
      variables: {
        input: {
          organizationId: scope.organizationId,
          applicationId: confusedId,
          expectedRevision: 1,
          displayName: 'Type confused',
        },
      },
    });
    const audits = await readAdminAudits(sql, scope.applicationA, 'application_update');

    expect(payload.data.applicationMutation.applicationUpdate.application).toBeNull();
    expect(payload.data.applicationMutation.applicationUpdate.userErrors).toEqual([
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    ]);
    expect(audits.every(({ safeDiff }) => !JSON.stringify(safeDiff).includes(confusedId))).toBe(
      true,
    );
    expect((await getApplication(api, scope.applicationA))?.displayName).not.toBe('Type confused');
  });

  test('APP-SEC-010: malformed input returns userErrors without stack traces, SQL, secrets, or internal tenant details', async ({
    api,
  }) => {
    const result = await api.admin.mutation('application-admin-api/ApplicationUpdate', {
      variables: {
        input: {
          organizationId: scope.organizationId,
          applicationId: 'not-a-global-id',
          expectedRevision: 1,
          displayName: 'Malformed',
        },
      },
      throwOnError: false,
    });

    expect(result.data.applicationMutation.applicationUpdate.application).toBeNull();
    expect(result.data.applicationMutation.applicationUpdate.userErrors.length).toBeGreaterThan(0);
    serializedWithoutSecrets(result, [
      scope.applicationA.rawId,
      scope.rawOrganizationId,
      'DATABASE_URL',
    ]);
  });

  test('APP-SEC-011: successful write mutations create durable admin audit records with actor, organization, application, action, and request ID', async ({
    api,
  }) => {
    await updateApplication(api, scope.applicationA, { displayName: 'Audited application' });
    const audits = await readAdminAudits(sql, scope.applicationA, 'application_update');

    expect(audits[0]).toMatchObject({
      action: 'application_update',
      outcome: 'success',
      actorType: 'platform_admin',
      actorId: api.session.tenant.userId,
      organizationId: scope.rawOrganizationId,
      applicationId: scope.applicationA.rawId,
      targetType: 'application',
      targetId: scope.applicationA.rawId,
      requestId: expect.any(String),
    });
  });

  test('APP-SEC-012: failed write mutations create safe failure audit records when the boundary can identify action and scope', async ({
    api,
  }) => {
    await updateApplication(api, scope.applicationA, { displayName: 'Revision winner' });
    await updateApplication(api, scope.applicationA, { displayName: 'Revision loser' }, 1);
    const audits = await readAdminAudits(sql, scope.applicationA, 'application_update');

    expect(audits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ outcome: 'success' }),
        expect.objectContaining({
          outcome: 'failure',
          reasonCategory: 'revision_conflict',
        }),
      ]),
    );
  });

  test('APP-SEC-013: admin audit outage makes security-sensitive mutations fail closed according to contract', async ({
    api,
  }) => {
    const suffix = crypto.randomUUID().replaceAll('-', '');
    const functionName = `e2e_fail_admin_audit_${suffix}`;
    const triggerName = `e2e_fail_admin_audit_trigger_${suffix}`;
    const applicationId = scope.applicationA.rawId;
    await sql.unsafe(`
      CREATE FUNCTION iam.${functionName}() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.application_id = '${applicationId}'::uuid THEN
          RAISE EXCEPTION 'e2e admin audit unavailable';
        END IF;
        RETURN NEW;
      END
      $$
    `);
    await sql.unsafe(`
      CREATE TRIGGER ${triggerName}
      BEFORE INSERT ON iam.application_auth_admin_audit
      FOR EACH ROW EXECUTE FUNCTION iam.${functionName}()
    `);
    try {
      const payload = await updateApplication(api, scope.applicationA, {
        displayName: 'Must fail closed',
      });
      expect(payload.application).toBeNull();
      expect(payload.userErrors).toEqual([
        expect.objectContaining({ code: 'ADMIN_AUDIT_UNAVAILABLE' }),
      ]);
      expect((await getApplication(api, scope.applicationA))?.displayName).not.toBe(
        'Must fail closed',
      );
    } finally {
      await sql.unsafe(`DROP TRIGGER ${triggerName} ON iam.application_auth_admin_audit`);
      await sql.unsafe(`DROP FUNCTION iam.${functionName}()`);
    }
  });

  test('APP-SEC-014: admin audit safeDiff is action allowlisted and excludes raw GraphQL variables', async ({
    api,
  }) => {
    const secretLikeDescription = `do-not-copy-raw-${crypto.randomUUID()}`;
    await updateApplication(api, scope.applicationA, {
      displayName: 'Allowlisted diff',
      description: secretLikeDescription,
    });
    const [audit] = await readAdminAudits(sql, scope.applicationA, 'application_update');

    expect(audit?.safeDiff).toEqual({
      changedFields: ['displayName', 'description'],
    });
    serializedWithoutSecrets(audit, [secretLikeDescription, scope.organizationId]);
  });

  test('APP-SEC-015: runtime operational audit remains separate from admin mutation audit', async ({
    api,
    request,
  }) => {
    await updateAuthMethod(api, scope.applicationA, 'password', ['SIGN_IN']);
    await setRealmEnabled(api, scope.applicationA, true);
    const before = (await readAdminAudits(sql, scope.applicationA)).length;
    const response = await request.get(
      `${IAM_BASE_URL}/auth/applications/${scope.applicationA.rawId}/login`,
    );
    const after = (await readAdminAudits(sql, scope.applicationA)).length;

    expect(response.ok()).toBe(true);
    expect(after).toBe(before);
  });

  test('APP-SEC-016: GraphQL admin middleware applies only to /graphql and not to public application auth routes', async ({
    api,
    request,
  }) => {
    await updateAuthMethod(api, scope.applicationA, 'password', ['SIGN_IN']);
    await setRealmEnabled(api, scope.applicationA, true);
    const owner = {
      token: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    api.session.clearSession();
    try {
      const publicRoute = await request.get(
        `${IAM_BASE_URL}/auth/applications/${scope.applicationA.rawId}/login`,
      );
      const admin = await api.admin.query('application-admin-api/Applications', {
        variables: { organizationId: scope.organizationId, first: 10 },
        throwOnError: false,
      });

      expect(publicRoute.ok()).toBe(true);
      expect(admin.errors?.length ?? 0).toBeGreaterThan(0);
    } finally {
      api.session.tenant.accessToken = owner.token;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('APP-SEC-017: public application auth cookies or bearer tokens cannot authorize Admin GraphQL operations', async ({
    api,
  }) => {
    const userId = crypto.randomUUID();
    const publicToken = `public-session-${crypto.randomUUID()}`;
    await sql`
      INSERT INTO iam.application_user
        (id, application_id, name, email, email_verified, status)
      VALUES
        (${userId}, ${scope.applicationA.rawId}::uuid, 'Public Actor',
         ${`actor-${crypto.randomUUID()}@playwright.dev`}, true, 'active')
    `;
    await sql`
      INSERT INTO iam.application_session
        (id, application_id, user_id, token, expires_at)
      VALUES
        (${crypto.randomUUID()}, ${scope.applicationA.rawId}::uuid, ${userId},
         ${publicToken}, now() + interval '1 hour')
    `;
    const owner = {
      token: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    api.session.tenant.accessToken = publicToken;
    api.session.tenant.userId = userId;
    try {
      const result = await api.admin.query('application-admin-api/Applications', {
        variables: { organizationId: scope.organizationId, first: 10 },
        throwOnError: false,
      });
      expect(result.data?.applicationQuery ?? null).toBeNull();
      expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    } finally {
      api.session.tenant.accessToken = owner.token;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('APP-SEC-018: concurrent writes with the same expected revision produce exactly one successful mutation', async ({
    api,
  }) => {
    const [alpha, beta] = await Promise.all([
      updateApplication(api, scope.applicationA, { displayName: 'Concurrent Alpha' }, 1),
      updateApplication(api, scope.applicationA, { displayName: 'Concurrent Beta' }, 1),
    ]);
    const results = [alpha, beta];

    expect(results.filter(({ application }) => application !== null)).toHaveLength(1);
    expect(
      results.filter(({ userErrors }) =>
        userErrors.some(({ code }) => code === 'REVISION_CONFLICT'),
      ),
    ).toHaveLength(1);
    expect((await getApplication(api, scope.applicationA))?.revision).toBe(2);
  });
});
