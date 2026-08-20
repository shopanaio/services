# Pricing Service

Pricing Service — bounded context для управления скидками и учетом их использования внутри
конкретного Store.

Текущая схема покрывает четыре вида скидок:

- скидка на товары;
- Buy X Get Y;
- скидка на заказ;
- бесплатная доставка.

Расчет базовых цен товаров остается ответственностью Catalog. Checkout запрашивает применимые скидки
и резервирует доступный лимит, а Orders получает зафиксированный результат применения скидки.
Pricing не создает foreign keys на сущности других сервисов.

## Tenant scope

Все сущности содержат `store_id`. Значение Store должно приходить из доверенного request context и
обязательно использоваться во всех repository queries.

`store_id` не входит в primary и foreign keys. Связи между сущностями строятся по стабильным
UUIDv7-идентификаторам. Для tenant-scoped поиска и уникальности используются отдельные индексы и
unique constraints.

## Агрегат скидки

### `discount`

Корневая сущность агрегата. Определяет тип скидки, способ активации, жизненный цикл, расписание и
общие ограничения.

Основные поля:

| Поле                           | Назначение                                                       |
| ------------------------------ | ---------------------------------------------------------------- |
| `method`                       | Способ активации: `CODE` или `AUTOMATIC`.                        |
| `kind`                         | Конкретный сценарий скидки.                                      |
| `discount_class`               | Класс применения: `PRODUCT`, `ORDER` или `SHIPPING`.             |
| `state`                        | Состояние конфигурации: `DRAFT`, `ACTIVE`, `PAUSED`, `ARCHIVED`. |
| `currency`                     | Валюта проекта на момент создания конфигурации.                  |
| `priority`                     | Порядок обработки конкурирующих скидок.                          |
| `usage_limit`                  | Общий лимит использований; `NULL` означает отсутствие лимита.    |
| `applies_once_per_customer`    | Ограничивает применение одним использованием на покупателя.      |
| `applies_on_one_time_purchase` | Разрешает применение к разовой покупке.                          |
| `applies_on_subscription`      | Разрешает применение к подписке.                                 |
| `starts_at`, `ends_at`         | Период действия скидки.                                          |
| `revision`                     | Версия агрегата для optimistic concurrency.                      |

Соответствие `kind` и `discount_class`:

| Kind                  | Class      | Подтип правила           |
| --------------------- | ---------- | ------------------------ |
| `AMOUNT_OFF_PRODUCTS` | `PRODUCT`  | `discount_amount_off`    |
| `BUY_X_GET_Y`         | `PRODUCT`  | `discount_buy_x_get_y`   |
| `AMOUNT_OFF_ORDER`    | `ORDER`    | `discount_amount_off`    |
| `FREE_SHIPPING`       | `SHIPPING` | `discount_free_shipping` |

### `discount_code`

Код активации скидки. Исходное значение хранится в `code`, а `normalized_code` формируется как
`upper(trim(code))` и уникально внутри Store. Код может иметь собственный лимит использований и быть
отключен без удаления.

Автоматические скидки не используют эту сущность. Одна code-based скидка может иметь несколько
кодов, например для массовой кампании.

### `discount_tag`

Свободная merchant-метка для поиска и организации скидок. Нормализованное значение формируется как
`lower(trim(tag))` и уникально внутри одной скидки.

## Правила расчета

### `discount_amount_off`

Конфигурация скидки на товары или на заказ.

- `operation` всегда равен `DECREASE` и использует общий price-adjustment контракт;
- `PERCENTAGE` хранится в basis points: `10000` означает 100%;
- `FIXED_AMOUNT` хранится в minor units;
- `allocation_method` определяет применение значения к каждому target или распределение общей суммы;
- `maximum_discount_minor` ограничивает максимальную сумму процентной скидки.

### `discount_buy_x_get_y`

Описывает условие покупки и предоставляемую выгоду.

- условие задается количеством или минимальной суммой;
- `benefit_strategy = ADJUSTMENT` использует `DECREASE` и общий `PERCENTAGE`/`FIXED_AMOUNT`
  контракт;
- `benefit_strategy = FREE` не содержит operation, value type или значения;
- выгода задается количеством единиц;
- значение выгоды может быть процентным, фиксированным или бесплатным;
- `uses_per_order_limit` ограничивает число применений правила в одном заказе.

### `discount_free_shipping`

Конфигурация бесплатной доставки. Сейчас содержит только `maximum_shipping_price_minor`: если поле
задано, скидка применяется только к доставке, стоимость которой не превышает этот лимит.

Ограничения по странам намеренно не входят в текущую модель и будут проектироваться отдельно.

### `discount_minimum_requirement`

Необязательное минимальное условие применения обычной скидки:

- `SUBTOTAL` — минимальная сумма в minor units;
- `QUANTITY` — минимальное количество товаров.

Buy X Get Y хранит собственное условие покупки и не использует эту сущность.

## Таргетинг товаров

### `discount_target_selection`

Определяет одну выборку товаров для скидки.

| Поле          | Значения                                                                          |
| ------------- | --------------------------------------------------------------------------------- |
| `role`        | `QUALIFIER` — товары, выполняющие условие; `BENEFIT` — товары, получающие скидку. |
| `target_type` | `ALL_PRODUCTS`, `PRODUCTS`, `VARIANTS`, `CATEGORIES`.                             |

Для скидки на товары используется `BENEFIT`. Buy X Get Y использует две выборки: `QUALIFIER` и
`BENEFIT`.

### `discount_target`

Содержит конкретный `product`, `variant` или `category` ID для selection. Catalog остается
владельцем этих идентификаторов, поэтому cross-service FK не создается.

