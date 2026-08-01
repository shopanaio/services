# Canonical Checkout Pipeline — implementation-ready plan

## Summary

Реализовать concrete `CheckoutPipeline`:

`Preliminary Pricing → Delivery → Final Pricing → Payment → Validation`

Checkout владеет orchestration, native readiness validation и применением результатов `cart.validations.generate.run`. Изменения ограничены checkout service, его package metadata и lockfile. Pipeline не подключается к Nest, IoC, scripts, resolvers, persistence или broker registration.

## Public API и зависимости

```ts
new CheckoutValidationRunner({
  functions: CommerceFunctionRunnerPort,
  bindings: CheckoutValidationBindingSource,
});

new CheckoutPipeline({
  pricing: PricingCheckoutPort,
  delivery: DeliveryCheckoutPort,
  payments: PaymentsCheckoutPort,
  validationRunner: CheckoutValidationRunner,
  runtime?: CheckoutPipelineRuntime,
});
```

- `CommerceFunctionRunnerPort` — узкий структурный интерфейс над generic `CommerceFunctionRunner.run()`. Он принимает checkout-owned `CommerceFunctionRunRequest` shape и возвращает только необходимые runner fields: `target`, ordered `outputs` (`planIndex`, `implementationId`, `implementationType`, `functionBindingId`, `data`) и trace (`bindingSetRevision`, `status`, ordered implementations с identity, failureMode, status и optional errorClass/errorCode). REQUIRED throw распознаётся только как trusted runner error при наличии валидного trace; произвольный duck-typed exception таким не считается.
- `CheckoutPipelineRuntime` предоставляет wall clock и timer scheduling с точным контрактом:

```ts
interface CheckoutPipelineRuntime {
  now(): number; // epoch milliseconds
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}
```

Default runtime использует `Date.now`, `setTimeout` и `clearTimeout`. Все pipeline timestamps и решения settlement guard используют только этот runtime; отрицательный `delayMs` нормализуется в `0`.
- `CheckoutPipelinePorts` содержит только Pricing, Delivery и Payments; validation runner передаётся отдельной checkout-owned зависимостью.
- Удалить abstract `BaseCheckoutPipeline` и незавершённый `CheckoutValidationPort`.
- Экспортировать concrete class, factory, validation runner, binding contracts, target contracts и schemas.

Validation runner проверяет runner result как недоверенную boundary: target и binding revision должны совпасть с request; `planIndex` должен быть уникальным и возрастающим; каждый output должен соответствовать `SUCCEEDED` APP trace item с теми же `implementationId` и non-null `functionBindingId`; trace identity должна ссылаться на переданный active binding. Несогласованный envelope превращается в `CHECKOUT_VALIDATION_FUNCTION_OUTPUT_INVALID`, а не используется для provenance.

## Pipeline Execution

- Проверить root request через `parseCheckoutRecalculationRequest`; root boundary error выбрасывается до port calls.
- Для каждой стадии:
  - построить canonical request из проверенных upstream outputs;
  - проверить request parser;
  - выполнить port/runner через deadline settlement guard;
  - проверить response request-relative parser;
  - сформировать `SUCCESS`, `FAILED` или `SKIPPED`.
- Data exposure:
  - Pricing получает eligibility context без contact PII и сокращённую location;
  - Delivery получает canonical transformed physical lines и необходимые адрес/contact fields;
  - Payments получает eligibility context и PII-free/provider-data-free delivery snapshot;
  - internal Validation получает полный checkout snapshot;
  - App validation functions получают отдельную PII-free projection.
- `FAILED` или `STOP` блокирует downstream.
- `SKIPPED` использует первого блокирующего `upstreamStage`, `startedAt === completedAt`, `durationMs === 0`.
- Delivery issues сохраняют severity и становятся `CONTINUE` issues.
- Rejected discount codes становятся Pricing warnings с `CONTINUE`.
- Validation operations проецируются как `WARNING/CONTINUE` или `ERROR/STOP`.
- Aggregate issues — точная конкатенация stage issues в порядке пяти стадий.

