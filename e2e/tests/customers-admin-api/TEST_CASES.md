# Customers Admin API

## `authorization-and-tenancy.spec.ts`

- `test('unauthenticated actor cannot read Customers Admin API')` — Любой query возвращает `UNAUTHENTICATED` и не раскрывает customer data.
- `test('unauthenticated actor cannot mutate Customers Admin API')` — Любая mutation отклоняется без изменения БД.
- `test('user without customer read permission cannot query customers')` — Проверяет RBAC для list и single reads.
- `test('user with customer read permission can query customers')` — Разрешённое минимальное чтение проходит.
- `test('user without customer write permission cannot mutate customers')` — Create/update/delete и вложенные изменения запрещены.
- `test('user with customer write permission can mutate customers')` — Разрешённая минимальная mutation проходит.
- `test('classification permissions protect groups tags and segments')` — Group/tag/segment reads и writes требуют соответствующих разрешений.
- `test('privacy permissions protect merges and data requests')` — Lifecycle/privacy operations закрыты от обычного staff.
- `test('store A cannot read any customer-owned entity from store B')` — Customer, address, consent, tax, classification membership, merge и data request не раскрываются по foreign ID.
- `test('store A cannot mutate any customer-owned entity from store B')` — Foreign IDs дают безопасный `NOT_FOUND`, данные обоих stores неизменны.
- `test('changing an untrusted store selector cannot retarget Customers Admin context')` — Tenant берётся только из trusted gateway context.
- `test('global IDs with the wrong entity type are rejected safely')` — Type-confused IDs дают `INVALID_ID`/null без runtime error.
- `test('malformed global IDs are rejected safely')` — Случайные, пустые и повреждённые ID не приводят к 500.
- `test('deleted entities are not returned by active reads')` — Soft-deleted records скрыты во всех query/loaders.
- `test('admin responses do not expose authentication secrets or internal store IDs')` — Нет password hashes, tokens, OTP, provider secrets и raw tenancy columns.

## `relay-nodes.spec.ts`

- `test('node resolves every supported customer entity type')` — Проверяет Customer, address, consent/event, tax records, comparison/items, external reference, group/membership, tag/assignment, segment/membership, merge и data request.
- `test('nodes preserves input order and duplicate IDs')` — Результаты соответствуют позиции каждого входного ID.
- `test('nodes returns null placeholders for missing malformed foreign and unsupported IDs')` — Частично невалидный batch не ломает валидные элементы.
- `test('node does not resolve an entity from another store')` — Foreign entity выглядит как отсутствующая.

## `customer-accounts-settings.spec.ts`

- `test('admin reads customer account settings for the current store')` — Проверяет realm, registration mode, revision, все methods/providers и configured/enabled flags.
- `test('missing linked IAM application returns null settings without cross-store fallback')` — Конфигурация другого store не используется.
- `test('admin replaces enabled PASSWORD and EMAIL_OTP methods')` — Полная замена сохраняется в IAM и возвращает новую revision.
- `test('admin can disable every customer authentication method')` — Пустой список обрабатывается как валидная полная замена.
- `test('duplicate authentication methods are rejected')` — Возвращается `INVALID_INPUT`, revision не меняется.
- `test('PHONE_OTP is rejected while the method is not configured')` — Возвращается `METHOD_NOT_CONFIGURED`.
- `test('non-positive or unsafe expected revision is rejected')` — Ноль, отрицательное, дробное и unsafe integer дают field error.
- `test('stale customer account settings revision is rejected')` — Конкурирующее обновление не перезаписывается.
- `test('user without store profile write permission cannot update account settings')` — Возвращается `FORBIDDEN` без broker write.
- `test('IAM failure is mapped to safe userErrors')` — Ошибка зависимости не раскрывает внутренности и не выдаёт ложный success.

## `customer-create.spec.ts`

