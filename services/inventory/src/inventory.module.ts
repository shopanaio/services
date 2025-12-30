import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { InventoryNestService } from './inventory.nest-service';
import { InventoryEventsHandler } from './inventory.events';
import { InventoryBrokerActions } from './InventoryBrokerActions';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'inventory' })],
  providers: [InventoryBrokerActions, InventoryNestService, InventoryEventsHandler],
})
export class InventoryModule {}
