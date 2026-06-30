# Facets: план перехода на self-reference модель `facet_value`

## Контекст

Текущая модель facets хранит публичные значения фильтра и их связь с реальными
источниками в разных таблицах:

- `catalog.facet` - сам фильтр;
- `catalog.facet_value` - публичное значение фильтра;
- `catalog.facet_value_source_handle` - mapping публичного значения на raw source
  handles из product/variant search index.

Новая модель должна убрать отдельные source-handle таблицы. Все source values и
публичные values должны жить в `catalog.facet_value`. Группировка и custom
названия должны выражаться через `facet_value.parent_id`.

## Цели

1. Полностью удалить `catalog.facet_value_source_handle`.
2. Переименовать `facet_value.slug` в `facet_value.handle`.
3. Хранить исходные source handles как строки `facet_value.kind = 'source'`.
4. Хранить исходные i18n names source values в `facet_value_translation`.
5. Поддержать custom display values и merge/unmerge через `parent_id`.
6. Не создавать и не удалять source rows при merge/unmerge. Merge/unmerge должен
   менять только `parent_id` у source rows.
7. Перевести backend, GraphQL Admin API, listing/facet counts и docs на новую
   модель.

## Не цели

- Не менять `facet.slug`: slug самого facet остается ключом фильтра
  `facetHandle:valueHandle` или `facetSlug:valueHandle` на storefront boundary.
- Не менять raw search index формат сразу. `product_search_index.tag_handles`,
  `product_search_index.feature_slugs` и `variant_search_index.option_slugs`
  остаются источниками truth для фильтрации.
- Не добавлять отдельную group table для merged values.
- Не запускать `test` или `tsc` для проверки. По правилам проекта для
  verification использовать build, когда нужна новая версия кода.

## Термины

### Source value

`facet_value` строка с `kind = 'source'`.

Она соответствует реальному значению из каталога/search index:

- `TAG`: `handle = tag.handle`;
- `FEATURE`: `handle = feature.slug:value.slug`;
- `OPTION`: `handle = option.slug:option_value.slug`.

Translation source value хранит исходное имя source value. Например:

- `handle = color:dark-red`;
- `facet_value_translation.label = Dark red`.

Source value может быть видимым само по себе, если `parent_id IS NULL`, или
может быть скрытым child внутри display value, если `parent_id IS NOT NULL`.

### Display value

`facet_value` строка с `kind = 'display'`.

Она не является raw source handle. Это публичное значение, которое существует
для custom label, custom handle, swatch, порядка или группировки нескольких
source values.

Display value всегда root row:

```text
kind = 'display'
parent_id = NULL
```

Display value получает source handles через дочерние source values:

```text
source.parent_id = display.id
```

### Visible value

Значение, которое возвращается в admin list/storefront/listing facets.

Правило:

```sql
parent_id IS NULL
```

То есть visible values включают:

- source values без parent;
- display values.

Source values с `parent_id IS NOT NULL` не выводятся как отдельные значения.

## Пример работы модели

Facet `Color`:

```text
facet: Color

facet_value:
1. kind=source,  handle=color:red,       label=Red,       parent_id=10
2. kind=source,  handle=color:dark-red,  label=Dark red,  parent_id=10
3. kind=source,  handle=color:black,     label=Black,     parent_id=NULL
4. kind=source,  handle=color:white,     label=White,     parent_id=NULL

10. kind=display, handle=red, label=Red tones, parent_id=NULL
```

В списке фильтров выводятся:

```text
Red tones
Black
White
```

Не выводятся:

```text
color:red
color:dark-red
```

При выборе `Color = Red tones` backend фильтрует по source handles:

```text
color:red OR color:dark-red
```

При выборе `Color = Black` backend фильтрует по одному source handle:

```text
color:black
```

## Целевая DB модель

### `catalog.facet`

Остается текущей таблицей. `slug` facet не переименовывается в рамках этого
рефакторинга.

### `catalog.facet_value`

Целевая структура:

```sql
catalog.facet_value (
  id             uuid PRIMARY KEY,
  project_id     uuid NOT NULL,
  facet_id       uuid NOT NULL REFERENCES catalog.facet(id) ON DELETE CASCADE,

  parent_id      uuid NULL REFERENCES catalog.facet_value(id) ON DELETE NO ACTION,
  kind           varchar(16) NOT NULL, -- 'source' | 'display'
  handle         text NOT NULL,

  swatch_id      uuid NULL REFERENCES catalog.facet_swatch(id) ON DELETE SET NULL,
  sort_index     integer NOT NULL DEFAULT 0,
  enabled        boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
)
```

### Индексы и constraints

Обязательные:

```sql
-- source handle уникален среди source rows одного facet;
-- source и display rows могут иметь одинаковый handle
CREATE UNIQUE INDEX facet_value_source_project_facet_handle_uniq
  ON catalog.facet_value (project_id, facet_id, handle)
  WHERE kind = 'source';

-- public/root handle уникален среди visible values одного facet;
-- это сохраняет однозначность storefront token facetSlug:valueHandle
CREATE UNIQUE INDEX facet_value_root_project_facet_handle_uniq
  ON catalog.facet_value (project_id, facet_id, handle)
  WHERE parent_id IS NULL;

-- hidden child handle уникален среди hidden values одного facet;
-- root display и hidden source child могут иметь одинаковый handle
CREATE UNIQUE INDEX facet_value_child_project_facet_handle_uniq
  ON catalog.facet_value (project_id, facet_id, handle)
  WHERE parent_id IS NOT NULL;

-- быстрый вывод visible values
CREATE INDEX idx_facet_value_project_facet_visible_order
  ON catalog.facet_value (project_id, facet_id, sort_index, id)
  WHERE parent_id IS NULL;

-- быстрый lookup child source values для display value
CREATE INDEX idx_facet_value_project_parent
  ON catalog.facet_value (project_id, parent_id)
  WHERE parent_id IS NOT NULL;

-- быстрый lookup source values по source handle
CREATE INDEX idx_facet_value_project_facet_source_handle
  ON catalog.facet_value (project_id, facet_id, handle)
  WHERE kind = 'source';
```

