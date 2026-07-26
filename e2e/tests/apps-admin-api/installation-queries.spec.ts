/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { encodeGlobalId } from '@utils/globalid';

test.describe('Apps Admin API - installation queries', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-QUERY-001..007: lookup validates global IDs and exposes complete installation state', async ({
    api,
  }) => {
    const install = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'shopana-headless',
          configuration: { storefront: 'primary' },
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    const id = install.data.appsMutation.appInstall.installation!.id;
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation;
      })
      .toMatchObject({
        id,
        appCode: 'shopana-headless',
        status: 'ACTIVE',
        installedVersion: '1.0.0',
        configuration: { storefront: 'primary' },
        configurationVersion: 1,
        healthStatus: 'HEALTHY',
        scopes: [{ scope: 'project.getStoreById', granted: true }],
        lifecycleOperations: { totalCount: 1 },
        manifestSnapshots: { totalCount: 1 },
      });

    for (const invalidId of [
      '',
      'not-base64',
      encodeGlobalId('AppLifecycleOperation', crypto.randomUUID()),
      encodeGlobalId('AppInstallation', crypto.randomUUID()),
    ]) {
      const response = await api.admin.query('apps-admin-api/AppInstallation', {
        variables: { id: invalidId },
      });
      expect(response.data.appsQuery.appInstallation).toBeNull();
    }
  });

  test('APPS-QUERY-003 APPS-QUERY-015 APPS-QUERY-016 APPS-QUERY-020: point reads remain store-local', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const first = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    await api.session.setupProject({ displayName: 'Foreign Store' });
    const second = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });

    const foreignInstallation = await api.admin.query('apps-admin-api/AppInstallation', {
      variables: { id: first.data.appsMutation.appInstall.installation!.id },
    });
    const foreignOperation = await api.admin.query('apps-admin-api/AppLifecycleOperation', {
      variables: { id: first.data.appsMutation.appInstall.operation!.id },
    });
    const localInstallation = await api.admin.query('apps-admin-api/AppInstallation', {
      variables: { id: second.data.appsMutation.appInstall.installation!.id },
    });
    expect(foreignInstallation.data.appsQuery.appInstallation).toBeNull();
    expect(foreignOperation.data.appsQuery.appLifecycleOperation).toBeNull();
    expect(localInstallation.data.appsQuery.appInstallation).not.toBeNull();
    api.session.project = firstStore;
  });

  test('APPS-QUERY-005 APPS-QUERY-006: configuration versions and revoked scopes remain queryable', async ({
    api,
  }) => {
    const install = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'shopana-headless', clientMutationId: crypto.randomUUID() },
      },
    });
    const configured = await api.admin.mutation('apps-admin-api/AppConfigure', {
      variables: {
        input: {
          installationId: install.data.appsMutation.appInstall.installation!.id,
          expectedConfigurationVersion: 1,
          configuration: { mode: 'headless' },
          grantedScopes: [],
        },
      },
    });
    expect(configured.data.appsMutation.appConfigure).toMatchObject({
      userErrors: [],
      installation: {
        configuration: { mode: 'headless' },
        configurationVersion: 2,
        scopes: [{ scope: 'project.getStoreById', granted: false }],
      },
    });
    expect(
      configured.data.appsMutation.appConfigure.installation!.scopes[0].revokedAt,
    ).not.toBeNull();
  });

  test('APPS-QUERY-008..010: connection order and Relay pagination are stable and lossless', async ({
    api,
  }) => {
    const ids: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const install = await api.admin.mutation('apps-admin-api/AppInstall', {
        variables: {
          input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
        },
      });
      const id = install.data.appsMutation.appInstall.installation!.id;
      ids.push(id);
      await expect
        .poll(async () => {
          const response = await api.admin.query('apps-admin-api/AppInstallation', {
            variables: { id },
          });
          return response.data.appsQuery.appInstallation?.status;
        })
        .toBe('ACTIVE');
      if (index < 2) {
        await api.admin.mutation('apps-admin-api/AppUninstall', {
          variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
        });
        await expect
          .poll(async () => {
            const response = await api.admin.query('apps-admin-api/AppInstallation', {
              variables: { id },
            });
            return response.data.appsQuery.appInstallation?.status;
          })
          .toBe('UNINSTALLED');
      }
    }
    const defaultPage = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: {},
    });
    expect(defaultPage.data.appsQuery.appInstallations.edges.map(({ node }) => node.id)).toEqual(
      [...ids].reverse(),
    );
    const firstPage = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: { first: 2 },
    });
    const secondPage = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: {
        first: 2,
        after: firstPage.data.appsQuery.appInstallations.pageInfo.endCursor,
      },
    });
    const firstPageIds = firstPage.data.appsQuery.appInstallations.edges.map(
      ({ node }) => node.id,
    );
    const secondPageIds = secondPage.data.appsQuery.appInstallations.edges.map(
      ({ node }) => node.id,
    );
    expect(firstPageIds).toEqual([...ids].reverse().slice(0, 2));
    expect(secondPageIds).toEqual([...ids].reverse().slice(2));
    expect([...firstPageIds, ...secondPageIds]).toEqual([...ids].reverse());
    expect(firstPage.data.appsQuery.appInstallations.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(secondPage.data.appsQuery.appInstallations.pageInfo).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });
    expect(firstPage.data.appsQuery.appInstallations.totalCount).toBe(ids.length);
    expect(secondPage.data.appsQuery.appInstallations.totalCount).toBe(ids.length);
  });

  test('APPS-QUERY-011..014: filters, ordering, count, and invalid cursors are safe', async ({
    api,
  }) => {
    await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    const filtered = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: {
        first: 20,
        where: {
          appCode: { _eq: 'hello-world' },
          configurationVersion: { _eq: 1 },
        },
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      },
    });
    expect(filtered.data.appsQuery.appInstallations.totalCount).toBe(1);

    for (const variables of [
      { first: 1, last: 1 },
      { first: 1, after: 'invalid-cursor' },
      { last: 1, before: 'invalid-cursor' },
    ]) {
      const invalid = await api.admin.query('apps-admin-api/AppInstallations', {
        variables,
        throwOnError: false,
      });
      expect(invalid.errors?.length).toBeGreaterThan(0);
    }
  });

  test('APPS-QUERY-017..019: operation and manifest histories are deterministic and scoped', async ({
    api,
  }) => {
    const install = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    const id = install.data.appsMutation.appInstall.installation!.id;
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');
    await api.admin.mutation('apps-admin-api/AppUpdate', {
      variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
    });
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation;
      })
      .toMatchObject({
        status: 'ACTIVE',
        lifecycleOperations: {
          totalCount: 2,
          edges: [{ node: { type: 'UPDATE' } }, { node: { type: 'INSTALL' } }],
        },
      });
    const operation = await api.admin.query('apps-admin-api/AppLifecycleOperation', {
      variables: { id: install.data.appsMutation.appInstall.operation!.id },
    });
    expect(operation.data.appsQuery.appLifecycleOperation).toMatchObject({
      installation: { id },
      type: 'INSTALL',
      status: 'SUCCEEDED',
      actorType: 'USER',
    });
  });
});
