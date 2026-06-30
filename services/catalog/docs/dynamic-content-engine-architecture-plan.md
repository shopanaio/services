# План архитектуры Dynamic Content Engine для Catalog

## Цель

Добавить в Shopana механизм динамического контента на уровне редактирования продукта и варианта. Мерчант должен иметь возможность вставлять в поля контента токены из данных каталога, например:

```text
Материал: {{ product.feature.material.value }}
Цвет: {{ variant.option.color.name }}
Вариант: {{ variant.title }}
```

Финальный текст не должен вычисляться только на чтении. Он должен материализоваться в базе данных, чтобы:

- storefront и Admin API могли читать готовое значение без исполнения шаблона в каждом запросе;
- поиск, фильтры и внешние индексы получали уже финальный текст;
- изменения option, feature, variant title и других зависимостей могли переиндексировать затронутые сущности;
- ошибки шаблона были видны в Admin до публикации.

## Контекст текущей модели

В Catalog уже есть разделение между исходными сущностями и материализованными проекциями:

- `product_translation` хранит локализованный `name`, `description_text`, `description_html`, `description_json`, `excerpt_*`.
- `variant_translation` хранит локализованный `title`.
- `product_option`, `product_option_value`, `product_feature`, `product_feature_value` хранят структурные данные.
- `product_search_index` и `variant_search_index` материализуют поля для поиска и фильтрации.
- скрипты `SyncProductIndexScript` и `SyncVariantIndexScript` уже пересобирают поисковые проекции после изменений.

Dynamic Content Engine должен встроиться в этот подход: шаблон редактируется отдельно, а финальные значения записываются в материализованные поля и индексы.

## Термины

**Template source** - исходный контент из редактора с динамическими токенами. Например rich text JSON с inline-токеном `variant.option.color.name`.

**Token** - разрешенная ссылка на поле из контекста продукта, варианта или связанных данных.

**Render context** - набор данных, доступных шаблону при рендеринге: product, variant, options, features, vendor, price, stock и т.д.

**Materialized content** - финальный `text/html/json`, уже без токенов. Именно это значение читают storefront, Admin preview/listing и поиск.

**Render scope** - уровень, на котором создается финальный результат:

- `PRODUCT` - один результат на `productId + locale + fieldKey`;
- `VARIANT` - отдельный результат на каждый `variantId + locale + fieldKey`.

## Архитектурные принципы

1. **Не выполнять произвольный Liquid/JS.** Только whitelist токенов из registry.
2. **Источник и результат разделены.** Редактор хранит шаблон, витрина и поиск читают материализованный результат.
3. **HTML всегда экранируется.** Токены подставляют текстовые значения, которые проходят через безопасный renderer.
4. **Материализация обязательна.** Если шаблон сохранен, engine должен создать или обновить финальную проекцию.
5. **Локаль и tenant обязательны.** Все таблицы и запросы включают `project_id` и `locale`.
6. **Variant-specific данные не смешиваются с product-level полями.** Если поле использует `variant.*`, результат должен иметь `VARIANT` scope.

## Поддерживаемые поля v1

Минимальный v1 должен покрыть только Catalog:

- `Product.title`
- `Product.description`
- `Product.excerpt`
- `Variant.title`

Расширение после v1:

- SEO title/description;
- category/collection content;
- bundle content;
- email/storefront snippets.

## Token Registry

Engine должен иметь централизованный registry, который описывает доступные токены, их типы, scope и зависимости.

Примеры v1:

| Token | Scope | Тип | Описание |
| --- | --- | --- | --- |
| `product.title` | PRODUCT, VARIANT | string | Локализованное имя продукта |
| `product.handle` | PRODUCT, VARIANT | string | Handle продукта |
| `product.vendor.name` | PRODUCT, VARIANT | string | Название vendor |
| `product.feature.<slug>.name` | PRODUCT, VARIANT | string | Название характеристики |
| `product.feature.<slug>.value` | PRODUCT, VARIANT | string/list | Значение характеристики |
| `product.option.<slug>.values` | PRODUCT | list | Все значения option у продукта |
| `variant.title` | VARIANT | string | Локализованный title варианта |
| `variant.handle` | VARIANT | string | Handle варианта |
| `variant.sku` | VARIANT | string | SKU варианта |
| `variant.option.<slug>.name` | VARIANT | string | Выбранное значение option у варианта |

