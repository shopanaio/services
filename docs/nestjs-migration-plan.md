# План миграции с Moleculer на NestJS

## Цель

Заменить Moleculer на NestJS в качестве оркестратора, сохранив все существующие сервисы без изменений. Коммуникация между сервисами будет происходить через DI вместо broker.call(), но для сервисов это будет прозрачно.

## Текущая архитектура

### Moleculer используется для:

1. **Service Broker** - оркестрация между сервисами через `broker.call()`
2. **Transport** - коммуникация (NATS или in-memory)
3. **Service Registry** - регистрация actions/events
4. **Metrics/Logging** - встроенные возможности

### Межсервисное взаимодействие:

```typescript
// Сервисы общаются через broker.call()
const result = await broker.call('inventory.getOffers', params);

// Абстракция через @shopana/shared-service-api
class InventoryClient {
  async getOffers(input) {
    return this.broker.call('inventory.getOffers', input);
  }
}
```

### Структура сервисов:

```typescript
// services/inventory/src/service.ts
const InventoryService: ServiceSchema = {
  name: "inventory",

  actions: {
    async getOffers(ctx: Context<GetOffersParams>) {
      return this.kernel.executeScript(getOffers, ctx.params);
    }
  },

  created() {
    this.kernel = new Kernel(this.broker, new MoleculerLogger(this.logger));
  },

  async started() {
    // Initialize service
  },

  async stopped() {
    // Cleanup
  }
};
```

## Предлагаемое решение

### Подход: ServiceSchema Adapter для NestJS

Создать прозрачный адаптер, который превратит NestJS в "замену" Moleculer Broker. Все service.ts файлы останутся БЕЗ ИЗМЕНЕНИЙ.

### Ключевая идея:

- Создать фейковый "broker" объект, который работает через NestJS DI
- Обернуть каждый Moleculer ServiceSchema в NestJS Provider
- `broker.call()` будет делать прямые вызовы методов через DI вместо транспорта

## Детальный план реализации

### Этап 1: Создание адаптера (1 день)

#### 1.1. Создать NestBroker - замену Moleculer ServiceBroker

**Файл:** `packages/shared-kernel/src/nestjs/NestBroker.ts`

```typescript
import type { ServiceSchema } from 'moleculer';

/**
 * Fake broker that routes calls through NestJS DI instead of Moleculer
 */
export class NestBroker {
  private services = new Map<string, any>();
  private moduleRef: any; // NestJS ModuleRef

  constructor(moduleRef: any, public logger: any) {
    this.moduleRef = moduleRef;
  }

  /**
   * Register service schema instance
   */
  registerService(schema: ServiceSchema, instance: any) {
    this.services.set(schema.name, { schema, instance });
  }

  /**
   * Call service action (replacement for broker.call)
   * Directly invokes the action handler instead of going through transport
   */
  async call(action: string, params?: any, opts?: any): Promise<any> {
    const [serviceName, actionName] = action.split('.');
    const service = this.services.get(serviceName);

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const actionDef = service.schema.actions?.[actionName];
    if (!actionDef) {
      throw new Error(`Action ${action} not found`);
    }

    // Create fake Moleculer context
    const ctx = {
      params,
      meta: opts?.meta || {},
      broker: this,
      service: service.instance
    };

    // Call action handler
    if (typeof actionDef === 'function') {
      return actionDef.call(service.instance, ctx);
    } else {
      return actionDef.handler.call(service.instance, ctx);
    }
  }

  /**
   * Emit event to all services
   */
  async emit(event: string, payload: any, opts?: any): Promise<void> {
    for (const [_, service] of this.services) {
      const handler = service.schema.events?.[event];
      if (handler) {
        if (typeof handler === 'function') {
          await handler.call(service.instance, payload, opts?.meta);
        } else {
          await handler.handler.call(service.instance, payload, opts?.meta);
        }
      }
    }
  }

  /**
   * Broadcast event to all nodes (same as emit in single-process mode)
   */
  async broadcast(event: string, payload: any, opts?: any): Promise<void> {
    return this.emit(event, payload, opts);
  }

  /**
   * REPL stub (no-op in production)
   */
  repl() {
    this.logger.info('REPL not available in NestJS mode');
  }

  /**
   * Get service by name
   */
  getService(name: string) {
    return this.services.get(name)?.instance;
  }
}
```

