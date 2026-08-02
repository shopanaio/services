# Checkout Pipeline Mutation Integration — implementation-ready plan

## Summary

Интегрировать concrete `CheckoutPipeline` во все storefront checkout mutations,
которые меняют canonical cart intent или зависящие от него Pricing, Delivery,
Payment и Validation snapshots.

Mutation должна применяться к prospective in-memory draft, после чего Checkout
один раз выполняет:

`Preliminary Pricing → Delivery → Final Pricing → Payment → Validation`

и только затем атомарно сохраняет mutation вместе с canonical результатом через
compare-and-swap по checkout version.

Pipeline становится единственным источником merchandise resolution,
availability, discounts, totals, delivery options, payment methods и checkout
readiness. Старые mutation-local `offers`, `computeTotals()`, promo validation и
ручное сохранение рассчитанных totals удаляются. Dual-write, legacy fallback,
backfill и сохранение результата поверх более новой checkout version запрещены.

## Current State and Blocking Gaps

- `CheckoutPipeline` и `CheckoutValidationRunner` существуют, но не создаются в
  `services/checkout/src/ioc/container.ts` и не передаются use cases.
- Mutating use cases загружают current read model и напрямую вызывают отдельные
  методы `CheckoutWriteRepository`.
- Line и promo use cases всё ещё используют placeholder `offers` и локальный
  `CheckoutService.computeTotals()`.
- `CheckoutReadModelAdapter` всегда возвращает `version: 1`; реального CAS нет.
- SQL updates проверяют checkout только по `id`, а несколько statements
  выполняются последовательно без общей явной transaction boundary.
- `checkoutCreate` сначала создаёт checkout, а затем отдельным вызовом добавляет
  initial lines. Batch address/recipient resolvers также вызывают use case в
  цикле, допуская частичный commit и несколько перерасчётов на одну GraphQL
  mutation.
- Checkout adapters для Pricing, Delivery и Payments не собраны в composition
  root. Реализация provider-side Pricing/Delivery/Payments actions вынесена за
  scope этого плана и является обязательным prerequisite интеграции.
- `CustomersCheckoutActions.resolveBuyerEligibility` существует только как
  contract scaffolding. Реализация production handler в Customers вынесена за
  scope этого плана и является обязательным prerequisite; в scope остаётся
  Checkout typed adapter для получения buyer eligibility snapshot.
- Реального `CheckoutValidationBindingSource` и composition root для
  `CommerceFunctionRunner` с
  `CHECKOUT_VALIDATION_FUNCTION_TARGET_DEFINITION` пока нет.

## Architectural Decisions

### One mutation, one prospective draft, one pipeline run, one commit

GraphQL resolver только валидирует transport input и вызывает application use
case. Use case не пишет промежуточное состояние. Общий
`CheckoutMutationCoordinator`:

1. загружает current mutation snapshot;
2. проверяет tenant и version;
3. применяет mutation к in-memory `CheckoutMutationDraft`;
4. строит и парсит `CheckoutRecalculationRequest`;
5. вызывает `CheckoutPipeline.recalculate()` ровно один раз;
6. проверяет, что все пять stages завершились со статусом `SUCCESS`;
7. атомарно применяет draft и canonical result при совпадении expected version;
8. возвращает committed checkout snapshot.

Нельзя сохранять user intent до pipeline и компенсировать запись при ошибке.
Нельзя держать database transaction открытой во время Pricing/Delivery/Payments
network calls.

### Validation invalidity is persistent checkout state

`validation.status === "SUCCESS"` вместе с `validation.data.valid === false` —
нормальный результат незавершённой корзины. Такой checkout сохраняется вместе с
ordered validation operations. Например, `checkoutLinesClear` сохраняет пустую
корзину с `CART_EMPTY`.

Любой `FAILED` или `SKIPPED` stage означает, что полный canonical snapshot не
получен и mutation не сохраняется. Commit разрешён только когда preliminary,
delivery, final pricing, payment и validation имеют `status: "SUCCESS"`.
`STOP` issue в успешной Validation stage и `validation.data.valid === false` не
откатывают mutation, потому что Validation является последней stage и её data
представляет canonical invalid checkout state.

### CAS is mandatory

Для существующего checkout pipeline request использует реальную текущую
`expectedCheckoutVersion = V`. Commit обязан выполнить условный переход
`V → V + 1`. Если checkout уже имеет другую version, весь pipeline result
отбрасывается и наружу возвращается typed retryable conflict. Автоматический
повтор pipeline в v1 не выполняется.

Для `CREATE` draft имеет `expectedCheckoutVersion: 0`; успешный atomic insert
создаёт version `1`. Checkout ID, line IDs, destination IDs и idempotency identity
создаются до pipeline и не меняются во время одной попытки.

### Create idempotency is client-scoped and replayable

`checkoutCreate` принимает обязательный opaque `idempotencyKey` в
`CheckoutCreateInput`. Ключ не генерируется resolver и не вычисляется только из
payload: два намеренно одинаковых create request должны иметь возможность
создать два checkout с разными ключами.

Idempotency identity включает `{ storeId, connectionId, operation,
idempotencyKey }`. `connectionId` берётся только из verified
`context.storefrontAccess.connectionId`, никогда не из GraphQL input.
Сервер вычисляет и хранит canonical `requestHash` из
нормализованного business input без самого `idempotencyKey`, generated IDs и
runtime timestamps. Hash строится canonical JSON serializer, а не
`JSON.stringify()` произвольного DTO.

`connectionId` является стабильной client identity Headless storefront и не
меняется при ротации PUBLIC/PRIVATE credentials. `credentialId` идентифицирует
конкретный verified credential текущего request и сохраняется только как audit
metadata (`initiatingCredentialId`); он не входит в idempotency identity и
unique constraint. `installationId`, raw public/private token, token digest,
hint или key material в Checkout persistence не сохраняются.

- первый request резервирует identity и заранее сгенерированный `checkoutId`;
- повтор с тем же identity и тем же `requestHash` возвращает ранее committed
  checkout; пока первая попытка имеет `IN_PROGRESS`, повтор возвращает
  `CHECKOUT_CREATE_IN_PROGRESS`, `retryable: true`, не запуская pipeline;
- тот же identity с другим `requestHash` возвращает
  `CHECKOUT_IDEMPOTENCY_KEY_REUSED`, `retryable: false`;
- retry использует те же checkout/line/tag/destination IDs и не запускает вторую
  независимую create attempt;
- failed attempt не публикует checkout; retry policy для retryable failure
  продолжает ту же identity согласно idempotency record, а не создаёт новую.