Рекомендуемые checks:

```sql
CHECK (kind IN ('source', 'display'));
CHECK (kind <> 'display' OR parent_id IS NULL);
```

Что остается application-level validation:

- `parent_id` должен указывать на value того же `project_id` и `facet_id`;
- parent для source value должен быть `kind = 'display'`;
- display value не может быть child другого value;
- display value, который включен (`enabled = true`), должен иметь хотя бы один
  enabled source child перед публикацией/использованием в storefront;
- `PRICE` и `IN_STOCK` не должны иметь `facet_value` rows.

Причина не делать все constraints в DB: self-reference с проверкой `parent.kind`
потребует trigger или более сложные composite FK. В текущем проекте бизнес
валидации живут в scripts/repositories, поэтому этот уровень должен остаться
источником правил.

### `catalog.facet_value_translation`

Таблица остается, но поле `label` меняет смысл в зависимости от kind:

- `kind = 'source'`: исходное i18n имя source value;
- `kind = 'display'`: публичное custom имя display/group value.

Структура может остаться прежней:

```sql
catalog.facet_value_translation (
  facet_value_id uuid NOT NULL REFERENCES catalog.facet_value(id) ON DELETE CASCADE,
  locale         varchar(8) NOT NULL,
  project_id     uuid NOT NULL,
  label          text NOT NULL,
  PRIMARY KEY (facet_value_id, locale)
)
```

## Правила runtime resolution

### Storefront input

Внешний input остается строкой:

```text
facetSlug:valueHandle
```

Где:

- `facetSlug` - `facet.slug`;
- `valueHandle` - `facet_value.handle` visible value.

Можно переименовать в GraphQL/docs как `facetHandle:valueHandle` только если
параллельно переименовывается `Facet.slug`. В этом рефакторинге этого не делать.

### Resolve visible value в source handles

Алгоритм:

1. Найти facet по `project_id + facet.slug`.
2. Найти visible value по публичному handle:

```sql
SELECT fv.*
FROM catalog.facet_value fv
WHERE fv.project_id = :projectId
  AND fv.facet_id = :facetId
  AND fv.handle = :valueHandle
  AND fv.parent_id IS NULL
  AND fv.enabled = true
LIMIT 1;
```

Важно: `source` и `display` rows могут иметь одинаковый `handle` только если
одна из строк hidden (`parent_id IS NOT NULL`). Среди visible values
`handle` уникален, поэтому storefront token `facetSlug:valueHandle` остается
однозначным.

3. Если value не найден, filter value invalid и игнорируется.
4. Если `fv.kind = 'source'`, source handles:

```text
[fv.handle]
```

5. Если `fv.kind = 'display'`, source handles:

```sql
SELECT child.handle
FROM catalog.facet_value child
WHERE child.project_id = :projectId
  AND child.facet_id = :facetId
  AND child.parent_id = :displayValueId
  AND child.kind = 'source'
  AND child.enabled = true
ORDER BY child.handle;
```

6. Если display value не имеет enabled source children, filter value invalid и
   игнорируется.

### Counts

Для listing counts visible value сначала разворачивается в source handles:

- visible source value -> один `handle`;
- display value -> handles всех enabled source children.

Дальше текущая логика counts сохраняется:

- `TAG` сравнивается с `product_search_index.tag_handles`;
- `FEATURE` сравнивается с `product_search_index.feature_slugs`;
- `OPTION` сравнивается с `variant_search_index.option_slugs`.

## Merge / unmerge

### Merge нескольких source values в display value

Merge не создает и не удаляет source rows.

Он делает:

```sql
UPDATE catalog.facet_value
SET parent_id = :displayValueId,
    updated_at = now()
WHERE id = ANY(:sourceValueIds)
  AND project_id = :projectId
  AND facet_id = :facetId
  AND kind = 'source';
```

### Unmerge source value

Unmerge делает source value снова visible:

Перед `parent_id = NULL` нужно проверить, что в этом facet нет другого root
value с тем же `handle`. Если есть root display/root source с таким handle,
mutation должна вернуть userError или требовать сначала изменить/delete
конфликтующий display value. DB unique
`facet_value_root_project_facet_handle_uniq` должен дублировать эту защиту.

```sql
UPDATE catalog.facet_value
SET parent_id = NULL,
    updated_at = now()
WHERE id = :sourceValueId
  AND project_id = :projectId
  AND kind = 'source';
```

### Custom name для одного source value

Custom label/handle для одного source value делается через display parent:

```text
source:  kind=source,  handle=nike, label=Nike, parent_id=<display id>
display: kind=display, handle=nike, label=Nike official, parent_id=NULL
```

