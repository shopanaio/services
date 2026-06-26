# План консистентности handle при асинхронном swap опций варианта

## Цель

Разрешить swap комбинаций опций вариантов продукта через асинхронные, растянутые во времени workflows, не ломая временно бизнес-операции и сохраняя уникальность `variant.handle` для активных вариантов.

Целевое поведение:

- Активные варианты сохраняют уникальный `handle` в рамках продукта, и это гарантируется базой данных.
- Изменения комбинаций опций staged-ятся только асинхронно через pending operation.
- Swap, который временно дал бы duplicate option-derived handle, представлен как явная pending operation, а не как невалидное активное состояние.
- Финализация применяет новые option links и финальные handles атомарно для операции в рамках одного продукта.

## Текущий контекст

- Связи опций варианта хранятся в `catalog.product_option_variant_link`.
- Primary key таблицы: `(variant_id, option_id)`, поэтому один вариант допускает только одно значение для каждой опции.
- Прямого database constraint, который запрещает двум вариантам иметь одинаковую option-value комбинацию, нет.
- Дубли комбинаций опций фактически запрещаются через `catalog.variant.handle`.
- `variant.handle` пересобирается из slug значений опций в `VariantUpdateOptionsScript` и `VariantBatchUpdateOptionsScript`.
- Изменение slug у `ProductOptionValue` тоже меняет option-derived `variant.handle`: сейчас это делает `OptionUpdateScript.rebuildAffectedVariantHandles`.
- Удаление option/value через `OptionDeleteScript`, `OptionsSyncScript.deleteExcept` и `OptionsSyncScript.deleteValuesExcept` сейчас каскадом удаляет rows из `product_option_variant_link`; это тоже изменение active option links и должно проходить через тот же consistency boundary.
- В `catalog.variant` есть partial unique index:

```ts
uniqueIndex("variant_product_id_handle_key")
  .on(table.productId, table.handle)
  .where(sql`deleted_at IS NULL`)
```

- Текущий batch script уже использует временные handles, но новый contract должен убрать прямую запись active option links из публичных операций и всегда проводить изменения опций существующих variants через async operation.
- Проблема возникает, когда изменения опций растянуты на несколько операций или шагов worker-а.

## Жесткое правило нового flow

Все изменения опций должны идти только через `variant_option_change_operation`.

Запрещенные публичные writer paths:

- direct `variantUpdateOptions`, который сразу пишет `product_option_variant_link`;
- `productUpdate` variant option operation, который сразу пишет links;
- `productBulkUpdate` item, который считается успешным до финализации option operation;
- `variantCreate` / `productCreate`, которые сразу создают selected option links в active tables;
- `productOptionCreate`, который сразу меняет option definition active tables;
- `productOptionUpdate` slug/delete path, который сразу пересобирает handles;
- `productOptionDelete` / `productOptionsSync`, которые позволяют silent cascade active links.

Разрешенный write path один: create pending operation -> DBOS finalizer -> product-scoped lock -> одна commit transaction -> `operation.applied` -> `productUpdated`.

За пределами этой модели остаются только операции, которые вообще не меняют модель опций: product title/content/media/pricing/inventory/tag/category updates. Как только input содержит option definitions, option values или selected option links, он обязан перейти в operation model.

## Результаты code audit

Новый flow должен покрыть не только новую async mutation, а все текущие writer paths, которые меняют option matrix варианта или данные, из которых строится `variant.handle`.

### Прямые изменения variant option links

