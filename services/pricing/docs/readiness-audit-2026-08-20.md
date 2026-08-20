# Pricing Service Readiness Audit

**Дата аудита:** 2026-08-20  
**Объект:** `services/pricing`  
**Целевой критерий:** все заявленные API и бизнес-логика Pricing Service реализованы, интегрированы и подтверждены автоматизированными тестами.  
**Итоговая оценка:** **60–65% — сервис не готов к признанию feature-complete или release-ready.**

## 1. Резюме

Pricing Service уже содержит значительный объём рабочей реализации:

- store-scoped Admin GraphQL API;
- четыре native-типа скидок;
- Commerce Function discount infrastructure;
- предварительный и финальный checkout quote;
- распределение скидок по строкам и доставке;
- usage reservations, redemptions и reversals;
- optimistic revision для discount aggregate;
- Relay pagination, фильтры и read models;
- DBOS workflows для Admin mutations.

При этом сервис не удовлетворяет требованию полной готовности. Основные блокеры:

1. существующие checkout e2e fixtures противоречат обязательным инвариантам активной скидки;
2. отсутствует проверка cross-service references и их принадлежности текущему Store;
3. механизм `VALID`/`STALE` не имеет reconciliation handlers;
4. Commerce Function binding сохраняется без проверки App installation и function contract;
5. `discountUpdate` изменяет revision для пустых и частично неуспешных запросов;
6. заявленный контракт `clientMutationId` не реализован;
7. expiration usage reservations не подключён к maintenance workflow или scheduler;
8. mixed one-time/subscription cart обрабатывается спорно и не покрыт спецификацией;
9. большая часть mutation, persistence, integration и concurrency поведения не имеет прямого тестового покрытия.

До устранения этих проблем сервис нельзя считать завершённым, даже несмотря на наличие большей части API surface.

## 2. Scope и методика

Аудит выполнен статически по следующим источникам:

- `services/pricing/README.md`;
- `services/pricing/docs/discounts-database-design.md`;
- GraphQL SDL в `services/pricing/src/api/graphql-admin/schema/`;
- resolvers, workflows, scripts и repositories;
- checkout pricing pipeline;
- database migrations и Drizzle models;
- broker contracts из `packages/broker-types`;
- consumers в Checkout, Orders и Loyalty;
- unit и e2e test inventory;
- архитектурные правила из `knowledge/vault`.

В соответствии с правилами проекта не запускались:

- tests и e2e;
- `tsc`;
- dev/start server;
- browser-based verification.

Поэтому данный документ подтверждает полноту и согласованность реализации на уровне кода, но не является свидетельством успешного runtime-прогона.

## 3. Заявленная ответственность сервиса

На основании README, database design и broker contracts Pricing Service отвечает за:

- управление store-scoped discount aggregates;
- native discounts:
  - amount off products;
  - amount off order;
  - Buy X Get Y;
  - free shipping;
- code-based и automatic activation;
- lifecycle, schedule, eligibility, channel availability и purchase modes;
- catalog targeting;
- discount combinations;
- usage limits и applies-once-per-customer;
- checkout quote calculation и immutable pricing snapshots;
- deterministic allocation и rounding;
- usage reservation, commit, release, expiration и reversal;
- Commerce Function discounts;
- external references;
- tenant isolation;
- normalization всех денежных значений в валюту Store;
- reconciliation long-lived cross-service references.

Catalog остаётся владельцем базовых цен и merchandise references. Checkout оркестрирует пересчёт и placement. Orders получает зафиксированный результат применения скидок.

## 4. Инвентаризация публичного API

### 4.1 Admin GraphQL queries

SDL объявляет namespace `pricingQuery` и 13 query-полей:

| Query | Реализация | Статус |
| --- | --- | --- |
| `node` | `PricingQueryResolver.node` | Реализовано |
| `nodes` | `PricingQueryResolver.nodes` | Реализовано |
| `discount` | loader + `DiscountResolver` | Реализовано |
| `discounts` | Relay repository query | Реализовано |
| `discountCode` | loader + resolver | Реализовано |
| `discountCodes` | Relay repository query | Реализовано |
| `discountUsageReservation` | loader + resolver | Реализовано |
| `discountUsageReservations` | Relay repository query | Реализовано |
| `discountRedemption` | loader + resolver | Реализовано |
| `discountRedemptions` | Relay repository query | Реализовано |
| `discountRedemptionAllocation` | loader + resolver | Реализовано |
| `discountExternalReference` | loader + resolver | Реализовано |
| `discountExternalReferences` | Relay repository query | Реализовано |

Основной surface присутствует. Однако invalid global IDs внутри filters не превращаются в предсказуемые user errors: mapper при ошибке декодирования возвращает исходную строку. Для UUID database columns это может приводить к database error вместо пустого результата или `BAD_USER_INPUT`.

Источник: `src/repositories/global-id-where-mappers.ts:8-17`.

### 4.2 Admin GraphQL mutations

| Mutation | Реализация | Статус |
| --- | --- | --- |
| `discountCreate` | DBOS workflow + transactional create script | Реализовано с пробелами |
| `discountUpdate` | DBOS workflow по секциям | Реализовано с дефектами revision semantics |
| `discountDelete` | DBOS workflow + draft/history guards | Реализовано |
| `discountExternalReferenceCreate` | DBOS workflow | Реализовано |
| `discountExternalReferenceUpdate` | DBOS workflow | Реализовано |
| `discountExternalReferenceDelete` | DBOS workflow | Реализовано |

Mutation surface физически существует, но не весь заявленный контракт выполняется. Детали приведены в разделе с findings.

### 4.3 Broker actions

Pricing регистрирует следующие checkout actions:

| Action | Статус реализации |
| --- | --- |
| `pricing.calculateCheckoutPreliminaryQuote` | Реализовано |
| `pricing.finalizeCheckoutPricingQuote` | Реализовано |
| `pricing.reserveCheckoutDiscountUsage` | Реализовано |
| `pricing.commitCheckoutDiscountUsage` | Реализовано |
| `pricing.releaseCheckoutDiscountUsage` | Реализовано |
| `pricing.expireCheckoutDiscountUsage` | Реализовано, но не подключено к caller workflow |
| `pricing.reverseCheckoutDiscountUsage` | Реализовано |
| `pricing.validateLoyaltyRewardReferences` | Реализовано |

## 5. Матрица готовности

| Область | Оценка | Комментарий |
| --- | ---: | --- |
| Admin GraphQL reads | 85% | Surface и resolvers присутствуют; нет достаточного integration coverage и строгой обработки invalid filter IDs |
| Admin GraphQL mutations | 70% | Основные workflows есть; revision/no-op и contract gaps остаются |
| Native discount calculation | 75% | Реализованы четыре вида и deterministic allocation; остаются семантические и test gaps |
| Checkout pricing snapshots | 80% | Есть provenance, digest, persistence и currency checks |
| Usage lifecycle | 70% | Reserve/commit/release/reverse реализованы; expiration operational lifecycle не завершён |
| Commerce Function discounts | 45% | Runner и output validation есть; binding validation и e2e отсутствуют |
| Cross-service references | 25% | IDs сохраняются, но ownership/existence/reconciliation отсутствуют |
| Tenant isolation | 75% | Repository reads в основном store-scoped; входные external references не валидируются по Store |
| External references | 60% | CRUD существует; integration processing и lifecycle coverage ограничены |
| Automated verification | 45% | Pure domain logic покрыта лучше persistence/API/workflows; найдено прямое противоречие e2e fixtures и invariants |

## 6. Подтверждённые findings

### P1. Checkout e2e fixtures противоречат обязательным инвариантам активной скидки

**Наблюдение**

`validateDiscountAggregate` требует для любого non-draft discount:

- buyer eligibility;
- хотя бы один channel;
- rule или function binding;
- active code для code-based discount;
- обязательные target selections для product и Buy X Get Y discounts.

Источник: `src/scripts/discount/validation.ts:168-213`.

