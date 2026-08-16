# Customers Admin API — E2E test cases

Полный перечень контрактных E2E-сценариев для `customers-admin`. Заголовок каждого пункта — готовая строка для `test()`. Тесты должны обращаться через `api.admin`, проверять GraphQL transport errors отдельно от `userErrors`, всегда проверять `userErrors.field/code`, отсутствие частичной записи при ошибке и store isolation.

## `authorization-and-tenancy.spec.ts`

- `test('CST-ADM-SEC-001: unauthenticated actor cannot read Customers Admin API')` — Любой query возвращает `UNAUTHENTICATED` и не раскрывает customer data.
- `test('CST-ADM-SEC-002: unauthenticated actor cannot mutate Customers Admin API')` — Любая mutation отклоняется без изменения БД.
- `test('CST-ADM-SEC-003: user without customer read permission cannot query customers')` — Проверяет RBAC для list и single reads.
- `test('CST-ADM-SEC-004: user with customer read permission can query customers')` — Разрешённое минимальное чтение проходит.
- `test('CST-ADM-SEC-005: user without customer write permission cannot mutate customers')` — Create/update/delete и вложенные изменения запрещены.
- `test('CST-ADM-SEC-006: user with customer write permission can mutate customers')` — Разрешённая минимальная mutation проходит.
- `test('CST-ADM-SEC-007: classification permissions protect groups tags and segments')` — Group/tag/segment reads и writes требуют соответствующих разрешений.
- `test('CST-ADM-SEC-008: privacy permissions protect merges and data requests')` — Lifecycle/privacy operations закрыты от обычного staff.
- `test('CST-ADM-SEC-009: store A cannot read any customer-owned entity from store B')` — Customer, address, consent, tax, classification membership, merge и data request не раскрываются по foreign ID.
- `test('CST-ADM-SEC-010: store A cannot mutate any customer-owned entity from store B')` — Foreign IDs дают безопасный `NOT_FOUND`, данные обоих stores неизменны.
- `test('CST-ADM-SEC-011: changing an untrusted store selector cannot retarget Customers Admin context')` — Tenant берётся только из trusted gateway context.
- `test('CST-ADM-SEC-012: global IDs with the wrong entity type are rejected safely')` — Type-confused IDs дают `INVALID_ID`/null без runtime error.
- `test('CST-ADM-SEC-013: malformed global IDs are rejected safely')` — Случайные, пустые и повреждённые ID не приводят к 500.
- `test('CST-ADM-SEC-014: deleted entities are not returned by active reads')` — Soft-deleted records скрыты во всех query/loaders.
- `test('CST-ADM-SEC-015: admin responses do not expose authentication secrets or internal store IDs')` — Нет password hashes, tokens, OTP, provider secrets и raw tenancy columns.

## `relay-nodes.spec.ts`

- `test('CST-ADM-NODE-001: node resolves every supported customer entity type')` — Проверяет Customer, address, consent/event, tax records, comparison/items, external reference, group/membership, tag/assignment, segment/membership, merge и data request.
- `test('CST-ADM-NODE-002: nodes preserves input order and duplicate IDs')` — Результаты соответствуют позиции каждого входного ID.
- `test('CST-ADM-NODE-003: nodes returns null placeholders for missing malformed foreign and unsupported IDs')` — Частично невалидный batch не ломает валидные элементы.
- `test('CST-ADM-NODE-004: node does not resolve an entity from another store')` — Foreign entity выглядит как отсутствующая.

## `customer-accounts-settings.spec.ts`

