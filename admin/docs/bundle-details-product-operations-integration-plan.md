# План интеграции product-модалок и операций в Bundle Details Modal

## Цель

Сделать `Bundle Details Modal` полноценным product-backed экраном: bundle является тем же sellable `Product` с `kind = BUNDLE`, поэтому общие product UI-компоненты, модалки, hooks и GraphQL helpers должны переиспользоваться без дублирования.

Исключение: bundle-specific часть должна остаться на отдельных bundle API:

- bundle configurations;
- bundle groups / items;
- pricing templates и pricing dependency rules;
- dependency rules chart / sync.

## Текущее состояние

- `admin/src/domains/promos/bundles/modals/bundle-modal/index.tsx` открывает modal по `entityId`, но не использует его для API-загрузки. Сейчас показываются `mockBundleProduct` и `bundleDetailsMockData`.
- `admin/src/domains/promos/bundles/components/bundle-details-card/bundle-details-card.tsx` уже импортирует часть product UI:
  - `ProductInfoHeader`;
  - `ProductContentTabs`;
  - `PricingBlock`;
  - `MediaSection`;
  - `CategoriesSection`;
  - `TagsSection`;
  - `AttributesSection`;
  - `SeoBlock`.
- Bundle details сейчас вручную строит `apiProduct` через `createMockApiProduct`, а media/seo handlers только логируют сохранение или показывают mock-сообщения.
- Product details уже имеет рабочую orchestration-модель:
  - `ProductModal` загружает product через `useProduct`;
  - `ProductDetailsCard` принимает `ApiProduct`;
  - `useProductModals` открывает media/options/attributes/seo/variants modals и сохраняет через `useUpdateProduct`;
  - `ProductInfoHeader`, `ProductContentTabs`, `PricingBlock`, `CategoriesSection`, `TagsSection` сами используют существующие product API helpers.

## Архитектурное решение

`BundleModal` должен загружать bundle как API entity и передавать общий product-compatible объект в переиспользуемый product слой. Так как generated `ApiBundle` структурно содержит те же product-поля (`id`, `title`, `handle`, `description`, `excerpt`, `media`, `features`, `options`, `variants`, `variantsCount`, `seo`, `tags`, `categoryAssignments`, `primaryCategory`, `revision`, `isPublished`), нужно минимизировать adapter-код и не создавать отдельные bundle-копии product-модалок.

Рекомендуемый подход:

1. Добавить bundle GraphQL details fragment/query/hook рядом с `admin/src/domains/promos/bundles`.
2. Для общей product части использовать те же components/hooks, что и product details.
3. Для bundle-specific sections оставить отдельный state/API слой и отдельные modals из `admin/src/domains/promos/bundles/modals.ts`.
4. Если TypeScript не принимает `ApiBundle` там, где ожидается `ApiProduct`, ввести узкий shared тип `ProductDetailsEntity`, а не кастовать `ApiBundle as ApiProduct` по месту.

## API слой для bundle details

Добавить файлы:

- `admin/src/domains/promos/bundles/graphql/fragments.ts`
- `admin/src/domains/promos/bundles/graphql/queries.ts`
- `admin/src/domains/promos/bundles/graphql/mutations.ts`
- `admin/src/domains/promos/bundles/graphql/operation-types.ts`
- `admin/src/domains/promos/bundles/hooks/use-bundle.ts`
- `admin/src/domains/promos/bundles/hooks/use-update-bundle.ts`

Минимальный details query:

- `catalogQuery.bundle(id: $id)`;
- общие product поля должны совпадать с `PRODUCT_EDITOR_BASE_FRAGMENT`;
- `variants(first: $variantsFirst, after: $variantsAfter)` должен совпадать с product details;
- bundle-specific fields:
  - `type`;
  - `displayStyle`;
  - `configurations`;
  - `configurations.groups.items`;
  - `configurations.pricingTemplates`;
  - `configurations.dependencyRules`.

Важно: общие product операции не должны идти через `bundleUpdate`, если уже есть рабочий `productUpdate`. Для title/handle/content/media/seo/tags/variants/status/archive использовать существующие product helpers:

- `useUpdateProduct`;
- `useUpdateProductStatus`;
- `useDeleteProduct`;
- category hooks;
- variants loader/update mappers;
- pricing widget hooks.

Bundle-specific mutations держать отдельно:

- `bundleUpdate` для `type`, `displayStyle` и других bundle root settings;
- `bundleConfigurationCreate`;
- `bundleConfigurationUpdate`;
- `bundleConfigurationDelete`;
- `bundleGroupsSync`;
- `bundlePricingTemplatesSync`;
- `bundleDependencyRulesSync`.

## Изменения в BundleModal

Файл: `admin/src/domains/promos/bundles/modals/bundle-modal/index.tsx`

Заменить mock-загрузку на API-загрузку:

- получить `entityId` из `payload.entityId`;
- использовать `useBundle({ id: entityId, variantsFirst, variantsAfter })`;
- повторить pagination state из `ProductModal` для variants table;
- показывать skeleton/error/not found аналогично `ProductModal`;
- передавать `refetch` в `BundleDetailsCard` как `onBundleRefresh` / `onProductRefresh`.

После этого удалить зависимость modal от:

- `mockBundleProduct`;
- `bundleDetailsMockData`;
- искусственного `setTimeout` loading.

## Изменения в BundleDetailsCard

Файл: `admin/src/domains/promos/bundles/components/bundle-details-card/bundle-details-card.tsx`

Целевой props:

- `bundle: ApiBundle`;
- `variantsTableData`;
- `onVariantsPageChange`;
- `isVariantsPageLoading`;
- `onBundleRefresh`.

Удалить:

- `IProduct` mock prop;
- `IBundleDetailsMockData`;
- `createMockApiProduct`;
- локальный `apiProduct`;
- mock-derived `attributeFeatures`;
- console-only handlers для media/seo/reviews.

Общая product часть должна переиспользовать существующие components:

- `ProductInfoHeader` для title/handle/status/archive/share/storefront;
- `ProductContentTabs` для description/excerpt/AI writer;
- `PricingBlock` для pricing widget, price edit modal и price history;
- `MediaSection` + `useProductModals(...).editMedia`;
- `InventorySection`;
- `CategoriesSection`;
- `AttributesSection` + `useProductModals(...).editAttributes`;
- `OptionsSection` + `useProductModals(...).editOptions`;
- `VariantsTableSection` + `useProductModals(...).editVariants`;
- `TagsSection`;
- `SeoBlock` + `useProductModals(...).editSeo`;
- `ReviewsSection` пока оставить mock/placeholder только если reviews API отсутствует, но не блокировать остальные product operations.

Bundle-specific часть оставить отдельной:

- `BundleSection`;
- `EditGroupsModal`;
- `EditConfigurationModal`;
- `EditTemplatesModal`;
- `EditSettingsModal`;
- `VariantSettingsModal`;
- `DependencyChartModal`.

## Общий тип для product-compatible entity

Сейчас многие product components типизированы как `ApiProduct`. Так как `ApiBundle` имеет почти тот же contract, возможны два варианта:

### Вариант A: shared type

Добавить в product domain shared тип:

```ts
export type ProductDetailsEntity = Pick<
  ApiProduct,
  | "id"
  | "title"
  | "handle"
  | "isPublished"
  | "publishedAt"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "revision"
  | "variantsCount"
  | "description"
  | "excerpt"
  | "seo"
  | "media"
  | "primaryCategory"
  | "categoryAssignments"
  | "tags"
  | "features"
  | "options"
  | "variants"
  | "vendor"
>;
```

Потом заменить props в shared product components с `ApiProduct` на `ProductDetailsEntity`, если компонент не использует поля, которых нет у bundle.

### Вариант B: fragment-level alias

Если generated `ApiBundle` и `ApiProduct` совместимы структурно, можно сначала использовать `bundle` напрямую в product components. Но если появятся TS-ошибки из-за `__typename` или discriminated fields, перейти к варианту A. Локальные касты допустимы только как временный migration step и не должны размазываться по компонентам.

## Карта переиспользования product operations

