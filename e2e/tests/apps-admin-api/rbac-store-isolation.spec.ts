/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';

test.describe('Apps Admin API - RBAC and store isolation', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-SEC-001 APPS-SEC-011 APPS-SEC-012: Admin tenant authentication is required', async ({
    api,
  }) => {
    api.session.clearSession();
    const query = await api.admin.query('apps-admin-api/AvailableApps', {
      variables: { where: null },
      throwOnError: false,
    });
    const mutation = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
      throwOnError: false,
    });
    expect(query.errors?.length).toBeGreaterThan(0);
    expect(mutation.errors?.length).toBeGreaterThan(0);

    api.session.scope = 'customer';
    api.session.apiKey = 'invalid-storefront-credential';
    const storefront = await api.admin.query('apps-admin-api/AvailableApps', {
      variables: { where: null },
      throwOnError: false,
    });
    expect(storefront.errors?.length).toBeGreaterThan(0);
  });

  test('APPS-SEC-002..005 APPS-SEC-014: read, write, and admin permissions enforce exact boundaries', async ({
    api,
  }) => {
    const owner = {
      accessToken: api.session.tenant.accessToken!,
      userId: api.session.tenant.userId!,
    };
    const domain = `store:${decodeGlobalId(api.session.project.id).id}`;

    for (const action of ['read', 'write', 'admin'] as const) {
      const user = await api.admin.user.create();
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
      const invitation = await api.admin.mutation('iam-api/MemberInvite', {
        variables: {
          input: {
            organizationId: api.session.organizationId,
            email: user.data.email,
            roles: [
              { domain: 'org', role: 'member' },
              { domain, role: roleName },
            ],
          },
        },
      });
      expect(invitation.data.organizationMutation.memberInvite.userErrors).toEqual([]);
      api.session.tenant.accessToken = user.accessToken;
      api.session.tenant.userId = user.userId;

      const discovery = await api.admin.query('apps-admin-api/AvailableApps', {
        variables: { where: null },
        throwOnError: false,
      });
      expect(discovery.errors).toBeUndefined();
      const install = await api.admin.mutation('apps-admin-api/AppInstall', {
        variables: {
          input: {
            appCode: action === 'read' ? 'hello-world' : 'shopana-headless',
            clientMutationId: crypto.randomUUID(),
          },
        },
      });
      if (action === 'read') {
        expect(install.data.appsMutation.appInstall.userErrors).toMatchObject([
          { code: 'FORBIDDEN' },
        ]);
      } else {
        expect(install.data.appsMutation.appInstall.userErrors).toEqual([]);
        const uninstall = await api.admin.mutation('apps-admin-api/AppUninstall', {
          variables: {
            input: {
              installationId: install.data.appsMutation.appInstall.installation!.id,
              clientMutationId: crypto.randomUUID(),
            },
          },
        });
        if (action === 'write') {
          expect(uninstall.data.appsMutation.appUninstall.userErrors).toMatchObject([
            { code: 'FORBIDDEN' },
          ]);
        } else {
          expect(uninstall.data.appsMutation.appUninstall.userErrors).toEqual([]);
        }
      }
      api.session.tenant.accessToken = owner.accessToken;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('APPS-SEC-006..010 APPS-SEC-016 APPS-SEC-017: trusted context prevents foreign ID substitution', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const firstOrganizationId = api.session.organizationId;
    const foreign = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    await api.session.setupOrganization({ displayName: 'Other Organization' });
    await api.session.setupProject({ displayName: 'Other Store' });
    const local = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    const foreignLookup = await api.admin.query('apps-admin-api/AppInstallation', {
      variables: { id: foreign.data.appsMutation.appInstall.installation!.id },
    });
    const localLookup = await api.admin.query('apps-admin-api/AppInstallation', {
      variables: { id: local.data.appsMutation.appInstall.installation!.id },
    });
    const foreignOperation = await api.admin.query('apps-admin-api/AppLifecycleOperation', {
      variables: { id: foreign.data.appsMutation.appInstall.operation!.id },
    });
    expect(foreignLookup.data.appsQuery.appInstallation).toBeNull();
    expect(foreignOperation.data.appsQuery.appLifecycleOperation).toBeNull();
    expect(localLookup.data.appsQuery.appInstallation).not.toBeNull();
    const denied = await api.admin.mutation('apps-admin-api/AppUninstall', {
      variables: {
        input: {
          installationId: foreign.data.appsMutation.appInstall.installation!.id,
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    expect(denied.data.appsMutation.appUninstall.operation).toBeNull();
    api.session.organizationId = firstOrganizationId;
    api.session.project = firstStore;
  });

  test('APPS-SEC-013 APPS-SEC-015 APPS-SEC-018: malformed mutations are safe and side-effect free', async ({
    api,
  }) => {
    for (const installationId of [
      'not-a-global-id',
      encodeURIComponent(crypto.randomUUID()),
    ]) {
      const response = await api.admin.mutation('apps-admin-api/AppUninstall', {
        variables: {
          input: { installationId, clientMutationId: crypto.randomUUID() },
        },
      });
      expect(response.data.appsMutation.appUninstall.operation).toBeNull();
      expect(response.data.appsMutation.appUninstall.userErrors.length).toBeGreaterThan(0);
      expect(JSON.stringify(response.data.appsMutation.appUninstall.userErrors)).not.toMatch(
        /(?:stack|select\s|postgres|node_modules|\/Users\/|organization_id|store_id)/iu,
      );
    }
    const connection = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: { first: 20 },
    });
    expect(connection.data.appsQuery.appInstallations.totalCount).toBe(0);
  });
});
