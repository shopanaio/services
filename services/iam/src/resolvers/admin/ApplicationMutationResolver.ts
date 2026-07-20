import { ZodResolver } from "@shopana/type-resolver";
import { ServiceLinkedResourceAuthorizationError } from "@shopana/rbac";
import { ProtectedResource } from "@shopana/shared-kernel";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApplicationAuthAdminManagementError } from "../../services/ApplicationAuthAdminManagementService.js";
import type { ApplicationAuthAdminAuditAction } from "../../services/ApplicationAuthAdminAuditPort.js";
import type { ApplicationAuthAdminAuditTargetType } from "../../services/ApplicationAuthAdminManagementService.js";
import { ApplicationOAuthClientManagementError } from "../../services/ApplicationOAuthClientManagementService.js";
import type {
  ApplicationArchiveInput,
  ApplicationAuthMethodUpdateInput,
  ApplicationAuthProviderConfigureInput,
  ApplicationAuthProviderCredentialsDeleteInput,
  ApplicationAuthProviderCredentialsRotateInput,
  ApplicationAuthProviderUpdateInput,
  ApplicationAuthProviderValidateInput,
  ApplicationAuthRealmEnabledSetInput,
  ApplicationAuthUpdateInput,
  ApplicationCreateInput,
  ApplicationOAuthClientArchiveInput,
  ApplicationOAuthClientCreateInput,
  ApplicationOAuthClientEnabledSetInput,
  ApplicationOAuthClientSecretRotateInput,
  ApplicationOAuthClientSkipConsentSetInput,
  ApplicationOAuthClientUpdateInput,
  ApplicationUpdateInput,
  ApplicationUserAccountUnlinkInput,
  ApplicationUserSessionsRevokeAllInput,
  ApplicationUserStatusSetInput,
} from "./generated/types.js";
import {
  ApplicationArchiveInputSchema,
  ApplicationAuthMethodUpdateInputSchema,
  ApplicationAuthProviderConfigureInputSchema,
  ApplicationAuthProviderCredentialsDeleteInputSchema,
  ApplicationAuthProviderCredentialsRotateInputSchema,
  ApplicationAuthProviderUpdateInputSchema,
  ApplicationAuthProviderValidateInputSchema,
  ApplicationAuthRealmEnabledSetInputSchema,
  ApplicationAuthUpdateInputSchema,
  ApplicationCreateInputSchema,
  ApplicationOAuthClientArchiveInputSchema,
  ApplicationOAuthClientCreateInputSchema,
  ApplicationOAuthClientEnabledSetInputSchema,
  ApplicationOAuthClientSecretRotateInputSchema,
  ApplicationOAuthClientSkipConsentSetInputSchema,
  ApplicationOAuthClientUpdateInputSchema,
  ApplicationUpdateInputSchema,
  ApplicationUserAccountUnlinkInputSchema,
  ApplicationUserSessionsRevokeAllInputSchema,
  ApplicationUserStatusSetInputSchema,
} from "./generated/schemas.js";
import { IAMType } from "./IAMType.js";
import { ApplicationResolver } from "./ApplicationResolver.js";
import { ApplicationAuthConfigurationResolver } from "./ApplicationAuthResolver.js";
import { ApplicationAuthProviderValidationResolver } from "./ApplicationProviderResolver.js";
import { ApplicationOAuthClientResolver } from "./ApplicationOAuthClientResolver.js";
import { ApplicationUserResolver } from "./ApplicationUserResolver.js";
import { IAM_SERVICE_LINKED_RESOURCE_KIND } from "../../service-linked/resources.js";

type UserError = {
  code: string;
  message: string;
  field: string[] | null;
};

const APPLICATIONS_RESOURCE = "org.applications";
const AUTH_RESOURCE = "org.application-auth";
const PROVIDERS_RESOURCE = "org.application-auth-providers";
const OAUTH_CLIENT_RESOURCE = "org.application-oauth-clients";
const USERS_RESOURCE = "org.application-users";

type ApplicationProtectedAction = "write" | "admin";
type ApplicationProtectedResource =
  | typeof APPLICATIONS_RESOURCE
  | typeof AUTH_RESOURCE
  | typeof PROVIDERS_RESOURCE
  | typeof OAUTH_CLIENT_RESOURCE
  | typeof USERS_RESOURCE;

interface GraphqlRejectionAudit {
  action: ApplicationAuthAdminAuditAction;
  targetType: ApplicationAuthAdminAuditTargetType | "oauth_client";
  input: Record<string, unknown>;
}

