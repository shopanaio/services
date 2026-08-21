import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import type { ApiApplicationMutation } from '@codegen/admin-gql';
import { decodeGlobalId } from '@utils/globalid';
import postgres from 'postgres';

export const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:15432/portal';
export const IAM_BASE_URL = process.env.IAM_HTTP_URL ?? 'http://127.0.0.1:11010';

export type Api = ApiFixtures['api'];
export type Sql = ReturnType<typeof postgres>;

export interface ApplicationRef {
  id: string;
  rawId: string;
  organizationId: string;
  rawOrganizationId: string;
  name: string;
  resource: string;
  revision: number;
}

export interface ApplicationAdminScope {
  organizationId: string;
  rawOrganizationId: string;
  applicationA: ApplicationRef;
  applicationB: ApplicationRef;
  foreignOrganizationId: string;
  rawForeignOrganizationId: string;
  foreignApplication: ApplicationRef;
}

export function openSql(): Sql {
  return postgres(
    process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    {
      max: 1,
    },
  );
}

export async function setupApplicationAdminScope(api: Api): Promise<ApplicationAdminScope> {
  await api.session.setupUser();
  const organization = await api.session.setupOrganization({
    displayName: 'Application Admin E2E',
  });
  const applicationA = await createApplication(api, organization.id, 'a');
  const applicationB = await createApplication(api, organization.id, 'b');
  const foreignOrganization = await api.session.setupOrganization({
    displayName: 'Application Admin Foreign E2E',
  });
  const foreignApplication = await createApplication(api, foreignOrganization.id, 'foreign');
  api.session.organizationId = organization.id;
  return {
    organizationId: organization.id,
    rawOrganizationId: decodeGlobalId(organization.id).id,
    applicationA,
    applicationB,
    foreignOrganizationId: foreignOrganization.id,
    rawForeignOrganizationId: decodeGlobalId(foreignOrganization.id).id,
    foreignApplication,
  };
}

