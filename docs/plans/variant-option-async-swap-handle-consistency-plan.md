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
- Изменение slug у `ProductOptionValue` тоже меняет option-derived `variant.handle`: сейчас это делает `OptionUpdateScript.rebuildAffectedVariantHandles`.
- Удаление option/value через `OptionDeleteScript`, `OptionsSyncScript.deleteExcept` и `OptionsSyncScript.deleteValuesExcept` может каскадом удалить rows из `product_option_variant_link`; это тоже изменение active option links и должно проходить через тот же consistency boundary.
- В `catalog.variant` есть partial unique index:

```ts
uniqueIndex("variant_product_id_handle_key")
  .on(table.productId, table.handle)
  .where(sql`deleted_at IS NULL`)
```

- Текущий batch script уже использует временные handles, чтобы поддерживать синхронные swaps внутри одной backend operation.
- Проблема возникает, когда изменения опций асинхронные и swap растянут на несколько операций или шагов worker-а.

## Результаты code audit

Новый flow должен покрыть не только новую async mutation, а все текущие writer paths, которые меняют option matrix варианта или данные, из которых строится `variant.handle`.

### Прямые изменения variant option links

| Entry point | Текущий код | Что обновить |
| --- | --- | --- |
| Single variant relink | `services/catalog/src/resolvers/admin/MutationResolver.ts` -> `variantUpdateOptions` -> `VariantUpdateOptionsScript` | Не выполнять time-stretched swap как независимый single update. Либо оставить только immediate atomic path для одного варианта, либо создавать `variant_option_change_operation` с одним item и финализировать тем же finalizer-ом. |
| Product update variant ops | `ProductUpdateWorkflow.stepBatchUpdateOptions` -> `VariantBatchUpdateOptionsScript` | Сохранить как immediate atomic path для одной workflow operation. Если workflow становится async/staged, он должен создавать operation и ждать/возвращать operation status, а не писать links частями. |
| Product bulk update | `ProductBulkEditWorkflow` -> `catalog.productUpdate` per product group | Bulk item с option changes должен наследовать operation status. Item нельзя помечать `SUCCEEDED`, пока option operation не `applied`; `failed/cancelled` operation мапится в failed bulk item errors. |
| Direct repository helpers | `OptionRepository.linkVariant`, `OptionRepository.clearVariantLinks` | Сделать low-level helpers внутренними для finalizer/immediate atomic scripts. Новые scripts не должны напрямую вызывать clear+link вне product-scoped transaction/lock. |
| Create variant with options | `variantCreate` -> `VariantCreateScript` | Это создание нового active row, не swap. Нужно переиспользовать общий validator/handle builder и duplicate error mapping, чтобы create и finalizer давали одинаковый результат. |
| Create product with variants | `productCreate` -> `ProductCreateScript` | Это initial active state. Нужно заменить parsing handle -> slugs на общий deterministic builder/validator или явно проверить, что input variants уже соответствуют option matrix. |

### Изменения option definitions и values

| Entry point | Текущий код | Почему относится к consistency flow | Что обновить |
| --- | --- | --- | --- |
| `productOptionUpdate` | `OptionUpdateScript` | `values.update[].slug` пересобирает handles для всех variants, которые используют value. `values.delete[]` удаляет value и через cascade может удалить links. | Slug-change rebuild должен идти через product-scoped finalizer: сначала посчитать affected variants/final handles, затем атомарно выставить temp handles и финальные handles. Delete value должен либо отклоняться, если value используется active variants, либо создавать operation, которая явно описывает новые links для affected variants. |
| `productOptionsSync` | `OptionsSyncScript` | Удаляет отсутствующие options/values, upsert-ит values и меняет slugs. Это может массово менять links и handles. | Sync должен выполнять preflight diff: created/updated/deleted options/values, affected variants, final option matrix. Все изменения, влияющие на active variant links/handles, применяются через тот же operation/finalizer под product lock. |
| `productOptionDelete` | `OptionDeleteScript` | `ON DELETE CASCADE` удаляет option values и variant links, но active variant handles не пересобираются как единая операция. | Запретить delete, если option используется active variants, без явного variant option change operation; либо превратить delete в operation, которая удаляет option и пересобирает affected variant handles в одной финальной транзакции. |
| `productOptionCreate` | `OptionCreateScript` | Новая option сама по себе не меняет existing variant links, но меняет правило "полный набор опций" для будущих variants. | Не нужен pending flow, если existing variants не обязаны сразу получить value. Если бизнес-правило требует full matrix для всех variants, create option должен создавать operation с default/selected values для всех affected variants. |

