# План переноса Fulfillment Kanban из `admin-old` в `admin` (Next.js)

## 1. Цель документа

Перенести страницу `Fulfillment` из `admin-old/admin` в новый Next.js Admin с точным сохранением поведения и внешнего вида kanban-доски, drag-and-drop, фильтров и связанных операторских сценариев.

Это перенос, а не редизайн. Новый Admin предоставляет application shell, routing, domain registry, modal stack и theme infrastructure, но внутренний fulfillment layout должен повторять old UI: порядок блоков, размеры, интервалы, высоту рабочей области, горизонтальный scroll, ширину колонок, высоту tickets, расположение controls и визуальные состояния.

Перенос должен одновременно решить две задачи:

1. сохранить проверенное поведение старого UI, включая внутреннюю view-модель и DnD-алгоритмы;
2. встроить функциональность в новую domain-архитектуру Admin так, чтобы будущий переход с mock transport на GraphQL не требовал переделки компонентов, hooks, форм и модалок.

На первом этапе backend не подключается. Все query/mutation выполняются через асинхронный mock API, но типы запросов, ответов, Relay connection, ошибок и optimistic concurrency сразу проектируются в форме будущего GraphQL API.

## 2. Обязательные ограничения

- UI строится на Ant Design 6 и существующем UI kit нового `admin`, но это не является разрешением менять композицию old Fulfillment UI.
- Новый `AppLayout` используется как внешняя оболочка страницы. Внутри него создаётся fulfillment-specific layout, точно воспроизводящий старый `CrmLayout`; подмена его типовой табличной или двухколоночной страницей запрещена, если она меняет геометрию или поведение.
- Старые Emotion styles не переносятся как зависимость или синтаксис. Каждый style block переписывается эквивалентно на принятую в `admin` CSS-in-JS библиотеку `antd-style` (`createStyles`), использующую Ant Design tokens/CSS-in-JS infrastructure.
- Переписывание styles не должно менять вычисленные размеры, отступы, border radius, shadows, overflow, scroll containers, drag hit areas и состояния элементов.
- DnD реализуется на уже установленных `@dnd-kit/core`, `@dnd-kit/sortable` и `@dnd-kit/utilities`.
- Алгоритмы DnD и hooks переносятся без функционального упрощения, архитектурного переизобретения и без изменения пользовательского поведения.
- Старую внутреннюю view-модель доски необходимо сохранить как временный compatibility layer.
- Публичный контракт domain-модуля и mock API должен соответствовать будущему GraphQL API.
- API-shaped данные не должны зависеть от legacy view. Преобразование разрешено только на границе `API response -> kanban compatibility view`.
- Все операции mock API асинхронные и возвращают те же категории результатов, что и GraphQL: `data`, `userErrors`, transport/runtime error.
- Создание и редактирование одной сущности выполняются одной модалкой через modal stack.
- Формы используют React Hook Form, Zod и `zodResolver`.
- Mapper преобразует form values в create/update input.
- `userErrors.field` привязываются к полям React Hook Form.
- Update inputs содержат `expectedVersion` для optimistic concurrency.
- После успешной mutation данные доски автоматически обновляются.
- Табличные разделы и таблицы внутри модалок используют `usePageConfig`, серверную сортировку, поиск, required filters и Relay pagination.
- Основная Fulfillment page остаётся kanban, а не превращается в таблицу. Требование `usePageConfig` применяется к таблицам; состояние фильтров kanban повторно использует совместимый page-config builder без зависимости от AG Grid.

## 3. Источники в `admin-old`

### 3.1. Основной CRM/Fulfillment модуль

| Старый файл | Ответственность | Действие |
| --- | --- | --- |
| `admin-old/admin/src/modules/crm/components/CrmView.tsx` | Страница, local DnD state, сортировка колонок и tickets | Перенести в `fulfillment/board/page` и разложить orchestration по hooks |
| `admin-old/admin/src/modules/crm/components/CrmColumn.tsx` | Заголовок и содержимое kanban-колонки | Перенести как `FulfillmentColumn` |
| `admin-old/admin/src/modules/crm/components/CrmTicket.tsx` | Операторская карточка заказа | Перенести как `FulfillmentTicket` |
| `admin-old/admin/src/modules/crm/components/CrmColumnModal.tsx` | Создание/редактирование колонки | Заменить единой modal-stack модалкой |
| `admin-old/admin/src/modules/crm/components/CrmColumnSelect.tsx` | Выбор стадии | Перенести в domain components; API contract — `FulfillmentStage` |
| `admin-old/admin/src/modules/crm/components/CrmLayout.tsx` | Header, filters, scroll layout | Заменить layouts нового Admin |
| `admin-old/admin/src/modules/crm/hooks/useTickets.ts` | Query, фильтры, построение mappings | Разделить на request hook, compatibility mapper и board-state hook |
| `admin-old/admin/src/modules/crm/hooks/crm.ts` | CRUD колонок и перемещение ticket | Разделить на use-case hooks |
| `admin-old/admin/src/modules/crm/graphql/crm.ts` | Старые GraphQL operations | Использовать как источник полей, не копировать контракт буквально |
| `admin-old/admin/src/entity/Order/Crm.ts` | Legacy view-модели и `CrmColumn.create` | Сохранить локально как явно временный compatibility layer |

### 3.2. Общая DnD-реализация

Переносятся все файлы из `admin-old/admin/src/components/boards/`:

- `MultipleContainers.tsx`;
- `DroppableContainer.tsx`;
- `SortableItem.tsx`;
- `Container/Container.tsx`;
- `Container/index.ts`;
- `Item/Item.tsx`;
- `Item/styles.ts`;
- `keyboardCoordinates.ts`;
- `utilities/createRange.ts`;
- `utilities/index.ts`.

Их следует разместить внутри fulfillment domain, пока нет второго реального потребителя. Преждевременно переносить код в `shared` не нужно. После появления второго kanban-модуля DnD engine можно выделить в `src/shared/components/kanban` отдельной задачей.

