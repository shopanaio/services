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

### 5.4 Boolean

```text
TRUE
FALSE
```

### 5.5 IDs

Entity references задаются GraphQL Global ID как строка:

```sql
customer_tags CONTAINS 'gid://shopana/CustomerTag/019...'
```

Semantic analyzer проверяет ожидаемый entity type, декодирует Global ID и
помещает внутренний UUID в canonical AST. Названия entities не являются
идентичностью правила и используются Admin только как presentation metadata.

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

Canonical printer обязан добавлять скобки, если они делают порядок выполнения
явным.

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

| Operator | String | Enum | Boolean | Integer | Decimal/Money | Date/Datetime | ID |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `=` | yes | yes | yes | yes | yes | yes | yes |
| `!=` | yes | yes | yes | yes | yes | yes | yes |
| `>` | no | no | no | yes | yes | yes | no |
| `>=` | no | no | no | yes | yes | yes | no |
| `<` | no | no | no | yes | yes | yes | no |
| `<=` | no | no | no | yes | yes | yes | no |
| `BETWEEN ... AND ...` | no | no | no | yes | yes | yes | no |
| `IN (...)` | yes | yes | yes | yes | no | no | yes |
| `NOT IN (...)` | yes | yes | yes | yes | no | no | yes |
| `IS NULL` | attribute-specific | attribute-specific | no | attribute-specific | attribute-specific | yes | attribute-specific |
| `IS NOT NULL` | attribute-specific | attribute-specific | no | attribute-specific | attribute-specific | yes | attribute-specific |

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
customer_tags CONTAINS 'gid://shopana/CustomerTag/a'
AND customer_tags CONTAINS 'gid://shopana/CustomerTag/b'
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
  date >= -90d
)
```

Параметры разделяются запятыми и относятся к одной function scope. Запятая
означает `AND`. `OR`, `NOT` и вложенные functions внутри parameter list в v1 не
поддерживаются.

Operators:

| Operator | Семантика |
| --- | --- |
| `MATCHES` | function condition имеет хотя бы один matching result |
| `NOT_MATCHES` | точный boolean complement `MATCHES` |
| `IS NULL` | relation/event этого вида отсутствует вообще |
| `IS NOT NULL` | relation/event этого вида существует |

`NOT MATCHES` принимается parser как alias, но canonical printer всегда выводит
`NOT_MATCHES`.

Function registry определяет разрешенные parameters, их типы, operators и
aggregate semantics. Неизвестные и повторяющиеся parameters являются semantic
error.

## 11. Поддерживаемые attributes v1

Колонка `Dependency` используется для event-driven reevaluation.

### 11.1 Customer profile

| Attribute | Type | Operators | Source | Dependency |
| --- | --- | --- | --- | --- |
| `customer_added_date` | Date | comparisons, `BETWEEN` | `customer.created_at` | `profile` |
| `customer_updated_date` | Date | comparisons, `BETWEEN` | `customer.updated_at` | `profile` |
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
| `first_order_date` | Date | date, null | first completed order | `statistics.order` |
| `last_order_date` | Date | date, null | last completed order | `statistics.order` |
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
DSL.

Отсутствующая statistics row трактуется как нулевые counters/money и `NULL` для
dates. Поэтому:

```sql
number_of_orders = 0
```

включает customers, для которых statistics row еще не создана.

### 11.6 Tax status

| Attribute | Type | Operators | Source | Dependency |
| --- | --- | --- | --- | --- |
| `tax_identifier_statuses` | List<Enum> | list operators | active tax identifiers | `taxIdentifier` |
| `tax_exemption_statuses` | List<Enum> | list operators | active tax exemptions | `taxExemption` |
| `tax_exemption_countries` | List<String> | list operators | active tax exemptions | `taxExemption` |

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
  date >= -90d,
  sum_amount >= 500
)
```

| Parameter | Type | Operators | Значение |
| --- | --- | --- | --- |
| `status` | Enum | `=`, `!=`, `IN`, `NOT IN` | `OPEN`, `COMPLETED`, `CANCELLED` |
| `date` | Date | date comparisons, `BETWEEN` | `customer_order_projection.created_at` |
| `amount` | Money | numeric, `BETWEEN` | amount одного matching order |
| `count` | Integer aggregate | numeric, `BETWEEN` | число matching orders |
| `sum_amount` | Money aggregate | numeric, `BETWEEN` | сумма matching orders |

Rules:

1. `status`, `date` и `amount` фильтруют source rows до aggregation.
2. `count` и `sum_amount` проверяются после фильтрации.
3. Без aggregate parameters `MATCHES` компилируется как `EXISTS`.
4. С aggregate parameters compiler использует correlated aggregate subquery и
   `HAVING`-эквивалент.
5. Если `status` отсутствует, участвуют все order statuses.
6. `sum_amount` не вычитает refunds; для net all-time spend используется
   `amount_spent`.
