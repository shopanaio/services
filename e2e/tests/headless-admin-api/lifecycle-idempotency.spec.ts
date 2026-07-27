/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  HeadlessTestKit,
  expectStorefrontAllowed,
  expectStorefrontError,
  expectSuccess,
  expectUserError,
  requiredConnection,
  requiredCredentials,
} from './headless-test-kit';

test.describe('Headless Admin API - lifecycle and idempotency', () => {
  let kit: HeadlessTestKit;
  let installationId: string;

  test.beforeEach(async ({ api, request }) => {
    await api.session.setupUserAndStore();
    kit = new HeadlessTestKit(api, request);
    installationId = await kit.install();
  });

  test.afterEach(async () => {
    await kit.close();
  });

  test('HDL-LIFE-001: ACTIVE connection accepts public and private credentials', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    expectStorefrontAllowed(
      await kit.storefront(created.initialStorefrontCredentials.publicAccessToken),
    );
    expectStorefrontAllowed(
      await kit.storefront(created.initialStorefrontCredentials.privateAccessToken, 'PRIVATE'),
    );
  });

  test('HDL-LIFE-002: suspend changes ACTIVE connection to SUSPENDED', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const suspended = await kit.suspend(created.connection.id);
    expectSuccess(suspended);
    expect(suspended.connection?.status).toBe('SUSPENDED');
  });

  test('HDL-LIFE-003: suspended credentials are blocked without physical deletion', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    await kit.suspend(created.connection.id);
    expectStorefrontError(
      await kit.storefront(created.initialStorefrontCredentials.publicAccessToken),
      'STOREFRONT_CREDENTIAL_INVALID',
    );
    const rows = await kit.sql`
      select status from app_shopana_headless.storefront_credentials
      where connection_id = ${kit.rawId(created.connection.id)}
      order by kind
    `;
    expect(rows).toHaveLength(2);
    expect(rows.every(({ status }) => status === 'ACTIVE')).toBe(true);
  });

  test('HDL-LIFE-004: resume changes SUSPENDED connection to ACTIVE', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    await kit.suspend(created.connection.id);
    const resumed = await kit.resume(created.connection.id);
    expectSuccess(resumed);
    expect(resumed.connection?.status).toBe('ACTIVE');
  });

  test('HDL-LIFE-005: resume restores only non-revoked credentials and current policy', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const rotated = await kit.createPrivate(created.connection.id);
    const initialPrivate = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PRIVATE',
    )!;
    await kit.revoke(initialPrivate.id);
    await kit.replacePolicy(created.connection.id, ['storefront.catalog.read'], 1);
    await kit.suspend(created.connection.id);
    await kit.resume(created.connection.id);
    expectStorefrontError(
      await kit.storefront(created.initialStorefrontCredentials.privateAccessToken, 'PRIVATE'),
      'STOREFRONT_CREDENTIAL_INVALID',
    );
    expectStorefrontAllowed(await kit.storefront(rotated.privateAccessToken!, 'PRIVATE'));
    expect((await kit.get(created.connection.id))?.storefrontAccessPolicy).toMatchObject({
      permissions: ['storefront.catalog.read'],
      revision: 2,
    });
  });

  test('HDL-LIFE-006: invalid transitions return errors without changing state', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const invalidResume = await kit.resume(created.connection.id);
    expectUserError(invalidResume, 'STOREFRONT_INVALID_STATE');
    expect((await kit.get(created.connection.id))?.status).toBe('ACTIVE');
    await kit.disconnect(created.connection.id);
    const invalidSuspend = await kit.suspend(created.connection.id);
    expectUserError(invalidSuspend, 'STOREFRONT_INVALID_STATE');
    expect((await kit.get(created.connection.id))?.status).toBe('DISCONNECTED');
  });

  test('HDL-LIFE-007: disconnect atomically marks connection and all credentials terminal', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    await kit.createPrivate(created.connection.id);
    const disconnected = await kit.disconnect(created.connection.id);
    expectSuccess(disconnected);
    expect(disconnected.connection?.status).toBe('DISCONNECTED');
    expect(disconnected.connection?.storefrontCredentials).toHaveLength(3);
    expect(
      disconnected.connection?.storefrontCredentials.every(
        ({ status, revokedAt }) => status === 'REVOKED' && revokedAt !== null,
      ),
    ).toBe(true);
  });

  test('HDL-LIFE-008: disconnected connection cannot resume, update, or receive credentials', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    await kit.disconnect(created.connection.id);
    expectUserError(await kit.resume(created.connection.id), 'STOREFRONT_INVALID_STATE');
    expectUserError(
      await kit.update(created.connection.id, 'Should not change'),
      'STOREFRONT_INVALID_STATE',
    );
    expectUserError(await kit.createPrivate(created.connection.id), 'STOREFRONT_INVALID_STATE');
  });

  test('HDL-LIFE-009: disconnect preserves connection, credential, policy, and audit history', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    await kit.disconnect(created.connection.id);
    const rawId = kit.rawId(created.connection.id);
    const [row] = await kit.sql`
      select
        c.status,
        c.disconnected_at is not null as disconnected,
        p.revision,
        (select count(*)::int from app_shopana_headless.storefront_credentials
          where connection_id = c.id) as credentials
      from app_shopana_headless.storefront_connections c
      join app_shopana_headless.storefront_access_policies p
        on p.connection_id = c.id
      where c.id = ${rawId}
    `;
    expect(row).toEqual({
      status: 'DISCONNECTED',
      disconnected: true,
      revision: 1,
      credentials: 2,
    });
  });

  test('HDL-LIFE-010: suspended Headless installation blocks every owned connection', async () => {
    const first = await kit.create('First');
    const second = await kit.create('Second');
    requiredCredentials(first.initialStorefrontCredentials);
    requiredCredentials(second.initialStorefrontCredentials);
    await appAction(kit, 'AppSuspend', 'appSuspend', installationId);
    expectStorefrontError(
      await kit.storefront(first.initialStorefrontCredentials.publicAccessToken),
      'STOREFRONT_CREDENTIAL_INVALID',
    );
    expectStorefrontError(
      await kit.storefront(second.initialStorefrontCredentials.publicAccessToken),
      'STOREFRONT_CREDENTIAL_INVALID',
    );
  });

  test('HDL-LIFE-011: installation resume restores only ACTIVE connections', async () => {
    const active = await kit.create('Active');
    const suspended = await kit.create('Suspended');
    requiredConnection(suspended.connection);
    requiredCredentials(active.initialStorefrontCredentials);
    requiredCredentials(suspended.initialStorefrontCredentials);
    await kit.suspend(suspended.connection.id);
    await appAction(kit, 'AppSuspend', 'appSuspend', installationId);
    await appAction(kit, 'AppResume', 'appResume', installationId);
    expectStorefrontAllowed(
      await kit.storefront(active.initialStorefrontCredentials.publicAccessToken),
    );
    expectStorefrontError(
      await kit.storefront(suspended.initialStorefrontCredentials.publicAccessToken),
      'STOREFRONT_CREDENTIAL_INVALID',
    );
  });

  test('HDL-LIFE-012: uninstall disconnects connections and revokes credentials', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    await appAction(kit, 'AppUninstall', 'appUninstall', installationId);
    await expect
      .poll(async () => {
        const [row] = await kit.sql`
          select status from app_shopana_headless.storefront_connections
          where id = ${kit.rawId(created.connection.id)}
        `;
        return row?.status;
      })
      .toBe('DISCONNECTED');
    const credentials = await kit.sql`
      select status from app_shopana_headless.storefront_credentials
      where connection_id = ${kit.rawId(created.connection.id)}
    `;
    expect(credentials.every(({ status }) => status === 'REVOKED')).toBe(true);
  });

  test('HDL-LIFE-013: a failed operation never changes a sibling lifecycle', async () => {
    const first = await kit.create('First');
    const sibling = await kit.create('Sibling');
    requiredConnection(first.connection);
    requiredConnection(sibling.connection);
    await kit.disconnect(first.connection.id);
    expectUserError(await kit.resume(first.connection.id), 'STOREFRONT_INVALID_STATE');
    expect(await kit.get(sibling.connection.id)).toEqual(sibling.connection);
  });

  test('HDL-IDEM-001: duplicate connection create reuses the original connection', async () => {
    const mutationId = crypto.randomUUID();
    const first = await kit.create('First', mutationId);
    const duplicate = await kit.create('Retry', mutationId);
    expectSuccess(first);
    expectSuccess(duplicate);
    expect(duplicate).toMatchObject({
      connection: { id: first.connection?.id, displayName: 'First' },
      duplicate: true,
    });
  });

  test('HDL-IDEM-002: duplicate create adds no policy or credential rows', async () => {
    const mutationId = crypto.randomUUID();
    const first = await kit.create('First', mutationId);
    requiredConnection(first.connection);
    await kit.create('Retry', mutationId);
    const [counts] = await kit.sql`
      select
        (select count(*)::int from app_shopana_headless.storefront_connections
          where id = ${kit.rawId(first.connection.id)}) as connections,
        (select count(*)::int from app_shopana_headless.storefront_access_policies
          where connection_id = ${kit.rawId(first.connection.id)}) as policies,
        (select count(*)::int from app_shopana_headless.storefront_credentials
          where connection_id = ${kit.rawId(first.connection.id)}) as credentials
    `;
    expect(counts).toEqual({ connections: 1, policies: 1, credentials: 2 });
  });

  test('HDL-IDEM-003: duplicate create never re-reveals initial private plaintext', async () => {
    const mutationId = crypto.randomUUID();
    const first = await kit.create('First', mutationId);
    const duplicate = await kit.create('Retry', mutationId);
    requiredCredentials(first.initialStorefrontCredentials);
    expect(duplicate.initialStorefrontCredentials).toBeNull();
    expect(JSON.stringify(duplicate)).not.toContain(
      first.initialStorefrontCredentials.privateAccessToken,
    );
  });

  test('HDL-IDEM-004: duplicate create preserves repeat-readable public recovery', async () => {
    const mutationId = crypto.randomUUID();
    const first = await kit.create('First', mutationId);
    const duplicate = await kit.create('Retry', mutationId);
    requiredConnection(first.connection);
    requiredCredentials(first.initialStorefrontCredentials);
    expect(duplicate.connection?.publicAccessToken).toBe(
      first.initialStorefrontCredentials.publicAccessToken,
    );
  });

  test('HDL-IDEM-005: duplicate private create adds no credential and hides plaintext', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const mutationId = crypto.randomUUID();
    const first = await kit.createPrivate(created.connection.id, 'Rotation', mutationId);
    const duplicate = await kit.createPrivate(created.connection.id, 'Ignored', mutationId);
    expectSuccess(first);
    expectSuccess(duplicate);
    expect(duplicate).toMatchObject({
      credential: { id: first.credential?.id, label: 'Rotation' },
      privateAccessToken: null,
    });
    expect((await kit.get(created.connection.id))?.storefrontCredentials).toHaveLength(3);
  });

  test('HDL-IDEM-006: repeated suspend, resume, disconnect, and revoke are deterministic', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const privateCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PRIVATE',
    )!;
    expectSuccess(await kit.suspend(created.connection.id));
    expectSuccess(await kit.suspend(created.connection.id));
    expectSuccess(await kit.resume(created.connection.id));
    expectSuccess(await kit.resume(created.connection.id));
    expectSuccess(await kit.revoke(privateCredential.id));
    expectSuccess(await kit.revoke(privateCredential.id));
    expectSuccess(await kit.disconnect(created.connection.id));
    expectSuccess(await kit.disconnect(created.connection.id));
  });

  test('HDL-IDEM-007: one client mutation ID cannot identify different mutation contracts', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const mutationId = crypto.randomUUID();
    expectSuccess(await kit.createPrivate(created.connection.id, 'Rotation', mutationId));
    const conflicting = await kit.suspend(created.connection.id, mutationId);
    expectUserError(conflicting, 'CLIENT_MUTATION_ID_CONTRACT_MISMATCH');
    expect((await kit.get(created.connection.id))?.status).toBe('ACTIVE');
  });

  test('HDL-IDEM-008: parallel create attempts produce one complete connection', async () => {
    const mutationId = crypto.randomUUID();
    const results = await Promise.all(
      Array.from({ length: 4 }, () => kit.create('Parallel', mutationId)),
    );
    expect(new Set(results.map(({ connection }) => connection?.id)).size).toBe(1);
    expect(results.filter(({ duplicate }) => duplicate)).toHaveLength(3);
    const connections = await kit.list();
    expect(connections).toHaveLength(1);
    expect(connections[0].storefrontAccessPolicy).not.toBeNull();
    expect(connections[0].storefrontCredentials).toHaveLength(2);
  });

  test('HDL-IDEM-009: parallel disconnect and credential create leave no active orphan', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    await Promise.all([
      kit.disconnect(created.connection.id),
      kit.createPrivate(created.connection.id, 'Racing credential'),
    ]);
    const [connection] = await kit.sql`
      select status from app_shopana_headless.storefront_connections
      where id = ${kit.rawId(created.connection.id)}
    `;
    const credentials = await kit.sql`
      select status from app_shopana_headless.storefront_credentials
      where connection_id = ${kit.rawId(created.connection.id)}
    `;
    expect(connection.status).toBe('DISCONNECTED');
    expect(credentials.every(({ status }) => status === 'REVOKED')).toBe(true);
  });

  test('HDL-IDEM-010: idempotency identity is scoped to installation and store', async () => {
    const mutationId = crypto.randomUUID();
    const ownerStore = kit.api.session.project;
    const first = await kit.create('First store', mutationId);
    await kit.api.session.setupProject({ displayName: 'Second store' });
    await kit.install();
    const second = await kit.create('Second store', mutationId);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
    expect(first.connection?.id).not.toBe(second.connection?.id);
    kit.api.session.project = ownerStore;
  });
});

async function appAction(
  kit: HeadlessTestKit,
  query: 'AppSuspend' | 'AppResume' | 'AppUninstall',
  field: 'appSuspend' | 'appResume' | 'appUninstall',
  installationId: string,
): Promise<void> {
  const response = await kit.api.admin.mutation(`apps-admin-api/${query}`, {
    variables: {
      input: {
        installationId,
        clientMutationId: crypto.randomUUID(),
      },
    },
  });
  expect(response.data.appsMutation[field].userErrors).toEqual([]);
  const expected =
    field === 'appSuspend' ? 'SUSPENDED' : field === 'appResume' ? 'ACTIVE' : 'UNINSTALLED';
  await expect
    .poll(async () => {
      const current = await kit.api.admin.query('apps-admin-api/AppInstallation', {
        variables: { id: installationId },
      });
      return current.data.appsQuery.appInstallation?.status;
    })
    .toBe(expected);
}
