# Pricing + Catalog Checkout Pipeline — implementation-ready plan

## Summary

Реализовать provider side для двух Pricing stages канонического Checkout
Pipeline:

```text
Checkout
  -> pricing.calculateCheckoutPreliminaryQuote
       -> catalog.resolveCheckoutMerchandise
       -> merchandise/component transformation
       -> PRODUCT/ORDER discounts
       -> preliminary quote snapshot
  -> delivery.calculateCheckoutDeliveryOptions
  -> pricing.finalizeCheckoutPricingQuote
       -> SHIPPING discounts
       -> final quote snapshot
  -> payments.getCheckoutAvailablePaymentMethods
  -> checkout validation
```

Checkout остаётся владельцем orchestration, draft/CAS persistence и readiness
validation. Catalog остаётся владельцем purchasable merchandise, базовых цен,
компонентов и доступности. Pricing становится единственным владельцем
трансформации строк, скидок, allocations, округления и денежных quote snapshots.

План использует существующие cross-service типы из
`packages/broker-types/src/actions/catalog.ts` и
`packages/broker-types/src/actions/pricing.ts`. Новый параллельный контракт или
legacy fallback не создаётся.

## Goals

- сделать `PRICING_PRELIMINARY` и `PRICING_FINAL` рабочими в production
  composition root;
- реализовать Catalog read boundary, необходимый Preliminary Pricing;
- обеспечить детерминированные line transformations, totals, discount
  applications и revisions;
- поддержать четыре существующих native discount flow:
  `AMOUNT_OFF_PRODUCTS`, `BUY_X_GET_Y`, `AMOUNT_OFF_ORDER`, `FREE_SHIPPING`;
- подготовить Pricing-owned App discount bindings и два Commerce Function
  target без активации Apps route самим фактом существования route;
- сохранить immutable Pricing snapshots, на которые впоследствии может
  ссылаться usage reservation/order completion;
- сохранить tenant isolation, store currency и immutable `effectiveAt` во всех
  чтениях;
- добавить contract, domain, integration и storefront E2E coverage.

## Non-goals

- изменение порядка пяти Checkout stages;
- налоговый engine: V1 всегда возвращает `taxTotal.amountMinor === "0"`;
- выбор Delivery option или Payment method внутри Pricing;
- inventory reservation: Catalog на этой стадии только читает availability;
- discount usage reservation во время обычного repricing;
- возвраты, partial fulfillment и accounting после Order — кроме выделения
  required follow-up boundary;
- Media service integration. `imageUrl` в V1 возвращается `null`, пока Media не
  предоставит отдельный stable checkout snapshot action;
- multi-currency checkout. Все деньги нормализованы в `context.currencyCode`,
  который обязан совпадать с валютой Store.

## Current State and Blocking Gaps

### Checkout

- `CheckoutPipeline` уже вызывает Preliminary Pricing, Delivery, Final Pricing,
  Payments и Validation в требуемом порядке.
- Checkout broker adapters вызывают:
  `pricing.calculateCheckoutPreliminaryQuote` и
  `pricing.finalizeCheckoutPricingQuote`.
- Checkout выполняет request-relative проверку provenance, revisions,
  arithmetic, line lineage, delivery assignments, allocations, promo-code
  resolutions и неизменности merchandise между preliminary и final stages.
- Поэтому Pricing не может возвращать частичный или приблизительный payload:
  результат должен удовлетворять всем invariants существующего
  `services/checkout/src/application/pipeline/boundaries.ts`.

### Catalog

- `catalog.resolveCheckoutMerchandise` зарегистрирован и имеет request Zod
  schema, но всегда возвращает `CHECKOUT_MERCHANDISE_RESOLUTION_FAILED`.
- В Catalog есть таблицы variants, products, translations, prices, components,
  inventory items, warehouse stock, categories, tags, options и features.
- В модели нет явного `requiresShipping`; выводить physical state из наличия
  weight/dimensions или `trackInventory` запрещено, потому что это разные
  бизнес-свойства.
- Current-price view недостаточен: checkout read обязан выбирать цену на
  immutable `effectiveAt`, включая исторический interval.
- `imageUrl` нельзя надёжно получить без Media boundary; nullable contract
  позволяет вернуть `null`.

### Pricing

- `PricingCheckoutQuotePort`, Catalog port, snapshot port, usage reservation
  port и discount-function contracts существуют только как scaffolding.
- Broker actions для checkout quote не зарегистрированы.
- Нет quote engine, Catalog adapter, provider-side schemas, immutable quote
  persistence и checkout-specific repositories.
- Existing discount tables покрывают native конфигурацию, eligibility,
  combinations, counters, reservations и redemptions, но нет evaluation read
  model/application layer.
- Нет Pricing-owned function binding persistence. `Apps` route discovery не
  может автоматически активировать скидку.
- Текущий Admin GraphQL `Discount` описан только как native aggregate. App
  discount configuration требует явного расширения aggregate contract, а не
  synthetic owner в runtime.

## Ownership and Trust Boundaries

| Concern | Owner | Rule |
| --- | --- | --- |
| Source cart intent, destination addresses, selections | Checkout | Pricing получает только PII-free eligibility/location projection |
| Variant/product identity and publication | Catalog | Pricing не читает Catalog DB напрямую |
| Base and compare-at price | Catalog | Цена выбирается на `effectiveAt` и в store currency |
| Component configuration and component price instruction | Catalog | Catalog валидирует selection; Pricing применяет price instruction |
| Inventory availability | Catalog | Quote не резервирует stock |
| Transformed lines and source lineage | Pricing | Delivery получает только canonical transformed physical lines |
| Discount configuration, eligibility, candidates and usage view | Pricing | Apps output никогда не становится trusted allocation напрямую |
| Delivery options and selected option | Delivery | Final Pricing читает immutable delivery snapshot |
| Discount allocation, rounding and totals | Pricing | Только platform applicator создаёт trusted application |
| Pipeline order, deadline and stage outcomes | Checkout | Pricing не запускает downstream stages |
| Checkout state/CAS | Checkout | Pricing snapshots не заменяют Checkout snapshot |
| Usage reservation/redemption | Pricing during completion | Не выполняется при cart repricing |

## Architectural Decisions

### 1. Existing broker contracts are canonical

