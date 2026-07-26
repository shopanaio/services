/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Apps Admin API - idempotency and concurrency', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-IDEM-001..003 APPS-IDEM-010: install retry returns the original operation exactly once', async ({
    api,
  }) => {
    const clientMutationId = crypto.randomUUID();
    const input = {
      appCode: 'hello-world',
      secrets: [{ name: 'token', value: crypto.randomUUID() }],
      clientMutationId,
    };
    const [first, retry] = await Promise.all([
      api.admin.mutation('apps-admin-api/AppInstall', { variables: { input } }),
      api.admin.mutation('apps-admin-api/AppInstall', { variables: { input } }),
    ]);
    const payloads = [
      first.data.appsMutation.appInstall,
      retry.data.appsMutation.appInstall,
    ];
    expect(payloads.filter(({ duplicate }) => !duplicate)).toHaveLength(1);
    expect(payloads.filter(({ duplicate }) => duplicate)).toHaveLength(1);
    expect(new Set(payloads.map(({ operation }) => operation!.id)).size).toBe(1);
    expect(new Set(payloads.map(({ operation }) => operation!.workflowId)).size).toBe(1);
    expect(payloads[0].operation!.workflowId).not.toContain(clientMutationId);
  });

  test('APPS-IDEM-004 APPS-IDEM-005: update and actions return the original operation on retry', async ({
    api,
  }) => {
    const installed = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
      },
    });
    const id = installed.data.appsMutation.appInstall.installation!.id;
    await expect
      .poll(async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');

    const updateId = crypto.randomUUID();
    const update = await api.admin.mutation('apps-admin-api/AppUpdate', {
      variables: { input: { installationId: id, clientMutationId: updateId } },
    });
    const updateRetry = await api.admin.mutation('apps-admin-api/AppUpdate', {
      variables: { input: { installationId: id, clientMutationId: updateId } },
    });
    expect(updateRetry.data.appsMutation.appUpdate).toMatchObject({
      duplicate: true,
      operation: { id: update.data.appsMutation.appUpdate.operation!.id },
    });
    await expect
      .poll(async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');

    for (const [document, field, terminal] of [
      ['apps-admin-api/AppSuspend', 'appSuspend', 'SUSPENDED'],
      ['apps-admin-api/AppResume', 'appResume', 'ACTIVE'],
      ['apps-admin-api/AppUninstall', 'appUninstall', 'UNINSTALLED'],
    ] as const) {
      const mutationId = crypto.randomUUID();
      const accepted = await api.admin.mutation(document, {
        variables: { input: { installationId: id, clientMutationId: mutationId } },
      });
      const duplicate = await api.admin.mutation(document, {
        variables: { input: { installationId: id, clientMutationId: mutationId } },
      });
      expect(duplicate.data.appsMutation[field]).toMatchObject({
        duplicate: true,
        operation: { id: accepted.data.appsMutation[field].operation!.id },
      });
      await expect
        .poll(async () => {
          const current = await api.admin.query('apps-admin-api/AppInstallation', {
            variables: { id },
          });
          return current.data.appsQuery.appInstallation?.status;
        })
        .toBe(terminal);
    }
  });

  test('APPS-IDEM-006 APPS-IDEM-013: idempotency keys are installation- and store-scoped', async ({
    api,
  }) => {
    const sharedId = crypto.randomUUID();
    const first = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: sharedId },
      },
    });
    const second = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'shopana-headless', clientMutationId: sharedId },
      },
    });
    expect(second.data.appsMutation.appInstall.operation!.id).not.toBe(
      first.data.appsMutation.appInstall.operation!.id,
    );

    await api.session.setupProject({ displayName: 'Second Store' });
    const foreign = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId: sharedId },
      },
    });
    expect(foreign.data.appsMutation.appInstall.operation!.id).not.toBe(
      first.data.appsMutation.appInstall.operation!.id,
    );
  });

  test('APPS-IDEM-007..009 APPS-IDEM-014: parallel installs and transitions converge to one operation', async ({
    api,
  }) => {
    const installs = await Promise.all(
      Array.from({ length: 3 }, () =>
        api.admin.mutation('apps-admin-api/AppInstall', {
          variables: {
            input: { appCode: 'hello-world', clientMutationId: crypto.randomUUID() },
          },
        }),
      ),
    );
    expect(
      installs.filter(({ data }) => data.appsMutation.appInstall.userErrors.length === 0),
    ).toHaveLength(1);
    const accepted = installs.find(
      ({ data }) => data.appsMutation.appInstall.userErrors.length === 0,
    )!;
    const id = accepted.data.appsMutation.appInstall.installation!.id;
    await expect
      .poll(async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');

    const mutationId = crypto.randomUUID();
    const suspends = await Promise.all(
      Array.from({ length: 4 }, () =>
        api.admin.mutation('apps-admin-api/AppSuspend', {
          variables: { input: { installationId: id, clientMutationId: mutationId } },
        }),
      ),
    );
    expect(suspends.filter(({ data }) => !data.appsMutation.appSuspend.duplicate)).toHaveLength(1);
    expect(new Set(suspends.map(({ data }) => data.appsMutation.appSuspend.operation!.id)).size).toBe(
      1,
    );
  });

  test('APPS-IDEM-011 APPS-IDEM-012: retry observes the persisted failed operation', async ({
    api,
  }) => {
    const clientMutationId = crypto.randomUUID();
    const failed = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'hello-world',
          secrets: [{ name: '', value: 'invalid' }],
          clientMutationId,
        },
      },
    });
    expect(failed.data.appsMutation.appInstall.userErrors.length).toBeGreaterThan(0);
    const retry = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'hello-world', clientMutationId },
      },
    });
    expect(retry.data.appsMutation.appInstall).toMatchObject({
      duplicate: true,
      operation: { status: 'FAILED' },
    });
  });
});