- `test('CST-ADM-AUTH-001: admin reads customer account settings for the current store')` — Проверяет realm, registration mode, revision, все methods/providers и configured/enabled flags.
- `test('CST-ADM-AUTH-002: missing linked IAM application returns null settings without cross-store fallback')` — Конфигурация другого store не используется.
- `test('CST-ADM-AUTH-003: admin replaces enabled PASSWORD and EMAIL_OTP methods')` — Полная замена сохраняется в IAM и возвращает новую revision.
- `test('CST-ADM-AUTH-004: admin can disable every customer authentication method')` — Пустой список обрабатывается как валидная полная замена.
- `test('CST-ADM-AUTH-005: duplicate authentication methods are rejected')` — Возвращается `INVALID_INPUT`, revision не меняется.
- `test('CST-ADM-AUTH-006: PHONE_OTP is rejected while the method is not configured')` — Возвращается `METHOD_NOT_CONFIGURED`.
- `test('CST-ADM-AUTH-007: non-positive or unsafe expected revision is rejected')` — Ноль, отрицательное, дробное и unsafe integer дают field error.
- `test('CST-ADM-AUTH-008: stale customer account settings revision is rejected')` — Конкурирующее обновление не перезаписывается.
- `test('CST-ADM-AUTH-009: user without store profile write permission cannot update account settings')` — Возвращается `FORBIDDEN` без broker write.
- `test('CST-ADM-AUTH-010: IAM failure is mapped to safe userErrors')` — Ошибка зависимости не раскрывает внутренности и не выдаёт ложный success.

## `customer-create.spec.ts`

- `test('CST-ADM-CREATE-001: admin creates a minimal guest customer')` — Проверяет defaults, source `admin`, revision 1 и timestamps.
- `test('CST-ADM-CREATE-002: admin creates a customer with every supported profile field')` — Все profile/company/contact/note/moderation поля round-trip корректно.
- `test('CST-ADM-CREATE-003: customer display name is derived for full partial and contact-only profiles')` — Проверяет fallback-логику displayName.
- `test('CST-ADM-CREATE-004: email is normalized before uniqueness and persistence')` — Case/whitespace варианты дают каноническое значение.
- `test('CST-ADM-CREATE-005: duplicate active email in the same store is rejected')` — `DUPLICATE_EMAIL`, новая строка не создаётся.
- `test('CST-ADM-CREATE-006: the same normalized email can exist in another store')` — Уникальность строго store-scoped.
- `test('CST-ADM-CREATE-007: invalid phone is rejected with a field error')` — Проверяются не-E.164, пустое и гранично длинное значения.
- `test('CST-ADM-CREATE-008: oversized moderation note is rejected')` — `INVALID_MODERATION_NOTE`, atomic failure.
- `test('CST-ADM-CREATE-009: malformed email date locale and oversized strings are rejected by the GraphQL contract')` — Scalar/Zod validation возвращает стабильные ошибки.
- `test('CST-ADM-CREATE-010: two concurrent creates with the same email create exactly one customer')` — Один success, один deterministic duplicate error.

## `customer-query.spec.ts`

- `test('CST-ADM-QUERY-001: admin gets a customer by global ID with the complete aggregate')` — Проверяет profile, defaults, relations, statistics, comparison и external references.
- `test('CST-ADM-QUERY-002: admin gets a customer by normalized email')` — Lookup нечувствителен к допустимой нормализации.
- `test('CST-ADM-QUERY-003: missing customer and email return null')` — Несуществующие значения не являются transport errors.
- `test('CST-ADM-QUERY-004: customerByEmail never returns a customer from another store')` — Проверяет tenant isolation при одинаковых email.
- `test('CST-ADM-QUERY-005: customers returns an empty Relay connection')` — Пустые edges, null cursors, false page flags и `totalCount: 0`.
- `test('CST-ADM-QUERY-006: customers supports stable forward pagination')` — `first/after`, без дублей и пропусков.
- `test('CST-ADM-QUERY-007: customers supports stable backward pagination')` — `last/before` и корректный исходный порядок.
- `test('CST-ADM-QUERY-008: customers uses ID as a deterministic tie breaker')` — Одинаковые sort values дают повторяемые cursors.
- `test('CST-ADM-QUERY-009: customers totalCount reflects filters not page size')` — Count соответствует всему filtered set.
- `test('CST-ADM-QUERY-010: customers supports compound AND OR and NOT filters')` — Комбинация filter tree работает предсказуемо.
- `test('CST-ADM-QUERY-011: customers filters by identity lifecycle account and verification fields')` — id/principal/status/email/phone/verified/source покрыты.
- `test('CST-ADM-QUERY-012: customers filters by profile company locale and date fields')` — first/last/display/company/locale/date/activity/timestamps покрыты.
- `test('CST-ADM-QUERY-013: customers filters by default shipping geography and marketing state')` — Joined address/consent filters не дублируют customers.
- `test('CST-ADM-QUERY-014: customers filters by statistics spend and segment membership')` — orders/last order/total spent/segment filters корректны и store-scoped.
- `test('CST-ADM-QUERY-015: customers supports every declared order field in both directions')` — Табличный прогон всех `CustomerOrderField` с nulls и ties.
- `test('CST-ADM-QUERY-016: invalid cursor pagination combinations are rejected')` — `first+last`, `after+before`, отрицательные и over-limit sizes.
- `test('CST-ADM-QUERY-017: malformed foreign-type and filter-mismatched cursors are rejected safely')` — Cursor нельзя переиспользовать между connection/filter/order.
- `test('CST-ADM-QUERY-018: nested customer connections support filters ordering and both pagination directions')` — Addresses, tax, memberships и monetary statistics используют Relay contract.
- `test('CST-ADM-QUERY-019: batched nested relations do not leak or duplicate data across customers')` — Проверяет DataLoader isolation и ordering.

