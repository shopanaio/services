# Orders Admin API: contract-first RFC и план реализации

Статус: **accepted — Stage 2 complete** Область: `services/orders`, Admin GraphQL Federation
subgraph, PostgreSQL, DBOS, provider Apps, CRM integrations Порядок разработки: **GraphQL SDL →
PostgreSQL schema → domain/business logic → resolvers/API**

## 1. Решение

Orders должен стать владельцем коммерческого факта заказа и полной истории его изменений. Admin API
проектируется не как CRUD над одной записью, а как набор явных бизнес-команд над следующими
capability:

1. order core — создание, lifecycle, customer/contact snapshots, tags, notes;
2. order editing — draft editing и staged edit размещённого заказа;
3. payment state — финансовое состояние заказа и команды к Payments;
4. fulfillment — allocation/work units, fulfillments, shipments и интеграции с 3PL/fulfillment
   services;
5. returns, exchanges и refunds;
6. activity/audit — immutable timeline и audit log;
7. integrations — внешние идентификаторы, CRM/ERP sync и reconciliation.

Ключевой принцип: `status`, `paymentStatus`, `fulfillmentStatus`, `deliveryStatus` и `returnStatus`
не являются произвольно редактируемыми полями. Они меняются только через разрешённые команды или
вычисляются из дочерних фактов.

## 2. Цели

- Поддержать все операции, уже заявленные в черновом Admin UI.
- Дать полный enterprise-контракт для draft orders, placed orders, оплат, fulfillment, returns и
  интеграций.
- Разделить коммерческий order aggregate, fulfillment work и provider execution.
- Поддержать merchant-managed, third-party fulfillment service и carrier shipment provider.
- Подготовить безопасную двустороннюю интеграцию с CRM/ERP без прямого доступа интеграций к таблицам
  Orders.
- Обеспечить optimistic concurrency, idempotency, tenant isolation, RBAC, audit и read-after-write
  consistency.
- Сохранить исторические snapshots независимо от изменений Catalog, Customer, Pricing, Delivery и
  Payments.
- Следовать существующим правилам Shopana: Federation, Global IDs, Relay connections, Scripts, DBOS
  transactional workflows, Zod и DataLoader. Локальные таблицы и workers для отложенной публикации
  событий запрещены.

## 3. Не цели первой версии

- Workflow-конструктор произвольных merchant states. В V1 используется фиксированный lifecycle и
  явные actions.
- Синхронный fan-out GraphQL resolver в CRM, carrier или 3PL.
- Хранение CRM-specific полей в core-таблице `orders`.
- Изменение заказа прямым generic patch/JSON Patch.
- Backfill, compatibility tables, dual-read или поддержка старой схемы. Проект работает с чистой БД.
- Использование Admin UI mock types как backend source of truth.

## 4. Архитектурные границы

| Область            | Владелец                       | Что хранит Orders                                                           |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------- |
| Checkout           | `checkout`                     | immutable placement snapshot и `checkoutId`                                 |
| Catalog            | `catalog`                      | snapshot title/SKU/image/product/variant targeting на order line            |
| Pricing            | `pricing`                      | окончательные amounts, discounts, taxes и quote references                  |
| Inventory          | `catalog`/inventory capability | reservation/allocation references и recorded release/restock results        |
| Payments           | `payments`                     | выбранный method snapshot, attempts/transactions/refunds state              |
| Delivery rates     | `delivery.carrier-service`     | выбранный delivery method/destination snapshot                              |
| Shipment execution | `delivery.shipment-provider`   | provider route/reference/status/tracking state                              |
| Fulfillment work   | `orders.fulfillment`           | fulfillment orders, line allocations, holds, service requests, fulfillments |
| Customer           | `iam`/customers                | customer federation reference плюс immutable contact snapshot               |
| CRM/ERP            | provider App                   | external links, sync state, attempts и last exported/imported revisions     |

Правила границ:

- ни один repository Orders не выполняет cross-service SQL join;
- `storeId` и `organizationId` берутся только из trusted context;
- внешние IDs сохраняются как references, но не заменяют Shopana UUID;
- provider route фиксируется в момент создания operation и не меняется при retry;
- provider payload допускается в JSONB, core business facts — в типизированных колонках;
- Payments и provider Apps сообщают факты через versioned events/actions, а Orders строит проекции.

## 5. Модель lifecycle

### 5.1. Order lifecycle

```text
DRAFT ──complete──> OPEN ──close──> CLOSED
  │                  │               │
  └──delete          └──cancel──────> CANCELLED
                     CLOSED ──reopen─> OPEN
```

`ARCHIVED` не является lifecycle status. Архивирование задаётся отдельным `archivedAt`, поэтому
закрытый или отменённый заказ не теряет своё настоящее состояние.

### 5.2. Derived aggregate statuses

- `paymentStatus` выводится из successful payment transactions и outstanding amount;
- `fulfillmentStatus` выводится из fulfillment order lines и fulfillments;
- `deliveryStatus` выводится из shipment/tracking state;
- `returnStatus` выводится из return requests и received quantities;
- `riskLevel` выводится из risk assessments/disputes.

Ручной override допускается только для offline/imported financial facts, требует отдельного
permission, причины и audit event. Provider-managed online payment нельзя сделать `PAID` обычным
status update.

## 6. Интеграция с настоящим Checkout `placeOrder` pipeline

Этот раздел является нормативной частью Orders design. Storefront не вызывает Admin `orderCreate` и
не создаёт draft order. Единственная точка входа Storefront — существующая мутация Checkout
`placeOrder(input: PlaceOrderInput!)`. Checkout остаётся владельцем durable placement saga, а Orders
принимает один уже зафиксированный immutable commerce snapshot и создаёт из него размещённый заказ.

### 6.1. Владение процессом

| Ответственность                                                              | Владелец                       | Правило                                                                                     |
| ---------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| Storefront mutation, visitor ownership и stale checkout detection            | `checkout`                     | `checkoutId + expectedResultRevision + idempotencyKey`                                      |
| Placement state machine и DBOS recovery                                      | `checkout`                     | `checkout_placements` — operational source of truth saga                                    |
| Pricing/discount, loyalty, inventory и delivery reservations до Order commit | `checkout`                     | Checkout создаёт и компенсирует свои commitments                                            |
| Коммерческий факт размещённого заказа                                        | `orders`                       | atomic state transaction + immutable audit event                                            |
| Order number и Order version                                                 | `orders`                       | не вычисляются Checkout                                                                     |
| Payment collection/session orchestration                                     | `checkout` → `payments`        | создаётся только после Order commit, потому что требует `orderId`                           |
| Payment facts                                                                | `payments` → events → `orders` | Checkout status не патчит `paymentStatus`                                                   |
| Разрешение fulfillment после успешной placement finalization                 | `orders`                       | fulfillment orders до этого находятся на system hold                                        |
| Отмена уже созданного Order при terminal placement failure                   | `orders`                       | отдельная internal command; Order нельзя удалить или оставить `OPEN` после release ресурсов |

Checkout и Orders не используют distributed SQL transaction. Согласованность достигается immutable
snapshot, deterministic IDs, idempotent broker commands, DBOS recovery и reconciliation.
`checkout_placements` не копируется целиком в Orders: Orders хранит только immutable provenance и
состояние собственной стороны placement handshake.

### 6.2. Существующий Storefront contract

Текущий внешний контракт сохраняет смысл:

```graphql
input PlaceOrderInput {
  checkoutId: ID!
  expectedResultRevision: String!
  idempotencyKey: String!
  returnUrl: String
}

type PlaceOrderPayload {
  placementId: ID
  placementState: CheckoutPlacementState
  checkoutId: ID
  resultRevision: String
  orderId: ID
  status: PlaceOrderStatus
  paymentCollectionId: ID
  paymentSessionId: ID
  paymentOperationId: ID
  customerAction: PlaceOrderCustomerAction
  paymentFailure: PlaceOrderPaymentFailure
  userErrors: [CheckoutUserError!]!
}
```

`expectedResultRevision` фиксирует именно результат всего checkout pipeline, а не только версию cart
draft. Повтор с тем же `idempotencyKey` и идентичным public input возвращает тот же
placement/result. Тот же ключ с другим input возвращает `IDEMPOTENCY_KEY_PARAMETER_MISMATCH`. Второй
ключ для уже claimed checkout возвращает `CHECKOUT_ALREADY_PLACED`.

Admin GraphQL Orders не дублирует `placeOrder`. После получения `orderId` Storefront может читать
customer-facing Order через Storefront subgraph, а Admin — тот же aggregate через SDL этого RFC.

### 6.3. Что Checkout обязан зафиксировать в `claim`

До первого внешнего reservation Checkout под `FOR UPDATE` проверяет:

- trusted `organizationId/storeId` и visitor ownership;
- checkout существует, имеет lifecycle `READY` и не истёк;
- `checkout.version` и `resultRevision` совпадают с mutation input;
- final pricing, delivery и payment stages имеют `SUCCESS`;
- selected payment handle принадлежит текущей `paymentMethodsRevision`;
- для payable amount выбран payment method;
- для каждой selected delivery group существует destination/recipient;
- placement уникален по `(store_id, checkout_id)` и `(store_id, idempotency_key)`.

Claim сохраняет `checkoutVersion`, `resultRevision`, sanitized request input, request hash,
credential, DBOS workflow ID и immutable committed checkout snapshot. Дальнейшие шаги не
перечитывают изменяемый checkout draft и не пересчитывают цены «на лету».

### 6.4. End-to-end sequence

```mermaid
sequenceDiagram
    autonumber
    participant SF as Storefront
    participant CO as Checkout / DBOS
    participant PR as Pricing & Loyalty
    participant IN as Inventory
    participant DE as Delivery
    participant OR as Orders
    participant PA as Payments

    SF->>CO: placeOrder(checkoutId, expectedResultRevision, idempotencyKey)
    CO->>CO: validate owner + READY snapshot; claim placement
    CO->>PR: reserve discount usage; reserve loyalty
    CO->>CO: persist requestedOrderId before using it
    CO->>IN: reserve(lines, orderId, expiresAt)
    CO->>PR: commit discount usage for orderId
    CO->>DE: commit selected delivery groups
    CO->>CO: placement = RESOURCES_RESERVED
    CO->>OR: createOrderFromCheckoutPlacementV1(snapshot, commitments)
    OR->>OR: insert order state + fulfillment holds + audit event
    OR-->>CO: orderId, number, orderVersion, AWAITING_FINALIZATION
    CO->>CO: placement = ORDER_CREATED

    alt payment not required / accepted offline policy
        CO->>PR: commit loyalty
        CO->>IN: confirm reservation
        CO->>OR: confirmOrderFromCheckoutPlacementV1(evidence)
        OR->>OR: update placement/order state; release system holds
    else online payment required
        CO->>PA: create collection + session(orderId)
        PA-->>CO: paid / authorized / pending / action / failure
        CO->>CO: placement = PAYMENT_CREATED
        alt settled or authorized according to store policy
            CO->>PR: commit loyalty
            CO->>IN: confirm reservation
            CO->>OR: confirmOrderFromCheckoutPlacementV1(payment evidence)
        else pending/customer action
            CO->>CO: start monitorPlacedPayment workflow
            Note over CO,PA: renew inventory; retry/reconcile/expire durably
        else terminal failure
            CO->>OR: cancelOrderFromCheckoutPlacementV1(payment evidence)
            OR->>OR: cancel order state; close fulfillment work; write audit event
            CO->>IN: release reservation
            CO->>PR: reverse/release discount and loyalty
            CO->>DE: release delivery commitments
        end
    end

    CO->>CO: persist terminal placement result; Checkout = PLACED or ABANDONED
    CO-->>SF: stable PlaceOrderPayload
```

Правило порядка после Order commit принципиально: сначала Orders фиксирует confirm/cancel, затем
Checkout освобождает или финализирует внешние commitments. Нельзя освободить inventory и delivery
под всё ещё `OPEN` и fulfillable Order.

### 6.5. Placement state mapping

| `checkout_placements.status`       | Order существует | Orders placement status | Order lifecycle | Разрешённое действие                                                      |
| ---------------------------------- | ---------------- | ----------------------- | --------------- | ------------------------------------------------------------------------- |
| `CLAIMED`                          | нет              | —                       | —               | reserve resources или pre-commit compensation                             |
| `RESOURCES_RESERVED`               | нет              | —                       | —               | replay order creation с тем же `requestedOrderId`                         |
| `ORDER_CREATED`                    | да               | `AWAITING_FINALIZATION` | `OPEN`          | payment creation/finalization; fulfillment держится на system hold        |
| `PAYMENT_CREATED`                  | да               | `AWAITING_FINALIZATION` | `OPEN`          | вернуть customer action либо monitor payment                              |
| `PLACED`, payment acceptable       | да               | `CONFIRMED`             | `OPEN`          | обычный payment/fulfillment lifecycle                                     |
| `PLACED`, terminal payment failure | да               | `FAILED`                | `CANCELLED`     | audit/read/refund reconciliation; fulfillment запрещён                    |
| `FAILED`                           | нет              | —                       | —               | terminal pre-commit failure; новый checkout либо explicit recovery policy |

В существующем Checkout значение placement `PLACED` означает «workflow имеет persisted terminal
result», а не обязательно успешную оплату. При `PlaceOrderStatus.PAYMENT_FAILED` checkout lifecycle
становится `ABANDONED`, а уже созданный Order обязан быть `CANCELLED`.
`checkout_placements.status = FAILED` после появления Order запрещён новым constraint/invariant.

### 6.6. Versioned internal broker contract

Текущий untyped вызов `order.createOrderFromCheckoutPlacement(params: any)` заменяется контрактами в
`@shopana/broker-types`. Orders не должен импортировать runtime DTO Checkout SDK: форма placement
snapshot versioned независимо и является межсервисным контрактом.

