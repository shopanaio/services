# Discounts Admin: list page, details и editor modals

## Цель

Спроектировать полноценный Admin UI для скидок Pricing Service: страницу списка, создание четырёх native discount kinds, details modal и связанные модалки редактирования и управления. UI должен покрывать возможности текущей database model, но выглядеть как часть Shopana Admin: `DataLayout` и AG Grid на list page, `ModalLayout`/Modal Stack для details и editor flows, компактный info header, последовательные `Paper`-секции и переиспользуемые entity pickers.

Документ описывает presentation, interaction design и требования к будущему Admin GraphQL contract. Pricing Service пока содержит database model/read views, но не публикует готовый Admin GraphQL API; имена операций и inputs ниже являются design requirements, а не описанием уже существующей schema.

Источники функциональности:

- `services/pricing/README.md`;
- `services/pricing/docs/discounts-database-design.md`;
- reference screenshots в `services/pricing/docs/Screenshot 2026-07-17 at *.png`;
- `services/pricing/src/repositories/models/*`;
- `services/pricing/migrations/domains/9000_read_models/*`.

Референсы текущего Shopana Admin UI:

- `admin/src/domains/inventory/tags/page`;
- `admin/src/domains/inventory/bundles/page`;
- `admin/src/domains/inventory/products/components/product-details-card`;
- `admin/src/domains/inventory/categories/components/category-details-card`;
- `admin/src/domains/customer-content/reviews/components/review-details-card`;
- `admin/src/shared/components/entity-picker-modal`;
- `admin/src/layouts/data`;
- `admin/src/layouts/modals`;
- `admin/src/ui-kit/paper`;
- `admin/src/ui-kit/kpi-tile`;
- `admin/src/ui-kit/copyable-chip`;
- `admin/src/ui-kit/cursor-pagination`.

## Product scope

UI покрывает четыре native discount kinds:

| Kind | User-facing label | Class | Rule |
|---|---|---|---|
| `AMOUNT_OFF_PRODUCTS` | Amount off products | Product | percentage/fixed value + benefit targets |
| `BUY_X_GET_Y` | Buy X get Y | Product | qualifier + benefit + quantities/value |
| `AMOUNT_OFF_ORDER` | Amount off order | Order | percentage/fixed value |
| `FREE_SHIPPING` | Free shipping | Shipping | optional maximum shipping price |

Общие возможности:

- code или automatic activation;
- lifecycle `DRAFT / ACTIVE / PAUSED / ARCHIVED` и effective status `SCHEDULED / EXPIRED`;
- buyer eligibility: all, customers или customer segments;
- minimum subtotal/quantity для обычных скидок;
- общий usage limit и one use per customer для code discounts;
- one-time purchase/subscription applicability;
- sales channels и featured access;
- combinations с product/order/shipping discount classes;
- start/end schedule;
- tags;
- несколько redeem codes с отдельными limits/status;
- usage counters, reservations, redemptions и reversals;
- revisions/events;
- external references.

### Осознанно не входит

- Country targeting для free shipping отсутствует: database design прямо откладывает страны на отдельную модель. Reference control `All countries / Selected countries` не переносится в Shopana UI.
- Отдельный `Apply on POS Pro locations` не переносится. POS или app channel представлены обычными `discount_channel.channelCode`.
- Base product price editing не входит: это ответственность Catalog.
- Manual order-level application/reversal не проектируется без отдельного Pricing command contract. Usage activity на первом этапе read-only.
- Priority не становится заметным business field в обычной форме. Он доступен в `Advanced processing` только при наличии понятного backend policy.

## Что меняется относительно reference forms

Reference screens полезны как checklist полей, но их layout не переносится буквально:

1. Длинная create page с правой summary column заменяется standard Shopana modal шириной `800px`.
2. Создание начинается с компактной type selector modal.
3. Большая форма группируется в четыре `Paper`: Identity, Rule, Audience & access, Limits & schedule.
4. Existing discount открывается в read-first Details modal. Редактирование выполняется локальными section modals, а не одной бесконечной общей формой.
5. Codes, usage activity, revisions и integrations получают самостоятельные flows вместо технических JSON/IDs в основной форме.
6. Derived summary строится из сохранённой configuration view; create modal показывает компактный live summary в header alert, а не отдельную sticky sidebar.
7. Product/variant/customer selection использует существующий `EntityPickerContent`; collection/segment configs расширяют ту же infrastructure.
8. Денежные значения форматируются только default currency проекта согласно `knowledge/vault/patterns/currency-handling.md`.

## Визуальные правила

- List использует `DataLayout fullWidth`, `FilterWidget`, AG Grid и `CursorPagination`.
- Details/edit/create используют `ModalLayout`, стандартный sticky `ModalHeader`, `max-width: 800px`.
- Между `Paper` — `12px` в details и `16px` в forms согласно существующим modal patterns.
- `PaperHeader` используется для всех sections; локальные edit actions находятся справа.
- `Typography.Title level={3}` используется один раз — в `DiscountInfoHeader`.
- Синий — interactive accent; green/gold/red/default — только semantic status.
- Lifecycle status всегда имеет icon и text label.
- Money inputs показывают project default currency через shared formatter/context, не через `discount.currency`.
- IDs выводятся через `CopyableChip` или copyable text.
- Raw metadata/snapshots не участвуют в основном reading flow.
- Controls и copy остаются на английском, как в текущем Admin UI.

## Information architecture