## `customer-update-profile.spec.ts`

- `test('CST-ADM-UPD-001: admin updates every customer profile section atomically')` — Profile, contact, company, note и moderation применяются одной revision.
- `test('CST-ADM-UPD-002: omitted customer update sections leave existing data unchanged')` — Patch semantics отличаются от clear.
- `test('CST-ADM-UPD-003: nullable customer fields can be cleared explicitly')` — Null очищает поддерживаемые поля.
- `test('CST-ADM-UPD-004: no-op customer update has deterministic revision semantics')` — Пустой operations либо отклоняется, либо не меняет revision согласно контракту.
- `test('CST-ADM-UPD-005: successful multi-section update increments revision exactly once')` — Aggregate revision не растёт на каждую секцию.
- `test('CST-ADM-UPD-006: operationResults reports every requested section in input order')` — `type/applied/errors` соответствуют операциям.
- `test('CST-ADM-UPD-007: stale expected revision rejects the complete update')` — `REVISION_CONFLICT`, ни одна секция не записана.
- `test('CST-ADM-UPD-008: invalid or wrong-type customer ID is rejected')` — `INVALID_ID` с field path.
- `test('CST-ADM-UPD-009: missing customer is rejected without creating dependent records')` — `NOT_FOUND` и atomic cleanup.
- `test('CST-ADM-UPD-010: duplicate normalized email is rejected atomically')` — `DUPLICATE_EMAIL`, остальные requested sections не применяются.
- `test('CST-ADM-UPD-011: invalid phone and moderation note return precise field errors')` — Проверяет error mapping.
- `test('CST-ADM-UPD-012: admin transitions customer among ACTIVE DISABLED and BLOCKED')` — Валидные lifecycle transitions и revision.
- `test('CST-ADM-UPD-013: BLOCKED requires a non-empty blocked reason')` — `BLOCKED_REASON_REQUIRED`.
- `test('CST-ADM-UPD-014: ACTIVE and DISABLED clear or reject blocked reason consistently')` — Инвариант blockedReason соблюдён.
- `test('CST-ADM-UPD-015: MERGED and REDACTED cannot be selected through customerUpdate')` — Только dedicated workflows могут выставить эти состояния.
- `test('CST-ADM-UPD-016: concurrent updates with one revision allow exactly one winner')` — Lost update невозможен.

## `customer-update-addresses.spec.ts`

