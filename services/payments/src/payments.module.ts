import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { PaymentsService } from './payments.service';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'payments' })],
  providers: [PaymentsService],
})
export class PaymentsModule {}
