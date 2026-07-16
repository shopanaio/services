# План переноса Orders UI из `admin-old` в `admin` (Next)

## 1. Цель

Перенести страницу списка заказов и весь рабочий UI заказа из
`admin-old/admin/src/modules/orders` в Next-приложение `admin`, сохранив
поведение старого интерфейса и адаптировав реализацию к текущей архитектуре
Admin.

Результат переноса должен включать:

- рабочую страницу `All Orders` вместо `EmptySectionPage`;
- таблицу заказов на AG Grid с `usePageConfig`;
- Relay-пагинацию, серверную сортировку, поиск и обязательный набор фильтров;
- одну основную модалку для создания и редактирования заказа;
- все вложенные order-модалки через modal stack;
- временный API-контракт в форме будущего GraphQL API;
- mock-транспорт, который реализует этот контракт без зависимости UI от mock-данных;
- Zod-валидацию, input/error mappers и optimistic concurrency через `version`;
- автоматическое обновление списка после успешного сохранения.

План выровнен с:

- `knowledge/vault/patterns/admin-graphql-layer.md`;
- существующими модулями `admin/src/domains/customers/all-customers` и
  `admin/src/domains/customer-content/reviews`;
- текущими `DataLayout`, `FilterWidget`, `usePageConfig`, `CursorPagination` и
  modal stack;
- существующей регистрацией Sales domain в `admin/src/domains/sales`.

## 2. Ключевое архитектурное решение

### 2.1. Сохранение старой order view

Старые компоненты работают не с сырым ответом GraphQL, а с собственной
агрегированной моделью `IOrder`, создаваемой классом `Order.create`. В ней уже
собраны:

- `customerDetails`;
- `paymentSummary`;
- `orderItems` с `product`, `fulfillmentQuantity`, ценой, весом и себестоимостью;
- `fulfillments` с вложенными order items и shipping item;
- `paymentItem`;
- `productsInfo`;
- `customerStatistic`;
- `events`, `tags`, адреса и методы оплаты/доставки.

На этом этапе семантическую форму этой view нужно сохранить. Перенос не должен
одновременно перерабатывать UI под текущий backend orders API: это отдельная
последующая задача.

При этом новую реализацию не следует снова строить на entity-классах и runtime
маппинге ответа API в UI-view. Временная сохранённая view оформляется как сам
контракт будущего GraphQL UI API:

- `ApiOrder` повторяет нужную UI структуру старого `IOrder`;
- list/detail hooks возвращают `ApiOrder` напрямую;
- mocks сразу создаются в форме `ApiOrder`;
- компоненты не вызывают `Order.create` и не получают отдельный output view
  model;
- mappers используются только для преобразования form state в mutation input и
  `userErrors` в ошибки формы.

Иными словами, сохраняется структура старой view, но удаляется старый механизм
`GraphQL response -> entity class -> UI view`.

### 2.2. Допустимая техническая нормализация

GraphQL `DateTime` в UI-контракте хранится как ISO string, а не `Date`. Это не
меняет смысл старой view и соответствует правилам нового Admin. Преобразование в
`Date` выполняется только на границе отображения через formatter.

Денежные поля на первом этапе сохраняют старую семантику и единицу измерения.
Нельзя молча менять major/minor units во время визуального переноса. В контракте
и mock-данных нужно явно документировать единицу, а форматирование вынести в
один helper. Переход на Money object или minor units выполняется вместе с
реальным API отдельным изменением.

### 2.3. Граница транспорта

UI не должен знать, что данные замоканы:

```text
page/modal
  -> domain hook
    -> api/request-orders.ts
      -> временный in-memory mock repository
```

При подключении GraphQL заменяется реализация request-функций или hooks, но не
props компонентов, формы, таблица и modal payloads. Hooks не импортируют seed
data напрямую.

## 3. Текущий baseline

### 3.1. Next Admin

Сейчас `admin/src/domains/sales/all-orders/page/page.tsx` рендерит только:

```tsx
<EmptySectionPage name="all-orders" title="All Orders" />
```

Маршрут уже зарегистрирован:

```text
/:orgName/:storeName/orders
```

Но item `all-orders-list` в `admin/src/domains/sales/register.tsx` имеет
`disabled: true`.

### 3.2. Старый Orders UI

Основные точки входа:

- `admin-old/admin/src/modules/orders/components/Orders.tsx` — таблица;
- `admin-old/admin/src/modules/orders/components/Edit.tsx` — drawer редактора;
- `admin-old/admin/src/modules/orders/hooks/mutations.ts` — все операции;
- `admin-old/admin/src/modules/orders/graphql/findMany.ts` — list query;
- `admin-old/admin/src/modules/orders/graphql/findOne.ts` — details query;
- `admin-old/admin/src/entity/Order/*` — старая UI-view и её сборка.

