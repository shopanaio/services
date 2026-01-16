import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { MediaBrokerActions } from './MediaBrokerActions';
import { MediaNestService } from './media.nest-service';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'media' })],
  providers: [MediaBrokerActions, MediaNestService],
})
export class MediaModule {}
