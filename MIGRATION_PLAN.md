# План миграции на NestJS Modules

## Обзор

- Переходим от Moleculer ServiceSchema к NestJS-модулям, сохраняя существующий программный интерфейс (`broker.call`, `broker.emit`, `Kernel`).
- Yarn 4 workspaces остаются единственным пакетом менеджером.
- NestJS используется только как DI-контейнер и модульная платформа (никаких контроллеров/роутеров в рамках миграции).
- Глобальные зависимости (`ActionRegistry`, AMQP, lifecycle) живут в `BrokerCoreModule.forRoot`, а per-service инстансы `ServiceBroker` выдаёт `BrokerModule.forFeature({ serviceName })`, поэтому очереди RabbitMQ и логи изолированы на уровне сервиса.
- In-memory RPC обслуживается единым `ActionRegistry` (singleton в процессе orchestrator'a). Все `register` заносятся в общий реестр, а любой `broker.call` читает из того же реестра, что повторяет поведение Moleculer.
- `ServiceBroker` сам неймспейсит действия, очереди и DLX по `serviceName`, поэтому коллизии невозможны даже при опечатках.
- События RabbitMQ публикуются через `ServiceBroker.emit/broadcast`, а обработчики оформляются `@RabbitSubscribe`/`@RabbitHandler` из `@golevelup/nestjs-rabbitmq`. RabbitMQ можно отключить: брокер будет логировать предупреждение, но RPC продолжит работать.
- `nest build` для сервисов, `tsc` для библиотек (`shared-kernel`).
- Оркестратор создаёт `NestApplicationContext`, импортируя `BrokerCoreModule.forRoot` (конфиг резолвим до запуска) и модули сервисов. Для отладки отдельного сервиса поднимаем отдельный `NestApplicationContext`, где импортируем `BrokerCoreModule.forRoot` + `BrokerModule.forFeature`.
- Один `ServiceBroker` покрывает и in-memory RPC, и RabbitMQ события. Отдельных InMemoryBroker больше нет.

## Целевая структура

```
services/
├── packages/
│   └── shared-kernel/
│       └── src/
│           ├── broker/
│           │   ├── ActionRegistry.ts
│           │   ├── BrokerCoreModule.ts
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
3. `register` автоматически добавляет `serviceName` как префикс, если разработчик передал относительное имя (`getPaymentMethods`). Все квалифицированные имена записываются в `ActionRegistry` и локальный `Set`, чтобы очистить их при `onModuleDestroy`.
4. `call` требует полностью квалифицированные имена (`inventory.getStock`). Метод валидирует строку, запрашивает обработчик из `ActionRegistry`, увеличивает счётчик `inFlight` и исполняет обработчик синхронно.
5. Публикация событий (`emit`, `broadcast`) остаётся внутри `ServiceBroker`, а обработчики реализуются через `@RabbitSubscribe`/`@RabbitHandler`, поэтому брокер не управляет потребителями вручную.
6. `onModuleDestroy` ждёт завершение in-flight операций (до 30 секунд), затем удаляет локальные actions. Соединение закрывает глобальный `BrokerAmqpLifecycle`, зарегистрированный в `BrokerCoreModule`.

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

@Injectable()
export class ServiceBroker implements OnModuleDestroy {
  private readonly logger = new Logger(ServiceBroker.name);
  private readonly localActions = new Set<string>();
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
    const qualifiedAction = this.qualifyAction(action);
    this.registry.register(qualifiedAction, handler as ActionHandler);
    this.localActions.add(qualifiedAction);
    this.logger.debug(`Registered action: ${qualifiedAction}`);
  }

  async call<TResult = unknown, TParams = unknown>(
    action: string,
    params?: TParams,
  ): Promise<TResult> {
    const qualifiedAction = this.assertFullyQualified(action);
    const handler = this.registry.resolve<TParams, TResult>(qualifiedAction);

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
    const start = Date.now();
    while (this.inFlight > 0 && Date.now() - start < 30_000) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    for (const action of this.localActions) {
      this.registry.deregister(action);
    }
    this.localActions.clear();
  }

  private qualifyAction(action: string): string {
    return action.includes('.') ? action : `${this.options.serviceName}.${action}`;
  }

  private assertFullyQualified(action: string): string {
    if (!action.includes('.')) {
      throw new Error(`Action "${action}" must include service prefix`);
    }

    return action;
  }
}
```

### 1.3 Обработчики событий RabbitMQ

- Любой сервис, которому нужно слушать события или broadcast-сообщения, объявляет отдельный провайдер с методами, помеченными `@RabbitSubscribe`/`@RabbitHandler` из `@golevelup/nestjs-rabbitmq`.
- Конфиг декоратора включает exchange, routingKey и очередь с префиксом `shopana.events.<serviceName>.<event>` либо `shopana.broadcast.<serviceName>.<event>.<uuid>`. Dead-letter настройки те же, что и в Moleculer.
- Nest сам управляет жизненным циклом consumer'ов, поэтому `ServiceBroker` не хранит ссылки на подписки и не блокирует shutdown. DI остаётся только core-уровня: провайдер — это обычный `@Injectable()` сервис без контроллеров.

```typescript
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { SERVICE_BROKER, ServiceBroker } from '@shopana/shared-kernel';

@Injectable()
export class PaymentsEvents {
  private readonly logger = new Logger(PaymentsEvents.name);

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  @RabbitSubscribe({
    exchange: 'shopana.events',
    routingKey: 'order.created',
    queue: 'shopana.events.payments.order.created',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'shopana.dlx',
      deadLetterRoutingKey: 'events.order.created',
    },
  })
  async handleOrderCreated(payload: OrderCreatedEvent): Promise<void> {
    this.logger.debug(`Order created: ${payload.id}`);
    // business logic здесь, broker доступен для RPC/emit
  }
}
```

> Для broadcast-событий используем `queueOptions` с `exclusive: true` и `autoDelete: true`, а если нужен RPC через RabbitMQ, добавляем `@RabbitHandler` поверх метода.

### 1.4 BrokerCoreModule

**Файл:** `packages/shared-kernel/src/broker/BrokerCoreModule.ts`

Требования:

1. `@Global()`-модуль отвечает за `ActionRegistry`, подключение RabbitMQ и lifecycle закрытия соединения.
2. `BrokerCoreModule.forRoot(options)` принимает финальный конфиг и синхронно решает, импортировать ли `RabbitMQModule` или stub-модуль. `forRootAsync` остаётся тонкой обёрткой, которая дожидается `useFactory`, а затем просто вызывает `forRoot`.
3. Для сценариев без RabbitMQ в DI попадает `BROKER_AMQP = null`: события логируются, RPC продолжает работать, lifecycle ничего не закрывает.
4. Dead-letter инфраструктура фиксируется на уровне плейбуков (`shopana.events`, `shopana.broadcast`, `shopana.dlx`, `shopana.dlx.retry`).

```typescript
import {
  DynamicModule,
  Global,
  Module,
  Injectable,
  OnApplicationShutdown,
  Inject,
  Optional,
} from '@nestjs/common';
import { RabbitMQModule, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
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

export interface BrokerCoreModuleAsyncOptions {
  useFactory: (...deps: unknown[]) => Promise<BrokerCoreModuleOptions> | BrokerCoreModuleOptions;
  inject?: Array<unknown>;
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
```

> `forRootAsync` заводим через `ConfigurableModuleBuilder`, но он лишь дожидается `useFactory`, после чего проксирует результат в `BrokerCoreModule.forRoot(resolvedOptions)`. Решение о подключении RabbitMQ всегда принимается синхронно.

### 1.5 BrokerModule

**Файл:** `packages/shared-kernel/src/broker/BrokerModule.ts`

- Неглобальный модуль, который зависит от `BrokerCoreModule` и предоставляет `SERVICE_BROKER` в конкретном сервисном модуле.
- `forFeature({ serviceName })` создаёт новый `ServiceBroker`, привязанный к `ActionRegistry` и `BROKER_AMQP` из core-модуля. Каждый импорт получает собственный инстанс.
- В тестах можно мокать `ServiceBroker`, переопределяя `SERVICE_BROKER` в `TestingModule.overrideProvider`.

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ActionRegistry } from './ActionRegistry';
import { ServiceBroker, ServiceBrokerOptions } from './ServiceBroker';
import { BROKER_AMQP, SERVICE_BROKER } from './tokens';