В старом router и `DrawerModuleMap` Orders уже закомментирован. Источником
поведения остаётся код модуля, а не его текущая доступность через старый route.

### 3.3. Реестр переносимого UI

| Старый компонент | Назначение | Целевое место |
| --- | --- | --- |
| `Orders.tsx` | список, сортировка, фильтры, create/open | `page/page.tsx` |
| `Edit.tsx` | основная карточка заказа | `modals/order-modal/` |
| `DraftFulfillment.tsx` | позиции draft-заказа | `components/fulfillment/` |
| `ActiveFulfillment.tsx` | active fulfillment | `components/fulfillment/` |
| `FulfillmentMenu.tsx` | действия fulfillment | `components/fulfillment/` |
| `TrackingInfo.tsx` | tracking display | `components/shipping/` |
| `ActivePaymentSummary.tsx` | состояние оплаты | `components/payment/` |
| `DraftPaymentSummary.tsx` | расчёт draft оплаты | `components/payment/` |
| `PaymentActions.tsx` | действия оплаты | `components/payment/` |
| `PaymentSummaryData.tsx` | суммы заказа | `components/payment/` |
| `OrderStatusAndInfo.tsx` | статус и метаданные | `components/status/` |
| `Customer.tsx` | связь с клиентом | `components/customer/` |
| `ContactInfo.tsx` | snapshot контактов | `components/customer/` |
| `ShippingDetails.tsx` | адрес и метод доставки | `components/details/` |
| `PaymentDetails.tsx` | billing address и payment method | `components/details/` |
| `Tags.tsx` | теги | `components/moderation/` |
| `EditableNote.tsx` | admin note | `components/moderation/` |
| `TimeLine.tsx` | события и комментарии | `components/activity/` |
| `QntPopover.tsx` | изменение количества | `components/items/` |
| `WeightPopover.tsx` | изменение веса | `components/items/` |
| `CostPricePopover.tsx` | изменение себестоимости | `components/items/` |
| `StatusSummary.tsx` | агрегированное состояние | `components/status/` |
| `Price.tsx` | вывод денег | `components/money/` или local utility |

`OrderDetails/Old.tsx` не переносится. Это альтернативная старая реализация
деталей, не используемая текущим `Edit.tsx`. Перенос двух редакторов создаст
расходящиеся сценарии и лишнюю поддержку.

## 4. Целевая структура domain-модуля

Orders является самостоятельным модулем внутри Sales domain:

```text
admin/src/domains/sales/all-orders/
  api/
    request-orders.ts
    order-mock-repository.ts
    order-mock-seed.ts
  graphql/
    fragments.ts
    queries.ts
    mutations.ts
    operation-types.ts
    index.ts
  hooks/
    use-orders.ts
    use-order.ts
    use-create-order.ts
    use-update-order.ts
    use-delete-order.ts
    use-cancel-order.ts
    use-order-editor-context.ts
    use-update-order-status.ts
    use-update-payment-status.ts
    use-update-fulfillment-status.ts
    use-update-order-customer.ts
    use-update-order-tags.ts
    use-update-admin-note.ts
    use-add-order-comment.ts
    use-order-items.ts
    use-shipping-item.ts
    index.ts
  mappers/
    order-form.mapper.ts
    order-errors.mapper.ts
    order-status-input.mapper.ts
    fulfillment-input.mapper.ts
    shipping-input.mapper.ts
    index.ts
  components/
    activity/
    customer/
    details/
    fulfillment/
    items/
    money/
    moderation/
    payment/
    shipping/
    status/
  modals/
    order-modal/
      order-modal.tsx
      schema.ts
      sections/
        relations-section.tsx
        content-section.tsx
        additional-data-section.tsx
        activity-section.tsx
        complaints-moderation-section.tsx
      index.ts
    order-status-modal/
    payment-status-modal/
    fulfillment-status-modal/
    shipping-item-modal/
    shipping-details-modal/
    payment-details-modal/
  page/
    filter-schema.ts
    page-config.ts
    page.tsx
  modals.ts
```

Правила структуры:

- GraphQL documents и operation types принадлежат модулю, а не общему
  `sales/graphql`;
- hooks инкапсулируют loading/error/result и не отдают сырой вложенный payload;
- `api/` является временной реализацией транспорта, но использует те же
  operation types, что и будущий GraphQL;
- `mappers/` не преобразует query output;
- визуальные компоненты не импортируют `api/` и seed data;
- компоненты, нужные только одной модалке, остаются внутри её каталога;
- публичные импорты модуля ограничиваются `page`, hooks и `modals.ts`.

## 5. Временный GraphQL-shaped API контракт