Idempotency record имеет состояния `IN_PROGRESS`, `RETRYABLE_FAILED`,
`FINAL_FAILED` и `COMMITTED`. Retryable pre-pipeline/pipeline/commit failure
атомарно переводит record в `RETRYABLE_FAILED`, сохраняя reserved IDs; следующий
same-hash request выполняет CAS `RETRYABLE_FAILED → IN_PROGRESS`. Non-retryable
failure сохраняется как `FINAL_FAILED` с sanitized public failure и
детерминированно replay-ится без повторного pipeline. Lease/timeout recovery
для оборванного `IN_PROGRESS` использует injected policy и CAS; параллельный
живой request не перехватывается.

Idempotency lookup/reservation выполняется до pipeline. Финальный переход
idempotency record в `COMMITTED` и insert checkout version `1` выполняются в
одной DB transaction. Уникальность обеспечивается по
`store_id + connection_id + operation + idempotency_key`.

### No compatibility layer or backfill

Проект не содержит production data. Persistence contracts и tables изменяются
на canonical модель напрямую. Legacy columns/DTO paths, которые дублируют новый
snapshot, удаляются в той же серии изменений. Миграции не выполняют backfill и
не поддерживают чтение старого формата.

### Public Storefront API exposes committed pipeline state

Расширить `Checkout` следующими полями:

```graphql
type Checkout {
  version: Int!
  resultRevision: String!
  valid: Boolean!
  issues: [CheckoutIssue!]!
}

enum CheckoutIssueSeverity {
  WARNING
  ERROR
}

enum CheckoutIssueEffect {
  CONTINUE
  STOP
}

type CheckoutIssue {
  code: String!
  message: String!
  severity: CheckoutIssueSeverity!
  effect: CheckoutIssueEffect!
  field: [String!]!
  lineId: ID
  retryable: Boolean!
}
```

Каждый checkout создаётся только через successful pipeline-backed create,
поэтому `resultRevision` non-null. CAS-only mutation сохраняет последний
successful `resultRevision`, `valid` и `issues` без изменений.
`issues` содержит aggregate pipeline issues в исходном stage/order порядке.
Существующий `notifications` остаётся отдельным UX-механизмом и не используется
как lossy projection pipeline issues. Mutation response и последующий query
читают одинаковые `version`, `resultRevision`, `valid` и `issues`.

### Public Delivery and Payment selection contracts are handle-based

Storefront обязан возвращать opaque handle каждой canonical Delivery option и
Payment method. Тот же handle клиент передаёт в selection mutation.
`provider + code` являются display metadata, не selection identity, и не
принимаются mutation inputs.

Заменить legacy delivery/payment Storefront projection на pipeline-aligned
contract:

```graphql
enum CheckoutSelectionStatus {
  NONE
  SELECTED
  RESET
}

type CheckoutSelectionResetReason {
  code: String!
  message: String!
}

enum CheckoutDeliveryMethodType {
  LOCAL
  NONE
  PICK_UP
  PICKUP_POINT
  RETAIL
  SHIPPING
}

type CheckoutDeliveryOption {
  handle: String!
  code: String!
  title: String!
  description: String
  deliveryMethodType: CheckoutDeliveryMethodType!
  cost: Money!
  estimatedMinDeliveryAt: DateTime
  estimatedMaxDeliveryAt: DateTime
  phoneRequired: Boolean!
  customerInputContract: JSON
  publicData: JSON!
  carrierCode: String
}

type CheckoutDeliveryOptionSelection {
  status: CheckoutSelectionStatus!
  option: CheckoutDeliveryOption
  previousOptionHandle: String
  resetReason: CheckoutSelectionResetReason
}

type CheckoutDeliveryGroup {
  id: ID!
  checkoutLines: [CheckoutLine!]!
  deliveryAddress: CheckoutDeliveryAddress
  recipient: CheckoutRecipient
  options: [CheckoutDeliveryOption!]!
  selection: CheckoutDeliveryOptionSelection!
}

input CheckoutDeliveryMethodUpdateInput {
  checkoutId: ID!
  deliveryGroupId: ID!
  optionHandle: String!
  customerInput: JSON
}

type CheckoutPaymentMethod {
  handle: String!
  code: String!
  title: String!
  providerCode: String!
  flow: PaymentFlow!
}

type CheckoutPaymentMethodSelection {
  status: CheckoutSelectionStatus!
  method: CheckoutPaymentMethod
  previousMethodHandle: String
  resetReason: CheckoutSelectionResetReason
}

type CheckoutPayment {
  methods: [CheckoutPaymentMethod!]!
  selection: CheckoutPaymentMethodSelection!
  payableAmount: Money!
}

input CheckoutPaymentMethodUpdateInput {
  checkoutId: ID!
  methodHandle: String!
  customerInput: JSON
}
```

Selection mapper обязан сохранять различие `NONE`, `SELECTED` и `RESET`. Для
`SELECTED` поле `option`/`method` разрешается только по exact selected handle из
того же committed snapshot. Для `RESET` возвращаются
`previousOptionHandle`/`previousMethodHandle` и sanitized `resetReason`;
orphaned selection не подменяется `NONE`.

Public selection invariants:

- `NONE`: `option`/`method`, previous handle и `resetReason` равны `null`;
- `SELECTED`: `option`/`method` non-null, previous handle и `resetReason` равны
  `null`;
- `RESET`: `option`/`method` равен `null`, previous handle и `resetReason`
  non-null.

`customerInput` принимается как JSON object, валидируется pipeline provider по
выбранному handle и сохраняется как private checkout intent. Оно не возвращается
в public option/method object и не логируется. Delivery публикует только
contract-defined `publicData`; Payments provider-private `metadata` в Storefront
GraphQL не публикуется.

Из GraphQL schema, generated types, DTO и use-case commands удалить
`shippingMethodCode`, `paymentMethodCode`, selection `provider` и legacy `data`.
После transport validation application layer использует только
`optionHandle`/`methodHandle` и `customerInput`. Handle — opaque bounded non-empty
string, который после trim имеет длину `1..256`; его не декодируют как Global ID
и не парсят для получения provider/code.

## Mutation Coverage Matrix

В текущем Storefront GraphQL API 23 checkout mutations. Pipeline применяется к
19 из них.