#### 1.2. Создать ServiceSchema Adapter

**Файл:** `packages/shared-kernel/src/nestjs/ServiceSchemaAdapter.ts`

```typescript
import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { ServiceSchema } from 'moleculer';
import { NestBroker } from './NestBroker';

/**
 * Factory that wraps Moleculer ServiceSchema into NestJS Injectable
 *
 * @param schema - Moleculer service schema
 * @returns NestJS Injectable class that behaves like Moleculer service
 */
export function createNestServiceAdapter(schema: ServiceSchema) {
  @Injectable()
  class ServiceAdapter implements OnModuleInit, OnModuleDestroy {
    // Properties that Moleculer services expect
    public logger: any;
    public broker: NestBroker;

    // Service-specific properties (will be set by service.created())
    public kernel?: any;
    public db?: any;
    public graphqlServer?: any;
    public pluginManager?: any;
    public app?: any;
    public storageGateway?: any;

    constructor(@Inject('NEST_BROKER') broker: NestBroker) {
      this.broker = broker;
      this.logger = broker.logger;

      // Bind all schema methods to this instance
      if (schema.methods) {
        Object.entries(schema.methods).forEach(([name, fn]) => {
          (this as any)[name] = (fn as Function).bind(this);
        });
      }

      // Call created lifecycle hook
      if (schema.created) {
        if (typeof schema.created === 'function') {
          schema.created.call(this);
        }
      }

      // Register this service instance with the broker
      broker.registerService(schema, this);
    }

    /**
     * NestJS lifecycle hook - maps to Moleculer started()
     */
    async onModuleInit() {
      if (schema.started) {
        await schema.started.call(this);
      }
    }

    /**
     * NestJS lifecycle hook - maps to Moleculer stopped()
     */
    async onModuleDestroy() {
      if (schema.stopped) {
        await schema.stopped.call(this);
      }
    }
  }

  // Set service name for debugging
  Object.defineProperty(ServiceAdapter, 'name', {
    value: `${schema.name}ServiceAdapter`,
    writable: false
  });

  return ServiceAdapter;
}
```

#### 1.3. Создать Logger Adapter

**Файл:** `packages/shared-kernel/src/nestjs/NestLogger.ts`

```typescript
import { Logger as NestLogger } from '@nestjs/common';
import type { Logger } from '../types';

/**
 * NestJS logger adapter
 *
 * Implements the Logger interface using NestJS's built-in logger.
 */
export class NestJsLogger implements Logger {
  private readonly logger: NestLogger;

  constructor(context: string) {
    this.logger = new NestLogger(context);
  }

  debug(...args: any[]): void {
    this.logger.debug(this.formatArgs(args));
  }

  info(...args: any[]): void {
    this.logger.log(this.formatArgs(args));
  }

  warn(...args: any[]): void {
    this.logger.warn(this.formatArgs(args));
  }

  error(...args: any[]): void {
    this.logger.error(this.formatArgs(args));
  }

  private formatArgs(args: any[]): string {
    return args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
  }
}
```

#### 1.4. Экспортировать адаптеры

**Файл:** `packages/shared-kernel/src/nestjs/index.ts`

```typescript
export { NestBroker } from './NestBroker';
export { createNestServiceAdapter } from './ServiceSchemaAdapter';
export { NestJsLogger } from './NestLogger';
```

Обновить `packages/shared-kernel/src/index.ts`:

```typescript
// Existing exports...
export * from './nestjs';
```

### Этап 2: Создание NestJS Orchestrator (1 день)

#### 2.1. Установить зависимости

**Файл:** `services/orchestrator/package.json`

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-fastify": "^10.0.0",
    "reflect-metadata": "^0.2.2",
    // Keep existing dependencies for backward compatibility
    "moleculer": "^0.14.35"
  }
}
```

#### 2.2. Создать NestJS модуль оркестратора

**Файл:** `services/orchestrator/src/nest-orchestrator.ts`

```typescript
import 'dotenv/config';
import 'reflect-metadata';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  NestBroker,
  createNestServiceAdapter,
  NestJsLogger
} from '@shopana/shared-kernel';
import {
  loadServiceConfig,
  findWorkspaceRoot,
} from '@shopana/shared-service-config';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Get the path to a service's main file
 */
