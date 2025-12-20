import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { SERVICE_BROKER, ServiceBroker } from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import type { FastifyInstance } from "fastify";
import { Kernel } from "./kernel/Kernel.js";
import { startServer } from "./api/graphql-admin/server.js";
import {
  ProvisionTenantScript,
  type ProvisionTenantParams,
} from "./scripts/index.js";

const { service } = getServiceConfig("iam");

interface ProvisionTenantBrokerResult {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

@Injectable()
export class IamNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IamNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.kernel = await Kernel.create(this.broker);

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });

    this.broker.register<ProvisionTenantParams, ProvisionTenantBrokerResult>(
      "provisionTenant",
      async (params) => {
        const result = await this.kernel.runScript(ProvisionTenantScript, params!);

        if (result.userErrors.length > 0) {
          throw new Error(result.userErrors[0].message);
        }

        return {
          tenantId: result.tenantId!,
          clientId: result.clientId!,
          clientSecret: result.clientSecret!,
        };
      }
    );

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
