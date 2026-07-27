/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import { composeGlobalId } from '@utils/globalid';
import {
  HeadlessTestKit,
  STOREFRONT_ACCESS_QUERY,
  STOREFRONT_INTROSPECTION_QUERY,
  expectStorefrontAllowed,
  expectStorefrontError,
  expectSuccess,
  mutateTokenSecret,
  requiredConnection,
  requiredCredentials,
} from './headless-test-kit';

const CHECKOUT_READ = `query RuntimeCheckoutRead($id: ID!) {
  checkoutQuery { checkout(id: $id) { __typename } }
}`;
const CHECKOUT_WRITE = `mutation RuntimeCheckoutWrite {
  checkoutMutation { __typename }
}`;

test.describe('Headless Admin API - Storefront runtime integration', () => {
  let kit: HeadlessTestKit;

  test.beforeEach(async ({ api, request }) => {
    await api.session.setupUserAndStore();
    kit = new HeadlessTestKit(api, request);
    await kit.install();
  });

  test.afterEach(async () => {
    await kit.close();
  });

  test('HDL-RUN-001: Admin-created public token authenticates Storefront Gateway', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const response = await kit.storefront(created.initialStorefrontCredentials.publicAccessToken);
    expectStorefrontAllowed(response);
    expect(response.data).toEqual({ headlessStorefrontAccess: true });
  });

  test('HDL-RUN-002: Admin-created private token authenticates server-side access', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const response = await kit.storefront(
      created.initialStorefrontCredentials.privateAccessToken,
      'PRIVATE',
      STOREFRONT_ACCESS_QUERY,
      undefined,
      { 'shopana-storefront-buyer-ip': '203.0.113.10' },
    );
    expectStorefrontAllowed(response);
  });

  test('HDL-RUN-003: public and private resolve the same store, connection, and policy', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const variables = { id: composeGlobalId('Checkout', crypto.randomUUID()) };
    const publicResponse = await kit.storefront(
      created.initialStorefrontCredentials.publicAccessToken,
      'PUBLIC',
      CHECKOUT_READ,
      variables,
    );
    const privateResponse = await kit.storefront(
      created.initialStorefrontCredentials.privateAccessToken,
      'PRIVATE',
      CHECKOUT_READ,
      variables,
    );
    expect(publicResponse).toEqual(privateResponse);
    expectStorefrontAllowed(publicResponse);
  });

  test('HDL-RUN-004: private credential grants no permissions beyond connection policy', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    expectSuccess(
      await kit.replacePolicy(
        created.connection.id,
        ['storefront.checkout.read'],
        created.connection.storefrontAccessPolicy!.revision,
      ),
    );
    expectStorefrontError(
      await kit.storefront(
        created.initialStorefrontCredentials.privateAccessToken,
        'PRIVATE',
        CHECKOUT_WRITE,
      ),
      'FORBIDDEN',
    );
  });

  test('HDL-RUN-005: a Store A credential cannot be retargeted with Store B selectors', async () => {
    const storeA = kit.api.session.project;
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    await kit.api.session.setupProject({ displayName: 'Store B' });
    const storeB = kit.api.session.project;
    kit.api.session.project = storeA;
    const response = await kit.storefront(
      created.initialStorefrontCredentials.publicAccessToken,
      'PUBLIC',
      STOREFRONT_ACCESS_QUERY,
      undefined,
      {
        'x-store-name': storeB.name,
        'x-store-id': storeB.id,
      },
    );
    expectStorefrontAllowed(response);
    const publicCredential = (await kit.list())[0].storefrontCredentials.find(
      ({ kind }) => kind === 'PUBLIC',
    )!;
    const [row] = await kit.sql`
      select store_id from app_shopana_headless.storefront_credentials
      where id = ${kit.rawId(publicCredential.id)}
    `;
    expect(row.store_id).toBe(kit.rawId(storeA.id));
  });

  test('HDL-RUN-006: request without a credential returns required contract', async () => {
    expectStorefrontError(await kit.storefront(null), 'STOREFRONT_CREDENTIAL_REQUIRED');
  });

  test('HDL-RUN-007: both credential headers are rejected as ambiguous', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    expectStorefrontError(
      await kit.storefront(
        created.initialStorefrontCredentials.publicAccessToken,
        'PUBLIC',
        STOREFRONT_ACCESS_QUERY,
        undefined,
        {
          'shopana-storefront-private-token':
            created.initialStorefrontCredentials.privateAccessToken,
        },
      ),
      'STOREFRONT_CREDENTIAL_AMBIGUOUS',
    );
  });

  test('HDL-RUN-008: unknown key and invalid token share the generic auth error', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const invalid = await kit.storefront('invalid');
    const wrongSecret = await kit.storefront(
      mutateTokenSecret(created.initialStorefrontCredentials.publicAccessToken),
    );
    expect(invalid).toEqual(wrongSecret);
    expectStorefrontError(invalid, 'STOREFRONT_CREDENTIAL_INVALID');
  });

  test('HDL-RUN-009: raw Storefront credential headers are not forwarded to subgraphs', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const response = await kit.storefront(created.initialStorefrontCredentials.publicAccessToken);
    expectStorefrontAllowed(response);
    expect(JSON.stringify(response)).not.toContain(
      created.initialStorefrontCredentials.publicAccessToken,
    );
  });

  test('HDL-RUN-010: client internal context is replaced by Gateway-signed context', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    expectStorefrontAllowed(
      await kit.storefront(
        created.initialStorefrontCredentials.publicAccessToken,
        'PUBLIC',
        STOREFRONT_ACCESS_QUERY,
        undefined,
        { 'x-shopana-storefront-context': 'client-controlled.invalid.context' },
      ),
    );
  });

  test('HDL-RUN-011: direct subgraph request without valid context is rejected', async () => {
    const response = await kit.request.post('http://127.0.0.1:11023/graphql', {
      headers: { 'Content-Type': 'application/json' },
      data: { query: STOREFRONT_ACCESS_QUERY },
    });
    const body = await response.json();
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(body.data ?? null).toBeNull();
  });

  test('HDL-RUN-012: Admin Gateway neither requires nor interprets Storefront credentials', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const response = await kit.admin<{
      headlessAppQuery: { headlessStorefrontConnection: { id: string } | null };
    }>(
      `query AdminUnaffected($id: ID!) {
        headlessAppQuery { headlessStorefrontConnection(id: $id) { id } }
      }`,
      { id: created.connection.id },
      {
        'x-shopana-storefront-access-token': created.initialStorefrontCredentials.publicAccessToken,
      },
    );
    expect(response.errors).toBeUndefined();
    expect(response.data?.headlessAppQuery.headlessStorefrontConnection?.id).toBe(
      created.connection.id,
    );
  });

  test('HDL-RUN-013: resolver availability failures never become anonymous access', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const malformed = `${created.initialStorefrontCredentials.publicAccessToken}${'x'.repeat(200)}`;
    const response = await kit.storefront(malformed);
    expect(response.data ?? null).toBeNull();
    expect(response.errors?.[0]?.extensions?.code).toMatch(
      /^STOREFRONT_(?:CREDENTIAL_INVALID|ACCESS_UNAVAILABLE)$/u,
    );
  });

  test('HDL-RUN-014: introspection cannot bypass Storefront authentication', async () => {
    expectStorefrontError(
      await kit.storefront(null, 'PUBLIC', STOREFRONT_INTROSPECTION_QUERY),
      'STOREFRONT_CREDENTIAL_REQUIRED',
    );
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    expectStorefrontAllowed(
      await kit.storefront(
        created.initialStorefrontCredentials.publicAccessToken,
        'PUBLIC',
        STOREFRONT_INTROSPECTION_QUERY,
      ),
    );
  });

  test('HDL-RUN-015: customer identity remains separate from channel authentication', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    const response = await kit.storefront(
      created.initialStorefrontCredentials.publicAccessToken,
      'PUBLIC',
      STOREFRONT_ACCESS_QUERY,
      undefined,
      { Authorization: 'Bearer invalid-customer-token' },
    );
    expectStorefrontError(response, 'STOREFRONT_CUSTOMER_INVALID');
    expectStorefrontAllowed(
      await kit.storefront(created.initialStorefrontCredentials.publicAccessToken),
    );
  });

  test('HDL-RUN-016: client input cannot replace trusted connection attribution', async () => {
    const created = await kit.create();
    requiredCredentials(created.initialStorefrontCredentials);
    expectStorefrontAllowed(
      await kit.storefront(
        created.initialStorefrontCredentials.publicAccessToken,
        'PUBLIC',
        STOREFRONT_ACCESS_QUERY,
        undefined,
        {
          'x-shopana-storefront-connection-id': crypto.randomUUID(),
          'x-shopana-storefront-installation-id': crypto.randomUUID(),
          'x-shopana-storefront-context': 'forged',
        },
      ),
    );
  });

  test('HDL-RUN-017: disconnect preserves historical channel rows while blocking access', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    await kit.disconnect(created.connection.id);
    expectStorefrontError(
      await kit.storefront(created.initialStorefrontCredentials.publicAccessToken),
      'STOREFRONT_CREDENTIAL_INVALID',
    );
    const [row] = await kit.sql`
      select
        c.status,
        count(sc.id)::int as credential_count
      from app_shopana_headless.storefront_connections c
      join app_shopana_headless.storefront_credentials sc
        on sc.connection_id = c.id
      where c.id = ${kit.rawId(created.connection.id)}
      group by c.status
    `;
    expect(row).toEqual({ status: 'DISCONNECTED', credential_count: 2 });
  });

  test('HDL-RUN-018: concurrent policy change follows a complete request snapshot', async () => {
    const created = await kit.create();
    requiredConnection(created.connection);
    requiredCredentials(created.initialStorefrontCredentials);
    const token = created.initialStorefrontCredentials.publicAccessToken;
    const requests = Array.from({ length: 8 }, () =>
      kit.storefront(token, 'PUBLIC', CHECKOUT_WRITE),
    );
    const [, ...responses] = await Promise.all([
      kit.replacePolicy(
        created.connection.id,
        ['storefront.checkout.read'],
        created.connection.storefrontAccessPolicy!.revision,
      ),
      ...requests,
    ]);
    for (const response of responses) {
      if (response.errors) {
        expect(response.errors[0]?.extensions?.code).toBe('FORBIDDEN');
      } else {
        expect(response.data).toEqual({
          checkoutMutation: { __typename: 'CheckoutMutation' },
        });
      }
    }
    expectStorefrontError(await kit.storefront(token, 'PUBLIC', CHECKOUT_WRITE), 'FORBIDDEN');
  });
});
