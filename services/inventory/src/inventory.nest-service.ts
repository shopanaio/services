import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { InventoryUpdateTask } from "@shopana/import-plugin-sdk";
import { assertInventoryUpdateTask } from "@shopana/import-plugin-sdk";
import {
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
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
import {
  getOffers,
  type GetOffersParams,
  type GetOffersResult,
} from "./scripts/getOffers";
import { InventoryObjectStorage } from "./storage";

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

  constructor(@InjectBroker('inventory') private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.logger.debug("Inventory onModuleInit started");

    this.kernel = await Kernel.create(this.broker);
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

    this.broker.register<GetOffersParams, GetOffersResult>(
      "getOffers",
      (params) => this.kernel.executeScript(getOffers, params!)
    );

    // Test action: emit events via RabbitMQ
    this.broker.register<
      EmitTestEventParams,
      { success: boolean; message: string }
    >("emitTestEvent", async (params) => {
      if (!params) {
        return { success: false, message: "Missing params" };
      }

      await this.broker.emit(params.eventType, params.payload);
      this.logger.log(`Emitted test event: ${params.eventType}`);
      return { success: true, message: `Event ${params.eventType} emitted` };
    });

    // Quick test action to verify RabbitMQ is working
    this.broker.register("pingRabbit", async () => {
      const health = this.broker.getHealth();
      if (health.connected) {
        await this.broker.emit("inventory.ping", {
          timestamp: new Date().toISOString(),
        });
        return {
          status: "ok",
          message: "RabbitMQ connected, ping event emitted",
        };
      }
      return { status: "disconnected", message: "RabbitMQ not connected" };
    });

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
    });
    this.logger.debug("GraphQL server started");

    this.logger.log("Inventory service started");
  }

  async onModuleDestroy() {
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
