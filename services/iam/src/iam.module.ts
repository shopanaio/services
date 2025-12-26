import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { IamNestService } from './iam.nest-service.js';
import { IamBrokerActions } from './IamBrokerActions.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'iam' })],
  providers: [IamBrokerActions, IamNestService],
})
export class IamModule {}