Не создавать Pricing-specific DTO, отличающийся от `@shopana/broker-types`.
Application types являются aliases существующих:

```ts
Pricing.CalculateCheckoutPreliminaryQuoteParams
Pricing.CalculateCheckoutPreliminaryQuoteResult
Pricing.FinalizeCheckoutPricingQuoteParams
Pricing.FinalizeCheckoutPricingQuoteResult
Catalog.ResolveCheckoutMerchandiseParams
Catalog.ResolveCheckoutMerchandiseResult
```

Catalog и Pricing всё равно имеют собственные runtime parsers на provider
boundary. Type-only package не считается runtime validation.

### 2. No remote call inside a database transaction

- Catalog загружает Store context до открытия read snapshot.
- Catalog merchandise read выполняется в одной локальной read-only
  repeatable-read transaction.
- Preliminary Pricing сначала вызывает Catalog, затем отдельными локальными
  Pricing transactions читает discount snapshot и сохраняет quote.
- Final Pricing использует переданные preliminary/delivery snapshots, затем
  читает только shipping discount state и сохраняет final quote.
- Ни одна Pricing transaction не остаётся открытой во время Catalog/Apps broker
  calls.

### 3. V1 line transformation is structural, not arbitrary

До появления отдельного cart-transform Commerce Function target V1 использует
детерминированную structural transformation:

- каждая `RESOLVED` source line создаёт ровно одну transformed line;
- transformed `lineId` равен source `lineId`;
- root order и child order сохраняют input depth-first preorder;
- root quantity остаётся абсолютным;
- child transformed quantity равен произведению source quantity и всех ancestor
  quantities;
- source line с Catalog status `REJECTED` получает Pricing resolution
  `REMOVED` и не создаёт transformed line;
- если parent удалён, все descendants также `REMOVED`, даже если отдельные
  Catalog rows были разрешены;
- V1 не объединяет одинаковые variants из разных source lines и не разделяет
  одну source line на несколько transformed lines;
- lineage содержит ровно одну пару для каждой transformed line.

Такая политика сохраняет возможности текущего контракта many-to-many, но не
вводит недетерминированные transformations до отдельного design.

### 4. Component ownership is split deliberately

Catalog:

- определяет configuration, group и exact component item;
- проверяет, что nested selection принадлежит конфигурации parent variant;
- проверяет item visibility, product/variant reference, min/max quantity,
  group cardinality и dependency rules;
- возвращает resolved `priceRule` snapshot и его revision.

Pricing:

- materializes absolute child quantity;
- применяет `BASE`, `FREE`, `OVERRIDE` или `ADJUSTMENT`;
- решает, какая line вносит вклад в totals.

V1 contribution rule:

- root line всегда `contributesToTotals: true`;
- child `BASE`, `OVERRIDE` и `ADJUSTMENT` имеют
  `contributesToTotals: true`;
- child `FREE` имеет `contributesToTotals: false`, нулевые `unitPrice`,
  `subtotal` и `total`, но сохраняет Catalog `originalUnitPrice`;
- parent base price не уменьшается автоматически при добавлении components;
- `DECREASE` никогда не создаёт отрицательную component unit price;
- percentage calculation округляется вниз до minor unit до discount
  allocations.

### 5. Availability evaluates total demand per variant

Для tracked variant Catalog вычисляет:

```text
sellable = max(0, sum(quantityOnHand - reservedQty - unavailableQty))
aggregateDemand = sum(absolute transformed demand for the variant)
```

- untracked или `continueSellingWhenOutOfStock` => `maxQuantity: null`;
- tracked => `maxQuantity: sellable` у каждого occurrence;
- `available` true только когда весь aggregate demand variant может быть
  удовлетворён;
- при `sellable === 0` reason `OUT_OF_STOCK`;
- при `0 < sellable < aggregateDemand` reason `INSUFFICIENT_STOCK`;
- при недостаточном aggregate stock все occurrences этого variant получают
  `available: false`, чтобы две отдельные строки не могли каждая успешно
  проверить один и тот же остаток;
- availability остаётся advisory snapshot; atomic stock reservation выполняется
  позднее владельцем inventory.

### 6. Money uses bigint minor units only

- В application/domain code amounts представлены `bigint`.
- На broker boundary amounts сериализуются decimal strings.
- Floating point запрещён.
- Percentage хранится и вычисляется в basis points.
- Любой input/output Money обязан иметь `context.currencyCode`.
- Все caps применяются до allocation.
- Последняя allocation в canonical order получает remainder, чтобы сумма
  allocations точно равнялась application amount.
- Ни одна line или delivery group не может получить discount больше своего
  remaining eligible amount.

### 7. Revisions are content-derived; IDs are attempt-idempotent

Общий `canonicalJson` serializer сортирует object keys, сохраняет array order,
запрещает `undefined`, non-finite numbers и non-JSON values.

```text
revision = <namespace>:v1:<sha256(canonicalJson(payload))>
```

Namespaces минимум:

- `catalog-merchandise`;
- `catalog-availability`;
- `catalog-component`;
- `pricing-delivery-intent`;
- `pricing-discount-evaluation`;
- `pricing-preliminary-quote`;
- `pricing-final-quote`;
- `pricing-function-bindings`.

Revision payload содержит все причинно значимые source values и ordering, но не
`requestedAt`, `deadlineAt`, correlation ID или wall-clock момент выполнения.

`preliminaryQuoteId` и `quoteId` генерируются один раз при первом сохранении
attempt и переиспользуются по idempotency identity:

```text
storeId + checkoutId + basedOnCheckoutVersion + executionId + stage
```

Повтор одного broker call не создаёт другой snapshot. Новая pipeline attempt с
новым execution ID может иметь новый quote ID, но при неизменных source inputs
сохраняет ту же content revision.

### 8. Pricing persists immutable quote snapshots

Checkout остаётся source of truth текущего cart state. Pricing snapshot нужен
для:

- idempotent replay broker action;
- проверки final quote при future usage reservation;
- аудита discount configuration/counter revisions;
- недопущения пересчёта старой скидки по новой конфигурации.

Snapshots append-only. Update payload запрещён. Conflict с той же idempotency
identity и другим request digest является boundary violation.

### 9. Repricing never reserves discount usage

