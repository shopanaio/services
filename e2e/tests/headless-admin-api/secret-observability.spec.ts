/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  HeadlessTestKit,
  STOREFRONT_ACCESS_QUERY,
  expectStorefrontAllowed,
  expectStorefrontError,
  mutateTokenSecret,
  requiredConnection,
  requiredCredentials,
} from './headless-test-kit';

test.describe('Headless Admin API - secret hygiene and observability', () => {
  let kit: HeadlessTestKit;

  test.beforeEach(async ({ api, request }) => {
    await api.session.setupUserAndStore();
    kit = new HeadlessTestKit(api, request);
    await kit.install();
  });

  test.afterEach(async () => {
    await kit.close();
  });

  test('HDL-OBS-001: private token is absent from plaintext and ciphertext columns', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const privateCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PRIVATE',
    )!;
    const [row] = await kit.sql`
      select *
      from app_shopana_headless.storefront_credentials
      where id = ${kit.rawId(privateCredential.id)}
    `;
    expect(row.public_token_ciphertext).toBeNull();
    expect(JSON.stringify(row)).not.toContain(
      created.initialStorefrontCredentials.privateAccessToken,
    );
  });

  test('HDL-OBS-002: public token is encrypted at rest and recovered only in owner context', async () => {
    const ownerStore = kit.api.session.project;
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const publicCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PUBLIC',
    )!;
    const [row] = await kit.sql`
      select public_token_ciphertext
      from app_shopana_headless.storefront_credentials
      where id = ${kit.rawId(publicCredential.id)}
    `;
    expect(row.public_token_ciphertext).toMatch(/^v1\.[^.]+\.[^.]+\.[^.]+$/u);
    expect(row.public_token_ciphertext).not.toContain(
      created.initialStorefrontCredentials.publicAccessToken,
    );
    expect((await kit.get(created.connection.id))?.publicAccessToken).toBe(
      created.initialStorefrontCredentials.publicAccessToken,
    );
    await kit.api.session.setupProject({ displayName: 'Foreign store' });
    await kit.install();
    expect(await kit.get(created.connection.id)).toBeNull();
    kit.api.session.project = ownerStore;
  });

  test('HDL-OBS-003: database stores digests and safe hints without private material', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const rows = await kit.sql`
      select
        kind,
        octet_length(token_digest)::int as digest_length,
        token_hint,
        public_token_ciphertext
      from app_shopana_headless.storefront_credentials
      where connection_id = ${kit.rawId(created.connection.id)}
      order by kind
    `;
    expect(rows).toEqual([
      {
        kind: 'PRIVATE',
        digest_length: 32,
        token_hint: created.initialStorefrontCredentials.privateAccessToken.slice(-8),
        public_token_ciphertext: null,
      },
      {
        kind: 'PUBLIC',
        digest_length: 32,
        token_hint: created.initialStorefrontCredentials.publicAccessToken.slice(-8),
        public_token_ciphertext: expect.any(String),
      },
    ]);
  });

  test('HDL-OBS-004: GraphQL errors contain no token, digest, ciphertext, or pepper data', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const response = await kit.storefront(
      mutateTokenSecret(created.initialStorefrontCredentials.publicAccessToken),
    );
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain(created.initialStorefrontCredentials.publicAccessToken);
    expect(serialized).not.toContain(created.initialStorefrontCredentials.privateAccessToken);
    expect(serialized).not.toMatch(/(?:digest|ciphertext|pepper|master.?key)/iu);
    expectStorefrontError(response, 'STOREFRONT_CREDENTIAL_INVALID');
  });

  test('HDL-OBS-005: GraphQL query responses never expose private plaintext', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const responses = [await kit.get(created.connection.id), await kit.list()];
    for (const response of responses) {
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain(created.initialStorefrontCredentials.privateAccessToken);
      expect(serialized).not.toMatch(/privateAccessToken/iu);
    }
  });

  test('HDL-OBS-006: runtime logging boundary never logs credential headers or token fields', async () => {
    const source = await readSource(
      'apps/headless/src/storefront-access/data-plane/StorefrontAccessInternalServer.ts',
    );
    expect(source).toContain('disableRequestLogging: true');
    expect(source).not.toMatch(/logger\.(?:log|warn|error|debug)\([^)]*(?:token|authorization)/iu);
    expect(source).toContain('Storefront credential resolution failed');
  });

  test('HDL-OBS-007: DBOS inputs never contain raw Storefront token values', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const workflowRows = await kit.sql`
      select *
      from dbos.workflow_status
      where created_at > now() - interval '10 minutes'
    `;
    const serialized = JSON.stringify(workflowRows);
    expect(serialized).not.toContain(created.initialStorefrontCredentials.publicAccessToken);
    expect(serialized).not.toContain(created.initialStorefrontCredentials.privateAccessToken);
  });

  test('HDL-OBS-008: persisted actor/resource records contain IDs without secret material', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const rows = await kit.sql`
      select
        id,
        connection_id,
        created_by_type,
        created_by_id,
        revoked_by_type,
        revoked_by_id
      from app_shopana_headless.storefront_credentials
      where connection_id = ${kit.rawId(created.connection.id)}
    `;
    const serialized = JSON.stringify(rows);
    expect(serialized).not.toContain(created.initialStorefrontCredentials.publicAccessToken);
    expect(serialized).not.toContain(created.initialStorefrontCredentials.privateAccessToken);
    expect(rows.every(({ created_by_type }) => created_by_type === 'USER')).toBe(true);
  });

  test('HDL-OBS-009: credential create and revoke records stay store and installation scoped', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const privateCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PRIVATE',
    )!;
    await kit.revoke(privateCredential.id);
    const [row] = await kit.sql`
      select
        sc.store_id,
        sc.organization_id,
        sc.status,
        sc.revoked_by_type,
        c.installation_id
      from app_shopana_headless.storefront_credentials sc
      join app_shopana_headless.storefront_connections c
        on c.id = sc.connection_id
      where sc.id = ${kit.rawId(privateCredential.id)}
    `;
    expect(row).toMatchObject({
      store_id: kit.rawId(kit.api.session.project.id),
      organization_id: kit.rawId(kit.api.session.organizationId!),
      status: 'REVOKED',
      revoked_by_type: 'USER',
      installation_id: expect.any(String),
    });
  });

  test('HDL-OBS-010: policy records contain grant metadata without credentials', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    await kit.replacePolicy(
      created.connection.id,
      ['storefront.customer.read'],
      created.connection.storefrontAccessPolicy!.revision,
    );
    const rows = await kit.sql`
      select p.connection_id, p.revision, g.permission
      from app_shopana_headless.storefront_access_policies p
      join app_shopana_headless.storefront_access_policy_grants g
        on g.connection_id = p.connection_id
      where p.connection_id = ${kit.rawId(created.connection.id)}
    `;
    expect(rows).toEqual([
      {
        connection_id: kit.rawId(created.connection.id),
        revision: 2,
        permission: 'storefront.customer.read',
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain(
      created.initialStorefrontCredentials.publicAccessToken,
    );
  });

  test('HDL-OBS-011: authentication failure exposes only a safe reason category', async () => {
    const response = await kit.storefront(
      `shpna_sfprv_v1_AAAAAAAAAAAAAAAAAAAAAA_${'A'.repeat(43)}`,
      'PRIVATE',
    );
    expect(response).toEqual({
      data: null,
      errors: [
        {
          message: 'STOREFRONT_CREDENTIAL_INVALID',
          extensions: { code: 'STOREFRONT_CREDENTIAL_INVALID' },
        },
      ],
    });
  });

  test('HDL-OBS-012: metrics avoid credential, store, IP, and token-hint labels', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    await kit.storefront(
      created.initialStorefrontCredentials.privateAccessToken,
      'PRIVATE',
      STOREFRONT_ACCESS_QUERY,
      undefined,
      { 'shopana-storefront-buyer-ip': '203.0.113.20' },
    );
    const response = await kit.request.get('http://127.0.0.1:13033/metrics');
    const body = await response.text();
    expect(body).not.toContain(kit.rawId(created.connection.id));
    expect(body).not.toContain(kit.rawId(kit.api.session.project.id));
    expect(body).not.toContain('203.0.113.20');
    for (const credential of created.connection.storefrontCredentials) {
      expect(body).not.toContain(credential.tokenHint);
      expect(body).not.toContain(kit.rawId(credential.id));
    }
  });

  test('HDL-OBS-013: lastUsedAt telemetry is asynchronous and outside auth decisions', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const publicCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PUBLIC',
    )!;
    expect(publicCredential.lastUsedAt).toBeNull();
    expectStorefrontAllowed(
      await kit.storefront(created.initialStorefrontCredentials.publicAccessToken),
    );
    const immediately = await kit.get(created.connection.id);
    expect(
      immediately?.storefrontCredentials.find(({ id }) => id === publicCredential.id)?.lastUsedAt,
    ).toBeNull();
  });

  test('HDL-OBS-014: lost usage telemetry neither revives nor invalidates credentials', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const publicCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PUBLIC',
    )!;
    await kit.sql`
      update app_shopana_headless.storefront_credentials
      set last_used_at = null
      where id = ${kit.rawId(publicCredential.id)}
    `;
    expectStorefrontAllowed(
      await kit.storefront(created.initialStorefrontCredentials.publicAccessToken),
    );
    await kit.disconnect(created.connection.id);
    await kit.sql`
      update app_shopana_headless.storefront_credentials
      set last_used_at = now()
      where id = ${kit.rawId(publicCredential.id)}
    `;
    expectStorefrontError(
      await kit.storefront(created.initialStorefrontCredentials.publicAccessToken),
      'STOREFRONT_CREDENTIAL_INVALID',
    );
  });

  test('HDL-OBS-015: production runtime requires explicit cryptographic configuration', async () => {
    const cryptoSource = await readSource(
      'apps/headless/src/storefront-access/control-plane/StorefrontCredentialCrypto.ts',
    );
    const runtimeSource = await readSource('e2e/bin/start-test-env.mjs');
    expect(cryptoSource).toContain('STOREFRONT_PUBLIC_TOKEN_MASTER_KEY is required');
    expect(cryptoSource).toContain('Active storefront token pepper is missing');
    expect(cryptoSource).not.toMatch(/(?:fallback|default).*(?:pepper|master)/iu);
    expect(runtimeSource).toContain('STOREFRONT_TOKEN_ACTIVE_PEPPER_VERSION');
    expect(runtimeSource).toContain('STOREFRONT_PUBLIC_TOKEN_MASTER_KEY');
  });

  test('HDL-OBS-016: key or pepper version mismatch fails closed without config leakage', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const publicCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PUBLIC',
    )!;
    await kit.sql`
      update app_shopana_headless.storefront_credentials
      set pepper_version = 32767
      where id = ${kit.rawId(publicCredential.id)}
    `;
    const response = await kit.storefront(created.initialStorefrontCredentials.publicAccessToken);
    expect(response.data ?? null).toBeNull();
    expect(response.errors?.[0]?.extensions?.code).toMatch(
      /^STOREFRONT_(?:CREDENTIAL_INVALID|ACCESS_UNAVAILABLE)$/u,
    );
    expect(JSON.stringify(response)).not.toMatch(/(?:pepper|version|key|32767)/iu);
  });
});

async function readSource(relativePath: string): Promise<string> {
  return readFile(resolve(process.cwd(), '..', relativePath), 'utf8');
}
