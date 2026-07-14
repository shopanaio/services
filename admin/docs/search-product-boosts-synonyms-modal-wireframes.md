# Product Boosts и Search Synonym Groups: Modal Stack UI, UX и API

## Цель

Спроектировать модалки создания и редактирования:

- `Product boost` — связывает поисковые фразы с товарами, которые нужно поднимать в выдаче;
- `Search synonym group` — объединяет равнозначные поисковые формулировки для одной локали.

Модалки должны использовать существующий Admin UI layout `Modal Stack`, работать с текущим GraphQL-контрактом listing/search и одинаково предсказуемо вести себя в create/edit режимах.

Документ опирается на:

- `admin/src/layouts/modals`;
- `admin/src/shared/components/entity-picker-modal/product-picker-modal.tsx`;
- `admin/src/domains/discovery/search/product-boosts`;
- `admin/src/domains/discovery/search/synonyms`;
- `services/listing/src/api/graphql-admin/schema/search.graphql`;
- `knowledge/vault/patterns/admin-graphql-layer.md`.

## Общие UX-принципы

1. Для каждой сущности используется одна форма с режимом `create | edit`, чтобы поля, валидация и API mapping не расходились.
2. Основная модалка открывается из страницы списка. Клик по строке открывает edit, primary action страницы — create.
3. Header всегда остаётся видимым. В нём находятся закрытие, заголовок и единственное primary-действие `Create` или `Save`.
4. Тело скроллится независимо от header. Контент следует стандартной ширине `ModalLayout` (`max-width: 800px`).
5. Поля сгруппированы в `Paper`-секции. Обязательные настройки видны сразу, без вкладок и скрытых accordion-блоков.
6. Списки фраз и синонимов редактируются как упорядоченные строки, а не как свободный comma-separated текст. Так проще показать ошибку конкретного элемента и не терять пользовательскую пунктуацию.
7. `enabled` доступен при создании и редактировании. Значение по умолчанию для новой сущности — `true`, но пользователь видит и контролирует его до сохранения.
8. Изменение формы вызывает `setDirty(true)`. Закрытие через `×`, `Esc` или возврат по стеку показывает стандартное подтверждение Modal Stack.
9. Во время submit поля не очищаются и модалка не закрывается. Кнопка показывает loading и блокирует повторную отправку.
10. API validation errors показываются возле соответствующих полей; общий или сетевой error — в `Alert` над первой секцией. Ошибка не должна уничтожать draft.

## Modal Stack

### Типы и payload

```ts
type SearchConfigurationModalMode = "create" | "edit";

interface IProductBoostModalPayload extends IModalStackPayload {
  mode: SearchConfigurationModalMode;
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
}

interface ISynonymGroupModalPayload extends IModalStackPayload {
  mode: SearchConfigurationModalMode;
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
}
```

Рекомендуемые registered types:

```text
search-product-boost
search-synonym-group
```

Обе definitions используют:

```ts
{
  confirmOnDirtyClose: true,
  closeConfirmMessage: "Discard unsaved changes?",
}
```

`entityId` обязателен только в edit mode. Нельзя передавать весь объект строки как источник истины: данные могли измениться после загрузки списка.

### Стек для Product boost

```text
Product boosts page
└── Product boost modal       level 0
    └── Product picker modal  level 1
```

`Product picker` открывается через существующий Modal Stack type и получает:

```ts
{
  selectionMode: "multi",
  initialSelection: products.map((product) => product.id),
  maxSelection: 50,
  onConfirm: (entities, ids) => mergeSelectedProducts(entities, ids),
}
```

После confirm picker закрывается, а родительская форма остаётся открытой и dirty. Отмена picker не меняет draft родительской формы.

### Открытие с list pages

- Product boosts: primary action `Create product boost`; row click — edit выбранного boost.
- Synonyms: primary action `Create synonym group`; row click — edit выбранной группы.
- После успешного сохранения вызывается `payload.onSaved` или refetch соответствующего connection query.
- Пока edit modal открывается, строковые данные из grid можно использовать только для skeleton title; форма заполняется detail query.

## Product Boost Modal

