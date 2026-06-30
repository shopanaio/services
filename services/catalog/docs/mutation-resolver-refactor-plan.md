# План рефакторинга `MutationResolver.ts`

Дата: 2026-06-24.

Целевой файл: `services/catalog/src/resolvers/admin/MutationResolver.ts`.

## Контекст

`MutationResolver.ts` сейчас содержит 3343 строки и совмещает несколько разных ролей:

- root Apollo mutation resolver и namespace resolver;
- GraphQL input validation annotations;
- decoding GraphQL global IDs;
- mapping GraphQL inputs в script/workflow DTO;
- запуск scripts, sagas и workflows;
- event emission helpers;
- payload shaping для GraphQL;
- product bulk update mapping;
- domain mutations для vendor, product, variant, options, features, category, facet, collection, tag, bundle.

Это расходится с локальными архитектурными правилами:

- resolver должен быть тонким GraphQL boundary;
- mutation business logic должна жить в scripts;
- сложные orchestration flows должны жить в workflows;
- generated schemas/types должны быть source of truth для GraphQL inputs;
- repository/multi-tenancy rules не должны протекать в resolver.

## Цели

1. Уменьшить `MutationResolver.ts` до root resolver + сборки namespace resolver.
2. Разнести domain mutation methods по отдельным файлам без изменения публичного GraphQL contract.
3. Вынести повторяющийся mapping global IDs, rich text, operation inputs и userErrors в переиспользуемые boundary helpers.
4. Сделать single product update и bulk product update использующими один mapper для `ProductUpdateOperation`.
5. Привести tags/facets/collections/bundles к тем же resolver conventions, что products/categories: generated types, Zod schemas где доступны, единый payload shape.
6. Сохранить существующие scripts/workflows как business/orchestration layer. Рефакторинг resolver не должен переносить business rules обратно в resolver.

## Не цели

- Не менять GraphQL schema в рамках первого refactor pass.
- Не менять semantics scripts/workflows.
- Не менять database schema или migrations.
- Не редактировать changeset вручную.
- Не запускать tests/tsc. Build запускать только если потребуется новая версия кода согласно project instructions.

## Основные запахи текущего файла

### God object

`CatalogMutationResolver` содержит почти весь mutation API catalog service в одном классе. Domain areas смешаны в одном файле, а private helpers в начале и конце файла работают сразу на несколько workflows.

Ключевые точки:

- `CatalogMutationResolver` начинается около `MutationResolver.ts:211`;
- category update mapper находится внутри класса около `MutationResolver.ts:212`;
- event helpers находятся внутри класса около `MutationResolver.ts:337`;
- product update mapping находится прямо в `productUpdate` около `MutationResolver.ts:572`;
- bulk product mapper находится отдельно внизу файла около `MutationResolver.ts:3021`.

### Дублирование mapping logic

Single `productUpdate` и `productBulkUpdate` строят похожие `ProductUpdateOperation[]`, но делают это двумя путями. Это создает риск расхождения при добавлении новых product/variant/category/tag operations.

### Смешение boundary и orchestration

Resolver напрямую строит workflow input, workflow IDs, event payloads и запускает `events.emit`. Эти детали лучше держать в workflow-level/event helper слое.

### Неравномерная validation convention

Часть mutations помечена `@ZodResolver(...)`, часть принимает inline object types и валидируется вручную или не валидируется через generated schemas. Особенно заметны tag/facet/collection/bundle sections.

### Повторение global ID decoding

`safeDecodeGlobalId` и ручной `decodeGlobalIdByType` используются десятки раз. Ошибки возвращаются с разными `field` paths и разными codes.

## Целевая структура

Предлагаемая структура внутри `services/catalog/src/resolvers/admin/`:

```text
MutationResolver.ts
mutation/
  CatalogMutationResolver.ts
  helpers/
    global-id.ts
    payload.ts
    rich-text.ts
    workflow-context.ts
  mappers/
    product-create.mapper.ts
    product-update.mapper.ts
    category-create.mapper.ts
    category-update.mapper.ts
    collection.mapper.ts
    bundle.mapper.ts
  mutations/
    VendorMutationResolver.ts
    ProductMutationResolver.ts
    ProductBulkMutationResolver.ts
    VariantMutationResolver.ts
    OptionMutationResolver.ts
    FeatureMutationResolver.ts
    CategoryMutationResolver.ts
    TagMutationResolver.ts
    FacetMutationResolver.ts
    CollectionMutationResolver.ts
    BundleMutationResolver.ts
  events/
    product-events.ts
```