```text
Discounts page
├── Search / filters
├── Discounts AG Grid
├── Cursor pagination
└── Create
    └── Select discount type
        └── Create discount

Discount details modal
├── DiscountInfoHeader
│   ├── effective status + schedule/audit
│   ├── title or primary code
│   ├── method / kind / class / ID
│   └── reserved / used / reversed / remaining KPI
├── DiscountRuleSection
├── EligibilitySection
├── AvailabilitySection
├── CodesSection (CODE only)
├── LimitsAndScheduleSection
├── UsageActivitySection
├── ExternalReferencesSection
└── HistorySection
```

Порядок намеренный: merchant сначала видит, что даёт скидка и кому она доступна; operational accounting, integrations и audit находятся ниже.

## Modal Stack

```text
Discounts page
├── Select discount type                         level 0
│   └── Create discount                          level 1
│       ├── Product / variant / collection picker level 2
│       ├── Customer / segment picker             level 2
│       └── Sales channel picker                  level 2
└── Discount details                             level 0
    ├── Edit identity                            level 1
    ├── Edit amount-off rule                     level 1
    │   └── Product / variant / collection picker level 2
    ├── Edit Buy X get Y rule                    level 1
    │   ├── Qualifier target picker               level 2
    │   └── Benefit target picker                 level 2
    ├── Edit free shipping rule                  level 1
    ├── Edit eligibility                         level 1
    │   └── Customer / segment picker             level 2
    ├── Edit availability & combinations         level 1
    │   └── Sales channel picker                  level 2
    ├── Edit limits & schedule                   level 1
    ├── Manage discount codes                    level 1
    │   └── Add / edit code                       level 2
    ├── Usage activity                           level 1
    │   └── Order details                         level 2
    ├── Revision history                         level 1
    │   └── Revision snapshot                     level 2
    ├── External reference create/edit           level 1
    └── View technical metadata                  level 1
```

Type selector остаётся под create form. После успешного create весь create stack закрывается, discounts list refetch выполняется, затем открывается созданный Discount Details. Отмена вложенного picker не меняет draft родительской формы.

После section save details query refetch выполняется до закрытия child modal. Все update flows передают текущий `expectedRevision`; conflict не перезаписывается автоматически.

## Discounts List Page

![Discounts list page](assets/discounts-admin-design/01-discounts-list-page.png)

### Полный wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Discounts  48                                                [+ Create]     │
│                                                                              │
│ [Search discounts…] [Status] [Type] [Method] [Channel] [More filters]       │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Discount          Status    Type           Value      Used    Schedule   │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │ SUMMER20          ACTIVE    Products       20%        248     Jul 1–31   │ │
│ │ Automatic         SCHEDULED Order           €10       0       Aug 1–15   │ │
│ │ Buy 2 get 1 free  PAUSED    Buy X get Y    Free      103     No end     │ │
│ │ FREESHIP          EXPIRED   Free shipping  ≤ €15      879     Ended      │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ Showing 1–20 of 48                                [‹ Previous] [Next ›]     │
└──────────────────────────────────────────────────────────────────────────────┘
```

`DataLayout`:

- `name="discounts"`, `title="Discounts"`, count из connection `totalCount`;
- header action `Button icon={<PlusOutlined />}>Create</Button>`;
- toolbar left — `FilterWidget`, placeholder `Search discounts...`;
- table занимает оставшуюся высоту; footer — `CursorPagination`.

### Grid columns

| Column | Presentation | Sort/filter |
|---|---|---|
| Discount | strong title или primary code; secondary `Automatic`/`Code · N codes`; tag icon by class | title/code search |
| Status | effective status `Tag` | effective status |
| Type | human-readable kind | kind/class |
| Value | `20%`, `€10 off`, `Buy 2, get 1 free`, `Free shipping ≤ €15` | optional server sort |
| Usage | `248 / 500`, `103`, or `Unlimited`; reserved secondary only when >0 | usage count / limit |
| Channels | first two labels + `+N` | channel relation |
| Schedule | start/end compact date; `No end date` | startsAt / endsAt |
| Updated | `formatDetailDate(updatedAt)` | updatedAt |

Rows имеют `52px` height. Click открывает details modal; row action menu не дублируется — lifecycle and destructive commands находятся в details header.

### Search

Search condition:

```text
title containsi query
OR primaryCode containsi query
OR tags containsi query
```

### Filters

- Effective status: Draft, Scheduled, Active, Paused, Expired, Archived.
- Discount type: Amount off products, Buy X get Y, Amount off order, Free shipping.
- Method: Discount code, Automatic.
- Class: Product, Order, Shipping.
- Channel.
- Tag.
- Starts date range.
- Ends date range.
- Usage count/remaining range.
- Created/updated date range.

Default list excludes `ARCHIVED`; filter chip `Status is not Archived` remains removable. Empty filtered state предлагает `Clear filters`; empty store state предлагает `Create discount`.

## Select Discount Type Modal

![Select discount type](assets/discounts-admin-design/02-select-discount-type-modal.png)

```text
┌────────────────────────────────────────────────────────────────────┐
│ ×  Select discount type                                            │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ [tag] Amount off products                                  [›] │ │
│ │       Discount selected products, variants or collections       │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ [gift] Buy X get Y                                         [›] │ │
│ │        Reward a qualifying product purchase                     │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ [receipt] Amount off order                                 [›] │ │
│ │           Discount the eligible order subtotal                  │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ [truck] Free shipping                                      [›] │ │
│ │         Remove eligible shipping cost                           │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