class ApplicationMutationGraphqlInputError extends Error {
  constructor() {
    super("Application realm global ID is invalid");
    this.name = "ApplicationMutationGraphqlInputError";
  }
}

class ApplicationMutationBoundaryAuthorizationError extends ApplicationAuthAdminManagementError {
  constructor() {
    super("Application realm operation is not permitted", "FORBIDDEN");
    this.name = "ApplicationMutationBoundaryAuthorizationError";
  }
}

/** Application realm management mutation namespace. */
export class ApplicationMutationResolver extends IAMType<
  Record<string, never>
> {
  @ZodResolver(ApplicationCreateInputSchema())
  async applicationCreate(args: { input: ApplicationCreateInput }) {
    try {
      const result = await this.$ctx.kernel.applicationAuthAdminManagement.createApplication(
        {
          organizationId: decodeOrganizationId(args.input.organizationId),
          name: args.input.name,
          displayName: args.input.displayName,
          description: args.input.description ?? undefined,
        },
        this.adminActor()
      );
      this.clearApplication(result.organizationId, result.applicationId);
      return {
        application: this.applicationResolver(result),
        userErrors: [],
      };
    } catch (error) {
      return this.failure("application", error, rejection(
        "application_create",
        "application",
        args.input
      ));
    }
  }

  @ZodResolver(ApplicationUpdateInputSchema())
  async applicationUpdate(args: { input: ApplicationUpdateInput }) {
    try {
      await this.assertApplicationAdminMutable(
        args.input,
        APPLICATIONS_RESOURCE
      );
      const result = await this.$ctx.kernel.applicationAuthAdminManagement.updateApplication(
        {
          organizationId: decodeOrganizationId(args.input.organizationId),
          applicationId: decodeApplicationId(args.input.applicationId),
          name: args.input.name ?? undefined,
          displayName: args.input.displayName ?? undefined,
          description:
            args.input.description === undefined
              ? undefined
              : args.input.description,
          expectedRevision: args.input.expectedRevision,
        },
        this.adminActor()
      );
      this.clearApplication(result.organizationId, result.applicationId);
      return {
        application: this.applicationResolver(result),
        userErrors: [],
      };
    } catch (error) {
      return this.failure("application", error, rejection(
        "application_update",
        "application",
        args.input
      ));
    }
  }

  @ZodResolver(ApplicationArchiveInputSchema())
  async applicationArchive(args: { input: ApplicationArchiveInput }) {
    try {
      await this.assertApplicationAdminMutable(
        args.input,
        APPLICATIONS_RESOURCE,
        "admin"
      );
      const result = await this.$ctx.kernel.applicationAuthAdminManagement.archiveApplication(
        {
          organizationId: decodeOrganizationId(args.input.organizationId),
          applicationId: decodeApplicationId(args.input.applicationId),
          expectedRevision: args.input.expectedRevision,
        },
        this.adminActor()
      );
      this.clearApplication(result.organizationId, result.applicationId);
      return {
        application: this.applicationResolver(result),
        userErrors: [],
      };
    } catch (error) {
      return this.failure("application", error, rejection(
        "application_archive",
        "application",
        args.input
      ));
    }
  }

  @ZodResolver(ApplicationAuthUpdateInputSchema())
  async applicationAuthUpdate(args: { input: ApplicationAuthUpdateInput }) {
    try {
      await this.assertApplicationAdminMutable(args.input, AUTH_RESOURCE);
      const input = args.input;
      const result = await this.$ctx.kernel.applicationAuthAdminManagement.updateAuth(
        {
          organizationId: decodeOrganizationId(input.organizationId),
          applicationId: decodeApplicationId(input.applicationId),
          registrationMode: enumLower(input.registrationMode),
          emailVerificationRequired:
            input.emailVerificationRequired ?? undefined,
          accessTokenTtlSeconds: input.accessTokenTtlSeconds ?? undefined,
          idTokenTtlSeconds: input.idTokenTtlSeconds ?? undefined,
          refreshTokenTtlSeconds: input.refreshTokenTtlSeconds ?? undefined,
          sessionTtlSeconds: input.sessionTtlSeconds ?? undefined,
          branding: input.branding
            ? {
                displayName:
                  input.branding.displayName === undefined
                    ? undefined
                    : input.branding.displayName,
                headline:
                  input.branding.headline === undefined
                    ? undefined
                    : input.branding.headline,
                logoUrl:
                  input.branding.logoUrl === undefined
                    ? undefined
                    : input.branding.logoUrl,
                primaryColor:
                  input.branding.primaryColor === null
                    ? null
                    : enumLower(input.branding.primaryColor),
                backgroundColor:
                  input.branding.backgroundColor === null
                    ? null
                    : enumLower(input.branding.backgroundColor),
              }
            : undefined,
          defaultLocale:
            input.defaultLocale == null
              ? undefined
              : (input.defaultLocale as "en" | "uk" | "ru"),
          trustedOrigins: input.trustedOrigins ?? undefined,
          emailDelivery: input.emailDelivery ?? undefined,
          expectedRevision: input.expectedRevision,
        },
        this.adminActor()
      );
      this.clearApplication(result.organizationId, result.applicationId);
      return {
        configuration: this.authResolver(result),
        userErrors: [],
      };
    } catch (error) {
      return this.failure("configuration", error, rejection(
        "auth_configuration_update",
        "auth_configuration",
        args.input
      ));
    }
  }

  @ZodResolver(ApplicationAuthRealmEnabledSetInputSchema())
  async applicationAuthRealmEnabledSet(args: {
    input: ApplicationAuthRealmEnabledSetInput;
  }) {
    try {
      await this.assertApplicationAdminMutable(
        args.input,
        AUTH_RESOURCE,
        "admin"
      );
      const result = await this.$ctx.kernel.applicationAuthAdminManagement.setRealmEnabled(
        {
          organizationId: decodeOrganizationId(args.input.organizationId),
          applicationId: decodeApplicationId(args.input.applicationId),
          enabled: args.input.enabled,
          expectedRevision: args.input.expectedRevision,
        },
        this.adminActor()
      );
      this.clearApplication(result.organizationId, result.applicationId);
      return {
        configuration: this.authResolver(result),
        userErrors: [],
      };
    } catch (error) {
      return this.failure("configuration", error, rejection(
        "auth_realm_enabled_set",
        "auth_configuration",
        args.input
      ));
    }
  }

  @ZodResolver(ApplicationAuthMethodUpdateInputSchema())
  async applicationAuthMethodUpdate(args: {
    input: ApplicationAuthMethodUpdateInput;
  }) {
    try {
      await this.assertApplicationAdminMutable(args.input, AUTH_RESOURCE);
      const input = args.input;
      const result = await this.$ctx.kernel.applicationAuthAdminManagement.updateAuthMethod(
        {
          organizationId: decodeOrganizationId(input.organizationId),
          applicationId: decodeApplicationId(input.applicationId),
          methodId: enumLower(String(input.methodId)) as
            | "password"
            | "email_otp",
          enabledCapabilities: input.enabledCapabilities.map((capability) =>
            enumLower(capability)
          ) as ("sign_in" | "sign_up" | "password_reset")[],
          expectedRevision: input.expectedRevision,
        },
        this.adminActor()
      );
      this.clearApplication(result.organizationId, result.applicationId);
      const configuration = this.authResolver(result);
      return {
        authMethod: await configuration.authMethod({ id: result.methodId }),
        userErrors: [],
      };
    } catch (error) {
      return this.failure("authMethod", error, rejection(
        "auth_method_update",
        "auth_method",
        args.input
      ));
    }
  }

  @ZodResolver(ApplicationAuthProviderConfigureInputSchema())
  async applicationAuthProviderConfigure(args: {
    input: ApplicationAuthProviderConfigureInput;
  }) {
    return this.providerMutation(args.input, "configure");
  }

  @ZodResolver(ApplicationAuthProviderUpdateInputSchema())
  async applicationAuthProviderUpdate(args: {
    input: ApplicationAuthProviderUpdateInput;
  }) {
    return this.providerMutation(args.input, "update");
  }

  @ZodResolver(ApplicationAuthProviderCredentialsRotateInputSchema())
  async applicationAuthProviderCredentialsRotate(args: {
    input: ApplicationAuthProviderCredentialsRotateInput;
  }) {
    return this.providerMutation(args.input, "rotate");
  }

  @ZodResolver(ApplicationAuthProviderCredentialsDeleteInputSchema())
  async applicationAuthProviderCredentialsDelete(args: {
    input: ApplicationAuthProviderCredentialsDeleteInput;
  }) {
    return this.providerMutation(args.input, "delete");
  }

  @ZodResolver(ApplicationAuthProviderValidateInputSchema())
  async applicationAuthProviderValidate(args: {
    input: ApplicationAuthProviderValidateInput;
  }) {
    try {
      await this.assertApplicationAdminMutable(
        args.input,
        PROVIDERS_RESOURCE,
        "admin"
      );
      const result = await this.$ctx.kernel.applicationAuthAdminManagement.validateProvider(
        {
          organizationId: decodeOrganizationId(args.input.organizationId),
          applicationId: decodeApplicationId(args.input.applicationId),
          provider: enumLower(args.input.provider),
          expectedRevision: args.input.expectedRevision,
        },
        this.adminActor()
      );
      return {
        validation: new ApplicationAuthProviderValidationResolver(
          result,
          this.$ctx
        ),
        userErrors: [],
      };
    } catch (error) {
      return this.failure("validation", error, rejection(
        "provider_validate",
        "provider",
        args.input
      ));
    }
  }

  @ZodResolver(ApplicationOAuthClientCreateInputSchema())
  async applicationOAuthClientCreate(args: {
    input: ApplicationOAuthClientCreateInput;
  }) {
    try {
      await this.assertApplicationAdminMutable(
        args.input,
        OAUTH_CLIENT_RESOURCE
      );
      const input = args.input;
      const result = await this.$ctx.kernel.applicationOAuthClientManagement.create(
        {
          organizationId: decodeOrganizationId(input.organizationId),
          applicationId: decodeApplicationId(input.applicationId),
          name: input.name,
          clientType: enumLower(input.clientType),
          environment: enumLower(input.environment),
          redirectUris: input.redirectUris,
          postLogoutRedirectUris: input.postLogoutRedirectUris ?? undefined,
          skipConsent: input.skipConsent ?? undefined,
          enableEndSession: input.enableEndSession ?? undefined,
        },
        this.adminActor()
      );
      return {
        client: new ApplicationOAuthClientResolver(result.client, this.$ctx),
        clientSecret: result.clientSecret,
        userErrors: [],
      };
    } catch (error) {
      return {
        ...(await this.failure("client", error, rejection(
          "oauth_client_create",
          "oauth_client",
          args.input
        ))),
        clientSecret: null,
      };
    }
  }

  @ZodResolver(ApplicationOAuthClientUpdateInputSchema())
  async applicationOAuthClientUpdate(args: {
    input: ApplicationOAuthClientUpdateInput;
  }) {
    try {
      await this.assertApplicationAdminMutable(
        args.input,
        OAUTH_CLIENT_RESOURCE
      );
      const input = args.input;
      const client = await this.$ctx.kernel.applicationOAuthClientManagement.update(
        {
          organizationId: decodeOrganizationId(input.organizationId),
          applicationId: decodeApplicationId(input.applicationId),
          clientId: input.clientId,
          name: input.name ?? undefined,
          environment: enumLower(input.environment),
          redirectUris: input.redirectUris ?? undefined,
          postLogoutRedirectUris: input.postLogoutRedirectUris ?? undefined,
          enableEndSession: input.enableEndSession ?? undefined,
          expectedRevision: input.expectedRevision,
        },
        this.adminActor()
      );
      return {
        client: new ApplicationOAuthClientResolver(client, this.$ctx),
        userErrors: [],
      };
    } catch (error) {
      return this.failure("client", error, rejection(
        "oauth_client_update",
        "oauth_client",
        args.input
      ));
    }
  }

  @ZodResolver(ApplicationOAuthClientEnabledSetInputSchema())
  async applicationOAuthClientEnabledSet(args: {
    input: ApplicationOAuthClientEnabledSetInput;
  }) {
    return this.oauthClientStateMutation(args.input, "enabled");
  }

  @ZodResolver(ApplicationOAuthClientSkipConsentSetInputSchema())
  async applicationOAuthClientSkipConsentSet(args: {
    input: ApplicationOAuthClientSkipConsentSetInput;
  }) {
    return this.oauthClientStateMutation(args.input, "skipConsent");
  }

  @ZodResolver(ApplicationOAuthClientSecretRotateInputSchema())
  async applicationOAuthClientSecretRotate(args: {
    input: ApplicationOAuthClientSecretRotateInput;
  }) {
    try {
      await this.assertApplicationAdminMutable(
        args.input,
        OAUTH_CLIENT_RESOURCE,
        "admin"
      );
      const input = decodeOAuthClientRevisionInput(args.input);
      const result = await this.$ctx.kernel.applicationOAuthClientManagement.rotateSecret(
        input,
        this.adminActor()
      );
      return {
        client: new ApplicationOAuthClientResolver(result.client, this.$ctx),
        clientSecret: result.clientSecret,
        userErrors: [],
      };
    } catch (error) {
      return {
        ...(await this.failure("client", error, rejection(
          "oauth_client_secret_rotate",
          "oauth_client",
          args.input
        ))),
        clientSecret: null,
      };
    }
  }

  @ZodResolver(ApplicationOAuthClientArchiveInputSchema())
  async applicationOAuthClientArchive(args: {
    input: ApplicationOAuthClientArchiveInput;
  }) {
    try {
      await this.assertApplicationAdminMutable(
        args.input,
        OAUTH_CLIENT_RESOURCE,
        "admin"
      );
      const client = await this.$ctx.kernel.applicationOAuthClientManagement.archive(
        decodeOAuthClientRevisionInput(args.input),
        this.adminActor()
      );
      return {
        client: new ApplicationOAuthClientResolver(client, this.$ctx),
        userErrors: [],
      };
    } catch (error) {
      return this.failure("client", error, rejection(
        "oauth_client_archive",
        "oauth_client",
        args.input
      ));
    }
  }

  @ZodResolver(ApplicationUserStatusSetInputSchema())
  async applicationUserBlock(args: { input: ApplicationUserStatusSetInput }) {
    return this.userStatusMutation(args.input, "blocked");
  }

  @ZodResolver(ApplicationUserStatusSetInputSchema())
  async applicationUserUnblock(args: { input: ApplicationUserStatusSetInput }) {
    return this.userStatusMutation(args.input, "active");
  }

  @ZodResolver(ApplicationUserSessionsRevokeAllInputSchema())
  async applicationUserSessionsRevokeAll(args: {
    input: ApplicationUserSessionsRevokeAllInput;
  }) {
    try {
      await this.assertApplicationAdminMutable(
        args.input,
        USERS_RESOURCE,
        "admin"
      );
      const ids = decodeUserInput(args.input);
      const result = await this.$ctx.kernel.applicationAuthAdminManagement.revokeAllUserSessions(
        ids,
        this.adminActor()
      );
      this.clearApplicationUser(ids);
      return {
        user: this.userResolver(ids),
        revokedCount: result.revokedCount,
        userErrors: [],
      };
    } catch (error) {
      return {
        ...(await this.failure("user", error, rejection(
          "application_user_sessions_revoke_all",
          "application_user",
          args.input
        ))),
        revokedCount: 0,
      };
    }
  }

  @ZodResolver(ApplicationUserAccountUnlinkInputSchema())
  async applicationUserAccountUnlink(args: {
    input: ApplicationUserAccountUnlinkInput;
  }) {
    try {
      await this.assertApplicationAdminMutable(
        args.input,
        USERS_RESOURCE,
        "admin"
      );
      const ids = {
        ...decodeUserInput(args.input),
        accountId: decodeLinkedAccountId(args.input.accountId),
      };
      const result = await this.$ctx.kernel.applicationAuthAdminManagement.unlinkUserAccount(
        ids,
        this.adminActor()
      );
      this.clearApplicationUser(ids);
      return {
        user: this.userResolver(ids),
        unlinkedAccountId: encodeGlobalIdByType(
          result.unlinkedAccountId,
          GlobalIdEntity.ApplicationUserLinkedAccount
        ),
        userErrors: [],
      };
    } catch (error) {
      return {
        ...(await this.failure("user", error, rejection(
          "application_user_account_unlink",
          "linked_account",
          args.input
        ))),
        unlinkedAccountId: null,
      };
    }
  }

  private async providerMutation(
    input:
      | ApplicationAuthProviderConfigureInput
      | ApplicationAuthProviderUpdateInput
      | ApplicationAuthProviderCredentialsRotateInput
      | ApplicationAuthProviderCredentialsDeleteInput,
    operation: "configure" | "update" | "rotate" | "delete"
  ) {
    try {
      await this.assertApplicationAdminMutable(
        input,
        PROVIDERS_RESOURCE,
        operation === "update" ? "write" : "admin"
      );
      const base = {
        organizationId: decodeOrganizationId(input.organizationId),
        applicationId: decodeApplicationId(input.applicationId),
        provider: enumLower(input.provider),
        expectedRevision: input.expectedRevision,
      };
      const management = this.$ctx.kernel.applicationAuthAdminManagement;
      const result =
        operation === "configure"
          ? await management.configureProvider(
              {
                ...base,
                clientId: (input as ApplicationAuthProviderConfigureInput)
                  .clientId,
                clientSecret: (input as ApplicationAuthProviderConfigureInput)
                  .clientSecret,
                scopes: (input as ApplicationAuthProviderConfigureInput).scopes,
              },
              this.adminActor()
            )
          : operation === "update"
            ? await management.updateProvider(
                {
                  ...base,
                  enabled:
                    (input as ApplicationAuthProviderUpdateInput).enabled ??
                    undefined,
                  scopes:
                    (input as ApplicationAuthProviderUpdateInput).scopes ??
                    undefined,
                },
                this.adminActor()
              )
            : operation === "rotate"
              ? await management.rotateProviderCredentials(
                  {
                    ...base,
                    clientId: (
                      input as ApplicationAuthProviderCredentialsRotateInput
                    ).clientId,
                    clientSecret: (
                      input as ApplicationAuthProviderCredentialsRotateInput
                    ).clientSecret,
                  },
                  this.adminActor()
                )
              : await management.deleteProviderCredentials(
                  base,
                  this.adminActor()
                );
      this.clearApplication(result.organizationId, result.applicationId);
      const configuration = this.authResolver(result);
      return {
        provider: await configuration.provider({ name: result.provider }),
        userErrors: [],
      };
    } catch (error) {
      const action =
        operation === "configure"
          ? "provider_configure"
          : operation === "update"
            ? "provider_update"
            : operation === "rotate"
              ? "provider_credentials_rotate"
              : "provider_credentials_delete";
      return this.failure(
        "provider",
        error,
        rejection(action, "provider", input)
      );
    }
  }

  private async oauthClientStateMutation(
    input:
      | ApplicationOAuthClientEnabledSetInput
      | ApplicationOAuthClientSkipConsentSetInput,
    operation: "enabled" | "skipConsent"
  ) {
    try {
      await this.assertApplicationAdminMutable(
        input,
        OAUTH_CLIENT_RESOURCE,
        operation === "enabled" ? "write" : "admin"
      );
      const base = decodeOAuthClientRevisionInput(input);
      const management = this.$ctx.kernel.applicationOAuthClientManagement;
      const client =
        operation === "enabled"
          ? await management.setEnabled(
              {
                ...base,
                enabled: (input as ApplicationOAuthClientEnabledSetInput)
                  .enabled,
              },
              this.adminActor()
            )
          : await management.setSkipConsent(
              {
                ...base,
                skipConsent: (
                  input as ApplicationOAuthClientSkipConsentSetInput
                ).skipConsent,
              },
              this.adminActor()
            );
      return {
        client: new ApplicationOAuthClientResolver(client, this.$ctx),
        userErrors: [],
      };
    } catch (error) {
      return this.failure(
        "client",
        error,
        rejection(
          operation === "enabled"
            ? "oauth_client_enabled_set"
            : "oauth_client_skip_consent_set",
          "oauth_client",
          input
        )
      );
    }
  }

  private async userStatusMutation(
    input: ApplicationUserStatusSetInput,
    status: "active" | "blocked"
  ) {
    try {
      await this.assertApplicationAdminMutable(input, USERS_RESOURCE);
      const ids = decodeUserInput(input);
      await this.$ctx.kernel.applicationAuthAdminManagement.setUserStatus(
        ids,
        status,
        this.adminActor()
      );
      this.clearApplicationUser(ids);
      return {
        user: this.userResolver(ids),
        userErrors: [],
      };
    } catch (error) {
      return this.failure(
        "user",
        error,
        rejection(
          status === "blocked"
            ? "application_user_block"
            : "application_user_unblock",
          "application_user",
          input
        )
      );
    }
  }

  private applicationResolver(input: {
    organizationId: string;
    applicationId: string;
  }) {
    return new ApplicationResolver(
      {
        id: input.applicationId,
        organizationId: input.organizationId,
        applicationsReadAuthorized: true,
      },
      this.$ctx
    );
  }

  private authResolver(input: {
    organizationId: string;
    applicationId: string;
  }) {
    return new ApplicationAuthConfigurationResolver(input, this.$ctx);
  }

  private userResolver(input: {
    organizationId: string;
    applicationId: string;
    userId: string;
  }) {
    return new ApplicationUserResolver(
      { ...input, applicationUsersReadAuthorized: true },
      this.$ctx
    );
  }

  private clearApplication(organizationId: string, applicationId: string) {
    this.$ctx.loaders.application.clear({ id: applicationId, organizationId });
    this.$ctx.loaders.applicationAuthAdmin.clear({
      id: applicationId,
      organizationId,
    });
  }

  private clearApplicationUser(input: {
    organizationId: string;
    applicationId: string;
    userId: string;
  }) {
    this.$ctx.loaders.applicationUser.clear(input);
    this.$ctx.loaders.applicationUserSecurity.clear(input);
  }

  private adminActor() {
    return {
      id: this.$ctx.currentUser?.id ?? "",
      requestId: this.$ctx.requestId,
    };
  }

  private async assertApplicationAdminMutable(
    input: {
      organizationId: string;
      applicationId: string;
    },
    resource: ApplicationProtectedResource,
    action: ApplicationProtectedAction = "write"
  ): Promise<void> {
    const organizationId = decodeOrganizationId(input.organizationId);
    const applicationId = decodeApplicationId(input.applicationId);
    const allowed = await this.authProvider.authorize({
      subject: this.adminActor().id,
      organizationId,
      domain: "org",
      resource,
      action,
    });
    if (!allowed) {
      throw new ApplicationMutationBoundaryAuthorizationError();
    }
    await this.assertApplicationProtectedResource(input);
  }

  @ProtectedResource<
    [input: { organizationId: string; applicationId: string }],
    ApplicationMutationResolver
  >((input) => ({
    organizationId: decodeOrganizationId(input.organizationId),
    resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
    resourceId: decodeApplicationId(input.applicationId),
  }))
  private async assertApplicationProtectedResource(
    _input: { organizationId: string; applicationId: string }
  ): Promise<void> {
    // Enforcement is provided by @ProtectedResource.
  }

  private async failure<TField extends string>(
    field: TField,
    error: unknown,
    audit?: GraphqlRejectionAudit
  ): Promise<Record<TField, null> & { userErrors: UserError[] }> {
    let effectiveError = error;
    if (
      (error instanceof ApplicationMutationGraphqlInputError ||
        error instanceof ServiceLinkedResourceAuthorizationError ||
        error instanceof ApplicationMutationBoundaryAuthorizationError) &&
      audit
    ) {
      try {
        await this.$ctx.kernel.applicationAuthAdminManagement.recordRejectedGraphqlMutation(
          rejectionAuditRecord(audit, error),
          this.adminActor()
        );
      } catch (auditError) {
        effectiveError = auditError;
      }
    }
    const userError = mapManagementUserError(effectiveError);
    const internal =
      !(effectiveError instanceof ApplicationAuthAdminManagementError) &&
      !(effectiveError instanceof ApplicationOAuthClientManagementError) &&
      !(effectiveError instanceof ServiceLinkedResourceAuthorizationError)
        ? true
        : effectiveError.code === "INTERNAL_ERROR" ||
          effectiveError.code === "OAUTH_CLIENT_INTERNAL_ERROR";
    if (internal) {
      this.$ctx.kernel.getServices().logger.error(
        { requestId: this.$ctx.requestId },
        "Application Admin GraphQL mutation failed"
      );
    }
    return {
      [field]: null,
      userErrors: [userError],
    } as Record<TField, null> & { userErrors: UserError[] };
  }
}

