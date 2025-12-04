import { DynamicModule, Module } from '@nestjs/common';
import type { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ActionRegistry } from './ActionRegistry';
import { ServiceBroker, type ServiceBrokerOptions } from './ServiceBroker';
import { BROKER_AMQP, SERVICE_BROKER } from './tokens';

export interface BrokerFeatureOptions extends ServiceBrokerOptions {}

@Module({})
export class BrokerModule {
  static forFeature(options: BrokerFeatureOptions): DynamicModule {
    return {
      module: BrokerModule,
      providers: [
        {
          provide: SERVICE_BROKER,
          useFactory: (registry: ActionRegistry, amqp: AmqpConnection | null) =>
            new ServiceBroker(registry, amqp, { serviceName: options.serviceName }),
          inject: [ActionRegistry, BROKER_AMQP],
        },
      ],
      exports: [SERVICE_BROKER],
    };
  }
}