| GraphQL mutation | Use case | Pipeline | `CheckoutPipelineChange` | Draft change |
| --- | --- | --- | --- | --- |
| `checkoutCreate` | `CreateCheckoutUseCase` | REQUIRED | `CREATE` | Создать checkout draft сразу с initial lines, tags, currency, locale, channel, external source и external ID |
| `checkoutLinesAdd` | `AddCheckoutLinesUseCase` | REQUIRED | `LINES_ADD` | Добавить/агрегировать root и component selections, сохранив stable generated line IDs |
| `checkoutLinesUpdate` | `UpdateCheckoutLinesUseCase` | REQUIRED | `LINES_UPDATE` | Изменить quantities; `0` удаляет root с descendants |
| `checkoutLinesDelete` | `DeleteCheckoutLinesUseCase` | REQUIRED | `LINES_DELETE` | Удалить выбранные roots и descendants |
| `checkoutLinesClear` | `ClearCheckoutLinesUseCase` | REQUIRED | `LINES_CLEAR` | Очистить lines, line assignments и stale selections |
| `checkoutLinesReplace` | `ReplaceCheckoutLinesUseCase` | REQUIRED | `LINES_REPLACE` | Изменить variant intent указанной source line без переноса старого quote snapshot |
| `checkoutCustomerIdentityUpdate` | `UpdateCustomerIdentityUseCase` | REQUIRED | `BUYER_UPDATE` | Обновить full buyer/contact draft; eligibility facts формируются отдельно |
| `checkoutCustomerNoteUpdate` | `UpdateCustomerNoteUseCase` | NOT USED | — | Note не входит в pipeline input и сохраняется CAS mutation без recalculation |
| `checkoutLanguageCodeUpdate` | `UpdateLanguageCodeUseCase` | REQUIRED | `LOCALE_UPDATE` | Изменить locale, влияющую на localized merchandise/options/methods |
| `checkoutCurrencyCodeUpdate` | `UpdateCurrencyCodeUseCase` | REQUIRED | `CURRENCY_UPDATE` | Изменить currency и полностью пересчитать monetary snapshot |
| `checkoutDeliveryAddressesAdd` | `AddDeliveryAddressUseCase` | REQUIRED | `DELIVERY_ADDRESS_UPDATE` | Одним batch добавить destinations/addresses и line assignments |
| `checkoutDeliveryAddressesUpdate` | `UpdateDeliveryAddressUseCase` | REQUIRED | `DELIVERY_ADDRESS_UPDATE` | Одним batch изменить addresses |
| `checkoutDeliveryAddressesRemove` | `RemoveDeliveryAddressUseCase` | REQUIRED | `DELIVERY_ADDRESS_UPDATE` | Одним batch удалить destinations и сбросить затронутые selections |
| `checkoutDeliveryMethodUpdate` | `UpdateDeliveryGroupMethodUseCase` | REQUIRED | `DELIVERY_OPTION_UPDATE` | Записать selected option handle + customer input в intent |
| `checkoutDeliveryRecipientsAdd` | `UpdateDeliveryGroupRecipientUseCase` | REQUIRED | `DELIVERY_RECIPIENT_UPDATE` | Одним batch добавить contact identity к destinations |
| `checkoutDeliveryRecipientsUpdate` | `UpdateDeliveryGroupRecipientUseCase` | REQUIRED | `DELIVERY_RECIPIENT_UPDATE` | Одним batch изменить contact identity |
| `checkoutDeliveryRecipientsRemove` | `RemoveDeliveryGroupRecipientUseCase` | REQUIRED | `DELIVERY_RECIPIENT_UPDATE` | Одним batch удалить contact identity |
| `checkoutPromoCodeAdd` | `AddPromoCodeUseCase` | REQUIRED | `DISCOUNT_CODES_UPDATE` | Добавить normalized code intent; Pricing определяет resolution |
| `checkoutPromoCodeRemove` | `RemovePromoCodeUseCase` | REQUIRED | `DISCOUNT_CODES_UPDATE` | Удалить code intent независимо от прошлой resolution |
| `checkoutPaymentMethodUpdate` | `UpdatePaymentMethodUseCase` | REQUIRED | `PAYMENT_METHOD_UPDATE` | Записать selected method handle + customer input в intent |
| `checkoutTagCreate` | `CreateCheckoutTagUseCase` | NOT USED | — | Tag definition не входит в pipeline contracts; CAS-only mutation |
| `checkoutTagUpdate` | `UpdateCheckoutTagUseCase` | NOT USED | — | Tag definition/uniqueness не меняет canonical pricing input |
| `checkoutTagDelete` | `DeleteCheckoutTagUseCase` | NOT USED | — | Удалить tag definition и line references атомарно без recalculation |

Добавить в `CheckoutPipelineChange` новые значения:

```ts
| "LINES_CLEAR"
| "LOCALE_UPDATE"
| "DELIVERY_RECIPIENT_UPDATE"
```

Не маскировать эти операции существующими значениями: `change` входит в
`resultRevision` и должен точно описывать mutation.

Если в будущем note или tag facts добавляются в Pricing, Delivery, Payments или
App validation input, соответствующая mutation в той же версии контракта
переводится в `REQUIRED`.

## Application Contracts

### CheckoutMutationDraft

Добавить checkout-owned mutable draft, который содержит user-owned persisted
intent/metadata и контекст, необходимый для построения pipeline request:

```ts
interface CheckoutMutationDraft {
  checkoutId: string;
  storeId: string;
  version: number;
  currencyCode: string;
  localeCode: string | null;
  /** Canonical sales channel used by pipeline context. */
  channelCode: string;
  /** Checkout-owned integration metadata; it is persisted but not sent to pipeline stages. */
  externalSource: string | null;
  externalId: string | null;
  buyerIdentity: CheckoutBuyerIdentityDraft | null;
  cartIntent: CheckoutCartIntent;
  customerNote: string | null;
  tags: readonly CheckoutTagDefinition[];
  lineTagAssignments: readonly CheckoutLineTagAssignment[];
}

interface CheckoutBuyerIdentityDraft {
  customerId: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  marketId: string | null;
  companyId: string | null;
  data: CheckoutPipelineJsonObject | null;
}

interface CheckoutLineTagAssignment {
  lineId: string;
  tagId: string;
}
```

Draft не содержит trusted quoted price, availability, discount applications,
delivery options, payment methods или validation operations. Эти данные всегда
заменяются результатом текущего pipeline run.

Draft также не содержит Customers-owned `segmentIds` или
`segmentMembershipRevision`. `buyerIdentity` хранит только Checkout-owned
identity/contact intent. Derived eligibility живёт только в пределах одной
pipeline attempt и не участвует в persisted draft или no-op comparison.

`channelCode`, `externalSource` и `externalId` — разные поля. `channelCode`
заполняет pipeline `context.channelCode`; `externalSource` и `externalId` не
попадают в pipeline request, но без потерь проходят через create draft и
commit/read snapshot. Запрещено выводить `channelCode` из `externalSource` или
терять external metadata при переходе use cases на coordinator.

Line draft хранит:

- stable `lineId`;
- Catalog `variantId`, а не product ID и не старый snapshot identity;
- `componentSelection`;
- quantity и purchase intent;
- line attributes;
- ordered children.

`lineTagAssignments` является Checkout-owned intent и не кодируется внутрь
pipeline `attributes`. Loader восстанавливает assignments без потерь, add/replace
сохраняют их для stable source `lineId`, line deletion удаляет assignments, а
tag deletion атомарно удаляет definition и все ссылки. Изменение tag definition
не запускает pipeline, пока tags не входят в Pricing/Delivery/Payments/Validation
contracts.

Delivery/payment selection intent хранит opaque handle и submitted
`customerInput`. Use case не проверяет handle по старому persisted list: новый
Delivery/Payments result parser возвращает `SELECTED` или canonical `RESET`.

