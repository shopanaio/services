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
} from "@shopana/shared-kernel";
import { WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/shared-kernel";
import {
  getServiceConfig,
  buildS3Config,
} from "@shopana/shared-service-config";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server";
import { Kernel } from "./kernel/Kernel";

const { service } = getServiceConfig("catalog");
import { InventoryObjectStorage } from "./storage";

@Injectable()
export class CatalogNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CatalogNestService.name);
  private kernel!: Kernel;
  private storageGateway!: InventoryObjectStorage;
  private graphqlServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker("catalog") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient
  ) {}

  async onModuleInit() {
    this.logger.debug("Catalog onModuleInit started");

    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient);
    this.logger.debug("Kernel created");

    const storageConfig = service.s3 ? buildS3Config(service.s3) : null;
    this.storageGateway = new InventoryObjectStorage(
      storageConfig
        ? {
            endpoint: storageConfig.endpoint,
            accessKey: storageConfig.credentials.accessKeyId,
            secretKey: storageConfig.credentials.secretAccessKey,
            bucket: storageConfig.bucket,
            region: storageConfig.region,
            pathStyle: storageConfig.forcePathStyle,
          }
        : null!
    );

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.logger.debug("GraphQL server started");

    this.logger.log("Catalog service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("Catalog service stopped");
  }
}
