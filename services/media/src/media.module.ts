import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BrokerModule } from '@shopana/shared-kernel';
import { MediaBrokerActions } from './MediaBrokerActions';
import { MediaNestService } from './media.nest-service';
import { FileGarbageCollectorScheduler } from './scheduled/FileGarbageCollectorScheduler';

@Module({
  imports: [
    BrokerModule.forFeature({ serviceName: 'media' }),
    ScheduleModule.forRoot(),
  ],
  providers: [MediaBrokerActions, MediaNestService, FileGarbageCollectorScheduler],
})
export class MediaModule {}
