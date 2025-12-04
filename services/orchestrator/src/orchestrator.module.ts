import { Module } from '@nestjs/common';
import { BrokerCoreModule, BrokerCoreModuleOptions } from '@shopana/shared-kernel';

/**
 * OrchestratorModule is the root module for the NestJS application.
 * It imports BrokerCoreModule.forRoot() with the resolved configuration
 * and will import all service modules (payments, inventory, etc.).
 *
 * Configuration is resolved synchronously before NestFactory.createApplicationContext()
 * in main.ts, then passed to this module via forRoot().
 */
@Module({})
export class OrchestratorModule {
  static forRoot(options: BrokerCoreModuleOptions): typeof OrchestratorModule {
    @Module({
      imports: [
        BrokerCoreModule.forRoot(options),
        // Service modules will be added here as they are migrated:
        // PaymentsModule,
        // InventoryModule,
        // AppsModule,
        // MediaModule,
        // CheckoutModule,
        // DeliveryModule,
        // OrdersModule,
        // PricingModule,
      ],
    })
    class DynamicOrchestratorModule {}

    return DynamicOrchestratorModule as unknown as typeof OrchestratorModule;
  }
}
