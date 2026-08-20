# Discount Details Card — план имплементации

## 1. Цель

Реализовать в Admin детальную карточку скидки по Pencil-дизайну из `pen/domains/discounts.pen`,
открыть её в `ModalStack` из таблицы скидок и питать данными GraphQL Pricing API. Исключение первой
версии — KPI summary и usage history: это намеренно статические значения из макетов.

План не предполагает API-output view model. Компоненты принимают `ApiDiscount` или типы, напрямую
выведенные из результата GraphQL-операции. Статические KPI не маскируются под API-данные и хранятся
отдельно от GraphQL-контракта.

## 2. Источники дизайна

Основные экраны:

| Сценарий                             | Pencil node |
| ------------------------------------ | ----------- |
| Amount off products / code / active  | `d0AwSm`    |
| Buy X Get Y / automatic / scheduled  | `Ol41e`     |
| Amount off order / code / paused     | `Vztrx`     |
| Free shipping / automatic / active   | `hFvJ3`     |
| Draft только с title / пустые секции | `yEt8h`     |

Переиспользуемые секции:

| Секция                | Pencil node |
| --------------------- | ----------- |
| Summary               | `HnqZv`     |
| Value & usage         | `grfdm`     |
| Applies to            | `h8PACg`    |
| Customer eligibility  | `H99ci`     |
| Availability & limits | `h90YJS`    |
| Tags                  | `RaeX3`     |
| Discount codes        | `fQnng`     |
| External references   | `I3ae9s`    |
| Channels              | `avwDn`     |
| Combinations          | `mvjvy`     |

Эталонная ширина контента карточки — `800px`, вертикальный gap между секциями — `12px`, фон body
модалки — нейтральный серый. В коде размеры и цвета должны выражаться через Ant Design tokens и
`antd-style`, а не через копирование hex-значений из Pencil.

Подтверждённое продуктовое отклонение от текущего Pencil: на automatic discount секция
`Discount codes` не показывается. Empty-state codes, присутствующий на экране `Ol41e`, не
переносится в реализацию.

## 3. Текущее состояние

- Список скидок уже получает `ApiDiscount` через `DISCOUNTS_QUERY`.
- Таблица пока не открывает details modal по клику строки.
- Зарегистрирована только модалка создания `discount-create`.
- Отдельных `DISCOUNT_DETAILS_QUERY`, `useDiscount`, `DiscountModal` и `DiscountDetailsCard` нет.
- Pricing API уже имеет `pricingQuery.discount(id: ID!)` и большую часть необходимых полей агрегата.
- В `ProductDetailsCard` уже есть `PricingBlock` с нужным визуальным паттерном: header, основная
  value-колонка, history chart и ряд из четырёх KPI.
- UI-kit уже предоставляет `Paper`, `PaperHeader`, `ModalLayout` и `ModalStack`; их необходимо
  переиспользовать.

## 4. Границы первой поставки

Первая поставка — read-only карточка с API-backed данными скидки и статическим демо-набором KPI:

- загрузка скидки по ID;
- loading, error и not-found состояния;
- все применимые секции и их empty/stale варианты;
- корректные различия четырёх `DiscountKind`, двух `DiscountMethod` и lifecycle/effective statuses;
- hardcoded KPI и usage chart, соответствующие пяти Pencil-сценариям;
- открытие модалки из списка;
- action-кнопки выводятся только если передан соответствующий callback.

Редакторы секций, lifecycle-команды, activity modal и CRUD внешних ссылок не входят в первую
поставку карточки. Контракты `onEditSection` и `onViewActivity` нужно заложить сразу, чтобы
добавление edit-модалок не меняло структуру presentational components.

## 5. Целевая структура файлов

