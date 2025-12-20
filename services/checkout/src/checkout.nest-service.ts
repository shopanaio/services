import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectBroker, ServiceBroker } from '@shopana/shared-kernel';
import { FastifyInstance } from 'fastify';
import 'reflect-metadata';
import { App } from './ioc/container';
import { startServer } from './interfaces/server/server';

@Injectable()
export class CheckoutNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CheckoutNestService.name);
  private app!: App;
  private graphqlServer!: FastifyInstance;

  constructor(@InjectBroker('checkout') private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.app = App.create(this.broker as any);

    this.broker.register('getById', async (params: any) => {
      return this.app.checkoutUsecase.getCheckoutDtoById.execute(params);
    });

    this.broker.register('getCheckoutById', async (params: any) => {
      return this.app.checkoutUsecase.getCheckoutById.execute(params);
    });

    this.graphqlServer = await startServer(this.broker as any);
    this.logger.log('Checkout service started');
  }

  async onModuleDestroy() {
    if (this.graphqlServer) await this.graphqlServer.close();
    this.logger.log('Checkout service stopped');
  }
}
