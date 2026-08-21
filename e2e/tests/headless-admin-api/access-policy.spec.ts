import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { readQuery } from '@fixtures/api/types';
import { composeGlobalId } from '@utils/globalid';

type Api = ApiFixtures['api'];
type CredentialMode = 'PUBLIC' | 'PRIVATE';

const STOREFRONT_PERMISSIONS = {
  CATALOG_READ: 'storefront.catalog.read',
  INVENTORY_READ: 'storefront.inventory.read',
  CHECKOUT_READ: 'storefront.checkout.read',
  CHECKOUT_WRITE: 'storefront.checkout.write',
  CUSTOMER_READ: 'storefront.customer.read',
  CUSTOMER_WRITE: 'storefront.customer.write',
  ORDER_READ: 'storefront.order.read',
  ORDER_WRITE: 'storefront.order.write',
  REVIEWS_READ: 'storefront.reviews.read',
  REVIEWS_WRITE: 'storefront.reviews.write',
} as const;

const STOREFRONT_PERMISSION_VALUES = Object.values(STOREFRONT_PERMISSIONS);

const DEFAULT_PERMISSIONS = [
  STOREFRONT_PERMISSIONS.CATALOG_READ,
  STOREFRONT_PERMISSIONS.CHECKOUT_READ,
  STOREFRONT_PERMISSIONS.CHECKOUT_WRITE,
  STOREFRONT_PERMISSIONS.INVENTORY_READ,
  STOREFRONT_PERMISSIONS.ORDER_WRITE,
  STOREFRONT_PERMISSIONS.REVIEWS_READ,
  STOREFRONT_PERMISSIONS.REVIEWS_WRITE,
].sort();