```text
admin/src/domains/inventory/discounts/
├── components/
│   └── discount-details-card/
│       ├── discount-details-card.tsx
│       ├── discount-details-card.styles.ts
│       ├── discount-kpi.fixtures.ts
│       ├── formatters.ts
│       ├── types.ts
│       ├── index.ts
│       └── sections/
│           ├── discount-summary-section.tsx
│           ├── discount-value-usage-adapter.tsx
│           ├── applies-to-section.tsx
│           ├── customer-eligibility-section.tsx
│           ├── channels-section.tsx
│           ├── combinations-section.tsx
│           ├── availability-limits-section.tsx
│           ├── tags-section.tsx
│           ├── discount-codes-section.tsx
│           ├── external-references-section.tsx
│           └── index.ts
├── graphql/
│   ├── fragments.ts
│   ├── queries.ts
│   └── operation-types.ts
├── hooks/
│   ├── use-discount.ts
│   └── index.ts
├── modals/
│   └── discount-modal/
│       ├── discount-modal.tsx
│       └── index.ts
└── modals.ts

admin/src/domains/inventory/components/
└── details-metrics-widget/
    ├── details-metrics-widget.tsx
    ├── details-metrics-widget.styles.ts
    ├── types.ts
    └── index.ts
```

Мелкие повторяющиеся элементы (`SectionAction`, KPI tile, status badge, reference status) можно
вынести в локальную `components/` подпапку только после появления второго реального использования.
Не создавать абстракции заранее.

## 6. GraphQL read path

### 6.1 Fragment

Добавить `DISCOUNT_DETAILS_FRAGMENT` с именем GraphQL-фрагмента `DiscountDetailsFields`. Он должен
получать:

- identity: `id`, `revision`, `title`, `method`, `kind`, `discountClass`, `currency`, `state`,
  `effectiveStatus`, `createdAt`, `updatedAt`, `archivedAt`;
- definition: `priority`, purchase modes, schedule, usage limit и `appliesOncePerCustomer`;
- `rule` с inline fragments для `DiscountAmountOffRule`, `DiscountBuyXGetYRule` и
  `DiscountFreeShippingRule`;
- `minimumRequirement`;
- `usage` и верхнеуровневые usage counters;
- `targetSelections`, включая role/type, reference status и union target с минимальными полями
  Product/Variant/Category для превью;
- `buyerContext`, customers/segments и reference status;
- `channels`, `combinations`, `tags`;
- `codes(first: 20)` с `totalCount`, status и usage counters;
- `externalReferences(first: 20)` с `totalCount`, sync state, URL, error и timestamps;

`redemptions` не добавлять только ради KPI первой версии: KPI статические и не должны неявно
смешивать hardcode с частичными API-вычислениями.

Не расширять `DISCOUNT_LIST_FRAGMENT`: тяжёлые связи должны загружаться только при открытии details
modal.

### 6.2 Query и hook

Добавить `DISCOUNT_DETAILS_QUERY`:

```graphql
query DiscountDetails($id: ID!) {
  pricingQuery {
    discount(id: $id) {
      ...DiscountDetailsFields
    }
  }
}
```

В `operation-types.ts` определить response/variables через generated API types, не реэкспортируя их.
`useDiscount(id)` владеет Apollo `useQuery`, пропускает запрос при `null`, возвращает:

```ts
{
  discount,
  loading,
  error,
  refetch,
}
```

Никаких output mappers: форматирование дат, денег, enum labels и display fallbacks выполняется на
границе отображения.

## 7. Контракт карточки

```ts
type DiscountDetailsSection =
  | "summary"
  | "value-usage"
  | "applies-to"
  | "customer-eligibility"
  | "channels"
  | "combinations"
  | "availability-limits"
  | "tags"
  | "codes"
  | "external-references";

interface DiscountDetailsCardProps {
  discount: DiscountDetailsQueryDiscount;
  onEditSection?: (section: DiscountDetailsSection) => void;
  onViewActivity?: () => void;
  onRefresh?: () => Promise<unknown>;
}
```

`DiscountDetailsQueryDiscount` должен быть выведен из operation result либо оставаться
`ApiDiscount`, если fragment действительно формирует полный тип. Не вводить
`DiscountDetailsViewModel`.

Root component использует `Flex vertical gap={12}` и отвечает за порядок и условное включение
секций. В частности, `DiscountCodesSection` добавляется в дерево только для
`discount.method === DiscountMethod.Code`. Остальные бизнес-ветвления конкретной секции остаются
внутри неё.

## 8. Маппинг секций на API

### 8.1 Summary