function decodeOrganizationId(value: string): string {
  return decodeMutationGlobalId(value, GlobalIdEntity.Organization);
}

function decodeApplicationId(value: string): string {
  return decodeMutationGlobalId(value, GlobalIdEntity.Application);
}

function decodeUserInput(input: {
  organizationId: string;
  applicationId: string;
  userId: string;
}) {
  return {
    organizationId: decodeOrganizationId(input.organizationId),
    applicationId: decodeApplicationId(input.applicationId),
    userId: decodeMutationGlobalId(
      input.userId,
      GlobalIdEntity.ApplicationUser
    ),
  };
}

function decodeLinkedAccountId(value: string): string {
  return decodeMutationGlobalId(
    value,
    GlobalIdEntity.ApplicationUserLinkedAccount
  );
}

function decodeMutationGlobalId(value: string, type: GlobalIdEntity): string {
  try {
    return decodeGlobalIdByType(value, type);
  } catch {
    throw new ApplicationMutationGraphqlInputError();
  }
}

function decodeOAuthClientRevisionInput(input: {
  organizationId: string;
  applicationId: string;
  clientId: string;
  expectedRevision: number;
}) {
  return {
    organizationId: decodeOrganizationId(input.organizationId),
    applicationId: decodeApplicationId(input.applicationId),
    clientId: input.clientId,
    expectedRevision: input.expectedRevision,
  };
}

