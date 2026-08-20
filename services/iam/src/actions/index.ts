import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
  ZodSchema,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import { AuthProvider } from "../kernel/Authorizable.js";
import { runWithContext, type ServiceContext } from "../context/index.js";
import { Loader } from "../loaders/Loader.js";
import type { ApplicationAuthAdminAuditReasonCategory } from "../services/ApplicationAuthAdminAuditPort.js";
import { GetCurrentUserScript } from "../scripts/user/GetCurrentUserScript.js";
import { AuthorizeScript } from "../scripts/organization/AuthorizeScript.js";
import { BatchAuthorizeScript } from "../scripts/organization/BatchAuthorizeScript.js";
import { IAM_SERVICE_LINKED_RESOURCE_KIND } from "../service-linked/resources.js";
import {
  createApplicationResource,
  normalizeApplicationAuthOrigin,
} from "../auth/applicationAuthConfiguration.js";
import {
  getCurrentUserInputSchema,
  type GetCurrentUserParams,
} from "../scripts/user/dto/GetCurrentUserDto.js";
import {
  authorizeInputSchema,
  type AuthorizeParams,
  type AuthorizeResult,
} from "../scripts/organization/dto/AuthorizeDto.js";
import {
  protectedResourceAuthorizeInputSchema,
  type ProtectedResourceAuthorizeParams,
  type ProtectedResourceAuthorizeResult,
} from "../scripts/organization/dto/ProtectedResourceAuthorizeDto.js";
import { ServiceLinkedResourceAuthorizationError } from "@shopana/rbac";
import {
  batchAuthorizeInputSchema,
  type BatchAuthorizeParams,
  type BatchAuthorizeResult,
} from "../scripts/organization/dto/BatchAuthorizeDto.js";
import { ORG_DOMAIN } from "../casbin/CasbinService.js";

const applicationNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

const linkedOwnerInputSchema = z
  .object({
    linkedOwnerType: z.string().trim().min(1).max(64),
    linkedOwnerId: z.string().uuid("Invalid linked owner ID"),
  })
  .strict();

const applicationAuthBootstrapInputSchema = z
  .object({
    origin: z.string().url().max(2048),
    redirectUri: z.string().url().max(2048),
    postLogoutRedirectUri: z.string().url().max(2048),
    defaultLocale: z.literal("en"),
    emailVerificationRequired: z.boolean(),
  })
  .strict()
  .superRefine((value, ctx) => {
    let normalizedOrigin: string;
    try {
      normalizedOrigin = normalizeApplicationAuthOrigin(value.origin, {
        allowInsecureLocalhost: true,
      });
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["origin"],
        message: "Application trusted origin must use HTTPS or loopback HTTP",
      });
      return;
    }
    if (normalizedOrigin !== value.origin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["origin"],
        message: "Application trusted origin must be canonical",
      });
    }
    const origin = new URL(normalizedOrigin);
    for (const [field, rawUri] of [
      ["redirectUri", value.redirectUri],
      ["postLogoutRedirectUri", value.postLogoutRedirectUri],
    ] as const) {
      const uri = new URL(rawUri);
      if (uri.origin !== origin.origin || uri.username || uri.password || uri.hash) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Application OAuth URI must be an exact URL on the application trusted origin",
        });
      }
    }
  });

const createApplicationInputSchema = z
  .object({
    applicationId: z.string().uuid("Invalid application ID"),
    userId: z.string().min(1, "User ID is required"),
    organizationId: z.string().uuid("Invalid organization ID"),
    name: applicationNameSchema,
    displayName: z.string().trim().min(1).max(256),
    description: z.string().trim().max(4000).optional(),
    applicationAuth: applicationAuthBootstrapInputSchema.optional(),
    managementMode: z.enum(["organization", "service"]),
    linkedOwner: linkedOwnerInputSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.managementMode === "service" && !value.linkedOwner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkedOwner"],
        message: "Linked owner is required for service-linked application",
      });
    }
    if (value.managementMode === "organization" && value.linkedOwner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkedOwner"],
        message: "Linked owner is not allowed for admin-managed application",
      });
    }
    if (value.applicationAuth && value.managementMode !== "service") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applicationAuth"],
        message: "Application auth bootstrap is allowed only for service-linked applications",
      });
    }
  });