### Domain issue mapping

- Preliminary Pricing создаёт warning только для `discountCodeResolutions` со status `REJECTED`:
  - `code: "DISCOUNT_CODE_REJECTED_<reason>"`;
  - `message` берётся из resolution;
  - `field: ["cartIntent", "discountCodes", String(index)]`;
  - `retryable` берётся из resolution.
- Final Pricing создаёт такое предупреждение только если соответствующая resolution в preliminary имела status `PENDING`, а final resolution стала `REJECTED`. Уже отклонённые preliminary codes повторно не добавляются.
- Delivery issue преобразуется без изменения `code`, `message`, `severity` и `retryable`, всегда с `effect: "CONTINUE"`. Field строится так:
  - оба идентификатора отсутствуют: `[]`;
  - только `groupId`: `["delivery", "groups", groupId]`;
  - `carrierServiceAccountId` присутствует: `["delivery", "groups", groupId ?? "unassigned", "carrierServices", carrierServiceAccountId]`.
- Validation operation преобразуется без изменения `code`, `message`, `severity` и `field`; `ERROR` получает `STOP`, `WARNING` получает `CONTINUE`, `retryable: false`, а nullable `lineId` пропускается из issue при `null`.
- Каждый `FAILED` stage создаёт ровно один issue, эквивалентный public `failure`: тот же `code/message/retryable`, `severity: "ERROR"`, `effect: "STOP"`, `field: []`.

## Checkout Validation

### Native readiness rules

Выполнять до Commerce Functions в фиксированном порядке:

- `CART_EMPTY`;
- `LINE_UNAVAILABLE`;
- `LINE_QUANTITY_EXCEEDED`;
- `DELIVERY_ADDRESS_REQUIRED`;
- `DELIVERY_OPTIONS_UNAVAILABLE`;
- `DELIVERY_OPTION_REQUIRED`;
- `DELIVERY_OPTION_INVALID`;
- `DELIVERY_OPTION_ORPHANED`;
- `PAYMENT_METHODS_UNAVAILABLE`;
- `PAYMENT_METHOD_REQUIRED`;
- `PAYMENT_METHOD_INVALID`.

Quantity rule:

```ts
maxQuantity !== null && quantity > maxQuantity
```

- `maxQuantity: 0` является настоящим ограничением.
- Если строка одновременно unavailable и превышает max quantity, вернуть обе операции в порядке `LINE_UNAVAILABLE`, затем `LINE_QUANTITY_EXCEEDED`.
- При `payableTotal.amountMinor === "0"` payment selection не требуется.
- Native errors имеют стабильные messages, canonical field paths и `lineId`, когда применимо.

Rules вычисляются только из уже проверенного `ValidateCheckoutRequest`. Lines обходятся depth-first preorder в порядке `finalQuote.lines`; delivery groups и payment methods сохраняют domain order. Операции группируются по порядку rules выше, а внутри одного rule — по указанному domain order.

