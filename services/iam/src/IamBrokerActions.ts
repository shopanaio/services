import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
  ZodSchema,
} from "@shopana/shared-kernel";
import { Kernel } from "./kernel/Kernel.js";
import { GetCurrentUserScript } from "./scripts/user/GetCurrentUserScript.js";
import { AssignRoleScript } from "./scripts/organization/AssignRoleScript.js";
import { AuthorizeScript } from "./scripts/organization/AuthorizeScript.js";
import { BatchAuthorizeScript } from "./scripts/organization/BatchAuthorizeScript.js";
import { CreateRolesScript } from "./scripts/organization/CreateRolesScript.js";
import {
  getCurrentUserInputSchema,
  type GetCurrentUserParams,
} from "./scripts/user/dto/GetCurrentUserDto.js";
import {
  assignRoleInputSchema,
  type AssignRoleParams,
  type AssignRoleResult,
} from "./scripts/organization/dto/AssignRoleDto.js";
import {
  authorizeInputSchema,
  type AuthorizeParams,
  type AuthorizeResult,
} from "./scripts/organization/dto/AuthorizeDto.js";
import {
  batchAuthorizeInputSchema,
  type BatchAuthorizeParams,
  type BatchAuthorizeResult,
} from "./scripts/organization/dto/BatchAuthorizeDto.js";
import {
  createRolesInputSchema,
  type CreateRolesParams,
  type CreateRolesResult,
} from "./scripts/organization/dto/CreateRolesDto.js";
import { ORG_DOMAIN } from "./casbin/CasbinService.js";

/**
 * IAM broker actions registered with @Action decorator.
 * Each method decorated with @Action is automatically registered
 * as a broker action when the module initializes.
 */
@Injectable()
export class IamBrokerActions extends BrokerActions {
  private kernel!: Kernel;

  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  /**
   * Set the kernel instance. Must be called before actions are invoked.
   */
  setKernel(kernel: Kernel): void {
    this.kernel = kernel;
  }

  /**
   * Action: getCurrentUser - validates token and returns user info
   */
  @Action("getCurrentUser")
  @ZodSchema(getCurrentUserInputSchema)
  async getCurrentUser(params: GetCurrentUserParams): Promise<{
    user: { id: string; name: string; email?: string } | null;
    userErrors: Array<{ code: string; message: string }>;
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
      userId: params.userId,
      organizationId: params.organizationId,
      domain: params.domain ?? ORG_DOMAIN,
      resource: params.resource,
      action: params.action,
    });
  }

  /**
   * Action: batchAuthorize - check multiple permissions at once
   */
  @Action("batchAuthorize")
  @ZodSchema(batchAuthorizeInputSchema)
  async batchAuthorize(
    params: BatchAuthorizeParams
  ): Promise<BatchAuthorizeResult> {
    return this.kernel.runScript(BatchAuthorizeScript, params);
  }

  /**
   * Action: createRoles - create roles for a domain
   */
  @Action("createRoles")
  @ZodSchema(createRolesInputSchema)
  async createRoles(params: CreateRolesParams): Promise<CreateRolesResult> {
    return this.kernel.runScript(CreateRolesScript, params);
  }

  /**
   * Action: assignRole - assign a role to a user
   */
  @Action("assignRole")
  @ZodSchema(assignRoleInputSchema)
  async assignRole(params: AssignRoleParams): Promise<AssignRoleResult> {
    return this.kernel.runScript(AssignRoleScript, params);
  }
}