- `test('admin creates a minimal guest customer')` — Проверяет defaults, source `admin`, revision 1 и timestamps.
- `test('admin creates a customer with every supported profile field')` — Все profile/company/contact/note/moderation поля round-trip корректно.
- `test('customer display name is derived for full partial and contact-only profiles')` — Проверяет fallback-логику displayName.
- `test('email is normalized before uniqueness and persistence')` — Case/whitespace варианты дают каноническое значение.
- `test('duplicate active email in the same store is rejected')` — `DUPLICATE_EMAIL`, новая строка не создаётся.
- `test('the same normalized email can exist in another store')` — Уникальность строго store-scoped.
- `test('invalid phone is rejected with a field error')` — Проверяются не-E.164, пустое и гранично длинное значения.
- `test('oversized moderation note is rejected')` — `INVALID_MODERATION_NOTE`, atomic failure.
- `test('malformed email date locale and oversized strings are rejected by the GraphQL contract')` — Scalar/Zod validation возвращает стабильные ошибки.
- `test('two concurrent creates with the same email create exactly one customer')` — Один success, один deterministic duplicate error.

## `customer-query.spec.ts`

- `test('admin gets a customer by global ID with the complete aggregate')` — Проверяет profile, defaults, relations, statistics, comparison и external references.
- `test('admin gets a customer by normalized email')` — Lookup нечувствителен к допустимой нормализации.
- `test('missing customer and email return null')` — Несуществующие значения не являются transport errors.
- `test('customerByEmail never returns a customer from another store')` — Проверяет tenant isolation при одинаковых email.
- `test('customers returns an empty Relay connection')` — Пустые edges, null cursors, false page flags и `totalCount: 0`.
- `test('customers supports stable forward pagination')` — `first/after`, без дублей и пропусков.
- `test('customers supports stable backward pagination')` — `last/before` и корректный исходный порядок.
- `test('customers uses ID as a deterministic tie breaker')` — Одинаковые sort values дают повторяемые cursors.
- `test('customers totalCount reflects filters not page size')` — Count соответствует всему filtered set.
- `test('customers supports compound AND OR and NOT filters')` — Комбинация filter tree работает предсказуемо.
- `test('customers filters by identity lifecycle account and verification fields')` — id/principal/status/email/phone/verified/source покрыты.
- `test('customers filters by profile company locale and date fields')` — first/last/display/company/locale/date/activity/timestamps покрыты.
- `test('customers filters by default shipping geography and marketing state')` — Joined address/consent filters не дублируют customers.
- `test('customers filters by statistics spend and segment membership')` — orders/last order/total spent/segment filters корректны и store-scoped.
- `test('customers supports every declared order field in both directions')` — Табличный прогон всех `CustomerOrderField` с nulls и ties.
- `test('invalid cursor pagination combinations are rejected')` — `first+last`, `after+before`, отрицательные и over-limit sizes.
- `test('malformed foreign-type and filter-mismatched cursors are rejected safely')` — Cursor нельзя переиспользовать между connection/filter/order.
- `test('customer aggregate returns created address and tax identifier connections')` — Созданные nested entities доступны через aggregate Relay connections.
- `test('batched nested relations do not leak or duplicate data across customers')` — Проверяет DataLoader isolation и ordering.

## `customer-update-profile.spec.ts`

- `test('admin updates every customer profile section atomically')` — Profile, contact, company, note и moderation применяются одной revision.
- `test('omitted customer update sections leave existing data unchanged')` — Patch semantics отличаются от clear.
- `test('nullable customer fields can be cleared explicitly')` — Null очищает поддерживаемые поля.
- `test('no-op customer update has deterministic revision semantics')` — Пустой operations либо отклоняется, либо не меняет revision согласно контракту.
- `test('successful multi-section update increments revision exactly once')` — Aggregate revision не растёт на каждую секцию.
- `test('operationResults reports every requested section in input order')` — `type/applied/errors` соответствуют операциям.
- `test('stale expected revision rejects the complete update')` — `REVISION_CONFLICT`, ни одна секция не записана.
- `test('invalid or wrong-type customer ID is rejected')` — `INVALID_ID` с field path.
- `test('missing customer is rejected without creating dependent records')` — `NOT_FOUND` и atomic cleanup.
- `test('duplicate normalized email is rejected atomically')` — `DUPLICATE_EMAIL`, остальные requested sections не применяются.
- `test('invalid phone and moderation note return precise field errors')` — Проверяет error mapping.
- `test('admin transitions customer among ACTIVE DISABLED and BLOCKED')` — Валидные lifecycle transitions и revision.
- `test('BLOCKED requires a non-empty blocked reason')` — `BLOCKED_REASON_REQUIRED`.
- `test('ACTIVE and DISABLED clear a previously stored blocked reason')` — Инвариант blockedReason проверяется точным успешным результатом.
- `test('MERGED and REDACTED cannot be selected through customerUpdate')` — Только dedicated workflows могут выставить эти состояния.
- `test('concurrent updates with one revision allow exactly one winner')` — Lost update невозможен.

