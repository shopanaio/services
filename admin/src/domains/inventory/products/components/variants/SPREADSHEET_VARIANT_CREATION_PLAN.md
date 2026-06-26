# План создания вариантов в spreadsheet-режиме

## Цель

Сделать редактор вариантов похожим на spreadsheet:

- внизу таблицы всегда есть пустая строка;
- если пользователь заполняет пустую строку, она становится draft-вариантом;
- после этого внизу сразу появляется новая пустая строка;
- все изменения сохраняются одним нажатием `Save`;
- `Save` выполняет ровно одну GraphQL mutation: `productUpdate`.

Отдельные frontend-вызовы `variantCreate`, `variantUpdatePricing`, `variantUpdateMedia` и похожие post-create mutations для этого flow не используются.

## Обязательные архитектурные решения

1. Создание вариантов должно быть частью `ProductUpdateInput`.
2. UI не должен оркестрировать несколько mutations для одного save.
3. Draft rows живут локально в модалке и не попадают в persisted zustand store.
4. Backend должен валидировать весь batch до записи, насколько это возможно.
5. Результат save должен приходить через существующий `ProductUpdatePayload`: `product`, `operationResults`, `userErrors`.
6. После успешного save UI делает refetch variants и закрывает модалку.

## Текущее состояние

- `EditVariantsModal` получает существующие варианты через `IEditVariantsModalPayload.variants`.
- `VariantsEditorGrid` превращает API-варианты в строки и рендерит их через `EditorGrid`.
- `useVariantsEditorStore` хранит cell edits по `row.id` и настройки колонок.
- Существующие варианты сохраняются через `productUpdate` и `ProductUpdateInput.variants`.
- `ProductUpdateInput.variants` сейчас покрывает update существующих вариантов, но не покрывает создание новых вариантов.
- В API есть отдельный `catalogMutation.variantCreate`, но для spreadsheet-save он не подходит, потому что UI должен отправлять один unified save через `productUpdate`.

## Целевой GraphQL contract

Нужно расширить `ProductUpdateInput`, чтобы он поддерживал create/update операций над variants в одном payload.

Рекомендуемая форма:

```ts
type ProductUpdateInput = {
  variants?: ProductVariantOperationsInput;
};

type ProductVariantOperationsInput = {
  create?: ProductVariantCreateOperationInput[];
  update?: VariantUpdateInput[];
  delete?: ProductVariantDeleteOperationInput[];
};

type ProductVariantCreateOperationInput = {
  clientMutationId: string;
  options: VariantOptionLinkInput[];
  pricing?: VariantPricingInput;
  media?: VariantMediaInput;
  weight?: number;
  dimensions?: VariantDimensionsInput;
  inventory?: VariantInventoryInput;
};

type ProductVariantDeleteOperationInput = {
  variantId: ID!;
  permanent?: boolean;
};
```

`variants` должен иметь форму `{ create, update, delete }`, потому что она явно описывает batch operations и проще расширяется.

## Backend workflow

`productUpdate` должен выполнять create/update variants в одном workflow.

Spreadsheet-save должен использовать существующую модель `productUpdate`:
одна GraphQL mutation, один workflow, результат через `operationResults` и
`userErrors`. Workflow может сохранять partial-failure поведение текущего
`ProductUpdateWorkflow`: отдельные операции могут применяться или возвращать
ошибки независимо.

Для create/update/delete variant batch нужна pre-validation фаза внутри
`productUpdate`, но она не должна менять общую семантику workflow:

1. До выполнения variant writes декодировать incoming global ids.
2. Загрузить product state, необходимый для проверки variant batch.
3. Проверить batch-инварианты, которые нельзя безопасно проверять по одной
   операции: принадлежность option values продукту, уникальность combinations,
   capacity, дубликаты внутри request, валидность `clientMutationId`.
4. Если batch-level validation не проходит, вернуть ошибки в `operationResults`
   для соответствующих operations.
5. Если batch-level validation проходит, выполнить operations в текущей
   `productUpdate` модели и вернуть итог через `ProductUpdatePayload`.

Порядок обработки:

1. Декодировать все incoming global ids:
   - `productId`;
   - `optionId`;
   - `optionValueId`;
   - `fileId`;
   - `warehouseId`;
   - `variantId`.
2. Загрузить текущий product state:
   - product revision;
   - existing variants;
   - product options и option values;
   - текущие selected option links;
   - нужные inventory/media/pricing данные.
3. Провалидировать весь batch до записи:
   - `expectedRevision`;
   - все option values принадлежат options этого product;
   - каждая create operation содержит значение для каждой product option;
   - общее количество existing variants плюс create operations не превышает количество возможных option combinations;
   - create combinations не дублируют existing variants;
   - create combinations не дублируют друг друга;
   - update operations с изменением options не создают дубликаты;
   - pricing/media/dimensions/inventory inputs валидны;
   - `clientMutationId` уникален внутри request.
4. Если есть batch-level ошибки, вернуть их через `userErrors` /
   `operationResults` для соответствующих operations.
