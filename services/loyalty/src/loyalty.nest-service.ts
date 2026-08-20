import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import {
  DATABASE_CLIENT,
  InjectBroker,
  ServiceBroker,
  type DatabaseClient,
  WORKFLOW_REGISTRY,
  WorkflowRegistry,
} from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server.js";
import { startStorefrontServer } from "./api/graphql-storefront/server.js";
import { Kernel } from "./kernel/Kernel.js";

const { service } = getServiceConfig("loyalty");

@Injectable()
export class LoyaltyNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoyaltyNestService.name);
  private kernel: Kernel | null = null;
  private adminGraphqlServer: FastifyInstance | null = null;
  private storefrontGraphqlServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker("loyalty") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.debug("Loyalty onModuleInit started");

    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient);
    this.logger.debug("Kernel created");

    this.adminGraphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.storefrontGraphqlServer = await startStorefrontServer({
      port: service.ports?.storefront_graphql ?? 0,
    });

    this.logger.log("Loyalty service started");
  }

  async onModuleDestroy(): Promise<void> {
    if (this.adminGraphqlServer) {
      await this.adminGraphqlServer.close();
    }
    if (this.storefrontGraphqlServer) {
      await this.storefrontGraphqlServer.close();
    }
    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("Loyalty service stopped");
  }
}
