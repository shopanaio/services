---
tags:
  - pattern
  - admin
  - graphql
  - aggregate
  - mutation
  - concurrency
related:
  - patterns/admin-graphql-layer
  - patterns/resolver
  - patterns/script
  - patterns/repository
  - shared-kernel/transaction-manager
  - packages/dbos/transactional-steps
  - architecture/multi-tenancy
---

# Admin Aggregate Mutation Contract

## Статус и область действия

Этот документ задаёт обязательный контракт изменения агрегатов во всех Shopana
Admin GraphQL API.

Правила применяются к каждому store-scoped или organization-scoped aggregate
root и ко всем принадлежащим ему entities, value objects, settings и relations.
Storefront API и service broker contracts могут иметь собственные команды, но
не должны становиться способом обойти ownership и transaction boundaries,
определённые здесь.

Новые Admin mutations обязаны соответствовать этому документу. Существующие
контракты должны мигрировать без compatibility aliases, dual-write и deprecated
CAS arguments. В проекте нет production data, а backward compatibility и
backfill запрещены.

## Нормативные правила

1. У каждого изменяемого aggregate root есть одна обычная update mutation.
2. Update mutation принимает ID корня и структурированный `operations` input.
3. Клиент не передаёт revision, version, timestamp, ETag или иной CAS token.
4. Все изменения owned relations выполняются только через update mutation
   корня агрегата.
5. Отдельные CRUD mutations для owned relations запрещены.
6. Отдельная mutation разрешена только для самостоятельной семантической
   команды, а не для CRUD, переименованного бизнес-глаголом.
7. Один вызов update mutation является одной атомарной командой агрегата:
   validation, state change, internal revision, audit и idempotency result
   фиксируются согласованно.
8. Tenant scope берётся только из trusted request context. `storeId` и
   `organizationId` не принимаются как authority-bearing input.

## Aggregate Registry

Каждый сервис обязан поддерживать явный registry своих Admin aggregates.
Registry является prerequisite для проектирования mutations и должен содержать:

| Поле | Значение |
|---|---|
| Service | Владеющий bounded context |
| Aggregate root | Корневая entity и её stable ID |
| Tenant scope | Store, organization или global scope |
| Owned relations | Entities и relations, изменяемые только через root |
| Unified update | Имя единственной обычной update mutation |
| Root lifecycle | Допустимые create/delete/archive правила |
| Semantic commands | Явный allowlist отдельных mutations с обоснованием |
| Lock target | Строка или другой server-owned serialization boundary |

Если ownership entity не определён в registry, для неё нельзя добавлять write
mutation. Сначала необходимо определить aggregate boundary.

Пример registry:

| Service | Aggregate root | Owned relations | Unified update | Semantic commands |
|---|---|---|---|---|
| Catalog | Product | variants, options, media bindings, physical attributes | `productUpdate` | none |
| Catalog | Collection | memberships, rules, manual ordering | `collectionUpdate` | preview remains a query |
| IAM | Application | auth config, methods, providers, OAuth clients | `applicationUpdate` | secret rotation, provider validation |
| Loyalty | Program | versions, rules, rewards, tiers, tier policies | `programUpdate` | publish version |
| Pricing | Discount | codes, targets, eligibility, external references | `discountUpdate` | none |

## GraphQL Contract

### Обычное обновление

Целевой контракт повторяет форму unified `productUpdate`:

```graphql
type CatalogMutation {
  productUpdate(
    productId: ID!
    clientMutationId: String!
    operations: ProductUpdateInput!
  ): ProductUpdatePayload!
}

input ProductUpdateInput {
  details: ProductDetailsUpdateOperationInput
  status: ProductStatusUpdateOperationInput
  variants: ProductVariantOperationsInput
  media: ProductMediaOperationsInput
  options: ProductOptionOperationsInput
}
```

Точные названия секций зависят от домена, но форма остаётся общей:

```graphql
aggregateUpdate(
  aggregateId: ID!
  clientMutationId: String!
  operations: AggregateUpdateInput!
): AggregateUpdatePayload!
```

Если существующий namespace использует `input: AggregateUpdateInput!`, ID,
`clientMutationId` и `operations` могут быть полями верхнего input. Это допустимо
только при сохранении тех же семантических границ; concurrency token в input всё
равно запрещён.

### Create и delete корня

