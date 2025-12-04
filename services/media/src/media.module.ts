import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { MediaNestService } from './media.nest-service';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'media' })],
  providers: [MediaNestService],
})
export class MediaModule {}
