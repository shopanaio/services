# План миграции на NestJS Modules

## Обзор

Мигрируем сервисы с Moleculer на чистые NestJS-модули с RabbitMQ через `@golevelup/nestjs-rabbitmq`.

- Yarn 4 workspaces остаются, каждая служба — отдельный workspace.
- Все RPC и события идут через RabbitMQ (`AmqpConnection.request` + `createSubscriber`), in-memory вызовы остаются только в unit-тестах/локальном mock.
- Общий `ServiceBroker` прячет детали RabbitMQ, гарантирует автоматическое переподключение благодаря managed channels библиотеки.
- Сборка сервисов — `nest build`, библиотеки — обычный `tsc`.

> Actions (`broker.call`) теперь передаются по RabbitMQ и доступны в любом процессе/инстансе. Тестовый InMemoryBroker ограничен dev-сценарием без RabbitMQ.

## Архитектура после миграции

```
services/
├── packages/
│   └── shared-kernel/
│       └── src/
│           ├── ServiceBroker.ts       RPC + events поверх AmqpConnection
│           ├── BrokerModule.ts        Nest DynamicModule
│           ├── InMemoryBroker.ts      Stub для unit-тестов
│           └── Kernel.ts              без изменений
│
├── services/
│   ├── payments/                      Nest module + service
│   ├── inventory/                     Nest module + GraphQL + events
│   ├── ...                            остальные сервисы
│
└── orchestrator/
    ├── src/main.ts                    Nest bootstrap (Fastify)
    └── src/orchestrator.module.ts     Импортирует BrokerModule + сервисы
```

---

## Фаза 1: Shared Kernel

### 1.1 ServiceBroker

**Файл:** `packages/shared-kernel/src/ServiceBroker.ts`

Основные требования к реализации:

- Не обращаться к `amqp.channel` напрямую — использовать `AmqpConnection.publish`, `request`, `createSubscriber`, чтобы `@golevelup` мог восстановить подписки при реконнекте.
- RPC: `register()` создаёт подписчика через `createSubscriber` и возвращает результат обработчика; `call()` использует `AmqpConnection.request`.
- Events: `emit()`/`on()` работают через `createSubscriber` с durable-очередями + DLX.
- Broadcast: `broadcast()`/`onBroadcast()` используют exclusive-очереди (autoDelete) для fan-out.
- Health: `isHealthy()` читает `amqp.managedConnection.isConnected`.
- Graceful shutdown: `onModuleDestroy()` вызывает `amqp.managedConnection.close()` и ждёт завершения pending RPC.

```typescript
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AmqpConnection, RabbitSubscribeHandler } from '@golevelup/nestjs-rabbitmq';
import { randomUUID } from 'node:crypto';

@Injectable()
export class ServiceBroker implements OnModuleDestroy {
  constructor(
    private readonly amqp: AmqpConnection,
    private readonly options: ServiceBrokerOptions,
  ) {}

  async register<TParams, TResult>(
    action: string,
    handler: ActionHandler<TParams, TResult>,
  ): Promise<void> {
    await this.amqp.createSubscriber(
      async (payload: RpcEnvelope<TParams>) => {
        const result = await handler(payload.params, payload.meta);
        return { data: result, meta: payload.meta };
      },
      {
        exchange: 'shopana.rpc',
        routingKey: action,
        queue: `shopana.rpc.${action}`,
        queueOptions: { durable: true, deadLetterExchange: 'shopana.dlx' },
      },
    );
  }

  call<TResponse = unknown, TParams = unknown>(
    action: string,
    params?: TParams,
    options?: CallOptions,
  ): Promise<TResponse> {
    const correlationId = options?.correlationId ?? randomUUID();
    return this.amqp.request<TResponse>({
      exchange: 'shopana.rpc',
      routingKey: action,
      payload: { params, meta: { correlationId } },
      timeout: options?.timeoutMs ?? 10_000,
      headers: { 'x-trace-id': correlationId },
    });
  }

  async emit(event: string, payload?: unknown, meta: MessageMeta = {}): Promise<void> {
    await this.amqp.publish('shopana.events', event, payload ?? {}, {
      persistent: true,
      headers: this.buildHeaders(meta),
    });
  }

  async on(event: string, handler: EventHandler): Promise<void> {
    await this.amqp.createSubscriber(
      async (payload, message) => handler(payload, this.buildContext(message)),
      {
        exchange: 'shopana.events',
        routingKey: event,
        queue: `shopana.events.${event}`,
        queueOptions: {
          durable: true,
          deadLetterExchange: 'shopana.dlx',
          deadLetterRoutingKey: `events.${event}`,
        },
      },
    );
  }

  async broadcast(event: string, payload?: unknown, meta: MessageMeta = {}): Promise<void> {
    await this.amqp.publish('shopana.broadcast', event, payload ?? {}, {
      headers: this.buildHeaders(meta),
    });
  }

  async onBroadcast(event: string, handler: EventHandler): Promise<void> {
    await this.amqp.createSubscriber(
      async (payload, message) => handler(payload, this.buildContext(message)),
      {
        exchange: 'shopana.broadcast',
        routingKey: event,
        queue: `shopana.broadcast.${this.options.serviceName}.${event}.${randomUUID()}`,
        queueOptions: { exclusive: true, durable: false, autoDelete: true },
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.amqp.managedConnection.close();
  }

  private buildHeaders(meta: MessageMeta) {
    return {
      'x-trace-id': meta.traceId ?? randomUUID(),
      'x-source-service': this.options.serviceName,
      ...meta.headers,
    };
  }
}
```

