# Поэтапный план миграции на NestJS Modules

Основан на [MIGRATION_PLAN.md](./MIGRATION_PLAN.md). RabbitMQ настраивается автоматически при старте приложения.

**Важно:** `shared-kernel` не билдится отдельно в JS. Импортируется как source code (TypeScript) и компилируется вместе с сервисами через `nest build`.

---

## Этап 1: Shared Kernel

### 1.1 ActionRegistry
- [ ] Создать `packages/shared-kernel/src/broker/ActionRegistry.ts`
- [ ] Методы: `register`, `deregister`, `resolve`, `list`
- [ ] Защита от дублирования actions
- [ ] Unit-тесты

### 1.2 Tokens
- [ ] Создать `packages/shared-kernel/src/broker/tokens.ts`
- [ ] Токены: `SERVICE_BROKER`, `BROKER_AMQP`

### 1.3 ServiceBroker
- [ ] Создать `packages/shared-kernel/src/broker/ServiceBroker.ts`
- [ ] `register` с авто-префиксом `serviceName`
- [ ] `call` с валидацией qualified имён
- [ ] `emit` и `broadcast` для RabbitMQ
- [ ] `onModuleDestroy` с ожиданием in-flight
- [ ] `isHealthy`, `getHealth`
- [ ] Unit-тесты

### 1.4 BrokerCoreModule
- [ ] Создать `packages/shared-kernel/src/broker/BrokerCoreModule.ts`
- [ ] `forRoot` с опциональным RabbitMQ
- [ ] Авто-создание exchanges: `shopana.events`, `shopana.broadcast`, `shopana.dlx`
- [ ] `BrokerAmqpLifecycle` для graceful shutdown
- [ ] Stub для работы без RabbitMQ

### 1.5 BrokerModule
- [ ] Создать `packages/shared-kernel/src/broker/BrokerModule.ts`
- [ ] `forFeature({ serviceName })`

### 1.6 Экспорты и зависимости
- [ ] Обновить `packages/shared-kernel/src/index.ts`
- [ ] Добавить `@golevelup/nestjs-rabbitmq`, `@nestjs/common`
- [ ] Настроить `tsconfig.json` для импорта как source

**Done:** Shared kernel импортируется в сервисы, unit-тесты проходят

---

## Этап 2: Orchestrator

### 2.1 Модуль
- [ ] Создать `services/orchestrator/src/orchestrator.module.ts`
- [ ] Импортировать `BrokerCoreModule.forRoot`

### 2.2 Bootstrap
- [ ] Создать `services/orchestrator/src/main.ts`
- [ ] `NestFactory.createApplicationContext`
- [ ] Обработка `SIGTERM`/`SIGINT`

### 2.3 Package.json
- [ ] Скрипты: `build`, `dev`, `start`

**Done:** Orchestrator запускается, exchanges создаются автоматически

---

## Этап 3: Payments

- [ ] Создать `payments.module.ts`
- [ ] Создать `payments.service.ts`
- [ ] Action: `getPaymentMethods`
- [ ] Добавить в `OrchestratorModule`
- [ ] Удалить `service.ts`, `moleculer.ts`

**Note:** Только RPC, событий нет

---

## Этап 4: Inventory

- [ ] Создать `inventory.module.ts`
- [ ] Создать `inventory.service.ts`
- [ ] Action: `getOffers`
- [ ] Event: `inventory.update.request` → `@RabbitSubscribe`
- [ ] GraphQL server (Fastify + Apollo)
- [ ] Добавить в `OrchestratorModule`
- [ ] Удалить `service.ts`, `moleculer.ts`

**Note:** Единственный сервис с событиями

---

## Этап 5: Apps

- [ ] Создать `apps.module.ts`
- [ ] Создать `apps.service.ts`
- [ ] Перенести actions
- [ ] Добавить в `OrchestratorModule`
- [ ] Удалить `service.ts`, `moleculer.ts`

**Note:** Только RPC

---

## Этап 6: Media

- [ ] Создать `media.module.ts`
- [ ] Создать `media.service.ts`
- [ ] Перенести actions
- [ ] Добавить в `OrchestratorModule`
- [ ] Удалить `service.ts`, `moleculer.ts`

**Note:** Только RPC

---

## Этап 7: Остальные сервисы

Для каждого — только RPC, событий нет:

### Checkout
- [ ] `checkout.module.ts`, `checkout.service.ts`
- [ ] Удалить Moleculer файлы

### Delivery
- [ ] `delivery.module.ts`, `delivery.service.ts`
- [ ] Удалить Moleculer файлы

### Orders
- [ ] `orders.module.ts`, `orders.service.ts`
- [ ] Удалить Moleculer файлы

### Pricing
- [ ] `pricing.module.ts`, `pricing.service.ts`
- [ ] Удалить Moleculer файлы

---

## Этап 8: Очистка

- [ ] Удалить `MoleculerLogger`
- [ ] Удалить `nestjs/NestBroker`
- [ ] Удалить `nestjs/ServiceSchemaAdapter`
- [ ] Удалить `moleculer`, `@types/moleculer`, `moleculer-repl`, `nats`
- [ ] Обновить CI/CD, Dockerfile

**Done:** Нет Moleculer в коде

---

## Этап 9: Тестирование

### RPC
- [ ] Cross-service `broker.call`
- [ ] Коллизия имён → ошибка

### RabbitMQ (только inventory)
- [ ] `inventory.update.request` → обработчик получает

### Shutdown
- [ ] `SIGTERM` → graceful close

**Done:** Все тесты проходят

---

## Этап 10: Release

- [ ] Ветка `moleculer-backup`
- [ ] Скрипт `scripts/rollback-moleculer.sh`
- [ ] Staging
- [ ] Production

**Done:** Система в production

---

## Сводка сервисов

| Сервис | Actions | Events | GraphQL/HTTP |
|--------|---------|--------|--------------|
| payments | `getPaymentMethods` | - | - |
| inventory | `getOffers` | `inventory.update.request` | GraphQL |
| apps | ? | - | ? |
| media | ? | - | ? |
| checkout | ? | - | - |
| delivery | ? | - | - |
| orders | ? | - | - |
| pricing | ? | - | - |

---

## Порядок

```
Этап 1 → Этап 2 → [Этапы 3-7 параллельно] → Этап 8 → Этап 9 → Этап 10
```

---

## Пример: миграция action (payments)

### БЫЛО (Moleculer)

```typescript
// services/payments/src/service.ts
import { Service, ServiceSchema, Context } from "moleculer";
import { Kernel, MoleculerLogger } from "@shopana/shared-kernel";
import { paymentMethods } from "./scripts/paymentMethods.js";

const PaymentsService: ServiceSchema = {
  name: "payments",

  actions: {
    async getPaymentMethods(this: ServiceThis, ctx: Context<GetPaymentMethodsParams>) {
      return this.kernel.executeScript(paymentMethods, ctx.params);
    },
  },

  async started() {
    this.kernel = new Kernel(this.broker, new MoleculerLogger(this.logger));
  },
};

export default PaymentsService;
```

### СТАЛО (NestJS)

```typescript
// services/payments/src/payments.module.ts
import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "payments" })],
  providers: [PaymentsService],
})
export class PaymentsModule {}
```

```typescript
// services/payments/src/payments.service.ts
import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Kernel, SERVICE_BROKER, ServiceBroker } from "@shopana/shared-kernel";
import { paymentMethods } from "./scripts/paymentMethods.js";

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private kernel: Kernel;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  onModuleInit() {
    this.kernel = new Kernel(this.broker, this.logger);

    // Регистрация action — вызывается как broker.call("payments.getPaymentMethods", params)
    this.broker.register("getPaymentMethods", (params) =>
      this.kernel.executeScript(paymentMethods, params)
    );

    this.logger.log("Payments service started");
  }

  async onModuleDestroy() {
    // Cleanup если нужен (закрытие соединений, серверов и т.д.)
    // ServiceBroker сам deregister'ит actions и ждёт in-flight операции
    this.logger.log("Payments service stopped");
  }
}
```

### Что изменилось

| Moleculer | NestJS |
|-----------|--------|
| `ServiceSchema` объект | `@Module` + `@Injectable` классы |
| `actions: { getPaymentMethods }` | `broker.register("getPaymentMethods", handler)` |
| `ctx.params` | `params` напрямую |
| `this.broker` из Moleculer | `@Inject(SERVICE_BROKER)` |
| `started()` | `onModuleInit()` |
| `stopped()` | `onModuleDestroy()` |
| `MoleculerLogger` | NestJS `Logger` |
