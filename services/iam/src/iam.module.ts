import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { IamNestService } from './iam.nest-service.js';
import { IamBrokerActions } from './IamBrokerActions.js';
import {
  OrganizationCreateWorkflow,
  OrganizationDeleteWorkflow,
  OrganizationUpdateWorkflow,
  UserUpdateProfileWorkflow,
} from './workflows/index.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'iam' })],
  providers: [
    IamBrokerActions,
    OrganizationCreateWorkflow,
    OrganizationDeleteWorkflow,
    OrganizationUpdateWorkflow,
    UserUpdateProfileWorkflow,
    IamNestService,
  ],
})
export class IamModule {}
