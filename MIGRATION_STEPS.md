# Поэтапный план миграции на NestJS Modules

Основан на [MIGRATION_PLAN.md](./MIGRATION_PLAN.md). RabbitMQ настраивается автоматически при старте приложения.

**Важно:** `shared-kernel` не билдится отдельно в JS. Импортируется как source code (TypeScript) и компилируется вместе с сервисами через `nest build`.

---

## Этап 1: Shared Kernel ✅

### 1.1 ActionRegistry
- [x] Создать `packages/shared-kernel/src/broker/ActionRegistry.ts`
- [x] Методы: `register`, `deregister`, `resolve`, `list`
- [x] Защита от дублирования actions
- [x] Unit-тесты

### 1.2 Tokens
- [x] Создать `packages/shared-kernel/src/broker/tokens.ts`
- [x] Токены: `SERVICE_BROKER`, `BROKER_AMQP`

### 1.3 ServiceBroker
- [x] Создать `packages/shared-kernel/src/broker/ServiceBroker.ts`
- [x] `register` с авто-префиксом `serviceName`
- [x] `call` с валидацией qualified имён
- [x] `emit` и `broadcast` для RabbitMQ
- [x] `onModuleDestroy` с ожиданием in-flight
- [x] `isHealthy`, `getHealth`
- [x] Unit-тесты

### 1.4 BrokerCoreModule
- [x] Создать `packages/shared-kernel/src/broker/BrokerCoreModule.ts`
- [x] `forRoot` с опциональным RabbitMQ
- [x] Авто-создание exchanges: `shopana.events`, `shopana.broadcast`, `shopana.dlx`
- [x] `BrokerAmqpLifecycle` для graceful shutdown
- [x] Stub для работы без RabbitMQ

### 1.5 BrokerModule
- [x] Создать `packages/shared-kernel/src/broker/BrokerModule.ts`
- [x] `forFeature({ serviceName })`

### 1.6 Экспорты и зависимости
- [x] Обновить `packages/shared-kernel/src/index.ts`
- [x] Добавить `@golevelup/nestjs-rabbitmq`, `@nestjs/common`
- [x] Настроить `tsconfig.json` для импорта как source

**Done:** Shared kernel импортируется в сервисы, unit-тесты проходят ✅

---

## Этап 2: Orchestrator ✅

### 2.1 Модуль
- [x] Создать `services/orchestrator/src/orchestrator.module.ts`
- [x] Импортировать `BrokerCoreModule.forRoot`

### 2.2 Bootstrap
- [x] Создать `services/orchestrator/src/main.ts`
- [x] `NestFactory.createApplicationContext`
- [x] Обработка `SIGTERM`/`SIGINT`

### 2.3 Package.json
- [x] Скрипты: `build`, `dev`, `start`

**Done:** Orchestrator запускается, exchanges создаются автоматически ✅

---

## Этап 3: Payments ✅

- [x] Создать `payments.module.ts`
- [x] Создать `payments.service.ts`
- [x] Action: `getPaymentMethods`
- [x] Добавить в `OrchestratorModule`
- [x] Удалить `service.ts`, `moleculer.ts`

**Done:** Payments модуль создан, Moleculer файлы удалены

---

## Этап 4: Inventory ✅

- [x] Создать `inventory.module.ts`
- [x] Создать `inventory.service.ts`
- [x] Action: `getOffers`
- [x] Event: `inventory.update.request` → `@RabbitSubscribe`
- [x] GraphQL server (Fastify + Apollo)
- [x] Добавить в `OrchestratorModule`
- [x] Удалить `service.ts`, `moleculer.ts`

**Done:** Inventory модуль с events и GraphQL создан, Moleculer файлы удалены

---

## Этап 5: Apps ✅

- [x] Создать `apps.module.ts`
- [x] Создать `apps.service.ts`
- [x] Action: `execute`
- [x] Добавить в `OrchestratorModule`
- [x] Удалить `service.ts`, `moleculer.ts`

**Done:** Apps модуль с pluginManager создан, Moleculer файлы удалены

---

## Этап 6: Media ✅

- [x] Создать `media.module.ts`
- [x] Создать `media.service.ts`
- [x] GraphQL server
- [x] Добавить в `OrchestratorModule`
- [x] Удалить `service.ts`, `moleculer.ts`

**Done:** Media модуль с GraphQL создан, Moleculer файлы удалены

---

## Этап 7: Остальные сервисы ✅

Для каждого — только RPC, событий нет:

### Checkout ✅
- [x] `checkout.module.ts`, `checkout.service.ts`
- [x] Actions: `getById`, `getCheckoutById`
- [x] Удалить Moleculer файлы

### Delivery ✅
- [x] `delivery.module.ts`, `delivery.service.ts`
- [x] Actions: `shippingMethods`, `createDeliveryGroups`
- [x] Удалить Moleculer файлы

### Orders ✅
- [x] `orders.module.ts`, `orders.service.ts`
- [x] Actions: `createOrder`, `getOrderById`
- [x] Удалить Moleculer файлы

### Pricing ✅
- [x] `pricing.module.ts`, `pricing.service.ts`
- [x] Actions: `getAllDiscounts`, `validateDiscount`, `evaluateDiscounts`
- [x] Удалить Moleculer файлы

**Done:** Все сервисы мигрированы на NestJS, Moleculer файлы удалены

---

## Этап 8: Очистка ✅

- [x] Удалить `MoleculerLogger`
- [x] Удалить `nestjs/NestBroker`
- [x] Удалить `nestjs/ServiceSchemaAdapter`
- [x] Удалить `moleculer`, `@types/moleculer`, `moleculer-repl`, `nats`
- [ ] Обновить CI/CD, Dockerfile

**Done:** Moleculer полностью удалён из кода и зависимостей

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
