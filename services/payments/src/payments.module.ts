import { Module } from "@nestjs/common";
import { BrokerModule, DATABASE_CLIENT, type DatabaseClient, getBrokerToken, type ServiceBroker } from "@shopana/shared-kernel";
import { createPaymentsDatabase } from "./infrastructure/db/database.js";
import { PaymentsRepository } from "./infrastructure/db/repositories.js";
import { BrokerPaymentsProviderAppsAdapter } from "./infrastructure/apps/BrokerPaymentsProviderAppsAdapter.js";
import { BrokerPaymentFunctionRouteResolver } from "./infrastructure/apps/BrokerPaymentFunctionRouteResolver.js";
import { PaymentMethodCustomizationRunner } from "./commerce-functions/PaymentMethodCustomizationRunner.js";
import { PaymentsCheckoutMethodsService } from "./checkout-pipeline/PaymentsCheckoutMethodsService.js";
import { PaymentProviderAccountService } from "./application/PaymentProviderAccountService.js";
import { PaymentMethodCustomizationService } from "./application/PaymentMethodCustomizationService.js";
import { PaymentsActions } from "./infrastructure/broker/PaymentsActions.js";
import { ConfigurePaymentProviderAccountWorkflow } from "./workflows/ConfigurePaymentProviderAccountWorkflow.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "payments" })],
  providers: [
    { provide: PaymentsRepository, inject: [DATABASE_CLIENT], useFactory: (client: DatabaseClient) => new PaymentsRepository(createPaymentsDatabase(client)) },
    { provide: BrokerPaymentsProviderAppsAdapter, inject: [getBrokerToken("payments")], useFactory: (broker: ServiceBroker) => new BrokerPaymentsProviderAppsAdapter(broker) },
    { provide: BrokerPaymentFunctionRouteResolver, inject: [getBrokerToken("payments")], useFactory: (broker: ServiceBroker) => new BrokerPaymentFunctionRouteResolver(broker) },
    { provide: PaymentMethodCustomizationRunner, inject: [getBrokerToken("payments")], useFactory: (broker: ServiceBroker) => new PaymentMethodCustomizationRunner(broker) },
    { provide: PaymentsCheckoutMethodsService, inject: [PaymentsRepository, BrokerPaymentsProviderAppsAdapter, PaymentMethodCustomizationRunner], useFactory: (repository: PaymentsRepository, apps: BrokerPaymentsProviderAppsAdapter, customization: PaymentMethodCustomizationRunner) => new PaymentsCheckoutMethodsService({ accounts: repository.providerAccounts, bindings: repository.methodBindings, apps, customizationBindings: repository.customizationBindings, customization }) },
    { provide: PaymentProviderAccountService, inject: [PaymentsRepository, BrokerPaymentsProviderAppsAdapter], useFactory: (repository: PaymentsRepository, apps: BrokerPaymentsProviderAppsAdapter) => new PaymentProviderAccountService(repository.providerAccounts, apps) },
    { provide: PaymentMethodCustomizationService, inject: [PaymentsRepository, BrokerPaymentFunctionRouteResolver], useFactory: (repository: PaymentsRepository, routes: BrokerPaymentFunctionRouteResolver) => new PaymentMethodCustomizationService({ bindings: repository.customizationBindings, routes }) },
    PaymentsActions,
    ConfigurePaymentProviderAccountWorkflow,
  ],
})
export class PaymentsModule {}

export type * from "./checkout-pipeline/index.js";
export type * from "./contracts/index.js";