- `test('CST-ADM-ADDR-001: unified update creates one complete international address')` — Все поля, normalization и `UNVALIDATED` status.
- `test('CST-ADM-ADDR-002: unified update creates multiple addresses and assigns independent defaults')` — Shipping и billing могут быть разными.
- `test('CST-ADM-ADDR-003: one address can be both shipping and billing default')` — Оба partial uniqueness invariants соблюдены.
- `test('CST-ADM-ADDR-004: unified update patches an existing address')` — Omitted поля сохраняются, явные null очищают nullable поля.
- `test('CST-ADM-ADDR-005: unified update deletes an address and clears affected defaults')` — Deleted address исчезает из reads.
- `test('CST-ADM-ADDR-006: unified update changes and explicitly clears defaults')` — Default IDs работают атомарно.
- `test('CST-ADM-ADDR-007: address create update delete and default changes can be combined atomically')` — Один workflow выдаёт согласованный aggregate.
- `test('CST-ADM-ADDR-008: empty required address values are rejected')` — address1/city/countryCode field errors.
- `test('CST-ADM-ADDR-009: invalid phone country code and coordinate boundaries are rejected')` — Невалидные E.164/ISO/lat/lon не сохраняются.
- `test('CST-ADM-ADDR-010: duplicate IDs and conflicting update delete operations are rejected')` — `DUPLICATE_ID`/`CONFLICTING_OPERATION`.
- `test('CST-ADM-ADDR-011: foreign customer address IDs are returned as NOT_FOUND')` — Не допускается IDOR внутри/между stores.
- `test('CST-ADM-ADDR-012: customerAddress direct query and nested connection return the same normalized object')` — Resolver consistency.

## `customer-update-consents.spec.ts`

- `test('CST-ADM-CONSENT-001: admin creates current consent for every supported channel')` — EMAIL/SMS/WHATSAPP/PUSH и correct timestamps.
- `test('CST-ADM-CONSENT-002: admin transitions consent through selectable states and opt-in levels')` — Current state и immutable event history совпадают.
- `test('CST-ADM-CONSENT-003: consent update defaults opt-in level to UNKNOWN')` — Проверяет default semantics.
- `test('CST-ADM-CONSENT-004: duplicate channels in one batch are rejected atomically')` — `DUPLICATE_CHANNEL`.
- `test('CST-ADM-CONSENT-005: contact point must match the selected channel')` — Invalid email/phone/push identity даёт `INVALID_CONTACT_POINT`.
- `test('CST-ADM-CONSENT-006: subscribed and unsubscribed timestamps preserve consent invariants')` — consentedAt/withdrawnAt корректны.
- `test('CST-ADM-CONSENT-007: admin cannot directly select INVALID or REDACTED')` — Schema/business boundary защищена.
- `test('CST-ADM-CONSENT-008: repeated transitions append ordered immutable evidence events')` — previous/new state, actor, request/idempotency/evidence корректны.
- `test('CST-ADM-CONSENT-009: consent events support stable forward and backward pagination')` — Count, cursors и ordering.
- `test('CST-ADM-CONSENT-010: customerConsent direct query is store isolated')` — Foreign consent не раскрывается.

## `customer-update-tax.spec.ts`

- `test('CST-ADM-TAX-001: unified update creates tax identifiers with defaults and normalization')` — UNVERIFIED default, normalizedValue и optional dates.
- `test('CST-ADM-TAX-002: unified update creates and switches the primary tax identifier')` — Не более одного primary.
- `test('CST-ADM-TAX-003: unified update patches and deletes tax identifiers')` — Read connection и soft-delete state согласованы.
- `test('CST-ADM-TAX-004: duplicate normalized tax identifier is rejected')` — Дубликат внутри customer/store не создаётся.
- `test('CST-ADM-TAX-005: invalid identifier type value country and date range are rejected')` — Field-level errors, no partial write.
- `test('CST-ADM-TAX-006: verified identifier requires verification metadata invariants')` — Status/timestamps остаются согласованными.
- `test('CST-ADM-TAX-007: unified update creates updates and deletes tax exemptions')` — Все admin-only поля и certificate reference покрыты.
- `test('CST-ADM-TAX-008: invalid exemption code status and validity range are rejected')` — Atomic validation.
- `test('CST-ADM-TAX-009: missing or cross-store certificate file is rejected safely')` — Media federation/ownership boundary.
- `test('CST-ADM-TAX-010: duplicate IDs and conflicting tax operations are rejected')` — `DUPLICATE_ID`/`CONFLICTING_OPERATION` для identifier и exemption.
- `test('CST-ADM-TAX-011: tax child IDs must belong to the updated customer and current store')` — IDOR закрыт.
- `test('CST-ADM-TAX-012: direct tax queries and nested filtered connections are consistent')` — Same object, filters/order/count.

