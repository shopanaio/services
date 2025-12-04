# План миграции на NestJS Modules

## Обзор

- Переходим от Moleculer ServiceSchema к NestJS-модулям, сохраняя существующий программный интерфейс (`broker.call`, `broker.emit`, `Kernel`).
- Yarn 4 workspaces остаются единственным пакетом менеджером.
- NestJS используется только как DI-контейнер и модульная платформа (никаких контроллеров/роутеров в рамках миграции).
- Каждый сервис получает собственный экземпляр `ServiceBroker` через `BrokerModule.forFeature({ serviceName })`, поэтому очереди RabbitMQ и логи изолированы на уровне сервиса.
- In-memory RPC обслуживается единым `ActionRegistry` (singleton в процессе orchestrator'a). Все `register` заносятся в общий реестр, а любой `broker.call` читает из того же реестра, что повторяет поведение Moleculer.
- `emit`/`on` и `broadcast`/`onBroadcast` идут через RabbitMQ (`@golevelup/nestjs-rabbitmq`). RabbitMQ можно отключить: брокер будет логировать предупреждение, но RPC продолжит работать.
- `nest build` для сервисов, `tsc` для библиотек (`shared-kernel`).
- Оркестратор создаёт `NestApplicationContext`, импортируя корневой `BrokerModule.forRootAsync` и модули сервисов. Для отладки отдельного сервиса поднимаем отдельный `NestApplicationContext`, где импортируем `BrokerModule.forRootAsync` + `BrokerModule.forFeature`.
- Один `ServiceBroker` покрывает и in-memory RPC, и RabbitMQ события. Отдельных InMemoryBroker больше нет.

## Целевая структура

```
services/
├── packages/
│   └── shared-kernel/
│       └── src/
│           ├── broker/
│           │   ├── ActionRegistry.ts
│           │   ├── BrokerModule.ts
│           │   ├── ServiceBroker.ts
│           │   └── tokens.ts
│           ├── Kernel.ts
│           └── index.ts
│
├── services/
│   ├── payments/
│   │   ├── src/payments.module.ts
│   │   └── src/payments.service.ts
│   ├── inventory/
│   ├── media/
│   ├── apps/
│   └── ...
│
└── orchestrator/
    ├── src/orchestrator.module.ts
    └── src/main.ts
```

---

## Фаза 1. Shared Kernel

### 1.1 ActionRegistry

**Файл:** `packages/shared-kernel/src/broker/ActionRegistry.ts`

Задача — держать общий для процесса реестр действий:

1. `register(action, handler)` — выбрасывает ошибку при дубликате, чтобы сервисы не перезаписывали обработчики.
2. `deregister(action)` — вызывается при остановке сервиса, чтобы освободить имя.
3. `resolve(action)` — возвращает обработчик либо выбрасывает ошибку, повторяя строгий контракт Moleculer.
4. `list()` — используется для health-check и дебага.

```typescript
import { Injectable } from '@nestjs/common';

export type ActionHandler<TParams = unknown, TResult = unknown> = (
  params: TParams | undefined,
) => Promise<TResult> | TResult;

@Injectable()
export class ActionRegistry {
  private readonly actions = new Map<string, ActionHandler>();

  /**
   * Registers a new action handler and prevents accidental overrides.
   */
  register(action: string, handler: ActionHandler): void {
    if (this.actions.has(action)) {
      throw new Error(`Action "${action}" already registered`);
    }
    this.actions.set(action, handler);
  }

  /**
   * Removes the action owned by a service during shutdown.
   */
  deregister(action: string): void {
    this.actions.delete(action);
  }

  /**
   * Resolves an action handler or throws if it does not exist.
   */
  resolve<TParams = unknown, TResult = unknown>(
    action: string,
  ): ActionHandler<TParams, TResult> {
    const handler = this.actions.get(action);
    if (!handler) {
      throw new Error(`Action "${action}" not found`);
    }

    return handler as ActionHandler<TParams, TResult>;
  }

  /**
   * Returns all registered actions for observability endpoints.
   */
  list(): string[] {
    return Array.from(this.actions.keys());
  }
}
```

### 1.2 ServiceBroker

**Файл:** `packages/shared-kernel/src/broker/ServiceBroker.ts`

Требования:

1. Каждый сервис создаёт свой `ServiceBroker` и передаёт уникальный `serviceName`.
2. Конструктор принимает `ActionRegistry`, `ServiceBrokerOptions` и `AmqpConnection | null` (через отдельный токен `BROKER_AMQP`).
3. Все `register` записываются в `ActionRegistry` и параллельно в локальный `Set`, чтобы очистить их при `onModuleDestroy`.
4. `call` запрашивает обработчик из `ActionRegistry`, увеличивает счётчик `inFlight` и исполняет обработчик синхронно.
5. События RabbitMQ такие же, как ранее, но префиксы очередей используют конкретный `serviceName`, а Dead Letter Exchange закреплён за `shopana.dlx`.
6. `onModuleDestroy` отменяет подписки, ждёт завершение in-flight операций (до 30 секунд), затем удаляет локальные actions и закрывает `managedConnection`.

```typescript
import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { randomUUID } from 'node:crypto';
import { ActionHandler, ActionRegistry } from './ActionRegistry';
import { BROKER_AMQP } from './tokens';

export const SERVICE_BROKER = Symbol('SERVICE_BROKER');

export interface ServiceBrokerOptions {
  serviceName: string;
}

export interface MessageContext {
  correlationId?: string;
  traceId?: string;
  timestamp: number;
  redelivered: boolean;
}

@Injectable()
export class ServiceBroker implements OnModuleDestroy {
  private readonly logger = new Logger(ServiceBroker.name);
  private readonly localActions = new Set<string>();
  private readonly subscriptions: Array<() => Promise<void>> = [];
  private inFlight = 0;

  constructor(
    private readonly registry: ActionRegistry,
    @Optional()
    @Inject(BROKER_AMQP)
    private readonly amqp: AmqpConnection | null,
    private readonly options: ServiceBrokerOptions,
  ) {}

  register<TParams = unknown, TResult = unknown>(
    action: string,
    handler: ActionHandler<TParams, TResult>,
  ): void {
    this.registry.register(action, handler as ActionHandler);
    this.localActions.add(action);
    this.logger.debug(`Registered action: ${action}`);
  }

  async call<TResult = unknown, TParams = unknown>(
    action: string,
    params?: TParams,
  ): Promise<TResult> {
    const handler = this.registry.resolve<TParams, TResult>(action);

    this.inFlight++;
    try {
      return (await handler(params)) as TResult;
    } finally {
      this.inFlight--;
    }
  }

  async emit(event: string, payload?: unknown): Promise<void> {
    if (!this.amqp) {
      this.logger.warn(`emit(${event}) ignored: RabbitMQ disabled`);
      return;
    }

    await this.amqp.publish('shopana.events', event, payload ?? {}, {
      persistent: true,
      correlationId: randomUUID(),
      headers: {
        'x-source-service': this.options.serviceName,
      },
    });
  }

  async on(event: string, handler: (payload: unknown, ctx?: MessageContext) => Promise<void> | void): Promise<void> {
    if (!this.amqp) {
      this.logger.warn(`on(${event}) skipped: RabbitMQ disabled`);
      return;
    }

    const subscription = await this.amqp.createSubscriber(
      async (payload, message) => {
        this.inFlight++;
        try {
          const ctx: MessageContext = {
            correlationId: message.properties.correlationId,
            traceId: message.properties.headers?.['x-trace-id'],
            timestamp: message.properties.timestamp ?? Date.now(),
            redelivered: message.fields.redelivered,
          };
          await handler(payload, ctx);
        } finally {
          this.inFlight--;
        }
      },
      {
        exchange: 'shopana.events',
        routingKey: event,
        queue: `shopana.events.${this.options.serviceName}.${event}`,
        queueOptions: {
          durable: true,
          deadLetterExchange: 'shopana.dlx',
          deadLetterRoutingKey: `events.${event}`,
        },
      },
    );

    this.subscriptions.push(subscription);
    this.logger.debug(`Subscribed to event: ${event}`);
  }

  async broadcast(event: string, payload?: unknown): Promise<void> {
    if (!this.amqp) {
      this.logger.warn(`broadcast(${event}) ignored: RabbitMQ disabled`);
      return;
    }

    await this.amqp.publish('shopana.broadcast', event, payload ?? {}, {
      headers: {
        'x-source-service': this.options.serviceName,
      },
    });
  }

  async onBroadcast(
    event: string,
    handler: (payload: unknown, ctx?: MessageContext) => Promise<void> | void,
  ): Promise<void> {
    if (!this.amqp) {
      this.logger.warn(`onBroadcast(${event}) skipped: RabbitMQ disabled`);
      return;
    }

    const subscription = await this.amqp.createSubscriber(
      (payload, message) =>
        handler(payload, {
          correlationId: message.properties.correlationId,
          traceId: message.properties.headers?.['x-trace-id'],
          timestamp: message.properties.timestamp ?? Date.now(),
          redelivered: message.fields.redelivered,
        }),
      {
        exchange: 'shopana.broadcast',
        routingKey: event,
        queue: `shopana.broadcast.${this.options.serviceName}.${event}.${randomUUID()}`,
        queueOptions: {
          durable: false,
          exclusive: true,
          autoDelete: true,
        },
      },
    );

    this.subscriptions.push(subscription);
    this.logger.debug(`Subscribed to broadcast: ${event}`);
  }

  isHealthy(): boolean {
    return this.amqp ? this.amqp.connected : true;
  }

  getHealth() {
    return {
      connected: this.amqp?.connected ?? false,
      serviceName: this.options.serviceName,
      registeredActions: Array.from(this.localActions),
      inFlight: this.inFlight,
    };
  }

  async onModuleDestroy(): Promise<void> {
    for (const cancel of this.subscriptions) {
      await cancel().catch(() => {});
    }

    const start = Date.now();
    while (this.inFlight > 0 && Date.now() - start < 30_000) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    for (const action of this.localActions) {
      this.registry.deregister(action);
    }
    this.localActions.clear();

    await this.amqp?.managedConnection.close();
  }
}
```

### 1.3 BrokerModule

**Файл:** `packages/shared-kernel/src/broker/BrokerModule.ts`

Требования:

1. Глобальный модуль отвечает за `ActionRegistry`, подключение RabbitMQ и экспорт токенов.
2. `BrokerModule.forRootAsync()` получает конфигурацию (URL RabbitMQ, prefetch) и импортирует `RabbitMQModule` только если URL задан.
3. `BrokerModule.forFeature({ serviceName })` регистрирует `SERVICE_BROKER` в модуле сервиса, создавая новый экземпляр `ServiceBroker`.
4. Для локальных сценариев без RabbitMQ возвращается `BROKER_AMQP = null`: события логируются, RPC работает.
5. Dead-letter инфраструктура: создаём exchanges `shopana.events`, `shopana.broadcast`, `shopana.dlx` и очередь `shopana.dlx.retry` (TTL + маршрутизация обратно в `shopana.events`). Это прописываем в плейбуках `ansible` или `docker-compose`.

```typescript
import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { RabbitMQModule, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ActionRegistry } from './ActionRegistry';
import { ServiceBroker, ServiceBrokerOptions } from './ServiceBroker';

export const BROKER_AMQP = Symbol('BROKER_AMQP');

export interface BrokerModuleOptions {
  rabbitmqUrl?: string;
  prefetch?: number;
}

export interface BrokerModuleAsyncOptions {
  useFactory: (...deps: unknown[]) => Promise<BrokerModuleOptions> | BrokerModuleOptions;
  inject?: Array<unknown>;
}

export interface BrokerFeatureOptions extends ServiceBrokerOptions {}

@Global()
@Module({})
export class BrokerModule {
  static forRootAsync(options: BrokerModuleAsyncOptions): DynamicModule {
    const asyncProvider: Provider = {
      provide: 'BROKER_MODULE_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    const rabbitImport = RabbitMQModule.forRootAsync(RabbitMQModule, {
      inject: ['BROKER_MODULE_OPTIONS'],
      useFactory: async (cfg: BrokerModuleOptions) =>
        cfg.rabbitmqUrl
          ? {
              uri: cfg.rabbitmqUrl,
              connectionInitOptions: { wait: true },
              exchanges: [
                { name: 'shopana.events', type: 'topic', options: { durable: true } },
                { name: 'shopana.broadcast', type: 'topic', options: { durable: true } },
                { name: 'shopana.dlx', type: 'topic', options: { durable: true } },
              ],
              channels: {
                default: { prefetchCount: cfg.prefetch ?? 20 },
              },
            }
          : {
              uri: undefined,
            },
    });

    return {
      module: BrokerModule,
      imports: [rabbitImport],
      providers: [
        asyncProvider,
        ActionRegistry,
        {
          provide: BROKER_AMQP,
          useFactory: (amqp?: AmqpConnection, cfg?: BrokerModuleOptions) =>
            cfg?.rabbitmqUrl ? amqp ?? null : null,
          inject: [AmqpConnection, 'BROKER_MODULE_OPTIONS'],
        },
      ],
      exports: [ActionRegistry, BROKER_AMQP],
    };
  }

  static forFeature(options: BrokerFeatureOptions): DynamicModule {
    return {
      module: BrokerModule,
      providers: [
        {
          provide: SERVICE_BROKER,
          useFactory: (registry: ActionRegistry, amqp: AmqpConnection | null) =>
            new ServiceBroker(registry, amqp, { serviceName: options.serviceName }),
          inject: [ActionRegistry, BROKER_AMQP],
        },
      ],
      exports: [SERVICE_BROKER],
    };
  }
}
```

> Для окружений без DI-конфигурации можно добавить упрощённый `BrokerModule.forRoot` (с синхронными настройками), но основным остаётся `forRootAsync` — он читает URL RabbitMQ из `@shopana/shared-service-config`.

### 1.4 Kernel и экспорты

- `packages/shared-kernel/src/Kernel.ts` без изменений.
- `packages/shared-kernel/src/broker/tokens.ts` экспортирует `SERVICE_BROKER`, `BROKER_AMQP`, связанные типы.
- `packages/shared-kernel/src/index.ts` экспортирует `ActionRegistry`, `ServiceBroker`, `BrokerModule`, `Kernel`, `SERVICE_BROKER`, `ServiceBrokerOptions`, `MessageContext`.
- `package.json` (`shared-kernel`):
  - `build`: `tsc -p tsconfig.build.json`.
  - `dependencies`: `@golevelup/nestjs-rabbitmq`, `@nestjs/common`.
  - `devDependencies`: `typescript`, `@types/node`.

---

## Фаза 2. Миграция сервисов

Общие шаги:

1. Создать Nest-модуль (`xxx.module.ts`), который импортирует `BrokerModule.forFeature({ serviceName: 'xxx' })` и объявляет `xxx.service.ts`.
2. В сервисе инжектируем `SERVICE_BROKER`, создаём `Kernel` и в `onModuleInit` регистрируем actions через `broker.register`.
3. Если нужны события — `await broker.on(...)` и `await broker.onBroadcast(...)` (возвращают промисы).
4. HTTP/GraphQL сервера поднимаем вручную, сохраняем хэндлы и закрываем в `onModuleDestroy`.
5. Старые файлы Moleculer (`service.ts`, `esbuild.js`, `loader.js`) удаляем.

### Пример: payments

```typescript
import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { PaymentsService } from './payments.service';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'payments' })],
  providers: [PaymentsService],
})
export class PaymentsModule {}
```

```typescript
import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kernel, SERVICE_BROKER, ServiceBroker } from '@shopana/shared-kernel';

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private kernel!: Kernel;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit(): Promise<void> {
    this.kernel = new Kernel(this.broker, this.logger);

    this.broker.register('payments.getPaymentMethods', (params) =>
      this.kernel.executeScript(paymentMethods, params),
    );

    await this.broker.on('order.created', (payload, ctx) =>
      this.handleOrder(payload, ctx),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.kernel?.dispose?.();
  }
}
```

### Inventory / Media / Apps

- Сервисы с GraphQL/HTTP продолжают использовать Fastify/Apollo, но DI переносится в Nest-модуль.
- `BrokerModule.forFeature({ serviceName: '<service>' })` импортируется в каждом сервисном модуле.
- `Kernel` расширяется локальными зависимостями (`Repository`, `PluginManager` и т.д.), но точка входа одна.
- В `onModuleDestroy` закрываем Fastify, cron, watchers и т.п.

---

## Фаза 3. Orchestrator

1. `services/orchestrator/src/orchestrator.module.ts`:
   - Импортирует `ConfigModule` (если надо), `BrokerModule.forRootAsync` (получает `rabbitmqUrl`, `prefetch` из `@shopana/shared-service-config`), затем `PaymentsModule`, `InventoryModule`, `MediaModule`, `AppsModule` и т.д.
   - Порядок: сначала `BrokerModule.forRootAsync`, потом сервисные модули.
2. `services/orchestrator/src/main.ts`:
   - `NestFactory.createApplicationContext(OrchestratorModule, { logger: ... })`.
   - Перехватывает `SIGTERM`/`SIGINT` → `await app.close()`.
   - В dev-режиме можно запускать отдельный сервис через его модуль (импортируя `BrokerModule.forRootAsync` + конкретный `BrokerModule.forFeature`) для изолированного тестирования.
3. RabbitMQ инфраструктура:
   - Через `docker-compose.rabbitmq.yml` и ansible добавить декларацию очередей `shopana.events.*`, `shopana.broadcast.*`, DLX `shopana.dlx`, очередь `shopana.dlx.retry` с TTL=10 секунд и маршрутизацией `events.*`.
   - Проверить политики повторов (`x-dead-letter-exchange`, `x-message-ttl`), чтобы сообщения корректно перекидывались между очередями.
4. `package.json` orchestrator:
   - `scripts`: `"build": "nest build"`, `"dev": "nest start --watch"`, `"start": "node dist/main.js"`.
   - `dependencies`: Nest core + сервисные воркспейсы (inventory, payments и т.д.).

---

## Фаза 4. Очистка

1. В сервисах удалить Moleculer schema, `esbuild.js`, `loader.js`.
2. В shared-kernel удалить `MoleculerLogger`, `nestjs/NestBroker`, `nestjs/ServiceSchemaAdapter`.
3. В корне удалить зависимости `moleculer`, `@types/moleculer`, `moleculer-repl`, `nats`.
4. Добавить миграции инфраструктуры RabbitMQ (скрипты в `ansible`/`docker-compose`).

---

## Тестирование

- `yarn workspaces foreach -A --topological run build` — убедиться, что `shared-kernel` собирается `tsc`, а сервисы — `nest build`.
- `yarn workspace @shopana/orchestrator-service start` — запуск orchestrator'a с новым BrokerModule.
- Проверить in-memory RPC:
  1. Зарегистрировать два действия с разными сервисами → `broker.call` из другого модуля должен видеть их через `ActionRegistry`.
  2. Попробовать зарегистрировать дубликат — ожидаем ошибку (unit-тест на `ActionRegistry`).
- Проверить события RabbitMQ:
  1. `broker.emit('inventory.update.request', payload)` — очередь `shopana.events.inventory.inventory.update.request` получает одно сообщение.
  2. `broker.broadcast('cache.invalidate', payload)` — все сервисы, подписанные через `onBroadcast`, получают событие.
  3. При отключении RabbitMQ (`docker stop rabbitmq`) `emit` логирует предупреждение, `call` продолжает работать; после `docker start rabbitmq` подписки восстанавливаются.
- Проверить DLX:
  1. Искусственно кинуть ошибку в обработчике события → сообщение уходит в `shopana.dlx`, попадает в `shopana.dlx.retry`, затем возвращается в исходную очередь.
- Graceful shutdown: `SIGTERM` orchestrator → брокер отменяет подписки, ждёт завершение `inFlight`, закрывает `managedConnection`.

---

## Rollback

- Перед началом миграции создать ветку `moleculer-backup`.
- Подготовить скрипт `scripts/rollback-moleculer.sh`, который возвращает зависимости Moleculer, старые сервисные файлы и переинициализирует RabbitMQ (без `shopana.*` exchanges).
- Хранить экспорт конфигурации RabbitMQ до изменений, чтобы откатиться за минуты.
