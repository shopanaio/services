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
  GetCurrentUserScript,
  type GetCurrentUserParams,
  type GetCurrentUserResult,
  ProvisionTenantResult,
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
