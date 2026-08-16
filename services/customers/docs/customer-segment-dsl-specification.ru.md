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

Имена attributes и parameters выводятся в `snake_case` и чувствительны к
регистру на semantic validation. Parser может принять другое написание, но
normalizer обязан привести identifier к lowercase до поиска в registry.

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

Money attributes принимают decimal amount в единственной configured currency
Store. Currency symbol и currency code в запросе не указываются:

```sql
amount_spent >= 500.00
```

Semantic analyzer обязан преобразовать decimal string в integer minor units без
использования IEEE-754 arithmetic. Значение с количеством decimal places больше
currency exponent отклоняется.

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
error.

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

- `customer_email_domain` сравнивается case-insensitive после lowercase и IDNA
  normalization;
- `customer_language` нормализуется как BCP 47 tag;
- `customer_source` сравнивается как сохраненный normalized source code;
- `company_name` в v1 сравнивается case-insensitive после NFKC и trim.

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

Примеры:

```sql
customer_countries CONTAINS 'UA'
customer_regions CONTAINS 'US-CA'
customer_cities CONTAINS 'US-CA-LosAngeles'
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

### 12.3 `birthday`

```sql
birthday BETWEEN today AND +30d
```

`birthday` является virtual Date attribute и сравнивает month/day
`customer.date_of_birth`, игнорируя year.

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
Store settings.

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

AST не содержит SQL identifiers, table names, Drizzle objects или compiled SQL.

Zod schema canonical AST повторяет discriminated unions выше и запрещает
unknown keys. Operator arity является structural invariant: `is_null` не может
содержать value, `between` всегда имеет обе boundaries, а `in` всегда содержит
непустой массив. Persisted definition полностью валидируется при каждом чтении
до выбора compiler; несовпадение derived `dependencies`,
`contextDependencies`, `temporal` или `evaluationContext` с validated root
считается internal corruption и fail closed. Compiler не доверяет отдельно
сохраненным derived полям без такой проверки.

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

Ограничение query UTF-8 bytes проверяется до запуска parser. Parser дополнительно
считает raw tokens, raw AST nodes и текущую syntactic nesting depth и прекращает
разбор при достижении limits из раздела 19. Эти checks выполняются до
normalization: цепочка `NOT NOT ...`, лишние singleton parentheses или другие
узлы, которые позже исчезнут, все равно учитываются. Реализация не должна
полагаться только на глубину JavaScript call stack.

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
21.5. Preview, `compileSegmentMembers` и `compileCustomerMatch` гарантируют
одинаковый результат только при одинаковых definition, database state,
Store timezone/currency и `effectiveAt`.

### 18.5 Store evaluation context

Semantic validation получает currency, currency exponent, IANA timezone и
монотонную `store_configuration_revision` только из trusted Store context и
сохраняет snapshot в `definition.evaluationContext`. Context dependencies
извлекаются так:

- любой Money value/attribute/function добавляет `currency`;
- любой named/relative date или `birthday` predicate добавляет `timezone`;
- absolute Date над timestamp source и DateTime без offset добавляют `timezone`;
- tax list predicates добавляют `timezone`, поскольку validity boundaries
  являются calendar dates Store;
- implementation может консервативно добавить dependency, даже если конкретный
  predicate математически не изменится от настройки.

Compiler перед evaluation проверяет, что зависимые поля trusted Store context
совпадают с snapshot definition. Mismatch fail closed с internal
`SEGMENT_EVALUATION_CONTEXT_STALE`; использовать старые minor units или timezone
запрещено.

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

Максимальный score ACTIVE segment — 40. Query bytes и raw parser limits
применяются до или во время parse. Остальные structural limits и complexity
score применяются после normalization, но до SQL compilation. Все они являются
configuration constants DSL version, а не merchant-editable Store settings.

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
  created_at,
  primary key (store_id, segment_id, customer_id)
)
```

В temporal schedule хранится только следующая актуальная граница пары
customer/segment.
`schedule_token` детерминированно включает definition revision, generation,
evaluated effectiveAt и boundary и используется для идемпотентного claim.
Каждая customer evaluation в той же transaction и под тем же lock, что
membership/evaluation state:

1. вычисляет итоговый boolean и ближайший безопасный `next_change_at`;
2. upsert-ит queue row, если boundary существует и находится после
   `effectiveAt`;
3. удаляет прежнюю queue row, если будущей boundary больше нет;
4. записывает revision/generation вместе с row.

Worker claim-ит due rows через bounded `FOR UPDATE SKIP LOCKED`, повторно
проверяет segment `ACTIVE`, `READY`, revision/generation и соответствие текущему
`schedule_token`, затем выполняет обычный per-customer evaluation protocol.
Stale item является no-op. Успешная evaluation атомарно заменяет item следующей
boundary либо удаляет его. Crash после claim не может навсегда потерять item:
claim использует transaction lock или lease с durable retry.

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

