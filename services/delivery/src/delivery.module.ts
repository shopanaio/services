import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { DeliveryNestService } from './delivery.nest-service';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'shipping' })],
  providers: [DeliveryNestService],
})
export class DeliveryModule {}
