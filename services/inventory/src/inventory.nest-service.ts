import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Kernel, SERVICE_BROKER, ServiceBroker, NestLogger } from '@shopana/shared-kernel';
import type { FastifyInstance } from 'fastify';
import type { InventoryUpdateTask } from '@shopana/import-plugin-sdk';
import { assertInventoryUpdateTask } from '@shopana/import-plugin-sdk';
import { getOffers, type GetOffersParams, type GetOffersResult } from './scripts/getOffers';
import { processInventoryUpdate } from './processInventoryUpdate';
import { config } from './config';
import { InventoryObjectStorage } from './storage';
import { createApolloServer } from './api/graphql-admin/server';
import type { ProductUpdatedEvent, StockChangedEvent } from './inventory.events';

export interface EmitTestEventParams {
  eventType: 'product.updated' | 'stock.changed';
  payload: ProductUpdatedEvent | StockChangedEvent;
}

@Injectable()
export class InventoryNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryNestService.name);
  private kernel!: Kernel;
  private storageGateway!: InventoryObjectStorage;
  private graphqlServer: FastifyInstance | null = null;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.kernel = new Kernel(this.broker, new NestLogger(this.logger));
    this.storageGateway = new InventoryObjectStorage(config.storage);

    this.broker.register<GetOffersParams, GetOffersResult>(
      'getOffers',
      (params) => this.kernel.executeScript(getOffers, params!),
    );

    // Test action: emit events via RabbitMQ
    this.broker.register<EmitTestEventParams, { success: boolean; message: string }>(
      'emitTestEvent',
      async (params) => {
        if (!params) {
          return { success: false, message: 'Missing params' };
        }

        await this.broker.emit(params.eventType, params.payload);
        this.logger.log(`Emitted test event: ${params.eventType}`);
        return { success: true, message: `Event ${params.eventType} emitted` };
      },
    );

    // Quick test action to verify RabbitMQ is working
    this.broker.register('pingRabbit', async () => {
      const health = this.broker.getHealth();
      if (health.connected) {
        await this.broker.emit('inventory.ping', { timestamp: new Date().toISOString() });
        return { status: 'ok', message: 'RabbitMQ connected, ping event emitted' };
      }
      return { status: 'disconnected', message: 'RabbitMQ not connected' };
    });

    const serverConfig = { port: config.port, grpcHost: config.platformGrpcHost };
    this.graphqlServer = await createApolloServer(serverConfig);

    const address = await this.graphqlServer.listen({ port: config.port, host: '0.0.0.0' });
    this.logger.log(`Inventory GraphQL Admin API running at ${address}/graphql/admin`);
    this.logger.log('Inventory service started');
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }
    this.logger.log('Inventory service stopped');
  }

  @RabbitSubscribe({
    exchange: 'shopana.events',
    routingKey: 'inventory.update.request',
    queue: 'inventory.update.request',
  })
  async handleInventoryUpdate(payload: InventoryUpdateTask) {
    assertInventoryUpdateTask(payload);
    await processInventoryUpdate({ logger: this.logger, storageGateway: this.storageGateway }, payload);
  }
}
