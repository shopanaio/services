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
  AttachUserRoleScript,
  type AttachUserRoleParams,
  type AttachUserRoleResult,
  DetachUserRoleScript,
  type DetachUserRoleParams,
  type DetachUserRoleResult,
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
} from "./scripts/index.js";

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