### 5.1. Основные output types

До появления generated schema types временные типы объявляются в
`graphql/operation-types.ts`. Имена должны совпадать с ожидаемыми GraphQL
сущностями, чтобы последующая замена была механической.

Минимальный контракт:

```ts
export interface ApiOrder {
  id: string;
  version: number;
  orderNumber: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  adminNote: string | null;
  externalSystemId: string | null;
  currencyCode: string;
  displayCurrencyCode: string | null;
  displayExchangeRate: number | null;
  customer: ApiOrderCustomer | null;
  customerDetails: ApiOrderCustomerDetails;
  customerStatistic: ApiOrderCustomerStatistic | null;
  billingAddress: ApiOrderAddress | null;
  shippingAddress: ApiOrderAddress | null;
  paymentMethod: ApiOrderPaymentMethod | null;
  shippingMethod: ApiOrderShippingMethod | null;
  orderItems: ApiOrderItem[];
  productsInfo: ApiOrderProductInfo[];
  fulfillments: ApiOrderFulfillment[];
  paymentItem: ApiOrderPaymentItem | null;
  paymentSummary: ApiOrderPaymentSummary;
  events: ApiOrderEvent[];
  tags: ApiOrderTag[];
}
```

`ApiOrderItem` сохраняет старые поля:

```ts
export interface ApiOrderItem {
  id: string;
  price: number;
  quantity: number;
  originalQuantity: number;
  fulfillmentQuantity: number | null;
  totalAmount: number;
  subtotalAmount: number;
  taxAmount: number | null;
  discountAmount: number | null;
  productCostPrice: number | null;
  weight: ApiOrderWeight | null;
  product: ApiOrderProductInfo;
  createdAt: string;
}
```

`ApiOrderFulfillment.orderItems` также остаётся агрегированной UI-view. Это
осознанный временный контракт для сохранения старого UI.

### 5.2. Relay connection

Список возвращает connection:

```ts
export interface OrderEdge {
  cursor: string;
  node: ApiOrder;
}

export interface OrderConnection {
  edges: OrderEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}
```

List operation variables:

```ts
export interface OrdersQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: OrderWhereInput | null;
  orderBy?: OrderOrderByInput[] | null;
}
```

Не добавлять page-number pagination. Mock должен реально интерпретировать
cursor arguments, включая backward pagination через `last`/`before`.

### 5.3. Enums

Сохраняются статусы старого UI:

- order: `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `ARCHIVED`;
- payment: `PENDING`, `PAID`, `CANCELLED`;
- fulfillment: `PENDING`, `PROCESSING`, `ON_HOLD`, `SHIPPED`, `DELIVERED`,
  `RETURNED`, `CANCELLED`, `FULFILLED`.

Enums не должны содержать React nodes. Labels, colors и danger-state находятся
в `components/status/status-config.tsx` или `page/page-config.ts`, но не в API
типах.

### 5.4. Query documents

Несмотря на mock transport, нужно сразу создать документы будущих операций:

- `ORDERS_QUERY`;
- `ORDER_QUERY`;
- focused fragments `OrderListFields` и `OrderDetailsFields`;
- общий `PageInfoFields` и `UserErrorFields`, если нет подходящего shared
  fragment.

`OrderListFields` включает только поля таблицы. `OrderDetailsFields` включает
полную сохранённую view, необходимую основной модалке.

### 5.5. Mutation contracts

Каждая mutation возвращает payload единого вида:

```ts
export interface OrderMutationPayload {
  order: ApiOrder | null;
  userErrors: OrderUserError[];
}