Root-level `aggregateCreate` допустим, потому что до создания root ещё нет
update boundary.

Root-level `aggregateDelete` допустим только когда удаление является разрешённой
lifecycle operation всего агрегата. Owned child нельзя удалять отдельной root
mutation. Если доменная модель использует archive, deactivate или close вместо
физического удаления, API должен выражать именно эту доменную семантику.

### Payload

Update payload возвращает aggregate root и стандартные user errors:

```graphql
type ProductUpdatePayload {
  product: Product
  userErrors: [ProductUserError!]!
}
```

Payload должен содержать достаточно данных для обновления текущего UI/cache,
но не обязан возвращать весь detail graph. Клиент перечитывает presentation
model через query, когда полная модель нужна после commit.

Internal aggregate revision может присутствовать в audit или diagnostic read
model, если у неё есть самостоятельная семантика, но клиент никогда не обязан
прочитать её перед mutation и вернуть обратно.

## Operations Contract

### Intent вместо snapshot replacement

Operations выражают намерение пользователя, а не присылают старый или полный
snapshot агрегата:

```graphql
input ProductVariantOperationsInput {
  create: [ProductVariantCreateOperationInput!]!
  update: [ProductVariantUpdateOperationInput!]!
  deleteIds: [ID!]!
  reorder: [ProductVariantPositionOperationInput!]!
}
```

Обязательная семантика:

- omitted section означает `no change`;
- omitted field внутри patch означает `no change`;
- explicit `null` очищает nullable field;
- empty list означает пустой набор операций, а не удаление всех relations;
- удаление всегда задаётся явно через `deleteIds` или доменную remove operation;
- отсутствие child в input никогда не означает implicit delete;
- update/delete child адресуются stable child ID;
- create может использовать client-local reference только для связывания
  нескольких новых элементов внутри той же aggregate command;
- порядок relation изменяется explicit move/reorder operation;
- один child ID не может конфликтующе участвовать в нескольких operations
  одного вызова;
- no-op command не изменяет timestamps и internal revision.

Full replacement допустим только для атомарного value object, для которого
replacement и является явным доменным намерением. Он запрещён для entity
collections и graph-shaped relations.

### Atomicity

Все sections одного `operations` input:

1. валидируются как единая желаемая команда;
2. применяются в одной aggregate transaction;
3. либо фиксируются полностью, либо не фиксируются;
4. увеличивают internal aggregate revision не более одного раза;
5. создают один idempotency result для всего вызова.

Partial success внутри обычного aggregate update запрещён. Если продукту
действительно нужна независимая обработка элементов, это отдельный bulk job или
workflow, а не частичный commit unified mutation.

## Запрет Relationship CRUD Mutations

Для owned relation запрещены mutations следующей формы:

```graphql
productVariantCreate
productVariantUpdate
productVariantDelete

collectionAddProducts
collectionRemoveProducts
collectionMoveProduct
collectionClearProducts

facetValueCreate
facetValueUpdate
facetValueDelete

discountCodeUpdate
discountExternalReferenceDelete
```

Они должны стать operations владельца:

```graphql
productUpdate(operations: { variants: ... })
collectionUpdate(operations: { products: ... })
facetUpdate(operations: { values: ... })
discountUpdate(operations: { codes: ..., externalReferences: ... })
```

Глаголы `move`, `rebalance`, `clear`, `configure`, `setEnabled`, `attach`,
`detach`, `upsert` и `sync` сами по себе не делают mutation семантической. Если
команда только меняет поле, позицию или owned relation, она является update
operation корня.

## Отдельные семантические команды

Отдельная mutation допустима, когда команда обладает самостоятельным доменным
смыслом и хотя бы одним из следующих свойств:

- запускает отдельную state machine;
- создаёт immutable ledger, accounting или financial fact;
- инициирует внешний или потенциально необратимый side effect;
- имеет самостоятельный durable workflow, retry и compensation policy;
- выполняет security-sensitive action с отдельным audit contract;
- является переходом lifecycle, который нельзя выразить обычным field patch;
- требует отдельного authorization action;
- имеет результат, отличный от обновлённого aggregate state.

Примеры допустимых команд:

```graphql
orderCancel
orderPaymentCapture
orderRefundCreate
fulfillmentOrderSubmit
shipmentReconcile
applicationOAuthClientSecretRotate
applicationAuthProviderValidate
loyaltyPointsAdjust
loyaltyReservationRelease
loyaltyProgramVersionPublish
customerMerge
notificationSendTest
```