- Stable title `Select discount type`; no submit button.
- Each row is a real button with icon, title, description and chevron.
- Keyboard arrows are not required; standard tab/enter/space behavior is sufficient.
- Selecting a kind pushes `Create discount` at the next Modal Stack level with immutable `kind` and derived `discountClass`.
- Kind/class cannot be changed inside create form. User returns to chooser to select another kind.

## Discount Details Modal

Modal header has stable title `Discount details`; discount title/code lives only in `DiscountInfoHeader`.

### Overview wireframe

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Discount details                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ [API error alert — only when present]                                    │
│                                                                          │
│ ┌─ DiscountInfoHeader ─────────────────────────────────────────────────┐ │
│ │ [ACTIVE ✓] Updated Jul 17 by Admin · Active until Jul 31      [⋯]   │ │
│ │ SUMMER20                                                               │ │
│ │ [Discount code] [Amount off products] [Product] [ID 01J…]             │ │
│ │ ───────────────────────────────────────────────────────────────────── │ │
│ │ [Reserved 3] [Used 248] [Reversed 4] [Remaining 252]                  │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Discount rule ─────────────────────────────────────────────── [Edit] ┐ │
│ │ 20% off selected collections · Maximum €100 per order                 │ │
│ │ Applies across eligible items                                         │ │
│ │ Collections (3): Summer, Accessories, Travel                          │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Eligibility & requirements ─────────────────────────────────── [⋯]  ┐ │
│ │ All customers · Minimum subtotal €50                                  │ │
│ │ One-time purchases                                                     │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Availability & combinations ────────────────────────────────── [⋯]  ┐ │
│ │ Channels: Online Store [Featured], Mobile app                          │ │
│ │ Combines with: Shipping discounts                                     │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Discount codes (12) ─────────────────────────────────────── [Manage] ┐ │
│ │ SUMMER20 [ACTIVE] 198 / 300 · VIP20 [ACTIVE] 50 / unlimited            │ │
│ │ [Show all codes]                                                        │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Limits & schedule ──────────────────────────────────────────── [⋯]  ┐ │
│ │ Total usage 248 / 500 · One use per customer                           │ │
│ │ Jul 1, 00:00 — Jul 31, 23:59 · Europe/Kyiv                             │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ Usage activity ───────────────────────────────────────── [View all]  ┐ │
│ │ #10482 · SUMMER20 · €18.40 · Committed · Jul 17, 14:20                 │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ External references (1) ─────────────────────────────────── [+ Add]  ┐ │
│ │ [SYNCED] Klaviyo · PROMOTION · summer-2026                   [⋯]       │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─ History ───────────────────────────────────────────────── [View all] ┐ │
│ │ Activated · revision 7 · Admin · Jul 17, 09:00                         │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### DiscountInfoHeader

![Discount info header](assets/discounts-admin-design/03-discount-details-header.png)

`PaperHeader title`:

- effective status tag:
  - `DRAFT` — default + edit icon, `Configuration is not active`;
  - `SCHEDULED` — blue + calendar, `Starts {startsAt}`;
  - `ACTIVE` — green + check, `Available to eligible checkouts`;
  - `PAUSED` — gold + pause, `Temporarily unavailable`;
  - `EXPIRED` — default + clock, `Ended {endsAt}`;
  - `ARCHIVED` — default + archive, `Removed from active management`;
- audit/schedule line: `Updated {updatedAt} by {actor} · {schedule summary}`;
- derived `effectiveStatus` is displayed, while explicit `state` remains available in tooltip/technical metadata.

`PaperHeader actions`:

- copy Admin URL icon button;
- overflow menu, conditional by state:

```text
Edit identity
Manage codes                  CODE only
────────────────────────
Activate                      DRAFT / PAUSED
Pause                         ACTIVE / SCHEDULED
Duplicate
────────────────────────
View usage activity
View revision history
View technical metadata
────────────────────────
Archive discount              danger
```

Title area:

- code-based: primary active code; fallback title; fallback `Untitled discount`;
- automatic: title; fallback `Untitled automatic discount` only for invalid draft;
- tags for method, kind and class;
- `CopyableChip label="ID"` with short display value;
- merchant tags are shown as neutral chips below identity only when non-empty.

KPI panel uses real `discount_usage_summary_view` values:

- Reserved — `reservedCount`;
- Used — `netCommittedCount`;
- Reversed — `reversedCount`;
- Remaining — `remainingCount`, or `Unlimited` when usage limit is null.

No period switch or fake trends are shown.

## Details Sections

### DiscountRuleSection

![Discount rule section](assets/discounts-admin-design/04-discount-rule-section.png)

The section changes presentation by kind.

Amount off products:

```text
20% off selected collections
Maximum discount: €100 per order
Allocation: Across eligible items

Applies to · Collections (3)
[Summer] [Accessories] [Travel]
```

Amount off order:

```text
€10 off eligible order subtotal
Allocation: Across the order
```

Buy X get Y:

```text
Customer buys 2 items from Products (4)
Customer gets 1 item from Collections (1)
Benefit: Free · Maximum 2 uses per order
```

Free shipping:

```text
Free shipping
Only for shipping rates up to €15
Country restrictions are not configured in the current Pricing model.
```

Rules:

- percentage UI converts basis points at the input/display boundary;
- money uses default project currency;
- `STALE` targets remain visible with warning icon and `Unavailable reference` copy;
- large target selections show first five items then `+N more`;
- Product/Variant link opens existing details modal when entity can be resolved;
- collection target uses a new collection picker config on shared `EntityPickerContent`;
- only one section action: explicit `Edit`.

