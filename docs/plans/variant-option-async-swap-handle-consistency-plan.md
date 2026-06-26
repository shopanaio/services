# План консистентности handle при асинхронном swap опций варианта

## Цель

Разрешить swap комбинаций опций вариантов продукта через асинхронные, растянутые во времени workflows, не ломая временно бизнес-операции и сохраняя уникальность `variant.handle` для активных вариантов.

Целевое поведение:

- Активные варианты сохраняют уникальный `handle` в рамках продукта, и это гарантируется базой данных.
- Изменения комбинаций опций можно staged-ить асинхронно.
- Swap, который временно дал бы duplicate option-derived handle, представлен как явная pending operation, а не как невалидное активное состояние.
- Финализация применяет новые option links и финальные handles атомарно для операции в рамках одного продукта.

## Текущий контекст

- Связи опций варианта хранятся в `catalog.product_option_variant_link`.
- Primary key таблицы: `(variant_id, option_id)`, поэтому один вариант может иметь только одно значение для каждой опции.
- Прямого database constraint, который запрещает двум вариантам иметь одинаковую option-value комбинацию, нет.
- Дубли комбинаций опций фактически запрещаются через `catalog.variant.handle`.
- `variant.handle` пересобирается из slug значений опций в `VariantUpdateOptionsScript` и `VariantBatchUpdateOptionsScript`.
- В `catalog.variant` есть partial unique index:

```ts
uniqueIndex("variant_product_id_handle_key")
  .on(table.productId, table.handle)
  .where(sql`deleted_at IS NULL`)
```

- Текущий batch script уже использует временные handles, чтобы поддерживать синхронные swaps внутри одной backend operation.
- Проблема возникает, когда изменения опций асинхронные и swap растянут на несколько операций или шагов worker-а.

## Принцип дизайна

Не делать активное состояние каталога временно неконсистентным.

Если swap растянут во времени, его нужно моделировать как operation со state. Активная read model должна либо:

1. Продолжать отдавать старые стабильные option links и handles до финализации operation.
2. Либо явно исключать варианты в non-active transitional state из активных handle-based lookups.

Предпочтительный подход: держать active state стабильным, а pending option changes хранить отдельно.

## Рекомендуемая архитектура

Использовать pending operation model в рамках продукта.

### Active State

Оставить текущие активные таблицы как published catalog state:

- `catalog.variant`
- `catalog.product_option_variant_link`

Оставить `variant_product_id_handle_key` как жесткий database invariant для активных вариантов.

### Pending State

Добавить таблицу pending operations для асинхронных изменений опций.

Пример таблиц:

```sql
CREATE TABLE catalog.variant_option_change_operation (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  product_id uuid NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  error_code text,
  error_message text
);

CREATE TABLE catalog.variant_option_change_operation_item (
  operation_id uuid NOT NULL REFERENCES catalog.variant_option_change_operation(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL,
  option_id uuid NOT NULL,
  option_value_id uuid NOT NULL,
  PRIMARY KEY (operation_id, variant_id, option_id)
);
```

Рекомендуемые statuses:

| Status | Значение |
| --- | --- |
| `pending` | Operation принята, но еще не обработана. |
| `applying` | Worker применяет operation. |
| `applied` | Operation успешно финализирована. |
| `failed` | Operation не удалось применить, нужно действие пользователя или системы. |
| `cancelled` | Operation отменена до финализации. |

## Flow финализации

Worker или DBOS workflow финализирует operation.

1. Загрузить operation и ее items.
2. Взять product-scoped lock.
3. Проверить, что все variants все еще существуют и принадлежат продукту.
4. Проверить, что все options и values все еще принадлежат продукту.
5. Проверить, что у каждого variant максимум одно value на option.
6. Собрать desired option links для каждого затронутого variant.
7. Собрать финальные handles из desired links.
8. Найти duplicate final handles внутри operation.
9. Найти конфликты с active variants вне operation.
10. В одной транзакции:
    - выставить временные уникальные handles для затронутых variants;
    - заменить option links для затронутых variants;
    - выставить финальные handles;
    - отметить operation как `applied`.

Активный unique index на `(product_id, handle)` остается включенным во время финальной транзакции. Если финальное состояние невалидно, транзакция падает, а operation помечается как `failed`.

## Product Locking

Во время финализации нужен один product-scoped lock, чтобы конкурентные operations не гонялись за один и тот же продукт.

Варианты:

- PostgreSQL advisory transaction lock через стабильный hash от `product_id`.
- Таблица product operation locks с `product_id`, `operation_id` и expiration.
- DBOS workflow-level serialization, если в проекте уже есть надежный per-product queue pattern.

Lock должен покрывать финальную валидацию и write transaction.

## Форма API

Не exposing-ить асинхронный swap как серию независимых update-ов опций варианта.