## `customer-update-addresses.spec.ts`

- `test('unified update creates one complete international address')` — Все поля, normalization и `UNVALIDATED` status.
- `test('unified update creates multiple addresses and assigns independent defaults')` — Shipping и billing могут быть разными.
- `test('one address can be both shipping and billing default')` — Оба partial uniqueness invariants соблюдены.
- `test('unified update patches an existing address')` — Omitted поля сохраняются, явные null очищают nullable поля.
- `test('unified update deletes an address and clears affected defaults')` — Deleted address исчезает из reads.
- `test('unified update changes and explicitly clears defaults')` — Default IDs работают атомарно.
- `test('address create update delete and default changes can be combined atomically')` — Один workflow выдаёт согласованный aggregate.
- `test('empty required address values are rejected')` — address1/city/countryCode field errors.
- `test('invalid phone country code and coordinate boundaries are rejected')` — Невалидные E.164/ISO/lat/lon не сохраняются.
- `test('duplicate IDs and conflicting update delete operations are rejected')` — `DUPLICATE_ID`/`CONFLICTING_OPERATION`.
- `test('foreign customer address IDs are returned as NOT_FOUND')` — Не допускается IDOR внутри/между stores.
- `test('customerAddress direct query and nested connection return the same normalized object')` — Resolver consistency.

## `customer-update-consents.spec.ts`

- `test('admin creates current consent for every supported channel')` — EMAIL/SMS/WHATSAPP/PUSH и correct timestamps.
- `test('admin transitions consent through selectable states and opt-in levels')` — Current state и immutable event history совпадают.
- `test('consent update defaults opt-in level to UNKNOWN')` — Проверяет default semantics.
- `test('duplicate channels in one batch are rejected atomically')` — `DUPLICATE_CHANNEL`.
- `test('contact point must match the selected channel')` — Invalid email/phone/push identity даёт `INVALID_CONTACT_POINT`.
- `test('subscribed and unsubscribed timestamps preserve consent invariants')` — consentedAt/withdrawnAt корректны.
- `test('admin cannot directly select INVALID or REDACTED')` — Schema/business boundary защищена.
- `test('repeated transitions append ordered immutable evidence events')` — previous/new state, actor, request/idempotency/evidence корректны.
- `test('consent events support stable forward and backward pagination')` — Count, cursors и ordering.
- `test('customerConsent direct query is store isolated')` — Foreign consent не раскрывается.

## `customer-update-tax.spec.ts`

- `test('unified update creates tax identifiers with defaults and normalization')` — UNVERIFIED default, normalizedValue и optional dates.
- `test('unified update creates and switches the primary tax identifier')` — Не более одного primary.
- `test('unified update patches and deletes tax identifiers')` — Read connection и soft-delete state согласованы.
- `test('duplicate normalized tax identifier is rejected')` — Дубликат внутри customer/store не создаётся.
- `test('invalid identifier type value country and date range are rejected')` — Field-level errors, no partial write.
- `test('verified identifier requires verification metadata invariants')` — Status/timestamps остаются согласованными.
- `test('unified update creates updates and deletes tax exemptions')` — Все admin-only поля и certificate reference покрыты.
- `test('invalid exemption code status and validity range are rejected')` — Atomic validation.
- `test('missing or cross-store certificate file is rejected safely')` — Media federation/ownership boundary.
- `test('duplicate IDs and conflicting tax operations are rejected')` — `DUPLICATE_ID`/`CONFLICTING_OPERATION` для identifier и exemption.
- `test('tax child IDs must belong to the updated customer and current store')` — IDOR закрыт.
- `test('direct tax queries and nested filtered connections are consistent')` — Same object, filters/order/count.

