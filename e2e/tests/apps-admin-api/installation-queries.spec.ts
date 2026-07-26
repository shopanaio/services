/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { encodeGlobalId } from '@utils/globalid';
import {
  configureApp,
  getInstallation,
  getOperation,
  installActive,
  installationGlobalId,
  lifecycleAction,
  listInstallations,
  operationGlobalId,
  updateApp,
  waitForInstallation,
} from './apps-test-support';

test.describe('Apps Admin API - installation queries', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-QUERY-001..007: installation lookup validates the global type and exposes complete durable state', async ({
    api,
  }) => {
    const { installation } = await installActive(api, {
      appCode: 'shopana-headless',
      configuration: { storefront: 'primary' },
    });
    const found = await getInstallation(api, installation.id);
    expect(found).toMatchObject({
      id: installation.id,
      appCode: 'shopana-headless',
      status: 'ACTIVE',
      installedVersion: '1.0.0',
      targetVersion: '1.0.0',
      configuration: { storefront: 'primary' },
      configurationVersion: 1,
      healthStatus: 'HEALTHY',
      scopes: [{ scope: 'project.getStoreById', granted: true, revokedAt: null }],
    });
    expect(found!.manifestHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(new Date(found!.createdAt).toISOString()).toBe(found!.createdAt);
    expect(found!.lifecycleOperations.totalCount).toBe(1);
    expect(found!.manifestSnapshots.totalCount).toBe(1);

    for (const invalidId of [
      '',
      'not-base64',
      encodeGlobalId('AppLifecycleOperation', crypto.randomUUID()),
      installationGlobalId(),
    ]) {
      expect(await getInstallation(api, invalidId)).toBeNull();
    }
  });

  test('APPS-QUERY-003 APPS-QUERY-015 APPS-QUERY-016 APPS-QUERY-020: point reads and batches do not cross stores', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const first = await installActive(api);
    await api.session.setupProject({ displayName: 'Foreign Store' });
    const second = await installActive(api);

    expect(await getInstallation(api, first.installation.id)).toBeNull();
    expect(await getOperation(api, first.payload.operation!.id)).toBeNull();
    const local = await Promise.all([
      getInstallation(api, second.installation.id),
      getOperation(api, second.payload.operation!.id),
      getInstallation(api, first.installation.id),
      getOperation(api, first.payload.operation!.id),
    ]);
    expect(local.map((value) => value !== null)).toEqual([true, true, false, false]);

    api.session.project = firstStore;
    expect(await getInstallation(api, first.installation.id)).not.toBeNull();
    expect(await getInstallation(api, second.installation.id)).toBeNull();
  });

  test('APPS-QUERY-005 APPS-QUERY-006: configuration versions increase and revoked scope history remains queryable', async ({
    api,
  }) => {
    const { installation } = await installActive(api, { appCode: 'shopana-headless' });
    const configured = await configureApp(
      api,
      installation.id,
      installation.configurationVersion,
      { mode: 'headless' },
      [],
    );
    expect(configured.userErrors).toEqual([]);
    expect(configured.installation).toMatchObject({
      configuration: { mode: 'headless' },
      configurationVersion: 2,
      scopes: [{ scope: 'project.getStoreById', granted: false }],
    });
    expect(configured.installation!.scopes[0].revokedAt).not.toBeNull();
  });

  test('APPS-QUERY-008..010: installation connection has stable descending order and lossless Relay pagination', async ({
    api,
  }) => {
    const createdIds: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const { installation } = await installActive(api);
      createdIds.push(installation.id);
      if (index < 2) {
        const uninstalled = await lifecycleAction(api, 'AppUninstall', installation.id);
        await waitForInstallation(api, uninstalled.installation!.id, 'UNINSTALLED');
      }
    }

    const defaultConnection = await listInstallations(api, {});
    expect(defaultConnection.edges.map(({ node }) => node.id)).toEqual([...createdIds].reverse());

    const firstPage = await listInstallations(api, { first: 2 });
    const secondPage = await listInstallations(api, {
      first: 2,
      after: firstPage.pageInfo.endCursor,
    });
    expect(firstPage.pageInfo.hasNextPage).toBe(true);
    expect(new Set([...firstPage.edges, ...secondPage.edges].map(({ node }) => node.id))).toEqual(
      new Set(createdIds),
    );

    const backward = await listInstallations(api, {
      last: 2,
      before: firstPage.pageInfo.endCursor,
    });
    expect(backward.edges.map(({ node }) => node.id)).toEqual([firstPage.edges[0].node.id]);
  });

  test('APPS-QUERY-011..013: totalCount, filters, and declared ordering operate inside the trusted store', async ({
    api,
  }) => {
    const active = await installActive(api, {
      configuration: { kind: 'active' },
    });
    const old = await installActive(api, { appCode: 'shopana-headless' });
    await configureApp(api, old.installation.id, 1, { kind: 'configured' });
    await lifecycleAction(api, 'AppUninstall', old.installation.id);
    await waitForInstallation(api, old.installation.id, 'UNINSTALLED');

    const filters = [
      { appCode: { _eq: 'hello-world' } },
      { status: { _eq: 'ACTIVE' } },
      { installedVersion: { _eq: '0.0.1' } },
      { healthStatus: { _eq: 'HEALTHY' } },
      { configurationVersion: { _eq: 1 } },
    ];
    for (const where of filters) {
      const connection = await listInstallations(api, { first: 20, where });
      expect(connection.totalCount).toBe(1);
      expect(connection.edges[0].node.id).toBe(active.installation.id);
    }

    const ordered = await listInstallations(api, {
      first: 20,
      orderBy: [{ field: 'appCode', direction: 'ASC' }],
    });
    expect(ordered.edges.map(({ node }) => node.appCode)).toEqual([
      'hello-world',
      'shopana-headless',
    ]);
  });

  test('APPS-QUERY-014: invalid cursor and pagination combinations fail without state changes', async ({
    api,
  }) => {
    await installActive(api);
    const before = await listInstallations(api, { first: 20 });
    for (const variables of [
      { first: 1, last: 1 },
      { first: 1, after: 'invalid-cursor' },
      { last: 1, before: 'invalid-cursor' },
    ]) {
      const response = await api.admin.query('apps-admin-api/AppInstallations', {
        variables,
        throwOnError: false,
      });
      expect(response.errors?.length).toBeGreaterThan(0);
    }
    expect(await listInstallations(api, { first: 20 })).toEqual(before);
  });

  test('APPS-QUERY-017..019: lifecycle and manifest history are deterministic, immutable, and installation-scoped', async ({
    api,
  }) => {
    const first = await installActive(api);
    await updateApp(api, first.installation.id);
    await waitForInstallation(api, first.installation.id, 'ACTIVE');
    const second = await installActive(api, { appCode: 'shopana-headless' });

    const operation = await getOperation(api, first.payload.operation!.id);
    expect(operation).toMatchObject({
      installation: { id: first.installation.id },
      type: 'INSTALL',
      status: 'SUCCEEDED',
      actorType: 'USER',
    });
    expect(operation!.workflowId).not.toContain(first.payload.operation!.id);
    expect(operation!.correlationId).not.toBeNull();
    expect(await getOperation(api, operationGlobalId())).toBeNull();

    const history = await getInstallation(api, first.installation.id);
    expect(history!.lifecycleOperations.edges.map(({ node }) => node.type)).toEqual([
      'INSTALL',
      'UPDATE',
    ]);
    expect(
      history!.lifecycleOperations.edges.every(
        ({ node }) => node.id !== second.payload.operation!.id,
      ),
    ).toBe(true);
    expect(new Set(history!.manifestSnapshots.edges.map(({ node }) => node.manifestHash))).toEqual(
      new Set([history!.manifestHash]),
    );
  });
});