### EligibilitySection

```text
┌─ Eligibility & requirements ───────────────────────────────────── [⋯] ┐
│ Eligible customers                                                     │
│ All customers                                                          │
│                                                                        │
│ Minimum purchase                                                       │
│ €50 eligible subtotal                                                  │
│                                                                        │
│ Purchase modes                                                         │
│ [One-time purchase] [Subscription]                                     │
└────────────────────────────────────────────────────────────────────────┘
```

- `ALL`: `All customers`.
- `CUSTOMERS`: count + first names/chips; stale references carry warning state.
- `SEGMENTS`: count + segment labels; uses new segment picker config.
- Buy X get Y does not render ordinary minimum requirement because its own qualifier defines the requirement.
- At least one purchase mode is always displayed.
- Action: `Edit eligibility`.

### AvailabilitySection

```text
┌─ Availability & combinations ─────────────────────────────────── [⋯] ┐
│ Sales channels                                                          │
│ [Online Store · Featured] [Mobile app]                                  │
│                                                                          │
│ Combines with                                                            │
│ [Shipping discounts]                                                     │
│ Both discounts must allow the combination.                              │
└──────────────────────────────────────────────────────────────────────────┘
```

- Channel row uses human-readable registry label with raw `channelCode` in tooltip.
- `isFeatured` is presentation metadata on a selected channel, not a separate channel.
- No selected combination classes: `Does not combine with other discounts`.
- Helper text explains bilateral compatibility.
- Action: `Edit availability & combinations`.

### CodesSection

Rendered only when `method=CODE`.

- Header count equals all non-deleted codes.
- Overview shows up to five codes, active first, then disabled; within group newest first.
- Each row shows code, status, used/limit and remaining.
- `Copy` is icon-only with tooltip.
- Header action `Manage` opens the codes manager.
- There is no empty state on an active code discount: API validation requires at least one active code. Draft can show `No discount codes yet` + `Add code`.

### LimitsAndScheduleSection

- Total usage limit, one use per customer, purchase modes and schedule.
- Automatic discounts always show `Unlimited uses` and never show per-customer limit because database constraints prohibit these values.
- Dates use project/store timezone; timezone label is shown once.
- `No end date` is explicit.
- Priority is hidden under `Advanced processing` in edit modal; details shows it only when non-zero.

### UsageActivitySection

- Compact five-row preview of redemptions.
- Row: Order, code/title snapshot, customer if available, discounted amount, status, committed/reversed timestamp.
- Reversed row shows reversal reason in secondary text.
- Amounts are formatted with project default currency; stored redemption currency is technical audit data only.
- `View all` opens Usage Activity modal.

### ExternalReferencesSection

Uses the same presentation principles as Review External References:

- status tag, system/type/id, sync timestamp or error, optional external link;
- `+ Add` collection action;
- row overflow opens create/edit modal;
- metadata/etag/checksum live under `Advanced` in editor;
- failed sync accents only the row error, not the whole Paper.

### HistorySection

- Shows five newest `discount_event` rows.
- Each row: human event label, revision, actor, occurred time.
- `View all` opens Revision History modal combining events and revision snapshots.
- Raw event payload is hidden until a row is expanded.

## Create Discount Modal

### Common pattern

```text
ModalLayout
├── ModalHeader: close / Create discount / Save draft
└── scrollable body, max-width 800
    ├── API Alert, only when present
    ├── live configuration summary
    ├── Identity Paper
    ├── Rule Paper
    ├── Audience & access Paper
    └── Limits & schedule Paper
```

Primary action is `Save draft`. Drafts may be incomplete by database design. Activation is a separate validated command from Discount Details; this prevents a partially completed configuration from becoming checkout-active accidentally.

Shared form behavior:

1. `kind` and `discountClass` come from the type selector and are read-only.
2. `method` uses `Segmented block`: `Discount code` / `Automatic`.
3. `CODE` shows initial code; `AUTOMATIC` shows required title.
4. Switching method after entering incompatible fields prompts before clearing code-only values.
5. Save is disabled while loading, invalid at the draft-safe field level, unchanged after the first successful save, or submitting.
6. All server `userErrors` map to concrete fields/sections; unexpected errors use `Alert` above first Paper.
7. Form sets Modal Stack dirty state on any user change.
8. Picker confirmation updates draft and marks form dirty; picker cancellation changes nothing.
9. After create: refetch list, close the whole create stack, open details for new entity.

Live summary:

```text
[DRAFT] Automatic · Amount off products
20% off 3 collections · All customers · Starts Jul 20
```

It is a compact neutral context panel, not a second full summary card.

### Identity Paper

```text
┌─ Identity ────────────────────────────────────────────────────────────┐
│ Type        Amount off products [Product discount] (read-only)       │
│ Method      [Discount code] [Automatic]                              │
│                                                                        │
│ Discount code *                         [Generate random code]        │
│ [SUMMER20_________________________________________________________]   │
│ Customers enter this code at checkout.                               │
│                                                                        │
│ Internal title                                                        │
│ [Summer campaign__________________________________________________]   │
│ Used in Admin when several codes belong to this discount.             │
│                                                                        │
│ Tags                                                                   │
│ [summer] [vip] [+ Add tags]                                           │
└────────────────────────────────────────────────────────────────────────┘
```

