import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { CatalogNestService } from './inventory.nest-service';
import { CatalogBrokerActions } from './actions';
import { CatalogEventHandlers } from './handlers';
import {
  BackRefNotifySaga,
  EntityDeletedNotifySaga,
  ProductCreateSaga,
} from './sagas/index.js';
import { workflows } from './workflows/index.js';

/**
 * Catalog Service Module.
 * Handles products, variants, categories, tags, options, features.
 * Renamed from Inventory to Catalog.
 */
@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'catalog' })],
  providers: [
    CatalogBrokerActions,
    CatalogNestService,
    CatalogEventHandlers,
    BackRefNotifySaga,
    EntityDeletedNotifySaga,
    ProductCreateSaga,
    ...workflows,
  ],
})
export class CatalogModule {}
