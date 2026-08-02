# Delivery Checkout Pipeline + Apps Integration — implementation-ready plan

## Summary

Цель — реализовать production runtime для стадии `Delivery` в canonical Checkout
pipeline:

```text
Preliminary Pricing
  → Delivery
  → Final Pricing
  → Payments
  → Validation
```

Checkout уже вызывает action
`delivery.calculateCheckoutDeliveryOptions`, валидирует request-relative result и
не продолжает pipeline при transport/infrastructure failure. Delivery service пока
содержит только типы, schemas и ports: `DeliveryModule` пустой, concrete pipeline,
repositories, Apps adapters и action handler отсутствуют.

Целевой Delivery Core:

- владеет delivery profiles, zones, manual methods, provider accounts, option
  handles, selection validation и canonical Delivery result;
- получает физические fulfillment facts из Catalog через broker action;
- вызывает Nova Poshta, Meest и другие provider Apps только через Apps control
  plane;
- выполняет Delivery Commerce Functions после нормализации manual/provider
  options;
- не создаёт shipments и не выполняет fulfillment side effects внутри checkout;
- не держит checkout database transaction во время Catalog, Apps или Commerce
  Function calls.

План является cutover-планом. Проект не имеет production data, поэтому
compatibility layer, dual write и backfill запрещены.

## Scope

В scope входят:

1. `delivery.calculateCheckoutDeliveryOptions` и его runtime wiring.
2. Checkout-to-Delivery contract changes, необходимые для eligibility,
   customization и корректной CAS version semantics.
3. Catalog-to-Delivery physical/fulfillment facts boundary.
4. Delivery profiles, assignments, locations, zones, method definitions и
   provider accounts.
5. Manual rates и `delivery.carrier-service` Apps.
6. Provider-backed customer input, включая выбор отделения/почтомата.
7. `cart.delivery-options.transform.run` Commerce Functions.
8. Opaque option bindings, quote cache, deterministic revisions и selection
   reconciliation.
9. Delivery migrations, repositories, broker adapters, module composition,
   observability и acceptance coverage.

## Non-goals

Не входят в checkout cutover:

- shipment create/cancel/reconcile;
- tracking, labels и provider webhooks;
- fulfillment-order lifecycle;
- inventory reservation;
- order routing/location-ranking functions;
- delivery discounts — они остаются стадией Final Pricing;
- DBOS workflow для синхронного rate calculation;
- legacy contract adapters или backfill старых checkout delivery tables.

Контракты `delivery.shipment-provider` сохраняются, но их runtime реализуется
отдельным fulfillment plan после завершения checkout cutover.

## Current State and Blocking Gaps

### Checkout consumer существует

`services/checkout/src/infrastructure/pipeline/BrokerCheckoutAdapters.ts` уже:

- парсит Delivery request;
- вызывает `DeliveryCheckoutActions.calculateOptions`;
- парсит request-relative result;
- преобразует action rejection в `CHECKOUT_DELIVERY_UNAVAILABLE`.

`CheckoutPipeline` запускает Delivery только после успешного Preliminary Pricing и
передаёт её result в Final Pricing и Payments.

### Delivery provider отсутствует

В `services/delivery` сейчас есть:

- broker types и provider boundary schemas;
- profile, eligibility, rate, customization и binding ports;
- contract-only `DeliveryCheckoutPipeline`;
- пустой `DeliveryModule`.

Нет:

- concrete orchestration;
- action handler;
- database schema/migrations;
- provider account service;
- Catalog adapter;
- Apps adapter;
- Commerce Function runner/binding source;
- manual/provider rate engine;
- option binding repository;
- production Nest wiring.

### Контрактные блокеры

До implementation необходимо исправить четыре блока.

1. `DeliveryCheckoutEvaluationContext` не содержит buyer eligibility, хотя
   `CUSTOMER_SEGMENT` rate conditions и Delivery Customization требуют segment
   IDs.
2. Delivery request не содержит cart attributes, хотя
   `DeliveryCustomizationFunctionInput` их требует.
3. `expectedCheckoutVersion` является CAS base version `V`, а Delivery binding
   должен принадлежать потенциально committed snapshot `V + 1`. Текущее поле
   `checkoutVersion` в binding не различает эти значения.
4. `DeliveryCustomerInputResolutionPort` объявлен, но Apps provider protocol не
   имеет операции семантической проверки pickup location/customer input.

Эти изменения выполняются первыми. Нельзя компенсировать их догадками внутри
Delivery adapter.

## Architectural Decisions

### Delivery Core является единственным владельцем canonical options

Provider App возвращает provider-local rates. Только Delivery назначает:

- delivery `groupId`;
- canonical `optionHandle`;
- `profileId` и `methodDefinitionId`;
- public-safe metadata;
- customer-input policy revision;
- rate/eligibility/customization revisions;
- selection status `NONE | SELECTED | RESET`.

Provider payload не сохраняется в Checkout snapshot и не отдаётся Storefront
напрямую.

### Apps владеет installation runtime, Delivery — business activation

Apps владеет:

- App manifest и version;
- installation lifecycle;
- credentials/secrets;
- granted scopes;
- capability routes;
- invocation context и App runtime.

Delivery владеет:

- `providerAccountId`;
- связью account → Apps `installationId`;
- TEST/LIVE mode;
- capability status;
- validated provider metadata/configuration revision;
- включением account в конкретные delivery method definitions;
- checkout failure/fallback policy.

Установленная App не становится методом доставки автоматически. Provider
участвует в checkout только если account активирован в Delivery и явно указан в
active delivery profile.