7. `IS NULL`/`IS NOT NULL` проверяют наличие любой order projection без
   parameters.

### 12.2 `products_purchased`

```sql
products_purchased MATCHES (
  product_id = 'gid://shopana/Product/019...',
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
  readonly temporal: boolean;
}

type SegmentExpression =
  | SegmentLogicalExpression
  | SegmentNotExpression
  | SegmentPredicateExpression
  | SegmentFunctionExpression;

interface SegmentLogicalExpression {
  readonly kind: "logical";
  readonly operator: "and" | "or";
  readonly children: readonly SegmentExpression[];
}

interface SegmentNotExpression {
  readonly kind: "not";
  readonly child: SegmentExpression;
}

interface SegmentPredicateExpression {
  readonly kind: "predicate";
  readonly attribute: string;
  readonly operator: SegmentPredicateOperator;
  readonly value?: SegmentValue | readonly SegmentValue[];
  readonly upperValue?: SegmentValue;
}

interface SegmentFunctionExpression {
  readonly kind: "function";
  readonly name: string;
  readonly operator: "matches" | "not_matches" | "is_null" | "is_not_null";
  readonly parameters: readonly SegmentFunctionParameter[];
}
```

Typed values являются tagged objects, а не untyped JSON primitives:

```json
{
  "kind": "money",
  "minor": "50000"
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

AST normalization:

1. identifiers и enum values приводятся к canonical case;
2. nested `and` и `or` сливаются в один node;
3. logical children сохраняют пользовательский порядок для diagnostics и
   printer;
4. singleton logical node заменяется child;
5. double negation удаляется;
6. `NOT MATCHES` нормализуется в `not_matches`;
7. значения `IN` deduplicate с сохранением первого порядка;
8. money конвертируется в minor-unit decimal string;
9. Global IDs декодируются и типизируются;
10. dependencies извлекаются из validated AST.

AST не содержит SQL identifiers, table names, Drizzle objects или compiled SQL.

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
FunctionClause     ::= FunctionName (MATCHES | NOT_MATCHES) "(" Parameters? ")"
                     | FunctionName IS (NULL | NOT NULL)
Parameters         ::= Parameter ("," Parameter)*
Parameter          ::= Identifier ParameterOperator Value
                     | Identifier BETWEEN Value AND Value
                     | Identifier (IN | NOT IN) "(" ValueList ")"
ValueList          ::= Value ("," Value)*
Value              ::= String | Number | Boolean | Date | DateTime
                     | NamedDate | RelativeDate
```

Parser отвечает только за syntax и source locations. Он не решает, существует
ли attribute, применим ли operator и имеет ли enum допустимое значение.

Enum и entity ID values передаются как `String`. Bare identifiers в position
value запрещены, кроме нормативных `TRUE`, `FALSE`, `today`, `yesterday` и
relative date tokens. Lexer обязан проверять Date/DateTime/RelativeDate до
обычного Number, чтобы `+30d` или `2026-08-16` не разбирались частично.