```ts
export const OrderCheckoutActionNames = {
  createFromPlacement: "order.createOrderFromCheckoutPlacementV1",
  confirmPlacement: "order.confirmOrderFromCheckoutPlacementV1",
  cancelPlacement: "order.cancelOrderFromCheckoutPlacementV1",
  getPlacement: "order.getOrderCheckoutPlacementV1",
} as const;

export interface CreateOrderFromCheckoutPlacementV1Params {
  contractVersion: 1;
  organizationId: string;
  storeId: string;
  placementId: string;
  checkoutId: string;
  checkoutVersion: number;
  resultRevision: string;
  finalQuote: { quoteId: string; revision: string };
  paymentMethodsRevision: string;
  deliveryRevision: string;
  requestedOrderId: string;
  actor: {
    credentialId: string;
    userId: string | null;
    visitorIdHash: string;
  };
  snapshotHash: string;
  snapshot: OrderPlacementSnapshotV1;
  commitments: OrderPlacementCommitmentsV1;
  idempotencyKey: string;
  correlationId: string;
  workflowId: string;
}

export interface OrderPlacementSnapshotV1 {
  capturedAt: string;
  currencyCode: string;
  localeCode: string | null;
  salesChannel: string | null;
  externalSource: string | null;
  externalId: string | null;
  customer: OrderPlacementCustomerSnapshotV1;
  cost: OrderPlacementCostV1;
  lines: readonly OrderPlacementLineV1[];
  discounts: readonly OrderPlacementDiscountV1[];
  taxLines: readonly OrderPlacementTaxLineV1[];
  deliveryGroups: readonly OrderPlacementDeliveryGroupV1[];
  selectedPayment: OrderPlacementPaymentMethodV1 | null;
  customerNote: string | null;
  customFields: Readonly<Record<string, unknown>>;
  loyaltyRewardEligibility: OrderLoyaltyRewardEligibilitySnapshot | null;
}

export interface OrderPlacementCommitmentsV1 {
  inventory: {
    reservationKey: string; // requestedOrderId
    expiresAt: string;
  };
  pricing: {
    reservationIds: readonly string[];
    redemptionIds: readonly string[];
  };
  loyalty: OrderPlacementLoyaltyCommitmentV1 | null;
  delivery: readonly DeliveryCommittedGroupSnapshot[];
}

export interface CreateOrderFromCheckoutPlacementV1Result {
  orderId: string;
  orderNumber: string;
  orderVersion: number; // 1 immediately after atomic order creation
  orderStatus: "OPEN";
  placementStatus: "AWAITING_FINALIZATION";
  placedAt: string;
  snapshotHash: string;
  duplicate: boolean;
}

export interface ConfirmOrderFromCheckoutPlacementV1Params {
  contractVersion: 1;
  organizationId: string;
  storeId: string;
  placementId: string;
  orderId: string;
  evidence:
    | { kind: "PAYMENT_NOT_REQUIRED" }
    | { kind: "PAYMENT_AUTHORIZED"; paymentSessionId: string; operationId: string }
    | { kind: "PAYMENT_CAPTURED"; paymentSessionId: string; operationId: string }
    | { kind: "OFFLINE_ACCEPTED"; paymentMethodCode: string }
    | { kind: "ON_DELIVERY_ACCEPTED"; paymentMethodCode: string };
  finalizedAt: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface CancelOrderFromCheckoutPlacementV1Params {
  contractVersion: 1;
  organizationId: string;
  storeId: string;
  placementId: string;
  orderId: string;
  reasonCode: "PAYMENT_FAILED" | "PAYMENT_EXPIRED" | "PAYMENT_CANCELLED" | "PLACEMENT_FAILED";
  paymentSessionId: string | null;
  paymentOperationId: string | null;
  failedAt: string;
  idempotencyKey: string;
  correlationId: string;
}
```

Полные nested types (`OrderPlacementLineV1`, allocations, addresses, packages и payment method
public snapshot) также живут в `broker-types`; `any`, class instances и SDK-specific `Money`
запрещены. Money передаётся как `{ amountMinor: string, currencyCode }`, timestamps — ISO-8601 UTC,
IDs — plain UUID/opaque typed references согласно owning service contract.

Raw card/bank credentials, secret provider tokens и private payment `customerInput` не входят в
Orders snapshot. Orders получает только method code/title/provider/flow и разрешённый redacted
public snapshot. Полный private input передаётся Checkout напрямую Payments.

`requestHash` Checkout защищает внешний `PlaceOrderInput`. `snapshotHash` защищает внутренний
commerce commit package и вычисляется как lowercase SHA-256 от canonical JSON следующего набора:
contract version, tenant/placement/checkout IDs и revisions, requested Order ID, normalized snapshot
и commitments. Operational поля `workflowId`, `correlationId` и `idempotencyKey` в snapshot hash не
входят. Object keys сортируются, money остаётся minor-unit string, массивы сохраняют доменно
определённый порядок; перед hash запрещены locale-dependent number/date conversions.

### 6.7. Snapshot → Order mapping

| Placement snapshot                 | Orders state/audit                                    | Инвариант                                                                                                                     |
| ---------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| placement/checkout IDs и revisions | `order_checkout_placements` + audit metadata          | immutable, unique per store                                                                                                   |
| `requestedOrderId`                 | `orders.id`, inventory reservation key                | сохраняется Checkout до reservation и никогда не генерируется повторно                                                        |
| `capturedAt`                       | `placed_at`, audit `occurredAt`                       | storefront order создаётся сразу `OPEN`, не `DRAFT`                                                                           |
| customer identity                  | customer reference + `order_contacts` snapshot        | дальнейшее изменение Customer не переписывает snapshot                                                                        |
| lines                              | `order_lines` + purchasable snapshot                  | checkout line ID становится стабильным order line ID либо сохраняется отдельный sourceLineId; правило едино для всех children |
| final quote totals                 | order/line financial state                            | суммы не пересчитываются Orders при placement                                                                                 |
| discounts/taxes/duties             | typed allocations                                     | сумма allocations равна aggregate amounts                                                                                     |
| delivery groups                    | `order_delivery_groups`                               | каждая shippable line входит ровно в одну committed group                                                                     |
| delivery commitments               | delivery method snapshot + initial fulfillment orders | provider route/revision фиксируются; fulfillment получает system hold                                                         |
| selected payment                   | payment method snapshot                               | private payment input не хранится                                                                                             |
| resource references                | placement state/audit metadata                        | нужны для audit и reconciliation, не являются mutable order fields                                                            |
| loyalty eligibility                | immutable order snapshot                              | publication/commit имеет собственную idempotency                                                                              |

Order source получает `origin = CHECKOUT`, `source.code = "storefront"`. Admin-created draft
использует `origin = ADMIN` и не имеет `checkoutPlacement`.

### 6.8. Atomic Orders commit point

`createOrderFromCheckoutPlacementV1` выполняет одну локальную PostgreSQL-транзакцию:

1. Валидирует trusted tenant context и все Global/typed IDs до transaction Script.
2. Нормализует payload и повторно вычисляет canonical `snapshotHash`.
3. Проверяет idempotency record по `(store_id, operation, idempotency_key)` и request hash.
4. Проверяет uniqueness `(store_id, placement_id)` и `(store_id, checkout_id)`.
5. Резервирует per-store order number.
6. Создаёт `orders` с `version = 1` и связанные core, line, money, PII, delivery и payment-method
   records.
7. Записывает immutable audit record о размещении заказа.
8. Создаёт initial fulfillment orders из committed delivery groups с system hold
   `CHECKOUT_PLACEMENT_AWAITING_FINALIZATION`.
9. Создаёт `order_checkout_placements(status = AWAITING_FINALIZATION)`.
10. Записывает idempotency response.
11. Commit и только затем возвращает result Checkout.

Ни один внешний broker/provider вызов внутри этой транзакции не разрешён. Если transaction не
committed, Order не существует. Если response потерян после commit, повтор того же command
возвращает сохранённый result с `duplicate = true`; ресурсы не освобождаются.

Audit record `order.placed` содержит self-contained snapshot, достаточный для расследования и
интеграционных consumers, но не является source of truth и не используется для восстановления
состояния заказа. Его надёжная доставка выполняется DBOS workflow после committed transactional
step. Отдельное `order.draft_created` для Storefront placement не создаётся.

### 6.9. Order placement handshake после создания

Создание Order — точка необратимости identity/history, но не разрешение fulfillment:

- `AWAITING_FINALIZATION`: заказ видим Admin/Customer, payment может требовать action; fulfillment
  orders существуют, но system hold нельзя снять вручную;
- `confirmOrderFromCheckoutPlacementV1`: после подтверждения inventory/loyalty и допустимого payment
  outcome атомарно переводит placement в `CONFIRMED` и снимает только system placement hold;
- `cancelOrderFromCheckoutPlacementV1`: атомарно переводит placement в `FAILED`, заказ в
  `CANCELLED`, закрывает unfulfilled fulfillment orders и пишет audit records; физического удаления
  Order нет.

Обе команды idempotent по placement и evidence. Для system/event command Orders блокирует текущую
строку `orders` и выполняет conditional update по `orders.version`; version conflict повторяется
внутри ограниченного DBOS retry. Конкурирующая merchant cancellation возвращает уже существующий
terminal state, но не создаёт вторую cancellation.

`availableActions` учитывает placement gate. Пока placement не `CONFIRMED`, запрещены shipment,
external fulfillment submit и merchant fulfillment. Ручная payment retry допустима только после
того, как исходный Checkout workflow достиг terminal/recoverable state по policy.

### 6.10. Payment и placement semantics

- Нулевой payable amount даёт `paymentStatus = NOT_REQUIRED`, а не искусственный `PAID`.
- Для online payment сразу после создания заказа используется `PENDING`; дальнейшее состояние
  выводится только из Payments events.
- `AUTHORIZED` может подтвердить placement только если store capture policy разрешает fulfillment по
  authorization; иначе требуется capture.
- `OFFLINE` и `ON_DELIVERY` подтверждаются отдельным evidence kind и остаются `PENDING`, пока не
  появится manual/provider transaction.
- Payment event может прийти раньше, чем Checkout запишет `PAYMENT_CREATED`; Orders inbox применяет
  его по `orderId/paymentSessionId`, а Checkout recovery затем догоняет state.
- Terminal payment failure после создания Order не означает «order never existed»: сохраняется
  отменённый Order, payment attempt/failure и полный audit trail.
- Settled payment с ошибкой loyalty/inventory finalization не отменяет Order и не освобождает
  ресурсы. Placement остаётся held, а reconciliation повторяет finalization.

### 6.11. Compensation matrix

| Failure point                                            | Order       | Обязательная реакция                                                               |
| -------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| Claim/validation                                         | отсутствует | placement `FAILED`; external compensation не нужна                                 |
| Discount/loyalty reserve                                 | отсутствует | release уже созданных reservations                                                 |
| Inventory reserve                                        | отсутствует | release inventory + pricing/loyalty                                                |
| Discount commit/delivery commit                          | отсутствует | reverse redemption, release inventory/loyalty/delivery                             |
| Orders command до DB commit                              | отсутствует | выполнить все pre-commit compensation                                              |
| Orders response потерян после commit                     | существует  | replay create command; **не** освобождать ресурсы                                  |
| `markOrderCreated` не записался в Checkout               | существует  | найти по `(storeId, placementId)`, догнать placement state                         |
| Payment collection/session не создана                    | существует  | сначала idempotent Order placement cancellation, затем release/reverse commitments |
| Pending payment expired/failed/cancelled                 | существует  | тот же cancellation handshake, затем compensation                                  |
| Payment settled, inventory/loyalty confirm временно упал | существует  | сохранить holds, retry/reconcile; не cancel и не release                           |
| Order confirm response потерян                           | существует  | replay confirm; event не дублируется                                               |
| Checkout terminal result не записался                    | существует  | recovery читает Orders placement + Payments и завершает placement                  |

Checkout хранит failed compensation attempts и повторяет их отдельным maintenance workflow. Orders
хранит cancellation/placement event, но не считает release успешным без соответствующего
acknowledgement/event от owning service. Alerts строятся отдельно на stuck placement и unresolved
compensation.

### 6.12. Recovery и reconciliation

Recovery выполняется по persisted state, а не по предположению, что последний RPC не сработал:

1. `CLAIMED`: перечитать записанные reservation IDs и продолжить только отсутствующий шаг.
2. `RESOURCES_RESERVED`: вызвать create с тем же `requestedOrderId`, placement ID, request hash.
3. Order найден по placement ID, но Checkout ещё `RESOURCES_RESERVED`: записать `ORDER_CREATED`;
   compensation запрещена.
4. `ORDER_CREATED`: найти payment collection/session по deterministic idempotency keys и создать
   только отсутствующие ресурсы.
5. `PAYMENT_CREATED`: возобновить monitor по persisted input/workflow ID.
6. Payment settled: повторить finalization, затем Orders confirm.
7. Payment terminal failure: повторить Orders cancel, затем незавершённые compensations.
8. `PLACED`: mutation replay возвращает persisted result без side effects.

Периодический reconciler сравнивает:

- Checkout placement `requestedOrderId/orderId` ↔ Orders `(storeId, placementId, orderId)`;
- snapshot hash и contract version;
- payment collection/session order reference ↔ Orders payment state;
- inventory reservation state ↔ Orders placement/fulfillment gate;
- committed delivery group IDs ↔ Orders delivery/fulfillment groups;
- terminal Checkout result ↔ Orders placement status/lifecycle.

Reconciler не исправляет данные direct SQL update. Он вызывает те же idempotent broker commands или
создаёт typed operational incident, если автоматическая компенсация небезопасна.

### 6.13. PostgreSQL additions в Orders

К целевой схеме добавляются нормализованные таблицы состояния:

| Таблица                      | Ключевые поля                                                                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order_checkout_placements`  | `store_id`, `order_id`, `placement_id`, `checkout_id`, checkout/result/quote/payment/delivery revisions, contract version, snapshot hash, status, confirmed/failed timestamps |
| `order_checkout_commitments` | immutable inventory reservation key, pricing reservation/redemption refs, loyalty commitment snapshot, delivery commitment refs                                               |

Constraints:

```text
unique (store_id, placement_id)
unique (store_id, checkout_id)
unique (store_id, order_id)
contract_version > 0
snapshot_hash ~ '^[a-f0-9]{64}$'
status = AWAITING_FINALIZATION => confirmed_at IS NULL AND failed_at IS NULL
status = CONFIRMED => confirmed_at IS NOT NULL AND failed_at IS NULL
status = FAILED => failed_at IS NOT NULL
origin = CHECKOUT => placement record exists
origin != CHECKOUT => placement record does not exist
```

В Checkout schema добавляется invariant/constraint: placement `FAILED` не может иметь `order_id`.
Terminal `PAYMENT_FAILED` с созданным Order сохраняется как placement `PLACED` result плюс Checkout
lifecycle `ABANDONED` и Orders placement `FAILED/CANCELLED`.

### 6.14. Необходимые изменения существующего pipeline

При реализации RFC текущий pipeline изменяется в четырёх местах:

1. `order.createOrderFromCheckoutPlacement(params: any)` заменяется typed V1 action из
   `@shopana/broker-types` и canonical request hash.
2. Текущий repository create не должен вставлять storefront order как `DRAFT`: command сразу создаёт
   `OPEN`, `placedAt`, `version = 1` и audit record `order.placed`.
3. После Order commit любые payment failures больше не вызывают release ресурсов до фиксации
   `cancelOrderFromCheckoutPlacementV1`.
4. Zero/authorized/paid/offline success и async payment monitor вызывают
   `confirmOrderFromCheckoutPlacementV1`; до этого fulfillment остаётся system-held.

Эти изменения не создают compatibility branch или dual-write: проект работает на чистой БД, поэтому
старый untyped handler и old Drizzle placement creation удаляются в том же vertical slice.

### 6.15. Точки подключения в текущем коде

| Текущий компонент                                                                      | Роль после реализации RFC                                                                                                     |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `services/checkout/src/interfaces/gql-storefront-api/schema/checkoutPayment.graphql`   | внешний `PlaceOrderInput/Payload` остаётся entry point; при необходимости только документируются новые error/state semantics  |
| `services/checkout/src/interfaces/gql-storefront-api/resolvers/checkout/placeOrder.ts` | trusted context → DBOS workflow input; Orders напрямую не вызывается                                                          |
| `services/checkout/src/workflows/PlaceOrderWorkflow.ts`                                | сохраняет saga ownership; вызывает typed create, а затем confirm/cancel handshake в правильной ветке                          |
| `services/checkout/src/workflows/MonitorPlacedPaymentWorkflow.ts`                      | при settlement финализирует commitments и подтверждает Order; при terminal failure сначала отменяет Order, затем компенсирует |
| `services/checkout/src/infrastructure/mutations/CheckoutPlacementRepository.ts`        | durable operational state/recovery; вводится invariant `FAILED => order_id IS NULL`                                           |
| `services/orders/src/orders.nest-service.ts`                                           | регистрирует typed action constants без `any`; thin adapter в Scripts/workflows                                               |
| `services/orders/src/application/usecases/orderCreate.ts`                              | старый checkout-specific create удаляется; заменяется placement Script с atomic state/audit/idempotency transaction           |
| `services/orders/src/repositories/fulfillment/DeliveryFulfillmentRepository.ts`        | snapshot runtime model удаляется; initial normalized fulfillment orders строятся той же order creation transaction            |
| `@shopana/broker-types`                                                                | единственный source of truth для V1 create/confirm/cancel/get DTO и action names                                              |

Storefront request не должен ждать async payment settlement. Для `REQUIRES_ACTION`,
`REQUIRES_CONFIRMATION` и `PAYMENT_PENDING` mutation возвращает persisted payload и monitor
продолжает работу durable. Order уже читаем, но fulfillment gated до confirm. Admin видит placement
status, payment action/failure и activity events без доступа к Checkout operational JSON.

## 7. Канонический Admin GraphQL SDL

Ниже — целевой V1 SDL. `Node`, `Connection`, `PageInfo`, `DisplayableError`, `Money`, `Customer`,
`User`, `ApiKey`, `CurrencyCode`, `CountryCode`, `LocaleCode`, `DateTime`, `Cursor`, `Decimal`,
`JSON` и `URL` должны приходить из shared/federated schemas.

```graphql
extend type Query {
  ordersQuery: OrdersQuery!
}

extend type Mutation {
  ordersMutation: OrdersMutation!
}

"""
Read namespace for the Orders Admin API.
"""
type OrdersQuery {
  order(id: ID!): Order
  orderByNumber(number: BigInt!): Order
  orders(
    first: Int = 20
    after: Cursor
    last: Int
    before: Cursor
    where: OrderWhereInput
    orderBy: [OrderOrderByInput!]
  ): OrderConnection!
  orderEditSession(id: ID!): OrderEditSession
  orderOperation(id: ID!): OrderOperation
}

"""
Command namespace. Every command is store-scoped from trusted context.
"""
type OrdersMutation {
  # Draft and core lifecycle
  orderCreate(input: OrderCreateInput!): OrderPayload!
  orderUpdate(input: OrderUpdateInput!): OrderPayload!
  orderDelete(input: OrderDeleteInput!): OrderDeletePayload!
  orderCompleteDraft(input: OrderCompleteDraftInput!): OrderPayload!
  orderCancel(input: OrderCancelInput!): OrderOperationPayload!
  orderClose(input: OrderCloseInput!): OrderPayload!
  orderReopen(input: OrderReopenInput!): OrderPayload!
  orderArchive(input: OrderArchiveInput!): OrderPayload!
  orderUnarchive(input: OrderUnarchiveInput!): OrderPayload!

  # Customer, staff data and lightweight updates
  orderCustomerSet(input: OrderCustomerSetInput!): OrderPayload!
  orderTagsUpdate(input: OrderTagsUpdateInput!): OrderPayload!
  orderAdminNoteUpdate(input: OrderAdminNoteUpdateInput!): OrderPayload!
  orderCommentAdd(input: OrderCommentAddInput!): OrderActivityPayload!
  orderCustomFieldsUpdate(input: OrderCustomFieldsUpdateInput!): OrderPayload!

  # Direct draft-line operations
  orderLineAdd(input: OrderLineAddInput!): OrderLinePayload!
  orderLineUpdate(input: OrderLineUpdateInput!): OrderLinePayload!
  orderLineDelete(input: OrderLineDeleteInput!): OrderDeletePayload!

  # Staged edit for an OPEN order
  orderEditBegin(input: OrderEditBeginInput!): OrderEditPayload!
  orderEditLineAdd(input: OrderEditLineAddInput!): OrderEditPayload!
  orderEditLineUpdate(input: OrderEditLineUpdateInput!): OrderEditPayload!
  orderEditLineRemove(input: OrderEditLineRemoveInput!): OrderEditPayload!
  orderEditShippingUpdate(input: OrderEditShippingUpdateInput!): OrderEditPayload!
  orderEditDiscountAdd(input: OrderEditDiscountAddInput!): OrderEditPayload!
  orderEditDiscountRemove(input: OrderEditDiscountRemoveInput!): OrderEditPayload!
  orderEditCommit(input: OrderEditCommitInput!): OrderOperationPayload!
  orderEditAbandon(input: OrderEditAbandonInput!): OrderEditPayload!

  # Payments. Aggregate paymentStatus remains derived.
  orderManualPaymentRecord(input: OrderManualPaymentRecordInput!): OrderOperationPayload!
  orderPaymentCapture(input: OrderPaymentCaptureInput!): OrderOperationPayload!
  orderPaymentVoid(input: OrderPaymentVoidInput!): OrderOperationPayload!
  orderPaymentRetry(input: OrderPaymentRetryInput!): OrderOperationPayload!
  orderRefundCreate(input: OrderRefundCreateInput!): OrderOperationPayload!
  orderPaymentStatusOverride(input: OrderPaymentStatusOverrideInput!): OrderPayload!

  # Fulfillment work capability
  fulfillmentOrderSplit(input: FulfillmentOrderSplitInput!): FulfillmentOrderPayload!
  fulfillmentOrderMove(input: FulfillmentOrderMoveInput!): FulfillmentOrderPayload!
  fulfillmentOrderHold(input: FulfillmentOrderHoldInput!): FulfillmentOrderPayload!
  fulfillmentOrderReleaseHold(input: FulfillmentOrderReleaseHoldInput!): FulfillmentOrderPayload!
  fulfillmentOrderSubmit(input: FulfillmentOrderSubmitInput!): OrderOperationPayload!
  fulfillmentOrderCancelRequest(input: FulfillmentOrderCancelRequestInput!): OrderOperationPayload!
  fulfillmentCreate(input: FulfillmentCreateInput!): FulfillmentPayload!
  fulfillmentCancel(input: FulfillmentCancelInput!): OrderOperationPayload!

  # Physical shipment lifecycle
  shipmentCreate(input: ShipmentCreateInput!): OrderOperationPayload!
  shipmentTrackingUpdate(input: ShipmentTrackingUpdateInput!): ShipmentPayload!
  shipmentMarkShipped(input: ShipmentMarkShippedInput!): ShipmentPayload!
  shipmentMarkDelivered(input: ShipmentMarkDeliveredInput!): ShipmentPayload!
  shipmentCancel(input: ShipmentCancelInput!): OrderOperationPayload!
  shipmentReconcile(input: ShipmentReconcileInput!): OrderOperationPayload!

  # Returns and exchanges
  orderReturnCreate(input: OrderReturnCreateInput!): OrderReturnPayload!
  orderReturnApprove(input: OrderReturnApproveInput!): OrderReturnPayload!
  orderReturnReject(input: OrderReturnRejectInput!): OrderReturnPayload!
  orderReturnCancel(input: OrderReturnCancelInput!): OrderReturnPayload!
  orderReturnReceive(input: OrderReturnReceiveInput!): OrderOperationPayload!
  orderExchangeCreate(input: OrderExchangeCreateInput!): OrderExchangePayload!
  orderExchangeCancel(input: OrderExchangeCancelInput!): OrderExchangePayload!

  # CRM/ERP/marketplace synchronization
  orderIntegrationSyncRequest(input: OrderIntegrationSyncRequestInput!): OrderOperationPayload!
  orderIntegrationSyncRetry(input: OrderIntegrationSyncRetryInput!): OrderOperationPayload!
  orderIntegrationLinkDetach(input: OrderIntegrationLinkDetachInput!): OrderPayload!

  # Enterprise bulk operation
  ordersBulkAction(input: OrdersBulkActionInput!): OrderOperationPayload!
}

enum OrderStatus {
  DRAFT
  OPEN
  CLOSED
  CANCELLED
}

enum OrderPaymentStatus {
  NOT_REQUIRED
  PENDING
  AUTHORIZED
  PARTIALLY_PAID
  PAID
  PARTIALLY_REFUNDED
  REFUNDED
  VOIDED
  EXPIRED
  FAILED
}

enum OrderFulfillmentStatus {
  UNFULFILLED
  SCHEDULED
  ON_HOLD
  PARTIALLY_FULFILLED
  FULFILLED
  CANCELLED
}

enum OrderDeliveryStatus {
  NOT_SHIPPED
  PARTIALLY_SHIPPED
  SHIPPED
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  DELIVERY_ATTEMPTED
  DELAYED
  EXCEPTION
  RETURNED_TO_SENDER
  CANCELLED
}

enum OrderReturnStatus {
  NONE
  REQUESTED
  PARTIALLY_RETURNED
  RETURNED
}

enum OrderRiskLevel {
  NONE
  LOW
  MEDIUM
  HIGH
}

enum OrderOrigin {
  CHECKOUT
  ADMIN
  API
  IMPORT
  MARKETPLACE
  CRM
}

enum OrderPlacementStatus {
  AWAITING_FINALIZATION
  CONFIRMED
  FAILED
}

enum OrderActorType {
  USER
  API_KEY
  CUSTOMER
  APP
  SYSTEM
}

enum OrderAction {
  UPDATE_DETAILS
  EDIT_LINES
  COMPLETE_DRAFT
  CANCEL
  CLOSE
  REOPEN
  ARCHIVE
  UNARCHIVE
  RECORD_MANUAL_PAYMENT
  CAPTURE_PAYMENT
  VOID_PAYMENT
  REFUND
  RETRY_PAYMENT
  CREATE_FULFILLMENT
  CREATE_RETURN
  CREATE_EXCHANGE
  REQUEST_INTEGRATION_SYNC
}

enum OrderPaymentTransactionKind {
  AUTHORIZATION
  CAPTURE
  SALE
  REFUND
  VOID
  MANUAL
  ADJUSTMENT
}

enum OrderPaymentTransactionStatus {
  PENDING
  SUCCESS
  FAILURE
  CANCELLED
}

enum FulfillmentOrderStatus {
  OPEN
  SCHEDULED
  ON_HOLD
  IN_PROGRESS
  CLOSED
  CANCELLED
}

enum FulfillmentRequestStatus {
  UNSUBMITTED
  SUBMITTED
  ACCEPTED
  REJECTED
  CANCELLATION_REQUESTED
  CANCELLATION_ACCEPTED
  CANCELLATION_REJECTED
}

enum FulfillmentStatus {
  PENDING
  OPEN
  SUCCESS
  FAILURE
  CANCELLED
}

enum ShipmentStatus {
  DRAFT
  LABEL_CREATED
  READY_FOR_PICKUP
  PICKED_UP
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  DELIVERY_ATTEMPTED
  DELAYED
  EXCEPTION
  RETURNED_TO_SENDER
  CANCELLED
}

enum OrderReturnRequestStatus {
  REQUESTED
  APPROVED
  REJECTED
  CANCELLED
  IN_TRANSIT
  RECEIVED
  COMPLETED
}

enum OrderExchangeStatus {
  REQUESTED
  OPEN
  COMPLETED
  CANCELLED
}

enum OrderRefundStatus {
  PENDING
  SUCCEEDED
  FAILED
  CANCELLED
}

enum OrderOperationKind {
  ORDER_CANCEL
  ORDER_EDIT_COMMIT
  PAYMENT_CAPTURE
  PAYMENT_VOID
  PAYMENT_REFUND
  PAYMENT_RETRY
  FULFILLMENT_SUBMIT
  FULFILLMENT_CANCEL
  SHIPMENT_CREATE
  SHIPMENT_CANCEL
  SHIPMENT_RECONCILE
  RETURN_RECEIVE
  INTEGRATION_SYNC
  BULK_ACTION
}

enum OrderOperationStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  CANCELLED
}

enum OrderIntegrationKind {
  CRM
  ERP
  MARKETPLACE
  WMS
  ANALYTICS
}

enum OrderIntegrationSyncStatus {
  NEVER_SYNCED
  PENDING
  SYNCED
  OUT_OF_SYNC
  FAILED
  DISABLED
}

enum OrderSyncDirection {
  EXPORT
  IMPORT
  BIDIRECTIONAL
}

enum OrdersBulkActionKind {
  ARCHIVE
  UNARCHIVE
  ADD_TAGS
  REMOVE_TAGS
  CANCEL
  REQUEST_INTEGRATION_SYNC
}

enum OrderSortField {
  NUMBER
  CUSTOMER_NAME
  TOTAL_AMOUNT
  STATUS
  PAYMENT_STATUS
  FULFILLMENT_STATUS
  DELIVERY_STATUS
  CREATED_AT
  UPDATED_AT
  PLACED_AT
}

enum SortDirection {
  ASC
  DESC
}