### Read/projection paths, которые должны видеть только active state

| Path | Текущий код | Требование |
| --- | --- | --- |
| Variant selected options | `VariantResolver.selectedOptions`, `VariantRepository.getSelectedOptionsByVariantIds` | Возвращать только active links. Pending desired links доступны отдельным admin-полем/operation resolver-ом. |
| Variant search index | `SyncVariantIndexScript` читает `product_option_variant_link` и option/value slugs | Индекс обновлять только после `operation.applied`. До финализации индекс остается на старом active state. |
| Product update events | `ProductUpdateWorkflow.workflowEmitEvent` emits `productUpdated` | Event должен выходить после commit финализации и содержать affected variant ids/options/revision/operationId. Pending create не должен эмитить active `productUpdated`. |
| Admin variant option grid | `admin/src/domains/inventory/products/mappers/product-variant-options.mapper.ts` -> `productUpdate` | Для immediate mode можно оставить `productUpdate`; для async mode UI должен создавать operation и показывать status/preview. |
| Admin product options modal | `useSyncProductOptions` -> `productOptionsSync` | При diff, влияющем на active variants, UI должен получить operation id/status или validation error, а не считать options instantly active. |

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
  kind text NOT NULL,
  status text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  idempotency_key text,
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

`kind` должен различать причину операции, чтобы retry/failure UI и bulk jobs могли объяснить пользователю, что именно применялось:

| Kind | Когда создавать |
| --- | --- |
| `variant_relink` | Изменение selected options для существующих variants. |
| `variant_create` | Создание variants в async workflow, если create отделен от product update transaction. |
| `option_value_slug_change` | Изменение slug value, влияющее на handles существующих variants. |
| `option_value_delete` | Удаление value, который используется active variants. |
| `option_delete` | Удаление option, который используется active variants. |
| `options_sync` | Массовый sync definitions/values, который меняет links или option-derived handles. |

`source` должен хранить caller: `variantUpdateOptions`, `productUpdate`, `productBulkUpdate`, `productOptionsSync`, `productOptionUpdate`, `productOptionDelete`, `admin`, `import` и т.п.

Для операций, которые меняют option definitions, одной item-таблицы links недостаточно. Нужна staged payload/model, например:

```sql
CREATE TABLE catalog.variant_option_change_operation_definition_patch (
  operation_id uuid NOT NULL REFERENCES catalog.variant_option_change_operation(id) ON DELETE CASCADE,
  patch jsonb NOT NULL,
  PRIMARY KEY (operation_id)
);
```

`patch` хранит нормализованный diff option/value create/update/delete. Finalizer применяет этот diff в той же транзакции, где пересобирает affected variant links и handles.

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
2. Если operation содержит definition patch, загрузить staged option/value diff.
3. Взять product-scoped lock.
4. Проверить, что product revision/variants/options/values все еще соответствуют preflight assumptions операции. Если используется optimistic revision, stale operation переводится в `failed` с кодом `STALE_OPERATION`.
5. Проверить, что все variants все еще существуют и принадлежат продукту.
6. Проверить, что все options и values все еще принадлежат продукту или будут созданы staged patch-ем.
7. Проверить, что у каждого variant максимум одно value на option.
8. Собрать desired option links для каждого затронутого variant.
9. Для option/value delete убедиться, что affected variants получили явные desired links без удаляемых values; silent cascade не допускается.
10. Для option value slug changes собрать affected variants по текущим links.
11. Собрать финальные handles из desired links и staged value slugs через общий helper, не читая уже частично измененную таблицу links.
12. Найти duplicate final handles внутри operation.
13. Найти конфликты с active variants вне operation.
14. В одной транзакции:
    - пометить operation как `applying`, если она еще `pending`;
    - выставить временные уникальные handles для затронутых variants;
    - применить option/value definition patch, если он есть;
    - заменить option links для затронутых variants;
    - выставить финальные handles;
    - инкрементировать product revision;
    - отметить operation как `applied`.
