import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectBroker, ServiceBroker } from "@shopana/shared-kernel";
import type { FastifyInstance } from "fastify";
import { Kernel } from "./kernel/Kernel.js";
import { startServer } from "@src/api/graphql-admin/server.js";
import { getServiceConfig } from "@shopana/shared-service-config";
import { GetCurrentUserScript } from "./scripts/user/GetCurrentUserScript.js";
import { ProvisionTenantScript } from "./scripts/organization/ProvisionTenantScript.js";
import { AuthorizeScript } from "./scripts/organization/AuthorizeScript.js";
import type { ProvisionTenantResult } from "./scripts/organization/dto/ProvisionTenantDto.js";
import type { AuthorizeResult } from "./scripts/organization/dto/AuthorizeDto.js";

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

    // Register broker actions for inter-service communication
    this.registerBrokerActions();

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.logger.debug("GraphQL server started");
  }

  private registerBrokerActions() {
    // Action: getCurrentUser - validates token and returns user info
    this.broker.register<{ accessToken: string }, {
      user: { id: string; name: string; email?: string } | null;
      userErrors: Array<{ code: string; message: string }>;
    }>("getCurrentUser", async (params) => {
      if (!params?.accessToken) {
        return {
          user: null,
          userErrors: [{ code: "MISSING_TOKEN", message: "Access token is required" }],
        };
      }

      const result = await this.kernel.runScript(GetCurrentUserScript, {
        accessToken: params.accessToken,
      });

      return {
        user: result.user ? {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        } : null,
        userErrors: result.userErrors,
      };
    });

    // Action: provisionTenant - creates new organization with owner role for user
    this.broker.register<{ ownerId: string }, ProvisionTenantResult>(
      "provisionTenant",
      async (params) => {
        if (!params?.ownerId) {
          return {
            organizationId: null,
            roles: [],
            userErrors: [{ code: "MISSING_OWNER", message: "ownerId is required" }],
          };
        }

        return this.kernel.runScript(ProvisionTenantScript, {
          ownerId: params.ownerId,
        });
      }
    );

    // Action: authorize - checks if user has permission for action on resource
    this.broker.register<{
      userId: string;
      organizationId: string;
      resource: string;
      action: string;
      resourceId?: string;
      resourceOwnerId?: string;
    }, AuthorizeResult>("authorize", async (params) => {
      if (!params?.userId || !params?.organizationId || !params?.resource || !params?.action) {
        return {
          allowed: false,
          deniedReason: "Missing required parameters",
        };
      }

      return this.kernel.runScript(AuthorizeScript, {
        userId: params.userId,
        organizationId: params.organizationId,
        resource: params.resource,
        action: params.action,
        resourceId: params.resourceId,
        resourceOwnerId: params.resourceOwnerId,
      });
    });

    this.logger.debug("Broker actions registered: getCurrentUser, provisionTenant, authorize");
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
