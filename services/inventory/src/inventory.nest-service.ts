import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { InventoryUpdateTask } from "@shopana/import-plugin-sdk";
import { assertInventoryUpdateTask } from "@shopana/import-plugin-sdk";
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

const { service } = getServiceConfig("inventory");
import type {
  ProductUpdatedEvent,
  StockChangedEvent,
} from "./inventory.events";
import { processInventoryUpdate } from "./processInventoryUpdate";
import { InventoryObjectStorage } from "./storage";
import {
  BackRefNotifyWorkflow,
  EntityDeletedNotifyWorkflow,
  ProductCreateWorkflow,
} from "./workflows/index.js";

export interface EmitTestEventParams {
  eventType: "product.updated" | "stock.changed";
  payload: ProductUpdatedEvent | StockChangedEvent;
}

@Injectable()
export class InventoryNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryNestService.name);
  private kernel!: Kernel;
  private storageGateway!: InventoryObjectStorage;
  private graphqlServer: FastifyInstance | null = null;

  constructor(
    @InjectBroker("inventory") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient
  ) {}

  async onModuleInit() {
    this.logger.debug("Inventory onModuleInit started");

    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient);
    this.logger.debug("Kernel created");

    const backRefNotifyWorkflow = new BackRefNotifyWorkflow("backRefNotify", {
      kernel: this.kernel,
    });
    const backRefNotifyWorkflowName =
      this.broker.qualifyAction("backRefNotify");
    this.workflow.register(backRefNotifyWorkflowName, {
      instance: backRefNotifyWorkflow,
      metadata: { name: "backRefNotify" },
    });

    const entityDeletedNotifyWorkflow = new EntityDeletedNotifyWorkflow(
      "entityDeletedNotify",
      { kernel: this.kernel }
    );
    const entityDeletedNotifyWorkflowName =
      this.broker.qualifyAction("entityDeletedNotify");
    this.workflow.register(entityDeletedNotifyWorkflowName, {
      instance: entityDeletedNotifyWorkflow,
      metadata: { name: "entityDeletedNotify" },
    });

    const productCreateWorkflow = new ProductCreateWorkflow("productCreate", {
      kernel: this.kernel,
    });
    const productCreateWorkflowName =
      this.broker.qualifyAction("productCreate");
    this.workflow.register(productCreateWorkflowName, {
      instance: productCreateWorkflow,
      metadata: { name: "productCreate" },
    });

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

    this.logger.log("Inventory service started");
  }

  async onModuleDestroy() {
    if (this.workflow) {
      this.workflow.deregister(this.broker.qualifyAction("backRefNotify"));
      this.workflow.deregister(
        this.broker.qualifyAction("entityDeletedNotify")
      );
      this.workflow.deregister(this.broker.qualifyAction("productCreate"));
    }

    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("Inventory service stopped");
  }

  @RabbitSubscribe({
    exchange: "shopana.events",
    routingKey: "inventory.update.request",
    queue: "inventory.update.request",
  })
  async handleInventoryUpdate(payload: InventoryUpdateTask) {
    assertInventoryUpdateTask(payload);
    await processInventoryUpdate(
      { logger: this.logger, storageGateway: this.storageGateway },
      payload
    );
  }
}