Старая реализация также использует виртуализацию через `react-tiny-virtual-list` и `react-virtualized-auto-sizer`. В текущем `admin/package.json` этих пакетов нет. Для переноса логики без деградации необходимо добавить совместимые с React 19 версии либо заранее подтверждённые drop-in replacements с тем же измерением `itemSize=160`, overscan и scroll behavior. Удалять виртуализацию и рендерить все tickets допустимо только по отдельному решению с performance evidence; в baseline migration это запрещено. Установка зависимостей выполняется согласно правилам проекта через разрешённый workflow, не произвольной заменой алгоритма.

### 3.3. Связанные fulfillment-сценарии заказа

Карточка kanban открывает order editor. Из старого order UI в scope миграции входят сценарии, необходимые для полноценной работы со fulfillment:

| Старый сценарий | Старый источник | Целевой modal-stack item |
| --- | --- | --- |
| Создание/просмотр/редактирование заказа | `orders/components/Edit.tsx` и связанные sections | `fulfillment-order` |
| Создание/редактирование стадии | `crm/components/CrmColumnModal.tsx` | `fulfillment-stage` |
| Подтверждение нового fulfillment status и комментарий | `StatusConfirmation/FulfillmentStatusModal.tsx`, `StatusModal.tsx` | `fulfillment-status` |
| Добавление/редактирование tracking | `ShippingItems/CreateShippingModal.tsx`, `ShippingModal.tsx` | `fulfillment-tracking` |
| Split fulfillment | `FulfillmentItems/ActiveFulfillment.tsx`, `Actions.tsx` | Остаётся действием order modal; отдельная confirm modal только при необходимости подтверждения |
| Undo split | `FulfillmentItems/ActiveFulfillment.tsx` | Остаётся действием order modal с подтверждением опасного действия |

`PaymentDetailsModal`, `ShippingDetailsModal`, payment status и order status не являются частью fulfillment domain. Если новый `fulfillment-order` должен полностью повторить весь старый order editor, их следует переносить отдельными domain-модулями `orders`, `payments` и `delivery`, а fulfillment должен только открывать их modal-stack items. Это предотвращает превращение fulfillment в владельца чужой бизнес-логики.

## 4. Целевая domain-архитектура

Fulfillment оформляется как самостоятельный domain с модулем board. Связанные предметные части могут развиваться независимо, но на первом этапе регистрируется одна операторская страница.

```text
admin/src/domains/fulfillment/
  domain.tsx
  register.tsx
  modals.ts
  index.ts

  board/
    api/
      request-fulfillment-board.ts
      request-create-stage.ts
      request-update-stage.ts
      request-delete-stage.ts
      request-reorder-stages.ts
      request-move-ticket.ts
      request-append-ticket.ts
      index.ts
    graphql/
      fragments.ts
      queries.ts
      mutations.ts
      operation-types.ts
      index.ts
    hooks/
      use-fulfillment-board.ts
      use-fulfillment-board-state.ts
      use-create-fulfillment-stage.ts
      use-update-fulfillment-stage.ts
      use-delete-fulfillment-stage.ts
      use-reorder-fulfillment-stages.ts
      use-move-fulfillment-ticket.ts
      use-append-fulfillment-ticket.ts
      index.ts
    mappers/
      fulfillment-board-view.mapper.ts
      fulfillment-stage-form.mapper.ts
      fulfillment-user-errors.mapper.ts
      index.ts
    mocks/
      fulfillment-board.ts
      fulfillment-mock-store.ts
      mock-transport.ts
      index.ts
    models/
      legacy-fulfillment-board-view.ts
    page/
      page.tsx
      page-config.ts
      filter-schema.ts
    components/
      fulfillment-layout.tsx
      fulfillment-layout.styles.ts
      fulfillment-board.tsx
      fulfillment-board.styles.ts
      fulfillment-column.tsx
      fulfillment-ticket.tsx
      fulfillment-stage-select.tsx
      fulfillment-status-summary.tsx
      board-empty-state.tsx
      board-error-state.tsx
    dnd/
      multiple-containers.tsx
      droppable-container.tsx
      sortable-item.tsx
      container.tsx
      item.tsx
      keyboard-coordinates.ts
      styles.ts
      utilities.ts

  order/
    api/
    graphql/
    hooks/
    mappers/
    mocks/
    components/
    modals/
      order-modal/
        order-modal.tsx
        schema.ts
        types.ts
        sections/
          relations-section.tsx
          content-section.tsx
          fulfillment-section.tsx
          additional-data-section.tsx
          activity-section.tsx

  stages/
    api/
    graphql/
    hooks/
    mappers/
    modals/
      stage-modal/
        stage-modal.tsx
        schema.ts
        types.ts

  status/
    api/
    graphql/
    hooks/
    mappers/
    modals/
      status-modal/
        status-modal.tsx
        schema.ts

  tracking/
    api/
    graphql/
    hooks/
    mappers/
    modals/
      tracking-modal/
        tracking-modal.tsx
        schema.ts
```

Правило самостоятельности разделов:

- каждый предметный раздел владеет своим API contract, request functions, hooks, mappers, schemas и modal UI;
- board не импортирует mock store напрямую, только board hooks;
- order modal не вызывает request functions напрямую, только order hooks;
- status и tracking не знают о DnD;
- board может открыть modal другого раздела через типизированный modal-stack hook;
- generated API types после появления schema импортируются напрямую из `@/graphql/types` в местах использования и не реэкспортируются через barrels.

`fulfillment-layout.tsx` является прямым новым аналогом старого `CrmLayout.tsx`. Нельзя заменять его композицией `PageLayout`, `DataLayout` или `TableLayout`, если готовый layout добавляет другие paddings, max-width, grid columns, sticky behavior или меняет доступную высоту доски. Допускается использовать их внутренние primitives только при идентичном итоговом DOM/layout behavior.

## 5. Регистрация domain и маршрута

### `domain.tsx`

Зарегистрировать domain с `AppLayout`:

```tsx
registerDomain({
  key: "fulfillment",
  layout: AppLayout,
  sidebar: {
    label: "Fulfillment",
    icon: <PartitionOutlined />,
    order: 3,
  },
});
```

### `register.tsx`

```tsx
registerModule({
  key: "fulfillment-board",
  domain: "fulfillment",
  sidebar: {
    label: "Fulfillment",
    icon: <AppstoreOutlined />,
    order: 1,
  },
  items: [
    {
      key: "fulfillment-board-page",
      path: "/:orgName/:storeName/fulfillment",
      component: dynamic(
        () => import("@/domains/fulfillment/board/page/page"),
      ),
    },
  ],
});
```

