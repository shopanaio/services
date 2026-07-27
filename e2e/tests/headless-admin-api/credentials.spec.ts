/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import { composeGlobalId } from '@utils/globalid';
import {
  HeadlessTestKit,
  expectStorefrontAllowed,
  expectStorefrontError,
  expectSuccess,
  expectTokenFormat,
  expectUserError,
  mutateTokenSecret,
  requiredConnection,
  requiredCredentials,
} from './headless-test-kit';

test.describe('Headless Admin API - storefront credentials', () => {
  let kit: HeadlessTestKit;

  test.beforeEach(async ({ api, request }) => {
    await api.session.setupUserAndStore();
    kit = new HeadlessTestKit(api, request);
    await kit.install();
  });

  test.afterEach(async () => {
    await kit.close();
  });

  test('HDL-CRED-001: initial tokens have distinct strict versioned formats', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const { publicAccessToken, privateAccessToken } = created.initialStorefrontCredentials;
    expectTokenFormat(publicAccessToken, 'PUBLIC');
    expectTokenFormat(privateAccessToken, 'PRIVATE');
    expect(publicAccessToken).not.toBe(privateAccessToken);
  });

  test('HDL-CRED-002: generated credentials never share a token or identifier', async () => {
    const first = await kit.create('First');
    const second = await kit.create('Second');
    requiredConnection(first.connection);
    requiredConnection(second.connection);
    requiredCredentials(first.initialStorefrontCredentials);
    requiredCredentials(second.initialStorefrontCredentials);
    expect(
      new Set([
        ...first.connection.storefrontCredentials.map(({ id }) => id),
        ...second.connection.storefrontCredentials.map(({ id }) => id),
      ]).size,
    ).toBe(4);
    expect(
      new Set([
        ...Object.values(first.initialStorefrontCredentials),
        ...Object.values(second.initialStorefrontCredentials),
      ]).size,
    ).toBe(4);
  });

  test('HDL-CRED-003: public token is repeat-readable only in owning Admin scope', async () => {
    const ownerStore = kit.api.session.project;
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    expect((await kit.get(created.connection.id))?.publicAccessToken).toBe(
      created.initialStorefrontCredentials.publicAccessToken,
    );

    await kit.api.session.setupProject({ displayName: 'Foreign store' });
    await kit.install();
    expect(await kit.get(created.connection.id)).toBeNull();
    kit.api.session.project = ownerStore;
  });

  test('HDL-CRED-004: initial private plaintext is returned only by first create execution', async () => {
    const mutationId = crypto.randomUUID();
    const first = await kit.create('Idempotent', mutationId);
    const duplicate = await kit.create('Ignored retry name', mutationId);
    requiredCredentials(first.initialStorefrontCredentials);
    expect(duplicate).toMatchObject({
      duplicate: true,
      initialStorefrontCredentials: null,
      userErrors: [],
    });
  });

  test('HDL-CRED-005: private plaintext is absent from connection and credential query fields', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const queried = await kit.get(created.connection.id);
    const serialized = JSON.stringify(queried);
    expect(serialized).not.toContain(created.initialStorefrontCredentials.privateAccessToken);
    expect(serialized).not.toMatch(/privateAccessToken/iu);
  });

  test('HDL-CRED-006: credential metadata exposes safe lifecycle fields', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    for (const credential of created.connection.storefrontCredentials) {
      expect(credential).toEqual({
        id: expect.any(String),
        kind: expect.stringMatching(/^(?:PUBLIC|PRIVATE)$/u),
        status: 'ACTIVE',
        label: expect.any(String),
        tokenHint: expect.stringMatching(/^[A-Za-z0-9_-]{8}$/u),
        createdAt: expect.stringMatching(/\d{4}-\d{2}-\d{2}T/u),
        lastUsedAt: null,
        revokedAt: null,
      });
    }
  });

  test('HDL-CRED-007: private credential create returns one new token for an ACTIVE connection', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const rotated = await kit.createPrivate(created.connection.id, 'Deploy rotation');
    expectSuccess(rotated);
    expectTokenFormat(rotated.privateAccessToken!, 'PRIVATE');
    expect(rotated.credential).toMatchObject({
      kind: 'PRIVATE',
      status: 'ACTIVE',
      label: 'Deploy rotation',
    });
    expect((await kit.get(created.connection.id))?.storefrontCredentials).toHaveLength(3);
  });

  test('HDL-CRED-008: additional private credential label is trimmed and validated', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const trimmed = await kit.createPrivate(created.connection.id, '  Production  ');
    expectSuccess(trimmed);
    expect(trimmed.credential?.label).toBe('Production');
    for (const invalid of ['', ' \t ', 'x'.repeat(256)]) {
      const rejected = await kit.createPrivate(created.connection.id, invalid);
      expect(rejected.credential).toBeNull();
      expect(rejected.privateAccessToken).toBeNull();
      expectUserError(rejected, 'STOREFRONT_CREDENTIAL_LABEL_INVALID');
    }
  });

  test('HDL-CRED-009: private overlap preserves both credentials and the public token', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const rotated = await kit.createPrivate(created.connection.id);
    const queried = await kit.get(created.connection.id);
    expect(queried?.publicAccessToken).toBe(created.initialStorefrontCredentials.publicAccessToken);
    expect(
      queried?.storefrontCredentials.filter(
        ({ kind, status }) => kind === 'PRIVATE' && status === 'ACTIVE',
      ),
    ).toHaveLength(2);
    expectStorefrontAllowed(
      await kit.storefront(created.initialStorefrontCredentials.privateAccessToken, 'PRIVATE'),
    );
    expectStorefrontAllowed(await kit.storefront(rotated.privateAccessToken!, 'PRIVATE'));
  });

  test('HDL-CRED-010: private create is rejected for suspended and disconnected connections', async () => {
    const suspended = await kit.create('Suspended');
    requiredConnection(suspended.connection);
    expectSuccess(await kit.suspend(suspended.connection.id));
    const suspendedCreate = await kit.createPrivate(suspended.connection.id);
    expect(suspendedCreate.credential).toBeNull();
    expectUserError(suspendedCreate, 'STOREFRONT_INVALID_STATE');

    const disconnected = await kit.create('Disconnected');
    requiredConnection(disconnected.connection);
    expectSuccess(await kit.disconnect(disconnected.connection.id));
    const disconnectedCreate = await kit.createPrivate(disconnected.connection.id);
    expect(disconnectedCreate.credential).toBeNull();
    expectUserError(disconnectedCreate, 'STOREFRONT_INVALID_STATE');
  });

  test('HDL-CRED-011: private create for a foreign connection is safe not-found', async () => {
    const ownerStore = kit.api.session.project;
    const created = await kit.create();
    requiredConnection(created.connection);
    await kit.api.session.setupProject({ displayName: 'Foreign store' });
    await kit.install();
    const unknown = await kit.createPrivate(kit.connectionId());
    const foreign = await kit.createPrivate(created.connection.id);
    expect(foreign).toEqual(unknown);
    expectUserError(foreign, 'STOREFRONT_CREDENTIAL_NOT_FOUND');
    kit.api.session.project = ownerStore;
  });

  test('HDL-CRED-012: revoke changes only the selected private credential', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const privateCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PRIVATE',
    )!;
    const revoked = await kit.revoke(privateCredential.id);
    expectSuccess(revoked);
    expect(revoked.credential).toMatchObject({
      id: privateCredential.id,
      status: 'REVOKED',
      revokedAt: expect.any(String),
    });
  });

  test('HDL-CRED-013: revoking one private preserves its sibling and public credential', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const rotated = await kit.createPrivate(created.connection.id);
    const initialPrivate = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PRIVATE',
    )!;
    await kit.revoke(initialPrivate.id);
    const queried = await kit.get(created.connection.id);
    expect(queried?.publicAccessToken).toBe(created.initialStorefrontCredentials.publicAccessToken);
    expect(
      queried?.storefrontCredentials.find(({ id }) => id === rotated.credential?.id),
    ).toMatchObject({ status: 'ACTIVE' });
    expectStorefrontAllowed(await kit.storefront(rotated.privateAccessToken!, 'PRIVATE'));
  });

  test('HDL-CRED-014: ordinary revoke rejects the public credential', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const publicCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PUBLIC',
    )!;
    const rejected = await kit.revoke(publicCredential.id);
    expect(rejected.credential).toBeNull();
    expectUserError(rejected, 'STOREFRONT_CREDENTIAL_NOT_FOUND');
    expect((await kit.get(created.connection.id))?.publicAccessToken).toBeTruthy();
  });

  test('HDL-CRED-015: revoking an already revoked private is a duplicate-safe success', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const privateCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PRIVATE',
    )!;
    const first = await kit.revoke(privateCredential.id);
    const duplicate = await kit.revoke(privateCredential.id);
    expectSuccess(first);
    expectSuccess(duplicate);
    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.credential).toEqual(first.credential);
  });

  test('HDL-CRED-016: credential global ID type confusion cannot revoke state', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    const before = created.connection.storefrontCredentials;
    const rejected = await kit.revoke(
      composeGlobalId('HeadlessStorefrontConnection', crypto.randomUUID()),
    );
    expect(rejected.credential).toBeNull();
    expect(rejected.userErrors).toHaveLength(1);
    expect((await kit.get(created.connection.id))?.storefrontCredentials).toEqual(before);
  });

  test('HDL-CRED-017: wrong secret and unknown key are externally indistinguishable', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const wrongSecret = await kit.storefront(
      mutateTokenSecret(created.initialStorefrontCredentials.publicAccessToken),
    );
    const unknownKey = await kit.storefront(
      `shpna_sfpub_v1_AAAAAAAAAAAAAAAAAAAAAA_${'A'.repeat(43)}`,
    );
    expect(wrongSecret).toEqual(unknownKey);
    expectStorefrontError(wrongSecret, 'STOREFRONT_CREDENTIAL_INVALID');
  });

  test('HDL-CRED-018: public/private token mode confusion is rejected', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    expectStorefrontError(
      await kit.storefront(created.initialStorefrontCredentials.publicAccessToken, 'PRIVATE'),
      'STOREFRONT_CREDENTIAL_INVALID',
    );
    expectStorefrontError(
      await kit.storefront(created.initialStorefrontCredentials.privateAccessToken, 'PUBLIC'),
      'STOREFRONT_CREDENTIAL_INVALID',
    );
  });

  test('HDL-CRED-019: public ciphertext is bound to its connection context', async () => {
    const first = await kit.create('First');
    const second = await kit.create('Second');
    requiredConnection(first.connection);
    requiredConnection(second.connection);
    const firstPublic = first.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PUBLIC',
    )!;
    const secondPublic = second.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PUBLIC',
    )!;
    const [firstRow] = await kit.sql`
      select public_token_ciphertext
      from app_shopana_headless.storefront_credentials
      where id = ${kit.rawId(firstPublic.id)}
    `;
    await kit.sql`
      update app_shopana_headless.storefront_credentials
      set public_token_ciphertext = ${firstRow.public_token_ciphertext}
      where id = ${kit.rawId(secondPublic.id)}
    `;
    const result = await kit.admin<{
      headlessAppQuery: { headlessStorefrontConnection: { publicAccessToken: string } };
    }>(
      `query BoundCiphertext($id: ID!) {
        headlessAppQuery {
          headlessStorefrontConnection(id: $id) { publicAccessToken }
        }
      }`,
      { id: second.connection.id },
    );
    expect(result.data ?? null).toBeNull();
    expect(JSON.stringify(result.errors)).not.toContain(
      first.initialStorefrontCredentials?.publicAccessToken,
    );
  });

  test('HDL-CRED-020: revoke takes effect on the next Storefront request', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const privateCredential = created.connection.storefrontCredentials.find(
      ({ kind }) => kind === 'PRIVATE',
    )!;
    expectStorefrontAllowed(
      await kit.storefront(created.initialStorefrontCredentials.privateAccessToken, 'PRIVATE'),
    );
    expectSuccess(await kit.revoke(privateCredential.id));
    expectStorefrontError(
      await kit.storefront(created.initialStorefrontCredentials.privateAccessToken, 'PRIVATE'),
      'STOREFRONT_CREDENTIAL_INVALID',
    );
  });
});