Добавить или адаптировать operation-oriented API:

```graphql
input VariantOptionChangeInput {
  variantId: ID!
  links: [VariantOptionLinkInput!]!
}

input ProductVariantOptionsChangeOperationInput {
  variants: [VariantOptionChangeInput!]!
}
```

Возможная mutation:

```graphql
productVariantOptionsChangeCreate(
  productId: ID!
  input: ProductVariantOptionsChangeOperationInput!
): ProductVariantOptionsChangeOperationPayload!
```

Payload должен возвращать:

- operation id;
- operation status;
- validation errors для проблем, которые можно определить сразу;
- affected variant ids.

Существующий синхронный batch path через `productUpdate` может остаться для immediate atomic edits.

## Поведение Read Path

Обычные catalog reads должны возвращать только active state.

Admin reads могут опционально включать metadata pending operation:

- у variant есть pending option changes;
- operation status;
- desired option links для preview;
- operation error, если она failed.

Handle-based reads должны оставаться однозначными. Они не должны resolve-иться из pending option links.

## Почему не надо просто удалить unique index

Удаление `variant_product_id_handle_key` разрешит временный duplicate, но также разрешит постоянные duplicate active handles. Это ослабляет не тот invariant.

Нужный invariant не "handles могут дублироваться". Нужный invariant: "active handles уникальны, а pending operations могут временно описывать состояние, которое еще не является active".

## Альтернатива: Partial Unique Index по state

Альтернативный подход - добавить state прямо в `catalog.variant`:

```sql
ALTER TABLE catalog.variant
ADD COLUMN option_sync_state text NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX variant_product_id_handle_active_key
ON catalog.variant(product_id, handle)
WHERE deleted_at IS NULL
  AND option_sync_state = 'active';
```

Во время асинхронного swap затронутые variants переходят в `reconfiguring`, и unique index больше к ним не применяется.

Это сильнее влияет на read paths:

- все active catalog queries должны фильтровать `option_sync_state = 'active'`;
- handle lookup должен определить поведение для reconfiguring variants;
- checkout, pricing, inventory и storefront flows должны понимать, продаваемы ли reconfiguring variants.

Использовать это стоит только если продукту действительно нужно, чтобы сами active variant rows входили в transitional state.

## Backend Changes

Рекомендуемые шаги реализации:

1. Добавить Drizzle models для operation и operation item tables.
2. Добавить migrations через project migration generation flow.
3. Добавить repository для create/read/update variant option change operations.
4. Добавить script/workflow, который создает operation после immediate validation.
5. Добавить finalizer script/workflow, который применяет operation под product lock.
6. Переиспользовать `buildVariantHandle` для расчета final handle.
7. Оставить temporary handle logic похожей на `VariantBatchUpdateOptionsScript`.
8. Ошибки duplicate-handle делать operation-level failures, а не partial variant updates.

## Frontend Changes

Admin-редактирование опций варианта должно различать два режима сохранения:

- immediate save через существующий `productUpdate`, когда backend может применить изменения атомарно;
- создание asynchronous operation, когда UI намеренно планирует staged/sync workflow.

Для asynchronous mode:

- отправлять все affected rows как одну operation;
- показывать operation status после создания;
- не блокировать UI draft validation только потому, что промежуточный шаг дал бы duplicate существующей комбинации;
- все еще показывать final-state duplicate errors, если desired final state имеет duplicate handles.

## Failure Handling

Когда финализация падает:

- оставить active variant state неизмененным;
- отметить operation как `failed`;
- сохранить стабильный error code и человекочитаемый message;
- показать failed operation в Admin;
- разрешить retry, если failure transient;
- требовать пользовательских правок, если финальное desired state невалидно.

Избегать partial application. Failed operation не должна оставлять часть variants с новыми option links, а часть со старыми.

## Открытые решения

- Должны ли pending operation tables хранить только affected variants или полную desired option matrix продукта.
- Создаются ли operations только из Admin или также из import/sync integrations.
- Должны ли pending option changes быть видимыми в storefront reads. Рекомендуемый default: нет.
- Остается ли `variant.handle` строго option-derived после финализации или получает uniqueness suffix.
- Какой механизм product lock нужно стандартизировать для catalog workflows.

## Acceptance Criteria

- Active variants не могут иметь duplicate `(product_id, handle)`, пока `deleted_at IS NULL`.
- Time-stretched swap можно принять как одну pending operation.
- Pending operation может описывать desired option links, которые конфликтовали бы при применении по одному variant за раз.
- Финализация применяет все affected variants атомарно.
- Финализация либо полностью успешна, либо оставляет active state неизмененным.
- Handle-based reads остаются deterministic.
- Существующее синхронное batch swap behavior продолжает работать.
