import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { UsersNestService } from './users.nest-service.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'users' })],
  providers: [UsersNestService],
})
export class UsersModule {}