`reference_status` позволяет пометить ссылку как `STALE`, если Catalog сообщил об удалении или
недоступности сущности, не уничтожая конфигурацию скидки.

## Покупатели и доступность

### `discount_buyer_context`

Определяет аудиторию скидки:

- `ALL` — все покупатели;
- `CUSTOMERS` — выбранные покупатели;
- `SEGMENTS` — выбранные customer segments.

### `discount_eligible_customer`

Связывает скидку с Customer. `customer_id` принадлежит Customers Service и не имеет cross-service
FK. Для долгоживущих ссылок хранится `reference_status`.

### `discount_eligible_segment`

Связывает скидку с сегментом Customers Service. Использует тот же механизм `VALID`/`STALE`, что и
ссылки на покупателей.

### `discount_channel`

Указывает sales channels, в которых доступна скидка. `channel_code` является открытым строковым
идентификатором и может представлять как first-party channel, так и канал приложения. `is_featured`
— отдельный presentation-признак.

### `discount_combination_class`

Список классов скидок, с которыми может комбинироваться текущая скидка. Отсутствие строки означает
запрет комбинации с соответствующим классом. При расчете пары скидок совместимость должна
подтверждаться обеими сторонами.

## Учет использования

### `discount_usage_counter`

Транзакционная проекция общего использования скидки:

- `reserved_count` — активные checkout reservations;
- `committed_count` — зафиксированные применения;
- `reversed_count` — отмененные применения;
- `version` — версия строки для конкурентного обновления.

### `discount_code_usage_counter`

Аналогичный счетчик на уровне отдельного redeem code. Используется вместе с общим счетчиком скидки.

Перед созданием reservation Pricing должен заблокировать обе применимые строки счетчиков, проверить
лимиты и обновить счетчики в одной транзакции.

### `discount_usage_reservation`

Временный резерв использования скидки для Checkout. Предотвращает превышение лимита параллельными
checkout flows.

Состояния reservation:

- `ACTIVE` — лимит зарезервирован;
- `COMMITTED` — резерв преобразован в redemption;
- `RELEASED` — Checkout освободил резерв;
- `EXPIRED` — срок резерва истек.

`checkout_id`, `customer_id` и `idempotency_key` позволяют безопасно повторять операции и находить
reservations без cross-service связей.

### `discount_redemption`

Фиксирует применение скидки к заказу. Помимо ссылок на discount, code, reservation, checkout и order
хранит класс и revision конфигурации, currency, итоговую сумму, время применения или отмены и
причину reversal. Отображаемые title и code читаются из связанных сущностей и отдельно не
снапшотятся.

Уникальность по Store, Discount и Order защищает от повторного применения одной скидки к одному
заказу.

### `discount_redemption_allocation`

Разбивает итоговую сумму redemption по объектам заказа:

- `ORDER` — скидка на весь заказ;
- `ORDER_LINE` — скидка на строку заказа;
- `SHIPPING_LINE` — скидка на строку доставки.

Для line allocation хранится внешний `target_id`, количество и сумма в minor units.

## Интеграции

### `discount_external_reference`

Связывает скидку с сущностью внешней promotion, marketplace или legacy-системы. Хранит направление
синхронизации, status, etag/checksum, последнюю ошибку и soft-delete timestamp.

## Read models

| View                          | Назначение                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `discount_list_view`          | Список скидок для Admin: вычисленный status, основной код, счетчики, теги, каналы и комбинации. |
| `discount_configuration_view` | Полная проекция конфигурации скидки со subtype, targets, buyer context, codes и channels.       |
| `discount_usage_summary_view` | Общий reserved, committed, reversed, consumed и remaining usage.                                |
| `discount_code_list_view`     | Список кодов с usage counters и оставшимся лимитом.                                             |

`effective_status` вычисляется из lifecycle state и расписания:

- `DRAFT`, `PAUSED`, `ARCHIVED` следуют явному состоянию;
- `SCHEDULED` означает, что `starts_at` еще не наступил;
- `EXPIRED` означает, что `ends_at` уже наступил;
- иначе скидка считается `ACTIVE`.

## Денежные значения

Все суммы хранятся в целых minor units через PostgreSQL `bigint`. Проценты хранятся в basis points.
Floating-point значения для денежных расчетов не используются.

Каждая скидка сохраняет default currency проекта на момент создания. Pricing должен нормализовать
входные суммы к валюте проекта до выполнения расчета.

## Ответственность приложения

В migrations отсутствуют database triggers. Сервисный слой обязан атомарно проверять и сохранять
бизнес-инварианты, включая:

- соответствие kind, class и rule subtype;
- полноту недрафтовой конфигурации;
- наличие codes, targets, buyer context и channels, когда они обязательны;
- tenant ownership всех переданных идентификаторов;
- доступность aggregate и code usage limits;
- допустимость переходов reservation и redemption;
- равенство суммы allocations итоговой сумме redemption;

## Структура миграций

Handwritten PostgreSQL migrations находятся в `migrations/domains/**/*.sql` и выполняются через
`node-pg-migrate` в glob mode.

| Диапазон | Содержимое                                         |
| -------- | -------------------------------------------------- |
| `0000`   | Schema и enum types.                               |
| `0100`   | Discount aggregate, codes и tags.                  |
| `0200`   | Rule subtypes и minimum requirements.              |
| `0300`   | Catalog target selections.                         |
| `0400`   | Buyer contexts, customers и segments.              |
| `0500`   | Sales channels.                                    |
| `0600`   | Discount combinations.                             |
| `0700`   | Counters, reservations, redemptions и allocations. |
| `0900`   | External references.                               |
| `9000`   | Read views.                                        |

Дополнительные проектные решения описаны в
[`docs/discounts-database-design.md`](docs/discounts-database-design.md).
