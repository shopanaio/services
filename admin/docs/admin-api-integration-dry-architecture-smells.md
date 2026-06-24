# Анализ admin API-интеграции products/categories/tags: DRY и architecture smells

Дата анализа: 2026-06-24.

## Область анализа

Проверены страницы, модалки, GraphQL documents, hooks и mappers для:

- `admin/src/domains/inventory/products`
- `admin/src/domains/inventory/categories`
- `admin/src/domains/inventory/tags`
- общие pickers в `admin/src/shared/components/entity-picker-modal`

Критерии сверялись с `knowledge/vault/patterns/admin-graphql-layer.md` и `knowledge/vault/patterns/currency-handling.md`.

## Краткий вывод

Текущая структура уже частично идет в правильную сторону: у products/categories/tags есть модульные `graphql/`, `hooks/`, `mappers/`, `page/`, `modals/`, а UI во многих местах принимает generated API types напрямую из `@/graphql/types`.

Основная проблема не в отсутствии модулей, а в том, что границы между ними размыты:

- API write orchestration живет одновременно в hooks, details components, modal orchestration hooks и callback payloads.
- Есть повторяющиеся GraphQL fragments, operation typings, connection hooks, filter transformers, mutation wrappers и form/API mappers.
- Cache/refetch strategy локальная и несогласованная: часть hooks рефетчит hard-coded queries, часть страниц вызывает `refetch()` из modal callbacks, часть details sections делает ручной refresh после локального состояния.
- Product-category и product-tag связи реализованы несколькими конкурирующими способами.

## Что соответствует паттернам

- Модули имеют целевую папочную структуру из `admin-graphql-layer`: `graphql`, `hooks`, `mappers`, `page`, `modals`.
- Query hooks в целом скрывают вложенные пути вида `data.catalogQuery.products` и возвращают `products/categories/tags`, `totalCount`, `pageInfo`, `loading`, `error`.
- Мутационные hooks возвращают `userErrors` и не бросают API validation errors наружу как исключения.
- Products list рендерит цены через `useDefaultCurrency()` и `formatPrice(value, defaultCurrency)`, то есть не использует per-record `price.currency` как display source.

## Findings

### 1. Локальный GraphQL barrel становится вторым источником API типов

Severity: высокая.

Во всех трех модулях `graphql/index.ts` реэкспортирует `operation-types`:

- `products/graphql/index.ts:1-4`
- `categories/graphql/index.ts:1-4`
- `tags/graphql/index.ts:1-4`

Это провоцирует импорты operation/API typings из feature-local `../graphql`, хотя правило `admin-graphql-layer` говорит импортировать generated API types напрямую из `@/graphql/types`.

Самый явный случай drift: `categories/graphql/operation-types.ts:39-54` заново объявляет `ApiCategoryHierarchyScopeInput`, `ApiCategoryProductsScopeInput`, `ApiCategoryCategoriesMetaInput`, хотя generated type уже есть в `admin/src/graphql/types.ts:1359-1362`. Дальше этот локальный `ApiCategoryCategoriesMetaInput` импортируется из feature barrel в:

- `shared/components/entity-picker-modal/category-picker-modal.tsx`
- `shared/components/entity-picker-modal/configs/category-picker-config.ts`
- `products/components/product-details-card/sections/categories-section.tsx`
- `categories/components/category-details-card/hooks/use-category-modals.ts`

Риск: generated schema меняется, а локальная копия типа остается прежней. Также имя с префиксом `Api` создает ложное ощущение, что это generated contract.

Рекомендация:

- Оставить `graphql/index.ts` barrel только для operation documents или убрать его для типов.
- Удалить локальные `ApiCategory*MetaInput` declarations.
- Везде импортировать `ApiCategoryCategoriesMetaInput` из `@/graphql/types`.
- В `operation-types.ts` держать только operation response/variables, построенные от generated types, без объявления `Api*` контрактов.

