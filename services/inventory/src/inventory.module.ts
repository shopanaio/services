import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { InventoryNestService } from './inventory.nest-service';
import { InventoryEventsHandler } from './inventory.events';
import { InventoryBrokerActions } from './InventoryBrokerActions';
import { InventoryEventHandlers } from './InventoryEventHandlers';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'inventory' })],
  providers: [
    InventoryBrokerActions,
    InventoryNestService,
    InventoryEventsHandler,
    InventoryEventHandlers,
  ],
})
export class InventoryModule {}
