# План реализации Rule Based Collections

## Статус и контекст

В `catalog` уже существует домен коллекций (`migrations/domains/0900_collections`), рассчитанный на два типа: `manual` и `rule`. Реально работает только `manual`, и то не полностью:

- Таблицы есть: `collection`, `collection_item` (productId + lexoRank), `collection_rule` (field/operator/value jsonb + sortIndex), `collection_translation`, `collection_seo`, `collection_media`. Drizzle-модели 1:1 в `services/catalog/src/repositories/models/collection.ts`.
- Репозитории есть: `CollectionRepository`, `CollectionItemRepository` (add/remove/move/rebalance поверх `LexoRankRepository`), `CollectionRuleRepository` (`findByCollectionId`, `replaceRules` — delete+reinsert без диффа).
- Скрипты есть: Create/Update/Delete/AddProducts/RemoveProducts/MoveProduct/Rebalance/**UpdateRules**. `CollectionUpdateRulesScript` (`services/catalog/src/scripts/collection/CollectionUpdateRulesScript.ts:4-12`) только валидирует пары field/operator по whitelist (`tag/feature/category/option: in|all|contains`, `price/created_at: eq|gt|gte|lt|lte|between`, `in_stock: eq`) и сохраняет их. **Ни одного места, где правила реально исполняются против каталога, не существует.** Нет ни preview, ни recompute, ни публикации membership.
- GraphQL admin (`schema/collection.graphql`) уже описывает `Collection.rules`, `CollectionUpdateRulesInput`, но `field`/`operator` — это `String!`, без enum. Preview-запроса ("какие товары попадут в коллекцию по этим правилам") нет.
- **Более широкий разрыв:** `CollectionResolver.products()` и `productsCount()` — буквальные `// TODO: Implement ... with keyset pagination` / `// TODO: Implement ... with COUNT(*)`. Ни у manual, ни у rule коллекций сегодня нет рабочего чтения списка товаров. DTO `CollectionProductsQueryParams/Result` в `scripts/collection/dto/index.ts` существуют, но никем не используются (dead code) — эталонная реализация для этого пути уже есть у `Category` (см. ниже) и её нужно скопировать, а не оживлять мёртвые DTO.
- В storefront (`graphql-storefront`) коллекции не представлены вообще — 0 упоминаний.
- В `listing` коллекция упоминается один раз: CHECK-ограничение `chk_listing_posting_bitmap_no_collection_field` (`services/listing/src/repositories/models/listingIndex.ts:407-408`) явно **запрещает** `field = 'collection'` в общей posting-list/bitmap таблице фасетов (tag/option/feature/price и т.д.). Это осознанная резервация: членство в коллекции не должно жить в общем bitmap-механизме фасетов и требует отдельного решения, когда до этого дойдёт очередь.

Итог: схема и CRUD-обвязка для rule-коллекций были заложены заранее, но вся смысловая часть — сопоставление правил с товарами, публикация membership, чтение списка товаров, storefront и listing — не реализована. Это greenfield-задача поверх готового скелета.

## Продуктовые цели

- Мерчант создаёт коллекцию типа `rule`, задаёт условия (`tag`, `feature`, `category`, `option`, `price`, `created_at`, `in_stock`), выбирает `matchType` (все условия / любое условие).
- После сохранения правил коллекция автоматически наполняется подходящими товарами без участия мерчанта.
- При изменении товара (тег, характеристика, категория, опция, цена, остаток, публикация, удаление) членство в затронутых rule-коллекциях пересчитывается автоматически и малой кровью — без полного пересчёта каталога на каждое изменение одного товара.
- Admin может увидеть предпросмотр совпадающих товаров до сохранения правил.
- Admin может прочитать список товаров коллекции (manual и rule одинаково) с пагинацией и сортировкой — это же попутно закрывает существующий разрыв для `manual` коллекций.
- Дальше (вне v1, но не блокируется им) — товары коллекции должны быть доступны на витрине и участвовать в поиске/фильтрации listing.

## Не входит в объём v1

- Витрина (storefront) и интеграция с listing — выносятся в фазу B (раздел «Listing и storefront»), потому что сначала нужно, чтобы каталог сам умел вычислять и отдавать membership.
- Вложенные группы условий (`(A И B) ИЛИ (C И D)`) — v1 ограничивается одним уровнем `matchType: ALL | ANY` над плоским списком правил, как в схеме `collection_rule` сегодня.
- Мультивалютные price-правила — v1 оценивает `price` только в валюте магазина по умолчанию.
- ML/поведенческие сигналы (аналог FBT из `product-recommendations.ru.md`) — rule-коллекции остаются декларативными и детерминированными.
- Изменение общего facet bitmap-механизма listing — CHECK-ограничение, запрещающее `collection` в posting-list, не трогаем.

## Термины

| Термин | Значение |
| --- | --- |
| `rule` | Одна строка `collection_rule`: `field` + `operator` + `value` |
| `matchType` | Правило объединения условий внутри коллекции: `ALL` (AND) или `ANY` (OR) |
| `membership` | Множество `productId`, которое коллекция должна содержать прямо сейчас |
| `materialization` | Запись вычисленного membership в существующую таблицу `collection_item` |
| `full recompute` | Пересчёт membership с нуля по всем товарам магазина (используется после правки правил) |
| `incremental recompute` | Пересчёт membership только для товаров, затронутых конкретным изменением (тег, цена и т.д.) |
| `affected product` | ProductId, для которого правки в каталоге могли изменить результат хотя бы одного правила |

## Архитектурные принципы

1. **Сопоставление правил — это чистый SQL внутри БД catalog.** Все семь полей (`tag`, `feature`, `category`, `option`, `price`, `created_at`, `in_stock`) читаются из таблиц, которыми и так владеет catalog (`product_tag`, `product_feature`/`product_feature_value`, `product_category`, `product_option`/`product_option_value`/`product_option_variant_link`, `item_pricing`/`product_price_range`, `product.created_at`, `warehouse_stock`/`inventory_item`). Кросс-сервисные вызовы (`pricing`, отдельный inventory-сервис) не нужны — см. таблицу в разделе «Семантика правил».
2. **Membership материализуется, а не вычисляется на каждое чтение.** Результат пишется в уже существующую `collection_item` — тот же путь чтения, что и для `manual` коллекций, переиспользуется без изменений. Это тот же принцип, что и в `dynamic-content-engine-architecture-plan.md` («материализация обязательна») и в recommendation-домене listing («storefront читает только опубликованный snapshot»).
3. **Инвалидация — по образцу уже работающего facet resync.** В catalog уже есть `ListingFacetAffectedProductRepository` (`services/catalog/src/repositories/facet/ListingFacetAffectedProductRepository.ts`) — по изменённым ref'ам (tag/feature/option) находит affected productId постранично. В listing есть `FacetAffectedProductsResyncWorkflow` (`services/listing/src/workflows/FacetAffectedProductsResyncWorkflow.ts`) — DBOS workflow, который постранично вызывает `broker.call("catalog.findListingFacetAffectedProducts", ...)` и на каждый productId эмитит событие. Rule-коллекции копируют эту же форму: affected-product finder + постраничный workflow, только результат — не событие для listing, а diff `collection_item` внутри catalog.
4. **Точечные правки штатных скриптов, а не отдельный параллельный pipeline.** Как и `DynamicContentInvalidationService`, инвалидация rule-коллекций вызывается из существующих product/tag/feature/category/option/price/stock-скриптов, а не полагается на отдельный поллинг.
5. **Полный пересчёт — только когда меняется сама формула.** Правка `collection_rule` (сохранение новых условий) требует full recompute этой одной коллекции. Правка данных товара (тег, цена и т.д.) требует incremental recompute только затронутых товаров и только тех коллекций, чьи правила ссылаются на изменившийся ref.
6. **Сначала catalog, потом listing.** `Collection.products()` в admin API должен работать на данных catalog так же, как `Category.products()` — без ожидания интеграции с listing. Интеграция с listing (влияние на витрину и фасетный поиск) — отдельная фаза, потому что для неё нужен отдельный от общего facet bitmap механизм (см. CHECK-ограничение).

## Владение и границы

| Сервис | Отвечает за |
| --- | --- |
| `catalog` | Определение коллекций и правил, вычисление membership, материализация в `collection_item`, admin API коллекций, инвалидация при изменении товаров |
| `listing` | (Фаза B) Синхронизация membership в собственный индекс, фильтрация/сортировка товаров коллекции на витрине, участие коллекции в фасетном поиске |
| `pricing` | Не участвует — базовая цена, используемая в правиле `price`, хранится в самом catalog (`item_pricing`/`product_price_range`), `pricing`-сервис отвечает только за промо/скидки, которые в membership не участвуют |

## Семантика правил

### Поля и их данные (всё внутри БД catalog)

| `field` | Источник данных | Замечания |
| --- | --- | --- |
| `tag` | `product_tag` → `tag` | M2M, значение — список handle тегов |
| `feature` | `product_feature` (slug, дерево через `parentId`/`index[]`) + `product_feature_value` (slug) | нужно явно решить: правило матчит по slug характеристики или по slug конкретного значения — см. «Открытые решения» |
| `category` | `product_category` (productId, categoryId, isPrimary) | нужно решить: только прямое присвоение или включая потомков через `CategoryHierarchyScope` — см. «Открытые решения» |
| `option` | `product_option` + `product_option_value` + `product_option_variant_link` + `variant` | опция назначается на уровне варианта — «товар имеет значение опции X» означает «хотя бы один активный вариант имеет это значение» |
| `price` | `item_pricing`/`variant_prices_current` (текущая цена) или `product_price_range` (min/max по товару) | v1: валюта — валюта магазина по умолчанию; `between` — `[min, max]` в минорных единицах |
| `created_at` | `product.createdAt` (уже есть `idx_product_created_at`) | тривиально |
| `in_stock` | `warehouse_stock` (quantity_on_hand − reserved_qty − unavailable_qty) + `inventory_item` (`trackInventory`, `continueSellingWhenOutOfStock`) | готового boolean/view нет, нужно выводить: товар «в наличии», если `trackInventory=false` ИЛИ `continueSellingWhenOutOfStock=true` ИЛИ сумма доступного количества по вариантам > 0 |

### Операторы `in` / `all` / `contains`

Сегодня whitelist разрешает все три оператора для `tag/feature/category/option`, но семантика между `in`/`all`/`contains` нигде не зафиксирована и не проверяется на форму `value`. Предлагаемая семантика v1 (нужно подтвердить, см. «Открытые решения»):

- `in` — товар имеет **хотя бы одно** значение из `value` (массив handle);
- `all` — товар имеет **все** значения из `value` (`GROUP BY productId HAVING COUNT(DISTINCT ...) = len(value)`);
- `contains` — синоним `in` для одиночного значения (`value` — не массив, а один handle).

### Значение (`value`): handle или id

`value` должен хранить **handle/slug**, а не внутренний UUID: это соответствует уже принятому в проекте паттерну `ListingFacetAffectedProductRef.sourceHandle` (facet resync работает с handle, не с id), делает правило переносимым при экспорте/импорте и человекочитаемым в Admin UI. Резолюция handle → внутренний id происходит на этапе выполнения запроса, в рамках одного `storeId`.

### `matchType`

В `collection` сегодня нет поля для «все условия / любое условие» — это единственная новая колонка, которая нужна схеме. Требуется миграция:

```text
services/catalog/migrations/domains/0900_collections/0905_collections__rule_match_type.sql

ALTER TABLE "catalog"."collection"
  ADD COLUMN "rule_match_type" varchar(4) NOT NULL DEFAULT 'all';

ALTER TABLE "catalog"."collection"
  ADD CONSTRAINT "collection_rule_match_type_check"
  CHECK ("rule_match_type" IN ('all', 'any'));
```

(генерировать через штатный tooling проекта, не писать changeset руками — см. `AGENTS.md`/knowledge base правила по миграциям).

### Валидация формы `value`

`CollectionUpdateRulesScript` сегодня проверяет только допустимость пары field/operator, но не форму `value` (массив против скаляра, `between` как двухэлементный кортеж, корректность handle). Это нужно закрыть до передачи в rule-matcher, иначе некорректные правила будут молча давать пустой/ошибочный результат при вычислении membership.

## Компоненты

### `CollectionRuleQueryBuilder` (catalog)

Чистая функция/класс: по массиву `CollectionRule` + `matchType` строит Drizzle-предикат(ы) против `product` с нужными join'ами (по одному join-блоку на `field`, см. таблицу выше) и возвращает постранично `productId[]`, отсортированные по `id` для устойчивой курсорной пагинации — по образцу `ListingFacetAffectedProductRepository.findAffectedProductIdsForRef`. Не занимается записью, только чтением.

### `CollectionMembershipMaterializer` (catalog)

На вход — `collectionId`. Последовательность:

1. Загрузить правила и `ruleMatchType` коллекции.
2. Получить полное множество совпадающих `productId` через `CollectionRuleQueryBuilder` (постранично).
3. Сравнить с текущими строками `collection_item` (`CollectionItemRepository.findByCollectionId`).
4. Добавить недостающие через `CollectionItemRepository.addProducts` (переиспользует существующий lexoRank-механизм — ранг для rule-коллекций не участвует в дефолтной сортировке, так как `default_sort != 'manual'` уже гарантировано CHECK-ограничением `collection_rule_manual_sort_check`, но колонка `lexoRank` всё равно NOT NULL и должна быть заполнена).
5. Удалить лишние через `CollectionItemRepository.removeProducts`.

Идемпотентна: повторный запуск без изменений в каталоге — no-op diff.

### `CollectionRuleAffectedProductFinder` (catalog) — инкрементальная инвалидация

По аналогии с `ListingFacetAffectedProductRepository`: на вход — изменившийся ref (`{ field: 'tag', handle: 'summer' }`, `{ field: 'price', productId }`, `{ field: 'category', handle }` и т.д.), на выход — список `productId`, на которые это изменение могло повлиять, и список `collectionId` rule-коллекций, чьи правила ссылаются на этот `field`+`handle`. Затем для каждой такой пары (`collectionId`, `productId`) выполняется точечная проверка «подходит ли именно этот товар под правила именно этой коллекции сейчас» и точечный `addProducts`/`removeProducts` на один productId — без пересчёта всей коллекции.

### `CollectionMembershipRebuildWorkflow` (catalog, DBOS)

Постраничный batch workflow по образцу `ListingBatchProductIndexWorkflow` (один шаг — один файл: `stepFetchRuleCollections`, `stepEvaluateRuleCollectionPage`, `stepDiffAndWriteCollectionItems`). Используется для:

- full recompute одной коллекции сразу после сохранения новых правил (`collectionUpdateRules`);
- полного пересчёта всех rule-коллекций магазина как safety-net реконсиляции (периодический job, чтобы компенсировать пропущенные точечные инвалидации);
- миграции/бэкофилла при первом включении фичи.

### `CollectionProductConnectionResolver` + `CollectionRepository.getCollectionProductsConnection` (catalog, admin GraphQL)

Закрывает разрыв, который сегодня существует и для `manual`, и для `rule` коллекций (`CollectionResolver.products()`/`productsCount()` — TODO). Копирует уже работающий паттерн `CategoryProductConnectionResolver` (`services/catalog/src/resolvers/admin/CategoryProductConnectionResolver.ts`) → `CategoryRepository.getCategoryProductsConnection` (`services/catalog/src/repositories/category/CategoryRepository.ts:887`):

- базовое условие `collection.collectionId = X` вместо `category.categoryId = X`;
- те же ключи сортировки: `MANUAL` → `collection.lexoRank` (для `manual` коллекций), `NEWEST` → `createdAt`, `PRICE` → `priceRange.min/maxAmountMinor`, `NAME` → `translation.name`;
- переиспользует тот же generic Relay query builder, что и `categoryProductsRelayQuery` (см. `admin-products-drizzle-query-relay-refactor-plan.md`, `drizzle-query-filter-field-mapper-plan.md`), а не поднимает заново мёртвые DTO из `scripts/collection/dto/index.ts`.

Для rule-коллекций этот резолвер просто читает уже материализованный `collection_item` — никакой отдельной логики не требуется, он не отличает `manual` от `rule`.

## Точки инвалидации (что дописать в существующие скрипты)

По аналогии с invalidation matrix из `dynamic-content-engine-architecture-plan.md`:

| Изменение | Что пересчитать |
| --- | --- |
| Создание/публикация/удаление товара | incremental: товар проверяется против всех rule-коллекций магазина, ссылающихся на любое из его полей |
| Назначение/снятие тега | incremental: `CollectionRuleAffectedProductFinder({field:'tag', handle})` → точечная проверка |
| Изменение/удаление/merge feature или feature value | incremental, аналогично facet resync reason'ам (`facet_value_updated`, `facet_value_merged` и т.д.) |
| Назначение/снятие категории | incremental; учитывать решение по иерархии (см. «Открытые решения») |
| Изменение option/option value у варианта | incremental по `productId` варианта |
| Новая цена в `item_pricing` | incremental по `productId` |
| Изменение `warehouse_stock`/`inventory_item` | incremental по `productId` (через связку variant → product) |
| Сохранение `collectionUpdateRules` | **full recompute** только этой коллекции |
| Массовое изменение таксономии (удаление тега/категории/feature-value, затрагивающее много товаров) | full recompute только коллекций, ссылающихся на удалённый ref, постранично через `CollectionMembershipRebuildWorkflow` |

Скрипты, в которые нужно добавить вызов инвалидации (по аналогии со списком в dynamic-content плане, но применительно к rule-коллекциям): product create/update/delete/publish scripts, tag assignment scripts, feature/feature-value scripts, category assignment scripts, option/option-value scripts, pricing scripts (`item_pricing` insert), stock scripts (`warehouse_stock` update).

## GraphQL Admin API

Изменения в `services/catalog/src/api/graphql-admin/schema/collection.graphql` (проект в режиме "backward compatibility запрещён", поэтому меняем контракт напрямую, без dual-write/dual-read):

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

`collectionUpdateRules` после сохранения синхронно (для маленьких магазинов) или асинхронно через `CollectionMembershipRebuildWorkflow` (по порогу числа товаров/правил) запускает full recompute и возвращает актуальный `Collection` с уже пересчитанным `productsCount`.

## Admin UI (кратко, не основной фокус плана)

- Конструктор правил на основе `CollectionRuleField`/`CollectionRuleOperator` enum вместо свободного текста.
- Переключатель `ruleMatchType` (все/любое).
- Живой предпросмотр через `collectionPreviewRuleMatches` при редактировании условий, до сохранения.
- Кнопка "Recompute" на карточке коллекции, вызывающая `collectionRecomputeMembership` (диагностика/ручное восстановление).

## Listing и storefront (фаза B, после стабилизации catalog-части)

Сегодня storefront вообще не знает о коллекциях, а `categoryId`-скоупинг в listing работает потому, что членство в категории синхронизируется в собственный денормализованный индекс listing на этапе ingestion (через `ListingBatchProductIndexWorkflow`/`catalogListingSnapshotMapper`), а не через прямой join в БД catalog — `listing` никогда не читает схему `catalog` напрямую.

Для коллекций нужно повторить этот же путь, но **не** через общий facet bitmap (явно запрещено `chk_listing_posting_bitmap_no_collection_field`):

1. Storefront `catalog`: добавить federation-сущность `Collection` (id, handle, name, description, seo, media) по образцу storefront `Category` (`services/catalog/src/api/graphql-storefront/schema/navigation/category.graphql`) — **без** поля `products`, ровно как у `Category` (листинг товаров категории уже сегодня отдаёт `listing`, не `catalog`).
2. Расширить снапшот, который catalog отдаёт в listing при синхронизации товара (`catalogListingSnapshotMapper.ts`), списком `collectionIds` текущего товара (из материализованного `collection_item`), аналогично тому, как туда уже попадает информация о категориях.
3. В listing завести отдельный, не bitmap-based механизm хранения принадлежности к коллекции (открытое решение — либо отдельная posting-list таблица без CHECK-ограничения, либо денормализованный `collectionIds uuid[]` с GIN-индексом на строке индекса товара — коллекционные страницы обычно фильтруют по одному `collectionId`, а не комбинируют по И/ИЛИ как фасеты).
4. Добавить `collectionId`/`collectionHandle` аргумент в storefront search/listing query listing'а, аналогичный существующему `categoryId`.
5. Сортировка на странице коллекции (`defaultSort`/`defaultSortDirection` из catalog) транслируется в параметры сортировки listing search.

Эта фаза не блокирует фазу A (admin CRUD + вычисление membership внутри catalog) и должна начинаться только после того, как materializer и инвалидация в catalog стабильны — иначе listing будет синхронизировать заведомо неполные/некорректные данные.

## Риски

- **Дорогой full recompute на популярных таксономических изменениях.** Удаление тега, на который завязаны десятки rule-коллекций, требует пересчёта каждой — обязательно постранично через DBOS workflow, не синхронно в рамках одного запроса (тот же риск уже отмечен инлайн-комментарием в `FacetAffectedProductsResyncWorkflow` про DBOS, персистящий полный output).
- **Рассинхронизация incremental-инвалидации.** Если забыть добавить хук в один из скриптов изменения товара, membership тихо устареет. Нужен периодический full reconciliation job как safety net (см. `CollectionMembershipRebuildWorkflow`).
- **Неоднозначная семантика `all`/`in`/`contains` и категорийной иерархии** может разойтись с ожиданиями мерчанта, если не зафиксировать её явно до реализации (см. «Открытые решения»).
- **`lexoRank` для rule-коллекций** — колонка обязательна (`NOT NULL`), но не используется для сортировки (`default_sort != 'manual'` гарантирован CHECK). Материализатор должен присваивать значение детерминированно (например, по порядку обнаружения в query), чтобы не плодить смысловой шум.
- **Listing-интеграция потребует нового индексного механизма**, а не переиспользования facet bitmap — это отдельный кусок работы с собственными рисками производительности (см. `listing/docs/draft/listing-price-facet-10k-performance-report.ru.md` как прецедент для оценки нагрузки на posting-list подход).

## Открытые решения

1. Правило `feature` матчит по slug характеристики целиком или по slug конкретного значения характеристики? От этого зависит форма `value` и join.
2. Правило `category` включает потомков категории (через `CategoryHierarchyScope`) или только прямое присвоение `product_category`?
3. Точная семантика `contains` относительно `in` — синонимы или разное поведение (например, `contains` — subset check в другую сторону)?
4. Нужна ли явная валюта в правиле `price` в v1, или фиксируем валюту магазина по умолчанию и не даём мерчанту выбор?
5. Порог (число товаров/правил), при котором `collectionUpdateRules` уходит в синхронный recompute против асинхронного workflow?
6. Формат posting-механизма для коллекций в listing (фаза B) — отдельная posting-list таблица или денормализованный массив `collectionIds` на строке индекса?

## Поэтапное внедрение

### Фаза 1 — Rule matching и материализация (catalog, без GraphQL-изменений)

- Миграция `0905_collections__rule_match_type.sql` + Drizzle-модель.
- Ужесточить `CollectionUpdateRulesScript`: валидация формы `value` под оператор.
- `CollectionRuleQueryBuilder` с join-блоками на все семь полей.
- `CollectionMembershipMaterializer` поверх существующего `CollectionItemRepository`.
- Юнит-покрытие сопоставления правил на фикстурах без похода в GraphQL.

### Фаза 2 — Admin API: чтение товаров коллекции (закрывает разрыв и для manual)

- `CollectionRepository.getCollectionProductsConnection` по образцу `CategoryRepository.getCategoryProductsConnection`.
- `CollectionProductConnectionResolver` по образцу `CategoryProductConnectionResolver`, регистрация в `ResolverRegistry`.
- Удалить мёртвые `CollectionProductsQueryParams/Result` DTO либо явно пометить как unused.

### Фаза 3 — Полный пересчёт по требованию

- `CollectionMembershipRebuildWorkflow` (DBOS, постраничный).
- `collectionUpdateRules` вызывает full recompute после сохранения (порог синхронно/асинхронно — открытое решение).
- Мутация `collectionRecomputeMembership` + enum'ы `CollectionRuleField/Operator/MatchType` в GraphQL.
- `collectionPreviewRuleMatches` query.

### Фаза 4 — Инкрементальная инвалидация

- `CollectionRuleAffectedProductFinder`.
- Точечные хуки в product/tag/feature/category/option/pricing/stock скриптах (таблица инвалидации выше).
- Периодический full reconciliation job как safety net.

### Фаза 5 — Listing и storefront

- Storefront `Collection` federation entity в catalog (без `products`).
- Расширение снапшота `catalogListingSnapshotMapper` полем `collectionIds`.
- Новый (не bitmap) posting-механизм в listing.
- `collectionId`/`collectionHandle` аргумент в storefront search listing.

## Рекомендуемый v1

Для первого релиза достаточно фаз 1–3: рабочий rule-matching, материализация в `collection_item`, admin-чтение товаров коллекции (manual и rule одинаково), full recompute по требованию и предпросмотр. Инкрементальная инвалидация (фаза 4) может первое время подменяться ручной кнопкой "Recompute" в Admin UI и периодической ресинхронизацией, если нужно сократить v1 ещё сильнее. Listing/storefront (фаза 5) сознательно выносится за периметр v1 — без него коллекции уже полезны в Admin (мерчант видит и проверяет состав), но не видны покупателю.
