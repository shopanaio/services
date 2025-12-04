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
