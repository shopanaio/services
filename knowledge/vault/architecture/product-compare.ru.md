---
tags: [architecture, catalog, comparison, storefront, product-features]
related: [architecture/overview, architecture/multi-tenancy, listing/facets-architecture]
---

# Архитектура Product Compare

## Статус и границы

Документ фиксирует canonical Catalog-модель для сравнения продуктов. Проект
работает с clean database: compatibility tables, backfill, dual-read и
dual-write отсутствуют.

Catalog владеет:

- product-local features и их локализованными значениями;
- comparison profiles, группами, полями и enum options;
- назначением comparison profile категории;
- явным mapping локальной feature в canonical comparison field;
- явным mapping product-local variant option в canonical field;
- нормализованными feature values и option values.

Catalog не хранит пользовательский список. Storefront не передаёт произвольный
набор products или variants в compare read API. Persisted selection принадлежит
Customers/preferences и состоит из единого упорядоченного набора concrete
`variant_id`, а не из уникальных products. Catalog группирует этот набор по
текущей primary category только при построении storefront presentation model. Цена,
наличие и variant state остаются текущими contextual данными pricing/inventory,
а не snapshot внутри comparison schema.

## Главный инвариант

`ProductFeature` и `ProductOption` остаются product-local. Их `slug`, имя и
values не являются межпродуктовой semantic identity.

Разные локальные features связываются с одной строкой сравнения через стабильный
`comparison_field.id`:

```text
Product A / display-diagonal ─┐
Product B / screen-size ──────┼──> ComparisonField / screen-size
Product C / display ──────────┘
```

Storefront никогда не объединяет features автоматически по slug или
переведённому имени. Такое совпадение может использоваться Admin только как
подсказка, которую merchant должен подтвердить явным binding. То же правило
действует для options `size`, `color`, `package` и их values.

## Physical model

```text
comparison_profile
  ├── comparison_group
  │     └── comparison_field
  │            └── comparison_field_option        (только ENUM)
  └── category_comparison_profile

product
  ├── product_feature                              (product-local)
  │     ├── comparison_feature_binding             feature -> field
  │     └── product_feature_value
  │           └── comparison_feature_value_binding value -> normalized value
  └── product_option                               (product-local)
        ├── comparison_option_binding                  option -> SINGLE field
        ├── product_option_value
        │     └── comparison_option_value_binding  value -> normalized value
        └── product_option_variant_link             selected value per variant

product + comparison_field
  └── comparison_field_not_applicable              explicit N/A
```

Все store-scoped таблицы содержат `store_id`. Как и в остальных Catalog
domains, `store_id` является tenant scope, но не входит в PK/FK. Scripts и
repositories обязаны брать его из trusted `ServiceContext` и проверять owner
entities в том же store.

## Comparison profile

`comparison_profile` задаёт совместимый класс товаров, например
`smartphones`, `laptops` или `televisions`. Это не копия category:

- несколько категорий могут использовать один профиль;
- категория получает не более одного прямого профиля;
- профиль можно временно выключить через `enabled` без удаления конфигурации;
- stable identity — UUIDv7 `id`; mutable `handle` используется только для
  управления и публичных friendly references.

`comparison_group` задаёт presentation groups, а `comparison_field` — строки
матрицы. Порядок детерминирован через уникальные `sort_index` внутри owner.

### Effective profile продукта

Для product-level compare effective profile определяется только через primary
category:

1. прямой profile primary category;
2. ближайший назначенный profile среди её ancestors;
3. profile отсутствует — structured comparison для продукта недоступен.

Непервичные категории не участвуют в выборе профиля. Это исключает
неоднозначность, когда продукт одновременно состоит в нескольких категориях.

Изменение primary category или category-profile assignment не перепривязывает
features и options автоматически. Management script должен проверить существующие
bindings и либо отклонить несовместимое изменение, либо выполнить явный
transactional remap.

## Comparison fields

`comparison_field.value_type` принимает:

| Type | Canonical storage |
| --- | --- |
| `BOOLEAN` | `boolean_value` |
| `DECIMAL` | `decimal_value numeric(38,12)` |
| `ENUM` | `field_option_id` |
| `INTEGER` | `integer_value bigint` |
| `TEXT` | trimmed non-empty `text_value` |