- Status badge: `effectiveStatus`, а не только persisted `state`.
- Title fallback: `title ?? primaryCode ?? "Untitled discount"`.
- Identity chips: short ID, method, kind, currency.
- Updated metadata: `updatedAt`.
- KPI первой версии — hardcode из Pencil, включая Orders, Uses, Discounted sales, Average discount,
  trends, выбранный период и compare state.
- Значения вынести в `discount-kpi.fixtures.ts` и выбирать по устойчивому presentation key:
  `kind + method + effectiveStatus`, с отдельным draft fallback. Не размещать числа inline внутри
  JSX.
- Статические KPI не использовать для бизнес-логики, permissions, lifecycle actions или расчёта
  других секций.
- В коде рядом с fixture оставить явный TODO на замену analytics query, чтобы hardcode не
  воспринимался как фактическая статистика скидки.

Статические значения из текущих экранов:

| Pencil-сценарий                     | Orders | Uses | Discounted sales | Avg. discount |
| ----------------------------------- | -----: | ---: | ---------------: | ------------: |
| Amount off products / code / active |    156 |  248 |          $18,420 |           20% |
| Buy X Get Y / automatic / scheduled |      0 |    0 |               $0 |             — |
| Amount off order / code / paused    |     82 |   94 |          $24,800 |           $25 |
| Free shipping / automatic / active  |    314 |  314 |          $42,100 |        $12.40 |
| Draft / title only                  |      0 |    0 |               $0 |             — |

Тренды и точки графика также копируются из соответствующего Pencil-сценария, а не рассчитываются из
`ApiDiscount`.

### 8.2 Value & usage

`Value & usage` — не новая самостоятельная UI-секция. Это переиспользование presentational части
pricing widget из `ProductDetailsCard`.

Текущий `PricingBlock` нельзя импортировать напрямую в discounts: он связан с `ApiProduct`,
`useProductPricingWidget`, variant selection, price mutations и product edit modals. Перед
добавлением скидок из него нужно извлечь общий presentational shell в
`inventory/components/details-metrics-widget`:

- `Paper` container и header slot;
- responsive two-column layout;
- primary value/details slot;
- history/chart slot;
- общий ряд `KPITile`;
- loading и empty presentation;
- существующие spacing, breakpoints и token-based styles.

После extraction текущий `PricingBlock` остаётся product-specific container: он продолжает загружать
product pricing, обрабатывать variant selection и edit actions, но рендерит извлечённый
`DetailsMetricsWidget`. Его публичный контракт и поведение не меняются.

Discount adapter только преобразует `ApiDiscount` и локальный hardcoded usage fixture в presentation
props общего widget. Он не копирует разметку и styles `PricingBlock`.

Discount primary value выбирается по `rule.__typename` и `kind`:

- amount off: percentage/fixed amount, allocation, minimum requirement, maximum discount;
- Buy X Get Y: qualifier, benefit, quantities, value, per-order limit;
- free shipping: minimum requirement и maximum shipping price;
- incomplete draft: единый empty state без попытки угадать rule.

Usage tiles берутся из `usage`: limit, consumed, committed/reserved, reversed, remaining. Все BigInt
GraphQL scalars форматируются без преобразования в небезопасный JS `number`.

Usage history первой версии также берётся из статического fixture выбранного Pencil-сценария. Для
draft/scheduled сценария используется предусмотренный макетом empty state. График не вычисляется из
`usage` counters.

### 8.3 Applies to

- Группировать `targetSelections` по role: qualifier/benefit.
- Поддержать `ALL_PRODUCTS`, `PRODUCTS`, `VARIANTS`, `CATEGORIES`.
- Для resolved targets показывать title/thumbnail/secondary identity.
- Для отсутствующего `target` показывать stale row по `targetId`, `targetType` и `referenceStatus`,
  не удаляя ссылку из UI.
- Для больших наборов показывать первые карточки и count; action «Open all» включать только при
  наличии callback/modal.
- Для order/free-shipping scope отображать семантическое описание из kind, если catalog target по
  контракту не требуется.

### 8.4 Customer eligibility

- `ALL`: «All customers».
- `CUSTOMERS`: список customer references, resolved customer и stale state.
- `SEGMENTS`: список segment IDs и reference state.
- Warning выводится при любом stale/missing reference.

