import { Module } from "@nestjs/common";
import {
  BrokerModule,
  DATABASE_CLIENT,
  DATABASE_CONNECTION_OPTIONS,
  getBrokerToken,
  WORKFLOW_REGISTRY,
  type DatabaseClient,
  type DatabaseConnectionOptions,
  type ServiceBroker,
  type WorkflowRegistry,
} from "@shopana/shared-kernel";
import { CatalogNestService } from "./catalog.nest-service";
import { CatalogBrokerActions } from "./actions";
import { FacetCandidateBrokerActions } from "./actions/FacetCandidateBrokerActions.js";
import { CatalogEventHandlers } from "./handlers";
import { InventoryBrokerActions } from "./actions/InventoryBrokerActions.js";
import { InventoryEventHandlers } from "./handlers/InventoryEventHandlers.js";
import { BackRefNotifySaga, EntityDeletedNotifySaga, ProductCreateSaga } from "./sagas/index.js";
import { workflows } from "./workflows/index.js";
import { Kernel } from "./kernel/Kernel.js";

/**
 * Catalog Service Module.
 * Handles products, variants, categories, tags, options, features.
 * Renamed from Inventory to Catalog.
 */
@Module({
  imports: [BrokerModule.forFeature({ serviceName: "catalog" })],
  providers: [
    CatalogBrokerActions,
    FacetCandidateBrokerActions,
    InventoryBrokerActions,
    {
      provide: Kernel,
      inject: [
        getBrokerToken("catalog"),
        WORKFLOW_REGISTRY,
        DATABASE_CLIENT,
        DATABASE_CONNECTION_OPTIONS,
      ],
      useFactory: (
        broker: ServiceBroker,
        workflow: WorkflowRegistry,
        dbClient: DatabaseClient,
        databaseConnectionOptions: DatabaseConnectionOptions,
      ) => Kernel.create(broker, workflow, dbClient, databaseConnectionOptions),
    },
    CatalogNestService,
    CatalogEventHandlers,
    InventoryEventHandlers,
    BackRefNotifySaga,
    EntityDeletedNotifySaga,
    ProductCreateSaga,
    ...workflows,
  ],
})
export class CatalogModule {}