### 2. GraphQL fragments дублируются и местами слишком широкие

Severity: средняя/высокая.

Повторения:

- `UserErrorFields` есть в products (`products/graphql/fragments.ts:3-9`), categories (`categories/graphql/fragments.ts:3-9`) и tags как `TagUserErrorFields` (`tags/graphql/fragments.ts:3-9`).
- `FileFields` в products (`products/graphql/fragments.ts:19-60`) и `CategoryFileFields` в categories (`categories/graphql/fragments.ts:11-52`) практически одинаковые.
- `TagListFields`, `TagDetailsFields`, `TagMutationResultFields` содержат одинаковый набор полей (`tags/graphql/fragments.ts:11-39`).

Отдельный performance smell: `ProductListFields` для list/table тянет `variants(first: 100)` с price и inventory (`products/graphql/fragments.ts:273-292`). Таблица затем считает min/max price и stock на клиенте. Это связывает список товаров с деталями вариантов, создает скрытый лимит `100` и переносит агрегирование из API в UI.

Рекомендация:

- Вынести стабильные shared fragments (`UserErrorFields`, `FileFields`, `RichTextFields`) в общий admin GraphQL layer, например `admin/src/domains/inventory/graphql` или `admin/src/graphql/fragments`.
- Для tags оставить один fragment на одинаковый use case или явно разделить list/details, если детали реально начнут отличаться.
- Для products list запросить API-level aggregate fields для min/max price и total stock, либо завести dedicated lightweight list fragment без `variants(first: 100)`.

### 3. Connection query hooks повторяют один и тот же шаблон

Severity: средняя.

`useProducts`, `useCategories`, `useTags`, `useCategoryProducts` повторяют один контракт:

- `useQuery`
- `data ?? previousData`
- `connection?.edges.map(edge => edge.node)`
- `totalCount`
- `pageInfo`
- `refetch: () => refetch()`

Примеры:

- `products/hooks/use-products.ts`
- `categories/hooks/use-categories.ts`
- `tags/hooks/use-tags.ts`
- `categories/hooks/use-category-products.ts`

Риск: каждое изменение в pagination behavior, fetch policy, previousData policy, error normalization придется повторять вручную. Уже видно расхождение: `useCategories` имеет `fetchPolicy` option, остальные list hooks нет.

Рекомендация:

- Вынести общий helper/hook уровня admin GraphQL layer: `useRelayConnectionQuery`.
- Модульные hooks должны описывать только operation document, variables и путь к connection.
- Сохранить module-specific names (`useProducts`, `useCategories`) как тонкие wrappers.

### 4. Pages повторяют API/table shell

Severity: средняя.

Products, categories и tags pages повторяют одинаковую схему:

- `usePageConfig`
- `build*QueryVariables(pageConfig)`
- list hook
- `goToNextPage/goToPrevPage`
- `AgGridReact`
- `CursorPagination`
- `DataLayout.Toolbar` с `FilterWidget`

Примеры:

- products page: `products/page/page.tsx:147-260`
- categories page: `categories/page/page.tsx:168-276`
- tags page: `tags/page/page.tsx:86-143` и `tags/page/page.tsx:185-260`

Это не только UI-duplication. Query variables, pagination cursors и refetch callbacks являются частью API-интеграции, поэтому повторение повышает риск несовместимых list behaviors.

Рекомендация:

- Вынести `InventoryRelayTablePage` или `useInventoryRelayListPage`.
- Оставить в модулях только domain-specific `columns`, `filterSchema`, `sortFieldMapping`, `buildSearchCondition`, row action.

### 5. Filter transformers для categories/tags почти полностью скопированы

Severity: средняя.

`categories/page/page-config.ts:39-190` и `tags/page/page-config.ts:39-187` почти одинаково реализуют:

- `isEmptyFilterValue`
- `getFirstFilterValue`
- `toDateTimeInput`
- `buildStringFilter`
- `buildIntFilter`
- `buildDateTimeFilter`
- factories для string/int/date transformers

Риск: баг в operator mapping или DateRange behavior придется исправлять в нескольких местах. Уже есть небольшое структурное расхождение в `buildDateTimeFilter`: categories оборачивает логику в `if`, tags делает early return.

Рекомендация:

- Вынести generic helpers в `admin/src/layouts/filters` или `admin/src/domains/inventory/utils/filter-transformers.ts`.
- Page configs должны только связывать API field name с generic transformer.

### 6. Product-category relation mutations размножены четырьмя hooks

Severity: высокая.

`useAddCategoryProduct`, `useRemoveCategoryProduct`, `useSetCategoryProductPrimary`, `useMoveCategoryProduct` почти идентичны:

- один `PRODUCT_CATEGORY_UPDATE_MUTATION`
- один result shape
- один `refetchQueries` массив
- одна catch-normalization
- отличается только `ProductCategoryOperationAction` и optional move args

Примеры:

- add: `categories/hooks/use-add-category-product.ts:40-90`
- remove: `categories/hooks/use-remove-category-product.ts:40-90`
- set primary: `categories/hooks/use-set-category-product-primary.ts:40-90`
- move: `categories/hooks/use-move-category-product.ts:42-96`

Дополнительно contract smell: hooks возвращают `category: null`, хотя mutation фактически вызывает `productUpdate` и возвращает product payload. Возвращаемый тип `CategoryProductMutationResult` не соответствует операции.

Рекомендация:

- Заменить на один hook `useUpdateProductCategories`/`useProductCategoryOperations`.
- Принимать массив operations, а convenience methods (`add/remove/setPrimary/move`) делать тонкими wrappers.
- Возвращать честный payload: `product`, `operationResults`, `userErrors/errors`.
- Вынести refetch/cache policy в один helper.

### 7. API write orchestration живет в UI components и modal orchestration hooks

Severity: высокая.

Паттерн говорит: hooks владеют Apollo calls, mappers конвертируют form/editor state в API input, components показывают UI и используют normalized result. Сейчас часть use-case логики находится прямо в UI layer:

- `ProductInfoHeader` сам собирает `ProductUpdateInput` для title/status/archive и показывает API errors (`products/components/product-info-header/product-info-header.tsx:91-153`).
- `ProductContentTabs` строит `ApiProductContentInput`, парсит EditorJS json и вызывает `updateProduct` (`products/components/product-content-tabs/product-content-tabs.tsx:33-118`).
- `useProductModals` собирает media, SEO, variants operations и вручную делает `client.refetchQueries` (`products/components/product-details-card/hooks/use-product-modals.ts:88-330`).
- `useCategoryModals` управляет status/archive/hierarchy/product assignment и циклом мутаций (`categories/components/category-details-card/hooks/use-category-modals.ts:71-305`).
- Category edit modals сами вызывают `useUpdateCategory` и маппят errors.

Это создает несколько разных "application services" внутри UI, вместо одного API layer per use case.

Рекомендация:

- Ввести use-case hooks: `useUpdateProductIdentity`, `useUpdateProductContent`, `useUpdateProductMedia`, `useUpdateProductSeo`, `useUpdateProductTags`, `useUpdateProductVariants`, `useUpdateCategoryHierarchy`, `useAssignCategoryProducts`.
- Вынести input сборку из components в mappers.
- Модалки должны отдавать form values, а не получать callback, внутри которого parent собирает API operation.

### 8. Cache/refetch policy несогласованна

Severity: высокая.

Примеры:

- `useCreateProduct` и `useDeleteProduct` refetch-ят `PRODUCTS_QUERY` с hard-coded variables `{ first: 20, after: null, last: null, before: null }` (`products/hooks/use-create-product.ts:78-84`, `products/hooks/use-delete-product.ts:35-40`). Это не учитывает текущий поиск, фильтры, сортировку и page size.
- `useUpdateCategory` всегда refetch-ит `[CATEGORY_DETAILS_QUERY, CATEGORIES_QUERY]` без привязки к переменным текущей страницы (`categories/hooks/use-update-category.ts:53-60`).
- Tags create/update refetch-ят bare documents (`tags/hooks/use-create-tag.ts:29-32`, `tags/hooks/use-update-tag.ts:33-36`), а pages дополнительно вызывают `refetch()` через `onCreated`.
- Product relation sections после hook-level refetch еще вызывают `onProductRefresh` вручную (`products/components/product-details-card/sections/categories-section.tsx:86-117`, `products/components/product-details-card/sections/tags-section.tsx:48-94`).
- Variants save refresh вручную собирает `Promise.allSettled` и `client.refetchQueries({ include })` (`use-product-modals.ts:204-237`).

Риск: stale UI на отфильтрованных/отсортированных страницах, лишние network calls, неочевидная свежесть данных.

Рекомендация:

- Для каждого mutation hook явно описать freshness contract: `cache.modify`, `refetchQueries` с caller-provided variables, или caller callback, но не все сразу.
- Для list mutations принимать `listVariables?: ProductsQueryVariables/CategoriesQueryVariables/TagsQueryVariables`.
- Убрать page-level `onCreated: refetch` там, где hook уже делает refetch, или наоборот оставить refetch только у caller.
- Для relation mutations централизовать invalidation списка продукта, details продукта, category products и counters.

### 9. Product-tag связь имеет две конкурирующие реализации

Severity: средняя/высокая.

Есть API-backed `TagsSection`, который работает через `useTagPicker` и `useUpdateProduct` (`products/components/product-details-card/sections/tags-section.tsx:56-147`).

Параллельно есть `EditTagsModal`, которая импортирует `mockApiTags` (`products/modals/edit-tags-modal/edit-tags-modal.tsx`) и `useProductModals` явно открывает ее с `message.info("Tag assignment is not API-backed yet")` (`use-product-modals.ts:120-129`).

Риск: два UX для одного use case расходятся по поведению, один из них mock-only. Следующий разработчик может подключить старую modal path вместо API-backed section.

Рекомендация:

- Удалить или deprecated-mark `EditTagsModal`, если `TagsSection` является целевым API-backed flow.
- Либо подключить `EditTagsModal` к тому же `useUpdateProductTags` hook и `useTags`/`useTagPicker` data source.
- Оставить один canonical product-tag write path.

### 10. Mappers/forms дублируют slug, rich text, media и user error mapping

Severity: средняя.

Повторения:

- Product/category/tag create schemas имеют одинаковый `handleSchema`.
- Product/category/tag create sections вручную реализуют auto-slug behavior через `slugify`.
- `prepareDescription` в product create (`products/mappers/product-create.mapper.ts:22-36`) и `prepareRichText` в category create (`categories/mappers/category-create.mapper.ts:18-32`) делают одинаковую конвертацию EditorJS -> `RichTextInput`.
- `prepareMediaFileIds` есть в product create (`products/mappers/product-create.mapper.ts:38-44`) и category create (`categories/mappers/category-create.mapper.ts:34-40`).
- `mapProductUserErrorsToFormErrors` и `mapCategoryUserErrorsToFormErrors` имеют одинаковую механику alias lookup.
- `formatOperationType` повторяется в product/category error mappers.
- Product option/feature editor error mappers повторяют `formatFieldPath`, `pushError` и mapping по input index.

Рекомендация:

- Вынести `handleSchema`, `useAutoSlugField`/`AutoSlugIdentityFields`, `editorOutputToRichTextInput`, `mediaFilesToFileIds`, `mapUserErrorsByAliases`, `normalizeOperationResults`.
- Для options/features сделать общий `mapIndexedUserErrorsToEditorErrors`.