## `customer-update-classification.spec.ts`

- `test('customer update replaces all manual group memberships')` — Set semantics, sources и customersCount.
- `test('empty group memberships clears all manual groups')` — Отсутствующая секция не очищает, пустая очищает.
- `test('customer can have exactly one active primary group')` — Multiple primary gives `MULTIPLE_PRIMARY_GROUPS`.
- `test('duplicate or foreign group IDs are rejected atomically')` — `DUPLICATE_ID`/`NOT_FOUND`.
- `test('expired group memberships are reported inactive')` — Boundary at expiresAt covered.
- `test('customer update replaces all tag assignments')` — Set semantics and customersCount.
- `test('empty tag IDs clears tags and duplicate or foreign IDs fail')` — Clear and error paths.
- `test('customer update replaces manual segment memberships')` — Manual sources and counts updated.
- `test('dynamic segment cannot be assigned manually')` — `SEGMENT_NOT_MANUAL`.
- `test('empty segment IDs clears only manual memberships')` — RULE memberships are not silently forged or corrupted.

## `customer-delete.spec.ts`

- `test('admin deletes a guest customer with no dependencies')` — Returns global deleted ID and hides profile.
- `test('customer delete cascades or tombstones all owned entities consistently')` — Addresses, consent, tax, memberships, wishlist/comparison and external refs leave no active orphan.
- `test('customer delete with matching expected revision succeeds')` — Optimistic delete contract.
- `test('customer delete with stale expected revision fails')` — `REVISION_CONFLICT`, aggregate remains intact.
- `test('customer delete without optional expected revision uses the current aggregate state')` — Проверяет актуальный schema contract без compatibility semantics.
- `test('deleting missing malformed foreign-type or cross-store customer is safe')` — `NOT_FOUND`/validation, no leak.
- `test('deleting a blocked customer succeeds and returns its ID')` — Blocked aggregate удаляется по точной revision и становится недоступен.
- `test('repeated customer delete is deterministic and does not duplicate side effects')` — Retry-safe behavior.

## `customer-groups.spec.ts`

- `test('admin creates an active non-default group')` — Code normalization, revision and defaults.
- `test('admin creates the first default group')` — Default uniqueness and state.
- `test('making another group default atomically replaces the previous default')` — Exactly one default remains.
- `test('inactive group cannot be default')` — `DEFAULT_GROUP_INACTIVE` on create/update.
- `test('blank invalid and duplicate normalized group codes or names are rejected')` — `INVALID_CODE`, `INVALID_NAME`, `DUPLICATE_GROUP_CODE`.
- `test('admin updates group definition state and memberships in one revision')` — Operation results and count.
- `test('group update creates updates and deletes memberships')` — Primary/expiry/source fields persist.
- `test('group membership set rejects duplicates conflicts missing customers and invalid expiry')` — All relation validation codes covered.
- `test('stale group revision rejects definition and membership changes atomically')` — No partial update.
- `test('concurrent group membership updates allow one winner')` — Aggregate revision protects membership changes.
- `test('group direct query list filters ordering and Relay pagination are correct')` — Active filter, code order, totalCount и forward/backward cursors.
- `test('group update returns both active memberships with unique Relay cursors')` — Membership connection count, activity and cursor uniqueness.
- `test('admin deletes an empty non-default group')` — ID returned and group hidden.
- `test('deleting default or populated group follows explicit dependency policy')` — Проверяет reject/cascade contract без orphan membership.
- `test('missing malformed and cross-store group operations are safe')` — No existence leak.

