import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { CheckoutNestService } from './checkout.nest-service';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'checkout' })],
  providers: [CheckoutNestService],
})
export class CheckoutModule {}
