import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { InventoryNestService } from './inventory.nest-service';
import { InventoryBrokerActions } from './InventoryBrokerActions';
import { InventoryEventHandlers } from './InventoryEventHandlers';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'inventory' })],
  providers: [
    InventoryBrokerActions,
    InventoryNestService,
    InventoryEventHandlers,
  ],
})
export class InventoryModule {}
