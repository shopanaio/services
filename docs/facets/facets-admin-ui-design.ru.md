# Facets: дизайн Admin UI

Документ проектирует страницу управления storefront facets в Admin UI. Основа:
`docs/facets/facets-data-model.ru.md`, текущие Admin UI паттерны Shopana,
а также UX-подходы Shopify, MedusaJS и Saleor: спокойная рабочая страница,
табличный список, быстрые действия в строках, drawers/modals для редактирования
и отдельные панели для сложной настройки значений.

## Цель страницы

Админ должен управлять фильтрами каталожного листинга без знания внутренней
модели БД:

- создавать и сортировать группы фильтров;
- создавать facets по источникам `PRICE`, `TAG`, `FEATURE`, `OPTION`,
  `IN_STOCK`;
- настраивать label, slug, UI type, selection mode, группу, порядок, видимость
  и SEO-флаг;
- управлять значениями для `TAG`, `FEATURE`, `OPTION`;
- группировать несколько source handles в одно публичное значение;
- назначать swatches для значений;
- видеть, какие facets вычисляемые и не имеют ручных значений;
- не смешивать эту страницу с `FilterWidget` таблиц админки.

## Место в навигации

Рекомендуемое расположение: `Inventory -> Facets`.

URL:

```text
/:orgName/:storeName/inventory/facets
```

Модуль:

```text
admin/src/domains/inventory/facets/
  page/
  components/
  modals/
  graphql/
  hooks/
  mappers/
```

Страница использует `DataLayout`, `AgGrid`/`DataTable`, `ModalStack` и generated
GraphQL types из `@/graphql/types`. Facets API вызывается через
`catalogQuery.facets`, `catalogQuery.facetGroups`, `catalogQuery.facetValues`,
`catalogQuery.facetSwatches` и `catalogMutation.facet*`.

## Информационная архитектура

Основной экран состоит из четырех рабочих областей:

1. `Facets` - список всех фильтров, сгруппированный по `FacetGroup`.
2. `Groups` - редактор layout-блоков витринного фильтра: название блока,
   порядок блоков, collapsed state и распределение уже созданных facets по
   группам.
3. `Swatches` - библиотека цветовых, градиентных и image-маркеров.
4. `Preview` - read-only предпросмотр того, как фильтры выглядят для витрины.

`Facets` остается главной вкладкой для настройки поведения фильтров. `Groups`
не дублирует список filters: это отдельный structural editor, похожий на
настройку секций sidebar в storefront. В нем админ работает с группами как с
контейнерами, а facets внутри групп отображаются компактными элементами без
редактирования их бизнес-логики.

## Главная страница

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Inventory / Facets                                             [Create facet]│
│ Manage storefront filters shown in category and search listings              │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Facets] [Groups] [Swatches] [Preview]                 Search facets... [⚙] │
├──────────────────────────────────────────────────────────────────────────────┤
│ Status: 12 facets · 4 groups · 38 values · 9 swatches                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Group: Main filters                                      [Edit] [Add facet] │
│ ┌─drag─┬─────────────┬─────────┬──────────┬───────────┬────────┬──────────┐ │
│ │  ⋮⋮  │ Label       │ Source  │ UI       │ Values    │ Status │ Actions  │ │
│ ├──────┼─────────────┼─────────┼──────────┼───────────┼────────┼──────────┤ │
│ │  ⋮⋮  │ Price       │ PRICE   │ RANGE    │ Automatic │ Active │ ⋯        │ │
│ │  ⋮⋮  │ Availability│ IN_STOCK│ BOOLEAN  │ Automatic │ Active │ ⋯        │ │
│ │  ⋮⋮  │ Color       │ OPTION  │ CHECKBOX │ 12 values │ Active │ ⋯        │ │
│ │  ⋮⋮  │ Brand       │ TAG     │ DROPDOWN │ 24 values │ Active │ ⋯        │ │
│ └──────┴─────────────┴─────────┴──────────┴───────────┴────────┴──────────┘ │
│                                                                              │
│ Group: Product details                                  [Edit] [Add facet] │
│ ┌─drag─┬─────────────┬─────────┬──────────┬───────────┬────────┬──────────┐ │
│ │  ⋮⋮  │ Size        │ OPTION  │ RADIO    │ 8 values  │ Active │ ⋯        │ │
│ │  ⋮⋮  │ Material    │ FEATURE │ CHECKBOX │ 5 values  │ Active │ ⋯        │ │
│ └──────┴─────────────┴─────────┴──────────┴───────────┴────────┴──────────┘ │
│                                                                              │
│ Ungrouped                                                [Add facet]        │
│ ┌─drag─┬─────────────┬─────────┬──────────┬───────────┬────────┬──────────┐ │
│ │  ⋮⋮  │ Sale        │ TAG     │ CHECKBOX │ 3 values  │ Active │ ⋯        │ │
│ └──────┴─────────────┴─────────┴──────────┴───────────┴────────┴──────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Поведение основной страницы

