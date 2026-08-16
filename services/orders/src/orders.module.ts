import { Module } from '@nestjs/common';
import { BrokerModule, DATABASE_CLIENT, type DatabaseClient } from '@shopana/shared-kernel';
import { OrdersNestService } from './orders.nest-service';
import { createDatabase } from './infrastructure/db/database.js';
import { Repository } from './repositories/Repository.js';
import {
  PublishOrderLoyaltyRewardEligibleWorkflow,
  PublishOrderLoyaltyRewardReversedWorkflow,
} from './workflows/LoyaltyRewardWorkflows.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'order' })],
  providers: [
    {
      provide: Repository,
      inject: [DATABASE_CLIENT],
      useFactory: (client: DatabaseClient) => Repository.create({ db: createDatabase(client) }),
    },
    OrdersNestService,
    PublishOrderLoyaltyRewardEligibleWorkflow,
    PublishOrderLoyaltyRewardReversedWorkflow,
  ],
  exports: [Repository],
})
export class OrdersModule {}