Страница должна быть client component, поскольку использует DnD sensors, local board state, filters и modal stack.

## 6. Будущий GraphQL API contract

До появления schema типы временно объявляются в `graphql/operation-types.ts`. Названия и вложенность должны быть пригодны для прямой замены на generated types.

### 6.1. Основные API entities

```ts
interface ApiFulfillmentStage {
  id: string;
  version: number;
  title: string;
  handle: string;
  sortIndex: number;
  ticketConnection: ApiFulfillmentTicketConnection;
  createdAt: string;
  updatedAt: string;
}

interface ApiFulfillmentTicket {
  id: string;
  version: number;
  stageId: string;
  sortIndex: number;
  order: ApiFulfillmentOrderSummary;
  createdAt: string;
  updatedAt: string;
}

interface ApiFulfillmentOrderSummary {
  id: string;
  version: number;
  number: string;
  status: FulfillmentOrderStatus;
  createdAt: string;
  totalAmount: ApiMoney;
  customer: ApiFulfillmentCustomerSummary | null;
  shippingAddress: ApiFulfillmentAddressSummary | null;
  paymentSummary: ApiPaymentSummary | null;
  fulfillmentSummary: ApiFulfillmentStatusSummary;
  lineItemsSummary: ApiFulfillmentLineItemSummary[];
  tags: ApiFulfillmentTag[];
}

interface ApiMoney {
  amount: string;
  currencyCode: string;
}
```

Не переносить cent-to-dollar assumptions в API contract. Денежное значение приходит как API money object, а format выполняется на display boundary.

### 6.2. Relay connections

```ts
interface ApiFulfillmentTicketEdge {
  cursor: string;
  node: ApiFulfillmentTicket;
}

interface ApiFulfillmentTicketConnection {
  edges: ApiFulfillmentTicketEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}

interface ApiFulfillmentStageEdge {
  cursor: string;
  node: ApiFulfillmentStage;
}

interface ApiFulfillmentStageConnection {
  edges: ApiFulfillmentStageEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}
```

Даже если первый mock возвращает все стадии, contract остаётся Relay-shaped. Tickets каждой колонки также имеют собственный cursor, потому что реальный backend не сможет безопасно возвращать `limit: 1000` для каждой стадии.

### 6.3. Board query

Предлагаемый будущий query:

```graphql
query FulfillmentBoard(
  $first: Int
  $after: String
  $last: Int
  $before: String
  $where: FulfillmentTicketWhereInput
  $orderBy: [FulfillmentTicketOrderByInput!]
  $ticketsFirst: Int!
) {
  fulfillmentQuery {
    stages(first: $first, after: $after, last: $last, before: $before) {
      edges {
        cursor
        node {
          ...FulfillmentStageFields
          tickets(first: $ticketsFirst, where: $where, orderBy: $orderBy) {
            edges {
              cursor
              node { ...FulfillmentTicketFields }
            }
            pageInfo { ...PageInfoFields }
            totalCount
          }
        }
      }
      pageInfo { ...PageInfoFields }
      totalCount
    }
  }
}
```

### 6.4. Filters и server-side search/sort

`FulfillmentTicketWhereInput` должен поддерживать:

- `_and`, `_or`;
- `stageId` — required operational filter;
- `orderId`, `orderNumber`;
- `orderStatus`;
- `paymentStatus`;
- `fulfillmentStatus`;
- `customerId`, `customerEmail`, `customerPhone`;
- `shippingCountryCode`, `shippingCity`;
- `tagId`;
- `createdAt`, `updatedAt`;
- полнотекстовый search condition по номеру заказа, имени клиента, email и телефону.

`FulfillmentTicketOrderField` должен содержать только поля с реальной backend sorting semantics:

- `SORT_INDEX`;
- `ORDER_NUMBER`;
- `CREATED_AT`;
- `UPDATED_AT`;
- `TOTAL_AMOUNT`.

Default order для kanban: `SORT_INDEX ASC`. DnD reorder имеет приоритет над произвольной сортировкой. Поэтому перенос tickets разрешён только когда активна сортировка `SORT_INDEX ASC`; при другой сортировке drag handles блокируются с понятным tooltip.

Required filters для операторской работы:

- stage — неявно задаётся каждой колонкой;
- store scope — берётся из `orgName/storeName` и не редактируется пользователем;
- archived/cancelled visibility — явный фильтр с безопасным default;
- date range — рекомендуется обязательный default, например последние 30 дней, если backend требует ограничить выборку.

### 6.5. Mutation contracts

```ts
interface FulfillmentStageCreateInput {
  clientMutationId: string;
  title: string;
  handle: string;
  sortIndex: number;
}

interface FulfillmentStageUpdateInput {
  id: string;
  expectedVersion: number;
  title?: string;
  handle?: string;
}

interface FulfillmentStagesReorderInput {
  clientMutationId: string;
  stages: Array<{
    id: string;
    expectedVersion: number;
    sortIndex: number;
  }>;
}

interface FulfillmentTicketMoveInput {
  clientMutationId: string;
  ticketId: string;
  expectedVersion: number;
  sourceStageId: string;
  targetStageId: string;
  afterTicketId: string | null;
}

interface FulfillmentStatusUpdateInput {
  id: string;
  expectedVersion: number;
  status: FulfillmentStatus;
  comment: string | null;
}

interface FulfillmentTrackingUpsertInput {
  fulfillmentId: string;
  expectedVersion: number;
  shippingMethodId: string;
  trackingCode: string | null;
}
```

Не использовать `NIL_UUID` в новом публичном API contract. Начало списка выражается `afterTicketId: null`. Compatibility mapper может временно преобразовать `null` в `NIL_UUID`, если это потребуется старому алгоритму или будущему legacy endpoint.

### 6.6. Mutation payload и ошибки

Каждая mutation возвращает entity/payload и `userErrors`:

```ts
interface ApiUserError {
  code: string;
  field: string[] | null;
  message: string;
}

interface FulfillmentStageMutationPayload {
  stage: ApiFulfillmentStage | null;
  userErrors: ApiUserError[];
}
```

Конфликт версии возвращается как business error, например:

```ts
{
  code: "VERSION_CONFLICT",
  field: null,
  message: "This fulfillment was changed by another operator. Reload and try again."
}
```

UI не должен автоматически повторять mutation с устаревшими данными. Он показывает conflict message, refetch-ит сущность/доску и сохраняет введённые form values до решения пользователя.

## 7. Сохранение legacy view-модели

Старая модель `ICrmColumn`/`ICrmOrder` не соответствует целевому правилу прямого использования API outputs. По явному требованию она сохраняется временно, но только как внутренняя модель DnD engine.

```ts
interface LegacyFulfillmentColumnView {
  id: string;
  slug: string;
  sortIndex: number;
  title: string;
  tickets: LegacyFulfillmentTicketView[];
}

interface LegacyFulfillmentTicketView {
  id: string;
  createdAt: Date;
  orderNumber: number | string;
  totalAmount: ApiMoney;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  shippingAddress: ApiFulfillmentAddressSummary | null;
  payment: ApiPaymentSummary | null;
  fulfillments: ApiFulfillmentStatusSummary[];
  productsInfo: ApiFulfillmentLineItemSummary[];
  tags: ApiFulfillmentTag[];
}
```

`mapFulfillmentBoardToLegacyView(response)`:

- unwrap-ит Relay edges;
- создаёт `columns`, `columnsMapping`, `columnTicketsMapping`, `ordersMapping`;
- преобразует API date string в `Date` только для legacy view;
- не изменяет API response;
- не используется modal forms и mutation mappers;
- покрывается fixtures с пустыми колонками, null customer/address, несколькими statuses и pagination cursors.

Компоненты карточки могут сначала читать legacy view, чтобы перенос был без деградации. При следующей API adaptation задаче они переводятся на `ApiFulfillmentTicket` напрямую, после чего compatibility mapper удаляется.

Важно: mocks создаются в API shape и только затем проходят mapper. Запрещено создавать legacy-shaped mocks — иначе transport replacement снова потребует переписывания fixtures и hooks.

## 8. Mock API и transport boundary

### 8.1. Общие правила

- `mocks/fulfillment-board.ts` содержит API-shaped fixtures.
- `fulfillment-mock-store.ts` хранит изменяемое состояние только для текущей browser session.
- request functions имитируют transport и остаются единственной точкой доступа hooks к mock store.
- задержка должна быть небольшой и детерминированной; ошибки включаются через explicit mock scenario, а не через случайность.
- request functions принимают те же variables/inputs, которые позже получит Apollo.
- list/query функции реализуют filters, server-side search, sort и cursor pagination над mock dataset.
- mutation функции проверяют Zod-compatible business constraints и `expectedVersion`.
- успешная mutation увеличивает `version` и `updatedAt`.

### 8.2. Сигнатура query request

```ts
export async function requestFulfillmentBoard(
  variables: FulfillmentBoardQueryVariables,
): Promise<FulfillmentBoardQueryData>;
```

### 8.3. Сигнатура mutation request

```ts
export async function requestMoveFulfillmentTicket(
  input: FulfillmentTicketMoveInput,
): Promise<FulfillmentTicketMovePayload>;
```

### 8.4. Замена mock transport на Apollo

При подключении backend меняются только:

- содержимое hooks: request function заменяется на Apollo `useQuery`/`useMutation`;
- временные operation types заменяются generated types;
- fixtures остаются полезными для Storybook/manual scenarios;
- compatibility mapper остаётся до отдельной миграции legacy view.

Page, board components, modal payloads, schemas и form-to-input mappers не должны меняться из-за замены транспорта.

## 9. Hooks

### 9.1. `useFulfillmentBoard`

Контракт:

```ts
interface UseFulfillmentBoardReturn {
  connection: ApiFulfillmentStageConnection | null;
  stages: ApiFulfillmentStage[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}
```

Обязанности:

- выполнить mock request;
- игнорировать устаревший response через monotonically increasing request id;
- сохранять предыдущий connection во время refetch, чтобы не мигала доска;
- нормализовать неизвестные ошибки в `Error`;
- не строить legacy mappings.

### 9.2. `useFulfillmentBoardState`

Этот hook сохраняет логику старого `useTickets` + local state `CrmView`:

- вызывает compatibility mapper;
- строит `containers` в порядке `sortIndex`;
- строит `items: Record<stageId, ticketId[]>`;
- синхронизирует server/mock snapshot с local DnD state;
- не перетирает active drag snapshot промежуточным refetch;
- предоставляет lookup maps render callbacks;
- сообщает, разрешён ли DnD для текущего sort/filter state.

### 9.3. Mutation hooks

Один hook на use case:

- `useCreateFulfillmentStage`;
- `useUpdateFulfillmentStage`;
- `useDeleteFulfillmentStage`;
- `useReorderFulfillmentStages`;
- `useMoveFulfillmentTicket`;
- `useAppendFulfillmentTicket`;
- `useUpdateFulfillmentStatus`;
- `useUpsertFulfillmentTracking`;
- `useSplitFulfillment`;
- `useUndoSplitFulfillment`.

Каждый hook возвращает domain method, `loading`, `error`, `reset`. Domain method возвращает `{ data, userErrors }`, а не выбрасывает business errors. Runtime/transport error доступен отдельно.

### 9.4. Freshness после mutations

На mock этапе после успешной операции вызывается `refetch()` через `onSaved`/callback владельца страницы. Optimistic local DnD state остаётся для мгновенного feedback; refetch подтверждает canonical state.

При будущем Apollo transport первая реализация использует `refetchQueries` или explicit `refetch`. `cache.modify` вводится только после стабилизации pagination policy.

## 10. DnD: требования к переносу без деградации

### 10.1. Поведение, которое сохраняется буквально

- горизонтальная сортировка колонок;
- вертикальная сортировка tickets внутри колонки;
- перенос ticket между колонками;
- drag overlay для колонки и ticket;
- отдельные drag handles;
- mouse, touch и keyboard sensors;
- keyboard coordinate getter;
- collision detection для nested containers;
- измерение droppable containers;
- auto-scroll по горизонтали и вертикали;
- отмена drag с восстановлением snapshot;
- запрет случайного открытия order modal после drag;
- сохранение порядка на mutation;
- refetch после success и failure;
- пустая колонка остаётся валидной drop target.