При этом основной helper `CheckoutStorefrontTestKit.createDiscount` создаёт `ACTIVE` discounts без `buyerContext` и `channels`.

Источник: `e2e/tests/checkout-storefront-api/checkout-storefront-test-kit.ts:596-657`.

Отдельный Buy X Get Y helper делает то же самое.

Источник: `e2e/tests/checkout-storefront-api/checkout-pricing-and-promotions.spec.ts:299-328`.

**Ожидаемое поведение текущего кода**

Такая операция должна вернуть:

- `ELIGIBILITY_REQUIRED`;
- `CHANNEL_REQUIRED`.

Create flow сначала собирает draft aggregate, а затем применяет requested non-draft lifecycle state. Lifecycle section повторно валидирует итоговый aggregate и должна откатить create transaction при отсутствии обязательных секций.

**Риск**

- базовые e2e-сценарии native discounts не подтверждают текущую реализацию;
- test suite и production contract рассинхронизированы;
- нельзя использовать наличие e2e-файлов как свидетельство готовности.

**Критерий закрытия**

- определить default buyer/channel policy;
- либо сделать defaults частью API/application contract;
- либо передавать `buyerContext` и `channels` во всех fixtures;
- выполнить полный pricing/checkout e2e прогон после исправления.

### P1. Cross-service IDs не проверяются на существование и tenant ownership

**Наблюдение**

GraphQL mappers только декодируют global IDs:

- `Product`;
- `Variant`;
- `Category`;
- `Customer`;
- `CustomerSegment`;
- `AppInstallation`.

Источник: `src/resolvers/admin/discountCreateMapper.ts:14-70` и `discountUpdateMapper.ts`.

После этого target и eligibility scripts проверяют только локальную форму массива, роли и отсутствие дубликатов. Broker calls к owning services отсутствуют.

Источники:

- `src/scripts/discount/DiscountUpdateTargetsScript.ts:10-74`;
- `src/scripts/discount/DiscountUpdateEligibilityScript.ts:13-66`;
- `src/scripts/discount/DiscountCreateScript.ts:288-333`.

**Нарушенный контракт**

README прямо относит к ответственности application layer проверку tenant ownership всех переданных IDs. Knowledge base также запрещает cross-store access и IDOR.

**Риск**

- Pricing может сохранить references другой организации/Store;
- nonexistent references получают статус `VALID`;
- Admin API может возвращать misleading reference state;
- function binding может ссылаться на чужую или несуществующую installation.

**Критерий закрытия**

- добавить owner-service batch validation до persistence;
- проверять Store/organization ownership;
- разделять `NOT_FOUND`, `WRONG_TYPE`, `WRONG_STORE`, `INACTIVE`;
- добавить cross-store isolation e2e tests.

### P1. `VALID`/`STALE` reference reconciliation не реализован

**Наблюдение**

Database и GraphQL содержат:

- `referenceStatus`;
- `referenceStatusChangedAt`;
- `referenceCheckedAt`;
- enum values `VALID` и `STALE`.

Checkout engine исключает `STALE` references из eligibility/targeting. Однако в application code отсутствуют mutations или event handlers, изменяющие эти поля. Единственный handlers registry пуст:

```ts
export const eventHandlers = [];
```

Источник: `src/handlers/index.ts:1-2`.

**Риск**

- удалённый Catalog target навсегда остаётся `VALID`;
- удалённый Customer/Segment навсегда остаётся `VALID`;
- reconciliation timestamps никогда не обновляются;
- заявленная long-lived reference модель фактически не работает.

**Критерий закрытия**

- определить owner-service events или reconciliation broker API;
- реализовать idempotent handlers для delete/archive/restore;
- обновлять `referenceStatus`, `referenceStatusChangedAt`, `referenceCheckedAt`;
- добавить replay, out-of-order и cross-store tests.

### P1. Commerce Function binding сохраняется без проверки installation и function contract

**Наблюдение**

Create/update scripts проверяют:

- непустой `functionKey`;
- precedence;
- activation sequence;
- JSON configuration;
- непустые revisions.

Они не проверяют:

- существование `AppInstallation`;
- принадлежность installation текущему Store;
- active/installed state;
- наличие function key в manifest;
- поддержку нужного target;
- contract version;
- соответствие configuration schema;
- актуальность route revision.

Источники:

- `src/scripts/discount/DiscountCreateScript.ts:288-333`;
- `src/scripts/discount/DiscountUpdateFunctionBindingScript.ts:10-55`.

Runtime runner и output validation реализованы, но это не заменяет binding-time validation.

**Риск**

- можно активировать заведомо неработающий FUNCTION discount;
- ошибка обнаруживается только во время checkout;
- `REQUIRED` binding может блокировать checkout;
- `OPTIONAL` binding может молча не применить ожидаемую скидку.

**Критерий закрытия**

- валидировать binding через Apps/function registry до activation;
- сохранять только разрешённые target/contract combinations;
- добавить полный e2e от app installation до checkout application и failure modes.

### P1. `discountUpdate` имеет некорректную no-op/error revision semantics

**Наблюдение**

Все поля `DiscountUpdateInput` nullable, поэтому GraphQL принимает пустой объект `operations: {}`.

Workflow сначала вызывает `stepAcquireRevision`, который немедленно увеличивает `discount.revision`, и только потом выполняет mapped operations.

Источник: `src/workflows/DiscountUpdateWorkflow.ts:81-97`.

Следствия:

- пустой update увеличивает revision;
- update без фактических изменений увеличивает revision;
- revision уже изменён, если одна из следующих operation sections вернула business error;
- разные sections исполняются как отдельные workflow steps и транзакции, поэтому запрос может примениться частично.

Operation-level partial result может быть допустимым дизайном, но такая семантика не описана в SDL и конфликтует с ожиданием unified aggregate update.

**Риск**

- ложные optimistic conflicts;
- клиент получает новую revision после failed/no-op mutation;
- трудно обеспечить атомарное редактирование нескольких взаимозависимых секций;
- intermediate aggregate validation может запрещать корректный итоговый переход, если промежуточное состояние временно невалидно.

**Критерий закрытия**

- явно выбрать atomic или partial-update contract;
- запретить empty operations;
- не менять revision при полном no-op/validation failure;
- для atomic contract выполнять все section changes и итоговую aggregate validation в одной транзакции;
- документировать operation results и retry behavior.

### P1. Заявленный `clientMutationId` не возвращается

SDL документирует `DiscountCodeCreateOperationInput.clientMutationId` как correlation key, который возвращается в operation result.

Источник: `src/api/graphql-admin/schema/discount.graphql:338-345`.

Но `DiscountOperationResult` содержит только:

- `type`;
- `applied`;
- `errors`.

Источник: `src/api/graphql-admin/schema/discount.graphql:457-464`.

Значение также не используется в create mapper, repository result или workflow result.

**Риск**

- публичная документация SDL неверна;
- клиент не может сопоставить созданный code с input item;
- bulk code creation не имеет надёжного correlation contract.

**Критерий закрытия**

- либо вернуть `clientMutationId` и созданный `DiscountCode`/ID в item-level result;
- либо удалить поле и неверную документацию;
- добавить contract test.

### P1. Usage reservation expiration не подключён к operational lifecycle

**Наблюдение**

Action `pricing.expireCheckoutDiscountUsage` и метод `DiscountUsageLifecycleService.expire` реализованы.

Источник: `src/actions/PricingCheckoutBrokerActions.ts:121-133`.

Поиск consumers не обнаруживает caller этого action в Checkout, bootstrap maintenance или scheduler. При reserve выполняется только lazy expiration reservations той же скидки.

**Риск**

- истёкшие reservations могут продолжать отображаться как `ACTIVE`;
- operational/read model state расходится с фактическим временем;
- cleanup зависит от нового reserve той же скидки;
- таблица reservations растёт без централизованного maintenance процесса.

**Критерий закрытия**

- подключить bounded batch expiration к maintenance workflow/automation;
- обеспечить retry-safe cursor или repeated bounded scans;
- добавить tests на counters после expiration и повторный запуск.