Каждая такая mutation должна присутствовать в semantic-command allowlist
Aggregate Registry и иметь краткое обоснование. Название команды не является
доказательством её самостоятельной семантики.

Примеры, которые по умолчанию не являются отдельными командами:

- `setEnabled` — простой field update;
- `configure` — settings/value-object update;
- `clearProducts` — удаление owned relations;
- `moveProduct` — изменение порядка owned relation;
- `updateRules` — обновление owned configuration;
- `archive` — простой status update, если у archive нет отдельного workflow и
  lifecycle invariants.

## Concurrency без Client CAS

### Запрещённые inputs

Admin GraphQL inputs не должны содержать:

- `expectedRevision`;
- `expectedVersion`;
- `expectedUpdatedAt`;
- `expectedOrderVersion`, `expectedEditVersion` и другие специализированные
  варианты;
- ETag, hash или opaque token, если клиент обязан получить его из read model
  перед write;
- revision `0` как сигнал create/upsert.

Клиент сообщает intent, а сервер сериализует команды агрегата.

### Transactional aggregates

Для обычного update repository/script выполняет:

1. начинает транзакцию;
2. блокирует aggregate root через `SELECT ... FOR UPDATE` в tenant scope;
3. загружает current aggregate через transaction-aware connection;
4. проверяет authorization и business invariants на текущем состоянии;
5. применяет intent operations;
6. увеличивает internal revision один раз при фактическом изменении;
7. записывает audit и idempotency result;
8. фиксирует транзакцию.

CAS condition вида `WHERE id = ? AND revision = ?` не является API contract.
Internal revision разрешена для audit ordering, projection provenance и
server-owned fencing, но не передаётся клиентом.

Для create race используются unique constraints и conflict handling. Revision
`0` как внешний create contract запрещена.

### Multi-aggregate commands

Если семантическая команда изменяет несколько агрегатов одного сервиса, locks
берутся в детерминированном порядке:

```text
(tenant scope, aggregate type, aggregate ID)
```

Unique, foreign-key, check и exclusion constraints являются последней линией
защиты invariants. Для cross-aggregate predicate invariants используется
подходящий PostgreSQL isolation level с bounded server-side retry.

### Длительные workflows

Нельзя держать DB transaction или row lock во время broker, provider, HTTP,
storage или других external calls.

Длительная команда использует durable operation record:

1. короткая транзакция регистрирует command ID, idempotency key и server-owned
   base/fencing state;
2. external steps выполняются вне транзакции;
3. финальная transactional step блокирует aggregate root и повторно проверяет
   применимость результата;
4. сервер сам выполняет retry/recalculation или возвращает доменную ошибку;
5. клиент не участвует в revision retry protocol.

Server-owned fencing token может существовать между workflow steps, но не
публикуется как Admin GraphQL argument. DBOS database writes выполняются через
`@TransactionalStep()`; external calls находятся в отдельных workflow steps.

## Idempotency

`clientMutationId` или эквивалентный idempotency key идентифицирует один
пользовательский intent, а не версию агрегата.

Обязательная семантика:

- same key + same canonical request hash возвращает сохранённый результат;
- same key + different hash возвращает `IDEMPOTENCY_KEY_REUSED`;
- повтор команды не повторяет audit, ledger или external side effect;
- idempotency result атомарен с canonical state change для transactional
  command;
- UI создаёт новый key для нового user action и повторно использует его только
  для retry того же действия.

Transport request ID не заменяет idempotency key, если клиент не может
воспроизвести его при retry после неопределённого network result.

## Validation и ошибки

Validation выполняется после загрузки current aggregate под lock. Read-before-
write validation вне aggregate transaction не считается достаточной.

User errors описывают domain result:

- aggregate или child не найден;
- transition недопустим в текущем состоянии;
- uniqueness или ownership invariant нарушен;
- relation принадлежит другому aggregate/store;
- операция конфликтует с другой операцией того же request;
- durable semantic command уже выполняется или завершена несовместимо.

Client-facing `REVISION_CONFLICT`, `VERSION_CONFLICT`, `STALE_OBJECT` и field
paths на expected token запрещены. PostgreSQL serialization/deadlock errors
обрабатываются как bounded internal retry; после исчерпания retry наружу выходит
обычная retryable service error без требования перечитать revision.

