# Review Details: redesign details card и section edit modals

## Цель

Спроектировать новый UI для `ReviewDetailsCard`, details modal и связанных модалок редактирования
секций. Новый экран должен выглядеть как часть той же системы, что `ProductDetailsCard` и
`CategoryDetailsCard`: компактная summary-карточка сверху, последовательные `Paper`-секции,
локальные действия секций и предсказуемый Modal Stack.

Документ описывает presentation и interaction design. Он не меняет GraphQL-контракт и не предлагает
отдельную страницу вместо существующего modal flow.

Референсы в текущем Admin UI:

- `admin/src/domains/inventory/products/components/product-details-card`;
- `admin/src/domains/inventory/products/components/product-info-header`;
- `admin/src/domains/inventory/categories/components/category-details-card`;
- `admin/src/domains/inventory/categories/components/category-info-header`;
- `admin/src/domains/inventory/components/entity-details-sections`;
- `admin/src/domains/inventory/components/entity-edit-forms`;
- `admin/src/domains/media/components/entity-media-gallery`;
- `admin/src/layouts/modals`;
- `admin/src/ui-kit/paper`;
- `admin/src/ui-kit/kpi-tile`;
- `admin/src/ui-kit/copyable-chip`.

## Что меняется относительно чернового UI

Текущий экран показывает данные, но воспринимается как техническая выгрузка: много одинаковых
`Descriptions`, повторяющиеся статусы, несколько видимых кнопок `Edit`, необработанный JSON и слабая
визуальная иерархия.

В новом варианте:

1. Details modal получает стабильный заголовок `Review details`; пользовательский title живёт только
   в summary-card.
2. Верхняя карточка повторяет композицию Product/Category info header: status/meta, title, chips,
   actions, divider и реальные KPI.
3. Сначала показываются данные для принятия решения: текст review и moderation reports. Технические
   интеграционные поля находятся внизу.
4. Engagement metrics показываются один раз в header и не дублируются отдельной тяжёлой секцией.
5. Все секционные действия используют существующий `EditAction` с `⋯`; явные primary-кнопки остаются
   только в modal header.
6. Большая общая edit-modal разделяется по агрегатным API-секциям. Каждая форма отправляет только
   собственный subtree `ReviewUpdateInput`.
7. Standalone `Trust & incentive` и `Author & source` удаляются: audit summary живёт в header,
   verification — в Moderation, incentive disclosure — рядом с review content.
8. Raw source metadata не участвует в основном reading flow и открывается отдельным
   `View technical metadata` из header overflow.
9. Empty/loading/error states используют те же визуальные принципы, что Product/Category details.

## Визуальные правила

- Контент details и edit modals использует стандартный `ModalLayout`, `max-width: 800px`.
- Между карточками — `12px`, внутри `Paper` — текущий token-based padding.
- Одна карточка отвечает на один пользовательский вопрос: «что написал клиент», «какое принято
  решение», «к чему относится review».
- `Typography.Title level={3}` используется один раз — в `ReviewInfoHeader`.
- `PaperHeader` используется для всех секций; локальное действие находится справа.
- Цвет используется только семантически: status, report severity, verification и errors.
- Системные ID показываются через `CopyableChip` или `Typography.Text copyable`, а не как обычный
  длинный текст.
- Не использовать отдельные декоративные градиенты, большие цветные hero-блоки и новые card
  primitives.
- Тексты controls остаются на английском, как в существующем Admin UI.

## Information architecture

```text
Review details modal
├── ReviewInfoHeader
│   ├── lifecycle status + updated meta
│   ├── title + overall rating
│   ├── author/trust badges + review ID
│   └── helpful / unhelpful / open reports / replies KPI
├── ReviewContentSection
├── ReviewModerationSection
│   └── decision + abuse reports
├── ReviewSubjectSection
│   └── product / variant / order evidence
├── ReviewRatingsSection
├── ReviewMediaSection
├── ReviewRepliesSection
└── ReviewExternalReferencesSection
```

Порядок намеренный: review можно прочитать и модерировать в верхней части modal, не прокручивая
через source metadata, integration IDs и sync state.

## Modal Stack

```text
Reviews page
└── Review details                         level 0
    ├── Edit review content                level 1
    ├── Edit reviewer                      level 1
    │   └── Customer picker                level 2
    ├── Edit product & purchase            level 1
    │   ├── Product picker                 level 2
    │   └── Variant picker                 level 2
    ├── Edit ratings                       level 1
    ├── Review moderation                  level 1
    ├── Edit purchase verification         level 1
    ├── Edit incentive disclosure          level 1
    ├── View technical metadata            level 1
    ├── Edit customer media                level 1
    │   ├── Media picker / upload          level 2
    │   └── Edit media details             level 2
    └── External reference create/edit     level 1
```

После сохранения дочерняя modal вызывает `onSaved`, details query refetch выполняется до закрытия
child modal, затем пользователь возвращается к актуальному Review Details. Отмена вложенного picker
не меняет draft родительской формы.

Рекомендуемые section keys:

```ts
type ReviewEditSection =
  | "content"
  | "reviewer"
  | "subject"
  | "ratings"
  | "moderation"
  | "verification"
  | "incentive"
  | "media";
```

## Review Details Modal