### 1.2 InMemoryBroker (dev/test)

**Файл:** `packages/shared-kernel/src/InMemoryBroker.ts`

Упрощённая версия, которая хранит action/event-хендлеры в Maps. Используется в unit-тестах и в dev окружении без RabbitMQ (задаётся через опцию BrokerModule). По умолчанию рабочие окружения всегда поднимаются с RabbitMQ.

### 1.3 BrokerModule

**Файл:** `packages/shared-kernel/src/BrokerModule.ts`

- `forRoot` и `forRootAsync` подключают `RabbitMQModule`.
- Конфигурация RabbitMQ: exchanges `shopana.rpc`, `shopana.events`, `shopana.broadcast`, `shopana.dlx`.
- Настройка `channels.default.prefetchCount` по параметру.
- Если `rabbitmqUrl` не передан, модуль экспортирует `InMemoryBroker`.

```typescript
import { Module, DynamicModule, Global } from '@nestjs/common';
import { RabbitMQModule, AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Global()
@Module({})
export class BrokerModule {
  static forRoot(options: BrokerModuleOptions): DynamicModule {
    const rabbitImports = options.rabbitmqUrl
      ? [
          RabbitMQModule.forRoot(RabbitMQModule, {
            uri: options.rabbitmqUrl,
            connectionInitOptions: { wait: true },
            exchanges: [
              { name: 'shopana.rpc', type: 'topic' },
              { name: 'shopana.events', type: 'topic' },
              { name: 'shopana.broadcast', type: 'topic' },
              { name: 'shopana.dlx', type: 'topic' },
            ],
            channels: { default: { prefetchCount: options.prefetch ?? 20 } },
          }),
        ]
      : [];

    return {
      module: BrokerModule,
      imports: rabbitImports,
      providers: [
        {
          provide: SERVICE_BROKER,
          useFactory: (conn?: AmqpConnection) =>
            conn
              ? new ServiceBroker(conn, { serviceName: options.serviceName })
              : new InMemoryBroker(options.serviceName),
          inject: options.rabbitmqUrl ? [AmqpConnection] : [],
        },
      ],
      exports: [SERVICE_BROKER],
    };
  }
}
```

### 1.4 Kernel

`packages/shared-kernel/src/Kernel.ts` остаётся неизменным (Microkernel pattern). Сервисы могут расширять Kernel дополнительными зависимостями.

### 1.5 Exports и зависимости

- `packages/shared-kernel/src/index.ts` экспортирует `ServiceBroker`, `InMemoryBroker`, `BrokerModule`, `Kernel`, типы.
- `packages/shared-kernel/package.json`:
  - `"build": "tsc -p tsconfig.build.json"` — чистый TypeScript.
  - Зависимости: `@golevelup/nestjs-rabbitmq`, `@nestjs/common`.
  - devDeps: `typescript`, `@types/node`.

---

## Фаза 2: миграция сервисов

### Общие правила