### Основной wireframe

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  New product boost                                      [Create]       │
│    / Edit product boost                                    [Save]         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [API error alert — only when present]                                   │
│                                                                          │
│  ┌─ General ───────────────────────────────────────────────────────────┐  │
│  │ Name *                           Locale *                           │  │
│  │ [Summer footwear____________]    [English (en)_______________⌄]   │  │
│  │                                                                    │  │
│  │ Status                                                             │  │
│  │ [● Enabled]  Apply this boost in storefront search                 │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Trigger phrases ───────────────────────────────────────────────────┐  │
│  │ Search queries that activate this boost.          2 / 20           │  │
│  │                                                                    │  │
│  │  1  [summer shoes____________________________________] [remove]   │  │
│  │  2  [shoes for summer________________________________] [remove]   │  │
│  │                                                                    │  │
│  │  [+ Add phrase]                                                     │  │
│  │  Inline error for row 2                                             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Boosted products ──────────────────────────────────────────────────┐  │
│  │ Products shown higher for matching queries.           3 / 50      │  │
│  │                                                                    │  │
│  │  AG Grid                                                           │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ Product                              Status       Actions    │  │  │
│  │  ├──────────────────────────────────────────────────────────────┤  │  │
│  │  │ [img] Linen sneakers                 Active       [Remove]  │  │  │
│  │  │ [img] Canvas low tops                Draft        [Remove]  │  │  │
│  │  │ [img] Leather sandals                Active       [Remove]  │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  [+ Select products]                                                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Секции и controls

| Поле | Control | Правило |
|---|---|---|
| `name` | `Input`, maxLength 128, character counter near limit | После trim от 1 до 128 Unicode code points. Это внутреннее понятное название, не поисковая фраза. |
| `locale` | searchable `Select` | Только локали текущего store, для которых search доступен. Показывать label и code. |
| `enabled` | `Switch` | Default `true`. Disabled boost хранится, но не применяется в storefront search. |
| `phrases` | ordered repeatable inputs | От 1 до 20. Пустые строки не отправлять; duplicate после normalization должен быть подсвечен. |
| `products` | AG Grid selected-products table + nested picker | Read model приходит как `Product[]`; при записи mapper отправляет от 1 до 50 уникальных Product global IDs. |

Кнопка `Create/Save` disabled, если:

- detail/settings data ещё загружаются;
- search settings не инициализированы;
- submit выполняется;
- форма невалидна;
- edit form не изменена.

В create mode одна пустая строка phrase добавлена заранее. `Enter` в последней заполненной строке добавляет следующую; `Backspace` в пустой строке удаляет её, если остаётся хотя бы одна строка. Drag-and-drop не требуется: порядок сохраняется сверху вниз и может изменяться кнопками move up/down, доступными с клавиатуры.

### AG Grid выбранных товаров

Секция `Boosted products` в основной модалке является таблицей и должна использовать существующий Admin UI AG Grid setup (`AgGridReact`, `useAgGridTheme`, зарегистрированные community modules), а не самодельный список строк.

Колонки:

| Column | Содержимое | Поведение |
|---|---|---|
| `Product` | thumbnail, title; fallback `Unavailable product` + ID | `flex: 1`, не sortable |
| `Status` | существующий product status renderer | фиксированная ширина, не sortable |
| `Actions` | icon/button `Remove` | фиксированная ширина, keyboard accessible |

Таблица локальная: в edit mode её `rowData` сразу строится из `SearchProductBoost.products`, полученных тем же detail query. Отдельный запрос в catalog для заполнения таблицы запрещён. Внутри основной modal таблице не нужны pagination, filters, row selection и server-side sorting. Порядок строк соответствует массиву `products`; удаление строки сразу обновляет form field и dirty state.

После работы с picker выбранные `IPickableEntity` объединяются с уже загруженными `ApiProduct` по `id`, а порядок восстанавливается по `ids` из `onConfirm`. Для таблицы достаточно полей, возвращаемых boost detail query и picker: `id`, `title`, thumbnail и publish status. GraphQL mapper при submit преобразует актуальный selection в `productIds: products.map(({ id }) => id)`.

