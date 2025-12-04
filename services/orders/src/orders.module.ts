import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { OrdersNestService } from './orders.nest-service';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'order' })],
  providers: [OrdersNestService],
})
export class OrdersModule {}