type Order implements Node @key(fields: "id") {
  id: ID!
  version: Int!
  number: BigInt!
  status: OrderStatus!
  paymentStatus: OrderPaymentStatus!
  fulfillmentStatus: OrderFulfillmentStatus!
  deliveryStatus: OrderDeliveryStatus!
  returnStatus: OrderReturnStatus!
  riskLevel: OrderRiskLevel!
  availableActions: [OrderAction!]!
  origin: OrderOrigin!
  source: OrderSource
  checkout: Checkout
  checkoutPlacement: OrderCheckoutPlacement
  customer: Customer
  customerSnapshot: OrderCustomerSnapshot!
  contact: OrderContact!
  billingAddress: OrderAddress
  shippingAddress: OrderAddress
  localeCode: LocaleCode
  currencyCode: CurrencyCode!
  cost: OrderCost!
  totalQuantity: Int!
  lines: [OrderLine!]!
  discounts: [OrderDiscount!]!
  taxLines: [OrderTaxLine!]!
  deliveryGroups: [OrderDeliveryGroup!]!
  payment: OrderPayment!
  fulfillmentOrders: [FulfillmentOrder!]!
  fulfillments: [Fulfillment!]!
  shipments: [Shipment!]!
  returns(first: Int = 20, after: Cursor): OrderReturnConnection!
  exchanges(first: Int = 20, after: Cursor): OrderExchangeConnection!
  refunds(first: Int = 20, after: Cursor): OrderRefundConnection!
  activity(first: Int = 50, after: Cursor): OrderActivityConnection!
  integrationLinks: [OrderIntegrationLink!]!
  tags: [String!]!
  adminNote: String
  customerNote: String
  customFields: JSON!
  placedAt: DateTime
  cancelledAt: DateTime
  closedAt: DateTime
  archivedAt: DateTime
  expiresAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderSource {
  code: String!
  externalId: String
  externalUrl: URL
}

"""
Checkout-owned placement provenance recorded in Orders.
"""
type OrderCheckoutPlacement {
  placementId: ID!
  checkoutId: ID!
  checkoutVersion: Int!
  resultRevision: String!
  finalQuoteRevision: String!
  paymentMethodsRevision: String!
  deliveryRevision: String!
  contractVersion: Int!
  snapshotHash: String!
  status: OrderPlacementStatus!
  confirmedAt: DateTime
  failedAt: DateTime
}

type OrderCustomerSnapshot {
  customerId: ID
  email: String
  phone: String
  firstName: String
  middleName: String
  lastName: String
  company: String
  countryCode: CountryCode
}

type OrderContact {
  email: String
  phone: String
  firstName: String
  middleName: String
  lastName: String
  company: String
  note: String
  redactedAt: DateTime
}

type OrderAddress implements Node {
  id: ID!
  firstName: String
  middleName: String
  lastName: String
  company: String
  address1: String
  address2: String
  city: String
  provinceCode: String
  postalCode: String
  countryCode: CountryCode
  email: String
  phone: String
  data: JSON!
  redactedAt: DateTime
}

type OrderCost {
  subtotalAmount: Money!
  discountAmount: Money!
  shippingAmount: Money!
  taxAmount: Money!
  dutyAmount: Money!
  adjustmentAmount: Money!
  totalAmount: Money!
  paidAmount: Money!
  refundedAmount: Money!
  outstandingAmount: Money!
}

type OrderLine implements Node {
  id: ID!
  version: Int!
  parentLine: OrderLine
  purchasableId: ID
  productId: ID
  variantId: ID
  title: String!
  sku: String
  imageUrl: URL
  quantity: Int!
  cancelledQuantity: Int!
  fulfillableQuantity: Int!
  fulfilledQuantity: Int!
  returnableQuantity: Int!
  returnedQuantity: Int!
  refundableQuantity: Int!
  requiresShipping: Boolean!
  taxable: Boolean!
  weight: Weight
  unitCost: Money
  cost: OrderLineCost!
  purchasableSnapshot: JSON!
  customFields: JSON!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderLineCost {
  unitPrice: Money!
  unitCompareAtPrice: Money
  subtotalAmount: Money!
  discountAmount: Money!
  taxAmount: Money!
  dutyAmount: Money!
  totalAmount: Money!
}

type OrderDiscount implements Node {
  id: ID!
  code: String
  title: String!
  source: String!
  target: String!
  value: Decimal!
  amount: Money!
  metadata: JSON!
}

type OrderTaxLine implements Node {
  id: ID!
  title: String!
  rate: Decimal!
  amount: Money!
  included: Boolean!
  jurisdiction: String
}

type OrderDeliveryGroup implements Node {
  id: ID!
  lines: [OrderLine!]!
  address: OrderAddress
  recipient: OrderContact
  selectedMethod: OrderDeliveryMethod
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderDeliveryMethod {
  code: String!
  title: String!
  providerCode: String!
  type: String!
  paymentModel: String
  amount: Money!
  customerInput: JSON!
  providerSnapshot: JSON!
}

type OrderPayment {
  status: OrderPaymentStatus!
  selectedMethod: OrderPaymentMethod
  authorizedAmount: Money!
  capturedAmount: Money!
  refundedAmount: Money!
  voidedAmount: Money!
  outstandingAmount: Money!
  attempts: [OrderPaymentAttempt!]!
  transactions: [OrderPaymentTransaction!]!
  disputes: [OrderPaymentDispute!]!
}

type OrderPaymentMethod {
  code: String!
  title: String!
  providerCode: String!
  flow: String!
  customerInput: JSON!
  providerSnapshot: JSON!
}

type OrderPaymentAttempt implements Node {
  id: ID!
  status: OrderPaymentStatus!
  requestedAmount: Money!
  providerCode: String!
  providerReference: String
  failureCode: String
  failureMessage: String
  customerAction: JSON
  expiresAt: DateTime
  processedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderPaymentTransaction implements Node {
  id: ID!
  kind: OrderPaymentTransactionKind!
  status: OrderPaymentTransactionStatus!
  amount: Money!
  providerCode: String!
  providerReference: String
  parentTransaction: OrderPaymentTransaction
  failureCode: String
  failureMessage: String
  processedAt: DateTime
  createdAt: DateTime!
}

type OrderPaymentDispute implements Node {
  id: ID!
  providerCode: String!
  providerReference: String!
  status: String!
  reason: String
  amount: Money!
  responseDueAt: DateTime
  resolvedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type FulfillmentOrder implements Node {
  id: ID!
  version: Int!
  order: Order!
  deliveryGroup: OrderDeliveryGroup!
  status: FulfillmentOrderStatus!
  requestStatus: FulfillmentRequestStatus!
  lines: [FulfillmentOrderLine!]!
  assignedLocationId: ID!
  assignedService: FulfillmentServiceRoute
  holds: [FulfillmentHold!]!
  fulfillAt: DateTime
  fulfillBy: DateTime
  supportedActions: [String!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type FulfillmentOrderLine implements Node {
  id: ID!
  orderLine: OrderLine!
  quantity: Int!
  remainingQuantity: Int!
  fulfilledQuantity: Int!
}

type FulfillmentServiceRoute {
  appCode: String!
  installationId: ID!
  serviceCode: String!
  providerRevision: String!
  externalReference: String
}

type FulfillmentHold implements Node {
  id: ID!
  reasonCode: String!
  note: String
  heldBy: OrderActor!
  createdAt: DateTime!
  releasedAt: DateTime
}

type Fulfillment implements Node {
  id: ID!
  version: Int!
  order: Order!
  fulfillmentOrder: FulfillmentOrder!
  status: FulfillmentStatus!
  locationId: ID!
  lines: [FulfillmentLine!]!
  shipments: [Shipment!]!
  notifyCustomer: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type FulfillmentLine {
  orderLine: OrderLine!
  quantity: Int!
}

type Shipment implements Node {
  id: ID!
  version: Int!
  order: Order!
  fulfillment: Fulfillment!
  status: ShipmentStatus!
  providerCode: String
  providerReference: String
  serviceCode: String
  tracking: [ShipmentTracking!]!
  packages: [ShipmentPackage!]!
  events: [ShipmentEvent!]!
  shippedAt: DateTime
  estimatedDeliveryAt: DateTime
  deliveredAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ShipmentTracking {
  number: String!
  url: URL
  company: String
}

type ShipmentPackage implements Node {
  id: ID!
  weight: Weight
  dimensions: Dimensions
  declaredValue: Money
  items: [ShipmentPackageItem!]!
}

type ShipmentPackageItem {
  orderLine: OrderLine!
  quantity: Int!
}

type ShipmentEvent implements Node {
  id: ID!
  status: ShipmentStatus!
  message: String
  location: String
  happenedAt: DateTime!
  recordedAt: DateTime!
}

type OrderReturn implements Node {
  id: ID!
  version: Int!
  order: Order!
  status: OrderReturnRequestStatus!
  lines: [OrderReturnLine!]!
  returnShipment: Shipment
  customerNote: String
  staffNote: String
  requestedAt: DateTime!
  approvedAt: DateTime
  receivedAt: DateTime
  completedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderReturnLine {
  orderLine: OrderLine!
  quantity: Int!
  receivedQuantity: Int!
  restockableQuantity: Int!
  damagedQuantity: Int!
  reasonCode: String!
  note: String
}

type OrderExchange implements Node {
  id: ID!
  version: Int!
  order: Order!
  status: OrderExchangeStatus!
  inboundLines: [OrderReturnLine!]!
  outboundLines: [OrderLine!]!
  balance: Money!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderRefund implements Node {
  id: ID!
  version: Int!
  order: Order!
  status: OrderRefundStatus!
  amount: Money!
  reasonCode: String!
  note: String
  lines: [OrderRefundLine!]!
  transactions: [OrderPaymentTransaction!]!
  createdAt: DateTime!
  processedAt: DateTime
}

type OrderRefundLine {
  orderLine: OrderLine
  quantity: Int
  amount: Money!
}

type OrderActivity implements Node {
  id: ID!
  sequence: BigInt!
  type: String!
  visibility: String!
  message: String
  actor: OrderActor!
  data: JSON!
  happenedAt: DateTime!
  recordedAt: DateTime!
}

type OrderActor {
  type: OrderActorType!
  id: ID
  displayName: String
  user: User
  apiKey: ApiKey
}

type OrderIntegrationLink implements Node {
  id: ID!
  kind: OrderIntegrationKind!
  appCode: String!
  installationId: ID!
  direction: OrderSyncDirection!
  externalId: String
  externalUrl: URL
  status: OrderIntegrationSyncStatus!
  lastExportedOrderVersion: Int
  lastImportedExternalVersion: String
  lastSyncedAt: DateTime
  lastErrorCode: String
  lastErrorMessage: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderOperation implements Node {
  id: ID!
  kind: OrderOperationKind!
  status: OrderOperationStatus!
  order: Order
  resourceId: ID
  idempotencyKey: String!
  progress: Int
  failureCode: String
  failureMessage: String
  retryable: Boolean!
  createdAt: DateTime!
  startedAt: DateTime
  completedAt: DateTime
}

type OrderEditSession implements Node {
  id: ID!
  version: Int!
  order: Order!
  baseOrderVersion: Int!
  status: String!
  calculatedOrder: CalculatedOrder!
  changes: [OrderEditChange!]!
  createdBy: OrderActor!
  createdAt: DateTime!
  expiresAt: DateTime!
}

type CalculatedOrder {
  lines: [OrderLine!]!
  cost: OrderCost!
  balanceDelta: Money!
}

type OrderEditChange implements Node {
  id: ID!
  kind: String!
  payload: JSON!
  createdAt: DateTime!
}

type OrderConnection implements Connection {
  edges: [OrderEdge!]!
  nodes: [Order!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type OrderEdge {
  cursor: Cursor!
  node: Order!
}
type OrderReturnConnection implements Connection {
  edges: [OrderReturnEdge!]!
  nodes: [OrderReturn!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
type OrderReturnEdge {
  cursor: Cursor!
  node: OrderReturn!
}
type OrderExchangeConnection implements Connection {
  edges: [OrderExchangeEdge!]!
  nodes: [OrderExchange!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
type OrderExchangeEdge {
  cursor: Cursor!
  node: OrderExchange!
}
type OrderRefundConnection implements Connection {
  edges: [OrderRefundEdge!]!
  nodes: [OrderRefund!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
type OrderRefundEdge {
  cursor: Cursor!
  node: OrderRefund!
}
type OrderActivityConnection implements Connection {
  edges: [OrderActivityEdge!]!
  nodes: [OrderActivity!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
type OrderActivityEdge {
  cursor: Cursor!
  node: OrderActivity!
}

input OrderWhereInput {
  and: [OrderWhereInput!]
  or: [OrderWhereInput!]
  id: IDFilterInput
  number: BigIntFilterInput
  status: OrderStatusFilterInput
  paymentStatus: OrderPaymentStatusFilterInput
  fulfillmentStatus: OrderFulfillmentStatusFilterInput
  deliveryStatus: OrderDeliveryStatusFilterInput
  returnStatus: OrderReturnStatusFilterInput
  placementStatus: OrderPlacementStatusFilterInput
  customerId: IDFilterInput
  customerName: StringFilterInput
  customerEmail: StringFilterInput
  customerPhone: StringFilterInput
  externalId: StringFilterInput
  sourceCode: StringFilterInput
  totalAmount: DecimalFilterInput
  currencyCode: CurrencyCodeFilterInput
  shippingCountry: CountryCodeFilterInput
  deliveryMethodCode: StringFilterInput
  paymentMethodCode: StringFilterInput
  tag: StringFilterInput
  trackingNumber: StringFilterInput
  hasTracking: Boolean
  archived: Boolean
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  placedAt: DateTimeFilterInput
}

input OrderOrderByInput {
  field: OrderSortField!
  direction: SortDirection!
}
input IDFilterInput {
  eq: ID
  in: [ID!]
  notIn: [ID!]
}
input BigIntFilterInput {
  eq: BigInt
  gt: BigInt
  gte: BigInt
  lt: BigInt
  lte: BigInt
}
input DecimalFilterInput {
  eq: Decimal
  gt: Decimal
  gte: Decimal
  lt: Decimal
  lte: Decimal
}
input StringFilterInput {
  eq: String
  in: [String!]
  contains: String
  startsWith: String
}
input DateTimeFilterInput {
  eq: DateTime
  gt: DateTime
  gte: DateTime
  lt: DateTime
  lte: DateTime
}
input OrderStatusFilterInput {
  eq: OrderStatus
  in: [OrderStatus!]
}
input OrderPaymentStatusFilterInput {
  eq: OrderPaymentStatus
  in: [OrderPaymentStatus!]
}
input OrderFulfillmentStatusFilterInput {
  eq: OrderFulfillmentStatus
  in: [OrderFulfillmentStatus!]
}
input OrderDeliveryStatusFilterInput {
  eq: OrderDeliveryStatus
  in: [OrderDeliveryStatus!]
}
input OrderReturnStatusFilterInput {
  eq: OrderReturnStatus
  in: [OrderReturnStatus!]
}
input OrderPlacementStatusFilterInput {
  eq: OrderPlacementStatus
  in: [OrderPlacementStatus!]
}
input CurrencyCodeFilterInput {
  eq: CurrencyCode
  in: [CurrencyCode!]
}
input CountryCodeFilterInput {
  eq: CountryCode
  in: [CountryCode!]
}

input MoneyInput {
  amount: Decimal!
  currencyCode: CurrencyCode!
}
input WeightInput {
  value: Float!
  unit: WeightUnit!
}
input DimensionsInput {
  width: Float!
  height: Float!
  length: Float!
  unit: DimensionUnit!
}

input OrderAddressInput {
  firstName: String
  middleName: String
  lastName: String
  company: String
  address1: String
  address2: String
  city: String
  provinceCode: String
  postalCode: String
  countryCode: CountryCode!
  email: String
  phone: String
  data: JSON
}

input OrderContactInput {
  email: String
  phone: String
  firstName: String
  middleName: String
  lastName: String
  company: String
  note: String
}

input OrderLineCreateInput {
  purchasableId: ID
  title: String!
  sku: String
  quantity: Int!
  unitPrice: MoneyInput!
  unitCompareAtPrice: MoneyInput
  unitCost: MoneyInput
  weight: WeightInput
  requiresShipping: Boolean = true
  taxable: Boolean = true
  customFields: JSON
}

input OrderDeliveryInput {
  methodCode: String
  address: OrderAddressInput
  recipient: OrderContactInput
}

input OrderCreateInput {
  idempotencyKey: String!
  clientMutationId: String
  customerId: ID
  contact: OrderContactInput!
  billingAddress: OrderAddressInput
  shipping: OrderDeliveryInput
  localeCode: LocaleCode
  sourceCode: String
  externalId: String
  lines: [OrderLineCreateInput!]!
  paymentMethodCode: String
  tags: [String!]
  adminNote: String
  customerNote: String
  customFields: JSON
}

input OrderUpdateInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  contact: OrderContactInput
  billingAddress: OrderAddressInput
  shipping: OrderDeliveryInput
  localeCode: LocaleCode
  customerNote: String
}

input OrderDeleteInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
}
input OrderCompleteDraftInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  notifyCustomer: Boolean = false
}
input OrderCloseInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reason: String
}
input OrderReopenInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reason: String!
}
input OrderArchiveInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
}
input OrderUnarchiveInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
}

input OrderCancelInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reasonCode: String!
  staffNote: String
  notifyCustomer: Boolean = false
  restock: Boolean = true
  refundMode: String = "ORIGINAL_PAYMENT_METHODS"
}

input OrderCustomerSetInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  customerId: ID
}
input OrderTagsUpdateInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  tags: [String!]!
}
input OrderAdminNoteUpdateInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  adminNote: String
}
input OrderCommentAddInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  comment: String!
  visibility: String = "STAFF"
}
input OrderCustomFieldsUpdateInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  customFields: JSON!
}

input OrderLineAddInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  line: OrderLineCreateInput!
}
input OrderLineUpdateInput {
  orderId: ID!
  lineId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  quantity: Int
  unitCost: MoneyInput
  weight: WeightInput
  customFields: JSON
}
input OrderLineDeleteInput {
  orderId: ID!
  lineId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
}

input OrderEditBeginInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
}
input OrderEditLineAddInput {
  editId: ID!
  expectedEditVersion: Int!
  idempotencyKey: String!
  line: OrderLineCreateInput!
}
input OrderEditLineUpdateInput {
  editId: ID!
  lineId: ID!
  expectedEditVersion: Int!
  idempotencyKey: String!
  quantity: Int
  unitPrice: MoneyInput
}
input OrderEditLineRemoveInput {
  editId: ID!
  lineId: ID!
  expectedEditVersion: Int!
  idempotencyKey: String!
}
input OrderEditShippingUpdateInput {
  editId: ID!
  expectedEditVersion: Int!
  idempotencyKey: String!
  shipping: OrderDeliveryInput!
}
input OrderEditDiscountAddInput {
  editId: ID!
  expectedEditVersion: Int!
  idempotencyKey: String!
  title: String!
  amount: MoneyInput!
  reasonCode: String!
}
input OrderEditDiscountRemoveInput {
  editId: ID!
  discountId: ID!
  expectedEditVersion: Int!
  idempotencyKey: String!
}
input OrderEditCommitInput {
  editId: ID!
  expectedEditVersion: Int!
  expectedOrderVersion: Int!
  idempotencyKey: String!
  notifyCustomer: Boolean = false
  staffNote: String
}
input OrderEditAbandonInput {
  editId: ID!
  expectedEditVersion: Int!
  idempotencyKey: String!
}

input OrderManualPaymentRecordInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  amount: MoneyInput!
  methodCode: String!
  reference: String
  paidAt: DateTime!
  note: String
}
input OrderPaymentCaptureInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  transactionId: ID!
  amount: MoneyInput
}
input OrderPaymentVoidInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  transactionId: ID!
  reason: String!
}
input OrderPaymentRetryInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  paymentMethodCode: String
  returnUrl: URL
}
input OrderPaymentStatusOverrideInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  status: OrderPaymentStatus!
  reasonCode: String!
  note: String!
}

input OrderRefundCreateInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  amount: MoneyInput!
  reasonCode: String!
  note: String
  notifyCustomer: Boolean = false
  lines: [OrderRefundLineInput!]
  transactionAllocations: [OrderRefundTransactionAllocationInput!]
}
input OrderRefundLineInput {
  orderLineId: ID!
  quantity: Int!
  amount: MoneyInput!
}
input OrderRefundTransactionAllocationInput {
  transactionId: ID!
  amount: MoneyInput!
}

input FulfillmentOrderLineQuantityInput {
  fulfillmentOrderLineId: ID!
  quantity: Int!
}
input FulfillmentOrderSplitInput {
  fulfillmentOrderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  lines: [FulfillmentOrderLineQuantityInput!]!
}
input FulfillmentOrderMoveInput {
  fulfillmentOrderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  locationId: ID!
  serviceCode: String
}
input FulfillmentOrderHoldInput {
  fulfillmentOrderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reasonCode: String!
  note: String
}
input FulfillmentOrderReleaseHoldInput {
  fulfillmentOrderId: ID!
  holdId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
}
input FulfillmentOrderSubmitInput {
  fulfillmentOrderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
}
input FulfillmentOrderCancelRequestInput {
  fulfillmentOrderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reasonCode: String!
  note: String
}
input FulfillmentCreateInput {
  fulfillmentOrderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  lines: [FulfillmentOrderLineQuantityInput!]!
  notifyCustomer: Boolean = false
}
input FulfillmentCancelInput {
  fulfillmentId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reasonCode: String!
  restock: Boolean = true
}

input ShipmentCreateInput {
  fulfillmentId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  providerCode: String
  serviceCode: String
  packages: [ShipmentPackageInput!]!
  notifyCustomer: Boolean = false
}
input ShipmentPackageInput {
  weight: WeightInput
  dimensions: DimensionsInput
  declaredValue: MoneyInput
  items: [ShipmentPackageItemInput!]!
}
input ShipmentPackageItemInput {
  orderLineId: ID!
  quantity: Int!
}
input ShipmentTrackingUpdateInput {
  shipmentId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  tracking: [ShipmentTrackingInput!]!
}
input ShipmentTrackingInput {
  number: String!
  url: URL
  company: String
}
input ShipmentMarkShippedInput {
  shipmentId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  shippedAt: DateTime!
}
input ShipmentMarkDeliveredInput {
  shipmentId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  deliveredAt: DateTime!
}
input ShipmentCancelInput {
  shipmentId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reasonCode: String!
}
input ShipmentReconcileInput {
  shipmentId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
}

input OrderReturnLineInput {
  orderLineId: ID!
  quantity: Int!
  reasonCode: String!
  note: String
}
input OrderReturnCreateInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  lines: [OrderReturnLineInput!]!
  customerNote: String
  staffNote: String
  notifyCustomer: Boolean = false
}
input OrderReturnApproveInput {
  returnId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  locationId: ID!
  createReturnShipment: Boolean = false
  staffNote: String
}
input OrderReturnRejectInput {
  returnId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reasonCode: String!
  staffNote: String
}
input OrderReturnCancelInput {
  returnId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reasonCode: String!
}
input OrderReturnReceiveInput {
  returnId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  locationId: ID!
  lines: [OrderReturnReceiveLineInput!]!
  refund: OrderReturnRefundInput
}
input OrderReturnReceiveLineInput {
  orderLineId: ID!
  receivedQuantity: Int!
  restockableQuantity: Int!
  damagedQuantity: Int!
}
input OrderReturnRefundInput {
  amount: MoneyInput!
  reasonCode: String!
  notifyCustomer: Boolean = false
}

input OrderExchangeCreateInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  inboundLines: [OrderReturnLineInput!]!
  outboundLines: [OrderLineCreateInput!]!
  notifyCustomer: Boolean = false
  staffNote: String
}
input OrderExchangeCancelInput {
  exchangeId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reasonCode: String!
}

input OrderIntegrationSyncRequestInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  integrationLinkId: ID!
  force: Boolean = false
}
input OrderIntegrationSyncRetryInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  operationId: ID!
}
input OrderIntegrationLinkDetachInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  integrationLinkId: ID!
  reason: String!
}
input OrdersBulkActionInput {
  selection: OrderBulkSelectionInput!
  action: OrdersBulkActionKind!
  idempotencyKey: String!
  reasonCode: String
  tags: [String!]
  integrationLinkId: ID
}
input OrderBulkSelectionInput {
  ids: [ID!]
  where: OrderWhereInput
  excludedIds: [ID!]
}

type OrderUserError implements DisplayableError {
  field: [String!]
  message: String!
  code: String!
  retryable: Boolean!
  currentVersion: Int
}

type OrderPayload {
  order: Order
  userErrors: [OrderUserError!]!
  clientMutationId: String
}
type OrderDeletePayload {
  deletedId: ID
  order: Order
  userErrors: [OrderUserError!]!
}
type OrderLinePayload {
  order: Order
  line: OrderLine
  userErrors: [OrderUserError!]!
}
type OrderActivityPayload {
  order: Order
  activity: OrderActivity
  userErrors: [OrderUserError!]!
}
type OrderEditPayload {
  order: Order
  edit: OrderEditSession
  userErrors: [OrderUserError!]!
}
type OrderOperationPayload {
  order: Order
  operation: OrderOperation
  userErrors: [OrderUserError!]!
}
type FulfillmentOrderPayload {
  order: Order
  fulfillmentOrder: FulfillmentOrder
  userErrors: [OrderUserError!]!
}
type FulfillmentPayload {
  order: Order
  fulfillment: Fulfillment
  userErrors: [OrderUserError!]!
}
type ShipmentPayload {
  order: Order
  shipment: Shipment
  userErrors: [OrderUserError!]!
}
type OrderReturnPayload {
  order: Order
  return: OrderReturn
  userErrors: [OrderUserError!]!
}
type OrderExchangePayload {
  order: Order
  exchange: OrderExchange
  userErrors: [OrderUserError!]!
}
```

### 7.1. SDL validation notes

- Если shared Admin schema ещё не содержит `Cursor`, `Connection`, `PageInfo`, `DisplayableError`,
  `Money`, `Weight`, `Dimensions` и соответствующие unit enums, они сначала добавляются в
  `packages/shared-references`, а не дублируются в Orders.
- `BigInt` сериализуется строкой, чтобы order number/sequence не теряли точность.
- `Money.amount` и `MoneyInput.amount` — decimal string; в PostgreSQL суммы сохраняются minor-unit
  `bigint` и currency code.
- `Order.version` — integer revision строки заказа для optimistic concurrency; `updatedAt` не
  используется как concurrency token.
- Global IDs декодируются с проверкой entity type до вызова Script.
- `userErrors` используются для validation/business/permission conflicts; transport/system failures
  остаются GraphQL errors.
- `orderOperation` нужен для long-running DBOS operations и polling. Mutation может вернуть уже
  `SUCCEEDED` operation для синхронно завершившейся команды.

## 8. Как черновые Admin UI операции отображаются на enterprise API

| Операция чернового UI       | Целевой GraphQL contract                                                   | Правило                                                                         |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Список заказов              | `ordersQuery.orders`                                                       | Relay pagination, server filter/search/sort                                     |
| Заказ по ID                 | `ordersQuery.order`                                                        | store-scoped lookup, inaccessible → `null`                                      |
| Создать заказ               | `orderCreate`                                                              | создаёт `DRAFT`; totals рассчитывает сервер                                     |
| Полностью обновить заказ    | `orderUpdate` для реквизитов; draft line mutations; staged edit для `OPEN` | generic aggregate overwrite запрещён                                            |
| Удалить заказ               | `orderDelete`                                                              | только `DRAFT`, placed order физически не удаляется                             |
| Отменить заказ              | `orderCancel`                                                              | durable workflow: fulfillment cancellation, void/refund, restock, notifications |
| Изменить order status       | `orderCompleteDraft`, `orderClose`, `orderReopen`, `orderCancel`           | arbitrary `nextStatus` заменён явными командами                                 |
| Archive/unarchive           | `orderArchive`, `orderUnarchive`                                           | `archivedAt`, не lifecycle status                                               |
| Изменить payment status     | capture/void/refund/manual payment/retry                                   | provider-managed status всегда derived                                          |
| Ручной payment override     | `orderPaymentStatusOverride`                                               | только offline/import, elevated permission и причина                            |
| Изменить fulfillment status | hold/release/create/cancel/ship/deliver                                    | aggregate status derived из фактов                                              |
| Attach/detach customer      | `orderCustomerSet`                                                         | customer reference меняется; historical contact snapshot сохраняется            |
| Tags                        | `orderTagsUpdate`                                                          | нормализация, лимиты, audit event                                               |
| Admin note                  | `orderAdminNoteUpdate`                                                     | mutable current note + immutable event                                          |
| Comment                     | `orderCommentAdd`                                                          | append-only activity, staff/customer visibility                                 |
| Add/update/delete line      | direct mutations для `DRAFT`; staged edit для `OPEN`                       | shipped/returned quantities нельзя переписать                                   |
| Изменить weight/cost        | `orderLineUpdate` или staged edit                                          | cost admin-only; financial recalculation server-side                            |
| Split fulfillment           | `fulfillmentOrderSplit`                                                    | делится work unit, а не исходная order line                                     |
| Undo split                  | новый split/move/merge policy                                              | исторический split не удаляется; создаётся compensating event                   |
| Создать shipment            | `shipmentCreate`                                                           | merchant managed или provider workflow                                          |
| Изменить tracking           | `shipmentTrackingUpdate`                                                   | provider-managed tracking может быть read-only                                  |
| Shipping details            | `orderUpdate` для draft/pre-shipment; staged edit для placed order         | destination snapshot versioned                                                  |
| Payment details             | draft `orderUpdate`; placed `orderPaymentRetry` с новым method             | существующую provider attempt не перепривязываем                                |

### 8.1. Намеренно отсутствующий generic status update

Следующие поля нельзя выставлять одним `statusUpdate(nextStatus)`:

- payment `PAID` без successful capture/sale/manual transaction;
- fulfillment `FULFILLED` без quantities в fulfillment lines;
- delivery `DELIVERED` без shipment fact;
- return `RETURNED` без received quantities;
- order `CANCELLED` без cancellation workflow.

Admin UI должен отображать `availableActions` и открывать command-specific modal. Это устраняет
невозможные комбинации вроде `PAID + payment transactions = []` или
`FULFILLED + fulfilledQuantity = 0`.

## 9. Целевая PostgreSQL-модель

### 9.1. Общие правила

- Все persisted IDs — PostgreSQL UUIDv7.
- Каждая store-scoped таблица содержит `store_id`; все repository predicates включают `store_id`.
- Межтабличные FK внутри Orders составные: `(store_id, id)` или `(store_id, order_id, id)`.
- FK в другие сервисы не создаются. Customer, Checkout, app installation, location, catalog IDs
  являются typed references.
- Денежные суммы: `bigint` minor units + `currency_code varchar(3)`.
- Queryable business state не прячется в JSONB.
- JSONB используется для immutable provider snapshots, custom fields и versioned event payloads.
- Все lifecycle timestamps — `timestamptz`.
- Канонические state tables, audit records и idempotency обновляются в одном DBOS transactional
  step, чтобы mutation обеспечивала read-after-write и durable checkpoint.
- Outbound side effects идут только после committed transactional step через DBOS workflow.
- Локальные publish-queue tables/workers запрещены: retry, recovery и delivery state принадлежат
  DBOS.

### 9.2. Concurrency, audit и operational control

| Таблица                     | Назначение                                          | Ключевые поля/constraints                                                                                                                                      |
| --------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orders`                    | canonical state и concurrency revision              | `version > 0`; conditional update по `(store_id, id, version)`                                                                                                 |
| `order_events`              | immutable audit/integration log, не source of truth | `event_id`, `order_version`, `global_position`, `event_type`, `schema_version`, actor/correlation/causation, payload; unique event ID и order-version/type key |
| `order_idempotency_records` | replay command result                               | `(store_id, operation, idempotency_key)`, request hash, status, response, expiry                                                                               |
| `order_operations`          | DBOS/Admin async jobs                               | kind/status/order/resource/workflow UUID/failure/progress                                                                                                      |
| `order_operation_attempts`  | provider/worker attempts                            | operation, attempt number, route, request/response hashes, error, duration                                                                                     |