Высота ограничивается контентом до разумного максимума, после чего scroll происходит внутри grid. У grid должны быть стабильный `getRowId`, стандартная modal row height и `data-testid="product-boost-selected-products-grid"`. Empty state внутри секции сообщает `No products selected` и оставляет рядом primary contextual action `Select products`.

`Trigger phrases` не являются таблицей: это `react-hook-form` field array с inline validation и keyboard behavior. Поэтому AG Grid для phrases не используется.

### Empty и loading states

Edit mode загружает одновременно:

- `listingQuery.search.productBoost(id)`;
- `listingQuery.search.settings`.

Товары запрашиваются вложенным полем `productBoost.products` в этом же GraphQL operation. Дополнительный `catalogQuery.products(where: { id: ... })` не нужен.

До завершения detail query показывается skeleton той же структуры. Если boost не найден, показать `Result`/`Alert` с `Product boost not found` и action `Close`; форму не показывать.

Если Product недоступен для текущего federated read, API определяет поведение поля `productBoost.products`. UI не должен выполнять второй запрос для попытки восстановить отсутствующую сущность. При расхождении `productsCount` и фактически полученных строк показывается общий data warning и Save блокируется, чтобы не превратить сохранение в неявное удаление товара.

### Product picker wireframe

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  Select products                                      [Confirm (3)]   │
├──────────────────────────────────────────────────────────────────────────┤
│ [Search products...] [Filters]                                           │
│                                                                          │
│ [✓] Product                         Status                               │
│ [✓] Linen sneakers                  Active                               │
│ [ ]  Trail runner                    Active                               │
│ [✓] Canvas low tops                 Draft                                │
│                                                                          │
│ 1–20 of 184                                      [Prev] [Next]           │
└──────────────────────────────────────────────────────────────────────────┘
```

Используется существующий `ProductPickerModal`; отдельный picker для search не создаётся. `initialSelection` обязан сохраняться между страницами picker. При достижении 50 выбранных товаров остальные checkbox disabled с объясняющим tooltip.

Сам существующий `ProductPickerModal` также рендерит каталог через AG Grid. Таким образом, Product Boost flow использует два grid-контекста: локальную таблицу уже выбранных товаров в основной modal и существующую pageable/selectable AG Grid таблицу во вложенном picker.

## Search Synonym Group Modal

### Основной wireframe

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ×  New synonym group                                      [Create]       │
│    / Edit synonym group                                    [Save]         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [API error alert — only when present]                                   │
│                                                                          │
│  ┌─ General ───────────────────────────────────────────────────────────┐  │
│  │ Name *                           Locale *                           │  │
│  │ [Sneakers terminology_______]    [English (en)_______________⌄]   │  │
│  │                                                                    │  │
│  │ Status                                                             │  │
│  │ [● Enabled]  Expand matching queries with this group               │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Synonyms ──────────────────────────────────────────────────────────┐  │
│  │ Add terms or phrases with the same meaning.          3 / 20       │  │
│  │                                                                    │  │
│  │  AG Grid                                                           │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ ↕  #   Synonym                                  Actions     │  │  │
│  │  ├──────────────────────────────────────────────────────────────┤  │  │
│  │  │ ↕  1   [sneakers____________________________]   [Remove]    │  │  │
│  │  │ ↕  2   [trainers____________________________]   [Remove]    │  │  │
│  │  │ ↕  3   [running shoes________________________]   [Remove]    │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  [+ Add synonym]                                                    │  │
│  │                                                                    │  │
│  │  Preview: sneakers ↔ trainers ↔ running shoes                       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Секции и controls

| Поле | Control | Правило |
|---|---|---|
| `name` | `Input`, maxLength 128 | После trim от 1 до 128 Unicode code points; служебное название группы. |
| `locale` | searchable `Select` | Определяет normalization profile и область конфликтов. |
| `enabled` | `Switch` | Default `true`. Только enabled group claims synonym values. |
| `values` | editable AG Grid | От 2 до 20 уникальных после normalization значений. Не более 8 searchable tokens в одном value. |

В create mode AG Grid сразу содержит две пустые editable строки. Удаление disabled, когда осталось две строки. Preview появляется после двух валидных непустых значений и объясняет симметричность группы; не должно быть UI для directional synonyms, потому что API такой модели не поддерживает.

### Editable AG Grid синонимов

Секция `Synonyms` должна использовать AG Grid из Admin UI (`AgGridReact`, `useAgGridTheme`, community modules). Это локальный editable grid без server-side pagination, filters и sorting.

Колонки:

| Column | Содержимое | Поведение |
|---|---|---|
| row drag | drag handle | переставляет значения и обновляет их array order |
| `#` | позиция `1..n` | вычисляемая, read-only, узкая колонка |
| `Synonym` | editable text cell | custom cell editor/renderer с inline validation state |
| `Actions` | `Remove` | disabled, если в grid осталось две строки |

