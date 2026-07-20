import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
  ZodSchema,
  type ActionCallContext,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import { AuthProvider } from "../kernel/Authorizable.js";
import { runWithContext, type ServiceContext } from "../context/index.js";
import { Loader } from "../loaders/Loader.js";
import type { ApplicationAuthAdminAuditReasonCategory } from "../services/ApplicationAuthAdminAuditPort.js";
import { GetCurrentUserScript } from "../scripts/user/GetCurrentUserScript.js";
import { AssignRoleScript } from "../scripts/organization/AssignRoleScript.js";
import { AuthorizeScript } from "../scripts/organization/AuthorizeScript.js";
import { BatchAuthorizeScript } from "../scripts/organization/BatchAuthorizeScript.js";
import { CreateRolesScript } from "../scripts/organization/CreateRolesScript.js";
import {
  IAM_LINKED_OWNER_TYPE,
  IAM_LINKED_SERVICE,
  IAM_SERVICE_LINKED_RESOURCE_KIND,
} from "../service-linked/resources.js";
import {
  getCurrentUserInputSchema,
  type GetCurrentUserParams,
} from "../scripts/user/dto/GetCurrentUserDto.js";
import {
  assignRoleInputSchema,
  type AssignRoleParams,
  type AssignRoleResult,
} from "../scripts/organization/dto/AssignRoleDto.js";
import {
  authorizeInputSchema,
  type AuthorizeParams,
  type AuthorizeResult,
} from "../scripts/organization/dto/AuthorizeDto.js";
import {
  batchAuthorizeInputSchema,
  type BatchAuthorizeParams,
  type BatchAuthorizeResult,
} from "../scripts/organization/dto/BatchAuthorizeDto.js";
import {
  createRolesInputSchema,
  type CreateRolesParams,
  type CreateRolesResult,
} from "../scripts/organization/dto/CreateRolesDto.js";
import { ORG_DOMAIN } from "../casbin/CasbinService.js";

const applicationNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

const linkedOwnerInputSchema = z
  .object({
    linkedService: z.string().trim().min(1).max(64),
    linkedOwnerType: z.string().trim().min(1).max(64),
    linkedOwnerId: z.string().uuid("Invalid linked owner ID"),
  })
  .strict();

const createApplicationInputSchema = z
  .object({
    applicationId: z.string().uuid("Invalid application ID"),
    userId: z.string().min(1, "User ID is required"),
    organizationId: z.string().uuid("Invalid organization ID"),
    name: applicationNameSchema,
    displayName: z.string().trim().min(1).max(256),
    description: z.string().trim().max(4000).optional(),
    managementMode: z.enum(["admin", "service_linked"]),
    linkedOwner: linkedOwnerInputSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.managementMode === "service_linked" && !value.linkedOwner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkedOwner"],
        message: "Linked owner is required for service-linked application",
      });
    }
    if (value.managementMode === "admin" && value.linkedOwner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkedOwner"],
        message: "Linked owner is not allowed for admin-managed application",
      });
    }
  });

const allocateApplicationIdInputSchema = z.object({}).strict();

const deleteApplicationForStoreCreateCompensationInputSchema = z
  .object({
    applicationId: z.string().uuid("Invalid application ID"),
    organizationId: z.string().uuid("Invalid organization ID"),
    storeId: z.string().uuid("Invalid store ID"),
  })
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
type DeleteApplicationForStoreCreateCompensationParams = z.infer<
  typeof deleteApplicationForStoreCreateCompensationInputSchema