Quote evaluation читает counters и возвращает `usageRequirements`. Она может
дать optimistic eligibility, но не изменяет counters.

Order completion обязан отдельной атомарной операцией повторно проверить
requirements, lock counters в `(discountId, codeId)` order и создать
reservations. Это follow-up integration после рабочего пятистадийного pipeline.

### 10. Native discounts precede App discount rollout

Critical path сначала реализует native discounts. Commerce Functions
подключаются отдельным increment после стабилизации allocation kernel, но
используют тот же candidate/applicator boundary. App output не может задавать
готовые amounts/allocations мимо platform caps, eligibility и combination.

## Target Module Structure

### Catalog

```text
services/catalog/src/checkout-pipeline/
  CheckoutMerchandiseService.ts
  CheckoutMerchandiseRepository.ts
  ComponentSelectionValidator.ts
  availability.ts
  canonicalJson.ts
  contracts.ts
  index.ts
  schemas.ts
```

`CatalogBrokerActions.resolveCheckoutMerchandise()` только:

1. валидирует request;
2. загружает Store и создаёт service context;
3. вызывает `CheckoutMerchandiseService.resolve()`;
4. маппит known domain failures в typed `ok: false` result.

Checkout-specific batch read не собирать через GraphQL service resolvers и
DataLoader. Для consistent snapshot создать отдельный repository, который явно
читает необходимые rows и всегда фильтрует `store_id`.

### Pricing

```text
services/pricing/src/checkout-pipeline/
  application/
    PricingCheckoutQuoteService.ts
    PreliminaryQuoteService.ts
    FinalQuoteService.ts
  domain/
    componentPricing.ts
    lineTransformation.ts
    deliveryIntent.ts
    money.ts
    revisions.ts
    discounts/
      DiscountOwnerResolver.ts
      NativeCandidateEvaluator.ts
      DiscountApplicator.ts
      AmountOffEvaluator.ts
      BuyXGetYEvaluator.ts
      FreeShippingEvaluator.ts
      combinations.ts
      allocation.ts
      codeResolutions.ts
  infrastructure/
    BrokerCatalogMerchandiseAdapter.ts
    PricingCheckoutQuoteRepository.ts
    DiscountEvaluationRepository.ts
    PricingFunctionBindingRepository.ts
  functions/
    PricingDiscountFunctionRunner.ts
    targetDefinitions.ts
  schemas.ts
  canonicalJson.ts
  errors.ts
  contracts.ts
  index.ts

services/pricing/src/actions/
  PricingCheckoutBrokerActions.ts
```

Pure domain modules не импортируют Nest, Drizzle, ServiceBroker или context.
Repositories не выполняют business allocation. Broker action не содержит
discount logic.

## Database Changes

### Catalog physical flag

Поскольку production data нет, изменить baseline migration и Drizzle model
напрямую; backfill/compatibility migration не создавать.

В `catalog.inventory_item` добавить:

```sql
requires_shipping boolean NOT NULL
```

Обновить:

- `packages/broker-types/src/actions/inventory.ts` create/update params;
- Catalog Admin GraphQL `InventoryItemInput` и `VariantInventoryOpInput`;
- Product create saga;
- `InventoryBrokerActions.createItem/updateItem`;
- `InventoryItemRepository` create/update projections;
- inventory update script/change snapshot;
- generated GraphQL artifacts только штатным codegen workflow.

Не выводить `requiresShipping` из `trackInventory`, stock, dimensions или weight.

### Pricing quote snapshots

Добавить domain `services/pricing/migrations/domains/0800_checkout/` и Drizzle
models:

```text
pricing.checkout_preliminary_quote
  id uuid primary key
  store_id uuid not null
  checkout_id uuid not null
  based_on_checkout_version integer not null
  execution_id text not null
  request_digest text not null
  revision text not null
  merchandise_revision text not null
  availability_revision text not null
  discount_evaluation_revision text not null
  payload jsonb not null
  created_at timestamptz not null

pricing.checkout_final_quote
  id uuid primary key
  store_id uuid not null
  checkout_id uuid not null
  based_on_checkout_version integer not null
  execution_id text not null
  preliminary_quote_id uuid not null
  based_on_preliminary_revision text not null
  based_on_delivery_revision text not null
  request_digest text not null
  revision text not null
  discount_evaluation_revision text not null
  payload jsonb not null
  created_at timestamptz not null
```

Constraints:

- unique `(store_id, checkout_id, based_on_checkout_version, execution_id)` на
  каждой stage table;
- unique `(store_id, id)`;
- local FK final `preliminary_quote_id`;
- `jsonb_typeof(payload) = 'object'`;
- non-empty revision/digest checks;
- `based_on_checkout_version >= 0`;
- indexes по `(store_id, checkout_id, created_at desc)` и revision.

Payload после чтения всегда повторно проходит provider result parser. JSONB не
считается trusted только потому, что он записан Pricing.

### Pricing function discounts

Этот schema increment выполняется перед Commerce Function phase, не блокируя
native pipeline.

Так как production data нет, `calculation_strategy`/nullable `kind` вносятся в
baseline discount migration и Drizzle model напрямую. Не добавлять data
backfill, dual shape или временный default, имитирующий старый aggregate.

Расширить aggregate:

```text
discount.calculation_strategy = NATIVE | FUNCTION
discount.kind nullable
```

Invariants:

- `NATIVE` требует non-null kind и ровно один соответствующий native subtype;
- `FUNCTION` требует null kind, не имеет native rule subtype и имеет ровно один
  function binding для target, соответствующего `discount_class`;
- `discount_class` остаётся обязательным;
- lifecycle, code/automatic method, schedule, channels, buyer eligibility,
  purchase modes, combinations и usage limits общие для обеих стратегий.

Добавить:

```text
pricing.discount_function_binding
  id uuid primary key
  store_id uuid not null
  discount_id uuid not null
  target pricing_discount_function_target not null
  contract_version integer not null
  installation_id uuid not null
  function_key text not null
  precedence integer not null
  activation_sequence bigint not null
  status ACTIVE | DISABLED
  failure_mode REQUIRED | OPTIONAL
  configuration_snapshot jsonb not null
  configuration_revision text not null
  route_revision text not null
  created_at / updated_at timestamptz
```

Constraints:

- unique `(store_id, id)`;
- unique `(discount_id, target)`;
- FK `discount_id` внутри Pricing;
- target/class match проверяется aggregate validation;
- positive contract version, non-negative ordering;
- JSON configuration и non-empty revisions;
- App installation/route не имеет cross-service FK.

Admin GraphQL получает `calculationStrategy`, nullable `kind` и function binding
input/projection. Создание/обновление binding выполняется Pricing workflow;
существование Apps route само по себе никогда не создаёт binding.

## Catalog Implementation

### Request boundary

Сохранить существующие limits:

- максимум 250 lines во всём дереве;
- максимум 8 levels;
- unique line IDs;
- root `componentSelection === null`;
- nested `componentSelection !== null`;
- positive safe integer quantities;
- ISO `effectiveAt`;
- known store currency/locale.

Дополнительно provider проверяет, что request currency совпадает с
`Store.currencyCode`. Несовпадение — non-retryable merchandise resolution
failure, а не поиск цены в произвольной валюте.

### Consistent read

За один repeatable-read snapshot batch-load:

1. variants и owning products;
2. product/variant translations для requested locale и Store default locale;
3. price interval, активный на `effectiveAt`;
4. inventory items и aggregate warehouse stock;
5. categories, tags, feature IDs и selected option value IDs;
6. component configurations, groups, items, templates/direct price rules,
   amounts/percentages и dependency rules;
7. first variant media reference только для revision; `imageUrl` остаётся null.

Любой query имеет explicit `store_id = context.store.id`. Cross-tenant row
трактуется как отсутствующий.

### Effective price selection

Активная price row удовлетворяет:

```text
effectiveFrom <= effectiveAt
AND (effectiveTo IS NULL OR effectiveAt < effectiveTo)
AND currency = context.currencyCode
```

Если активны несколько rows, это Catalog invariant violation и весь action
возвращает retryable `CHECKOUT_MERCHANDISE_RESOLUTION_FAILED`; выбирать одну
молча нельзя.

### Resolution precedence

Для каждой source line вернуть ровно одну disposition в input preorder.
Rejection precedence:

1. `VARIANT_NOT_FOUND` — variant отсутствует/deleted/cross-tenant;
2. `PRODUCT_NOT_FOUND` — owning product отсутствует/deleted;
3. `PRODUCT_NOT_PUBLISHED` — `publishedAt` null или позже `effectiveAt`;
4. `CURRENCY_NOT_SUPPORTED` — у variant вообще нет price rows в canonical
   Store currency;
5. `PRICE_NOT_FOUND` — currency поддерживается, но на `effectiveAt` нет
   единственной active price row;
6. `INVALID_COMPONENT_SELECTION` — нарушена component structure/configuration.

Technical DB failure не превращается в 250 line rejections; action возвращает
top-level retryable failure.

### Component validation

- Root variant с `requiresComponents` обязан иметь valid child selections.
- Nested item ID должен принадлежать active parent configuration.
- Item `VARIANT` допускает только exact `refVariantId`.
- Item `PRODUCT` допускает variant только этого `refProductId`.
- Item должен быть visible и разрешён dependency rules.
- Source child quantity проверяется против item min/max до materialization.
- Число выбранных items в group проверяется против min/max selection.
- Повтор одного component item в одном parent запрещён.
- Pricing template сначала разрешается в concrete price rule; direct rule и
  template одновременно недопустимы уже на persistence layer.
- `requiresComponents` true только для variant, связанного с component
  configuration, в которой есть обязательные groups/rules.

Если parent selection invalid, parent и его descendants получают explicit
`INVALID_COMPONENT_SELECTION` dispositions. Другие независимые roots
продолжают разрешаться.

### Merchandise snapshot

- `title`: variant translation requested locale → variant Store-default →
  product requested locale → product Store-default; отсутствие всех вариантов
  является technical data invariant violation;
- `sku`: variant SKU, затем inventory item SKU, иначе null;
- `imageUrl: null` в V1;
- `requiresShipping`: только `inventory_item.requires_shipping`;
- targeting arrays unique и lexicographically sorted;
- `revision` line snapshot включает identity/content/target/component row
  values;
- batch `merchandiseRevision` включает ordered line dispositions;
- batch `availabilityRevision` включает inventory flags, every stock row,
  aggregate demand и ordered availability result.

### Catalog acceptance criteria

- empty input возвращает `ok: true`, пустой ordered lines и stable empty
  revisions;
- каждая input line, включая children, встречается ровно один раз;
- результат не зависит от порядка SQL rows;
- историческая цена выбирается по `effectiveAt`, а не current view;
- два occurrences одного variant не overpromise один stock balance;
- untracked и oversell variants имеют `maxQuantity: null`;
- invalid component tree не создаёт partially valid descendants;
- изменение content/price/component меняет merchandise revision;
- изменение inventory/stock/demand меняет availability revision;
- чтение другого Store невозможно.

## Pricing Preliminary Implementation

### Provider boundary

`PricingCheckoutBrokerActions`:

- наследуется от `BrokerActions`;
- регистрирует `PricingCheckoutActionNames.calculatePreliminaryQuote` и
  `PricingCheckoutActionNames.finalizeQuote`;
- проверяет caller-owned payload через strict Zod schemas;
- создаёт/получает checkout application composition после `Kernel.create()`;
- не раскрывает internal error messages Checkout;
- сохраняет retryability только для typed infrastructure failures;
- добавляется provider в `PricingModule`.

### Preliminary execution

1. Parse request и deadline.
2. Проверить store/currency/effectiveAt/buyer invariants.
3. Вычислить request digest и попытаться replay existing snapshot.
4. Вызвать Catalog через `BrokerCatalogMerchandiseAdapter` с mapping из
   существующего `toCatalogMerchandiseParams()`.
5. Проверить Catalog response request-relative:
   store-independent shape, exact ordered line coverage, identities,
   currencies, component parent relationships и revisions.
6. Построить source resolutions и transformed lines.
7. Materialize quantities и component unit prices.
8. Построить canonical delivery intent.
9. Создать common line discount input.
10. Resolve eligible PRODUCT/ORDER owners and submitted codes.
11. Получить native/App candidates.
12. Применить candidates через platform applicator.
13. Собрать line allocations и preliminary totals.
14. Вычислить revisions.
15. Строго проверить собственный result теми же arithmetic/lineage rules.
16. Идемпотентно сохранить immutable snapshot и вернуть persisted payload.