### Полный wireframe

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Review details                                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [API error alert — only when present]                                   │
│                                                                          │
│  ┌─ ReviewInfoHeader ─────────────────────────────────────────────────┐  │
│  │ [PUBLISHED ✓]  Created Jul 15 · Updated Jul 16 · Storefront [⋯]  │  │
│  │                                                                    │  │
│  │ Excellent sound, comfortable fit                                   │  │
│  │ ★ ★ ★ ★ ☆  4 / 5                                                  │  │
│  │                                                                    │  │
│  │ By Maria Johnson  [Customer] [Verified purchase]                    │  │
│  │ [ID 01J8…]                                                         │  │
│  │                                                                    │  │
│  │ ─────────────────────────────────────────────────────────────────  │  │
│  │                                                                    │  │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │  │
│  │ │ Helpful     │ │ Unhelpful   │ │ Open reports│ │ Replies     │   │  │
│  │ │ 24          │ │ 2           │ │ 1           │ │ 3           │   │  │
│  │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Review content ────────────────────────────────────────────── [⋯] ┐  │
│  │ I've used these headphones every day for three months. The sound   │  │
│  │ is detailed, the fit stays comfortable, and battery life matches   │  │
│  │ the description. The case scratches more easily than expected.     │  │
│  │                                                                    │  │
│  │ [DISCLOSED] Customer received a sample for an honest review.       │  │
│  │                                                                    │  │
│  │ Locale: English (en)                         487 characters         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Moderation ────────────────────────────────────────────────── [⋯] ┐  │
│  │ [◷ Pending       ][✓ Published     ][⊗ Rejected      ] read-only   │  │
│  │ Moderated Jul 16, 14:32 by Admin                                   │  │
│  │ Internal note: Relevant first-hand product experience.             │  │
│  │                                                                    │  │
│  │ [shield] Purchase verification [VERIFIED] Order match · Jul 16     │  │
│  │                                                                    │  │
│  │ Abuse reports                                      1 open / 2 total │  │
│  │ ┌────────────────────────────────────────────────────────────────┐ │  │
│  │ │ [OPEN] [Spam or promotion]  Alex Brown           Jul 16, 11:40│ │  │
│  │ │ “Contains a link to another store.”                            │ │  │
│  │ └────────────────────────────────────────────────────────────────┘ │  │
│  │ [Show all reports]                                                  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Product & purchase ───────────────────────────────────────── [⋯] ┐  │
│  │ [bag] Sony WH-1000XM5                              [Open product]  │  │
│  │       Variant: Midnight black                                      │  │
│  │                                                                    │  │
│  │ Order ID       [gid://… copy]    Order line      [gid://… copy]    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Review rating ─────────────────────────────────────────── [Edit] ┐  │
│  │ Overall  4.0  ★★★★☆    Criteria: Sound 5 · Comfort 4 · Build 3   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Customer media (3) ───────────────────────────────────────── [⋯] ┐  │
│  │ [image 1 ✓] [image 2 ◷] [video 3 ⊗] [+ add] [placeholder ...]     │  │
│  │ Icon badges show status; full moderation data opens per item.      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Replies (3) ──────────────────────────────────────────────────────┐  │
│  │ Store Support [Official] [Published]                 Jul 16, 15:10 │  │
│  │ Thank you for the feedback. We can help with a replacement case.   │  │
│  │ 4 helpful · 0 reports                                              │  │
│  │ ─────────────────────────────────────────────────────────────────  │  │
│  │ Maria Johnson [Customer] [Published]                 Jul 16, 15:22 │  │
│  │ Thanks — I will contact support.                                   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ External references (1) ─────────────────────────── [+ Add]       ┐  │
│  │ [SYNCED]  Trustpilot · REVIEW · TP-18372                [⋯]        │  │
│  │            Last synced Jul 16, 14:40 · Open external link          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### ReviewInfoHeader

![Review info header](assets/review-details-redesign/01-review-info-header.png)

Композиция повторяет `ProductInfoHeader` и `CategoryInfoHeader`, но показывает только релевантные
review actions.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [PUBLISHED ✓]  Created Jul 15 · Updated Jul 16 · Storefront       [⋯] │
│                                                                          │
│ Excellent sound, comfortable fit                                         │
│ ★ ★ ★ ★ ☆  4 / 5                                                       │
│                                                                          │
│ By Maria Johnson  [Customer] [Verified purchase]                         │
│ [ID 01J8A7C2]                                                            │
│                                                                          │
│ ──────────────────────────────────────────────────────────────────────── │
│                                                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │ Helpful      │ │ Unhelpful    │ │ Open reports │ │ Replies      │    │
│ │ 24           │ │ 2            │ │ 1            │ │ 3            │    │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

`PaperHeader title`:

- status `Tag` с icon и tooltip:
  - `PENDING` — gold, clock, `Awaiting moderation`;
  - `PUBLISHED` — green, check, `Visible in published review surfaces`;
  - `REJECTED` — red, circle-x, `Rejected by moderation`;
- компактная audit line: `Created {createdAt} · Updated {updatedAt} by {actor} · {source}`;
- если `updatedAt` ещё не запрашивается details fragment, показывать
  `Created {createdAt} · {source}` без пустых separators.

`PaperHeader actions`:

- text button `LinkOutlined` — copy current Admin URL;
- `Dropdown` с `MoreOutlined`:

```text
Edit review content
Edit reviewer
Edit product & purchase
Edit ratings
────────────────────────
Review moderation
Edit purchase verification
Edit incentive disclosure
View technical metadata
────────────────────────
Redact personal content       danger
Delete review                 danger
```

Dropdown является fallback navigation. Основной путь редактирования — `EditAction` в соответствующей
секции.

Title area:

- title с ellipsis максимум две строки, fallback `Untitled review`;
- `Rate disabled` + текстовое значение `{rating} / 5`, чтобы рейтинг не зависел только от формы
  звёзд;
- author display name, author type `Tag`, условный `Verified purchase` badge;
- `CopyableChip label="ID"` с коротким display value.

Author email и linked customer ID не повторяются в details. Они остаются доступны в `Edit reviewer`.
`View technical metadata` открывает read-only modal/drawer с principal ID, idempotency key и
formatted source metadata; эти поля не занимают место в основном scroll.

KPI panel:

- `KPITile` для `metrics.likeCount`;
- `KPITile` для `metrics.dislikeCount`;
- `KPITile` для `metrics.openReportCount`;
- `KPITile` для `replies.totalCount`.

`PeriodSwitch` не используется: API содержит aggregate counters без временных рядов. Нельзя
показывать фиктивную динамику по образцу mock KPI Product/Category.

### ReviewContentSection

![Review content section](assets/review-details-redesign/02-review-content.png)

```text
┌─ Review content ────────────────────────────────────────────────── [⋯] ┐
│ Full plain-text review body. Preserve user line breaks.                  │
│ No rich HTML rendering and no truncation in details view.                │
│                                                                           │
│ [gift] Incentive disclosure [DISCLOSED]                                  │
│        Customer received a sample for an honest review.                  │
│                                                                           │
│ English (en)                                          487 characters     │
└───────────────────────────────────────────────────────────────────────────┘
```

- `Typography.Paragraph`, `whiteSpace: pre-wrap`, комфортный line-height.
- Body показывается полностью; details modal уже имеет собственный scroll.
- Locale выводится читаемым label + code через `shopLocales`, а не только `en`.
- Character count — secondary text, без отдельного `Descriptions` ради одного поля.
- Incentive alert рендерится только при `isIncentivized=true`; это disclosure marker из API, а не
  сведения о начисленном вознаграждении.
- При `isIncentivized=false` не показывать `Not incentivized`, пустой placeholder или отдельный
  вертикальный отступ.
- Section menu содержит `Edit review content` и условный `Edit incentive disclosure`; обе modal
  отправляют независимые subtrees.

### ReviewModerationSection

![Review moderation section](assets/review-details-redesign/03-review-moderation.png)

Секция объединяет текущие `Moderation` и reports. Это убирает дублирование и держит решение рядом с
evidence.

```text
┌─ Moderation ─────────────────────────────────────────────────────── [⋯] ┐
│ Moderation status                                                        │
│ ┌──────────────────┬──────────────────┬──────────────────┐               │
│ │ ◷ Pending        │ ✓ Published      │ ⊗ Rejected       │  read-only    │
│ └──────────────────┴──────────────────┴──────────────────┘               │
│ Moderated Jul 16, 14:32 by Admin                                        │
│                                                                           │
│ Internal note                                                            │
│ Relevant first-hand product experience.                                  │
│                                                                           │
│ [shield] Purchase verification  [VERIFIED]  Order match · Jul 16, 14:30 │
│                                                                           │
│ ──────────────────────────────────────────────────────────────────────── │
│                                                                           │
│ Abuse reports                                          1 open / 2 total  │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ [OPEN] [Spam or promotion]                              Jul 16, 11:40 │ │
│ │ Alex Brown · alex@example.com                                        │ │
│ │ “Contains a link to another store.”                                  │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ [DISMISSED] [Not relevant]                              Jul 15, 18:20 │ │
│ │ Anonymous reporter                                                   │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ [Show all reports (2)]                                                   │
└───────────────────────────────────────────────────────────────────────────┘
```

- Верхняя часть повторяет прежний horizontal status pattern из версии до `034f0c32`: три равных
  segment, текущий status выделен семантическим цветом.
- В details это read-only presentation: segments не имеют `onChange`, hover/focus state и не должны
  объявляться screen reader как selectable controls.
- В edit modal тот же визуальный pattern становится настоящим `Segmented block`; одинаковая
  геометрия сохраняет узнаваемость view/edit state.
- Под status strip показываются moderated timestamp и moderator.
- `moderationNote` отображается как нормальный текст; при отсутствии — `No internal note` secondary.
- Purchase verification — одна компактная строка: status, method и verified timestamp. Она заменяет
  отдельный `Trust & incentive` Paper.
- `Verified purchase` в header остаётся только summary badge; полные verification values не
  дублируются там.
- Ниже показывается `openReportCount / reportCount`.
- Сначала открытые reports, затем закрытые; внутри одинаковой группы — новые первыми.
- По умолчанию видны максимум три report rows, затем `Show all reports (N)`.
- Report row показывает status, human-readable reason, reporter, date и details.
- `last-child` border отсутствует, как в существующем reports list.
- Section menu содержит два независимых действия: `Review moderation` и
  `Edit purchase verification`. Report resolution не смешивается ни с одним из них.
- При отсутствии reports использовать `EntityDetailsEmptyState`, а не большой `Empty` illustration.

### ReviewSubjectSection

![Product and purchase section](assets/review-details-redesign/04-product-purchase.png)

```text
┌─ Product & purchase ─────────────────────────────────────────────── [⋯] ┐
│ [bag]  Sony WH-1000XM5                                  [Open product]  │
│        Variant: Midnight black                                           │
│                                                                           │
│ ──────────────────────────────────────────────────────────────────────── │
│                                                                           │
│ Order ID                              Order line ID                       │
│ [gid://shopana/Order/8452       copy] [gid://shopana/OrderLine/31  copy] │
│                                                                           │
│ Purchase evidence is linked to this review but is not displayed publicly.│
└───────────────────────────────────────────────────────────────────────────┘
```

- Product title — link/button, открывающий существующий Product Details modal.
- Variant — link на Variant details, если entity доступна; иначе copyable ID/title.
- Order и Order line остаются copyable global IDs: admin federation entity для orders пока
  отсутствует.
- Не показывать fake product image: текущий review details fragment возвращает только
  `product { id title }`.
- Action: `Edit product & purchase`.

### ReviewRatingsSection

![Review ratings section](assets/review-details-redesign/05-review-ratings.png)

```text
┌─ Review rating ─────────────────────────────────────────────── [Edit] ┐
│  Submitted by the reviewer                                           │
│                                                                      │
│ ┌─ Overall rating ────────┐  ┌─ Criteria breakdown ── [4 criteria] ┐ │
│ │                         │  │ Individual scores for this review    │ │
│ │           4.0           │  │                                      │ │
│ │      ★ ★ ★ ★ ☆         │  │ Sound quality    ▰ ▰ ▰ ▰ ▰    5.0  │ │
│ │        4 out of 5       │  │ Comfort          ▰ ▰ ▰ ▰ ▱    4.0  │ │
│ │                         │  │ Build quality    ▰ ▰ ▰ ▱ ▱    3.0  │ │
│ └─────────────────────────┘  │ Value for money  ▰ ▰ ▰ ▰ ▱    4.0  │ │
│                              │ ──────────────────────────────────── │ │
│                              │ ✓ All assigned criteria answered    │ │
│                              └──────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

- Название `Review rating` и helper text `Submitted by the reviewer` явно отделяют оценку
  конкретного review от агрегированного product rating.
- Слева — компактный overall summary: крупное значение, disabled `Rate`, текстовое
  `{value} out of 5`.
- Справа — вложенная панель `Criteria breakdown`: count badge, пояснение и criterion ratings в API
  order.
- Criterion row состоит из title, пятисегментной шкалы и числового значения. Сегменты визуально
  отличаются от stars общей оценки и лучше сканируются в плотном списке.
- Footer `All assigned criteria answered` показывается только когда API подтверждает полноту
  применимых criteria; при отсутствии такой проверки footer не выводится.
- Если detailed ratings отсутствуют, панель показывает компактный empty state
  `No criterion scores were submitted` без count badge и completion footer.
- На узкой ширине колонки складываются вертикально: overall summary сверху, criteria panel снизу;
  title и value каждой строки остаются на одной линии.
- Единственное действие секции — явная кнопка `Edit`, открывающая `Edit ratings`; ambiguous overflow
  menu здесь не нужен.

### ReviewMediaSection

![Customer media section](assets/review-details-redesign/06-customer-media.png)

Details presentation переиспользует визуальный grid `MediaSection` Product Details:

```text
┌─ Customer media (5) ────────────────────────────────────────────── [⋯] ┐
│ ┌─────────────────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │                 [✓] │ │     [✓] │ │     [◷] │ │     [⊗] │            │
│ │                     │ │         │ │         │ │         │            │
│ │      image 1        │ │ image 2 │ │ video 3 │ │ image 4 │            │
│ │                     │ │         │ │   ▶     │ │         │            │
│ │ hover: Preview      │ └─────────┘ └─────────┘ └─────────┘            │
│ └─────────────────────┘ ┌─────────┐ ┌─────────┐ ┌╌╌╌╌╌╌╌╌╌┐            │
│                         │     [✓] │ │         │ ╎    +    ╎            │
│                         │ image 5 │ │ empty   │ ╎ Add media╎            │
│                         └─────────┘ └─────────┘ └╌╌╌╌╌╌╌╌╌┘            │
│                                                                           │
│ Select an item to preview or moderate it.                                │
└───────────────────────────────────────────────────────────────────────────┘
```

- `hasFeatured={false}`;
- `MediaPreview` для изображений и video;
- максимум 12 cells в overview, `+N` для остатка;
- upload cell открывает edit media modal;
- tabs `Published / Pending / Rejected` отсутствуют: при небольшом количестве media они занимают
  место и скрывают общий контекст review;
- каждый item показывает icon-only moderation badge в одном и том же top-right slot: `CheckCircle`,
  `Clock`, `CircleX`;
- badge использует icon + semantic color, имеет `Tooltip` и `aria-label`; цвет не является
  единственным способом различить state;
- полный status text, caption, moderation note и audit metadata доступны только в item details
  modal;
- click по thumbnail открывает preview/details; action `Edit details` доступен также из item
  overflow menu.

Общий grid расширяется optional slots. Не нужно копировать media preview, placeholder, DnD и
keyboard interaction в новый review-only component.

#### Расширение EntityMediaGallery для moderation

Текущий `EntityMediaGallery` принимает только `ApiFile[]`, тогда как moderation metadata принадлежит
`ReviewMedia`, а не `File`. Поэтому gallery сохраняет file-based contract, а Review adapter держит
metadata по `file.id` и передаёт optional render/action slots:

```ts
interface IEntityMediaGalleryProps {
  // existing props remain unchanged
  renderItemBadge?: (file: ApiFile, index: number) => React.ReactNode;
  renderListMeta?: (file: ApiFile, index: number) => React.ReactNode;
  getItemMenuItems?: (file: ApiFile, index: number) => MenuProps["items"];
  onEditItem?: (file: ApiFile, index: number) => void;
  editItemLabel?: string;
}
```

Review-specific draft остаётся за пределами shared gallery:

```ts
interface ReviewMediaDraftItem {
  file: ApiFile;
  caption: string | null;
  status: ReviewContentStatus;
  moderationNote: string | null;
  moderatedByPrincipalId: string | null;
  moderatedAt: string | null;
  moderationDirty: boolean;
}

const metadataByFileId = new Map(items.map((item) => [item.file.id, item]));
```

Правила extension:

- existing Product/Category consumers не передают новые props и визуально не меняются;
- built-in menu items `Preview`, `Set as featured`, `Delete` объединяются с `getItemMenuItems`,
  сохраняя test IDs на menu item object;
- `renderItemBadge` рендерится поверх grid thumbnail, но не внутри drag handle и не перекрывает
  overflow action;
- в list mode `renderListMeta` может показывать icon + полный text status, потому что там достаточно
  горизонтального места;
- reorder/add/delete возвращают `ApiFile[]`; Review adapter синхронно перестраивает draft, сохраняя
  metadata существующих file IDs;
- новая media получает `PENDING`, `moderationNote=null`, `moderatedAt=null`.

### ReviewRepliesSection

![Review replies section](assets/review-details-redesign/07-review-replies.png)

```text
┌─ Replies (3) ────────────────────────────────────────────────────────────┐
│ Store Support  [Official] [Published]                     Jul 16, 15:10 │
│ Thank you for the feedback. We can help with a replacement case.         │
│ 4 helpful · 0 reports                                                    │
│ ──────────────────────────────────────────────────────────────────────── │
│ Maria Johnson  [Customer] [Published]                     Jul 16, 15:22 │
│ Thanks — I will contact support.                                         │
│ 1 helpful · 0 reports                                                    │
│ ──────────────────────────────────────────────────────────────────────── │
│ Store Support  [Official] [Pending]                       Jul 16, 15:40 │
│ A private support case has been created for you…            [Show more] │
│ 0 helpful · 1 report                                                     │
│                                                                           │
│ [Show all replies (3)]                                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

- Reply row: author, official/customer tag, publication status, created date, body, helpful/report
  counts.
- Длинный body ограничивается четырьмя строками с `Show more`.
- По умолчанию показываются первые пять replies; `Show all (N)` раскрывает список внутри секции.
- Empty state: `No replies yet` + пояснение без action.
- На этом этапе секция read-only: текущий Review Details не имеет отдельного reply management flow.
  Не показывать неработающую кнопку `Manage`.

### Почему нет Trust & incentive и Author & source

Эти standalone sections удалены намеренно: они повторяли header и показывали технические scalar
values как равнозначный business content.

```text
Удалённый блок                  Новое место
─────────────────────────────  ───────────────────────────────────────────
Author name / type             ReviewInfoHeader
Source / created / updated     компактная audit line в ReviewInfoHeader
Verified purchase summary      badge в ReviewInfoHeader
Verification status/details    compact row в ReviewModerationSection
Incentive disclosure           conditional alert в ReviewContentSection
Author email / customer ID     Edit reviewer modal
Principal / idempotency / JSON View technical metadata из header overflow
```

`View technical metadata` — read-only utility modal/drawer, не details section:

```text
┌────────────────────────────────────────────────────────────────────┐
│ ×  Technical metadata                                             │
├────────────────────────────────────────────────────────────────────┤
│ Principal ID       [principal_01J…                         copy]   │
│ Idempotency key    [storefront-review-8452                 copy]   │
│ Source             Storefront                                     │
│ Source metadata                                                    │
│ { "device": "mobile", "campaign": "post-purchase" }             │
└────────────────────────────────────────────────────────────────────┘
```

JSON используется в token-based code container с horizontal scroll. Пустой `{}` не создаёт отдельную
строку. Modal не содержит `Save`, потому что source audit data immutable в Review Admin flow.

### ReviewExternalReferencesSection

![External references section](assets/review-details-redesign/10-external-references.png)

```text
┌─ External references (2) ────────────────────────────────────── [+ Add] ┐
│ [SYNCED]  Trustpilot · REVIEW · TP-18372                         [⋯]    │
│           Last synced Jul 16, 14:40 · Open external link                │
│ ──────────────────────────────────────────────────────────────────────── │
│ [FAILED]  Bazaarvoice · REVIEW · BV-99102                        [⋯]    │
│           Sync failed Jul 16, 13:05                                     │
│           Authentication token expired                                  │
└───────────────────────────────────────────────────────────────────────────┘

Empty state:

┌─ External references (0) ────────────────────────────────────── [+ Add] ┐
│ [link icon]  No external references                                    │
│              Connect this review to an external review system.          │
│              [Add external reference]                                   │
└───────────────────────────────────────────────────────────────────────────┘
```

- Header action — small `+ Add`, потому что это create collection action, а не редактирование всей
  секции.
- Row: sync status tag, system/type/id, last synced или last error, optional external URL.
- Row `EditAction` открывает существующий `ExternalReferenceModal` с `externalReference`.
- `FAILED` row визуально акцентирует `lastError`, но вся карточка не становится красной.
- Empty state сохраняет contextual action `Add external reference`.

## Section Edit Modals

### Общий pattern

Каждая edit modal использует:

```text
ModalLayout
├── ModalHeader: close / stable title / primary Save
└── scrollable body, max-width 800
    ├── API Alert, only when present
    └── one or more Paper sections
```

Общие правила:

1. `Save` disabled, пока detail loading, форма невалидна, submit выполняется или edit form не dirty.
2. Любое изменение вызывает `setDirty(true)`; закрытие обрабатывается стандартным Modal Stack
   confirmation.
3. Field errors находятся под конкретным control; operation/network error — `Alert` над первой
   `Paper`.
4. После submit ошибка не закрывает modal и не очищает draft.
5. При success: refetch details, success toast, `setDirty(false)`, `forcePop()`.
6. Каждая modal отправляет только свою секцию и текущий `expectedRevision`.
7. Валидация и API error mapping должны переиспользовать `reviewFormSchema`/mapper rules,
   разделённые на section schemas.
8. Form controls имеют видимые labels; placeholders не заменяют labels.

### 1. Edit Review Content

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Edit review content                                      [Save]      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ Content ──────────────────────────────────────────────────────────┐  │
│  │ Locale *                                                          │  │
│  │ [English (en)_______________________________________________⌄]   │  │
│  │                                                                    │  │
│  │ Title                                                              │  │
│  │ [Excellent sound, comfortable fit____________________] 41 / 150   │  │
│  │                                                                    │  │
│  │ Review *                                                           │  │
│  │ [I've used these headphones every day for three months...      ]  │  │
│  │ [                                                               ]  │  │
│  │ [                                                               ]  │  │
│  │                                                       487 / 5000  │  │
│  │ At least 20 characters. Plain text; line breaks are preserved.    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- `Select showSearch` для `shopLocales`.
- `Input` title, max 150.
- `Input.TextArea autoSize={{ minRows: 8, maxRows: 16 }}`, body 20–5000.
- Rating, product и author здесь отсутствуют.
- Submit subtree: `content.text`.

### 2. Edit Reviewer

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Edit reviewer                                            [Save]      │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─ Reviewer identity ────────────────────────────────────────────────┐  │
│  │ Author type *                                                     │  │
│  │ [Customer____________________________________________________⌄]   │  │
│  │                                                                    │  │
│  │ Linked customer *                                                 │  │
│  │ [Maria Johnson____________________________________] [Select]       │  │
│  │                                                                    │  │
│  │ Display name *                   Email                             │  │
│  │ [Maria Johnson______________]   [maria@example.com____________]   │  │
│  │                                                                    │  │
│  │ ℹ Name and email are stored as the review author snapshot.         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Author type — `Select`, потому что enum содержит больше трёх вариантов.
- Для `CUSTOMER` customer обязателен; используется существующий Customer Picker.
- Для guest/staff/external customer selection скрывается или очищается после подтверждения.
- При выборе Customer display name/email заполняются snapshot values, но остаются редактируемыми.
- Source channel, principal ID и idempotency key не редактируются этой modal.
- Submit subtree: `content.author`.

### 3. Edit Product & Purchase

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Edit product & purchase                                  [Save]      │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─ Review subject ───────────────────────────────────────────────────┐  │
│  │ Product *                                                         │  │
│  │ [Sony WH-1000XM5__________________________________] [Select]       │  │
│  │                                                                    │  │
│  │ Variant                                                           │  │
│  │ [Midnight black___________________________________] [Select]       │  │
│  │ Variant options are restricted to the selected product.           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Order evidence ───────────────────────────────────────────────────┐  │
│  │ Order ID                         Order line ID                     │  │
│  │ [gid://shopana/Order/…_______]  [gid://shopana/OrderLine/…____]   │  │
│  │ Orders currently use global IDs; no order picker is available.    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Product — existing Product Picker, single selection.
- Variant — existing Variant Picker, single selection and constrained to selected Product.
- Если Product меняется и текущий Variant ему не принадлежит, Variant очищается с понятным inline
  notice.
- Order IDs optional и `allowClear`.
- Submit subtree: `subject`.

### 4. Edit Ratings

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Edit ratings                                             [Save]      │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─ Overall rating ───────────────────────────────────────────────────┐  │
│  │ Overall *                                                         │  │
│  │ [★] [★] [★] [★] [☆]   4 / 5                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Rating criteria ──────────────────────────────────────────────────┐  │
│  │ Sound quality       [★] [★] [★] [★] [★]   5 / 5                  │  │
│  │ Comfort            [★] [★] [★] [★] [☆]   4 / 5                  │  │
│  │ Build quality      [★] [★] [★] [☆] [☆]   3 / 5                  │  │
│  │                                                                    │  │
│  │ Values are saved as one complete criterion rating set.             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- `Rate` + numeric text для каждого значения.
- Criteria rows используют `criterion.id` как stable key.
- Список не позволяет менять criterion definitions; они настраиваются в отдельном management flow.
- Если criteria отсутствуют, вторая Paper не рендерится.
- Submit subtree: `rating { overall, criteria }`.

### 5. Review Moderation

![Edit review moderation modal](assets/review-details-redesign/11-edit-review-moderation.png)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Review moderation                                        [Save]      │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─ Moderation decision ──────────────────────────────────────────────┐  │
│  │ [◷ Pending       ] [✓ Published     ] [⊗ Rejected      ]           │  │
│  │                                                                    │  │
│  │ ┌────────────────────────────────────────────────────────────────┐ │  │
│  │ │ Published                                                      │ │  │
│  │ │ Visible on product pages and included in rating aggregates.    │ │  │
│  │ └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                    │  │
│  │ Internal moderation note                                          │  │
│  │ [Relevant first-hand product experience.                       ]  │  │
│  │ [                                                               ]  │  │
│  │                                                       55 / 1000   │  │
│  │ This note is never shown to customers.                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Current decision: Published · Jul 16, 14:32 · Admin                    │
└──────────────────────────────────────────────────────────────────────────┘
```

- Восстанавливается точный interaction pattern до `034f0c32`: full-width `Segmented block` с
  иконками `ClockCircleOutlined`, `CheckCircleOutlined`, `CloseCircleOutlined`.
- Consequence copy показывается один раз в отдельной semantic context panel для выбранного status, а
  не трижды внутри segments.
- Details и form используют одинаковый horizontal layout; разница выражена поведением: details
  static/read-only, form selectable и сохраняется через `Save`.
- Rejected требует non-empty moderation note.
- Current moderator/time — read-only secondary line вне editable fields.
- Reports видны в parent details и не повторяются внутри edit form.
- Submit subtree: `content.moderation`.

### 6. Edit Purchase Verification

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Edit purchase verification                               [Save]      │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─ Purchase verification ────────────────────────────────────────────┐  │
│  │ Status *                                                          │  │
│  │ [ Unverified ]       [ Verified ]       [ Revoked ]                │  │
│  │                                                                    │  │
│  │ Method                          Verified at                        │  │
│  │ [Order match________________]  [Jul 16, 2026  14:30___________]   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Verification status — `Segmented` из трёх значений.
- Method и verified datetime доступны для `VERIFIED`; при другом status UI явно показывает, будут ли
  значения сохранены или очищены согласно mapper policy.
- Не использовать одно поле `verificationStatus`, как в текущем draft: API также поддерживает
  method/time.
- Submit subtree: `verification`.

### 7. Edit Incentive Disclosure

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Edit incentive disclosure                                [Save]      │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─ Disclosure ───────────────────────────────────────────────────────┐  │
│  │ [●] This review was incentivized                                  │  │
│  │                                                                    │  │
│  │ Public disclosure *                                               │  │
│  │ [Customer received a sample for an honest review.              ]  │  │
│  │ This is a disclosure marker; Shopana does not issue a reward.     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- `Switch` управляет `isIncentivized`; disclosure появляется и становится required только при
  enabled.
- При disabled API получает `isIncentivized=false`, а disclosure очищается согласно существующему
  contract.
- Не добавлять reward type, amount, coupon или payout: таких полей и выдачи вознаграждения в API
  нет.
- Submit subtree: `incentive`.

### 8. Edit Customer Media

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Edit customer media                                      [Save]      │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─ Customer media ────────────────────────────── 3 / 8 ─────────────┐  │
│  │ [Add from library] [Upload]                                       │  │
│  │                                                                    │  │
│  │ ↕ [thumb] headphones-front.jpg  JPG · 1.8 MB  [Published]   [⋯]  │  │
│  │ ↕ [thumb] travel-case.jpg       JPG · 1.1 MB  [Published]   [⋯]  │  │
│  │ ↕ [video] unboxing.mp4          MP4 · 8.4 MB  [Pending]     [⋯]  │  │
│  │                                                                    │  │
│  │ Drag to reorder. The first item is not treated as featured.        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

Переиспользуется `EntityMediaGallery` в `viewMode="list"`:

- media picker, upload modal, preview, DnD и remove остаются общими;
- `hasFeatured={false}`;
- limit берётся из review configuration (`maxReviewMediaCount`), а не дублируется в нескольких
  компонентах;
- optional item metadata slot показывает review media status;
- item action `Edit details` открывает вложенную modal.

Nested media details:

![Edit review media details modal](assets/review-details-redesign/12-edit-review-media-details.png)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Edit media details                                       [Apply]     │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─ Preview ───────────────────┐  ┌─ Details ───────────────────────┐  │
│  │                             │  │ Caption                        │  │
│  │    [ image / video ]        │  │ [Headphones and travel case…] │  │
│  │                             │  │                                │  │
│  │ headphones-side.jpg         │  │ Moderation status              │  │
│  │ JPG · 1.8 MB                │  │ [◷ Pending][✓ Published][⊗ Rej.]│ │
│  └─────────────────────────────┘  │                                │  │
│                                   │ [REJECTED context message]     │  │
│                                   │                                │  │
│                                   │ Moderation note *              │  │
│                                   │ [Image contains personal…    ] │  │
│                                   │ Moderated Jul 16 by Admin      │  │
│                                   └────────────────────────────────┘  │
│                                                                          │
│  ℹ Apply updates the draft. Save the media gallery to persist changes.  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Status использует тот же horizontal `Segmented block`, что review moderation: `Pending`,
  `Published`, `Rejected` с icon и text.
- Context panel объясняет consequence только выбранного status.
- При `Rejected` moderation note обязательна; максимум 1000 characters. При других statuses note
  optional, но существующая note не очищается молча.
- `Pending` очищает `moderatedByPrincipalId` и `moderatedAt`; `Published`/`Rejected` записывают
  текущего admin и timestamp согласно существующему update script.
- `Apply` валидирует item и изменяет только draft родительской media modal. Server update
  выполняется один раз по `Save` родителя, потому что `ReviewUpdateInput.media` является complete
  replacement.
- Закрытие nested modal без `Apply` не меняет parent draft. Закрытие dirty parent modal использует
  стандартное Modal Stack confirmation.
- Parent Save отправляет `caption` для каждого item, но `moderation` subtree — только когда
  `moderationDirty=true`. Если отправлять moderation для всех items при обычном reorder, текущий
  backend перезапишет moderator/timestamp.
- Для unchanged item отсутствие `moderation` заставляет update script сохранить existing status,
  note, moderator и timestamp по `fileId`.

### 9. External Reference Create/Edit

Существующая modal сохраняется, но получает более спокойную иерархию:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Edit external reference                         [⋯]        [Save]    │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─ Identity ─────────────────────────────────────────────────────────┐  │
│  │ Review           Excellent sound, comfortable fit  (read-only)     │  │
│  │ External system * [Trustpilot________]  Type * [REVIEW________]    │  │
│  │ External ID *     [TP-18372_______________________________]        │  │
│  │ External URL      [https://…________________________________]      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Synchronization ──────────────────────────────────────────────────┐  │
│  │ Direction *   [Bidirectional________________________________⌄]    │  │
│  │ Status        [Synced_______________________________________⌄]    │  │
│  │ Last synced   Jul 16, 14:40     Last error   —                    │  │
│  │                                                                    │  │
│  │ > Advanced: ETag, checksum and metadata                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Metadata JSON, ETag и checksum скрыты в `Collapse` `Advanced`.
- Sync state отображается в той же synchronization Paper, а не отдельной карточкой.
- Delete находится в header `⋯` и требует danger confirmation; отдельная большая `Danger zone` Paper
  не нужна.
- Enum labels форматируются human-readable: `Bidirectional`, а не `bidirectional`.

## Destructive confirmations

### Redact personal content

```text
┌──────────────────────────────────────────────────────────────┐
│ Redact personal content?                                     │
│                                                              │
│ Personal author data and redactable review content will be   │
│ irreversibly replaced. This action cannot be undone.          │
│                                                              │
│                                      [Cancel] [Redact]        │
└──────────────────────────────────────────────────────────────┘
```

`Redact` — danger button. После success details остаётся открытой и refetch показывает redacted
state.

### Delete review

```text
┌──────────────────────────────────────────────────────────────┐
│ Delete review?                                               │
│                                                              │
│ The review will be archived with a soft delete and removed   │
│ from active review surfaces.                                 │
│                                                              │
│                                      [Cancel] [Delete]        │
└──────────────────────────────────────────────────────────────┘
```

После success details modal закрывается и reviews list refetch выполняется.

## Component reuse matrix

| UI responsibility                  | Переиспользовать                                                                     | Решение                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Modal shell                        | `ModalLayout`, `ModalHeader`                                                         | Без нового shell/footer                                                     |
| Section surface                    | `Paper`, `PaperHeader`                                                               | Один pattern для всех sections                                              |
| Local section action               | `EditAction`                                                                         | `⋯` с понятным menu label                                                   |
| Status/meta header                 | composition Product/Category `InfoHeader`                                            | Новый `ReviewInfoHeader`, та же структура                                   |
| IDs                                | `CopyableChip`                                                                       | Review, customer, order IDs                                                 |
| Header metrics                     | `KPITile`                                                                            | Только реальные aggregate values                                            |
| Dates                              | `formatDetailDate`                                                                   | Один formatter вместо `toLocaleString()` в каждом компоненте                |
| Empty content                      | `EntityDetailsEmptyState`                                                            | Review-specific copy/icon                                                   |
| Media overview                     | Product `MediaSection` primitives + `MediaPreview`                                   | `hasFeatured=false`, metadata slots                                         |
| Media editor                       | `EntityMediaGallery`                                                                 | List mode, DnD, picker, upload, preview                                     |
| Media moderation extension         | optional `renderItemBadge`, `renderListMeta`, `getItemMenuItems`, `onEditItem` slots | Shared gallery остаётся file-based; Review adapter владеет moderation draft |
| Product/customer/variant selection | existing Entity Picker hooks/configs                                                 | Не создавать review-specific pickers                                        |
| Locale                             | `shopLocales`                                                                        | Human label + locale code                                                   |
| Forms                              | `react-hook-form`, section Zod schemas                                               | Dirty/errors/submit единообразны                                            |
| Unsaved close                      | Modal Stack built-in confirmation                                                    | Не создавать локальный confirm                                              |
| External references                | existing `ExternalReferenceModal`                                                    | Улучшить layout, сохранить API flow                                         |

## Что должно стать отдельными Review components

```text
admin/src/domains/customer-content/reviews/components/review-details-card/
├── review-details-card.tsx
├── review-details-card.styles.ts
├── review-info-header.tsx
├── sections/
│   ├── review-content-section.tsx
│   ├── review-moderation-section.tsx
│   ├── review-subject-section.tsx
│   ├── review-ratings-section.tsx
│   ├── review-media-section.tsx
│   ├── review-replies-section.tsx
│   └── review-external-references-section.tsx
└── hooks/
    └── use-review-modals.ts
```

`ContentDetailsSections` не должен продолжать рендерить один большой generic хвост для Review. Общие
formatter, report row, author summary и external reference row можно вынести в маленькие shared
components, но порядок и composition остаются domain-specific.

Edit modals рекомендуется разделить физически, как в Category Details:

```text
admin/src/domains/customer-content/reviews/modals/
├── review-details-modal/
├── edit-review-content-modal/
├── edit-reviewer-modal/
├── edit-review-subject-modal/
├── edit-review-ratings-modal/
├── edit-review-moderation-modal/
├── edit-review-verification-modal/
├── edit-review-incentive-modal/
├── review-technical-metadata-modal/
├── edit-review-media-modal/
└── edit-review-media-item-modal/
```

## Section/API ownership

| Section modal              | Единственный update subtree                                   |
| -------------------------- | ------------------------------------------------------------- |
| Edit review content        | `{ content: { text: { title, body, locale } } }`              |
| Edit reviewer              | `{ content: { author: { ... } } }`                            |
| Edit product & purchase    | `{ subject: { productId, variantId, orderId, orderLineId } }` |
| Edit ratings               | `{ rating: { overall, criteria } }`                           |
| Review moderation          | `{ content: { moderation: { status, moderationNote } } }`     |
| Edit purchase verification | `{ verification: { ... } }`                                   |
| Edit incentive disclosure  | `{ incentive: { isIncentivized, disclosure } }`               |
| Edit customer media        | `{ media: [...] }` complete replacement                       |
| External reference         | отдельные external reference create/update/delete mutations   |

Это ключевое правило redesign: открытие `Edit review content` не должно повторно отправлять author,
product, rating, moderation, verification, incentive или media из устаревшего form snapshot.

## Data readiness

Для wireframe используются уже доступные поля `ReviewDetailsFields`. Небольшие read additions
допустимы без изменения API schema:

- добавить `updatedAt`, если header показывает updated meta;
- добавить lifecycle timestamps только если они реально выводятся;
- не запрашивать product media только ради декоративного thumbnail;
- не делать отдельные queries для author, reports или external references, уже вложенных в details
  operation.

Review details query остаётся источником истины. Edit modal получает `entityId`, повторно загружает
актуальную entity и использует `revision` для optimistic concurrency.

Review media moderation уже поддерживается Admin API полями `status`, `moderationNote`,
`moderatedByPrincipalId`, `moderatedAt` и input `ReviewMediaSyncItemInput.moderation`; schema
extension для editor не требуется.

Customer-facing delivery требует отдельного обязательного правила: наружу возвращаются только media
со `status=PUBLISHED`. Текущий repository loader получает все review media без status filter,
поэтому icon badge сам по себе ещё не обеспечивает скрытие `PENDING`/`REJECTED`. До появления
storefront resolver это фиксируется как implementation requirement, а не считается готовым
поведением API.

При conflict:

```text
This review changed after the editor was opened.
[Reload latest data]
```

Автоматически повторять update с новой revision нельзя.

## Loading, empty и error states

### Details loading

- Skeleton повторяет высоту header card и первых двух секций.
- Не показывать 14 одинаковых paragraph rows.
- Header modal сразу имеет стабильный title `Review details`.

### Not found

```text
Review not found
It may have been deleted or is no longer available.
[Close]
```

### Section empty states

| Section             | Copy                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| Media               | `No customer media` / `This review has no attached photos or videos.` |
| Replies             | `No replies yet` / `No customer or official replies have been added.` |
| Reports             | `No abuse reports` / `No customers have reported this review.`        |
| Detailed ratings    | `No criterion ratings`                                                |
| External references | `No external references` + `Add external reference`                   |

### Errors

- Detail query failure — global `Alert` вместо частично пустой card.
- Edit network/operation failure — `Alert` над form sections.
- Field validation — inline, с focus на первом invalid control.
- Media item error — привязан к конкретной stable `fileId` row.
- External sync failure — row-level message; остальная details card остаётся нейтральной.

## Responsive behavior

При ширине content меньше `640px`:

- KPI panel становится `2 × 2`, затем одной колонкой на очень узком viewport;
- `Descriptions` — одна колонка;
- label/value pairs Ratings располагаются вертикально;
- Product/Variant и Order/Order line form fields становятся вертикальными;
- media grid уменьшает число колонок, но сохраняет квадратные cells;
- `Rate` не переносит отдельные stars на новую строку: numeric value может перейти ниже целиком;
- Modal header primary action остаётся видимой;
- body scroll не двигает header.

## Accessibility и keyboard behavior

- Status всегда имеет текстовый label, не только цвет.
- Icon-only actions имеют tooltip и `aria-label`.
- `Rate` сопровождается `{value} out of 5` для screen reader.
- Edit menu labels называют объект: `Edit ratings`, а не просто `Edit`.
- После открытия edit modal focus попадает в первое editable поле.
- После validation error focus переходит к первому invalid field.
- `Esc` закрывает только верхний уровень stack; dirty form показывает стандартное confirmation.
- Media reorder доступен keyboard sensor и альтернативными move actions.
- `Show all` и `Show more` — настоящие buttons, не clickable text.
- External links обозначаются как открывающиеся в новой вкладке.

## Acceptance criteria

- Review Details визуально следует Product/Category details pattern: summary header + `Paper`
  sections + local `EditAction`.
- Modal header называется `Review details`; review title не дублируется в двух headers.
- Header KPI использует только реальные review counters и не показывает fake trends/periods.
- Content и moderation доступны без прокрутки через technical metadata.
- Engagement counters не дублируются отдельной секцией.
- Reports находятся рядом с moderation decision и сортируются open-first.
- Standalone `Trust & incentive` и `Author & source` отсутствуют; их уникальные данные распределены
  по header, content и moderation без повторов.
- Raw source metadata не участвует в основном scroll и доступна через отдельный read-only utility
  view.
- Review content, reviewer, subject, ratings, moderation, verification, incentive и media имеют
  независимые edit flows.
- Каждая edit modal отправляет только собственный `ReviewUpdateInput` subtree.
- Product, Variant, Customer и Media selection переиспользуют существующие pickers.
- Media переиспользует gallery/preview/upload primitives и сохраняет caption/moderation metadata.
- Media grid не содержит status tabs и full-text thumbnail badges; status представлен icon-only
  badge с Tooltip и accessible name.
- Каждый media item можно открыть в nested details modal и изменить
  `Pending / Published / Rejected`; rejected требует moderation note.
- Reorder/add/delete не сбрасывают moderation metadata существующих items и не переписывают
  moderation audit без реального изменения.
- Customer-facing review media исключает `PENDING` и `REJECTED`; Admin details продолжает видеть все
  statuses.
- External reference rows открываются в create/edit варианте существующей modal.
- Redact и Delete имеют разные, точные consequence messages.
- Loading, not found, empty, conflict и API error states описаны и не уничтожают form draft.
- Узкий viewport не создаёт горизонтальный scroll основной формы.
- Все actions доступны с клавиатуры и имеют текстовые accessible names.