- Code is normalized by API but shown as entered until save.
- Automatic title is required and described as customer-visible in cart/checkout.
- Code discount title is optional internal identity.
- Initial code is required only when attempting activation; an incomplete draft may save without one.

### Amount Off Products Editor

![Amount off products editor](assets/discounts-admin-design/05-amount-off-products-editor.png)

```text
┌─ Discount value ──────────────────────────────────────────────────────┐
│ Value type *   [Percentage] [Fixed amount]                            │
│ Value *        [20____________] %                                    │
│ Maximum discount [100_________] €   optional for percentage           │
│ Allocation *   ( ) Each eligible target  (●) Across eligible items   │
│                                                                        │
│ Applies to *   [All products / Products / Variants / Collections]    │
│ [Summer collection] [Accessories]                       [Browse]      │
└────────────────────────────────────────────────────────────────────────┘
```

- Percentage UI range `0.01–100`, mapped to `1..10000` basis points.
- Fixed amount >0 in project default currency.
- Maximum discount is optional and only visible for percentage.
- Target type is one of the four database enum values.
- Specific target type requires at least one selected target before activation.
- Changing target type confirms removal of the previous selection.

### Buy X Get Y Editor

![Buy X get Y editor](assets/discounts-admin-design/06-buy-x-get-y-editor.png)

```text
┌─ Customer buys ───────────────────────────────────────────────────────┐
│ Requirement *  [Minimum quantity] [Minimum subtotal]                 │
│ Quantity *     [2____]                                                │
│ From *         [All products / Products / Variants / Collections]    │
│ [Trail shoes] [Running socks]                           [Browse]      │
├────────────────────────────────────────────────────────────────────────┤
│ Customer gets                                                          │
│ Quantity *     [1____]                                                │
│ From *         [Products / Variants / Collections]                    │
│ [Running socks]                                           [Browse]    │
│ Benefit *      [Percentage] [Fixed amount] [Free]                     │
│ Value          [100___] %                                             │
│ [ ] Limit uses per order     [2____]                                  │
└────────────────────────────────────────────────────────────────────────┘
```

- Qualifier role maps to `QUALIFIER`; benefit role maps to `BENEFIT`.
- Benefit cannot use a vague `same as qualifier` shortcut unless API expands it into explicit selection.
- `FREE` sends no percentage/amount.
- Uses per order appears only when enabled.
- Ordinary minimum requirement section is absent.

### Amount Off Order Editor

```text
┌─ Discount value ──────────────────────────────────────────────────────┐
│ Value type *   [Percentage] [Fixed amount]                            │
│ Value *        [10____________] €                                    │
│ Maximum discount [____________] €   percentage only                   │
│ Allocation     Across the eligible order (read-only)                 │
└────────────────────────────────────────────────────────────────────────┘
```

No catalog target picker is rendered. Minimum purchase requirement remains available in common Audience & access Paper.

### Free Shipping Editor

![Free shipping editor](assets/discounts-admin-design/07-free-shipping-editor.png)

```text
┌─ Shipping benefit ────────────────────────────────────────────────────┐
│ Free shipping applies to eligible shipping lines.                    │
│                                                                        │
│ [ ] Exclude shipping rates over a maximum amount                     │
│     Maximum shipping price *  [15____________] €                     │
│                                                                        │
│ Country restrictions are not supported by the current Pricing model. │
└────────────────────────────────────────────────────────────────────────┘
```

- Disabled checkbox maps `maximumShippingPriceMinor=null`.
- Zero is permitted by database constraint and means only zero-priced shipping lines qualify; helper copy must make this consequence clear.
- No fake countries control is shown.

### Audience & Access Paper

![Audience and schedule editor](assets/discounts-admin-design/10-audience-schedule-editor.png)

```text
┌─ Audience & access ───────────────────────────────────────────────────┐
│ Customer eligibility *                                                │
│ (●) All customers  ( ) Specific customers  ( ) Customer segments     │
│ [Selected customers / segments]                         [Browse]      │
│                                                                        │
│ Minimum purchase requirement                                          │
│ (●) None  ( ) Minimum subtotal  ( ) Minimum quantity                  │
│ [50____________] €                                                    │
│                                                                        │
│ Purchase modes *                                                       │
│ [✓] One-time purchase   [ ] Subscription                             │
│                                                                        │
│ Sales channels *                                                       │
│ [Online Store · Featured] [Mobile app]                   [Select]      │
│                                                                        │
│ Combines with                                                          │
│ [ ] Product discounts [ ] Order discounts [✓] Shipping discounts     │
└────────────────────────────────────────────────────────────────────────┘
```

- Minimum requirement is absent for Buy X get Y.
- Customers/segments are mutually exclusive.
- At least one sales channel is required for activation.
- Each selected channel can toggle `Featured` independently.
- Combination checkbox semantics are bilateral and explained below group.

### Limits & Schedule Paper

```text
┌─ Limits & schedule ───────────────────────────────────────────────────┐
│ Maximum discount uses                                                 │
│ [ ] Limit total uses       [500________]                              │
│ [ ] One use per customer                                             │
│ Automatic discounts are always unlimited.                             │
│                                                                        │
│ Active dates *                                                        │
│ Starts [Jul 20, 2026] [00:00]                                        │
│ [ ] Set end date  Ends [Jul 31, 2026] [23:59]                        │
│ Timezone: Europe/Kyiv                                                 │
│                                                                        │
│ > Advanced processing                                                 │
│   Priority [0____]                                                     │
└────────────────────────────────────────────────────────────────────────┘
```

