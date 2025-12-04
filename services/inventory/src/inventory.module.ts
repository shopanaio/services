import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { InventoryNestService } from './inventory.nest-service';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'inventory' })],
  providers: [InventoryNestService],
})
export class InventoryModule {}
