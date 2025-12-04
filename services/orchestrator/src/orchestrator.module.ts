import { Module } from '@nestjs/common';
import { BrokerCoreModule, BrokerCoreModuleOptions } from '@shopana/shared-kernel';
import { PaymentsModule } from '@shopana/payments-service';
import { InventoryModule } from '@shopana/inventory-service';
import { AppsModule } from '@shopana/apps-service';
import { MediaModule } from '@shopana/media-service';
import { CheckoutModule } from '@shopana/checkout-service';
import { DeliveryModule } from '@shopana/delivery-service';
import { OrdersModule } from '@shopana/orders-service';
import { PricingModule } from '@shopana/pricing-service';

/**
 * OrchestratorModule is the root module for the NestJS application.
 * It imports BrokerCoreModule.forRoot() with the resolved configuration
 * and all migrated service modules.
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
        PaymentsModule,
        InventoryModule,
        AppsModule,
        MediaModule,
        CheckoutModule,
        DeliveryModule,
        OrdersModule,
        PricingModule,
      ],
    })
    class DynamicOrchestratorModule {}

    return DynamicOrchestratorModule as unknown as typeof OrchestratorModule;
  }
}