Текущий `ApiDiscountEligibleSegment` не содержит display name сегмента. До API/Federation расширения
показывать сокращённый `segmentId`; не подставлять фиктивные названия из дизайна.

### 8.5 Channels

- Отрисовать все `channels`, featured state и summary count.
- Label получать из существующего channel registry, если он доступен; иначе форматировать `code` без
  локального hardcoded списка.
- Empty state обязателен для draft.

### 8.6 Combinations

- Три фиксированные категории определяются enum `DiscountClass`: Product, Order, Shipping.
- Active state — наличие класса в `combinations` либо соответствующем `combinesWith*` field.
- Не смешивать Channels и Combinations в одну Paper: в актуальном дизайне это самостоятельные
  секции.

### 8.7 Availability & limits

- Timeline: `startsAt`, `endsAt`, `effectiveStatus` и текущая дата.
- Purchase modes: one-time/subscription.
- Usage policy: aggregate limit, once per customer, per-order limit из Buy X Get Y rule.
- Automatic discounts явно показывают недоступность code-specific limits.
- Все даты форматировать единым `Intl.DateTimeFormat` с locale Admin и timezone браузера; ISO
  strings не преобразовывать в модели.

### 8.8 Tags

- Источник — `discount.tags: string[]`, а не product `ApiTag[]`.
- В первой поставке секция read-only, с empty state.
- Не переиспользовать напрямую product `TagsSection`: её mutation contract (`productId`, revision,
  `ProductTagOperationAction`) несовместим со скидками.
- Визуально повторить `Paper`/tag presentation; mutation-backed версия позже использует полную
  замену `discountUpdate.operations.tags`.

### 8.9 Discount codes

- Секция существует только для `discount.method === DiscountMethod.Code`.
- Для `CODE`: rows с code, status, usage/remaining и updated/disabled metadata.
- Если code discount пока не содержит кодов, внутри секции показывается empty state с действием
  добавления кода, когда передан callback.
- Для `AUTOMATIC` не рендерить ни `Paper`, ни заголовок, ни empty state, ни зарезервированный
  вертикальный gap.
- Учитывать `codes.totalCount`; первая карточка показывает максимум 20 записей и оставляет extension
  point для отдельного списка.

### 8.10 External references

- Показать system/type/id, direction, sync status, last synced/error и external link.
- Stale/error reference получает warning styling из Ant tokens.
- Empty state и total count обязательны.
- Add/open actions рендерятся только при наличии callback.

## 9. Форматирование и визуальные правила

- Ant Design `6.x`, React `19`, `antd-style`; не добавлять новую UI dependency.
- Базовая оболочка каждой секции — `Paper`; заголовки — `PaperHeader` либо локальное расширение,
  сохраняющее тот же spacing/border pattern.
- Использовать Ant tokens: `colorBgContainer`, `colorFillQuaternary`, `colorBorderSecondary`,
  `colorText`, `colorTextSecondary`, status colors, `borderRadiusLG`, spacing tokens.
- Иконки — существующий `react-icons/lu`, соответствующие Lucide names из Pencil.
- BigInt-like значения обрабатывать как string/BigInt. Не применять `Number()` к counters и minor
  amounts без проверки safe range.
- Money formatter принимает minor amount и `CurrencyCode`; логику держать в discount-local formatter
  до появления общего Admin money utility.
- Empty state должен сохранять высоту и структуру Paper, а не удалять секцию: draft-экран `yEt8h`
  показывает все секции.
- На узком viewport KPI и двухколоночные блоки переходят в одну колонку без горизонтального
  overflow.

## 10. Details modal и открытие из списка

1. Добавить modal type `discount` и payload с `entityId` в `modals.ts`.
2. Экспортировать `useDiscountModal = createModalStackHook("discount")`.
3. Зарегистрировать lazy `DiscountModal` в `admin/src/domains/modals.tsx`.
4. `DiscountModal` извлекает string ID, вызывает `useDiscount` и отображает: skeleton, error alert,
   not-found Empty либо `DiscountDetailsCard`.
5. Использовать `ModalLayout` с title `Discount details`, back/close поведением текущего ModalStack
   и без submit button.