Form draft остаётся источником истины. Для строк используются стабильные локальные UUID, а не array index; `getRowId` возвращает этот UUID. `onCellValueChanged`, `onRowDragEnd`, `Add synonym` и `Remove` синхронно обновляют `react-hook-form` values и dirty state. Перед GraphQL mapping локальные UUID удаляются, а `values` формируется в текущем порядке строк.

Ошибки API вида `values.<index>` отображаются на соответствующей строке и в custom `Synonym` cell renderer. После reorder client validation пересчитывается; API error от предыдущего submit очищается, потому что его index больше не относится к прежней строке.

Grid имеет `data-testid="synonym-group-values-grid"`, keyboard cell editing, `Enter` для commit и добавления следующей строки из последней заполненной строки, а также ограниченную высоту с внутренним scroll после достижения максимума. Empty state невозможен из-за minimum 2 rows.

Если enabled group конфликтует с другой активной группой той же локали, API возвращает `SYNONYM_CONFLICT`. Форма сохраняет введённые значения, секция получает error state, а сообщение объясняет, что хотя бы одно нормализованное значение уже используется. UI не должен автоматически выключать текущую или конфликтующую группу.

## Responsive behavior и accessibility

- На ширине modal content меньше 640 px `Name` и `Locale` становятся вертикальными, остальные секции не меняют порядок.
- Header action остаётся видимой; body scroll не двигает close/save.
- У каждого input есть видимый label, error связан через `aria-describedby`.
- Повторяющиеся строки имеют accessible names `Trigger phrase 1`, `Synonym 2`.
- Remove/move actions доступны кнопками, имеют tooltip и не зависят только от drag gesture.
- После добавления строки focus переходит в новый input; после удаления — в соседнюю строку.
- После ошибки submit focus переходит к первому ошибочному полю, общий `Alert` использует `role="alert"`.
- `Esc` сначала закрывает верхний picker, затем родительскую модалку по правилам dirty confirmation.

## GraphQL read integration

### Detail query для edit mode

Один query может загружать settings и нужную сущность, чтобы получить согласованную global version:

```graphql
query SearchProductBoostEditor($id: ID!) {
  listingQuery {
    search {
      settings {
        version
      }
      productBoost(id: $id) {
        id
        locale
        name
        enabled
        version
        phrases {
          phrase
          position
        }
        products {
          id
          title
          isPublished
          media {
            sortIndex
            file {
              url
              originalName
              altText
            }
          }
        }
        productsCount
        createdAt
        updatedAt
      }
    }
  }
}
```

```graphql
query SearchSynonymGroupEditor($id: ID!) {
  listingQuery {
    search {
      settings {
        version
      }
      synonymGroup(id: $id) {
        id
        locale
        name
        enabled
        version
        values {
          value
          position
        }
        createdAt
        updatedAt
      }
    }
  }
}
```

Create mode загружает как минимум:

```graphql
query SearchConfigurationEditorContext {
  listingQuery {
    search {
      settings {
        version
      }
    }
  }
}
```

`phrases` и `values` перед заполнением формы сортируются по `position`. Product Boost modal читает выбранные товары напрямую из `ApiSearchProductBoost.products`; отдельного catalog query и API-output view model для них нет. Компоненты получают `ApiSearchProductBoost`, `ApiProduct`, `ApiSearchSynonymGroup` и `ApiSearchSettings` напрямую из `@/graphql/types`.