export async function createOrganizationMember(
  api: Api,
  organizationId: string,
  options:
    | { systemRole: 'admin' | 'member' }
    | {
        permissions: {
          resource: string;
          action: 'read' | 'write' | 'admin';
        }[];
      },
) {
  const user = await api.admin.user.create();
  let role: string;
  if ('systemRole' in options) {
    role = options.systemRole;
  } else {
    role = `application-admin-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: role,
          displayName: `Application Admin ${role}`,
          permissions: options.permissions,
        },
      },
    });
    expect(data.roleMutation.roleCreate.userErrors).toHaveLength(0);
    expect(data.roleMutation.roleCreate.role).not.toBeNull();
  }
  const { data } = await api.admin.mutation('iam-api/MemberInvite', {
    variables: {
      input: {
        organizationId,
        email: user.data.email,
        roles: [{ domain: 'org', role }],
      },
    },
  });
  expect(data.organizationMutation.memberInvite.userErrors).toHaveLength(0);
  return user;
}

export async function createApplication(
  api: Api,
  organizationId: string,
  suffix: string,
  overrides: Partial<{ name: string; displayName: string; description: string }> = {},
): Promise<ApplicationRef> {
  const unique = crypto.randomUUID();
  const name = overrides.name ?? `application-admin-${suffix}-${unique}`;
  const { data } = await api.admin.mutation('application-admin-api/ApplicationCreate', {
    variables: {
      input: {
        organizationId,
        name,
        displayName: overrides.displayName ?? `Application Admin ${suffix}`,
        ...(overrides.description === undefined ? {} : { description: overrides.description }),
      },
    },
  });
  const payload = data.applicationMutation.applicationCreate;
  expect(payload.userErrors).toHaveLength(0);
  const application = required(payload.application, 'created application');
  const rawId = decodeGlobalId(application.id).id;
  return {
    id: application.id,
    rawId,
    organizationId,
    rawOrganizationId: decodeGlobalId(organizationId).id,
    name,
    resource: `urn:shopana:application:${rawId}`,
    revision: 1,
  };
}

export async function getApplication(api: Api, application: ApplicationRef) {
  const { data } = await api.admin.query('application-admin-api/Application', {
    variables: {
      organizationId: application.organizationId,
      applicationId: application.id,
    },
  });
  return data.applicationQuery.application;
}

export async function listApplications(
  api: Api,
  organizationId: string,
  variables: Record<string, unknown> = {},
) {
  const { data } = await api.admin.query('application-admin-api/Applications', {
    variables: {
      organizationId,
      first: 20,
      ...variables,
    },
  });
  return data.applicationQuery.applications;
}

export async function updateApplication(
  api: Api,
  application: ApplicationRef,
  patch: Record<string, unknown>,
  
) {
  const { data } = await api.admin.mutation('application-admin-api/ApplicationUpdate', {
    variables: {
      input: {
        organizationId: application.organizationId,
        applicationId: application.id,
        
        ...patch,
      },
    },
  });
  return data.applicationMutation.applicationUpdate;
}

export async function archiveApplication(
  api: Api,
  application: ApplicationRef,
  
) {
  const { data } = await api.admin.mutation('application-admin-api/ApplicationArchive', {
    variables: {
      input: {
        organizationId: application.organizationId,
        applicationId: application.id,
        
      },
    },
  });
  return data.applicationMutation.applicationArchive;
}

export async function updateAuth(
  api: Api,
  application: ApplicationRef,
  patch: Record<string, unknown>,
  
) {
  const revision = expectedRevision ?? (await getAuthRevision(api, application));
  const { data } = await api.admin.mutation('application-admin-api/ApplicationAuthUpdate', {
    variables: {
      input: {
        organizationId: application.organizationId,
        applicationId: application.id,
        
        ...patch,
      },
    },
  });
  return data.applicationMutation.applicationAuthUpdate;
}

export async function setRealmEnabled(
  api: Api,
  application: ApplicationRef,
  enabled: boolean,
  
) {
  const revision = expectedRevision ?? (await getAuthRevision(api, application));
  const { data } = await api.admin.mutation(
    'application-admin-api/ApplicationAuthRealmEnabledSet',
    {
      variables: {
        input: {
          organizationId: application.organizationId,
          applicationId: application.id,
          enabled,
          
        },
      },
    },
  );
  return data.applicationMutation.applicationAuthRealmEnabledSet;
}

export async function updateAuthMethod(
  api: Api,
  application: ApplicationRef,
  methodId: 'password' | 'email_otp',
  enabledCapabilities: string[],
  
) {
  const revision = expectedRevision ?? (await getAuthRevision(api, application));
  const { data } = await api.admin.mutation('application-admin-api/ApplicationAuthMethodUpdate', {
    variables: {
      input: {
        organizationId: application.organizationId,
        applicationId: application.id,
        methodId,
        enabledCapabilities,
        
      },
    },
  });
  return data.applicationMutation.applicationAuthMethodUpdate;
}

export async function configureProvider(
  api: Api,
  application: ApplicationRef,
  provider: 'GOOGLE' | 'FACEBOOK' = 'GOOGLE',
  overrides: Partial<{
    clientId: string;
    clientSecret: string;
    scopes: string[];
    
  }> = {},
) {
  const revision = overrides.expectedRevision ?? (await getAuthRevision(api, application));
  const { data } = await api.admin.mutation(
    'application-admin-api/ApplicationAuthProviderConfigure',
    {
      variables: {
        input: {
          organizationId: application.organizationId,
          applicationId: application.id,
          provider,
          clientId: overrides.clientId ?? `client-${crypto.randomUUID()}`,
          clientSecret: overrides.clientSecret ?? `secret-${crypto.randomUUID()}`,
          scopes:
            overrides.scopes ??
            (provider === 'GOOGLE' ? ['openid', 'profile', 'email'] : ['email']),
          
        },
      },
    },
  );
  return data.applicationMutation.applicationAuthProviderConfigure;
}

export async function updateProvider(
  api: Api,
  application: ApplicationRef,
  provider: 'GOOGLE' | 'FACEBOOK',
  patch: Record<string, unknown>,
  
) {
  const revision = expectedRevision ?? (await getAuthRevision(api, application));
  const { data } = await api.admin.mutation('application-admin-api/ApplicationAuthProviderUpdate', {
    variables: {
      input: {
        organizationId: application.organizationId,
        applicationId: application.id,
        provider,
        
        ...patch,
      },
    },
  });
  return data.applicationMutation.applicationAuthProviderUpdate;
}

export async function rotateProviderCredentials(
  api: Api,
  application: ApplicationRef,
  provider: 'GOOGLE' | 'FACEBOOK',
  clientId: string,
  clientSecret: string,
  
) {
  const revision = expectedRevision ?? (await getAuthRevision(api, application));
  const { data } = await api.admin.mutation(
    'application-admin-api/ApplicationAuthProviderCredentialsRotate',
    {
      variables: {
        input: {
          organizationId: application.organizationId,
          applicationId: application.id,
          provider,
          clientId,
          clientSecret,
          
        },
      },
    },
  );
  return data.applicationMutation.applicationAuthProviderCredentialsRotate;
}

export async function deleteProviderCredentials(
  api: Api,
  application: ApplicationRef,
  provider: 'GOOGLE' | 'FACEBOOK',
  
) {
  const revision = expectedRevision ?? (await getAuthRevision(api, application));
  const { data } = await api.admin.mutation(
    'application-admin-api/ApplicationAuthProviderCredentialsDelete',
    {
      variables: {
        input: {
          organizationId: application.organizationId,
          applicationId: application.id,
          provider,
          
        },
      },
    },
  );
  return data.applicationMutation.applicationAuthProviderCredentialsDelete;
}

export async function validateProvider(
  api: Api,
  application: ApplicationRef,
  provider: 'GOOGLE' | 'FACEBOOK',
  
) {
  const revision = expectedRevision ?? (await getAuthRevision(api, application));
  const { data } = await api.admin.mutation(
    'application-admin-api/ApplicationAuthProviderValidate',
    {
      variables: {
        input: {
          organizationId: application.organizationId,
          applicationId: application.id,
          provider,
          
        },
      },
    },
  );
  return data.applicationMutation.applicationAuthProviderValidate;
}

export async function getAuthRevision(api: Api, application: ApplicationRef): Promise<number> {
  const value = required(await getApplication(api, application), 'application auth revision');
  return value.auth.revision;
}

export interface OAuthClientInput {
  name?: string;
  clientType?: 'PUBLIC' | 'CONFIDENTIAL';
  environment?: 'DEVELOPMENT' | 'PRODUCTION';
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  enableEndSession?: boolean;
  skipConsent?: boolean;
}

export async function createOAuthClient(
  api: Api,
  application: ApplicationRef,
  input: OAuthClientInput = {},
) {
  const { data } = await api.admin.mutation('application-admin-api/ApplicationOAuthClientCreate', {
    variables: {
      input: {
        organizationId: application.organizationId,
        applicationId: application.id,
        name: input.name ?? `client-${crypto.randomUUID()}`,
        clientType: input.clientType ?? 'PUBLIC',
        environment: input.environment ?? 'DEVELOPMENT',
        redirectUris: input.redirectUris ?? [
          `${IAM_BASE_URL}/e2e/oauth/callback/${application.rawId}`,
        ],
        postLogoutRedirectUris: input.postLogoutRedirectUris ?? [
          `${IAM_BASE_URL}/e2e/oauth/logout/${application.rawId}`,
        ],
        enableEndSession: input.enableEndSession ?? true,
        skipConsent: input.skipConsent ?? false,
      },
    },
  });
  return data.applicationMutation.applicationOAuthClientCreate;
}

export async function listOAuthClients(
  api: Api,
  application: ApplicationRef,
  variables: Record<string, unknown> = {},
) {
  const { data } = await api.admin.query('application-admin-api/ApplicationOAuthClients', {
    variables: {
      organizationId: application.organizationId,
      applicationId: application.id,
      first: 20,
      ...variables,
    },
  });
  return required(data.applicationQuery.application, 'OAuth application').oauthClients;
}

export async function getOAuthClient(api: Api, application: ApplicationRef, clientId: string) {
  const { data } = await api.admin.query('application-admin-api/ApplicationOAuthClient', {
    variables: {
      organizationId: application.organizationId,
      applicationId: application.id,
      clientId,
      first: 1,
    },
  });
  return data.applicationQuery.application?.oauthClient ?? null;
}

type OAuthClientMutationField =
  | 'applicationOAuthClientUpdate'
  | 'applicationOAuthClientEnabledSet'
  | 'applicationOAuthClientArchive'
  | 'applicationOAuthClientSecretRotate'
  | 'applicationOAuthClientSkipConsentSet';

export async function mutateOAuthClient<TField extends OAuthClientMutationField>(
  api: Api,
  operation:
    | 'ApplicationOAuthClientUpdate'
    | 'ApplicationOAuthClientEnabledSet'
    | 'ApplicationOAuthClientArchive'
    | 'ApplicationOAuthClientSecretRotate'
    | 'ApplicationOAuthClientSkipConsentSet',
  field: TField,
  application: ApplicationRef,
  clientId: string,
  
  patch: Record<string, unknown> = {},
): Promise<ApiApplicationMutation[TField]> {
  const { data } = await api.admin.mutation(`application-admin-api/${operation}`, {
    variables: {
      input: {
        organizationId: application.organizationId,
        applicationId: application.id,
        clientId,
        
        ...patch,
      },
    },
  });
  return data.applicationMutation[field];
}

export async function readAdminAudits(sql: Sql, application: ApplicationRef, action?: string) {
  return sql<
    {
      action: string;
      outcome: string;
      reasonCategory: string;
      actorType: string;
      actorId: string | null;
      organizationId: string | null;
      applicationId: string | null;
      targetType: string;
      targetId: string | null;
      requestId: string;
      safeDiff: Record<string, unknown>;
    }[]
  >`
    SELECT
      action,
      outcome,
      reason_category AS "reasonCategory",
      actor_type AS "actorType",
      actor_id AS "actorId",
      organization_id::text AS "organizationId",
      application_id::text AS "applicationId",
      target_type AS "targetType",
      target_id AS "targetId",
      request_id AS "requestId",
      safe_diff_json AS "safeDiff"
    FROM iam.application_auth_admin_audit
    WHERE application_id = ${application.rawId}::uuid
      ${action ? sql`AND action = ${action}` : sql``}
    ORDER BY occurred_at DESC
  `;
}

export async function readProviderRow(
  sql: Sql,
  application: ApplicationRef,
  provider: 'google' | 'facebook',
) {
  const [row] = await sql<
    {
      enabled: boolean;
      encryptedClientId: string;
      encryptedClientSecret: string;
      scopes: string[];
      updatedBy: string;
    }[]
  >`
    SELECT
      enabled,
      encrypted_client_id AS "encryptedClientId",
      encrypted_client_secret AS "encryptedClientSecret",
      scopes_json AS scopes,
      updated_by AS "updatedBy"
    FROM iam.application_auth_provider
    WHERE application_id = ${application.rawId}::uuid
      AND provider = ${provider}
  `;
  return row ?? null;
}

export async function readOAuthClientRow(sql: Sql, clientId: string) {
  const [row] = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM iam.application_oauth_client
    WHERE client_id = ${clientId}
  `;
  return row ?? null;
}

export function required<T>(value: T | null | undefined, label: string): T {
  if (value == null) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

export function serializedWithoutSecrets(value: unknown, secrets: readonly string[]): string {
  const serialized = JSON.stringify(value);
  for (const secret of secrets) {
    expect(serialized).not.toContain(secret);
  }
  expect(serialized).not.toMatch(/(?:stack|node_modules|postgres|select\s.+from)/iu);
  return serialized;
}