6. В discounts page открыть modal через `onRowClicked`, передавая только ID. Не передавать list
   fragment как источник details, чтобы не показывать частично устаревший агрегат.
7. После будущих section mutations вызывать `refetch` внутри modal, а обновление list query оставить
   hook/cache слою.

## 11. API gaps для полной точности Pencil

Для pixel/behavior parity дизайна понадобятся отдельные backend изменения:

| Пробел                       | Что требуется                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Замена hardcoded KPI         | агрегаты orders, uses, discounted sales, average discount и previous-period deltas |
| Замена hardcoded usage chart | time-series buckets по discount ID и period                                        |
| Segment label                | resolved segment reference или federated display field                             |
| Полноценный activity action  | paginated redemption/activity query и отдельная modal/page                         |

Эти данные нельзя восстанавливать на клиенте загрузкой всей истории. До расширения API карточка
показывает явно изолированные статические значения из Pencil; они не считаются фактической
аналитикой.

## 12. Последовательность реализации

1. Извлечь presentational shell существующего product pricing widget в общий `DetailsMetricsWidget`
   и перевести `PricingBlock` на его использование без изменения product behavior.
2. Добавить details fragment/query/operation types и `useDiscount`.
3. Реализовать formatters, status/kind/method label helpers и изолированные KPI fixtures для пяти
   Pencil-сценариев.
4. Реализовать `DiscountSummarySection` и проверить все status/title fallbacks.
5. Реализовать discount adapter для общего `DetailsMetricsWidget` для каждого rule typename и draft.
6. Реализовать Applies to и Customer eligibility, включая stale references.
7. Реализовать Channels, Combinations и Availability & limits.
8. Реализовать Tags, условную Codes и External references с empty states.
9. Собрать `DiscountDetailsCard` в порядке Pencil-экрана.
10. Добавить `DiscountModal`, registry entry и открытие по клику строки.
11. Сверить пять Pencil-сценариев и responsive layout, включая regression сверку product
    `PricingBlock` после extraction.
12. Отдельным изменением расширить Pricing API для analytics/segment gaps.
13. После появления edit-модалок подключить callbacks секций без изменения их read contracts.

## 13. Проверка результата

Автоматическая проверка проекта:

- не запускать `test` и `tsc`;
- выполнить Admin build через `shopana-cli` MCP, как требует проект;
- GraphQL codegen запускать через `shopana-cli` только если операция участвует в настроенном
  operation codegen; иначе сохранить принятый проектом ручной `operation-types.ts` pattern.

Ручной smoke checklist:

- строка таблицы открывает правильный discount ID;
- refresh страницы внутри открытой модалки не ломает загрузку;
- корректно отображаются 4 kinds и code/automatic methods;
- draft с незаполненным rule показывает все empty sections;
- active/scheduled/paused/expired/archived имеют корректные status styles;
- stale target/customer/segment не приводит к crash;
- null `endsAt`, unlimited usage и very large BigInt отображаются корректно;
- automatic discount полностью исключает секцию Discount codes из DOM;
- code discount без кодов показывает empty state внутри секции;
- external URL безопасно открывается с `noopener,noreferrer`;
- keyboard close и focus behavior остаются ответственностью ModalStack;
- на узкой ширине нет horizontal overflow;
- в console нет React key, hydration и GraphQL warnings.

## 14. Критерии готовности первой поставки

- Нет импортов из общих runtime mocks и API-output mapper для Discount; hardcoded KPI находятся
  только в локальном `discount-kpi.fixtures.ts`.
- Детальная query не утяжеляет list query.
- Все применимые Pencil-секции присутствуют в одинаковом порядке и имеют empty state; Discount codes
  отсутствует у automatic discount.
- Rule-specific данные не смешиваются между discount kinds.
- `Value & usage` и product `PricingBlock` используют один общий presentational widget;
  дублированной pricing-widget разметки и styles нет.
- Extraction общего widget не меняет загрузку, редактирование и внешний вид product pricing.
- Stale references видимы и объяснимы пользователю.
- Hardcoded KPI визуально соответствуют Pencil и не участвуют в бизнес-логике.
- Компонент готов к подключению section edit modals через callbacks.
- Admin build завершается успешно.