Для RULE membership `evaluated_generation` обязателен, для non-RULE — `NULL`.
Для DYNAMIC segment materialization status обязателен, для MANUAL — `NULL`.

`customer_segment.type` устанавливается при создании и после этого immutable.
Попытка изменить type возвращает `SEGMENT_TYPE_IMMUTABLE`; для перехода между
MANUAL и DYNAMIC merchant создает новый segment. MANUAL segment не может иметь
RULE memberships, а DYNAMIC segment не может иметь MANUAL/IMPORT/SYSTEM
memberships. Эти ограничения проверяются write scripts и eligibility reads.

### 21.1 Definition change

Изменение canonical query/AST:

1. увеличивает `definition_revision`;
2. увеличивает `evaluation_generation`;
3. делает предыдущие RULE memberships stale немедленно;
4. устанавливает materialization status `PENDING`;
5. сохраняет fail-closed checkout semantics;
6. запускает durable bulk materialization новой revision/generation;
7. не изменяет MANUAL memberships других segments.

### 21.2 Activation и status transitions

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

### 21.3 Customer lifecycle events

`customerUpdated.reasons` и `customerStatisticsUpdated.reasons` сопоставляются с
извлеченными dependencies. Пересчитываются только подходящие ACTIVE DYNAMIC
segments для затронутого customer.

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
temporal workers. Реализация использует один документированный
transaction-scoped advisory-lock key derivation либо row-lock table; смешивать
несовместимые lock primitives для одной пары запрещено.

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

### 21.4 Counts и reads

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
  watermark, а не отсутствие более новых pending customer events;
- critical checkout eligibility может использовать DYNAMIC segment только через
  этот current-membership predicate; чтение membership table без status,
  revision, generation, expiry и customer checks запрещено.

### 21.5 Concurrency bulk materialization и customer events

Bulk scan не имеет права безусловно вставлять IDs, найденные ранее
`compileSegmentMembers`: состояние customer могло измениться после чтения page.
Каждая RULE mutation использует общий для bulk worker и event reevaluator
протокол:

1. получить transaction-scoped lock по
   `(store_id, segment_id, customer_id)`;
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

Отдельный state необходим и для результата `not match`, поскольку отсутствие
membership само по себе не сохраняет freshness tombstone:

```text
customer_segment_evaluation_state(
  store_id,
  segment_id,
  customer_id,
  definition_revision,
  evaluation_generation,
  evaluated_at,
  matched,
  source_event_id,
  primary key (store_id, segment_id, customer_id)
)
```

Эта таблица является coordination state, а не источником eligibility. При
сравнении freshness более поздний `evaluated_at` одной пары definition
revision/evaluation generation имеет приоритет; state другой generation не
сравнивается и не может записать membership. Равные значения разрешаются
детерминированным run/event ID.

Таким образом, если более свежая event reevaluation завершилась первой, bulk
увидит ее evaluation state и не перезапишет результат более старым
`effectiveAt`. Если bulk завершился первым, гарантированно доставленное событие
получит тот же lock позже и исправит membership.

Каждый relevant customer/statistics event до acknowledgement атомарно
инвалидирует stale positive и durable-enqueue идемпотентную reevaluation для
всех затронутых ACTIVE DYNAMIC segments. Bulk job
считается завершенным только после scan и обработки reevaluations до durable
queue watermark, зафиксированного в конце scan. Events после watermark
обрабатываются обычным event path. Queue item имеет idempotency key
`(segment_id, customer_id, definition_revision, evaluation_generation,
source_event_id)`. Membership write является idempotent upsert/delete под unique
customer/segment key и выполняется в одной transaction с evaluation state.

Bulk job переводит materialization status в `READY` только после scan и queue
watermark и только если status/revision/generation segment все еще совпадают с
run. Иначе completion является no-op. Terminal failure записывает `FAILED`, но
не меняет generation и не возвращает старые memberships в eligibility.

Event-driven reevaluation использует отдельную idempotent append-only queue, а
не `customer_segment_temporal_schedule`:

```text
customer_segment_reevaluation_queue(
  sequence bigint generated by monotonic database sequence,
  store_id,
  segment_id,
  customer_id,
  definition_revision,
  evaluation_generation,
  source_event_id,
  available_at,
  attempt_count,
  lease_until,
  completed_at,
  last_error,
  created_at,
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

Queue watermark является монотонным `sequence`, выдаваемым
`customer_segment_reevaluation_queue` в той же transaction, где выполняются
event invalidation и enqueue. В
конце scan bulk фиксирует committed high-water mark и обрабатывает все items этой
revision/generation с sequence не выше него. Barrier считается пройденным,
только когда для каждой такой row установлен `completed_at`; отсутствие
claimable rows само по себе не означает completion из-за действующих leases.
Event, committed после barrier,
сначала инвалидирует membership по правилам раздела 21.3 и потому не создает
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

type CustomerSegmentPreview {
  validation: CustomerSegmentQueryValidationResult!
  customers: CustomerConnection
  totalCount: Int
  timedOut: Boolean!
}
```

Diagnostic coordinates используют следующий единый contract:

- `startOffset` и `endOffset` — zero-based offsets в UTF-16 code units исходной
  query; range имеет форму `[startOffset, endOffset)`, то есть end exclusive;
- `line` и `column` — one-based; `column` также считается в UTF-16 code units;
- `CRLF` считается одним line break, но двумя code units в absolute offset;
- coordinates относятся к исходной query до normalization и canonical print.

Preview не создает segment и не записывает memberships.

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
| `SEGMENT_DUPLICATE_PARAMETER` | function parameter повторяется |
| `SEGMENT_COMPLEXITY_LIMIT` | превышен structural limit или score |
| `SEGMENT_PREVIEW_TIMEOUT` | bounded preview превысил timeout |
| `SEGMENT_TYPE_IMMUTABLE` | update пытается изменить MANUAL/DYNAMIC type |
| `SEGMENT_QUERY_REQUIRED` | DYNAMIC create/update не содержит non-empty query |
| `SEGMENT_QUERY_NOT_ALLOWED` | MANUAL segment получил query/definition |

Каждая syntax/semantic diagnostic должна указывать source range. Ошибки
referenced entities дополнительно указывают attribute/parameter и array index.

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
  DSL version;
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
- dates, datetimes и relative dates;
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
- aggregate `count`/`sum_*` на пустом filtered set;
- mandatory Store currency filter для function money parameters;
- mismatch persisted/trusted Store evaluation context fail closed;
- отсутствующая statistics row;
- `first_order_date`, `last_order_date` и `completed_date` используют
  `completed_at`, а не `created_at`;
- Date/timestamptz predicate использует UTC half-open bounds без function wrapper
  над indexed column.

### Physical indexes

- каждый `AVAILABLE` descriptor имеет существующие normalization columns и все
  indexes своего `indexContract`;
- scalar/list/statistics/function queries используют ожидаемые indexes на
  representative `EXPLAIN` fixtures без `ANALYZE` в request path;
- отсутствие обязательного index/column не позволяет registry объявить
  attribute `AVAILABLE`;
- background page timeout остается retryable и не публикует generation.

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

### Store context changes

- Store API не допускает currency/exponent change после создания Store;
- ошибочное currency-change event переводит money-dependent segments в
  `FAILED`, не меняя context snapshot и не выбирая новую statistics row;
- timezone change пересобирает зависимые Date predicates;
- timezone change также пересобирает tax list predicates с calendar validity;
- старый context snapshot никогда не компилируется с новым Store context;
- invalid query после context change остается fail closed со status `FAILED`.

## 28. Рекомендуемый порядок реализации

1. Создать package `packages/customer-segment-dsl` с AST, Zod schemas, Peggy
   grammar, generated parser, normalizer и printer.
2. Добавить write-time normalization columns и обязательные scalar/list/date/
   statistics/function indexes, затем реализовать profile, address, consent,
   classification и aggregate statistics registry. Descriptor остается
   `UNAVAILABLE`, пока его physical contract не готов.
3. Подключить parse/semantic validation к segment create/update scripts.
4. Сделать type immutable, а `definition` server-generated и read-only для
   GraphQL input; удалить старый mixed write contract одним release.
5. Реализовать Drizzle compilers `compileCustomerMatch`,
   `compileSegmentMembers` и exhaustive `compileStoreCustomers`.
6. Добавить validation и preview GraphQL operations.
7. Сохранять extracted dependencies и реализовать атомарные invalidation +
   targeted reevaluation в transaction принятия owned state/projection.
8. Добавить durable bulk materialization по `definition_revision` и
   `evaluation_generation`, materialization status,
   `customer_segment_evaluation_state` и единый per-customer locking protocol.
9. Добавить отдельные durable `customer_segment_temporal_schedule` и
   `customer_segment_reevaluation_queue`: первая выполняет atomic boundary
   replacement, вторая — watermark/idempotency/claim semantics; temporal
   materialization использует exhaustive scan.
10. Реализовать Admin visual builder поверх attribute registry и advanced text
    editor поверх canonical query.
11. Добавить purchase line projection и включить `products_purchased`.