| Rule | Точное условие | message | field / lineId |
| --- | --- | --- | --- |
| `CART_EMPTY` | flattened `finalQuote.lines` пуст | `Cart must contain at least one line.` | `["cart", "lines"]` / `null` |
| `LINE_UNAVAILABLE` | `line.availability.available === false` | `Cart line is unavailable.` | `["cart", "lines"]` / `line.lineId` |
| `LINE_QUANTITY_EXCEEDED` | `maxQuantity !== null && quantity > maxQuantity` | `Cart line quantity exceeds the available quantity.` | `["cart", "lines"]` / `line.lineId` |
| `DELIVERY_ADDRESS_REQUIRED` | line ID присутствует в `preliminary.deliveryIntent.unassignedPhysicalLineIds` | `A delivery address is required for this cart line.` | `["delivery", "destinations"]` / line ID |
| `DELIVERY_OPTIONS_UNAVAILABLE` | delivery group имеет `options.length === 0` | `No delivery options are available for this delivery group.` | `["delivery", "groups", groupId, "options"]` / `null` |
| `DELIVERY_OPTION_REQUIRED` | group имеет options и `selection.status === "NONE"` | `A delivery option must be selected for this delivery group.` | `["delivery", "groups", groupId, "selectedOption"]` / `null` |
| `DELIVERY_OPTION_INVALID` | существующий group имеет `selection.status === "RESET"` | `The selected delivery option is no longer valid.` | `["delivery", "groups", groupId, "selectedOption"]` / `null` |
| `DELIVERY_OPTION_ORPHANED` | entry присутствует в `delivery.orphanedSelectionResets` | `The selected delivery option no longer belongs to a delivery group.` | `["delivery", "selectedOptions", reset.groupId]` / `null` |
| `PAYMENT_METHODS_UNAVAILABLE` | payable total больше нуля и `payment.methods` пуст | `No payment methods are available for this checkout.` | `["payment", "methods"]` / `null` |
| `PAYMENT_METHOD_REQUIRED` | payable total больше нуля, methods не пуст и `selection.status === "NONE"` | `A payment method must be selected.` | `["payment", "selectedMethod"]` / `null` |
| `PAYMENT_METHOD_INVALID` | payable total больше нуля и `selection.status === "RESET"` | `The selected payment method is no longer valid.` | `["payment", "selectedMethod"]` / `null` |

`SELECTED` handles дополнительно не перепроверяются native rules: request-relative Delivery/Payments parsers уже гарантируют, что выбранный handle принадлежит возвращённому набору. Все native operations имеют `severity: "ERROR"` и trusted `source.type: "NATIVE"` с соответствующим rule.

### Target definition

Использовать только `cart.validations.generate.run`:

```ts
{
  target: "cart.validations.generate.run",
  owningService: "checkout",
  executionMode: "COLLECT_ALL",
  nativeImplementations: [],
  defaultTimeoutMs: 3_000,
  concurrencyLimit: 8,
  appFailureMode: "REQUIRED",
  allowMultipleAppImplementations: true,
  maxInputBytes: 1_048_576,
  maxOutputBytes: 1_048_576,
  maxEnvelopeDepth: 32,
  tracePolicy: {
    inputDigest: true,
    outputDigest: true,
  },
}
```

Native checkout rules не регистрируются как generic function implementations.

Definition экспортируется как `CHECKOUT_VALIDATION_FUNCTION_TARGET_DEFINITION`. Этот этап не меняет global registry/composition root: будущая интеграция обязана зарегистрировать именно экспортированное definition до передачи реального `CommerceFunctionRunner`. Unit tests validation runner используют structural fake и отдельно проверяют сформированный run request.

### Binding contract

```ts
interface CheckoutValidationBinding {
  functionBindingId: string;
  storeId: string;
  target: "cart.validations.generate.run";
  installationId: string;
  functionKey: string;
  owner: {
    service: "checkout";
    resourceType: string;
    resourceId: string;
  };
  status: "ACTIVE" | "DISABLED";
  failureMode: "REQUIRED" | "OPTIONAL";
  configurationSnapshot: CheckoutPipelineJsonValue;
  configurationRevision: string;
  routeRevision: string;
  precedence: number;
  activationSequence: number;
}
```

Binding owner для v1 фиксирован: `owner.service === "checkout"`, `owner.resourceType === "store"`, `owner.resourceId === storeId`. Другие owner shapes являются boundary violation, а не молча игнорируются.

```ts
interface CheckoutValidationBindingSource {
  loadForTarget(input: {
    storeId: string;
    target: "cart.validations.generate.run";
  }): Promise<readonly unknown[]>;
}
```

