import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectBroker, ServiceBroker } from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import type { FastifyInstance } from "fastify";
import { Kernel } from "./kernel/Kernel.js";
import { startServer } from "./api/graphql-admin/server.js";
import {
  ProvisionTenantScript,
  type ProvisionTenantParams,
  type ProvisionTenantResult,
  GetCurrentUserScript,
  type GetCurrentUserParams,
  type GetCurrentUserResult,
  // Authorization scripts
  AuthorizeScript,
  type AuthorizeParams,
  type AuthorizeResult,
  BatchAuthorizeScript,
  type BatchAuthorizeParams,
  type BatchAuthorizeResult,
  GetUserRoleScript,
  type GetUserRoleParams,
  type GetUserRoleResult,
  GetMembersForDomainScript,
  type GetMembersForDomainParams,
  type GetMembersForDomainResult,
  AttachUserRoleScript,
  type AttachUserRoleParams,
  type AttachUserRoleResult,
  DetachUserRoleScript,
  type DetachUserRoleParams,
  type DetachUserRoleResult,
  // Domain-specific role scripts
  ChangeRoleForDomainScript,
  type ChangeRoleForDomainParams,
  type ChangeRoleForDomainResult,
  RemoveMemberFromDomainScript,
  type RemoveMemberFromDomainParams,
  type RemoveMemberFromDomainResult,
  // Role management scripts
  CreateRoleScript,
  type CreateRoleParams,
  type CreateRoleResult,
  UpdateRoleScript,
  type UpdateRoleParams,
  type UpdateRoleResult,
  DeleteRoleScript,
  type DeleteRoleParams,
  type DeleteRoleResult,
  ListRolesScript,
  type ListRolesParams,
  type ListRolesResult,
  // Resources
  getResources,
} from "./scripts/index.js";

// Resource registration types (for broker action)
interface RegisterResourcesParams {
  service: string;
  resources: Array<{ name: string; displayName?: string; actions: string[] }>;
}

interface RegisterResourcesResult {
  success: boolean;
  userErrors: Array<{ code: string; message: string }>;
}

const { service } = getServiceConfig("iam");

@Injectable()
export class IamNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IamNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;

  constructor(@InjectBroker("iam") private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.logger.debug("IAM onModuleInit started");

    this.kernel = await Kernel.create(this.broker);
    this.logger.debug("Kernel created");

    this.broker.register<ProvisionTenantParams, ProvisionTenantResult>(
      "provisionTenant",
      async (params) => {
        return this.kernel.runScript(ProvisionTenantScript, params!);
      }
    );

    this.broker.register<GetCurrentUserParams, GetCurrentUserResult>(
      "getCurrentUser",
      async (params) => {
        return this.kernel.runScript(GetCurrentUserScript, params!);
      }
    );
    this.logger.debug("Action iam.getCurrentUser registered");

    // Register authorization actions
    this.broker.register<AuthorizeParams, AuthorizeResult>(
      "authorize",
      async (params) => {
        return this.kernel.runScript(AuthorizeScript, params!);
      }
    );
    this.logger.debug("Action iam.authorize registered");

    this.broker.register<BatchAuthorizeParams, BatchAuthorizeResult>(
      "batchAuthorize",
      async (params) => {
        return this.kernel.runScript(BatchAuthorizeScript, params!);
      }
    );
    this.logger.debug("Action iam.batchAuthorize registered");

    this.broker.register<GetUserRoleParams, GetUserRoleResult>(
      "getUserRole",
      async (params) => {
        return this.kernel.runScript(GetUserRoleScript, params!);
      }
    );
    this.logger.debug("Action iam.getUserRole registered");

    this.broker.register<GetMembersForDomainParams, GetMembersForDomainResult>(
      "getMembersForDomain",
      async (params) => {
        return this.kernel.runScript(GetMembersForDomainScript, params!);
      }
    );
    this.logger.debug("Action iam.getMembersForDomain registered");

    this.broker.register<AttachUserRoleParams, AttachUserRoleResult>(
      "attachUserRole",
      async (params) => {
        return this.kernel.runScript(AttachUserRoleScript, params!);
      }
    );
    this.logger.debug("Action iam.attachUserRole registered");

    this.broker.register<DetachUserRoleParams, DetachUserRoleResult>(
      "detachUserRole",
      async (params) => {
        return this.kernel.runScript(DetachUserRoleScript, params!);
      }
    );
    this.logger.debug("Action iam.detachUserRole registered");

    // Register domain-specific role actions
    this.broker.register<ChangeRoleForDomainParams, ChangeRoleForDomainResult>(
      "changeRoleForDomain",
      async (params) => {
        return this.kernel.runScript(ChangeRoleForDomainScript, params!);
      }
    );
    this.logger.debug("Action iam.changeRoleForDomain registered");

    this.broker.register<RemoveMemberFromDomainParams, RemoveMemberFromDomainResult>(
      "removeMemberFromDomain",
      async (params) => {
        return this.kernel.runScript(RemoveMemberFromDomainScript, params!);
      }
    );
    this.logger.debug("Action iam.removeMemberFromDomain registered");

    // Register role management actions
    this.broker.register<CreateRoleParams, CreateRoleResult>(
      "createRole",
      async (params) => {
        return this.kernel.runScript(CreateRoleScript, params!);
      }
    );
    this.logger.debug("Action iam.createRole registered");

    this.broker.register<UpdateRoleParams, UpdateRoleResult>(
      "updateRole",
      async (params) => {
        return this.kernel.runScript(UpdateRoleScript, params!);
      }
    );
    this.logger.debug("Action iam.updateRole registered");

    this.broker.register<DeleteRoleParams, DeleteRoleResult>(
      "deleteRole",
      async (params) => {
        return this.kernel.runScript(DeleteRoleScript, params!);
      }
    );
    this.logger.debug("Action iam.deleteRole registered");

    this.broker.register<ListRolesParams, ListRolesResult>(
      "listRoles",
      async (params) => {
        return this.kernel.runScript(ListRolesScript, params!);
      }
    );
    this.logger.debug("Action iam.listRoles registered");

    // Register resource registration action
    this.broker.register<RegisterResourcesParams, RegisterResourcesResult>(
      "registerResources",
      async (params) => {
        if (!params?.service || !params.resources) {
          return {
            success: false,
            userErrors: [{ code: "INVALID_PARAMS", message: "service and resources are required" }],
          };
        }
        try {
          await this.kernel.repository.resource.register(params.service, params.resources);
          return { success: true, userErrors: [] };
        } catch (error) {
          return {
            success: false,
            userErrors: [{ code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" }],
          };
        }
      }
    );
    this.logger.debug("Action iam.registerResources registered");

    // Get resources action (for role editor)
    this.broker.register<Record<string, never>, { resources: Array<{ service: string; name: string; displayName?: string; actions: string[] }> }>(
      "getResources",
      async () => {
        const resources = await this.kernel.repository.resource.getAllResources();
        return { resources };
      }
    );
    this.logger.debug("Action iam.getResources registered");

    // Register IAM's own org-level resources
    const iamResources = await getResources();
    await this.kernel.repository.resource.register(
      iamResources.service,
      iamResources.resources.map((r) => ({
        name: r.name,
        displayName: r.displayName,
        actions: r.actions.map((a) => a.name),
      }))
    );
    this.logger.debug("IAM org-level resources registered");

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.logger.debug("GraphQL server started");

    this.logger.log("IAM service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("IAM service stopped");
  }
}
