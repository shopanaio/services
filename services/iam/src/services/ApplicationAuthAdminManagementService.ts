import type { AuthProvider } from "@shopana/rbac";
import { KernelError } from "@shopana/shared-kernel";
import { z, ZodError } from "zod";
import { v7 as uuidv7 } from "uuid";
import {
  applicationAuthBrandingSchema,
  normalizeApplicationAuthOrigin,
  type ApplicationAuthMutableConfiguration,
} from "../auth/applicationAuthConfiguration.js";
import {
  parseApplicationAuthProviderName,
  type ApplicationAuthProviderName,
} from "../auth/applicationSocialProviders.js";
import type {
  ApplicationAuthAdminMutationRepository,
  ApplicationAuthAdminMutationScope,
} from "../repositories/ApplicationAuthAdminMutationRepository.js";
import type { ApplicationUserRepositoryFactory } from "../repositories/application-user/ApplicationUserRepository.js";
import type { ApplicationUser } from "../repositories/models/application-auth.js";
import type {
  ApplicationAuthAdminAuditAction,
  ApplicationAuthAdminAuditPort,
  ApplicationAuthAdminAuditReasonCategory,
  ApplicationRealmAdminAuditSafeDiff,
} from "./ApplicationAuthAdminAuditPort.js";
import type { ResourceManagementMode } from "../repositories/models/index.js";
import type { ApplicationAuthProviderValidationPort } from "./ApplicationAuthProviderValidationPort.js";
import { OAuthClientSecretCodec } from "./OAuthClientSecretCodec.js";
import type { ApplicationUserLifecyclePort } from "./ApplicationUserLifecyclePort.js";
import type { ApplicationAuthSmsProviderAvailabilityPort } from "./ApplicationAuthSmsProviderAvailabilityPort.js";

const APPLICATIONS_RESOURCE = "org.applications";
const AUTH_RESOURCE = "org.application-auth";
const PROVIDERS_RESOURCE = "org.application-auth-providers";
const USERS_RESOURCE = "org.application-users";

export interface ApplicationAuthAdminActor {
  id: string;
  requestId: string;
  type?: "platform_admin" | "external_service";
}

export interface ApplicationAuthAdminTransactionRunner {
  run<TResult>(callback: () => Promise<TResult>): Promise<TResult>;
}

export interface ApplicationAuthAdminInvalidator {
  invalidateApplication(applicationId: string): void | Promise<void>;
  invalidateUser(applicationId: string, userId: string): void | Promise<void>;
}

export interface ApplicationMutationResult {
  organizationId: string;
  applicationId: string;
}

type CreateApplicationAuthorizationMode = "admin" | "trusted_boundary";

export interface ApplicationAuthProviderValidationResult {
  provider: ApplicationAuthProviderName;
  status: "valid" | "invalid" | "unavailable";
  reasonCode: string | null;
  revision: number;
  checkedAt: Date;
}

export interface ApplicationUserSessionsRevokeAllResult {
  user: ApplicationUser;
  revokedCount: number;
}

export interface ApplicationUserAccountUnlinkResult {
  user: ApplicationUser;
  unlinkedAccountId: string;
}

type ManagementErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "APPLICATION_NOT_FOUND"
  | "APPLICATION_USER_NOT_FOUND"
  | "APPLICATION_USER_ACCOUNT_NOT_FOUND"
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_ALREADY_CONFIGURED"
  | "PROVIDER_MUST_BE_DISABLED"
  | "LAST_LOGIN_METHOD"
  | "INVALID_INPUT"
  | "INVALID_REALM_STATE"
  | "REVISION_CONFLICT"
  | "DUPLICATE_VALUE"
  | "ADMIN_AUDIT_UNAVAILABLE"
  | "INTERNAL_ERROR";

type ApplicationRealmChangedField = NonNullable<
  ApplicationRealmAdminAuditSafeDiff["changedFields"]
>[number];

export type ApplicationAuthAdminAuditTargetType =
  | "application"
  | "auth_configuration"
  | "auth_method"
  | "provider"
  | "oauth_client"
  | "application_user"
  | "linked_account";

export class ApplicationAuthAdminManagementError extends KernelError {
  declare readonly code: ManagementErrorCode;

  constructor(message: string, code: ManagementErrorCode, details?: unknown) {
    super(message, code, details);
    this.name = "ApplicationAuthAdminManagementError";
  }
}

const actorSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    requestId: z.string().trim().min(1).max(256),
    type: z.enum(["platform_admin", "external_service"]).optional(),
  })
  .strict();
const scopeSchema = z
  .object({
    organizationId: z.string().uuid(),
    applicationId: z.string().uuid(),
  })
  .strict();
const revisionSchema = z.number().int().positive();
const applicationNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const createApplicationSchema = z
  .object({
    organizationId: z.string().uuid(),
    name: applicationNameSchema,
    displayName: z.string().trim().min(1).max(256),
    description: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();
const updateApplicationSchema = scopeSchema
  .extend({
    name: applicationNameSchema.optional(),
    displayName: z.string().trim().min(1).max(256).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    expectedRevision: revisionSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.displayName !== undefined ||
      value.description !== undefined,
    { message: "At least one application field must be changed" },
  );
const revisionedScopeSchema = scopeSchema.extend({ expectedRevision: revisionSchema }).strict();
const authBrandingPatchSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).nullable().optional(),
    headline: z.string().trim().min(1).max(160).nullable().optional(),
    logoUrl: z
      .string()
      .url()
      .max(2048)
      .refine((value) => new URL(value).protocol === "https:")
      .nullable()
      .optional(),
    primaryColor: z.enum(["blue", "indigo", "violet", "emerald"]).nullable().optional(),
    backgroundColor: z.enum(["white", "slate"]).nullable().optional(),
  })
  .strict();
const emailDeliverySchema = z
  .object({
    transportProfile: z.string().trim().min(1).max(128),
    senderIdentity: z.string().trim().min(1).max(320),
    emailVerificationTemplateId: z.string().trim().min(1).max(128),
    passwordResetTemplateId: z.string().trim().min(1).max(128),
    emailOtpSignInTemplateId: z.string().trim().min(1).max(128),
  })
  .strict()
  .superRefine((value, context) => {
    const templates = [
      value.emailVerificationTemplateId,
      value.passwordResetTemplateId,
      value.emailOtpSignInTemplateId,
    ];
    if (new Set(templates).size !== templates.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emailVerificationTemplateId"],
        message: "Every email purpose requires a distinct template",
      });
    }
  });