### Mutation snapshot loader

Добавить application port:

```ts
interface CheckoutMutationSnapshotPort {
  load(input: {
    checkoutId: string;
    storeId: string;
  }): Promise<CheckoutMutationSnapshot | null>;
}
```

Snapshot должен позволять без default/guess восстановить весь draft. Запрещены
текущие placeholders `version: 1`, пустой `idempotencyKey`, подмена отсутствующих
полей, смешивание `channelCode` с `externalSource`, потеря `externalId` и
реконструкция selected handles из display code/provider.

### Verified Storefront execution identity

`CheckoutMutationExecutionContext` получает Headless identity только из
проверенного `ContextStorefrontAccess`:

```ts
interface CheckoutStorefrontExecutionIdentity {
  connectionId: string;
  installationId: string;
  credentialId: string;
  accessMode: "PUBLIC" | "PRIVATE";
}

interface CheckoutMutationExecutionContext {
  storeId: string;
  storefrontAccess: CheckoutStorefrontExecutionIdentity;
  // request/customer/runtime fields defined by the corresponding boundaries
}
```

GraphQL resolver/context mapper передаёт эти значения из verified signed
Storefront context. DTO, GraphQL input и arbitrary headers не могут задавать или
переопределять `storeId`, `connectionId`, `installationId`, `credentialId` либо
`accessMode`. Legacy checkout field `apiKey`, которое фактически содержит
`credentialId`, удаляется из context и application commands вместо
переименования или сохранения compatibility alias.

### Request factory

Добавить `CheckoutRecalculationRequestFactory`. Factory:

- генерирует `executionId` и `correlationId` один раз на mutation attempt;
- использует один immutable `effectiveAt`;
- выставляет `requestedAt` и `deadlineAt` из injected runtime/policy;
- использует draft version как `expectedCheckoutVersion`;
- получает buyer eligibility snapshot через отдельный port, когда
  `buyerIdentity.customerId` non-null;
- собирает новый `CheckoutPipelineBuyer` из persisted `buyerIdentity` и
  eligibility, полученного на том же `effectiveAt`;
- не копирует API DTO или read-model row через spread;
- в конце вызывает `parseCheckoutRecalculationRequest`.

Eligibility resolution является pre-pipeline dependency и использует тот же
overall mutation deadline. Нельзя вычислять segment membership локально из
checkout tables.

Buyer assembly имеет единственную нормативную семантику:

- если `buyerIdentity === null`, pipeline `context.buyer` равен `null`;
- если `buyerIdentity.customerId === null`, factory переносит identity/contact
  fields и выставляет `segmentIds: []`, `segmentMembershipRevision: null`; это
  anonymous buyer semantics, а не fallback после Customers failure;
- если `buyerIdentity.customerId` non-null, factory обязан получить успешный
  same-customer eligibility result и добавить его `segmentIds` и
  `segmentMembershipRevision`;
- Customers negative/transport/timeout result не создаёт
  `CheckoutPipelineBuyer` с пустыми segments и запрещает pipeline/commit;
- eligibility snapshot не записывается обратно в draft и checkout tables.

Готовый production handler
`CustomersCheckoutActions.resolveBuyerEligibility` поверх Customers-owned
segment membership read boundary является внешним prerequisite. В рамках этого
плана Checkout реализует только `BrokerCustomersCheckoutEligibilityAdapter`,
проверяет `storeId`, `customerId` и `effectiveAt` результата и преобразует typed
negative result в sanitized pre-pipeline failure. Unknown transport/provider
failures не подменяются пустым segment set.

### Storefront line input contract

Публичное имя `purchasableId` сохраняется. В checkout storefront API оно имеет
строгое значение: Global ID сущности Catalog Variant. DTO/resolver обязан
декодировать его с ожидаемым entity type `Variant`; decoded UUID передаётся в
draft как `variantId`. Product IDs и Global IDs других entity отклоняются до
coordinator.

Для root и child inputs:

- сохранить поле `purchasableId: ID!` для API consistency;
- удалить trusted `purchasableSnapshot` из GraphQL schema, generated types, DTO и
  use-case commands;
- добавить optional `purchase` (`ONE_TIME` либо `SUBSCRIPTION` с обязательным
  `sellingPlanId`) и optional JSON `attributes`;
- отсутствие `purchase` нормализуется в
  `{ type: "ONE_TIME", sellingPlanId: null }`, отсутствие `attributes` — в `{}`;
- child `purchasableId` также обязан быть Variant ID, а `componentItemId`
  остаётся отдельной Catalog component identity;
- `checkoutLinesReplace.purchasableId` декодируется по тому же правилу и меняет
  только source line `variantId`, не принимает старый quoted snapshot.

GraphQL naming `purchasableId` не переносится во внутренние pipeline contracts:
после transport boundary application/domain code использует только `variantId`.

Нормативное расширение input:

```graphql
enum CheckoutLinePurchaseType {
  ONE_TIME
  SUBSCRIPTION
}

input CheckoutLinePurchaseInput {
  type: CheckoutLinePurchaseType!
  sellingPlanId: ID
}

input CheckoutLineAddInput {
  purchasableId: ID!
  quantity: Int!
  purchase: CheckoutLinePurchaseInput
  attributes: JSON
  tagSlug: String
  children: [CheckoutChildLineInput!]
}
```

DTO/domain validation требует `sellingPlanId` только для `SUBSCRIPTION` и
запрещает его для `ONE_TIME`. Если `sellingPlanId` также является Global ID,
resolver декодирует его с ожидаемым Catalog SellingPlan entity type.

### Coordinator contract

```ts
interface CheckoutMutationCoordinator {
  execute<T>(input: {
    checkoutId: string;
    storeId: string;
    change: CheckoutPipelineChange;
    context: CheckoutMutationExecutionContext;
    apply(draft: CheckoutMutationDraft): T;
  }): Promise<CheckoutMutationCommit<T>>;

  create<T>(input: {
    reservation: CheckoutCreateIdempotencyReservation;
    context: CheckoutMutationExecutionContext;
    createDraft(
      reservation: CheckoutCreateIdempotencyReservation,
    ): CheckoutMutationDraft;
    value: T;
  }): Promise<CheckoutMutationCommit<T>>;
}
```

Для create добавить `CheckoutCreateIdempotencyPort` с операциями reserve/load и
transactional commit. Результат reserve различает `RESERVED`, `IN_PROGRESS`,
`RETRYABLE_FAILED`, `FINAL_FAILED`, `COMMITTED` и `KEY_REUSED`. `create()`
получает уже зарезервированные
`idempotencyIdentity`, `requestHash`, `checkoutId` и generated child IDs; он не
генерирует и не переопределяет их самостоятельно.

