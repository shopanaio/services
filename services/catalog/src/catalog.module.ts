import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { InventoryNestService } from './inventory.nest-service';
import { InventoryBrokerActions } from './InventoryBrokerActions';
import { InventoryEventHandlers } from './InventoryEventHandlers';
import {
  BackRefNotifySaga,
  EntityDeletedNotifySaga,
  ProductCreateSaga,
} from './sagas/index.js';
import { workflows } from './workflows/index.js';

/**
 * Catalog Service Module.
 * Handles products, variants, categories, tags, options, features.
 * Note: Internal classes still use "Inventory" naming for compatibility.
 */
@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'catalog' })],
  providers: [
    InventoryBrokerActions,
    InventoryNestService,
    InventoryEventHandlers,
    BackRefNotifySaga,
    EntityDeletedNotifySaga,
    ProductCreateSaga,
    ...workflows,
  ],
})
export class CatalogModule {}
