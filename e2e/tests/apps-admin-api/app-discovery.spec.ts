import type { ApiFixtures } from '@fixtures/api/api';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

type AppDefinition = {
  code: string;
  version: string;
  displayName: string;
  description: string;
  runtimeStatus: string;
  runtimeHealth: {
    status: string;
    message: string | null;
  };
  permissions: {
    scope: string;
    granted: boolean;
  }[];
  capabilities: {
    key: string;
    assignmentMode: string;
    operations: {
      name: string;
      action: string;
    }[];
  }[];
  graphql: {
    admin: boolean;
    storefront: boolean;
  };
  installed: boolean;
  installation: {
    id: string;
    appCode: string;
    status: string;
  } | null;
};

type AvailableAppsData = {
  appsQuery: {
    availableApps: AppDefinition[];
  };
};

type AppDefinitionData = {
  appsQuery: {
    appDefinition: AppDefinition | null;
  };
};

type AppLifecyclePayload = {
  installation: {
    id: string;
    appCode: string;
    status: string;
  } | null;
  operation: {
    id: string;
    status: string;
  } | null;
  duplicate: boolean;
  userErrors: {
    code: string | null;
    message: string;
    field: string[] | null;
  }[];
};

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
] as const;

async function getAvailableApps(
  api: ApiFixtures['api'],
  installed?: boolean,
): Promise<AppDefinition[]> {
  const response = await api.admin.query('apps-admin-api/AvailableApps', {
    variables: {
      where: installed === undefined ? null : { installed },
    },
  });
  const data = response.data as unknown as AvailableAppsData;
  return data.appsQuery.availableApps;
}

async function getAppDefinition(
  api: ApiFixtures['api'],
  code: string,
): Promise<AppDefinition | null> {
  const response = await api.admin.query('apps-admin-api/AppDefinition', {
    variables: { code },
  });
  const data = response.data as unknown as AppDefinitionData;
  return data.appsQuery.appDefinition;
}

async function installApp(
  api: ApiFixtures['api'],
  appCode: string,
): Promise<NonNullable<AppLifecyclePayload['installation']>> {
  const response = await api.admin.mutation('apps-admin-api/AppInstall', {
    variables: {
      input: {
        appCode,
        clientMutationId: crypto.randomUUID(),
      },
    },
  });
  const data = response.data as unknown as {
    appsMutation: { appInstall: AppLifecyclePayload };
  };
  const payload = data.appsMutation.appInstall;

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

  test('APPS-DISC-001: returns every bundled App in stable code order', async ({ api }) => {
    const definitions = await getAvailableApps(api);

    expect(definitions.map(({ code }) => code)).toEqual(bundledApps.map(({ code }) => code));
    expect(definitions.every(({ installed, installation }) => !installed && installation === null)).toBe(
      true,
    );
  });

  test('APPS-DISC-002 APPS-DISC-003: resolves only an exact non-blank manifest code', async ({
    api,
  }) => {
    await expect(getAppDefinition(api, 'hello-world')).resolves.toMatchObject({
      code: 'hello-world',
    });
    await expect(getAppDefinition(api, 'HELLO-WORLD')).resolves.toBeNull();
    await expect(getAppDefinition(api, '')).resolves.toBeNull();
    await expect(getAppDefinition(api, 'unknown-app')).resolves.toBeNull();
  });

  test('APPS-DISC-004..008: projects manifest and healthy runtime metadata', async ({ api }) => {
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

    for (const definition of definitions) {
      expect(definition.runtimeStatus).toBe('READY');
      expect(definition.runtimeHealth).toEqual({
        status: 'HEALTHY',
        message: null,
      });
    }
  });

  test('APPS-DISC-009 APPS-DISC-010: filters definitions by current installation state', async ({
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
    ).resolves.toEqual(['shopana-headless', 'shopana-online-store']);
  });

  test('APPS-DISC-007 APPS-DISC-011: exposes grants and installation for the current store', async ({
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

  test('APPS-DISC-012: an installation in another store does not change discovery', async ({
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

  test('APPS-DISC-013: an uninstalled terminal row is not currently installed', async ({ api }) => {
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
    const data = response.data as unknown as {
      appsMutation: { appUninstall: AppLifecyclePayload };
    };

    expect(data.appsMutation.appUninstall.userErrors).toEqual([]);
    expect(data.appsMutation.appUninstall.operation).not.toBeNull();

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