`CheckoutCreateIdempotencyReservation` содержит identity scope, request hash,
checkout ID и ordered generated IDs для всех initial lines, children, tags и
destinations. Identity scope содержит trusted `storeId` и `connectionId`, а
reservation отдельно сохраняет audit-only `initiatingCredentialId` из verified
Storefront context. Для `COMMITTED` port возвращает committed checkout snapshot;
для `FINAL_FAILED` — сохранённую sanitized failure; для живого `IN_PROGRESS`
coordinator немедленно возвращает typed retryable error.

`apply` является синхронной pure domain operation: без SQL, broker calls, clock
reads и random ID generation. Все IDs генерируются до вызова coordinator либо
через заранее подготовленный mutation command.

Для NOT USED mutations добавить отдельный `executeWithoutRecalculation()` с тем
же loader/CAS/transaction contract. Он не должен создавать fake pipeline result
или менять last successful pipeline revisions.

## Coordinator Algorithm

### Existing checkout

1. Проверить transport DTO до coordinator.
2. Загрузить mutation snapshot по `{ checkoutId, storeId }`.
3. Вернуть not-found/forbidden без раскрытия cross-store checkout.
4. Скопировать snapshot в draft без мутации исходного объекта.
5. Выполнить domain `apply(draft)` и проверить draft invariants.
6. Если canonical intent не изменился, вернуть current checkout без pipeline и
   version increment.
7. Получить buyer eligibility и собрать request.
8. Выполнить pipeline один раз.
9. Если любой outcome не `SUCCESS`, выбросить sanitized mutation failure и
   ничего не сохранять; `validation.data.valid === false` при successful
   Validation не является failure.
10. Проверить полный result через `parseCheckoutRecalculationResult`.
11. В одной DB transaction вызвать CAS commit для `expectedVersion`.
12. Если CAS не прошёл, удалить результат из control flow и вернуть
    `CHECKOUT_VERSION_CONFLICT`, `retryable: true`.
13. Вернуть committed snapshot без отдельного non-transactional reread.

### Create checkout

1. Resolver валидирует обязательный `idempotencyKey` и transport input; application
   boundary нормализует input, вычисляет `requestHash` и резервирует idempotency
   identity.
2. Для новой identity application boundary один раз формирует
   checkout/line/tag/destination IDs и сохраняет их в idempotency record.
3. Один create use case строит draft с initial lines и exact normalized
   `channelCode`, `externalSource`, `externalId`; отдельный
   `addCheckoutLines.execute()` больше не вызывается.
4. Pipeline запускается с `expectedCheckoutVersion: 0` и `change: "CREATE"`.
5. Успешный pipeline result, включая `valid: false`, сохраняется одним insert
   transaction как version `1`.
6. Та же transaction переводит idempotency record в `COMMITTED` и связывает его
   с checkout version `1`.
7. Replay с тем же hash возвращает этот committed snapshot без нового pipeline;
   concurrent `IN_PROGRESS` request не создаёт вторую попытку.

### Batch mutations

`checkoutDeliveryAddressesAdd/Update/Remove` и
`checkoutDeliveryRecipientsAdd/Update/Remove` больше не вызывают child use case в
цикле. Полный input array применяется к одному draft. Ошибка любого элемента
отклоняет весь batch до pipeline. На batch приходится один executionId, один
pipeline run, один version increment и один commit.

## Persistence Model

### Required state

Persistence должна без потерь хранить:

- current checkout `version`;
- canonical `channelCode` и checkout-owned `externalSource`/`externalId`;
- Checkout-owned buyer identity/contact fields без Customers-owned segment IDs
  и membership revision;
- cart intent lines, hierarchy, component selection, purchase intent и
  attributes;
- checkout tag definitions и explicit line-to-tag assignments;
- ordered discount code intents, включая rejected codes;
- destinations, full address/contact fields и line assignments;
- selected delivery option handles и customer input;
- selected payment method handle и customer input;
- canonical quoted lines and availability;
- discount applications/resolutions и totals;
- delivery groups/options/resolutions;
- payment methods/resolution;
- validation operations, `valid` и `bindingSetRevision`;
- preliminary, delivery, final quote, payment, validation и result revisions;
- create idempotency identity с Headless `connectionId`, audit-only initiating
  `credentialId`, request hash, reserved generated IDs, status и committed
  checkout/version reference.

Не использовать `checkout_applied_discounts` как discount-code intent: rejected
и pending codes также обязаны сохраняться. Не использовать provider/code pair
как selection identity: pipeline contract использует opaque handle.

### CAS commit port

```ts
interface CheckoutRecalculationCommitPort {
  commit(input: {
    storeId: string;
    checkoutId: string;
    expectedVersion: number;
    nextVersion: number;
    draft: CheckoutMutationDraft;
    result: CheckoutRecalculationResult;
  }): Promise<
    | { status: "COMMITTED"; checkout: CheckoutCommittedSnapshot }
    | { status: "VERSION_CONFLICT" }
  >;
}
```

Implementation открывает transaction только после pipeline completion:

1. conditional update checkout root по `id + store_id + version`;
2. если affected rows не равен `1`, rollback и вернуть conflict;
3. заменить intent rows и canonical projections текущей version;
4. сохранить validation operations в исходном порядке;
5. сохранить revisions;
6. commit;
7. собрать `CheckoutCommittedSnapshot` из записанных значений в этой же
   transaction или из переданных parsed values, но не выполнять race-prone
   reread после commit.

Для create transaction начинает с insert root version `1`; conflict по checkout
ID не превращается в update существующей корзины. Conflict по idempotency
identity разрешается только через предварительно проверенный same-hash replay;
чужой store/Headless connection scope никогда не читается и не возвращается.

### Schema changes

Создать checkout migration без backfill:

- добавить real non-null `version` без database default;
- сохранить отдельные root columns/mapping для `channelCode`, `externalSource`
  и `externalId`; существующие external metadata columns не удалять и не
  объединять с sales channel;
- сохранить buyer identity/contact columns как draft intent; не добавлять
  persistence для `segmentIds` или `segmentMembershipRevision`;
- добавить current pipeline revision columns либо отдельную one-to-one current
  snapshot table;
- добавить ordered discount-code intent storage;
- добавить/нормализовать checkout-owned tag definitions и line-to-tag assignment
  storage с foreign keys и atomic cascade policy;
- хранить opaque delivery/payment handles и customer input;
- добавить недостающие purchase/attributes fields для line intent;
- добавить ordered validation operation storage;
- добавить constraints для store ownership, checkout/version uniqueness и
  child/destination relations;
- добавить в create idempotency record `connection_id` и audit-only
  `initiating_credential_id`; добавить unique constraint по
  `store_id + connection_id + operation + idempotency_key` и constraint, не
  допускающий разные `request_hash` для одной identity;
- удалить legacy checkout/idempotency `api_key`/`api_key_id` columns и naming;
  public/private credential value, digest, hint и key material не копировать в
  Checkout schema;