### P2. Purchase modes для mixed cart требуют исправления или явной спецификации

**Наблюдение**

Текущий eligibility check отклоняет discount целиком, если корзина содержит хотя бы одну строку неподдерживаемого purchase type:

```ts
if (
  (lines.some((line) => line.purchase.type === "ONE_TIME") &&
    !owner.appliesOnOneTimePurchase) ||
  (lines.some((line) => line.purchase.type === "SUBSCRIPTION") &&
    !owner.appliesOnSubscription)
) return "PURCHASE_TYPE_NOT_ELIGIBLE";
```

Источник: `src/checkout-pipeline/domain/discounts/NativeDiscountEngine.ts:158-162`.

`eligibleLines` затем не фильтрует строки по purchase type.

**Риск**

Product discount, предназначенный только для subscription, не применяется к subscription lines, если рядом есть one-time line. Обратный сценарий ведёт себя так же.

Для order discount допустимая семантика может отличаться, поэтому правило должно быть явно определено по discount class.

**Критерий закрытия**

- документировать semantics отдельно для PRODUCT, ORDER и SHIPPING;
- фильтровать target lines для PRODUCT discounts, если ожидается частичное применение;
- добавить mixed-cart tests.

### P2. Minimum requirement считается по всей корзине

**Наблюдение**

Subtotal/quantity minimum вычисляется по всем `contributesToTotals` lines до catalog target selection.

Источник: `src/checkout-pipeline/domain/discounts/NativeDiscountEngine.ts:215-227`.

Для product-specific discount это может означать, что покупка unrelated products выполняет minimum requirement.

**Статус**

Требует product decision. Если minimum должен считаться по eligible products, текущая логика неверна. Если по cart subtotal, это необходимо явно зафиксировать в документации и tests.

### P2. Invalid global IDs в filters обрабатываются непредсказуемо

**Наблюдение**

Where mapper при невозможности декодировать global ID возвращает исходное значение.

Источник: `src/repositories/global-id-where-mappers.ts:8-17`.

Для UUID database fields это может привести к PostgreSQL UUID cast error. Single-entity queries при этом используют более безопасное decode поведение.

**Критерий закрытия**

- нормализовать invalid filter ID в GraphQL validation/user error;
- обеспечить одинаковую семантику single query и connection filters;
- добавить tests для wrong type, malformed base64 и raw UUID.

### P2. Soft-deleted external references остаются видимыми по умолчанию

**Наблюдение**

`findExternalReferenceById` по умолчанию исключает `deletedAt != null`, но loader `getExternalReferencesByIds` и connection query не добавляют такой predicate.

Источники:

- `src/repositories/DiscountRepository.ts:1216-1246`;
- `src/repositories/DiscountRepository.ts:1426-1449`.

**Риск**

После soft delete reference остаётся доступным через `node`, direct query и default connection, если это не является намеренным audit API.

**Критерий закрытия**

- определить default visibility contract;
- обычно исключать deleted rows, предоставив отдельный explicit filter/admin audit query;
- добавить soft/permanent delete query tests.

### P2. Lifecycle transition policy реализована частично

**Наблюдение**

Lifecycle script запрещает только восстановление из `ARCHIVED`. Остальные переходы допускаются, включая возврат `ACTIVE`/`PAUSED` в `DRAFT`.

Источник: `src/scripts/discount/DiscountUpdateLifecycleScript.ts`.

README заявляет, что application layer отвечает за допустимость lifecycle transitions, но transition matrix отсутствует.

**Критерий закрытия**

- утвердить state transition table;
- определить правила для discounts с reservations/redemptions;
- покрыть каждый разрешённый и запрещённый переход.

## 7. Бизнес-логика по типам скидок

### 7.1 Amount off products

Реализовано:

- BENEFIT targets;
- products, variants, categories и all products;
- percentage и fixed amount;
- `EACH` и `ACROSS`;
- maximum discount cap;
- allocation по remaining line capacity;
- code и automatic activation.

Не завершено или не подтверждено:

- cross-service target validation;
- stale target reconciliation;
- mixed purchase modes;
- minimum requirement scope;
- persistence/API integration tests для всех combinations.