`MutationResolver.ts` после refactor должен остаться маленьким:

- импортирует `ApolloMutation`;
- содержит root `MutationResolver`;
- `catalogMutation()` возвращает `CatalogMutationResolver`;
- не содержит domain-specific mapping.

`CatalogMutationResolver.ts` должен быть composition class:

- наследуется от `CatalogType`;
- агрегирует domain resolver methods через делегирование или mixin-free forwarding;
- не содержит больших DTO mapper функций.

## Архитектурное решение по domain resolvers

Предпочтительный вариант: один namespace resolver class остается публичной GraphQL точкой, но методы делегируют в domain-specific classes:

```ts
export class CatalogMutationResolver extends CatalogType<Record<string, never>> {
  private readonly products = new ProductMutationResolver(this.$ctx);
  private readonly categories = new CategoryMutationResolver(this.$ctx);

  productCreate(args: CatalogMutationProductCreateArgs) {
    return this.products.productCreate(args);
  }
}
```

Причина: текущий `@shopana/type-resolver` ожидает методы на namespace object. Прямое наследование от множества classes или dynamic proxy хуже для type inference и читаемости.

Если делегирование окажется слишком шумным, допустим второй шаг: хранить methods в одном class per domain и экспортировать их через простую ручную фасадную функцию. Не использовать magic reflection.

## Helper layer

### `helpers/global-id.ts`

Цель: единообразно декодировать IDs и строить `UserError`.

Функции:

- `decodeRequiredGlobalId(value, entity, fieldPath): DecodeResult`;
- `decodeOptionalGlobalId(value, entity, fieldPath): DecodeResult`;
- `decodeGlobalIdList(values, entity, fieldPath): DecodeListResult`;
- `decodeTargetIdByType(targetType, targetId, mapping, fieldPath)`.

Правила:

- resolver не должен писать `try/catch decodeGlobalIdByType` inline;
- invalid ID должен возвращать одинаковый `code: "INVALID_ID"`;
- field path должен быть stable и совпадать с GraphQL input shape.

### `helpers/rich-text.ts`

Цель: заменить локальный `mapRichTextInput` и ручные blocks в category create/update.

Функции:

- `mapRichTextInput(input)`;
- `mapNullableRichTextInput(input)`;
- `mapContentInput(content)`.

### `helpers/workflow-context.ts`

Цель: один способ построить workflow context из `ServiceContext`.

Функции:

- `buildWorkflowContext(ctx)`;
- `buildWorkflowStartOptions(kind, ids, ctx)`.

### `helpers/payload.ts`

Цель: убрать повторяющийся код:

- `entity ? new EntityResolver(entity.id, ctx) : null`;
- deleted ID passthrough;
- `userErrors` passthrough.

Не превращать payload helper в скрытую business abstraction. Это только GraphQL shaping.

## Mapper layer

### Product update mapper

Создать `mutation/mappers/product-update.mapper.ts`.

Он должен покрывать оба call sites:

- `productUpdate`;
- `productBulkUpdate`.

API:

```ts
mapProductUpdateOperations(input: {
  productId: string;
  operations: ProductUpdateInput | null | undefined;
  fieldPrefix?: string[];
}): {
  operations: ProductUpdateOperation[];
  userErrors: UserError[];
}
```

Требования:

- единый mapping для product fields, categories, tags, variants;
- единый action mapping для category/tag operations;
- единая обработка `BigInt -> number` для pricing/inventory fields;
- единая обработка media file IDs;
- поддержка field prefix для bulk paths: `["input", "products", index, "operations", ...]`.

После выноса удалить дублирующие helpers из нижней части `MutationResolver.ts`:

- `mapOperationsForBulk`;
- `mapProductCategoryOperations`;
- `mapProductTagOperations`;
- `mapProductCategoryOperationAction`;
- `mapProductTagOperationAction`;
- `hasProductUpdateFields`, если он станет внутренним helper mapper-а.

