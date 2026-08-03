import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
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

const { service } = getServiceConfig("reviews");

@Injectable()
export class ReviewsNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReviewsNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;
  private storefrontGraphqlServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker("reviews") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient
  ) {}

  async onModuleInit() {
    this.logger.debug("Reviews onModuleInit started");

    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient);
    this.logger.debug("Kernel created");

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.storefrontGraphqlServer = await startStorefrontServer({
      port: service.ports?.storefront_graphql ?? 0,
    });
    this.logger.debug("GraphQL servers started");

    this.logger.log("Reviews service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }
    if (this.storefrontGraphqlServer) {
      await this.storefrontGraphqlServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("Reviews service stopped");
  }
}