test.describe('Headless Admin API - storefront access policy', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
    await installHeadless(api);
  });

  test('catalog is the complete canonical permission contract', async ({
    api,
  }) => {
    const response = await api.admin.query('headless-admin-api/PermissionCatalog', {});
    const catalog = response.data.headlessAppQuery.headlessStorefrontPermissionCatalog;
    const handles = catalog.map(({ handle }) => handle);

    expect(handles).toHaveLength(new Set(handles).size);
    expect([...handles].sort()).toEqual([...STOREFRONT_PERMISSION_VALUES].sort());
    for (const definition of catalog) {
      expect(definition).toEqual({
        handle: `storefront.${definition.resource}.${definition.action}`,
        resource: expect.stringMatching(/^[a-z][a-z0-9]*$/u),
        action: expect.stringMatching(/^(?:read|write)$/u),
        label: expect.stringMatching(/\S/u),
        description: expect.stringMatching(/\S/u),
        risk: expect.stringMatching(/^(?:LOW|MEDIUM|HIGH)$/u),
      });
    }
  });

  test('defaults are sorted and replacement normalizes the complete grant set', async ({
    api,
    request,
  }) => {
    const created = await createStorefront(api);
    expect(created.connection.storefrontAccessPolicy).toMatchObject({
      permissions: DEFAULT_PERMISSIONS,
      revision: 1,
    });

    const replacement = [
      STOREFRONT_PERMISSIONS.ORDER_READ,
      STOREFRONT_PERMISSIONS.CHECKOUT_READ,
      STOREFRONT_PERMISSIONS.ORDER_READ,
    ];
    const replaced = await updatePolicy(api, created.connection.id, 1, replacement);
    expect(replaced.userErrors).toEqual([]);
    expect(replaced.policy).toMatchObject({
      permissions: [STOREFRONT_PERMISSIONS.CHECKOUT_READ, STOREFRONT_PERMISSIONS.ORDER_READ],
      revision: 2,
    });
    expect(replaced.policy!.permissions).not.toContain(STOREFRONT_PERMISSIONS.CATALOG_READ);

    replacement.splice(0, replacement.length, STOREFRONT_PERMISSIONS.CATALOG_READ);
    const persisted = await getConnection(api, created.connection.id);
    expect(persisted!.storefrontAccessPolicy!.permissions).toEqual([
      STOREFRONT_PERMISSIONS.CHECKOUT_READ,
      STOREFRONT_PERMISSIONS.ORDER_READ,
    ]);

    const emptied = await updatePolicy(api, created.connection.id, 2, []);
    expect(emptied.userErrors).toEqual([]);
    expect(emptied.policy).toMatchObject({ permissions: [], revision: 3 });

    const access = await storefrontRequest(
      request,
      created.initialStorefrontCredentials.publicAccessToken,
      'PUBLIC',
      'headless-admin-api/StorefrontAccessProbe',
    );
    expect(access.errors).toBeUndefined();
    expect(access.data).toEqual({ headlessStorefrontAccess: true });

    const protectedRead = await storefrontRequest(
      request,
      created.initialStorefrontCredentials.publicAccessToken,
      'PUBLIC',
      'headless-admin-api/CheckoutReadProbe',
      { id: composeGlobalId('Checkout', crypto.randomUUID()) },
    );
    expectForbidden(protectedRead);
  });

  test('invalid or stale revisions preserve grants and success increments once', async ({
    api,
  }) => {
    const created = await createStorefront(api);
    const initial = created.connection.storefrontAccessPolicy;

    const unknown = await updatePolicy(api, created.connection.id, initial.revision, [
      'storefront.unknown.read',
    ]);
    expect(unknown.policy).toBeNull();
    expect(unknown.userErrors).toEqual([
      expect.objectContaining({ code: 'STOREFRONT_PERMISSION_INVALID' }),
    ]);
    await expectPolicy(api, created.connection.id, initial);

    const exact = await updatePolicy(api, created.connection.id, initial.revision, [
      STOREFRONT_PERMISSIONS.CHECKOUT_READ,
    ]);
    expect(exact.userErrors).toEqual([]);
    expect(exact.policy).toMatchObject({
      permissions: [STOREFRONT_PERMISSIONS.CHECKOUT_READ],
      revision: initial.revision + 1,
    });

    const stale = await updatePolicy(api, created.connection.id, initial.revision, [
      STOREFRONT_PERMISSIONS.ORDER_WRITE,
    ]);
    expect(stale.policy).toBeNull();
    expect(stale.userErrors).toEqual([
      expect.objectContaining({ code: 'STOREFRONT_POLICY_REVISION_CONFLICT' }),
    ]);
    await expectPolicy(api, created.connection.id, exact.policy!);
  });

  test('concurrent replacements at one revision have one winner', async ({ api }) => {
    const created = await createStorefront(api);
    const revision = created.connection.storefrontAccessPolicy.revision;
    const candidates = [
      [STOREFRONT_PERMISSIONS.CHECKOUT_READ],
      [STOREFRONT_PERMISSIONS.ORDER_WRITE],
    ];

    const results = await Promise.all(
      candidates.map((permissions) =>
        updatePolicy(api, created.connection.id, revision, permissions),
      ),
    );
    const successful = results.filter(({ userErrors }) => userErrors.length === 0);
    const conflicted = results.filter(
      ({ userErrors }) => userErrors[0]?.code === 'STOREFRONT_POLICY_REVISION_CONFLICT',
    );

    expect(successful).toHaveLength(1);
    expect(conflicted).toHaveLength(1);
    expect(successful[0]!.policy!.revision).toBe(revision + 1);
    await expectPolicy(api, created.connection.id, successful[0]!.policy!);
  });

  test('public and all private credentials observe the same policy', async ({
    api,
    request,
  }) => {
    const created = await createStorefront(api);
    const extraCredential = await api.admin.mutation('headless-admin-api/PrivateCredentialCreate', {
      variables: {
        input: {
          connectionId: created.connection.id,
          label: 'Rotation credential',
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    const extra = extraCredential.data.headlessAppMutation.storefrontPrivateCredentialCreate;
    expect(extra.userErrors).toEqual([]);
    expect(extra.privateAccessToken).not.toBeNull();

    const updated = await updatePolicy(
      api,
      created.connection.id,
      created.connection.storefrontAccessPolicy.revision,
      [STOREFRONT_PERMISSIONS.CHECKOUT_READ],
    );
    expect(updated.userErrors).toEqual([]);

    const credentials: Array<readonly [string, CredentialMode]> = [
      [created.initialStorefrontCredentials.publicAccessToken, 'PUBLIC'],
      [created.initialStorefrontCredentials.privateAccessToken, 'PRIVATE'],
      [extra.privateAccessToken!, 'PRIVATE'],
    ];
    for (const [token, mode] of credentials) {
      const response = await storefrontRequest(
        request,
        token,
        mode,
        'headless-admin-api/CheckoutReadProbe',
        { id: composeGlobalId('Checkout', crypto.randomUUID()) },
      );
      expect(response.errors).toBeUndefined();
    }
  });

  test('sibling connection grants are independent', async ({ api }) => {
    const first = await createStorefront(api, 'First storefront');
    const sibling = await createStorefront(api, 'Sibling storefront');

    const updated = await updatePolicy(
      api,
      first.connection.id,
      first.connection.storefrontAccessPolicy.revision,
      [STOREFRONT_PERMISSIONS.CUSTOMER_READ],
    );
    expect(updated.userErrors).toEqual([]);
    await expectPolicy(api, sibling.connection.id, sibling.connection.storefrontAccessPolicy);
  });

  test('a foreign connection cannot change either store', async ({ api }) => {
    const firstStore = api.session.project;
    const first = await createStorefront(api, 'First store');

    await api.session.setupProject({ displayName: 'Foreign store' });
    await installHeadless(api);
    const foreignStore = api.session.project;
    const foreign = await createStorefront(api, 'Foreign store');

    const rejected = await updatePolicy(
      api,
      first.connection.id,
      first.connection.storefrontAccessPolicy.revision,
      [STOREFRONT_PERMISSIONS.CUSTOMER_WRITE],
    );
    expect(rejected.policy).toBeNull();
    expect(rejected.userErrors).toEqual([
      expect.objectContaining({ code: 'STOREFRONT_NOT_FOUND' }),
    ]);
    await expectPolicy(api, foreign.connection.id, foreign.connection.storefrontAccessPolicy);

    api.session.project = firstStore;
    await expectPolicy(api, first.connection.id, first.connection.storefrontAccessPolicy);
    api.session.project = foreignStore;
  });

  test('the next request enforces the exact verified grant set', async ({
    api,
    request,
  }) => {
    const created = await createStorefront(api);
    const token = created.initialStorefrontCredentials.publicAccessToken;
    const hiddenCheckoutId = composeGlobalId('Checkout', crypto.randomUUID());
    const allowedByDefault = await storefrontRequest(
      request,
      token,
      'PUBLIC',
      'headless-admin-api/CheckoutWriteProbe',
    );
    expect(allowedByDefault.errors).toBeUndefined();

    const updated = await updatePolicy(
      api,
      created.connection.id,
      created.connection.storefrontAccessPolicy.revision,
      [STOREFRONT_PERMISSIONS.CHECKOUT_READ],
    );
    expect(updated.userErrors).toEqual([]);

    const allowedRead = await storefrontRequest(
      request,
      token,
      'PUBLIC',
      'headless-admin-api/CheckoutReadProbe',
      { id: hiddenCheckoutId },
    );
    expect(allowedRead.errors).toBeUndefined();

    const deniedWrite = await storefrontRequest(
      request,
      token,
      'PUBLIC',
      'headless-admin-api/CheckoutWriteProbe',
    );
    expectForbidden(deniedWrite);

    const deniedOtherDomain = await storefrontRequest(
      request,
      token,
      'PUBLIC',
      'headless-admin-api/OrderWriteProbe',
    );
    expectForbidden(deniedOtherDomain);

    const removedRead = await updatePolicy(api, created.connection.id, updated.policy!.revision, [
      STOREFRONT_PERMISSIONS.CHECKOUT_WRITE,
    ]);
    expect(removedRead.userErrors).toEqual([]);
    const hidden = await storefrontRequest(
      request,
      token,
      'PUBLIC',
      'headless-admin-api/CheckoutReadProbe',
      { id: hiddenCheckoutId },
    );
    expectForbidden(hidden);
    expect(JSON.stringify(hidden)).not.toContain(hiddenCheckoutId);

    const allowedOnNextRequest = await storefrontRequest(
      request,
      token,
      'PUBLIC',
      'headless-admin-api/CheckoutWriteProbe',
    );
    expect(allowedOnNextRequest.errors).toBeUndefined();
  });
});

async function installHeadless(api: Api): Promise<void> {
  const response = await api.admin.mutation('apps-admin-api/AppInstall', {
    variables: {
      input: {
        appCode: 'shopana-headless',
        clientMutationId: crypto.randomUUID(),
      },
    },
  });
  const payload = response.data.appsMutation.appInstall;
  expect(payload.userErrors).toEqual([]);
  expect(payload.installation).not.toBeNull();

  await expect
    .poll(
      async () => {
        const current = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id: payload.installation!.id },
        });
        return current.data.appsQuery.appInstallation?.status;
      },
      { timeout: 20_000 },
    )
    .toBe('ACTIVE');
}

