import { Module } from '@nestjs/common';
import { BrokerModule, DATABASE_CLIENT, getBrokerToken, type DatabaseClient, type ServiceBroker } from '@shopana/shared-kernel';
import { createDatabase } from './infrastructure/db/database.js';
import { Repository } from './repositories/Repository.js';
import { BrokerDeliveryCheckoutFactsAdapter } from './infrastructure/catalog/BrokerDeliveryCheckoutFactsAdapter.js';
import { BrokerDeliveryProviderAppsAdapter } from './infrastructure/apps/BrokerDeliveryProviderAppsAdapter.js';
import { DeliveryCheckoutService } from './application/checkout/DeliveryCheckoutService.js';
import { DELIVERY_CHECKOUT_FACTS, DELIVERY_PROVIDER_APPS } from './application/tokens.js';
import { DeliveryCheckoutActions } from './api/broker/DeliveryCheckoutActions.js';
import { DeliveryCustomizationRunner } from './application/customization/DeliveryCustomizationRunner.js';
import { DeliveryProviderAccountService } from './application/providers/DeliveryProviderAccountService.js';
import { DeliveryProviderAccountActions } from './api/broker/DeliveryProviderAccountActions.js';
import { DeliveryConfigurationActions } from './api/broker/DeliveryConfigurationActions.js';
import { DeliveryExpiryCleanup } from './infrastructure/persistence/DeliveryExpiryCleanup.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'delivery' })],
  providers: [
    {
      provide: Repository,
      inject: [DATABASE_CLIENT],
      useFactory: (client: DatabaseClient) => Repository.create(createDatabase(client)),
    },
    {
      provide: DELIVERY_CHECKOUT_FACTS,
      inject: [getBrokerToken('delivery')],
      useFactory: (broker: ServiceBroker) => new BrokerDeliveryCheckoutFactsAdapter(broker),
    },
    {
      provide: DELIVERY_PROVIDER_APPS,
      inject: [getBrokerToken('delivery')],
      useFactory: (broker: ServiceBroker) => new BrokerDeliveryProviderAppsAdapter(broker),
    },
    {
      provide: DeliveryCheckoutService,
      inject: [Repository, DELIVERY_CHECKOUT_FACTS, DELIVERY_PROVIDER_APPS, DeliveryCustomizationRunner],
      useFactory: (repository: Repository, facts: BrokerDeliveryCheckoutFactsAdapter, apps: BrokerDeliveryProviderAppsAdapter, customization: DeliveryCustomizationRunner) => new DeliveryCheckoutService({
        facts,
        profiles: repository.profiles,
        assignments: repository.profiles,
        bindings: repository.optionBindings,
        providerAccounts: repository.providerAccounts,
        apps,
        customizationBindings: repository.customizationBindings,
        customization,
        rateCache: repository.rateCache,
        handleSecret: deliveryOptionHandleSecret(),
      }),
    },
    {
      provide: DeliveryCustomizationRunner,
      inject: [getBrokerToken('delivery')],
      useFactory: (broker: ServiceBroker) => new DeliveryCustomizationRunner(broker),
    },
    DeliveryCheckoutActions,
    {
      provide: DeliveryProviderAccountService,
      inject: [Repository, DELIVERY_PROVIDER_APPS],
      useFactory: (repository: Repository, apps: BrokerDeliveryProviderAppsAdapter) => new DeliveryProviderAccountService(repository, apps),
    },
    DeliveryProviderAccountActions,
    DeliveryConfigurationActions,
    DeliveryExpiryCleanup,
  ],
  exports: [Repository],
})
export class DeliveryModule {}

function deliveryOptionHandleSecret(): string {
  const configured = process.env.DELIVERY_OPTION_HANDLE_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('DELIVERY_OPTION_HANDLE_SECRET must contain at least 32 characters');
  return 'development-only-delivery-option-secret';
}

export type * from "./checkout-pipeline/index.js";
export * from "./contracts/index.js";