15. После commit emit-ить `productUpdated` с affected variants и `operationId`.

Активный unique index на `(product_id, handle)` остается включенным во время финальной транзакции. Если финальное состояние невалидно, транзакция падает, а operation помечается как `failed`.

Finalizer должен быть единственным местом, где для async flow одновременно меняются:

- `catalog.product_option`
- `catalog.product_option_value`
- `catalog.product_option_variant_link`
- `catalog.variant.handle`
- `catalog.product.revision`

Immediate atomic scripts могут остаться, но они должны использовать тот же validator/finalizer-core внутри одной транзакции.

## Eventual Consistency Model

Eventual consistency достигается разделением состояния на pending intent и active catalog state.

1. Создание operation коммитит только intent (`pending`) и staged desired state. Active `variant`, `product_option_variant_link` и handle-based lookups не меняются.
2. DBOS workflow с детерминированным `workflowId` поднимает operation и ретраит transient failures. Повторный request с тем же idempotency key возвращает ту же operation, а не создает вторую.
3. Product-scoped lock сериализует финализацию всех option-changing operations одного продукта. Поэтому две операции не могут одновременно пересчитать handles из разных snapshots и обе закоммититься.
4. Финальная транзакция атомарно переводит active state из старой валидной матрицы в новую валидную матрицу. Между этими состояниями нет observable partial active state.
5. После commit emitted `productUpdated` запускает downstream projections/handlers. Search index и другие read models могут отставать, но они converged через event retry/DLQ framework; authoritative reads из catalog DB уже консистентны.
6. Если финализация не может получить валидное final state, operation становится `failed`, active state остается старым, UI показывает ошибку и может создать новую operation/retry.

Итого: eventual consistency относится к pending operation processing и downstream projections, а не к active variant handles. Active catalog invariant `unique(product_id, handle) where deleted_at is null` остается strongly consistent в момент каждого commit.

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

Существующий синхронный batch path через `productUpdate` может остаться для immediate atomic edits, но contract должен явно различать:

- `immediate`: backend применяет все option changes внутри текущей product update transaction/workflow step;
- `async`: backend создает operation и возвращает `operationId/status`, а active state обновится после finalizer-а.

`variantUpdateOptions` не должен оставаться "тихим" single update path для async сценариев. Для него есть два допустимых поведения:

- только immediate single-variant update, с duplicate errors как сейчас;
- wrapper над `productVariantOptionsChangeCreate` с одним variant item.

Для option definition APIs (`productOptionUpdate`, `productOptionDelete`, `productOptionsSync`) payload тоже должен уметь возвращать operation metadata, когда изменение влияет на active variants. Пример:

```graphql
type ProductOptionsSyncPayload {
  product: Product
  options: [ProductOption!]!
  operation: ProductVariantOptionsChangeOperation
  userErrors: [UserError!]!
}
```

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
4. Вынести общий service/helper для:
   - нормализации option links;
   - validation option/value ownership;
   - расчета final handles из desired links и staged value slugs;
   - duplicate combination/handle detection.