`cardinality` принимает `SINGLE` или `MULTIPLE`. Для `SINGLE` одна локальная
feature может иметь не более одного нормализованного value binding. Остальные
локальные values могут существовать, но не участвуют в canonical comparison.
Variant option всегда связывается только с `SINGLE` field: у option может быть
много possible values, но concrete variant выбирает не более одного.

`canonical_unit` допустим только для `DECIMAL` и `INTEGER`. В нём хранится
стабильный registry code (`mm`, `g`, `byte`, `Hz` и т. п.), а не локализованная
подпись. Конвертация выполняется до записи normalized value. Storefront
форматирует canonical value в locale-aware display unit, но equality и
`differs` вычисляются только по canonical data.

Изменение `canonical_unit` запрещено, пока поле содержит normalized bindings.
Сначала values должны быть явно удалены или перенормализованы. Это предотвращает
тихую смену смысла уже сохранённых чисел.

## Feature и option bindings

`comparison_feature_binding` связывает одну product-local leaf feature с одним
canonical field.

DB invariants:

- feature должна принадлежать указанному product;
- group feature (`is_group = true`) связывать нельзя;
- feature может иметь только один comparison field;
- один product не может связать две features с одним field;
- field должен принадлежать указанному profile;
- удаление локальной feature каскадно удаляет её binding;
- удаление canonical field запрещено, пока существуют product bindings.

Binding может быть подготовлен до назначения категории, но publish/update
script обязан проверить, что `binding.profile_id` совпадает с effective profile
продукта. Binding из другого профиля не публикуется в comparison matrix.

`comparison_option_binding` так же явно связывает product-local option с
canonical `SINGLE` field. Например, options `shoe-size`, `size` и
`eu-size` разных products могут питать одну строку `ComparisonField / size`.
Один `(product_id, field_id)` может иметь ровно один source kind:
feature, option или explicit `NOT_APPLICABLE`.

## Value normalization

`comparison_feature_value_binding` и `comparison_option_value_binding` связывают
локальный source value с normalized value. `value_type` продублирован
намеренно, а composite FK гарантирует его совпадение с типом canonical field.

CHECK constraint разрешает ровно один payload:

```text
BOOLEAN -> boolean_value
DECIMAL -> decimal_value
ENUM    -> field_option_id
INTEGER -> integer_value
TEXT    -> text_value
```

Для `ENUM` разные локальные values могут ссылаться на один canonical option:

```text
"OLED Display" ─┐
"AMOLED" ───────┼──> option / oled
"Organic LED" ──┘
```

Оригинальное localized name остаётся presentation/provenance source. Equality,
filters и differences используют normalized option/value.

Нормализация является write-time обязанностью Catalog management script.
Storefront query не парсит строки `6.1 inch` и не угадывает единицы.

## Missing и Not Applicable

Эти состояния семантически различаются:

- `VALUE` — есть feature/option binding и normalized value;
- `MISSING` — field применим, но binding/value отсутствует;
- `NOT_APPLICABLE` — существует явная запись
  `comparison_field_not_applicable`;
- `UNAVAILABLE` — contextual/runtime источник временно не дал значение и в
  configuration tables не сохраняется.

Один `(product_id, field_id)` не может одновременно иметь feature binding,
option binding или `NOT_APPLICABLE`. Integrity triggers проверяют все
направления перехода.

## Category assignment и совместимость

`category_comparison_profile` задаёт один прямой profile категории. Удаление
категории каскадно удаляет назначение. Удаление profile запрещено, пока он
назначен категории или используется bindings/explicit N/A; caller сначала
должен удалить зависимости явным management flow.

Products с одинаковым effective profile имеют `FULL` compatibility. Для разных
profiles storefront может вернуть `COMMON_ONLY`, но общие поля должны быть
определены отдельным cross-profile policy/read model; совпадение `handle` само
по себе не доказывает semantic identity.

## Storefront read contract

На product page Catalog расширяет `Product` безаргументным полем `comparison`.
Catalog сам определяет effective comparison profile текущего продукта, применяет
publication и storefront context, выбирает все доступные для сравнения products
и concrete variants, применяет deterministic server-defined order и limit и
возвращает полностью готовую `ProductComparison` matrix. Storefront не передаёт
product, variant, profile, filters или pagination inputs, не вычисляет
совместимость и не собирает matrix самостоятельно.