export interface BrokerFeatureOptions extends ServiceBrokerOptions {}

@Module({})
export class BrokerModule {
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

### 1.6 Kernel и экспорты

- `packages/shared-kernel/src/Kernel.ts` без изменений.
- `packages/shared-kernel/src/broker/tokens.ts` экспортирует `SERVICE_BROKER`, `BROKER_AMQP`, связанные типы.
- `packages/shared-kernel/src/index.ts` экспортирует `ActionRegistry`, `ServiceBroker`, `BrokerCoreModule`, `BrokerModule`, `Kernel`, `SERVICE_BROKER`, `ServiceBrokerOptions`.
- `package.json` (`shared-kernel`):
  - `build`: `tsc -p tsconfig.build.json`.
  - `dependencies`: `@golevelup/nestjs-rabbitmq`, `@nestjs/common`.
  - `devDependencies`: `typescript`, `@types/node`.

---

## Фаза 2. Миграция сервисов

Общие шаги:

1. Создать Nest-модуль (`xxx.module.ts`), который импортирует `BrokerModule.forFeature({ serviceName: 'xxx' })` и объявляет `xxx.service.ts`.
2. В сервисе инжектируем `SERVICE_BROKER`, создаём `Kernel` и в `onModuleInit` регистрируем actions через `broker.register`.
3. `broker.register` принимает относительные имена (`'getPaymentMethods'`), а `broker.call` вне сервиса всегда использует полностью квалифицированные строки (`'payments.getPaymentMethods'`).
4. Для событий создаём отдельный провайдер или метод сервиса с `@RabbitSubscribe`/`@RabbitHandler`, конфигурируя exchange/queue в декораторе.
5. HTTP/GraphQL сервера поднимаем вручную, сохраняем хэндлы и закрываем в `onModuleDestroy`.
6. Старые файлы Moleculer (`service.ts`, `esbuild.js`, `loader.js`) удаляем.

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
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Kernel, SERVICE_BROKER, ServiceBroker } from '@shopana/shared-kernel';

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private kernel!: Kernel;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit(): Promise<void> {
    this.kernel = new Kernel(this.broker, this.logger);

    this.broker.register('getPaymentMethods', (params) =>
      this.kernel.executeScript(paymentMethods, params),
    );
  }

  @RabbitSubscribe({
    exchange: 'shopana.events',
    routingKey: 'order.created',
    queue: 'shopana.events.payments.order.created',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'shopana.dlx',
      deadLetterRoutingKey: 'events.order.created',
    },
  })
  async handleOrderCreated(payload: OrderCreatedEvent): Promise<void> {
    this.logger.log(`order ${payload.id} received`);
    // бизнес-логика + Kernel/broker при необходимости
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
- Слушатели событий/бродкастов описываются в отдельных провайдерах с `@RabbitSubscribe`/`@RabbitHandler`, чтобы изоляция зависимостей оставалась прозрачной.
- В `onModuleDestroy` закрываем Fastify, cron, watchers и т.п.

---

## Фаза 3. Orchestrator

1. `services/orchestrator/src/orchestrator.module.ts`:
   - Импортирует `ConfigModule` (если надо), синхронно резолвит брокерный конфиг (`await sharedServiceConfig.load()` в bootstrap'e) и передаёт его в `BrokerCoreModule.forRoot({ rabbitmqUrl, prefetch })`, затем подключает `PaymentsModule`, `InventoryModule`, `MediaModule`, `AppsModule` и т.д.
   - Порядок: сначала `BrokerCoreModule.forRoot`, потом сервисные модули. Если где-то необходим lazy-подход, допустимо использовать `forRootAsync`, но он внутри просто вызывает `forRoot` после `await useFactory`.
2. `services/orchestrator/src/main.ts`:
   - `NestFactory.createApplicationContext(OrchestratorModule, { logger: ... })`.
   - Перехватывает `SIGTERM`/`SIGINT` → `await app.close()`.
   - В dev-режиме можно запускать отдельный сервис через его модуль (импортируя `BrokerCoreModule.forRoot` с локальными настройками + конкретный `BrokerModule.forFeature`) для изолированного тестирования.
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

- `yarn workspace @shopana/shared-kernel test` — unit-тесты на `ActionRegistry`, `ServiceBroker` и `BrokerAmqpLifecycle`. Покрываем сценарии: авто-префикс `register`, отказ `call` без префикса, ожидание in-flight операций без RabbitMQ, корректная очистка `localActions`.
- `yarn workspaces foreach -A --topological run build` — убедиться, что `shared-kernel` собирается `tsc`, а сервисы — `nest build`.
- `yarn workspace @shopana/orchestrator-service start` — запуск orchestrator'a с `BrokerCoreModule` + сервисными модулями на `BrokerModule.forFeature`.
- Мини-интеграционный тест модуля: поднять `TestingModule` с `BrokerCoreModule.forRoot({ rabbitmqUrl: undefined })` → убедиться, что DI даёт `BROKER_AMQP = null` и `isHealthy()` возвращает `true`; аналогичный тест с реальным URL проверяет биндинг `AmqpConnection`.
- Проверить in-memory RPC:
  1. Зарегистрировать два действия с разными сервисами → `broker.call` из другого модуля должен видеть их через `ActionRegistry`.
  2. Передать действие без префикса при регистрации → брокер допишет `serviceName.` автоматически, а `ActionRegistry` по-прежнему застрахован от коллизий.
  3. Попробовать зарегистрировать дубликат — ожидаем ошибку (unit-тест на `ActionRegistry`).
- Проверить события RabbitMQ:
  1. `broker.emit('inventory.update.request', payload)` — очередь `shopana.events.inventory.inventory.update.request` и соответствующий `@RabbitSubscribe`-хэндлер получают сообщение.
  2. `broker.broadcast('cache.invalidate', payload)` — все провайдеры с `@RabbitSubscribe` на broadcast получают событие.
  3. При отключении RabbitMQ (`docker stop rabbitmq`) `emit` логирует предупреждение, `call` продолжает работать; после `docker start rabbitmq` декораторы автоматически пересоздают подписки.
- Проверить DLX:
  1. Искусственно кинуть ошибку в обработчике события → сообщение уходит в `shopana.dlx`, попадает в `shopana.dlx.retry`, затем возвращается в исходную очередь.
- Graceful shutdown: `SIGTERM` orchestrator → `@golevelup/nestjs-rabbitmq` снимает `@RabbitSubscribe`-хэндлеры при `app.close()`, брокер ждёт завершение `inFlight`, `BrokerAmqpLifecycle` закрывает `managedConnection`.

---

## Rollback

- Перед началом миграции создать ветку `moleculer-backup`.
- Подготовить скрипт `scripts/rollback-moleculer.sh`, который возвращает зависимости Moleculer, старые сервисные файлы и переинициализирует RabbitMQ (без `shopana.*` exchanges).
- Хранить экспорт конфигурации RabbitMQ до изменений, чтобы откатиться за минуты.
