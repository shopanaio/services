/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  HeadlessTestKit,
  expectUserError,
  requiredConnection,
  requiredCredentials,
} from './headless-test-kit';

const CONNECTIONS_QUERY = `query HeadlessConnections {
  headlessAppQuery { headlessStorefrontConnections { id } }
}`;

test.describe('Headless Admin API - authorization and tenancy', () => {
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

  test('HDL-SEC-001: Admin authentication is required for every Headless operation', async () => {
    const accessToken = kit.api.session.user.accessToken;
    kit.api.session.clearSession();
    const query = await kit.admin(CONNECTIONS_QUERY);
    const mutation = await kit.admin(
      `mutation UnauthorizedCreate($input: HeadlessStorefrontCreateInput!) {
        headlessAppMutation {
          headlessStorefrontCreate(input: $input) { connection { id } userErrors { code } }
        }
      }`,
      { input: { displayName: 'Denied', clientMutationId: crypto.randomUUID() } },
    );
    expect(query.data ?? null).toBeNull();
    expect(mutation.data ?? null).toBeNull();
    expect(query.errors).toBeTruthy();
    expect(mutation.errors).toBeTruthy();
    kit.api.session.user.accessToken = accessToken;
  });

  test('HDL-SEC-002: common Admin authorization denies before Headless execution', async () => {
    const before = await headlessCounts(kit);
    const accessToken = kit.api.session.user.accessToken;
    kit.api.session.clearSession();
    await kit.admin(
      `mutation DeniedBeforeExecution($input: HeadlessStorefrontCreateInput!) {
        headlessAppMutation {
          headlessStorefrontCreate(input: $input) { connection { id } userErrors { code } }
        }
      }`,
      { input: { displayName: 'Denied', clientMutationId: crypto.randomUUID() } },
    );
    kit.api.session.user.accessToken = accessToken;
    expect(await headlessCounts(kit)).toEqual(before);
  });

  test('HDL-SEC-003: App grantedScopes never replace Admin RBAC identity', async () => {
    const accessToken = kit.api.session.user.accessToken;
    kit.api.session.clearSession();
    const response = await kit.admin(CONNECTIONS_QUERY, undefined, {
      'x-app-code': 'shopana-headless',
      'x-app-scopes': '*',
    });
    expect(response.data ?? null).toBeNull();
    expect(response.errors).toBeTruthy();
    kit.api.session.user.accessToken = accessToken;
  });

  test('HDL-SEC-004: organization and store ownership come from verified Admin scope', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const [row] = await kit.sql`
      select organization_id, store_id
      from app_shopana_headless.storefront_connections
      where id = ${kit.rawId(created.connection.id)}
    `;
    expect(row).toEqual({
      organization_id: kit.rawId(kit.api.session.organizationId!),
      store_id: kit.rawId(kit.api.session.project.id),
    });
  });

  test('HDL-SEC-005: client App attribution headers cannot replace trusted ownership', async () => {
    const response = await kit.admin<{
      headlessAppMutation: {
        headlessStorefrontCreate: { connection: { id: string }; userErrors: unknown[] };
      };
    }>(
      `mutation SpoofedCreate($input: HeadlessStorefrontCreateInput!) {
        headlessAppMutation {
          headlessStorefrontCreate(input: $input) {
            connection { id }
            userErrors { code message field }
          }
        }
      }`,
      { input: { displayName: 'Trusted scope', clientMutationId: crypto.randomUUID() } },
      {
        'x-app-installation-id': crypto.randomUUID(),
        'x-app-store-id': crypto.randomUUID(),
        'x-app-organization-id': crypto.randomUUID(),
      },
    );
    expect(response.data?.headlessAppMutation.headlessStorefrontCreate.userErrors).toEqual([]);
    const rawId = kit.rawId(
      response.data!.headlessAppMutation.headlessStorefrontCreate.connection.id,
    );
    const [row] = await kit.sql`
      select organization_id, store_id
      from app_shopana_headless.storefront_connections
      where id = ${rawId}
    `;
    expect(row).toMatchObject({
      organization_id: kit.rawId(kit.api.session.organizationId!),
      store_id: kit.rawId(kit.api.session.project.id),
    });
  });

  test('HDL-SEC-006: create resolves the active Headless installation server-side', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const [row] = await kit.sql`
      select c.installation_id, i.app_code, i.status
      from app_shopana_headless.storefront_connections c
      join apps.app_installations i on i.id = c.installation_id
      where c.id = ${kit.rawId(created.connection.id)}
    `;
    expect(row).toMatchObject({ app_code: 'shopana-headless', status: 'ACTIVE' });
  });

  test('HDL-SEC-007: create fails safely without an active Headless installation', async () => {
    await kit.api.session.setupProject({ displayName: 'No Headless installation' });
    const before = await headlessCounts(kit);
    const response = await kit.admin(
      `mutation MissingInstallation($input: HeadlessStorefrontCreateInput!) {
        headlessAppMutation {
          headlessStorefrontCreate(input: $input) {
            connection { id }
            userErrors { code message field }
          }
        }
      }`,
      { input: { displayName: 'Denied', clientMutationId: crypto.randomUUID() } },
    );
    expect(response.data ?? null).toBeNull();
    expect(response.errors).toBeTruthy();
    expect(await headlessCounts(kit)).toEqual(before);
  });

  test('HDL-SEC-008: operations cross-check connection, store, and installation together', async () => {
    const ownerStore = kit.api.session.project;
    const created = await kit.create();
    requiredConnection(created.connection);
    await kit.api.session.setupProject({ displayName: 'Foreign store' });
    await kit.install();
    expectUserError(await kit.update(created.connection.id, 'Captured'), 'STOREFRONT_NOT_FOUND');
    kit.api.session.project = ownerStore;
    expect((await kit.get(created.connection.id))?.displayName).not.toBe('Captured');
  });

  test('HDL-SEC-009: Store A connection cannot be read or mutated through Store B', async () => {
    const storeA = kit.api.session.project;
    const created = await kit.create();
    requiredConnection(created.connection);
    await kit.api.session.setupProject({ displayName: 'Store B' });
    await kit.install();
    expect(await kit.get(created.connection.id)).toBeNull();
    expectUserError(await kit.suspend(created.connection.id), 'STOREFRONT_NOT_FOUND');
    kit.api.session.project = storeA;
    expect(await kit.get(created.connection.id)).toEqual(created.connection);
  });

  test('HDL-SEC-010: Store A credential cannot be listed or revoked through Store B', async () => {
    const storeA = kit.api.session.project;
    const created = await kit.create();
    requiredConnection(created.connection);
    const privateCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PRIVATE',
    )!;
    await kit.api.session.setupProject({ displayName: 'Store B' });
    await kit.install();
    expect(await kit.get(created.connection.id)).toBeNull();
    expectUserError(await kit.revoke(privateCredential.id), 'STOREFRONT_CREDENTIAL_NOT_FOUND');
    kit.api.session.project = storeA;
    expect((await kit.get(created.connection.id))?.storefrontCredentials).toEqual(
      created.connection.storefrontCredentials,
    );
  });

  test('HDL-SEC-011: Store A policy cannot be read or replaced through Store B', async () => {
    const storeA = kit.api.session.project;
    const created = await kit.create();
    requiredConnection(created.connection);
    await kit.api.session.setupProject({ displayName: 'Store B' });
    await kit.install();
    const rejected = await kit.replacePolicy(
      created.connection.id,
      ['storefront.customer.read'],
      1,
    );
    expectUserError(rejected, 'STOREFRONT_NOT_FOUND');
    kit.api.session.project = storeA;
    expect((await kit.get(created.connection.id))?.storefrontAccessPolicy).toEqual(
      created.connection.storefrontAccessPolicy,
    );
  });

  test('HDL-SEC-012: a later Headless installation cannot capture prior connections', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    await kit.api.admin.mutation('apps-admin-api/AppUninstall', {
      variables: {
        input: {
          installationId,
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    await expect
      .poll(async () => {
        const current = await kit.api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id: installationId },
        });
        return current.data.appsQuery.appInstallation?.status;
      })
      .toBe('UNINSTALLED');
    await kit.install();
    expect(await kit.get(created.connection.id)).toBeNull();
  });

  test('HDL-SEC-013: customer bearer token cannot authorize Headless Admin GraphQL', async () => {
    const accessToken = kit.api.session.user.accessToken;
    kit.api.session.clearSession();
    const response = await kit.admin(CONNECTIONS_QUERY, undefined, {
      Authorization: 'Bearer customer-not-an-admin',
    });
    expect(response.data ?? null).toBeNull();
    expect(response.errors).toBeTruthy();
    kit.api.session.user.accessToken = accessToken;
  });

  test('HDL-SEC-014: Storefront credentials cannot authorize Headless Admin GraphQL', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const accessToken = kit.api.session.user.accessToken;
    kit.api.session.clearSession();
    for (const [header, token] of [
      ['x-shopana-storefront-access-token', created.initialStorefrontCredentials.publicAccessToken],
      ['shopana-storefront-private-token', created.initialStorefrontCredentials.privateAccessToken],
    ]) {
      const response = await kit.admin(CONNECTIONS_QUERY, undefined, { [header]: token });
      expect(response.data ?? null).toBeNull();
      expect(response.errors).toBeTruthy();
    }
    kit.api.session.user.accessToken = accessToken;
  });

  test('HDL-SEC-015: Global ID type confusion fails before repository mutation', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const before = await kit.get(created.connection.id);
    const rejected = await kit.suspend(kit.credentialId(kit.rawId(created.connection.id)));
    expect(rejected.connection).toBeNull();
    expect(rejected.userErrors).toHaveLength(1);
    expect(await kit.get(created.connection.id)).toEqual(before);
  });

  test('HDL-SEC-016: foreign and unknown resource errors reveal no existence signal', async () => {
    const storeA = kit.api.session.project;
    const created = await kit.create();
    requiredConnection(created.connection);
    await kit.api.session.setupProject({ displayName: 'Store B' });
    await kit.install();
    const unknown = await kit.update(kit.connectionId(), 'Denied');
    const foreign = await kit.update(created.connection.id, 'Denied');
    expect(foreign).toEqual(unknown);
    kit.api.session.project = storeA;
  });

  test('HDL-SEC-017: authorization denial creates no domain or audit side effects', async () => {
    const before = await headlessCounts(kit);
    const accessToken = kit.api.session.user.accessToken;
    kit.api.session.clearSession();
    await kit.admin(
      `mutation DeniedSideEffect($input: HeadlessStorefrontCreateInput!) {
        headlessAppMutation {
          headlessStorefrontCreate(input: $input) {
            connection { id }
            userErrors { code }
          }
        }
      }`,
      { input: { displayName: 'Denied', clientMutationId: crypto.randomUUID() } },
    );
    kit.api.session.user.accessToken = accessToken;
    expect(await headlessCounts(kit)).toEqual(before);
  });

  test('HDL-SEC-018: negative cross-store operations change neither store', async () => {
    const storeA = kit.api.session.project;
    const first = await kit.create('Store A connection');
    requiredConnection(first.connection);
    await kit.api.session.setupProject({ displayName: 'Store B' });
    await kit.install();
    const second = await kit.create('Store B connection');
    requiredConnection(second.connection);
    const beforeB = await kit.get(second.connection.id);
    expectUserError(await kit.disconnect(first.connection.id), 'STOREFRONT_NOT_FOUND');
    expect(await kit.get(second.connection.id)).toEqual(beforeB);
    kit.api.session.project = storeA;
    expect(await kit.get(first.connection.id)).toEqual(first.connection);
  });
});

async function headlessCounts(kit: HeadlessTestKit) {
  const storeId = kit.rawId(kit.api.session.project.id);
  const [counts] = await kit.sql`
    select
      (select count(*)::int from app_shopana_headless.storefront_connections
        where store_id = ${storeId}) as connections,
      (select count(*)::int from app_shopana_headless.storefront_access_policies
        where store_id = ${storeId}) as policies,
      (select count(*)::int from app_shopana_headless.storefront_credentials
        where store_id = ${storeId}) as credentials,
      (select count(*)::int from app_shopana_headless.storefront_mutation_idempotency
        where store_id = ${storeId}) as idempotency
  `;
  return counts;
}