const authUpdateSchema = scopeSchema
  .extend({
    registrationMode: z.enum(["open", "disabled"]).optional(),
    emailVerificationRequired: z.boolean().optional(),
    accessTokenTtlSeconds: z.number().int().min(300).max(1800).optional(),
    idTokenTtlSeconds: z.number().int().min(300).max(3600).optional(),
    refreshTokenTtlSeconds: z.number().int().min(86400).max(2592000).optional(),
    sessionTtlSeconds: z.number().int().min(86400).max(2592000).optional(),
    branding: authBrandingPatchSchema.optional(),
    defaultLocale: z.literal("en").optional(),
    trustedOrigins: z.array(z.string().min(1).max(2048)).max(100).optional(),
    emailDelivery: emailDeliverySchema.optional(),
    expectedRevision: revisionSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.registrationMode !== undefined ||
      value.emailVerificationRequired !== undefined ||
      value.accessTokenTtlSeconds !== undefined ||
      value.idTokenTtlSeconds !== undefined ||
      value.refreshTokenTtlSeconds !== undefined ||
      value.sessionTtlSeconds !== undefined ||
      value.branding !== undefined ||
      value.defaultLocale !== undefined ||
      value.trustedOrigins !== undefined ||
      value.emailDelivery !== undefined,
    { message: "At least one application auth field must be changed" },
  );
const realmEnabledSchema = revisionedScopeSchema.extend({ enabled: z.boolean() }).strict();
const methodSchema = revisionedScopeSchema
  .extend({
    methodId: z.enum(["password", "email_otp", "phone_otp"]),
    enabledCapabilities: z.array(z.enum(["sign_in", "sign_up", "password_reset"])).max(3),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.enabledCapabilities).size !== value.enabledCapabilities.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["enabledCapabilities"],
        message: "Authentication method capabilities must be unique",
      });
    }
    if (value.methodId !== "password" && value.enabledCapabilities.includes("password_reset")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["enabledCapabilities"],
        message: "OTP methods do not support password reset",
      });
    }
  });
const replaceAuthMethodsSchema = revisionedScopeSchema
  .extend({
    enabledMethods: z.array(z.enum(["password", "email_otp", "phone_otp"])).max(3),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.enabledMethods).size !== value.enabledMethods.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["enabledMethods"],
        message: "Authentication methods must be unique",
      });
    }
  });
const providerSchema = revisionedScopeSchema.extend({
  provider: z.enum(["google", "facebook"]),
});
const providerConfigureSchema = providerSchema
  .extend({
    clientId: z.string().trim().min(1).max(2048),
    clientSecret: z.string().min(1).max(8192),
    scopes: z.array(z.string().trim().min(1).max(256)).max(32),
  })
  .strict();
const providerUpdateSchema = providerSchema
  .extend({
    enabled: z.boolean().optional(),
    scopes: z.array(z.string().trim().min(1).max(256)).max(32).optional(),
  })
  .strict()
  .refine((value) => value.enabled !== undefined || value.scopes !== undefined, {
    message: "At least one provider field must be changed",
  });
const providerRotateSchema = providerSchema
  .extend({
    clientId: z.string().trim().min(1).max(2048),
    clientSecret: z.string().min(1).max(8192),
  })
  .strict();
const userSchema = scopeSchema.extend({ userId: z.string().min(1).max(512) }).strict();
const unlinkSchema = userSchema.extend({ accountId: z.string().min(1).max(512) }).strict();

interface ExistingWriteExecution<TResult> {
  result: TResult;
  targetId?: string;
  safeDiff: ApplicationRealmAdminAuditSafeDiff;
}

interface ExistingWriteInput<TResult> {
  actor: ApplicationAuthAdminActor;
  organizationId: string;
  applicationId: string;
  resource: string;
  permission: "write" | "admin";
  auditAction: ApplicationAuthAdminAuditAction;
  targetType:
    | "application"
    | "auth_configuration"
    | "auth_method"
    | "provider"
    | "application_user"
    | "linked_account";
  targetId?: string;
  failureSafeDiff: ApplicationRealmAdminAuditSafeDiff;
  includeArchived?: boolean;
  skipAuthorization?: boolean;
  execute(
    scope: ApplicationAuthAdminMutationScope,
    actor: ApplicationAuthAdminActor,
  ): Promise<ExistingWriteExecution<TResult>>;
}

/** Trusted domain boundary used by all non-OAuth-client Admin mutations. */
export class ApplicationAuthAdminManagementService {
  private readonly now: () => Date;
  private readonly applicationUserLifecycle?: ApplicationUserLifecyclePort;

  constructor(
    private readonly repository: ApplicationAuthAdminMutationRepository,
    private readonly users: ApplicationUserRepositoryFactory,
    private readonly transactions: ApplicationAuthAdminTransactionRunner,
    private readonly authorizer: AuthProvider,
    private readonly audit: ApplicationAuthAdminAuditPort,
    private readonly providerValidation: ApplicationAuthProviderValidationPort,
    private readonly smsProviderAvailability: ApplicationAuthSmsProviderAvailabilityPort,
    private readonly invalidation: ApplicationAuthAdminInvalidator,
    options: {
      now?: () => Date;
      applicationUserLifecycle?: ApplicationUserLifecyclePort;
    } = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.applicationUserLifecycle = options.applicationUserLifecycle;
  }

  isPhoneOtpConfigured(applicationId: string): Promise<boolean> {
    return this.smsProviderAvailability.isConfiguredForApplication(applicationId);
  }

  /** Audit a GraphQL-boundary rejection that cannot safely enter a domain method. */
  recordRejectedGraphqlMutation(
    input: {
      action: ApplicationAuthAdminAuditAction;
      targetType: ApplicationAuthAdminAuditTargetType;
      organizationId: string | null;
      applicationId: string | null;
      targetId?: string;
      reasonCategory?: ApplicationAuthAdminAuditReasonCategory;
      safeDiff?: ApplicationRealmAdminAuditSafeDiff;
    },
    actor: ApplicationAuthAdminActor,
  ): Promise<void> {
    return this.appendAudit({
      actor,
      organizationId: input.organizationId,
      applicationId: input.applicationId,
      action: input.action,
      outcome: "failure",
      reasonCategory: input.reasonCategory ?? "invalid_input",
      targetType: input.targetType,
      targetId: input.targetId,
      safeDiff: input.safeDiff ?? {},
    });
  }

