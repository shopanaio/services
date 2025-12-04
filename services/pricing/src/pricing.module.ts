import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { PricingNestService } from './pricing.nest-service';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'pricing' })],
  providers: [PricingNestService],
})
export class PricingModule {}
