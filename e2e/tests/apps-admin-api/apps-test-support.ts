import type { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';
import { decodeGlobalId, encodeGlobalId } from '@utils/globalid';
import postgres from 'postgres';

type Api = ApiFixtures['api'];
type LifecycleAction = 'AppSuspend' | 'AppResume' | 'AppUninstall';

const TERMINAL_STATUSES = new Set([
  'ACTIVE',
  'INSTALL_FAILED',
  'SUSPENDED',
  'UPDATE_FAILED',
  'UNINSTALLED',
  'UNINSTALL_FAILED',
]);

export const appsDatabaseUrl =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:15432/portal';

export function rawId(globalId: string): string {
  return decodeGlobalId(globalId).id;
}

export function installationGlobalId(id = crypto.randomUUID()): string {
  return encodeGlobalId('AppInstallation', id);
}

export function operationGlobalId(id = crypto.randomUUID()): string {
  return encodeGlobalId('AppLifecycleOperation', id);
}

export async function getInstallation(api: Api, id: string) {
  const response = await api.admin.query('apps-admin-api/AppInstallation', {
    variables: { id },
  });
  return response.data.appsQuery.appInstallation ?? null;
}

export async function getOperation(api: Api, id: string) {
  const response = await api.admin.query('apps-admin-api/AppLifecycleOperation', {
    variables: { id },
  });
  return response.data.appsQuery.appLifecycleOperation ?? null;
}

export async function listInstallations(
  api: Api,
  variables: Record<string, unknown> = { first: 50 },
) {
  const response = await api.admin.query('apps-admin-api/AppInstallations', {
    variables,
  });
  return response.data.appsQuery.appInstallations;
}

export async function installApp(
  api: Api,
  input: {
    appCode?: string;
    configuration?: Record<string, unknown>;
    grantedScopes?: string[];
    secrets?: { name: string; value: string }[];
    clientMutationId?: string;
  } = {},
) {
  const response = await api.admin.mutation('apps-admin-api/AppInstall', {
    variables: {
      input: {
        appCode: input.appCode ?? 'hello-world',
        configuration: input.configuration,
        grantedScopes: input.grantedScopes,
        secrets: input.secrets,
        clientMutationId: input.clientMutationId ?? crypto.randomUUID(),
      },
    },
  });
  return response.data.appsMutation.appInstall;
}

export async function installActive(api: Api, input: Parameters<typeof installApp>[1] = {}) {
  const payload = await installApp(api, input);
  expectAccepted(payload, 'INSTALL');
  if (!payload.installation) {
    throw new Error('Accepted install did not return an installation');
  }
  const installation = await waitForInstallation(api, payload.installation.id, 'ACTIVE');
  return { payload, installation };
}

export async function updateApp(
  api: Api,
  installationId: string,
  input: {
    configuration?: Record<string, unknown>;
    expectedConfigurationVersion?: number;
    grantedScopes?: string[];
    secrets?: { name: string; value: string }[];
    clientMutationId?: string;
  } = {},
) {
  const response = await api.admin.mutation('apps-admin-api/AppUpdate', {
    variables: {
      input: {
        installationId,
        configuration: input.configuration,
        expectedConfigurationVersion: input.expectedConfigurationVersion,
        grantedScopes: input.grantedScopes,
        secrets: input.secrets,
        clientMutationId: input.clientMutationId ?? crypto.randomUUID(),
      },
    },
  });
  return response.data.appsMutation.appUpdate;
}

export async function configureApp(
  api: Api,
  installationId: string,
  expectedConfigurationVersion: number,
  configuration: Record<string, unknown>,
  grantedScopes?: string[],
) {
  const response = await api.admin.mutation('apps-admin-api/AppConfigure', {
    variables: {
      input: {
        installationId,
        expectedConfigurationVersion,
        configuration,
        grantedScopes,
      },
    },
  });
  return response.data.appsMutation.appConfigure;
}

export async function lifecycleAction(
  api: Api,
  action: LifecycleAction,
  installationId: string,
  clientMutationId = crypto.randomUUID(),
) {
  const response = await api.admin.mutation(`apps-admin-api/${action}`, {
    variables: { input: { installationId, clientMutationId } },
  });
  const field = {
    AppSuspend: 'appSuspend',
    AppResume: 'appResume',
    AppUninstall: 'appUninstall',
  }[action] as 'appSuspend' | 'appResume' | 'appUninstall';
  return response.data.appsMutation[field];
}

export async function waitForInstallation(api: Api, id: string, expectedStatus?: string) {
  let installation: Awaited<ReturnType<typeof getInstallation>> = null;
  const readStatus = async () => {
    installation = await getInstallation(api, id);
    return installation?.status;
  };
  if (expectedStatus) {
    await expect.poll(readStatus, { timeout: 20_000 }).toBe(expectedStatus);
  } else {
    await expect
      .poll(async () => TERMINAL_STATUSES.has((await readStatus()) ?? ''), {
        timeout: 20_000,
      })
      .toBe(true);
  }
  if (!installation) {
    throw new Error(`Installation ${id} disappeared while waiting for lifecycle completion`);
  }
  return installation;
}

export async function waitForOperation(api: Api, id: string) {
  let operation: Awaited<ReturnType<typeof getOperation>> = null;
  await expect
    .poll(
      async () => {
        operation = await getOperation(api, id);
        return operation?.status;
      },
      { timeout: 20_000 },
    )
    .toMatch(/^(?:SUCCEEDED|FAILED)$/u);
  if (!operation) {
    throw new Error(`Lifecycle operation ${id} disappeared while waiting for completion`);
  }
  return operation;
}

export function expectAccepted(
  payload: {
    installation?: { id: string } | null;
    operation?: { id: string; type?: string; workflowId?: string } | null;
    duplicate: boolean;
    userErrors: readonly unknown[];
  },
  type?: string,
): void {
  expect(payload.userErrors).toEqual([]);
  expect(payload.duplicate).toBe(false);
  expect(payload.installation).not.toBeNull();
  expect(payload.operation).not.toBeNull();
  if (type) {
    expect(payload.operation).toMatchObject({ type });
  }
}

export function expectSafeErrors(payload: {
  userErrors: readonly { code: string; message: string }[];
}): void {
  expect(payload.userErrors.length).toBeGreaterThan(0);
  expect(JSON.stringify(payload.userErrors)).not.toMatch(
    /(?:select\s|insert\s|update\s+\w+\s+set|postgres|stack|node_modules|\/Users\/|ciphertext|password|bearer\s|token)/iu,
  );
}

export async function withAppsDb<T>(
  callback: (sql: ReturnType<typeof postgres>) => Promise<T>,
): Promise<T> {
  const sql = postgres(appsDatabaseUrl, { max: 1 });
  try {
    return await callback(sql);
  } finally {
    await sql.end();
  }
}

export async function installationRows(globalInstallationId: string) {
  return withAppsDb(
    (sql) =>
      sql`
      select *
      from apps.app_installations
      where id = ${rawId(globalInstallationId)}
    `,
  );
}

export async function operationRows(globalInstallationId: string) {
  return withAppsDb(
    (sql) =>
      sql`
      select *
      from apps.app_lifecycle_operations
      where installation_id = ${rawId(globalInstallationId)}
      order by created_at asc, id asc
    `,
  );
}

export async function secretRows(globalInstallationId: string) {
  return withAppsDb(
    (sql) =>
      sql`
      select id, installation_id, name, ciphertext, version, revoked_at
      from apps.app_installation_secrets
      where installation_id = ${rawId(globalInstallationId)}
      order by name asc
    `,
  );
}

export async function capabilityRows(globalInstallationId: string) {
  return withAppsDb(
    (sql) =>
      sql`
      select *
      from apps.slots
      where installation_id = ${rawId(globalInstallationId)}
      order by capability asc, operation asc
    `,
  );
}