### 11. Modal payload callbacks смешивают UI state и API application logic

Severity: средняя.

Product modal payloads активно передают `onSave` с async API логикой:

- `IProductEditTitleModalPayload`
- `IProductEditDescriptionModalPayload`
- `IEditMediaModalPayload`
- `IEditSeoModalPayload`
- `IEditVariantsModalPayload`
- `IEditTagsModalPayload`

Category payload interfaces тоже объявляют `onSave`, но конкретные category edit modals сейчас чаще игнорируют эти callbacks и вызывают `useUpdateCategory` напрямую.

Риск: нет единого ownership. Для products API orchestration часто в parent hook/component; для categories часто внутри modal; для tags внутри modal. Это усложняет повторное использование и тестирование.

Рекомендация:

- Выбрать один pattern:
  - либо modal is form-only и parent/use-case hook выполняет save;
  - либо modal владеет save через use-case hook.
- Для API-backed модулей предпочтительнее второй вариант: modal получает entity/form initial values, вызывает use-case hook и возвращает `onSaved`.

### 12. Product variants используют ручной Apollo client state рядом с query hooks

Severity: средняя.

`useProductVariantsConnection` вручную реализует loading/error/local connection state через `useApolloClient().query`, `useEffect`, `loadMore`, `appendVariantConnection`. Рядом `useProduct` уже грузит variants page как часть product details, а `useProductVariantsLoader` отдельно загружает все страницы по `first: 100`.

Риск: три read path для variants могут расходиться по cache behavior, pagination assumptions и selected fields.

Рекомендация:

- Свести variants read path к одному hook contract.
- Если нужен infinite/load-all режим, строить его вокруг Apollo `fetchMore`/typed query hook, а не отдельной локальной модели, либо явно оформить как низкоуровневый data service.

### 13. API-backed product details все еще смешан с mock supplemental data

Severity: средняя.

`ProductModal` получает product из API, но передает `productDetailsMockData` в `ProductDetailsCard`. Кроме того, часть flows помечена как mock-only: bulk editor action disabled с tooltip, AI writer использует mock generator, bundles/reviews sections завязаны на mock types/data.

Это не прямое нарушение DRY, но architecture smell для API-интеграции: API-backed details screen выглядит завершенным, хотя часть секций не имеет API contract.

Рекомендация:

- Явно отделить API-backed sections от mock-only sections в naming и docs.
- Для mock-only sections не держать их в product details API card как равноправные API sections без явного feature flag/empty state.

## Приоритетный план устранения

1. Зафиксировать GraphQL type ownership:
   - убрать локальный `ApiCategoryCategoriesMetaInput`;
   - запретить импорт generated-like типов из feature `graphql` barrels;
   - оставить generated API types только в `@/graphql/types`.

2. Вынести shared GraphQL fragments и common connection hook:
   - `UserErrorFields`, `FileFields`, `RichTextFields`;
   - `useRelayConnectionQuery`.

3. Нормализовать mutation freshness:
   - убрать hard-coded `first: 20`;
   - передавать текущие list variables или использовать `cache.modify`;
   - выбрать один источник refetch для create/update/delete.

4. Свести product-category и product-tag связи к use-case hooks:
   - `useUpdateProductCategories`;
   - `useUpdateProductTags`;
   - один canonical modal/section flow на связь.

5. Вынести повторяющиеся form/API utilities:
   - slug/handle schema и auto-generation;
   - EditorJS -> RichTextInput;
   - media files -> file IDs;
   - user error aliases и operation result normalization;
   - generic filter transformers для string/int/date.

6. После этого уже стоит уплотнять pages:
   - общий table/list shell;
   - domain modules оставляют только columns/filter/sort/search config.

## Проверки

Тесты и `tsc` не запускались согласно project instructions. Build не запускался, потому что анализ не меняет runtime-код.