## `customer-update-classification.spec.ts`

- `test('CST-ADM-CLASS-001: customer update replaces all manual group memberships')` — Set semantics, sources и customersCount.
- `test('CST-ADM-CLASS-002: empty group memberships clears all manual groups')` — Отсутствующая секция не очищает, пустая очищает.
- `test('CST-ADM-CLASS-003: customer can have exactly one active primary group')` — Multiple primary gives `MULTIPLE_PRIMARY_GROUPS`.
- `test('CST-ADM-CLASS-004: duplicate or foreign group IDs are rejected atomically')` — `DUPLICATE_ID`/`NOT_FOUND`.
- `test('CST-ADM-CLASS-005: expired group memberships are reported inactive')` — Boundary at expiresAt covered.
- `test('CST-ADM-CLASS-006: customer update replaces all tag assignments')` — Set semantics and customersCount.
- `test('CST-ADM-CLASS-007: empty tag IDs clears tags and duplicate or foreign IDs fail')` — Clear and error paths.
- `test('CST-ADM-CLASS-008: customer update replaces manual segment memberships')` — Manual sources and counts updated.
- `test('CST-ADM-CLASS-009: dynamic segment cannot be assigned manually')` — `SEGMENT_NOT_MANUAL`.
- `test('CST-ADM-CLASS-010: empty segment IDs clears only manual memberships')` — RULE memberships are not silently forged or corrupted.

## `customer-delete.spec.ts`

- `test('CST-ADM-DELETE-001: admin deletes a guest customer with no dependencies')` — Returns global deleted ID and hides profile.
- `test('CST-ADM-DELETE-002: customer delete cascades or tombstones all owned entities consistently')` — Addresses, consent, tax, memberships, wishlist/comparison and external refs leave no active orphan.
- `test('CST-ADM-DELETE-003: customer delete with matching expected revision succeeds')` — Optimistic delete contract.
- `test('CST-ADM-DELETE-004: customer delete with stale expected revision fails')` — `REVISION_CONFLICT`, aggregate remains intact.
- `test('CST-ADM-DELETE-005: customer delete without optional expected revision follows documented compatibility contract')` — Проверяет schema behavior explicitly.
- `test('CST-ADM-DELETE-006: deleting missing malformed foreign-type or cross-store customer is safe')` — `NOT_FOUND`/validation, no leak.
- `test('CST-ADM-DELETE-007: deleting registered blocked merged or redacted customers respects lifecycle rules')` — Таблично покрывает допустимые/запрещённые состояния.
- `test('CST-ADM-DELETE-008: repeated customer delete is deterministic and does not duplicate side effects')` — Retry-safe behavior.

## `customer-groups.spec.ts`