| Область | Product source | Для bundle |
| --- | --- | --- |
| Title / handle | `ProductInfoHeader` + `useProductEditTitleModal` + `useUpdateProduct` | Переиспользовать полностью |
| Publish / unpublish | `ProductInfoHeader` + `useUpdateProductStatus` | Переиспользовать полностью |
| Archive | `ProductInfoHeader` + `useDeleteProduct` | Переиспользовать полностью, если backend разрешает delete для `kind = BUNDLE` |
| Description / excerpt | `ProductContentTabs` + `EditDescriptionModal` + `useUpdateProduct` | Переиспользовать полностью |
| AI writer | `ProductContentTabs` + `ProductAIWriterModal` | Переиспользовать полностью |
| Media | `useProductModals.editMedia` + `EditMediaModal` + `productUpdate.media` | Переиспользовать полностью |
| Pricing widget | `PricingBlock` | Переиспользовать полностью |
| Price edit | `PricingBlock` / `EditVariantsModal` restricted columns | Переиспользовать полностью |
| Price history | `PriceHistoryModal` | Переиспользовать полностью |
| Inventory widget | `InventorySection` | Переиспользовать полностью |
| Categories | `CategoriesSection` + category assignment hooks | Переиспользовать полностью |
| Tags | `TagsSection` + `productUpdate.tags` | Переиспользовать API-backed section полностью; старый modal handler не нужен |
| Attributes | `EditAttributesModal` + product feature sync | Переиспользовать полностью |
| Options | `EditOptionsModal` + product option sync | Переиспользовать полностью |
| Variants | `VariantsTableSection` + `EditVariantsModal` + variant operation mappers | Переиспользовать полностью |
| SEO / OG | `EditSeoModal` + `productUpdate.seo` | Переиспользовать полностью |
| Bulk editor | `BulkEditorModal` accepts product IDs | Можно открывать для bundle IDs, если backend bulk update supports `kind = BUNDLE` |

## Bundle-specific operations

Эти операции не переводить на product helpers:

| Область | API |
| --- | --- |
| Create configuration | `bundleConfigurationCreate` |
| Rename configuration | `bundleConfigurationUpdate` |
| Delete configuration | `bundleConfigurationDelete` |
| Groups and items | `bundleGroupsSync` |
| Item variant settings | part of groups/items sync payload |
| Pricing templates | `bundlePricingTemplatesSync` |
| Dependency rules | `bundleDependencyRulesSync` |
| Bundle display/settings | `bundleUpdate` |

Bundle-specific modals должны получать API-backed data из active `ApiBundleConfiguration`, а после save вызывать `onBundleRefresh` или обновлять Apollo cache.

## Порядок реализации

1. Создать bundle GraphQL details fragment/query с полями product-compatible + bundle-specific.
2. Создать `useBundle`, который повторяет `useProduct` по loading/error/refetch/previousData behavior.
3. Перевести `BundleModal` с mock data на `useBundle`.
4. Ввести `ProductDetailsEntity` или другой общий narrow type, если `ApiBundle` не проходит в product components.
5. Переподключить `BundleDetailsCard` к real `bundle` и `useProductModals`.
6. Добавить в `BundleDetailsCard` те product sections, которых сейчас нет или которые не API-backed:
   - inventory;
   - options;
   - variants table;
   - real tags operations;
   - real attributes operations;
   - real media/seo save.
7. Перевести bundle configurations/groups/templates/dependency rules с local state на bundle-specific mutations.
8. Обновить `useBundles` и bundles page позже отдельным шагом: список сейчас mock-backed, но details modal может быть API-backed независимо.
9. Удалить устаревшие mock adapters из bundle details после перехода.

## Риски и проверки

- `ApiBundle.__typename = "Bundle"` может конфликтовать с props, которые ожидают `ApiProduct.__typename = "Product"`. Решение: shared narrow type.
- `ProductInfoHeader` использует product wording в toast messages. На первом этапе это допустимо для переиспользования API, но после интеграции стоит заменить copy на entity-neutral labels или добавить optional `entityLabel`.
- `PricingBlock` уже умеет работать по `productId`, но price edit требует `product`. Для bundle нужно передавать full product-compatible bundle, иначе edit button будет скрыт.
- `CategoriesSection` использует wording "product". API подходит, copy можно вынести позже.
- `TagsSection` уже API-backed; не использовать старый `useProductModals.editTags`, где сейчас есть placeholder.
- `ReviewsSection` не является частью product API operations в текущем коде, поэтому reviews можно оставить без изменений.
- Проверку не выполнять через `test` или `tsc`. После code implementation запускать `npm run build`, если нужна проверка новой версии кода.

## Definition of Done

- Bundle modal открывается по real `entityId` и показывает API-backed bundle.
- Все общие product edits в bundle details используют те же product modals/helpers, что product details.
- После сохранения common product operations обновляется bundle modal state/refetch.
- Bundle configurations/groups/items/pricing dependency rules остаются на bundle-specific API.
- В bundle details больше нет `mockBundleProduct`, `bundleDetailsMockData`, `createMockApiProduct` и console-only save handlers для product операций.