- удалить legacy columns/tables только после перевода reader/writer в той же
  change set; не оставлять dual source of truth.

Все SQL statements commit port выполняет через один transaction-capable
executor. Текущий цикл `execute.command()` не является допустимой atomic commit
реализацией.

## Mapping Pipeline Result to Committed Checkout

### Buyer identity and eligibility

- Buyer identity/contact сохраняется только из `draft.buyerIdentity`.
- `segmentIds` и `segmentMembershipRevision` используются только в immutable
  request текущей pipeline attempt и не копируются в committed checkout.
- Pipeline result и stage snapshots могут содержать revisions, вычисленные с
  eligibility facts, но не становятся источником buyer identity.

### Lines and money

- User intent lines сохраняются из draft.
- `purchasableId` существует только на GraphQL boundary; persistence и pipeline
  хранят decoded Catalog `variantId`.
- Tag definitions и line assignments сохраняются из checkout-owned draft и не
  извлекаются из Pricing quote либо line attributes.
- Display merchandise, availability и quoted monetary fields берутся только из
  `finalPricing.data.lines`.
- Source/transformed line mapping берётся из preliminary result; writer не
  предполагает identity между source и transformed IDs.
- Checkout subtotal, discounts, delivery, tax и grand total берутся только из
  `finalPricing.data.totals`.
- `CheckoutService.computeTotals()` удаляется из recalculating use cases и
  composition root, если у него не остаётся независимых consumers.

### Discounts

- Draft хранит submitted discount code intents.
- Persisted applications/resolutions полностью заменяются Pricing result.
- Rejected code не вызывает exception в promo use case; warning возвращается в
  checkout issues.
- Remove code работает по normalized intent, а не только по ранее applied
  discounts.

### Delivery

- Groups/options заменяются `delivery.data` целиком.
- `SELECTED` сохраняет canonical option handle/customer input.
- `RESET` очищает current selected handle, сохраняет reset reason в snapshot и
  возвращает соответствующую validation operation/issue.
- Orphaned selections не переносятся в новую current selection.
- Address и recipient PII остаются Checkout-owned intent; provider-facing
  private data из delivery result не публикуются GraphQL mapper без allowlist.

### Payment

- Available methods заменяются `payment.data.methods` целиком.
- `SELECTED` сохраняет canonical method handle/customer input.
- `RESET` очищает current selection и сохраняет reset reason.
- Provider-private method metadata не попадает в public GraphQL checkout без
  explicit mapper allowlist.

### Validation and issues

- Ordered operations и `valid` сохраняются из Validation result.
- `Checkout.issues` получает aggregate ordered pipeline issues без сведения к
  ограниченному `CheckoutNotificationCode`; `field` сохраняет path segments,
  `lineId` кодируется как storefront Global ID только в GraphQL mapper.
- `Checkout.version`, `resultRevision`, `valid` и `issues` читаются из committed
  snapshot одинаково для mutation response и query.
- Internal `cause`, stack, function configuration, execution routes и private
  provider payloads не сохраняются в public read projection.
- Execution trace логируется structured logger с checkout/store/execution IDs;
  PII и complete function input не логируются.

## Ports and Runtime Assembly

### Checkout outbound adapters

Добавить checkout infrastructure adapters:

- `BrokerPricingCheckoutAdapter` →
  `PricingCheckoutActions.calculatePreliminaryQuote/finalizeQuote`;
- `BrokerDeliveryCheckoutAdapter` → `DeliveryCheckoutActions.calculateOptions`;
- `BrokerPaymentsCheckoutAdapter` →
  `PaymentsCheckoutActions.getAvailableMethods`;
- `BrokerCustomersCheckoutEligibilityAdapter` →
  `CustomersCheckoutActions.resolveBuyerEligibility`.

Adapters передают уже parsed request, не меняют его, преобразуют transport
rejection в validated `CheckoutPipelineStageError` и не дублируют
request-relative response parsing, который выполняет pipeline.

Реализация provider-side Pricing, Delivery, Payments и Customers eligibility
actions не входит в этот план. Checkout adapters, contract tests и IoC wiring
реализуются независимо через typed mocks. Реальные actions обязательны только
перед end-to-end acceptance и включением pipeline-backed mutations в runtime;
production нельзя запускать с fake/empty handlers.

### Commerce Functions

В checkout composition root:

1. создать `FunctionTargetRegistry` с
   `CHECKOUT_VALIDATION_FUNCTION_TARGET_DEFINITION`;
2. создать real `CommerceFunctionRunner` с route resolver/invoker;
3. реализовать `CheckoutValidationBindingSource` поверх Apps control-plane read
   boundary;
4. создать `CheckoutValidationRunner`;
5. передать runner в `CheckoutPipeline`.

Пустой binding set использует `EmptyCheckoutValidationBindingSource` только в
unit tests. Production wiring не должен молча отключать App validation.

### IoC

Расширить `App.create()` и `CheckoutUsecase` dependencies:

- pipeline ports;
- checkout validation runner;
- `CheckoutPipeline`;
- mutation snapshot/commit repositories;
- request factory;
- mutation coordinator;
- buyer eligibility port;
- create idempotency port;
- deadline/runtime policy.

Use cases получают coordinator, а не concrete broker adapters и не собирают
pipeline самостоятельно. Resolver API не получает доступ к pipeline.

## Use Case Refactor

### Recalculating use cases

Для 19 REQUIRED mutations:

- сохранить существующую transport/domain validation, которая относится к
  самой команде;
- перенести изменение state в pure draft operation;
- удалить прямые calls к `CheckoutWriteRepository`;
- удалить `offers`, inventory placeholders, local pricing, promo result mocks и
  manual available-method validation;
- вызвать coordinator ровно один раз;
- вернуть coordinator committed snapshot/checkout ID по существующему GraphQL
  payload contract.

Use case не должен повторно загружать checkout после commit.

### CAS-only use cases

Customer note и tag mutations используют `executeWithoutRecalculation()`:

- real version check;
- одна transaction;
- один version increment только при фактическом изменении;
- pipeline revisions остаются прежними;
- tag deletion и очистка line tag references атомарны.

### Resolver cleanup

- `checkoutCreate` вызывает один create command с initial items.
- Address/recipient batch resolvers вызывают один batch use case.
- Удалить resolver-level orchestration и post-write loops.
- Resolver возвращает committed snapshot из use case; отдельный
  `checkoutReadRepository.findById()` после mutation удалить.
- Удалить `console.log` и логирование complete DTO с PII; logging использует
  identifiers и sanitized failure fields.

## Failure Semantics

Добавить checkout-owned application errors:

| Condition | Code | Retryable | Persistence |
| --- | --- | --- | --- |
| Checkout отсутствует в store | `CHECKOUT_NOT_FOUND` | false | none |
| Draft command invalid | domain-specific public code | false | none |
| Create key reused with another request hash | `CHECKOUT_IDEMPOTENCY_KEY_REUSED` | false | none |
| Create with same key/hash still running | `CHECKOUT_CREATE_IN_PROGRESS` | true | none |
| Create with same key/hash already committed | replay committed checkout | false | none |
| Pipeline stage failed | stage `failure.code` | из stage | no checkout commit; create idempotency failure state only |
| Pipeline stage skipped / canonical snapshot incomplete | `CHECKOUT_PIPELINE_INCOMPLETE` | из upstream issue | none |
| CAS affected 0 rows | `CHECKOUT_VERSION_CONFLICT` | true | none |
| Commit transaction failed | `CHECKOUT_COMMIT_FAILED` | true | rollback |
| Validation returned `valid: false` | не exception | false | commit |

GraphQL error mapper не раскрывает `cause`. Pipeline issues возвращаются как
checkout warnings/errors согласно public schema. На version conflict resolver не
возвращает stale pipeline result.

## Implementation Order

### External action plans and runtime rollout gate

Actions реализуются независимо по отдельным планам:

- [Pricing Checkout Actions](./pricing-checkout-actions-implementation-plan.md);
- [Delivery Checkout Action](./delivery-checkout-action-implementation-plan.md);
- [Payments Checkout Action](./payments-checkout-action-implementation-plan.md);
- [Customers Checkout Eligibility Action](./customers-checkout-eligibility-action-implementation-plan.md).

Они не блокируют реализацию Checkout adapters или IoC wiring. Rollout gate:
перед end-to-end acceptance и включением mutations broker registry содержит
реальные actions, а Checkout adapters получают contract-valid результаты для
empty cart, physical cart и payable/non-payable cart без fake data.

### Phase 1 — Public contracts

1. Расширить Storefront `Checkout` полями `version`, `resultRevision`, `valid` и
   `issues`; добавить `CheckoutIssue` enums/type.
2. Обновить generated GraphQL types и explicit public mapper без lossy mapping в
   `notifications`.
3. Обновить line inputs: оставить `purchasableId`, требовать Variant Global ID,
   удалить `purchasableSnapshot`, добавить purchase/attributes contract.
4. Заменить Storefront Delivery/Payment projection на canonical options,
   methods и explicit `NONE | SELECTED | RESET` selection objects; вернуть
   opaque handle для каждой option/method.
5. Перевести delivery/payment selection inputs на
   `optionHandle`/`methodHandle` + `customerInput`; удалить
   `provider + code` identity и legacy `data`.
6. Добавить обязательный `CheckoutCreateInput.idempotencyKey`.

Exit criteria: GraphQL contract может без потерь представить committed pipeline
state; все line commands содержат internal `variantId`; returned
delivery/payment handle без потерь передаётся в corresponding selection mutation.

### Phase 2 — Mutation persistence and CAS

1. Добавить schema migration без backfill.
2. Реализовать mutation snapshot loader.
3. Реализовать transaction-capable CAS commit repository.
4. Удалить hardcoded version и legacy default reconstruction.
5. Добавить persistence mapping для всего draft, включая отдельные
   `channelCode`, `externalSource`, `externalId`, и для всех stage snapshots.
6. Добавить tag definitions/line assignments storage и atomic tag cleanup.
7. Реализовать create idempotency reservation/replay storage и transactional
   переход в `COMMITTED`.

Exit criteria: два commit с одной expected version дают один `COMMITTED` и один
`VERSION_CONFLICT`; partial rows после rollback отсутствуют; concurrent create
с одной identity выполняет pipeline не более одного раза, а committed replay
возвращает тот же checkout.

### Phase 3 — Draft and request factory

1. Добавить draft contracts/invariants.
2. Добавить current-state-to-draft mapper, который без defaults восстанавливает
   `channelCode`, `externalSource`, `externalId` и `buyerIdentity` как отдельные
   Checkout-owned поля и не реконструирует Customers eligibility.
3. Заменить legacy `apiKey` execution context на verified
   `storefrontAccess`; использовать `connectionId` для create idempotency и
   `credentialId` только для audit.
4. Добавить pure operations для каждой mutation.
5. Добавить typed Customers buyer eligibility adapter.
6. Добавить request factory и new change enum values.

Exit criteria: каждый REQUIRED mutation строит parser-valid prospective request;
PII попадает только в разрешённые internal/delivery boundaries.

### Phase 4 — Runtime wiring

1. Добавить Pricing/Delivery/Payments/Customers checkout adapters и их contract
   tests с typed broker mocks.
2. Собрать Commerce Function registry/runner/binding source.
3. Создать validation runner и pipeline.
4. Создать mutation coordinator.
5. Передать coordinator всем use cases через `CheckoutUsecase`.

Exit criteria: production composition root не использует empty/fake ports, target
зарегистрирован ровно один раз.

### Phase 5 — Use cases and resolvers

1. Перевести create и line mutations.
2. Перевести discount/currency/locale/buyer mutations.
3. Перевести delivery/payment mutations.
4. Перевести note/tag mutations на CAS-only path.
5. Схлопнуть create и batch resolver orchestration.
6. Удалить старый `CheckoutService.computeTotals()` path и obsolete writer DTOs.
7. Удалить resolver-generated create idempotency key и client-provided
   purchasable snapshots.

Exit criteria: ни один recalculating use case не пишет checkout tables напрямую
и не вычисляет canonical totals локально.

### Phase 6 — Public read mapping and cleanup

1. Читать current committed version и canonical projections.
2. Маппить ordered pipeline issues, `valid`, `version` и `resultRevision` в
   расширенный GraphQL `Checkout`.
3. Удалить old code/provider selection assumptions.
4. Удалить obsolete repositories, DTOs и schema fields.
5. Обновить checkout architecture documentation.

Exit criteria: mutation response соответствует committed version без отдельного
reread; query сразу возвращает тот же result revision.

## Tests and Acceptance Criteria

### Coordinator unit tests

- pipeline вызывается после draft mutation и до commit;
- один REQUIRED mutation вызывает pipeline ровно один раз;
- stage `FAILED` запрещает commit;
- любой `SKIPPED` stage запрещает commit;
- Validation `valid: false` разрешает commit;
- no-op не вызывает pipeline и не увеличивает version;
- malformed draft/request не вызывает ports и commit;
- CAS conflict отбрасывает result и возвращает retryable error;
- coordinator не повторяет pipeline автоматически;
- execution/effective/deadline context стабилен в пределах mutation;
- internal causes и PII отсутствуют в public errors/log assertions.
- create replay с тем же key/hash не вызывает pipeline повторно;
- create key reuse с другим hash отклоняется до pipeline.
- retryable create failure сохраняет IDs и допускает только CAS reacquire той же
  identity; final failure replay-ится без pipeline;
- живой `IN_PROGRESS` и expired lease различаются injected clock/policy.

### Mutation matrix tests

Для всех 23 mutations добавить table-driven coverage:

- 19 REQUIRED имеют exact change type и один recalculation;
- 4 NOT USED никогда не вызывают pipeline;
- `LINES_CLEAR`, `LOCALE_UPDATE`, `DELIVERY_RECIPIENT_UPDATE` входят в result
  revision payload;
- initial create lines обрабатываются одним `CREATE`, без второго mutation;
- public `purchasableId` принимается только как Variant Global ID и до draft
  преобразуется в `variantId`;
- client не может передать trusted purchasable snapshot;
- address/recipient arrays применяются одним batch;
- rejected promo code сохраняется как intent и warning, а не exception;
- delivery/payment invalid handle сохраняет canonical RESET;
- Storefront options/methods возвращают exact canonical handles, а selection
  mutations принимают только handle, не `provider + code`;
- selection projection не сводит `RESET` к `NONE` и возвращает exact previous
  handle и sanitized reset reason;
- line delete/update cascades children до построения request;
- tag definitions и line assignments сохраняются, а tag delete атомарно очищает
  assignments без pipeline run;
- currency/locale/buyer changes проходят полный pipeline;
- buyer identity change получает fresh eligibility и request factory объединяет
  их в `CheckoutPipelineBuyer`, не изменяя draft derived facts;
- empty/zero-payable checkout сохраняется с корректной readiness.

### Persistence tests

- real version загружается без hardcoded defaults;
- update использует `id + storeId + expectedVersion`;
- конкурентные commits не перезаписывают друг друга;
- transaction rollback не оставляет lines/options/methods/revisions частично;
- rejected/pending discount intents переживают reload;
- opaque selection handles/customer input переживают reload;
- ordered validation operations переживают reload без перестановки;
- tag definitions и line-to-tag assignments переживают reload без кодирования в
  pipeline attributes;
- buyer identity/contact переживает reload, а `segmentIds` и
  `segmentMembershipRevision` в checkout persistence отсутствуют;
- committed revisions точно равны pipeline result;
- cross-store load/commit невозможен;
- concurrent create с одной identity создаёт только одну корзину;
- replay с тем же key/hash возвращает тот же checkout/version;
- reuse ключа с другим hash возвращает `CHECKOUT_IDEMPOTENCY_KEY_REUSED`;
- replay после credential rotation в той же `connectionId` возвращает тот же
  checkout, а тот же key в другой connection является другой identity;
- `credentialId` сохраняется только как audit metadata и не участвует в unique
  identity; public/private token material в Checkout rows отсутствует;
- idempotency `COMMITTED` и checkout insert коммитятся либо откатываются вместе;
- create и последующий snapshot reload сохраняют exact `channelCode`,
  `externalSource` и `externalId`, включая `null` external values;
- retryable/final failure states не публикуют checkout и корректно replay/reacquire;
- expired `IN_PROGRESS` lease может быть перехвачен только одним same-hash retry.

### Adapter and integration tests

- exact broker action names и request payloads;
- Customers eligibility action возвращает snapshot на том же `effectiveAt`, а
  typed/unknown failures не подменяются пустыми segments;
- authenticated buyer request содержит exact fresh segment IDs/revision, а
  anonymous buyer получает empty/null eligibility без вызова Customers;
- typed/unknown broker failures проходят canonical sanitization;
- общий deadline включает validation binding load и App execution;
- real target definition зарегистрирован;
- empty active binding set не вызывает generic runner;
- GraphQL mutation response и последующий query имеют одинаковые version,
  totals, selections, `valid`, ordered issues и result revision;
- mutation не выполняет post-commit race-prone reread;
- batch mutation атомарна при ошибке любого элемента.

### Static completion checks

- нет `new Map<string, any>()` offers placeholders в checkout mutations;
- нет `checkoutService.computeTotals()` в recalculating use cases;
- нет direct checkout write calls из REQUIRED use cases;
- нет hardcoded `version: 1` в read mapping;
- нет resolver loops, выполняющих несколько checkout writes на один GraphQL
  mutation;
- нет resolver-generated random idempotency key для `checkoutCreate`;
- нет legacy `apiKey`/`apiKeyId` в checkout application/context/persistence
  contracts; используется verified `storefrontAccess`;
- нет `purchasableSnapshot` в storefront line input/DTO/use-case path;
- нет `shippingMethodCode`, `paymentMethodCode` и selection `provider` в
  delivery/payment mutation input/DTO/use-case path;
- public delivery/payment options и methods имеют non-empty opaque handle;
- нет `console.log` в checkout mutation path;
- нет production `EmptyCheckoutValidationBindingSource`;
- нет backfill, dual-write и legacy fallback.

Test/build/tsc не запускать в рамках написания этого плана согласно
`AGENTS.md`. Во время реализации использовать `shopana-cli` MCP tools и запускать
build только когда действительно нужна новая версия кода.

## Definition of Done

План выполнен, когда:

1. все 19 REQUIRED mutations проходят через один coordinator/pipeline execution;
2. все 4 NOT USED mutations используют versioned CAS-only commit;
3. create и batch mutations атомарны;
4. pipeline result сохраняется только при совпавшей expected version;
5. current checkout state полностью восстанавливает следующий pipeline request;
6. Pricing/Delivery/Payments/Validation outputs являются единственным canonical
   источником calculated checkout state;
7. validation-invalid checkout сохраняется, stage-failed checkout — нет;
8. GraphQL mutation возвращает именно committed version без дополнительного
   reread;
9. public GraphQL checkout без потерь возвращает `valid`, ordered pipeline
   issues и result revision;
10. create idempotency поддерживает safe replay и запрещает key reuse с другим
    request hash;
11. public `purchasableId` строго декодируется в internal Catalog `variantId`, а
    tag assignments полностью восстанавливаются из checkout persistence;
12. create и snapshot reload без потерь сохраняют отдельные `channelCode`,
    `externalSource` и `externalId`;
13. persisted draft хранит только buyer identity/contact, а Customers-owned
    segment IDs/revision существуют только в request текущей pipeline attempt;
14. create idempotency scoped по stable Headless `connectionId`, переживает
    credential rotation и не хранит public/private token material;
15. старая mutation-local pricing/promo/selection логика удалена;
16. вся mutation matrix, CAS, rollback, adapter и PII boundary test matrix
    написана и успешно выполняется.

## Non-Goals

- Реализация внутренних Pricing preliminary/final quote engines.
- Реализация Delivery planning/rating engine и provider rate fan-out.
- Реализация Payments available-method resolution engine.
- Реализация Customers `resolveCheckoutBuyerEligibility` provider handler.
- Checkout completion и создание Order.
- Discount usage reservation при order placement.
- Payment session/collection lifecycle.
- Delivery shipment/fulfillment lifecycle.
- DBOS workflow и automatic retry orchestration.
- Cooperative cancellation внешних stage calls.
- Добавление note/tag facts в pipeline inputs без отдельного contract design.
- Backward compatibility, data backfill, dual-read или dual-write.