- Строка facet открывает drawer деталей.
- Drag handle меняет `sortIndex` внутри группы.
- Перетаскивание facet между группами меняет `groupId` и `sortIndex`.
- `Ungrouped` показывает facets с `groupId = null`.
- В колонке `Values` для `PRICE` и `IN_STOCK` всегда отображается `Automatic`.
- Для дискретных facets показывается количество enabled/total values.
- Кнопка `Create facet` открывает modal создания.
- `Add facet` в группе открывает тот же modal, но preselect `groupId`.
- Row actions: `Edit`, `Manage values`, `Duplicate`, `Delete`.
- `Manage values` disabled для `PRICE` и `IN_STOCK`.

## Вкладка Groups

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Groups                                                       [Create group] │
│ Arrange storefront filter sections and assign facets to them                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ Unassigned facets: [Sale TAG] [Vendor TAG]                    [Assign all] │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⋮⋮ Main filters                                      Expanded by default  ⋯ │
│    Storefront order: 10                                                     │
│    ┌────────────────────────────────────────────────────────────────────┐    │
│    │ [Price PRICE] [Availability IN_STOCK] [Color OPTION] [Brand TAG]   │    │
│    └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ ⋮⋮ Product details                                  Collapsed by default  ⋯ │
│    Storefront order: 20                                                     │
│    ┌────────────────────────────────────────────────────────────────────┐    │
│    │ [Size OPTION] [Material FEATURE]                         [+ Add]   │    │
│    └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ ⋮⋮ Merchandising                                    Expanded by default  ⋯ │
│    Storefront order: 30                                                     │
│    ┌────────────────────────────────────────────────────────────────────┐    │
│    │ Drop facets here                                           [+ Add] │    │
│    └────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

Отличие от вкладки `Facets`: здесь не редактируются `facetType`, `uiType`,
`selectionMode`, values и source handles. Вкладка отвечает только за storefront
layout:

- создать/переименовать группу;
- изменить порядок групп через drag handle или `Move up/down`;
- переключить `collapsed` как default state группы на витрине;
- назначить существующий facet в группу;
- вынести facet в `Unassigned`;
- быстро увидеть состав каждой группы.

`collapsed` трактуется как storefront default state группы. Удаление группы
должно предлагать только layout-safe сценарий: удалить группу и переместить ее
facets в `Unassigned`. Удаление самих facets из этой вкладки недоступно, чтобы
не смешивать управление контейнерами и управление фильтрами.

## Вкладка Swatches

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Swatches                                                   [Create swatch] │
├──────────────────────────────────────────────────────────────────────────────┤
│ Type: [All v]                                      Search swatches...       │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────┬──────────┬────────────────────────┬────────────┬──────────┐ │
│ │ Preview    │ Type     │ Value                  │ Used by    │ Actions  │ │
│ ├────────────┼──────────┼────────────────────────┼────────────┼──────────┤ │
│ │ ● #D92D20  │ COLOR    │ colorOne #D92D20       │ Red        │ Edit ⋯   │ │
│ │ ◐ blue/red │ GRADIENT │ #1D4ED8 -> #DC2626     │ Team color │ Edit ⋯   │ │
│ │ ▣ image    │ IMAGE    │ file: swatch-red.png   │ Pattern    │ Edit ⋯   │ │
│ └────────────┴──────────┴────────────────────────┴────────────┴──────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Swatch library нужна потому, что `FacetSwatch` является отдельной сущностью и
может переиспользоваться разными `FacetValue`. В value editor также должен быть
inline path: создать swatch без ухода со страницы значения.