`CheckoutValidationBindingSource.loadForTarget()` возвращает недоверенные raw bindings. Runner самостоятельно:

- проверяет store/target/owner и JSON configuration;
- проверяет уникальность `functionBindingId`;
- исключает `DISABLED`;
- сортирует active bindings по `precedence`, `activationSequence`, `functionBindingId`;
- преобразует их в `CommerceFunctionBindingRef`;
- вычисляет `bindingSetRevision` из versioned payload всех полей отсортированного active set:

```ts
{
  schemaVersion: 1,
  storeId,
  target,
  bindings: activeBindings.map(binding => ({
    functionBindingId: binding.functionBindingId,
    installationId: binding.installationId,
    functionKey: binding.functionKey,
    owner: binding.owner,
    failureMode: binding.failureMode,
    configurationSnapshot: binding.configurationSnapshot,
    configurationRevision: binding.configurationRevision,
    routeRevision: binding.routeRevision,
    precedence: binding.precedence,
    activationSequence: binding.activationSequence,
  })),
}
```

Пустой набор использует экспортированную константу:

```ts
EMPTY_CHECKOUT_VALIDATION_BINDING_SET_REVISION =
  "checkout-validation-bindings:empty:v1"
```

`EmptyCheckoutValidationBindingSource` возвращает `[]`; generic runner при пустом наборе не вызывается.

### PII-free function input

Function input имеет отдельный strict contract:

```ts
interface CheckoutValidationFunctionInput {
  schemaVersion: 1;
  context: {
    checkoutId: string;
    storeId: string;
    basedOnCheckoutVersion: number;
    currencyCode: string;
    localeCode: string | null;
    channelCode: string;
    effectiveAt: string;
    authenticated: boolean;
    buyerEligibility: null | {
      countryCode: string | null;
      marketId: string | null;
      companyId: string | null;
      segmentIds: readonly string[];
      segmentMembershipRevision: string | null;
    };
  };
  cart: CheckoutValidationFunctionCart;
  preliminary: CheckoutValidationFunctionPreliminaryQuote;
  delivery: CheckoutValidationFunctionDelivery;
  finalQuote: CheckoutValidationFunctionFinalQuote;
  payment: CheckoutValidationFunctionPayment;
}
```

Для этих projection types создаются отдельные explicit interfaces и `.strict()` Zod schemas; они не строятся через spread/`Omit` полного internal snapshot. Projection использует следующий исчерпывающий allowlist:

- `cart`: line `lineId`, `variantId`, component selection, quantity, purchase и children; discount codes; destination ID + country/province/postal location + line IDs; только handles selected delivery/payment options;
- `preliminary`: provenance без `executionId`, quoted lines с merchandise public fields (`variantId`, revision, title, sku, imageUrl, isPhysical, targeting), availability, prices, discount allocations and totals; source line resolutions; public delivery intent; discount code resolutions;
- `delivery`: revision links, groups, public options (`handle`, code, title, description, method type, cost, estimates, phone requirement, customer input contract, `publicData`, carrier code), selection status/handle и orphaned reset identity/reason без customer input;
- `finalQuote`: revision links, quoted lines, discount applications без `metadata` и без function execution/plan IDs, discount code resolutions и totals;
- `payment`: revision links, methods без provider-private metadata и selection status/handle без customer input.

Function input не содержит:

- buyer/customer ID;
- name, email, phone;
- address lines, company или recipient identity;
- `providerData`;
- carrier execution traces/routes;
- internal configuration snapshots других domains.

Разрешены:

- checkout/store/version/currency/locale/channel/effective time;
- `authenticated` flag;
- country, market, company and segment eligibility facts без customer ID;
- destination country/province/postal location;
- cart lines без arbitrary attributes;
- quoted merchandise, availability, discounts и totals;
- public delivery options/selections без submitted customer input;
- public payment methods/selections без submitted customer input.