| Entry point | Текущий код | Что обновить |
| --- | --- | --- |
| Single variant relink | `services/catalog/src/resolvers/admin/MutationResolver.ts` -> `variantUpdateOptions` -> `VariantUpdateOptionsScript` | Перевести в создание `variant_option_change_operation` с одним item. Script не должен напрямую писать links/handle. |
| Product update variant ops | `ProductUpdateWorkflow.stepBatchUpdateOptions` -> `VariantBatchUpdateOptionsScript` | Перевести option part в создание operation и возврат operation id/status. Workflow не должен напрямую писать links/handle. |
| Product bulk update | `ProductBulkEditWorkflow` -> `catalog.productUpdate` per product group | Bulk item с option changes должен наследовать operation status. Item нельзя помечать `SUCCEEDED`, пока option operation не `applied`; `failed/cancelled` operation мапится в failed bulk item errors. |
| Direct repository helpers | `OptionRepository.linkVariant`, `OptionRepository.clearVariantLinks` | Сделать low-level helpers внутренними для finalizer. Application scripts не должны напрямую вызывать clear+link вне product-scoped finalizer transaction. |
| Create variant with options | `variantCreate` -> `VariantCreateScript` | Если create содержит selected options, он должен создавать operation. Active variant row/link/handle появляются только в finalizer transaction. |
| Create product with options/variants | `productCreate` -> `ProductCreateScript` | Если input содержит options/variants, resolver/script создает initial option operation. Option definitions, values, selected links и derived handles применяются только finalizer-ом. |

### Изменения option definitions и values

| Entry point | Текущий код | Почему относится к consistency flow | Что обновить |
| --- | --- | --- | --- |
| `productOptionUpdate` | `OptionUpdateScript` | `values.update[].slug` пересобирает handles для всех variants, которые используют value. `values.delete[]` удаляет value и через cascade удаляет links. | Script должен создавать operation с staged definition patch. Slug-change rebuild и value delete применяются только finalizer-ом. Если input не содержит явного desired state для affected variants, operation creation возвращает validation error и active state не меняется. |
| `productOptionsSync` | `OptionsSyncScript` | Удаляет отсутствующие options/values, upsert-ит values и меняет slugs. Это массово меняет links и handles. | Sync должен выполнять preflight diff: created/updated/deleted options/values, affected variants, final option matrix. Все изменения, влияющие на active variant links/handles, применяются через тот же operation/finalizer под product lock. |
| `productOptionDelete` | `OptionDeleteScript` | `ON DELETE CASCADE` удаляет option values и variant links, но active variant handles не пересобираются как единая операция. | Delete всегда создается как operation с staged definition patch. Finalizer удаляет option/value и пересобирает affected variant handles в одной transaction; silent cascade вне operation запрещен. |
| `productOptionCreate` | `OptionCreateScript` | Новая option меняет option definition model продукта и правило selected options. | Create option всегда идет через operation с staged definition patch. Desired links для affected variants явно передаются в operation items. Definition-only create передает только definition patch. В обоих случаях запись active tables делает только finalizer. |

### Read/projection paths, которые должны видеть только active state

| Path | Текущий код | Требование |
| --- | --- | --- |
| Variant selected options | `VariantResolver.selectedOptions`, `VariantRepository.getSelectedOptionsByVariantIds` | Возвращать только active links. Pending desired links доступны отдельным admin-полем/operation resolver-ом. |
| Variant search index | `SyncVariantIndexScript` читает `product_option_variant_link` и option/value slugs | Индекс обновлять только после `operation.applied`. До финализации индекс остается на старом active state. |
| Product update events | `ProductUpdateWorkflow.workflowEmitEvent` emits `productUpdated` | Event должен выходить после commit финализации и содержать affected variant ids/options/revision/operationId. Pending create не должен эмитить active `productUpdated`. |
| Admin variant option grid | `admin/src/domains/inventory/products/mappers/product-variant-options.mapper.ts` -> `productUpdate` | UI должен отправлять option changes как operation и показывать status/preview. |
| Admin product options modal | `useSyncProductOptions` -> `productOptionsSync` | При diff, влияющем на active variants, UI должен получить operation id/status или validation error, а не считать options instantly active. |

## Принцип дизайна

Не делать активное состояние каталога временно неконсистентным.

Если изменение опций растянуто во времени, оно моделируется только как operation со state.