### Инициализация search settings

`settingsUpdate` требует `expectedVersion`. Если `settings === null`, версия равна логическому `0`, но API запрещает отправлять только boost/synonym operation: при `expectedVersion: 0` обязательна также `operations.settings`.

Модалки не должны изобретать default search settings. Пока Settings page не предоставляет явный initialize flow, modal показывает blocking alert:

```text
Search settings must be configured before boosts or synonyms can be created.
[Open search settings]
```

Save disabled. После появления согласованного initialize flow можно передавать выбранные пользователем initial settings и create operation одним atomic batch.

## GraphQL write integration

### Общая мутация

```graphql
mutation SearchSettingsUpdate(
  $expectedVersion: Int!
  $operations: SearchSettingsOperationsInput!
) {
  listingMutation {
    search {
      settingsUpdate(
        expectedVersion: $expectedVersion
        operations: $operations
      ) {
        settings {
          version
          updatedAt
        }
        operationResults {
          type
          applied
          clientMutationId
          entityId
          errors {
            code
            field
            message
          }
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
}
```

Важно: `expectedVersion` — это `SearchSettings.version`, а не `productBoost.version` и не `synonymGroup.version`. Entity version можно отображать в diagnostics, но нельзя использовать для мутации текущего API.

### Product boost create

```json
{
  "expectedVersion": 12,
  "operations": {
    "productBoosts": [
      {
        "action": "CREATE",
        "clientMutationId": "<new UUID per submit>",
        "locale": "en",
        "name": "Summer footwear",
        "enabled": true,
        "phrases": ["summer shoes", "shoes for summer"],
        "productIds": ["<Product global ID>", "<Product global ID>"]
      }
    ]
  }
}
```

### Product boost update

```json
{
  "expectedVersion": 12,
  "operations": {
    "productBoosts": [
      {
        "action": "UPDATE",
        "id": "<SearchProductBoost global ID>",
        "locale": "en",
        "name": "Summer footwear",
        "enabled": true,
        "phrases": ["summer shoes", "shoes for summer"],
        "productIds": ["<Product global ID>"]
      }
    ]
  }
}
```

Create требует `clientMutationId` и запрещает `id`. Update требует `id` и запрещает `clientMutationId`. Оба действия требуют полный набор editable fields; update не является patch.

### Synonym group create

```json
{
  "expectedVersion": 12,
  "operations": {
    "synonymGroups": [
      {
        "action": "CREATE",
        "clientMutationId": "<new UUID per submit>",
        "locale": "en",
        "name": "Sneakers terminology",
        "enabled": true,
        "values": ["sneakers", "trainers", "running shoes"]
      }
    ]
  }
}
```

### Synonym group update

```json
{
  "expectedVersion": 12,
  "operations": {
    "synonymGroups": [
      {
        "action": "UPDATE",
        "id": "<SearchSynonymGroup global ID>",
        "locale": "en",
        "name": "Sneakers terminology",
        "enabled": true,
        "values": ["sneakers", "trainers", "running shoes"]
      }
    ]
  }
}
```

### Успешный результат

Submit считается успешным только когда одновременно:

- верхнеуровневый `userErrors` пуст;
- ожидаемый `operationResults[0].type` совпадает с action;
- `operationResults[0].applied === true`;
- `operationResults[0].errors` пуст.

После успеха:

1. сохранить новую `settings.version` в Apollo cache;
2. обновить list query через `refetchQueries` на первом этапе интеграции;
3. вызвать `onSaved`;
4. показать success toast;
5. сбросить dirty state и закрыть modal через `forcePop()`.

Для create `entityId` из operation result можно использовать для последующей навигации, но list row всё равно должен прийти из refetched API data.

## Validation и error mapping

### Client-side правила

Клиент повторяет только быстрые детерминированные ограничения:

| Поле | Client validation |
|---|---|
| `name` | trim, 1–128 Unicode code points |
| boost `phrases` | 1–20 непустых значений |
| boost selected products | 1–50 уникальных ID; mapper формирует API field `productIds` |
| synonym `values` | 2–20 непустых значений |