### Provider capabilities и Commerce Functions не смешиваются

Используются разные extension kinds:

| Extension | Назначение |
|---|---|
| `delivery.carrier-service` | Network-backed quote/rate discovery |
| `delivery.shipment-provider` | Post-order shipment lifecycle |
| `commerce.function` | Pure deterministic option transformation |

Nova Poshta rate API вызывается как `delivery.carrier-service.quoteRates`, а не
как Commerce Function. Commerce Function видит уже нормализованные options и
может только применить разрешённые domain operations.

### Никаких прямых вызовов App actions

Delivery запрещено вызывать `apps.<appCode>.<action>` напрямую. Все App calls
проходят через:

```text
apps.listCapabilityRoutes
  → select exact installation route
  → apps.executeCapability
  → AppsRuntimeRouter
  → ServiceBroker.callAsApp
```

### Merchant method definition является enablement/filter policy

Carrier App является источником динамических сервисов и цен, но merchant
configuration решает, какие из них разрешены.

`DeliveryMethodDefinitionSnapshot` с `rateSource.type = CARRIER_SERVICE` задаёт:

- canonical delivery method type;
- разрешённые provider accounts;
- allow-list `serviceCode`;
- conditions;
- backup rate;
- failure policy через profile.

App rate, не совпавший ни с одной eligible method definition, отбрасывается.

### Синхронный quote не является DBOS workflow

Checkout имеет общий deadline и ожидает синхронный Delivery result. DBOS здесь
не используется. Durable workflows потребуются для provider account validation
и shipment lifecycle, но не для каждого `quoteRates`.

### Quote side effects являются staged и expiring

Delivery может сохранить option bindings/cache до Checkout CAS commit. При
Checkout version conflict эти строки становятся недоступными по target version и
удаляются TTL cleanup. Межсервисная distributed transaction не вводится.

## Target Runtime Flow

```text
Checkout
  │
  │ delivery.calculateCheckoutDeliveryOptions
  ▼
DeliveryCheckoutActions
  │ validate request + caller + deadline
  ▼
DeliveryCheckoutService
  │
  ├─ 1. resolve physical lines and canonical destinations
  ├─ 2. load active profile set and resolve line assignments
  ├─ 3. Catalog.resolveCheckoutDeliveryFacts
  ├─ 4. choose origin/location and build packages
  ├─ 5. build stable delivery groups
  ├─ 6. resolve zones, methods and provider accounts
  ├─ 7. add manual rates
  ├─ 8. Apps.quoteRates fan-out with cache/deadline policy
  ├─ 9. normalize rates and customer-input contracts
  ├─ 10. run cart.delivery-options.transform.run
  ├─ 11. reconcile old selections and validate customer input
  ├─ 12. stage option bindings for target checkout version
  └─ 13. build and validate canonical result
```

## Contract Changes

### Checkout → Delivery context

Изменить `packages/broker-types/src/actions/delivery.ts`.

`DeliveryCheckoutEvaluationContext` должен явно различать base и target
versions:

```ts
interface DeliveryCheckoutEvaluationContext {
  executionId: string;
  correlationId: string;
  deadlineAt: string;
  requestedAt: string;
  checkoutId: string;
  expectedCheckoutVersion: number; // CAS base V
  targetCheckoutVersion: number;   // potential committed V + 1
  storeId: string;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  effectiveAt: string;
  buyerEligibility: {
    customerId: string | null;
    countryCode: string | null;
    marketId: string | null;
    companyId: string | null;
    segmentIds: readonly string[];
    segmentMembershipRevision: string | null;
  } | null;
}
```

Инварианты:

- create: `expectedCheckoutVersion = 0`, `targetCheckoutVersion = 1`;
- update: `targetCheckoutVersion = expectedCheckoutVersion + 1`;
- buyer snapshot совпадает с переданным Preliminary Pricing context;
- email, phone, name и полный buyer `data` в eligibility context не передаются.

Добавить в `CalculateCheckoutDeliveryOptionsParams`:

```ts
cartAttributes: PricingCheckoutJsonObject;
```

Checkout changes:

- `services/checkout/src/application/pipeline/contracts/delivery.ts`;
- `services/checkout/src/application/pipeline/schemas.ts`;
- `services/checkout/src/application/pipeline/boundaries.ts`;
- `services/checkout/src/application/pipeline/CheckoutPipeline.ts`;
- request/result fixtures и adapter contract coverage.

`toCheckoutPipelineStageContext` больше нельзя использовать как lossy Delivery
context mapper. Добавить отдельный `toCheckoutDeliveryContext`.

### Option binding version semantics

Заменить неоднозначное `checkoutVersion` в binding contracts:

```ts
interface DeliveryOptionBindingSnapshotBase {
  basedOnCheckoutVersion: number;
  targetCheckoutVersion: number;
  // existing identity/revision fields
}
```

Заменить `replaceCheckoutSnapshot` на staged API:

```ts
stageCheckoutSnapshot({
  storeId,
  checkoutId,
  basedOnCheckoutVersion,
  targetCheckoutVersion,
  preliminaryRevision,
  deliveryRevision,
  options,
  retainUntil,
})
```

Selection lookup выполняется по currently committed base version `V`. Новые
bindings пишутся для target version `V + 1`. Старые bindings не удаляются до
истечения TTL.

`resolve` не должен требовать delivery revision, отсутствующую во входном
selection intent. Он принимает:

```ts
resolve({
  storeId,
  checkoutId,
  checkoutVersion: expectedCheckoutVersion,
  groupId,
  optionHandle,
  effectiveAt,
})
```

Новый result проверяется против заново рассчитанного candidate set. Stale handle
не переносится только потому, что старая binding ещё существует.

### Catalog physical facts action

Добавить в `packages/broker-types/src/actions/catalog.ts`:

```text
catalog.resolveCheckoutDeliveryFacts
```

Request содержит только canonical transformed lines:

```ts
interface ResolveCheckoutDeliveryFactsParams {
  storeId: string;
  effectiveAt: string;
  lines: readonly {
    lineId: string;
    variantId: string;
    quantity: number;
  }[];
}
```

Result для каждой line должен вернуть explicit disposition:

```ts
type ResolveCheckoutDeliveryLineResult =
  | {
      status: "RESOLVED";
      lineId: string;
      variantId: string;
      physicalRevision: string;
      weightGrams: number | null;
      dimensionsMm: { width: number; height: number; length: number } | null;
      customs: { /* Catalog-owned immutable customs facts */ } | null;
      fulfillmentLocations: readonly {
        locationId: string;
        locationRevision: string;
        availableQuantity: number | null;
        address: CheckoutFulfillmentLocationAddress;
      }[];
    }
  | {
      status: "REJECTED";
      lineId: string;
      variantId: string;
      code: string;
      message: string;
      retryable: boolean;
    };
```

`CheckoutFulfillmentLocationAddress` является Catalog-owned DTO. Delivery
явно преобразует его в `DeliveryProviderLocationAddress`; Catalog contract не
должен импортировать provider protocol types из Delivery bounded context.

Catalog остаётся владельцем inventory item, warehouse/location address и
physical revisions. Delivery комбинирует эти факты с title/SKU/declared value
из Preliminary Pricing.

Catalog action должен:

- проверять store ownership;
- отвечать batch-ом без N+1;
- возвращать deterministic location ordering;
- не резервировать stock;
- не рассчитывать delivery profiles или rates.

Если Catalog warehouse пока не содержит origin address, сначала расширить
Catalog location model. Delivery не должен хранить копию mutable warehouse
address как source of truth.

### Provider rate and customer-input protocol

Расширить `DeliveryCarrierServiceRate`:

```ts
interface DeliveryCarrierServiceRate {
  serviceCode: string;
  serviceName: string;
  description: string;
  cost: DeliveryProviderMoney;
  estimatedMinDeliveryAt: string | null;
  estimatedMaxDeliveryAt: string | null;
  phoneRequired: boolean;
  customerInputContract: DeliveryProviderCustomerInputContract | null;
  publicData: PricingCheckoutJsonObject;
}
```

`metafields` удалить либо оставить только как provider-private diagnostic data;
они не должны автоматически становиться Storefront output.

Добавить provider operation:

```text
resolveCustomerInput
```

Request содержит pinned provider account/route context, `serviceCode`, current
customer-input contract hash, submitted JSON и `effectiveAt`. Result:

```ts
type DeliveryProviderResolveCustomerInputResult =
  | {
      status: "VALID";
      normalized: PricingCheckoutJsonObject | null;
      valueHash: string;
      semanticRevision: string;
      publicData: PricingCheckoutJsonObject;
    }
  | {
      status: "INVALID";
      issues: readonly { path: string; code: string; message: string }[];
    };
```

Обновить:

- `DeliveryProviderOperations`;
- `DeliveryCarrierServiceOperation`;
- `DeliveryProviderAppManifestCapability`;
- `DeliveryProviderOperationContractMap` в Apps broker types;
- `DeliveryCarrierServiceAppContract`;
- provider request/result Zod schemas;
- `DeliveryProviderAppsPort`.

Поскольку protocol ещё не включён в production, обновить protocol version
напрямую, без поддержки старой версии.

### Pickup location discovery

`quoteRates` не должен возвращать тысячи отделений. Для Storefront UX добавить
отдельный read path:

```text
Storefront Delivery API
  → delivery.searchDeliveryOptionChoices(optionHandle, query, cursor)
  → resolve current binding
  → apps.executeCapability(searchCustomerInputOptions)
```

Эта операция использует тот же pinned carrier route/account и возвращает только
bounded, public-safe options. Она не является частью recalculation critical path,
но обязательна до запуска provider methods, требующих pickup point selection.

Если первый provider поддерживает только address delivery, discovery можно
реализовать после initial manual/carrier cutover, но `resolveCustomerInput`
остаётся обязательным для любого provider-submitted input.

## Delivery Configuration and Persistence

### Database technology and migrations

Использовать shared `DATABASE_CLIENT`, Drizzle runtime models и handwritten
domain SQL migrations через `node-pg-migrate`, как в Apps/Pricing services.

Добавить:

- `services/delivery/src/infrastructure/db/database.ts`;
- `services/delivery/src/repositories/models/**`;
- `services/delivery/migrations/domains/**`;
- migrations/assets section в `services/delivery/build.config.json`;
- `delivery` в migration service registry Shopana CLI;
- `delivery.pgmigrations` tracking schema.

Все persisted UUID — UUIDv7. `store_id` используется для tenant filtering и
indexes, но не включается в primary/foreign keys.

### Domain 0000 — foundation

```text
delivery schema
delivery.pgmigrations
required enums/status checks
```

### Domain 0100 — provider accounts

`delivery.provider_accounts`:

- `id` UUIDv7 PK;
- `organization_id`, `store_id`;
- `installation_id`;
- `mode`;
- `provider_code`, `display_name`;
- `account_revision`;
- carrier/shipment capability snapshots JSONB;
- validated country/currency/operation lists;
- configuration revision per capability;
- created/updated timestamps.

Constraints:

- unique `(store_id, installation_id)`;
- account revisions positive;
- only declared capability states;
- repository reads always filter `store_id`.

Apps secrets/configuration не копируются в Delivery.

### Domain 0200 — delivery profiles

`delivery.profile_sets`:

- one current active snapshot per store;
- canonical `revision`;
- currency;
- complete validated active graph JSONB;
- created/updated timestamps.

`delivery.profiles` хранит inactive/editable profile snapshots и CAS revision.

`delivery.profile_assignment_memberships`:

- `assignment_set_id`;
- `membership_type: VARIANT | SELLING_PLAN_GROUP`;
- `resource_id`;
- indexed `(store_id, membership_type, resource_id)`;
- unique membership внутри active profile set.

Activation выполняется одной transaction и проверяет:

- ровно один default profile;
- отсутствие пересекающихся active assignments;
- существование provider accounts;
- currency consistency;
- уникальность profile/method/zone/location IDs;
- валидность всех revisions и failure policies.

### Domain 0300 — checkout option bindings

`delivery.checkout_option_bindings`:

- surrogate UUIDv7 PK;
- `store_id`, `checkout_id`;
- `based_on_checkout_version`;
- `target_checkout_version`;
- `group_id`, `option_handle`;
- `delivery_revision`;
- `expires_at`;
- canonical binding snapshot JSONB;
- created timestamp.

Unique:

```text
(store_id, checkout_id, target_checkout_version, group_id, option_handle)
```

Lookup index:

```text
(store_id, checkout_id, target_checkout_version, group_id, option_handle, expires_at)
```

`stageCheckoutSnapshot` выполняет transaction:

1. проверяет `target = basedOn + 1`;
2. блокирует snapshot identity target version;
3. отклоняет другое `deliveryRevision` для уже staged target;
4. idempotently upsert-ит полный option set;
5. не удаляет bindings предыдущих committed versions.

TTL cleanup удаляет только expired rows. Checkout current table не читается и
cross-service foreign key не создаётся.

### Domain 0310 — provider rate cache

`delivery.provider_rate_cache` хранит только успешные provider responses,
включая empty no-service response.

Cache key включает:

- store/checkout/base version;
- quote request ID;
- provider account;
- route revision;
- provider configuration revision;
- execution policy revision;
- eligibility revision;
- rated facts hash;
- effectiveAt.

Authentication, timeout, rate-limit и malformed responses не кэшируются.

### Domain 0400 — Delivery customization owners/bindings

Delivery, а не Apps, хранит business activation:

`delivery.customizations`:

- customization ID;
- store ID;
- status;
- policy/configuration revision;
- created/updated timestamps.

`delivery.customization_bindings`:

- function binding ID;
- customization owner ID;
- installation ID;
- function key;
- configuration snapshot/revision;
- pinned route revision;
- precedence;
- activation sequence;
- REQUIRED/OPTIONAL failure mode;
- status.

Apps подтверждает наличие route при execution planning, но active App route сам
по себе не создаёт Delivery customization rule.

Текущий `apps.listCommerceFunctionBindings`, который синтезирует store-wide
bindings из routes, не использовать как Delivery business source. Delivery
загружает domain-owned bindings из своей БД; `FunctionRouteResolver` подтверждает
их через `apps.listCapabilityRoutes`.

## Deterministic Group Planning

### Correct orchestration order

Текущий scaffolding `planning → eligibility` заменить. Profile assignment и
location group нужны до окончательного physical grouping.

Целевой порядок:

```text
line assignment
  → Catalog physical facts
  → profile resolution
  → fulfillment location selection
  → group/package planning
  → zone/method eligibility
```

Обновить `DeliveryCheckoutPipelinePorts`, разделив ответственность:

```ts
interface DeliveryCheckoutPipelinePorts {
  profiles: DeliveryProfilesPort;
  assignments: DeliveryProfileAssignmentsPort;
  facts: DeliveryCheckoutFactsPort;
  planning: DeliveryCheckoutPlanningPort;
  eligibility: DeliveryEligibilityPort;
  providerAccounts: DeliveryProviderAccountsPort;
  executionPolicies: DeliveryProviderExecutionPolicyPort;
  rates: DeliveryRateAggregationPort;
  customization: DeliveryCustomizationPort;
  bindings: DeliveryOptionBindingsPort;
  customerInput: DeliveryCustomerInputValidationPort;
  customerInputResolution: DeliveryCustomerInputResolutionPort;
}
```

### V1 location selection

Для каждого destination/profile:

1. получить allowed `fulfillmentLocationIds` из location groups;
2. пересечь их с Catalog fulfillable locations;
3. исключить locations, неспособные покрыть полное количество line;
4. выбрать location по stable configured order, затем `locationId`;
5. сгруппировать lines по destination/profile/location group/origin.

V1 не делит quantity одной line между origins. Если одна location не может
выполнить всю line, вернуть blocking group issue.

### Stable group identity

`groupId` является canonical digest с versioned prefix от:

```text
storeId
checkoutId
destinationId
profileId
locationGroupId
origin locationId
sorted canonical line IDs
group identity algorithm version
```

Адрес, цена и mutable revisions не входят в identity; их изменения отражаются в
rate facts/revisions. Одинаковая семантическая группа должна сохранять group ID
между recalculations.

### Package planning

V1 создаёт один package на group:

- items — transformed physical lines;
- total weight — exact extended sum;
- declared value — exact Preliminary Pricing total до delivery discounts;
- dimensions — null, если безопасная aggregate packing rule отсутствует;
- customs — только из Catalog-owned facts;
- package ID — deterministic digest.

Missing mandatory weight/customs facts создаёт explicit group/line issue, а не
нулевое значение.

`ratedFactsHash` покрывает всё, что видит provider:

- origin/destination;
- packages/items;
- currency/channel/locale;
- target checkout version;
- physical and pricing revisions.

## Eligibility and Rate Calculation

### Eligibility

Для каждой group:

1. выбрать profile по `SELLING_PLAN → VARIANT → DEFAULT`;
2. выбрать location group/origin;
3. выбрать zone: exclusions win, затем lowest priority;
4. отфильтровать active methods;
5. применить conditions:
   - cart subtotal;
   - package weight;
   - item count;
   - channel;
   - buyer segment;
   - purchase type;
6. разрешить provider accounts и failure policy;
7. построить immutable `DeliveryEligibilitySnapshot`.

Для group с lines из разных profiles должна быть выполнена предварительная
разбивка; один eligibility snapshot не может представлять несколько profiles.

### Manual rates

Manual rate engine:

- принимает только eligible manual definitions;
- проверяет currency равной store/checkout currency;
- не вызывает Apps;
- создаёт option/binding candidate;
- использует method definition title, description и type;
- создаёт deterministic handle candidate.

Manual rates составляют первый runtime vertical slice.

### Carrier rate fan-out

Для каждой eligible `(group, methodDefinition, providerAccount)`:

1. проверить account ACTIVE и supported currency/country;
2. получить exact `quoteRates` route для `installationId`;
3. получить execution policy;
4. построить deterministic `quoteRequestId`;
5. проверить request-relative cache;
6. вызвать `apps.executeCapability` в пределах remaining checkout deadline;
7. проверить returned installation/route/app identity;
8. parse и normalize provider result;
9. отфильтровать `allowedServiceCodes`;
10. применить public-data и customer-input schema policies;
11. создать canonical option и pinned binding candidate;
12. записать execution trace.

Provider calls выполняются с bounded concurrency. `maxAttempts = 1`; скрытых
retries нет.

### Failure policy

| Сбой | `OMIT_PROVIDER_RATES` | `FAIL_GROUP` | `USE_BACKUP_RATE` |
|---|---|---|---|
| no service | empty options + info/warning | empty options, не infrastructure failure | backup не применяется |
| timeout/unavailable/rate limit | warning, provider options omitted | ERROR issue | backup option + warning |
| authentication/configuration | ERROR issue и capability degraded | ERROR issue | backup не маскирует invalid config |
| malformed provider response | ERROR issue | ERROR issue | backup не маскирует contract violation |

Core database/Catalog/Apps control-plane outage отклоняет action. Ожидаемый
provider business failure возвращается как contract-valid Delivery result.

## Opaque Handles and Selection Reconciliation

### Handle generation

Использовать versioned HMAC digest, а не provider ID или сериализованный payload:

```text
dopt_v1_<base64url hmac>
```

Canonical handle input включает:

- store/checkout/group;
- profile/method definition;
- source;
- provider account + service code либо manual rate revision;
- normalized cost/ETA;
- customer-input schema hash;
- rated facts hash;
- handle algorithm version.

Target checkout version не входит в handle, поэтому семантически идентичная
option может сохранить handle между `V` и `V + 1`. Binding rows при этом
version-scoped.

### Reconciliation algorithm

Для каждой current group:

1. найти selection intent по `groupId`;
2. при отсутствии вернуть `NONE`;
3. разрешить старую binding по committed base version `V`;
4. убедиться, что handle существует в новом post-customization option set;
5. schema-validate `customerInput`;
6. если provider contract требует semantic resolution — вызвать
   `resolveCustomerInput`;
7. вернуть `SELECTED` с normalized input либо `RESET` с stable reason.

Для selection group, исчезнувшей целиком, вернуть ровно один
`orphanedSelectionReset`.

Invalid/removed selection возвращает `RESET`. Transient provider failure во
время semantic validation не должен тихо очищать выбор: action отклоняется как
retryable, Checkout commit не выполняется.

Implicit cheapest/first/only option selection запрещён.

## Commerce Functions Integration

### Target definition

Добавить в Delivery:

```ts
const DELIVERY_CUSTOMIZATION_FUNCTION_TARGET_DEFINITION = {
  target: "cart.delivery-options.transform.run",
  owningService: "delivery",
  executionMode: "COLLECT_ALL",
  nativeImplementations: [],
  defaultTimeoutMs: 3_000,
  concurrencyLimit: 8,
  appFailureMode: "REQUIRED",
  allowMultipleAppImplementations: true,
  maxInputBytes: 1_048_576,
  maxOutputBytes: 1_048_576,
  maxEnvelopeDepth: 32,
  tracePolicy: { inputDigest: true, outputDigest: true },
} as const;
```

Точные timeout/size значения вынести в policy provider, но target definition
должна оставаться immutable для одного process version.

### Composition

`DeliveryModule` собирает:

```text
FunctionTargetRegistry
  + FunctionRouteResolver
  + BrokerFunctionExecutor
  → CommerceFunctionRunner
  → DeliveryCustomizationRunner
```

Добавить dependency `@shopana/function-runner` в Delivery package.

### Function input

Delivery строит PII-minimized `DeliveryCustomizationFunctionInput`:

- buyer eligibility без email/phone/name;
- destination без contact PII;
- transformed line IDs/variant IDs/quantities/subtotals;
- normalized options;
- cart attributes;
- immutable `effectiveAt`;
- base checkout version.

Raw provider metadata, credentials и internal bindings Functions не получают.

### Applying outputs

Разрешённые операции v1:

- `HIDE`;
- `MOVE`;
- `RENAME`.

Операции применяются в immutable execution-plan order, затем в output array
order. Policy валидирует:

- существование group/handle;
- отсутствие duplicate operation targets в одном output;
- title limits;
- move bounds;
- `allowHideAllOptions`;
- отсутствие изменения cost, method type, provider binding или handle;
- отсутствие implicit selection.

REQUIRED function failure отклоняет Delivery action, поэтому Checkout помечает
stage как failed и не выполняет commit. Одного Delivery `ERROR` issue для этого
недостаточно: текущий Checkout агрегирует Delivery issues с effect `CONTINUE`.
OPTIONAL failure создаёт warning и оставляет options без операций этой
implementation. В обоих случаях сохраняется безопасный execution trace;
malformed output не применяется.

`customizationRevision` включает binding set revision, execution plan revision,
validated operation hashes и policy revision.

## Provider Account Lifecycle

### Configure

`delivery.configureDeliveryProviderAccount`:

1. проверяет caller и tenant context;
2. разрешает required Apps routes по installation ID;
3. вызывает provider configuration validation через Apps;
4. проверяет provider response schemas;
5. сохраняет account + capability snapshots CAS/idempotently;
6. возвращает accepted workflow identity, если validation выполняется durable
   workflow;
7. не сохраняет secrets.

### Activate/deactivate

Activation разрешена только из READY/INACTIVE-compatible state. Deactivation:

- немедленно исключает account из новых quotes;
- не удаляет существующие option bindings до TTL;
- приводит selection к RESET при следующем успешном recalculation;
- не отменяет уже созданные shipments.

App suspend/uninstall определяется через route resolution. Delivery account
переходит в DEGRADED/INACTIVE reconciliation job или при следующем control-plane
operation; checkout никогда не вызывает исчезнувший route как другой provider.

## Component and File Plan

### Shared contracts

Изменить:

- `packages/broker-types/src/actions/delivery.ts`;
- `packages/broker-types/src/actions/delivery-configuration.ts` при уточнении
  profile/location contracts;
- `packages/broker-types/src/actions/delivery-customization.ts`;
- `packages/broker-types/src/actions/apps.ts`;
- `packages/broker-types/src/actions/catalog.ts`;
- соответствующие barrel exports.

### Catalog

Добавить:

- checkout delivery facts action types/handler;
- physical facts repository batch query;
- warehouse origin address model, если отсутствует;
- request/result schemas;
- action registration в Catalog module;
- contract and repository coverage.

### Delivery application/domain

Целевая структура:

```text
services/delivery/src/
  api/
    broker/DeliveryCheckoutActions.ts
    broker/DeliveryProviderAccountActions.ts
  application/
    checkout/DeliveryCheckoutService.ts
    checkout/DeliveryGroupPlanner.ts
    checkout/DeliveryEligibilityResolver.ts
    checkout/DeliveryRateAggregator.ts
    checkout/DeliverySelectionResolver.ts
    providers/DeliveryProviderAccountService.ts
    customization/DeliveryCustomizationRunner.ts
  domain/
    revisions.ts
    optionHandles.ts
    zones.ts
    rateConditions.ts
    failures.ts
  infrastructure/
    apps/BrokerDeliveryProviderAppsAdapter.ts
    catalog/BrokerDeliveryCheckoutFactsAdapter.ts
    functions/DeliveryCustomizationBindingRepository.ts
    persistence/**
    db/database.ts
  repositories/models/**
  contracts/**
  checkout-pipeline/**
  delivery.module.ts
```

Существующие ports/schemas переносить только когда это улучшает ownership;
публичные barrel exports сохранять минимальными. Concrete adapters не
экспортировать как shared service API.

### Apps

Generic `listCapabilityRoutes`/`executeCapability` уже являются основной
границей. Apps changes ограничить:

- typed operation map для новых provider operations;
- manifest/route contract validation при install/update;
- stable route revision handling;
- provider invocation error classification без утечки secrets;
- coverage exact installation route selection;
- при необходимости read action для pinned route resolution.

Не добавлять provider-specific Nova Poshta logic в Apps service.

### Checkout

Checkout changes ограничить contract mapping:

- передать target version, buyer eligibility и cart attributes;
- обновить request schemas/boundary assertions;
- сохранить прежний stage order;
- не импортировать Delivery implementation;
- не обходить broker adapter.

## Nest Composition

`DeliveryModule` должен импортировать:

```ts
BrokerModule.forFeature({ serviceName: "delivery" })
```

И зарегистрировать:

- database/repository providers;
- Delivery checkout application service;
- Catalog and Apps broker adapters;
- profile/assignment/eligibility repositories;
- execution/cache/public-data/schema policies;
- Commerce Function registry/resolver/executor/runner;
- `DeliveryCheckoutActions` extending `BrokerActions`;
- provider account lifecycle actions.

Action handler выполняет только:

1. boundary parse;
2. trusted caller validation;
3. service call;
4. result parse;
5. return.

Business orchestration в decorator class не размещать.

## Boundary Validation and Security

### Delivery action boundary

Добавить request/result Zod schemas в Delivery. Нельзя полагаться только на
Checkout-side parser.

