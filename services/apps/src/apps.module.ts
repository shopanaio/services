import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { AppsNestService } from './apps.nest-service';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'apps' })],
  providers: [AppsNestService],
})
export class AppsModule {}
