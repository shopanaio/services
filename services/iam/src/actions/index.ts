import { Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
  ZodSchema,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import { runWithContext, type ServiceContext } from "../context/index.js";
import { Loader } from "../loaders/Loader.js";
import { GetCurrentUserScript } from "../scripts/user/GetCurrentUserScript.js";
import { AssignRoleScript } from "../scripts/organization/AssignRoleScript.js";
import { AuthorizeScript } from "../scripts/organization/AuthorizeScript.js";
import { BatchAuthorizeScript } from "../scripts/organization/BatchAuthorizeScript.js";
import { CreateRolesScript } from "../scripts/organization/CreateRolesScript.js";
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

const createApplicationInputSchema = z
  .object({
    applicationId: z.string().uuid("Invalid application ID"),
    userId: z.string().min(1, "User ID is required"),
    organizationId: z.string().uuid("Invalid organization ID"),
    name: applicationNameSchema,
    displayName: z.string().trim().min(1).max(256),
    description: z.string().trim().max(4000).optional(),
  })
  .strict();

const allocateApplicationIdInputSchema = z.object({}).strict();

const deleteApplicationForStoreCreateCompensationInputSchema = z
  .object({
    applicationId: z.string().uuid("Invalid application ID"),
    organizationId: z.string().uuid("Invalid organization ID"),
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
        domain: params.domain ?? ORG_DOMAIN,
        resource: params.resource,
        action: params.action,
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
  ): Promise<CreateApplicationResult> {
    const ctx = await this.createUserContext(params.userId);

    try {
      const result = await runWithContext(ctx, () =>
        this.kernel.applicationAuthAdminManagement.createApplication(
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
          { applicationId: params.applicationId },
        ),
      );

      return {
        success: true,
        applicationId: result.applicationId,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create application",
      };
    }
  }

  /**
   * Action: deleteApplicationForStoreCreateCompensation - rollback helper for project.storeCreate.
   */
  @Action("deleteApplicationForStoreCreateCompensation")
  @ZodSchema(deleteApplicationForStoreCreateCompensationInputSchema)
  async deleteApplicationForStoreCreateCompensation(
    params: DeleteApplicationForStoreCreateCompensationParams,
  ): Promise<DeleteApplicationForStoreCreateCompensationResult> {
    try {
      await this.kernel.repository.applicationAuthAdminMutation.deleteApplicationForStoreCreateCompensation(
        {
          applicationId: params.applicationId,
          organizationId: params.organizationId,
        },
      );

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
