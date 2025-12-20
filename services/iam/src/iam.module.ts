import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { IamNestService } from './iam.nest-service.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'iam' })],
  providers: [IamNestService],
})
export class IamModule {}
