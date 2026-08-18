/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import { composeGlobalId, parseGlobalId } from '@utils/globalid';
import postgres from 'postgres';

export type Api = ApiFixtures['api'];
export type CredentialMode = 'PUBLIC' | 'PRIVATE';

export interface UserError {
  code: string | null;
  message: string;
  field: string[] | null;
}

export interface Credential {
  id: string;
  kind: CredentialMode;
  status: 'ACTIVE' | 'REVOKED';
  label: string | null;
  tokenHint: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface AccessPolicy {
  permissions: string[];
  revision: number;
  updatedAt: string;
}

export interface Connection {
  id: string;
  displayName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISCONNECTED';
  storefrontAccessPolicy: AccessPolicy | null;
  publicAccessToken: string | null;
  storefrontCredentials: Credential[];
  createdAt: string;
  updatedAt: string;
}

export interface InitialCredentials {
  publicAccessToken: string;
  privateAccessToken: string;
}

export const HEADLESS_CONNECTION_FIELDS = `
  id
  displayName
  status
  storefrontAccessPolicy {
    permissions
    revision
    updatedAt
  }
  publicAccessToken
  storefrontCredentials {
    id
    kind
    status
    label
    tokenHint
    createdAt
    lastUsedAt
    revokedAt
  }
  createdAt
  updatedAt
`;

export const DEFAULT_PERMISSIONS = [
  'storefront.catalog.read',
  'storefront.checkout.read',
  'storefront.checkout.write',
  'storefront.inventory.read',
  'storefront.order.write',
  'storefront.reviews.read',
  'storefront.reviews.write',
] as const;

export const STOREFRONT_ACCESS_QUERY = 'query HeadlessAccess { headlessStorefrontAccess }';
export const STOREFRONT_INTROSPECTION_QUERY =
  'query HeadlessIntrospection { __schema { queryType { name } } }';

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:15432/portal';

export class HeadlessTestKit {
  readonly sql = postgres(DATABASE_URL, { max: 1 });

  constructor(
    readonly api: Api,
    readonly request: APIRequestContext,
  ) {}

  async close(): Promise<void> {
    await this.sql.end();
  }