### 10.2. Инварианты `moveTicket`

Перед mutation необходимо зафиксировать:

- `ticketId`;
- `sourceStageId`;
- `targetStageId`;
- `targetIndex`;
- `afterTicketId`, равный предыдущему ticket после local move или `null` для первой позиции;
- `expectedVersion` ticket;
- local state snapshot для rollback.

Mutation вызывается только один раз после завершения drag. `onDragOver` меняет local preview, но не отправляет запросы.

При success:

1. оставить optimistic state;
2. показать success message;
3. выполнить refetch;
4. заменить state canonical snapshot после завершения active drag.

При `userErrors` или runtime error:

1. восстановить snapshot;
2. показать нормализованную ошибку;
3. выполнить refetch;
4. при `VERSION_CONFLICT` сообщить, что доска была изменена другим оператором.

### 10.3. Инварианты reorder колонок

- не отправлять mutation, если порядок не изменился (`isEqual`);
- включать все изменившиеся `sortIndex` и `expectedVersion`;
- optimistic reorder и rollback;
- не разрешать второй reorder, пока первый commit находится in-flight, либо сериализовать mutations;
- после refetch сортировать по canonical `sortIndex`.

### 10.4. Известное поведение старой реализации

Старая `onSortItems` считает пустой target list ошибкой (`!nextItems?.length`). Это мешает переносить последний ticket из колонки или корректно обрабатывать некоторые пустые состояния. Технически корректная будущая реализация должна различать:

- `nextItems === undefined` — internal error;
- `nextItems.length === 0` — валидное состояние колонки.

Так как baseline migration требует точного переноса логики, изменение этого условия не должно смешиваться с переносом. Текущее поведение сначала воспроизводится и фиксируется parity-сценарием. Исправление выполняется отдельным явно согласованным change после переноса либо отдельным commit/task с собственными acceptance criteria. Это позволяет отличить regression переноса от изменения старого поведения.

## 11. Страница и operator-focused UI

Страница показывает только информацию, нужную оператору для быстрой обработки заказа:

- номер и дата заказа;
- клиент и телефон;
- город/краткий адрес доставки;
- payment summary;
- fulfillment summary;
- количество товаров и до трёх thumbnails;
- total amount с currency;
- первый/приоритетный tag как цветовой cue.

Не показывать на карточке:

- длинные адреса и комментарии;
- billing details;
- полный список line items;
- технические IDs;
- историю событий;
- служебные timestamps кроме created date.

Полная информация открывается в `fulfillment-order` modal stack item.

Page composition должна повторять `CrmLayout`, а не переводить доску на визуальный шаблон другой страницы:

```tsx
<FulfillmentLayout
  headerProps={{ title: "Fulfillment", count, create: openCreateOrder }}
  navigationProps={filterProps}
>
  <FulfillmentBoard ... />
</FulfillmentLayout>
```

`FulfillmentLayout` в новом Admin воспроизводит следующую old layout hierarchy:

1. внешний content container с `padding-top: 16px` и `padding-inline: 16px`;
2. header той же высоты и с тем же расположением title/count/create action, что старый `TableLayoutHeader`;
3. отдельная filter strip сразу под header;
4. filter strip имеет прежний gradient/background, отрицательные горизонтальные margins `-15px`, hidden overflow и padding `16px 16px 1px`;
5. board viewport начинается сразу после filter strip;
6. viewport занимает оставшуюся доступную высоту, имеет собственный overflow и не ограничивается `max-width`;
7. board row начинается со старого offset: `margin-left: -20px`, `padding-left: 16px`, `padding-top: 12px`;
8. кнопка добавления колонки находится после последней колонки в том же horizontal flow, а не в page header;
9. loading skeleton занимает ту же геометрию, чтобы переход к загруженной доске не вызывал layout shift.

Если новый App shell уже задаёт часть outer spacing, fulfillment-specific layout должен компенсировать его так, чтобы итоговые computed offsets рабочей области совпадали со старой страницей. Нельзя складывать старые и новые paddings и получать визуально другую доску.

Состояния страницы:

- initial loading — skeleton колонок и карточек;
- background refetch — доска остаётся видимой, в header показывается subtle progress;
- empty board — CTA создать первую стадию;
- stages without tickets — пустые drop zones;
- error without cached data — `Alert` + Retry;
- error with cached data — non-blocking `Alert`, текущая доска остаётся доступной;
- mutation in flight — блокируется только затронутый action/drag commit, а не вся страница.

## 12. Filters, search, sorting и pagination

### 12.1. Kanban page config

`usePageConfig` сейчас требует `AgGridReact` ref, поэтому его нельзя искусственно применять к kanban. Для board нужно выделить совместимый общий слой либо использовать `useFilters` + domain page-config builder с теми же правилами сериализации GraphQL variables.

`page-config.ts` содержит:

- `fulfillmentSortFieldMapping`;
- `buildFulfillmentSearchCondition(search)`;
- `buildFulfillmentBoardQueryVariables(config)`;
- transform для relation и enum filters;
- default required filters;
- стабильный reset key.

UI search и filters никогда не фильтруют уже загруженный массив локально. Mock request применяет их как server-side transport.

### 12.2. Таблицы

Если в order modal или picker появляются таблицы заказов, вариантов, доставок или stages, каждая таблица обязана:

- использовать `usePageConfig`;
- передавать `where` и `orderBy` в request hook;
- применять server-side search;
- иметь только server-supported sortable columns;
- использовать required filters;
- использовать Relay `first/after/last/before`;
- показывать `totalCount` и `pageInfo` через `RelayCursorPagination`;
- сохранять grid state с уникальным `storageKey`;
- сбрасывать cursor при изменении search/filter/sort/page size;
- не делать client-side pagination или sort над текущей страницей.

## 13. Modal stack

### 13.1. Типы modal stack

В `admin/src/domains/fulfillment/modals.ts` зарегистрировать:

```ts
type FulfillmentStageModalPayload = {
  mode: "create" | "edit";
  entityId?: string;
  initialSortIndex?: number;
  onSaved?: () => Promise<unknown> | unknown;
};

type FulfillmentOrderModalPayload = {
  mode: "create" | "edit";
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
};

type FulfillmentStatusModalPayload = {
  fulfillmentId: string;
  targetStatus: FulfillmentStatus;
  onSaved?: () => Promise<unknown> | unknown;
};

type FulfillmentTrackingModalPayload = {
  mode: "create" | "edit";
  fulfillmentId: string;
  trackingId?: string;
  onSaved?: () => Promise<unknown> | unknown;
};
```

Modal definitions добавляются в `admin/src/domains/modals.tsx`. Каждая модалка грузится dynamic import и регистрируется один раз.

### 13.2. Stage create/edit modal

Одна модалка обслуживает create и edit.

Поля:

- `title` — required;
- `handle` — required, автоматически синхронизируется с title в create mode, но допускает ручное изменение;
- `sortIndex` не редактируется напрямую и приходит из payload/board state.

Zod rules:

- title trimmed, 1–80 символов;
- handle trimmed, 1–80 символов, lowercase slug pattern;
- запрещены дубликаты handle;
- update требует entity с `version`.

Mapper:

- create добавляет `clientMutationId`;
- update отправляет `id`, `expectedVersion` и изменённые поля;
- API error `handle`/`title` устанавливается через `setError`;
- global error выводится `Alert` в modal body.

### 13.3. Order create/edit modal

Одна modal-stack модалка обслуживает создание и редактирование заказа. Она является контейнером смысловых sections, но не должна владеть API других domains.

Блоки формы:

1. `relations` — customer, products/variants, shipping/payment method;
2. `content` — line items, quantities, prices, notes;
3. `additional data` — addresses, tags, metadata;
4. `fulfillment` — active/draft fulfillments, statuses, tracking, split/undo split;
5. `activity` — timeline и comments;
6. `complaints/moderation` — только если это реально присутствует в будущем Order API; пустые декоративные блоки не создавать.

Product/customer pickers открываются поверх order modal как следующий уровень modal stack. Их таблицы следуют требованиям `usePageConfig` и Relay pagination.

### 13.4. Fulfillment status modal

Сохраняется поведение старой confirmation modal:

- заголовок зависит от target status;
- отображается новое состояние;
- есть необязательный comment;
- dangerous styling для `CANCELLED`;
- submit disabled/loading во время mutation;
- API field errors привязываются к `status` или `comment`;
- version conflict остаётся global error;
- после success закрывается текущий stack item и вызывается `onSaved`.

Допустимые transitions должны находиться в domain helper/contract, а не дублироваться между menu и modal.

### 13.5. Tracking create/edit modal

Одна модалка обслуживает create/edit.

Поля:

- shipping method relation;
- tracking code;
- при наличии API — tracking URL/provider reference.

Zod mapper строит `FulfillmentTrackingUpsertInput`, update включает `expectedVersion`. После success order modal и board refetch-ятся через callbacks/cache policy.

### 13.6. Dirty state и закрытие

Все form modals:

- вызывают `setDirty(isDirty)`;
- используют `pop()` для обычного закрытия;
- используют `forcePop()` только после подтверждённого discard или успешного save;
- не теряют введённые данные при userErrors;
- reset-ят форму только после загрузки edit entity и не перетирают dirty form повторным refetch.

## 14. Формы, Zod и mappers

Каждая форма имеет `schema.ts`, экспортирующий schema и inferred values type.

Пример stage schema:

```ts
export const fulfillmentStageFormSchema = z.object({
  title: z.string().trim().min(1).max(80),
  handle: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export type FulfillmentStageFormValues = z.infer<
  typeof fulfillmentStageFormSchema
>;
```

Mappers разделяются по направлениям:

- form values -> create input;
- form values + entity -> update input;
- API user errors -> form/global errors;
- API response -> legacy kanban view — только board compatibility mapper.

Запрещено:

- строить mutation input внутри JSX submit handler;
- inline повторять field error mapping;
- передавать legacy view в mutation mapper;
- скрывать version conflict как обычный toast;
- преобразовывать все API entities в новые output view-модели вне явно обозначенного kanban compatibility layer.

## 15. Перенос UI и styles

### 15.1. Общая стратегия

Ant Design компоненты переносятся с теми же props, hierarchy и interactive states, кроме изменений, обязательных из-за версии Ant Design. Emotion `css` blocks заменяются один к одному на `antd-style`. Сначала воспроизводится старое вычисленное правило, затем literal старого token заменяется эквивалентным token нового Admin. Структурный CSS нельзя «улучшать» или упрощать в рамках переноса.

```tsx
const useStyles = createStyles(({ token, css }) => ({
  column: css`
    display: flex;
    min-width: 360px;
    flex-direction: column;
    border-radius: ${token.borderRadius}px;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: ${token.paddingXS}px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    box-shadow: ${token.boxShadowTertiary};
  `,
}));
```

Canonical CSS-in-JS API для новых fulfillment files — `createStyles` из `antd-style`, уже используемый layouts и domain-модулями `admin`. Прямой импорт `css` из `@emotion/react`, Emotion `css` prop и перенос старых global CSS variables запрещены.

Если объектный syntax `createStyles` не позволяет точно выразить selector или dynamic state, используется template `css` из callback `createStyles`, а не inline `style` и не новый `.module.css`.

### 15.2. Замена старых tokens

| Старый token | Новый источник |
| --- | --- |
| `--radius-base` | `token.borderRadius` |
| `--box-shadow-paper` | `token.boxShadowTertiary` |
| `--color-gray-*` | `token.colorBg*`, `token.colorBorder*`, `token.colorText*` |
| `--color-primary-10` | `token.colorPrimary` |
| `--x1..x5` | `token.paddingXXS..paddingXL` |
| dynamic `--color-${tag}-*` | безопасная semantic tag palette helper |

Нельзя собирать CSS variable name из произвольного tag color. Цвет проходит allowlist/mapper, а неизвестное значение становится `default`.

Старые spacing values фиксируются как visual baseline, даже если ближайший semantic token нового Admin отличается:

| Old value | Использование |
| --- | --- |
| `--x1 = 4px` | column header inner padding, ticket outer padding, add-column gap |
| `--x2 = 8px` | column header bottom gap |
| `--x3 = 12px` | ticket content padding, board top padding |
| `--x4 = 16px` | page/filter/board horizontal padding |
| `--x5 = 20px` | отрицательный board offset |
| `--radius-base = 6px` | column header и ticket radius |