function rejection(
  action: ApplicationAuthAdminAuditAction,
  targetType: GraphqlRejectionAudit["targetType"],
  input: object
): GraphqlRejectionAudit {
  return {
    action,
    targetType,
    input: input as Record<string, unknown>,
  };
}

function rejectionAuditRecord(
  audit: GraphqlRejectionAudit,
  error:
    | ApplicationMutationGraphqlInputError
    | ServiceLinkedResourceAuthorizationError
    | ApplicationMutationBoundaryAuthorizationError
) {
  const organizationId = tryDecodeAuditGlobalId(
    audit.input.organizationId,
    GlobalIdEntity.Organization
  );
  const applicationId = tryDecodeAuditGlobalId(
    audit.input.applicationId,
    GlobalIdEntity.Application
  );
  const authorizationFailure =
    error instanceof ServiceLinkedResourceAuthorizationError ||
    error instanceof ApplicationMutationBoundaryAuthorizationError;
  return {
    action: audit.action,
    targetType: audit.targetType,
    organizationId,
    applicationId,
    targetId: auditTargetId(audit),
    ...(authorizationFailure
      ? { reasonCategory: "authorization" as const }
      : {}),
    ...(error instanceof ServiceLinkedResourceAuthorizationError
      ? {
          safeDiff: {
            blockedByServiceLinkedBinding: true,
            resourceKind: error.details.resourceKind,
            linkedService: error.details.linkedService,
            linkedOwnerType: error.details.linkedOwnerType,
          },
        }
      : {}),
  };
}