5. Если validation успешна:
   - создать новые variants;
   - создать option links для новых variants;
   - применить pricing/media/weight/dimensions/inventory для новых variants;
   - применить updates существующих variants;
   - применить delete operations, если они входят в scope;
   - обновить product revision;
   - отправить нужные domain events.
6. Вернуть `ProductUpdatePayload`.

Workflow должен явно документировать, какие ошибки считаются batch-level
validation errors, а какие остаются operation-level errors в существующей
`operationResults` модели.

## Operation results

Для create operations нужен способ сопоставить backend result с draft row. Для этого используется `clientMutationId`.

Рекомендуем расширить `OperationResult` так, чтобы create result мог вернуть:

```ts
type OperationResult {
  type: OperationType!
  applied: Boolean!
  clientMutationId: String
  entityId: ID
  errors: [GenericUserError!]!
}
```

Минимально достаточно вернуть ошибки с `field`, где путь содержит индекс create operation:

```ts
field: ["variants", "create", "0", "options"]
```

Но `clientMutationId` лучше для UI, потому что draft rows имеют временные ids.

## Frontend row model

Добавить lifecycle строки:

```ts
type VariantEditorRowKind = "existing" | "draft" | "blank";
```

В `components/variants/config/types.ts` добавить:

```ts
kind?: VariantEditorRowKind;
clientMutationId?: string;
```

Правила:

- отсутствие `kind` трактуется как `existing`;
- `existing` rows используют API `variant.id`;
- `draft` rows используют id вида `draft:<uuid>`;
- `blank` row использует id вида `blank:new-variant`;
- `clientMutationId` обязателен для draft rows и отправляется в backend create operation.

## Draft rows state

Draft rows не должны храниться в `useVariantsEditorStore`, потому что store persisted и отвечает за edits/settings.

Состояние держим локально:

- `EditVariantsModal` владеет `draftRows`;
- `VariantsEditorGrid` получает `draftRows` и `onDraftRowsChange`;
- `useVariantsEditorStore` продолжает хранить edits для existing rows и column visibility.

## Grid behavior

`VariantsEditorGrid` должен рендерить:

```ts
const rows = [...existingRows, ...draftRows, blankRow];
```

`blankRow` показывается только если ещё есть свободные option combinations. Если все возможные комбинации уже заняты existing/draft rows, новая blank row не добавляется.

Поведение blank row:

1. Пользователь редактирует значимое поле в `blank:new-variant`.
2. Grid создаёт новую draft row:
   - `id: draft:<uuid>`;
   - `kind: "draft"`;
   - `clientMutationId: <uuid>`;
   - значения по умолчанию из blank row;
   - применённое поле пользователя.
3. Draft row добавляется в `draftRows`.
4. Внизу остаётся новая blank row.

Пустая draft row должна удаляться автоматически, если пользователь очистил все введённые поля.

Перед созданием draft row grid должен проверить capacity:

```ts
const maxVariantCount = productOptions.reduce(
  (count, option) => count * option.values.length,
  1,
);
const usedVariantCount = existingRows.length + draftRows.length;
const canCreateMoreDrafts = usedVariantCount < maxVariantCount;
```

Если `canCreateMoreDrafts === false`, blank row не должна превращаться в draft row. UI может показать короткое сообщение: `All option combinations are already used.`

Если у продукта нет options или есть option без values, создание дополнительных вариантов через spreadsheet row должно быть заблокировано до настройки options.

## Option columns

Для draft rows option columns должны быть редактируемыми.

Требования:

- option cell открывает выбор значений текущей product option;
- выбранное значение обновляет `selectedOptionValueIds[option.id]`;
- title draft row можно вычислять из выбранных option value names;
- draft row нельзя сохранить, пока не выбраны значения для всех product options.

## Frontend validation

Перед отправкой `productUpdate` UI должен проверить:

- количество existing rows плюс draft rows не превышает количество возможных option combinations;
- каждая draft row содержит значения для всех product options;
- каждый выбранный option value принадлежит соответствующей product option;
- draft rows не дублируют друг друга;
- draft rows не дублируют existing rows;
- existing rows после option edits не создают дубликаты;
- required numeric fields валидны;
- media ids относятся к доступным product media files, если это проверяется на UI.

`buildCombinationKey` из `product-variant-options.mapper.ts` можно использовать для проверки дубликатов.

Backend всё равно повторяет эти проверки. Frontend validation нужна для быстрой обратной связи, а не как источник истины.

## Save flow в `EditVariantsModal`

Нужно изменить shape callback:

```ts
onSave?: (input: {
  existingRows: VariantEditorSaveRow[];
  draftRows: VariantEditorSaveRow[];
  additionalOperations?: ApiProductUpdateInput;
}) => boolean | void | Promise<boolean | void>;
```

Логика `handleSave`:

1. Собрать current existing rows.
2. Собрать draft rows.
3. Выполнить frontend validation.
4. Если есть ошибки, показать message и не закрывать модалку.
5. Передать `existingRows`, `draftRows`, `additionalOperations` в `onSave`.
6. Если `onSave` вернул success:
   - очистить edits;
   - очистить draft rows;
   - закрыть модалку.