### 7.2 Amount off order

Реализовано:

- percentage и fixed amount;
- deterministic proportional allocation;
- применение после product discounts;
- combination compatibility;
- usage requirements.

Не завершено или не подтверждено:

- mixed subscription/one-time semantics;
- minimum base до или после product discounts должен быть явно специфицирован;
- полное coverage комбинаций, rounding и usage lifecycle.

### 7.3 Buy X Get Y

Реализовано:

- quantity/subtotal qualifier;
- independent qualifier и benefit selections;
- FREE, percentage и fixed adjustment;
- `usesPerOrderLimit`;
- deterministic benefit selection;
- range-based planning для больших quantities.

Не завершено или не подтверждено:

- owner-service target validation;
- behavior для stale targets;
- mixed purchase modes;
- checkout e2e fixture в текущем виде нарушает active aggregate requirements.

### 7.4 Free shipping

Реализовано:

- shipping class;
- maximum shipping price;
- delivery group allocations;
- combination checks;
- final quote application.

Не завершено или не подтверждено:

- country/region constraints намеренно отсутствуют;
- нет полного service-level integration coverage;
- Commerce Function shipping binding не проходит owner validation.

## 8. Usage accounting и concurrency

### Реализовано

- aggregate и code counters;
- active reservation locking;
- usage-limit checks under transaction;
- once-per-customer checks;
- idempotent reservation replay validation;
- commit to redemption;
- allocation persistence;
- release;
- expiration method;
- reversal;
- canonical grouping нескольких applications одного discount;
- конкурентный e2e-сценарий usage limit присутствует в checkout suite.

### Пробелы

- expiration action не вызывается maintenance процессом;
- нет прямых repository integration tests для всех state transitions;
- unit tests lifecycle service в основном проверяют grouping, а не database transitions;
- нет полного покрытия повторного commit/release/reverse;
- нет тестов counter drift recovery;
- нет тестов на failure между order creation и discount commit/reversal;
- read model consistency после каждого transition не подтверждена.

## 9. Multi-tenancy и безопасность

### Положительные аспекты

- основные repository queries включают `storeId`;
- loaders используют store-scoped repositories;
- checkout actions разрешают Store через trusted Project broker call;
- checkout context сверяется с Store ID и currency;
- Admin workflows используют store domain policy;
- GraphQL IDs типизированы namespace/type encoding.

### Оставшиеся риски

- cross-service input IDs не проверяются на Store ownership;
- отсутствуют прямые Pricing Admin API tenancy tests;
- AppInstallation binding не валидируется;
- malformed filter IDs могут завершаться database error;
- reconciliation events не защищены, потому что отсутствуют.

## 10. Currency и денежные расчёты

Реализация в целом соответствует проектному правилу единственной валюты Store:

- checkout context currency сверяется с `store.currencyCode`;
- discount creation принимает только Store currency;
- деньги хранятся в minor units через `bigint`;
- percentages хранятся в basis points;
- checkout money возвращается с canonical Store currency;
- floating-point расчёты не используются;
- tax V1 явно установлен в zero contract.

Требует уточнения:

- README говорит о normalization входных сумм, но фактически service отвергает currency mismatch и не выполняет conversion. Для single-currency Store это корректно, однако документация должна использовать термин validation, а не normalization/conversion.

## 11. Тестовое покрытие

### Текущий inventory

В `services/pricing/src` обнаружено:

- 6 unit test files;
- 27 unit test cases.

Основное покрытие сосредоточено на:

- final delivery validation;
- line discount application;
- shipping discount application;
- native discount calculation;
- Buy X Get Y unit planning;
- usage requirement grouping.

В e2e присутствуют:

- Admin UI flows для четырёх discount kinds;
- checkout promotions scenarios;
- один конкурентный usage-limit scenario;
- Pricing fault handling через Checkout;
- Loyalty reference use case.

### Критические пробелы

Не найдено достаточного прямого покрытия для:

- Pricing GraphQL query fields;
- every filter/order/pagination combination;
- Node and federation resolution;
- create validation matrix;
- update section matrix;
- empty/no-op update;
- optimistic revision conflicts;
- partial workflow failures;
- draft delete restrictions;
- external reference CRUD lifecycle;
- soft-delete visibility;
- reference reconciliation;
- Store isolation;
- malformed/wrong-type global IDs;
- quote persistence replay/conflict;
- reserve/commit/release/expire/reverse database behavior;
- function binding validation;
- required/optional Commerce Function failures;
- function output validation through broker integration;
- mixed purchase types;
- stale targets/customers/segments.

## 12. Рекомендуемый порядок завершения

### Этап 1. Стабилизировать контракт и green baseline

1. Разрешить конфликт mandatory buyer/channels и текущих fixtures.
2. Зафиксировать default policy активной скидки.
3. Исправить `clientMutationId` contract.
4. Запретить empty `discountUpdate`.
5. Определить atomic/partial semantics update workflow.
6. После исправлений выполнить build и targeted Pricing/Checkout e2e через `shopana-cli`.

### Этап 2. Закрыть tenant и reference integrity

1. Добавить batch validation Catalog targets.
2. Добавить Customer/Segment validation.
3. Добавить AppInstallation/function validation.
4. Реализовать stale-reference event handlers.
5. Добавить cross-store и deleted-reference tests.

### Этап 3. Завершить operational lifecycle

1. Подключить expiration maintenance.
2. Закрыть retry/idempotency всех usage actions.
3. Подтвердить counter consistency integration tests.
4. Проверить order-placement compensation paths.

### Этап 4. Завершить business semantics

1. Утвердить mixed purchase-mode behavior.
2. Утвердить minimum requirement scope.
3. Утвердить lifecycle transition matrix.
4. Зафиксировать combination precedence и class ordering contract.
5. Добавить exhaustive scenario matrix для четырёх native kinds.

### Этап 5. Commerce Functions

1. Binding-time manifest/installation validation.
2. Full line-discount function e2e.
3. Full shipping-discount function e2e.
4. REQUIRED/OPTIONAL failure tests.
5. Invalid output, timeout, route change и uninstall tests.

## 13. Definition of Done

Pricing Service можно считать готовым только при выполнении всех условий:

- [ ] Все GraphQL query и mutation fields имеют успешные contract tests.
- [ ] Все broker actions имеют integration tests.
- [ ] Все четыре native discount kinds проходят create → update → checkout → reserve → commit → reverse flow.
- [ ] Code и automatic methods покрыты для каждого допустимого kind.
- [ ] Cross-service IDs проверяются owner services и текущим Store.
- [ ] `VALID`/`STALE` lifecycle реально работает.
- [ ] FUNCTION discounts проверяются при binding и проходят e2e.
- [ ] Empty/no-op/failed updates не нарушают revision contract.
- [ ] `clientMutationId` соответствует SDL.
- [ ] Expired reservations обслуживаются maintenance процессом.
- [ ] Mixed purchase mode и minimum requirement semantics документированы и протестированы.
- [ ] Soft-delete visibility external references определена и протестирована.
- [ ] Cross-store isolation подтверждена e2e.
- [ ] Concurrency tests подтверждают отсутствие oversubscription и counter drift.
- [ ] Pricing build успешен.
- [ ] Targeted unit/integration/e2e suite успешна.
- [ ] Нет ignored/skipped tests для обязательных pricing scenarios.

## 14. Итоговый вердикт

Pricing Service нельзя считать завершённым.

Сервис вышел далеко за уровень skeleton: core schema, repositories, workflows, native engines и checkout integration уже существуют. Главный остаточный риск находится не в количестве написанного кода, а в незакрытых сквозных гарантиях:

- reference integrity;
- tenant ownership;
- workflow/revision semantics;
- operational expiration;
- Function binding validation;
- согласованность API contract и tests.

Текущая оценка **60–65%** отражает наличие большей части happy-path implementation при отсутствии достаточного подтверждения production invariants. После закрытия P1 findings и обязательной test matrix оценку можно пересмотреть.