### Catalog failure mapping

- Catalog `ok: false` всегда останавливает Pricing stage;
- retryable flag сохраняется во внутреннем typed error;
- per-line `REJECTED` не является infrastructure failure и маппится в
  `sourceLineResolutions: REMOVED`;
- Pricing не подменяет rejected merchandise synthetic price/availability.

### Component price calculation

Для resolved child с Catalog base unit price `P`:

```text
BASE                         => P
FREE                         => 0
OVERRIDE(amount A)           => A
ADJUSTMENT(INCREASE, fixed A)=> P + A
ADJUSTMENT(DECREASE, fixed A)=> max(0, P - A)
ADJUSTMENT(INCREASE, bps B)  => P + floor(P * B / 10000)
ADJUSTMENT(DECREASE, bps B)  => max(0, P - floor(P * B / 10000))
```

`originalUnitPrice` всегда равен Catalog base price до component instruction.
`compareAtUnitPrice` сохраняется только если он не меньше итоговой unit price;
иначе становится null.

### Delivery intent

- physical lines определяются только по `merchandise.isPhysical`;
- destination source assignments проецируются через lineage;
- transformed line не может пересечь source destination boundaries;
- каждая physical transformed line ровно один раз находится в canonical
  destination либо `unassignedPhysicalLineIds`;
- non-physical lines отсутствуют в delivery destinations;
- destination location копируется без изменения;
- destinations сохраняют source order, line IDs — transformed preorder;
- revision включает lineage, destinations и unassigned list.

### Preliminary totals

Для каждой line:

```text
subtotal = unitPrice * absoluteQuantity
lineDiscount = sum(line discount allocations)
total = subtotal - lineDiscount
```

Root/child остаются в tree. Aggregate totals суммируют только lines с
`contributesToTotals: true`:

```text
merchandiseSubtotal
merchandiseDiscountTotal
merchandiseTotal = subtotal - discount
```

Preliminary не создаёт SHIPPING application и delivery allocation.

## Native Discount Evaluation

### Owner resolution

`DiscountEvaluationRepository` загружает не Admin read model, а один immutable
evaluation snapshot для candidate IDs. Candidate set состоит из:

- automatic ACTIVE discounts нужного class;
- code discounts, найденных по каждому normalized input code;
- только Store/currency/effective schedule/channel compatible rows.

Snapshot содержит root revision, rule subtype, targets, minimum requirement,
buyer context, combinations, usage limits/counters и code identity/status.

Для native owner `configurationRevision` — decimal string текущего
`discount.revision`; все update scripts обязаны увеличивать root revision при
изменении любой дочерней rule/target/eligibility/channel/combination/code
конфигурации. `usageCounterRevision` строится отдельно из aggregate/code counter
versions и не меняет configuration revision.

Eligibility выполняется в фиксированном порядке, чтобы rejection reason был
стабильным:

1. code found/status;
2. discount lifecycle/schedule;
3. channel;
4. purchase type;
5. buyer/customer/segment;
6. usage limit;
7. minimum requirement;
8. target eligibility;
9. combination;
10. function execution/output.

Каждый submitted code возвращает ровно одну resolution в исходном spelling и
input order. Normalized representation — `upper(trim(inputCode))`. Preliminary
resolver также загружает SHIPPING owner submitted code: после всех проверок,
которые не требуют Delivery, такой code получает `PENDING/AWAITING_DELIVERY`, а
не `NOT_FOUND`.

### Trusted application identity and provenance

- `applicationId` строится детерминированно как versioned digest от owner,
  candidate, quote input revision и canonical allocations;
- native application имеет `source: { kind: "NATIVE" }`;
- function application копирует только проверенные execution ID,
  `functionBindingId`, implementation ID, target и plan revision из runner
  trace;
- application `amount` точно равен сумме allocations;
- zero-value candidate не создаёт application;
- `method: CODE` всегда имеет exact code reference и ровно одну APPLIED
  resolution; AUTOMATIC application всегда имеет `code: null`;
- metadata является validated JSON object и не участвует в arithmetic.

### Amount off products

- Targets вычисляются по product/variant/category snapshots Catalog.
- `EACH`: adjustment отдельно к каждой eligible unit/line.
- `ACROSS`: один capped amount пропорционально eligible remaining subtotal.
- Fixed EACH не превышает unit price на выбранное quantity.
- Percentage cap применяется к total candidate до allocation.

### Amount off order

- Minimum requirement проверяется по merchandise subtotal до ORDER discount.
- ORDER amount распределяется `ACROSS` по eligible contributing lines.
- PRODUCT allocations уменьшают remaining line amount до ORDER application,
  но configured minimum requirement использует явно зафиксированную policy:
  pre-discount merchandise subtotal.

### Buy X Get Y

- Qualifier и benefit selections разрешаются независимо.
- Units разворачиваются только логически; большие quantities не создают arrays.
- Canonical unit order: line preorder, затем unit index.
- Qualifier units резервируются первыми; benefit выбирает самые дешёвые eligible
  units, tie-break по line preorder/unit index, чтобы результат был
  детерминирован и merchant-safe.
- Одна unit не может одновременно обслуживать несколько uses одной application.
- `usesPerOrderLimit` применяется после вычисления possible uses.
- Benefit allocation хранит quantity, когда скидка покрывает целые units;
  partial fixed benefit использует `quantity: null`.

### Combinations

Line discount candidates применяются фазами, чтобы `ORDER` всегда видел
remaining subtotal после `PRODUCT` allocations:

```text
PRODUCT, затем ORDER
внутри фазы: priority DESC, discountId ASC, candidateId ASC
```

После расчёта applications сериализуются в каноническом Checkout order:

```text
priority DESC, discountId ASC, applicationId ASC
```

`SHIPPING` вычисляется отдельно на final Pricing stage и проверяет combinations
со всеми уже принятыми preliminary applications.

Новая application принимается только если compatibility симметрична: новый
owner разрешает class каждой уже принятой application и каждая уже принятая
application разрешает class новой. Несимметричная конфигурация означает
`COMBINATION_EXCLUDED`, не implicit permission.