  async createApplication(
    input: z.input<typeof createApplicationSchema>,
    actor: ApplicationAuthAdminActor,
    options: {
      applicationId?: string;
      authorization?: CreateApplicationAuthorizationMode;
      managementMode?: ResourceManagementMode;
      applicationAuth?: {
        origin: string;
        redirectUri: string;
        postLogoutRedirectUri: string;
        defaultLocale: "en";
        emailVerificationRequired: boolean;
      };
    } = {},
  ): Promise<ApplicationMutationResult> {
    const applicationId = options.applicationId ?? (await this.repository.allocateApplicationId());
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      createApplicationSchema,
      input,
      actor,
      {
        action: "application_create",
        targetType: "application",
        applicationId,
      },
    );
    const safeDiff = freezeDiff({
      changedFields: ["name", "displayName", "description"],
    });
    const adminAuditEnabled = (options.authorization ?? "admin") === "admin";
    try {
      const result = await this.transactions.run(async () => {
        if (adminAuditEnabled) {
          await this.assertAuthorized(
            value.organizationId,
            trustedActor,
            APPLICATIONS_RESOURCE,
            "write",
          );
        }
        const created = await this.repository.createApplication({
          ...value,
          applicationId,
          managementMode: options.managementMode ?? "organization",
          ...(options.applicationAuth
            ? {
                applicationAuth: {
                  ...options.applicationAuth,
                  clientId: new OAuthClientSecretCodec().generateClientId(),
                  actorId: trustedActor.id,
                },
              }
            : {}),
        });
        const mutationResult = {
          organizationId: value.organizationId,
          applicationId: created.application.id,
        };
        if (adminAuditEnabled) {
          await this.appendAudit({
            actor: trustedActor,
            organizationId: value.organizationId,
            applicationId: created.application.id,
            action: "application_create",
            outcome: "success",
            reasonCategory: "success",
            targetType: "application",
            targetId: created.application.id,
            safeDiff,
          });
        }
        return mutationResult;
      });
      return result;
    } catch (error) {
      const normalized = normalizeManagementError(error);
      if (adminAuditEnabled) {
        await this.appendFailureAudit({
          actor: trustedActor,
          organizationId: value.organizationId,
          applicationId,
          action: "application_create",
          targetType: "application",
          reasonCategory: auditReason(normalized),
          safeDiff,
        });
      }
      throw normalized;
    }
  }

  async updateApplication(
    input: z.input<typeof updateApplicationSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationMutationResult> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      updateApplicationSchema,
      input,
      actor,
      {
        action: "application_update",
        targetType: "application",
      },
    );
    const changedFields = [
      ...(value.name !== undefined ? ["name"] : []),
      ...(value.displayName !== undefined ? ["displayName"] : []),
      ...(value.description !== undefined ? ["description"] : []),
    ] as ApplicationRealmChangedField[];
    return this.executeExisting({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: APPLICATIONS_RESOURCE,
      permission: "write",
      auditAction: "application_update",
      targetType: "application",
      targetId: value.applicationId,
      failureSafeDiff: { changedFields },
      execute: async (scope) => {
        this.assertRevision(scope, value.expectedRevision);
        const revision = await this.repository.updateApplication({
          organizationId: scope.organizationId,
          applicationId: scope.applicationId,
          expectedRevision: value.expectedRevision,
          patch: {
            ...(value.name !== undefined ? { name: value.name } : {}),
            ...(value.displayName !== undefined ? { displayName: value.displayName } : {}),
            ...(value.description !== undefined ? { description: value.description } : {}),
          },
        });
        if (revision === null) throw revisionConflict();
        return {
          result: {
            organizationId: scope.organizationId,
            applicationId: scope.applicationId,
          },
          targetId: scope.applicationId,
          safeDiff: { changedFields },
        };
      },
    });
  }

  async archiveApplication(
    input: z.input<typeof revisionedScopeSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationMutationResult> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      revisionedScopeSchema,
      input,
      actor,
      {
        action: "application_archive",
        targetType: "application",
      },
    );
    const result = await this.executeExisting({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: APPLICATIONS_RESOURCE,
      permission: "admin",
      auditAction: "application_archive",
      targetType: "application",
      targetId: value.applicationId,
      failureSafeDiff: { status: "archived", enabled: false },
      execute: async (scope) => {
        this.assertRevision(scope, value.expectedRevision);
        const revision = await this.repository.archiveApplication({
          organizationId: scope.organizationId,
          applicationId: scope.applicationId,
          expectedRevision: value.expectedRevision,
        });
        if (revision === null) throw revisionConflict();
        return {
          result: {
            organizationId: scope.organizationId,
            applicationId: scope.applicationId,
          },
          targetId: scope.applicationId,
          safeDiff: { status: "archived", enabled: false },
        };
      },
    });
    await this.invalidation.invalidateApplication(result.applicationId);
    return result;
  }

  async updateAuth(
    input: z.input<typeof authUpdateSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationMutationResult> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      authUpdateSchema,
      input,
      actor,
      {
        action: "auth_configuration_update",
        targetType: "auth_configuration",
      },
    );
    const changedFields = authChangedFields(value);
    const result = await this.executeExisting({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: AUTH_RESOURCE,
      permission: "write",
      auditAction: "auth_configuration_update",
      targetType: "auth_configuration",
      targetId: value.applicationId,
      failureSafeDiff: {
        changedFields,
        ...(value.trustedOrigins ? { trustedOriginCount: value.trustedOrigins.length } : {}),
      },
      execute: async (scope, currentActor) => {
        this.assertRevision(scope, value.expectedRevision);
        const branding = value.branding
          ? mergeBranding(scope.configuration.brandingJson, value.branding)
          : undefined;
        const trustedOrigins = value.trustedOrigins
          ? normalizeOrigins(value.trustedOrigins)
          : undefined;
        const deliveryConfigured = scope.deliveryConfigured || value.emailDelivery !== undefined;
        const emailVerificationRequired =
          value.emailVerificationRequired ?? scope.configuration.emailVerificationRequired;
        if (
          !deliveryConfigured &&
          emailVerificationRequired &&
          scope.configuration.passwordSignUpEnabled
        ) {
          throw invalidRealmState(
            "Verified password sign-up requires email delivery configuration",
          );
        }
        const patch: Partial<ApplicationAuthMutableConfiguration> = {
          ...(value.registrationMode !== undefined
            ? { registrationMode: value.registrationMode }
            : {}),
          ...(value.emailVerificationRequired !== undefined
            ? { emailVerificationRequired: value.emailVerificationRequired }
            : {}),
          ...(value.accessTokenTtlSeconds !== undefined
            ? { accessTokenTtlSeconds: value.accessTokenTtlSeconds }
            : {}),
          ...(value.idTokenTtlSeconds !== undefined
            ? { idTokenTtlSeconds: value.idTokenTtlSeconds }
            : {}),
          ...(value.refreshTokenTtlSeconds !== undefined
            ? { refreshTokenTtlSeconds: value.refreshTokenTtlSeconds }
            : {}),
          ...(value.sessionTtlSeconds !== undefined
            ? { sessionTtlSeconds: value.sessionTtlSeconds }
            : {}),
          ...(branding !== undefined ? { brandingJson: branding } : {}),
          ...(value.defaultLocale !== undefined ? { defaultLocale: value.defaultLocale } : {}),
        };
        const updated = await this.repository.updateAuth({
          applicationId: scope.applicationId,
          expectedRevision: value.expectedRevision,
          patch,
          trustedOrigins,
          emailDelivery: value.emailDelivery
            ? { ...value.emailDelivery, updatedBy: currentActor.id }
            : undefined,
        });
        if (!updated) throw revisionConflict();
        return {
          result: {
            organizationId: scope.organizationId,
            applicationId: scope.applicationId,
          },
          targetId: scope.applicationId,
          safeDiff: {
            changedFields,
            ...(trustedOrigins ? { trustedOriginCount: trustedOrigins.length } : {}),
          },
        };
      },
    });
    await this.invalidation.invalidateApplication(result.applicationId);
    return result;
  }

  async setRealmEnabled(
    input: z.input<typeof realmEnabledSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationMutationResult> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      realmEnabledSchema,
      input,
      actor,
      {
        action: "auth_realm_enabled_set",
        targetType: "auth_configuration",
      },
    );
    const result = await this.executeExisting({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: AUTH_RESOURCE,
      permission: "admin",
      auditAction: "auth_realm_enabled_set",
      targetType: "auth_configuration",
      targetId: value.applicationId,
      failureSafeDiff: { enabled: value.enabled, changedFields: ["realmEnabled"] },
      execute: async (scope) => {
        this.assertRevision(scope, value.expectedRevision);
        if (value.enabled) await this.assertRealmCanBeEnabled(scope);
        const updated = await this.repository.setRealmEnabled({
          applicationId: scope.applicationId,
          enabled: value.enabled,
          expectedRevision: value.expectedRevision,
        });
        if (!updated) throw revisionConflict();
        return {
          result: {
            organizationId: scope.organizationId,
            applicationId: scope.applicationId,
          },
          targetId: scope.applicationId,
          safeDiff: { enabled: value.enabled, changedFields: ["realmEnabled"] },
        };
      },
    });
    await this.invalidation.invalidateApplication(result.applicationId);
    return result;
  }

  async updateAuthMethod(
    input: z.input<typeof methodSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationMutationResult & { methodId: "password" | "email_otp" | "phone_otp" }> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      methodSchema,
      input,
      actor,
      {
        action: "auth_method_update",
        targetType: "auth_method",
      },
    );
    const capabilities = [...new Set(value.enabledCapabilities)];
    const result = await this.executeExisting({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: AUTH_RESOURCE,
      permission: "write",
      auditAction: "auth_method_update",
      targetType: "auth_method",
      targetId: value.methodId,
      failureSafeDiff: {
        methodId: value.methodId,
        enabledCapabilities: capabilities,
      },
      execute: async (scope) => {
        this.assertRevision(scope, value.expectedRevision);
        const needsEmailDelivery =
          value.methodId === "email_otp"
            ? capabilities.length > 0
            : capabilities.includes("password_reset") ||
              (capabilities.includes("sign_up") && scope.configuration.emailVerificationRequired);
        if (needsEmailDelivery && !scope.deliveryConfigured) {
          throw invalidRealmState("Authentication method requires email delivery configuration");
        }
        if (
          value.methodId === "phone_otp" &&
          capabilities.length > 0 &&
          !(await this.smsProviderAvailability.isConfiguredForApplication(scope.applicationId))
        ) {
          throw invalidRealmState("Phone OTP requires an active SMS provider");
        }
        const resultingPasswordSignIn =
          value.methodId === "password"
            ? capabilities.includes("sign_in")
            : scope.configuration.passwordSignInEnabled;
        const resultingEmailOtpSignIn =
          value.methodId === "email_otp"
            ? capabilities.includes("sign_in")
            : scope.configuration.emailOtpSignInEnabled;
        const resultingPhoneOtpSignIn =
          value.methodId === "phone_otp"
            ? capabilities.includes("sign_in")
            : scope.configuration.phoneOtpSignInEnabled;
        if (
          scope.configuration.realmEnabled &&
          !resultingPasswordSignIn &&
          !resultingEmailOtpSignIn &&
          !resultingPhoneOtpSignIn &&
          scope.enabledProviderCount === 0
        ) {
          throw new ApplicationAuthAdminManagementError(
            "The last available sign-in method cannot be disabled",
            "LAST_LOGIN_METHOD",
          );
        }
        const updated = await this.repository.updateAuthMethod({
          applicationId: scope.applicationId,
          methodId: value.methodId,
          enabledCapabilities: capabilities,
          expectedRevision: value.expectedRevision,
        });
        if (!updated) throw revisionConflict();
        return {
          result: {
            organizationId: scope.organizationId,
            applicationId: scope.applicationId,
            methodId: value.methodId,
          },
          targetId: value.methodId,
          safeDiff: {
            methodId: value.methodId,
            enabledCapabilities: capabilities,
          },
        };
      },
    });
    await this.invalidation.invalidateApplication(result.applicationId);
    return result;
  }

  async replaceAuthMethods(
    input: z.input<typeof replaceAuthMethodsSchema>,
    actor: ApplicationAuthAdminActor,
    options: { authorization?: CreateApplicationAuthorizationMode } = {},
  ): Promise<ApplicationMutationResult> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      replaceAuthMethodsSchema,
      input,
      actor,
      {
        action: "auth_method_update",
        targetType: "auth_configuration",
      },
    );
    const enabledMethods = [...new Set(value.enabledMethods)];
    const result = await this.executeExisting({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: AUTH_RESOURCE,
      permission: "write",
      auditAction: "auth_method_update",
      targetType: "auth_configuration",
      failureSafeDiff: { enabledMethods },
      skipAuthorization: options.authorization === "trusted_boundary",
      execute: async (scope) => {
        this.assertRevision(scope, value.expectedRevision);
        const requiresDelivery =
          enabledMethods.includes("email_otp") ||
          (enabledMethods.includes("password") && scope.configuration.emailVerificationRequired);
        if (requiresDelivery && !scope.deliveryConfigured) {
          throw invalidRealmState(
            "Enabled authentication methods require email delivery configuration",
          );
        }
        if (
          enabledMethods.includes("phone_otp") &&
          !(await this.smsProviderAvailability.isConfiguredForApplication(scope.applicationId))
        ) {
          throw invalidRealmState("Phone OTP requires an active SMS provider");
        }
        const updated = await this.repository.replaceAuthMethods({
          applicationId: scope.applicationId,
          enabledMethods,
          expectedRevision: value.expectedRevision,
        });
        if (!updated) throw revisionConflict();
        return {
          result: {
            organizationId: scope.organizationId,
            applicationId: scope.applicationId,
          },
          safeDiff: { enabledMethods },
        };
      },
    });
    await this.invalidation.invalidateApplication(result.applicationId);
    return result;
  }

  async configureProvider(
    input: z.input<typeof providerConfigureSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationMutationResult & { provider: ApplicationAuthProviderName }> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      providerConfigureSchema,
      input,
      actor,
      { action: "provider_configure", targetType: "provider" },
    );
    return this.executeProviderWrite({
      value,
      actor: trustedActor,
      action: "provider_configure",
      permission: "admin",
      safeDiff: {
        provider: value.provider,
        scopeCount: value.scopes.length,
        enabled: false,
        changedFields: ["credentials", "scopes"],
      },
      execute: async (scope, currentActor) => {
        const configured = await this.repository.configureProvider({
          ...value,
          applicationId: scope.applicationId,
          actorId: currentActor.id,
        });
        if (configured === "already_configured") {
          throw new ApplicationAuthAdminManagementError(
            "Application auth provider is already configured",
            "PROVIDER_ALREADY_CONFIGURED",
          );
        }
        if (!configured) throw revisionConflict();
      },
    });
  }

  async updateProvider(
    input: z.input<typeof providerUpdateSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationMutationResult & { provider: ApplicationAuthProviderName }> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      providerUpdateSchema,
      input,
      actor,
      { action: "provider_update", targetType: "provider" },
    );
    return this.executeProviderWrite({
      value,
      actor: trustedActor,
      action: "provider_update",
      permission: "write",
      safeDiff: {
        provider: value.provider,
        ...(value.enabled !== undefined ? { enabled: value.enabled } : {}),
        ...(value.scopes ? { scopeCount: value.scopes.length } : {}),
        changedFields: [
          ...(value.enabled !== undefined ? ["enabled"] : []),
          ...(value.scopes !== undefined ? ["scopes"] : []),
        ] as ApplicationRealmChangedField[],
      },
      execute: async (scope, currentActor) => {
        if (
          value.enabled === false &&
          scope.configuration.realmEnabled &&
          !scope.configuration.passwordSignInEnabled &&
          !scope.configuration.emailOtpSignInEnabled &&
          !scope.configuration.phoneOtpSignInEnabled &&
          !(await this.repository.hasEnabledProvider(scope.applicationId, value.provider))
        ) {
          throw new ApplicationAuthAdminManagementError(
            "The last available sign-in method cannot be disabled",
            "LAST_LOGIN_METHOD",
          );
        }
        const updated = await this.repository.updateProvider({
          ...value,
          applicationId: scope.applicationId,
          actorId: currentActor.id,
        });
        if (updated === "not_configured") throw providerNotConfigured();
        if (!updated) throw revisionConflict();
      },
    });
  }

  async rotateProviderCredentials(
    input: z.input<typeof providerRotateSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationMutationResult & { provider: ApplicationAuthProviderName }> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      providerRotateSchema,
      input,
      actor,
      { action: "provider_credentials_rotate", targetType: "provider" },
    );
    return this.executeProviderWrite({
      value,
      actor: trustedActor,
      action: "provider_credentials_rotate",
      permission: "admin",
      safeDiff: {
        provider: value.provider,
        changedFields: ["credentials"],
      },
      execute: async (scope, currentActor) => {
        const updated = await this.repository.rotateProviderCredentials({
          ...value,
          applicationId: scope.applicationId,
          actorId: currentActor.id,
        });
        if (updated === "not_configured") throw providerNotConfigured();
        if (!updated) throw revisionConflict();
      },
    });
  }

  async deleteProviderCredentials(
    input: z.input<typeof providerSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationMutationResult & { provider: ApplicationAuthProviderName }> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      providerSchema,
      input,
      actor,
      { action: "provider_credentials_delete", targetType: "provider" },
    );
    return this.executeProviderWrite({
      value,
      actor: trustedActor,
      action: "provider_credentials_delete",
      permission: "admin",
      safeDiff: {
        provider: value.provider,
        enabled: false,
        changedFields: ["credentials"],
      },
      execute: async (scope) => {
        const status = await this.repository.deleteProviderCredentials({
          applicationId: scope.applicationId,
          provider: value.provider,
          expectedRevision: value.expectedRevision,
        });
        if (status === "not_configured") throw providerNotConfigured();
        if (status === "enabled") {
          throw new ApplicationAuthAdminManagementError(
            "Disable the provider before deleting credentials",
            "PROVIDER_MUST_BE_DISABLED",
          );
        }
        if (status === "conflict") throw revisionConflict();
      },
    });
  }

  async validateProvider(
    input: z.input<typeof providerSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationAuthProviderValidationResult> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      providerSchema,
      input,
      actor,
      { action: "provider_validate", targetType: "provider" },
    );
    const checkedAt = this.now();
    return this.executeExisting({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: PROVIDERS_RESOURCE,
      permission: "admin",
      auditAction: "provider_validate",
      targetType: "provider",
      targetId: value.provider,
      failureSafeDiff: { provider: value.provider },
      execute: async (scope) => {
        const prepared = await this.repository.prepareProviderValidation({
          applicationId: scope.applicationId,
          provider: value.provider,
          expectedRevision: value.expectedRevision,
        });
        if (prepared.status === "not_configured") throw providerNotConfigured();
        if (prepared.status === "conflict") throw revisionConflict();
        const validation =
          prepared.status === "invalid"
            ? prepared
            : await this.providerValidation.validate({
                provider: value.provider,
                clientId: prepared.clientId,
                clientSecret: prepared.clientSecret,
                scopes: prepared.scopes,
              });
        return {
          result: {
            provider: parseApplicationAuthProviderName(value.provider),
            status: validation.status,
            reasonCode: validation.status === "valid" ? null : validation.reasonCode,
            revision: prepared.revision,
            checkedAt,
          },
          targetId: value.provider,
          safeDiff: { provider: value.provider },
        };
      },
    });
  }

  async setUserStatus(
    input: z.input<typeof userSchema>,
    status: "active" | "blocked",
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationUser> {
    const auditAction =
      status === "blocked" ? "application_user_block" : "application_user_unblock";
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      userSchema,
      input,
      actor,
      { action: auditAction, targetType: "application_user" },
    );
    let previousStatus: "active" | "blocked" | undefined;
    const result = await this.executeExisting({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: USERS_RESOURCE,
      permission: "write",
      auditAction,
      targetType: "application_user",
      targetId: value.userId,
      failureSafeDiff: { status, changedFields: ["status"] },
      execute: async (scope) => {
        const repository = this.users.forApplication(scope.applicationId);
        const current = await repository.find(value.userId);
        if (!current) throw userNotFound();
        previousStatus = current.status;
        const user = await repository.setAdminStatus(value.userId, status);
        if (!user) throw userNotFound();
        return {
          result: user,
          targetId: value.userId,
          safeDiff: { status, changedFields: ["status"] },
        };
      },
    });
    if (previousStatus && previousStatus !== status) {
      await this.applicationUserLifecycle?.statusChanged({
        applicationId: value.applicationId,
        organizationId: value.organizationId,
        applicationUserId: value.userId,
        previousStatus,
        status,
        changedAt: this.now().toISOString(),
      });
    }
    await this.invalidation.invalidateUser(value.applicationId, value.userId);
    return result;
  }

  async revokeAllUserSessions(
    input: z.input<typeof userSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationUserSessionsRevokeAllResult> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      userSchema,
      input,
      actor,
      {
        action: "application_user_sessions_revoke_all",
        targetType: "application_user",
      },
    );
    const result = await this.executeExisting({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: USERS_RESOURCE,
      permission: "admin",
      auditAction: "application_user_sessions_revoke_all",
      targetType: "application_user",
      targetId: value.userId,
      failureSafeDiff: { changedFields: ["sessions"] },
      execute: async (scope) => {
        const repository = this.users.forApplication(scope.applicationId);
        const user = await repository.find(value.userId);
        if (!user) throw userNotFound();
        const revokedCount = await repository.revokeAllAdminSessions(value.userId);
        if (revokedCount === null) throw userNotFound();
        return {
          result: { user, revokedCount },
          targetId: value.userId,
          safeDiff: { revokedCount, changedFields: ["sessions"] },
        };
      },
    });
    await this.invalidation.invalidateUser(value.applicationId, value.userId);
    return result;
  }

  async unlinkUserAccount(
    input: z.input<typeof unlinkSchema>,
    actor: ApplicationAuthAdminActor,
  ): Promise<ApplicationUserAccountUnlinkResult> {
    const { value, actor: trustedActor } = await this.parseAuditedMutation(
      unlinkSchema,
      input,
      actor,
      {
        action: "application_user_account_unlink",
        targetType: "linked_account",
      },
    );
    const result = await this.executeExisting({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: USERS_RESOURCE,
      permission: "admin",
      auditAction: "application_user_account_unlink",
      targetType: "linked_account",
      targetId: value.accountId,
      failureSafeDiff: { changedFields: ["linkedAccount"] },
      execute: async (scope) => {
        const repository = this.users.forApplication(scope.applicationId);
        const unlink = await repository.unlinkAdminAccount(value.userId, value.accountId);
        if (unlink.status === "user_not_found") throw userNotFound();
        if (unlink.status === "account_not_found") {
          throw new ApplicationAuthAdminManagementError(
            "Application user account was not found",
            "APPLICATION_USER_ACCOUNT_NOT_FOUND",
          );
        }
        if (unlink.status === "last_login_method") {
          throw new ApplicationAuthAdminManagementError(
            "The last available login method cannot be unlinked",
            "LAST_LOGIN_METHOD",
          );
        }
        const user = await repository.find(value.userId);
        if (!user) throw userNotFound();
        return {
          result: { user, unlinkedAccountId: unlink.accountId },
          targetId: unlink.accountId,
          safeDiff: { changedFields: ["linkedAccount"] },
        };
      },
    });
    await this.invalidation.invalidateUser(value.applicationId, value.userId);
    return result;
  }

  private async executeProviderWrite<
    TValue extends {
      organizationId: string;
      applicationId: string;
      provider: "google" | "facebook";
      expectedRevision: number;
    },
  >(input: {
    value: TValue;
    actor: ApplicationAuthAdminActor;
    action: ApplicationAuthAdminAuditAction;
    permission: "write" | "admin";
    safeDiff: ApplicationRealmAdminAuditSafeDiff;
    execute(
      scope: ApplicationAuthAdminMutationScope,
      actor: ApplicationAuthAdminActor,
    ): Promise<void>;
  }): Promise<ApplicationMutationResult & { provider: ApplicationAuthProviderName }> {
    const value = input.value;
    const result = await this.executeExisting({
      actor: input.actor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      resource: PROVIDERS_RESOURCE,
      permission: input.permission,
      auditAction: input.action,
      targetType: "provider",
      targetId: value.provider,
      failureSafeDiff: input.safeDiff,
      execute: async (scope, actor) => {
        this.assertRevision(scope, value.expectedRevision);
        await input.execute(scope, actor);
        return {
          result: {
            organizationId: scope.organizationId,
            applicationId: scope.applicationId,
            provider: parseApplicationAuthProviderName(value.provider),
          },
          targetId: value.provider,
          safeDiff: input.safeDiff,
        };
      },
    });
    await this.invalidation.invalidateApplication(result.applicationId);
    return result;
  }

  private async executeExisting<TResult>(input: ExistingWriteInput<TResult>): Promise<TResult> {
    try {
      const execution = await this.transactions.run(async () => {
        if (!input.skipAuthorization) {
          await this.assertAuthorized(
            input.organizationId,
            input.actor,
            input.resource,
            input.permission,
          );
        }
        const scope = await this.requireScope(
          input.organizationId,
          input.applicationId,
          input.includeArchived,
        );
        const result = await input.execute(scope, input.actor);
        await this.appendAudit({
          actor: input.actor,
          organizationId: scope.organizationId,
          applicationId: scope.applicationId,
          action: input.auditAction,
          outcome: "success",
          reasonCategory: "success",
          targetType: input.targetType,
          targetId: result.targetId,
          safeDiff: freezeDiff(result.safeDiff),
        });
        return result;
      });
      return execution.result;
    } catch (error) {
      const normalized = normalizeManagementError(error);
      await this.appendFailureAudit({
        actor: input.actor,
        organizationId: input.organizationId,
        applicationId: input.applicationId,
        action: input.auditAction,
        targetType: input.targetType,
        targetId: input.targetId,
        reasonCategory: auditReason(normalized),
        safeDiff: input.failureSafeDiff,
      });
      throw normalized;
    }
  }

  private async parseAuditedMutation<TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    input: unknown,
    actor: ApplicationAuthAdminActor,
    audit: {
      action: ApplicationAuthAdminAuditAction;
      targetType: ApplicationAuthAdminAuditTargetType;
      applicationId?: string;
    },
  ): Promise<{ value: z.infer<TSchema>; actor: ApplicationAuthAdminActor }> {
    try {
      return {
        value: this.parse(schema, input),
        actor: this.parseActor(actor),
      };
    } catch (error) {
      const normalized = normalizeManagementError(error);
      const raw = isRecord(input) ? input : {};
      await this.appendAudit({
        actor,
        organizationId: safeUuid(raw.organizationId),
        applicationId: audit.applicationId ?? safeUuid(raw.applicationId),
        action: audit.action,
        outcome: "failure",
        reasonCategory: auditReason(normalized),
        targetType: audit.targetType,
        targetId: safeTargetId(raw, audit.targetType),
        safeDiff: {},
      });
      throw normalized;
    }
  }

  private async appendAudit(input: {
    actor: ApplicationAuthAdminActor;
    organizationId: string | null;
    applicationId: string | null;
    action: ApplicationAuthAdminAuditAction;
    outcome: "success" | "failure";
    reasonCategory: ApplicationAuthAdminAuditReasonCategory;
    targetType: ApplicationAuthAdminAuditTargetType;
    targetId?: string;
    safeDiff: ApplicationRealmAdminAuditSafeDiff;
  }): Promise<void> {
    try {
      const actorId = actorIdForAudit(input.actor);
      await this.audit.append(
        Object.freeze({
          recordId: uuidv7(),
          schemaVersion: 1,
          occurredAt: this.now().toISOString(),
          category: "application_auth_admin",
          action: input.action,
          outcome: input.outcome,
          reasonCategory: input.reasonCategory,
          actorType: actorId ? (input.actor.type ?? "platform_admin") : "anonymous",
          actorId,
          organizationId: input.organizationId,
          applicationId: input.applicationId,
          targetType: input.targetType,
          ...(input.targetId ? { targetId: input.targetId } : {}),
          requestId: requestIdForAudit(input.actor.requestId),
          safeDiff: freezeDiff(input.safeDiff),
        }),
      );
    } catch {
      throw new ApplicationAuthAdminManagementError(
        "Administrative audit is unavailable",
        "ADMIN_AUDIT_UNAVAILABLE",
      );
    }
  }

  private appendFailureAudit(
    input: Omit<Parameters<ApplicationAuthAdminManagementService["appendAudit"]>[0], "outcome">,
  ): Promise<void> {
    return this.appendAudit({ ...input, outcome: "failure" });
  }

  private async assertAuthorized(
    organizationId: string,
    actor: ApplicationAuthAdminActor,
    resource: string,
    action: "write" | "admin",
  ): Promise<void> {
    const allowed = await this.authorizer.authorize({
      subject: actor.id,
      organizationId,
      domain: "org",
      resource,
      action,
    });
    if (!allowed) {
      throw new ApplicationAuthAdminManagementError(
        "Application realm operation is not permitted",
        "FORBIDDEN",
      );
    }
  }

  private async requireScope(
    organizationId: string,
    applicationId: string,
    includeArchived = false,
  ): Promise<ApplicationAuthAdminMutationScope> {
    const scope = await this.repository.findScope(organizationId, applicationId, {
      includeArchived,
    });
    if (!scope) {
      throw new ApplicationAuthAdminManagementError(
        "Application was not found",
        "APPLICATION_NOT_FOUND",
      );
    }
    return scope;
  }

  private assertRevision(scope: ApplicationAuthAdminMutationScope, expectedRevision: number): void {
    if (scope.configuration.revision !== expectedRevision) {
      throw revisionConflict();
    }
  }

  private async assertRealmCanBeEnabled(scope: ApplicationAuthAdminMutationScope): Promise<void> {
    const configuration = scope.configuration;
    const hasEnabledSignIn =
      configuration.passwordSignInEnabled ||
      configuration.emailOtpSignInEnabled ||
      configuration.phoneOtpSignInEnabled ||
      (await this.repository.hasEnabledProvider(scope.applicationId));
    if (!hasEnabledSignIn) {
      throw invalidRealmState(
        "At least one configured sign-in method is required before enabling the realm",
      );
    }
    const needsDelivery =
      configuration.emailOtpSignInEnabled ||
      configuration.emailOtpSignUpEnabled ||
      configuration.passwordResetEnabled ||
      ((configuration.passwordSignInEnabled || configuration.passwordSignUpEnabled) &&
        configuration.emailVerificationRequired);
    if (needsDelivery && !scope.deliveryConfigured) {
      throw invalidRealmState(
        "Enabled authentication methods require email delivery configuration",
      );
    }
  }

  private parse<TSchema extends z.ZodTypeAny>(schema: TSchema, input: unknown): z.infer<TSchema> {
    try {
      return schema.parse(input);
    } catch (error) {
      throw normalizeManagementError(error);
    }
  }

  private parseActor(actor: ApplicationAuthAdminActor): ApplicationAuthAdminActor {
    const result = actorSchema.safeParse(actor);
    if (!result.success) {
      throw new ApplicationAuthAdminManagementError(
        "Authenticated platform administrator is required",
        "UNAUTHENTICATED",
      );
    }
    return result.data;
  }
}