async function createStorefront(api: Api, displayName = 'Policy storefront') {
  const response = await api.admin.mutation('headless-admin-api/StorefrontCreate', {
    variables: {
      input: {
        displayName,
        clientMutationId: crypto.randomUUID(),
      },
    },
  });
  const payload = response.data.headlessAppMutation.headlessStorefrontCreate;
  expect(payload.userErrors).toEqual([]);
  expect(payload.connection).not.toBeNull();
  expect(payload.initialStorefrontCredentials).not.toBeNull();
  return {
    connection: {
      ...payload.connection!,
      storefrontAccessPolicy: payload.connection!.storefrontAccessPolicy!,
    },
    initialStorefrontCredentials: payload.initialStorefrontCredentials!,
  };
}

async function updatePolicy(
  api: Api,
  connectionId: string,
  
  permissions: string[],
) {
  const response = await api.admin.mutation('headless-admin-api/AccessPolicyUpdate', {
    variables: {
      input: {
        connectionId,
        
        permissions,
        clientMutationId: crypto.randomUUID(),
      },
    },
  });
  return response.data.headlessAppMutation.storefrontAccessPolicyUpdate;
}

async function getConnection(api: Api, id: string) {
  const response = await api.admin.query('headless-admin-api/StorefrontConnection', {
    variables: { id },
  });
  return response.data.headlessAppQuery.headlessStorefrontConnection;
}

async function expectPolicy(
  api: Api,
  connectionId: string,
  expected: { permissions: readonly string[]; revision: number },
): Promise<void> {
  const connection = await getConnection(api, connectionId);
  expect(connection?.storefrontAccessPolicy).toMatchObject({
    permissions: expected.permissions,
    revision: expected.revision,
  });
}

async function storefrontRequest(
  request: APIRequestContext,
  token: string,
  mode: CredentialMode,
  document: string,
  variables?: Record<string, unknown>,
): Promise<{
  data?: Record<string, unknown> | null;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}> {
  const graphqlUrl = process.env.CLIENT_GRAPHQL_URL;
  if (!graphqlUrl) {
    throw new Error('CLIENT_GRAPHQL_URL environment variable is not set');
  }
  const header =
    mode === 'PUBLIC' ? 'x-shopana-storefront-access-token' : 'shopana-storefront-private-token';
  const response = await request.post(graphqlUrl, {
    headers: {
      'Content-Type': 'application/json',
      [header]: token,
    },
    data: {
      query: readQuery(document),
      variables,
    },
  });
  return response.json();
}

function expectForbidden(response: { errors?: Array<{ extensions?: { code?: string } }> }): void {
  expect(response.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
}