Command transaction algorithm:

1. lock `orders` row или создаваемый business key;
2. compare `expectedVersion` with `orders.version`;
3. validate idempotency record and request hash;
4. validate command against current normalized state;
5. atomically update canonical state and increment `orders.version` once per command;
6. append immutable audit records for the committed version;
7. insert operation state с DBOS workflow identity;
8. store serialized mutation result in idempotency record;
9. commit.

### 9.3. Core state

| Таблица                           | Содержание                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `orders`                          | current lifecycle/derived statuses, order number, source, checkout/customer refs, totals, timestamps, current version |
| `order_lines`                     | immutable identity/snapshots + current quantities and amounts                                                         |
| `order_line_discount_allocations` | discount application → line allocations                                                                               |
| `order_line_tax_lines`            | title/rate/jurisdiction/included/amount                                                                               |
| `order_line_duties`               | duties/customs allocations                                                                                            |
| `order_adjustments`               | authorized manual/system adjustments with reason and actor                                                            |
| `order_contacts`                  | current PII snapshot, retention and redaction markers                                                                 |
| `order_addresses`                 | versioned billing/shipping/return address snapshots                                                                   |
| `order_delivery_groups`           | lines, address, recipient and selected method snapshot                                                                |
| `order_delivery_methods`          | provider/method/customer input and quoted amount snapshot                                                             |
| `order_checkout_placements`       | Checkout placement provenance, revisions, snapshot hash и handshake status                                            |
| `order_checkout_commitments`      | immutable references на inventory/pricing/loyalty/delivery commitments                                                |
| `order_tags`                      | normalized tags and actor                                                                                             |
| `order_admin_notes`               | current admin note state                                                                                              |
| `order_activity`                  | query-optimized immutable timeline                                                                                    |

`orders` не хранит поля старой Drizzle-модели `subtotal`, `shipping_total`, `grand_total`.
Канонические имена:

```text
subtotal_amount
discount_amount
shipping_amount
tax_amount
duty_amount
adjustment_amount
total_amount
```

### 9.4. Order editing

| Таблица                      | Назначение                                                             |
| ---------------------------- | ---------------------------------------------------------------------- |
| `order_edit_sessions`        | base order version, session version, status, expiry, calculated totals |
| `order_edit_changes`         | ordered staged commands; append-only within active session             |
| `order_edit_line_read_model` | optional fast calculated view for large edits                          |

Edit session никогда не меняет placed order до `orderEditCommit`. Commit повторно проверяет base
order version, availability of affected quantities, pricing/tax result и финансовый balance delta.

### 9.5. Payment state

| Таблица                                | Назначение                                          |
| -------------------------------------- | --------------------------------------------------- |
| `order_payment_methods`                | immutable method/provider/customer-input snapshots  |
| `order_payment_attempts`               | session/attempt lifecycle and customer action       |
| `order_payment_transactions`           | authorization/capture/sale/refund/void/manual facts |
| `order_payment_transaction_fees`       | processor fees                                      |
| `order_payment_disputes`               | dispute/chargeback state                            |
| `order_refunds`                        | customer-visible refund request/result              |
| `order_refund_lines`                   | quantity/amount attribution                         |
| `order_refund_transaction_allocations` | refund → captured transaction allocation            |
| `order_payment_event_inbox`            | provider/payment event deduplication and ordering   |

Payments service остаётся authoritative executor. Orders не вызывает provider App напрямую и не
изменяет transaction outcome задним числом.

### 9.6. Fulfillment capability

| Таблица                              | Назначение                                              |
| ------------------------------------ | ------------------------------------------------------- |
| `order_fulfillment_orders`           | work unit per order/delivery group/location/service     |
| `order_fulfillment_order_lines`      | allocated and remaining quantities                      |
| `order_fulfillment_holds`            | active/released holds with reasons                      |
| `order_fulfillment_service_requests` | submit/cancel/revision state pinned to App installation |
| `order_fulfillments`                 | merchant/service completion unit                        |
| `order_fulfillment_lines`            | fulfilled quantities by order line                      |
| `order_shipments`                    | shipment lifecycle and provider route/reference         |
| `order_shipment_packages`            | physical packages                                       |
| `order_shipment_package_lines`       | package content quantities                              |
| `order_shipment_tracking_numbers`    | one or more tracking IDs/URLs                           |
| `order_shipment_tracking_events`     | append-only carrier timeline                            |
| `order_shipment_provider_operations` | create/cancel/reconcile idempotent operation state      |
| `order_fulfillment_event_inbox`      | 3PL/carrier event dedupe and sequence control           |

Старые `delivery_fulfillment_snapshots` и `delivery_fulfillment_updates` не должны существовать
параллельно с нормализованным capability. На чистой БД выбирается одна модель: нормализованные
fulfillment tables + immutable event payloads.

### 9.7. Returns, exchanges и refunds

| Таблица                         | Назначение                                                   |
| ------------------------------- | ------------------------------------------------------------ |
| `order_return_requests`         | RMA lifecycle                                                |
| `order_return_request_lines`    | requested/received/restockable/damaged quantities            |
| `order_return_shipments`        | inbound shipment link                                        |
| `order_return_tracking_events`  | inbound tracking timeline                                    |
| `order_exchanges`               | exchange lifecycle and balance                               |
| `order_exchange_inbound_lines`  | links to return lines                                        |
| `order_exchange_outbound_lines` | replacement line snapshots                                   |
| `order_refunds` and children    | common financial refund shared by return/exchange/correction |

Return и refund — разные сущности: товар может быть возвращён без refund, а refund может быть создан
без physical return.

### 9.8. CRM/ERP integration state

| Таблица                           | Назначение                                                                 |
| --------------------------------- | -------------------------------------------------------------------------- |
| `order_external_references`       | unique `(store, system_code, external_id)` mapping                         |
| `order_integration_links`         | App installation, direction, sync status, external URL/revisions           |
| `order_integration_sync_attempts` | exported order version, external revision, request/response hashes, result |
| `order_integration_event_inbox`   | inbound provider event dedupe                                              |

CRM-specific fields остаются в App configuration/mapping. Core Orders знает только stable link,
revisions, sync health и external reference.

### 9.9. Основные database constraints

```text
order.version > 0
order.number > 0 and unique per store
currency_code = store/order currency for all child money rows
quantity > 0
0 <= cancelled_quantity <= quantity
fulfilled + cancelled + remaining <= quantity
returned_quantity <= fulfilled_quantity
refunded amount <= refundable captured amount, кроме explicit privileged over-refund policy
line subtotal = unit price * quantity
line total = subtotal - discount + tax + duty + adjustment
order total = subtotal - discount + shipping + tax + duty + adjustment
one active edit session per order
one active selected payment method per order
provider event sequence is monotonic per provider resource
shipment package quantities <= fulfillment quantities
received = restockable + damaged + other disposition quantities
external reference unique per installation/system
```

Append-only triggers запрещают `UPDATE/DELETE` для event, status history, tracking event и finalized
transaction rows. PII redaction выполняется отдельной разрешённой function/command и никогда не
изменяет financial facts.

### 9.10. Предлагаемый migration layout

```text
services/orders/migrations/domains/
  0000_foundation/
    0000_foundation__schema.sql
    0001_foundation__types.sql
    0002_foundation__functions.sql
  0100_operational/
    0100_operational__audit_events.sql
    0101_operational__idempotency.sql
    0102_operational__operations.sql
  0200_orders/
    0200_orders__orders_lines.sql
    0201_orders__amounts_allocations.sql
    0202_orders__contacts_addresses.sql
    0203_orders__delivery_groups.sql
    0204_orders__activity_tags.sql
    0205_orders__checkout_placements.sql
  0300_edits/
    0300_edits__sessions_changes.sql
  0400_payments/
    0400_payments__methods_attempts.sql
    0401_payments__transactions.sql
    0402_payments__refunds_disputes.sql
    0403_payments__event_inbox.sql
  0500_fulfillment/
    0500_fulfillment__orders_lines_holds.sql
    0501_fulfillment__service_requests.sql
    0502_fulfillment__fulfillments.sql
    0503_fulfillment__shipments_packages.sql
    0504_fulfillment__tracking_provider_events.sql
  0600_returns/
    0600_returns__requests_lines.sql
    0601_returns__shipments.sql
    0602_returns__exchanges.sql
  0700_integrations/
    0700_integrations__external_links.sql
    0701_integrations__sync_attempts_inbox.sql
  0800_integrity/
    0800_integrity__financial.sql
    0801_integrity__quantity.sql
    0802_integrity__audit.sql
```

Так как production/stage данных нет, реализация не добавляет compatibility views или rename
migrations поверх несовместимых `order_items`/старых amount columns. Существующие migrations и
Drizzle models приводятся к одному контракту до первого эксплуатационного релиза.

## 10. Доменные инварианты и команды

### 10.1. Draft order

- `orderCreate` всегда создаёт `DRAFT`.
- Минимум одна line обязательна перед `orderCompleteDraft`, но draft можно временно сохранить пустым
  только если это явно понадобится UX; V1 SDL требует непустой create input.
- Currency берётся из store context; input currency обязан совпасть, если MoneyInput содержит code.
- Totals, taxes, discounts и shipping пересчитываются сервером; client totals игнорируются и не
  принимаются SDL.
- Прямые add/update/delete line разрешены только в `DRAFT`.
- `orderDelete` tombstone/удаляет только draft без external operations. Placed order отменяется или
  архивируется.

### 10.2. Placed order edits

- `OPEN` order line changes выполняются через `OrderEditSession`.
- Редактировать можно только quantity, не участвующую в shipment/return/refund.
- Edit session содержит calculated preview и balance delta.
- Positive delta создаёт outstanding balance/payment flow; negative delta создаёт refundable credit,
  но не автоматический refund без policy.
- Commit атомарен относительно order version и inventory reallocation workflow.
- Session имеет TTL и только один active session на order.

### 10.3. Cancellation

`orderCancel` — DBOS workflow:

1. validate order/returns/payment/fulfillment eligibility;
2. request cancellation for external fulfillment work;
3. cancel merchant-managed fulfillment where possible;
4. cancel shipments that provider позволяет отменить;
5. void active authorizations;
6. calculate and optionally create refund;
7. release/restock inventory according to input/policy;
8. atomically set order state to `CANCELLED` and increment version only после выполнения
   обязательных шагов;
9. publish self-contained event and notification request.

Если external service ещё рассматривает cancellation, operation остаётся `RUNNING`, а order не
объявляется окончательно cancelled преждевременно.

### 10.4. Payment

- Financial status строится из ledger-like successful transactions.
- Capture/void/refund используют Payments service contracts и DBOS.
- Каждая provider operation pinned к original provider installation/account.
- Duplicate provider events безопасны; out-of-order events сравниваются по sequence.
- Manual payment создаёт transaction kind `MANUAL`, actor, reference и paidAt.
- Override не создаёт фиктивную provider transaction и помечается отдельным audited adjustment
  event.

### 10.5. Quantity conservation

Для каждой order line поддерживается conservation equation:

```text
ordered quantity
  = open/remaining quantity
  + cancelled quantity
  + fulfilled quantity

fulfilled quantity
  >= returned in transit
  >= received return quantity

captured value
  >= allocated successful refunds
```

Split/move fulfillment не меняет ordered quantity: он только перераспределяет remaining fulfillment
work.

## 11. Отдельный fulfillment capability

### 11.1. Три разных понятия

1. `FulfillmentOrder` — что и откуда ещё требуется выполнить. Это allocation/work object.
2. `Fulfillment` — зафиксированное выполнение конкретных quantities.
3. `Shipment` — физическая перевозка fulfillment packages.

Их нельзя объединять в один `shippingItem`: один order может иметь несколько locations,
fulfillments, packages, tracking numbers и providers.

### 11.2. Режимы выполнения

| Режим                     | Исполнитель                      | Поведение                                                           |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| Merchant managed          | staff/Admin                      | create fulfillment и shipment вручную                               |
| Fulfillment service / 3PL | `fulfillment.service` App        | submit work request, accept/reject/cancel asynchronously            |
| Carrier shipment          | `delivery.shipment-provider` App | label/create/cancel/get/reconcile shipment                          |
| Pickup/local              | merchant/location                | shipment может отсутствовать; используется picked-up/delivered fact |

