/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Apps Admin API - runtime, capabilities, and observability', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-RUN-001 APPS-RUN-002 APPS-RUN-006: lifecycle synchronizes manifest capabilities', async ({
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
        return response.data.appsQuery.appInstallation;
      })
      .toMatchObject({
        status: 'ACTIVE',
        capabilities: [
          {
            capability: 'greeting',
            assignmentMode: 'STORE',
            operation: 'hello',
            targetAppCode: 'hello-world',
            targetAction: 'hello',
            status: 'ACTIVE',
          },
        ],
      });
    const update = await api.admin.mutation('apps-admin-api/AppUpdate', {
      variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
    });
    expect(update.data.appsMutation.appUpdate.userErrors).toEqual([]);
  });

  test('APPS-RUN-003..005 APPS-RUN-008: capability eligibility follows lifecycle and store ownership', async ({
    api,
  }) => {
    const firstStore = api.session.project;
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
    const suspend = await api.admin.mutation('apps-admin-api/AppSuspend', {
      variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
    });
    expect(suspend.data.appsMutation.appSuspend.installation!.capabilities).toMatchObject([
      { status: 'INACTIVE' },
    ]);
    await api.session.setupProject({ displayName: 'Other Store' });
    const foreign = await api.admin.query('apps-admin-api/AppInstallation', {
      variables: { id },
    });
    expect(foreign.data.appsQuery.appInstallation).toBeNull();
    api.session.project = firstStore;
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation?.status;
      })
      .toBe('SUSPENDED');
    await api.admin.mutation('apps-admin-api/AppResume', {
      variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
    });
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');
    await api.admin.mutation('apps-admin-api/AppUninstall', {
      variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
    });
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation;
      })
      .toMatchObject({ status: 'UNINSTALLED', capabilities: [] });
  });

  test.fixme(
    'APPS-RUN-007: resource assignments cannot create cross-store precedence',
    () => {
      // A READY bundled App with assignmentMode RESOURCE is required to exercise this contract.
      // shopana-online-store is the only resource-mode definition and is intentionally FAILED in e2e.
    },
  );

  test('APPS-RUN-009..014: workflow and secret metadata remain server-owned and redacted', async ({
    api,
  }) => {
    const plaintext = `observable-${crypto.randomUUID()}`;
    const clientMutationId = crypto.randomUUID();
    const install = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'hello-world',
          secrets: [{ name: 'private-token', value: plaintext }],
          clientMutationId,
        },
      },
    });
    const payload = install.data.appsMutation.appInstall;
    expect(payload).toMatchObject({
      userErrors: [],
      operation: { type: 'INSTALL', actorType: 'USER' },
    });
    expect(payload.operation!.correlationId).not.toBeNull();
    expect(payload.operation!.workflowId).not.toContain(clientMutationId);
    expect(JSON.stringify(payload)).not.toContain(plaintext);
    expect(JSON.stringify(payload)).not.toContain('private-token');
  });

  test('APPS-RUN-015..018: failed runtime remains isolated from healthy durable state', async ({
    api,
  }) => {
    const healthy = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    const failed = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'shopana-online-store',
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    expect(failed.data.appsMutation.appInstall).toMatchObject({
      installation: null,
      operation: null,
    });
    const connection = await api.admin.query('apps-admin-api/AppInstallations', {
      variables: { first: 20 },
    });
    expect(connection.data.appsQuery.appInstallations).toMatchObject({
      totalCount: 1,
      edges: [{ node: { id: healthy.data.appsMutation.appInstall.installation!.id } }],
    });
    const discovery = await api.admin.query('apps-admin-api/AvailableApps', {
      variables: { where: null },
    });
    expect(discovery.data.appsQuery.availableApps).toMatchObject([
      { code: 'hello-world', runtimeStatus: 'READY' },
      { code: 'shopana-headless', runtimeStatus: 'READY' },
      { code: 'shopana-online-store', runtimeStatus: 'FAILED' },
    ]);
  });
});