Следующие поля явно исключаются, даже если они присутствуют во внутренних source contracts: `executionId`, `correlationId`, `customerId`, все `usageRequirements`, address identity/contact fields, `providerData`, `carrierServiceExecutions`, provider route/account IDs, function `planRevision`/execution IDs, discount `metadata`, payment method `metadata`, selection `customerInput`, arbitrary cart/line `attributes` и `buyer.data`. Arbitrary JSON fields считаются потенциально содержащими PII и не могут войти в v1 projection только на основании имени поля. Mapper строит новый object только из allowlist; последующий strict parser является обязательной PII boundary перед `functions.run()`.

Расширение PII-доступа требует отдельного permission/capability design и не входит в scope.

### Function output и trusted operations

Разделить контракты:

```ts
interface CheckoutValidationFunctionOperation {
  code: string;
  message: string;
  severity: "WARNING" | "ERROR";
  field: readonly string[];
  lineId: string | null;
}

interface CheckoutValidationFunctionOutput {
  schemaVersion: 1;
  operations: readonly CheckoutValidationFunctionOperation[];
}
```

Это source-less недоверенный output.

Итоговый `CheckoutValidationOperation` дополнительно содержит trusted source:

```ts
type CheckoutValidationOperationSource =
  | {
      type: "NATIVE";
      rule: CheckoutNativeValidationRule;
    }
  | {
      type: "FUNCTION";
      target: "cart.validations.generate.run";
      implementationId: string;
      functionBindingId: string;
    };
```

- Function output parser принимает только strict object `{ schemaVersion: 1, operations }`; operations ограничены `CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS`, а schema запрещает `source` и неизвестные поля на обоих уровнях.
- Runner добавляет provenance из trusted execution envelope.
- Operations объединяются: native order → execution-plan order → output order.
- REQUIRED failure делает Validation stage `FAILED`.
- OPTIONAL failure добавляет operation:
  - `code: "OPTIONAL_VALIDATION_FUNCTION_FAILED"`;
  - `message: "An optional checkout validation function could not be evaluated."`;
  - `severity: "WARNING"`;
  - `field: []`;
  - `lineId: null`;
  - trusted function source.
- Timing, stack и исходный exception text в operation не попадают.
- `valid` истинно только при отсутствии `ERROR`.

Validation revision:

```ts
{
  schemaVersion: 1,
  checkoutId,
  basedOnCheckoutVersion,
  basedOnFinalQuoteRevision,
  basedOnPaymentRevision,
  bindingSetRevision,
  operations, // ordered, включая trusted source
}
```

## Stage Errors

```ts
class CheckoutPipelineStageError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly cause?: unknown;
}
```

- Typed errors разрешены port adapters, validation runner и deadline guard.
- Typed `code/message/retryable` сохраняются после schema validation.
- Stage boundary errors становятся non-retryable `CHECKOUT_PIPELINE_BOUNDARY_VIOLATION`.
- Function errors получают checkout-owned sanitized codes по фиксированной таблице:

| Generic `FunctionErrorClass` | Checkout code | retryable | public message |
| --- | --- | --- | --- |
| `ROUTE_UNAVAILABLE` | `CHECKOUT_VALIDATION_FUNCTION_ROUTE_UNAVAILABLE` | `true` | `A required checkout validation function is unavailable.` |
| `DEADLINE_EXCEEDED` | `CHECKOUT_VALIDATION_FUNCTION_DEADLINE_EXCEEDED` | `true` | `A required checkout validation function exceeded its deadline.` |
| `APP_RUNTIME_UNAVAILABLE` | `CHECKOUT_VALIDATION_FUNCTION_RUNTIME_UNAVAILABLE` | `true` | `A required checkout validation function could not be executed.` |
| `AUTHORIZATION_ERROR` | `CHECKOUT_VALIDATION_FUNCTION_AUTHORIZATION_FAILED` | `false` | `A required checkout validation function is not authorized.` |
| `IMPLEMENTATION_EXCEPTION` | `CHECKOUT_VALIDATION_FUNCTION_FAILED` | `false` | `A required checkout validation function failed.` |
| `INVALID_IMPLEMENTATION_OUTPUT` | `CHECKOUT_VALIDATION_FUNCTION_OUTPUT_INVALID` | `false` | `A required checkout validation function returned an invalid result.` |
| `OUTPUT_SIZE_LIMIT` | `CHECKOUT_VALIDATION_FUNCTION_OUTPUT_TOO_LARGE` | `false` | `A required checkout validation function returned too much data.` |
| `DOMAIN_REJECTION` | `CHECKOUT_VALIDATION_FUNCTION_REJECTED` | `false` | `A required checkout validation function rejected the request.` |