Multiple candidates одного owner проходят owner-specific selection: в V1
принимается максимум одна candidate/application на discount. App candidate
выбирается по candidate order после schema validation.

### Usage requirements

Requirement создаётся для каждой accepted application и содержит:

- exact configuration revision;
- code/customer identity;
- counter revision;
- `reservationRequired: true`, если есть aggregate/code/customer limit;
- `reservationRequired: false` для unlimited discount, чтобы Order всё равно
  мог записать redemption/audit без capacity reservation.

## Pricing Final Implementation

### Final request validation

До evaluation проверить:

- preliminary provenance совпадает с context;
- delivery provenance совпадает с context;
- `delivery.basedOnPreliminaryRevision === preliminary.revision`;
- selected handles принадлежат options своих groups;
- group/line coverage соответствует preliminary delivery intent;
- все money values имеют store currency;
- preliminary snapshot существует в Pricing и его payload/revision точно
  совпадают с request;
- final request digest replay-ится идемпотентно.

### Delivery subtotal

Для каждого group:

- selection null => contribution 0;
- selected option => contribution `selected.cost`;
- options без selected handle не входят в subtotal;
- duplicate group/handle является boundary violation.

### Shipping discounts

- resolve только SHIPPING owners;
- preliminary code может иметь `PENDING/AWAITING_DELIVERY` только когда owner
  shipping eligibility действительно зависит от selected delivery;
- final result не содержит `PENDING`;
- free shipping с `maximumShippingPriceMinor` применяется только к group с
  subtotal не выше configured maximum;
- SHIPPING application allocations target только `DELIVERY_GROUP`;
- discount одного group не превышает selected merchant-collected cost;
- delivery remainder allocation использует group order.

### Final immutability

Final result копирует без изменения:

- `lines`;
- все non-SHIPPING applications;
- merchandise totals;
- preliminary line allocations;
- merchandise and availability snapshots внутри lines.

Добавляются только SHIPPING applications, final code resolutions, merged usage
requirements и final totals:

```text
taxTotal = 0
deliveryTotal = deliverySubtotal - deliveryDiscountTotal
payableTotal = merchandiseTotal + taxTotal + deliveryTotal
```

## Commerce Function Increment

### Target definitions

Зарегистрировать в Pricing composition root:

```text
cart.lines.discounts.generate.run
cart.delivery-options.discounts.generate.run
```

Оба target:

- `owningService: "pricing"`;
- `executionMode: "COLLECT_ALL"`;
- без global native implementations;
- `allowMultipleAppImplementations: true`;
- concurrency 8;
- default timeout не длиннее remaining checkout deadline и не больше 3 секунд;
- 1 MiB input/output limits и envelope depth 32;
- input/output digest trace enabled.

Native candidates вычисляются pure native evaluator. Generic runner запускает
только Pricing-owned FUNCTION bindings. Затем оба потока объединяются в один
ordered candidate list до platform applicator.

### Binding resolution

- выбрать active FUNCTION discount owners после общей eligibility;
- загрузить их Pricing binding rows;
- target обязан совпадать с discount class;
- проверить Apps route через generic `FunctionRouteResolver`;
- route revision mismatch — function failure, а не автоматическое обновление
  Pricing binding;
- binding set сортируется по precedence, activationSequence, binding ID;
- revision включает все binding/configuration/route fields;
- output envelope связывается с owner только через trusted
  `functionBindingId`; candidate не выбирает чужой discount ID.

### Output handling

- каждое output проходит source-less Zod parser;
- line/group IDs обязаны существовать во function input;
- currency обязана совпасть;
- candidate IDs unique внутри binding;
- candidate class обязана совпасть с owner class и target;
- REQUIRED failure останавливает Pricing stage;
- OPTIONAL failure исключает candidates binding и даёт rejected code
  `FUNCTION_FAILED`, если binding владеет submitted code;
- malformed output даёт `INVALID_FUNCTION_OUTPUT`;
- Apps output остаётся proposal: caps, combinations, allocation и rounding
  повторно применяет Pricing.

## Snapshot Persistence and Replay

`savePreliminary`/`saveFinal` выполняют:

1. lookup по attempt identity;
2. если row отсутствует — insert immutable payload;
3. при unique race — reread winner;
4. сравнить request digest;
5. распарсить stored payload;
6. вернуть exact stored result.

Не выполнять update payload/revision. Не перезаписывать snapshot после Catalog
или discount change. Новая Checkout attempt создаёт новый snapshot.

Quote creation и Checkout CAS не являются distributed transaction. Orphan
Pricing snapshot допустим и не становится current checkout state. Cleanup
policy проектируется отдельно после появления terminal checkout/order lifecycle.

## Discount Usage Completion

Эта часть не блокирует отображение/редактирование checkout, но обязательна до
production order creation с limited discounts.

Реализованная completion boundary отдаёт Orders exact final quote identity,
`resultRevision` и `usageRequirements`. Orders сверяет её с checkout DTO,
резервирует limited usage перед append order event, выполняет commit после
append и release при ошибке до persistence. Повторный create восстанавливает
незавершённый commit через order idempotency record.

### Reserve

- принять final `quoteId`, revision, idempotency key и requirements;
- загрузить immutable final snapshot и проверить exact requirements;
- сгруппировать applications по `(discountId, codeId, customerId)`, потому что
  usage одного discount считается один раз на order, даже если application
  имеет несколько allocations;
- lock aggregate/code counters в stable ID order;
- очистить/учесть expired reservations;
- повторно проверить limit и once-per-customer;
- создать одну reservation на group и вернуть mapping каждого application ID на
  reservation ID;
- derived row idempotency key включает caller key и group identity, поскольку
  текущая таблица имеет unique `(store_id, idempotency_key)`.

### Commit/release/redeem

- Order commit atomically переводит reservations в COMMITTED, обновляет
  counters и создаёт redemption + allocations;
- failure/cancel release уменьшает reserved counters;
- expiration доступен как отдельная идемпотентная operation;
- reversal создаёт accounting transition, не удаляет redemption;
- все operations проверяют quote/application/configuration revisions.

Операции доступны через отдельные broker contracts и не входят в
`finalizeCheckoutPricingQuote`. Expiration и reversal остаются отдельными
accounting transitions для вызывающих lifecycle flows.

## Error Model