5. Добавить script/workflow, который создает operation после immediate validation.
6. Добавить finalizer script/workflow, который применяет operation под product lock.
7. Переиспользовать `buildVariantHandleFromValues` как pure path; для финализации не строить handles из уже мутированных active links.
8. Оставить temporary handle logic похожей на `VariantBatchUpdateOptionsScript`, но исполнять ее внутри одной финальной транзакции.
9. Ошибки duplicate-handle делать operation-level failures, а не partial variant updates.
10. Обновить `VariantUpdateOptionsScript`: либо перевести на operation create, либо оставить только как immediate single-variant path с общим validator.
11. Обновить `VariantBatchUpdateOptionsScript`: сделать thin wrapper над finalizer-core для immediate mode.
12. Обновить `ProductUpdateWorkflow.stepBatchUpdateOptions`: immediate mode вызывает batch wrapper; async mode создает operation и возвращает operation status в operation result.
13. Обновить `ProductBulkEditWorkflow`: option-changing items ждут applied/failed status operation; job progress не должен показывать success до финализации.
14. Обновить `OptionUpdateScript`: slug changes и value deletes применяются через operation/finalizer-core для affected variants.
15. Обновить `OptionDeleteScript`: запретить silent cascade для used options или переводить delete в operation.
16. Обновить `OptionsSyncScript`: делать diff и staged definition patch; все link/handle-affecting sync changes применять через operation/finalizer-core.
17. Проверить `OptionCreateScript`: если новая option требует значения у всех variants, создавать operation; иначе оставить immediate create без изменения existing variants.
18. Обновить `ProductCreateScript` и `VariantCreateScript`: использовать общий handle/combination validator, чтобы initial active state совпадал с finalizer semantics.
19. После applied operation emit-ить `productUpdated` с affected variants, revision и operation id.

## Frontend Changes

Admin-редактирование опций варианта должно различать два режима сохранения:

- immediate save через существующий `productUpdate`, когда backend может применить изменения атомарно;
- создание asynchronous operation, когда UI намеренно планирует staged/sync workflow.

Для asynchronous mode:

- отправлять все affected rows как одну operation;
- показывать operation status после создания;
- не блокировать UI draft validation только потому, что промежуточный шаг дал бы duplicate существующей комбинации;
- все еще показывать final-state duplicate errors, если desired final state имеет duplicate handles.

Admin-редактирование option definitions через `edit-options-modal` / `productOptionsSync` должно:

- показывать, что sync создал pending operation, если он затрагивает active variants;
- не считать удаление option/value примененным в UI active state до `operation.applied`;
- показывать failed operation errors для slug/delete conflicts;
- refetch-ить product/options/variants после `applied`, а не строить active state из staged patch.

Bulk editor должен:

- показывать item как running/pending, если его product update создал async option operation;
- мапить `operation.failed` в bulk item errors;
- не пересылать sequential `variantUpdateOptions` для swap сценариев.

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
- Должен ли `productOptionCreate` требовать backfill values для всех existing variants или может создавать новую option без variant links.
- Должны ли `productOptionDelete` и `option value delete` быть запрещены при usage или всегда превращаться в operation с explicit relink/removal policy.
- Нужно ли хранить `base_product_revision` на operation и fail-ить stale operations, или finalizer должен пытаться rebase desired links на текущий active state.
- Как `productBulkUpdate` должен отображать long-running option operations: отдельный bulk item статус `WAITING_OPERATION` или текущий `RUNNING` с operation metadata.
- Нужен ли отдельный event `variantOptionChangeOperationApplied` или достаточно расширенного `productUpdated`.

## Acceptance Criteria

- Active variants не могут иметь duplicate `(product_id, handle)`, пока `deleted_at IS NULL`.
- Time-stretched swap можно принять как одну pending operation.
- Pending operation может описывать desired option links, которые конфликтовали бы при применении по одному variant за раз.
- Финализация применяет все affected variants атомарно.
- Финализация либо полностью успешна, либо оставляет active state неизмененным.
- Handle-based reads остаются deterministic.
- `variantUpdateOptions`, `productUpdate`, `productBulkUpdate`, `productOptionUpdate`, `productOptionDelete` и `productOptionsSync` не обходят operation/finalizer-core, когда меняют existing variant links или option-derived handles.
- Изменение slug option value пересобирает handles affected variants под product lock и не оставляет partial handle updates.
- Удаление option/value не может silently cascade links без пересчета affected variant handles и product revision.
- `SyncVariantIndexScript` и другие projections обновляются после applied event; pending operation не меняет active projection contract.
- Bulk job item не получает success раньше, чем связанная option operation стала `applied`.
- Существующее синхронное batch swap behavior продолжает работать.