>;
type DeleteApplicationForStoreCreateCompensationResult = {
  success: boolean;
  error?: string;
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

  private async createUserContext(userId: string): Promise<ServiceContext> {
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
    const ctx = await this.createUserContext(params.subject!);
    return runWithContext(ctx, () =>
      this.kernel.runScript(AuthorizeScript, {
        subject: params.subject,
        organizationId: params.organizationId,
        organizationName: params.organizationName,
        domain: params.domain ?? ORG_DOMAIN,
        resource: params.resource,
        action: params.action,
        protectedResource: params.protectedResource,
      }),
    );
  }

  /**
   * Action: batchAuthorize - check multiple permissions at once
   */
  @Action("batchAuthorize")
  @ZodSchema(batchAuthorizeInputSchema)
  async batchAuthorize(
    params: BatchAuthorizeParams,
  ): Promise<BatchAuthorizeResult> {
    const ctx = await this.createUserContext(params.requests[0]?.userId ?? "");
    return runWithContext(ctx, () =>
      this.kernel.runScript(BatchAuthorizeScript, params),
    );
  }

  /**
   * Action: createRoles - create roles for a domain
   */
  @Action("createRoles")
  @ZodSchema(createRolesInputSchema)
  async createRoles(params: CreateRolesParams): Promise<CreateRolesResult> {
    const ctx = await this.createUserContext(params.userId);
    return runWithContext(ctx, () =>
      this.kernel.runScript(CreateRolesScript, params),
    );
  }

  /**
   * Action: assignRole - assign a role to a user
   */
  @Action("assignRole")
  @ZodSchema(assignRoleInputSchema)
  async assignRole(params: AssignRoleParams): Promise<AssignRoleResult> {
    const ctx = await this.createUserContext(params.userId);
    return runWithContext(ctx, () =>
      this.kernel.runScript(AssignRoleScript, params),
    );
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
        error:
          error instanceof Error
            ? error.message
            : "Failed to allocate application id",
      };
    }
  }

  /**
   * Action: createApplication - create an IAM application in an organization
   */
  @Action("createApplication")
  @ZodSchema(createApplicationInputSchema)
  async createApplication(
    params: CreateApplicationParams,
    actionContext: ActionCallContext,
  ): Promise<CreateApplicationResult> {
    const ctx = await this.createUserContext(params.userId);

    try {
      const result = await runWithContext(ctx, () =>
        this.kernel.repository.txManager.run(async () => {
          if (params.managementMode === "service_linked") {
            await this.assertServiceLinkedApplicationCreateAuthorized(
              params,
              actionContext,
            );
          }

          const result =
            await this.kernel.applicationAuthAdminManagement.createApplication(
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
                authorization:
                  params.managementMode === "service_linked"
                    ? "trusted_boundary"
                    : "admin",
              },
            );

          if (params.managementMode === "service_linked") {
            if (!params.linkedOwner) {
              throw new Error("Linked owner is required");
            }
            await this.kernel.repository.serviceLinkedResource.createBinding({
              organizationId: params.organizationId,
              resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
              resourceId: result.applicationId,
              linkedService: params.linkedOwner.linkedService,
              linkedOwnerType: params.linkedOwner.linkedOwnerType,
              linkedOwnerId: params.linkedOwner.linkedOwnerId,
              createdBy: uuidOrNull(params.userId),
            });
            await this.appendServiceLinkedApplicationCreateAudit(
              params,
              ctx.requestId,
              result.applicationId,
              actionContext.callerService,
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
      if (params.managementMode === "service_linked") {
        try {
          await this.appendServiceLinkedApplicationCreateAudit(
            params,
            ctx.requestId,
            params.applicationId,
            actionContext.callerService,
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
          effectiveError instanceof Error
            ? effectiveError.message
            : "Failed to create application",
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
        serviceLinkedBindingCreated: outcome === "success",
        resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
        linkedService: params.linkedOwner.linkedService,
        linkedOwnerType: params.linkedOwner.linkedOwnerType,
      }),
    });
  }

  private async assertServiceLinkedApplicationCreateAuthorized(
    params: CreateApplicationParams,
    actionContext: ActionCallContext,
  ): Promise<void> {
    if (!params.linkedOwner) {
      throw new Error("Linked owner is required");
    }

    if (actionContext.callerService !== params.linkedOwner.linkedService) {
      throw new Error("Linked service does not match broker caller");
    }

    const permission = serviceLinkedApplicationCreatePermission(params.linkedOwner);
    if (!permission) {
      throw new Error("Linked owner is not allowed to create IAM application");
    }

    const allowed = await new AuthProvider().authorize({
      subject: params.userId,
      organizationId: params.organizationId,
      domain: ORG_DOMAIN,
      resource: permission.resource,
      action: permission.action,
    });
    if (!allowed) {
      throw new Error("Linked owner application create is not permitted");
    }
  }

  /**
   * Action: deleteApplicationForStoreCreateCompensation - rollback helper for project.storeCreate.
   */
  @Action("deleteApplicationForStoreCreateCompensation")
  @ZodSchema(deleteApplicationForStoreCreateCompensationInputSchema)
  async deleteApplicationForStoreCreateCompensation(
    params: DeleteApplicationForStoreCreateCompensationParams,
    actionContext: ActionCallContext,
  ): Promise<DeleteApplicationForStoreCreateCompensationResult> {
    try {
      if (actionContext.callerService !== IAM_LINKED_SERVICE.project) {
        throw new Error("Only project service can compensate store application");
      }

      await this.kernel.repository.txManager.run(async () => {
        const linkedOwner = {
          organizationId: params.organizationId,
          resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
          resourceId: params.applicationId,
          linkedService: IAM_LINKED_SERVICE.project,
          linkedOwnerType: IAM_LINKED_OWNER_TYPE.store,
          linkedOwnerId: params.storeId,
        };
        const binding =
          await this.kernel.repository.serviceLinkedResource.findActiveLinkedOwner(
            linkedOwner,
          );

        if (!binding) {
          const applicationExists =
            await this.kernel.repository.applicationAuthAdminMutation.applicationExists(
              {
                applicationId: params.applicationId,
                organizationId: params.organizationId,
              },
            );
          if (!applicationExists) return;
          throw new Error("Application is not linked to the requested store");
        }

        const bindingDeleted =
          await this.kernel.repository.serviceLinkedResource.softDeleteActiveLinkedOwner(
            linkedOwner,
          );
        if (!bindingDeleted) {
          throw new Error("Service-linked application binding could not be deleted");
        }

        const applicationDeleted =
          await this.kernel.repository.applicationAuthAdminMutation.deleteApplicationForStoreCreateCompensation(
            {
              applicationId: params.applicationId,
              organizationId: params.organizationId,
            },
          );
        if (!applicationDeleted) {
          throw new Error("Service-linked application could not be deleted");
        }
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete application",
      };
    }
  }
}

function uuidOrNull(value: string): string | null {
  return z.string().uuid().safeParse(value).success ? value : null;
}

function serviceLinkedApplicationCreatePermission(
  linkedOwner: NonNullable<CreateApplicationParams["linkedOwner"]>,
): { resource: string; action: "write" } | null {
  if (
    linkedOwner.linkedService === IAM_LINKED_SERVICE.project &&
    linkedOwner.linkedOwnerType === IAM_LINKED_OWNER_TYPE.store
  ) {
    return { resource: "org.stores", action: "write" };
  }
  return null;
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
