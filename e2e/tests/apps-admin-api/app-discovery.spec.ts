import type { ApiFixtures } from '@fixtures/api/api';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type {
  ApiAppDefinition,
  ApiAppInstallation,
  ApiAppLifecyclePayload,
} from '@codegen/admin-gql';

const bundledApps = [
  {
    code: 'hello-world',
    version: '0.0.1',
    displayName: 'Hello World',
    description: 'Minimal bundled Shopana App used to validate the hosted App runtime.',
    permissions: [],
    capabilities: [
      {
        key: 'greeting',
        assignmentMode: 'STORE',
        operations: [{ name: 'hello', action: 'hello' }],
      },
    ],
    graphql: { admin: true, storefront: false },
  },
  {
    code: 'shopana-headless',
    version: '1.0.0',
    displayName: 'Headless',
    description: 'Custom storefronts using the Shopana Storefront API.',
    permissions: [{ scope: 'project.getStoreById', granted: false }],
    capabilities: [],
    graphql: { admin: true, storefront: true },
  },
  {
    code: 'shopana-online-store',
    version: '1.0.0',
    displayName: 'Online Store',
    description: 'Shopana first-party online storefront sales channel.',
    permissions: [],
    capabilities: [
      {
        key: 'sales-channel',
        assignmentMode: 'RESOURCE',
        operations: [
          { name: 'connect', action: 'channelConnect' },
          { name: 'update', action: 'channelUpdate' },
          { name: 'suspend', action: 'channelSuspend' },
          { name: 'resume', action: 'channelResume' },
          { name: 'disconnect', action: 'channelDisconnect' },
          { name: 'health', action: 'channelHealth' },
        ],
      },
    ],
    graphql: { admin: true, storefront: true },
  },
  {
    code: 'shopana-smtp',
    version: '1.0.0',
    displayName: 'SMTP',
    description: 'Deliver Shopana email notifications through a store SMTP server.',
    permissions: [],
    capabilities: [
      {
        key: 'notifications',
        assignmentMode: 'STORE',
        operations: [{ name: 'deliver', action: 'deliver' }],
      },
    ],
    graphql: { admin: false, storefront: false },
  },
] as const;

async function getAvailableApps(
  api: ApiFixtures['api'],
  installed?: boolean,
): Promise<ApiAppDefinition[]> {
  const response = await api.admin.query('apps-admin-api/AvailableApps', {
    variables: {
      where: installed === undefined ? null : { installed },
    },
  });
  return response.data.appsQuery.availableApps;
}

async function getAppDefinition(
  api: ApiFixtures['api'],
  code: string,
): Promise<ApiAppDefinition | null> {
  const response = await api.admin.query('apps-admin-api/AppDefinition', {
    variables: { code },
  });
  return response.data.appsQuery.appDefinition ?? null;
}

async function getAppInstallation(
  api: ApiFixtures['api'],
  id: string,
): Promise<ApiAppInstallation | null> {
  const response = await api.admin.query('apps-admin-api/AppInstallation', {
    variables: { id },
  });
  return response.data.appsQuery.appInstallation ?? null;
}

async function installApp(
  api: ApiFixtures['api'],
  appCode: string,
): Promise<NonNullable<ApiAppLifecyclePayload['installation']>> {
  const response = await api.admin.mutation('apps-admin-api/AppInstall', {
    variables: {
      input: {
        appCode,
        clientMutationId: crypto.randomUUID(),
      },
    },
  });
  const payload = response.data.appsMutation.appInstall;

  expect(payload.userErrors).toEqual([]);
  expect(payload.duplicate).toBe(false);
  expect(payload.operation).not.toBeNull();
  expect(payload.installation).not.toBeNull();

  if (!payload.installation) {
    throw new Error(`App installation was not returned for "${appCode}"`);
  }
  return payload.installation;
}

