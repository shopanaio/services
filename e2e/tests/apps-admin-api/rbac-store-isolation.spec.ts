/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { ApiFixtures } from '@fixtures/api/api';
import { readQuery } from '@fixtures/api/types';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';

type Api = ApiFixtures['api'];

test.describe('Apps Admin API - RBAC and store isolation', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('Admin tenant authentication is required', async ({
    api,
    request,
  }) => {
    const owner = {
      accessToken: api.session.tenant.accessToken!,
      userId: api.session.tenant.userId!,
    };
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

    api.session.tenant.accessToken = owner.accessToken;
    api.session.tenant.userId = owner.userId;
    const storefrontToken = await createStorefrontCredential(api);
    const graphqlUrl = process.env.ADMIN_GRAPHQL_URL;
    if (!graphqlUrl) {
      throw new Error('ADMIN_GRAPHQL_URL environment variable is not set');
    }
    const storefrontResponse = await request.post(graphqlUrl, {
      headers: {
        'Content-Type': 'application/json',
        'X-Organization-Id': api.session.organizationId!,
        'X-Store-Name': api.session.project.name,
        'x-shopana-storefront-access-token': storefrontToken,
      },
      data: {
        query: readQuery('apps-admin-api/AvailableApps'),
        variables: { where: null },
      },
    });
    const storefront = await storefrontResponse.json();
    expect(storefront.errors?.length).toBeGreaterThan(0);
    expect(storefront.data?.appsQuery?.apps).toBeUndefined();
  });

  test('read, write, and admin permissions enforce exact boundaries', async ({
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
            appCode: action === 'admin' ? 'shopana-headless' : 'hello-world',
            clientMutationId: crypto.randomUUID(),
          },
        },
      });
      if (action === 'read') {
        expect(install.data.appsMutation.appInstall).toMatchObject({
          installation: null,
          operation: null,
          userErrors: [
            expect.objectContaining({
              code: 'FORBIDDEN',
              field: null,
            }),
          ],
        });
      } else {
        expect(install.data.appsMutation.appInstall.userErrors).toEqual([]);
        const installationId =
          install.data.appsMutation.appInstall.installation!.id;
        await expect
          .poll(async () => {
            const current = await api.admin.query('apps-admin-api/AppInstallation', {
              variables: { id: installationId },
            });
            return current.data.appsQuery.appInstallation?.status;
          })
          .toBe('ACTIVE');
        const before = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id: installationId },
        });
        const operationCountBefore =
          before.data.appsQuery.appInstallation!.lifecycleOperations.totalCount;
        const uninstall = await api.admin.mutation('apps-admin-api/AppUninstall', {
          variables: {
            input: {
              installationId,
              clientMutationId: crypto.randomUUID(),
            },
          },
        });
        if (action === 'write') {
          expect(uninstall.data.appsMutation.appUninstall).toMatchObject({
            installation: null,
            operation: null,
            userErrors: [
              expect.objectContaining({
                code: 'FORBIDDEN',
                field: null,
              }),
            ],
          });
          const after = await api.admin.query('apps-admin-api/AppInstallation', {
            variables: { id: installationId },
          });
          expect(after.data.appsQuery.appInstallation).toMatchObject({
            status: 'ACTIVE',
            lifecycleOperations: {
              totalCount: operationCountBefore,
            },
          });
        } else {
          expect(uninstall.data.appsMutation.appUninstall.userErrors).toEqual([]);
          await expect
            .poll(async () => {
              const current = await api.admin.query('apps-admin-api/AppInstallation', {
                variables: { id: installationId },
              });
              return current.data.appsQuery.appInstallation?.status;
            })
            .toBe('UNINSTALLED');
        }
      }
      api.session.tenant.accessToken = owner.accessToken;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('trusted context prevents foreign ID substitution', async ({
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
    expect(denied.data.appsMutation.appUninstall).toMatchObject({
      installation: null,
      operation: null,
      userErrors: [expect.objectContaining({ code: 'NOT_FOUND' })],
    });
    api.session.organizationId = firstOrganizationId;
    api.session.project = firstStore;
  });

  test('malformed mutations are safe and side-effect free', async ({
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
      expect(response.data.appsMutation.appUninstall).toMatchObject({
        installation: null,
        operation: null,
        userErrors: [
          expect.objectContaining({
            code: 'INVALID_INPUT',
            field: ['input', 'installationId'],
          }),
        ],
      });
      expect(JSON.stringify(response.data.appsMutation.appUninstall.userErrors)).not.toMatch(
        /(?:stack|select\s|postgres|node_modules|\/Users\/|organization_id|store_id)/iu,
      );
    }
    const connection = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: {
        first: 20,
        where: { installed: { _eq: true } },
      },
    });
    expect(connection.data.appsQuery.apps.totalCount).toBe(0);
  });
});

async function createStorefrontCredential(api: Api): Promise<string> {
  const installed = await api.admin.mutation('apps-admin-api/AppInstall', {
    variables: {
      input: {
        appCode: 'shopana-headless',
        clientMutationId: crypto.randomUUID(),
      },
    },
  });
  const installation = installed.data.appsMutation.appInstall.installation;
  expect(installed.data.appsMutation.appInstall.userErrors).toEqual([]);
  expect(installation).not.toBeNull();
  await expect
    .poll(async () => {
      const current = await api.admin.query('apps-admin-api/AppInstallation', {
        variables: { id: installation!.id },
      });
      return current.data.appsQuery.appInstallation?.status;
    })
    .toBe('ACTIVE');

  const created = await api.admin.mutation('headless-admin-api/StorefrontCreate', {
    variables: {
      input: {
        displayName: 'Apps Admin boundary credential',
        clientMutationId: crypto.randomUUID(),
      },
    },
  });
  const payload = created.data.headlessAppMutation.headlessStorefrontCreate;
  expect(payload.userErrors).toEqual([]);
  expect(payload.initialStorefrontCredentials).not.toBeNull();
  return payload.initialStorefrontCredentials!.publicAccessToken;
}
