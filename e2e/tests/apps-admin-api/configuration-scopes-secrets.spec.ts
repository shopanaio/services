/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  configureApp,
  expectSafeErrors,
  getInstallation,
  installActive,
  installApp,
  lifecycleAction,
  operationRows,
  secretRows,
  updateApp,
  waitForInstallation,
} from './apps-test-support';

test.describe('Apps Admin API - configuration, scopes, and secrets', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-CONF-001..004: configure is a compare-and-swap replacement with one concurrent winner', async ({
    api,
  }) => {
    const { installation } = await installActive(api, {
      configuration: { revision: 1, removed: true },
    });
    const first = await configureApp(api, installation.id, 1, { revision: 2 });
    expect(first.userErrors).toEqual([]);
    expect(first.installation).toMatchObject({
      configuration: { revision: 2 },
      configurationVersion: 2,
    });

    const stale = await configureApp(api, installation.id, 1, { revision: 3 });
    expectSafeErrors(stale);
    expect(stale.installation).toBeNull();
    expect(await getInstallation(api, installation.id)).toMatchObject({
      configuration: { revision: 2 },
      configurationVersion: 2,
    });

    const concurrent = await Promise.all([
      configureApp(api, installation.id, 2, { winner: 'a' }),
      configureApp(api, installation.id, 2, { winner: 'b' }),
    ]);
    expect(concurrent.filter(({ userErrors }) => userErrors.length === 0)).toHaveLength(1);
    expect(concurrent.filter(({ userErrors }) => userErrors.length > 0)).toHaveLength(1);
    expect((await getInstallation(api, installation.id))!.configurationVersion).toBe(3);
  });

  test('APPS-CONF-005..007: update version is required only for configuration and omitted scopes are preserved', async ({
    api,
  }) => {
    const { installation } = await installActive(api, { appCode: 'shopana-headless' });
    const missingVersion = await updateApp(api, installation.id, {
      configuration: { invalid: true },
    });
    expectSafeErrors(missingVersion);
    expect(missingVersion.operation).toBeNull();

    const updated = await updateApp(api, installation.id);
    expect(updated.userErrors).toEqual([]);
    await waitForInstallation(api, installation.id, 'ACTIVE');
    const current = await getInstallation(api, installation.id);
    expect(current).toMatchObject({
      configurationVersion: 1,
      scopes: [{ scope: 'project.getStoreById', granted: true }],
    });
  });

  test('APPS-CONF-008..012: supplied scopes are normalized replacements with retained revocation history', async ({
    api,
  }) => {
    const { installation } = await installActive(api, {
      appCode: 'shopana-headless',
      grantedScopes: ['project.getStoreById', 'project.getStoreById'],
    });
    expect(installation.scopes).toMatchObject([
      { scope: 'project.getStoreById', granted: true, revokedAt: null },
    ]);

    const rejected = await configureApp(api, installation.id, 1, { unchanged: false }, [
      'unknown.scope',
    ]);
    expectSafeErrors(rejected);
    expect(await getInstallation(api, installation.id)).toMatchObject({
      configuration: {},
      configurationVersion: 1,
      scopes: [{ scope: 'project.getStoreById', granted: true }],
      status: 'ACTIVE',
    });

    const revoked = await configureApp(api, installation.id, 1, { configured: true }, []);
    expect(revoked.userErrors).toEqual([]);
    expect(revoked.installation!.scopes).toMatchObject([
      { scope: 'project.getStoreById', granted: false },
    ]);
    expect(revoked.installation!.scopes[0].revokedAt).not.toBeNull();
  });

  test('APPS-CONF-011: configuration and grants for the same App are store-local', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const first = await installActive(api, { appCode: 'shopana-headless' });
    await configureApp(api, first.installation.id, 1, { store: 'first' }, []);

    await api.session.setupProject({ displayName: 'Second Store' });
    const second = await installActive(api, { appCode: 'shopana-headless' });
    expect(second.installation).toMatchObject({
      configuration: {},
      configurationVersion: 1,
      scopes: [{ scope: 'project.getStoreById', granted: true }],
    });

    api.session.project = firstStore;
    expect(await getInstallation(api, first.installation.id)).toMatchObject({
      configuration: { store: 'first' },
      configurationVersion: 2,
      scopes: [{ scope: 'project.getStoreById', granted: false }],
    });
  });

  test('APPS-CONF-013 APPS-CONF-014 APPS-CONF-016 APPS-CONF-021: secrets are write-only, encrypted, deduplicated, and absent from payloads', async ({
    api,
  }) => {
    const plaintext = `secret-${crypto.randomUUID()}`;
    const payload = await installApp(api, {
      secrets: [
        { name: 'api-key', value: 'superseded' },
        { name: 'api-key', value: plaintext },
      ],
    });
    expect(payload.userErrors).toEqual([]);
    const installation = await waitForInstallation(api, payload.installation!.id, 'ACTIVE');
    const rows = await secretRows(installation.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'api-key', version: 1, revoked_at: null });
    expect(rows[0].ciphertext).toMatch(/^v1\.[^.]+\.[^.]+\.[^.]+$/u);
    expect(rows[0].ciphertext).not.toContain(plaintext);
    expect(rows[0].ciphertext).not.toContain('superseded');
    expect(JSON.stringify(payload)).not.toContain(plaintext);
    expect(JSON.stringify(installation)).not.toContain(plaintext);
    expect(JSON.stringify(payload)).not.toContain('api-key');
  });

  test('APPS-CONF-015 APPS-CONF-018: invalid secret names fail atomically before App workflow dispatch', async ({
    api,
  }) => {
    for (const [index, name] of ['', ' '.repeat(4), 'x'.repeat(129)].entries()) {
      if (index > 0) {
        await api.session.setupProject({ displayName: `Invalid Secret Store ${index}` });
      }
      const payload = await installApp(api, {
        secrets: [{ name, value: 'must-not-persist' }],
      });
      expectSafeErrors(payload);
      expect(payload.installation).toBeNull();
      expect(payload.operation).toBeNull();
      const connection = await api.admin.query('apps-admin-api/AppInstallations', {
        variables: { first: 20 },
      });
      expect(connection.data.appsQuery.appInstallations.totalCount).toBe(1);
      const [{ node }] = connection.data.appsQuery.appInstallations.edges;
      expect(await secretRows(node.id)).toEqual([]);
      const operations = await operationRows(node.id);
      expect(operations).toHaveLength(1);
      expect(operations[0]).toMatchObject({
        status: 'FAILED',
        started_at: null,
      });
    }
  });

  test('APPS-CONF-017 APPS-CONF-020: rotation changes only named ciphertext and keeps installation ownership', async ({
    api,
  }) => {
    const firstValue = `first-${crypto.randomUUID()}`;
    const secondValue = `second-${crypto.randomUUID()}`;
    const { installation } = await installActive(api, {
      secrets: [
        { name: 'rotated', value: firstValue },
        { name: 'stable', value: 'stable-value' },
      ],
    });
    const before = await secretRows(installation.id);
    const updated = await updateApp(api, installation.id, {
      secrets: [{ name: 'rotated', value: secondValue }],
    });
    expect(updated.userErrors).toEqual([]);
    await waitForInstallation(api, installation.id, 'ACTIVE');
    const after = await secretRows(installation.id);

    expect(after.find(({ name }) => name === 'rotated')).toMatchObject({
      installation_id: before[0].installation_id,
      version: 2,
    });
    expect(after.find(({ name }) => name === 'rotated')!.ciphertext).not.toBe(
      before.find(({ name }) => name === 'rotated')!.ciphertext,
    );
    expect(after.find(({ name }) => name === 'stable')!.ciphertext).toBe(
      before.find(({ name }) => name === 'stable')!.ciphertext,
    );
    expect(JSON.stringify(updated)).not.toMatch(new RegExp(`${firstValue}|${secondValue}`, 'u'));
  });

  test('APPS-CONF-019: uninstall revokes every secret before terminal completion', async ({
    api,
  }) => {
    const { installation } = await installActive(api, {
      secrets: [{ name: 'token', value: crypto.randomUUID() }],
    });
    const uninstall = await lifecycleAction(api, 'AppUninstall', installation.id);
    expect(uninstall.userErrors).toEqual([]);
    await expect
      .poll(async () => (await secretRows(installation.id))[0]?.revoked_at ?? null)
      .not.toBeNull();
    await waitForInstallation(api, installation.id, 'UNINSTALLED');
  });
});
