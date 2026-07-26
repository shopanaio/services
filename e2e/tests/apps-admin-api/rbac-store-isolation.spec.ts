/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { ApiFixtures } from '@fixtures/api/api';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  rawId,
  installActive,
  installApp,
  lifecycleAction,
  listInstallations,
} from './apps-test-support';

type Api = ApiFixtures['api'];

async function createAppsRoleUser(api: Api, action: 'read' | 'write' | 'admin' | null) {
  const user = await api.admin.user.create();
  const domain = `store:${rawId(api.session.project.id)}`;
  const roles: { domain: string; role: string }[] = [{ domain: 'org', role: 'member' }];
  if (action) {
    const roleName = `apps-${action}-${crypto.randomUUID().slice(0, 8)}`;
    const role = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId: api.session.organizationId,
          domain,
          name: roleName,
          displayName: `Apps ${action}`,
          permissions: [{ resource: 'store.apps', action }],
        },
      },
    });
    expect(role.data.roleMutation.roleCreate.userErrors).toEqual([]);
    roles.push({ domain, role: roleName });
  }
  const invitation = await api.admin.mutation('iam-api/MemberInvite', {
    variables: {
      input: {
        organizationId: api.session.organizationId,
        email: user.data.email,
        roles,
      },
    },
  });
  expect(invitation.data.organizationMutation.memberInvite.userErrors).toEqual([]);
  return user;
}

function useUser(api: Api, user: { accessToken: string; userId: string }) {
  api.session.tenant.accessToken = user.accessToken;
  api.session.tenant.userId = user.userId;
}

test.describe('Apps Admin API - RBAC and store isolation', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-SEC-001 APPS-SEC-011 APPS-SEC-012: only an authenticated Admin tenant identity can enter Apps GraphQL', async ({
    api,
  }) => {
    api.session.clearSession();
    for (const operation of ['AvailableApps', 'AppInstall'] as const) {
      const call =
        operation === 'AvailableApps'
          ? api.admin.query('apps-admin-api/AvailableApps', {
              variables: { where: null },
              throwOnError: false,
            })
          : api.admin.mutation('apps-admin-api/AppInstall', {
              variables: {
                input: {
                  appCode: 'hello-world',
                  clientMutationId: crypto.randomUUID(),
                },
              },
              throwOnError: false,
            });
      const response = await call;
      expect(response.errors?.length).toBeGreaterThan(0);
    }

    api.session.scope = 'customer';
    api.session.apiKey = 'invalid-storefront-credential';
    const customer = await api.admin.query('apps-admin-api/AvailableApps', {
      variables: { where: null },
      throwOnError: false,
    });
    expect(customer.errors?.length).toBeGreaterThan(0);
  });

  test('APPS-SEC-002..005 APPS-SEC-014: read/write/admin roles enforce exact mutation boundaries without side effects', async ({
    api,
  }) => {
    const owner = {
      accessToken: api.session.tenant.accessToken!,
      userId: api.session.tenant.userId!,
    };
    const reader = await createAppsRoleUser(api, 'read');
    const writer = await createAppsRoleUser(api, 'write');
    const admin = await createAppsRoleUser(api, 'admin');
    const member = await createAppsRoleUser(api, null);

    useUser(api, reader);
    const discovery = await api.admin.query('apps-admin-api/AvailableApps', {
      variables: { where: null },
    });
    expect(discovery.data.appsQuery.availableApps.length).toBeGreaterThan(0);
    const deniedReadInstall = await installApp(api);
    expect(deniedReadInstall.userErrors).toMatchObject([{ code: 'FORBIDDEN' }]);

    useUser(api, writer);
    const installed = await installActive(api);
    const deniedUninstall = await lifecycleAction(api, 'AppUninstall', installed.installation.id);
    expect(deniedUninstall.userErrors).toMatchObject([{ code: 'FORBIDDEN' }]);

    useUser(api, admin);
    const uninstall = await lifecycleAction(api, 'AppUninstall', installed.installation.id);
    expect(uninstall.userErrors).toEqual([]);

    useUser(api, member);
    const memberRead = await api.admin.query('apps-admin-api/AvailableApps', {
      variables: { where: null },
      throwOnError: false,
    });
    expect(memberRead.errors?.length).toBeGreaterThan(0);
    const memberWrite = await installApp(api, { appCode: 'shopana-headless' });
    expect(memberWrite.userErrors).toMatchObject([{ code: 'FORBIDDEN' }]);

    useUser(api, owner);
    expect((await listInstallations(api, { first: 20 })).totalCount).toBe(1);
  });

  test('APPS-SEC-006..010 APPS-SEC-016 APPS-SEC-017: trusted context prevents cross-store and cross-organization ID substitution', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const firstOrganizationId = api.session.organizationId;
    const foreign = await installActive(api);

    await api.session.setupOrganization({ displayName: 'Other Organization' });
    await api.session.setupProject({ displayName: 'Other Store' });
    const local = await installActive(api);

    const batched = await Promise.all([
      api.admin.query('apps-admin-api/AppInstallation', {
        variables: { id: local.installation.id },
      }),
      api.admin.query('apps-admin-api/AppInstallation', {
        variables: { id: foreign.installation.id },
      }),
      api.admin.query('apps-admin-api/AppLifecycleOperation', {
        variables: { id: foreign.payload.operation!.id },
      }),
    ]);
    expect(batched[0].data.appsQuery.appInstallation).not.toBeNull();
    expect(batched[1].data.appsQuery.appInstallation).toBeNull();
    expect(batched[2].data.appsQuery.appLifecycleOperation).toBeNull();

    for (const action of ['AppSuspend', 'AppResume', 'AppUninstall'] as const) {
      const denied = await lifecycleAction(api, action, foreign.installation.id);
      expect(denied.userErrors.length).toBeGreaterThan(0);
      expect(denied.operation).toBeNull();
    }

    api.session.organizationId = firstOrganizationId;
    api.session.project = firstStore;
    expect((await listInstallations(api, { first: 20 })).totalCount).toBe(1);
  });

  test('APPS-SEC-013 APPS-SEC-015 APPS-SEC-018: malformed mutation inputs are safe and leave both stores unchanged', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const first = await installActive(api);
    await api.session.setupProject({ displayName: 'Other Store' });
    const secondBefore = await listInstallations(api, { first: 20 });

    for (const installationId of [
      'not-a-global-id',
      first.payload.operation!.id,
      first.installation.id,
    ]) {
      const rejected = await lifecycleAction(api, 'AppUninstall', installationId);
      expect(rejected.userErrors.length).toBeGreaterThan(0);
      expect(rejected.operation).toBeNull();
      expect(JSON.stringify(rejected.userErrors)).not.toMatch(
        /(?:stack|select\s|postgres|node_modules|\/Users\/|organization_id|store_id)/iu,
      );
    }
    expect(await listInstallations(api, { first: 20 })).toEqual(secondBefore);

    api.session.project = firstStore;
    expect(await listInstallations(api, { first: 20 })).toMatchObject({
      totalCount: 1,
      edges: [{ node: { id: first.installation.id, status: 'ACTIVE' } }],
    });
  });
});