Custom display нельзя удалять как обычную parent row, пока у него есть source
children. Нужно вызвать explicit unmerge/detach flow: source child получает
`parent_id = NULL` только через mutation, которая проверяет конфликт root
`handle`, после чего display можно удалить или disable.

## Изменения backend: DB и модели

### Файлы

- `services/catalog/src/repositories/models/facet.ts`;
- `services/catalog/src/repositories/models/index.ts`;
- `services/catalog/migrations/*.sql`;
- `services/catalog/migrations/meta/*.json`;
- `services/catalog/drizzle.config.ts` только если потребуется обновление
  casing/paths, сейчас не ожидается.

### Шаги

1. Удалить модели:
   - `facetValueSourceHandle`.
2. В `facetValue`:
   - `slug` переименовать в `handle`;
   - добавить `kind`;
   - добавить `parentId`;
   - обновить indexes/unique constraints.
3. Обновить exported types:
   - удалить `FacetValueSourceHandle`, `NewFacetValueSourceHandle`;
   - оставить `FacetValue`, `NewFacetValue`, `FacetValueTranslation`.
4. Добавить локальные TypeScript helper types:

```ts
export type FacetValueKind = "source" | "display";
```

5. Убедиться, что timestamps остаются `mode: "string"`.

## Структурная DB migration

### Общий порядок SQL migration

1. Добавить новые колонки nullable:

```sql
ALTER TABLE catalog.facet_value ADD COLUMN kind varchar(16);
ALTER TABLE catalog.facet_value ADD COLUMN parent_id uuid;
ALTER TABLE catalog.facet_value RENAME COLUMN slug TO handle;
```

2. Сделать новые колонки NOT NULL:

```sql
ALTER TABLE catalog.facet_value ALTER COLUMN kind SET NOT NULL;
ALTER TABLE catalog.facet_value ALTER COLUMN handle SET NOT NULL;
```

3. Добавить FK:

```sql
ALTER TABLE catalog.facet_value
  ADD CONSTRAINT facet_value_parent_id_facet_value_id_fk
  FOREIGN KEY (parent_id)
  REFERENCES catalog.facet_value(id)
  ON DELETE NO ACTION;
```

4. Добавить новые indexes/constraints.
5. Удалить старые constraints/indexes на `slug`.
6. Удалить старую source-handle table:

```sql
DROP TABLE catalog.facet_value_source_handle;
```

## Изменения backend: repositories

### `FacetRepository`

Файл:

- `services/catalog/src/repositories/facet/FacetRepository.ts`.

Удалить:

- импорты `facetValueSourceHandle`.

Изменить:

- `resolveFacetFilterValues` должен работать только через `facet_value`
  self-reference.

Новый shape result может остаться совместимым:

```ts
export interface ResolvedFacetFilterValue {
  facetSlug: string;
  valueHandle: string;
  facetId: string;
  facetType: string;
  sourceHandles: string[];
}
```

Поле `sourceHandles` здесь можно оставить как runtime-derived термин, потому что
это не DB table и не Admin API для редактирования.

Новый query для resolution:

```ts
import { and, eq, isNull } from "drizzle-orm";

const rows = await this.connection
  .select({
    facetId: facet.id,
    facetType: facet.facetType,
    valueId: facetValue.id,
    valueKind: facetValue.kind,
    valueHandle: facetValue.handle,
  })
  .from(facet)
  .innerJoin(
    facetValue,
    and(
      eq(facetValue.facetId, facet.id),
      eq(facetValue.projectId, facet.projectId),
      isNull(facetValue.parentId),
      eq(facetValue.handle, valueHandle),
      eq(facetValue.enabled, true)
    )
  )
  .where(and(eq(facet.projectId, this.storeId), eq(facet.slug, facetSlug)));
```

Затем:

- если `kind = 'source'`, вернуть `[value.handle]`;
- если `kind = 'display'`, загрузить children через
  `facetValue.getEnabledSourceChildrenByParentIds`.

### `FacetValueRepository`

Файл:

- `services/catalog/src/repositories/facet/FacetValueRepository.ts`.

Удалить:

- `getSourceHandlesByValueIds`;
- `replaceSourceHandles`;
- импорты `facetValueSourceHandle`.

Добавить/изменить методы:

```ts
async findVisibleByFacetId(facetId: string): Promise<FacetValue[]>
async findAllByFacetId(facetId: string): Promise<FacetValue[]>
async getSourceChildrenByParentIds(parentIds: readonly string[]): Promise<FacetValue[]>
async getVisibleValueSourceHandles(valueIds: readonly string[]): Promise<Map<string, string[]>>
async attachSourcesToDisplay(displayValueId: string, sourceValueIds: string[]): Promise<void>
async detachSources(sourceValueIds: string[]): Promise<void>
async createValue(data: FacetValueCreateData): Promise<FacetValue>
async updateValue(id: string, data: FacetValueUpdateData): Promise<FacetValue | null>
```

Repository возвращает один domain type `FacetValue`. `kind = "source"` и
`kind = "display"` - это варианты состояния одной модели, не отдельные output
types.

`findByFacetId` должен быть переосмыслен:

- если используется GraphQL `Facet.values`, вернуть только visible values;
- если нужно админское управление source rows, использовать отдельный метод
  `findAllByFacetId` или `findSourceValuesByFacetId`.

Валидации внутри repository/script:

- source child и display parent должны быть в одном `projectId/facetId`;
- parent должен быть `kind = 'display'`;
- source value нельзя attach к source parent;
- display value нельзя attach как child;
- нельзя создать `facet_value` для `price` и `in_stock`;
- `handle` должен быть нормализован, но для source handles разрешить `:`.

