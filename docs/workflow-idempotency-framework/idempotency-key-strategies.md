# Стратегии создания Idempotency Keys

## Обзор

Система поддерживает три источника идемпотентных ключей, вдохновленные подходом Stripe.

---

## 1. Client-Provided Keys (Внешний API)

**Когда использовать:** Запросы от внешних клиентов через API.

**Источник:** HTTP-заголовок `Idempotency-Key`

**Формат ключа:**
```
client:{sha256(tenantId:apiKeyId:operation:clientKey)}
```

**Scope:** `tenant + api_key + provided_key`

**TTL:** 24 часа (стандарт Stripe)

**Пример:**
```typescript
// HTTP Header: Idempotency-Key: "user-order-123"

const ctx: ClientIdempotencyContext = {
  source: "client",
  clientKey: "user-order-123",
  tenantId: "org-abc",
  apiKeyId: "key-xyz"
};
```

---

## 2. Workflow-Derived Keys (Service-Initiated)

**Когда использовать:** Background jobs, event handlers, cron tasks, внутренние workflow операции.

**Источник:** Контекст workflow (DBOS)

**Компоненты:**
| Поле | Описание | Пример |
|------|----------|--------|
| `workflowId` | Business ID workflow | `store:create:org-123:my-store` |
| `stepId` | Имя шага внутри workflow | `createRoles` |
| `callId` | Уникальный ID для fan-out | `store-456` |

**Формат финального ключа:**
```
idempotencyKey = workflow:{sha256(workflowId + stepId + callId)}
```

> **Важно:** `stepId` и `callId` НЕ входят в `workflowId`. Они добавляются отдельно для уникальности ключа на уровне конкретного вызова внутри workflow.

**TTL:** Зависит от типа операции

**Пример:**
```typescript
const ctx: WorkflowIdempotencyContext = {
  source: "workflow",
  workflowId: "store:create:org-123:my-store",
  stepId: "createRoles",
  callId: storeId
};
```

---

## 3. Content-Derived Keys (Idempotent Updates)

**Когда использовать:** UPDATE/SET операции, где одинаковые данные = одинаковая операция.

**Источник:** Хеш содержимого запроса

**Формат ключа:**
```
content:{sha256(resourceId:operation:payloadHash)}
```

**Scope:** `resource + action`

**TTL:** 1 час (короткий)

**Особенность:** Разный payload автоматически создает разный ключ.

**Пример:**
```typescript
// setStock({ sku: "ABC", quantity: 100 })
// Повторный вызов с теми же данными = тот же ключ

const ctx: ContentIdempotencyContext = {
  source: "content",
  resourceId: "ABC",
  operation: "setStock",
  contentHash: sha256(canonicalJson({ sku: "ABC", quantity: 100 }))
};
```

---

## Сравнительная таблица

| Стратегия | Источник | Scope | TTL | Применение |
|-----------|----------|-------|-----|------------|
| **Client** | HTTP Header | tenant + api_key | 24h | External API |
| **Workflow** | DBOS context | service + workflow | По типу операции | Background jobs, events |
| **Content** | Payload hash | resource + action | 1h | Idempotent updates |

---

## Режим без идемпотентности

Для READ операций или явного отключения:

```typescript
const ctx: ActionContext = {
  source: "none",  // Явное отключение
  // ...
};

// Или просто не передавать ctx (legacy режим)
await broker.call("inventory.getStock", { sku: "ABC" });
```