## Вкладка Preview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Preview                                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Device: [Desktop] [Mobile]                 Category: [All products v]       │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────┐ ┌─────────────────────────────────────────┐ │
│ │ Filters                      │ │ Notes                                   │ │
│ │ Main filters                 │ │ Counts are not connected in Admin API   │ │
│ │  Price        [──────]       │ │ yet. This preview validates structure,  │ │
│ │  In stock     [x] Available  │ │ labels, order, UI type, and swatches.  │ │
│ │  Color        □ Red ●        │ │                                         │ │
│ │               □ Blue ●       │ │ Future: use listing facets endpoint.   │ │
│ │ Product details              │ │                                         │ │
│ │  Size         ○ S ○ M ○ L    │ │                                         │ │
│ └──────────────────────────────┘ └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Preview на первом этапе read-only и строится из admin configuration. Counts не
нужно имитировать, пока listing facets не подключены в API.

## Create facet modal

```text
┌────────────────────────────────────────────────────────────┐
│ Create facet                                           [×] │
├────────────────────────────────────────────────────────────┤
│ Source                                                     │
│ [PRICE] [TAG] [FEATURE] [OPTION] [IN_STOCK]                │
│                                                            │
│ Label *                                                    │
│ [ Color                                              ]     │
│ Slug *                                                     │
│ [ color                                              ]     │
│                                                            │
│ Display                                                    │
│ UI type *              Selection mode                      │
│ [CHECKBOX v]           [MULTI v]                           │
│                                                            │
│ Organization                                               │
│ Group                  Sort index                          │
│ [Main filters v]       [30]                                │
│                                                            │
│ [Cancel]                                      [Create]     │
└────────────────────────────────────────────────────────────┘
```

### Динамические правила modal

Допустимые `uiType` зависят от `facetType`:

| Facet type | UI types |
| --- | --- |
| `PRICE` | `RANGE`, `CHECKBOX`, `RADIO`, `DROPDOWN` |
| `TAG` | `CHECKBOX`, `RADIO`, `DROPDOWN` |
| `FEATURE` | `CHECKBOX`, `RADIO`, `DROPDOWN` |
| `OPTION` | `CHECKBOX`, `RADIO`, `DROPDOWN` |
| `IN_STOCK` | `BOOLEAN`, `CHECKBOX`, `RADIO`, `DROPDOWN` |

`selectionMode`:

- `SINGLE` доступен для `RADIO`, `DROPDOWN`, `BOOLEAN`;
- `MULTI` доступен для `CHECKBOX` и может быть доступен для `DROPDOWN`;
- для `PRICE` с `RANGE` selection mode визуально скрывается или фиксируется
  backend default, чтобы не создавать ложный UX.

После создания:

- для `TAG`, `FEATURE`, `OPTION` открыть drawer facet на вкладке `Values`;
- для `PRICE`, `IN_STOCK` открыть drawer на вкладке `Settings`.

## Facet details drawer

```text
┌──────────────────────────────────────────────────────────────────┐
│ Color                                                [Save] [⋯]  │
│ OPTION · CHECKBOX · MULTI · slug: color                         │
├──────────────────────────────────────────────────────────────────┤
│ [Settings] [Values] [Visibility] [Preview]                       │
├──────────────────────────────────────────────────────────────────┤
│ Settings                                                         │
│ Label *                  Slug *                                  │
│ [Color             ]     [color                            ]     │
│                                                                  │
│ Source                  UI type              Selection mode       │
│ [OPTION disabled]       [CHECKBOX v]         [MULTI v]           │
│                                                                  │
│ Group                   Sort index                               │
│ [Main filters v]        [30]                                     │
│                                                                  │
│ Value sort              Max visible values                       │
│ [CUSTOM v]              [8]                                      │
│                                                                  │
│ Minimum values          Indexable                                │
│ [1]                     [x] Include in future SEO config         │
└──────────────────────────────────────────────────────────────────┘
```

`facetType` после создания не редактируется. Смена источника меняет смысл
source handles и должна выполняться через создание нового facet.

### Вкладка Values