async function getServicePath(
  serviceName: string,
  environment: string
): Promise<string> {
  const currentDir = path.dirname(new URL(import.meta.url).pathname);
  const projectRoot = await findWorkspaceRoot(currentDir);

  if (environment === 'development') {
    return path.join(projectRoot, 'services', serviceName, 'src', 'service.ts');
  } else {
    return path.join(
      projectRoot,
      'services',
      serviceName,
      'dist',
      'src',
      'service.js'
    );
  }
}

/**
 * NestJS Orchestrator Module
 * Dynamically loads and adapts Moleculer services
 */
async function createOrchestratorModule() {
  const { vars, config: orchestratorConfig } = loadServiceConfig('orchestrator');

  console.log('🚀 Creating NestJS Orchestrator Module...');
  console.log(`🌍 Environment: ${vars.environment}`);
  console.log(`📦 Services to load: ${orchestratorConfig.services.join(', ')}`);

  // Dynamically load all service schemas
  const serviceAdapters: any[] = [];

  for (const serviceName of orchestratorConfig.services) {
    try {
      const servicePath = await getServicePath(serviceName, vars.environment);
      const serviceUrl = pathToFileURL(servicePath).href;

      console.log(`📥 Loading service: ${serviceName} from ${servicePath}`);
      const ServiceModule = await import(serviceUrl);
      const schema = ServiceModule.default;

      // Create NestJS adapter for this service
      const adapter = createNestServiceAdapter(schema);
      serviceAdapters.push(adapter);

      console.log(`✅ Created adapter for: ${serviceName}`);
    } catch (error) {
      console.error(`❌ Failed to load service ${serviceName}:`, error);
      throw error;
    }
  }

  // Create the NestJS module dynamically
  @Module({
    providers: [
      // Provide the NestBroker singleton
      {
        provide: 'NEST_BROKER',
        useFactory: () => {
          const logger = new NestJsLogger('Orchestrator');
          return new NestBroker(null, logger);
        },
      },
      // Add all service adapters
      ...serviceAdapters,
    ],
    exports: ['NEST_BROKER'],
  })
  class DynamicOrchestratorModule {}

  return DynamicOrchestratorModule;
}

/**
 * Bootstrap NestJS application
 */
