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
  secretRows,
  updateApp,
  waitForInstallation,
} from './apps-test-support';

test.describe('Apps Admin API - idempotency and concurrency', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-IDEM-001 APPS-IDEM-002 APPS-IDEM-010: install retry reuses one operation, workflow, and secret write', async ({
    api,
  }) => {
    const clientMutationId = crypto.randomUUID();
    const secret = crypto.randomUUID();
    const first = await installApp(api, {
      clientMutationId,
      secrets: [{ name: 'token', value: secret }],
    });
    expectAccepted(first, 'INSTALL');
    const duplicate = await installApp(api, {
      clientMutationId,
      secrets: [{ name: 'token', value: 'must-not-rotate' }],
    });
    expect(duplicate.userErrors).toEqual([]);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.installation!.id).toBe(first.installation!.id);
    expect(duplicate.operation!.id).toBe(first.operation!.id);
    expect(duplicate.operation!.workflowId).toBe(first.operation!.workflowId);
    expect(duplicate.operation!.workflowId).not.toContain(clientMutationId);

    await waitForInstallation(api, first.installation!.id, 'ACTIVE');
    expect(await operationRows(first.installation!.id)).toHaveLength(1);
    const secrets = await secretRows(first.installation!.id);
    expect(secrets).toHaveLength(1);
    expect(secrets[0]).toMatchObject({ version: 1 });
    expect(secrets[0].ciphertext).not.toContain(secret);
  });

  test('APPS-IDEM-003: a mutation ID cannot silently accept a different install contract', async ({
    api,
  }) => {
    const clientMutationId = crypto.randomUUID();
    const first = await installApp(api, {
      clientMutationId,
      configuration: { contract: 'first' },
    });
    expectAccepted(first, 'INSTALL');
    const conflicting = await installApp(api, {
      clientMutationId,
      configuration: { contract: 'different' },
    });
    expectSafeErrors(conflicting);
    expect(conflicting.operation).toBeNull();
    expect(await getInstallation(api, first.installation!.id)).toMatchObject({
      configuration: { contract: 'first' },
    });
  });

  test('APPS-IDEM-004 APPS-IDEM-005: every lifecycle action returns its original operation on retry', async ({
    api,
  }) => {
    const { installation } = await installActive(api);
    const updateId = crypto.randomUUID();
    const update = await updateApp(api, installation.id, { clientMutationId: updateId });
    const updateRetry = await updateApp(api, installation.id, { clientMutationId: updateId });
    expect(updateRetry).toMatchObject({
      duplicate: true,
      operation: { id: update.operation!.id },
    });
    await waitForInstallation(api, installation.id, 'ACTIVE');

    for (const [action, terminal] of [
      ['AppSuspend', 'SUSPENDED'],
      ['AppResume', 'ACTIVE'],
      ['AppUninstall', 'UNINSTALLED'],
    ] as const) {
      const id = crypto.randomUUID();
      const accepted = await lifecycleAction(api, action, installation.id, id);
      const retry = await lifecycleAction(api, action, installation.id, id);
      expect(retry).toMatchObject({
        duplicate: true,
        operation: { id: accepted.operation!.id },
      });
      await waitForInstallation(api, installation.id, terminal);
    }
  });

  test('APPS-IDEM-006 APPS-IDEM-013: idempotency keys are installation- and store-scoped', async ({
    api,
  }) => {
    const sharedId = crypto.randomUUID();
    const first = await installApp(api, {
      appCode: 'hello-world',
      clientMutationId: sharedId,
    });
    const second = await installApp(api, {
      appCode: 'shopana-headless',
      clientMutationId: sharedId,
    });
    expectAccepted(first, 'INSTALL');
    expectAccepted(second, 'INSTALL');
    expect(second.operation!.id).not.toBe(first.operation!.id);

    const firstStore = api.session.project;
    await api.session.setupProject({ displayName: 'Second Store' });
    const foreign = await installApp(api, { clientMutationId: sharedId });
    expectAccepted(foreign, 'INSTALL');
    expect(foreign.operation!.id).not.toBe(first.operation!.id);

    api.session.project = firstStore;
    expect((await listInstallations(api, { first: 20 })).totalCount).toBe(2);
  });

  test('APPS-IDEM-007 APPS-IDEM-014: parallel unique installs leave at most one non-terminal installation', async ({
    api,
  }) => {
    const results = await Promise.all([
      installApp(api, { clientMutationId: crypto.randomUUID() }),
      installApp(api, { clientMutationId: crypto.randomUUID() }),
      installApp(api, { clientMutationId: crypto.randomUUID() }),
    ]);
    expect(results.filter(({ userErrors }) => userErrors.length === 0)).toHaveLength(1);
    expect(results.filter(({ userErrors }) => userErrors.length > 0)).toHaveLength(2);

    const connection = await listInstallations(api, {
      first: 20,
      where: { appCode: { _eq: 'hello-world' } },
    });
    expect(connection.totalCount).toBe(1);
    const installation = await waitForInstallation(api, connection.edges[0].node.id);
    const operations = await operationRows(installation.id);
    expect(operations).toHaveLength(1);
    expect(
      (installation.status === 'ACTIVE' && operations[0].status === 'SUCCEEDED') ||
        (installation.status === 'INSTALL_FAILED' && operations[0].status === 'FAILED'),
    ).toBe(true);
  });

  test('APPS-IDEM-008 APPS-IDEM-009: parallel duplicate transitions accept once and converge consistently', async ({
    api,
  }) => {
    const { installation } = await installActive(api);
    const clientMutationId = crypto.randomUUID();
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        lifecycleAction(api, 'AppSuspend', installation.id, clientMutationId),
      ),
    );
    expect(results.filter(({ duplicate }) => !duplicate)).toHaveLength(1);
    expect(results.filter(({ duplicate }) => duplicate)).toHaveLength(3);
    expect(new Set(results.map(({ operation }) => operation!.id)).size).toBe(1);
    await waitForInstallation(api, installation.id, 'SUSPENDED');
    expect(await operationRows(installation.id)).toHaveLength(2);
  });

  test('APPS-IDEM-011 APPS-IDEM-012: retries observe the persisted accepted or failed operation', async ({
    api,
  }) => {
    const clientMutationId = crypto.randomUUID();
    const failed = await installApp(api, {
      clientMutationId,
      secrets: [{ name: '', value: 'invalid' }],
    });
    expectSafeErrors(failed);

    const connection = await listInstallations(api, {
      first: 20,
      where: { appCode: { _eq: 'hello-world' } },
    });
    expect(connection.totalCount).toBe(1);
    const persisted = connection.edges[0].node;
    const operations = await operationRows(persisted.id);
    expect(operations).toMatchObject([{ status: 'FAILED', started_at: null }]);

    const retry = await installApp(api, { clientMutationId });
    expect(retry).toMatchObject({
      duplicate: true,
      installation: { id: persisted.id },
    });
    expect(await operationRows(persisted.id)).toEqual(operations);
  });
});