const allocateApplicationIdInputSchema = z.object({}).strict();

const deleteServiceLinkedApplicationInputSchema = z
  .object({
    applicationId: z.string().uuid("Invalid application ID"),
    organizationId: z.string().uuid("Invalid organization ID"),
    linkedOwner: linkedOwnerInputSchema,
  })
  .strict();

const getServiceLinkedApplicationAuthSettingsInputSchema = z
  .object({
    applicationId: z.string().uuid("Invalid application ID"),
    organizationId: z.string().uuid("Invalid organization ID"),
    linkedOwner: linkedOwnerInputSchema,
  })
  .strict();

const updateServiceLinkedApplicationAuthSettingsInputSchema =
  getServiceLinkedApplicationAuthSettingsInputSchema
    .extend({
      userId: z.string().trim().min(1).max(128),
      enabledMethods: z.array(z.enum(["password", "email_otp", "phone_otp"])).max(3),
      expectedRevision: z.number().int().positive(),
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

const validateServiceLinkedApplicationTokenInputSchema =
  getServiceLinkedApplicationAuthSettingsInputSchema
    .extend({
      token: z.string().min(1).max(16_384),
    })
    .strict();

const getServiceLinkedApplicationUserInputSchema =
  getServiceLinkedApplicationAuthSettingsInputSchema
    .extend({
      userId: z.string().trim().min(1).max(128),
    })
    .strict();

const deleteServiceLinkedApplicationUserInputSchema = getServiceLinkedApplicationUserInputSchema
  .extend({ requestId: z.string().uuid("Invalid privacy request ID") })
  .strict();

type AllocateApplicationIdParams = z.infer<typeof allocateApplicationIdInputSchema>;
type AllocateApplicationIdResult = {
  success: boolean;
  applicationId?: string;
  error?: string;
};
type CreateApplicationParams = z.infer<typeof createApplicationInputSchema>;
type CreateApplicationResult = {
  success: boolean;
  applicationId?: string;
  error?: string;
};
type DeleteServiceLinkedApplicationParams = z.infer<
  typeof deleteServiceLinkedApplicationInputSchema
>;
type DeleteServiceLinkedApplicationResult = {
  success: boolean;
  error?: string;
};
type GetServiceLinkedApplicationAuthSettingsParams = z.infer<
  typeof getServiceLinkedApplicationAuthSettingsInputSchema
>;
type UpdateServiceLinkedApplicationAuthSettingsParams = z.infer<
  typeof updateServiceLinkedApplicationAuthSettingsInputSchema
>;
type ServiceLinkedApplicationAuthSettings = {
  realmEnabled: boolean;
  registrationMode: "open" | "disabled";
  revision: number;
  methods: Array<{
    method: "password" | "email_otp" | "phone_otp";
    enabled: boolean;
    configured: boolean;
  }>;
  providers: Array<{
    provider: "google" | "facebook";
    enabled: boolean;
    configured: boolean;
  }>;
};
type ServiceLinkedApplicationAuthSettingsResult = {
  success: boolean;
  settings?: ServiceLinkedApplicationAuthSettings;
  error?: string;
  errorCode?: string;
};
type ValidateServiceLinkedApplicationTokenParams = z.infer<
  typeof validateServiceLinkedApplicationTokenInputSchema
>;
type ValidateServiceLinkedApplicationTokenResult =
  | {
      active: true;
      userId: string;
      cacheUntil: string;
    }
  | {
      active: false;
    };
type GetServiceLinkedApplicationUserParams = z.infer<
  typeof getServiceLinkedApplicationUserInputSchema
>;
type GetServiceLinkedApplicationUserResult =
  | {
      found: true;
      user: {
        id: string;
        status: "active" | "blocked";
        email: string | null;
        emailVerified: boolean;
        phoneNumber: string | null;
        phoneNumberVerified: boolean;
        firstName: string | null;
        lastName: string | null;
      };
    }
  | {
      found: false;
    };
type DeleteServiceLinkedApplicationUserParams = z.infer<
  typeof deleteServiceLinkedApplicationUserInputSchema
>;
type DeleteServiceLinkedApplicationUserResult = {
  success: boolean;
  deleted: boolean;
  error?: string;
  errorCode?: string;
};

/**
 * IAM broker actions registered with @Action decorator.
 * Each method decorated with @Action is automatically registered
 * as a broker action when the module initializes.
 */
@Injectable()
export class IamBrokerActions extends BrokerActions {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private async createUserContext(
    userId: string,
    brokerCallContext?: BrokerCallContext,
  ): Promise<ServiceContext> {
    return {
      requestId: `broker-${Date.now()}`,
      kernel: this.kernel,
      // @ts-expect-error
      currentUser: {
        id: userId,
        data: null,
        // sessionId: params.sessionId, TODO: add sessionId
      },
      loaders: new Loader(this.kernel.repository),
      requestHeaders: {},
      brokerCallContext,
    };
  }

  /**
   * Action: getCurrentUser - validates token and returns user info
   */
  @Action("getCurrentUser")
  @ZodSchema(getCurrentUserInputSchema)
  async getCurrentUser(params: GetCurrentUserParams): Promise<{
    user: { id: string; name: string; email?: string } | null;
    userErrors: Array<{ code: string | null; message: string; field: string[] | null }>;
  }> {
    const result = await this.kernel.runScript(GetCurrentUserScript, {
      accessToken: params.accessToken,
    });

    return {
      user: result.user
        ? {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
          }
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Action: authorize - checks if user has permission for action on resource
   */
  @Action("authorize")
  @ZodSchema(authorizeInputSchema)
  async authorize(params: AuthorizeParams): Promise<AuthorizeResult> {
    return this.kernel.runScript(AuthorizeScript, {
      subject: params.subject,
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      domain: params.domain ?? ORG_DOMAIN,
      resource: params.resource,
      action: params.action,
    });
  }

  /** Check service-linked mutability independently from user RBAC. */
  @Action("authorizeProtectedResource")
  @ZodSchema(protectedResourceAuthorizeInputSchema)
  async authorizeProtectedResource(
    params: ProtectedResourceAuthorizeParams,
    brokerCallContext: BrokerCallContext,
  ): Promise<ProtectedResourceAuthorizeResult> {
    const ctx = await this.createUserContext("", brokerCallContext);
    return runWithContext(ctx, async () => {
      try {
        return {
          allowed: await new AuthProvider().authorizeProtectedResource(params),
        };
      } catch (error) {
        if (error instanceof ServiceLinkedResourceAuthorizationError) {
          return {
            allowed: false,
            deniedReason: error.message,
            deniedCode: error.code,
            serviceLinkedDetails: error.details,
          };
        }
        throw error;
      }
    });
  }

  /**
   * Action: batchAuthorize - check multiple permissions at once
   */
  @Action("batchAuthorize")
  @ZodSchema(batchAuthorizeInputSchema)
  async batchAuthorize(params: BatchAuthorizeParams): Promise<BatchAuthorizeResult> {
    return this.kernel.runScript(BatchAuthorizeScript, params);
  }

  /**
   * Action: allocateApplicationId - allocate an IAM-owned application UUID.
   */
  @Action("allocateApplicationId")
  @ZodSchema(allocateApplicationIdInputSchema)
  async allocateApplicationId(
    _params: AllocateApplicationIdParams,
  ): Promise<AllocateApplicationIdResult> {
    try {
      const applicationId =
        await this.kernel.repository.applicationAuthAdminMutation.allocateApplicationId();

      return {
        success: true,
        applicationId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to allocate application id",
      };
    }
  }

  /**
   * Action: createApplication - create an IAM application in an organization
   * Service-linked business authorization belongs to the trusted caller; IAM
   * derives ownership exclusively from the broker call context.
   */
  @Action("createApplication")
  @ZodSchema(createApplicationInputSchema)
  async createApplication(
    params: CreateApplicationParams,
    actionContext: BrokerCallContext,
  ): Promise<CreateApplicationResult> {
    const ctx = await this.createUserContext(params.userId, actionContext);

    try {
      const result = await runWithContext(ctx, () =>
        this.kernel.repository.txManager.run(async () => {
          if (params.managementMode === "service") {
            if (await this.isExistingServiceLinkedApplication(params, actionContext)) {
              await this.appendServiceLinkedApplicationCreateAudit(
                params,
                ctx.requestId,
                params.applicationId,
                actionContext.caller.service,
                "success",
                "success",
                false,
              );
              return { applicationId: params.applicationId };
            }
          }

          const result = await this.kernel.applicationAuthAdminManagement.createApplication(
            {
              organizationId: params.organizationId,
              name: params.name,
              displayName: params.displayName,
              description: params.description,
            },
            {
              id: params.userId,
              requestId: ctx.requestId,
            },
            {
              applicationId: params.applicationId,
              authorization: params.managementMode === "service" ? "trusted_boundary" : "admin",
              managementMode: params.managementMode,
              applicationAuth: params.applicationAuth,
            },
          );

          if (params.managementMode === "service") {
            if (!params.linkedOwner) {
              throw new Error("Linked owner is required");
            }
            await this.kernel.repository.serviceLinkedResource.createBinding({
              organizationId: params.organizationId,
              resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
              resourceId: result.applicationId,
              linkedService: actionContext.caller.service,
              linkedOwnerType: params.linkedOwner.linkedOwnerType,
              linkedOwnerId: params.linkedOwner.linkedOwnerId,
              createdBy: uuidOrNull(params.userId),
            });
            await this.appendServiceLinkedApplicationCreateAudit(
              params,
              ctx.requestId,
              result.applicationId,
              actionContext.caller.service,
              "success",
              "success",
            );
          }

          return result;
        }),
      );

      return {
        success: true,
        applicationId: result.applicationId,
      };
    } catch (error) {
      let effectiveError = error;
      if (params.managementMode === "service") {
        try {
          await this.appendServiceLinkedApplicationCreateAudit(
            params,
            ctx.requestId,
            params.applicationId,
            actionContext.caller.service,
            "failure",
            serviceLinkedApplicationCreateFailureReason(error),
          );
        } catch (auditError) {
          effectiveError = auditError;
        }
      }
      return {
        success: false,
        error:
          effectiveError instanceof Error ? effectiveError.message : "Failed to create application",
      };
    }
  }

  private async appendServiceLinkedApplicationCreateAudit(
    params: CreateApplicationParams,
    requestId: string,
    applicationId: string,
    callerService: string,
    outcome: "success" | "failure",
    reasonCategory: ApplicationAuthAdminAuditReasonCategory,
    serviceLinkedBindingCreated = outcome === "success",
  ): Promise<void> {
    if (!params.linkedOwner) return;
    await this.kernel.repository.applicationAuthAdminAudit.append({
      recordId: uuidv7(),
      schemaVersion: 1,
      occurredAt: new Date().toISOString(),
      category: "iam_resource_admin",
      action: "application_create",
      outcome,
      reasonCategory,
      actorType: "external_service",
      actorId: callerService,
      organizationId: params.organizationId,
      applicationId,
      targetType: "application",
      targetId: applicationId,
      requestId: requestId.trim().slice(0, 256) || "unknown",
      safeDiff: Object.freeze({
        serviceLinkedBindingCreated,
        resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
        linkedService: callerService,
        linkedOwnerType: params.linkedOwner.linkedOwnerType,
      }),
    });
  }

  private async isExistingServiceLinkedApplication(
    params: CreateApplicationParams,
    actionContext: BrokerCallContext,
  ): Promise<boolean> {
    if (!params.linkedOwner) return false;

    const binding = await this.kernel.repository.serviceLinkedResource.findActiveLinkedOwner({
      organizationId: params.organizationId,
      resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
      resourceId: params.applicationId,
      linkedService: actionContext.caller.service,
      linkedOwnerType: params.linkedOwner.linkedOwnerType,
      linkedOwnerId: params.linkedOwner.linkedOwnerId,
    });
    if (!binding) return false;

    const scope = await this.kernel.repository.applicationAuthAdminMutation.findScope(
      params.organizationId,
      params.applicationId,
    );
    return scope !== null;
  }

  @Action("getServiceLinkedApplicationAuthSettings")
  @ZodSchema(getServiceLinkedApplicationAuthSettingsInputSchema)
  async getServiceLinkedApplicationAuthSettings(
    params: GetServiceLinkedApplicationAuthSettingsParams,
    actionContext: BrokerCallContext,
  ): Promise<ServiceLinkedApplicationAuthSettingsResult> {
    try {
      await this.assertServiceLinkedApplicationOwner(params, actionContext);
      const [view] = await this.kernel.repository.applicationAuthAdminQuery.getByApplicationKeys([
        { id: params.applicationId, organizationId: params.organizationId },
      ]);
      if (!view) {
        return {
          success: false,
          error: "Application auth settings were not found",
          errorCode: "APPLICATION_NOT_FOUND",
        };
      }
      const phoneOtpConfigured =
        await this.kernel.applicationAuthAdminManagement.isPhoneOtpConfigured(params.applicationId);
      return {
        success: true,
        settings: mapServiceLinkedAuthSettings(view, phoneOtpConfigured),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read auth settings",
        errorCode: errorCode(error) ?? "INTERNAL_ERROR",
      };
    }
  }

  @Action("updateServiceLinkedApplicationAuthSettings")
  @ZodSchema(updateServiceLinkedApplicationAuthSettingsInputSchema)
  async updateServiceLinkedApplicationAuthSettings(
    params: UpdateServiceLinkedApplicationAuthSettingsParams,
    actionContext: BrokerCallContext,
  ): Promise<ServiceLinkedApplicationAuthSettingsResult> {
    try {
      const ctx = await this.createUserContext(params.userId, actionContext);
      await this.assertServiceLinkedApplicationOwner(params, actionContext);
      await runWithContext(ctx, () =>
        this.kernel.applicationAuthAdminManagement.replaceAuthMethods(
          {
            organizationId: params.organizationId,
            applicationId: params.applicationId,
            enabledMethods: params.enabledMethods,
            expectedRevision: params.expectedRevision,
          },
          {
            id: actionContext.caller.service,
            requestId: ctx.requestId,
            type: "external_service",
          },
          { authorization: "trusted_boundary" },
        ),
      );
      const [view] = await this.kernel.repository.applicationAuthAdminQuery.getByApplicationKeys([
        { id: params.applicationId, organizationId: params.organizationId },
      ]);
      if (!view) throw new Error("Application auth settings were not found");
      const phoneOtpConfigured =
        await this.kernel.applicationAuthAdminManagement.isPhoneOtpConfigured(params.applicationId);
      return {
        success: true,
        settings: mapServiceLinkedAuthSettings(view, phoneOtpConfigured),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update auth settings",
        errorCode: errorCode(error) ?? "INTERNAL_ERROR",
      };
    }
  }

  /**
   * Validate a customer OAuth access token only for the service that owns the
   * service-linked store application. The expected audience is IAM-derived.
   */
  @Action("validateServiceLinkedApplicationToken")
  @ZodSchema(validateServiceLinkedApplicationTokenInputSchema)
  async validateServiceLinkedApplicationToken(
    params: ValidateServiceLinkedApplicationTokenParams,
    actionContext: BrokerCallContext,
  ): Promise<ValidateServiceLinkedApplicationTokenResult> {
    try {
      await this.assertServiceLinkedApplicationOwner(params, actionContext);
      const result = await this.kernel.applicationTokenValidation.validateAccessToken({
        token: params.token,
        expectedApplicationId: params.applicationId,
        expectedAudience: createApplicationResource(params.applicationId),
      });
      if (!result.active) return { active: false };
      return {
        active: true,
        userId: result.userId,
        cacheUntil: result.cacheUntil.toISOString(),
      };
    } catch {
      return { active: false };
    }
  }

  /**
   * Hydrate the minimal application-user identity projection for the service
   * that owns the service-linked application.
   */
  @Action("getServiceLinkedApplicationUser")
  @ZodSchema(getServiceLinkedApplicationUserInputSchema)
  async getServiceLinkedApplicationUser(
    params: GetServiceLinkedApplicationUserParams,
    actionContext: BrokerCallContext,
  ): Promise<GetServiceLinkedApplicationUserResult> {
    await this.assertServiceLinkedApplicationOwner(params, actionContext);
    const user = await this.kernel.repository.applicationUser
      .forApplication(params.applicationId)
      .find(params.userId);
    if (!user) return { found: false };

    return {
      found: true,
      user: {
        id: user.id,
        status: user.status,
        email: user.syntheticEmail ? null : user.email,
        emailVerified: user.syntheticEmail ? false : user.emailVerified,
        phoneNumber: user.phoneNumber,
        phoneNumberVerified: user.phoneNumberVerified,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  @Action("deleteServiceLinkedApplicationUser")
  @ZodSchema(deleteServiceLinkedApplicationUserInputSchema)
  async deleteServiceLinkedApplicationUser(
    params: DeleteServiceLinkedApplicationUserParams,
    actionContext: BrokerCallContext,
  ): Promise<DeleteServiceLinkedApplicationUserResult> {
    const requestId = params.requestId;
    try {
      await this.assertServiceLinkedApplicationOwner(params, actionContext);
      const applicationUsers = this.kernel.repository.applicationUser.forApplication(
        params.applicationId,
      );
      const deleted = await this.kernel.repository.txManager.run(async () => {
        const removed = await applicationUsers.removeWithinTransaction(params.userId);
        await this.kernel.repository.applicationAuthAdminAudit.append({
          recordId: params.requestId,
          schemaVersion: 1,
          occurredAt: new Date().toISOString(),
          category: "application_auth_admin",
          action: "application_user_privacy_delete",
          outcome: "success",
          reasonCategory: "success",
          actorType: "external_service",
          actorId: actionContext.caller.service,
          organizationId: params.organizationId,
          applicationId: params.applicationId,
          targetType: "application_user",
          targetId: params.userId,
          requestId,
          safeDiff: {
            changedFields: ["status", "sessions", "linkedAccount"],
          },
        });
        return removed;
      });
      if (deleted) await applicationUsers.publishInvalidation(params.userId);
      return { success: true, deleted };
    } catch (error) {
      return {
        success: false,
        deleted: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete service-linked application user",
        errorCode: errorCode(error) ?? "INTERNAL_ERROR",
      };
    }
  }

  private async assertServiceLinkedApplicationOwner(
    params: GetServiceLinkedApplicationAuthSettingsParams,
    actionContext: BrokerCallContext,
  ): Promise<void> {
    const binding = await this.kernel.repository.serviceLinkedResource.findActiveLinkedOwner({
      organizationId: params.organizationId,
      resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
      resourceId: params.applicationId,
      linkedService: actionContext.caller.service,
      linkedOwnerType: params.linkedOwner.linkedOwnerType,
      linkedOwnerId: params.linkedOwner.linkedOwnerId,
    });
    if (!binding) {
      throw new Error("Application is not linked to the requested owner");
    }
  }

  /**
   * Delete an application only when the trusted caller owns its active
   * service-linked binding.
   */
  @Action("deleteServiceLinkedApplication")
  @ZodSchema(deleteServiceLinkedApplicationInputSchema)
  async deleteServiceLinkedApplication(
    params: DeleteServiceLinkedApplicationParams,
    actionContext: BrokerCallContext,
  ): Promise<DeleteServiceLinkedApplicationResult> {
    try {
      await this.kernel.repository.txManager.run(async () => {
        const linkedOwner = {
          organizationId: params.organizationId,
          resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
          resourceId: params.applicationId,
          linkedService: actionContext.caller.service,
          linkedOwnerType: params.linkedOwner.linkedOwnerType,
          linkedOwnerId: params.linkedOwner.linkedOwnerId,
        };
        const binding =
          await this.kernel.repository.serviceLinkedResource.findActiveLinkedOwner(linkedOwner);

        if (!binding) {
          const applicationExists =
            await this.kernel.repository.applicationAuthAdminMutation.applicationExists({
              applicationId: params.applicationId,
              organizationId: params.organizationId,
            });
          if (!applicationExists) return;
          throw new Error("Application is not linked to the requested owner");
        }

        const bindingDeleted =
          await this.kernel.repository.serviceLinkedResource.softDeleteActiveLinkedOwner(
            linkedOwner,
          );
        if (!bindingDeleted) {
          throw new Error("Service-linked application binding could not be deleted");
        }

        const applicationDeleted =
          await this.kernel.repository.applicationAuthAdminMutation.deleteServiceLinkedApplication({
            applicationId: params.applicationId,
            organizationId: params.organizationId,
          });
        if (!applicationDeleted) {
          throw new Error("Service-linked application could not be deleted");
        }
        const managementDeleted =
          await this.kernel.repository.serviceLinkedResource.deleteManagement({
            organizationId: params.organizationId,
            resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
            resourceId: params.applicationId,
          });
        if (!managementDeleted) {
          throw new Error("Application resource management could not be deleted");
        }
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete application",
      };
    }
  }
}

function uuidOrNull(value: string): string | null {
  return z.string().uuid().safeParse(value).success ? value : null;
}

function serviceLinkedApplicationCreateFailureReason(
  error: unknown,
): ApplicationAuthAdminAuditReasonCategory {
  const code = errorCode(error);
  if (code === "UNAUTHENTICATED") return "unauthenticated";
  if (code === "FORBIDDEN") return "authorization";
  if (code === "DUPLICATE_VALUE" || code === "INVALID_INPUT") {
    return "invalid_input";
  }
  if (code === "ADMIN_AUDIT_UNAVAILABLE") return "audit_unavailable";
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("not permitted") ||
    message.includes("not allowed") ||
    message.includes("does not match broker caller")
  ) {
    return "authorization";
  }
  if (message.includes("required")) return "invalid_input";
  return "internal_error";
}

function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function mapServiceLinkedAuthSettings(
  view: {
    configuration: {
      realmEnabled: boolean;
      registrationMode: string;
      revision: number;
      passwordSignInEnabled: boolean;
      passwordSignUpEnabled: boolean;
      passwordResetEnabled: boolean;
      emailOtpSignInEnabled: boolean;
      emailOtpSignUpEnabled: boolean;
      phoneOtpSignInEnabled: boolean;
      phoneOtpSignUpEnabled: boolean;
    };
    deliveryProfile: unknown | null;
    providers: ReadonlyArray<{
      provider: "google" | "facebook";
      enabled: boolean;
    }>;
  },
  phoneOtpConfigured: boolean,
): ServiceLinkedApplicationAuthSettings {
  const { configuration } = view;
  return {
    realmEnabled: configuration.realmEnabled,
    registrationMode: configuration.registrationMode === "open" ? "open" : "disabled",
    revision: configuration.revision,
    methods: [
      {
        method: "password",
        enabled: configuration.passwordSignInEnabled || configuration.passwordSignUpEnabled,
        configured: true,
      },
      {
        method: "email_otp",
        enabled: configuration.emailOtpSignInEnabled || configuration.emailOtpSignUpEnabled,
        configured: view.deliveryProfile !== null,
      },
      {
        method: "phone_otp",
        enabled: configuration.phoneOtpSignInEnabled || configuration.phoneOtpSignUpEnabled,
        configured: phoneOtpConfigured,
      },
    ],
    providers: (["google", "facebook"] as const).map((provider) => {
      const configured = view.providers.find((item) => item.provider === provider);
      return {
        provider,
        configured: configured !== undefined,
        enabled: configured?.enabled ?? false,
      };
    }),
  };
}
