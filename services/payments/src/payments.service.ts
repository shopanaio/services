import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kernel, InjectBroker, ServiceBroker, NestLogger } from '@shopana/shared-kernel';
import {
  paymentMethods,
  type GetPaymentMethodsParams,
  type GetPaymentMethodsResult,
} from './scripts/paymentMethods';

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private kernel!: Kernel;

  constructor(@InjectBroker('payments') private readonly broker: ServiceBroker) {}

  onModuleInit() {
    this.kernel = new Kernel(this.broker, new NestLogger(this.logger));

    this.broker.register<GetPaymentMethodsParams, GetPaymentMethodsResult>(
      'getPaymentMethods',
      (params) => this.kernel.executeScript(paymentMethods, params!),
    );

    this.logger.log('Payments service started');
  }

  async onModuleDestroy() {
    this.logger.log('Payments service stopped');
  }
}
