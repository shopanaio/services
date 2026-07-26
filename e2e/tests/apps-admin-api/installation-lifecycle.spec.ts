/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  expectAccepted,
  expectSafeErrors,
  getInstallation,
  installActive,
  installApp,
  lifecycleAction,
  listInstallations,
  operationRows,
  updateApp,
  waitForInstallation,
  waitForOperation,
} from './apps-test-support';

test.describe('Apps Admin API - installation lifecycle', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-LIFE-001..003 APPS-LIFE-028: install creates one traceable operation and reaches ACTIVE', async ({
    api,
  }) => {
    const payload = await installApp(api, {
      configuration: { greeting: 'Привіт' },
    });
    expectAccepted(payload, 'INSTALL');
    expect(payload.installation).toMatchObject({
      appCode: 'hello-world',
      configuration: { greeting: 'Привіт' },
      configurationVersion: 1,
      targetVersion: '0.0.1',
    });
    expect(payload.operation).toMatchObject({
      targetVersion: '0.0.1',
      actorType: 'USER',
      actorId: api.session.user.userId,
    });

    const [installation, operation] = await Promise.all([
      waitForInstallation(api, payload.installation!.id, 'ACTIVE'),
      waitForOperation(api, payload.operation!.id),
    ]);
    expect(installation).toMatchObject({
      status: 'ACTIVE',
      installedVersion: '0.0.1',
      targetVersion: '0.0.1',
      healthStatus: 'HEALTHY',
    });
    expect(installation.manifestHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(installation.installedAt).not.toBeNull();
    expect(operation).toMatchObject({ status: 'SUCCEEDED', type: 'INSTALL' });
    expect(await operationRows(installation.id)).toHaveLength(1);
  });

  test('APPS-LIFE-004 APPS-LIFE-005 APPS-LIFE-025: invalid installs and transitions have no operation side effect', async ({
    api,
  }) => {
    for (const appCode of ['', 'unknown-app', 'shopana-online-store']) {
      const rejected = await installApp(api, { appCode });
      expectSafeErrors(rejected);
      expect(rejected).toMatchObject({
        installation: null,
        operation: null,
        duplicate: false,
      });
    }

    const { installation } = await installActive(api);
    const before = await operationRows(installation.id);
    const secondInstall = await installApp(api);
    expectSafeErrors(secondInstall);
    expect(secondInstall.operation).toBeNull();

    const invalidResume = await lifecycleAction(api, 'AppResume', installation.id);
    expectSafeErrors(invalidResume);
    expect(invalidResume.operation).toBeNull();
    expect(await operationRows(installation.id)).toHaveLength(before.length);
  });

  test('APPS-LIFE-006 APPS-LIFE-026: installations are independent and foreign IDs cannot mutate', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const first = await installActive(api);
    await api.session.setupProject({ displayName: 'Second Store' });
    const secondStore = api.session.project;
    const second = await installActive(api);

    expect(second.installation.id).not.toBe(first.installation.id);
    const foreign = await updateApp(api, first.installation.id);
    expectSafeErrors(foreign);
    expect(foreign.operation).toBeNull();
    expect(await getInstallation(api, first.installation.id)).toBeNull();

    api.session.project = firstStore;
    expect(await getInstallation(api, first.installation.id)).toMatchObject({ status: 'ACTIVE' });
    expect(await getInstallation(api, second.installation.id)).toBeNull();
    api.session.project = secondStore;
  });

  test('APPS-LIFE-007 APPS-LIFE-008: failed install is safe and a new request retries the same row', async ({
    api,
  }) => {
    const rejected = await installApp(api, {
      configuration: { attempt: 1 },
      secrets: [{ name: '', value: 'invalid' }],
    });
    expectSafeErrors(rejected);
    const failedConnection = await listInstallations(api, {
      first: 20,
      where: { appCode: { _eq: 'hello-world' } },
    });
    expect(failedConnection).toMatchObject({
      totalCount: 1,
      edges: [{ node: { status: 'INSTALL_FAILED', configurationVersion: 1 } }],
    });
    const failedId = failedConnection.edges[0].node.id;
    expect(await operationRows(failedId)).toMatchObject([{ status: 'FAILED', started_at: null }]);

    const retry = await installApp(api, {
      configuration: { attempt: 2 },
      clientMutationId: crypto.randomUUID(),
    });
    expectAccepted(retry, 'INSTALL');
    expect(retry.installation!.id).toBe(failedId);
    const active = await waitForInstallation(api, failedId, 'ACTIVE');
    expect(active).toMatchObject({
      configuration: { attempt: 2 },
      configurationVersion: 2,
      status: 'ACTIVE',
    });
    expect(await operationRows(failedId)).toMatchObject([
      { status: 'FAILED' },
      { status: 'SUCCEEDED', previous_installation_status: 'INSTALL_FAILED' },
    ]);
  });

  test('APPS-LIFE-009..013: update records an immutable snapshot and preserves the prior lifecycle class', async ({
    api,
  }) => {
    const { installation } = await installActive(api, {
      configuration: { revision: 1 },
    });
    const updated = await updateApp(api, installation.id, {
      configuration: { revision: 2 },
      expectedConfigurationVersion: installation.configurationVersion,
    });
    expectAccepted(updated, 'UPDATE');
    expect(updated.operation).toMatchObject({
      previousInstallationStatus: 'ACTIVE',
      targetVersion: '0.0.1',
    });

    const current = await waitForInstallation(api, installation.id, 'ACTIVE');
    expect(current).toMatchObject({
      installedVersion: '0.0.1',
      configuration: { revision: 2 },
      configurationVersion: 2,
    });
    expect(current.manifestSnapshots.totalCount).toBeGreaterThanOrEqual(1);
    expect(
      current.manifestSnapshots.edges.every(
        ({ node }) =>
          node.appCode === 'hello-world' &&
          node.version === '0.0.1' &&
          node.manifestHash === current.manifestHash,
      ),
    ).toBe(true);
  });

  test('APPS-LIFE-011 APPS-LIFE-014..019: suspend and resume keep routes disabled until ACTIVE', async ({
    api,
  }) => {
    const { installation } = await installActive(api);
    const suspended = await lifecycleAction(api, 'AppSuspend', installation.id);
    expectAccepted(suspended, 'SUSPEND');
    expect(suspended.operation).toMatchObject({ previousInstallationStatus: 'ACTIVE' });
    expect(suspended.installation!.capabilities.every(({ status }) => status !== 'ACTIVE')).toBe(
      true,
    );

    const suspendedInstallation = await waitForInstallation(api, installation.id, 'SUSPENDED');
    expect(suspendedInstallation.suspendedAt).not.toBeNull();
    expect(suspendedInstallation.capabilities.every(({ status }) => status !== 'ACTIVE')).toBe(
      true,
    );

    const updated = await updateApp(api, installation.id);
    expectAccepted(updated, 'UPDATE');
    await waitForInstallation(api, installation.id, 'SUSPENDED');

    const resumed = await lifecycleAction(api, 'AppResume', installation.id);
    expectAccepted(resumed, 'RESUME');
    expect(resumed.operation).toMatchObject({ previousInstallationStatus: 'SUSPENDED' });
    await waitForInstallation(api, installation.id, 'ACTIVE');
  });

  test('APPS-LIFE-020..024 APPS-LIFE-027: uninstall is durable, historical, and allows a fresh install', async ({
    api,
  }) => {
    const first = await installActive(api);
    const uninstall = await lifecycleAction(api, 'AppUninstall', first.installation.id);
    expectAccepted(uninstall, 'UNINSTALL');
    expect(uninstall.installation!.capabilities.every(({ status }) => status !== 'ACTIVE')).toBe(
      true,
    );

    const terminal = await waitForInstallation(api, first.installation.id, 'UNINSTALLED');
    expect(terminal.uninstalledAt).not.toBeNull();
    expect(terminal.scopes.every(({ granted }) => !granted)).toBe(true);
    expect(terminal.lifecycleOperations.edges.map(({ node }) => node.type)).toEqual([
      'INSTALL',
      'UNINSTALL',
    ]);

    const repeatedCompletionView = await getInstallation(api, first.installation.id);
    expect(repeatedCompletionView).toEqual(terminal);
    const second = await installActive(api);
    expect(second.installation.id).not.toBe(first.installation.id);

    const connection = await listInstallations(api);
    expect(connection.totalCount).toBe(2);
    expect(connection.edges.map(({ node }) => node.status).sort()).toEqual([
      'ACTIVE',
      'UNINSTALLED',
    ]);
  });
});
