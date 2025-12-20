import { Module } from '@nestjs/common';
import {
  ActionRegistry,
  ServiceBroker,
  SERVICE_BROKER,
  BROKER_AMQP,
} from '@shopana/shared-kernel';
import type { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { IamNestService } from './iam.nest-service.js';

@Module({
  providers: [
    {
      provide: SERVICE_BROKER,
      useFactory: (registry: ActionRegistry, amqp: AmqpConnection | null) =>
        new ServiceBroker(registry, amqp, { serviceName: 'iam' }),
      inject: [ActionRegistry, BROKER_AMQP],
    },
    IamNestService,
  ],
})
export class IamModule {}