## `customer-tags.spec.ts`

- `test('admin creates a normalized customer tag')` — Trim/NFKC/case normalization и count 0.
- `test('blank oversized and duplicate normalized tag names are rejected')` — `INVALID_NAME`/`DUPLICATE_TAG_NAME`.
- `test('admin renames a tag and preserves assignments')` — Counts и relation IDs stable.
- `test('tag update creates and deletes assignments atomically')` — Operation results and counts.
- `test('duplicate conflicting missing and foreign assignments are rejected')` — `DUPLICATE_ID`, `DUPLICATE_ASSIGNMENT`, `NOT_FOUND`.
- `test('tag direct query list filters ordering and Relay pagination are correct')` — Name filter/order, totalCount и forward/backward cursors.
- `test('tag update returns both assignments with unique Relay cursors')` — Assignment connection count and cursor uniqueness.
- `test('deleting a tag removes active assignments without deleting customers')` — No orphan and correct counts.
- `test('missing malformed and cross-store tag operations are safe')` — Tenant isolation.
- `test('concurrent equivalent tag assignment creates do not duplicate membership')` — Unique relation invariant.

## `customer-segments.spec.ts`

- `test('admin creates a manual draft segment without a query')` — Defaults, revisions and materialization fields.
- `test('admin creates a dynamic segment from a valid query')` — Canonical query, compiled definition, complexity and pending materialization.
- `test('dynamic segment requires a query and manual segment forbids one')` — `SEGMENT_QUERY_REQUIRED`/`SEGMENT_QUERY_NOT_ALLOWED`.
- `test('blank duplicate names and invalid colors are rejected')` — `INVALID_NAME`, `DUPLICATE_SEGMENT_NAME`, `INVALID_COLOR`.
- `test('segment query validation returns canonical query definition and complexity')` — Valid DSL contract.
- `test('segment query validation returns precise diagnostics for invalid syntax semantics and types')` — Code, severity, offsets, line/column.
- `test('segment query validation enforces complexity limits')` — Too-complex input is rejected predictably.
- `test('segment preview returns matching customers count and Relay page')` — Preview matches persisted filter semantics.
- `test('invalid preview returns validation without executing a customer query')` — customers/count null, no timeout masquerading.
- `test('segment preview reports timeout without partial success ambiguity')` — `timedOut` contract.
- `test('segment attribute catalog describes every supported attribute function and availability')` — Operators/enums/parameters/unavailability reasons complete.
- `test('admin updates segment details definition state and memberships atomically')` — Revisions and operation results.
- `test('definition revision changes only when the dynamic definition changes')` — Details/state/membership do not increment it.
- `test('aggregate revision changes for accepted definition state and membership updates')` — Optimistic lock scope.
- `test('manual memberships support create update delete and atomic replacement')` — `setCustomerIds` semantics and counts.
- `test('membership replacement conflicts with incremental operations')` — `CONFLICTING_OPERATION`.
- `test('dynamic segment rejects manual membership operations')` — `SEGMENT_NOT_MANUAL`.
- `test('segment memberships reject duplicate missing foreign customers and invalid expiry')` — Relation validation.
- `test('stale segment revision rejects all requested operations')` — `REVISION_CONFLICT`, no partial write.
- `test('changing dynamic definition invalidates stale RULE memberships fail-closed')` — No stale audience served.
- `test('segment list filters ordering and Relay pagination are correct')` — Все declared fields, nulls, ties and count.
- `test('segment membership connection filters ordering and pagination are correct')` — Source/evaluation/expiry cases.
- `test('delete with matching revision removes a segment and memberships')` — Correct deleted ID and cleanup.
- `test('delete with stale revision or active dependency fails safely')` — No partial cleanup.
- `test('missing malformed and cross-store segment operations are safe')` — Tenant isolation.

## `customer-statistics-and-comparison.spec.ts`