### Category update mapper

Создать `mutation/mappers/category-update.mapper.ts`.

API:

```ts
mapCategoryUpdateOperations(input: {
  operations: CatalogMutationCategoryUpdateArgs["operations"];
}): {
  operations?: CategoryUpdateParams | null;
  userErrors: UserError[];
}
```

Требования:

- убрать `mapCategoryUpdateOperations` из `CatalogMutationResolver`;
- использовать общий global-id helper;
- сохранить поддержку explicit `null` для sections, где это уже часть contract;
- сохранить текущие field paths.

### Product create / category create mappers

Вынести только boundary mapping:

- media file IDs;
- vendor/parent IDs;
- SEO `ogImageId`;
- rich text.

Business validation остается в scripts.

## Domain mutation files

### `ProductMutationResolver.ts`

Содержит:

- `productCreate`;
- `productDelete`;
- `productUpdateStatus`;
- `productUpdate`.

Не содержит bulk.

### `ProductBulkMutationResolver.ts`

Содержит:

- `productBulkUpdate`;
- build context;
- вызов bulk workflow.

Использует общий `product-update.mapper.ts`.

### `CategoryMutationResolver.ts`

Содержит:

- `categoryCreate`;
- `categoryUpdate`;
- `categoryMove`;
- `categoryRebalance`;
- `categoryDelete`.

Event emission для affected products вынести в `events/product-events.ts` или workflow follow-up.

### `TagMutationResolver.ts`

Содержит:

- `tagCreate`;
- `tagUpdate`;
- `tagDelete`.

Первый refactor pass должен также подключить generated schemas, если они уже доступны:

- `TagCreateInputSchema`;
- `TagUpdateInputSchema`;
- `TagDeleteInputSchema`.

Это не меняет API, но выравнивает validation convention.

### `FacetMutationResolver.ts`, `CollectionMutationResolver.ts`, `BundleMutationResolver.ts`

Переносить после product/category/tag, потому что там больше inline object types и target ID decoding. Для bundle target decoding желательно сначала добавить `decodeTargetIdByType`.

## Пошаговый план

### Phase 0. Safety baseline

1. Зафиксировать список exported GraphQL mutation names из `CatalogMutation`.
2. Зафиксировать текущие generated input schema imports.
3. Не менять schema.
4. Не менять scripts/workflows.
5. Не запускать tests/tsc.

Acceptance:

- `MutationResolver.ts` behavior не меняется;
- generated schema/types не меняются;
- diff содержит только moves/extractions и import updates.

### Phase 1. Extract pure helpers

1. Создать `mutation/helpers/global-id.ts`.
2. Создать `mutation/helpers/rich-text.ts`.
3. Создать `mutation/helpers/workflow-context.ts`.
4. Заменить локальные helper functions в `MutationResolver.ts` на imports.

Acceptance:

- `safeDecodeGlobalId` удален из `MutationResolver.ts`;
- `mapRichTextInput` удален из `MutationResolver.ts`;
- все прежние field paths сохранены.

### Phase 2. Extract product update mapper

1. Создать `mutation/mappers/product-update.mapper.ts`.
2. Переключить `productUpdate` на mapper.
3. Переключить `productBulkUpdate` на тот же mapper.
4. Удалить duplicated bottom helpers.

Acceptance:

- single update и bulk update используют один mapper;
- `MutationResolver.ts` больше не содержит `mapOperationsForBulk`;
- operation type conversion остается либо рядом с product update resolver, либо в mapper module.

### Phase 3. Extract category mapper and category resolver

1. Создать `mutation/mappers/category-update.mapper.ts`.
2. Создать `mutation/mutations/CategoryMutationResolver.ts`.
3. Перенести category methods.
4. Оставить в `CatalogMutationResolver` только forwarding methods.

Acceptance:

- category block удален из основного файла;
- category update mapper больше не private method namespace resolver-а;
- workflow input строится через общий workflow context helper.

### Phase 4. Extract product/vendor/variant/option/feature resolvers