## Изменения backend: scripts

### Facet create/update

Файлы:

- `services/catalog/src/scripts/facet/FacetCreateScript.ts`;
- `services/catalog/src/scripts/facet/FacetUpdateScript.ts`;
- `services/catalog/src/scripts/facet/dto/index.ts`;
- `services/catalog/src/resolvers/admin/MutationResolver.ts`.

Удалить из DTO/API:

- validation source handle/name required на уровне `FacetCreate/FacetUpdate`.

Facet create/update должен управлять только:

- `facetType`;
- `slug`;
- `label`;
- `uiType`;
- `selectionMode`;
- `lexoRank`.

Source values управляются отдельными value-level операциями.

### Facet value create/update

Файлы:

- `services/catalog/src/scripts/facet/FacetValueCreateScript.ts`;
- `services/catalog/src/scripts/facet/FacetValueUpdateScript.ts`;
- `services/catalog/src/scripts/facet/dto/index.ts`.

Переименовать:

- `slug` -> `handle`;
- `sourceHandles` -> `sourceValueIds` для create display value и dedicated
  merge/unmerge operations.

Новые DTO:

```ts
export type FacetValueKind = "source" | "display";

export interface FacetValueCreateParams {
  facetId: string;
  kind: FacetValueKind;
  handle: string;
  label: string;
  sourceValueIds?: string[];
  swatchId?: string | null;
  sortIndex?: number;
  enabled?: boolean;
}

export interface FacetValueUpdateParams {
  id: string;
  handle?: string;
  label?: string;
  swatchId?: string | null;
  sortIndex?: number;
  enabled?: boolean;
}
```

Правила create:

- `kind = 'source'` создается только sync script или explicit admin source-value
  operation. Обычный create value flow должен создавать `display`, если
  переданы `sourceValueIds`, или source только в "create source value" flow.
- `kind = 'display'` требует `sourceValueIds.length > 0`, если value сразу
  включен и должен быть usable.
- `handle` display value должен быть valid slug-like storefront handle.
- `handle` source value должен быть valid source handle:
  - tag: без `:`;
  - feature/option: `source_slug:value_slug`.
- `swatchId` и `sortIndex` применяются к visible values. Для hidden source child
  их можно хранить, но storefront их не читает.

Правила update:

- generic update не принимает `sourceValueIds` и не меняет `parent_id` у
  source rows;
- attach/detach source rows к display value делается только через
  `FacetValueMergeScript` / `FacetValueUnmergeScript`;
- update source не должен менять `handle` через generic display-value update.
  Изменение source handle должно быть отдельной explicit source-value operation;
- если display loses all children после unmerge, dedicated mutation должна
  вернуть userError или автоматически disable display.

### Merge/unmerge scripts

Добавить dedicated scripts:

- `FacetValueMergeScript`;
- `FacetValueUnmergeScript`.

Почему не делать все через generic update:

- merge/unmerge имеют отдельные validation rules;
- merge/unmerge имеют отдельные actions;
- проще считать affected source handles для listing freshness.

DTO:

```ts
export interface FacetValueMergeParams {
  facetId: string;
  targetDisplayValueId?: string;
  targetHandle?: string;
  targetLabel?: string;
  sourceValueIds: string[];
}

export interface FacetValueUnmergeParams {
  sourceValueIds: string[];
  emptyDisplayAction?: "disable" | "delete" | "keep";
}

export interface FacetValueMergeResult {
  facetValue?: FacetValue;
  sourceValues: FacetValue[];
  userErrors: UserError[];
}

export interface FacetValueUnmergeResult {
  sourceValues: FacetValue[];
  affectedDisplayValues: FacetValue[];
  userErrors: UserError[];
}
```

Merge contract:

- mutation принимает `facetId`, `sourceValueIds` и один из target modes:
  `targetDisplayValueId` для merge в существующий display value или
  `targetHandle + targetLabel` для создания нового display value;
- `targetDisplayValueId` и `targetHandle/targetLabel` не должны использоваться
  одновременно;
- если `targetDisplayValueId` передан, attach source values к нему;
- если `targetDisplayValueId` не передан, создать display value с
  `targetHandle/targetLabel`;
- source values должны быть `kind = 'source'`;
- source values должны принадлежать тому же facet;
- target должен быть `kind = 'display'`;
- source values могут быть root или уже hidden children другого display value;
- merge переводит каждый source value в `parent_id = targetDisplayValueId`;
- merge не создает и не удаляет source rows;
- результат возвращает target display value в `facetValue` и измененные source
  rows в `sourceValues`.

Merge userErrors:

- `INVALID_FACET_ID` для невалидного `facetId`;
- `INVALID_SOURCE_VALUE_ID` для невалидного id в `sourceValueIds`;
- `SOURCE_VALUES_REQUIRED`, если `sourceValueIds` пустой;
- `TARGET_REQUIRED`, если не передан ни `targetDisplayValueId`, ни
  `targetHandle/targetLabel`;
- `TARGET_AMBIGUOUS`, если одновременно переданы `targetDisplayValueId` и
  `targetHandle/targetLabel`;
- `TARGET_NOT_DISPLAY`, если target row не `kind = 'display'`;
- `SOURCE_NOT_SOURCE`, если source row не `kind = 'source'`;
- `FACET_MISMATCH`, если target/source rows не принадлежат `facetId`;
- `HANDLE_ALREADY_EXISTS`, если новый display handle конфликтует с root value.