function tryDecodeAuditGlobalId(
  value: unknown,
  type: GlobalIdEntity
): string | null {
  if (typeof value !== "string") return null;
  try {
    return decodeGlobalIdByType(value, type);
  } catch {
    return null;
  }
}

function auditTargetId(audit: GraphqlRejectionAudit): string | undefined {
  if (audit.targetType === "application") {
    return (
      tryDecodeAuditGlobalId(
        audit.input.applicationId,
        GlobalIdEntity.Application
      ) ?? undefined
    );
  }
  if (audit.targetType === "application_user") {
    return (
      tryDecodeAuditGlobalId(
        audit.input.userId,
        GlobalIdEntity.ApplicationUser
      ) ?? undefined
    );
  }
  if (audit.targetType === "linked_account") {
    return (
      tryDecodeAuditGlobalId(
        audit.input.accountId,
        GlobalIdEntity.ApplicationUserLinkedAccount
      ) ?? undefined
    );
  }
  const candidate =
    audit.targetType === "provider"
      ? audit.input.provider
      : audit.targetType === "auth_method"
        ? audit.input.methodId
        : audit.targetType === "oauth_client"
          ? audit.input.clientId
          : undefined;
  if (typeof candidate !== "string" || candidate.length > 512) return undefined;
  return candidate.toLowerCase();
}