  async install(): Promise<string> {
    const response = await this.api.admin.mutation('apps-admin-api/AppInstall', {
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
    const installationId = payload.installation!.id;
    await expect
      .poll(
        async () => {
          const current = await this.api.admin.query('apps-admin-api/AppInstallation', {
            variables: { id: installationId },
          });
          return current.data.appsQuery.appInstallation?.status;
        },
        { timeout: 60_000 },
      )
      .toBe('ACTIVE');
    return installationId;
  }

  async create(
    displayName = 'Headless storefront',
    clientMutationId = crypto.randomUUID(),
    permissions?: string[],
  ): Promise<{
    connection: Connection | null;
    duplicate: boolean;
    initialStorefrontCredentials: InitialCredentials | null;
    userErrors: UserError[];
  }> {
    const result = await this.admin<{
      headlessAppMutation: {
        headlessStorefrontCreate: {
          connection: Connection | null;
          duplicate: boolean;
          initialStorefrontCredentials: InitialCredentials | null;
          userErrors: UserError[];
        };
      };
    }>(
      `mutation HeadlessStorefrontCreate($input: HeadlessStorefrontCreateInput!) {
        headlessAppMutation {
          headlessStorefrontCreate(input: $input) {
            connection { ${HEADLESS_CONNECTION_FIELDS} }
            duplicate
            initialStorefrontCredentials {
              publicAccessToken
              privateAccessToken
            }
            userErrors { code message field }
          }
        }
      }`,
      { input: { displayName, clientMutationId, permissions } },
    );
    return result.data!.headlessAppMutation.headlessStorefrontCreate;
  }

  async list(): Promise<Connection[]> {
    const result = await this.admin<{
      headlessAppQuery: { headlessStorefrontConnections: Connection[] };
    }>(`query HeadlessStorefrontConnections {
      headlessAppQuery {
        headlessStorefrontConnections { ${HEADLESS_CONNECTION_FIELDS} }
      }
    }`);
    return result.data!.headlessAppQuery.headlessStorefrontConnections;
  }

  async get(id: string): Promise<Connection | null> {
    const result = await this.admin<{
      headlessAppQuery: { headlessStorefrontConnection: Connection | null };
    }>(
      `query HeadlessStorefrontConnection($id: ID!) {
        headlessAppQuery {
          headlessStorefrontConnection(id: $id) { ${HEADLESS_CONNECTION_FIELDS} }
        }
      }`,
      { id },
    );
    return result.data!.headlessAppQuery.headlessStorefrontConnection;
  }

  async update(connectionId: string, displayName: string, clientMutationId = crypto.randomUUID()) {
    return this.connectionMutation('headlessStorefrontUpdate', 'HeadlessStorefrontUpdateInput', {
      connectionId,
      displayName,
      clientMutationId,
    });
  }

  async suspend(connectionId: string, clientMutationId = crypto.randomUUID()) {
    return this.connectionMutation('headlessStorefrontSuspend', 'HeadlessStorefrontActionInput', {
      connectionId,
      clientMutationId,
    });
  }

  async resume(connectionId: string, clientMutationId = crypto.randomUUID()) {
    return this.connectionMutation('headlessStorefrontResume', 'HeadlessStorefrontActionInput', {
      connectionId,
      clientMutationId,
    });
  }

  async disconnect(connectionId: string, clientMutationId = crypto.randomUUID()) {
    return this.connectionMutation(
      'headlessStorefrontDisconnect',
      'HeadlessStorefrontActionInput',
      { connectionId, clientMutationId },
    );
  }

  async createPrivate(
    connectionId: string,
    label = 'Rotation credential',
    clientMutationId = crypto.randomUUID(),
  ): Promise<{
    credential: Credential | null;
    privateAccessToken: string | null;
    userErrors: UserError[];
  }> {
    const result = await this.admin<{
      headlessAppMutation: {
        storefrontPrivateCredentialCreate: {
          credential: Credential | null;
          privateAccessToken: string | null;
          userErrors: UserError[];
        };
      };
    }>(
      `mutation HeadlessPrivateCredentialCreate(
        $input: StorefrontPrivateCredentialCreateInput!
      ) {
        headlessAppMutation {
          storefrontPrivateCredentialCreate(input: $input) {
            credential {
              id kind status label tokenHint createdAt lastUsedAt revokedAt
            }
            privateAccessToken
            userErrors { code message field }
          }
        }
      }`,
      { input: { connectionId, label, clientMutationId } },
    );
    return result.data!.headlessAppMutation.storefrontPrivateCredentialCreate;
  }

  async revoke(
    credentialId: string,
    clientMutationId = crypto.randomUUID(),
  ): Promise<{
    credential: Credential | null;
    duplicate: boolean;
    userErrors: UserError[];
  }> {
    const result = await this.admin<{
      headlessAppMutation: {
        storefrontCredentialRevoke: {
          credential: Credential | null;
          duplicate: boolean;
          userErrors: UserError[];
        };
      };
    }>(
      `mutation HeadlessCredentialRevoke($input: StorefrontCredentialRevokeInput!) {
        headlessAppMutation {
          storefrontCredentialRevoke(input: $input) {
            credential {
              id kind status label tokenHint createdAt lastUsedAt revokedAt
            }
            duplicate
            userErrors { code message field }
          }
        }
      }`,
      { input: { credentialId, clientMutationId } },
    );
    return result.data!.headlessAppMutation.storefrontCredentialRevoke;
  }

  async replacePolicy(
    connectionId: string,
    permissions: string[],
    expectedRevision: number,
    clientMutationId = crypto.randomUUID(),
  ): Promise<{ policy: AccessPolicy | null; userErrors: UserError[] }> {
    const result = await this.admin<{
      headlessAppMutation: {
        storefrontAccessPolicyUpdate: {
          policy: AccessPolicy | null;
          userErrors: UserError[];
        };
      };
    }>(
      `mutation HeadlessPolicyUpdate($input: StorefrontAccessPolicyUpdateInput!) {
        headlessAppMutation {
          storefrontAccessPolicyUpdate(input: $input) {
            policy { permissions revision updatedAt }
            userErrors { code message field }
          }
        }
      }`,
      { input: { connectionId, permissions, expectedRevision, clientMutationId } },
    );
    return result.data!.headlessAppMutation.storefrontAccessPolicyUpdate;
  }

  async storefront(
    token: string | null,
    mode: CredentialMode = 'PUBLIC',
    query = STOREFRONT_ACCESS_QUERY,
    variables?: Record<string, unknown>,
    extraHeaders: Record<string, string> = {},
  ): Promise<GraphQLResponse<Record<string, unknown>>> {
    const graphqlUrl = requiredEnvironment('CLIENT_GRAPHQL_URL');
    const credentialHeader =
      mode === 'PUBLIC' ? 'x-shopana-storefront-access-token' : 'shopana-storefront-private-token';
    const response = await this.request.post(graphqlUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { [credentialHeader]: token } : {}),
        ...extraHeaders,
      },
      data: { query, variables },
    });
    return response.json();
  }