Если Ant Design token в активной теме не равен baseline value, создаётся fulfillment-specific derived style constant на основе theme configuration. Нельзя молча заменить `12px` на `token.padding` (`16px`) и считать это эквивалентным переносом.

### 15.3. Точные визуальные инварианты old UI

Следующие правила считаются частью функционального контракта страницы:

- колонка: `min-width: 360px`, flex column, без принудительного max-width;
- высота колонки: `calc(available-board-height - 16px)`;
- column header: `height: 40px`, horizontal flex, centered, border-bottom, background, shadow и radius как в old UI;
- column header margins: `0 4px 4px`;
- ticket slot outer padding: `4px`, width `100%`;
- ticket surface: `min-height: 152px`, `max-height: 152px`, content padding `12px`, border, radius и shadow `1px 1px 10px rgba(0,0,0,.1)`;
- DnD `itemSize`: `160px` сохраняется;
- card metadata rows и их gaps сохраняют old hierarchy;
- Avatar group остаётся ограничен тремя видимыми изображениями;
- add-column button: `size="large"`, без border, old paper shadow, `margin-left: 4px`, `flex-shrink: 0`;
- drag overlay item сохраняет old opacity `0.3` и верхний stacking context;
- draggable wrapper сохраняет `touch-action: manipulation`, translate3d transform и pointer cursor;
- ticket background/border по tag color сохраняются семантически и визуально через безопасную palette map;
- board viewport сохраняет горизонтальный scroll и не переносит колонки на новую строку.

DOM может измениться только там, где этого требует новый layout/modal stack или API новой версии Ant Design. Любое такое изменение должно сохранять computed layout и testable interaction.

### 15.4. Layout и responsive behavior

- board занимает доступную высоту layout без старого `ContainerHeight` global CSS contract;
- горизонтальный scroll находится внутри board viewport;
- колонки имеют `min-width: 360px`; на узких экранах используется horizontal scroll, а ширина колонки не уменьшается вопреки old UI;
- drag overlay не меняет размеры исходной колонки;
- sticky page header/filter area не должен ломать DnD coordinates;
- portal modal stack и drag overlay должны иметь согласованные z-index tokens.

### 15.5. Accessibility

- drag handles имеют `aria-label` с названием column/order;
- keyboard DnD сохраняется;
- состояние перемещения объявляется через DndContext announcements;
- кликабельная карточка доступна с клавиатуры;
- status не обозначается только цветом;
- disabled drag содержит текстовое объяснение;
- все Ant Design menu items получают `data-testid` на объекте menu item согласно проектному паттерну.

## 16. Детальная карта переноса поведения

| Поведение old UI | Целевое место | Критерий сохранения |
| --- | --- | --- |
| `columns.map(mapEntryId)` | `useFulfillmentBoardState` | Порядок совпадает с API `sortIndex` |
| `columnTicketsMapping` | compatibility mapper | Содержит tickets каждой stage, включая пустые |
| `ordersMapping` | compatibility mapper | O(1) lookup для render item |
| `isEqual(nextKeys, containers)` | reorder hook/orchestrator | Нет лишней mutation |
| previous ticket calculation | move orchestrator | `afterTicketId` корректен для первой/средней позиции |
| refetch in `finally` | mutation coordination | Canonical sync и после success, и после failure |
| ticket click -> order drawer | `useFulfillmentOrderModal().push` | Открывает edit modal с entityId |
| header create -> draft order | order modal create mode | Не создаёт пустую entity до submit, если API это позволяет |
| column title click -> edit | stage modal edit mode | Загружает entity/version и сохраняет изменения |
| plus button -> create column | stage modal create mode | Передаёт следующий sortIndex |
| fulfillment status menu | status modal stack item | Все старые transitions доступны |
| tracking add/edit | tracking modal stack item | Один modal type с create/edit mode |
| split/undo split | order fulfillment section | Количества и parent-child behavior сохранены |

## 17. Реализация по этапам

### Этап 0. Зафиксировать baseline

- составить список всех старых DnD sensors, callbacks и edge cases;
- сохранить test ids старой доски, где они отражают пользовательское поведение;
- зафиксировать screenshots основных состояний вручную;
- определить точный scope order modal и зависимых domains до начала его переноса.

Результат: checklist parity, не код.

### Этап 1. API contract и mocks

- создать operation types будущего GraphQL API;
- создать API-shaped fixtures;
- реализовать in-memory mock store;
- реализовать query filters/search/sort/Relay cursors;
- реализовать mutations, user errors и version checks;
- добавить request boundary.

Результат: domain API можно использовать без React.

### Этап 2. Compatibility mapper и query hooks

- перенести legacy view types;
- реализовать API -> legacy board mapper;
- реализовать `useFulfillmentBoard`;
- реализовать `useFulfillmentBoardState`;
- проверить null/empty/pagination scenarios.

Результат: React получает одновременно API connection и стабильную DnD view.

### Этап 3. DnD engine

- перенести old board files без алгоритмического rewrite;
- сохранить virtual list, auto-sizer, item measurement и scroll containers;
- адаптировать React 19/TypeScript imports;
- переписать каждый Emotion style block на эквивалентный `antd-style`, сверяя computed geometry;
- сохранить sensors, keyboard coordinates, collision detection, overlay и rollback;
- не исправлять поведение empty target list внутри parity-переноса; вынести исправление в отдельную согласованную задачу.

Результат: isolated kanban работает на mock API.

### Этап 4. Page, filters и registration

- создать domain/register files;
- встроить fulfillment-specific аналог `CrmLayout` внутрь нового `AppLayout`;
- сохранить старые header, filter strip, board viewport и add-column placement без редизайна;
- реализовать server-like filter/search/sort через mock transport;
- подключить sidebar route;
- добавить loading/error/empty/refetch states.

Результат: `/org/store/fulfillment` доступен из нового Admin.

### Этап 5. Stage modal

- зарегистрировать modal type;
- объединить create/edit;
- добавить Zod schema и form/input/error mappers;
- добавить version conflict;
- обновлять board после save/delete.

Результат: оператор управляет колонками через modal stack.

