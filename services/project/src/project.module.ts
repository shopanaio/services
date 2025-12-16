import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { ProjectNestService } from './project.nest-service.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'project' })],
  providers: [ProjectNestService],
})
export class ProjectModule {}