- Usage limit and per-customer controls are hidden/cleared for automatic discounts.
- End must be after start.
- Schedule inputs use project/store timezone but send timezone-aware timestamps.
- Priority is non-negative; default 0.

## Section Edit Modals

Existing discounts use independent modals instead of reopening the create form.

### Common rules

1. Every modal reloads current details by `entityId` before initializing draft.
2. Every update includes `expectedRevision`.
3. Only owned configuration fields are submitted; no stale full-form snapshot.
4. Success: refetch details/list, toast, clear dirty, close child.
5. Conflict:

```text
This discount changed after the editor was opened.
[Reload latest data]
```

6. Update is never retried automatically with a new revision.
7. Lifecycle actions use dedicated commands, not generic update state fields.

Recommended ownership:

| Modal | Owned fields |
|---|---|
| Edit identity | title, tags; method only for safe DRAFT transition |
| Edit amount-off rule | amount-off subtype + BENEFIT target selection |
| Edit Buy X get Y rule | buy-x-get-y subtype + QUALIFIER/BENEFIT selections |
| Edit free shipping rule | maximumShippingPriceMinor |
| Edit eligibility | buyer context, eligible IDs, minimum requirement, purchase modes |
| Edit availability & combinations | channels/featured flags, combination classes |
| Edit limits & schedule | usage limit, once-per-customer, startsAt/endsAt, priority |
| Manage codes | independent code create/update/disable commands |
| External reference | independent create/update/delete commands |

Kind/class are immutable after create. Method transition is allowed only while `DRAFT`, before any redemption/reservation and after an explicit consequence confirmation; otherwise it is read-only.

## Manage Discount Codes Modal

![Manage discount codes](assets/discounts-admin-design/08-manage-codes-modal.png)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ×  Manage discount codes                                   [+ Add code]│
├────────────────────────────────────────────────────────────────────────┤
│ [Search codes…] [Status: All]                                          │
│                                                                        │
│ Code          Status     Used       Remaining      Updated       [⋯]   │
│ SUMMER20      ACTIVE     198 / 300  102            Jul 17              │
│ VIP20         ACTIVE      50 / ∞    Unlimited      Jul 16              │
│ EARLY20       DISABLED    12 / 100   88            Jul 10              │
│                                                                        │
│ Showing 1–20 of 12                              [‹ Previous] [Next ›]  │
└────────────────────────────────────────────────────────────────────────┘
```

- Full-width nested modal may use `EntityPickerContent`-like AG Grid composition or standard compact table.
- Columns: Code, Status, Used, Limit, Remaining, Updated.
- Row actions: Copy, Edit limit, Disable/Enable.
- Disable confirmation says existing committed usage is retained and code becomes unavailable to new checkouts.
- Code deletion is not offered because model supports disable, not delete.
- Existing code value is immutable after create to preserve redemption identity. Correct workflow: disable old, add new.

Add code modal:

```text
┌─ Discount code ───────────────────────────────────────────────────────┐
│ Code *                                         [Generate random code] │
│ [VIP20____________________________________________________________]   │
│ Must be unique in this Store after trim + uppercase normalization.   │
│                                                                        │
│ [ ] Limit uses for this code   [100________]                          │
└────────────────────────────────────────────────────────────────────────┘
```

Code-level limit does not replace aggregate limit; both are shown in helper copy.

## Usage Activity Modal

![Discount usage activity](assets/discounts-admin-design/09-usage-activity-modal.png)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Usage activity                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│ [Redemptions] [Active reservations]                                      │
│                                                                          │
│ Redemptions                                                              │
│ [Search order/code…] [Status] [Date]                                     │
│ Order   Code      Customer       Amount    Status      Committed          │
│ #10482  SUMMER20  Maria Johnson  €18.40    COMMITTED   Jul 17, 14:20      │
│ #10471  VIP20     Alex Brown     €12.00    REVERSED    Jul 17, 11:08      │
│                                      Reason: Order cancelled             │
│                                                                          │
│ Active reservations                                                      │
│ Checkout ID       Customer       Code      Expires       Created          │
│ [ID copy]         Maria Johnson  SUMMER20  in 8 minutes  Jul 17, 14:31    │
└──────────────────────────────────────────────────────────────────────────┘
```

- Tabs are read-only operational projections.
- Redemptions include committed and reversed accounting records.
- Order click opens Order Details modal; customer click opens Customer Details when entity is available.
- Reservation countdown has absolute timestamp in tooltip; it does not imply a client-side mutation at zero.
- Released/expired reservations are excluded from `Active reservations`; historical reservation audit remains in event data.
- No `Reverse` action until Pricing exposes a dedicated authorized command and consequence policy.