Registry должен отдавать metadata для Admin UI:

- `key`;
- человекочитаемый label;
- описание;
- тип значения;
- допустимый `renderScope`;
- поддерживаемые formatters;
- dependency kind для invalidation.

## Синтаксис шаблонов

Для пользователя можно показывать компактный синтаксис:

```text
{{ variant.option.color.name }}
{{ product.feature.material.value | default: "не указан" }}
{{ product.option.size.values | join: ", " }}
```

Но в rich text editor лучше хранить токены как структурные inline nodes в `json`, а не как сырой текст внутри HTML.

Пример node:

```json
{
  "type": "dynamicField",
  "attrs": {
    "key": "variant.option.color.name",
    "fallback": "",
    "format": null
  }
}
```

`text` и `html` могут содержать fallback-сериализацию для совместимости, но canonical source для rich text должен быть `json`.

## Модель данных

### `catalog.dynamic_content_template`

Хранит исходный шаблон, который редактирует Admin.

```text
project_id uuid not null
id uuid primary key
owner_type text not null              -- PRODUCT | VARIANT
owner_id uuid not null
field_key text not null               -- title | description | excerpt
locale varchar(8) not null
render_scope text not null            -- PRODUCT | VARIANT
source_text text
source_html text
source_json jsonb
template_ast jsonb not null
dependency_keys text[] not null default '{}'
source_hash text not null
version integer not null default 1
enabled boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()

unique(project_id, owner_type, owner_id, field_key, locale)
index(project_id, owner_type, owner_id)
index(project_id, locale, field_key)
gin(dependency_keys)
```

### `catalog.dynamic_content_render`

Хранит финальный материализованный результат.

```text
project_id uuid not null
id uuid primary key
template_id uuid not null references dynamic_content_template(id) on delete cascade
target_type text not null             -- PRODUCT | VARIANT
target_id uuid not null
product_id uuid
variant_id uuid
field_key text not null
locale varchar(8) not null
rendered_text text
rendered_html text
rendered_json jsonb
search_text text
source_hash text not null
dependency_hash text not null
status text not null                  -- READY | WARNING | ERROR | STALE
warnings jsonb
error_code text
error_message text
rendered_at timestamptz
updated_at timestamptz not null default now()

unique(project_id, target_type, target_id, field_key, locale)
index(project_id, product_id, locale)
index(project_id, variant_id, locale)
index(project_id, status)
```

### `catalog.dynamic_content_dependency`

Для точной invalidation после v1. В первом релизе можно начать с `dependency_keys` и coarse rerender по productId.

```text
project_id uuid not null
template_id uuid not null references dynamic_content_template(id) on delete cascade
dependency_kind text not null          -- PRODUCT | VARIANT | OPTION | OPTION_VALUE | FEATURE | FEATURE_VALUE | VENDOR
dependency_key text not null           -- например option:color
entity_id uuid
product_id uuid
variant_id uuid

index(project_id, dependency_kind, entity_id)
index(project_id, product_id)
index(project_id, variant_id)
```

## Совместимость с текущими таблицами

Для полей, где финальное значение совпадает с текущей canonical таблицей, materializer должен обновлять существующие таблицы:

- `Product.title` -> `product_translation.name`;
- `Product.description` с `PRODUCT` scope -> `product_translation.description_text/html/json`;
- `Product.excerpt` с `PRODUCT` scope -> `product_translation.excerpt_text/html/json`;
- `Variant.title` -> `variant_translation.title`.

`dynamic_content_render` остается общей таблицей аудита, статуса, preview и поиска.

Если `Product.description` использует `variant.*`, engine не должен записывать разные variant-specific результаты в один `product_translation.description_*`. Для такого поля:

- `dynamic_content_template.render_scope = VARIANT`;
- создается по одному `dynamic_content_render` на каждый вариант;
- storefront должен читать variant-scoped render для выбранного варианта;
- `product_translation.description_*` остается product-level fallback.

## Компоненты engine

### `DynamicContentParser`

Отвечает за:

- чтение rich text JSON/html/text;
- поиск dynamic field nodes или `{{ ... }}` fallback-синтаксиса;
- построение AST;
- сбор `dependency_keys`;
- валидацию синтаксиса.

### `DynamicContentRegistry`

Отвечает за:

- whitelist токенов;
- metadata для Admin token picker;
- проверку допустимого scope;
- список resolver-функций для каждого token family.

### `DynamicContentContextBuilder`

Собирает данные для render context через существующие repositories/loaders:

- product translation;
- variant translation;
- selected options;
- option/value translations;
- feature/value translations;
- vendor;
- inventory/pricing только через существующие boundaries, если они нужны токенам.

В v1 лучше ограничиться данными Catalog, чтобы не связывать renderer с inventory/pricing broker calls.

### `DynamicContentRenderer`

Принимает AST и render context, возвращает:

- `renderedText`;
- `renderedHtml`;
- `renderedJson`;
- `searchText`;
- `dependencyHash`;
- warnings/errors.

Renderer не должен обращаться к базе напрямую.

### `DynamicContentMaterializer`

Оркестрирует:

1. загрузку template;
2. определение target set по `render_scope`;
3. построение context для каждого target;
4. render;
5. запись `dynamic_content_render`;
6. запись совместимых canonical таблиц;
7. запуск синхронизации search index.

### `DynamicContentInvalidationService`

Вызывается из существующих scripts после изменений:

- `ProductUpdateContentScript`;
- `ProductUpdateScript`;
- `OptionsSyncScript`;
- `OptionUpdateScript`;
- `FeaturesSyncScript`;
- `FeatureUpdateScript`;
- `VariantUpdateOptionsScript`;
- `VariantBatchUpdateOptionsScript`;
- `VariantCreateScript`;
- `VariantDeleteScript`;
- `VariantUpdatePricingScript`, если позже будут price tokens.

В v1 допустима coarse invalidation: при изменении продукта, варианта, option или feature пересобрать dynamic content для всего productId. После стабилизации добавить точечный поиск через `dynamic_content_dependency`.

## Жизненный цикл сохранения

### Статический контент без токенов

1. Admin отправляет существующий `RichTextInput`.
2. Текущие product/variant scripts сохраняют значения как сейчас.
3. `dynamic_content_template` не создается или отключается.
4. Search index синхронизируется обычным путем.

### Динамический контент

1. Admin отправляет source rich text с dynamic nodes.
2. Script вызывает parser и registry validation.
3. Template сохраняется в `dynamic_content_template`.
4. Materializer синхронно рендерит текущий owner.
5. Если `render_scope = VARIANT`, materializer создает render rows для всех активных вариантов продукта.
6. Совместимые canonical поля обновляются там, где это возможно.
7. Search index пересобирается для product/variant.
8. Mutation payload возвращает `renderStatus` и warnings.

## Search materialization

Нужно расширить поисковые проекции:

### `product_search_index`

Добавить:

```text
search_text text not null default ''
content_hash text
```

`search_text` должен включать:

- материализованный product title;
- материализованный product description text;
- materialized excerpt text;
- category/tag/feature text, если они уже участвуют в поиске.

### `variant_search_index`

Добавить:

```text
search_text text not null default ''
content_hash text
```

`search_text` должен включать:

- materialized variant title;
- selected option value names;
- SKU;
- variant-scoped product content, если оно есть.

В Postgres v1 можно использовать `_containsi`/`ILIKE` на `search_text`. Следующий шаг - `tsvector` или внешний индекс, но внешняя система должна получать только материализованный текст.

## GraphQL Admin API

Нужно сохранить совместимость с текущими `RichTextInput`, но добавить явный API для dynamic content.

Предлагаемый v1:

```graphql
enum DynamicContentRenderScope {
  PRODUCT
  VARIANT
}

type DynamicContentWarning {
  code: String!
  message: String!
  token: String
}

type DynamicContentRenderStatus {
  status: String!
  warnings: [DynamicContentWarning!]!
  renderedAt: DateTime
}

input DynamicRichTextInput {
  source: RichTextInput!
  renderScope: DynamicContentRenderScope!
}
```

Для обратной совместимости в `ProductContentInput` можно добавить новые поля, не ломая старые:

```graphql
input ProductContentInput {
  description: RichTextInput
  excerpt: RichTextInput
  descriptionTemplate: DynamicRichTextInput
  excerptTemplate: DynamicRichTextInput
}
```

Если `descriptionTemplate` передан, он имеет приоритет над `description`. Если передан только `description`, поведение остается статическим.

Для `Variant.title` нужен отдельный input в variant update/create flow:

```graphql
input VariantTitleTemplateInput {
  source: String!
}
```

Либо общий `DynamicTextInput`:

```graphql
input DynamicTextInput {
  source: String!
}
```

Также нужен read API для Admin:

```graphql
type DynamicContentTemplate {
  id: ID!
  ownerType: String!
  ownerId: ID!
  fieldKey: String!
  locale: String!
  renderScope: DynamicContentRenderScope!
  source: RichText
  status: DynamicContentRenderStatus!
}

type DynamicContentToken {
  key: String!
  label: String!
  description: String
  valueType: String!
  scopes: [DynamicContentRenderScope!]!
}
```

## Storefront API

Storefront не должен получать шаблон по умолчанию.

Для обычного product-level контента:

- `Product.description` возвращает материализованный `product_translation.description_*`;
- `Product.excerpt` возвращает материализованный `product_translation.excerpt_*`;
- `Variant.title` возвращает материализованный `variant_translation.title`.

Для variant-scoped product content нужно отдельное поле или аргумент:

```graphql
type Variant {
  renderedContent(fieldKey: String!): RichText
}
```

или:

```graphql
type Product {
  renderedContent(fieldKey: String!, variantId: ID): RichText
}
```

Рекомендуемый v1 - добавить поле на `Variant`, потому что оно явно соответствует target render row.

## Admin UI

В редакторе продукта/варианта нужен token picker:

- кнопка вставки dynamic field в rich text editor;
- список доступных tokens из GraphQL;
- фильтрация tokens по текущему полю и `renderScope`;
- preview результата;
- выбор preview variant для `VARIANT` scope;
- warnings по отсутствующим данным.

В EditorJS/structured rich text токен должен быть inline node, а не обычный текст. Это позволит:

- валидировать токены до сохранения;
- не ломать HTML;
- показывать token chips;
- безопасно сериализовать rich text.

## Ошибки и fallback

Типы проблем:

- unknown token;
- token не разрешен для выбранного scope;
- зависимое значение отсутствует;
- formatter применен к неподходящему типу;
- render target удален или скрыт.

Политика v1:

- unknown token и invalid scope блокируют сохранение;
- missing value не блокирует сохранение, если у токена есть fallback;
- без fallback missing value дает `WARNING` и пустую строку;
- при internal error render row получает `ERROR`, canonical поле не перезаписывается последним невалидным значением.

## Invalidation matrix

| Изменение | Что пересобрать |
| --- | --- |
| Product title/content | templates owner=`PRODUCT`, productId |
| Variant title | templates owner=`VARIANT`, variantId; product templates с `VARIANT` scope |
| Variant selected options | variant render rows для variantId; `variant_search_index` |
| Option name/value translation | все templates productId, где dependency `option:<slug>` |
| Feature name/value translation | все templates productId, где dependency `feature:<slug>` |
| Vendor name | product templates, где dependency `vendor` |
| Product publish/delete | product/variant render rows и search indexes |
| Variant create/delete | product templates с `VARIANT` scope для productId |

## Background rebuild

Нужен служебный script:

```text
DynamicContentRebuildScript
```

Параметры:

- `projectId`;
- `productId?`;
- `variantId?`;
- `locale?`;
- `fieldKey?`;
- `dryRun?`.

Use cases:

- миграция старого контента;
- пересборка после изменения renderer;
- восстановление после failed jobs;
- bulk update option/feature translations.

Для больших fan-out операций лучше использовать DBOS workflow:

```text
catalog.dynamicContent.rebuildProduct
catalog.dynamicContent.rebuildProject
```

## Поэтапное внедрение

### Phase 1 - Storage и parser foundation

- Добавить Drizzle models для `dynamic_content_template`, `dynamic_content_render`, позже `dynamic_content_dependency`.
- Сгенерировать migration через project tooling, не редактировать changeset вручную.
- Добавить parser для structured dynamic nodes.
- Добавить registry с Catalog-only tokens.
- Добавить unit-level validation внутри scripts без подключения UI.

### Phase 2 - Product/Variant materialization

- Добавить `DynamicContentMaterializer`.
- Интегрировать с `ProductUpdateContentScript`.
- Интегрировать с `ProductUpdateScript` для title.
- Интегрировать с variant title update/create path.
- Для product-level fields записывать финальный результат в `product_translation`.
- Для `Variant.title` записывать финальный результат в `variant_translation`.

### Phase 3 - Search index integration

- Расширить `product_search_index` и `variant_search_index`.
- Обновить `SyncProductIndexScript` и `SyncVariantIndexScript`.
- Добавить `search_text` из materialized content.
- Подготовить rebuild script для существующих products/variants.

### Phase 4 - GraphQL Admin API

- Добавить inputs для dynamic rich text/text.
- Добавить query для token registry.
- Добавить read model для template/render status.
- Обновить generated GraphQL types через project tooling.

### Phase 5 - Admin editor

- Добавить inline dynamic field tool в rich text editor.
- Добавить token picker.
- Добавить preview по product/variant.
- Показывать render warnings рядом с полем.

### Phase 6 - Storefront behavior

- Убедиться, что storefront читает materialized product fields.
- Добавить variant-scoped rendered content API, если нужно показывать product description, зависящий от выбранного варианта.
- Запретить отдачу template source в публичный API без явного admin/debug режима.

### Phase 7 - Precise invalidation

- Заполнить `dynamic_content_dependency`.
- Заменить coarse rerender по productId на targeted rerender по dependency.
- Добавить observability: количество stale/error rows, время render, fan-out size.

## Риски

- Product-level поле может случайно начать зависеть от variant context. Это нужно явно блокировать или переводить поле в `VARIANT` scope.
- Fan-out по продукту с большим числом вариантов может быть дорогим. Нужны лимиты и background workflow.
- HTML из шаблона нельзя смешивать с неэкранированными значениями.
- Search может показывать устаревший текст, если invalidation не сработает. Поэтому render rows должны иметь `status` и `content_hash`.
- Редактор должен хранить structured tokens, иначе raw `{{ ... }}` в HTML будет трудно безопасно поддерживать.

## Открытые решения

1. Должен ли `Product.description` поддерживать `VARIANT` scope в v1 или только после появления storefront API для selected variant content?
2. Нужно ли разрешать tokens из pricing/inventory в v1, или оставить только Catalog-owned данные?
3. Хранить ли source template для `title` как rich text/text в общей таблице или добавить отдельный `dynamic_text_template` input без rich text?
4. Должны ли product listing views читать `dynamic_content_render`, или достаточно обновлять `product_translation` для product-level полей?
5. Нужен ли Postgres `tsvector` сразу, или v1 search может ограничиться `search_text` и последующей интеграцией внешнего индекса?

## Рекомендуемый v1

Для первого релиза достаточно:

- structured tokens в rich text JSON;
- Catalog-only tokens;
- `PRODUCT` scope для `Product.description` и `Product.excerpt`;
- `VARIANT` scope для `Variant.title`;
- материализация в `product_translation`, `variant_translation` и `dynamic_content_render`;
- расширение `product_search_index.search_text` и `variant_search_index.search_text`;
- coarse invalidation по `productId`;
- Admin preview и warnings.

`Product.description` с `variant.*` лучше не включать в v1, пока нет явного storefront контракта для variant-scoped rendered content.
