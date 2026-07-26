/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  capabilityRows,
  getInstallation,
  installActive,
  installApp,
  lifecycleAction,
  listInstallations,
  secretRows,
  updateApp,
  waitForInstallation,
  withAppsDb,
} from './apps-test-support';

test.describe('Apps Admin API - runtime, capabilities, and observability', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-RUN-001 APPS-RUN-002 APPS-RUN-006: install and update synchronize the accepted manifest capability contract', async ({
    api,
  }) => {
    const { installation } = await installActive(api);
    expect(installation.capabilities).toMatchObject([
      {
        capability: 'greeting',
        assignmentMode: 'STORE',
        operation: 'hello',
        targetAppCode: 'hello-world',
        targetAction: 'hello',
        status: 'ACTIVE',
      },
    ]);
    const before = await capabilityRows(installation.id);
    expect(before).toMatchObject([
      {
        capability: 'greeting',
        assignment_mode: 'store',
        operation_contract: 'hello',
        target_app_code: 'hello-world',
        target_action: 'hello',
        status: 'active',
      },
    ]);

    const update = await updateApp(api, installation.id);
    expect(update.userErrors).toEqual([]);
    const current = await waitForInstallation(api, installation.id, 'ACTIVE');
    expect(current.capabilities).toEqual(installation.capabilities);
    expect(await capabilityRows(installation.id)).toEqual(before);
  });

  test('APPS-RUN-003..005 APPS-RUN-008: capability ownership stays store-local and follows lifecycle eligibility', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const first = await installActive(api);
    const suspended = await lifecycleAction(api, 'AppSuspend', first.installation.id);
    expect(suspended.userErrors).toEqual([]);
    expect(suspended.installation!.capabilities).toMatchObject([{ status: 'INACTIVE' }]);
    await waitForInstallation(api, first.installation.id, 'SUSPENDED');

    await api.session.setupProject({ displayName: 'Other Store' });
    const second = await installActive(api);
    expect(second.installation.capabilities).toMatchObject([{ status: 'ACTIVE' }]);
    expect(await getInstallation(api, first.installation.id)).toBeNull();

    api.session.project = firstStore;
    const resumed = await lifecycleAction(api, 'AppResume', first.installation.id);
    expect(resumed.userErrors).toEqual([]);
    await waitForInstallation(api, first.installation.id, 'ACTIVE');
    const uninstalled = await lifecycleAction(api, 'AppUninstall', first.installation.id);
    expect(uninstalled.installation!.capabilities).toMatchObject([{ status: 'INACTIVE' }]);
    const terminal = await waitForInstallation(api, first.installation.id, 'UNINSTALLED');
    expect(terminal.capabilities).toEqual([]);
    expect(terminal.lifecycleOperations.totalCount).toBe(4);
    expect(terminal.manifestSnapshots.totalCount).toBeGreaterThan(0);
  });

  test('APPS-RUN-007: resource assignments cannot create cross-store precedence through Admin lifecycle data', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const first = await installActive(api);
    await api.session.setupProject({ displayName: 'Second Store' });
    const second = await installActive(api);

    const [firstRows, secondRows] = await Promise.all([
      capabilityRows(first.installation.id),
      capabilityRows(second.installation.id),
    ]);
    expect(firstRows[0].store_id).not.toBe(secondRows[0].store_id);
    expect(
      firstRows.every(({ installation_id }) => installation_id !== secondRows[0].installation_id),
    ).toBe(true);
    api.session.project = firstStore;
  });

  test('APPS-RUN-009..014: workflow, actor, correlation, and secret telemetry expose only server-owned safe metadata', async ({
    api,
  }) => {
    const plaintext = `observable-${crypto.randomUUID()}`;
    const clientMutationId = crypto.randomUUID();
    const payload = await installApp(api, {
      clientMutationId,
      secrets: [{ name: 'private-token', value: plaintext }],
    });
    expect(payload.userErrors).toEqual([]);
    const installation = await waitForInstallation(api, payload.installation!.id, 'ACTIVE');
    expect(payload.operation).toMatchObject({
      type: 'INSTALL',
      actorType: 'USER',
      actorId: api.session.user.userId,
    });
    expect(payload.operation!.correlationId).not.toBeNull();
    expect(payload.operation!.workflowId).not.toContain(clientMutationId);

    const secrets = await secretRows(installation.id);
    expect(secrets[0].ciphertext).not.toContain(plaintext);
    const durableText = await withAppsDb(async (sql) => {
      const rows = await sql`
        select row_to_json(i)::text as value
        from apps.app_installations i
        where i.id = ${secrets[0].installation_id}
        union all
        select row_to_json(o)::text
        from apps.app_lifecycle_operations o
        where o.installation_id = ${secrets[0].installation_id}
        union all
        select row_to_json(s)::text
        from apps.app_installation_manifest_snapshots s
        where s.installation_id = ${secrets[0].installation_id}
      `;
      return rows.map(({ value }) => value).join('\n');
    });
    expect(durableText).not.toContain(plaintext);
    expect(durableText).not.toContain('private-token');
    expect(JSON.stringify(payload)).not.toContain(plaintext);
    expect(JSON.stringify(installation)).not.toContain(plaintext);
  });

  test('APPS-RUN-015..018: failed runtime is isolated and discovery remains a read-only projection over durable state', async ({
    api,
  }) => {
    const healthy = await installActive(api);
    const before = await getInstallation(api, healthy.installation.id);
    const failed = await installApp(api, { appCode: 'shopana-online-store' });
    expect(failed.userErrors.length).toBeGreaterThan(0);
    expect(failed.installation).toBeNull();
    expect(failed.operation).toBeNull();

    const discovery = await api.admin.query('apps-admin-api/AvailableApps', {
      variables: { where: null },
    });
    expect(discovery.data.appsQuery.availableApps).toMatchObject([
      { code: 'hello-world', runtimeStatus: 'READY' },
      { code: 'shopana-headless', runtimeStatus: 'READY' },
      { code: 'shopana-online-store', runtimeStatus: 'FAILED' },
    ]);
    expect(await getInstallation(api, healthy.installation.id)).toEqual(before);
    expect(await listInstallations(api, { first: 20 })).toMatchObject({
      totalCount: 1,
      edges: [{ node: { id: healthy.installation.id, status: 'ACTIVE' } }],
    });
  });
});
