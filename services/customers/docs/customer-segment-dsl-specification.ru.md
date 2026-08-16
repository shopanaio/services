# Customer Segment DSL v1

Статус: draft  
Владелец: Customers service  
Целевая реализация: Peggy -> типизированный AST -> Drizzle SQL builder -> PostgreSQL  

## 1. Назначение

Customer Segment DSL задает динамические customer segments как логическое
выражение над профилем покупателя, адресами, согласиями, классификацией и
проекциями покупательской активности.

Язык должен позволять merchant без знания SQL создавать практически полезные
сегменты:

- подписчики email из выбранных стран;
- новые покупатели без заказов;
- постоянные покупатели с тремя и более завершенными заказами;
- покупатели, потратившие заданную сумму;
- покупатели без заказа за последние 90 дней;
- покупатели конкретного продукта или категории;
- покупатели с определенным tag или group;
- покупатели с брошенным checkout;
- дни рождения в ближайшие 30 дней.

Синтаксис вдохновлен Shopify customer segmentation: запрос является
WHERE-подобным выражением из attributes, operators, values, `AND`/`OR` и
функциональных predicates. Shopana не реализует ShopifyQL целиком и не обещает
синтаксическую совместимость с Shopify.

Полезные исходные материалы:

- [Shopify Segment query language reference](https://shopify.dev/docs/apps/build/shopifyql/segment-query-language-reference)
- [Shopify customer segment filters](https://help.shopify.com/en/manual/customers/customer-segmentation/reference-guide/shopify-segments)
- [Components of a Shopify customer segment](https://help.shopify.com/en/manual/customers/customer-segmentation/reference-guide/components)

## 2. Цели

1. Один язык для visual builder, advanced text editor, preview и materialization.
2. Достаточная выразительность для основных CRM и marketing use cases.
3. Предсказуемая SQL-семантика без выполнения пользовательского JavaScript или
   raw SQL.
4. Строгая типизация attributes, operators, values и function parameters.
5. Возможность добавлять новые attributes без изменения грамматики.
6. Одинаковый результат при preview, массовом rebuild и пересчете одного
   customer.
7. Стабильное versioned `definition` для хранения в
   `customer_segment.definition`.
8. Обязательная store isolation во всех скомпилированных запросах.

## 3. Не цели v1

- произвольный SQL, JavaScript, regular expressions или user-defined functions;
- `SELECT`, `FROM`, `JOIN`, `ORDER BY`, pagination или projection в DSL;
- арифметические выражения между attributes;
- вложенные ссылки на другие dynamic segments;
- full-text поиск по note, name, address или metadata;
- произвольный доступ к JSON/metadata paths;
- synchronous запросы в другие services во время evaluation;
- использование Catalog или Orders как runtime source of truth;
- predicted spend, RFM и ML attributes до появления принадлежащих Customers
  read models.

DSL всегда компилируется только в запросы к данным и read models, которыми
владеет Customers service.

## 4. Общий вид

Запрос содержит только boolean expression:

```sql
(amount_spent >= 500 OR number_of_orders >= 5)
AND email_subscription_status = 'SUBSCRIBED'
AND customer_countries CONTAINS 'UA'
```

Одна clause имеет одну из форм:

```text
<attribute> <operator> <value>
<attribute> BETWEEN <value> AND <value>
<attribute> IS [NOT] NULL
<list-attribute> [NOT] CONTAINS <value>
<function-attribute> [NOT_]MATCHES (<parameters>)
```

Clauses объединяются `AND`, `OR`, `NOT` и скобками.

## 5. Лексические правила

### 5.1 Keywords и identifiers

Keywords нечувствительны к регистру. Canonical printer всегда выводит их в
верхнем регистре:

```text
AND OR NOT BETWEEN IN IS NULL CONTAINS MATCHES NOT_MATCHES
```

Имена attributes и parameters выводятся в `snake_case`. Пользовательский ввод
для identifiers нечувствителен к регистру: parser сохраняет исходный spelling и
source range для diagnostics, а semantic analyzer перед lookup всегда применяет
ASCII lowercase. Поэтому `Customer_Language` и `customer_language` обозначают
один attribute. Registry содержит только ASCII lowercase names, удовлетворяющие
`[a-z_][a-z0-9_]*`; Unicode case folding к identifiers не применяется.

Lexical contract identifiers:

```text
Identifier ::= [A-Za-z_][A-Za-z0-9_]*
```

Keyword распознается только как полный token: после него не может следовать
символ identifier. Например, `notable` является одним identifier, а не `NOT`
и `able`. Между tokens разрешены только ASCII whitespace `SP`, `TAB`, `CR` и
`LF`; comments в v1 отсутствуют. Query, состоящий только из whitespace,
является syntax error.

### 5.2 Строки

Строки заключаются в одинарные кавычки и содержат UTF-8:

```sql
customer_language = 'uk-UA'
company_name = 'O\'Brien Retail'
```

Поддерживаемые escape sequences:

| Sequence | Значение |
| --- | --- |
| `\'` | одинарная кавычка |
| `\\` | обратный slash |
| `\n` | newline |
| `\r` | carriage return |
| `\t` | tab |

Другие escape sequences являются syntax error. Максимальная длина одного
string literal после decoding — 1 024 Unicode code points.

### 5.3 Числа и money

Поддерживаются signed decimal integers и decimals:

```text
0
42
-10
999.99
```

Scientific notation, `NaN`, `Infinity`, разделители тысяч и locale-specific
decimal separators не поддерживаются.

После lexical validation Integer должен помещаться в signed
64-bit range `[-9223372036854775808, 9223372036854775807]`. Decimal допускает не
более 38 significant digits и не более 18 fractional digits. Эти limits
проверяются над decimal string до создания SQL bind value; JavaScript `number`
для проверки или хранения не используется. Attribute descriptor может сузить
domain, например запретить отрицательное значение, но не может расширить эти
общие limits.

Money attributes принимают decimal amount в единственной configured currency
Store. Currency symbol и currency code в запросе не указываются:

```sql
amount_spent >= 500.00
```

Semantic analyzer обязан преобразовать decimal string в integer minor units без
использования IEEE-754 arithmetic. Значение с количеством decimal places больше
currency exponent отклоняется.

`currency_exponent` должен быть целым числом от 0 до 6. Рассчитанные minor units
обязаны помещаться в signed 64-bit range PostgreSQL `bigint`; иначе возвращается
`SEGMENT_INVALID_MONEY`.

Normalized money value сохраняет как исходное canonical decimal, так и контекст,
в котором были рассчитаны minor units: `currency_code` и `currency_exponent`.
Это не позволяет молча переинтерпретировать literal после изменения Store
currency. Изменение currency обрабатывается как изменение evaluation context по
правилам раздела 18.5.

### 5.4 Boolean

```text
TRUE
FALSE
```

### 5.5 IDs

Entity references задаются публичным GraphQL Global ID как строка. DSL принимает
тот же base64-encoded ID, который возвращает GraphQL API; decoded
`gid://shopana/...` URI не является допустимым пользовательским literal:

```sql
customer_tags CONTAINS 'Z2lkOi8vc2hvcGFuYS9DdXN0b21lclRhZy8wMTkwMDAwMC0wMDAwLTcwMDAtODAwMC0wMDAwMDAwMDAwMDE='
```

Semantic analyzer base64-декодирует Global ID, проверяет scheme, ожидаемый
entity type и UUID, после чего помещает внутренний UUID в canonical AST.
Canonical printer повторно кодирует UUID в публичный GraphQL Global ID. Названия
entities не являются идентичностью правила и используются Admin только как
presentation metadata.

### 5.6 Dates и datetimes

Absolute date:

```text
2026-08-16
```

Absolute datetime:

```text
2026-08-16T14:30:00
2026-08-16T14:30:00Z
2026-08-16T14:30:00+03:00
```

Datetime без offset интерпретируется в timezone Store. Date всегда обозначает
calendar date в timezone Store.

`Date` и `DateTime` являются разными semantic types. Date attribute принимает
только `Date`, named date или relative date. DateTime literal для Date attribute
возвращает `SEGMENT_VALUE_TYPE_MISMATCH`; неявного truncation до calendar date
нет. DateTime literals зарезервированы для будущих attributes типа `DateTime` —
в registry v1 таких attributes нет. Если source Date attribute хранится как
`timestamp`/`timestamptz`, compiler сначала получает его calendar date в
timezone Store и только затем сравнивает с Date value.

Calendar date и datetime обязаны существовать по proleptic Gregorian calendar.
Например, `2026-02-30`, offset вне диапазона и leap second являются semantic
error `SEGMENT_INVALID_DATE`.

Named dates:

```text
today
yesterday
```

Relative dates:

```text
-7d
-4w
-3m
-1y
+30d
```

Units:

| Unit | Значение |
| --- | --- |
| `d` | calendar days |
| `w` | 7 calendar days |
| `m` | calendar months |
| `y` | calendar years |

Relative date вычисляется от начала `today` в timezone Store. Calendar months и
years используют PostgreSQL interval/calendar semantics, а не фиксированное
число секунд.

Положительные offsets разрешены только для attributes, явно поддерживающих
будущие даты, например `birthday`.

## 6. Boolean semantics

Приоритет операторов от высокого к низкому:

1. parentheses;
2. `NOT`;
3. `AND`;
4. `OR`.

Пример:

```sql
amount_spent > 100 OR number_of_orders >= 5
AND email_subscription_status = 'SUBSCRIBED'
```

эквивалентен:

```sql
amount_spent > 100 OR
(number_of_orders >= 5 AND email_subscription_status = 'SUBSCRIBED')
```

Canonical printer использует единственные нормативные правила скобок из раздела
14.1. Избыточные пользовательские скобки после parse не сохраняются.

`AND` и `OR` допускают short-circuit при in-memory evaluation, но SQL compiler
не должен полагаться на порядок вычисления PostgreSQL expressions.

## 7. NULL и отсутствующие relation values

DSL использует двухзначную business-семантику, а не публичную SQL
three-valued logic.

1. Сравнение отсутствующего scalar value с обычным value возвращает `FALSE`.
2. `field != value` для отсутствующего field также возвращает `FALSE`.
3. Проверка отсутствия выполняется только через `IS NULL`.
4. `NOT (field = value)` инвертирует итоговый boolean и поэтому возвращает
   `TRUE`, если field отсутствует.
5. `list CONTAINS value` для пустого списка возвращает `FALSE`.
6. `list NOT CONTAINS value` является точным complement и для пустого списка
   возвращает `TRUE`.
7. `function MATCHES (...)` возвращает `FALSE`, если подходящих relation rows
   нет; `NOT_MATCHES` возвращает точный complement.

Каждый leaf predicate компилируется в non-null boolean через `COALESCE` или
`EXISTS`/`NOT EXISTS`.

## 8. Scalar operators

### 8.1 Общая матрица

| Operator | String | Enum | Boolean | Integer | Decimal/Money | Date | DateTime | ID |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `=` | yes | yes | yes | yes | yes | yes | yes | yes |
| `!=` | yes | yes | yes | yes | yes | yes | yes | yes |
| `>` | no | no | no | yes | yes | yes | yes | no |
| `>=` | no | no | no | yes | yes | yes | yes | no |
| `<` | no | no | no | yes | yes | yes | yes | no |
| `<=` | no | no | no | yes | yes | yes | yes | no |
| `BETWEEN ... AND ...` | no | no | no | yes | yes | yes | yes | no |
| `IN (...)` | yes | yes | yes | yes | no | no | no | yes |
| `NOT IN (...)` | yes | yes | yes | yes | no | no | no | yes |
| `IS NULL` | attribute-specific | attribute-specific | no | attribute-specific | attribute-specific | yes | yes | attribute-specific |
| `IS NOT NULL` | attribute-specific | attribute-specific | no | attribute-specific | attribute-specific | yes | yes | attribute-specific |

`BETWEEN` включает обе границы. Semantic analyzer проверяет `lower <= upper`.

`IN` и `NOT IN` принимают от 1 до 100 однородных values:

```sql
customer_language IN ('uk-UA', 'en-US', 'pl-PL')
```

`NOT IN` имеет те же NULL rules, что и `!=`: отсутствующее значение не
совпадает. Для включения отсутствующих значений merchant должен написать:

```sql
customer_language NOT IN ('ru-RU') OR customer_language IS NULL
```

### 8.2 Запрещенные string operators

В v1 отсутствуют substring `CONTAINS`, `LIKE`, `ILIKE`, prefix search и regex
для scalar strings. Они создают неоднозначную normalization semantics и обычно
не используют B-tree indexes. Нужные business cases должны покрываться
нормализованными attributes, например `customer_email_domain`.

## 9. List operators

List attributes поддерживают:

| Operator | Семантика |
| --- | --- |
| `CONTAINS value` | существует active related value, равное `value` |
| `NOT CONTAINS value` | не существует active related value, равного `value` |
| `IS NULL` | нет ни одного active related value |
| `IS NOT NULL` | существует хотя бы одно active related value |

Несколько требуемых values выражаются несколькими clauses:

```sql
customer_tags CONTAINS 'Z2lkOi8vc2hvcGFuYS9DdXN0b21lclRhZy8wMTkwMDAwMC0wMDAwLTcwMDAtODAwMC0wMDAwMDAwMDAwMDE='
AND customer_tags CONTAINS 'Z2lkOi8vc2hvcGFuYS9DdXN0b21lclRhZy8wMTkwMDAwMC0wMDAwLTcwMDAtODAwMC0wMDAwMDAwMDAwMDI='
```

Хотя синтаксис длиннее `CONTAINS ALL`, он проще для visual builder и не вводит
дополнительные list quantifiers.

## 10. Function predicates

Function attribute используется для условий над набором связанных событий или
фактов:

```sql
orders_placed MATCHES (
  status = 'COMPLETED',
  count >= 2,
  completed_date >= -90d
)
```

Параметры разделяются запятыми и относятся к одной function scope. Запятая
означает `AND`. `OR`, `NOT` и вложенные functions внутри parameter list в v1 не
поддерживаются.

Operators:

| Operator | Семантика |
| --- | --- |
| `MATCHES` | без aggregate parameters существует matching source row; с aggregate parameters все aggregate predicates истинны для отфильтрованного набора |
| `NOT_MATCHES` | точный boolean complement `MATCHES` |
| `IS NULL` | relation/event этого вида отсутствует вообще |
| `IS NOT NULL` | relation/event этого вида существует |

`NOT MATCHES` принимается parser как alias, но canonical printer всегда выводит
`NOT_MATCHES`.

Function registry определяет разрешенные parameters, их типы, operators и
aggregate semantics. Неизвестные и повторяющиеся parameters являются semantic
error. `IS NULL` и `IS NOT NULL` разрешены только для nullable non-aggregate
parameters и следуют общей двухзначной NULL-семантике. Они фильтруют source rows
до aggregation так же, как остальные non-aggregate parameters.

Пустой parameter list разрешен. `function MATCHES ()` означает существование
хотя бы одной source row, `NOT_MATCHES ()` — отсутствие source rows. Для
functions без parameters это эквивалентно соответственно `IS NOT NULL` и
`IS NULL`, но canonical printer не заменяет одну форму другой.

При наличии хотя бы одного aggregate parameter `count`/`sum_*` source rows
сначала фильтруются обычными parameters, после чего aggregates вычисляются даже
для пустого набора. Для пустого набора `count = 0`, а `sum_* = 0`. Неявное
условие `count > 0` не добавляется. Поэтому
`orders_placed MATCHES (status = 'COMPLETED', count = 0)` является корректным
способом проверить отсутствие завершенных orders. `NOT_MATCHES` во всех случаях
остается точным complement результата `MATCHES`.

## 11. Поддерживаемые attributes v1

Колонка `Dependency` используется для event-driven reevaluation.

### 11.1 Customer profile

| Attribute | Type | Operators | Source | Dependency |
| --- | --- | --- | --- | --- |
| `customer_added_date` | Date | comparisons, `BETWEEN` | `customer.created_at` | `profile` |
| `customer_updated_date` | Date | comparisons, `BETWEEN` | `customer.updated_at` | `customer.any` |
| `last_activity_date` | Date | comparisons, `BETWEEN`, null | `customer.last_activity_at` | `profile` |
| `customer_account_status` | Enum | `=`, `!=`, `IN`, `NOT IN` | `customer.account_status` | `status` |
| `customer_lifecycle_status` | Enum | `=`, `!=`, `IN`, `NOT IN` | `customer.lifecycle_status` | `status` |
| `customer_language` | String | `=`, `!=`, `IN`, `NOT IN`, null | `customer.preferred_locale` | `profile` |
| `customer_source` | String | `=`, `!=`, `IN`, `NOT IN` | `customer.source` | `profile` |
| `customer_email_domain` | String | `=`, `!=`, `IN`, `NOT IN`, null | derived from `normalized_email` | `contact` |
| `email_verified` | Boolean | `=`, `!=` | `customer.email_verified` | `contact` |
| `phone_verified` | Boolean | `=`, `!=` | `customer.phone_verified` | `contact` |
| `company_name` | String | `=`, `!=`, null | `customer.company_name` | `company` |
| `date_of_birth` | Date | comparisons, `BETWEEN`, null | `customer.date_of_birth` | `profile` |

Enum values:

```text
customer_account_status:
  GUEST | INVITED | REGISTERED

customer_lifecycle_status:
  ACTIVE | DISABLED | BLOCKED | MERGED | REDACTED
```

String normalization:

- `customer_email_domain` хранится в `customer.email_domain_normalized` и
  нормализуется через IDNA2008/UTS #46 non-transitional processing, затем ASCII
  lowercase; trailing dot удаляется;
- `customer_language` хранится в `customer.preferred_locale_normalized` как
  canonical BCP 47 tag: language lowercase, script title case, region uppercase;
- `customer_source` является ASCII code
  `[a-z0-9][a-z0-9._-]{0,63}` и сохраняется в lowercase;
- `company_name` сравнивается по `customer.company_name_normalized`, полученному
  через normalization contract `unicode-nfkc-casefold-v1`: Unicode NFKC, full
  case fold, trim и collapse всех Unicode whitespace runs в один ASCII space.

Конкретная библиотека с bundled Unicode/IDNA data и ее data version фиксируются
package lock и golden tests normalization contract; runtime ICU/locale process
не используется. Изменение результата хотя бы одного golden
fixture считается изменением semantics и требует новой DSL version, а не
незаметного обновления v1.

`customer_updated_date` отражает business-visible изменение aggregate customer,
а не техническое получение lock или увеличение revision. Любое изменение
`customer.updated_at` обязано durable-enqueue `customerUpdated` хотя бы с одной
reason; технический no-op/revision acquire не имеет права изменять
`customer.updated_at`. Dependency `customer.any` совпадает с любой
`customerUpdated.reason`.

### 11.2 Addresses

| Attribute | Type | Operators | Source | Dependency |
| --- | --- | --- | --- | --- |
| `customer_countries` | List<String> | list operators | active `customer_address.country_code` | `address` |
| `customer_regions` | List<String> | list operators | canonical `country-region` | `address` |
| `customer_cities` | List<String> | list operators | canonical `country-region-city` | `address` |
| `customer_postal_codes` | List<String> | list operators | active `customer_address.postal_code` | `address` |

Address rows с `deleted_at IS NOT NULL` не участвуют. Для country используется
ISO 3166-1 alpha-2 uppercase code. Region и city values должны создаваться
Admin picker из canonical address representation; свободный ввод разрешается
только после такой же normalization на сервере.

Canonical address values v1:

- country: `CC`, например `UA`;
- region: `CC-REGION`, где `REGION` — uppercase persisted ISO 3166-2 subdivision
  suffix `[A-Z0-9]{1,3}`;
- city: `CC-REGION::city-key`, либо `CC::city-key`, если region отсутствует;
- postal code: Unicode NFKC, uppercase, trim и collapse whitespace в один ASCII
  space.

`city-key` использует `unicode-nfkc-casefold-v1`. Address writer обязан хранить
`region_key`, `city_key` и `postal_code_normalized` при записи; SQL compiler не
нормализует columns во время query.

Примеры:

```sql
customer_countries CONTAINS 'UA'
customer_regions CONTAINS 'US-CA'
customer_cities CONTAINS 'US-CA::los angeles'
```

### 11.3 Marketing consent

| Attribute | Type | Operators | Source | Dependency |
| --- | --- | --- | --- | --- |
| `email_subscription_status` | Enum | `=`, `!=`, `IN`, `NOT IN`, null | consent channel `EMAIL` | `consent` |
| `sms_subscription_status` | Enum | `=`, `!=`, `IN`, `NOT IN`, null | consent channel `SMS` | `consent` |
| `whatsapp_subscription_status` | Enum | `=`, `!=`, `IN`, `NOT IN`, null | consent channel `WHATSAPP` | `consent` |
| `push_subscription_status` | Enum | `=`, `!=`, `IN`, `NOT IN`, null | consent channel `PUSH` | `consent` |

Values:

```text
NOT_SUBSCRIBED | PENDING | SUBSCRIBED | UNSUBSCRIBED | INVALID | REDACTED
```

`IS NULL` означает отсутствие consent row для channel. Это отличается от
существующей row со state `NOT_SUBSCRIBED`.

### 11.4 Classification

| Attribute | Type | Operators | Source | Dependency |
| --- | --- | --- | --- | --- |
| `customer_tags` | List<CustomerTag ID> | list operators | `customer_tag_assignment` | `tag` |
| `customer_groups` | List<CustomerGroup ID> | list operators | active `customer_group_membership` | `group` |

Expired group memberships не участвуют. Dynamic или manual segments нельзя
использовать как attribute другого segment в v1: это исключает cycles и
неочевидный порядок materialization.

### 11.5 Aggregate commerce statistics

| Attribute | Type | Operators | Source | Dependency |
| --- | --- | --- | --- | --- |
| `number_of_orders` | Integer | numeric, `BETWEEN` | completed orders count | `statistics.order` |
| `cancelled_orders_count` | Integer | numeric, `BETWEEN` | cancelled orders count | `statistics.order` |
| `returns_count` | Integer | numeric, `BETWEEN` | returns count | `statistics.refund` |
| `first_order_date` | Date | date, null | minimum `completed_at` среди completed orders | `statistics.order` |
| `last_order_date` | Date | date, null | maximum `completed_at` среди completed orders | `statistics.order` |
| `last_checkout_date` | Date | date, null | latest customer checkout | `statistics.checkout` |
| `amount_spent` | Money | numeric, `BETWEEN` | net spent in Store currency | `statistics.order`, `statistics.refund` |
| `gross_amount_spent` | Money | numeric, `BETWEEN` | total completed order amount | `statistics.order` |
| `amount_refunded` | Money | numeric, `BETWEEN` | total refunded amount | `statistics.refund` |
| `average_order_value` | Money | numeric, `BETWEEN` | completed order average | `statistics.order` |

`number_of_orders` намеренно означает завершенные, а не созданные или
отмененные orders. `amount_spent` означает:

```text
gross_amount_spent - amount_refunded
```

Все money attributes выражены в configured currency Store. Compiler выбирает
соответствующую `customer_monetary_statistics` row и не принимает currency из
DSL. То же правило обязательно для function predicates над monetary source
rows: compiler добавляет `currency_code = trusted Store currency` до фильтрации
и aggregation. Строки в других валютах не участвуют и не конвертируются.

Отсутствующая statistics row трактуется как нулевые counters/money и `NULL` для
dates. Поэтому:

```sql
number_of_orders = 0
```

включает customers, для которых statistics row еще не создана.

### 11.6 Tax status

| Attribute | Type | Operators | Source | Dependency |
| --- | --- | --- | --- | --- |
| `tax_identifier_statuses` | List<Enum> | list operators | effective tax identifier statuses | `taxIdentifier` |
| `tax_exemption_statuses` | List<Enum> | list operators | effective tax exemption statuses | `taxExemption` |
| `tax_exemption_countries` | List<String> | list operators | currently active tax exemptions | `taxExemption` |

Enum values:

```text
tax_identifier_statuses:
  UNVERIFIED | VERIFIED | REJECTED | EXPIRED

tax_exemption_statuses:
  ACTIVE | EXPIRED | REVOKED
```

Tax list semantics вычисляется относительно `effectiveAt` и calendar date в
timezone Store:

1. Rows с `deleted_at IS NOT NULL` не участвуют.
2. Row с будущим `valid_from` еще отсутствует во всех трех list attributes.
3. После `valid_to` identifier/exemption получает effective status `EXPIRED`,
   даже если stored status еще не обновлен. `valid_to` является inclusive:
   переход происходит в начале следующего calendar day Store.
4. Терминальные stored statuses `REJECTED` и `REVOKED` имеют приоритет над
   derived `EXPIRED`.
5. `tax_exemption_countries` включает country только для row с effective status
   `ACTIVE`; `country_code IS NULL` не создает list value.

`valid_from` и boundary после `valid_to` являются temporal boundaries. Поэтому
predicate над tax list attribute обязан учитывать ближайшую будущую validity
boundary участвующих source rows.

Tax identifier values не доступны DSL, чтобы sensitive identifiers не
появлялись в persisted queries, diagnostics или Admin suggestions.

## 12. Function и virtual attribute contracts

Availability в первой реализации:

| Contract | Kind | Availability v1 |
| --- | --- | --- |
| `orders_placed` | function | `AVAILABLE` |
| `products_purchased` | function | `UNAVAILABLE` до появления purchase line projection |
| `birthday` | virtual Date attribute | `AVAILABLE` |

### 12.1 `orders_placed`

Фильтрует принадлежащую Customers проекцию orders.

```sql
orders_placed MATCHES (
  status = 'COMPLETED',
  count >= 2,
  completed_date >= -90d,
  sum_amount >= 500
)
```

| Parameter | Type | Operators | Значение |
| --- | --- | --- | --- |
| `status` | Enum | `=`, `!=`, `IN`, `NOT IN` | `OPEN`, `COMPLETED`, `CANCELLED` |
| `created_date` | Date | date comparisons, `BETWEEN` | `customer_order_projection.created_at` |
| `completed_date` | Date | date comparisons, `BETWEEN`, null | `customer_order_projection.completed_at` |
| `cancelled_date` | Date | date comparisons, `BETWEEN`, null | `customer_order_projection.cancelled_at` |
| `amount` | Money | numeric, `BETWEEN` | amount одного matching order |
| `count` | Integer aggregate | numeric, `BETWEEN` | число matching orders |
| `sum_amount` | Money aggregate | numeric, `BETWEEN` | сумма matching orders |

Rules:

1. `status`, lifecycle date parameters и `amount` фильтруют source rows до
   aggregation.
2. `count` и `sum_amount` проверяются после фильтрации.
3. Без aggregate parameters `MATCHES` компилируется как `EXISTS`.
4. С aggregate parameters compiler использует correlated aggregate subquery и
   `HAVING`-эквивалент.
5. Если `status` отсутствует, участвуют все order statuses.
6. `amount` и `sum_amount` учитывают только rows с
   `currency_code = trusted Store currency`; currency из DSL не принимается.
7. `sum_amount` пустого filtered set равен `0`.
8. `sum_amount` не вычитает refunds; для net all-time spend используется
   `amount_spent`.
9. `IS NULL`/`IS NOT NULL` проверяют наличие любой order projection без
   parameters.
10. `completed_date` и `cancelled_date` не подменяются `created_date`: comparison
    с отсутствующим lifecycle timestamp следует общим NULL rules. Для обычного
    completed-order use case используется сочетание `status = 'COMPLETED'` и
    `completed_date ...`.
11. `first_order_date` и `last_order_date` используют те же `completed_at`
    timestamps. Customers statistics projection обязана вычислять их по
    completion time, а не по order creation time.

### 12.2 `products_purchased`

```sql
products_purchased MATCHES (
  product_id = 'Z2lkOi8vc2hvcGFuYS9Qcm9kdWN0LzAxOTAwMDAwLTAwMDAtNzAwMC04MDAwLTAwMDAwMDAwMDAwMw==',
  sum_quantity >= 3,
  date >= -90d
)
```

| Parameter | Type | Operators | Значение |
| --- | --- | --- | --- |
| `product_id` | Product ID | `=`, `!=`, `IN`, `NOT IN` | Catalog product identity |
| `variant_id` | Variant ID | `=`, `!=`, `IN`, `NOT IN` | Catalog variant identity |
| `category_id` | Category ID | `=`, `IN` | category snapshot at purchase time |
| `date` | Date | date comparisons, `BETWEEN` | completed order date |
| `quantity` | Integer | numeric, `BETWEEN` | quantity в одной order line |
| `sum_quantity` | Integer aggregate | numeric, `BETWEEN` | сумма quantity matching lines |
| `count` | Integer aggregate | numeric, `BETWEEN` | число distinct completed orders |

Эта function требует принадлежащей Customers immutable purchase projection с
order line facts. Runtime lookup в Catalog запрещен. Product/variant/category
IDs и category snapshot приходят из order events. Rename или последующее
перемещение product в другую category не переписывает исторический факт
покупки.

До появления такой projection function должна возвращаться в attribute catalog
как `UNAVAILABLE`, а semantic analyzer должен выдавать
`SEGMENT_ATTRIBUTE_UNAVAILABLE`. Silent fallback или cross-service query не
допускаются.

Future availability contract уже фиксирован, чтобы включение не меняло DSL
semantics. Orders публикует versioned full-replacement event одного completed
order:

```ts
interface CompletedOrderPurchaseLinesProjectedV1 {
  readonly storeId: string;
  readonly customerId: string;
  readonly orderId: string;
  readonly orderRevision: number;
  readonly completedAt: string;
  readonly lines: readonly {
    readonly lineId: string;
    readonly productId: string;
    readonly variantId: string | null;
    readonly categoryIds: readonly string[];
    readonly quantity: number;
  }[];
}
```

Customers хранит `customer_purchase_line_projection` с primary key
`(store_id, order_id, line_id)`, customer/order revision, product/variant,
positive quantity и completed timestamp, а category snapshot — в отдельной
`customer_purchase_line_category_projection` с primary key
`(store_id, order_id, line_id, category_id)`. Более новая order revision
атомарно заменяет полный набор lines/categories; duplicate revision с тем же
content hash является no-op, конфликтующий duplicate — invariant violation,
stale revision игнорируется. Отмена уже completed order публикует replacement с
пустым lines set либо отдельный versioned removal event той же revision model.

Required indexes покрывают customer-first correlated evaluation и value-first
bulk scan для product, variant, category и completed date. `count` использует
`count(distinct order_id)`, `sum_quantity` — сумму line quantities после всех
non-aggregate filters. IDs хранятся как internal UUID snapshots; Catalog lookup
не выполняется ни при ingestion, ни при evaluation.

Для Store-scoped semantic validation Customers также владеет компактной
`customer_segment_catalog_identity(store_id, entity_type, entity_id,
source_revision, deleted_at)` projection из versioned Catalog identity events.
Tombstone сохраняется после удаления, чтобы исторический purchased predicate и
его persisted definition оставались валидны; новый query может ссылаться на
известную tombstone identity, но Admin catalog помечает ее unavailable for new
selection. `products_purchased` становится `AVAILABLE` только после readiness
обеих projections и их ordering/idempotency tests.

### 12.3 `birthday`

```sql
birthday BETWEEN today AND +30d
```

`birthday` является virtual Date attribute и сравнивает month/day
`customer.date_of_birth`, игнорируя year.

Write-time `customer.birthday_month_day` хранит четыре ASCII digits `MMDD` из
реальной `date_of_birth`; 29 февраля хранится как `0229`, а не переписывается.
При evaluation невисокосного target year date adapter добавляет `0229` в set
для target 28 февраля согласно policy ниже. Изменение `date_of_birth` и
`birthday_month_day` выполняется одной transaction.

Поддерживаются:

- `=`, `!=`, `BETWEEN`;
- `IS NULL`, `IS NOT NULL`;
- absolute date, `today`, relative positive/negative dates.

Для `BETWEEN` через границу года interval разбивается на два ranges. Политика
29 февраля: в невисокосный год anniversary приходится на 28 февраля. Эта
политика является частью DSL semantics и не зависит от PostgreSQL implicit date
normalization.

После resolution обе boundaries образуют forward inclusive interval calendar
dates. Нормативная длина interval — calendar-day distance `upper - lower`, без
добавления единицы за inclusive upper boundary. Допустим distance не более 366.
Month/day всех включенных дат deduplicate в множество matching anniversaries;
поэтому interval годового цикла может содержать 366 или 367 включенных dates,
но не более 366 уникальных month/day и совпадает с любым non-null birthday.
Distance больше 366 дней отклоняется с `SEGMENT_INVALID_DATE_RANGE`. Например,
`birthday BETWEEN today AND +1y` означает полный годовой цикл, а
`birthday BETWEEN -1y AND +1y` является invalid. Для absolute boundaries их year
используется только для вычисления порядка и длины interval; сравнение с
`date_of_birth` по-прежнему игнорирует year.

## 13. Запланированные attributes, не входящие в v1

Следующие возможности полезны для Shopify-подобной гибкости, но требуют новых
owned projections. Их имена резервируются:

| Attribute/function | Необходимая projection |
| --- | --- |
| `abandoned_checkout_date` | checkout lifecycle/abandonment projection |
| `products_purchased` | completed order line purchase projection |
| `product_subscription_status` | subscription provider projection |
| `store_credit_balance` | store credit ledger projection |
| `marketing_email_event` | marketing delivery event projection |
| `storefront_event` | consented storefront analytics projection |
| `predicted_spend_tier` | versioned prediction projection |
| `rfm_group` | versioned RFM projection |
| `customer_within_distance` | PostGIS/location support and geospatial index |

Reserved attributes нельзя сохранять в ACTIVE segment, пока registry не
объявит их `AVAILABLE`.

## 14. Canonical AST

`customer_segment.definition` хранит только сервером построенный AST:

```ts
interface SegmentDefinitionV1 {
  readonly version: 1;
  readonly root: SegmentExpression;
  readonly dependencies: readonly SegmentDependency[];
  readonly contextDependencies: readonly SegmentContextDependency[];
  readonly evaluationContext: SegmentEvaluationContextV1;
  readonly temporal: boolean;
}

type SegmentContextDependency = "currency" | "timezone";

type SegmentDependency =
  | "customer.any"
  | "profile"
  | "contact"
  | "company"
  | "status"
  | "address"
  | "consent"
  | "tag"
  | "group"
  | "taxIdentifier"
  | "taxExemption"
  | "statistics.order"
  | "statistics.checkout"
  | "statistics.refund";

type SegmentPredicateOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "contains"
  | "not_contains";

interface SegmentEvaluationContextV1 {
  readonly currencyCode: string;
  readonly currencyExponent: number;
  readonly timeZone: string;
  readonly storeConfigurationRevision: number;
}

type SegmentExpression =
  | SegmentLogicalExpression
  | SegmentNotExpression
  | SegmentPredicateExpression
  | SegmentFunctionExpression;

interface SegmentLogicalExpression {
  readonly kind: "logical";
  readonly operator: "and" | "or";
  readonly children: readonly [
    SegmentExpression,
    SegmentExpression,
    ...SegmentExpression[],
  ];
}

interface SegmentNotExpression {
  readonly kind: "not";
  readonly child: SegmentExpression;
}

type SegmentPredicateExpression =
  | {
      readonly kind: "predicate";
      readonly attribute: string;
      readonly operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
      readonly value: SegmentValue;
    }
  | {
      readonly kind: "predicate";
      readonly attribute: string;
      readonly operator: "between";
      readonly value: SegmentValue;
      readonly upperValue: SegmentValue;
    }
  | {
      readonly kind: "predicate";
      readonly attribute: string;
      readonly operator: "in" | "not_in";
      readonly values: readonly [SegmentValue, ...SegmentValue[]];
    }
  | {
      readonly kind: "predicate";
      readonly attribute: string;
      readonly operator: "is_null" | "is_not_null";
    }
  | {
      readonly kind: "predicate";
      readonly attribute: string;
      readonly operator: "contains" | "not_contains";
      readonly value: SegmentValue;
    };

type SegmentFunctionExpression =
  | {
      readonly kind: "function";
      readonly name: string;
      readonly operator: "matches" | "not_matches";
      readonly parameters: readonly SegmentFunctionParameter[];
    }
  | {
      readonly kind: "function";
      readonly name: string;
      readonly operator: "is_null" | "is_not_null";
    };

type SegmentFunctionParameter =
  | {
      readonly name: string;
      readonly operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
      readonly value: SegmentValue;
    }
  | {
      readonly name: string;
      readonly operator: "between";
      readonly value: SegmentValue;
      readonly upperValue: SegmentValue;
    }
  | {
      readonly name: string;
      readonly operator: "in" | "not_in";
      readonly values: readonly [SegmentValue, ...SegmentValue[]];
    }
  | {
      readonly name: string;
      readonly operator: "is_null" | "is_not_null";
    };

type SegmentValue =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "enum"; readonly value: string }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "integer"; readonly value: string }
  | { readonly kind: "decimal"; readonly value: string }
  | {
      readonly kind: "money";
      readonly decimal: string;
      readonly minor: string;
      readonly currencyCode: string;
      readonly currencyExponent: number;
    }
  | { readonly kind: "date"; readonly value: string }
  | { readonly kind: "dateTime"; readonly value: string }
  | { readonly kind: "namedDate"; readonly value: "today" | "yesterday" }
  | {
      readonly kind: "relativeDate";
      readonly amount: number;
      readonly unit: "day" | "week" | "month" | "year";
    }
  | { readonly kind: "entityId"; readonly entity: string; readonly id: string };
```

Typed values являются tagged objects, а не untyped JSON primitives:

```json
{
  "kind": "money",
  "decimal": "500.00",
  "minor": "50000",
  "currencyCode": "USD",
  "currencyExponent": 2
}
```

```json
{
  "kind": "entityId",
  "entity": "Product",
  "id": "019..."
}
```

```json
{
  "kind": "relativeDate",
  "amount": -90,
  "unit": "day"
}
```

`storeConfigurationRevision` в этом contract является DSL-specific monotonic
revision только currency code/exponent и timezone, а не общей revision любых
Store settings. Она сохраняется для audit, ordering событий конфигурации и
диагностики, но сама по себе не участвует в equality check перед evaluation:
freshness определяется только значениями полей, перечисленных в
`contextDependencies`.

AST normalization:

1. identifiers и enum values приводятся к canonical case;
2. nested `and` и `or` сливаются в один node;
3. logical children сохраняют пользовательский порядок для diagnostics и
   printer;
4. singleton logical node заменяется child;
5. double negation удаляется;
6. `NOT MATCHES` нормализуется в `not_matches`;
7. значения `IN` deduplicate с сохранением первого порядка;
8. money конвертируется в canonical decimal и minor-unit string с currency
   snapshot;
9. Global IDs декодируются и типизируются;
10. dependencies и context dependencies извлекаются из validated AST;
11. evaluation context фиксируется из trusted Store context.
12. function parameters сортируются по immutable registry order после проверки
    duplicate names; пользовательский порядок остается только в parsed AST для
    source diagnostics.
13. `dependencies` и `contextDependencies` deduplicate и сортируются по ASCII
    lexical order; порядок регистрации descriptors не влияет на persisted AST.

AST не содержит SQL identifiers, table names, Drizzle objects или compiled SQL.

Zod schema canonical AST повторяет discriminated unions выше и запрещает
unknown keys. Operator arity является structural invariant: `is_null` не может
содержать value, `between` всегда имеет обе boundaries, а `in` всегда содержит
непустой массив. Persisted definition полностью валидируется при каждом чтении
до выбора compiler; несовпадение derived `dependencies`,
`contextDependencies` или `temporal` с validated root, а также несовпадение
money literals с currency snapshot внутри `evaluationContext`, считается
internal corruption и fail closed. `storeConfigurationRevision` нельзя вывести
из root, поэтому при persisted-definition validation проверяются ее тип,
неотрицательность и наличие, но не равенство текущей Store revision. Compiler не
доверяет отдельно сохраненным derived полям без такой проверки.

### 14.1 Canonical printer

Canonical printer детерминирован и выдает одну строку UTF-8 без line wrapping:

1. Keywords и enum values выводятся uppercase, identifiers — lowercase
   `snake_case`.
2. Между operator tokens ставится один ASCII space; после запятой ставится один
   space, перед запятой space отсутствует.
3. String использует одинарные кавычки и только escapes из раздела 5.2.
   Printable Unicode не экранируется и не нормализуется повторно printer-ом.
4. Integer выводится без leading zeros; обычный Decimal — без insignificant
   leading/trailing zeros; Money — ровно с `currencyExponent` fractional digits.
   Dates, datetimes, Global IDs и relative dates выводятся в их canonical lexical
   representation.
5. Logical children сохраняют normalized AST order. Parentheses ставятся только
   вокруг child с меньшим precedence, чем parent: `OR` внутри `AND`, а любой
   logical expression после `NOT`. Во всех остальных случаях parentheses не
   ставятся.
6. Flattened `and`/`or` соединяются соответственно ` AND ` и ` OR `; function
   parameters выводятся в registry order через `, `.
7. Double negation и singleton logical nodes удалены normalizer-ом до print.

Для одного validated AST printer обязан возвращать byte-for-byte одинаковый
результат на всех runtime nodes. Нормативный round trip:
`parse(print(ast)) -> normalize` дает AST, структурно равный исходному ast.

Canonical query сохраняется вместе с definition и является результатом printer,
а не исходной пользовательской строкой. Parsed AST и исходная строка живут
только в рамках validation request и не являются persisted contract.

## 15. Peggy grammar contract

Нормативная упрощенная grammar:

```ebnf
Query              ::= OrExpression EOF
OrExpression       ::= AndExpression (OR AndExpression)*
AndExpression      ::= UnaryExpression (AND UnaryExpression)*
UnaryExpression    ::= NOT UnaryExpression
                     | "(" OrExpression ")"
                     | Clause
Clause             ::= FunctionClause | PredicateClause
PredicateClause    ::= Attribute BinaryOperator Value
                     | Attribute BETWEEN Value AND Value
                     | Attribute (IN | NOT IN) "(" ValueList ")"
                     | Attribute IS (NULL | NOT NULL)
                     | Attribute (CONTAINS | NOT CONTAINS) Value
FunctionClause     ::= FunctionName (MATCHES | NOT_MATCHES | NOT MATCHES) "(" Parameters? ")"
                     | FunctionName IS (NULL | NOT NULL)
Parameters         ::= Parameter ("," Parameter)*
Parameter          ::= Identifier ParameterOperator Value
                     | Identifier BETWEEN Value AND Value
                     | Identifier (IN | NOT IN) "(" ValueList ")"
                     | Identifier IS (NULL | NOT NULL)
ValueList          ::= Value ("," Value)*
Value              ::= DateTime | Date | RelativeDate | NamedDate
                     | Boolean | Number | String
BinaryOperator     ::= "!=" | ">=" | "<=" | "=" | ">" | "<"
ParameterOperator  ::= BinaryOperator
```

Parser отвечает только за syntax и source locations. Он не решает, существует
ли attribute, применим ли operator и имеет ли enum допустимое значение.

Enum и entity ID values передаются как `String`. Bare identifiers в position
value запрещены, кроме нормативных `TRUE`, `FALSE`, `today`, `yesterday` и
relative date tokens. Peggy является scannerless parser, поэтому порядок
prioritized alternatives нормативен: `DateTime` проверяется до `Date`, а
`Date` и `RelativeDate` — до `Number`. Каждый lexical rule проверяет token
boundary, поэтому `2026-08-16suffix`, `+30days` и datetime с trailing garbage
не могут успешно разобрать только prefix.

Generated parser создается build-time из `.peggy`; runtime generation grammar и
`eval` запрещены.

Упрощенная EBNF выше задает syntactic structure, но checked-in `.peggy` является
нормативным executable grammar. До подключения parser к API grammar обязана
содержать отдельные lexical rules со следующими contracts:

```text
IntegerPart  ::= "0" | [1-9][0-9]*
Number       ::= [+-]? IntegerPart ("." [0-9]+)?
Date         ::= [0-9]{4} "-" [0-9]{2} "-" [0-9]{2}
RelativeDate ::= [+-] IntegerPart [dDwWmMyY]
```

Leading zeros, включая `00`, `01` и `-00`, являются syntax error. DateTime rule
принимает только формы раздела 5.6 и проверяется перед Date. После каждого
keyword, boolean, named date, relative date, number, date и datetime parser
проверяет отсутствие identifier character `[A-Za-z0-9_]`; после полного Query
обязателен EOF. Whitespace rule принимает только `\x20`, `\x09`, `\x0A` и
`\x0D`.

Ограничение query UTF-8 bytes проверяется до запуска parser. Parser дополнительно
считает raw tokens, raw AST nodes и текущую syntactic nesting depth и прекращает
разбор при достижении limits из раздела 19. Эти checks выполняются до
normalization: цепочка `NOT NOT ...`, лишние singleton parentheses или другие
узлы, которые позже исчезнут, все равно учитываются. Реализация не должна
полагаться только на глубину JavaScript call stack.

Peggy syntax failure создает ровно одну diagnostic — самую дальнюю достигнутую
ошибку parser. Limit failure создает одну `SEGMENT_COMPLEXITY_LIMIT`. Limit в 50
diagnostics относится к semantic validation, которая может продолжать обход
независимых branches после локальной ошибки.

## 16. Semantic validation

Validation выполняется после parse и до записи segment:

1. Проверить AST Zod schema.
2. Найти каждый attribute/function в immutable registry.
3. Проверить availability feature.
4. Проверить operator для attribute type.
5. Проверить value type и enum domain.
6. Нормализовать strings, dates, money и IDs.
7. Проверить referenced entities в trusted Store scope.
8. Извлечь dependencies.
9. Рассчитать complexity score.
10. Построить canonical query и canonical AST.
11. Опционально выполнить bounded `EXPLAIN`/preview после успешной validation.

Entity references группируются по entity type и проверяются batch query в
Customers database с обязательным trusted `store_id`. В v1 это CustomerTag и
CustomerGroup. Descriptor, чья identity принадлежит другому service, не может
быть `AVAILABLE`, пока Customers не владеет локальной projection этих identities;
synchronous lookup в Catalog/Orders во время validation запрещен так же, как во
время evaluation. Отсутствующий, deleted или принадлежащий другому Store entity
возвращает `SEGMENT_INVALID_ENTITY_ID` без раскрытия факта существования в другом
Store.

Client не может прислать одновременно независимые `query` и `definition`.
Mutation принимает `query`; `definition` строится сервером и доступен только
для чтения.

## 17. Attribute registry

Новые attributes добавляются через registry, а не через grammar:

```ts
interface SegmentAttributeDescriptor {
  readonly name: string;
  readonly type: SegmentValueType;
  readonly operators: readonly SegmentPredicateOperator[];
  readonly nullable: boolean;
  readonly availability: "AVAILABLE" | "UNAVAILABLE";
  readonly dependencies: readonly SegmentDependency[];
  readonly normalizationContract: string;
  readonly indexContract: readonly string[];
  readonly temporalContract: "NONE" | "VALUE" | "SOURCE" | "VALUE_AND_SOURCE";
  normalize(value: ParsedValue, context: SegmentSemanticContext): SegmentValue;
  compile(
    predicate: SegmentPredicateExpression,
    context: SegmentSqlCompileContext,
  ): SQL;
}
```

Function registry использует аналогичный descriptor с отдельными parameter
descriptors.

`temporalContract` определяет источник time-driven reevaluation:

- `VALUE` — named/relative values или иные time-relative virtual values;
- `SOURCE` — source rows имеют собственные boundaries, например
  `customer_group_membership.expires_at` или tax `valid_from`/`valid_to`;
- `VALUE_AND_SOURCE` — применимы оба механизма.

Semantic analyzer выводит `definition.temporal` из validated predicates и
descriptor contracts. SQL compiler и temporal evaluator используют один и тот
же descriptor; source boundary не может быть только SQL filter без
соответствующего `next_change_at`.

Registry является единственным местом, где DSL name связывается с Drizzle
columns/tables. Пользовательский identifier никогда не интерполируется как SQL
identifier.

### 17.1 Availability и migration matrix

Каждый descriptor объявляет стабильные IDs `normalizationContract` и
`indexContract`. `AVAILABLE` разрешен только если architecture test находит все
перечисленные Drizzle columns/indexes и normalization writer использует тот же
contract ID. Минимальная matrix v1:

| Attribute family | Required persisted data | Required access paths |
| --- | --- | --- |
| profile equality | `email_domain_normalized`, `preferred_locale_normalized`, `company_name_normalized`, normalized `source` | `(store_id, value, id)` partial для non-deleted customer |
| profile range/date | исходная scalar/date/timestamp column | `(store_id, value, id)` partial для non-deleted customer |
| address lists | `country_code`, `region_key`, `city_key`, `postal_code_normalized` | `(store_id, customer_id, value)` и `(store_id, value, customer_id)`, partial `deleted_at IS NULL` |
| consent | channel и state | `(store_id, customer_id, channel)` и `(store_id, channel, state, customer_id)` |
| tags/groups | relation ID, для group также `expires_at` | оба customer-first/value-first access paths; expiry index без `now()` predicate |
| tax | status, country, `valid_from`, `valid_to`, `deleted_at` | customer-first и value/validity-first paths, выбранные fixtures `EXPLAIN` |
| statistics | counters и lifecycle timestamps | отдельный `(store_id, value, customer_id)` для каждого AVAILABLE range attribute |
| money | currency и minor-unit value | `(store_id, currency_code, value, customer_id)` |
| order function | status, currency, amount, lifecycle timestamps | correlated customer-first и bulk value/time-first paths |
| birthday | persisted month/day key | `(store_id, birthday_month_day, id)` partial для non-deleted customer |

Один composite index не считается заменой другого, если порядок leading columns
не поддерживает указанный access path. До миграции writer, пересоздания test
fixtures и успешного architecture test descriptor остается `UNAVAILABLE`.

До включения commerce attributes projection обязана вычислять `first_order_at`
и `last_order_at` только по `completed_at` rows со status `COMPLETED`. Order
creation time не является допустимым fallback. Миграция меняет projection
напрямую без backfill compatibility branch; тестовые данные пересобираются.

## 18. Drizzle SQL compilation

Из validated AST и trusted Store context строятся три evaluation/scan режима:

```ts
compileCustomerMatch(definition, customerId, effectiveAt)
compileSegmentMembers(definition, cursor, limit, effectiveAt)
compileStoreCustomers(cursor, limit)
```

`compileSegmentMembers` возвращает только matching customers и используется для
preview и как optimization для non-temporal initial materialization.
`compileStoreCustomers` является tenant-scoped stable keyset scan всех
non-deleted customers по `(store_id, customer_id)` и обязателен для exhaustive
materialization temporal definition. Он не принимает DSL predicate.

Оба bulk compiler используют ascending `customer.id` и opaque cursor, содержащий
последний UUID и version cursor contract. Условие следующей страницы —
`customer.id > cursor.customerId`; offset pagination запрещена. Один run фиксирует
definition revision, generation, Store context и `effectiveAt`, но каждая
страница читает новый committed database state по правилам раздела 18.4.

Все evaluation paths обязаны использовать один `compileCustomerMatch`, одни
attribute compilers и одинаковую семантику. Результат bulk candidate query сам
по себе никогда не записывается как membership без повторной проверки под lock.

### 18.1 Обязательный scope

Каждый root query включает:

```text
customer.store_id = trusted context store_id
customer.deleted_at IS NULL
```

Relation subqueries дополнительно связывают `store_id` и `customer_id`.
`store_id` из DSL или GraphQL input не принимается.

### 18.2 SQL shapes

Scalar attribute:

```sql
COALESCE(customer.preferred_locale = $1, FALSE)
```

List relation:

```sql
EXISTS (
  SELECT 1
  FROM customers.customer_tag_assignment assignment
  WHERE assignment.store_id = customer.store_id
    AND assignment.customer_id = customer.id
    AND assignment.tag_id = $1
)
```

Aggregate function:

```sql
COALESCE((
  SELECT count(*) >= $1
  FROM customers.customer_order_projection order_projection
  WHERE order_projection.store_id = customer.store_id
    AND order_projection.customer_id = customer.id
    AND order_projection.status = $2
    AND order_projection.created_at >= $3
), FALSE)
```

Эти snippets иллюстрируют shape, но нормативной реализацией являются Drizzle
SQL fragments с bind parameters.

### 18.3 Compiler rules

- Никаких raw fragments из query text.
- Values передаются только bind parameters.
- Relation checks предпочитают `EXISTS`/`NOT EXISTS`, чтобы не умножать customer
  rows.
- AST не разворачивается в DNF/CNF: logical tree компилируется напрямую.
- `BETWEEN` для dates учитывает Store timezone и inclusive calendar dates.
- Absolute datetime преобразуется в UTC на semantic boundary.
- Active relation filters используют переданный `effectiveAt`, а не database
  `now()`: group membership требует
  `expires_at IS NULL OR expires_at > effectiveAt`, tax validity использует
  calendar date `effectiveAt` в timezone Store.
- Counters с отсутствующей statistics row используют `COALESCE(..., 0)`.
- Money использует bigint/numeric-safe values, не JavaScript number.
- `NOT_MATCHES` компилируется как `NOT (MATCHES expression)`, а не как инверсия
  отдельных parameters.

### 18.4 `effectiveAt` и snapshot semantics

`effectiveAt` является обязательным immutable instant одного evaluation run.
Все pages одного preview или bulk materialization используют одно и то же
значение; worker не вызывает `now()` отдельно для каждой page или customer.
`today`, relative dates, `evaluated_at` и temporal boundaries вычисляются только
из этого `effectiveAt` и timezone Store.

Bulk materialization не обязана удерживать одну долгую database transaction или
один PostgreSQL snapshot на весь Store. Изменения customer state во время scan
согласуются через per-customer locking и event-driven reevaluation из раздела
21.6. Preview, `compileSegmentMembers` и `compileCustomerMatch` гарантируют
одинаковый результат только при одинаковых definition, database state,
Store timezone/currency и `effectiveAt`.

### 18.5 Store evaluation context

Semantic validation получает currency, currency exponent, IANA timezone и
монотонную `store_configuration_revision` только из trusted Store context и
сохраняет snapshot в `definition.evaluationContext`. Context dependencies
извлекаются так:

Нормативный trusted contract:

```ts
interface SegmentStoreEvaluationContext {
  readonly storeId: string;
  readonly currencyCode: string;
  readonly currencyExponent: number;
  readonly timeZone: string;
  readonly configurationRevision: number;
}
```

Request path получает этот объект из authenticated platform context. Background
workers читают принадлежащую Customers read model
`customer_segment_store_context(store_id primary key, currency_code,
currency_exponent, time_zone, configuration_revision, updated_at)`. Hardcoded
`UTC`, первая currency из массива и process environment не являются trusted
fallback. Create/update/preview сравнивают request context с локальной read
model; при различии revision операция временно возвращает retryable
`SEGMENT_STORE_CONTEXT_NOT_READY`, не создавая definition на неизвестном
snapshot.

- любой Money value/attribute/function добавляет `currency`;
- любой named/relative date или `birthday` predicate добавляет `timezone`;
- absolute Date над timestamp source и DateTime без offset добавляют `timezone`;
- tax list predicates добавляют `timezone`, поскольку validity boundaries
  являются calendar dates Store;
- implementation может консервативно добавить dependency, даже если конкретный
  predicate математически не изменится от настройки.

Compiler перед evaluation проверяет, что зависимые поля trusted Store context
совпадают с snapshot definition:

- dependency `currency` сравнивает `currencyCode` и `currencyExponent`;
- dependency `timezone` сравнивает `timeZone`;
- отличие только `storeConfigurationRevision` не является stale context и не
  блокирует evaluation.

Mismatch хотя бы одного зависимого значения fail closed с internal
`SEGMENT_EVALUATION_CONTEXT_STALE`; использовать старые minor units или timezone
запрещено. Segment без соответствующей context dependency не пересобирается и
не становится stale из-за изменения независимого поля Store context.

Store currency code и exponent являются immutable с момента создания Store.
Store configuration API не предоставляет command их изменения. Это устраняет
межсервисную check-before-commit гонку между изменением currency и появлением
первого order/refund fact. Исторические amounts не пересчитываются по FX и не
переименовываются в другую currency. Для перехода Store на другую accounting
currency требуется создание нового Store или отдельная будущая versioned
multi-currency migration, не входящая в DSL v1.

Timezone может быть изменена независимо от наличия facts. Успешное изменение
timezone публикует durable `storeConfigurationUpdated`. Для каждого зависимого
DYNAMIC segment система:

1. повторно выполняет semantic normalization сохраненного canonical query в
   новом trusted context;
2. увеличивает `definition_revision` и `evaluation_generation`, не увеличивая
   merchant-facing `revision`;
3. сохраняет новый AST/context snapshot;
4. немедленно делает старые RULE memberships неактуальными;
5. запускает durable bulk materialization.

Если query больше невалиден в новом timezone context, segment остается fail closed,
получает materialization status `FAILED` и требует merchant correction. Store
configuration workflow не считается завершенным, пока enqueue обновления всех
затронутых segments не записан durable.

Минимальный event payload является versioned и содержит полное новое состояние,
а не patch:

```ts
interface StoreConfigurationUpdatedV1 {
  readonly storeId: string;
  readonly configurationRevision: number;
  readonly currencyCode: string;
  readonly currencyExponent: number;
  readonly timeZone: string;
  readonly occurredAt: string;
}
```

Customers принимает событие только если revision больше локальной; duplicate
revision с тем же payload является no-op, а с другим payload — invariant
violation. Обновление локальной context row, перенормализация затронутых
segments и enqueue их rebuild выполняются в одной Customers transaction до
acknowledgement события. Пропуск revision разрешен, поскольку payload полный:
обработчик применяет последний payload и перестраивает segments непосредственно
из предыдущего локального snapshot в новый.

Store creation публикует тот же payload с первой revision и тем самым создает
локальную context row до операций с DYNAMIC segments. До сравнения revisions
handler сначала проверяет immutable currency code/exponent относительно уже
существующей row; их изменение идет по invariant-violation path ниже и никогда
не обновляет локальный snapshot.

Получение события с измененными currency code/exponent считается integration
invariant violation: Customers не обновляет context snapshot, все
money-dependent segments переводятся в `FAILED`, evaluation остается fail
closed, а событие требует операторского исправления producer configuration.

### 18.6 Physical index contract

Attribute/function может иметь availability `AVAILABLE` только после миграции
всех физических columns и indexes, объявленных его registry descriptor. Registry
содержит `indexContract` и `normalizationContract`; complexity cost `indexed
scalar predicate` разрешен только descriptor, чей index contract проверяется
architecture test против Drizzle schema metadata.

Минимальные index requirements v1:

- root scans: `(store_id, id)` с partial predicate `deleted_at IS NULL`;
- normalized scalar equality: persisted write-time columns для
  `email_domain`, BCP-47 locale и NFKC/trim/casefold company name; runtime Unicode
  normalization внутри SQL запрещена;
- scalar/range attributes: leading `store_id`, затем filter value и `customer_id`;
- list relations: оба access paths `(store_id, customer_id, value)` для
  correlated match и `(store_id, value, customer_id)` для segment scan, с
  partial predicate active/non-deleted, где применимо;
- expiring group memberships: indexes для обоих access paths включают
  `expires_at`; `now()` не используется в partial index predicate;
- tax lists: indexes включают `store_id`, status/country, `valid_from`,
  `valid_to` и `customer_id` в порядке, выбранном representative `EXPLAIN`;
- statistics: `(store_id, counter_or_date, customer_id)`, а money indexes также
  включают leading `currency_code` после `store_id`;
- order functions: indexes для correlated evaluation и bulk candidate search по
  `store_id`, `customer_id`, `status` и каждому используемому lifecycle
  timestamp;
- birthday: persisted/indexed month-day representation с явно реализованной
  политикой 29 февраля.

Date predicate над `timestamptz` компилируется в UTC half-open range,
рассчитанный из Store timezone (`>= dayStartUtc AND < nextDayStartUtc`), чтобы
использовать B-tree timestamp index. Compiler не оборачивает indexed timestamp
column в `AT TIME ZONE`/`date()` в WHERE.

Preview и background materialization имеют отдельные statement timeouts, page
limits и общие resource budgets. Timeout background page является retryable job
failure и не переводит generation в `READY`.

Нормативные defaults v1: preview `first` по умолчанию 50 и максимум 100,
statement timeout 2 секунды; background page 500 customers и statement timeout
10 секунд. Worker может динамически уменьшить размер следующей page после
timeout, но не увеличить выше 500. Изменение этих operational defaults не меняет
DSL semantics; architecture tests проверяют, что timeout действительно
устанавливается transaction-local перед query.

## 19. Complexity limits

Лимиты v1:

| Limit | Значение |
| --- | ---: |
| query UTF-8 bytes | 8 192 |
| raw tokens | 2 048 |
| raw AST nodes | 512 |
| raw syntactic nesting depth | 32 |
| leaf clauses | 20 |
| logical nesting depth | 6 |
| values в одном `IN` | 100 |
| function parameters | 8 |
| string literal code points | 1 024 |
| referenced entity IDs total | 200 |
| parser/validation diagnostics | 50 |

Complexity score:

| Node | Cost |
| --- | ---: |
| indexed scalar predicate | 1 |
| statistics predicate | 1 |
| list `EXISTS` | 2 |
| non-aggregate function | 3 |
| aggregate function | 5 |
| `OR` child after first | +1 |

Максимальный score любого сохраняемого DYNAMIC segment и preview query — 40,
независимо от status. Query с большим score нельзя сохранить как DRAFT с
надеждой активировать позже. Query bytes и raw parser limits применяются до или
во время parse. Остальные structural limits и complexity score применяются
после normalization, но до SQL compilation. Все они являются configuration
constants DSL version, а не merchant-editable Store settings.

Cost leaf определяется descriptor, а не выводится compiler динамически.
Logical `AND`, первый child `OR` и `NOT` имеют cost 0; каждый дополнительный
child одного normalized `OR` добавляет 1. Function cost начисляется один раз за
function node независимо от числа parameters. `referenced entity IDs total`
считается после deduplication внутри каждого `IN`, но одинаковый ID в разных
clauses считается один раз глобально.

Preview дополнительно использует statement timeout и ограниченный result set.
Timeout возвращает user error и не активирует segment.

## 20. Temporal rules

Membership является temporal, если validated predicate может изменить результат
только из-за течения времени, без domain event. В v1 это включает:

- named dates `today` и `yesterday`;
- relative dates;
- `birthday` с time-relative boundaries;
- expiration `customer_group_membership.expires_at`;
- tax `valid_from` и boundary после inclusive `valid_to`;
- любой будущий attribute/function, чей registry descriptor объявляет
  `SOURCE` или `VALUE_AND_SOURCE` temporal contract.

`birthday` с двумя absolute boundaries и `birthday IS [NOT] NULL` может быть
классифицирован как non-temporal. Консервативная temporal классификация
разрешена, но пропуск возможной time-driven boundary запрещен.

Semantic analyzer помечает definition как `temporal`. Evaluator обязан
рассчитать ближайший `next_change_at`:

- для matching customer — момент, когда predicate может стать false;
- для non-matching customer — момент, когда predicate может стать true;
- для нескольких temporal clauses — минимальный безопасный boundary, в который
  итог всего boolean expression потенциально может измениться. Расчет выполняет
  temporal evaluator над AST с учетом `AND`, `OR` и `NOT`, а не независимый
  минимум только среди currently matching leaves.

### 20.1 Нормативный boundary evaluator

Каждый evaluator возвращает пару `{ value, nextChangeAt }`, где
`nextChangeAt` либо `NULL`, либо первый instant строго после `effectiveAt`, в
который текущее значение node может перестать быть достоверным без нового domain
event. Boundary не обязана гарантировать изменение результата: безопасная
консервативная reevaluation разрешена.

Leaf rules v1:

1. Time-independent scalar/list/function predicate возвращает `NULL`.
2. Любой predicate с `today`, `yesterday` или relative Date возвращает начало
   следующего calendar day Store. Это нормативная v1 стратегия даже когда можно
   математически вычислить более поздний день.
3. `birthday` с time-relative boundary возвращает начало следующего calendar
   day Store. `birthday` только с absolute dates либо `IS [NOT] NULL` возвращает
   `NULL`.
4. Group list predicate возвращает минимальный будущий `expires_at` среди rows,
   способных изменить этот leaf: для `CONTAINS value`/`NOT CONTAINS value` — rows
   данного group ID, для list `IS [NOT] NULL` — все active group rows customer.
5. Tax leaf возвращает минимальную будущую boundary среди относящихся к нему
   non-deleted rows: начало `valid_from` и начало calendar day после inclusive
   `valid_to`. Stored terminal `REJECTED`/`REVOKED` row не добавляет expiry
   boundary, которая не может изменить effective terminal status.
6. Если несколько mechanisms применимы одному leaf, выбирается минимальный
   non-null instant.

Logical composition:

```text
NOT child:
  value = !child.value
  next  = child.next

AND children:
  value = every(child.value)
  if value = true:  next = min(next всех children)
  if value = false: next = min(next только children с value = false)

OR children:
  value = some(child.value)
  if value = false: next = min(next всех children)
  if value = true:  next = min(next только children с value = true)
```

`min` игнорирует `NULL`; если множество пусто, результат `NULL`. При `false AND`
результат без domain event может стать true только после изменения каждого
currently false child, а при `true OR` — false только после изменения каждого
currently true child. Reevaluation на ранней boundary заново рассчитывает весь
AST и следующую boundary.

Начало следующего Store day вычисляется timezone library из local calendar date,
а затем конвертируется в UTC instant; добавление фиксированных 24 часов
запрещено. Все leaf и SQL evaluators используют один date/time adapter и golden
fixtures DST, end-of-month, leap year и IANA timezone transitions.

`customer_segment_membership.expires_at` может обслуживать простой переход
`true -> false`, но его недостаточно для `false -> true`, например birthday в
будущем. Для общей реализации нужна owned evaluation queue:

```text
customer_segment_temporal_schedule(
  store_id,
  segment_id,
  customer_id,
  definition_revision,
  evaluation_generation,
  evaluate_at,
  schedule_token,
  attempt_count,
  lease_until,
  claimed_by,
  last_error,
  created_at,
  updated_at,
  primary key (store_id, segment_id, customer_id)
)
```

В temporal schedule хранится только следующая актуальная граница пары
customer/segment.
`schedule_token` детерминированно включает definition revision, generation,
evaluated effectiveAt и boundary и используется для идемпотентного claim.
Нормативно это lowercase hex SHA-256 от UTF-8 строки
`v1\0<storeId>\0<segmentId>\0<customerId>\0<definitionRevision>\0<generation>\0<effectiveAt>\0<boundary>`,
где instants имеют canonical UTC ISO representation с millisecond precision.
Каждая customer evaluation в той же transaction и под тем же lock, что
membership/evaluation state:

1. вычисляет итоговый boolean и ближайший безопасный `next_change_at`;
2. upsert-ит queue row, если boundary существует и находится после
   `effectiveAt`;
3. удаляет прежнюю queue row, если будущей boundary больше нет;
4. записывает revision/generation вместе с row.

Worker claim-ит due rows через bounded `FOR UPDATE SKIP LOCKED` только для
segment в состояниях `ACTIVE` и `READY`, повторно проверяет revision/generation
и соответствие текущему `schedule_token`, затем выполняет обычный per-customer
evaluation protocol. Due rows segment в `PENDING` или `RUNNING` остаются durable
и не claim-ятся, не удаляются и не считаются stale; сразу после перехода в
`READY` они становятся claimable. Stale item — это только item неактивного
segment либо item с несовпадающими revision, generation или `schedule_token`.
Он является no-op. Успешная evaluation атомарно заменяет item следующей boundary
либо удаляет его. Crash после claim не может навсегда потерять item: claim
использует transaction lock или lease с durable retry.

Нормативный claim использует lease: короткая transaction выбирает не более 100
due rows через `FOR UPDATE SKIP LOCKED`, устанавливает `claimed_by`, увеличивает
`attempt_count` и устанавливает `lease_until`. Evaluation выполняется после
commit claim transaction. Row с истекшей lease снова claimable. Успех удаляет
или заменяет row только при совпадении `schedule_token`; старый worker не может
удалить более новую schedule. Retry использует exponential backoff с jitter,
начиная с 1 секунды и с cap 5 минут. После 20 неудачных attempts текущий ACTIVE
segment переводится в `FAILED`; row и `last_error` сохраняются для operator
diagnostics и ручного retry той же generation.

Перед публикацией temporal generation bulk finalizer после полного scan и
event-queue watermark фиксирует один `publicationEffectiveAt`, не более ранний,
чем `effectiveAt` bulk run. Все schedule rows текущей revision/generation с
`evaluate_at <= publicationEffectiveAt` переоцениваются с этим единым instant по
обычному lock protocol. Такая evaluation сразу рассчитывает boundary строго
после `publicationEffectiveAt`, поэтому пропущенные промежуточные clock
boundaries не требуется воспроизводить по одной. Только после drain этих due
rows finalizer в transaction повторно проверяет status/revision/generation и
переводит segment в `READY`. Due row, добавленная конкурентным event path после
этого drain, не теряется: event transaction сначала инвалидирует stale positive,
а сохраненная schedule row становится claimable сразу после `READY`.

Initial/rebuild materialization temporal definition обязана выполнить
`compileStoreCustomers` и оценить каждого non-deleted customer, включая текущий
результат `false`. Использование только `compileSegmentMembers` для temporal
definition запрещено: оно не создает расписание переходов `false -> true`.

Relative calendar-date rules пересчитываются не позднее начала следующего дня
в timezone Store. DST не должен создавать пропущенный или двойной transition.
Group expiry использует точный `expires_at` instant. Tax validity dates меняются
в начале соответствующего calendar day Store: `valid_from` — в начале указанной
даты, `valid_to` — в начале следующей даты, поскольку upper boundary inclusive.

## 21. Materialization semantics

Dynamic segment membership материализуется в
`customer_segment_membership` со следующими значениями:

```text
source = RULE
evaluated_definition_revision = customer_segment.definition_revision
evaluated_generation = customer_segment.evaluation_generation
evaluated_at = effectiveAt
expires_at = calculated true -> false boundary, если он известен
```

`evaluation_generation` является monotonic materialization epoch. Она
увеличивается при изменении definition, каждой активации DYNAMIC segment и
изменении зависимого Store evaluation context. `definition_revision` отвечает
за semantics query, а generation — за freshness конкретной materialization.
RULE membership считается current только при совпадении обоих значений.

Dynamic segment имеет read-only materialization status:
`PENDING | RUNNING | READY | FAILED`. Status является одновременно observability
и publication barrier: DYNAMIC RULE memberships доступны eligibility только в
`READY`. Он дополняет, но не заменяет revision/generation checks.

Required persistence additions:

```text
customer_segment.evaluation_generation integer not null
customer_segment.materialization_status nullable enum
customer_segment_membership.evaluated_generation nullable integer
```

`revision`, `definition_revision` и `evaluation_generation` используют GraphQL
`Int`/PostgreSQL `integer` и guarded increment: значение не может превышать
`2147483647`; попытка overflow fail closed с internal operator error. Все три
имеют `CHECK >= 0`.

Для RULE membership `evaluated_generation` обязателен, для non-RULE — `NULL`.
Для DYNAMIC segment materialization status обязателен, для MANUAL — `NULL`.

`customer_segment.type` устанавливается при создании и после этого immutable.
Попытка изменить type возвращает `SEGMENT_TYPE_IMMUTABLE`; для перехода между
MANUAL и DYNAMIC merchant создает новый segment. MANUAL segment не может иметь
RULE memberships, а DYNAMIC segment не может иметь MANUAL/IMPORT/SYSTEM
memberships. Эти ограничения проверяются write scripts и eligibility reads.

### 21.1 Persistence contract

До включения первого DYNAMIC segment миграция атомарно добавляет:

```text
customer_segment_evaluation_cause_sequence bigint sequence

customer_segment_materialization_run(
  store_id, segment_id, definition_revision, evaluation_generation,
  status, cause_sequence, scan_effective_at, scan_cursor, scan_completed_at,
  queue_watermark, publication_effective_at,
  attempt_count, lease_until, claimed_by, last_error,
  created_at, updated_at,
  primary key (store_id, segment_id, evaluation_generation)
)

customer_segment_evaluation_state(
  store_id, segment_id, customer_id,
  definition_revision, evaluation_generation,
  evaluated_at, matched, cause_sequence, evaluator_token,
  source_event_id, updated_at,
  primary key (store_id, segment_id, customer_id)
)

customer_segment_evaluation_lock(
  store_id, segment_id, customer_id, created_at,
  primary key (store_id, segment_id, customer_id)
)
```

Materialization run status: `PENDING | RUNNING | SUCCEEDED | FAILED`. Единственный
run текущей generation определяется tuple primary key; retry обновляет ту же row,
а не создает новую generation. `scan_cursor`, watermark и publication instant
записываются transactionally, поэтому crash продолжает run с последней полностью
завершенной page.

Обязательные constraints:

- DYNAMIC segment имеет non-null materialization status и generation; MANUAL —
  null status и generation `0`;
- RULE membership имеет оба evaluated revision/generation, остальные sources —
  оба `NULL`;
- RULE разрешен только для DYNAMIC, non-RULE — только для MANUAL; cross-table
  invariant проверяется одним repository write path и eligibility query, потому
  что обычный PostgreSQL `CHECK` не читает parent row;
- parent `customer` и `customer_segment` получают unique `(store_id, id)`;
  memberships, lock/state/run и обе queues используют composite foreign keys
  `(store_id, customer_id)` и `(store_id, segment_id)`, поэтому cross-store pair
  невозможно записать даже вне repository;
- `evaluated_at < expires_at`, если expiry не null;
- revision/generation queue/state/run обязаны быть неотрицательными.

Обязательные indexes:

- run claim: `(status, lease_until, created_at)` и
  `(store_id, segment_id, evaluation_generation)`;
- temporal claim: `(evaluate_at, lease_until)`;
- reevaluation claim: `(definition_revision, evaluation_generation,
  completed_at, available_at, lease_until, sequence)`;
- eligibility: `(store_id, customer_id, expires_at, segment_id)` с included
  source/revision/generation либо эквивалентным covering plan;
- cleanup: каждый queue/state table имеет `(store_id, customer_id)` и
  `(store_id, segment_id, evaluation_generation)` access path.

Все workers используют DBOS durable workflows только как orchestration; progress,
leases, watermark и idempotency остаются в Customers PostgreSQL и не зависят от
in-memory process state.

Lease duration v1 — 60 секунд. Materialization coordinator с долгой работой
renew-ит lease каждые 20 секунд отдельной transaction; customer/temporal queue
item должен завершить одну bounded evaluation до 60 секунд и lease не renew-ит.
После потери lease worker завершает текущий SQL, но перед mutation обязан
проверить `claimed_by`/token и сделать no-op. Completed reevaluation rows
сохраняются 30 дней (`EVENT_IDEMPOTENCY_RETENTION_DAYS=30`), после чего bounded
cleanup удаляет их pages; producer redelivery contract не может превышать этот
срок.

### 21.2 Definition change

Изменение canonical query/AST:

1. увеличивает `definition_revision`;
2. увеличивает `evaluation_generation`;
3. делает предыдущие RULE memberships stale немедленно;
4. устанавливает materialization status `PENDING`;
5. сохраняет fail-closed checkout semantics;
6. запускает durable bulk materialization новой revision/generation;
7. не изменяет MANUAL memberships других segments.

### 21.3 Activation и status transitions

Переход DYNAMIC segment из любого неактивного status в `ACTIVE` всегда:

1. увеличивает `evaluation_generation`, даже если definition не менялась;
2. делает все RULE memberships предыдущей generation stale;
3. устанавливает materialization status `PENDING`;
4. durable-enqueue bulk materialization до успешного завершения mutation.

Во время rebuild memberships текущей generation записываются, но eligibility
reads не используют их до атомарного перехода materialization status в `READY`.
Старые generation никогда не используются. Это создает сознательные временные
false negatives, но исключает partial audience и false positives. Ошибка job
переводит materialization status в `FAILED`, сохраняет fail-closed reads и
подлежит retry с той же generation. Переход из `ACTIVE` в неактивный status
немедленно исключает segment из eligibility и event reevaluation, отменяет или
делает no-op pending queue items через generation/status checks. Повторная
активация всегда создает новую generation и потому не может оживить старые rows.

MANUAL segment не использует materialization status или
`evaluation_generation` для своих memberships.

### 21.4 Customer lifecycle events

`customerUpdated.reasons` и `customerStatisticsUpdated.reasons` сопоставляются с
извлеченными dependencies. Пересчитываются только подходящие ACTIVE DYNAMIC
segments для затронутого customer.

Нормативное отображение reasons:

| Event reason | Segment dependencies |
| --- | --- |
| `PROFILE` | `profile` |
| `CONTACT` | `contact` |
| `COMPANY` | `company` |
| `STATUS` | `status` |
| `ADDRESS` | `address` |
| `CONSENT` | `consent` |
| `TAG` | `tag` |
| `GROUP` | `group` |
| `TAX_IDENTIFIER` | `taxIdentifier` |
| `TAX_EXEMPTION` | `taxExemption` |
| `ORDER` | `statistics.order` |
| `CHECKOUT` | `statistics.checkout` |
| `REFUND` | `statistics.refund` |

Dependency `customer.any` совпадает с любым `customerUpdated` reason, но не с
`customerStatisticsUpdated`. Empty или unknown reason fail closed: Customers
инвалидирует customer во всех ACTIVE DYNAMIC segments и записывает warning с
event type/ID без PII. Producer event schemas используют non-empty deduplicated
reason arrays; добавление reason является additive contract change.

Та же Customers database transaction, которая принимает новое domain state или
revision/version owned projection, для каждого затронутого ACTIVE DYNAMIC segment
обязана под общим per-customer lock:

1. проверить idempotency/source ordering события относительно evaluation state;
2. удалить current RULE membership, если событие новее последней завершенной
   evaluation;
3. удалить/заменить прежнюю temporal queue row;
4. durable-enqueue reevaluation текущей revision/generation;
5. commit state/projection, invalidation и enqueue атомарно и только затем
   разрешить acknowledgement события.

Если transaction затрагивает несколько segments, lock keys сначала
deduplicate, затем сортируются лексикографически по
`(store_id, customer_id, segment_id)` и только после этого приобретаются.
Порядок обязателен для event handlers, bulk workers, lifecycle cleanup и
temporal workers. Нормативная реализация использует
`customer_segment_evaluation_lock`: transaction выполняет idempotent
`INSERT ... ON CONFLICT DO NOTHING`, затем `SELECT ... FOR UPDATE` всех keys в
canonical order. Advisory locks для этого protocol запрещены, чтобы hash
collision или различная key derivation не меняли correctness.

Нормативная identity этого lock во всех paths — упорядоченный tuple
`(store_id, customer_id, segment_id)`. Реализация обязана предоставлять одну
общую функцию построения и сортировки lock rows; перестановка `customer_id` и
`segment_id` создает другой key и запрещена.

Таким образом, после видимости нового owned state окно до reevaluation дает
только false negative. Запись нового state отдельно от invalidation/enqueue
запрещена. Stale или повторно доставленное событие не удаляет membership,
созданную более свежей evaluation. Если projection отвергла событие как старое
revision/version или фактически не изменилась, invalidation не выполняется.

Дополнительные lifecycle rules:

- `customerCreated` durable-enqueue evaluation нового customer для всех ACTIVE
  DYNAMIC segments независимо от dependencies;
- `customerDeleted` под per-customer locks удаляет RULE memberships,
  evaluation state и pending temporal/event queue items этого customer;
- `customerMerged` выполняет cleanup source customer и reevaluation target
  customer для всех ACTIVE DYNAMIC segments независимо от dependencies;
- `storeConfigurationUpdated` обрабатывается по разделу 18.5.

Acknowledgement каждого lifecycle event разрешен только после durable enqueue
или атомарного cleanup. Повторная доставка использует source event ID и является
идемпотентной.

Reevaluation выполняет:

```text
match     -> upsert current RULE membership
not match -> delete RULE membership for customer + segment
```

Derived RULE reevaluation не увеличивает merchant-facing
`customer_segment.revision`, иначе фоновые события будут создавать постоянные
optimistic concurrency conflicts в Admin.

### 21.5 Counts и reads

`customersCount`, segment members preview и все eligibility reads считают
membership current только когда одновременно выполняются:

```text
segment.status = ACTIVE
AND segment.deleted_at IS NULL
AND (
  (segment.type = MANUAL AND membership.source != RULE)
  OR
  (segment.type = DYNAMIC
    AND segment.materialization_status = READY
    AND membership.source = RULE
    AND membership.evaluated_definition_revision = segment.definition_revision
    AND membership.evaluated_generation = segment.evaluation_generation)
)
AND membership.evaluated_at <= effectiveAt
AND (membership.expires_at IS NULL OR membership.expires_at > effectiveAt)
```

Eligibility read для RULE membership также проверяет существование
non-deleted customer в том же `store_id`; membership row сама по себе не может
сделать deleted или cross-store customer eligible.

Consistency contract DYNAMIC segments — fail closed, event-driven consistency:

- rebuild не публикует частичную generation до `READY`;
- принятое новое domain state сначала инвалидирует потенциально stale positive
  membership и только затем подтверждается producer/queue;
- reevaluation может временно не вернуть подходящего customer, но не оставляет
  заведомо stale eligible customer;
- `READY` означает завершение полного initial/rebuild scan и barrier до его
  event-queue watermark, а для temporal definition также завершение temporal
  finalization до зафиксированного `publicationEffectiveAt`; это не означает
  отсутствие более новых pending customer events или clock boundaries;
- critical checkout eligibility может использовать DYNAMIC segment только через
  этот current-membership predicate; чтение membership table без status,
  revision, generation, expiry и customer checks запрещено.

### 21.6 Concurrency bulk materialization и customer events

Bulk scan не имеет права безусловно вставлять IDs, найденные ранее
`compileSegmentMembers`: состояние customer могло измениться после чтения page.
Каждая RULE mutation использует общий для bulk worker и event reevaluator
протокол:

1. получить transaction-scoped lock по
   `(store_id, customer_id, segment_id)`;
2. прочитать durable evaluation state; bulk run с более ранним `effectiveAt`,
   чем уже завершенная evaluation той же definition revision и generation,
   пропускает запись;
3. после получения lock заново выполнить `compileCustomerMatch` по текущему
   committed state с закрепленным для run `effectiveAt`;
4. проверить, что segment остается `ACTIVE`, а `definition_revision` и
   `evaluation_generation` равны revision/generation run;
5. атомарно записать evaluation state, выполнить upsert/delete membership и
   replace/delete temporal queue item до освобождения lock.

Non-temporal initial/rebuild run может использовать IDs из
`compileSegmentMembers`, потому что новая generation начинает без current
memberships и non-match не требует будущего timer. Temporal run всегда использует
exhaustive `compileStoreCustomers`; каждый customer получает evaluation-state
tombstone и актуальный future boundary даже при результате `not match`.

Отдельный state из раздела 21.1 необходим и для результата `not match`,
поскольку отсутствие membership само по себе не сохраняет freshness tombstone.

Эта таблица является coordination state, а не источником eligibility. При
сравнении freshness одной пары definition revision/evaluation generation
используется tuple `(evaluated_at, cause_sequence, evaluator_token)` в ascending
lexicographic order. Event queue передает свой `sequence` как `cause_sequence`;
bulk выделяет один `cause_sequence` при создании materialization run, а temporal
evaluation — при claim из той же database sequence. `evaluator_token` является
последним deterministic tie-breaker: canonical primary-key tuple
materialization run для bulk,
`source_event_id` для event queue и `schedule_token` для temporal evaluation.
State
другой generation не сравнивается и не может записать membership.

Event reevaluation использует `requested_effective_at`, записанный database
transaction timestamp при invalidation/enqueue. Он не использует старый
`occurredAt` source event как evaluation clock: source ordering уже проверен
projection handler, а DSL оценивается относительно момента принятия нового
owned state. Bulk продолжает использовать закрепленный run `effectiveAt`.

Таким образом, если более свежая event reevaluation завершилась первой, bulk
увидит ее evaluation state и не перезапишет результат более старым
`effectiveAt`. Если bulk завершился первым, гарантированно доставленное событие
получит тот же lock позже и исправит membership.

Каждый relevant customer/statistics event до acknowledgement атомарно
инвалидирует stale positive и durable-enqueue идемпотентную reevaluation для
всех затронутых ACTIVE DYNAMIC segments. Bulk job
считается завершенным только после scan, обработки reevaluations до durable
queue watermark, зафиксированного в конце scan, и temporal finalization для
temporal definition по правилам раздела 20. Events после watermark обрабатываются
обычным event path. Queue item имеет idempotency key
`(segment_id, customer_id, definition_revision, evaluation_generation,
source_event_id)`. Membership write является idempotent upsert/delete под unique
customer/segment key и выполняется в одной transaction с evaluation state.

Bulk job переводит materialization status в `READY` только после scan,
event-queue watermark и, для temporal definition, temporal finalization до
`publicationEffectiveAt`, и только если status/revision/generation segment все
еще совпадают с run. Иначе completion является no-op. Terminal failure записывает
`FAILED`, но не меняет generation и не возвращает старые memberships в
eligibility.

Event-driven reevaluation использует отдельную idempotent append-only queue, а
не `customer_segment_temporal_schedule`:

```text
customer_segment_reevaluation_queue(
  sequence bigint generated from customer_segment_evaluation_cause_sequence,
  store_id,
  segment_id,
  customer_id,
  definition_revision,
  evaluation_generation,
  source_event_id,
  requested_effective_at,
  available_at,
  attempt_count,
  lease_until,
  claimed_by,
  completed_at,
  last_error,
  created_at,
  updated_at,
  primary key (sequence),
  unique (
    store_id,
    segment_id,
    customer_id,
    definition_revision,
    evaluation_generation,
    source_event_id
  )
)
```

Temporal schedule coalesce-ит будущие clock boundaries до одной строки на
пару. Reevaluation queue сохраняет event ordering/idempotency и предоставляет
watermark. Temporal worker при наступлении boundary выполняет evaluation
напрямую под общим lock; если для retry требуется event queue, он публикует
синтетический deterministic `source_event_id` из `schedule_token`.

Успешно обработанная reevaluation row получает `completed_at` в той же
transaction, что membership/evaluation state. Rows не удаляются раньше
окончания гарантированного срока redelivery source events, чтобы unique key
продолжал обеспечивать idempotency. Claim с истекшим `lease_until` доступен для
retry; terminal retry exhaustion переводит materialization в `FAILED`, когда
item принадлежит blocking generation/barrier.

Queue claim использует тот же batch size 100, lease и retry policy, что temporal
worker. Для item, созданного после `READY` и не входящего в materialization
barrier, terminal exhaustion также переводит segment в `FAILED`: продолжать
публиковать generation при известной необработанной invalidation запрещено.
Operator retry очищает terminal marker, сохраняет generation и source event ID и
возобновляет attempts с той же queue row.

Queue watermark является монотонным `sequence`, выдаваемым
`customer_segment_reevaluation_queue` в той же transaction, где выполняются
event invalidation и enqueue. В
конце scan bulk фиксирует committed high-water mark и обрабатывает все items этой
revision/generation с sequence не выше него. Barrier считается пройденным,
только когда для каждой такой row установлен `completed_at`; отсутствие
claimable rows само по себе не означает completion из-за действующих leases.
Event, committed после barrier,
сначала инвалидирует membership по правилам раздела 21.4 и потому не создает
false-positive окно после перехода run в `READY`.

## 22. GraphQL contract

Рекомендуемый write contract:

```graphql
input CustomerSegmentDefinitionUpdateInput {
  query: String!
}
```

`CustomerSegmentType` обязателен в create input и отсутствует в update input,
поскольку type immutable.

Create contract использует следующие invariants:

- `DYNAMIC` требует non-empty `query` и запрещает client-provided `definition`;
- `MANUAL` запрещает `query` и `definition`;
- update definition доступен только для DYNAMIC segment;
- null/empty query не является способом превратить DYNAMIC segment в MANUAL;
- type transition требует создания нового segment.

`definition: JSON!`, `definitionRevision: Int!`, `evaluationGeneration: Int!` и
`materializationStatus` являются read-only fields. Внешний JSON AST никогда не
принимается write operation.

Validation/preview:

```graphql
extend type Query {
  customerSegmentQueryValidate(
    query: String!
  ): CustomerSegmentQueryValidationResult!

  customerSegmentPreview(
    query: String!
    first: Int = 50
    after: String
  ): CustomerSegmentPreview!
}

enum CustomerSegmentDiagnosticSeverity {
  ERROR
  WARNING
}

type CustomerSegmentQueryDiagnostic {
  code: String!
  message: String!
  severity: CustomerSegmentDiagnosticSeverity!
  startOffset: Int!
  endOffset: Int!
  line: Int!
  column: Int!
}

type CustomerSegmentQueryValidationResult {
  valid: Boolean!
  canonicalQuery: String
  definition: JSON
  complexity: Int
  diagnostics: [CustomerSegmentQueryDiagnostic!]!
}

type CustomerSegmentUserError implements UserError {
  message: String!
  field: [String!]
  code: String!
  diagnostic: CustomerSegmentQueryDiagnostic
}

type CustomerSegmentCreatePayload {
  segment: CustomerSegment
  userErrors: [CustomerSegmentUserError!]!
}

type CustomerSegmentUpdatePayload {
  segment: CustomerSegment
  operationResults: [CustomerOperationResult!]!
  userErrors: [CustomerSegmentUserError!]!
}

type CustomerSegmentPreview {
  validation: CustomerSegmentQueryValidationResult!
  customers: CustomerConnection
  totalCount: Int
  timedOut: Boolean!
}
```

Обе operations требуют Admin permission `customers.segments.read`; сохранение и
активация требуют `customers.segments.manage`. `first` находится в диапазоне
1..100. `after` использует тот же versioned customer-ID cursor contract, что
`compileSegmentMembers`. Preview фиксирует один `effectiveAt` на весь request.
`validation.valid` равен `false` при наличии хотя бы одной `ERROR`; `WARNING` не
блокирует preview или сохранение. `valid` рассчитывается до truncation массива
diagnostics, поэтому скрытая 51-я error все равно дает `false`.

Если validation неуспешна, `customers` и `totalCount` равны `null`,
`timedOut=false`. Если SQL statement timeout наступил после успешной validation,
validation остается `valid=true`, `customers`/`totalCount` равны `null`,
`timedOut=true`, а diagnostics содержит `SEGMENT_PREVIEW_TIMEOUT`. Preview не
вычисляет unlimited exact count: `totalCount` возвращается только если count
завершился в том же 2-second budget; иначе весь preview считается timed out.

Create/update payloads используют `CustomerSegmentUserError`: query error имеет
`diagnostic`, business error — `diagnostic=null`. Старый `GenericUserError` в
этих двух payloads заменяется тем же atomic GraphQL cutover, что writable JSON
input. GraphQL transport error для пользовательской ошибки DSL не используется.

Diagnostic coordinates используют следующий единый contract:

- `startOffset` и `endOffset` — zero-based offsets в UTF-16 code units исходной
  query; range имеет форму `[startOffset, endOffset)`, то есть end exclusive;
- `line` и `column` — one-based; `column` также считается в UTF-16 code units;
- `CRLF` считается одним line break, но двумя code units в absolute offset;
- coordinates относятся к исходной query до normalization и canonical print.

Preview не создает segment и не записывает memberships.

Attribute catalog для visual builder является read-only operation:

```graphql
extend type Query {
  customerSegmentAttributeCatalog: [CustomerSegmentAttributeDescriptor!]!
}

enum CustomerSegmentAttributeKind {
  SCALAR
  LIST
  FUNCTION
  VIRTUAL
}

enum CustomerSegmentAttributeAvailability {
  AVAILABLE
  UNAVAILABLE
}

type CustomerSegmentFunctionParameterDescriptor {
  name: String!
  presentationKey: String!
  valueType: String!
  operators: [String!]!
  enumValues: [String!]!
  aggregate: Boolean!
  nullable: Boolean!
}

type CustomerSegmentAttributeDescriptor {
  name: String!
  presentationKey: String!
  kind: CustomerSegmentAttributeKind!
  valueType: String!
  operators: [String!]!
  enumValues: [String!]!
  parameters: [CustomerSegmentFunctionParameterDescriptor!]!
  availability: CustomerSegmentAttributeAvailability!
  unavailabilityReason: String
}
```

Descriptor публикует stable `name`, localized presentation key, kind, value
type, allowed operators, enum values, function parameters, availability и
unavailability reason. Он не публикует SQL/table/index metadata. Catalog
строится из того же immutable registry, что semantic analyzer; отдельный вручную
поддерживаемый UI catalog запрещен.

## 23. Diagnostics

Минимальные error codes:

| Code | Условие |
| --- | --- |
| `SEGMENT_QUERY_SYNTAX_ERROR` | Peggy parse error |
| `SEGMENT_UNKNOWN_ATTRIBUTE` | attribute отсутствует в registry |
| `SEGMENT_ATTRIBUTE_UNAVAILABLE` | attribute зарезервирован, но projection недоступна |
| `SEGMENT_OPERATOR_NOT_SUPPORTED` | operator недопустим для attribute |
| `SEGMENT_VALUE_TYPE_MISMATCH` | value другого типа |
| `SEGMENT_INVALID_ENUM_VALUE` | enum value вне domain |
| `SEGMENT_INVALID_ENTITY_ID` | Global ID неправильного типа или Store scope |
| `SEGMENT_INVALID_DATE` | несуществующая date/datetime или недопустимый offset |
| `SEGMENT_INVALID_DATE_RANGE` | lower boundary позже upper boundary |
| `SEGMENT_INVALID_MONEY` | amount нельзя точно представить в Store currency |
| `SEGMENT_EVALUATION_CONTEXT_STALE` | persisted context не совпадает с trusted Store context; internal/fail-closed |
| `SEGMENT_STORE_CONTEXT_NOT_READY` | локальный Store context еще не догнал trusted request revision; retryable |
| `SEGMENT_DUPLICATE_PARAMETER` | function parameter повторяется |
| `SEGMENT_COMPLEXITY_LIMIT` | превышен structural limit или score |
| `SEGMENT_PREVIEW_TIMEOUT` | bounded preview превысил timeout |
| `SEGMENT_DIAGNOSTICS_TRUNCATED` | semantic analyzer нашел больше 50 diagnostics |
| `SEGMENT_TYPE_IMMUTABLE` | update пытается изменить MANUAL/DYNAMIC type |
| `SEGMENT_QUERY_REQUIRED` | DYNAMIC create/update не содержит non-empty query |
| `SEGMENT_QUERY_NOT_ALLOWED` | MANUAL segment получил query/definition |

Каждая query syntax/semantic diagnostic должна указывать source range. Ошибки
referenced entities дополнительно указывают attribute/parameter и array index.
Business errors `SEGMENT_TYPE_IMMUTABLE`, `SEGMENT_QUERY_REQUIRED` и
`SEGMENT_QUERY_NOT_ALLOWED` используют GraphQL field path, а не фиктивный query
range. Internal `SEGMENT_EVALUATION_CONTEXT_STALE` не возвращается в query
diagnostics: API показывает generic retry/operator error и correlation ID.
`SEGMENT_STORE_CONTEXT_NOT_READY` является retryable user-visible operation
error без query range.

Diagnostic `message` не является stable API; stable contract — `code`, severity,
coordinates и optional structured details. Semantic analyzer обходит AST в
source order, сортирует diagnostics по `(startOffset, endOffset, code)` и
при переполнении оставляет первые 49 и добавляет 50-й warning
`SEGMENT_DIAGNOSTICS_TRUNCATED`.

## 24. Business examples

### Email subscribers из Украины

```sql
email_subscription_status = 'SUBSCRIBED'
AND customer_countries CONTAINS 'UA'
```

### Новые customers без завершенных заказов

```sql
customer_added_date >= -30d
AND number_of_orders = 0
```

### VIP по spend или order frequency

```sql
(amount_spent >= 1000 OR number_of_orders >= 10)
AND customer_lifecycle_status = 'ACTIVE'
```

### Lapsed customers

```sql
number_of_orders > 0
AND last_order_date < -90d
AND email_subscription_status = 'SUBSCRIBED'
```

### Customer с abandoned checkout, но без недавнего заказа

После появления abandonment projection:

```sql
abandoned_checkout_date >= -7d
AND (last_order_date < -30d OR last_order_date IS NULL)
```

### Повторная покупка продукта

После появления purchase line projection:

```sql
products_purchased MATCHES (
  product_id = 'Z2lkOi8vc2hvcGFuYS9Qcm9kdWN0LzAxOTAwMDAwLTAwMDAtNzAwMC04MDAwLTAwMDAwMDAwMDAwMw==',
  count >= 2
)
```

### День рождения в ближайшие 30 дней

```sql
birthday BETWEEN today AND +30d
AND email_subscription_status = 'SUBSCRIBED'
```

### Активные B2B-подобные customers с tax exemption

```sql
company_name IS NOT NULL
AND tax_exemption_statuses CONTAINS 'ACTIVE'
AND customer_lifecycle_status = 'ACTIVE'
```

## 25. Security requirements

1. Parser никогда не исполняет query text.
2. Peggy parser генерируется build-time.
3. SQL identifiers поступают только из server-owned registry.
4. Все values являются bind parameters.
5. Store scope поступает только из trusted service context.
6. Preview имеет statement timeout, row limit и complexity limit.
7. Diagnostics и logs не содержат tax identifier values, email, phone или
   полную SQL parameter payload.
8. Canonical query может содержать merchant-provided strings и поэтому не
   логируется на info level целиком.
9. `EXPLAIN ANALYZE` для merchant query не выполняется в request path.
10. Unknown attributes fail closed; compiler не имеет generic column fallback.

## 26. Versioning

`definition.version` определяет syntax/semantic version. `definition_revision`
остается revision конкретного segment definition и не заменяет DSL version.

Правила:

- изменение printer formatting без изменения AST semantics не требует новой
  DSL version, но уже сохраненные canonical query не переписываются фоново;
  новый printer применяется только при следующем merchant definition update
  либо context renormalization, которые атомарно сохраняют query и AST;
- изменение NULL, date, money или operator semantics требует новой version;
- новые additive attributes и enum values могут добавляться в v1 registry;
- удаление или изменение существующего attribute требует новой version;
- runtime compiler выбирается по `definition.version`;
- silent reinterpretation сохраненного AST новой semantics запрещена.

Поскольку проект не требует backward compatibility и production data
отсутствуют, первая реализация может заменить текущую свободную JSON definition
на строгую v1 schema без backfill.

### 26.1 Target contract и переход с текущей реализации

Эта спецификация является целевым contract и заменяет текущие возможности:

- client-provided `definition` в GraphQL create/update;
- изменение `CustomerSegmentType` после create;
- database constraint, допускающий DYNAMIC segment с произвольным query **или**
  непустым JSON definition;
- freshness только по `definition_revision` без `evaluation_generation`;
- invalidate-only обработку dynamic memberships.

Baseline implementation audit перед началом работ также считает blockers:

- Customers background `ServiceContext` с hardcoded `UTC` вместо trusted Store
  timezone/currency context;
- `customer_statistics.first_order_at`/`last_order_at`, рассчитанные по order
  `created_at`, а не completion time завершенных orders;
- отсутствие normalized profile/address columns matrix раздела 17.1;
- отсутствие materialization run, evaluation lock/state и обеих durable queues;
- eligibility reads, проверяющие только definition revision без generation и
  publication status.

Atomic release обязан удалить каждый blocker; наличие любого из них не позволяет
объявить DYNAMIC DSL доступным.

До включения DSL v1 одним atomic release должны быть согласованы GraphQL schema,
generated types, create/update scripts, Drizzle models/migrations, eligibility
reads, event handlers и knowledge base. Смешанный режим, в котором новый API
сосуществует со старой writable JSON definition или mutable type, запрещен.
Поскольку production data отсутствуют, migration изменяет schema напрямую без
backfill и без compatibility branches.

## 27. Тестовый контракт

### Parser

- precedence и parentheses;
- keywords в разном регистре;
- escaped strings;
- rejection leading-zero numbers, integer/decimal bounds и empty `MATCHES()`;
- dates, datetimes и relative dates;
- `IS NULL`/`IS NOT NULL` для nullable function parameters;
- lexical priority `DateTime > Date > RelativeDate > Number`, keyword boundaries
  и rejection comments/trailing garbage;
- source ranges для invalid query;
- UTF-16 diagnostic offsets для ASCII, non-BMP Unicode и CRLF;
- raw token/node/nesting limits до normalization, включая длинные цепочки `NOT`;
- canonical parse -> print -> parse round trip;
- byte-for-byte deterministic printer для whitespace, parentheses, escapes,
  numeric/money formatting и function parameter order.

### Semantic analyzer

- operator/type matrix;
- enum domains;
- encoded Global ID type и Store scope, rejection decoded `gid://` literal;
- Date/DateTime type separation и invalid calendar dates;
- money conversion;
- duplicate parameters;
- разрешение null-operators только для nullable non-aggregate function
  parameters;
- complexity limits;
- unavailable attributes;
- temporal extraction для `today`, `yesterday`, relative dates, group expiry и
  tax validity boundaries;
- tax enum domains и effective status precedence;
- strict canonical AST operator arity, rejection unknown keys и mismatch derived
  fields при persisted-definition load.

### SQL compiler

- обязательный store scope;
- только bound values;
- NULL truth table;
- `CONTAINS`/`NOT CONTAINS` через `EXISTS`/`NOT EXISTS`;
- date boundaries в Store timezone;
- aggregate function filters до aggregation;
- function parameter `IS NULL`/`IS NOT NULL` фильтрует source rows до
  aggregation;
- aggregate `count`/`sum_*` на пустом filtered set;
- mandatory Store currency filter для function money parameters;
- mismatch persisted/trusted Store evaluation context fail closed;
- отсутствующая statistics row;
- `first_order_date`, `last_order_date` и `completed_date` используют
  `completed_at`, а не `created_at`;
- Date/timestamptz predicate использует UTC half-open bounds без function wrapper
  над indexed column.
- оба bulk compiler используют ascending ID keyset cursor без offset pagination;

### Physical indexes

- каждый `AVAILABLE` descriptor имеет существующие normalization columns и все
  indexes своего `indexContract`;
- golden normalization fixtures покрывают Unicode NFKC/casefold, IDNA,
  BCP-47, address city/region/postal keys и фиксируют normalization contract ID;
- scalar/list/statistics/function queries используют ожидаемые indexes на
  representative `EXPLAIN` fixtures без `ANALYZE` в request path;
- отсутствие обязательного index/column не позволяет registry объявить
  attribute `AVAILABLE`;
- background page timeout остается retryable и не публикует generation.

Representative fixture содержит не менее 100 000 customers одного Store,
300 000 addresses, 500 000 classification relations и 1 000 000 order
projection rows с `ANALYZE` statistics, созданной до assertions. Для selective
predicates с ожидаемой cardinality не более 1% plan должен содержать descriptor
index и не должен содержать sequential scan большой source table. Preview и
background queries дополнительно доказывают применение transaction-local
statement timeout.

### Evaluation parity

Для набора fixtures результаты должны совпадать между:

1. preview;
2. `compileSegmentMembers`;
3. `compileCustomerMatch` для каждого customer;
4. materialized current memberships.

Все четыре режима используют одинаковые database fixtures и один явно
заданный `effectiveAt`. Отдельный test фиксирует один `effectiveAt` для всех
pages bulk run, пересекающего полночь Store timezone.

### Materialization concurrency

- schema constraints раздела 21.1 запрещают invalid source/type,
  revision/generation и cross-store combinations;
- row locks создаются и захватываются в canonical
  `(store_id, customer_id, segment_id)` order;
- event reevaluation до bulk write не перезаписывается более старым
  `effectiveAt`;
- event reevaluation после bulk write исправляет membership;
- `not match` сохраняет evaluation-state tombstone;
- смена `definition_revision` во время run запрещает старой revision писать;
- смена `evaluation_generation` во время run запрещает старой generation писать;
- deactivate/reactivate не оживляет memberships предыдущей generation;
- failed materialization остается fail closed и retry использует ту же generation;
- generation не видна eligibility до `READY` и становится видна атомарно;
- transaction нового owned state атомарно инвалидирует stale positive и enqueue
  reevaluation до commit/acknowledgement;
- pending reevaluation дает false negative, но не false positive;
- queue watermark включает все committed items до barrier, а более позднее
  событие инвалидирует membership до enqueue;
- due temporal rows не claim-ятся и не теряются во время `PENDING`/`RUNNING`, а
  temporal finalization обрабатывает boundaries до `publicationEffectiveAt`
  перед `READY`;
- `customerCreated` оценивается во всех ACTIVE DYNAMIC segments;
- `customerDeleted` очищает membership/state/queue;
- `customerMerged` очищает source и пересчитывает target;
- MANUAL/DYNAMIC type immutable и source/type invariants соблюдаются;
- повторная доставка одного `source_event_id` идемпотентна;
- все multi-segment paths получают locks в одном canonical order;
- temporal schedule coalescing не удаляет event reevaluation item, а event queue
  сохраняет monotonic watermark и idempotency key.

### Temporal behavior

- DST forward/backward transition;
- month/year offset на конце месяца;
- birthday через конец года;
- 29 февраля;
- birthday interval полного годового цикла и rejection interval > 366 дней;
- membership expiry boundary является exclusive;
- initial temporal materialization оценивает всех non-deleted customers, включая
  non-match;
- customer с birthday через 31 день получает queue boundary и входит в
  `birthday BETWEEN today AND +30d` без domain event;
- customer с order 89 дней назад входит в `last_order_date < -90d` через
  scheduled `false -> true` transition;
- `customer_added_date = today` и `last_order_date = yesterday` переходят на
  следующей границе calendar day без domain event;
- expiring group membership удаляет stale positive точно на `expires_at`;
- tax row появляется на `valid_from`, а inclusive `valid_to` истекает в начале
  следующего Store day;
- birthday interval с elapsed distance 366 принимается, а 367 отклоняется без
  inclusive off-by-one;
- membership/state/next queue item записываются атомарно, stale generation item
  является no-op, crash после claim сохраняет retryability.
- table-driven tests напрямую проверяют `{value, nextChangeAt}` для leaf,
  `AND`, `OR` и `NOT`, включая одновременно true/false children с `NULL` и
  несколькими future boundaries;
- истекшая lease повторно claim-ится, а worker со старым `schedule_token` не
  удаляет замененную schedule row;
- 20 terminal failures переводят текущий segment в `FAILED`, operator retry
  продолжает ту же generation.

### Store context changes

- Store API не допускает currency/exponent change после создания Store;
- ошибочное currency-change event переводит money-dependent segments в
  `FAILED`, не меняя context snapshot и не выбирая новую statistics row;
- timezone change пересобирает зависимые Date predicates;
- timezone change также пересобирает tax list predicates с calendar validity;
- старый context snapshot никогда не компилируется с новым Store context;
- изменение только общей `storeConfigurationRevision` без изменения зависимых
  context values не делает segment stale;
- invalid query после context change остается fail closed со status `FAILED`.

## 28. Рекомендуемый порядок реализации

1. **Core language.** Создать package `packages/customer-segment-dsl` с AST,
   strict Zod schemas, checked-in Peggy grammar/generated parser, normalizer,
   printer, diagnostics и golden lexical/round-trip tests. Gate: все Parser и
   canonical AST tests раздела 27 проходят без database.
2. **Store context projection.** Добавить versioned
   `storeConfigurationUpdated`, локальную `customer_segment_store_context` и
   убрать hardcoded timezone/currency fallback из Customers background context.
   Gate: duplicate/out-of-order/context-not-ready tests проходят; currency
   mutation отсутствует в Store API.
3. **Physical attribute foundation.** Одной migration добавить normalization
   columns/writers, исправить commerce statistics на completed-time semantics и
   создать indexes matrix раздела 17.1. Gate: architecture test запрещает
   `AVAILABLE` без column, writer contract или index.
4. **Registry и semantic analyzer.** Реализовать descriptors profile, address,
   consent, classification, tax, statistics, `orders_placed` и `birthday`, затем
   batch Store-scoped entity validation, dependency/context/temporal extraction
   и complexity. Gate: Semantic analyzer и normalization suites раздела 27.
5. **SQL evaluation.** Реализовать `compileCustomerMatch`,
   `compileSegmentMembers`, `compileStoreCustomers`, один date/time adapter и
   recursive boundary evaluator. Gate: SQL truth tables, representative
   `EXPLAIN` и evaluation parity без materialized path.
6. **Coordination persistence.** Одной migration добавить generation/status,
   materialization run, evaluation state, temporal schedule, reevaluation queue,
   constraints и claim/cleanup indexes из разделов 20–21. Gate: schema tests,
   lease recovery и canonical row-lock order tests.
7. **Atomic API cutover.** Подключить validation к create/update, сделать type
   immutable и definition server-generated/read-only; в том же release удалить
   writable JSON/mutable-type inputs и старый database constraint. Gate:
   generated GraphQL types, scripts, models, eligibility reads и documentation
   согласованы; mixed mode отсутствует.
8. **Validation, catalog и preview API.** Добавить точные Query operations
   раздела 22, permissions, cursor/timeout handling и attribute catalog. Gate:
   invalid query ничего не пишет, preview parity и timeout tests проходят.
9. **Bulk materialization.** Реализовать durable run scanning, generation
   barrier, per-customer lock, evaluation tombstones, resume cursor и publish
   `READY`. Сначала поддержать non-temporal definitions. Gate: concurrency suite
   для bulk/event ordering, activation и crash resume.
10. **Atomic event reevaluation.** Заменить invalidate-only handler на reason-
    targeted invalidation + enqueue в той же transaction, где Customers принимает
    owned state/projection. Добавить create/delete/merge/context handlers и
    watermark drain. Gate: после commit возможны только false negatives, все
    acknowledgement/idempotency tests раздела 27 проходят.
11. **Temporal materialization.** Включить exhaustive scan для temporal
    definitions, atomic schedule replacement, leased worker и publication
    finalization до `publicationEffectiveAt`. Gate: вся Temporal behavior suite,
    DST fixtures и terminal retry/operator retry проходят.
12. **Admin UI.** Реализовать visual builder только из attribute catalog и
    advanced editor из canonical query. UI не хранит собственную operator/type
    matrix. Gate: unavailable descriptors нельзя выбрать, diagnostics используют
    UTF-16 coordinates.
13. **Purchase facts extension.** Отдельно определить versioned completed order
    line event с immutable product/variant/category snapshot, добавить owned
    projection и indexes, затем переключить `products_purchased` в `AVAILABLE`.
    Gate: projection ordering/idempotency, historical category semantics и
    function aggregate parity tests.

Шаг нельзя начинать через compatibility shim, обходящий gate предыдущего шага.
Шаги 6–11 выпускаются как один atomic backend release до доступности первого
ACTIVE DYNAMIC segment: production path без queue, generation barrier или
temporal schedule запрещен. Поскольку production data отсутствуют, migrations
не содержат backfill и compatibility branches; test fixtures пересоздаются.
