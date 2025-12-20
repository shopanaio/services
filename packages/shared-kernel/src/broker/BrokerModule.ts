import { DynamicModule, Module } from '@nestjs/common';
import type { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ActionRegistry } from './ActionRegistry';
import { ServiceBroker, type ServiceBrokerOptions } from './ServiceBroker';
import { BROKER_AMQP, SERVICE_BROKER, SERVICE_NAME, getBrokerToken } from './tokens';

export interface BrokerFeatureOptions extends ServiceBrokerOptions {}

// Кэш брокеров — один инстанс на serviceName
const brokerInstances = new Map<string, ServiceBroker>();

@Module({})
export class BrokerModule {
  static forFeature(options: BrokerFeatureOptions): DynamicModule {
    const { serviceName } = options;

    // Уникальный токен для этого сервиса
    const brokerToken = getBrokerToken(serviceName);

    // Создаём уникальный класс модуля для каждого serviceName
    @Module({})
    class BrokerFeatureModule {}

    return {
      module: BrokerFeatureModule,
      providers: [
        {
          provide: SERVICE_NAME,
          useValue: serviceName,
        },
        {
          // Уникальный токен - предотвращает конфликты между сервисами
          provide: brokerToken,
          useFactory: (
            registry: ActionRegistry,
            amqp: AmqpConnection | null
          ) => {
            let broker = brokerInstances.get(serviceName);
            if (!broker) {
              broker = new ServiceBroker(registry, amqp, { serviceName });
              brokerInstances.set(serviceName, broker);
            }
            return broker;
          },
          inject: [ActionRegistry, BROKER_AMQP],
        },
        {
          // Алиас для обратной совместимости (deprecated)
          provide: SERVICE_BROKER,
          useExisting: brokerToken,
        },
      ],
      exports: [brokerToken, SERVICE_BROKER, SERVICE_NAME],
    };
  }
}