## Revision History Modal

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Revision history                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│ Revision 7  Activated            Admin             Jul 17, 09:00 [View] │
│ Revision 6  Schedule updated     Admin             Jul 16, 18:20 [View] │
│ Revision 5  Code added           Campaign app      Jul 16, 10:10 [View] │
└──────────────────────────────────────────────────────────────────────────┘
```

- Events define timeline order; revisions provide deterministic snapshots.
- `View` opens read-only snapshot modal with change reason and formatted JSON in token-based code container.
- Snapshot has horizontal scroll and copy action; no Save.
- Actor ID is resolved when possible; raw ID is fallback copyable text.

## Technical Metadata

Read-only utility modal from header overflow:

```text
Discount ID        [01J… copy]
Explicit state     ACTIVE
Effective status  ACTIVE
Revision           7
Priority           0
Created by         [principal… copy]
Stored currency    EUR
Metadata           { ... }
```

Stored `currency` is labeled as audit/configuration data. Standard displayed money still uses project default currency.

## Lifecycle and Destructive Confirmations

### Activate

Activation first validates complete aggregate. If fields are missing, modal remains open and shows section-linked errors:

```text
This discount cannot be activated yet.
• Add at least one active discount code.
• Select at least one sales channel.
[Review configuration]
```

Successful activation refetches details/list and retains details modal.

### Pause

```text
Pause discount?
New checkouts will not apply this discount until it is activated again.
Existing committed redemptions are not changed.
[Cancel] [Pause]
```

### Archive

```text
Archive discount?
The discount will be removed from active management and cannot be applied to
new checkouts. Usage history, revisions and external references are retained.
[Cancel] [Archive]
```

No hard delete is presented because the aggregate has accounting/audit relationships and database model defines `ARCHIVED`.

### Duplicate

Creates a new `DRAFT` with copied rule, targeting, eligibility, channels, combinations and tags. It does not copy codes, counters, redemptions, events, external references or historical revisions. User is taken to the new details modal and prompted to configure identity/codes.

## Loading, Empty and Error States

### List

- Loading uses AG Grid loading overlay; header/count remain stable.
- Query failure uses `Alert` above grid without replacing toolbar.
- Empty store: `No discounts yet` + `Create discount`.
- Empty filtered: `No discounts match these filters` + `Clear filters`.

### Details

- Skeleton mirrors info header and first three sections.
- Not found:

```text
Discount not found
It may have been archived, deleted externally or is no longer available.
[Close]
```

- Details query failure uses global `Alert`; it does not render misleading empty sections.
- A section with stale external references renders warning rows without failing the entire details card.

### Forms

- Network/operation error: `Alert` above first Paper.
- Validation error: inline + focus first invalid control.
- Picker entity becomes stale: keep selected ID, show warning, require removal/replacement before activation.
- Submit failure never clears draft or closes modal.
- Conflict offers `Reload latest data`; reload asks confirmation when local draft is dirty.

### Empty section copy

| Section | Copy |
|---|---|
| Codes | `No discount codes yet` / `Add a code before activation.` |
| Usage | `No discount usage yet` / `Redemptions will appear after eligible checkout activity.` |
| Active reservations | `No active reservations` |
| External references | `No external references` / `Connect this discount to an external promotion system.` |
| History | `No configuration history yet` |
| Specific targets | `No targets selected` / `Select at least one target before activation.` |

## Responsive Behavior

At details/form content below `640px`:

- KPI panel becomes `2 × 2`, then one column on very narrow content;
- grid list remains desktop-oriented at page level, using horizontal table viewport rather than compressing unreadably;
- form two-column field rows stack vertically;
- qualifier and benefit target summaries stack;
- date/time pairs stack but remain in one logical field group;
- code table hides Updated first, then Remaining; essential Code/Status/Used remain;
- title/status/header actions wrap without pushing primary action offscreen;
- main modal body never gets horizontal scroll except raw JSON/code containers and full-width operational tables.

## Accessibility and Keyboard Behavior

- Status has icon + text and never relies only on color.
- Type selector rows are semantic buttons.
- Icon-only actions have tooltip and `aria-label`.
- All fields have visible labels; placeholder is never the only label.
- Percentage and money inputs announce suffix/currency.
- Selected target/customer/channel chips have accessible remove names.
- Picker selection works with keyboard and exposes selected count.
- `Show all`, `View all`, `Generate random code` and external links are real buttons/links.
- First editable field receives focus when an editor opens.
- First invalid control receives focus after validation.
- `Esc` closes only the top Modal Stack level; dirty forms use standard confirmation.
- External links communicate that they open in a new tab.
- Tables retain visible focus for keyboard navigation; details row click has an equivalent keyboard action.

## Component Reuse Matrix

| Responsibility | Reuse | Decision |
|---|---|---|
| Page shell | `DataLayout` | `fullWidth`, count and create action |
| Search/filter | `FilterWidget` | GraphQL-backed filter schema |
| List grid | AG Grid + `useAgGridTheme` | Same row/cell conventions as Tags/Bundles |
| Pagination | `CursorPagination` | Relay connection |
| Modal shell | `ModalLayout`, `ModalHeader` | No custom shell/footer |
| Section surface | `Paper`, `PaperHeader` | One pattern for all sections |
| Local section action | `EditAction` / small explicit button | Named actions, no ambiguous duplicates |
| Header | Product/Category/Review info-header composition | New `DiscountInfoHeader` |
| Metrics | `KPITile` | Real usage summary only |
| IDs | `CopyableChip` | Discount/code/external IDs |
| Dates | `formatDetailDate` + shared timezone formatter | No local `toLocaleString()` duplication |
| Empty state | compact domain empty component | Avoid large illustrations inside sections |
| Products/variants | existing Entity Picker configs | Multi-select |
| Customers | existing customer picker config | Multi-select |
| Collections | `EntityPickerContent` + new config | Reuse shared picker infrastructure |
| Segments | `EntityPickerContent` + new config | Reuse shared picker infrastructure |
| Channels | `EntityPickerContent` or compact registry picker | Open channel codes + featured metadata |
| Money | default currency context + shared formatter | Ignore record currency for standard display |
| Forms | `react-hook-form` + Zod section schemas | Shared errors/dirty behavior |
| Unsaved close | Modal Stack confirmation | No local confirm implementation |
| External refs | Review external reference presentation pattern | Pricing-specific operations/types |

## Proposed Admin Module Structure

The current placeholder lives at `admin/src/domains/inventory/discounts`. To minimize routing churn, the first implementation can keep this module path while Pricing Service remains the API owner.

```text
admin/src/domains/inventory/discounts/
├── graphql/
│   ├── fragments.ts
│   ├── queries.ts
│   ├── mutations.ts
│   ├── operation-types.ts
│   └── index.ts
├── hooks/
├── mappers/
├── page/
│   ├── page.tsx
│   ├── page-config.ts
│   └── filter-schema.ts
├── components/
│   ├── discount-details-card/
│   │   ├── discount-details-card.tsx
│   │   ├── discount-info-header.tsx
│   │   └── sections/
│   ├── discount-status-tag.tsx
│   ├── discount-value-summary.tsx
│   └── discount-target-summary.tsx
├── modals/
│   ├── select-discount-type-modal/
│   ├── create-discount-modal/
│   ├── discount-details-modal/
│   ├── edit-discount-identity-modal/
│   ├── edit-amount-off-rule-modal/
│   ├── edit-buy-x-get-y-rule-modal/
│   ├── edit-free-shipping-rule-modal/
│   ├── edit-discount-eligibility-modal/
│   ├── edit-discount-availability-modal/
│   ├── edit-discount-limits-schedule-modal/
│   ├── manage-discount-codes-modal/
│   ├── edit-discount-code-modal/
│   ├── discount-usage-modal/
│   ├── discount-history-modal/
│   ├── discount-revision-snapshot-modal/
│   ├── discount-external-reference-modal/
│   └── discount-technical-metadata-modal/
└── pickers/
    ├── collection-picker-config.tsx
    ├── customer-segment-picker-config.tsx
    └── sales-channel-picker-config.tsx
