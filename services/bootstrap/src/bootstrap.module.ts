import { Module } from "@nestjs/common";
import {
  BrokerCoreModule,
  BrokerCoreModuleOptions,
  DatabaseModule,
  WorkflowModule,
  type DatabaseModuleOptions,
} from "@shopana/shared-kernel";
import { PaymentsModule } from "@shopana/payments-service";
import { AppsModule } from "@shopana/apps-service";
import { MediaModule } from "@shopana/media-service";
import { CheckoutModule } from "@shopana/checkout-service";
import { DeliveryModule } from "@shopana/delivery-service";
import { OrdersModule } from "@shopana/orders-service";
import { PricingModule } from "@shopana/pricing-service";
import { ProjectModule } from "@shopana/project-service";
import { IamModule } from "@shopana/iam-service";
import { EventsModule } from "@shopana/events-service";
import { CatalogModule } from "@shopana/catalog-service";

export interface BootstrapModuleOptions extends BrokerCoreModuleOptions {
  /** DBOS workflows configuration */
  workflows?: {
    databaseUrl: string;
    name?: string;
  };
  /** Shared database pool configuration */
  database: DatabaseModuleOptions;
}

/**
 * BootstrapModule is the composition root for the NestJS application.
 * It imports BrokerCoreModule.forRoot() with the resolved configuration
 * and all service modules.
 *
 * Configuration is resolved synchronously before NestFactory.createApplicationContext()
 * in main.ts, then passed to this module via forRoot().
 */
@Module({})
export class BootstrapModule {
  static forRoot(options: BootstrapModuleOptions): typeof BootstrapModule {
    const imports = [
      // Shared database pool - available to all services
      DatabaseModule.forRoot(options.database),
      BrokerCoreModule.forRoot(options),
      PaymentsModule,
      EventsModule,
      AppsModule,
      MediaModule,
      CheckoutModule,
      DeliveryModule,
      OrdersModule,
      PricingModule,
      ProjectModule,
      IamModule,
      CatalogModule,
    ];

    // Add WorkflowModule if workflows config is provided
    if (options.workflows) {
      imports.unshift(
        WorkflowModule.forRoot({
          databaseUrl: options.workflows.databaseUrl,
          name: options.workflows.name ?? "shopana",
        })
      );
    }

    @Module({ imports })
    class DynamicBootstrapModule {}

    return DynamicBootstrapModule as unknown as typeof BootstrapModule;
  }
}
