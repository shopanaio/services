import {
  DynamicModule,
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
  Optional,
} from '@nestjs/common';
import { AmqpConnection, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ActionRegistry } from './ActionRegistry';
import { BROKER_AMQP } from './tokens';

@Injectable()
class BrokerAmqpLifecycle implements OnApplicationShutdown {
  constructor(
    @Optional()
    @Inject(BROKER_AMQP)
    private readonly amqp: AmqpConnection | null,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.amqp?.managedConnection.close();
  }
}

export interface BrokerCoreModuleOptions {
  rabbitmqUrl?: string;
  prefetch?: number;
}

@Global()
@Module({})
export class BrokerCoreModule {
  static forRoot(options: BrokerCoreModuleOptions): DynamicModule {
    const rabbitStub: DynamicModule = {
      module: class BrokerRabbitStub {},
      providers: [
        {
          provide: AmqpConnection,
          useValue: null,
        },
      ],
      exports: [AmqpConnection],
    };

    const rabbitModule = options.rabbitmqUrl
      ? RabbitMQModule.forRoot(RabbitMQModule, {
          uri: options.rabbitmqUrl,
          connectionInitOptions: { wait: true },
          exchanges: [
            { name: 'shopana.events', type: 'topic', options: { durable: true } },
            { name: 'shopana.broadcast', type: 'topic', options: { durable: true } },
            { name: 'shopana.dlx', type: 'topic', options: { durable: true } },
          ],
          channels: {
            default: { prefetchCount: options.prefetch ?? 20 },
          },
        })
      : rabbitStub;

    return {
      module: BrokerCoreModule,
      imports: [rabbitModule],
      providers: [
        ActionRegistry,
        {
          provide: BROKER_AMQP,
          useExisting: AmqpConnection,
        },
        BrokerAmqpLifecycle,
      ],
      exports: [ActionRegistry, BROKER_AMQP],
    };
  }
}