1. Каждый сервис — Nest-модуль (`xxx.module.ts`) + сервис (`xxx.service.ts`).
2. В `providers` регистрируем класс сервиса, который в `onModuleInit`:
   - инжектирует `SERVICE_BROKER`;
   - регистрирует RPC (`await broker.register(...)`);
   - подписывается на события (`await broker.on(...)`, `await broker.onBroadcast(...)`);
   - запускает GraphQL/HTTP серверы при необходимости.
3. Вызовы других сервисов используют `await broker.call('service.action', params);`.
4. Все файлы `service.ts` Moleculer и esbuild-конфиги удаляются.

### Пример: payments

```typescript
import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Kernel, SERVICE_BROKER, ServiceBroker } from '@shopana/shared-kernel';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private kernel!: Kernel;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit(): Promise<void> {
    this.kernel = new Kernel(this.broker, this.logger);

    await this.broker.register('payments.getPaymentMethods', (params) =>
      this.kernel.executeScript(paymentMethods, params),
    );
  }
}
```

### Пример: inventory (events + GraphQL)

- Расширенный Kernel получает `repository`.
- `broker.on('inventory.update.request', handler)` обрабатывает задачи через RabbitMQ.
- GraphQL сервер запускается через Fastify, как раньше, но бандл собирается Nest CLI.

Остальные сервисы (pricing, delivery, media, apps) следуют той же схеме.

---

## Фаза 3: Orchestrator

1. `services/orchestrator/src/orchestrator.module.ts` импортирует `BrokerModule.forRootAsync`, который тянет конфиг из `@shopana/shared-service-config`.
2. Модуль также импортирует Nest-модули всех сервисов (`PaymentsModule`, `InventoryModule`, ...).
3. `main.ts`:
   - `NestFactory.create<NestFastifyApplication>(OrchestratorModule, new FastifyAdapter())`;
   - `app.enableShutdownHooks()` для graceful shutdown RabbitMQ.
   - Листы health-эндпоинтов служат orchestrator'у.
4. `package.json` orchestrator:
   - зависимости — только workspace-пакеты + Nest core.
   - скрипты: `build`, `dev`, `start`.

---

## Фаза 4: Удаление Moleculer

1. Во всех `services/*`:
   - удалить `src/service.ts`, `esbuild.js`, `loader.js`.
   - удалить ссылки на `moleculer` в `package.json`.
2. В `packages/shared-kernel` удалить `MoleculerLogger.ts`, `nestjs/NestBroker.ts`, `nestjs/ServiceSchemaAdapter.ts`.
3. В корне: `yarn remove moleculer @types/moleculer moleculer-repl nats`.

---

## Checklist

### Shared kernel
- [ ] Реализовать `ServiceBroker` через `AmqpConnection`.
- [ ] Добавить `InMemoryBroker` и обновить `BrokerModule`.
- [ ] Обновить `index.ts`, `package.json`, `tsconfig`.

### Сервисы
- [ ] Перенести payments, pricing, delivery, media, inventory, apps на Nest-модули.
- [ ] Переписать RPC/события на `broker.register`/`broker.on`.
- [ ] Обновить `package.json`, `tsconfig.json`, `nest-cli.json` в каждом сервисе.

### Orchestrator
- [ ] Создать `orchestrator.module.ts` + `main.ts`.
- [ ] Настроить Workspace зависимости и build-скрипты.

### Очистка
- [ ] Удалить Moleculer-файлы и зависимости.
- [ ] Настроить ESLint/tsconfig на NodeNext (если ещё не сделано).

### Тестирование
- [ ] `yarn workspaces foreach -A --topological run build`.
- [ ] `yarn workspace @shopana/orchestrator-service start`.
- [ ] Протестировать `broker.call`, `emit/on`, `broadcast/onBroadcast`.
- [ ] Проверить reconnection: стопнуть RabbitMQ и убедиться, что подписчики восстанавливаются.
- [ ] Прогнать `curl /health`, `curl /health/ready`.

---

## Команды

```bash
yarn workspace @shopana/shared-kernel build
yarn workspace @shopana/payments-service build
# ...
yarn workspace @shopana/orchestrator-service start
```

---

## Rollback

- Сохранить текущую Moleculer-ветку (`git branch moleculer-backup`).
- Сформировать скрипт удаления RabbitMQ-зависимостей для отката (`yarn workspaces foreach run remove-rabbitmq` при необходимости).