Generated parser создается build-time из `.peggy`; runtime generation grammar и
`eval` запрещены.

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
  normalize(value: ParsedValue, context: SegmentSemanticContext): SegmentValue;
  compile(
    predicate: SegmentPredicateExpression,
    context: SegmentSqlCompileContext,
  ): SQL;
}
```

Function registry использует аналогичный descriptor с отдельными parameter
descriptors.

Registry является единственным местом, где DSL name связывается с Drizzle
columns/tables. Пользовательский identifier никогда не интерполируется как SQL
identifier.

## 18. Drizzle SQL compilation

Из одного validated AST строятся два режима:

```ts
compileCustomerMatch(definition, customerId, effectiveAt)
compileSegmentMembers(definition, cursor, limit, effectiveAt)
```

Они обязаны использовать одни attribute compilers и иметь одинаковую
семантику.

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
- Counters с отсутствующей statistics row используют `COALESCE(..., 0)`.
- Money использует bigint/numeric-safe values, не JavaScript number.
- `NOT_MATCHES` компилируется как `NOT (MATCHES expression)`, а не как инверсия
  отдельных parameters.

## 19. Complexity limits

Лимиты v1:

| Limit | Значение |
| --- | ---: |
| query UTF-8 bytes | 8 192 |
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

Максимальный score ACTIVE segment — 40. Limits применяются после normalization,
но до SQL compilation. Они являются configuration constants DSL version, а не
merchant-editable Store settings.

Preview дополнительно использует statement timeout и ограниченный result set.
Timeout возвращает user error и не активирует segment.

## 20. Temporal rules

Relative dates и `birthday` делают membership зависимым от времени даже без
domain event.

Semantic analyzer помечает definition как `temporal`. Evaluator обязан
рассчитать ближайший `next_change_at`:

- для matching customer — момент, когда predicate может стать false;
- для non-matching customer — момент, когда predicate может стать true;
- для нескольких temporal clauses — минимальный безопасный boundary.

`customer_segment_membership.expires_at` может обслуживать простой переход
`true -> false`, но его недостаточно для `false -> true`, например birthday в
будущем. Для общей реализации нужна owned evaluation queue:

```text
customer_segment_evaluation_queue(
  store_id,
  segment_id,
  customer_id,
  definition_revision,
  evaluate_at
)
```

Relative calendar-date rules пересчитываются не позднее начала следующего дня
в timezone Store. DST не должен создавать пропущенный или двойной transition.

## 21. Materialization semantics

Dynamic segment membership материализуется в
`customer_segment_membership` со следующими значениями:

```text
source = RULE
evaluated_definition_revision = customer_segment.definition_revision
evaluated_at = effectiveAt
expires_at = calculated true -> false boundary, если он известен
```

### 21.1 Definition change

Изменение canonical query/AST:

1. увеличивает `definition_revision`;
2. делает предыдущие RULE memberships stale немедленно;
3. сохраняет fail-closed checkout semantics;
4. запускает durable bulk materialization новой revision;
5. не изменяет MANUAL memberships других segments.

### 21.2 Customer event

`customerUpdated.reasons` и `customerStatisticsUpdated.reasons` сопоставляются с
извлеченными dependencies. Пересчитываются только подходящие ACTIVE DYNAMIC
segments для затронутого customer.

Reevaluation выполняет:

```text
match     -> upsert current RULE membership
not match -> delete RULE membership for customer + segment
```

Derived RULE reevaluation не увеличивает merchant-facing
`customer_segment.revision`, иначе фоновые события будут создавать постоянные
optimistic concurrency conflicts в Admin.

### 21.3 Counts и reads

`customersCount`, segment members preview и все eligibility reads считают RULE
membership current только когда одновременно выполняются:

```text
segment.status = ACTIVE
segment.deleted_at IS NULL
membership.source != RULE
  OR membership.evaluated_definition_revision = segment.definition_revision
membership.evaluated_at <= effectiveAt
membership.expires_at IS NULL OR membership.expires_at > effectiveAt
```

## 22. GraphQL contract

Рекомендуемый write contract:

```graphql
input CustomerSegmentDefinitionUpdateInput {
  type: CustomerSegmentType
  query: String
}
```

`definition: JSON!` и `definitionRevision: Int!` являются read-only fields.

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
| `SEGMENT_INVALID_DATE_RANGE` | lower boundary позже upper boundary |
| `SEGMENT_INVALID_MONEY` | amount нельзя точно представить в Store currency |
| `SEGMENT_DUPLICATE_PARAMETER` | function parameter повторяется |
| `SEGMENT_COMPLEXITY_LIMIT` | превышен structural limit или score |
| `SEGMENT_PREVIEW_TIMEOUT` | bounded preview превысил timeout |

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
  product_id = 'gid://shopana/Product/019...',
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

## 27. Тестовый контракт

### Parser

- precedence и parentheses;
- keywords в разном регистре;
- escaped strings;
- dates, datetimes и relative dates;
- source ranges для invalid query;
- canonical parse -> print -> parse round trip.

### Semantic analyzer

- operator/type matrix;
- enum domains;
- Global ID type и Store scope;
- money conversion;
- duplicate parameters;
- complexity limits;
- unavailable attributes.

### SQL compiler

- обязательный store scope;
- только bound values;
- NULL truth table;
- `CONTAINS`/`NOT CONTAINS` через `EXISTS`/`NOT EXISTS`;
- date boundaries в Store timezone;
- aggregate function filters до aggregation;
- отсутствующая statistics row.

### Evaluation parity

Для набора fixtures результаты должны совпадать между:

1. preview;
2. `compileSegmentMembers`;
3. `compileCustomerMatch` для каждого customer;
4. materialized current memberships.

### Temporal behavior

- DST forward/backward transition;
- month/year offset на конце месяца;
- birthday через конец года;
- 29 февраля;
- membership expiry boundary является exclusive.

## 28. Рекомендуемый порядок реализации

1. Создать package `packages/customer-segment-dsl` с AST, Zod schemas, Peggy
   grammar, generated parser, normalizer и printer.
2. Реализовать profile, address, consent, classification и aggregate statistics
   registry.
3. Подключить parse/semantic validation к segment create/update scripts.
4. Сделать `definition` server-generated и read-only для GraphQL input.
5. Реализовать Drizzle compilers `compileCustomerMatch` и
   `compileSegmentMembers`.
6. Добавить validation и preview GraphQL operations.
7. Сохранять extracted dependencies и заменить invalidate-only обработчик на
   targeted reevaluation.
8. Добавить durable bulk materialization по `definition_revision`.
9. Добавить temporal evaluation queue.
10. Реализовать Admin visual builder поверх attribute registry и advanced text
    editor поверх canonical query.
11. Добавить purchase line projection и включить `products_purchased`.
