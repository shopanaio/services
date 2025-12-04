import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kernel, SERVICE_BROKER, ServiceBroker, NestLogger } from '@shopana/shared-kernel';
import { createDeliveryGroups, type CreateDeliveryGroupsParams, type CreateDeliveryGroupsResult } from './scripts/createDeliveryGroups';
import { shippingMethods, type GetShippingMethodsParams, type GetShippingMethodsResult } from './scripts/shippingMethods';

@Injectable()
export class DeliveryNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeliveryNestService.name);
  private kernel!: Kernel;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  onModuleInit() {
    this.kernel = new Kernel(this.broker, new NestLogger(this.logger));

    this.broker.register<GetShippingMethodsParams, GetShippingMethodsResult>(
      'shippingMethods', (params) => this.kernel.executeScript(shippingMethods, params!),
    );
    this.broker.register<CreateDeliveryGroupsParams, CreateDeliveryGroupsResult>(
      'createDeliveryGroups', (params) => this.kernel.executeScript(createDeliveryGroups, params!),
    );

    this.logger.log('Delivery service started');
  }

  async onModuleDestroy() {
    this.logger.log('Delivery service stopped');
  }
}
