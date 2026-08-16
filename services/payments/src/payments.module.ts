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
import { PaymentLifecycleService } from "./application/PaymentLifecycleService.js";
import { PaymentLifecycleRepository } from "./infrastructure/db/PaymentLifecycleRepository.js";
import { CreatePaymentCollectionWorkflow } from "./workflows/CreatePaymentCollectionWorkflow.js";
import { CreatePaymentSessionWorkflow } from "./workflows/CreatePaymentSessionWorkflow.js";
import { ExpirePaymentSessionWorkflow } from "./workflows/ExpirePaymentSessionWorkflow.js";
import { ExecutePaymentOperationWorkflow } from "./workflows/ExecutePaymentOperationWorkflow.js";
import { PublishPaymentEventsWorkflow } from "./workflows/PublishPaymentEventsWorkflow.js";
import {
  CompleteProviderOperationWorkflow,
  ReportProviderEventWorkflow,
} from "./workflows/ProviderPaymentEventsWorkflows.js";
import { BrokerPaymentSettlementConfirmationAdapter } from "./infrastructure/checkout/BrokerPaymentSettlementConfirmationAdapter.js";
import { MonitorPaymentOperationWorkflow } from "./workflows/MonitorPaymentOperationWorkflow.js";
import { ConfirmPaymentSessionWorkflow } from "./workflows/ConfirmPaymentSessionWorkflow.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "payments" })],
  providers: [
    { provide: PaymentsRepository, inject: [DATABASE_CLIENT], useFactory: (client: DatabaseClient) => new PaymentsRepository(createPaymentsDatabase(client)) },
    { provide: BrokerPaymentsProviderAppsAdapter, inject: [getBrokerToken("payments")], useFactory: (broker: ServiceBroker) => new BrokerPaymentsProviderAppsAdapter(broker) },
    { provide: BrokerPaymentFunctionRouteResolver, inject: [getBrokerToken("payments")], useFactory: (broker: ServiceBroker) => new BrokerPaymentFunctionRouteResolver(broker) },
    { provide: BrokerPaymentSettlementConfirmationAdapter, inject: [getBrokerToken("payments")], useFactory: (broker: ServiceBroker) => new BrokerPaymentSettlementConfirmationAdapter(broker) },
    { provide: PaymentMethodCustomizationRunner, inject: [getBrokerToken("payments")], useFactory: (broker: ServiceBroker) => new PaymentMethodCustomizationRunner(broker) },
    { provide: PaymentsCheckoutMethodsService, inject: [PaymentsRepository, BrokerPaymentsProviderAppsAdapter, PaymentMethodCustomizationRunner], useFactory: (repository: PaymentsRepository, apps: BrokerPaymentsProviderAppsAdapter, customization: PaymentMethodCustomizationRunner) => new PaymentsCheckoutMethodsService({ accounts: repository.providerAccounts, bindings: repository.methodBindings, apps, customizationBindings: repository.customizationBindings, customization }) },
    { provide: PaymentProviderAccountService, inject: [PaymentsRepository, BrokerPaymentsProviderAppsAdapter], useFactory: (repository: PaymentsRepository, apps: BrokerPaymentsProviderAppsAdapter) => new PaymentProviderAccountService(repository.providerAccounts, apps) },
    { provide: PaymentMethodCustomizationService, inject: [PaymentsRepository, BrokerPaymentFunctionRouteResolver], useFactory: (repository: PaymentsRepository, routes: BrokerPaymentFunctionRouteResolver) => new PaymentMethodCustomizationService({ bindings: repository.customizationBindings, routes }) },
    { provide: PaymentLifecycleRepository, inject: [DATABASE_CLIENT], useFactory: (client: DatabaseClient) => new PaymentLifecycleRepository(createPaymentsDatabase(client)) },
    { provide: PaymentLifecycleService, inject: [PaymentLifecycleRepository, PaymentsRepository, BrokerPaymentsProviderAppsAdapter, BrokerPaymentSettlementConfirmationAdapter], useFactory: (repository: PaymentLifecycleRepository, payments: PaymentsRepository, apps: BrokerPaymentsProviderAppsAdapter, settlement: BrokerPaymentSettlementConfirmationAdapter) => new PaymentLifecycleService({ repository, bindings: payments.methodBindings, accounts: payments.providerAccounts, apps, settlement }) },
    PaymentsActions,
    ConfigurePaymentProviderAccountWorkflow,
    CreatePaymentCollectionWorkflow,
    CreatePaymentSessionWorkflow,
    ExpirePaymentSessionWorkflow,
    ExecutePaymentOperationWorkflow,
    PublishPaymentEventsWorkflow,
    CompleteProviderOperationWorkflow,
    ReportProviderEventWorkflow,
    MonitorPaymentOperationWorkflow,
    ConfirmPaymentSessionWorkflow,
  ],
})
export class PaymentsModule {}

export type * from "./checkout-pipeline/index.js";
export type * from "./contracts/index.js";