```

API-backed components receive generated API types directly from `@/graphql/types`; form/draft types remain local. No output view-model mapper is introduced.

## Required Admin GraphQL Surface

Exact schema naming can follow Pricing conventions, but UI requires these capabilities.

Queries:

```text
discounts(first, after, last, before, where, orderBy)
discount(id)
discountCodes(discountId, pagination, where, orderBy)
discountRedemptions(discountId, pagination, where, orderBy)
discountActiveReservations(discountId, pagination)
discountEvents(discountId, pagination)
discountRevisions(discountId, pagination)
discountExternalReferences(discountId, pagination)
```

Commands/mutations:

```text
discountCreate(input)
discountUpdateIdentity(input, expectedRevision)
discountUpdateAmountOffRule(input, expectedRevision)
discountUpdateBuyXGetYRule(input, expectedRevision)
discountUpdateFreeShippingRule(input, expectedRevision)
discountUpdateEligibility(input, expectedRevision)
discountUpdateAvailability(input, expectedRevision)
discountUpdateLimitsAndSchedule(input, expectedRevision)
discountActivate(id, expectedRevision)
discountPause(id, expectedRevision)
discountArchive(id, expectedRevision)
discountDuplicate(id, expectedRevision)
discountCodeCreate(input, expectedRevision)
discountCodeUpdateLimit(input, expectedRevision)
discountCodeEnable/Disable(input, expectedRevision)
discountExternalReferenceCreate/Update/Delete(...)
```

All mutations return `userErrors` and the new aggregate revision. Details fragment should expose configuration view, resolved entity labels where federation supports them, usage summary, recent activity counts and audit timestamps.

### Read model requirements

- List uses `discount_list_view` semantics and does not issue per-row queries.
- Details uses `discount_configuration_view` plus usage summary.
- Code manager uses `discount_code_list_view`.
- Resolved product/variant/collection/customer/segment labels should use federation/batched loaders; raw IDs remain fallback.
- Effective status remains server-derived from lifecycle and current time.
- `remainingCount=null` means Unlimited, not unknown/error.
- Large JSON snapshots/payloads are fetched only when a history row is opened.

## Acceptance Criteria

- `/discounts` is a real `DataLayout` list page with search, filters, sorting and cursor pagination.
- Create begins with four supported discount kinds and opens a Shopana Modal Stack form.
- All reference form capabilities supported by Pricing are represented; countries and POS-specific controls are not faked.
- Details modal is read-first and follows Product/Category/Review pattern: info header + `Paper` sections + local actions.
- Header KPIs use real usage counters and show Unlimited correctly.
- All four kinds have distinct rule presentation and editor controls.
- Code and automatic methods enforce their different title/code/usage constraints.
- Product, variant and customer selection reuses existing picker infrastructure; collection, segment and channel selection extend the same infrastructure.
- Buyer context, minimum requirements, purchase modes, channels, featured flags, combinations, usage limits, schedule and tags are editable.
- Multiple codes can be added, limited, enabled/disabled and inspected without deleting historical identity.
- Reservations, redemptions, reversals and allocations are visible through read-only usage drilldown.
- Revisions/events and external references have dedicated utility flows.
- Every update is revision-aware and never silently overwrites a conflict.
- Lifecycle actions have precise consequences; archive replaces hard delete.
- Money uses project default currency throughout Admin UI.
- Loading, empty, not found, stale-reference, conflict and API-error states are specified.
- Narrow modals do not create horizontal scroll in primary forms.
- Every action is keyboard accessible and has a text accessible name.