- `test('CST-ADM-GRP-001: admin creates an active non-default group')` — Code normalization, revision and defaults.
- `test('CST-ADM-GRP-002: admin creates the first default group')` — Default uniqueness and state.
- `test('CST-ADM-GRP-003: making another group default atomically replaces the previous default')` — Exactly one default remains.
- `test('CST-ADM-GRP-004: inactive group cannot be default')` — `DEFAULT_GROUP_INACTIVE` on create/update.
- `test('CST-ADM-GRP-005: blank invalid and duplicate normalized group codes or names are rejected')` — `INVALID_CODE`, `INVALID_NAME`, `DUPLICATE_GROUP_CODE`.
- `test('CST-ADM-GRP-006: admin updates group definition state and memberships in one revision')` — Operation results and count.
- `test('CST-ADM-GRP-007: group update creates updates and deletes memberships')` — Primary/expiry/source fields persist.
- `test('CST-ADM-GRP-008: group membership set rejects duplicates conflicts missing customers and invalid expiry')` — All relation validation codes covered.
- `test('CST-ADM-GRP-009: stale group revision rejects definition and membership changes atomically')` — No partial update.
- `test('CST-ADM-GRP-010: concurrent group membership updates allow one winner')` — Aggregate revision protects membership changes.
- `test('CST-ADM-GRP-011: group direct query list filters ordering and Relay pagination are correct')` — Все declared filters/order fields, ties, count and cursors.
- `test('CST-ADM-GRP-012: group membership nested connection filters ordering and pagination are correct')` — Active/expired and source cases.
- `test('CST-ADM-GRP-013: admin deletes an empty non-default group')` — ID returned and group hidden.
- `test('CST-ADM-GRP-014: deleting default or populated group follows explicit dependency policy')` — Проверяет reject/cascade contract без orphan membership.
- `test('CST-ADM-GRP-015: missing malformed and cross-store group operations are safe')` — No existence leak.

## `customer-tags.spec.ts`

- `test('CST-ADM-TAG-001: admin creates a normalized customer tag')` — Trim/NFKC/case normalization и count 0.
- `test('CST-ADM-TAG-002: blank oversized and duplicate normalized tag names are rejected')` — `INVALID_NAME`/`DUPLICATE_TAG_NAME`.
- `test('CST-ADM-TAG-003: admin renames a tag and preserves assignments')` — Counts и relation IDs stable.
- `test('CST-ADM-TAG-004: tag update creates and deletes assignments atomically')` — Operation results and counts.
- `test('CST-ADM-TAG-005: duplicate conflicting missing and foreign assignments are rejected')` — `DUPLICATE_ID`, `DUPLICATE_ASSIGNMENT`, `NOT_FOUND`.
- `test('CST-ADM-TAG-006: tag direct query list filters ordering and Relay pagination are correct')` — Все declared filters/order fields.
- `test('CST-ADM-TAG-007: tag assignment nested connection filters ordering and pagination are correct')` — Customer/tag/actor/time filters.
- `test('CST-ADM-TAG-008: deleting a tag removes active assignments without deleting customers')` — No orphan and correct counts.
- `test('CST-ADM-TAG-009: missing malformed and cross-store tag operations are safe')` — Tenant isolation.
- `test('CST-ADM-TAG-010: concurrent equivalent tag assignment creates do not duplicate membership')` — Unique relation invariant.

## `customer-segments.spec.ts`

