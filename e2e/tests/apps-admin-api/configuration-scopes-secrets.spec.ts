/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createHash } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Apps Admin API - configuration, scopes, and secrets', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('APPS-CONF-001..004: configure is a versioned compare-and-swap replacement', async ({
    api,
  }) => {
    const install = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'hello-world',
          configuration: { revision: 1, removed: true },
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    const id = install.data.appsMutation.appInstall.installation!.id;
    const first = await api.admin.mutation('apps-admin-api/AppConfigure', {
      variables: {
        input: {
          installationId: id,
          expectedConfigurationVersion: 1,
          configuration: { revision: 2 },
        },
      },
    });
    expect(first.data.appsMutation.appConfigure).toMatchObject({
      userErrors: [],
      installation: { configuration: { revision: 2 }, configurationVersion: 2 },
    });
    const stale = await api.admin.mutation('apps-admin-api/AppConfigure', {
      variables: {
        input: {
          installationId: id,
          expectedConfigurationVersion: 1,
          configuration: { revision: 3 },
        },
      },
    });
    expect(stale.data.appsMutation.appConfigure.installation).toBeNull();
    expect(stale.data.appsMutation.appConfigure.userErrors).toEqual([
      expect.objectContaining({ code: 'CONFLICT' }),
    ]);

    const concurrent = await Promise.all([
      api.admin.mutation('apps-admin-api/AppConfigure', {
        variables: {
          input: {
            installationId: id,
            expectedConfigurationVersion: 2,
            configuration: { winner: 'a' },
          },
        },
      }),
      api.admin.mutation('apps-admin-api/AppConfigure', {
        variables: {
          input: {
            installationId: id,
            expectedConfigurationVersion: 2,
            configuration: { winner: 'b' },
          },
        },
      }),
    ]);
    expect(
      concurrent.filter(
        ({ data }) => data.appsMutation.appConfigure.userErrors.length === 0,
      ),
    ).toHaveLength(1);
  });

  test('APPS-CONF-005..012: update versions and scope replacements follow the manifest contract', async ({
    api,
  }) => {
    const install = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'shopana-headless',
          grantedScopes: ['project.getStoreById', 'project.getStoreById'],
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    const id = install.data.appsMutation.appInstall.installation!.id;
    const missingVersion = await api.admin.mutation('apps-admin-api/AppUpdate', {
      variables: {
        input: {
          installationId: id,
          configuration: { invalid: true },
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    expect(missingVersion.data.appsMutation.appUpdate).toMatchObject({
      installation: null,
      operation: null,
      userErrors: [
        expect.objectContaining({
          code: 'INVALID_INPUT',
          field: ['input', 'expectedConfigurationVersion'],
        }),
      ],
    });
    const rejectedScope = await api.admin.mutation('apps-admin-api/AppConfigure', {
      variables: {
        input: {
          installationId: id,
          expectedConfigurationVersion: 1,
          configuration: {},
          grantedScopes: ['unknown.scope'],
        },
      },
    });
    expect(rejectedScope.data.appsMutation.appConfigure).toMatchObject({
      installation: null,
      userErrors: [expect.objectContaining({ code: 'INVALID_SCOPE' })],
    });
    const revoked = await api.admin.mutation('apps-admin-api/AppConfigure', {
      variables: {
        input: {
          installationId: id,
          expectedConfigurationVersion: 1,
          configuration: { configured: true },
          grantedScopes: [],
        },
      },
    });
    expect(revoked.data.appsMutation.appConfigure).toMatchObject({
      userErrors: [],
      installation: {
        configurationVersion: 2,
        scopes: [{ scope: 'project.getStoreById', granted: false }],
      },
    });
  });

  test('APPS-CONF-011 APPS-CONF-012: defaults and configuration are store-local', async ({
    api,
  }) => {
    const firstStore = api.session.project;
    const first = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'shopana-headless', clientMutationId: crypto.randomUUID() },
      },
    });
    await api.admin.mutation('apps-admin-api/AppConfigure', {
      variables: {
        input: {
          installationId: first.data.appsMutation.appInstall.installation!.id,
          expectedConfigurationVersion: 1,
          configuration: { store: 'first' },
          grantedScopes: [],
        },
      },
    });
    await api.session.setupProject({ displayName: 'Second Store' });
    const second = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode: 'shopana-headless', clientMutationId: crypto.randomUUID() },
      },
    });
    expect(second.data.appsMutation.appInstall.installation).toMatchObject({
      configuration: {},
      configurationVersion: 1,
      scopes: [{ scope: 'project.getStoreById', granted: true }],
    });
    api.session.project = firstStore;
  });

  test('APPS-CONF-013..018 APPS-CONF-020 APPS-CONF-021: secrets remain write-only and validation is atomic', async ({
    api,
  }) => {
    const plaintext = `secret-${crypto.randomUUID()}`;
    const install = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'hello-world',
          secrets: [
            { name: 'api-key', value: 'superseded' },
            { name: 'api-key', value: plaintext },
          ],
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    expect(install.data.appsMutation.appInstall.userErrors).toEqual([]);
    expect(JSON.stringify(install.data)).not.toContain(plaintext);
    expect(JSON.stringify(install.data)).not.toContain('api-key');

    await api.session.setupProject({ displayName: 'Invalid Secret Store' });
    const invalid = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'hello-world',
          secrets: [{ name: '', value: 'must-not-persist' }],
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    expect(invalid.data.appsMutation.appInstall).toMatchObject({
      installation: null,
      operation: null,
    });
    expect(invalid.data.appsMutation.appInstall.userErrors).toEqual([
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    ]);
  });

  test('APPS-CONF-017 APPS-CONF-019: rotation and uninstall never expose secret material', async ({
    api,
  }) => {
    const firstValue = `first-${crypto.randomUUID()}`;
    const secondValue = `second-${crypto.randomUUID()}`;
    const install = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'hello-world',
          secrets: [{ name: 'token', value: firstValue }],
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    const id = install.data.appsMutation.appInstall.installation!.id;
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');
    const update = await api.admin.mutation('apps-admin-api/AppUpdate', {
      variables: {
        input: {
          installationId: id,
          secrets: [{ name: 'token', value: secondValue }],
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    expect(JSON.stringify(update.data)).not.toMatch(
      new RegExp(`${firstValue}|${secondValue}`, 'u'),
    );
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');
    await api.admin.mutation('apps-admin-api/AppUninstall', {
      variables: { input: { installationId: id, clientMutationId: crypto.randomUUID() } },
    });
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation?.status;
      })
      .toBe('UNINSTALLED');
  });

  test('APPS-CONF-022: runtime observes rotation and loses secret access after uninstall', async ({
    api,
  }) => {
    const name = 'runtime-token';
    const firstValue = `first-${crypto.randomUUID()}`;
    const secondValue = `second-${crypto.randomUUID()}`;
    const digest = (value: string) =>
      createHash('sha256').update(value).digest('hex');
    const runtimeDigest = (response: { data: unknown }) =>
      (
        response.data as {
          helloWorldAppQuery: {
            helloWorldSecretDigest: { sha256: string };
          };
        }
      ).helloWorldAppQuery.helloWorldSecretDigest.sha256;

    const install = await api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: {
          appCode: 'hello-world',
          secrets: [{ name, value: firstValue }],
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    const id = install.data.appsMutation.appInstall.installation!.id;
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');

    const beforeRotation = await api.admin.query(
      'hello-world-admin-api/SecretDigest',
      { variables: { name } },
    );
    expect(runtimeDigest(beforeRotation)).toBe(digest(firstValue));

    await api.admin.mutation('apps-admin-api/AppUpdate', {
      variables: {
        input: {
          installationId: id,
          secrets: [{ name, value: secondValue }],
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation?.status;
      })
      .toBe('ACTIVE');

    const afterRotation = await api.admin.query(
      'hello-world-admin-api/SecretDigest',
      { variables: { name } },
    );
    expect(runtimeDigest(afterRotation)).toBe(digest(secondValue));
    expect(JSON.stringify(afterRotation.data)).not.toContain(
      digest(firstValue),
    );

    await api.admin.mutation('apps-admin-api/AppUninstall', {
      variables: {
        input: {
          installationId: id,
          clientMutationId: crypto.randomUUID(),
        },
      },
    });
    await expect
      .poll(async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id },
        });
        return response.data.appsQuery.appInstallation?.status;
      })
      .toBe('UNINSTALLED');

    const afterUninstall = await api.admin.query(
      'hello-world-admin-api/SecretDigest',
      {
        variables: { name },
        throwOnError: false,
      },
    );
    expect(afterUninstall.errors?.length).toBeGreaterThan(0);
    expect(JSON.stringify(afterUninstall)).not.toMatch(
      new RegExp(`${firstValue}|${secondValue}`, 'u'),
    );
  });
});
