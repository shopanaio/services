# План реализации Rule Based Collections

## Статус и контекст

В `catalog` уже существует домен коллекций (`migrations/domains/0900_collections`), рассчитанный на два типа: `manual` и `rule`. Реально работает только `manual`, и то не полностью:

- Таблицы есть: `collection`, `collection_item` (productId + lexoRank), `collection_rule` (field/operator/value jsonb + sortIndex), `collection_translation`, `collection_seo`, `collection_media`. Drizzle-модели 1:1 в `services/catalog/src/repositories/models/collection.ts`.
- Репозитории есть: `CollectionRepository`, `CollectionItemRepository` (add/remove/move/rebalance поверх `LexoRankRepository`), `CollectionRuleRepository` (`findByCollectionId`, `replaceRules` — delete+reinsert без диффа).
- Скрипты есть: Create/Update/Delete/AddProducts/RemoveProducts/MoveProduct/Rebalance/**UpdateRules**. `CollectionUpdateRulesScript` (`services/catalog/src/scripts/collection/CollectionUpdateRulesScript.ts:4-12`) только валидирует пары field/operator по whitelist (`tag/feature/category/option: in|all|contains`, `price/created_at: eq|gt|gte|lt|lte|between`, `in_stock: eq`) и сохраняет их. **Ни одного места, где правила реально исполняются против каталога, не существует.** Нет ни preview, ни recompute, ни публикации membership.
- GraphQL admin (`schema/collection.graphql`) уже описывает `Collection.rules`, `CollectionUpdateRulesInput`, но `field`/`operator` — это `String!`, без enum. Preview-запроса ("какие товары попадут в коллекцию по этим правилам") нет.
- **Более широкий разрыв:** `CollectionResolver.products()` и `productsCount()` — буквальные `// TODO: Implement ... with keyset pagination` / `// TODO: Implement ... with COUNT(*)`. Ни у manual, ни у rule коллекций сегодня нет рабочего чтения списка товаров. DTO `CollectionProductsQueryParams/Result` в `scripts/collection/dto/index.ts` существуют, но никем не используются (dead code) — эталонная реализация для этого пути уже есть у `Category` (см. ниже) и её нужно скопировать, а не оживлять мёртвые DTO.
- В storefront (`graphql-storefront`) коллекции не представлены вообще — 0 упоминаний.
- В `listing` слово "коллекция" встречается один раз: CHECK-ограничение `chk_listing_posting_bitmap_no_collection_field` (`services/listing/src/repositories/models/listingIndex.ts:407-408`) явно **запрещает** `field = 'collection'` в общей posting-list/bitmap таблице фасетов. Но у listing уже есть готовая, протестированная под нагрузкой инфраструктура именно для той задачи, которую решают rule-коллекции — «дать множество товаров, подходящих под набор условий» (см. следующий раздел). Первая версия этого плана предлагала пересчитывать правила бесхитростным SQL внутри catalog, полностью игнорируя эту инфраструктуру — это было не так, и раздел «Матчинг: делегирование в listing» ниже описывает исправленный подход.

Итог: схема и CRUD-обвязка для rule-коллекций были заложены заранее, но вся смысловая часть — сопоставление правил с товарами, публикация membership, чтение списка товаров, storefront и listing — не реализована. Это greenfield-задача поверх готового скелета.

## Продуктовые цели

- Мерчант создаёт коллекцию типа `rule`, задаёт условия (`tag`, `feature`, `category`, `option`, `price`, `created_at`, `in_stock`), выбирает `matchType` (все условия / любое условие).
- После сохранения правил коллекция автоматически наполняется подходящими товарами без участия мерчанта.
- При изменении товара (тег, характеристика, категория, опция, цена, остаток, публикация, удаление) членство в затронутых rule-коллекциях пересчитывается автоматически.
- Admin может увидеть предпросмотр совпадающих товаров до сохранения правил.
- Admin может прочитать список товаров коллекции (manual и rule одинаково) с пагинацией и сортировкой — это же попутно закрывает существующий разрыв для `manual` коллекций.
- Дальше (вне v1, но не блокируется им) — товары коллекции должны быть доступны на витрине и участвовать в поиске/фильтрации listing.

## Не входит в объём v1

- Витрина (storefront) — выносится в фазу 5, потому что сначала нужно, чтобы каталог сам умел вычислять и отдавать membership.
- Вложенные группы условий (`(A И B) ИЛИ (C И D)`) — v1 ограничивается одним уровнем `matchType: ALL | ANY` над плоским списком правил, как в схеме `collection_rule` сегодня.
- Мультивалютные price-правила — v1 оценивает `price` только в валюте магазина по умолчанию.
- ML/поведенческие сигналы (аналог FBT из `product-recommendations.ru.md`) — rule-коллекции остаются декларативными и детерминированными.
- Изменение общего facet bitmap-механизма listing под `field = 'collection'` — CHECK-ограничение не трогаем; коллекции syncятся в listing отдельным путём (фаза 5).

## Термины

| Термин | Значение |
| --- | --- |
| `rule` | Одна строка `collection_rule`: `field` + `operator` + `value` |
| `matchType` | Правило объединения условий внутри коллекции: `ALL` (AND) или `ANY` (OR) |
| `membership` | Множество `productId`, которое коллекция должна содержать прямо сейчас |
| `materialization` | Запись вычисленного membership в существующую таблицу `collection_item` |
| `full recompute` | Пересчёт membership с нуля по всем товарам магазина (используется после правки правил) |
| `incremental recompute` | Пересчёт membership только для товаров, затронутых конкретным изменением |
| `delegated field` | Поле правила, которое вычисляется через `listing` (`tag`/`feature`/`option`/`price`/`in_stock`) |
| `local field` | Поле правила, которое вычисляется прямо в catalog (`category`/`created_at`) |

## Матчинг: делегирование в listing, а не SQL внутри catalog

Ключевое архитектурное решение этого плана: **сопоставление правил с товарами не должно быть отдельным SQL-движком внутри catalog**, потому что почти всё, что нужно, уже построено в `listing` и уже проверено под нагрузкой.

### Что уже есть в listing и напрямую переиспользуется

`services/listing/src/repositories/storefront/types.ts` уже описывает готовый фильтр-контракт `StorefrontListingFilterInput`:

```typescript
export type StorefrontListingFilterInput =
  | { kind: "facet"; facetSlug: string; valueHandles: string[] }
  | { kind: "vendor"; vendorIds: string[] }
  | { kind: "price"; minPriceMinor?: number; maxPriceMinor?: number }
  | { kind: "in_stock"; value: boolean };
```

Это закрывает 5 из 7 полей правила почти без работы:

| `collection_rule.field` | Уже готово в listing | Как |
| --- | --- | --- |
| `tag` | да | `{kind:'facet', facetSlug, valueHandles}`, `FacetRuntimeType.TAG` |
| `feature` | да | `{kind:'facet', facetSlug, valueHandles}`, `FacetRuntimeType.FEATURE` |
| `option` | да | `{kind:'facet', facetSlug, valueHandles}`, `FacetRuntimeType.OPTION` |
| `price` | да | `{kind:'price', minPriceMinor, maxPriceMinor}` — уже нагрузочно протестирован (`listing/docs/draft/listing-price-facet-10k-performance-report.ru.md`) |
| `in_stock` | да | `{kind:'in_stock', value: boolean}` — availability уже вычисляется на этапе индексации (`ListingPageRow.inStock`), в catalog такого готового вычисления нет вообще |

`tag`/`feature`/`option` в listing унифицированы одним и тем же примитивом (`facetSlug` + `valueHandles`) — это проще, чем три отдельных join'а, которые предлагала первая версия плана внутри catalog, и это тот же самый механизм посадочных bitmap-пересечений, которым уже пользуется storefront-поиск.

### Что НЕ готово и остаётся в catalog

- **`category`** — в listing это не фильтр, а `scope` верхнего уровня одного запроса (`StorefrontListingScope = {kind:'category'|'global'}`), и варианта `collection` там нет. Переиспользовать scope для множественного/комбинируемого условия «категория = A или B» неудобно и потребует отдельного изменения контракта listing. `product_category` — простая, дешёвая, хорошо проиндексированная M2M-таблица в самом catalog, поэтому в v1 **`category` вычисляется локально в catalog**, не через listing.
- **`created_at`** — в listing вообще нет фильтра по дате создания, есть только сортировка (`newest`/`created`). Заводить ради одного простого числового сравнения новый фильтр в listing нецелесообразно — **`created_at` вычисляется локально в catalog** (`product.createdAt`, уже есть `idx_product_created_at`).

### Новая граница ответственности

| Сервис | Отвечает за |
| --- | --- |
| `catalog` | Определение правил, `category`/`created_at` matching, объединение результата с ответом listing, материализация в `collection_item`, admin API, orchestration recompute |
| `listing` | Вычисление `tag`/`feature`/`option`/`price`/`in_stock` через уже существующий posting-list/bitmap движок, отдаёт **полное** множество `productId`, а не одну страницу |
| `pricing` | Не участвует — базовая цена, используемая в правиле `price`, и так уже синхронизирована в listing (`priceRange`/facet `PRICE`), `pricing`-сервис отвечает только за промо/скидки |

### Чего в listing сегодня не хватает для этой роли (нужно построить)

1. **Лёгкий bulk-эндпоинт вместо `StorefrontListingQueryRepository.getStorefrontListing`.** Этот метод — обычный repository-метод (`@ReadOnly()`, не завязан на GraphQL/HTTP напрямую), но он тяжёлый: 5 параллельных SQL-веток на один вызов (`variantDiagnostics`, `page`, `totalCount`, `facetsWithCounts`, `virtualFacets`), рассчитан на одну страницу выдачи с курсорной пагинацией, ранжированием и facet-counts для UI витрины. Использовать его напрямую для «дай мне все productId, подходящие под фильтр» — дорого и ограничено `first`. Нужен новый, узкий метод (условно `ListingMembershipEvaluationService.evaluateMembership(filters): productId[]`), который переиспользует те же compiled SQL-примитивы фильтрации (facet → bitmap, price → range, in_stock → bitmap), но не считает facet-counts, не ранжирует и возвращает полное множество постранично (курсор по `productId`, как в `ListingFacetAffectedProductRepository`), а не одну страницу для рендера.
2. **Новый broker-эндпоинт `listing.evaluateProductMembership`, вызываемый из catalog.** Сегодня межсервисные вызовы идут только в одну сторону: `listing` вызывает `catalog` (`FacetAffectedProductsResyncWorkflow` → `broker.call("catalog.findListingFacetAffectedProducts", ...)`). Обратного вызова `catalog → listing` не существует нигде в кодовой базе. Это новая связь, и её нужно вводить осознанно (см. «Риски»).
3. **`matchType: ANY` через разнородные поля не покрывается фасетным поиском «из коробки».** Обычная фасетная навигация всегда AND между разными группами фасетов (и OR внутри значений одной группы — как раз `valueHandles: string[]`). `ALL` ложится на это ровно так, как есть. `ANY` (например, «tag=sale ИЛИ price<1000») — не то, что когда-либо требовалось витрине, и `listing` это не умеет. В v1 не расширяем сам SQL-движок listing под OR, а в catalog делаем N отдельных вызовов `evaluateProductMembership` (по одному на «делегированное» правило) и берём **union** productId — дороже по числу вызовов, но не требует трогать проверенный движок фасетов.

### Как это работает вместе

```text
CollectionRuleMatcher (catalog)
  ├── local rules (category, created_at)         -> прямой SQL в catalog, productId[]
  └── delegated rules (tag/feature/option/price/in_stock)
        -> CollectionRuleListingFilterMapper переводит правило(-а) в StorefrontListingFilterInput[]
        -> broker.call("listing.evaluateProductMembership", { storeId, filters, matchType })
        -> listing: тот же bitmap-движок, что и storefront-поиск, без facet-counts/ранжирования
        -> productId[] (полное множество, постранично)
  matchType ALL  -> пересечение local ∩ delegated
  matchType ANY  -> объединение local ∪ delegated (delegated считается N отдельными вызовами и объединяется)
```

### Значение (`value`): handle, не id

`value` в `collection_rule` должен хранить **handle/slug**, а не внутренний UUID. Это не только соответствует уже принятому в проекте паттерну `ListingFacetAffectedProductRef.sourceHandle`, но и совпадает буквально: `StorefrontListingFilterInput.facet.valueHandles` в listing тоже ожидает handle, а не id — значит `CollectionRuleListingFilterMapper` не должен резолвить handle → id вообще, он передаёт handle дальше, resolution происходит внутри listing тем же кодом, что уже резолвит фильтры витрины.

## Семантика правил

### Операторы `in` / `all` / `contains`

Whitelist сегодня разрешает `in`/`all`/`contains` для `tag/feature/category/option`, но их семантика нигде не зафиксирована и форма `value` не проверяется. Предлагаемая семантика v1 (нужно подтвердить, см. «Открытые решения»):

- `in` — товар имеет **хотя бы одно** значение из `value` (массив handle) — прямое соответствие `valueHandles` в listing для делегированных полей;
- `all` — товар имеет **все** значения из `value` — для делегированных полей это не «один вызов с несколькими `valueHandles`» (это был бы `in`), а пересечение результатов нескольких отдельных facet-фильтров, по одному на значение;
- `contains` — синоним `in` для одиночного значения.

### `matchType`

В `collection` сегодня нет поля для «все условия / любое условие» — нужна миграция:

```text
services/catalog/migrations/domains/0900_collections/0905_collections__rule_match_type.sql

ALTER TABLE "catalog"."collection"
  ADD COLUMN "rule_match_type" varchar(4) NOT NULL DEFAULT 'all';

ALTER TABLE "catalog"."collection"
  ADD CONSTRAINT "collection_rule_match_type_check"
  CHECK ("rule_match_type" IN ('all', 'any'));
```

(генерировать через штатный tooling проекта, не писать changeset руками).

### Валидация формы `value`

`CollectionUpdateRulesScript` сегодня проверяет только допустимость пары field/operator, но не форму `value`. Нужно закрыть это до передачи в matcher.

## Компоненты

### `CollectionRuleListingFilterMapper` (catalog)

Чистая функция: `CollectionRule[] → StorefrontListingFilterInput[]` для делегированных полей (`tag/feature/option/price/in_stock`). Не ходит в БД, только трансформация формы.

### `CollectionLocalRuleMatcher` (catalog)

SQL против `product_category` (поле `category`) и `product.createdAt` (поле `created_at`) — единственные два поля, которые остаются локальными. Постраничный `productId[]`, тот же курсорный паттерн, что у `ListingFacetAffectedProductRepository.findAffectedProductIdsForRef`.

### `CollectionRuleMatcher` (catalog, orchestrator)

Комбинирует `CollectionLocalRuleMatcher` и результат `broker.call("listing.evaluateProductMembership", ...)` по `matchType` (пересечение для `ALL`, объединение для `ANY`, с постраничным объединением курсоров).

### `ListingMembershipEvaluationService` + `listing.evaluateProductMembership` (listing, новое)

Новый узкий read-путь поверх уже существующих compiled SQL-примитивов facet/price/in_stock фильтрации (используемых сегодня в `StorefrontListingQueryRepository`/`compilePageQuerySql`/`compileTotalCountQuerySql`), без facet-counts, без ранжирования, без ограничения на одну страницу — отдаёт полное множество `productId` постранично. Экспонируется как broker-метод, вызываемый из catalog (новое направление зависимости, отсутствующее сегодня).

### `CollectionMembershipMaterializer` (catalog)

На вход — `collectionId`. Получает полное membership через `CollectionRuleMatcher`, сравнивает с текущими строками `collection_item` (`CollectionItemRepository.findByCollectionId`), добавляет/удаляет через уже существующие `CollectionItemRepository.addProducts`/`removeProducts` (переиспользует lexoRank-механизм; ранг для rule-коллекций не участвует в сортировке, но колонка `NOT NULL`, значение присваивается детерминированно по порядку получения). Идемпотентна.

### `CollectionRuleAffectedProductFinder` (catalog) — инкрементальная инвалидация

Для **локальных** полей (`category`, `created_at`) — точечная проверка одного продукта против одной коллекции при изменении `product_category`/`product.createdAt`, без обращения к listing. Для **делегированных** полей инвалидация приходит с другой стороны — см. ниже.

### `CollectionMembershipRebuildWorkflow` (catalog, DBOS)

Постраничный batch workflow (по образцу `ListingBatchProductIndexWorkflow`, один шаг — один файл), запускает `CollectionRuleMatcher` целиком и делает диф с `collection_item`. Используется для:

- full recompute одной коллекции после сохранения правил (`collectionUpdateRules`);
- периодической реконсиляции всех rule-коллекций магазина;
- бэкофилла при первом включении фичи.

### `CollectionProductConnectionResolver` + `CollectionRepository.getCollectionProductsConnection` (catalog, admin GraphQL)

Не связано с матчингом — закрывает разрыв, который сегодня есть и у `manual` коллекций (`CollectionResolver.products()`/`productsCount()` — TODO). Копирует уже работающий `CategoryProductConnectionResolver` → `CategoryRepository.getCategoryProductsConnection` (`services/catalog/src/repositories/category/CategoryRepository.ts:887`): базовое условие `collection.collectionId = X`, те же ключи сортировки (`MANUAL`/`NEWEST`/`PRICE`/`NAME`), тот же generic Relay query builder. Читает уже материализованный `collection_item`, не отличает `manual` от `rule`.

## Инвалидация: делегированные поля vs локальные

Для делегированных полей (`tag/feature/option/price/in_stock`) rule-коллекции инвалидируются **той же волной событий**, что уже двигает `FacetAffectedProductsResyncWorkflow` и `listingFacetMembershipChanged` — когда listing узнаёт, что товар мог измениться относительно facet/price/stock, это тот же самый момент, когда могло измениться и rule-membership. Вместо того чтобы catalog заново находил "affected products" для тега/цены/остатка (это уже делает `ListingFacetAffectedProductRepository`), достаточно, чтобы **catalog подписался на событие `listingFacetMembershipChanged`** (которое сегодня публикуется только "в один конец", для внутреннего использования listing) и на каждый затронутый `productId` пересчитал только rule-коллекции, чьи правила ссылаются на изменившийся `facetType`/`sourceHandle`.

| Изменение | Что пересчитать |
| --- | --- |
| Тег/feature/option/цена/остаток товара | catalog реагирует на `listingFacetMembershipChanged` (уже существующее событие) → точечная проверка affected productId против rule-коллекций, ссылающихся на этот facetType/handle |
| Категория товара (`product_category`) | incremental, локально в catalog, без listing |
| `product.createdAt` — практически не меняется после создания | точечная проверка при создании товара |
| Создание/удаление/публикация товара | incremental по всем rule-коллекциям магазина |
| Сохранение `collectionUpdateRules` | **full recompute** только этой коллекции |
| Массовое изменение таксономии | full recompute только затронутых коллекций, постранично через `CollectionMembershipRebuildWorkflow` |

Скрипты, в которые нужно добавить локальную инвалидацию: category assignment scripts, product create/update/delete/publish scripts. Делегированные поля инвалидируются через подписку на уже существующее событие, а не через новые хуки в скриптах tag/feature/option/pricing/stock — это меньше точек интеграции, чем в первой версии плана.

## GraphQL Admin API

Изменения в `services/catalog/src/api/graphql-admin/schema/collection.graphql` (проект в режиме "backward compatibility запрещён", контракт меняем напрямую):

```graphql
enum CollectionRuleField {
  TAG
  FEATURE
  CATEGORY
  OPTION
  PRICE
  CREATED_AT
  IN_STOCK
}

enum CollectionRuleOperator {
  IN
  ALL
  CONTAINS
  EQ
  GT
  GTE
  LT
  LTE
  BETWEEN
}

enum CollectionRuleMatchType {
  ALL
  ANY
}

type CollectionRule {
  id: ID!
  field: CollectionRuleField!
  operator: CollectionRuleOperator!
  value: JSON!
  sortIndex: Int!
}

input CollectionRuleInput {
  field: CollectionRuleField!
  operator: CollectionRuleOperator!
  value: JSON!
}

input CollectionUpdateRulesInput {
  collectionId: ID!
  ruleMatchType: CollectionRuleMatchType!
  rules: [CollectionRuleInput!]!
}

"Предпросмотр товаров, которые попадут в коллекцию по ещё не сохранённым правилам."
type Query {
  collectionPreviewRuleMatches(
    ruleMatchType: CollectionRuleMatchType!
    rules: [CollectionRuleInput!]!
    first: Int
    after: String
  ): CollectionProductConnection!
}

"Принудительный пересчёт membership — эскейп-люк для реконсиляции."
type Mutation {
  collectionRecomputeMembership(collectionId: ID!): CollectionRecomputeMembershipPayload!
}

type CollectionRecomputeMembershipPayload {
  collection: Collection
  addedCount: Int!
  removedCount: Int!
  userErrors: [GenericUserError!]!
}
```

`collectionPreviewRuleMatches` и `collectionUpdateRules` идут по одному и тому же пути `CollectionRuleMatcher`, то есть предпросмотр черновых правил уже включает вызов `listing.evaluateProductMembership` — предпросмотр отражает текущее состояние индекса listing, а не гипотетическое "живое" состояние catalog (см. «Риски»).

## Admin UI (кратко, не основной фокус плана)

- Конструктор правил на основе `CollectionRuleField`/`CollectionRuleOperator` enum вместо свободного текста.
- Переключатель `ruleMatchType` (все/любое).
- Живой предпросмотр через `collectionPreviewRuleMatches`.
- Кнопка "Recompute" на карточке коллекции.

## Listing и storefront (фаза 5, после стабилизации фаз 1–4)

Сегодня storefront вообще не знает о коллекциях. `categoryId`-скоупинг в listing работает потому, что членство в категории синхронизируется в собственный денормализованный индекс listing на этапе ingestion — `listing` никогда не читает схему `catalog` напрямую. Для показа коллекций на витрине нужно повторить этот же путь (не через общий facet bitmap — CHECK-ограничение это явно запрещает):

1. Storefront `catalog`: federation-сущность `Collection` (id, handle, name, description, seo, media), по образцу storefront `Category` (`services/catalog/src/api/graphql-storefront/schema/navigation/category.graphql`) — **без** поля `products`, ровно как у `Category`.
2. Расширить снапшот, который catalog отдаёт в listing при синхронизации товара, списком `collectionIds` текущего товара (из материализованного `collection_item`).
3. В listing — отдельный, не bitmap-based механизм хранения принадлежности к коллекции (posting-list таблица без CHECK-ограничения либо денормализованный `collectionIds uuid[]` с GIN-индексом).
4. `collectionId`/`collectionHandle` аргумент в storefront search/listing query.
5. Сортировка страницы коллекции (`defaultSort`/`defaultSortDirection` из catalog) транслируется в параметры сортировки listing search.

## Риски

- **Новое направление межсервисной зависимости.** Сегодня `catalog` никогда не вызывает `listing` синхронно; только наоборот. `listing.evaluateProductMembership` вводит обратную связь: базовая admin-функциональность catalog (сохранение правил, предпросмотр, recompute) начинает зависеть от доступности `listing`. Если `listing` недоступен или сильно отстаёт, делегированные поля (`tag/feature/option/price/in_stock`) не могут быть вычислены — `category`/`created_at` при этом продолжают работать, потому что остаются локальными в catalog. Это осознанный компромисс: альтернатива — дублировать в catalog уже написанную и протестированную под нагрузкой бизнес-логику (bucketing цены, вывод availability) — более рискованна с точки зрения расхождения двух определений одного и того же факта.
- **Eventual consistency.** `listing` синхронизируется с catalog асинхронно (события + DBOS workflow). Между правкой тега/цены/остатка на товаре и тем, что `listing.evaluateProductMembership` увидит это изменение, есть окно задержки — то же самое окно, которое уже существует для появления товара в facet-поиске на витрине. Предпросмотр черновых правил будет отражать текущее состояние индекса listing, а не абсолютно самое свежее состояние catalog. Для recompute после сохранения правил это компенсируется периодической реконсиляцией (`CollectionMembershipRebuildWorkflow`).
- **`matchType: ANY` через разнородные делегированные поля** реализуется N отдельными вызовами `listing.evaluateProductMembership` и объединением в catalog — дороже по числу вызовов, чем `ALL` (один вызов с несколькими фильтрами). Если merchant активно использует `ANY` на больших магазинах, может понадобиться батчинг вызовов или расширение listing под нативный OR.
- **Дорогой full recompute на массовых таксономических изменениях** — постранично через DBOS workflow, не синхронно (тот же риск уже отмечен инлайн-комментарием в `FacetAffectedProductsResyncWorkflow`).
- **`lexoRank` для rule-коллекций** обязателен (`NOT NULL`), но не участвует в сортировке — материализатор присваивает его детерминированно по порядку получения, чтобы не плодить смысловой шум.
- **Новый узкий bulk-эндпоинт в listing** (`ListingMembershipEvaluationService`) — это новый код поверх существующих SQL-примитивов, а не бесплатное переиспользование; его нужно спроектировать так, чтобы не отъедать производительность у storefront-запросов, если оба используют одни и те же posting-list таблицы одновременно.

## Открытые решения

1. Точная семантика `contains` относительно `in`.
2. Нужна ли явная валюта в правиле `price` в v1, или фиксируем валюту магазина по умолчанию?
3. `category` — включает ли потомков категории (через `CategoryHierarchyScope`) или только прямое присвоение `product_category`?
4. Порог (число товаров/правил), при котором `collectionUpdateRules` уходит в синхронный recompute против асинхронного workflow.
5. Нужно ли в v1 гарантировать, что предпросмотр/recompute дожидаются "догонки" индекса listing после недавней правки товара, или eventual consistency принимается как есть (см. «Риски»)?
6. Формат posting-механизма для коллекций в listing (фаза 5) — отдельная posting-list таблица или денормализованный массив `collectionIds`.

## Поэтапное внедрение

### Фаза 1 — Локальный matcher + контракт с listing

- Миграция `0905_collections__rule_match_type.sql` + Drizzle-модель.
- Ужесточить `CollectionUpdateRulesScript`: валидация формы `value`.
- `CollectionLocalRuleMatcher` (`category`, `created_at`).
- `CollectionRuleListingFilterMapper` (чистая трансформация, без сети).
- Согласовать и построить `listing.evaluateProductMembership` + `ListingMembershipEvaluationService` в listing.
- `CollectionRuleMatcher`-оркестратор, объединяющий local + delegated по `matchType`.

### Фаза 2 — Admin API: чтение товаров коллекции (закрывает разрыв и для manual)

- `CollectionRepository.getCollectionProductsConnection` по образцу `CategoryRepository.getCategoryProductsConnection`.
- `CollectionProductConnectionResolver`, регистрация в `ResolverRegistry`.
- Удалить мёртвые `CollectionProductsQueryParams/Result` DTO.

### Фаза 3 — Материализация и полный пересчёт по требованию

- `CollectionMembershipMaterializer`.
- `CollectionMembershipRebuildWorkflow` (DBOS, постраничный).
- `collectionUpdateRules` запускает full recompute после сохранения.
- Мутация `collectionRecomputeMembership` + enum'ы в GraphQL.
- `collectionPreviewRuleMatches` query.

### Фаза 4 — Инкрементальная инвалидация

- Подписка catalog на `listingFacetMembershipChanged` для делегированных полей.
- Точечные хуки в category assignment / product lifecycle скриптах для локальных полей.
- Периодический full reconciliation job как safety net.

### Фаза 5 — Listing и storefront

- Storefront `Collection` federation entity в catalog (без `products`).
- Расширение снапшота catalog→listing полем `collectionIds`.
- Новый (не bitmap) posting-механизм в listing.
- `collectionId`/`collectionHandle` аргумент в storefront search listing.

## Рекомендуемый v1

Фазы 1–3: matcher (local + delegated в listing), материализация в `collection_item`, admin-чтение товаров коллекции, full recompute по требованию, предпросмотр. Фаза 4 (инкрементальная инвалидация) может первое время подменяться ручной кнопкой "Recompute" и периодической реконсиляцией. Listing/storefront (фаза 5) вне периметра v1.
