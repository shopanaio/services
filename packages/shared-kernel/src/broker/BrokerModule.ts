import { DynamicModule, Module } from '@nestjs/common';
import { ActionRegistry } from './ActionRegistry';
import { ServiceBroker, type ServiceBrokerOptions } from './ServiceBroker';
import { SERVICE_BROKER, SERVICE_NAME, getBrokerToken } from './tokens';
import { WORKFLOW_REGISTRY, type WorkflowRegistry } from '@shopana/dbos';

export interface BrokerFeatureOptions extends ServiceBrokerOptions {}

// Cache brokers — one instance per serviceName
const brokerInstances = new Map<string, ServiceBroker>();

@Module({})
export class BrokerModule {
  static forFeature(options: BrokerFeatureOptions): DynamicModule {
    const { serviceName } = options;

    // Unique token for this service
    const brokerToken = getBrokerToken(serviceName);

    // Create unique module class for each serviceName
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
          // Unique token - prevents conflicts between services
          provide: brokerToken,
          useFactory: (
            registry: ActionRegistry,
            workflowRegistry: WorkflowRegistry | null
          ) => {
            let broker = brokerInstances.get(serviceName);
            if (!broker) {
              broker = new ServiceBroker(
                registry,
                { serviceName },
                workflowRegistry ?? null
              );
              brokerInstances.set(serviceName, broker);
            }
            return broker;
          },
          inject: [
            ActionRegistry,
            { token: WORKFLOW_REGISTRY, optional: true },
          ],
        },
        {
          // Alias for backward compatibility (deprecated)
          provide: SERVICE_BROKER,
          useExisting: brokerToken,
        },
      ],
      exports: [brokerToken, SERVICE_BROKER, SERVICE_NAME],
    };
  }
}