Проверки:

- payload size/depth/item limits;
- UUID/identifier/timestamp/currency shapes;
- `deadlineAt > requestedAt`;
- target version invariant;
- store/checkout provenance;
- preliminary revision/currency/arithmetic;
- exact physical line/destination coverage;
- unique selections/groups/handles;
- no unknown provider JSON values.

### Apps provider boundary

Provider response считается untrusted:

- strict schema parse;
- exact `quoteRequestId`;
- currency equality;
- non-negative money;
- unique `serviceCode`;
- ETA ordering;
- bounded strings/collections;
- JSON size/depth limits;
- customer schema local references only;
- public data allow-list;
- returned route identity equality.

### Tenant isolation

Каждый repository lookup включает `store_id`. Delivery никогда не принимает
organization/store ownership из provider response. Apps installation route
должен принадлежать тому же store, что и checkout/provider account.

### PII

Carrier rate request получает адрес/contact только когда operation этого
требует. Commerce Functions получают PII-minimized destination и buyer
eligibility. Не логировать:

- full address;
- email/phone/name;
- customer input;
- provider configuration;
- App secrets;
- raw provider payload.

## Deadline, Concurrency and Observability

### Deadline

Каждый sub-operation использует remaining time до checkout `deadlineAt`.

Budget policy должна резервировать время для:

- customization;
- selection validation;
- binding persistence;
- response validation.

Новый provider fan-out не запускается после exhaustion. Late responses
игнорируются и не меняют staged result/cache.

### Concurrency

Ограничить одновременно:

- Catalog batch — один request;
- provider accounts per checkout;
- provider calls per account/store;
- Commerce Function implementations.

Порядок aggregate result всегда canonical, а не completion order.

### Logs/metrics/traces

Логировать structured identifiers:

- execution/correlation ID;
- checkout/store ID;
- base/target version;
- group count;
- provider account/app code/route revision;
- cache hit/miss;
- duration/status/failure category;
- option count;
- customization plan revision;
- binding stage result.

Метрики:

- Delivery action latency/status;
- planning/eligibility latency;
- provider latency/timeouts/failure category;
- rates per provider/group;
- cache hit ratio;
- selection reset reason;
- customization failure;
- staged binding conflicts.

PII и raw payloads в observability запрещены.

## Implementation Order

### Phase 0 — Contract cutover

1. Исправить Checkout → Delivery buyer/cart/version contract.
2. Исправить binding base/target version semantics.
3. Добавить Catalog delivery facts contract.
4. Расширить provider rate/customer-input operations.
5. Обновить strict schemas и compile-time contract fixtures.

Exit criteria:

- request может полностью построить eligibility/customization input;
- binding однозначно относится к potential committed checkout version;
- Nova Poshta pickup selection имеет typed validation path;
- старые варианты контрактов удалены.

### Phase 1 — Delivery persistence foundation

1. Добавить Delivery schema, database adapter и migration runner integration.
2. Реализовать provider account/profile/assignment repositories.
3. Реализовать option binding и rate cache repositories.
4. Реализовать customization owner/binding repository.
5. Добавить tenant/CAS/TTL coverage.

Exit criteria:

- active profile set загружается одним revisioned snapshot;
- assignment lookup indexed;
- staged bindings version-safe и idempotent;
- Delivery migrations включены в Shopana CLI/build assets.

### Phase 2 — Catalog facts and deterministic planning

1. Реализовать Catalog batch action.
2. Реализовать Broker Catalog adapter.
3. Реализовать profile resolution и location selection.
4. Реализовать stable groups/packages/revisions.
5. Реализовать zone/rate-condition eligibility.

Exit criteria:

- каждая canonical physical line покрыта ровно одной group;
- missing facts дают explicit issues;
- одинаковый input/config даёт одинаковые IDs/revisions;
- cross-store location/profile access невозможен.

### Phase 3 — Manual-rate vertical slice

1. Реализовать manual rate normalization.
2. Реализовать handle generation.
3. Реализовать selection NONE/SELECTED/RESET/orphan reset.
4. Реализовать staged option binding persistence.
5. Реализовать action handler и DeliveryModule wiring.
6. Подключить реальный action к Checkout E2E environment.

Exit criteria:

- no-shipping checkout проходит с empty groups;
- physical checkout с manual rate проходит весь пятистадийный pipeline;
- selected manual option сохраняется при идентичном recalculation;
- Checkout CAS conflict не делает staged binding доступной как committed.

### Phase 4 — Apps carrier-service integration

1. Реализовать `DeliveryProviderAppsPort` adapter.
2. Реализовать provider account configuration/activation.
3. Реализовать route discovery/pinning/identity checks.
4. Реализовать provider execution policy/cache/deadline/fan-out.
5. Реализовать response normalization/public-data/schema policies.
6. Реализовать fallback policies и execution traces.
7. Добавить contract fixture App для carrier service.

Exit criteria:

- установленная, но не активированная App не влияет на checkout;
- active profile получает live carrier rates через Apps control plane;
- direct provider action calls отсутствуют;
- timeout/no-service/auth/malformed response имеют заданную семантику;
- route revision фиксируется в binding.

### Phase 5 — Provider customer input and pickup

1. Реализовать schema normalization/validation.
2. Реализовать provider semantic `resolveCustomerInput`.
3. Реализовать transient failure semantics без silent reset.
4. Реализовать bounded pickup-choice discovery path.
5. Сохранить normalized input/semantic revision в committed delivery method
   projection, не публикуя private provider data.