1. Создать `VendorMutationResolver.ts`.
2. Создать `ProductMutationResolver.ts`.
3. Создать `ProductBulkMutationResolver.ts`.
4. Создать `VariantMutationResolver.ts`.
5. Создать `OptionMutationResolver.ts`.
6. Создать `FeatureMutationResolver.ts`.

Acceptance:

- основной файл больше не содержит product/variant/option/feature implementation bodies;
- imports в `MutationResolver.ts` резко сокращены;
- domain files импортируют только свои scripts/generated types/schemas.

### Phase 5. Extract tag/facet/collection/bundle resolvers

1. Создать `TagMutationResolver.ts` и добавить `@ZodResolver` для tag inputs.
2. Создать `FacetMutationResolver.ts`.
3. Создать `CollectionMutationResolver.ts`.
4. Создать `BundleMutationResolver.ts`.
5. Вынести bundle target ID mapping в helper.

Acceptance:

- no inline object type mutations остаются в root file;
- все domain-specific decoding живет рядом с соответствующим domain resolver или helper.

### Phase 6. Event helper cleanup

1. Создать `mutation/events/product-events.ts`.
2. Перенести `emitProductDeleted`.
3. Перенести `emitProductCategoryUpdated` или создать follow-up задачу на перенос в workflow.

Acceptance:

- `MutationResolver.ts` не вызывает `broker.runWorkflow("events.emit", ...)` напрямую;
- event key и workflow id сохраняются.

### Phase 7. Final shape

1. `MutationResolver.ts` должен быть меньше 150 строк.
2. `CatalogMutationResolver.ts` должен быть facade-only, без DTO mapping.
3. Domain resolver files должны быть меньше 400-600 строк каждый. Если bundle остается больше, разделить bundle groups/items/templates/rules/actions на отдельные files.

## Риски и контроль

### Риск: потерять decorator metadata

`@ZodResolver` должен оставаться на методе, который фактически вызывается GraphQL executor. Если facade method просто вызывает domain resolver method, decorator на domain method может не сработать.

Контроль:

- либо decorator остается на facade forwarding method;
- либо проверить, что executor вызывает decorated domain method напрямую.

Предпочтение для первого pass: decorators оставить на facade methods, а domain resolver methods сделать undecorated private/service calls. После подтверждения поведения `@shopana/type-resolver` можно переносить decorators глубже.

### Риск: this/$ctx lifecycle

Domain resolver classes должны получать `ServiceContext` явно и не полагаться на magic inheritance state, если это не нужно.

Контроль:

- использовать `new DomainMutationResolver(this.$ctx)`;
- domain resolver может наследоваться от `CatalogType<Record<string, never>>`, но должен принимать `$ctx` так же, как текущие resolver classes.

### Риск: generated type drift

Refactor не должен менять schema. Generated files должны изменяться только если отдельно меняется GraphQL contract.

Контроль:

- после extraction проверить `git diff` по schema/generated files;
- если generated files поменялись без schema change, выяснить почему до продолжения.

### Риск: скрытое изменение field paths в userErrors

Многие clients завязаны на `userErrors.field`.

Контроль:

- mapper helpers должны принимать `fieldPrefix`;
- сохранить текущие paths для single и bulk flows.

## Проверка после реализации

С учетом project instructions:

- не запускать `test`;
- не запускать `tsc`;
- build запускать только когда нужна новая версия кода;
- для codegen/schema использовать `shopana-cli` MCP tools;
- если refactor меняет generated GraphQL artifacts, сначала объяснить причину в PR/commit notes.

Минимальная ручная проверка без tests/tsc:

1. `rg` по `MutationResolver.ts`, чтобы убедиться, что удалены duplicated helpers.
2. `rg` по mutation method names, чтобы все GraphQL methods остались доступны.
3. `git diff --stat`, чтобы убедиться, что refactor не задел schema/migrations/changeset.
4. Optional build через `shopana_build` только если нужен compile verification.

## Ожидаемый результат

После завершения refactor:

- `MutationResolver.ts` становится small root adapter;
- domain mutation code находится рядом с domain concerns;
- product update mapping не дублируется между single и bulk;
- global ID decoding и userErrors единообразны;
- tag/category/product mutation conventions выравнены;
- дальнейшие изменения GraphQL mutation contract становятся локальными, а не требуют редактировать 3000+ строковый файл.