Unmerge contract:

- mutation принимает `sourceValueIds` и опциональный `emptyDisplayAction`;
- все `sourceValueIds` должны указывать на rows `kind = 'source'`;
- source values получают `parent_id = NULL`;
- перед detach нужно проверить, что root value с таким же `handle` не существует
  в том же facet, кроме самой unmerged source row;
- если root handle конфликтует, mutation возвращает userError и не делает
  частичный detach;
- если old display остается без children, применяется `emptyDisplayAction`;
- default `emptyDisplayAction = "disable"`;
- `disable` ставит old display `enabled = false`;
- `delete` удаляет old display, только если у него не осталось children;
- `keep` оставляет old display без children, но такой display не должен быть
  usable storefront filter value;
- unmerge не создает и не удаляет source rows;
- результат возвращает detached source rows в `sourceValues` и затронутые old
  display rows в `affectedDisplayValues`.

Unmerge userErrors:

- `INVALID_SOURCE_VALUE_ID` для невалидного id в `sourceValueIds`;
- `SOURCE_VALUES_REQUIRED`, если `sourceValueIds` пустой;
- `SOURCE_NOT_SOURCE`, если source row не `kind = 'source'`;
- `SOURCE_NOT_MERGED`, если source row уже root и detach не нужен;
- `ROOT_HANDLE_CONFLICT`, если unmerge сделает неоднозначный root handle;
- `EMPTY_DISPLAY_ACTION_INVALID`, если передан неизвестный action.

## Изменения GraphQL Admin API

Файл:

- `services/catalog/src/api/graphql-admin/schema/facet.graphql`.
- `services/catalog/src/api/graphql-admin/schema/base.graphql` для полей
  `CatalogMutation`.

### Удалить

```graphql
FacetValue.sourceHandles
FacetValueCreateInput.sourceHandles
FacetValueUpdateInput.sourceHandles
```

Если нужна временная backward compatibility для Admin API clients, можно оставить
`sourceHandles` как deprecated computed field на один refactor step, но
финальное состояние должно убрать это поле из API contract.

### Добавить

```graphql
enum FacetValueKind {
  SOURCE
  DISPLAY
}

enum FacetValueEmptyDisplayAction {
  DISABLE
  DELETE
  KEEP
}

type Facet implements Node {
  id: ID!
  facetType: FacetType!
  slug: String!
  label: String!
  uiType: FacetUIType!
  selectionMode: FacetSelectionMode!
  lexoRank: String!
  values: [FacetValue!]!
}

type FacetValue implements Node {
  id: ID!
  facet: Facet!
  parent: FacetValue
  kind: FacetValueKind!
  handle: String!
  label: String!
  sourceValues: [FacetValue!]!
  swatch: FacetSwatch
  sortIndex: Int!
  enabled: Boolean!
}
```

`FacetValue` - единственный GraphQL output type для facet values. Source value
и display value не являются отдельными output types; они отличаются только
полем `kind`.

`FacetValue.sourceValues` возвращает объекты того же GraphQL type
`FacetValue`, не строки handles и не отдельный type.

Для display value поле возвращает child rows как `FacetValue` objects:

```text
FacetValue(kind=DISPLAY, handle=red)
  sourceValues: [
    FacetValue(kind=SOURCE, handle=color:red),
    FacetValue(kind=SOURCE, handle=color:dark-red)
  ]
```

Для source value поле возвращает пустой список, потому что source value не имеет
child source values:

```text
FacetValue(kind=SOURCE, handle=color:black)
  sourceValues: []
```

Runtime filtering для root source value не читает `sourceValues`; backend берет
сам `FacetValue.handle`. Строковые source handles остаются только внутренним
runtime-derived результатом resolution, не GraphQL Admin API output.

### Inputs

```graphql
input FacetValueCreateInput {
  facetId: ID!
  kind: FacetValueKind = DISPLAY
  handle: String!
  label: String!
  sourceValueIds: [ID!]
  swatchId: ID
  sortIndex: Int
  enabled: Boolean
}

input FacetValueUpdateInput {
  id: ID!
  handle: String
  label: String
  swatchId: ID
  sortIndex: Int
  enabled: Boolean
}

input FacetValueMergeInput {
  facetId: ID!
  targetDisplayValueId: ID
  targetHandle: String
  targetLabel: String
  sourceValueIds: [ID!]!
}

input FacetValueUnmergeInput {
  sourceValueIds: [ID!]!
  emptyDisplayAction: FacetValueEmptyDisplayAction = DISABLE
}
```

`FacetValueMergeInput` contract:

- `facetId` - facet scope для target и source values;
- `sourceValueIds` - source rows, которые нужно attach к display value;
- `targetDisplayValueId` - существующий display value target;
- `targetHandle` / `targetLabel` - данные для нового display value, если
  `targetDisplayValueId` не передан;
- нужно передать ровно один target mode:
  - existing target: `targetDisplayValueId`;
  - new target: `targetHandle` + `targetLabel`.

`FacetValueUnmergeInput` contract:

- `sourceValueIds` - source rows, которые нужно detach в root values;
- `emptyDisplayAction` - что делать с display values, которые после detach
  остались без source children:
  - `DISABLE` default: оставить row и выставить `enabled = false`;
  - `DELETE`: удалить пустой display row;
  - `KEEP`: оставить пустой display row; storefront/listing не должны считать
    его usable enabled filter value.