7. Если save failed:
   - оставить edits и draft rows на экране.

## Save orchestration в `useProductModals`

`useProductModals` должен собрать один `ApiProductUpdateInput`.

Шаги:

1. Из existing rows подготовить `variants.update` через текущую логику `prepareChangedVariantUpdateInputs`.
2. Из draft rows подготовить `variants.create`.
3. Смержить с `additionalOperations`, если они есть.
4. Вызвать `updateProduct` один раз:

```ts
await updateProduct({
  productId: product.id,
  expectedRevision: product.revision,
  operations,
});
```

5. Если `result.errors.length > 0`, показать ошибку и вернуть `false`.
6. Если success:
   - `loadAllProductVariants(product, { forceNetwork: true })`;
   - `options.onProductRefresh?.()`;
   - `client.refetchQueries(...)` для pricing widgets, если pricing изменился;
   - показать success message;
   - вернуть `true`.

Запрещено в этом flow:

- вызывать `variantCreate`;
- вызывать post-create mutation для price/media/shipping;
- делать несколько GraphQL mutations на один `Save`.

## Mapping draft rows в create operations

Draft row должна мапиться примерно так:

```ts
function draftRowToVariantCreateOperation(
  row: VariantEditorSaveRow,
  productOptions: ApiProductOption[],
): ProductVariantCreateOperationInput {
  return {
    clientMutationId: row.clientMutationId,
    options: productOptions.map((option) => ({
      optionId: option.id,
      optionValueId: row.selectedOptionValueIds[option.id],
    })),
    pricing: row.price != null
      ? {
          currency,
          amountMinor: row.price,
          compareAtMinor: row.compareAtPrice,
        }
      : undefined,
    media: row.mediaFileIds.length > 0
      ? { fileIds: row.mediaFileIds }
      : undefined,
    weight: row.weight ?? undefined,
    dimensions: hasCompleteDimensions(row)
      ? {
          length: row.length,
          width: row.width,
          height: row.height,
        }
      : undefined,
  };
}
```

Inventory fields включать только если backend create operation поддерживает создание/обновление inventory item для нового variant в том же workflow.

## Файлы, которые ожидаемо нужно менять

Frontend:

- `admin/src/domains/inventory/products/components/variants/edit-variants-modal.tsx`
- `admin/src/domains/inventory/products/components/variants/components/variants-editor-grid.tsx`
- `admin/src/domains/inventory/products/components/variants/config/types.ts`
- `admin/src/domains/inventory/products/mappers/product-variant-options.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-variant-editor.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-variant-update.mapper.ts`
- `admin/src/domains/inventory/products/components/product-details-card/hooks/use-product-modals.ts`
- `admin/src/domains/inventory/products/modals.ts`
- `admin/src/domains/inventory/products/graphql/operation-types.ts`

Backend:

- `services/catalog/src/api/graphql-admin/schema/variant.graphql`
- `services/catalog/src/api/graphql-admin/schema/product.graphql` или файл, где объявлен `ProductUpdateInput`
- `services/catalog/src/resolvers/admin/generated/types.ts` после codegen
- `services/catalog/src/resolvers/admin/generated/schemas.ts` после codegen
- `services/catalog/src/resolvers/admin/MutationResolver.ts`
- `services/catalog/src/workflows/dto/ProductUpdateWorkflowDto.ts`
- product update workflow/scripts, которые применяют `ProductUpdateInput`
- variant repository / option repository paths, если не хватает batch methods

## Acceptance criteria

Функция считается готовой, когда:

- в editor grid всегда есть blank row внизу;
- ввод в blank row создаёт draft row и добавляет новую blank row;
- draft row можно заполнить через option columns;
- incomplete draft row не сохраняется и показывает понятную ошибку;
- duplicate option combination не сохраняется и показывает понятную ошибку;
- нельзя добавить больше вариантов, чем существует уникальных комбинаций option values;
- когда все option combinations заняты, blank row не создаёт новый draft variant;
- `Save` отправляет ровно одну `productUpdate` mutation;
- в payload одной mutation есть updates существующих variants и creates новых variants;
- backend создаёт новые variants, option links и поддерживаемые поля в одном workflow;
- при backend validation error UI не закрывает модалку и не теряет draft rows;
- после успешного save модалка закрывается, variants refetch обновляет таблицу товара;
- нет frontend-вызовов `variantCreate` в этом flow.

## Риски и решения

- **Temporary row ids могут конфликтовать с existing variant ids.**
  Использовать строгие prefixes: `draft:` и `blank:`.

- **Bulk paste может создать много draft rows.**
  Добавить лимит или явное validation message, если это станет проблемой.

- **Batch validation не должна конфликтовать с текущим partial-failure workflow.**
  Проверки уникальности combinations и capacity должны выполняться до variant
  writes, но результат всё равно должен возвращаться через `operationResults`.

- **Ошибки backend нужно привязать к draft rows.**
  Использовать `clientMutationId` в create operations и operation results.
