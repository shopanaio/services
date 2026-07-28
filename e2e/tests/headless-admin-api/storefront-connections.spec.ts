import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import { composeGlobalId } from '@utils/globalid';
import {
  DEFAULT_PERMISSIONS,
  HeadlessTestKit,
  expectSuccess,
  expectUserError,
  requiredConnection,
  requiredCredentials,
} from './headless-test-kit';

test.describe('Headless Admin API - storefront connections', () => {
  let kit: HeadlessTestKit;

  test.beforeEach(async ({ api, request }) => {
    await api.session.setupUserAndStore();
    kit = new HeadlessTestKit(api, request);
    await kit.install();
  });

  test.afterEach(async () => {
    await kit.close();
  });

  test('HDL-CONN-001: create atomically persists an ACTIVE connection and default policy', async () => {
    const payload = await kit.create();
    expectSuccess(payload);
    requiredConnection(payload.connection);
    expect(payload.connection).toMatchObject({
      status: 'ACTIVE',
      storefrontAccessPolicy: {
        permissions: DEFAULT_PERMISSIONS,
        revision: 1,
      },
    });

    const [row] = await kit.sql`
      select c.status, p.revision, count(g.permission)::int as grant_count
      from app_shopana_headless.storefront_connections c
      join app_shopana_headless.storefront_access_policies p
        on p.connection_id = c.id
      join app_shopana_headless.storefront_access_policy_grants g
        on g.connection_id = c.id
      where c.id = ${kit.rawId(payload.connection.id)}
      group by c.status, p.revision
    `;
    expect(row).toEqual({
      status: 'ACTIVE',
      revision: 1,
      grant_count: DEFAULT_PERMISSIONS.length,
    });
  });

  test('HDL-CONN-001A: create atomically persists explicitly selected permissions', async () => {
    const permissions = ['storefront.catalog.read', 'storefront.order.read'];
    const payload = await kit.create(
      'Restricted storefront',
      crypto.randomUUID(),
      permissions,
    );
    expectSuccess(payload);
    requiredConnection(payload.connection);
    expect(payload.connection.storefrontAccessPolicy).toMatchObject({
      permissions,
      revision: 1,
    });
  });

  test('HDL-CONN-002: create atomically creates one public and one private credential', async () => {
    const payload = await kit.create();
    expectSuccess(payload);
    requiredConnection(payload.connection);
    expect(payload.connection.storefrontCredentials).toHaveLength(2);
    expect(payload.connection.storefrontCredentials.map(({ kind }) => kind).sort()).toEqual([
      'PRIVATE',
      'PUBLIC',
    ]);

    const rows = await kit.sql`
      select kind, count(*)::int as count
      from app_shopana_headless.storefront_credentials
      where connection_id = ${kit.rawId(payload.connection.id)}
      group by kind
      order by kind
    `;
    expect(rows).toEqual([
      { kind: 'PRIVATE', count: 1 },
      { kind: 'PUBLIC', count: 1 },
    ]);
  });

  test('HDL-CONN-003: create payload returns connection, one-time credentials, and no user errors', async () => {
    const payload = await kit.create('Payload contract');
    expectSuccess(payload);
    requiredConnection(payload.connection);
    requiredCredentials(payload.initialStorefrontCredentials);
    expect(payload).toMatchObject({
      duplicate: false,
      connection: { displayName: 'Payload contract' },
      initialStorefrontCredentials: {
        publicAccessToken: expect.any(String),
        privateAccessToken: expect.any(String),
      },
    });
  });

  test('HDL-CONN-004: display name is trimmed and a blank value is rejected', async () => {
    const created = await kit.create('  Trimmed name  ');
    expectSuccess(created);
    expect(created.connection?.displayName).toBe('Trimmed name');

    const rejected = await kit.create(' \n\t ');
    expect(rejected.connection).toBeNull();
    expectUserError(rejected, 'STOREFRONT_DISPLAY_NAME_INVALID');
  });

  test('HDL-CONN-005: an over-limit display name returns a safe error and creates no state', async () => {
    const before = await kit.list();
    const rejected = await kit.create('x'.repeat(256));
    expect(rejected.connection).toBeNull();
    expect(rejected.initialStorefrontCredentials).toBeNull();
    expectUserError(rejected, 'STOREFRONT_DISPLAY_NAME_INVALID');
    expect(await kit.list()).toEqual(before);
  });

  test('HDL-CONN-006: one active installation owns multiple independent connections', async () => {
    const first = await kit.create('First');
    const second = await kit.create('Second');
    expectSuccess(first);
    expectSuccess(second);
    expect(first.connection?.id).not.toBe(second.connection?.id);
    expect(await kit.list()).toEqual([
      expect.objectContaining({ id: first.connection?.id }),
      expect.objectContaining({ id: second.connection?.id }),
    ]);
  });

  test('HDL-CONN-007: list is scoped to the active installation and store', async () => {
    const firstStore = kit.api.session.project;
    const local = await kit.create('Local');
    requiredConnection(local.connection);

    await kit.api.session.setupProject({ displayName: 'Foreign store' });
    await kit.install();
    const foreign = await kit.create('Foreign');
    requiredConnection(foreign.connection);
    expect((await kit.list()).map(({ id }) => id)).toEqual([foreign.connection.id]);

    kit.api.session.project = firstStore;
    expect((await kit.list()).map(({ id }) => id)).toEqual([local.connection.id]);
  });

  test('HDL-CONN-008: list state is deterministic and never duplicates credential plaintext', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const listed = await kit.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(created.connection);
    const serialized = JSON.stringify(listed);
    expect(serialized).not.toContain(created.initialStorefrontCredentials.privateAccessToken);
    expect(serialized.match(/publicAccessToken/gu)).toHaveLength(1);
  });

  test('HDL-CONN-009: connection query resolves the expected global ID in current scope', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    expect(await kit.get(created.connection.id)).toEqual(created.connection);
  });

  test('HDL-CONN-010: malformed and type-confused connection IDs return null', async () => {
    expect(await kit.get('not-a-global-id')).toBeNull();
    expect(await kit.get(composeGlobalId('StorefrontCredential', crypto.randomUUID()))).toBeNull();
  });

  test('HDL-CONN-011: a foreign connection ID returns null without existence disclosure', async () => {
    const firstStore = kit.api.session.project;
    const local = await kit.create('Local');
    requiredConnection(local.connection);
    await kit.api.session.setupProject({ displayName: 'Foreign' });
    await kit.install();
    const unknown = await kit.get(kit.connectionId());
    const hidden = await kit.get(local.connection.id);
    expect(hidden).toBe(unknown);
    kit.api.session.project = firstStore;
    expect(await kit.get(local.connection.id)).not.toBeNull();
  });

  test('HDL-CONN-012: connection exposes policy, public token, and private metadata only', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const connection = await kit.get(created.connection.id);
    requiredConnection(connection);
    expect(connection.storefrontAccessPolicy).not.toBeNull();
    expect(connection.publicAccessToken).toBe(
      created.initialStorefrontCredentials.publicAccessToken,
    );
    expect(connection.storefrontCredentials).toEqual([
      expect.objectContaining({ kind: 'PUBLIC', label: 'Public access token' }),
      expect.objectContaining({
        kind: 'PRIVATE',
        label: 'Initial private access token',
      }),
    ]);
    expect(JSON.stringify(connection)).not.toContain(
      created.initialStorefrontCredentials.privateAccessToken,
    );
  });

  test('HDL-CONN-013: update changes only displayName and updatedAt', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
    const updated = await kit.update(created.connection.id, '  Renamed  ');
    expectSuccess(updated);
    requiredConnection(updated.connection);
    expect(updated.connection.displayName).toBe('Renamed');
    expect(Date.parse(updated.connection.updatedAt)).toBeGreaterThan(
      Date.parse(created.connection.updatedAt),
    );
    expect({
      ...updated.connection,
      displayName: created.connection.displayName,
      updatedAt: created.connection.updatedAt,
    }).toEqual(created.connection);
  });

  test('HDL-CONN-014: update input cannot alter ownership, state, policy, or credentials', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const rawId = kit.rawId(created.connection.id);
    const [before] = await kit.sql`
      select installation_id, organization_id, store_id
      from app_shopana_headless.storefront_connections
      where id = ${rawId}
    `;
    const updated = await kit.update(created.connection.id, 'Safe rename');
    expectSuccess(updated);
    const [after] = await kit.sql`
      select installation_id, organization_id, store_id
      from app_shopana_headless.storefront_connections
      where id = ${rawId}
    `;
    expect(after).toEqual(before);
    expect(updated.connection).toMatchObject({
      status: created.connection.status,
      storefrontAccessPolicy: created.connection.storefrontAccessPolicy,
      storefrontCredentials: created.connection.storefrontCredentials,
    });
  });

  test('HDL-CONN-015: failed create leaves no connection, policy, credential, or idempotency row', async () => {
    const mutationId = crypto.randomUUID();
    const rejected = await kit.create('', mutationId);
    expectUserError(rejected, 'STOREFRONT_DISPLAY_NAME_INVALID');
    const [counts] = await kit.sql`
      select
        (select count(*)::int from app_shopana_headless.storefront_connections
          where store_id = ${kit.rawId(kit.api.session.project.id)}) as connections,
        (select count(*)::int from app_shopana_headless.storefront_access_policies
          where store_id = ${kit.rawId(kit.api.session.project.id)}) as policies,
        (select count(*)::int from app_shopana_headless.storefront_credentials
          where store_id = ${kit.rawId(kit.api.session.project.id)}) as credentials,
        (select count(*)::int from app_shopana_headless.storefront_mutation_idempotency
          where store_id = ${kit.rawId(kit.api.session.project.id)}
            and client_mutation_id = ${mutationId}) as idempotency
    `;
    expect(counts).toEqual({
      connections: 0,
      policies: 0,
      credentials: 0,
      idempotency: 0,
    });
  });

  test('HDL-CONN-016: failure in one operation leaves its sibling unchanged', async () => {
    const first = await kit.create('First');
    const sibling = await kit.create('Sibling');
    requiredConnection(first.connection);
    requiredConnection(sibling.connection);
    const rejected = await kit.update(first.connection.id, 'x'.repeat(256));
    expectUserError(rejected, 'STOREFRONT_DISPLAY_NAME_INVALID');
    expect(await kit.get(sibling.connection.id)).toEqual(sibling.connection);
  });
});