Unknown/malformed generic runner errors используют `CHECKOUT_VALIDATION_FUNCTION_FAILED`, generic message и `retryable: false`. Для OPTIONAL trace failures используется единая warning operation из раздела выше независимо от generic error class; исходные codes/messages наружу не копируются.
- Unknown exception получает stage-specific code, generic безопасное message и `retryable: false`.
- `cause` доступен только внутреннему logging и никогда не входит в result, issue, revision или public trace.
- Каждый stage failure создаёт одно эквивалентное `ERROR/STOP` issue.

## Deadline Semantics

`deadlineAt` — только cutoff принятия асинхронного stage result, не deadline финальной синхронной сборки.

### Settlement guard

Для каждого port/runner call:

- до запуска проверить, что текущее время меньше deadline;
- подключить fulfillment и rejection handlers до запуска timer race;
- сохранить внутренний `resultObservedAt` при наблюдении settlement;
- принять fulfillment/rejection только если `resultObservedAt <= deadlineAt`;
- при settlement очистить timer;
- если timer выигрывает, сформировать deadline failure;
- late fulfillment игнорировать;
- late rejection поглотить уже установленным rejection handler, исключая unhandled rejection;
- физическую отмену не обещать, поскольку порты не принимают `AbortSignal`.

Guard получает thunk `() => Promise<T>`, а не уже созданный Promise, поэтому deadline check действительно происходит до port call. Синхронный throw из thunk обрабатывается как observed rejection с `resultObservedAt = runtime.now()`. Timer создаётся только после установки handlers; при любом observed settlement вызывается `runtime.cancel(handle)` ровно один раз. Если settlement и timer наблюдаются на одинаковом millisecond, accepted settlement с `resultObservedAt <= deadlineAt` имеет приоритет.

### Trace

Execution trace получает:

```ts
{
  deadlineAt: string;
  deadlineExceeded: boolean;
  deadlineObservedAt: string | null;
}
```

Stage trace для вызванного порта получает `resultObservedAt`:

- accepted success или non-timeout failure: фактическое время settlement;
- deadline failure до запуска или по timer: отсутствует;
- skipped stage: отсутствует.

`completedAt` всегда является фактическим временем окончания stage/execution и может быть позже deadline из-за parsing, hashing и assembly.

### Parser invariants

Удалить общий запрет `completedAt > deadlineAt`.

Проверять:

- каждый `SUCCESS` имеет `resultObservedAt <= deadlineAt`;
- non-deadline port failure имеет `resultObservedAt <= deadlineAt`;
- `deadlineExceeded: false` означает отсутствие deadline failure;
- `deadlineExceeded: true` требует:
  - `deadlineObservedAt >= deadlineAt`;
  - одного первого blocking failure с `CHECKOUT_PIPELINE_DEADLINE_EXCEEDED`;
  - только `SKIPPED` downstream stages;
- поздний port result не может иметь `outputRevision` или попасть в stage data;
- execution `completedAt` не ограничивается deadline.

## Deterministic Revisions