test.describe('Apps Admin API - bundled App discovery', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('returns every bundled App in stable code order', async ({ api }) => {
    const definitions = await getAvailableApps(api);

    expect(definitions.map(({ code }) => code)).toEqual(bundledApps.map(({ code }) => code));
    expect(definitions.every(({ installed, installation }) => !installed && installation === null)).toBe(
      true,
    );
  });

  test('resolves only an exact non-blank manifest code', async ({
    api,
  }) => {
    await expect(getAppDefinition(api, 'hello-world')).resolves.toMatchObject({
      code: 'hello-world',
    });
    await expect(getAppDefinition(api, 'HELLO-WORLD')).resolves.toBeNull();
    await expect(getAppDefinition(api, ' hello-world ')).resolves.toBeNull();
    await expect(getAppDefinition(api, '')).resolves.toBeNull();
    await expect(getAppDefinition(api, 'unknown-app')).resolves.toBeNull();
  });

  test('projects bundled manifest metadata', async ({
    api,
  }) => {
    const definitions = await getAvailableApps(api);

    expect(
      definitions.map(
        ({
          code,
          version,
          displayName,
          description,
          permissions,
          capabilities,
          graphql,
        }) => ({
          code,
          version,
          displayName,
          description,
          permissions,
          capabilities,
          graphql,
        }),
      ),
    ).toEqual(bundledApps);
  });

  test('exposes healthy and failed runtimes without internals', async ({
    api,
  }) => {
    const definitions = await getAvailableApps(api);
    const byCode = new Map(definitions.map((definition) => [definition.code, definition]));

    for (const code of ['hello-world', 'shopana-headless', 'shopana-smtp']) {
      expect(byCode.get(code)).toMatchObject({
        runtimeStatus: 'READY',
        runtimeHealth: {
          status: 'HEALTHY',
          message: null,
        },
      });
    }

    const failedRuntime = byCode.get('shopana-online-store');
    expect(failedRuntime).toMatchObject({
      runtimeStatus: 'FAILED',
      runtimeHealth: {
        status: 'UNHEALTHY',
        message: 'App runtime status is FAILED',
      },
    });
    expect(failedRuntime?.runtimeHealth.message).not.toMatch(
      /(?:stack|at\s+\w|config|password|secret|token|\/Users\/|node_modules)/iu,
    );
  });

  test('filters definitions by current installation state', async ({
    api,
  }) => {
    await expect(getAvailableApps(api, true)).resolves.toEqual([]);
    await expect(
      getAvailableApps(api, false).then((apps) => apps.map(({ code }) => code)),
    ).resolves.toEqual(bundledApps.map(({ code }) => code));

    await installApp(api, 'hello-world');

    await expect(
      getAvailableApps(api, true).then((apps) => apps.map(({ code }) => code)),
    ).resolves.toEqual(['hello-world']);
    await expect(
      getAvailableApps(api, false).then((apps) => apps.map(({ code }) => code)),
    ).resolves.toEqual(['shopana-headless', 'shopana-online-store', 'shopana-smtp']);
  });

  test('exposes grants and installation for the current store', async ({
    api,
  }) => {
    const installation = await installApp(api, 'shopana-headless');
    const definition = await getAppDefinition(api, 'shopana-headless');

    expect(definition).toMatchObject({
      installed: true,
      installation: {
        id: installation.id,
        appCode: 'shopana-headless',
      },
      permissions: [{ scope: 'project.getStoreById', granted: true }],
    });
  });

  test('an installation in another store does not change discovery', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    await api.session.setupProject({ displayName: 'Second Store' });
    const secondStore = api.session.project;

    await installApp(api, 'hello-world');

    api.session.project = firstStore;
    await expect(getAppDefinition(api, 'hello-world')).resolves.toMatchObject({
      installed: false,
      installation: null,
    });
    await expect(getAvailableApps(api, true)).resolves.toEqual([]);

    api.session.project = secondStore;
    await expect(getAppDefinition(api, 'hello-world')).resolves.toMatchObject({
      installed: true,
      installation: {
        appCode: 'hello-world',
      },
    });
  });

  test('an uninstalled terminal row is not currently installed', async ({ api }) => {
    const installation = await installApp(api, 'hello-world');

    await expect
      .poll(async () => (await getAppDefinition(api, 'hello-world'))?.installation?.status)
      .toBe('ACTIVE');

    const response = await api.admin.mutation('apps-admin-api/AppUninstall', {
      variables: {
        input: {
          installationId: installation.id,
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    const payload = response.data.appsMutation.appUninstall;

    expect(payload.userErrors).toEqual([]);
    expect(payload.operation).not.toBeNull();

    await expect
      .poll(async () => (await getAppInstallation(api, installation.id))?.status)
      .toBe('UNINSTALLED');

    await expect
      .poll(async () => getAppDefinition(api, 'hello-world'))
      .toMatchObject({
        installed: false,
        installation: null,
      });
    await expect(
      getAvailableApps(api, false).then((apps) => apps.map(({ code }) => code)),
    ).resolves.toContain('hello-world');
  });
});