Payloads:

```graphql
type FacetValueMergePayload {
  facetValue: FacetValue
  sourceValues: [FacetValue!]!
  userErrors: [GenericUserError!]!
}

type FacetValueUnmergePayload {
  sourceValues: [FacetValue!]!
  affectedDisplayValues: [FacetValue!]!
  userErrors: [GenericUserError!]!
}
```

`FacetValueMergePayload`:

- `facetValue` - target display value, существующий или созданный mutation;
- `sourceValues` - source rows, у которых изменился `parent_id`;
- `userErrors` - business validation errors; если массив не пустой, mutation не
  должна делать частичный merge.

`FacetValueUnmergePayload`:

- `sourceValues` - detached source rows;
- `affectedDisplayValues` - old display rows, которые были disabled/kept или
  остаются после detach; для `DELETE` удаленные rows сюда не возвращаются;
- `userErrors` - business validation errors; если массив не пустой, mutation не
  должна делать частичный unmerge.

### Mutations

Добавить отдельные mutation fields в `CatalogMutation`:

```graphql
type CatalogMutation {
  """
  Attach source facet values to an existing or newly-created display value.
  This is the only mutation that merges source values into a display value.
  """
  facetValueMerge(input: FacetValueMergeInput!): FacetValueMergePayload!

  """
  Detach source facet values from their display value and make them root values.
  This is the only mutation that unmerges source values.
  """
  facetValueUnmerge(input: FacetValueUnmergeInput!): FacetValueUnmergePayload!
}
```

`facetValueUpdate` не должен принимать `sourceValueIds` и не должен менять
`parent_id`. Все изменения связей source/display values проходят только через
`facetValueMerge` и `facetValueUnmerge`.

### Resolvers

Файлы:

- `services/catalog/src/resolvers/admin/FacetResolver.ts`;
- `services/catalog/src/resolvers/admin/FacetValueResolver.ts`;
- `services/catalog/src/resolvers/admin/MutationResolver.ts`;
- `services/catalog/src/resolvers/admin/QueryResolver.ts`;
- `services/catalog/src/resolvers/admin/generated/schemas.ts` после codegen.

Изменить:

- `Facet.values()` должен возвращать only visible values;
- `FacetValue.slug()` заменить на `handle()`;
- добавить `FacetValue.kind()`;
- добавить `FacetValue.parent()`;
- добавить `FacetValue.sourceValues()`;
- удалить `FacetValue.sourceHandles()`;
- create/merge/unmerge mutation resolvers декодируют `sourceValueIds` как
  `GlobalIdEntity.FacetValue`; update mutation не принимает `sourceValueIds`.

`facetValueMerge` resolver contract:

1. Decode `input.facetId` как `GlobalIdEntity.Facet`.
2. Decode `input.targetDisplayValueId`, если передан, как
   `GlobalIdEntity.FacetValue`.
3. Decode каждый id из `input.sourceValueIds` как `GlobalIdEntity.FacetValue`.
4. При invalid global id вернуть payload:

```ts
{
  facetValue: null,
  sourceValues: [],
  userErrors: [{ field: ["input", "..."], code: "INVALID_ID", message: "..." }]
}
```

5. Вызвать `FacetValueMergeScript` с decoded ids.
6. Вернуть:
   - `facetValue: FacetValueResolver | null`;
   - `sourceValues: FacetValueResolver[]`;
   - `userErrors`.

`facetValueUnmerge` resolver contract:

1. Decode каждый id из `input.sourceValueIds` как `GlobalIdEntity.FacetValue`.
2. Map `emptyDisplayAction` enum:
   - `DISABLE` -> `"disable"`;
   - `DELETE` -> `"delete"`;
   - `KEEP` -> `"keep"`.
3. При invalid global id вернуть payload:

```ts
{
  sourceValues: [],
  affectedDisplayValues: [],
  userErrors: [{ field: ["input", "sourceValueIds"], code: "INVALID_ID", message: "..." }]
}
```

4. Вызвать `FacetValueUnmergeScript` с decoded ids.
5. Вернуть:
   - `sourceValues: FacetValueResolver[]`;
   - `affectedDisplayValues: FacetValueResolver[]`;
   - `userErrors`.

## Изменения DataLoader

Файлы:

- `services/catalog/src/loaders/FacetLoader.ts`;
- `services/catalog/src/loaders/FacetValueLoader.ts`;
- `services/catalog/src/loaders/Loader.ts`.

Удалить:

- `facetValueSourceHandles`.

Добавить:

```ts
public readonly facetVisibleValueIds: DataLoader<string, string[]>;
public readonly facetValueSourceChildren: DataLoader<string, FacetValue[]>;
public readonly facetValueParent: DataLoader<string, FacetValue | null>;
```

Или минимально:

- `facetValueIds` переопределить как visible value ids;
- `facetValueSourceChildren` для `FacetValue.sourceValues`;
- parent можно грузить через existing `facetValue` loader по `parentId`.

Loader должен сохранять per-request batching и не делать N+1 при выводе
`Facet.values.sourceValues`.

## Изменения listing/runtime filtering

Файлы:

- `services/catalog/src/scripts/shared/facets.ts`;
- `services/catalog/src/scripts/facet/ResolveFacetsScript.ts`;
- `services/catalog/src/scripts/search-index/*`;
- `services/catalog/src/repositories/listing/*`;
- docs/listing документы.