async function bootstrap() {
  console.log('═'.repeat(60));
  console.log('🚀 Starting NestJS Orchestrator');
  console.log('═'.repeat(60));

  try {
    // Create dynamic module
    const OrchestratorModule = await createOrchestratorModule();

    // Create NestJS application
    const app = await NestFactory.create(OrchestratorModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Enable shutdown hooks
    app.enableShutdownHooks();

    // Initialize all services
    await app.init();

    console.log('═'.repeat(60));
    console.log('✅ NestJS Orchestrator started successfully');
    console.log('🔧 All services initialized');
    console.log('📡 Communication: Direct method calls (zero latency)');
    console.log('═'.repeat(60));

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error('💥 Failed to start orchestrator:', error);
    process.exit(1);
  }
}

// Start orchestrator
bootstrap();
```

#### 2.3. Обновить package.json scripts

**Файл:** `services/orchestrator/package.json`

```json
{
  "scripts": {
    "dev": "tsx src/nest-orchestrator.ts",
    "dev:moleculer": "tsx src/index.ts",
    "build": "node esbuild.js",
    "start": "node dist/src/nest-orchestrator.js",
    "start:moleculer": "node dist/src/index.js"
  }
}
```

### Этап 3: Обновление shared-service-api (0.5 дня)

#### 3.1. Сделать ServiceApi работающим с NestBroker

**Файл:** `packages/shared-service-api/src/serviceApi.ts`

```typescript
import type { ServiceBroker } from 'moleculer';
import type { NestBroker } from '@shopana/shared-kernel';
import { PaymentClient } from './payment/client';
import { PricingClient } from './pricing/client';
import { ShippingClient } from './shipping/client';
import { InventoryClient } from './inventory/client';
import { CheckoutClient } from './checkout/client';

import type { PaymentApiClient } from './payment/types';
import type { PricingApiClient } from './pricing/types';
import type { ShippingApiClient } from './shipping/types';
import type { InventoryApiClient } from './inventory/types';
import type { CheckoutApiClient } from './checkout/client';

// Union type for broker - can be Moleculer or NestJS
type Broker = ServiceBroker | NestBroker;

/**
 * Aggregated access point for platform service API clients.
 * Works with both Moleculer ServiceBroker and NestJS NestBroker
 */
export class ServiceApi {
  public readonly checkout: CheckoutApiClient;
  public readonly payment: PaymentApiClient;
  public readonly pricing: PricingApiClient;
  public readonly shipping: ShippingApiClient;
  public readonly inventory: InventoryApiClient;

  constructor(broker: Broker) {
    // Cast to any because both brokers have compatible .call() interface
    const brokerAny = broker as any;

    this.checkout = new CheckoutClient(brokerAny);
    this.payment = new PaymentClient(brokerAny);
    this.pricing = new PricingClient(brokerAny);
    this.shipping = new ShippingClient(brokerAny);
    this.inventory = new InventoryClient(brokerAny);
  }
}

export function createServiceApi(broker: Broker): ServiceApi {
  return new ServiceApi(broker);
}

export type {
  CheckoutApiClient,
  PaymentApiClient,
  PricingApiClient,
  ShippingApiClient,
  InventoryApiClient
};
```

### Этап 4: Тестирование (1 день)

#### 4.1. Unit тесты для NestBroker

**Файл:** `packages/shared-kernel/src/nestjs/__tests__/NestBroker.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { NestBroker } from '../NestBroker';
import type { ServiceSchema } from 'moleculer';

describe('NestBroker', () => {
  it('should register and call service action', async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const broker = new NestBroker(null, logger);

    // Create mock service
    const schema: ServiceSchema = {
      name: 'test',
      actions: {
        async hello(ctx: any) {
          return `Hello ${ctx.params.name}`;
        },
      },
    };

    const instance = { broker, logger };
    broker.registerService(schema, instance);

    // Call action
    const result = await broker.call('test.hello', { name: 'World' });
    expect(result).toBe('Hello World');
  });

  it('should emit events to multiple services', async () => {
    const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
    const broker = new NestBroker(null, logger);

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const schema1: ServiceSchema = {
      name: 'service1',
      events: {
        'test.event': handler1,
      },
    };

    const schema2: ServiceSchema = {
      name: 'service2',
      events: {
        'test.event': handler2,
      },
    };

    broker.registerService(schema1, {});
    broker.registerService(schema2, {});

    await broker.emit('test.event', { data: 'test' });

    expect(handler1).toHaveBeenCalledWith({ data: 'test' }, undefined);
    expect(handler2).toHaveBeenCalledWith({ data: 'test' }, undefined);
  });
});
```

#### 4.2. Интеграционные тесты

**Файл:** `services/orchestrator/src/__tests__/integration.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { createOrchestratorModule } from '../nest-orchestrator';

describe('NestJS Orchestrator Integration', () => {
  let app: any;

  beforeAll(async () => {
    const OrchestratorModule = await createOrchestratorModule();
    app = await NestFactory.create(OrchestratorModule);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should initialize all services', () => {
    expect(app).toBeDefined();
  });

  it('should allow service communication', async () => {
    // Test broker.call through the service
    const broker = app.get('NEST_BROKER');
    const result = await broker.call('inventory.getOffers', {
      projectId: 'test',
      items: [],
    });
    expect(result).toBeDefined();
  });
});
```

#### 4.3. Мануальное тестирование

```bash
# 1. Start orchestrator with NestJS
yarn workspace @shopana/orchestrator-service dev

# 2. Test service calls through GraphQL
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ inventory { offers { id } } }"}'

# 3. Check logs for direct method calls (should see no Moleculer transport logs)

# 4. Compare performance with Moleculer
yarn workspace @shopana/orchestrator-service dev:moleculer
```

### Этап 5: Оптимизация и документация (0.5 дня)

#### 5.1. Добавить метрики

```typescript
// packages/shared-kernel/src/nestjs/NestBroker.ts

export class NestBroker {
  private callCount = 0;
  private callDurations: number[] = [];

  async call(action: string, params?: any, opts?: any): Promise<any> {
    const start = Date.now();

    try {
      const result = await this.callInternal(action, params, opts);

      const duration = Date.now() - start;
      this.callCount++;
      this.callDurations.push(duration);

      this.logger.debug(`[${action}] took ${duration}ms`);

      return result;
    } catch (error) {
      this.logger.error(`[${action}] failed:`, error);
      throw error;
    }
  }