### Этап 6. Order modal и fulfillment sections

- перенести только нужные operator sections;
- вынести API ownership по domains;
- подключить nested picker modals;
- перенести active/draft fulfillment, split/undo split и timeline;
- сохранить legacy UI behavior, переписав styles.

Результат: ticket открывает полноценный рабочий сценарий.

### Этап 7. Status и tracking modals

- перенести status transition matrix;
- объединить tracking create/edit;
- добавить Zod/mappers/user errors/version;
- синхронизировать order modal и board после save.

Результат: все fulfillment-specific модалки работают через stack.

### Этап 8. Hardening

- проверить rapid sequential moves;
- проверить simultaneous version conflict;
- проверить rollback;
- проверить keyboard/touch DnD;
- проверить large columns и per-column Relay pagination;
- проверить сохранение filters при modal open/close;
- проверить отсутствие client-side search/sort в API-backed lists.

## 18. Проверка и критерии приёмки

В соответствии с проектными инструкциями `test` и `tsc` не запускаются для проверки. Когда нужна собранная версия, используется project build через `shopana-cli`.

### 18.1. Functional parity

- [ ] Колонки отображаются в том же порядке, что и в old UI.
- [ ] Ticket содержит всю операторскую информацию из old UI.
- [ ] Ticket открывает order modal.
- [ ] Create order открывает order modal в create mode.
- [ ] Колонки создаются и редактируются одной stage modal.
- [ ] Колонки сортируются DnD.
- [ ] Tickets сортируются внутри колонки.
- [ ] Tickets переносятся между колонками, включая пустую.
- [ ] Перенос в первую позицию отправляет `afterTicketId: null`.
- [ ] Drag cancel восстанавливает исходное состояние.
- [ ] Mutation failure выполняет rollback и refetch.
- [ ] Version conflict не затирает чужие изменения.
- [ ] Status, tracking, split и undo split доступны из order modal.

### 18.2. Architecture

- [ ] Page не импортирует mock data/store напрямую.
- [ ] Hooks не возвращают raw nested transport payloads.
- [ ] Mocks имеют форму будущего GraphQL API.
- [ ] Legacy view существует только в board compatibility layer.
- [ ] Form values не используются как API input без mapper.
- [ ] API field errors связаны с form fields.
- [ ] Update inputs содержат `expectedVersion`.
- [ ] После save данные автоматически обновляются.
- [ ] Таблицы используют `usePageConfig` и Relay pagination.
- [ ] Sorting/search/filter выполняются mock server layer, не над текущей страницей.
- [ ] Все modals зарегистрированы в modal stack.

### 18.3. DnD and UX

- [ ] Mouse DnD работает.
- [ ] Touch DnD работает.
- [ ] Keyboard DnD работает.
- [ ] Auto-scroll работает в обеих осях.
- [ ] Drag overlay не меняет layout.
- [ ] Card click не срабатывает после drag.
- [ ] При пользовательской сортировке, несовместимой с manual order, DnD корректно disabled.
- [ ] Loading/refetch не очищают видимую доску.
- [ ] Empty/error states содержат operator action.

### 18.4. Visual QA

- [ ] Emotion отсутствует в новых fulfillment files.
- [ ] Все styles реализованы через `createStyles` из `antd-style`.
- [ ] Используются theme tokens/derived constants вместо старых CSS variables без изменения baseline geometry.
- [ ] Light/dark theme не имеют hardcoded контрастных дефектов.
- [ ] Внутренний layout повторяет old `CrmLayout`; типовой новый layout не добавляет лишние paddings/max-width/grid.
- [ ] Column width `360px`, ticket height `152px`, DnD item size `160px`, gaps, offsets и scroll behavior совпадают с old UI.
- [ ] Filter strip, header, add-column button и empty columns находятся в тех же местах.
- [ ] Virtualized list сохраняет прежнее измерение и производительность на длинных колонках.
- [ ] Модалки корректно работают на нескольких уровнях stack.
- [ ] Dirty close confirmation работает.

## 19. Риски и меры

### Риск: одновременное сохранение API shape и legacy view

Мера: один именованный mapper, один каталог `models/legacy-*`, запрет legacy-shaped mocks и явная задача на удаление слоя после стабилизации API.

### Риск: DnD state перетирается refetch-ем

Мера: snapshot/version coordination в `useFulfillmentBoardState`; canonical snapshot применяется только вне active drag/commit.

### Риск: `limit: 1000` скрывает pagination проблемы

Мера: mock API сразу реализует Relay connection для каждой колонки и сценарий `hasNextPage: true`.

### Риск: фильтры меняют порядок во время DnD

Мера: abort/disable active drag при смене filter/search; ручной reorder разрешён только при `SORT_INDEX ASC`.

### Риск: fulfillment начинает владеть всем order domain

Мера: modal stack служит интеграционной границей; order/payment/delivery API и hooks остаются у соответствующих domains.

### Риск: механический style rewrite меняет hit areas

Мера: сохранить размеры drag handle, ticket, column gap и overlay; проводить visual/manual parity отдельно от архитектурного refactor.

## 20. Definition of Done

Перенос завершён, когда:

1. новая Fulfillment page зарегистрирована и доступна по tenant-aware route;
2. UI работает только через typed hooks и mock API будущей GraphQL формы;
3. kanban DnD сохраняет старое поведение, включая keyboard/touch/rollback;
4. legacy view сохранена только как изолированный compatibility layer;
5. stage, order, status и tracking scenarios используют modal stack;
6. create/edit объединены в рамках каждой сущности;
7. формы используют Zod, input/error mappers и entity version;
8. mutations автоматически обновляют board/order data;
9. все используемые таблицы следуют `usePageConfig`, server search/sort, required filters и Relay pagination;
10. Emotion styles заменены на `antd-style` и Ant Design theme tokens;
11. новый `AppLayout` служит оболочкой, а внутренний Fulfillment UI визуально и структурно повторяет old `CrmLayout` без редизайна;
12. old dimensions, offsets, scroll containers, virtualization, DnD hit areas и interactive states сохранены;
13. mock transport можно заменить Apollo hooks без переделки page/components/forms;
14. functional, DnD, accessibility и visual acceptance checklist пройден вручную, а build выполнен только когда требуется новая собранная версия.