### `ResolveFacetsScript`

Output может остаться:

```ts
tagHandles: string[];
featureSlugs: string[];
optionSlugs: string[];
resolved: ResolvedFacetFilter[];
```

Но `ResolvedFacetFilter.valueSlug` надо переименовать в `valueHandle`.

Внутреннее поле `sourceHandles` остается runtime-derived и не связано с DB
table. Если хочется убрать термин полностью, можно переименовать в
`resolvedHandles`.

Рекомендуемое переименование:

```ts
sourceHandles -> resolvedSourceHandles
```

### `buildListingFacets`

Сейчас builder:

1. грузит visible `facet_value`;
2. грузит translations;
3. грузит `facet_value_source_handle`;
4. собирает `value.sourceHandles`;
5. считает counts.

Новая схема:

1. грузить visible values через `findVisibleByFacetId`;
2. грузить translations для visible values;
3. грузить source children для visible display values;
4. для visible source values source handles = `[value.handle]`;
5. для visible display values source handles = children source handles;
6. counts остаются прежними.

Важно:

- hidden source rows не должны попадать в `values` payload;
- display без enabled children не должен попадать в storefront facets или должен
  иметь count `0`, если product decision требует показывать empty values;
- source children должны быть deduplicated, чтобы merged values не double-count.

## Изменения docs

Обновить после implementation:

- `docs/facets/facets-data-model.ru.md`;
- `docs/listing/listing-index-db-schema.ru.md`;
- `docs/listing/listing-index-sync-freshness.ru.md`;
- `docs/listing/listing-storefront-operations-explained.ru.md`;
- `docs/listing/listing-index-redesign-plan.ru.md`, если он остается актуальным.

Ключевая замена терминов:

- `facet_value_source_handle` -> `facet_value.kind/source parent model`;
- `sourceHandles` API field -> `sourceValues` / `sourceValueIds`;
- `FacetValue.slug` -> `FacetValue.handle`;

## Генерация и build

После кодовых изменений нужно выполнить через проектный workflow/shopana-cli:

1. Generate Drizzle migration для `catalog`.
2. Review generated SQL migration вручную.
3. Generate GraphQL schemas/types.
4. Build, когда нужна новая версия кода.

По пользовательским правилам:

- не запускать `test`;
- не запускать `tsc`;
- changeset файл не редактировать вручную;
- если нужен changeset, запускать только генерацию через `npm`;
- `npm install` запускать сразу вне sandbox с запросом разрешения.

## Порядок реализации

### Phase 1. DB model и migration

1. Обновить `services/catalog/src/repositories/models/facet.ts`.
2. Сгенерировать migration.
3. Вручную доработать migration, если Drizzle не сможет корректно выразить:
   - rename `slug -> handle`;
   - partial unique indexes;
   - table drops.
4. Проверить migration diff.

Acceptance:

- models не экспортируют старую source-handle table;
- migration обновляет структуру `facet_value`;
- migration удаляет старую source-handle table.

### Phase 2. Repository layer

1. Переписать `FacetValueRepository`.
2. Переписать `FacetRepository.resolveFacetFilterValues`.
3. Добавить source child batching methods.

Acceptance:

- `Facet.values` может получить only visible values;
- display value разворачивается в children source handles;
- source value без parent разворачивается в свой handle.

### Phase 3. Scripts и business validation

1. Обновить DTO.
2. Переписать create/update facet value.
3. Добавить merge/unmerge scripts.

Acceptance:

- merge/unmerge меняет только `parent_id`;
- source rows не создаются/удаляются при merge/unmerge;
- display без source children не может стать валидным enabled filter value.

### Phase 4. GraphQL Admin API

1. Обновить `facet.graphql`.
2. Обновить resolvers.
3. Обновить loaders.
4. Запустить schema/codegen workflow.

Acceptance:

- `FacetValue.handle` есть в schema;
- `FacetValue.slug` удален;
- `FacetValue.sourceHandles` удален или deprecated только на промежуточном шаге;
- `CatalogMutation.facetValueMerge` добавлен;
- `CatalogMutation.facetValueUnmerge` добавлен;
- `FacetValueUpdateInput.sourceValueIds` отсутствует;
- `FacetValueMergeInput` поддерживает existing target через
  `targetDisplayValueId` и new target через `targetHandle/targetLabel`;
- `FacetValueUnmergeInput.emptyDisplayAction` добавлен с default `DISABLE`;
- merge payload возвращает `facetValue`, `sourceValues`, `userErrors`;
- unmerge payload возвращает `sourceValues`, `affectedDisplayValues`,
  `userErrors`;
- merge/unmerge resolvers декодируют ids и вызывают dedicated scripts, а не
  `FacetValueUpdateScript`;
- `Facet.values` возвращает only visible values.

### Phase 5. Listing/facet runtime

1. Обновить `ResolveFacetsScript`.
2. Обновить `buildListingFacets`.
3. Обновить listing sync/token docs and code paths, если они уже реализованы.
4. Убедиться, что counts deduplicate merged children.

Acceptance:

- `facetSlug:displayHandle` фильтрует по child source handles;
- `facetSlug:sourceHandle` фильтрует по самому source handle, если source root;
- hidden children не появляются в storefront values.

### Phase 6. Cleanup

1. Удалить старые imports/types.
2. Удалить docs mentions old model.
3. Удалить deprecated compatibility fields, если они были временно оставлены.
4. Проверить `rg`:

```text
facet_value_source_handle
sourceHandles
FacetValue.slug
```

Ожидаемо после cleanup:

- `facet_value_source_handle` не встречается в runtime коде;
- `sourceHandles` может остаться только как runtime internal `resolvedSourceHandles`
  или в historical docs, если такие docs явно помечены legacy.

## Риски и решения

### Риск: `handle` display совпадает с `handle` source

Это нормальный сценарий для tag values:

```text
source:  handle=nike, parent_id=<display nike>
display: handle=nike, parent_id=NULL
```

Поэтому нельзя делать global unique `(project_id, facet_id, handle)` на все rows
и нельзя разрешать два visible values с одинаковым `handle`.

Нужны visibility-scoped constraints:

- source rows: unique `(project_id, facet_id, handle) WHERE kind = 'source'`;
- root/visible rows: unique `(project_id, facet_id, handle) WHERE parent_id IS NULL`;
- hidden child rows: unique `(project_id, facet_id, handle) WHERE parent_id IS NOT NULL`.

Так display `handle=nike` и source `handle=nike` могут сосуществовать только как
root display + hidden source child. Если такой source child попытаться unmerge в
root, unique constraint на `parent_id IS NULL` должен сохранить инвариант и
заставить mutation вернуть userError или сначала изменить/delete display value.

### Риск: display value без children

Такой value не может фильтровать товары. Backend должен:

- не возвращать его storefront/listing;
- или возвращать count `0`, если product decision требует показывать пустые
  values.

Рекомендуемое решение: не возвращать enabled display value без enabled source
children в storefront facets и считать его invalid при resolution.

### Риск: удаление display parent

`ON DELETE SET NULL` на `parent_id` запрещен, потому что обычное удаление
display parent неожиданно сделает hidden source children visible и обойдет
business validation unmerge.

FK для `parent_id` должен быть `ON DELETE NO ACTION`. Delete display with
children должен fail fast на DB/application уровне, пока mutation явно не
выберет один из сценариев:

- сначала explicit unmerge children с проверкой root `handle` conflicts;
- detach children в другой display value;
- disable display и оставить children attached;
- hard-delete display только если children отсутствуют.

Рекомендуемое поведение: delete display with children без явного режима =
userError. Для custom display delete нужно выполнять unmerge children in same
transaction, then delete display, но только после успешной проверки uniqueness
для будущих root source values.

## Минимальный end-to-end сценарий после реализации

1. Admin создает `OPTION` facet `Color`.
2. Admin добавляет source values из option `color`.
3. Backend создает source rows:

```text
kind=source, handle=color:red, parent_id=NULL
kind=source, handle=color:dark-red, parent_id=NULL
kind=source, handle=color:black, parent_id=NULL
```

4. Storefront видит:

```text
Red
Dark red
Black
```

5. Admin merge `color:red` и `color:dark-red` в display `red`.
6. Backend создает display row:

```text
kind=display, handle=red, label=Red tones, parent_id=NULL
```

7. Backend updates:

```text
color:red.parent_id = red.id
color:dark-red.parent_id = red.id
```

8. Storefront видит:

```text
Red tones
Black
```

9. Filter `color:red` resolves to:

```text
color:red OR color:dark-red
```

10. Admin unmerge `color:dark-red`.
11. Backend sets:

```text
color:dark-red.parent_id = NULL
```

12. Storefront видит:

```text
Red tones
Dark red
Black
```

`Red tones` теперь фильтрует только:

```text
color:red
```

## Контрольный список файлов

Backend:

- `services/catalog/src/repositories/models/facet.ts`
- `services/catalog/src/repositories/models/index.ts`
- `services/catalog/src/repositories/facet/FacetRepository.ts`
- `services/catalog/src/repositories/facet/FacetValueRepository.ts`
- `services/catalog/src/repositories/Repository.ts`
- `services/catalog/src/loaders/FacetLoader.ts`
- `services/catalog/src/loaders/FacetValueLoader.ts`
- `services/catalog/src/loaders/Loader.ts`
- `services/catalog/src/scripts/facet/dto/index.ts`
- `services/catalog/src/scripts/facet/FacetCreateScript.ts`
- `services/catalog/src/scripts/facet/FacetUpdateScript.ts`
- `services/catalog/src/scripts/facet/FacetValueCreateScript.ts`
- `services/catalog/src/scripts/facet/FacetValueUpdateScript.ts`
- `services/catalog/src/scripts/facet/FacetValueDeleteScript.ts`
- `services/catalog/src/scripts/facet/ResolveFacetsScript.ts`
- `services/catalog/src/scripts/facet/index.ts`
- `services/catalog/src/scripts/shared/facets.ts`
- `services/catalog/src/resolvers/admin/FacetResolver.ts`
- `services/catalog/src/resolvers/admin/FacetValueResolver.ts`
- `services/catalog/src/resolvers/admin/MutationResolver.ts`
- `services/catalog/src/resolvers/admin/QueryResolver.ts`
- `services/catalog/src/api/graphql-admin/schema/facet.graphql`

Generated/schema:

- `services/catalog/src/resolvers/admin/generated/schemas.ts`

Docs:

- `docs/facets/facets-data-model.ru.md`
- `docs/listing/listing-index-db-schema.ru.md`
- `docs/listing/listing-index-sync-freshness.ru.md`
- `docs/listing/listing-storefront-operations-explained.ru.md`
- `docs/listing/listing-index-redesign-plan.ru.md`