Внутри Catalog/Pricing использовать typed domain/infrastructure errors.
Broker boundary наружу возвращает или бросает только stable classifications.

### Catalog top-level errors

- `CATALOG_STORE_NOT_FOUND`, non-retryable;
- `CHECKOUT_MERCHANDISE_RESOLUTION_FAILED`, retryable только для DB/context
  infrastructure failure;
- line rejections остаются data dispositions.

### Pricing failures

Минимальные internal codes:

- `PRICING_CHECKOUT_REQUEST_INVALID`;
- `PRICING_CHECKOUT_STORE_NOT_FOUND`;
- `PRICING_CHECKOUT_CURRENCY_MISMATCH`;
- `PRICING_CATALOG_UNAVAILABLE`;
- `PRICING_CATALOG_RESPONSE_INVALID`;
- `PRICING_DISCOUNT_SNAPSHOT_UNAVAILABLE`;
- `PRICING_FUNCTION_REQUIRED_FAILURE`;
- `PRICING_FUNCTION_OUTPUT_INVALID`;
- `PRICING_QUOTE_SNAPSHOT_CONFLICT`;
- `PRICING_QUOTE_PERSISTENCE_FAILED`;
- `PRICING_FINAL_PRELIMINARY_MISMATCH`;
- `PRICING_FINAL_DELIVERY_MISMATCH`.

Invalid request/upstream mismatch — non-retryable boundary failure. DB/broker
availability — retryable. Discount business rejection возвращается в
`discountCodeResolutions`, не падает stage.

Checkout adapter продолжает маппить provider exception в public
`CHECKOUT_PRELIMINARY_PRICING_UNAVAILABLE` или
`CHECKOUT_FINAL_PRICING_UNAVAILABLE`; internal detail остаётся в structured log.

## Observability

Structured log каждого stage содержит:

- execution/correlation/checkout/store IDs;
- based-on checkout version;
- preliminary/final quote ID and revision;
- Catalog merchandise/availability revisions;
- discount/function binding revisions;
- source/transformed/resolved/removed line counts;
- applied/rejected/pending discount counts;
- stage duration и remaining deadline;
- snapshot replay/insert outcome.

Metrics:

- Catalog resolution duration/failures/rejections;
- Pricing preliminary/final duration and failures;
- quote replay/conflict count;
- applications by class/method/source;
- code rejection reason count;
- function success/partial/required failure;
- allocation invariant violations;
- snapshot persistence latency.

Не логировать raw customer contacts, addresses, provider data, App secrets или
полный arbitrary attributes/configuration JSON.

## Implementation Increments

### Increment 0 — Contract lock and fixtures

Deliverables:

- зафиксировать existing broker types как canonical;
- добавить shared test fixtures для empty cart, simple product, component tree,
  physical delivery и discounts;
- добавить provider request/result schemas;
- добавить pure canonical JSON/revision helpers;
- оформить decision по `requiresShipping`, V1 transformations и rounding.

Exit criteria:

- Catalog/Pricing/Checkout parsers принимают одинаковые canonical fixtures;
- malformed currencies, provenance, line trees и revisions отклоняются.

### Increment 1 — Catalog schema and batch repository

Deliverables:

- explicit `requiresShipping` persistence and mutation paths;
- checkout merchandise repository;
- as-of price, translations, target snapshots, components and availability
  batch reads;
- deterministic revision builders.

Exit criteria:

- repository возвращает tenant-scoped consistent source snapshot;
- нет current-price shortcut и N+1 per line queries.

### Increment 2 — Catalog merchandise action

Deliverables:

- component validator;
- per-line resolution precedence;
- availability aggregation;
- `CheckoutMerchandiseService`;
- real `catalog.resolveCheckoutMerchandise` handler.

Exit criteria:

- action корректно обслуживает empty/simple/nested/rejected carts;
- все input lines имеют exact disposition and stable revisions.

### Increment 3 — Pricing skeleton and no-discount quotes

Deliverables:

- Pricing broker actions/composition root;
- Catalog adapter;
- transformations, component money, delivery intent;
- quote snapshot tables/repository;
- preliminary/final quote без применённых discounts;
- каждый submitted unknown code получает `REJECTED/NOT_FOUND`;
- final delivery/tax/payable totals.

Exit criteria:

- полный пятистадийный Checkout Pipeline работает для cart без configured
  discounts;
- Checkout boundary принимает preliminary/final responses;
- retry того же action replay-ит snapshot.

### Increment 4 — Native PRODUCT and ORDER discounts

Deliverables:

- evaluation repository/owner snapshots;
- eligibility and code resolution;
- amount-off products/order;
- deterministic applicator, combinations, allocation and usage requirements.

Exit criteria:

- line/application allocations зеркальны;
- caps/rounding/ordering стабильны;
- preliminary не содержит SHIPPING application.

### Increment 5 — Buy X Get Y

Deliverables:

- qualifier/benefit selection;
- quantity/subtotal requirements;
- unit-safe benefit selection;
- uses-per-order policy.

Exit criteria:

- overlap, repeated variants, nested lines and partial benefits не дают double
  discount;
- large quantities обрабатываются без materialized unit arrays.

### Increment 6 — Final SHIPPING discounts

Deliverables:

- shipping owner resolver;
- preliminary pending code policy;
- free-shipping evaluator and group allocations;
- final code resolution and merged usage requirements.

Exit criteria:

- merchandise portion final quote exact-equal preliminary;
- final не содержит pending codes;
- payable arithmetic проходит Checkout boundary.

### Increment 7 — Commerce Functions

Deliverables:

- function discount aggregate/schema/Admin operations;
- Pricing-owned binding repository;
- target registry, generic runner and output validation;
- native/App candidate merge and provenance.

Exit criteria:

- Apps route без Pricing binding не выполняется;
- route revision mismatch и REQUIRED/OPTIONAL failures имеют canonical
  semantics;
- invalid output не влияет на trusted allocations.

### Increment 8 — Usage completion

Deliverables:

- reserve/commit/release/expire/redeem/reverse application services;
- broker contracts;
- Orders workflow integration;
- contention/idempotency coverage.

Exit criteria:

- concurrent limited-discount checkouts не превышают capacity;
- retry не создаёт duplicate reservation/redemption;
- expired/released reservations корректно возвращают capacity.