Для authenticated customer Catalog расширяет federation entity `Customer`
безаргументным полем `productComparisons`. Оно возвращает revision и все готовые
category matrices. Catalog группирует сохранённые Customers variants по текущей
primary category и возвращает один `ProductComparison` на категорию. Несколько
variants одного Product разрешены. Внутри категории колонки сохраняют persisted
order:

```text
current Product
  -> resolve effective profile and storefront context
  -> select every published product and concrete variant available for comparison
  -> apply deterministic server-defined order and limit
  -> build groups, rows and aligned cells
  -> emit Product.comparison

persisted Customer selection
  -> validate uniqueness, publication, product ownership and storefront context
  -> group by current primary category
  -> resolve effective profile inside each category group
  -> require compatible effective profile for all columns
  -> load ordered groups and fields
  -> load product feature mappings in batch
  -> load selected option/value mappings for each concrete variant
  -> join current variant price, availability and media
  -> emit one ProductComparison per category
  -> emit a Relay ProductComparisonColumnConnection
  -> emit row cells for exactly the requested column page
     with stable cell order and explicit status
```

Read model должен использовать DataLoader/batch repositories и возвращать
готовые category matrices, а не заставлять client группировать variants или
сопоставлять несколько `Product.features`. `groups` принадлежат конкретной page
колонок, поэтому каждая row содержит ровно одну cell на connection `nodes` в том
же порядке. Аргументы `first`, `after`, `last`, `before` управляют только Relay
pagination и не участвуют в определении совместимости.

Storefront schema Customers не публикует внутренние `customer_comparison` и
`customer_comparison_item`. Покупатель изменяет selection атомарными add/remove
операциями и может очистить одну category group. Mutation payload возвращает
Customer и новую revision; presentation model повторно читается через
`Customer.productComparisons` из Catalog subgraph.
Static profile/mapping data можно cache-ировать с `store_id` в key. Contextual
price и availability нельзя cache-ировать без market/channel/currency context.

System/header values — product title, concrete variant media, current price,
availability и CTA — не моделируются как `ProductFeature`. Их поставляют
owning domains через storefront composition. Variant-specific weight, dimensions,
price и selected options относятся к точному persisted `variant_id`; storefront
никогда не выбирает «первый доступный» variant молча.

## Write contracts

Management operations должны быть transactional и валидировать весь aggregate
до записи:

1. profile/group/field owner и `store_id`;
2. уникальность handle и sort order;
3. field type, cardinality и canonical unit;
4. leaf feature/option и product ownership;
5. совпадение binding profile с effective product profile перед publication;
6. enum option принадлежит тому же field;
7. normalized payload соответствует field type;
8. `SINGLE` cardinality для variant option binding;
9. option value принадлежит тому же product option;
10. взаимное исключение feature/option binding и explicit `NOT_APPLICABLE`.

DB constraints являются последней линией защиты, но не заменяют semantic
validation и понятные user errors в scripts.

Integrity triggers сериализуют конкурентные изменения по стабильным entity
IDs и `(product_id, field_id)`. Записи normalized feature/option values берут
shared lock canonical field, а semantic update field — exclusive lock того же
field. Source bindings сериализуются, чтобы feature, option и explicit N/A
не могли одновременно занять одну product row. Это гарантирует `SINGLE`,
запрет смены populated `canonical_unit` и перехода bound leaf feature в group
даже при параллельных management transactions.

## Migration layout

Canonical clean-DB baseline:

```text
0000_foundation/0001_foundation__types.sql
  comparison_value_type
  comparison_cardinality

0300_options/
  composite uniqueness required by option/value ownership FKs

0400_features/
  composite uniqueness required by product-local binding FKs

0450_comparison/
  0450_comparison__profiles.sql
  0451_comparison__fields.sql
  0452_comparison__translations.sql
  0453_comparison__category_relations.sql
  0454_comparison__feature_bindings.sql
  0455_comparison__integrity.sql
```

IDs создаются как UUIDv7 в application scripts. Baseline не содержит backfill,
legacy mapping, dual-read или compatibility views.
