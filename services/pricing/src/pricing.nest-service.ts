import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kernel, SERVICE_BROKER, ServiceBroker, NestLogger } from '@shopana/shared-kernel';
import { getAllDiscounts, validateDiscount, evaluateDiscounts } from './scripts/index';

@Injectable()
export class PricingNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PricingNestService.name);
  private kernel!: Kernel;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  onModuleInit() {
    this.kernel = new Kernel(this.broker, new NestLogger(this.logger));

    this.broker.register('getAllDiscounts', (params: any) => this.kernel.executeScript(getAllDiscounts, params));
    this.broker.register('validateDiscount', (params: any) => this.kernel.executeScript(validateDiscount, params));
    this.broker.register('evaluateDiscounts', (params: any) => this.kernel.executeScript(evaluateDiscounts, params));

    this.logger.log('Pricing service started');
  }

  async onModuleDestroy() {
    this.logger.log('Pricing service stopped');
  }
}
