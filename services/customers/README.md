# Customers Service

Customers Service — bounded context для управления покупателями внутри
конкретного Store. Сервис хранит бизнес-профиль покупателя, адреса, налоговые
данные, маркетинговые согласия, классификацию и агрегированную статистику.

## Границы ответственности

Customers не является сервисом аутентификации. Credentials, пароли, sessions,
verification tokens и login identity принадлежат IAM. Поле
`customer.iam_principal_id` только связывает бизнес-профиль покупателя с IAM
principal и может быть `NULL` для гостя или импортированного клиента.

Orders остается источником истины для заказов, Payments — для платежей и
денежных ledger, Media — для файлов. Customers хранит только ссылки на сущности
этих сервисов без cross-service foreign keys.

Все данные являются store-scoped: каждая таблица содержит `store_id`, а
репозитории обязаны получать Store из доверенного request context.

## Сущности

### Профиль покупателя

| Сущность | Назначение |
| --- | --- |
| `customer` | Основная бизнес-сущность покупателя. Хранит имя, контактные проекции, дату рождения, locale, компанию, merchant note, moderation note, причину текущего отключения, источник создания и lifecycle-состояние. Поддерживает guest, invited и registered профили, блокировку, redaction и ссылку на результат merge. Email и verification state здесь являются проекцией; login identity остается в IAM. |

`customer.lifecycle_status` описывает состояние бизнес-профиля:

- `active` — профиль доступен для обычных операций;
- `disabled` — покупатель заблокирован на уровне магазина; непустая причина отключения обязательна;
- `merged` — профиль объединен с другим Customer;
- `redacted` — персональные данные обезличены по privacy workflow.

`customer.account_status` отделен от lifecycle:

- `guest` — профиль не связан с IAM account;
- `invited` — покупателю предложено создать или активировать account;
- `registered` — профиль связан с зарегистрированным principal.

### Адреса

| Сущность | Назначение |
| --- | --- |
| `customer_address` | Многоразовый почтовый адрес покупателя: получатель, компания, телефон, две строки адреса, город, регион, индекс и страна. Один адрес может быть default shipping, default billing или обоими. Также хранит результат валидации и опциональные координаты. |

У Customer может быть любое количество адресов, но partial unique indexes
разрешают не более одного активного default shipping и одного default billing
адреса.

### Налоговые данные

| Сущность | Назначение |
| --- | --- |
| `customer_tax_identifier` | Налоговые номера покупателя или компании, например VAT ID. Хранит тип, страну, исходное и нормализованное значение, verification status и период действия. Один идентификатор можно отметить основным. |
| `customer_tax_exemption` | Налоговые льготы и освобождения. Хранит код exemption, jurisdiction, причину, статус, срок действия и ссылку на подтверждающий файл в Media. |

Идентификаторы и exemptions разделены: налоговый номер сам по себе не означает,
что Customer освобожден от налога.

### Маркетинговые согласия

| Сущность | Назначение |
| --- | --- |
| `customer_consent` | Текущее состояние согласия по одному каналу: email, SMS, WhatsApp или push. Хранит contact point, состояние подписки, opt-in level, источник, время согласия и время отзыва. |
| `customer_consent_event` | История изменений consent. Фиксирует предыдущее и новое состояние, источник, actor, request/idempotency keys и evidence. Используется для аудита и подтверждения того, где и когда было получено согласие. |

Consent не хранится одним boolean. Состояния `pending`, `subscribed`,
`unsubscribed`, `invalid` и `redacted` позволяют корректно обрабатывать double
opt-in, отзыв согласия и удаление персональных данных.

### Группы, теги и сегменты

| Сущность | Назначение |
| --- | --- |
| `customer_group` | Управляемая магазином бизнес-группа, например `retail`, `wholesale` или `vip`. Может использоваться pricing, tax и promotion policies. Store может иметь одну default group. |
| `customer_group_membership` | Связь Customer с группой. Хранит основной статус membership, источник назначения, автора и срок действия. Модель допускает несколько групп, но только одну активную primary group. |
| `customer_tag` | Свободная merchant-метка, например `influencer`, `fraud-review` или `newsletter-2026`. Имеет нормализованное уникальное имя внутри Store. |
| `customer_tag_assignment` | Связь Customer с тегом и информация о том, кто и когда назначил тег. |
| `customer_segment` | Сохраненная аудитория покупателей. Manual segment заполняется явно, dynamic segment содержит query или JSON rule definition для вычисления участников. Может иметь merchant-selected цвет и aggregate revision для optimistic locking определения и memberships. |
| `customer_segment_membership` | Материализованное участие Customer в сегменте. Хранит источник вычисления, время evaluation и опциональный срок действия. |