Active read model продолжает отдавать старые стабильные option links и handles до финализации operation.

Обязательный подход: active state остается стабильным, pending option changes хранятся отдельно.

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
| `variant_create` | Создание variants с selected options. |
| `option_create` | Создание product option/value definitions. |
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

Application scripts имеют право только создавать operation, отменять operation и читать operation status. Они не должны менять active option links/handles напрямую.

## Eventual Consistency Model

Eventual consistency достигается разделением состояния на pending intent и active catalog state.

1. Создание operation коммитит только intent (`pending`) и staged desired state. Active `variant`, `product_option_variant_link` и handle-based lookups не меняются.
2. DBOS workflow с детерминированным `workflowId` поднимает operation и ретраит transient failures. Повторный request с тем же idempotency key возвращает ту же operation, а не создает вторую.
3. Product-scoped lock сериализует финализацию всех option-changing operations одного продукта. Поэтому две операции не пересчитывают handles из разных snapshots параллельно и не коммитятся одновременно.
4. Финальная транзакция атомарно переводит active state из старой валидной матрицы в новую валидную матрицу. Между этими состояниями нет observable partial active state.
5. После commit emitted `productUpdated` запускает downstream projections/handlers. Search index и другие read models отстают до обработки event, затем сходятся через event retry/DLQ framework; authoritative reads из catalog DB уже консистентны.
6. Если финализация не получает валидное final state, operation становится `failed`, active state остается старым, UI показывает ошибку и создает новую operation/retry после правки input.

Итого: eventual consistency относится к pending operation processing и downstream projections, а не к active variant handles. Active catalog invariant `unique(product_id, handle) where deleted_at is null` остается strongly consistent в момент каждого commit.

## Product Locking

Во время финализации нужен один product-scoped lock, чтобы конкурентные operations не гонялись за один и тот же продукт.

Допустимый механизм выбирается один раз для implementation и затем используется всеми catalog option workflows:

- PostgreSQL advisory transaction lock через стабильный hash от `product_id`;
- таблица product operation locks с `product_id`, `operation_id` и expiration;
- DBOS workflow-level serialization, если в проекте уже есть надежный per-product queue pattern.

Lock должен покрывать финальную валидацию и write transaction.

## Форма API

Не exposing-ить асинхронный swap как серию независимых update-ов опций варианта.

Добавить operation-oriented API:

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
- validation errors для проблем, определяемых на preflight;
- affected variant ids.

`productUpdate`, `productBulkUpdate`, `variantCreate`, `variantUpdateOptions`, `productCreate`, `productOptionCreate`, `productOptionUpdate`, `productOptionDelete` и `productOptionsSync` не должны иметь отдельного direct-write режима для option changes. Если input содержит option definitions, option values или selected option links, backend создает operation и возвращает `operationId/status`; active state обновится только после finalizer-а.

`variantUpdateOptions` не является отдельной моделью обновления. Если resolver остается в схеме, он только делегирует в operation creator над `productVariantOptionsChangeCreate` с одним variant item. Admin flow вызывает operation API.

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

Admin reads возвращают metadata pending operation для экранов редактирования опций:

- у variant есть pending option changes;
- operation status;
- desired option links для preview;
- operation error, если она failed.

Handle-based reads должны оставаться однозначными. Они не должны resolve-иться из pending option links.

## Почему не надо просто удалить unique index

Удаление `variant_product_id_handle_key` разрешит временный duplicate, но также разрешит постоянные duplicate active handles. Это ослабляет не тот invariant.