export interface OrderUserError {
  code: string;
  field?: string | null;
  message: string;
}
```

Нужны следующие inputs/operations:

- `OrderCreateInput` / `ORDER_CREATE_MUTATION`;
- `OrderUpdateInput` / `ORDER_UPDATE_MUTATION`;
- `OrderDeleteInput` / `ORDER_DELETE_MUTATION`;
- `OrderCancelInput` / `ORDER_CANCEL_MUTATION`;
- `OrderStatusUpdateInput`;
- `OrderPaymentStatusUpdateInput`;
- `OrderFulfillmentStatusUpdateInput`;
- `OrderCustomerUpdateInput` и customer detach;
- `OrderTagsUpdateInput`;
- `OrderAdminNoteUpdateInput`;
- `OrderCommentAddInput`;
- `OrderItemAddInput`;
- `OrderItemUpdateInput`;
- `OrderItemDeleteInput`;
- `OrderFulfillmentSplitInput` и undo split;
- `OrderShippingItemCreateInput`;
- `OrderShippingItemUpdateInput`.

Каждый update input содержит `id` и `expectedVersion`. Для вложенной сущности
дополнительно передаётся её id, но проверяется версия родительского заказа.

## 6. Mock transport

### 6.1. Repository behavior

`order-mock-repository.ts` хранит нормальный изменяемый массив `ApiOrder[]` и
предоставляет request-функции. Он должен имитировать backend, а не просто
возвращать fixtures.

Обязательное поведение:

- искусственная асинхронная задержка;
- filtering по `where`;
- multi-column sorting по `orderBy`;
- forward/backward Relay pagination;
- `totalCount` до применения pagination;
- поиск через `_or` условия;
- уникальный `orderNumber` при создании;
- увеличение `version` и `updatedAt` после каждой mutation;
- добавление timeline event после mutation;
- проверка разрешённых status transitions;
- возврат field-level `userErrors`;
- конфликт `VERSION_CONFLICT`, если `expectedVersion !== order.version`;
- immutable copies на выходе, чтобы UI не мутировал repository по ссылке.

### 6.2. Seed data

Seed должен покрывать не менее 30 заказов, чтобы работала pagination, и включать:

- все order/payment/fulfillment statuses;
- draft и active заказы;
- guest order без `customer`;
- заказ без shipping/payment method;
- несколько fulfillments;
- split fulfillment с `parentId`;
- shipping item с tracking code и без него;
- разные валюты;
- скидки, налоги и shipping amount;
- пустые и заполненные admin note/tags;
- timeline с системными событиями и комментариями;
- адреса разных стран;
- ошибки/граничные значения, например quantity 1 и частично fulfilled item.

### 6.3. Request layer

`request-orders.ts` экспортирует функции, повторяющие будущие GraphQL use cases:

```ts
requestOrders(variables)
requestOrder(id)
requestCreateOrder(input)
requestUpdateOrder(input)
requestDeleteOrder(input)
requestCancelOrder(input)
requestUpdateOrderStatus(input)
requestUpdatePaymentStatus(input)
requestUpdateFulfillmentStatus(input)
// ...остальные действия
```

Hooks зависят только от этих функций и operation types. Seed/repository не
импортируются за пределами `api/`.

### 6.4. Замена mocks на GraphQL

Позже подключение API выполняется в следующем порядке:

1. добавить соответствующие operations в реальную schema/codegen;
2. заменить временные types generated types из `@/graphql/types`;
3. заменить request-вызовы на Apollo в hooks;
4. сохранить return contracts hooks;
5. убрать `order-mock-repository.ts` и seed;
6. не менять props таблицы и модалок, если реальный API выполняет сохранённый
   контракт.

Если реальный API не вернёт сохранённую агрегированную view, это будет отдельная
осознанная миграция контракта. Нельзя скрывать расхождения новым output mapper в
этом модуле.

## 7. Страница списка заказов

### 7.1. Page composition

`page/page.tsx` является client component и использует:

- `DataLayout`;
- `FilterWidget`;
- `AgGridReact<ApiOrder>`;
- `useAgGridTheme`;
- `usePageConfig<ApiOrder, OrderWhereInput, OrderOrderField>`;
- `CursorPagination`;
- `useOrders`;
- `useOrderModal`.

После завершения страницы `disabled: true` удаляется только у
`all-orders-list`. Остальные Sales placeholders этим переносом не активируются.

### 7.2. Операционные колонки

В таблице показываются только данные, необходимые оператору для быстрого
решения. Рекомендуемый default набор:

| Колонка | Поле/источник | Sort |
| --- | --- | --- |
| Order | `orderNumber`, `createdAt` | `ORDER_NUMBER`, `CREATED_AT` |
| Customer | `customerDetails` | `CUSTOMER_NAME` или отключён до API support |
| Items | первые product thumbnails + count | без сортировки |
| Total | `paymentSummary.totalAmount`, `currencyCode` | `TOTAL_AMOUNT` |
| Order status | `status` | `STATUS` |
| Payment | `paymentItem.status` или `PENDING` | `PAYMENT_STATUS` |
| Fulfillment | агрегат `fulfillments[].status` | `FULFILLMENT_STATUS` |
| Delivery | shipping method/tracking indicator | без сортировки |
| Updated | `updatedAt` | `UPDATED_AT` |

Подробные адреса, billing method, tags, все customer fields и полная товарная
информация не включаются в default grid. Они доступны в order modal. Это
уменьшает горизонтальную перегрузку старой таблицы.

Default sort: `UPDATED_AT DESC`, затем `ORDER_NUMBER DESC` для стабильности.

`defaultColDef.comparator` возвращает `0`, потому что сортировка серверная.
`onSortChanged` передаётся из `usePageConfig`.

### 7.3. Поиск

`buildOrderSearchCondition(search)` создаёт `_or` по:

- order number/external id;
- customer email;
- customer phone;
- customer first/last/full name;
- tracking code.

Mock repository обязан обработать этот shape. Поиск сбрасывает cursor на первую
страницу через `usePageConfig`.

### 7.4. Required filters

`page/filter-schema.ts` обязан содержать операционно необходимый набор:

- order status;
- payment status;
- fulfillment status;
- created date range;
- updated date range;
- customer/customer id;
- customer email;
- customer phone;
- order number;
- total amount/price;
- currency;
- shipping country;
- shipping method;
- payment method;
- tags;
- tracking presence или tracking code.

Под `required filters` понимается обязательная доступность этих фильтров в
schema страницы, а не требование выбрать значение перед первым запросом.

Для price/date filters использовать существующие transformers из
`@/hooks` и `@/layouts/filters`. В page config не писать ручной повтор
универсальной логики.

### 7.5. Relay pagination

`buildOrdersQueryVariables(pageConfig)` передаёт:

- `first`, `after` для движения вперёд;
- `last`, `before` для движения назад;
- `where`;
- mapped `orderBy`.

`CursorPagination` получает реальные `pageInfo.startCursor`,
`pageInfo.endCursor`, `hasNextPage`, `hasPreviousPage` и `totalCount`.

### 7.6. Page interactions

- `Create order` открывает `{ mode: "create", onSaved: refetch }`;
- row click открывает `{ mode: "edit", entityId, onSaved: refetch }`;
- row action `Delete` использует общее подтверждение, передаёт `id` и
  `expectedVersion`, а после успеха вызывает `refetch`;
- после сохранения модалка вызывает `onSaved`, затем закрывается;
- при изменении фильтров/поиска/сортировки selection и cursor сбрасываются;
- loading не очищает уже отображённые rows без необходимости;
- transport error отображается `Alert`, но не маскируется пустым списком.

## 8. Основная Order modal

### 8.1. Одна модалка для create/edit

Старый `Edit.tsx` переносится в `OrderModal` с payload:

```ts
export interface OrderModalPayload extends IModalStackPayload {
  mode: "create" | "edit";
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
}
```

`useOrderModal` создаётся через `createModalStackHook("order")`.

Модалка:

- в create mode использует defaults и `useCreateOrder`;
- в edit mode загружает `useOrder(entityId)`;
- использует `FormProvider` и одну Zod schema;
- отслеживает `isDirty` через `setDirty`;
- использует `ModalLayout`/`ModalHeader`, а не локальный `antd Modal`;
- после save вызывает `onSaved`, сбрасывает dirty и делает `forcePop`;
- при not found и transport error показывает отдельные состояния;
- не хранит второй локальный `order` поверх результата hook без необходимости.

### 8.2. Смысловые блоки формы

Форма разделяется на блоки, заданные архитектурой Admin:

1. **Связи**
   - customer association;
   - contact snapshot;
   - shipping method;
   - payment method;
   - tags.
2. **Контент**
   - order items;
   - quantity, weight, cost price;
   - fulfillment composition;
   - payment summary.
3. **Дополнительные данные**
   - shipping address;
   - billing address;
   - currency/display currency;
   - external system id;
   - tracking data.
4. **Активность**
   - timeline;
   - comment form;
   - created/updated metadata;
   - actor information.
5. **Жалобы и модерация**
   - admin note;
   - tags/flags;
   - status controls и причины изменения в timeline.

Старая order view не содержит отдельную complaint entity. Поэтому перенос не
должен придумывать mock-only complaints. Блок получает соответствующее orders
содержимое — admin note, flags/tags и историю операторских решений. Реальные
complaints добавляются позже только вместе с API-контрактом.

### 8.3. Editability rules

- draft order: доступны customer, items, shipping/payment details;
- active/completed/cancelled/archived: поля, которые старый UI делал read-only,
  остаются read-only;
- status changes выполняются отдельными confirmation modals;
- inline quantity/weight/cost editors могут остаться `Popover`, но mutation
  проходит через domain hook и учитывает `expectedVersion`;
- split/undo fulfillment и shipping actions не изменяют объект формы напрямую,
  а выполняют mutation и refetch order.

## 9. Все order-модалки

Все полноэкранные и подтверждающие диалоги регистрируются в modal stack. Они не
должны управляться локальными `open` booleans внутри `OrderModal`.

### 9.1. `order-status-modal`

Переносит `OrderStatusModal.tsx` и общий `StatusModal.tsx`.

Payload:

```ts
{
  entityId: string;
  expectedVersion: number;
  nextStatus: OrderStatus;
  onSaved?: () => Promise<unknown> | unknown;
}
```

Форма: `comment`. Zod ограничивает длину и может требовать comment для
`CANCELLED`/`ARCHIVED`. Danger button используется для destructive transitions.

### 9.2. `payment-status-modal`

Переносит `PaymentStatusModal.tsx`.

Payload содержит `orderId`, `paymentItemId`, `expectedVersion`, `nextStatus` и
`onSaved`. Форма содержит comment. Модалка показывает текущий и новый статус и
не разрешает submit в тот же статус.

### 9.3. `fulfillment-status-modal`

Переносит `FulfillmentStatusModal.tsx`.

Payload содержит `orderId`, `fulfillmentId`, `expectedVersion`, `nextStatus` и
`onSaved`. Mock repository проверяет допустимые переходы и возвращает business
error при недопустимом переходе.

### 9.4. `shipping-item-modal`

Объединяет create/edit behavior старых `CreateShippingModal.tsx` и
`ShippingModal.tsx`.

Payload:

```ts
{
  mode: "create" | "edit";
  orderId: string;
  fulfillmentId: string;
  shippingItemId?: string;
  expectedVersion: number;
  onSaved?: () => Promise<unknown> | unknown;
}
```

Поля:

- shipping method;
- tracking code;
- отображаемый список включённых order items;
- при наличии в сохранённой view — tracking URL/notifications/estimated date.

### 9.5. `shipping-details-modal`

Переносит `ShippingDetailsModal.tsx`:

- shipping method;
- shipping address;
- edit только для draft order;
- create/edit address поддерживается одной schema;
- `expectedVersion` обязателен.

### 9.6. `payment-details-modal`

Переносит `PaymentDetailsModal.tsx`:

- payment method;
- billing address;
- edit только для draft order;
- `expectedVersion` обязателен.

### 9.7. Вложенные picker-модалки

Если customer, product, shipping method или payment method выбираются через
picker, picker открывается следующим уровнем modal stack. Order-specific modal
получает результат через typed payload callback или существующий picker API.
Нельзя возвращаться к старому drawer store.

### 9.8. Modal registration

`modals.ts` объявляет typed payloads через module augmentation и экспортирует
hooks. Компоненты лениво регистрируются в общей карте
`admin/src/domains/modals.tsx` по текущему паттерну приложения.

Рекомендуемые type keys:

- `order`;
- `order-status`;
- `order-payment-status`;
- `order-fulfillment-status`;
- `order-shipping-item`;
- `order-shipping-details`;
- `order-payment-details`.

## 10. Forms, Zod и mappers

### 10.1. Form state

UI-local `OrderFormValues` допустим, потому что это editable draft state, а не
output view model. Он выводится из Zod schema:

```ts
export type OrderFormValues = z.infer<typeof orderFormSchema>;
```

Нельзя использовать `ApiOrder` как mutable form object и нельзя отправлять
`getValues()` целиком как mutation input.

### 10.2. Validation

Минимальные правила:

- quantity — integer `>= 1`;
- price/cost/weight — finite non-negative values;
- currency code — обязательный поддерживаемый code;
- email/phone — валидируются, если заполнены;
- address требует обязательные address fields, если заполнено хотя бы одно;
- shipping method/address consistency;
- payment method/billing address consistency;
- tracking code length;
- admin note/comment max length;
- draft должен содержать хотя бы одну позицию перед подтверждением;
- fulfillment quantities не превышают unfulfilled quantity.

### 10.3. Input mappers

`order-form.mapper.ts` содержит:

- `buildOrderCreateInput(values)`;
- `buildOrderUpdateInput(values, order)`;
- `mapOrderToFormValues(order)` для заполнения editable form state.

Первый и второй mapper:

- trim строк;
- преобразуют пустые optional поля в `null`;
- отправляют ids вместо объектов select;
- не отправляют display-only поля;
- в update включают `expectedVersion: order.version`;
- добавляют `clientMutationId` для create, если это предусмотрено контрактом.

`mapOrderToFormValues` допустим: это API output -> локальное состояние формы,
но не новый output view model для компонентов.

### 10.4. API errors

`order-errors.mapper.ts` содержит единую карту API field path -> React Hook Form
field path.

Примеры:

```text
customer.email           -> customerDetails.email
shipping.address.city    -> shippingAddress.city
payment.billingAddress   -> billingAddress
items.0.quantity         -> items.0.quantity
adminNote                -> adminNote
```

Field errors устанавливаются через `setError`. Ошибки без известного field
показываются в global `Alert`. Transport error хранится отдельно и не
превращается в fake validation error.

`VERSION_CONFLICT` не привязывается к полю. UI показывает понятное сообщение:
заказ изменён другим оператором, предлагает обновить данные и не закрывает
модалку автоматически.

## 11. Optimistic concurrency

`ApiOrder.version` обязателен в list/detail contract и во всех изменяющих
операциях.

Правила:

- detail query возвращает актуальную version;
- mapper берёт version только из загруженного order, не из form input;
- mock repository сравнивает `expectedVersion` атомарно перед mutation;
- успешная mutation увеличивает version;
- mutation payload возвращает обновлённый order;
- после nested mutation родительский `OrderModal` refetch-ит order, чтобы
  получить новую version;
- повторный submit со старой version возвращает `VERSION_CONFLICT`;
- UI не делает автоматический retry mutation, который может перезаписать чужие
  изменения.

## 12. Hooks

### 12.1. List hook

```ts
interface UseOrdersReturn {
  orders: ApiOrder[];
  connection: OrderConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}
