# @shopana/shared-kernel

Архитектурное ядро (microkernel) для микросервисов Shopana, реализующее паттерн Transaction Script.

## Описание

Пакет предоставляет минималистичную архитектуру ядра для микросервисов:

- **Kernel** - центральный координатор для выполнения транзакционных скриптов
- **Transaction Script** - паттерн для организации бизнес-логики
- **MoleculerLogger** - адаптер для Moleculer logger
- Набор общих типов и интерфейсов

## Установка

```bash
yarn add @shopana/shared-kernel
```

## Использование

### 1. Создание Kernel в сервисе

```typescript
import { Kernel, MoleculerLogger } from "@shopana/shared-kernel";
import { Service, ServiceSchema } from "moleculer";

type ServiceThis = Service & { kernel: Kernel };

const MyService: ServiceSchema = {
  name: "my-service",

  async started() {
    const moleculerLogger = new MoleculerLogger(this.logger);
    this.kernel = new Kernel(this.broker, moleculerLogger);
  }
};
```

### 2. Создание Transaction Script

```typescript
import type { TransactionScript } from "@shopana/shared-kernel";

export interface GetDataParams {
  readonly projectId: string;
  readonly filter?: string;
}

export interface GetDataResult {
  items: any[];
  warnings?: Array<{ code: string; message: string }>;
}

export const getData: TransactionScript<GetDataParams, GetDataResult> =
  async (params, services) => {
    const { broker, logger } = services;

    try {
      const result = await broker.call("apps.execute", {
        domain: "mydomain",
        operation: "list",
        params: { projectId: params.projectId },
      });

      return {
        items: result.data || [],
        warnings: result.warnings,
      };
    } catch (error) {
      logger.error({ error }, "getData failed");
      return {
        items: [],
        warnings: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
      };
    }
  };
```

### 3. Выполнение скриптов через Kernel

```typescript
actions: {
  async getData(this: ServiceThis, ctx: Context<GetDataParams>) {
    return this.kernel.executeScript(getData, ctx.params);
  }
}
```

## Архитектура

### Kernel Services

Kernel предоставляет скриптам два основных сервиса:

- **broker** - Moleculer ServiceBroker для межсервисной коммуникации
- **logger** - Логгер для записи событий и ошибок

### Transaction Script Pattern

Transaction Script - это паттерн организации бизнес-логики, при котором каждая операция представлена отдельной функцией (скриптом). Скрипт:

1. Получает параметры и сервисы от Kernel
2. Выполняет бизнес-логику
3. Возвращает результат

Преимущества:
- Простота и понятность
- Легкое тестирование
- Минимальная связность
- Явные зависимости

## Типы

### Logger

```typescript
interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}
```

### KernelServices

```typescript
interface KernelServices {
  readonly broker: any;
  readonly logger: Logger;
}
```

### TransactionScript

```typescript
interface TransactionScript<TParams = any, TResult = any> {
  (params: TParams, services: KernelServices): Promise<TResult>;
}
```

### ScriptResult

```typescript
interface ScriptResult<TData = any> {
  data: TData;
  warnings?: Array<{ code: string; message: string; details?: any }>;
  metadata?: Record<string, unknown>;
}
```

### KernelError

```typescript
class KernelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  );
}
```

## Примеры использования

См. сервисы:
- `services/payments` - работа с платежными методами
- `services/delivery` - работа с методами доставки
- `services/pricing` - работа со скидками и ценообразованием

## Лицензия

ISC
