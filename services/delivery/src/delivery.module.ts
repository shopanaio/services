import { Module } from '@nestjs/common';
import { BrokerModule, DATABASE_CLIENT, getBrokerToken, type DatabaseClient, type ServiceBroker } from '@shopana/shared-kernel';
import { createDatabase } from './infrastructure/db/database.js';
import { Repository } from './repositories/Repository.js';
import { BrokerDeliveryCheckoutFactsAdapter } from './infrastructure/catalog/BrokerDeliveryCheckoutFactsAdapter.js';
import { BrokerDeliveryProviderAppsAdapter } from './infrastructure/apps/BrokerDeliveryProviderAppsAdapter.js';
import { DeliveryCheckoutService } from './application/checkout/DeliveryCheckoutService.js';
import { DeliverySelectionCommitService } from './application/checkout/DeliverySelectionCommitService.js';
import { DELIVERY_CHECKOUT_FACTS, DELIVERY_FULFILLMENT, DELIVERY_PROVIDER_APPS } from './application/tokens.js';
import { DeliveryCheckoutActions } from './api/broker/DeliveryCheckoutActions.js';
import { DeliveryCustomizationRunner } from './application/customization/DeliveryCustomizationRunner.js';
import { DeliveryProviderAccountService } from './application/providers/DeliveryProviderAccountService.js';
import { DeliveryProviderAccountActions } from './api/broker/DeliveryProviderAccountActions.js';
import { DeliveryConfigurationActions } from './api/broker/DeliveryConfigurationActions.js';
import { DeliveryExpiryCleanup } from './infrastructure/persistence/DeliveryExpiryCleanup.js';
import { BrokerDeliveryFulfillmentAdapter } from './infrastructure/orders/BrokerDeliveryFulfillmentAdapter.js';
import { BrokerDeliveryProviderAssetsAdapter } from './infrastructure/media/BrokerDeliveryProviderAssetsAdapter.js';
import { DeliveryProviderAssetPolicyService } from './application/shipments/DeliveryProviderAssetPolicyService.js';
import { DeliveryProviderObservationNormalizer } from './application/shipments/DeliveryProviderObservationNormalizer.js';
import { DeliveryShipmentTransitionPolicy } from './domain/DeliveryShipmentTransitionPolicy.js';
import { DeliveryShipmentService } from './application/shipments/DeliveryShipmentService.js';
import { DeliveryShipmentActions } from './api/broker/DeliveryShipmentActions.js';
import { CreateDeliveryShipmentWorkflow, CancelDeliveryShipmentWorkflow, ReconcileDeliveryShipmentWorkflow } from './workflows/DeliveryShipmentWorkflows.js';
import { ConfigureDeliveryProviderAccountWorkflow } from './workflows/ConfigureDeliveryProviderAccountWorkflow.js';
import { DeliveryShipmentOutboxWorkflow } from './workflows/DeliveryShipmentOutboxWorkflow.js';

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
      provide: DELIVERY_FULFILLMENT,
      inject: [getBrokerToken('delivery')],
      useFactory: (broker: ServiceBroker) => new BrokerDeliveryFulfillmentAdapter(broker),
    },
    {
      provide: BrokerDeliveryProviderAssetsAdapter,
      inject: [getBrokerToken('delivery')],
      useFactory: (broker: ServiceBroker) => new BrokerDeliveryProviderAssetsAdapter(broker),
    },
    {
      provide: DeliveryProviderAssetPolicyService,
      inject: [Repository],
      useFactory: (repository: Repository) => new DeliveryProviderAssetPolicyService(repository.providerAccounts),
    },
    DeliveryShipmentTransitionPolicy,
    {
      provide: DeliveryProviderObservationNormalizer,
      inject: [DeliveryProviderAssetPolicyService, BrokerDeliveryProviderAssetsAdapter],
      useFactory: (policies: DeliveryProviderAssetPolicyService, assets: BrokerDeliveryProviderAssetsAdapter) => new DeliveryProviderObservationNormalizer({ policies, assets }),
    },
    {
      provide: DeliveryShipmentService,
      inject: [Repository, DELIVERY_FULFILLMENT, DELIVERY_PROVIDER_APPS, DeliveryShipmentTransitionPolicy, DeliveryProviderObservationNormalizer],
      useFactory: (repository: Repository, fulfillment: BrokerDeliveryFulfillmentAdapter, apps: BrokerDeliveryProviderAppsAdapter, transitions: DeliveryShipmentTransitionPolicy, normalizer: DeliveryProviderObservationNormalizer) => new DeliveryShipmentService({ repository, fulfillment, apps, transitions, normalizer }),
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
    {
      provide: DeliverySelectionCommitService,
      inject: [Repository, DELIVERY_PROVIDER_APPS],
      useFactory: (repository: Repository, apps: BrokerDeliveryProviderAppsAdapter) => new DeliverySelectionCommitService({
        bindings: repository.optionBindings,
        providerAccounts: repository.providerAccounts,
        apps,
      }),
    },
    {
      provide: DeliveryCheckoutActions,
      inject: [getBrokerToken('delivery'), DeliveryCheckoutService, DeliverySelectionCommitService],
      useFactory: (broker: ServiceBroker, checkout: DeliveryCheckoutService, commitments: DeliverySelectionCommitService) =>
        new DeliveryCheckoutActions(broker, checkout, commitments),
    },
    {
      provide: DeliveryProviderAccountService,
      inject: [Repository, DELIVERY_PROVIDER_APPS],
      useFactory: (repository: Repository, apps: BrokerDeliveryProviderAppsAdapter) => new DeliveryProviderAccountService(repository, apps),
    },
    {
      provide: DeliveryProviderAccountActions,
      inject: [getBrokerToken('delivery'), DeliveryProviderAccountService, Repository],
      useFactory: (broker: ServiceBroker, accounts: DeliveryProviderAccountService, repository: Repository) =>
        new DeliveryProviderAccountActions(broker, accounts, repository),
    },
    {
      provide: DeliveryConfigurationActions,
      inject: [getBrokerToken('delivery'), Repository],
      useFactory: (broker: ServiceBroker, repository: Repository) =>
        new DeliveryConfigurationActions(broker, repository),
    },
    DeliveryExpiryCleanup,
    DeliveryShipmentActions,
    CreateDeliveryShipmentWorkflow,
    CancelDeliveryShipmentWorkflow,
    ReconcileDeliveryShipmentWorkflow,
    ConfigureDeliveryProviderAccountWorkflow,
    DeliveryShipmentOutboxWorkflow,
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
