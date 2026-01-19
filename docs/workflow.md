Ниже — полный план "с нуля", как сделать **один DBOS workflow = одна бизнес-операция**, который вызывает действия всех сервисов **in-process сегодня**, но **безболезненно переключается на gRPC завтра**. Без listeners, без ACK, без "broadcast".

---

## Цель

- Есть бизнес-операция (например `store.create`).
- Внутри неё DBOS workflow делает шаги:

  1. локальные изменения (в этом сервисе)
  2. вызовы IAM / Inventory / Media / Orders (сейчас in-process)
  3. при ошибке — компенсация (опционально)

- Все вызовы сервисов идут через **порты** (`ServicePort`), чтобы позже заменить на gRPC.

---

## Шаг 0. Определяем границы "сервисов" внутри процесса

Сейчас "сервисы" — это модули/классы в одном процессе. Завтра — отдельные процессы по gRPC.

Требование к каждому сервису: один входной метод вида:

- `handleAction(action, payload, ctx)`
  где `ctx` содержит `operationId`/`idempotencyKey`.

---

## Шаг 1. Вводим общий контракт событий и контекст

В `packages/contracts` (или `packages/workflows`):

```ts
export interface ActionContext {
  operationId: string; // = DBOS.workflowID
  idempotencyKey: string; // operationId + ":" + service + ":" + action
  timestamp: string;
}

export interface ActionEvent<T = unknown> {
  action: string;
  payload: T;
  ctx: ActionContext;
}
```

---

## Шаг 2. Вводим "порт" для вызова сервисов (абстракция транспорта)

```ts
export interface ServicePort {
  readonly name: string;
  handle(action: string, payload: unknown, ctx: ActionContext): Promise<void>;
}
```

**Почему так:** workflow не должен знать "как" общаться (локально или gRPC).

---

## Шаг 3. Реализация LocalPort (in-process)

```ts
export class LocalServicePort implements ServicePort {
  constructor(
    public readonly name: string,
    private readonly target: {
      handleAction(
        action: string,
        payload: unknown,
        ctx: ActionContext
      ): Promise<void>;
    }
  ) {}

  async handle(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<void> {
    return this.target.handleAction(action, payload, ctx);
  }
}
```

---

## Шаг 4. Реализация GrpcPort (заготовка на будущее)

Сейчас можешь оставить заглушку, но интерфейс уже готов.

```ts
export class GrpcServicePort implements ServicePort {
  constructor(
    public readonly name: string,
    private readonly client: { handle(req: ActionEvent): Promise<void> } // gRPC stub
  ) {}

  async handle(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<void> {
    return this.client.handle({ action, payload, ctx });
  }
}
```

---

## Шаг 5. Делает каждый сервис: единый handler + идемпотентность

В каждом сервисе (IAM/Inventory/Media…) делаем класс:

```ts
export class InventoryActionHandler {
  constructor(private readonly repo: InventoryRepository) {}

  async handleAction(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<void> {
    // 1) идемпотентность (рекомендуется сразу заложить)
    // if (await repo.wasProcessed(ctx.idempotencyKey)) return;
    // await repo.markProcessed(ctx.idempotencyKey);

    switch (action) {
      case "store.initialize":
        return this.initialize(payload as { storeId: string });
      case "store.cleanup":
        return this.cleanup(payload as { storeId: string });
      default:
        // Лучше НЕ молча игнорировать:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  private async initialize(p: { storeId: string }) {
    await this.repo.createDefaultCategories(p.storeId);
    await this.repo.createDefaultSettings(p.storeId);
  }

  private async cleanup(p: { storeId: string }) {
    await this.repo.deleteByStoreId(p.storeId);
  }
}
```

### Идемпотентность (минимум)

Когда вынесешь в gRPC, ретраи и сетевые сбои будут реальностью. Поэтому лучше уже сейчас завести таблицу:

- `processed_requests(idempotency_key PRIMARY KEY, created_at, service, action, operation_id)`

И:

- перед выполнением: `insert ... on conflict do nothing`
- если conflict — значит уже делали.

---

## Шаг 6. Создаём один Orchestrator Workflow (бизнес-операция)

Ключевое:

- **все side-effects — в `@DBOS.step()`**
- workflow строит `ctx` и дергает порты

