/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Apps Admin API - installation lifecycle', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-LIFE-001..003 APPS-LIFE-028: install reaches ACTIVE with one traceable operation', async ({
    api,
  }) => {
    const response = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'hello-world',
          configuration: { greeting: 'Привіт' },
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    const payload = response.data.appsMutation.appInstall;
    expect(payload.userErrors).toEqual([]);
    expect(payload).toMatchObject({
      duplicate: false,
      installation: {
        appCode: 'hello-world',
        targetVersion: '0.0.1',
        configuration: { greeting: 'Привіт' },
      },
      operation: { type: 'INSTALL', actorType: 'USER' },
    });

    await expect
      .poll(async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id: payload.installation!.id },
        });
        return current.data.appsQuery.appInstallation;
      })
      .toMatchObject({
        status: 'ACTIVE',
        installedVersion: '0.0.1',
        healthStatus: 'HEALTHY',
        lifecycleOperations: { totalCount: 1 },
      });
  });

  test('APPS-LIFE-004 APPS-LIFE-005 APPS-LIFE-025: invalid installs and transitions create no operation', async ({
    api,
  }) => {
    for (const [appCode, expectedCode] of [
      ['', 'INVALID_INPUT'],
      ['unknown-app', 'APP_INSTALL_FAILED'],
      ['shopana-online-store', 'APP_INSTALL_FAILED'],
    ] as const) {
      const response = await api.admin.mutation('apps-admin-api/AppInstall', {
        variables: {
          input: { appCode, clientMutationId: crypto.randomUUID() },
        },
      });
      expect(response.data.appsMutation.appInstall).toMatchObject({
        installation: null,
        operation: null,
        duplicate: false,
      });
      expect(response.data.appsMutation.appInstall.userErrors).toEqual([
        expect.objectContaining({ code: expectedCode }),
      ]);
    }

    const installed = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    await expect
      .poll(async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id: installed.data.appsMutation.appInstall.installation!.id },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');

    const duplicateInstall = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    expect(duplicateInstall.data.appsMutation.appInstall).toMatchObject({
      installation: null,
      operation: null,
      userErrors: [expect.objectContaining({ code: 'ALREADY_EXISTS' })],
    });
    const invalidResume = await api.admin.mutation('apps-admin-api/AppResume', {
      variables: {
        input: {
          installationId: installed.data.appsMutation.appInstall.installation!.id,
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    expect(invalidResume.data.appsMutation.appResume).toMatchObject({
      installation: null,
      operation: null,
      userErrors: [expect.objectContaining({ code: 'INVALID_STATE' })],
    });
  });

  test('APPS-LIFE-006 APPS-LIFE-026: stores own independent installations and reject foreign IDs', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const first = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    await api.session.setupProject({ displayName: 'Second Store' });
    const second = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    expect(second.data.appsMutation.appInstall.installation!.id).not.toBe(
      first.data.appsMutation.appInstall.installation!.id,
    );

    const foreign = await api.admin.mutation('apps-admin-api/AppUpdate', {
      variables: {
        input: {
          installationId: first.data.appsMutation.appInstall.installation!.id,
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    expect(foreign.data.appsMutation.appUpdate).toMatchObject({
      installation: null,
      operation: null,
      userErrors: [expect.objectContaining({ code: 'NOT_FOUND' })],
    });
    api.session.project = firstStore;
  });

  test('APPS-LIFE-007 APPS-LIFE-008: failed install retries the same installation row', async ({
    api,
  }) => {
    const failed = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'hello-world',
          secrets: [{ name: '', value: 'invalid' }],
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    expect(failed.data.appsMutation.appInstall.userErrors).toEqual([
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    ]);
    const connection = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: { first: 20, where: { appCode: { _eq: 'hello-world' } } },
    });
    expect(connection.data.appsQuery.appInstallations).toMatchObject({
      totalCount: 1,
      edges: [{ node: { status: 'INSTALL_FAILED' } }],
    });
    const failedId = connection.data.appsQuery.appInstallations.edges[0].node.id;

    const retry = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    expect(retry.data.appsMutation.appInstall.installation!.id).toBe(failedId);
    await expect
      .poll(async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id: failedId },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');
  });

  test('APPS-LIFE-009..019: update, suspend, and resume preserve lifecycle state', async ({
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
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');

    const update = await api.admin.mutation('apps-admin-api/AppUpdate', {
      variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
    });
    expect(update.data.appsMutation.appUpdate).toMatchObject({
      userErrors: [],
      operation: { type: 'UPDATE', previousInstallationStatus: 'ACTIVE' },
    });
    await expect
      .poll(async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');

    const suspend = await api.admin.mutation('apps-admin-api/AppSuspend', {
      variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
    });
    expect(suspend.data.appsMutation.appSuspend.userErrors).toEqual([]);
    expect(suspend.data.appsMutation.appSuspend.installation!.capabilities).toMatchObject([
      { status: 'INACTIVE' },
    ]);
    await expect
      .poll(async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('SUSPENDED');

    const resume = await api.admin.mutation('apps-admin-api/AppResume', {
      variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
    });
    expect(resume.data.appsMutation.appResume.userErrors).toEqual([]);
    await expect
      .poll(async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');
  });

  test('APPS-LIFE-020..024 APPS-LIFE-027: uninstall preserves history and permits reinstall', async ({
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
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');
    const uninstall = await api.admin.mutation('apps-admin-api/AppUninstall', {
      variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
    });
    expect(uninstall.data.appsMutation.appUninstall.userErrors).toEqual([]);
    await expect
      .poll(async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return current.data.appsQuery.appInstallation;
      })
      .toMatchObject({
        status: 'UNINSTALLED',
        scopes: [],
        lifecycleOperations: { totalCount: 2 },
      });
    const reinstall = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    expect(reinstall.data.appsMutation.appInstall.installation!.id).not.toBe(id);
  });
});
