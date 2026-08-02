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
  root. Provider-side checkout actions в соответствующих сервисах остаются
  scaffolding и должны быть реально зарегистрированы до включения интеграции.
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
6. отклоняет технический `FAILED` outcome;
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

Любой stage `FAILED` означает, что canonical snapshot не получен. Mutation не
сохраняется. `STOP` issue в успешной Validation stage не откатывает mutation.

### CAS is mandatory

Для существующего checkout pipeline request использует реальную текущую
`expectedCheckoutVersion = V`. Commit обязан выполнить условный переход
`V → V + 1`. Если checkout уже имеет другую version, весь pipeline result
отбрасывается и наружу возвращается typed retryable conflict. Автоматический
повтор pipeline в v1 не выполняется.

Для `CREATE` draft имеет `expectedCheckoutVersion: 0`; успешный atomic insert
создаёт version `1`. Checkout ID, line IDs, destination IDs и idempotency identity
создаются до pipeline и не меняются во время одной попытки.

### No compatibility layer or backfill

Проект не содержит production data. Persistence contracts и tables изменяются
на canonical модель напрямую. Legacy columns/DTO paths, которые дублируют новый
snapshot, удаляются в той же серии изменений. Миграции не выполняют backfill и
не поддерживают чтение старого формата.

## Mutation Coverage Matrix

В текущем Storefront GraphQL API 23 checkout mutations. Pipeline применяется к
19 из них.

| GraphQL mutation | Use case | Pipeline | `CheckoutPipelineChange` | Draft change |
| --- | --- | --- | --- | --- |
| `checkoutCreate` | `CreateCheckoutUseCase` | REQUIRED | `CREATE` | Создать checkout draft сразу с initial lines, tags, currency, locale и channel |
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

Добавить checkout-owned mutable draft, который содержит только user-owned
intent и контекст, необходимый для построения pipeline request:

```ts
interface CheckoutMutationDraft {
  checkoutId: string;
  storeId: string;
  version: number;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  buyer: CheckoutPipelineBuyer | null;
  cartIntent: CheckoutCartIntent;
  customerNote: string | null;
  tags: readonly CheckoutTagDefinition[];
}
```

Draft не содержит trusted quoted price, availability, discount applications,
delivery options, payment methods или validation operations. Эти данные всегда
заменяются результатом текущего pipeline run.

Line draft хранит:

- stable `lineId`;
- Catalog `variantId`, а не product ID и не старый snapshot identity;
- `componentSelection`;
- quantity и purchase intent;
- line attributes;
- ordered children.

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
полей и реконструкция selected handles из display code/provider.

### Request factory

Добавить `CheckoutRecalculationRequestFactory`. Factory:

- генерирует `executionId` и `correlationId` один раз на mutation attempt;
- использует один immutable `effectiveAt`;
- выставляет `requestedAt` и `deadlineAt` из injected runtime/policy;
- использует draft version как `expectedCheckoutVersion`;
- получает buyer eligibility snapshot через отдельный port, когда buyer связан с
  customer;
- не копирует API DTO или read-model row через spread;
- в конце вызывает `parseCheckoutRecalculationRequest`.