`userErrors.field` указывает путь внутри `operations`, например:

```text
operations.variants.update.2.sku
operations.collectionProducts.create.0.productId
```

## Layer Responsibilities

```text
Admin GraphQL resolver
  -> decode IDs and validate input shape
  -> Script or DBOS workflow
     -> authorization and business invariants
     -> aggregate command orchestration
     -> Repository
        -> tenant scope
        -> root lock
        -> current aggregate load
        -> atomic persistence and internal revision
        -> database constraints
```

- Resolver не реализует concurrency и business ownership.
- Script/Workflow владеет domain command и validation.
- Repository владеет lock и persistence mechanics.
- Mutation builder не принимает client optimistic-lock field.
- Admin UI строит operations из editor/form intent и не хранит revision ради
  следующего write.

## Schema Governance

Admin schema validation должна отклонять:

1. input field, совпадающий с
   `expected*Revision`, `expected*Version` или `expected*UpdatedAt`;
2. отсутствие unified update у зарегистрированного mutable aggregate;
3. CRUD mutation, адресующую owned child entity;
4. отдельную mutation, отсутствующую в semantic-command allowlist;
5. implicit collection replacement без явной missing/delete policy;
6. tenant authority input (`storeId`, `organizationId`) там, где scope должен
   приходить из trusted context;
7. update contract, допускающий partial commit sections.

Рекомендуется реализовать contract test/linter поверх composed Admin schema и
Aggregate Registry. Allowlist должен хранить rationale рядом с aggregate
definition, а не только имя GraphQL field.

## Concurrency и contract tests

Для каждого aggregate update обязательны проверки:

- две параллельные operations разных полей не теряют изменения;
- две operations одной relation сериализуются и сохраняют invariants;
- несовместимые transitions дают один success и одну доменную ошибку;
- duplicate idempotency key не повторяет запись и side effects;
- reused key с другим payload отклоняется;
- no-op не изменяет timestamp/internal revision;
- audit, state и idempotency result откатываются вместе;
- multi-root locks берутся в детерминированном порядке;
- request другого tenant не может прочитать, заблокировать или изменить
  aggregate;
- GraphQL introspection не содержит запрещённых concurrency inputs;
- owned relation невозможно изменить отдельной mutation.

Для durable semantic commands дополнительно проверяются crash/retry между
steps, duplicate callbacks, compensation и server-owned fencing.

## Migration Sequence

Для каждого сервиса миграция выполняется в следующем порядке:

1. Зафиксировать Aggregate Registry и ownership relations.
2. Создать semantic-command allowlist с rationale.
3. Спроектировать единый `AggregateUpdateInput` с intent operations.
4. Перенести child CRUD/move/rebalance/attach/detach mutations в operations.
5. Реализовать aggregate root lock и transactional validation.
6. Добавить/унифицировать idempotency result persistence.
7. Удалить expected revision/version/timestamp из GraphQL, DTO, workflows,
   repositories и broker calls на этом write path.
8. Перевести Admin hooks/mappers на operations без read-before-write token.
9. Перегенерировать schema-derived GraphQL и Zod types.
10. Удалить старые resolvers, scripts и client documents, не оставляя aliases.
11. Добавить contract, concurrency, tenancy и workflow retry coverage.
12. Включить schema governance check в build/codegen flow.

## Definition of Done

Aggregate соответствует контракту, когда:

- у него есть одна обычная Admin update mutation с `operations`;
- все owned relations изменяются только через неё;
- отдельные mutations присутствуют только в документированном semantic
  allowlist;
- Admin client не читает revision ради write;
- публичный input не содержит CAS token;
- update атомарен и сериализован сервером;
- retry обеспечивается idempotency, а не повторной передачей revision;
- internal revision не является частью клиентского concurrency protocol;
- schema governance и concurrency tests подтверждают эти свойства.

## См. также

- [[patterns/admin-graphql-layer]] — структура Admin GraphQL clients и hooks.
- [[patterns/script]] — размещение mutation business logic.
- [[patterns/repository]] — transaction-aware repositories и tenant scope.
- [[shared-kernel/transaction-manager]] — transactions и `SELECT FOR UPDATE`.
- [[packages/dbos/transactional-steps]] — durable transactional write boundaries.
- [[architecture/multi-tenancy]] — tenant-safe aggregate relations.