  async admin<TResult>(
    query: string,
    variables?: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<GraphQLResponse<TResult>> {
    const response = await this.request.post(requiredEnvironment('ADMIN_GRAPHQL_URL'), {
      headers: {
        'Content-Type': 'application/json',
        ...(this.api.session.projectSlug ? { 'X-Store-Name': this.api.session.projectSlug } : {}),
        ...(this.api.session.organizationId
          ? { 'X-Organization-Id': this.api.session.organizationId }
          : {}),
        ...(this.api.session.accessToken
          ? { Authorization: `Bearer ${this.api.session.accessToken}` }
          : {}),
        ...headers,
      },
      data: { query, variables },
    });
    return response.json();
  }

  rawId(globalId: string): string {
    return parseGlobalId(globalId).id;
  }

  connectionId(rawId = crypto.randomUUID()): string {
    return composeGlobalId('HeadlessStorefrontConnection', rawId);
  }

  credentialId(rawId = crypto.randomUUID()): string {
    return composeGlobalId('StorefrontCredential', rawId);
  }

  private async connectionMutation(
    field:
      | 'headlessStorefrontUpdate'
      | 'headlessStorefrontSuspend'
      | 'headlessStorefrontResume'
      | 'headlessStorefrontDisconnect',
    inputType: 'HeadlessStorefrontUpdateInput' | 'HeadlessStorefrontActionInput',
    input: Record<string, unknown>,
  ): Promise<{
    connection: Connection | null;
    duplicate: boolean;
    userErrors: UserError[];
  }> {
    const result = await this.admin<{
      headlessAppMutation: Record<
        typeof field,
        {
          connection: Connection | null;
          duplicate: boolean;
          userErrors: UserError[];
        }
      >;
    }>(
      `mutation HeadlessConnectionAction($input: ${inputType}!) {
        headlessAppMutation {
          ${field}(input: $input) {
            connection { ${HEADLESS_CONNECTION_FIELDS} }
            duplicate
            userErrors { code message field }
          }
        }
      }`,
      { input },
    );
    return result.data!.headlessAppMutation[field];
  }
}

export interface GraphQLErrorShape {
  message: string;
  path?: (string | number)[];
  extensions?: { code?: string; [key: string]: unknown };
}

export interface GraphQLResponse<T> {
  data?: T | null;
  errors?: GraphQLErrorShape[];
}

export function expectSuccess<T extends { userErrors: UserError[] }>(
  payload: T,
): asserts payload is T {
  expect(payload.userErrors).toEqual([]);
}

export function expectUserError(payload: { userErrors: UserError[] }, code: string): void {
  expect(payload.userErrors).toEqual([expect.objectContaining({ code })]);
}

export function expectStorefrontAllowed(response: GraphQLResponse<Record<string, unknown>>): void {
  expect(response.errors).toBeUndefined();
  expect(response.data).toBeTruthy();
}

export function expectStorefrontError(
  response: GraphQLResponse<Record<string, unknown>>,
  code: string,
): void {
  expect(response.data ?? null).toBeNull();
  expect(response.errors?.[0]?.extensions?.code).toBe(code);
}

export function expectTokenFormat(token: string, kind: CredentialMode): void {
  const prefix = kind === 'PUBLIC' ? 'sfpub' : 'sfprv';
  expect(token).toMatch(
    new RegExp(`^shpna_${prefix}_v1_[A-Za-z0-9_-]{22}_[A-Za-z0-9_-]{43}$`, 'u'),
  );
}

export function mutateTokenSecret(token: string): string {
  const last = token.at(-1);
  return `${token.slice(0, -1)}${last === 'A' ? 'B' : 'A'}`;
}

export function requiredConnection(value: Connection | null): asserts value is Connection {
  expect(value).not.toBeNull();
}

export function requiredCredentials(
  value: InitialCredentials | null,
): asserts value is InitialCredentials {
  expect(value).not.toBeNull();
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}