- `test('CST-ADM-SEG-001: admin creates a manual draft segment without a query')` — Defaults, revisions and materialization fields.
- `test('CST-ADM-SEG-002: admin creates a dynamic segment from a valid query')` — Canonical query, compiled definition, complexity and pending materialization.
- `test('CST-ADM-SEG-003: dynamic segment requires a query and manual segment forbids one')` — `SEGMENT_QUERY_REQUIRED`/`SEGMENT_QUERY_NOT_ALLOWED`.
- `test('CST-ADM-SEG-004: blank duplicate names and invalid colors are rejected')` — `INVALID_NAME`, `DUPLICATE_SEGMENT_NAME`, `INVALID_COLOR`.
- `test('CST-ADM-SEG-005: segment query validation returns canonical query definition and complexity')` — Valid DSL contract.
- `test('CST-ADM-SEG-006: segment query validation returns precise diagnostics for invalid syntax semantics and types')` — Code, severity, offsets, line/column.
- `test('CST-ADM-SEG-007: segment query validation enforces complexity limits')` — Too-complex input is rejected predictably.
- `test('CST-ADM-SEG-008: segment preview returns matching customers count and Relay page')` — Preview matches persisted filter semantics.
- `test('CST-ADM-SEG-009: invalid preview returns validation without executing a customer query')` — customers/count null, no timeout masquerading.
- `test('CST-ADM-SEG-010: segment preview reports timeout without partial success ambiguity')` — `timedOut` contract.
- `test('CST-ADM-SEG-011: segment attribute catalog describes every supported attribute function and availability')` — Operators/enums/parameters/unavailability reasons complete.
- `test('CST-ADM-SEG-012: admin updates segment details definition state and memberships atomically')` — Revisions and operation results.
- `test('CST-ADM-SEG-013: definition revision changes only when the dynamic definition changes')` — Details/state/membership do not increment it.
- `test('CST-ADM-SEG-014: aggregate revision changes for accepted definition state and membership updates')` — Optimistic lock scope.
- `test('CST-ADM-SEG-015: manual memberships support create update delete and atomic replacement')` — `setCustomerIds` semantics and counts.
- `test('CST-ADM-SEG-016: membership replacement conflicts with incremental operations')` — `CONFLICTING_OPERATION`.
- `test('CST-ADM-SEG-017: dynamic segment rejects manual membership operations')` — `SEGMENT_NOT_MANUAL`.
- `test('CST-ADM-SEG-018: segment memberships reject duplicate missing foreign customers and invalid expiry')` — Relation validation.
- `test('CST-ADM-SEG-019: stale segment revision rejects all requested operations')` — `REVISION_CONFLICT`, no partial write.
- `test('CST-ADM-SEG-020: changing dynamic definition invalidates stale RULE memberships fail-closed')` — No stale audience served.
- `test('CST-ADM-SEG-021: segment list filters ordering and Relay pagination are correct')` — Все declared fields, nulls, ties and count.
- `test('CST-ADM-SEG-022: segment membership connection filters ordering and pagination are correct')` — Source/evaluation/expiry cases.
- `test('CST-ADM-SEG-023: delete with matching revision removes a segment and memberships')` — Correct deleted ID and cleanup.
- `test('CST-ADM-SEG-024: delete with stale revision or active dependency fails safely')` — No partial cleanup.
- `test('CST-ADM-SEG-025: missing malformed and cross-store segment operations are safe')` — Tenant isolation.

## `customer-statistics-and-comparison.spec.ts`

- `test('CST-ADM-STATS-001: customer without events has null or zero statistics according to contract')` — Empty projection semantics fixed explicitly.
- `test('CST-ADM-STATS-002: order checkout cancellation return and refund events update customer statistics idempotently')` — Counts/timestamps change once per event revision.
- `test('CST-ADM-STATS-003: out-of-order and duplicate domain events do not regress statistics')` — Revision-aware projection.
- `test('CST-ADM-STATS-004: monetary statistics remain isolated per currency and preserve minor-unit arithmetic')` — spent/refunded/net/average invariants.
- `test('CST-ADM-STATS-005: monetary statistics connection filters ordering pagination and BigInt boundaries are correct')` — Negative values impossible, large values serialize safely.
- `test('CST-ADM-STATS-006: statistics from another store never affect the customer')` — Event projection tenancy.
- `test('CST-ADM-CMP-001: admin reads an empty customer comparison')` — Null/empty initial contract.
- `test('CST-ADM-CMP-002: admin reads ordered comparison items and federated product variant references')` — Position and Catalog hydration.
- `test('CST-ADM-CMP-003: unavailable Catalog entities leave safe nullable references without dropping persisted items')` — Read remains deterministic.
- `test('CST-ADM-CMP-004: comparison and items cannot be mutated through Customers Admin API')` — Read-only boundary.

## `customer-merges.spec.ts`