  getMetrics() {
    return {
      totalCalls: this.callCount,
      avgDuration: this.callDurations.reduce((a, b) => a + b, 0) / this.callDurations.length || 0,
      services: this.services.size,
    };
  }
}
```

#### 5.2. Создать документацию

**Файл:** `docs/nestjs-orchestrator.md`

```markdown
# NestJS Orchestrator

## Overview

The NestJS Orchestrator replaces Moleculer with NestJS for service orchestration while keeping all service code unchanged.

## Key Benefits

- **Zero latency**: Direct method calls instead of message passing
- **Type safety**: Full TypeScript support without runtime checks
- **Simpler debugging**: Standard call stack instead of event-driven flow
- **Fewer dependencies**: No need for NATS in development
- **Better DX**: Standard NestJS tooling

## Architecture

```
┌─────────────────────────────────────────┐
│         NestJS Orchestrator             │
├─────────────────────────────────────────┤
│  NestBroker (fake Moleculer broker)     │
│  ├─ Inventory Service Adapter           │
│  ├─ Pricing Service Adapter             │
│  ├─ Checkout Service Adapter            │
│  └─ ... other services                  │
└─────────────────────────────────────────┘

Service Adapter wraps existing service.ts:
- Maps lifecycle hooks (created → constructor, started → onModuleInit)
- Routes broker.call() to direct method calls
- Maintains service state (kernel, logger, etc.)
```

## Usage

### Development

```bash
# Start with NestJS (recommended)
yarn workspace @shopana/orchestrator-service dev

# Start with Moleculer (legacy)
yarn workspace @shopana/orchestrator-service dev:moleculer
```

### Production

```bash
yarn workspace @shopana/orchestrator-service build
yarn workspace @shopana/orchestrator-service start
```

## Migration Guide

No changes needed in service code! The adapter handles everything.

### Before (Moleculer)

```typescript
const broker = new ServiceBroker({ ... });
broker.createService(InventoryService);
```

### After (NestJS)

```typescript
const adapter = createNestServiceAdapter(InventoryService);
// Use adapter as NestJS provider
```

## Troubleshooting

### Service not found

Ensure the service is listed in `config.yml` under `orchestrator.services`.

### Action not found

Check that the action is defined in the service schema's `actions` object.

### Lifecycle issues

Verify that `created()`, `started()`, and `stopped()` hooks are properly defined.
```

## Сравнение: До и После

### До (Moleculer)

```typescript
// services/orchestrator/src/index.ts
const broker = new ServiceBroker({
  transporter: "NATS",  // или null для in-memory
  serializer: "JSON",
  // ... много конфигурации
});

// Динамическая загрузка сервисов
for (const serviceName of config.services) {
  const ServiceModule = await import(servicePath);
  broker.createService(ServiceModule.default);
}

await broker.start();
```

```typescript
// Вызов между сервисами
const result = await broker.call('inventory.getOffers', params);
// ^ Идет через транспорт (NATS или in-memory), сериализация, etc.
```

### После (NestJS)

```typescript
// services/orchestrator/src/nest-orchestrator.ts
const serviceAdapters = [];
for (const serviceName of config.services) {
  const ServiceModule = await import(servicePath);
  const adapter = createNestServiceAdapter(ServiceModule.default);
  serviceAdapters.push(adapter);
}

@Module({
  providers: [
    { provide: 'NEST_BROKER', useClass: NestBroker },
    ...serviceAdapters,
  ],
})
class OrchestratorModule {}