Eligibility resolution является pre-pipeline dependency и использует тот же
overall mutation deadline. Нельзя вычислять segment membership локально из
checkout tables.

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
    checkoutId: string;
    idempotencyKey: string;
    context: CheckoutMutationExecutionContext;
    createDraft(): CheckoutMutationDraft;
    value: T;
  }): Promise<CheckoutMutationCommit<T>>;
}
```

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
9. Если любой outcome `FAILED`, выбросить sanitized mutation failure и ничего не
   сохранять.
10. Проверить полный result через `parseCheckoutRecalculationResult`.
11. В одной DB transaction вызвать CAS commit для `expectedVersion`.
12. Если CAS не прошёл, удалить результат из control flow и вернуть
    `CHECKOUT_VERSION_CONFLICT`, `retryable: true`.
13. Вернуть committed snapshot без отдельного non-transactional reread.

### Create checkout

1. Resolver валидирует create input и заранее формирует checkout/line/tag IDs.
2. Один create use case строит draft с initial lines; отдельный
   `addCheckoutLines.execute()` больше не вызывается.
3. Pipeline запускается с `expectedCheckoutVersion: 0` и `change: "CREATE"`.
4. Успешный pipeline result, включая `valid: false`, сохраняется одним insert
   transaction как version `1`.
5. Unique checkout ID и idempotency key защищают от повторного insert. Random
   idempotency key в resolver запрещён; ключ должен приходить из request contract
   или вычисляться сервером из stable request identity.

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
- cart intent lines, hierarchy, component selection, purchase intent и
  attributes;
- ordered discount code intents, включая rejected codes;
- destinations, full address/contact fields и line assignments;
- selected delivery option handles и customer input;
- selected payment method handle и customer input;
- canonical quoted lines and availability;
- discount applications/resolutions и totals;
- delivery groups/options/resolutions;
- payment methods/resolution;
- validation operations, `valid` и `bindingSetRevision`;
- preliminary, delivery, final quote, payment, validation и result revisions.

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
ID/idempotency key не превращается в update существующей чужой корзины.

### Schema changes

Создать checkout migration без backfill:

- добавить real non-null `version` без database default;
- добавить current pipeline revision columns либо отдельную one-to-one current
  snapshot table;
- добавить ordered discount-code intent storage;
- хранить opaque delivery/payment handles и customer input;
- добавить недостающие purchase/attributes fields для line intent;
- добавить ordered validation operation storage;
- добавить constraints для store ownership, checkout/version uniqueness и
  child/destination relations;
- удалить legacy columns/tables только после перевода reader/writer в той же
  change set; не оставлять dual source of truth.

Все SQL statements commit port выполняет через один transaction-capable
executor. Текущий цикл `execute.command()` не является допустимой atomic commit
реализацией.

## Mapping Pipeline Result to Committed Checkout

### Lines and money

- User intent lines сохраняются из draft.
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
- Public mutation payload получает aggregate ordered pipeline issues.
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
  `PaymentsCheckoutActions.getAvailableMethods`.

Adapters передают уже parsed request, не меняют его, преобразуют transport
rejection в validated `CheckoutPipelineStageError` и не дублируют
request-relative response parsing, который выполняет pipeline.

До wiring Checkout необходимо реализовать и зарегистрировать provider-side
actions в Pricing, Delivery и Payments. Нельзя включать checkout mutation
integration с fake/empty handlers.

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
| Pipeline stage failed | stage `failure.code` | из stage | none |
| CAS affected 0 rows | `CHECKOUT_VERSION_CONFLICT` | true | none |
| Commit transaction failed | `CHECKOUT_COMMIT_FAILED` | true | rollback |
| Validation returned `valid: false` | не exception | false | commit |

GraphQL error mapper не раскрывает `cause`. Pipeline issues возвращаются как
checkout warnings/errors согласно public schema. На version conflict resolver не
возвращает stale pipeline result.

## Implementation Order

### Phase 1 — Complete external stage providers

1. Реализовать Pricing preliminary/final quote handlers.
2. Реализовать Delivery calculate-options handler.
3. Реализовать Payments available-methods handler.
4. Зарегистрировать broker action names из `@shopana/broker-types`.
5. Добавить provider contract tests с request/result parsers.

Exit criteria: Checkout adapters могут получить contract-valid результаты для
empty cart, physical cart и payable/non-payable cart без fake data.

### Phase 2 — Mutation persistence and CAS

1. Добавить schema migration без backfill.
2. Реализовать mutation snapshot loader.
3. Реализовать transaction-capable CAS commit repository.
4. Удалить hardcoded version и legacy default reconstruction.
5. Добавить persistence mapping для intent и всех stage snapshots.

Exit criteria: два commit с одной expected version дают один `COMMITTED` и один
`VERSION_CONFLICT`; partial rows после rollback отсутствуют.

### Phase 3 — Draft and request factory

1. Добавить draft contracts/invariants.
2. Добавить current-state-to-draft mapper.
3. Добавить pure operations для каждой mutation.
4. Добавить buyer eligibility adapter.
5. Добавить request factory и new change enum values.

Exit criteria: каждый REQUIRED mutation строит parser-valid prospective request;
PII попадает только в разрешённые internal/delivery boundaries.

### Phase 4 — Runtime wiring

1. Добавить Pricing/Delivery/Payments checkout adapters.
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

Exit criteria: ни один recalculating use case не пишет checkout tables напрямую
и не вычисляет canonical totals локально.

### Phase 6 — Public read mapping and cleanup

1. Читать current committed version и canonical projections.
2. Маппить validation issues/warnings в GraphQL payload.
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
- Validation `valid: false` разрешает commit;
- no-op не вызывает pipeline и не увеличивает version;
- malformed draft/request не вызывает ports и commit;
- CAS conflict отбрасывает result и возвращает retryable error;
- coordinator не повторяет pipeline автоматически;
- execution/effective/deadline context стабилен в пределах mutation;
- internal causes и PII отсутствуют в public errors/log assertions.

### Mutation matrix tests

Для всех 23 mutations добавить table-driven coverage:

- 19 REQUIRED имеют exact change type и один recalculation;
- 4 NOT USED никогда не вызывают pipeline;
- `LINES_CLEAR`, `LOCALE_UPDATE`, `DELIVERY_RECIPIENT_UPDATE` входят в result
  revision payload;
- initial create lines обрабатываются одним `CREATE`, без второго mutation;
- address/recipient arrays применяются одним batch;
- rejected promo code сохраняется как intent и warning, а не exception;
- delivery/payment invalid handle сохраняет canonical RESET;
- line delete/update cascades children до построения request;
- currency/locale/buyer changes проходят полный pipeline;
- empty/zero-payable checkout сохраняется с корректной readiness.

### Persistence tests

- real version загружается без hardcoded defaults;
- update использует `id + storeId + expectedVersion`;
- конкурентные commits не перезаписывают друг друга;
- transaction rollback не оставляет lines/options/methods/revisions частично;
- rejected/pending discount intents переживают reload;
- opaque selection handles/customer input переживают reload;
- ordered validation operations переживают reload без перестановки;
- committed revisions точно равны pipeline result;
- cross-store load/commit невозможен;
- create idempotency не создаёт вторую корзину.

### Adapter and integration tests

- exact broker action names и request payloads;
- typed/unknown broker failures проходят canonical sanitization;
- общий deadline включает validation binding load и App execution;
- real target definition зарегистрирован;
- empty active binding set не вызывает generic runner;
- GraphQL mutation response и последующий query имеют одинаковые version,
  totals, selections, validation и result revision;
- mutation не выполняет post-commit race-prone reread;
- batch mutation атомарна при ошибке любого элемента.

### Static completion checks

- нет `new Map<string, any>()` offers placeholders в checkout mutations;
- нет `checkoutService.computeTotals()` в recalculating use cases;
- нет direct checkout write calls из REQUIRED use cases;
- нет hardcoded `version: 1` в read mapping;
- нет resolver loops, выполняющих несколько checkout writes на один GraphQL
  mutation;
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
9. старая mutation-local pricing/promo/selection логика удалена;
10. вся mutation matrix, CAS, rollback, adapter и PII boundary test matrix
    написана и успешно выполняется.

## Non-Goals

- Checkout completion и создание Order.
- Discount usage reservation при order placement.
- Payment session/collection lifecycle.
- Delivery shipment/fulfillment lifecycle.
- DBOS workflow и automatic retry orchestration.
- Cooperative cancellation внешних stage calls.
- Добавление note/tag facts в pipeline inputs без отдельного contract design.
- Backward compatibility, data backfill, dual-read или dual-write.