Для `TAG`, `FEATURE`, `OPTION`:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Values                                                       [Create value] │
├──────────────────────────────────────────────────────────────────────────────┤
│ Search values...                         Sort: [Custom v]  Show: [All v]   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌─drag─┬──────────┬────────────┬────────────────────────────┬──────┬─────┐ │
│ │ ⋮⋮   │ Value    │ Swatch     │ Source handles             │ On   │ ⋯   │ │
│ ├──────┼──────────┼────────────┼────────────────────────────┼──────┼─────┤ │
│ │ ⋮⋮   │ Red      │ ● #D92D20  │ red, dark-red, wine-red    │ ✓    │ ⋯   │ │
│ │ ⋮⋮   │ Blue     │ ● #2563EB  │ blue, navy                 │ ✓    │ ⋯   │ │
│ │ ⋮⋮   │ Burgundy │ -          │ burgundy                   │ off  │ ⋯   │ │
│ └──────┴──────────┴────────────┴────────────────────────────┴──────┴─────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Для `PRICE` и `IN_STOCK`:

```text
┌────────────────────────────────────────────────────────────┐
│ Values                                                     │
├────────────────────────────────────────────────────────────┤
│ This facet is calculated automatically.                    │
│ Manual values are not available for PRICE and IN_STOCK.    │
│                                                            │
│ PRICE returns price range and count.                       │
│ IN_STOCK returns availability count.                       │
└────────────────────────────────────────────────────────────┘
```

### Вкладка Visibility

```text
┌────────────────────────────────────────────────────────────┐
│ Visibility                                                 │
├────────────────────────────────────────────────────────────┤
│ Minimum relevant values                                    │
│ [1]                                                        │
│ Hide facet when fewer values are available in listing.     │
│                                                            │
│ Max visible values                                         │
│ [8]                                                        │
│ 0 means no limit. Storefront can show "Show more".         │
│                                                            │
│ Value sorting                                              │
│ [COUNT] [ALPHA] [CUSTOM]                                   │
│                                                            │
│ Indexable                                                  │
│ [x] Mark selected URLs as eligible for future SEO rules    │
└────────────────────────────────────────────────────────────┘
```

### Вкладка Preview в drawer

```text
┌────────────────────────────────────────────────────────────┐
│ Preview: Color                                             │
├────────────────────────────────────────────────────────────┤
│ CHECKBOX · MULTI                                           │
│                                                            │
│ □ Red        ●                                             │
│ □ Blue       ●                                             │
│ □ Burgundy   -                                             │
│                                                            │
│ maxValuesVisible: 8 · valueSort: CUSTOM                    │
└────────────────────────────────────────────────────────────┘
```

## Create/edit value modal

```text
┌────────────────────────────────────────────────────────────┐
│ Create value for Color                                 [×] │
├────────────────────────────────────────────────────────────┤
│ Label *                                                    │
│ [Red                                                ]      │
│ Slug *                                                     │
│ [red                                                ]      │
│                                                            │
│ Source handles *                                           │
│ [ red x ] [ dark-red x ] [ wine-red x ] [Search source...] │
│                                                            │
│ Swatch                                                     │
│ [● Red swatch v]                         [Create swatch]  │
│                                                            │
│ Sort index                                                 │
│ [10]                                                       │
│                                                            │
│ Enabled                                                    │
│ [x] Show this value on storefront                          │
│                                                            │
│ [Cancel]                                      [Create]     │
└────────────────────────────────────────────────────────────┘
```

### Source handle picker

Picker зависит от типа parent facet:

- `TAG` ищет tag handles;
- `FEATURE` ищет feature slugs;
- `OPTION` ищет option value slugs.

UX:

- multi-select с chips;
- быстрый поиск по label/slug/handle;
- предупреждение, если source handle уже используется в другом value этого
  facet или в другом facet того же `facetType`;
- возможность вставить handle вручную, если backend/source entity уже известен,
  но отдельный picker еще не реализован;
- пустой `sourceHandles` запрещен для `TAG`, `FEATURE`, `OPTION`.