Exit criteria:

- pickup option нельзя выбрать с чужим/expired/invalid location token;
- provider outage во время validation не очищает committed selection;
- search/read path tenant- и handle-scoped;
- customer input не попадает в logs/function input.

### Phase 6 — Delivery Commerce Functions

1. Добавить function-runner dependency и target definition.
2. Реализовать domain-owned binding source.
3. Реализовать canonical input mapper.
4. Реализовать HIDE/MOVE/RENAME policy/application.
5. Реализовать execution trace/revision/issues.
6. Собрать runner в DeliveryModule.

Exit criteria:

- functions запускаются после manual/provider normalization;
- route без Delivery-owned binding не запускается;
- function не меняет cost/handle/provider binding;
- required/optional failures различаются;
- order не зависит от completion timing.

### Phase 7 — Admin/configuration readiness

1. Добавить Admin GraphQL/broker mutations для provider accounts.
2. Добавить profile/zone/method configuration и atomic activation.
3. Добавить Delivery customization owner/binding management.
4. Показывать provider capability/configuration status без secrets.
5. Добавить Nova Poshta/Meest App authoring fixtures/documentation.

Runtime cutover не разрешён, пока production configuration нельзя создать без
прямого SQL.

### Phase 8 — Runtime cutover and cleanup

1. Включить real Delivery action во всех environments.
2. Удалить fake/empty Delivery handlers и obsolete TODOs.
3. Проверить checkout mutation matrix с реальным Delivery stage.
4. Добавить TTL cleanup scheduling.
5. Зафиксировать operational dashboards/alerts.

## Verification Matrix

### Contract coverage

- request rejects buyer/version/preliminary mismatch;
- provider response rejects wrong quote ID, currency, route, duplicate service
  code and malformed schema;
- result covers every canonical assigned physical line exactly once;
- result preserves request-relative selection semantics;
- public data and customer input obey size/depth policies.

### Planning/eligibility coverage

- no physical lines;
- multiple destinations;
- default vs assigned profile;
- selling plan precedence over variant;
- multiple origins;
- no common fulfillable location;
- zone priority and postal exclusion;
- segment/channel/purchase conditions;
- missing weight/customs data;
- deterministic group/package/revision output.

### Apps coverage

- installed but not configured provider;
- configured but inactive provider;
- exact installation route selected among multiple Apps;
- route revision mismatch;
- App suspended/uninstalled;
- quote success/no-service/timeout/rate-limit/auth/malformed response;
- cache hit only for exact request-relative key;
- fallback modes;
- cross-store installation rejection.

### Selection/binding coverage

- create `0 → 1` and update `V → V+1`;
- stable selection across identical recalculation;
- option price/schema removal resets selection;
- disappearing group creates orphan reset;
- expired/foreign handle rejected;
- invalid pickup input resets;
- transient semantic resolver failure prevents commit;
- CAS conflict leaves only expiring orphan target bindings;
- idempotent repeat cannot stage conflicting delivery revision.

### Commerce Function coverage

- zero bindings;
- one/multiple ordered bindings;
- HIDE/MOVE/RENAME;
- invalid handle/group;
- hide-all denied/allowed policy;
- attempted money/provider mutation rejected;
- required vs optional failure;
- route/function key/revision mismatch;
- deterministic output under reversed completion order;
- PII absent from function envelope.

### End-to-end acceptance

Минимальные E2E scenarios:

1. digital-only checkout completes with empty delivery groups;
2. physical checkout selects manual method and completes all pipeline stages;
3. physical checkout receives rate from carrier App through Apps control plane;
4. carrier timeout applies configured fallback policy;
5. Delivery Function hides a provider option;
6. pickup option validates provider location input;
7. concurrent checkout mutation returns version conflict without exposing staged
   bindings;
8. App suspend removes provider option on next recalculation with explicit reset.

Следовать repository rule: запускать только один relevant spec file за раз через
Shopana CLI; full suite, direct `test`, `build` или `tsc` для проверки плана не
запускать.

## Definition of Done

Delivery checkout integration готова, когда:

1. `delivery.calculateCheckoutDeliveryOptions` зарегистрирован production
   handler-ом и возвращает request-relative validated result.
2. Checkout проходит `Preliminary → Delivery → Final → Payment → Validation` с
   real Delivery action.
3. Каждый physical line входит ровно в одну stable group.
4. Delivery profiles/zones/methods/provider accounts имеют tenant-safe
   persistence и atomic active revisions.
5. Manual и carrier App rates нормализуются в один canonical option model.
6. Provider Apps вызываются только через Apps control plane.
7. App installation не означает automatic business activation.
8. Opaque bindings однозначно различают CAS base и target versions.
9. Selection preservation/reset и provider customer input работают без silent
   fallback.
10. Delivery Commerce Functions выполняются после rate generation и не могут
    изменить деньги/provider binding.
11. Deadlines, concurrency, cache и failure policies проверены.
12. PII/secrets/provider payload не утекут в logs, functions или Storefront.
13. Delivery migrations поддерживаются build/migrate tooling.
14. Нет fake/empty handlers, direct App calls, compatibility paths или dual
    writes.

## Follow-up After Checkout Cutover

Отдельный plan должен реализовать:

```text
Committed checkout delivery method
  → Order/FulfillmentOrder
  → Delivery commitSelection
  → delivery.shipment-provider.createShipment
  → tracking/labels/provider events
```

Этот flow использует pinned provider route и immutable committed delivery method
из checkout binding, но не должен расширять responsibilities checkout rate
calculation.