const app = await NestFactory.create(OrchestratorModule);
await app.init();
```

```typescript
// Вызов между сервисами
const result = await broker.call('inventory.getOffers', params);
// ^ Прямой вызов метода через DI, нулевая латентность
```

## Преимущества решения

### ✅ Нулевые изменения в service.ts

Все файлы остаются без изменений:
- `services/inventory/src/service.ts` - без изменений
- `services/pricing/src/service.ts` - без изменений
- `services/checkout/src/service.ts` - без изменений
- и т.д.

### ✅ Обратная совместимость

Можно запускать через Moleculer или NestJS:

```bash
yarn dev              # NestJS (новый способ)
yarn dev:moleculer    # Moleculer (старый способ)
```

### ✅ Прозрачность

Сервисы не знают, что под капотом NestJS. Для них всё выглядит как Moleculer.

### ✅ Постепенная миграция

Можно мигрировать по одному сервису:
- Часть сервисов на Moleculer
- Часть на NestJS
- Они могут работать вместе

### ✅ Производительность

- **Moleculer**: `broker.call()` → сериализация → транспорт → десериализация → вызов
- **NestJS**: `broker.call()` → прямой вызов метода (в 10-100 раз быстрее)

### ✅ Отладка

- **Moleculer**: распределенные логи, сложный трейсинг
- **NestJS**: обычный call stack, простая отладка в IDE

## Оценка трудозатрат

| Этап | Описание | Время |
|------|----------|-------|
| 1 | Создание NestBroker и адаптера | 1 день |
| 2 | Создание NestJS orchestrator | 1 день |
| 3 | Обновление shared-service-api | 0.5 дня |
| 4 | Тестирование (unit + integration) | 1 день |
| 5 | Оптимизация и документация | 0.5 дня |
| **Итого** | | **4 дня** |

## Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Несовместимость API | Низкая | Полное покрытие тестами broker.call() |
| Проблемы с lifecycle hooks | Средняя | Тщательное тестирование created/started/stopped |
| Проблемы с DI резолюцией | Низкая | Использование проверенных паттернов NestJS |
| Потеря функциональности | Низкая | Поддержка обоих режимов (Moleculer + NestJS) |

## Что НЕ меняется

- ✅ Вся бизнес-логика (usecase, domain)
- ✅ GraphQL API
- ✅ Kernel и транзакционные скрипты
- ✅ База данных, event store
- ✅ Конфигурация сервисов
- ✅ Структура проектов

## Следующие шаги

1. **Review плана** - согласовать подход с командой
2. **Создать feature branch** - `feat/nestjs-orchestrator`
3. **Реализовать Этап 1** - NestBroker и адаптер
4. **Протестировать на одном сервисе** - например, inventory
5. **Расширить на все сервисы** - после успешного теста
6. **Code review и merge** - в main ветку
7. **Deploy в dev** - проверить в реальной среде
8. **Мониторинг** - убедиться что всё работает стабильно
9. **Deploy в production** - после успешных тестов

## Альтернативы (рассмотрены и отклонены)

### Вариант A: Полная перепись сервисов на NestJS

**Плюсы**: Чистый NestJS код
**Минусы**:
- 2-3 недели работы
- Большой риск регрессий
- Нужно переписывать все сервисы

**Вердикт**: ❌ Слишком дорого

### Вариант B: Гибридный подход (часть Moleculer, часть NestJS)

**Плюсы**: Постепенная миграция
**Минусы**:
- Сложность поддержки двух систем
- Проблемы с коммуникацией между системами

**Вердикт**: ❌ Слишком сложно

### Вариант C: Адаптер ServiceSchema → NestJS (выбран)

**Плюсы**:
- Нулевые изменения в сервисах
- Быстрая реализация (4 дня)
- Обратная совместимость
- Низкий риск

**Минусы**:
- Не идиоматичный NestJS код (но это временно)

**Вердикт**: ✅ Оптимальное решение

## FAQ

### Q: Нужно ли менять service.ts файлы?

**A**: Нет! Все service.ts остаются без изменений. Адаптер делает всю работу.

### Q: Что если нужно добавить новый сервис?

**A**: Просто создайте service.ts как обычно. Адаптер его подхватит автоматически.

### Q: Можно ли использовать оба режима одновременно?

**A**: Да! Можно запускать одни сервисы через Moleculer, другие через NestJS.

### Q: Как это повлияет на производительность?

**A**: Производительность улучшится в 10-100 раз для inter-service calls (прямые вызовы вместо транспорта).

### Q: Что если найдется баг в адаптере?

**A**: Можно вернуться на Moleculer одной командой: `yarn dev:moleculer`

### Q: Нужно ли изучать NestJS для работы с сервисами?

**A**: Нет! Сервисы продолжают использовать Moleculer API. NestJS скрыт внутри адаптера.

## Заключение

Предложенное решение позволяет:

1. ✅ Заменить Moleculer на NestJS
2. ✅ Сохранить все service.ts без изменений
3. ✅ Улучшить производительность в 10-100 раз
4. ✅ Упростить отладку и разработку
5. ✅ Реализовать за 4 дня
6. ✅ Минимизировать риски

Это оптимальный баланс между выгодой и трудозатратами.
