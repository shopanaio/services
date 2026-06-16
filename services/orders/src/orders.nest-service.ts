import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectBroker, ServiceBroker } from '@shopana/shared-kernel';
import 'reflect-metadata';
import { App } from './ioc/container';
import { startServer } from './interfaces/server/server';

@Injectable()
export class OrdersNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersNestService.name);
  private app!: App;
  private servers!: Awaited<ReturnType<typeof startServer>>;

  constructor(@InjectBroker('order') private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.app = App.create(this.broker as any);

    this.broker.register('createOrder', async (params: any) => {
      return this.app.orderUsecase.createOrder.execute(params);
    });

    this.broker.register('getOrderById', async (params: any) => {
      return this.app.orderUsecase.getOrderById.execute(params);
    });

    this.servers = await startServer(this.broker as any);
    this.logger.log('Orders service started');
  }

  async onModuleDestroy() {
    if (this.servers) {
      await Promise.all([
        this.servers.adminApp.close(),
        this.servers.storefrontApp.close(),
      ]);
    }
    this.logger.log('Orders service stopped');
  }
}