Все hashes используют одну checkout-owned функцию `canonicalJsonSha256`:

1. Значение сначала проходит соответствующий strict Zod/request-relative parser.
2. JSON objects рекурсивно сериализуются с keys в ascending UTF-16 code-unit order; array order сохраняется.
3. Допустимы только JSON values; non-finite numbers, sparse arrays, exotic prototypes, accessors, symbols, cycles и `undefined` отклоняются.
4. `-0` нормализуется в `0`; strings сериализуются правилами `JSON.stringify`.
5. SHA-256 считается от UTF-8 bytes canonical JSON и кодируется lowercase hex.

Stage `inputRevision`/`outputRevision` имеют формат `sha256:<64 lowercase hex>` и считаются от полного canonical parsed request/result. Non-empty binding revision имеет формат `checkout-validation-bindings:v1:sha256:<hex>` и считается от payload в Binding contract; empty set сохраняет отдельную константу. Validation revision имеет формат `checkout-validation:v1:sha256:<hex>`, result revision — `checkout-pipeline-result:v1:sha256:<hex>`.

`resultRevision` использует:

```ts
{
  schemaVersion: 1,
  checkoutId,
  basedOnCheckoutVersion,
  change,
  stages: [
    {
      stage,
      status,
      revision, // domain data.revision для SUCCESS
      failure,  // sanitized fields для FAILED
      reason,   // для SKIPPED
      issues,
    },
  ],
}
```

- Stages всегда находятся в canonical order.
- Function/native provenance входит через validation domain revision.
- Исключаются execution/correlation IDs, traces, deadlines, observed times, timestamps, durations, input/output hashes, causes и stacks.
- Одинаковые domain revisions/outcomes/issues дают одинаковый `resultRevision`.

В stage entry поля также фиксированы: `revision` присутствует только для `SUCCESS`, `failure` только для `FAILED`, `reason` только для `SKIPPED`; отсутствующие поля не сериализуются как `null`. Issues включаются полностью и в исходном порядке. Validation revision payload из предыдущего раздела хешируется тем же алгоритмом; `valid` намеренно не входит, потому что детерминированно выводится из operations.

## Tests and Package Setup

В checkout package добавить:

- `jest`;
- `ts-jest`;
- `@types/jest`;
- ESM Jest config;
- service-local `test` script;
- lockfile update.

Написать тесты:

- happy path и точные stage requests;
- PII boundaries для Pricing, Delivery, Payments, internal Validation и App functions;
- доказательство, что arbitrary attributes, metadata и selection customer input не попадают в App input;
- полный native readiness набор;
- `maxQuantity: null`, `0` и positive limit;
- одновременные unavailable/quantity operations;
- zero-total payment;
- binding validation, cross-store/owner rejection, uniqueness, sorting, disabled filtering, exact non-empty revision payload и empty revision;
- source-less output, output/trace identity mismatch rejection и trusted provenance;
- REQUIRED/OPTIONAL failures;
- typed, boundary и unknown error sanitization;
- отсутствие `cause` во всех публичных artifacts;
- STOP/CONTINUE и downstream short-circuit;
- timeout before call, timer win, fulfilled-after-deadline, rejected-after-deadline;
- timer cleanup и отсутствие unhandled late rejection;
- успешный последний settlement до deadline с execution completion после deadline;
- skipped timestamps;
- canonical JSON key ordering, `-0`, invalid JSON shapes, validation/result revision payloads и timing independence;
- malformed root request без port calls;
- финальные success/failure results через parser.

Test/build/tsc не запускать согласно `AGENTS.md`. Итог реализации обозначить: **tests authored, execution deferred**.

## Non-Goals

- Изменения других сервисов или `@shopana/broker-types`.
- Binding persistence, schema или migration.
- Checkout aggregate/CAS integration.
- Nest, IoC, scripts, resolvers или broker handlers.
- DBOS workflow, retries или cooperative cancellation.