Normalization, searchable-token validation, доступность locale, существование products и cross-group conflicts остаются ответственностью API. Клиент не должен реализовывать вторую версию `SearchQueryNormalizer`.

### Mapping API fields

API может вернуть paths с batch prefix или script prefix. Error mapper нормализует оба варианта:

| API field suffix | Form target |
|---|---|
| `name` | `name` |
| `locale` | `locale` |
| `enabled` | `enabled` |
| `phrases` | секция `phrases` |
| `phrases.<index>` | `phrases[index]` |
| `productIds` | секция `products` |
| `productIds.<index>` | конкретная строка products AG Grid |
| `values` | секция `values` |
| `values.<index>` | `values[index]` |
| `expectedVersion` | global conflict alert |

Примеры возможных prefix:

```text
operations.productBoosts.0.phrases
operations.synonymGroups.0.values
input.productIds.2
input.values.1
```

### Concurrency conflict

При `VERSION_CONFLICT` форма не должна автоматически повторять update с новой версией: это может перезаписать чужое изменение другой search configuration entity.

Показать blocking alert:

```text
Search configuration changed after this form was opened.
[Reload latest data]
```

`Reload latest data` повторно загружает settings и detail entity. Если форма dirty, перед заменой draft требуется подтверждение. После reload Save снова доступен с новой global version.

## Рекомендуемая frontend-структура

```text
admin/src/domains/discovery/search/
  graphql/
    settings-fragments.ts
    settings-mutations.ts
  hooks/
    use-search-editor-context.ts
    use-update-search-settings.ts
  mappers/
    search-errors.mapper.ts
  product-boosts/
    graphql/
      fragments.ts
      queries.ts
    hooks/
      use-product-boost.ts
      use-save-product-boost.ts
    mappers/
      product-boost-form.mapper.ts
    modals/
      product-boost-modal.tsx
      schema.ts
  synonyms/
    graphql/
      fragments.ts
      queries.ts
    hooks/
      use-synonym-group.ts
      use-save-synonym-group.ts
    mappers/
      synonym-group-form.mapper.ts
    modals/
      synonym-group-modal.tsx
      schema.ts
  modals.ts
```

Hooks владеют Apollo query/mutation, loading/error state и refetch. Mappers преобразуют только form draft в `ApiSearchProductBoostOperationInput` / `ApiSearchSynonymGroupOperationInput` и API errors в form errors. Modal components не читают вложенные GraphQL payload paths напрямую.

## Acceptance criteria

- Create actions и row click открывают правильную Modal Stack modal.
- Create/edit используют одинаковую форму, но корректные title, submit label и mutation action.
- Edit всегда загружает detail entity по `entityId`, а не доверяет snapshot grid row.
- Product picker открывается вторым уровнем Modal Stack и сохраняет selection между страницами.
- Выбранные товары в основной Product Boost modal отображаются через AG Grid, не через самодельный compact list.
- Edit modal получает строки этой таблицы из `SearchProductBoost.products` в detail query и не выполняет отдельный catalog products query.
- При submit `productIds` вычисляются из текущего массива выбранных products.
- Вложенный существующий Product Picker продолжает использовать собственный pageable/selectable AG Grid.
- Synonym values редактируются в локальном editable AG Grid со стабильными row IDs, reorder и inline errors.
- Trigger phrases остаются form field array: их wireframe не является таблицей и AG Grid для них не используется.
- Boost требует 1–20 phrases и 1–50 products; synonym group — 2–20 values.
- Порядок phrases/values отображается по API `position` и отправляется порядком массива.
- Все editable fields отправляются при update.
- `expectedVersion` берётся из `SearchSettings.version`.
- Неинициализированные settings дают понятный blocking state, без неявных defaults.
- Field errors, operation errors, network errors и `VERSION_CONFLICT` имеют отдельные предсказуемые UX states.
- После успеха список обновляется API data, dirty state сбрасывается, modal закрывается.
- Все controls доступны с клавиатуры, а narrow layout не создаёт горизонтальный scroll формы.