### Increment 9 — End-to-end hardening

Deliverables:

- targeted storefront checkout E2E scenarios;
- broker contract integration coverage;
- deadline/timeout/failure scenarios;
- dashboards/alerts for new actions;
- removal of temporary `not implemented` paths and TODOs in completed scope.

Exit criteria:

- create/add/update/remove/clear/promo/delivery-selection checkout mutations
  сохраняют canonical pipeline snapshot;
- query после mutation возвращает те же lines, discounts and totals;
- no stage invokes legacy local pricing fallback.

## Test Matrix

### Catalog contract/domain

- empty and maximum-size trees;
- duplicate IDs, invalid depth and quantity;
- deleted/unpublished product and missing variant;
- exact effective price interval boundaries;
- currency mismatch/missing price;
- locale fallback;
- untracked, oversell, out-of-stock and insufficient aggregate stock;
- duplicate variant occurrences;
- valid/invalid component item, group cardinality, dependency and quantity;
- BASE/FREE/OVERRIDE/ADJUSTMENT snapshot shapes;
- tenant isolation and deterministic row ordering;
- content/stock revision changes.

### Pricing pure domain

- component price arithmetic and zero floor;
- absolute nested quantities;
- delivery lineage/assignments;
- subtotal and contribution rules;
- percentage/fixed/EACH/ACROSS allocations and remainder;
- caps and no-negative totals;
- PRODUCT then ORDER remaining amount;
- Buy X Get Y overlap and deterministic cheapest-benefit selection;
- symmetric combinations;
- exact code resolution order/reasons;
- final merchandise immutability;
- shipping group caps and zero-tax payable total.

### Persistence/integration

- quote insert/replay/unique race/conflict;
- malformed stored JSON rejected;
- Catalog failure mapping;
- stale preliminary/delivery revisions rejected;
- function binding ordering/revision/route mismatch;
- REQUIRED and OPTIONAL function failures;
- snapshot reads/writes always scoped by Store.

### Storefront E2E

- empty checkout remains canonical invalid with `CART_EMPTY`;
- simple available product obtains Catalog price and final totals;
- physical product requires destination/delivery selection;
- unavailable product produces native line readiness operation;
- component cart preserves tree/absolute quantities/component price;
- unknown/disabled/not-active/minimum-failed promo code warning;
- automatic product/order discount;
- Buy X Get Y;
- shipping code pending before delivery and applied/rejected after delivery;
- changing quantity, currency, destination or selected delivery reruns both
  Pricing stages once and commits one new checkout version;
- concurrent checkout mutation discards stale quote via Checkout CAS.

Tests добавляются как артефакты реализации. Их запуск выполняется только
разрешённым проектом workflow (`shopana-cli`/targeted E2E according to
`e2e/AGENTS.md`), без запуска всей suite.

## File Change Map

### Shared contracts

- `packages/broker-types/src/actions/inventory.ts` — explicit physical flag;
- `packages/broker-types/src/actions/pricing.ts` — менять только если usage
  completion добавляет новые actions; quote shapes уже достаточны.

### Catalog

- baseline migration `0600_inventory__items.sql`;
- inventory Drizzle model/repository/actions/create-update flows;
- existing `resolveCheckoutMerchandise.schema.ts`;
- new `src/checkout-pipeline/**`;
- `src/actions/index.ts` delegation;
- targeted Catalog/E2E fixtures.

### Pricing

- new `src/checkout-pipeline/**` application/domain/infrastructure/functions;
- new `src/actions/PricingCheckoutBrokerActions.ts`;
- `src/pricing.module.ts` provider registration;
- `src/kernel/types.ts` only if checkout application becomes an explicit kernel
  service;
- `src/repositories/Repository.ts` aggregate fields;
- new checkout/function Drizzle models and migrations;
- Admin discount schema/workflows/read models for function strategy;
- targeted integration/E2E fixtures.

### Checkout

Checkout quote pipeline остаётся неизменным. Completion integration добавляет:

- read-only broker action с exact quote/result identity и usage requirements;
- сопоставление completion snapshot с legacy Orders DTO через
  `resultRevision`;
- shared canonical fixtures/contract tests;
- E2E setup/data;
- исправление доказанного mismatch между already-canonical boundary и provider
  implementation. Нельзя ослаблять Checkout validation, чтобы принять неверный
  Pricing result.

### Orders

- Pricing usage port и broker adapter;
- reserve до append `order.created`, commit после append, release compensation;
- pricing identity в immutable order checkout snapshot для retry recovery;
- idempotent replay завершает commit по исходной quote без чтения изменённого
  checkout.

## Definition of Done

- Catalog action больше не содержит `not implemented` и возвращает complete,
  ordered, tenant-scoped merchandise resolutions.
- Pricing регистрирует оба checkout quote actions в production module.
- Preliminary quote является единственным источником transformed merchandise,
  availability, product/order discounts и merchandise totals.
- Final quote сохраняет preliminary merchandise exact-equal и добавляет только
  delivery/shipping effects и final totals.
- Все money/revisions/provenance/lineage/allocation invariants существующего
  Checkout boundary выполняются без ослабления parser.
- Повтор action одной attempt идемпотентен; snapshot conflict не перезаписывает
  данные.
- Native discount kinds имеют deterministic eligibility, application ordering,
  allocation and code resolution.
- App discount не выполняется без Pricing-owned binding и не может обойти
  platform applicator.
- Обычный repricing не изменяет usage counters/reservations.
- Store currency является единственной валютой API amounts.
- Нет cross-service DB reads, dual-write, legacy fallback или backfill.
- Все новые repository queries явно tenant-scoped.
- Targeted contract/domain/integration/E2E scenarios из matrix покрыты.

## Recommended Delivery Order

Минимальный vertical slice, который впервые разблокирует Checkout Pipeline:

```text
Increment 0
  -> Increment 1
  -> Increment 2
  -> Increment 3
```

После него checkout без configured discounts уже работает end-to-end. Затем:

```text
Increment 4
  -> Increment 5
  -> Increment 6
  -> Increment 7
  -> Increment 8
  -> Increment 9
```

Не начинать Commerce Functions или usage completion до стабилизации pure native
allocation kernel: оба слоя обязаны переиспользовать его, а не создавать второй
pricing path.