function mergeBranding(current: object, patch: z.infer<typeof authBrandingPatchSchema>) {
  const result: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete result[key];
    else if (value !== undefined) result[key] = value;
  }
  return applicationAuthBrandingSchema.parse(result);
}

function normalizeOrigins(values: readonly string[]): string[] {
  try {
    return [
      ...new Set(
        values.map((origin) =>
          normalizeApplicationAuthOrigin(origin, {
            allowInsecureLocalhost: true,
          }),
        ),
      ),
    ].sort();
  } catch {
    throw invalidInput("Trusted origins must be valid exact origins");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeUuid(value: unknown): string | null {
  const result = z.string().uuid().safeParse(value);
  return result.success ? result.data : null;
}

function safeTargetId(
  input: Record<string, unknown>,
  targetType: ApplicationAuthAdminAuditTargetType,
): string | undefined {
  const candidate =
    targetType === "provider"
      ? input.provider
      : targetType === "auth_method"
        ? input.methodId
        : targetType === "linked_account"
          ? input.accountId
          : targetType === "application_user"
            ? input.userId
            : input.applicationId;
  if (typeof candidate !== "string" || candidate.length > 512) return undefined;
  if (targetType === "provider" && candidate !== "google" && candidate !== "facebook") {
    return undefined;
  }
  if (
    targetType === "auth_method" &&
    candidate !== "password" &&
    candidate !== "email_otp" &&
    candidate !== "phone_otp"
  ) {
    return undefined;
  }
  return candidate;
}

function actorIdForAudit(actor: ApplicationAuthAdminActor): string | null {
  const result = z.string().trim().min(1).max(128).safeParse(actor.id);
  return result.success ? result.data : null;
}

function requestIdForAudit(requestId: string): string {
  const result = z.string().trim().min(1).max(256).safeParse(requestId);
  return result.success ? result.data : "unknown";
}

function authChangedFields(input: Record<string, unknown>): ApplicationRealmChangedField[] {
  return [
    "registrationMode",
    "emailVerificationRequired",
    "accessTokenTtlSeconds",
    "idTokenTtlSeconds",
    "refreshTokenTtlSeconds",
    "sessionTtlSeconds",
    "branding",
    "defaultLocale",
    "trustedOrigins",
    "emailDelivery",
  ].filter((field) => input[field] !== undefined) as ApplicationRealmChangedField[];
}

function freezeDiff(
  diff: ApplicationRealmAdminAuditSafeDiff,
): Readonly<ApplicationRealmAdminAuditSafeDiff> {
  return Object.freeze({
    ...diff,
    ...(diff.changedFields ? { changedFields: Object.freeze([...diff.changedFields]) } : {}),
    ...(diff.enabledCapabilities
      ? { enabledCapabilities: Object.freeze([...diff.enabledCapabilities]) }
      : {}),
    ...(diff.enabledMethods ? { enabledMethods: Object.freeze([...diff.enabledMethods]) } : {}),
  });
}

function invalidInput(message: string): ApplicationAuthAdminManagementError {
  return new ApplicationAuthAdminManagementError(message, "INVALID_INPUT");
}

function invalidRealmState(message: string): ApplicationAuthAdminManagementError {
  return new ApplicationAuthAdminManagementError(message, "INVALID_REALM_STATE");
}

function revisionConflict(): ApplicationAuthAdminManagementError {
  return new ApplicationAuthAdminManagementError(
    "Application revision conflict",
    "REVISION_CONFLICT",
  );
}

function providerNotConfigured(): ApplicationAuthAdminManagementError {
  return new ApplicationAuthAdminManagementError(
    "Application auth provider is not configured",
    "PROVIDER_NOT_CONFIGURED",
  );
}

function userNotFound(): ApplicationAuthAdminManagementError {
  return new ApplicationAuthAdminManagementError(
    "Application user was not found",
    "APPLICATION_USER_NOT_FOUND",
  );
}

function normalizeManagementError(error: unknown): ApplicationAuthAdminManagementError {
  if (error instanceof ApplicationAuthAdminManagementError) return error;
  if (error instanceof ZodError) {
    return new ApplicationAuthAdminManagementError(
      "Application realm input is invalid",
      "INVALID_INPUT",
      {
        issues: error.issues.map((issue) => ({
          path: issue.path,
          code: issue.code,
          message: issue.message,
        })),
      },
    );
  }
  if (hasErrorCode(error, "23505")) {
    return new ApplicationAuthAdminManagementError(
      "An application with this name already exists",
      "DUPLICATE_VALUE",
    );
  }
  return new ApplicationAuthAdminManagementError(
    "Application realm operation failed",
    "INTERNAL_ERROR",
  );
}

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  const visited = new Set<unknown>();
  let current = error;
  while (typeof current === "object" && current !== null && !visited.has(current)) {
    visited.add(current);
    if ("code" in current && current.code === expectedCode) return true;
    current = "cause" in current ? current.cause : null;
  }
  return false;
}

function auditReason(
  error: ApplicationAuthAdminManagementError,
): ApplicationAuthAdminAuditReasonCategory {
  switch (error.code) {
    case "UNAUTHENTICATED":
      return "unauthenticated";
    case "FORBIDDEN":
      return "forbidden";
    case "APPLICATION_NOT_FOUND":
      return "scope_not_found";
    case "APPLICATION_USER_NOT_FOUND":
    case "APPLICATION_USER_ACCOUNT_NOT_FOUND":
    case "PROVIDER_NOT_CONFIGURED":
      return "target_not_found";
    case "INVALID_INPUT":
    case "DUPLICATE_VALUE":
      return "invalid_input";
    case "PROVIDER_ALREADY_CONFIGURED":
    case "PROVIDER_MUST_BE_DISABLED":
    case "LAST_LOGIN_METHOD":
    case "INVALID_REALM_STATE":
      return "invalid_target_state";
    case "REVISION_CONFLICT":
      return "revision_conflict";
    case "ADMIN_AUDIT_UNAVAILABLE":
      return "audit_unavailable";
    case "INTERNAL_ERROR":
      return "internal_error";
  }
}