- `test('CST-ADM-MERGE-001: admin creates and completes a valid customer merge')` — REQUESTED→IN_PROGRESS→COMPLETED, source MERGED and target intact.
- `test('CST-ADM-MERGE-002: merge moves or reconciles every supported customer-owned relation')` — Addresses/defaults, consents, tax, classification, external refs, wishlist/comparison and statistics follow policy.
- `test('CST-ADM-MERGE-003: merge conflict resolution is deterministic for duplicate email defaults primary values and memberships')` — Resolution JSON describes decisions.
- `test('CST-ADM-MERGE-004: a customer cannot be merged into itself')` — `SAME_CUSTOMER`.
- `test('CST-ADM-MERGE-005: missing cross-store deleted merged redacted or otherwise invalid customers are rejected')` — `NOT_FOUND`/`INVALID_CUSTOMER_STATE` without leak.
- `test('CST-ADM-MERGE-006: reverse or duplicate pending merge is rejected')` — `MERGE_ALREADY_PENDING`.
- `test('CST-ADM-MERGE-007: admin updates source target and reason before processing starts')` — Relations and audit fields update.
- `test('CST-ADM-MERGE-008: merge cannot be edited or deleted after processing starts')` — `INVALID_STATE`.
- `test('CST-ADM-MERGE-009: admin deletes a requested merge without changing either customer')` — Correct deleted ID.
- `test('CST-ADM-MERGE-010: failed merge records a safe error and leaves recoverable consistent state')` — No PII/secrets in error fields.
- `test('CST-ADM-MERGE-011: retrying merge processing is idempotent')` — Side effects and audit records occur once.
- `test('CST-ADM-MERGE-012: concurrent merge requests involving the same source allow one workflow')` — Race protected.
- `test('CST-ADM-MERGE-013: merge direct query list filters ordering and Relay pagination are correct')` — Все declared fields and states.
- `test('CST-ADM-MERGE-014: missing malformed and cross-store merge IDs are safe')` — No existence leak.

## `customer-data-requests.spec.ts`

- `test('CST-ADM-PRIV-001: admin creates ACCESS EXPORT CORRECTION and ERASURE requests')` — Types, metadata, legal basis, dueAt and audit actor.
- `test('CST-ADM-PRIV-002: past or invalid dueAt and malformed request metadata are rejected')` — `INVALID_DUE_AT`/`INVALID_REQUEST_METADATA`.
- `test('CST-ADM-PRIV-003: admin updates pending request metadata customer type legal basis and due date')` — Allowed fields round-trip.
- `test('CST-ADM-PRIV-004: admin cancels a pending request with an optional reason')` — CANCELLED/finishedAt semantics.
- `test('CST-ADM-PRIV-005: cancel cannot be combined with conflicting updates')` — Atomic `INVALID_VALUE`/conflict behavior.
- `test('CST-ADM-PRIV-006: processing or terminal request cannot be edited cancelled or deleted')` — `INVALID_STATE` for every terminal status.
- `test('CST-ADM-PRIV-007: ACCESS and EXPORT processing produce a customer-owned result file')` — Media federation reference and timestamps.
- `test('CST-ADM-PRIV-008: CORRECTION processing applies only authorized requested changes')` — Audit and revision behavior.
- `test('CST-ADM-PRIV-009: ERASURE processing redacts PII while preserving required audit facts')` — Customer REDACTED and non-PII invariants.
- `test('CST-ADM-PRIV-010: processing failure is recorded safely and can be retried according to policy')` — No secret/PII leak in errors.
- `test('CST-ADM-PRIV-011: duplicate workflow delivery and retries do not duplicate files or redaction effects')` — Idempotency.
- `test('CST-ADM-PRIV-012: data request direct query list filters ordering and Relay pagination are correct')` — Все declared fields/statuses.
- `test('CST-ADM-PRIV-013: result file from another store cannot be attached or resolved')` — Media tenant isolation.
- `test('CST-ADM-PRIV-014: missing malformed foreign-customer and cross-store request operations are safe')` — No existence leak.

## Общие критерии для реализации

- Каждая mutation проверяет success payload, `userErrors`, `operationResults`, persisted state и отсутствие частичного commit.
- Для каждой idempotent/workflow операции проверяются одинаковый retry, concurrent retry и отсутствие повторных side effects.
- Для каждой Relay connection проверяются default page size, maximum page size, `first/after`, `last/before`, empty/end pages, malformed cursor, filter/order mismatch, stable tie-breaker и `totalCount`.
- Все временные границы проверяются на значениях до, ровно в и после boundary; все строки — empty, whitespace-only, Unicode normalization, максимальная длина и превышение на один символ.
- Все global ID inputs проверяются валидным ID, отсутствующим ID, ID другого типа, foreign-customer ID и ID из другого store.