Нужный invariant не "handles дублируются". Нужный invariant: "active handles уникальны, а pending operations описывают состояние, которое еще не является active".

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
5. Добавить script/workflow, который создает operation после preflight validation.
6. Добавить finalizer script/workflow, который применяет operation под product lock.
7. Переиспользовать `buildVariantHandleFromValues` как pure path; для финализации не строить handles из уже мутированных active links.
8. Перенести temporary handle logic в finalizer и исполнять ее только внутри одной финальной транзакции.
9. Ошибки duplicate-handle делать operation-level failures, а не partial variant updates.
10. Обновить `VariantUpdateOptionsScript`: удалить direct-write behavior; публичный flow должен создавать operation.
11. Обновить `VariantBatchUpdateOptionsScript`: удалить direct-write behavior; оставить только internal validation helper без записи links.
12. Обновить `ProductUpdateWorkflow.stepBatchUpdateOptions`: всегда создавать operation и возвращать operation status в operation result.
13. Обновить `ProductBulkEditWorkflow`: option-changing items ждут applied/failed status operation; job progress не должен показывать success до финализации.
14. Обновить `OptionUpdateScript`: slug changes и value deletes применяются через operation/finalizer-core для affected variants.
15. Обновить `OptionDeleteScript`: всегда переводить delete в operation; silent cascade вне operation запрещен.
16. Обновить `OptionsSyncScript`: делать diff и staged definition patch; все link/handle-affecting sync changes применять через operation/finalizer-core.
17. Обновить `OptionCreateScript`: всегда создавать operation с `option_create` definition patch.
18. Обновить `ProductCreateScript` и `VariantCreateScript`: option definitions, option values, selected option links и derived handles создавать через operation/finalizer, не через прямую запись active option tables.
19. После applied operation emit-ить `productUpdated` с affected variants, revision и operation id.

## Frontend Changes

Admin-редактирование опций варианта должно сохранять changes только через asynchronous operation:

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

## Implementation Decisions

Эти решения не меняют модель обновления опций. Каждое implementation decision обязано сохранять правило: option changes создают operation и применяются только finalizer-ом.

- Pending operation storage фиксирует affected variants и staged definition patch. Если UI требует full preview, repository дополнительно собирает full desired matrix на чтении.
- Operations создаются всеми entry points, которые принимают option changes: Admin, import/sync integrations, product update, bulk update, create/update/delete option APIs.
- Pending option changes не попадают в storefront reads.
- `variant.handle` после финализации остается option-derived. Uniqueness suffix не используется.
- Product lock стандартизируется для всех catalog option workflows до implementation.
- `productOptionCreate` требует явный desired state для affected variants, когда новая option должна получить values у existing variants. Operation без affected variant links разрешен только для definition-only create.
- `productOptionDelete` и `option value delete` требуют explicit relink/removal policy в operation input.
- Operation хранит `base_product_revision`; stale operations fail-ятся с `STALE_OPERATION`.
- `productBulkUpdate` отображает long-running option operations через item status, связанный с operation id.
- `productUpdated` после `operation.applied` содержит `operationId`; отдельный event добавляется только как дополнительная нотификация, не как второй write path.

## Acceptance Criteria

- Duplicate `(product_id, handle)` для active variants запрещен, пока `deleted_at IS NULL`.
- Time-stretched swap принимается как одна pending operation.
- Pending operation описывает desired option links, которые конфликтовали бы при применении по одному variant за раз.
- Финализация применяет все affected variants атомарно.
- Финализация полностью успешна; при ошибке active state остается неизмененным.
- Handle-based reads остаются deterministic.
- `variantUpdateOptions`, `variantCreate`, `productCreate`, `productUpdate`, `productBulkUpdate`, `productOptionCreate`, `productOptionUpdate`, `productOptionDelete` и `productOptionsSync` не обходят operation/finalizer-core, когда меняют option definitions, option values, selected option links или option-derived handles.
- Изменение slug option value пересобирает handles affected variants под product lock и не оставляет partial handle updates.
- Удаление option/value не выполняет silent cascade links без пересчета affected variant handles и product revision.
- `SyncVariantIndexScript` и другие projections обновляются после applied event; pending operation не меняет active projection contract.
- Bulk job item не получает success раньше, чем связанная option operation стала `applied`.
- Direct-write option update paths удалены или превращены в operation creators.