### 11.3. Новый App capability: `fulfillment.service`

```ts
{
  key: "fulfillment.service",
  assignmentMode: "store",
  routingMode: "broadcast",
  operations: {
    validateConfiguration: "validateConfiguration",
    getServices: "getServices",
    submitFulfillmentRequest: "submitFulfillmentRequest",
    requestCancellation: "requestCancellation",
    getFulfillmentRequest: "getFulfillmentRequest",
    reconcileFulfillmentRequest: "reconcileFulfillmentRequest"
  }
}
```

Semantics:

- `validateConfiguration` возвращает provider/service identity, locations, supported actions и
  revision;
- `getServices` — discovery без mutation;
- `submitFulfillmentRequest` идемпотентно создаёт work у 3PL;
- `requestCancellation` может вернуть pending request;
- `get...` и `reconcile...` опциональны только если provider реально их поддерживает;
- route `(appCode, installationId, serviceCode, providerRevision)` записывается в fulfillment order;
- provider не получает произвольный доступ к Orders GraphQL или БД.

Для async completion App запрашивает минимальные platform permissions:

```text
orders.completeFulfillmentProviderOperation
orders.reportFulfillmentProviderEvent
```

### 11.4. Carrier integration

Существующий `delivery.shipment-provider` остаётся отдельным capability. Fulfillment service может
подготовить packages, а carrier App — создать label/shipment. Один App может реализовывать оба
capability только если это один внешний provider с едиными credentials и lifecycle.

### 11.5. Durable workflows

Каждая state-changing Orders operation является DBOS workflow независимо от наличия внешних
service/provider calls. Это относится ко всем Admin mutations, Checkout placement commands, provider
callbacks, event ingestion, reconciliation и internal/bulk commands. Даже полностью локальная
операция не выполняет запись напрямую из resolver, broker handler или Script entry point: они
запускают workflow с deterministic workflow ID, а PostgreSQL mutation выполняется его
`@TransactionalStep()`.

Ниже перечислены характерные long-running workflows; список не ограничивает обязательное правило
выше:

- `orders.cancelOrder`;
- `orders.commitOrderEdit`;
- `orders.submitFulfillmentOrder`;
- `orders.cancelFulfillmentOrder`;
- `orders.createShipment`;
- `orders.cancelShipment`;
- `orders.reconcileShipment`;
- `orders.receiveReturn`;
- `orders.syncExternalOrder`;
- `orders.bulkAction`.

Provider calls являются workflow steps с idempotency key, timeout, retry policy и persisted
operation result. Компенсация не должна притворяться, что необратимое действие отменено: например,
already shipped shipment требует exception/manual resolution, а не локального rollback.

## 12. CRM/ERP integration design

### 12.1. Принцип

Orders публикует commerce facts. CRM App преобразует их в собственную модель: order/deal, line
items, contact association, owner/pipeline/custom fields. Orders не знает, использует ли CRM
отдельный Order object, Deal или custom object.

### 12.2. App capability: `crm.order-sync`

```ts
{
  key: "crm.order-sync",
  assignmentMode: "store",
  routingMode: "broadcast",
  operations: {
    validateConfiguration: "validateConfiguration",
    upsertOrder: "upsertOrder",
    cancelOrder: "cancelOrder",
    reconcileOrder: "reconcileOrder"
  }
}
```

Optional capability для inbound changes должен быть отдельным и более привилегированным:

```text
crm.order-import
```

Он не может передавать generic patch. Он вызывает versioned Shopana commands с `sourceSystem`,
`externalRevision`, `idempotencyKey` и normal authorization/policy validation.

### 12.3. Self-contained export snapshot

```ts
interface OrderSyncSnapshotV1 {
  schemaVersion: 1;
  organizationId: string;
  storeId: string;
  orderId: string;
  orderVersion: number;
  orderNumber: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  paymentStatus: string;
  fulfillmentStatus: string;
  deliveryStatus: string;
  source: { code: string; externalId: string | null } | null;
  customer: {
    customerId: string | null;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  currencyCode: string;
  totals: {
    subtotalMinor: string;
    discountMinor: string;
    shippingMinor: string;
    taxMinor: string;
    totalMinor: string;
    paidMinor: string;
    refundedMinor: string;
  };
  lines: readonly {
    orderLineId: string;
    productId: string | null;
    variantId: string | null;
    sku: string | null;
    title: string;
    quantity: number;
    unitPriceMinor: string;
    totalMinor: string;
  }[];
  tags: readonly string[];
  placedAt: string | null;
  updatedAt: string;
}
```

Snapshot не требует runtime fan-out в Catalog/Customer. PII включается только при наличии granted
scopes и store policy.

### 12.4. Sync correctness

- Export key: `(installationId, orderId, orderVersion)`.
- Inbound key: `(installationId, externalId, externalRevision)`.
- App возвращает `externalId`, `externalUrl`, `externalRevision`.
- Orders обновляет link только после успешного provider result.
- Echo-loop prevention: imported event хранит source installation/revision; тот же revision не
  экспортируется обратно без реального Shopana change.
- `lastExportedOrderVersion < order.version` означает `OUT_OF_SYNC`.
- Retry использует тот же snapshot/version; force sync создаёт новую operation, но не меняет order.
- Reconciliation сравнивает external revision/hash и создаёт discrepancy record, а не молча
  перезаписывает commerce truth.
- Uninstall App не удаляет order history/external IDs; link становится `DISABLED`.

### 12.5. PII и CRM

- отдельные permissions: `orders.pii.read`, `orders.integrations.manage`, provider granted scope;
- masking в GraphQL и export snapshot;
- secrets только в App installation secret store;
- provider request/response logging redacts PII и credentials;
- right-to-erasure redacts contact/address fields, сохраняя order number, sums, taxes и audit
  hashes.

## 13. Domain events и DBOS delivery

### 13.1. Envelope

```ts
interface OrderIntegrationEvent<TType extends string, TPayload> {
  eventId: string;
  eventType: TType;
  schemaVersion: number;
  aggregateType: "ORDER";
  orderId: string;
  storeId: string;
  organizationId: string;
  orderVersion: number;
  actor: { type: string; id: string | null };
  correlationId: string;
  causationId: string | null;
  idempotencyKey: string;
  occurredAt: string;
  payload: TPayload;
}
```

### 13.2. Минимальный audit/integration event catalog

Эти события фиксируют изменения канонических state tables в том же DBOS transactional step и
доставляются отдельными idempotent DBOS workflow steps после commit. Они не используются как журнал
восстановления aggregate и не заменяют строки `orders` и дочерних таблиц. Отдельная локальная
очередь для их доставки не создаётся.

Core:

```text
order.placed
order.checkout_placement_confirmed
order.checkout_placement_failed
order.draft_created
order.draft_completed
order.details_updated
order.customer_link_changed
order.tags_updated
order.admin_note_updated
order.comment_added
order.cancel_requested
order.cancelled
order.closed
order.reopened
order.archived
order.unarchived
```

Editing:

```text
order.edit_started
order.edit_change_staged
order.edit_committed
order.edit_abandoned
```

Payments:

```text
order.payment_method_selected
order.payment_attempt_started
order.payment_state_changed
order.payment_transaction_recorded
order.payment_dispute_changed
order.refund_requested
order.refund_completed
order.refund_failed
```

Fulfillment/delivery:

```text
order.fulfillment_order_created
order.fulfillment_order_split
order.fulfillment_order_moved
order.fulfillment_order_held
order.fulfillment_request_changed
order.fulfillment_created
order.fulfillment_cancelled
order.shipment_created
order.shipment_tracking_updated
order.shipment_state_changed
```

Returns/exchanges/integrations:

```text
order.return_requested
order.return_approved
order.return_rejected
order.return_received
order.exchange_created
order.exchange_cancelled
order.integration_sync_requested
order.integration_sync_completed
order.integration_sync_failed
```

Events, которые потребляют другие bounded contexts, должны быть self-contained. Internal aggregate
events и public integration facts могут иметь разные payload schemas, но public event всегда
ссылается на source event ID/version.

## 14. Business/application layer

### 14.1. Целевая структура

```text
services/orders/src/
  domain/
    order/
      OrderAggregate.ts
      OrderEvents.ts
      OrderPolicies.ts
      OrderStateMachine.ts
    placement/
      OrderPlacementSnapshot.ts
      OrderPlacementPolicies.ts
    payment/
    fulfillment/
    returns/
    integration/
  scripts/
    order/
    checkout-placement/
    order-edit/
    payment/
    fulfillment/
    shipment/
    returns/
    integration/
  workflows/
  handlers/
  repositories/
    event-store/
    read/
    payment/
    fulfillment/
    returns/
    integration/
    models/
  resolvers/admin/
    OrdersType.ts
    QueryResolver.ts
    MutationResolver.ts
    OrderResolver.ts
    OrderConnectionResolver.ts
    ...
  loaders/
  context/
```

### 14.2. Command execution

- Resolver декодирует Global IDs, но не содержит бизнес-правил.
- Zod schema валидирует форму input и cross-field shape.
- Resolver, broker handler и callback handler не исполняют command напрямую: каждая операция
  запускается через зарегистрированный DBOS workflow с deterministic workflow ID.
- Script выполняет Policy, загружает current state, применяет command и атомарно сохраняет state,
  audit и idempotency records внутри DBOS transactional step.
- Repository не решает lifecycle policy; он только сохраняет/читает tenant-scoped data.
- Простая локальная команда состоит минимум из одного `@TransactionalStep()`; внешние вызовы,
  ожидание callback, retry и compensation добавляются отдельными workflow steps.
- Прямой write path в обход DBOS запрещён для Admin, Checkout, provider и internal commands.
- Resolver возвращает resolver instances, а relations загружаются DataLoader-ами.

### 14.3. RBAC permissions

```text
orders.read
orders.pii.read
orders.create
orders.edit
orders.cancel
orders.close
orders.archive
orders.comments.write
orders.payments.manage
orders.payments.override
orders.fulfillment.manage
orders.shipments.manage
orders.returns.manage
orders.refunds.manage
orders.integrations.read
orders.integrations.manage
orders.audit.read
orders.bulk.manage
```

Permissions проверяются на Script/type-policy уровне. Provider App получает только capability scopes
конкретной installation, а не staff permissions.

## 15. GraphQL resolver/read design

### 15.1. List query

- `@shopana/drizzle-query` Relay builder;
- default order: `createdAt DESC, id DESC`;
- любое другое orderBy заканчивается tie-breaker `id`;
- максимальная page size: 100;
- backward pagination поддерживается;
- `totalCount` считается по полному tenant-scoped filter до pagination;
- full-text customer/order search при росте данных выносится в отдельный search index/read table, не
  в `%LIKE%` по join-ам;
- archived по умолчанию исключаются, если filter явно не запросил их.

### 15.2. Detail query

- `OrderResolver.$preload()` загружает `(storeId, id)`;
- PII fields имеют отдельную authorization policy;
- lines, payments, fulfillment, shipments, activity и integrations используют batch loaders;
- unavailable federation reference возвращает `null`, но historical snapshot остаётся доступен;
- `availableActions` вычисляется server-side из aggregate snapshot, permissions и provider
  capabilities.

### 15.3. Mutation freshness

Каждый successful synchronous payload возвращает текущий `Order`. Async payload возвращает
`operation` и последний committed `Order`. UI:

1. обновляет detail из payload;
2. poll/subscription для operation;
3. после terminal operation refetch-ит detail и affected list;
4. при `VERSION_CONFLICT` не делает automatic retry mutation.

## 16. Error contract

Минимальный стабильный catalog:

```text
ORDER_NOT_FOUND
ORDER_VERSION_CONFLICT
ORDER_IDEMPOTENCY_CONFLICT
ORDER_ACTION_NOT_AVAILABLE
ORDER_STATUS_TRANSITION_INVALID
ORDER_DRAFT_REQUIRED
ORDER_LINE_NOT_FOUND
ORDER_LINE_QUANTITY_INVALID
ORDER_LINE_ALREADY_FULFILLED
ORDER_TOTAL_INVALID
ORDER_CURRENCY_MISMATCH
ORDER_PLACEMENT_NOT_FOUND
ORDER_PLACEMENT_CONTRACT_UNSUPPORTED
ORDER_PLACEMENT_SNAPSHOT_HASH_MISMATCH
ORDER_PLACEMENT_ALREADY_CONFIRMED
ORDER_PLACEMENT_ALREADY_FAILED
ORDER_PLACEMENT_EVIDENCE_INVALID
ORDER_PLACEMENT_IDEMPOTENCY_CONFLICT
ORDER_EDIT_ALREADY_ACTIVE
ORDER_EDIT_EXPIRED
ORDER_EDIT_STALE
ORDER_PAYMENT_ACTION_NOT_AVAILABLE
ORDER_PAYMENT_PROVIDER_UNAVAILABLE
ORDER_REFUND_AMOUNT_EXCEEDED
FULFILLMENT_ORDER_NOT_FOUND
FULFILLMENT_ORDER_VERSION_CONFLICT
FULFILLMENT_QUANTITY_EXCEEDED
FULFILLMENT_SERVICE_NOT_READY
FULFILLMENT_CANCELLATION_PENDING
SHIPMENT_ACTION_NOT_AVAILABLE
SHIPMENT_PROVIDER_UNAVAILABLE
RETURN_QUANTITY_EXCEEDED
RETURN_ACTION_NOT_AVAILABLE
INTEGRATION_LINK_NOT_FOUND
INTEGRATION_SYNC_ALREADY_CURRENT
INTEGRATION_PROVIDER_UNAVAILABLE
PERMISSION_DENIED
```

`retryable` описывает возможность повторить ту же команду без изменения input. Version conflict и
validation errors не retryable; provider timeout обычно retryable через operation retry, а не
повторный client mutation с новым key.

## 17. Security, audit и operational requirements

### 17.1. Tenant isolation

- GraphQL input никогда не содержит `storeId`/`organizationId`.
- Любой direct ID lookup включает store predicate.
- Cache/DataLoader keys включают store ID.
- Provider callbacks валидируют installation/store/resource binding.

### 17.2. Audit

- Каждая command mutation пишет actor, reason, correlation, causation и versioned audit record.
- Destructive/financial mutations требуют explicit reason/note согласно policy.
- Activity API разделяет `STAFF`, `CUSTOMER`, `INTERNAL` visibility.
- Audit export должен восстанавливать sequence without timestamp ordering ambiguity.

### 17.3. Observability

Metrics:

```text
orders_command_total{command,result}
orders_version_conflict_total{command}
orders_workflow_duration_seconds{workflow,result}
orders_provider_operation_total{capability,provider,operation,result}
orders_integration_delivery_total{eventType,result}
orders_integration_sync_lag_versions{app}
orders_checkout_placement_stuck_total{checkoutState,orderPlacementState}
orders_checkout_placement_reconciliation_total{result,reason}
orders_checkout_snapshot_mismatch_total{contractVersion}
```

Logs используют `orderId`, `storeId`, `operationId`, `workflowId`, `correlationId`, provider code и
order version, но не raw PII/provider secrets.

### 17.4. Retention

- Financial/audit/event data — согласно store/legal policy, обычно long-lived.
- Idempotency response — ограниченный TTL, но durable operation/event сохраняются.
- Raw provider payloads — ограниченный retention и redaction.
- PII — policy-driven expiry/redaction, отдельно от financial records.

## 18. План реализации по обязательному порядку

### Этап 1. GraphQL SDL

1. [x] Зафиксировать этот RFC и naming review.
2. [x] Вынести отсутствующие shared primitives (`Cursor`, `Money`, connections/errors) в shared
       schemas.
3. [x] Разделить фактический SDL на файлы:

```text
schema/
  foundation.graphql
  order-core.graphql
  order-checkout-placement.graphql
  order-edit.graphql
  order-payment.graphql
  order-fulfillment.graphql
  order-returns.graphql
  order-integrations.graphql
  order-admin-mutations.graphql
  federation.graphql
```

4. [x] Удалить конфликтующие legacy Admin schema types.
5. [x] Выполнить schema codegen и Federation composition через `shopana-cli`.
6. [x] Добавить schema-level contract tests: no orphan types, payload/error consistency, Global ID
       mapping, deprecated-field policy.

Gate: Admin supergraph compose проходит; generated resolver types не используют handwritten `any`;
все 20 UI write capabilities имеют command mapping.

Stage 1 implementation record:

- shared Admin primitives находятся в `@shopana/admin-graphql`;
- Admin cursors остаются opaque `String`, потому что canonical `PageInfo` существующих Admin
  subgraphs уже использует `String`; отдельный `Cursor` требует coordinated platform migration;
- конфликтующие глобальные имена из RFC namespaced как `OrderSortDirection`, `OrderWeightInput` и
  `OrderDimensionsInput`;
- Orders SDL разделён по capability-файлам из этого раздела;
- contract tests находятся рядом со schema и проверяют reachability, payload/error consistency,
  idempotency/concurrency inputs, Global ID registry и deprecated-field policy;
- codegen и Federation composition выполняются только через `shopana-cli`.

### Этап 2. PostgreSQL schema

1. [x] Зафиксировать row-version optimistic concurrency и atomic state/audit/idempotency transaction
       model.
2. [x] Переписать несовместимые migrations и Drizzle models под один canonical schema.
3. [x] Реализовать core/audit/idempotency tables без локальной publish queue.
4. [x] Реализовать `order_checkout_placements` и immutable commitment tables.
5. [x] Реализовать payment state tables.
6. [x] Реализовать normalized fulfillment/shipments.
7. [x] Реализовать returns/exchanges/refunds.
8. [x] Реализовать integration links/sync attempts.
9. [x] Добавить all constraints, append-only/redaction triggers и indexes.
10. [x] Выполнить migration/schema validation и production build через `shopana-cli`.

Gate: clean database строится одной migration chain; Drizzle table/column names 1:1 совпадают с SQL;
constraint tests доказывают money/quantity/tenant invariants.

Stage 2 implementation record:

- canonical aggregate использует `orders.version`; audit records связываются с `order_version`, а
  `order_events` имеет UUID `event_id` и monotonic `global_position`;
- migration chain содержит 68 tenant-scoped tables для core, checkout placement, edits, payments,
  normalized fulfillment/shipments, returns/exchanges/refunds, operations и outbound integrations;
- snapshot-only `delivery_fulfillment_snapshots`/`delivery_fulfillment_updates` удалены; runtime
  delivery projection переведён на `order_fulfillment_orders` и versioned fulfillment inbox;
- все SQL tables отражены в Drizzle physical contract; `db:models` детерминированно регенерирует
  non-runtime declarations, а `db:validate:static` проверяет SQL/Drizzle parity, forbidden legacy
  tables и обязательные tenant/money/quantity invariants;
- append-only audit/activity/tracking/attempt facts, finalized payment protection и one-way PII
  redaction реализованы PostgreSQL triggers/functions;
- clean chain применена к одноразовой PostgreSQL 17 database: создано 68 tables; для validation
  использован только test-scope `uuidv7()` shim, потому что целевой runtime предоставляет `uuidv7()`
  как platform database primitive;
- `shopana build -s orders` проходит formatting, lint, packages build, type checking и production
  service build; migrations копируются в `dist/migrations`.

### Этап 3. Business logic

Обязательное правило всех vertical slices: каждая state-changing operation реализуется и
регистрируется как DBOS workflow. Локальная запись выполняется через `@TransactionalStep()`, внешние
side effects — через отдельные idempotent workflow steps. Обычные Query/read paths DBOS workflow не
требуют.

Порядок vertical slices:

1. DBOS workflow execution foundation для всех commands + canonical order repositories + row-version
   concurrency + idempotency.
2. Versioned broker-types для Checkout placement create/confirm/cancel/get.
3. Order creation transactional step: snapshot validation, normalized state, audit/idempotency
   records, initial fulfillment holds и replay.
4. Интегрировать существующий `checkout.placeOrder` и `monitorPlacedPayment` с placement handshake.
5. Реализовать Checkout ↔ Orders reconciler и post-commit compensation rules.
6. Draft create/update/line mutations/complete/delete.
7. Core reads, list/filter/sort и activity.
8. Simple order updates, customer/tags/note/comment/archive.
9. Staged placed-order edit.
10. Payment event ingestion/state update + manual/capture/void/refund/retry workflows.
11. Fulfillment orders + merchant-managed fulfillment.
12. 3PL fulfillment service capability.
13. Shipment provider integration/tracking/reconciliation.
14. Cancellation saga.
15. Returns/exchanges/refunds orchestration.
16. CRM integration через DBOS workflows и reconciliation.
17. Bulk operations.

Gate каждого slice: operation зарегистрирована как DBOS workflow; отсутствует direct write path;
domain invariant tests, repository integration tests, idempotency replay, version conflict,
state/audit/idempotency atomicity и workflow recovery проходят.

### Этап 4. GraphQL resolvers/API

1. Ввести class-based `OrdersType`, Query/Mutation namespace resolvers.
2. Подключить Zod input schemas, Global ID codecs и Policies.
3. Реализовать entity/connection resolvers и DataLoaders.
4. Подключить operation polling; subscriptions можно добавить позже без изменения commands.
5. Реализовать PII field policies и error normalization.
6. Добавить GraphQL E2E для каждого command family.
7. Перевести Admin UI с mock request layer на generated GraphQL operations.
8. Удалить mock-only `operation-types.ts`, seed и repository.

Gate: UI не содержит ad-hoc API models, все операции используют generated types, active order E2E
suites заполнены, IDOR/permission tests проходят.

### Этап 5. Hardening

1. Chaos tests provider timeout/duplicate/out-of-order callbacks.
2. Checkout placement crash-at-every-step и lost-response tests.
3. DBOS restart/recovery/compensation tests.
4. State consistency checker и audit/DBOS operation reconciliation tooling.
5. DBOS failed-operation inspection/restart tooling.
6. CRM/3PL provider certification suite.
7. Load tests lists, detail fan-out и activity timeline.
8. PII retention/redaction tests.
9. Dashboards/alerts/runbooks.

## 19. Test matrix

| Слой               | Обязательные проверки                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| SDL                | codegen, federation compose, schema lint, payload consistency                                                                             |
| Domain             | transitions, amounts, quantity conservation, actions availability                                                                         |
| Concurrency/audit  | expected version, conditional update, audit/idempotency atomicity, duplicate key, replay                                                  |
| Checkout placement | stale revision, same/different idempotency replay, lost Order response, pre/post-commit failure, confirm/cancel handshake, reconciliation |
| Repository         | tenant isolation, transactions, indexes, constraints                                                                                      |
| Payment state      | duplicate/out-of-order events, partial capture/refund/void                                                                                |
| Fulfillment        | split/move/hold, partial quantities, external request states                                                                              |
| Shipment           | provider sync/async, tracking order, cancellation limitations                                                                             |
| Returns            | eligibility, partial receive, damage/restock allocation                                                                                   |
| CRM                | snapshot stability, echo prevention, retry, reconciliation                                                                                |
| DBOS               | crash/restart, retry, timeout, compensation, terminal operation                                                                           |
| GraphQL            | permissions, Global IDs, Relay cursors, version/user errors                                                                               |
| Security           | cross-store IDOR, PII masking, forged callback, secret redaction                                                                          |

## 20. Acceptance criteria

- Admin SDL поддерживает полный draft/open/cancel/edit/payment/fulfillment/return/integration
  lifecycle.
- Storefront `checkout.placeOrder` создаёт `OPEN` Order через typed V1 broker contract, а не Admin
  draft mutation.
- Order, initial normalized state, audit/idempotency records и fulfillment holds создаются одним
  Orders DBOS transactional step.
- После Order commit ни одна compensation не освобождает ресурсы до Orders confirm/cancel handshake.
- Повтор placement после lost response возвращает тот же `orderId`, number, version и snapshot hash.
- Terminal payment failure сохраняет `CANCELLED` Order и audit trail; orphan `OPEN/DRAFT` order
  невозможен.
- Fulfillment недоступен до `OrderPlacementStatus.CONFIRMED`.
- Ни один aggregate status не может стать противоречивым произвольным update.
- Все mutation inputs имеют idempotency; state-changing commands имеют optimistic concurrency.
- Каждая state-changing Orders operation, включая локальные mutations и internal commands,
  исполняется только как зарегистрированный DBOS workflow; direct write path отсутствует.
- Placed order edits staged и previewable.
- Cancellation, payment, provider fulfillment, shipment и CRM sync являются durable operations.
- Merchant fulfillment и external fulfillment service используют один domain model.
- Shipment provider отделён от fulfillment service.
- CRM integration не добавляет provider-specific columns и не блокирует order transaction сетевым
  вызовом.
- Канонические state tables являются source of truth; immutable audit log используется для
  расследования и интеграционной доставки, но не для построения состояния заказа.
- Все reads tenant-scoped; PII имеет отдельные permissions/retention.
- Admin UI может заменить mocks без сохранения legacy `ApiOrder` как второго source of truth.
- Старая Drizzle-модель и новые migrations больше не расходятся.

## 21. Зафиксированные решения SDL V1

Зафиксировано:

- order lifecycle: `DRAFT/OPEN/CLOSED/CANCELLED`, archive отдельно;
- Storefront placement создаёт Order сразу `OPEN`; `DRAFT` создаётся только Admin/import workflow,
  который явно требует draft;
- Checkout владеет placement saga, Orders владеет order state и placement confirm/cancel handshake;
- Order commit является границей: до него Checkout компенсирует отсутствие Order, после него Order
  никогда физически не удаляется;
- zero-total order имеет payment status `NOT_REQUIRED`;
- payment/fulfillment/delivery/return statuses derived;
- placed edits staged;
- `orders.version` является concurrency token;
- normalized fulfillment model заменяет snapshot-only runtime tables;
- CRM/ERP только через App capability + DBOS workflows;
- no backfill/compatibility/dual-read.

Дополнительно решено для V1:

1. `Money`, `Connection`, `DisplayableError`, common scalars и measurement value types принадлежат
   `@shopana/admin-graphql`.
2. Orders использует обычные нормализованные PostgreSQL state tables; `orders.version` обеспечивает
   optimistic concurrency, а append-only `order_events` служит только audit/integration log.
3. Fulfillment location в V1 передаётся как opaque typed Global ID. Federation entity Location
   добавляется только вместе с owning Inventory API.
4. Номер заказа выдаётся per-store monotonic counter; prefix/suffix относятся только к presentation.
5. Универсального legal retention default нет. Deployment обязан выбрать региональный retention
   profile; development profile — `MANUAL_ONLY`. Immutable commerce facts не удаляются вместе с PII,
   redaction фиксируется отдельным audit event.
6. Invoice и credit-note documents не входят в Orders V1 и проектируются отдельным subsequent
   capability.
7. V1 включает outbound `crm.order-sync`; inbound `crm.order-import` отложен и не расширяет core
   Order columns.

## 22. Референсные модели

Решения сверены с официальными commerce API:

- [Shopify Admin GraphQL Order](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order) —
  order как hub коммерческого lifecycle, отдельные payment/fulfillment/return surfaces.
- [Shopify order cancellation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/orderCancel)
  — cancellation как необратимая операция с refund/restock/notification options, а не status field
  update.
- [Shopify staged order edits](https://shopify.dev/docs/api/admin-graphql/latest/payloads/OrderEditBeginPayload)
  — begin/stage/commit для изменения placed order.
- [Shopify fulfillment order cancellation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentOrderCancel)
  — work object и request status для external fulfillment services.
- [commercetools Orders](https://docs.commercetools.com/api/projects/orders) — optimistic `version`,
  explicit update actions, separate payment/shipment states, returns и `SyncInfo`.
- [commercetools Order Edits](https://docs.commercetools.com/api/projects/order-edits) — staged
  actions и calculated preview.
- [Saleor Order](https://docs.saleor.io/api-reference/orders/objects/order) — GraphQL-first order
  surface, events, transactions, fulfillments и metadata.
- [Saleor orderFulfill](https://docs.saleor.io/api-reference/orders/mutations/order-fulfill) и
  [return products](https://docs.saleor.io/api-reference/orders/mutations/order-fulfillment-return-products)
  — explicit fulfillment/return commands.
- [Medusa Order Module](https://docs.medusajs.com/resources/commerce-modules/order) — isolated order
  module, version-controlled edits/returns/exchanges/claims и workflow-based orchestration.
- [Medusa fulfillment management](https://docs.medusajs.com/user-guide/orders/fulfillments) —
  partial fulfillment, shipment, delivery/pickup и cancellation lifecycle.
- [Medusa returns](https://docs.medusajs.com/user-guide/orders/returns) — RMA, receive,
  damaged/restockable quantities и refund separation.
- [HubSpot CRM object associations](https://developers.hubspot.com/changelog/announcing-a-change-to-how-v3-crm-apis-return-association-data)
  — CRM data as associated objects rather than one flattened order record.

Используются общие паттерны референсных систем, но SDL остаётся Shopana-native: Federation, store
context, DBOS, provider Apps и project-specific shared types имеют приоритет.