```text
┌──────────────────────────────────────────────┐
│ Search source handles                         │
├──────────────────────────────────────────────┤
│ [red] Red                                     │
│       option value slug: red                  │
│ [dark-red] Dark red                           │
│       option value slug: dark-red             │
│ [wine-red] Wine red                           │
│       option value slug: wine-red             │
│                                              │
│ Already used                                  │
│ [burgundy] Burgundy - used by "Burgundy"      │
└──────────────────────────────────────────────┘
```

## Create/edit swatch modal

```text
┌────────────────────────────────────────────────────────────┐
│ Create swatch                                          [×] │
├────────────────────────────────────────────────────────────┤
│ Type                                                       │
│ [COLOR] [GRADIENT] [IMAGE]                                │
│                                                            │
│ COLOR                                                      │
│ Color                                                      │
│ [#D92D20]                                                  │
│                                                            │
│ GRADIENT                                                   │
│ Color one                  Color two                       │
│ [#1D4ED8]                  [#DC2626]                       │
│                                                            │
│ IMAGE                                                      │
│ Image                                                      │
│ [Select from media library]                                │
│                                                            │
│ Metadata                                                   │
│ [{ "name": "red" }]                                        │
│                                                            │
│ Preview                                                    │
│ ● / ◐ / ▣                                                  │
│                                                            │
│ [Cancel]                                      [Create]     │
└────────────────────────────────────────────────────────────┘
```

Правила:

- `COLOR`: нужен `colorOne`;
- `GRADIENT`: нужны `colorOne` и `colorTwo`;
- `IMAGE`: нужен `fileId`;
- metadata редактируется как advanced JSON поле, свернуто по умолчанию.

## Delete confirmations

### Delete facet

```text
┌──────────────────────────────────────────────┐
│ Delete facet "Color"?                         │
├──────────────────────────────────────────────┤
│ This removes the storefront filter and all    │
│ configured public values for this facet.      │
│ Product data, tags, features and options are  │
│ not deleted.                                  │
│                                              │
│ [Cancel]                         [Delete]    │
└──────────────────────────────────────────────┘
```

### Delete value

```text
┌──────────────────────────────────────────────┐
│ Delete value "Red"?                           │
├──────────────────────────────────────────────┤
│ Source handles red, dark-red and wine-red     │
│ will become available for mapping again.      │
│                                              │
│ [Cancel]                         [Delete]    │
└──────────────────────────────────────────────┘
```

### Delete swatch

```text
┌──────────────────────────────────────────────┐
│ Delete swatch?                                │
├──────────────────────────────────────────────┤
│ Values using this swatch will lose their      │
│ visual marker. Labels and source handles stay │
│ unchanged.                                    │
│                                              │
│ [Cancel]                         [Delete]    │
└──────────────────────────────────────────────┘
```

## Empty states

### No facets

```text
┌──────────────────────────────────────────────┐
│ No storefront filters yet                     │
│ Create price, availability, tag, feature or   │
│ option facets to control listing filters.     │
│                                              │
│ [Create facet]                                │
└──────────────────────────────────────────────┘
```

### No values in discrete facet

```text
┌──────────────────────────────────────────────┐
│ No values configured                          │
│ Add public values and map them to source      │
│ handles from catalog data.                    │
│                                              │
│ [Create value]                                │
└──────────────────────────────────────────────┘
```

### No swatches

```text
┌──────────────────────────────────────────────┐
│ No swatches                                   │
│ Create color, gradient or image swatches for  │
│ visual filter values such as colors.          │
│                                              │
│ [Create swatch]                               │
└──────────────────────────────────────────────┘
```

## Validation and user errors

Frontend validation mirrors backend rules but does not replace backend
`userErrors`.

Facet:

- `label` required;
- `slug` required and valid slug;
- `facetType` required on create and immutable after create;
- `uiType` must be valid for selected `facetType`;
- `groupId` nullable;
- `minValues >= 0`;
- `maxValuesVisible >= 0`, где `0` означает no limit;
- `sortIndex >= 0`;
- duplicate slug показывается как form error.

Facet value:

- allowed only for `TAG`, `FEATURE`, `OPTION`;
- `label` required;
- `slug` required and valid slug;
- `sourceHandles` required and non-empty;
- `sourceHandles` must be unique by backend constraints;
- `swatchId` nullable;
- `enabled` defaults to true.

Facet swatch:

- `swatchType` required;
- `COLOR` requires `colorOne`;
- `GRADIENT` requires `colorOne` and `colorTwo`;
- `IMAGE` requires `fileId`.

## Component breakdown

```text
facets/page/facets-page.tsx
facets/components/facet-groups-board.tsx
facets/components/facet-row-actions.tsx
facets/components/facet-status-tag.tsx
facets/components/facet-values-table.tsx
facets/components/facet-preview.tsx
facets/components/swatch-preview.tsx
facets/components/source-handle-picker.tsx
facets/modals/facet-create-modal/
facets/modals/facet-details-drawer/
facets/modals/facet-value-modal/
facets/modals/facet-group-modal/
facets/modals/facet-swatch-modal/
facets/modals/delete-confirmation-modal/
```

Hooks:

```text
use-facets.ts
use-facet-groups.ts
use-facet-values.ts
use-facet-swatches.ts
use-create-facet.ts
use-update-facet.ts
use-delete-facet.ts
use-create-facet-value.ts
use-update-facet-value.ts
use-delete-facet-value.ts
use-create-facet-group.ts
use-update-facet-group.ts
use-delete-facet-group.ts
use-create-facet-swatch.ts
use-update-facet-swatch.ts
use-delete-facet-swatch.ts
```

Mappers:

```text
facet-input.mapper.ts
facet-value-input.mapper.ts
facet-group-input.mapper.ts
facet-swatch-input.mapper.ts
facet-errors.mapper.ts
```

## GraphQL operation shape

Fragments должны быть small and screen-oriented:

```graphql
fragment FacetListItemFields on Facet {
  id
  label
  slug
  facetType
  uiType
  selectionMode
  sortIndex
  minValues
  maxValuesVisible
  valueSort
  indexable
  values {
    id
    enabled
  }
  group {
    id
    name
    sortIndex
    collapsed
  }
}
```

Для drawer:

```graphql
fragment FacetDetailsFields on Facet {
  id
  label
  slug
  facetType
  uiType
  selectionMode
  sortIndex
  minValues
  maxValuesVisible
  valueSort
  indexable
  values {
    id
    label
    slug
    sourceHandles
    sortIndex
    enabled
    swatch {
      id
      swatchType
      colorOne
      colorTwo
      file {
        id
        url
        altText
        originalName
      }
    }
  }
  group {
    id
    name
    collapsed
  }
}
```

Mutation hooks должны возвращать `userErrors` и после успешных create/update/delete
обновлять `facetGroups`, `facets`, `facetValues` или `facetSwatches` через
`refetchQueries` на первом этапе. `cache.modify` можно добавить позже, когда
стабилизируется список и порядок.

## Состояния loading/error

- Page loading: skeleton строк групп и facets.
- Drawer loading: skeleton формы и таблицы values.
- Mutation loading: кнопка save/delete в loading state, поля не блокируются
  полностью, кроме destructive action.
- API `userErrors`: показывать inline form errors и `App.message.error` только
  для ошибок без field.
- Network/runtime error: `Alert` в верхней части текущей вкладки.

## Accessibility and keyboard

- Все icon-only actions имеют tooltip и accessible label.
- Drag ordering имеет альтернативу через action menu: `Move up`, `Move down`,
  `Move to group`.
- Таблицы поддерживают row click, но action buttons не должны открывать drawer.
- Modal submit доступен через Enter только когда фокус не находится в chips/json
  editor.
- Color inputs имеют текстовое hex поле рядом с picker.

## Приоритеты реализации

### Phase 1

- Основная вкладка `Facets`;
- CRUD groups;
- CRUD facets;
- drawer settings;
- values table and value modal for `TAG`, `FEATURE`, `OPTION`;
- disabled automatic values state for `PRICE`, `IN_STOCK`;
- swatch CRUD with color/gradient/image;
- basic preview without counts.

### Phase 2

- Drag-and-drop reorder with persisted `sortIndex`;
- source handle picker connected to real tag/feature/option queries;
- conflict warnings for already mapped source handles;
- duplicate facet/value action;
- mobile preview.

### Phase 3

- Listing API counts preview;
- bulk value import from source handles;
- localization UI for translation tables;
- SEO/indexable rules editor when backend contract exists.