function enumLower<T extends string>(value: T): Lowercase<T>;
function enumLower<T extends string>(
  value: T | null | undefined
): Lowercase<T> | undefined;
function enumLower<T extends string>(value: T | null | undefined) {
  return value == null ? undefined : value.toLowerCase();
}

function mapManagementUserError(error: unknown): UserError {
  if (error instanceof ServiceLinkedResourceAuthorizationError) {
    return {
      code: error.code,
      message: error.message,
      field: null,
    };
  }
  if (
    error instanceof ApplicationAuthAdminManagementError ||
    error instanceof ApplicationOAuthClientManagementError
  ) {
    const internal =
      error.code === "INTERNAL_ERROR" ||
      error.code === "OAUTH_CLIENT_INTERNAL_ERROR";
    return {
      code: internal ? "INTERNAL_ERROR" : error.code,
      message: internal ? "Application realm operation failed" : error.message,
      field: errorField(error.code),
    };
  }
  return {
    code: "INVALID_INPUT",
    message: "Application realm input is invalid",
    field: null,
  };
}

function errorField(code: string): string[] | null {
  if (code.includes("REVISION_CONFLICT")) return ["expectedRevision"];
  if (code === "DUPLICATE_VALUE") return ["name"];
  if (code.includes("APPLICATION_USER_ACCOUNT")) return ["accountId"];
  if (code.includes("APPLICATION_USER")) return ["userId"];
  if (code.includes("PROVIDER")) return ["provider"];
  if (code.includes("OAUTH_CLIENT")) return ["clientId"];
  if (code.includes("APPLICATION_NOT_FOUND")) return ["applicationId"];
  return null;
}