- `test('customer without events has null or zero statistics according to contract')` — Empty projection semantics fixed explicitly.
- `test('order checkout and refund events update the customer statistics projection')` — Реальные domain events проходят через Events dispatch и обновляют counts/timestamps/money.
- `test('duplicate and older order revisions do not regress projected statistics')` — Реальная revision-aware event projection.
- `test('monetary statistics remain isolated per currency and preserve minor-unit arithmetic')` — spent/refunded/net/average invariants.
- `test('monetary statistics totalCount and BigInt serialization are exact')` — Large values serialize safely without precision loss.
- `test('a customer aggregate is inaccessible from another store')` — Aggregate tenancy.
- `test('admin reads an empty customer comparison')` — Null/empty initial contract.
- `test('admin reads comparison items in position order with persisted reference IDs')` — Position and persisted Catalog IDs.
- `test('unavailable Catalog entities leave safe nullable references without dropping persisted items')` — Read remains deterministic.
- `test('comparison and items cannot be mutated through Customers Admin API')` — Read-only boundary.

## `customer-merges.spec.ts`

- `test('admin creates and completes a valid customer merge')` — REQUESTED→IN_PROGRESS→COMPLETED, source MERGED and target intact.
- `test('merge moves or reconciles every supported customer-owned relation')` — Addresses/defaults, consents, tax, classification, external refs, wishlist/comparison and statistics follow policy.
- `test('merge conflict resolution is deterministic for duplicate email defaults primary values and memberships')` — Resolution JSON describes decisions.
- `test('a customer cannot be merged into itself')` — `SAME_CUSTOMER`.
- `test('missing cross-store deleted merged redacted or otherwise invalid customers are rejected')` — `NOT_FOUND`/`INVALID_CUSTOMER_STATE` without leak.
- `test('reverse or duplicate pending merge is rejected')` — `MERGE_ALREADY_PENDING`.
- `test('admin updates source target and reason before processing starts')` — Relations and audit fields update.
- `test('merge cannot be edited or deleted after processing starts')` — `INVALID_STATE`.
- `test('admin deletes a requested merge without changing either customer')` — Correct deleted ID.
- `test('completed merge has no failure details')` — Successful workflow leaves error fields null.
- `test('completed merge reads preserve status timestamps and resolution')` — Stable terminal read contract.
- `test('concurrent merge requests involving the same source allow one workflow')` — Race protected.
- `test('merge direct query and ID-filtered list return the same merge')` — Direct and list read consistency.
- `test('missing malformed and cross-store merge IDs are safe')` — No existence leak.

## `customer-data-requests.spec.ts`

- `test('admin creates ACCESS EXPORT CORRECTION and ERASURE requests')` — Types, metadata, legal basis, dueAt and audit actor.
- `test('past or invalid dueAt and malformed request metadata are rejected')` — `INVALID_DUE_AT`/`INVALID_REQUEST_METADATA`.
- `test('admin updates pending request metadata customer type legal basis and due date')` — Allowed fields round-trip.
- `test('admin cancels a pending request with an optional reason')` — CANCELLED/finishedAt semantics.
- `test('cancel cannot be combined with conflicting updates')` — Atomic `INVALID_VALUE`/conflict behavior.
- `test('terminal request cannot be edited cancelled or deleted')` — `INVALID_STATE` for mutation attempts after completion.
- `test('ACCESS and EXPORT processing produce a customer-owned result file')` — Media federation reference and timestamps.
- `test('CORRECTION processing applies only authorized requested changes')` — Audit and revision behavior.
- `test('ERASURE processing redacts PII while preserving required audit facts')` — Customer REDACTED and non-PII invariants.
- `test('unsupported correction fields are rejected with a safe reason')` — Exact rejected status and sanitized reason.
- `test('terminal data request reads preserve status file and completion timestamp')` — Stable terminal read contract.
- `test('data request direct query and ID-filtered list return the same request')` — Direct and list read consistency.
- `test('result file from another store cannot be attached or resolved')` — Media tenant isolation.
- `test('missing malformed foreign-customer and cross-store request operations are safe')` — No existence leak.
