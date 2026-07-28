/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { encodeGlobalId } from '@utils/globalid';

test.describe('Apps Admin API - installation queries', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('lookup validates global IDs and exposes complete installation state', async ({
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

  test('point reads remain store-local', async ({
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

  test('configuration versions and revoked scopes remain queryable', async ({
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

  test('Apps connection order and Relay pagination are stable and lossless', async ({
    api,
  }) => {
    const expectedCodes = [
      'hello-world',
      'shopana-headless',
      'shopana-online-store',
      'shopana-smtp',
    ];
    const defaultPage = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: {},
    });
    expect(defaultPage.data.appsQuery.apps.edges.map(({ node }) => node.code)).toEqual(
      expectedCodes,
    );
    const firstPage = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: { first: 2 },
    });
    const secondPage = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: {
        first: 2,
        after: firstPage.data.appsQuery.apps.pageInfo.endCursor,
      },
    });
    const firstPageCodes = firstPage.data.appsQuery.apps.edges.map(
      ({ node }) => node.code,
    );
    const secondPageCodes = secondPage.data.appsQuery.apps.edges.map(
      ({ node }) => node.code,
    );
    expect(firstPageCodes).toEqual(expectedCodes.slice(0, 2));
    expect(secondPageCodes).toEqual(expectedCodes.slice(2));
    expect([...firstPageCodes, ...secondPageCodes]).toEqual(expectedCodes);
    expect(firstPage.data.appsQuery.apps.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(secondPage.data.appsQuery.apps.pageInfo).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });
    expect(firstPage.data.appsQuery.apps.totalCount).toBe(expectedCodes.length);
    expect(secondPage.data.appsQuery.apps.totalCount).toBe(expectedCodes.length);
  });

  test('filters, ordering, count, and invalid cursors are safe', async ({
    api,
  }) => {
    const install = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    const installationId =
      install.data.appsMutation.appInstall.installation!.id;
    await expect
      .poll(async () => {
        const current = await api.admin.query(
          'apps-admin-api/AppInstallation',
          { variables: { id: installationId } },
        );
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');

    const filtered = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: {
        first: 20,
        where: {
          code: { _eq: 'hello-world' },
          displayName: { _containsi: 'hello' },
          capabilities: { _containsi: 'greeting' },
          status: { _in: ['ACTIVE'] },
          installed: { _eq: true },
        },
        orderBy: [{ field: 'displayName', direction: 'asc' }],
      },
    });
    expect(filtered.data.appsQuery.apps.totalCount).toBe(1);

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

  test('operation and manifest histories are deterministic and scoped', async ({
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