```ts
import { DBOS, ConfiguredInstance } from "@dbos-inc/dbos-sdk";

export class StoreCreateWorkflow extends ConfiguredInstance {
  constructor(
    name: string,
    private readonly storeRepo: StoreRepository,
    private readonly ports: ServicePort[] // iam/media/inventory/orders
  ) {
    super(name);
  }

  @DBOS.workflow()
  async run(input: {
    name: string;
    displayName: string;
    organizationId: string;
    userId: string;
  }) {
    const operationId = DBOS.workflowID!;
    const storeId = await this.generateStoreId();

    await this.createStoreLocal(storeId, input);

    // шаги бизнес-операции
    await this.fanoutAll("store.initialize", {
      storeId,
      organizationId: input.organizationId,
      userId: input.userId,
    });

    DBOS.setEvent("store:create:done", { storeId });
    return { storeId };
  }

  @DBOS.step()
  private async generateStoreId(): Promise<string> {
    return crypto.randomUUID();
  }

  @DBOS.step()
  private async createStoreLocal(storeId: string, input: any): Promise<void> {
    await this.storeRepo.create({
      id: storeId,
      name: input.name,
      displayName: input.displayName,
      organizationId: input.organizationId,
    });
  }

  // fan-out в рамках одной операции
  @DBOS.step()
  private async fanoutAll(action: string, payload: unknown): Promise<void> {
    const operationId = DBOS.workflowID!;
    const timestamp = new Date().toISOString();

    const results = await Promise.allSettled(
      this.ports.map((p) =>
        p.handle(action, payload, {
          operationId,
          timestamp,
          idempotencyKey: `${operationId}:${p.name}:${action}`,
        })
      )
    );

    const failed = results
      .map((r, i) => ({ r, svc: this.ports[i].name }))
      .filter((x) => x.r.status === "rejected");

    if (failed.length) {
      // опционально: компенсация
      await this.compensate(payload, operationId);
      throw new Error(
        `Failed services: ${failed.map((f) => f.svc).join(", ")}`
      );
    }
  }

  @DBOS.step()
  private async compensate(payload: any, operationId: string): Promise<void> {
    // пример: дернуть cleanup у всех (или выборочно)
    const timestamp = new Date().toISOString();
    await Promise.allSettled(
      this.ports.map((p) =>
        p.handle("store.cleanup", payload, {
          operationId,
          timestamp,
          idempotencyKey: `${operationId}:${p.name}:store.cleanup`,
        })
      )
    );
  }
}
```

---

## Шаг 7. Склейка DI: registry портов

В "композиционном" модуле (например в Nest Module) ты собираешь порты:

### Сегодня (local)

```ts
const ports: ServicePort[] = [
  new LocalServicePort("iam", iamHandler),
  new LocalServicePort("media", mediaHandler),
  new LocalServicePort("inventory", inventoryHandler),
  new LocalServicePort("orders", ordersHandler),
];
```

### Завтра (grpc)

```ts
const ports: ServicePort[] = [
  new GrpcServicePort("iam", iamGrpcClient),
  new GrpcServicePort("media", mediaGrpcClient),
  // ...
];
```

**Смена транспорта = замена одной строки сборки портов.**

---

## Шаг 8. Ошибки, ретраи, политика

Рекомендую сразу определить правила:

1. **Параллельно vs последовательно**

   - параллельно: быстрее, но сложнее дебажить
   - последовательно: проще, можно логически зависимые шаги

2. **Что делать при падении одного сервиса**

   - fail-fast + compensate
   - partial success (редко для инициализации стора)
   - retry policy (например 3 попытки в step, если DBOS позволяет конфиг)

3. **Timeouts**

   - локально почти не нужно
   - на gRPC — обязательно (deadline)

---

## Шаг 9. Наблюдаемость

В workflow:

- `DBOS.setEvent("progress", { step, service, action })`
- `DBOS.setEvent("result", { storeId, ok: true })`

Это даст UI/статус без отдельного ACK протокола.

---

## Шаг 10. Переезд на gRPC

Когда вынесешь сервис:

1. поднимаешь gRPC endpoint `Handle(ActionEvent)` в каждом сервисе
2. внутри он вызывает тот же `handleAction` (не переписываешь логику)
3. в orchestrator меняешь LocalPort на GrpcPort

**Главное — идемпотентность по idempotencyKey**, иначе ретраи дадут дубли.

---

### Итого

Ты получаешь:

- **один workflow на операцию**
- вызовы всех сервисов как часть шагов
- сегодня in-process, завтра gRPC — без переписывания workflow
- контроль ошибок/компенсации в одном месте

Если хочешь — могу накидать маленький пример **NestJS wiring** (providers + factory, где по env выбирается LocalPort/GrpcPort), чтобы это реально компилилось "из коробки".
