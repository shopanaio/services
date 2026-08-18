import { Module } from '@nestjs/common';
import { BrokerModule, DATABASE_CLIENT, type DatabaseClient } from '@shopana/shared-kernel';
import { OrdersNestService } from './orders.nest-service';
import { createDatabase } from './infrastructure/db/database.js';
import { Repository } from './repositories/Repository.js';
import {
  PublishOrderLoyaltyRewardEligibleWorkflow,
  PublishOrderLoyaltyRewardReversedWorkflow,
} from './workflows/LoyaltyRewardWorkflows.js';
import { OrderPaymentEventHandlers } from './handlers/OrderPaymentEventHandlers.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'order' })],
  providers: [
    {
      provide: Repository,
      inject: [DATABASE_CLIENT],
      useFactory: (client: DatabaseClient) => Repository.create({
        db: createDatabase(client as unknown as Parameters<typeof createDatabase>[0]),
      }),
    },
    OrdersNestService,
    PublishOrderLoyaltyRewardEligibleWorkflow,
    PublishOrderLoyaltyRewardReversedWorkflow,
    OrderPaymentEventHandlers,
  ],
  exports: [Repository],
})
export class OrdersModule {}