Эти понятия не взаимозаменяемы:

- group — стабильная бизнес-классификация, способная влиять на правила магазина;
- tag — простая ручная метка без собственной бизнес-логики;
- segment — аудитория для поиска, аналитики, promotions и marketing campaigns.

### Интеграции

| Сущность | Назначение |
| --- | --- |
| `customer_external_reference` | Связывает Customer с идентификатором во внешней CRM, ERP, marketplace или legacy-системе. Используется для идемпотентного import/upsert и предотвращает создание дубликатов при синхронизации. |

### Статистика

| Сущность | Назначение |
| --- | --- |
| `customer_statistics` | Восстанавливаемая read model со счетчиками заказов и возвратов, первым/последним заказом и последним checkout. Источником истины остаются Orders и Checkout. |
| `customer_monetary_statistics` | Восстанавливаемая read model с количеством заказов, spent/refunded/net totals и average order value отдельно по каждой валюте. Денежные значения хранятся в minor units. |

Статистика предназначена для customer list, сортировки, RFM-сегментации и
marketing rules. Ее можно пересобрать из событий других bounded contexts.

### Lifecycle и privacy

| Сущность | Назначение |
| --- | --- |
| `customer_merge` | Идемпотентный workflow объединения дубликатов. Хранит source и target Customer, статус, инициатора, resolution, ошибки и временные метки. После успешного merge исходный профиль получает lifecycle `merged`. |
| `customer_data_request` | Workflow обработки privacy-запросов: access, export, correction и erasure. Хранит статус, requester, legal basis, deadline, результат в Media и причину отклонения. |

Merge и erasure представлены отдельными workflow-сущностями, чтобы операции
можно было повторять безопасно, отслеживать и аудитировать.

## Основные инварианты

- Активный normalized email уникален внутри Store.
- Один IAM principal связан максимум с одним Customer внутри Store.
- Guest Customer может существовать без IAM principal.
- Customer не может быть merged сам в себя.
- Disabled Customer всегда имеет причину; у остальных lifecycle-состояний причины отключения нет.
- Один адрес может одновременно быть default shipping и default billing.
- Consent state должен соответствовать timestamps согласия и отзыва.
- Monetary statistics не допускает отрицательные суммы и сохраняет
  `net = spent - refunded`.
- UUID-идентификаторы генерируются PostgreSQL-функцией `uuidv7()`.
- Segment revision изменяется при обновлении определения и ручного membership.

## Admin update contract

`customerUpdate` принимает один `customerId`, опциональный `expectedRevision`
и набор атомарных секций. Помимо profile/contact/company/status/note/moderation,
операция поддерживает addresses, consent transitions, tax identifiers, tax
exemptions, group memberships, tag assignments и manual segment memberships.
Вложенные inputs не содержат `customerId`: все идентификаторы проверяются как
принадлежащие обновляемому Customer и текущему Store.

Секции assignments используют replace semantics. Пустые `tagIds`, `segmentIds`
или `memberships` очищают соответствующие ручные связи. Отсутствующая секция не
изменяет данные. Любая ошибка секции откатывает весь `customerUpdate`.

`customerSegmentUpdate` аналогично может атомарно изменить definition metadata
и заменить manual customer memberships под одним `expectedRevision`. Отдельный
`customerSegmentCustomersSet` используется для membership-only обновлений.
- `store_id` не входит в primary и foreign keys; tenant isolation обеспечивается
  обязательным store scope и отдельными индексами.

## Структура миграций

Миграции находятся в `migrations/domains/**/*.sql` и выполняются
`node-pg-migrate` в glob mode. Порядок доменов:

1. foundation и enum types;
2. profiles;
3. addresses;
4. tax;
5. marketing consent;
6. classification;
7. integrations;
8. statistics read models;
9. lifecycle и privacy.

Drizzle runtime-модели находятся в `src/repositories/models/` и повторяют
контракт handwritten SQL migrations.

Подробные технические решения и ограничения описаны в
[docs/customers-database-schema.md](docs/customers-database-schema.md).

## Инфраструктура сервиса

Customers использует те же инфраструктурные соглашения, что Catalog и Listing:

- NestJS module и bootstrap integration;
- handwritten PostgreSQL migrations через `node-pg-migrate`;
- Drizzle runtime schema и transaction-aware repository aggregator;
- request context, kernel, loaders и script entry points;
- class-based Admin GraphQL server, resolver namespaces и codegen.
