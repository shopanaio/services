import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { ProjectNestService } from './project.nest-service.js';
import { ProjectBrokerActions } from './ProjectBrokerActions.js';
import { ProjectBrokerWorkflows } from './ProjectBrokerWorkflows.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'project' })],
  providers: [ProjectBrokerActions, ProjectBrokerWorkflows, ProjectNestService],
})
export class ProjectModule {}