```

Hook защищается от race conditions через request id или abort semantics, чтобы
медленный старый запрос не перезаписал новый результат после смены filters.

### 12.2. Detail hook

`useOrder(id)` возвращает `order`, `loading`, `error`, `refetch`. Он не вызывает
output mapper и не импортирует mocks.

### 12.3. Mutation hooks

Каждый user-facing use case получает отдельный hook. Hook:

- нормализует unexpected errors;
- возвращает `userErrors` из payload;
- предоставляет `loading`, `error`, `reset`;
- не показывает notification самостоятельно, если текст зависит от UI context;
- не закрывает modal;
- возвращает обновлённый `ApiOrder` при успехе.

После успешного сохранения source of truth обновляется через `refetch` на первом
этапе. Cache-specific оптимизация откладывается до реального Apollo transport.

## 13. Адаптация UI и styles

### 13.1. Что переиспользуется

Ant Design компоненты из старого UI в основном совместимы:

- `Avatar`, `Button`, `Divider`, `Dropdown`, `Input`, `Popover`, `Select`,
  `Skeleton`, `Tag`, `Typography`;
- `react-hook-form` и `Controller`;
- иконки заменяются на Lucide из `react-icons/lu`, если в новом Admin уже есть
  эквивалент.

Полноэкранные модалки используют новый `ModalLayout`; небольшие confirm UI
также регистрируются в stack и не должны вкладывать собственный visible-state
`antd Modal` поверх stack item.

### 13.2. Emotion -> `antd-style`

Все импорты:

```ts
import { css } from "@emotion/react";
```

заменяются на:

```ts
import { createStyles } from "antd-style";
```

Стили используют design tokens:

| Старый token/style | Новый источник |
| --- | --- |
| `var(--x2)`, `var(--x4)` | `token.paddingSM`, `token.padding` |
| `var(--color-border)` | `token.colorBorder` |
| `var(--color-gray-4)` | `token.colorBorderSecondary` |
| `var(--radius-base)` | `token.borderRadius` |
| hardcoded background | `token.colorBgContainer` / `colorFillAlter` |
| hardcoded text color | `token.colorText` / `colorTextSecondary` |

Правила:

- не переносить Emotion `css` props;
- не добавлять CSS modules только для orders;
- не переносить старые custom `Box`/`Flex`, если эквивалент даёт `antd Flex`;
- layout grids описывать через `createStyles`;
- inline style оставлять только для динамических значений или небольших
  AG Grid cell layouts;
- responsive rules хранить рядом с modal/page styles;
- использовать токены, чтобы dark theme работала автоматически.

### 13.3. Общие компоненты

Перед копированием `AddressForm`, method selectors, money formatter, validation
alert и product/customer pickers нужно проверить аналоги нового Admin. Если
аналог уже есть, Orders использует его. Order-specific копия допускается только
при отличающемся контракте и должна оставаться внутри domain module.

## 14. Порядок реализации

### Этап 1. Каркас и контракт

- создать структуру `all-orders/{api,graphql,hooks,mappers,components,modals}`;
- описать временные operation types и enums;
- создать focused GraphQL documents как спецификацию будущего API;
- создать typed modal payloads и keys;
- не переносить UI до фиксации формы `ApiOrder`.

### Этап 2. Mock repository

- создать representative seed;
- реализовать filter/search/sort;
- реализовать Relay pagination;
- реализовать create/update/status/item/shipping actions;
- реализовать version conflict и field user errors;
- обернуть repository в request layer.

### Этап 3. Таблица

- заменить `EmptySectionPage`;
- добавить `usePageConfig`, filter schema и page config;
- добавить AG Grid columns/cell renderers;
- подключить `CursorPagination`;
- открыть create/edit order modal;
- активировать только `all-orders-list` после завершения UI.

### Этап 4. Основная модалка

- перенести композицию `Edit.tsx`;
- добавить Zod schema и form mapper;
- разделить UI на смысловые sections;
- перенести draft/active fulfillment и payment summary;
- перенести customer/contact, details, tags, note и timeline;
- подключить create/update mock mutations.

### Этап 5. Вложенные модалки

- status confirmation base UI;
- order status;
- отдельное cancel action, если будущий контракт сохраняет старую семантику
  `cancel`, отличную от обычного status update;
- payment status;
- fulfillment status;
- shipping item create/edit;
- shipping details;
- payment details;
- nested picker integrations.

### Этап 6. Остальные действия

- add/update/delete order item;
- delete order и cancel order;
- quantity/weight/cost inline editors;
- customer attach/detach;
- tags/admin note/comment;
- split/undo fulfillment;
- shipping tracking update;
- автоматический refetch и version refresh после каждого действия.

### Этап 7. Styles и cleanup

- заменить все Emotion styles на `antd-style`;
- убрать зависимости от старых `Box`, `Flex`, drawer store, entity classes и
  старого i18n API;
- проверить light/dark theme и responsive layout;
- убедиться, что `OrderDetails/Old.tsx` не был перенесён;
- удалить временные compatibility imports внутри нового модуля.

## 15. Acceptance criteria

### Страница

- `/orders` открывает реальную таблицу, а не placeholder;
- отображается не менее двух Relay pages mock-данных;
- next/previous работают через cursors;
- поиск, каждый required filter и server sort меняют результат mock request;
- row click открывает edit modal;
- create открывает ту же modal в create mode;
- список обновляется после create/edit/nested mutation.

### Основная модалка

- старая order view визуально и функционально сохранена;
- draft/active UI отличается по тем же business rules;
- все смысловые sections доступны;
- dirty close защищён modal stack;
- Zod ошибки отображаются рядом с полями;
- API `userErrors` привязываются к полям;
- global и transport errors показываются отдельно;
- successful save закрывает modal только после `onSaved`.

### Вложенные модалки

- все семь order modal types зарегистрированы;
- status, payment, fulfillment и shipping flows работают через stack;
- родительская order modal остаётся под дочерней;
- после nested save родитель получает свежий order/version;
- destructive actions визуально отмечены и требуют подтверждения/comment по
  schema.

### Архитектура

- UI не импортирует seed/mock repository;
- hooks не импортируют старые entity classes;
- query output не преобразуется в новую output view model;
- form/input/error mappers разделены;
- `version` передаётся во всех update mutations;
- styles написаны через `antd-style` и tokens;
- список использует `usePageConfig`, AG Grid и Relay connection;
- GraphQL transport можно подключить без изменения UI component interfaces.

## 16. Не входит в перенос

- адаптация UI к текущей реальной orders service schema;
- изменение старой семантики order view;
- новый backend resolver специально под UI;
- CRM/Kanban board из старого `modules/crm`;
- Draft Orders как отдельная страница;
- Abandoned Checkouts;
- refunds/exchanges/returns как отдельные domains;
- перенос `OrderDetails/Old.tsx`;
- редизайн бизнес-переходов статусов;
- переход денежных полей на другую единицу без согласованного API change.

## 17. Основные риски

### Расхождение временного и реального API

Сохранённая view богаче текущего orders API. Риск ограничивается явной границей
контракта: UI зависит от `ApiOrder`, а mock transport изолирован. После появления
API расхождения должны решаться в schema/operation contract или отдельной UI
миграции, но не скрытым permanent adapter.

### Потеря поведения при визуальном копировании

Orders содержит много небольших mutations. Простое копирование `Edit.tsx` без
инвентаризации действий потеряет split fulfillment, tracking, comment, tags,
quantity, weight или cost price. Поэтому перенос выполняется по use-case hooks и
реестру компонентов, а не одним большим компонентом.

### Несогласованная version после вложенной mutation

Любая nested mutation меняет order version. Если родитель не refetch-ит order,
следующее сохранение даст ложный conflict. Каждый дочерний modal/action обязан
вызывать общий `onSaved/refetch` до закрытия.

### Двойное состояние формы и repository

Нельзя оптимистично мутировать `ApiOrder` внутри компонентов и одновременно
refetch-ить repository. На mock-этапе выбран простой и предсказуемый путь:
mutation payload -> successful result -> refetch -> reset form при необходимости.

## 18. Итоговая точка подключения реального API

После реализации этого плана Orders UI будет завершён на mock transport, но его
публичная граница уже будет GraphQL-shaped. Для подключения backend останется:

- синхронизировать `ApiOrder`, inputs, enums и connections с generated schema;
- подключить Apollo внутри hooks;
- удалить `api/order-mock-repository.ts` и seed;
- сохранить page config, forms, mappers, modal payloads и UI components.

Это отделяет большой визуальный перенос от последующей миграции данных и не
блокирует разработку интерфейса отсутствующим или несовпадающим API.
