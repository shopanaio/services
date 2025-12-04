import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SERVICE_BROKER, ServiceBroker } from '@shopana/shared-kernel';
import { FastifyInstance } from 'fastify';
import 'reflect-metadata';
import { App } from './ioc/container';
import { startServer } from './interfaces/server/server';

@Injectable()
export class OrdersNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersNestService.name);
  private app!: App;
  private graphqlServer!: FastifyInstance;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.app = App.create(this.broker as any);

    this.broker.register('createOrder', async (params: any) => {
      return this.app.orderUsecase.createOrder.execute(params);
    });

    this.broker.register('getOrderById', async (params: any) => {
      return this.app.orderUsecase.getOrderById.execute(params);
    });

    this.graphqlServer = await startServer(this.broker as any);
    this.logger.log('Orders service started');
  }

  async onModuleDestroy() {
    if (this.graphqlServer) await this.graphqlServer.close();
    this.logger.log('Orders service stopped');
  }
}
