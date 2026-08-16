# Customers Storefront API — E2E test cases

Полный перечень контрактных E2E-сценариев для `customers-storefront`. Заголовок каждого пункта — готовая строка для `test()`. Тесты должны обращаться через `api.client`, использовать реальный Storefront credential и реальную customer session, проверять `CustomerUserError { field message code retryable }`, persisted state, федерацию и отсутствие cross-customer/store утечек.

## `authentication-and-isolation.spec.ts`

- `test('CST-SF-SEC-001: storefront channel credential without a customer session returns null customer')` — Channel authentication не подменяет customer identity.
- `test('CST-SF-SEC-002: missing storefront channel credential is rejected before Customers resolution')` — Gateway возвращает credential-required contract.
- `test('CST-SF-SEC-003: invalid customer bearer token is rejected')` — Возвращается customer-auth error без anonymous fallback.
- `test('CST-SF-SEC-004: expired revoked and malformed customer tokens are rejected identically')` — Нет token oracle и утечки claims.
- `test('CST-SF-SEC-005: valid session resolves only its linked active customer')` — Principal/store mapping однозначен.
- `test('CST-SF-SEC-006: customer token for store A cannot be used with store B storefront')` — Cross-store replay закрыт.
- `test('CST-SF-SEC-007: customer A cannot read customer B owned entities by global ID')` — Address, wishlist, data request и related nodes выглядят отсутствующими.
- `test('CST-SF-SEC-008: customer A cannot mutate customer B owned entities by global ID')` — Safe `NOT_FOUND`, обе записи неизменны.
- `test('CST-SF-SEC-009: blocked disabled merged and redacted customers cannot use self-service mutations')` — `CUSTOMER_UNAVAILABLE` и `retryable` корректны.
- `test('CST-SF-SEC-010: blocked disabled merged and redacted customers are not returned by customer query')` — Lifecycle fail-closed.
- `test('CST-SF-SEC-011: storefront never exposes admin-only PII notes moderation lifecycle IAM or statistics fields')` — Schema boundary проверена introspection/operation validation.
- `test('CST-SF-SEC-012: untrusted identity and store headers cannot replace gateway signed context')` — Forged selectors игнорируются/отклоняются.
- `test('CST-SF-SEC-013: malformed and wrong-type global IDs return safe field errors')` — Нет runtime/stack leak.
- `test('CST-SF-SEC-014: all user errors expose stable code field message and retryable values')` — Общий error contract для validation, conflict, ownership и dependency errors.

## `customer-query.spec.ts`

- `test('CST-SF-CUS-001: authenticated customer reads the complete storefront profile')` — Profile, account status, verified contacts, defaults, consents, tax, requests и timestamps.
- `test('CST-SF-CUS-002: customer query returns null when no customer is linked to the session')` — Валидный application user без projection не получает чужой профиль.
- `test('CST-SF-CUS-003: customer display name falls back deterministically for partial profiles')` — Name/company/contact fallback не раскрывает скрытые поля.
- `test('CST-SF-CUS-004: email and phone projections preserve IAM verification state')` — Verified flags синхронизированы, credentials не экспонируются.
- `test('CST-SF-CUS-005: customer query batches nested fields without cross-customer cache leakage')` — Loader cache scoped to request/customer/store.
- `test('CST-SF-CUS-006: recently committed self-service writes are visible in the mutation response and next query')` — Loader invalidation/read-your-writes.

## `customer-update.spec.ts`

- `test('CST-SF-UPD-001: customer updates every editable profile field')` — Все non-auth fields round-trip, revision grows once.
- `test('CST-SF-UPD-002: omitted profile fields remain unchanged')` — Patch semantics.
- `test('CST-SF-UPD-003: nullable profile fields can be cleared explicitly')` — Null clear semantics.
- `test('CST-SF-UPD-004: customer cannot update email phone verification account status or admin-only fields')` — GraphQL schema rejects mass assignment.
- `test('CST-SF-UPD-005: customer update trims and normalizes supported strings')` — Display values и normalization contract.
- `test('CST-SF-UPD-006: empty and oversized profile values are rejected with precise fields')` — `INVALID_VALUE` and length boundaries.
- `test('CST-SF-UPD-007: valid supported BCP 47 locale is accepted')` — Locale persists canonically.
- `test('CST-SF-UPD-008: unsupported or malformed locale is rejected')` — `UNSUPPORTED_LOCALE`.
- `test('CST-SF-UPD-009: valid date of birth boundary is accepted')` — Leap day and documented age range.
- `test('CST-SF-UPD-010: future impossible and out-of-range date of birth is rejected')` — `INVALID_DATE_OF_BIRTH`.
- `test('CST-SF-UPD-011: stale expected revision rejects the entire profile update')` — `REVISION_CONFLICT`, `retryable: true`, no partial write.
- `test('CST-SF-UPD-012: non-positive fractional and unsafe expected revisions are rejected')` — `INVALID_REVISION`.
- `test('CST-SF-UPD-013: retry with the same idempotency key returns the original profile result')` — No second revision increment.
- `test('CST-SF-UPD-014: reusing an idempotency key with a different profile payload is rejected')` — Idempotency key cannot alias another command.
- `test('CST-SF-UPD-015: blank oversized and malformed idempotency keys are rejected')` — Field error before workflow start.
- `test('CST-SF-UPD-016: concurrent updates with one revision allow exactly one winner')` — Lost update impossible.

## `customer-addresses.spec.ts`

- `test('CST-SF-ADDR-001: customer creates a complete international address')` — All portable fields, formatting, UNVALIDATED state and new customer revision.
- `test('CST-SF-ADDR-002: customer creates a minimal valid address')` — Required-only input and nullable output defaults.
- `test('CST-SF-ADDR-003: first address can become both shipping and billing default')` — Both default pointers consistent.
- `test('CST-SF-ADDR-004: customer creates separate shipping and billing default addresses')` — Exactly one of each.
- `test('CST-SF-ADDR-005: assigning a new default atomically clears the previous default')` — No transient duplicate defaults.
- `test('CST-SF-ADDR-006: customer updates every address field')` — Full replacement and normalization.
- `test('CST-SF-ADDR-007: address update can independently set or preserve default flags')` — Undefined differs from false.
- `test('CST-SF-ADDR-008: customer deletes a non-default address')` — Deleted ID, revision and connection count.
- `test('CST-SF-ADDR-009: deleting a default address clears the matching defaults consistently')` — Other default remains intact.
- `test('CST-SF-ADDR-010: customer sets both defaults to one existing address atomically')` — `defaults: [SHIPPING, BILLING]`.
- `test('CST-SF-ADDR-011: customer clears shipping billing and both defaults with null addressId')` — Clear semantics.
- `test('CST-SF-ADDR-012: empty defaults list and duplicate defaults are rejected')` — `INVALID_DEFAULTS`/`DUPLICATE_DEFAULT`.
- `test('CST-SF-ADDR-013: missing required address1 city or country code is rejected')` — GraphQL/Zod/`INVALID_VALUE` field paths.
- `test('CST-SF-ADDR-014: whitespace-only and oversized address values are rejected')` — Boundary matrix.
- `test('CST-SF-ADDR-015: unsupported country code is rejected')` — `INVALID_COUNTRY_CODE`.
- `test('CST-SF-ADDR-016: invalid phone is rejected')` — `INVALID_PHONE` and no write.
- `test('CST-SF-ADDR-017: formatted address output is deterministic across optional fields')` — `formatted`, `formattedArea`, country/province mappings.
- `test('CST-SF-ADDR-018: address and defaults update reset or preserve validation metadata according to contract')` — Edited data cannot remain falsely VALID.
- `test('CST-SF-ADDR-019: missing cross-customer cross-store malformed and wrong-type address IDs are safe')` — `NOT_FOUND`/`INVALID_ID`, no leak.
- `test('CST-SF-ADDR-020: stale customer revision rejects create update delete and default set')` — Табличный conflict test.
- `test('CST-SF-ADDR-021: retrying each address mutation with the same idempotency key is side-effect free')` — Create не дублируется, revisions stable.
- `test('CST-SF-ADDR-022: concurrent default changes preserve the single-default invariants')` — Один revision winner.
- `test('CST-SF-ADDR-023: customer reads one owned address and inaccessible IDs return null')` — `address(id)` contract.
- `test('CST-SF-ADDR-024: addresses supports default stable forward and backward pagination')` — Creation order, nodes/edges/count/pageInfo.
- `test('CST-SF-ADDR-025: addresses rejects invalid sizes cursors and pagination combinations')` — Empty/end pages and malformed/mismatched cursor.

## `customer-marketing-consents.spec.ts`

- `test('CST-SF-MKT-001: customer reads current marketing consent for every configured channel')` — EMAIL/SMS/WHATSAPP/PUSH list and contact-linked projections.
- `test('CST-SF-MKT-002: customer subscribes and unsubscribes email marketing')` — State, opt-in and timestamps.
- `test('CST-SF-MKT-003: customer subscribes and unsubscribes SMS and WhatsApp marketing')` — Phone contact point used.
- `test('CST-SF-MKT-004: customer subscribes and unsubscribes push marketing when a contact point exists')` — Channel-specific success path.
- `test('CST-SF-MKT-005: subscribe without the channel contact point is rejected')` — `CONTACT_POINT_UNAVAILABLE`.
- `test('CST-SF-MKT-006: invalid channel and non-selectable state are rejected')` — PENDING/INVALID cannot be client-selected.
- `test('CST-SF-MKT-007: repeated transition updates consent timestamps and preserves immutable evidence')` — Current record plus audit history.
- `test('CST-SF-MKT-008: stale and invalid revision reject consent changes')` — Correct conflict/retryable contract.
- `test('CST-SF-MKT-009: same idempotency key returns the original consent transition')` — No duplicate event.
- `test('CST-SF-MKT-010: concurrent opposite consent transitions allow one revision winner')` — Final state deterministic.
- `test('CST-SF-MKT-011: consent is isolated by customer and store even for identical contacts')` — No cross-account sharing.

## `customer-tax-identifiers.spec.ts`

- `test('CST-SF-TAX-001: customer creates an unverified tax identifier')` — Defaults, normalized persistence hidden from storefront, revision increment.
- `test('CST-SF-TAX-002: customer creates a primary tax identifier')` — Primary pointer semantics.
- `test('CST-SF-TAX-003: creating or updating a new primary identifier clears the old primary')` — At most one primary.
- `test('CST-SF-TAX-004: customer updates identifier type country and value')` — Returned object reflects normalized input.
- `test('CST-SF-TAX-005: changing identifier identity resets VERIFIED REJECTED or EXPIRED status to UNVERIFIED')` — Customer cannot retain merchant verification.
- `test('CST-SF-TAX-006: changing only isPrimary does not forge or unexpectedly reset verification')` — Status behavior explicit.
- `test('CST-SF-TAX-007: customer deletes an owned tax identifier')` — Deleted ID, revision and count.
- `test('CST-SF-TAX-008: blank invalid and oversized identifier type or value are rejected')` — `INVALID_IDENTIFIER_TYPE`/`INVALID_VALUE`.
- `test('CST-SF-TAX-009: invalid country code is rejected')` — `INVALID_COUNTRY_CODE`.
- `test('CST-SF-TAX-010: duplicate normalized tax identifier is rejected')` — `TAX_IDENTIFIER_ALREADY_EXISTS`.
- `test('CST-SF-TAX-011: customer cannot set status verification timestamps or exemption fields')` — Schema mass-assignment boundary.
- `test('CST-SF-TAX-012: missing cross-customer cross-store malformed and wrong-type tax IDs are safe')` — Ownership errors reveal nothing.
- `test('CST-SF-TAX-013: stale or invalid revision rejects create update and delete')` — Табличный optimistic-lock test.
- `test('CST-SF-TAX-014: retrying each tax mutation with the same idempotency key is side-effect free')` — No duplicates/revision inflation.
- `test('CST-SF-TAX-015: concurrent primary updates preserve one-primary invariant')` — One revision winner.
- `test('CST-SF-TAX-016: tax identifiers support stable forward and backward pagination')` — Nodes/edges/count/pageInfo and default page.
- `test('CST-SF-TAX-017: customer sees merchant-approved tax exemptions but cannot mutate them')` — All statuses/file refs readable, no storefront mutation surface.
- `test('CST-SF-TAX-018: tax exemptions and certificate files are isolated by customer and store')` — Foreign records absent.
- `test('CST-SF-TAX-019: unavailable certificate file resolves as null without failing the exemption connection')` — Federation degradation.

## `customer-data-requests.spec.ts`

- `test('CST-SF-PRIV-001: customer creates an ACCESS request')` — PENDING, audit timestamps, no correction details.
- `test('CST-SF-PRIV-002: customer creates an EXPORT request')` — Success and result-file lifecycle readiness.
- `test('CST-SF-PRIV-003: customer creates a CORRECTION request with structured details')` — Details round-trip safely.
- `test('CST-SF-PRIV-004: customer creates an ERASURE request')` — Success without forbidden details.
- `test('CST-SF-PRIV-005: CORRECTION requires non-empty valid correction details')` — `CORRECTION_DETAILS_REQUIRED`.
- `test('CST-SF-PRIV-006: non-correction request rejects correction details')` — `CORRECTION_DETAILS_FORBIDDEN`.
- `test('CST-SF-PRIV-007: malformed or oversized correction details are rejected safely')` — JSON/size/depth boundary, no sensitive echo.
- `test('CST-SF-PRIV-008: unknown request type is rejected')` — `INVALID_TYPE` where runtime validation applies.
- `test('CST-SF-PRIV-009: customer cancels a pending privacy request')` — CANCELLED and finishedAt/updatedAt.
- `test('CST-SF-PRIV-010: processing completed rejected and cancelled requests cannot be cancelled')` — `INVALID_STATE` matrix.
- `test('CST-SF-PRIV-011: stale malformed and future expectedUpdatedAt are rejected')` — `UPDATED_AT_CONFLICT`/`INVALID_UPDATED_AT`.
- `test('CST-SF-PRIV-012: missing cross-customer cross-store malformed and wrong-type request IDs are safe')` — No existence leak.
- `test('CST-SF-PRIV-013: retrying create and cancel with the same idempotency key is side-effect free')` — No duplicate workflow/audit.
- `test('CST-SF-PRIV-014: reusing an idempotency key for another privacy payload is rejected')` — Key/payload binding.
- `test('CST-SF-PRIV-015: customer reads one owned data request and inaccessible IDs return null')` — `dataRequest(id)` contract.
- `test('CST-SF-PRIV-016: data requests support stable forward and backward pagination')` — All statuses, nodes/edges/count/pageInfo.
- `test('CST-SF-PRIV-017: customer can read a completed result file but not another customer result file')` — Media federation + ownership.
- `test('CST-SF-PRIV-018: erasure completion removes customer self-service access and redacts PII')` — End-to-end privacy boundary.

## `customer-wishlists.spec.ts`

- `test('CST-SF-WISH-001: customer creates the first wishlist as the default')` — First-list invariant, trimmed name and timestamps.
- `test('CST-SF-WISH-002: customer creates additional non-default wishlists')` — Exactly one default remains.
- `test('CST-SF-WISH-003: wishlist names accept valid Unicode and preserve display form')` — NFKC normalization only affects uniqueness.
- `test('CST-SF-WISH-004: blank and whitespace-only wishlist names are rejected')` — `INVALID_NAME`.
- `test('CST-SF-WISH-005: wishlist name accepts 128 Unicode characters and rejects 129')` — Code-point boundary.
- `test('CST-SF-WISH-006: normalized case and Unicode-equivalent duplicate names are rejected')` — `WISHLIST_NAME_TAKEN`.
- `test('CST-SF-WISH-007: same normalized wishlist name is allowed for another customer or store')` — Ownership-scoped uniqueness.
- `test('CST-SF-WISH-008: customer renames default and non-default wishlists')` — expectedUpdatedAt and new timestamps.
- `test('CST-SF-WISH-009: rename to the same normalized name has deterministic no-op semantics')` — Timestamp/idempotency behavior fixed.
- `test('CST-SF-WISH-010: stale malformed and future expectedUpdatedAt reject rename and delete')` — `UPDATED_AT_CONFLICT`/`INVALID_UPDATED_AT`.
- `test('CST-SF-WISH-011: customer deletes a non-default empty wishlist')` — Deleted ID and connection count.
- `test('CST-SF-WISH-012: deleting a populated non-default wishlist removes its items atomically')` — No orphan items.
- `test('CST-SF-WISH-013: default wishlist cannot be deleted')` — `DEFAULT_WISHLIST_DELETE_FORBIDDEN`.
- `test('CST-SF-WISH-014: missing cross-customer cross-store malformed and wrong-type wishlist IDs are safe')` — `NOT_FOUND`/ID validation.
- `test('CST-SF-WISH-015: customer adds a published current-store product to a selected wishlist')` — Item and federated Product resolve.
- `test('CST-SF-WISH-016: omitting wishlistId adds the product to the default wishlist')` — Existing default is used.
- `test('CST-SF-WISH-017: omitting wishlistId creates or selects the default wishlist according to contract')` — Empty-account behavior explicit.
- `test('CST-SF-WISH-018: adding the same product twice returns the existing item without duplication')` — Unique item/idempotent business behavior.
- `test('CST-SF-WISH-019: missing deleted unpublished foreign-store and malformed products are rejected')` — `PRODUCT_NOT_FOUND`/`PRODUCT_NOT_PUBLISHED` with no saved row.
- `test('CST-SF-WISH-020: Catalog outage returns a retryable dependency error without saving an item')` — `CATALOG_UNAVAILABLE`.
- `test('CST-SF-WISH-021: customer removes an owned wishlist item')` — Deleted item ID and count.
- `test('CST-SF-WISH-022: missing cross-customer cross-store malformed and wrong-type wishlist item IDs are safe')` — No ownership leak.
- `test('CST-SF-WISH-023: retrying every wishlist mutation with the same idempotency key is side-effect free')` — Original success/error replayed consistently.
- `test('CST-SF-WISH-024: reusing a wishlist idempotency key with another payload is rejected')` — Payload binding.
- `test('CST-SF-WISH-025: concurrent same-name wishlist creates produce one wishlist')` — One success/existing result and no duplicate.
- `test('CST-SF-WISH-026: concurrent adds of one product produce one wishlist item')` — Unique relation invariant.
- `test('CST-SF-WISH-027: customer reads default wishlist and one owned wishlist')` — `defaultWishlist`/`wishlist(id)` consistency.
- `test('CST-SF-WISH-028: wishlists default to 20 and cap page size at 100')` — Default/max pagination contract.
- `test('CST-SF-WISH-029: wishlists support stable forward and backward pagination')` — createdAt+ID ascending, no duplicates/gaps.
- `test('CST-SF-WISH-030: wishlist items default to 20 and cap page size at 100')` — Default/max contract.
- `test('CST-SF-WISH-031: wishlist items support stable forward and backward pagination')` — addedAt+ID descending.
- `test('CST-SF-WISH-032: malformed mismatched and invalid pagination inputs are rejected safely')` — Cursor cannot cross wishlist/connection/owner.
- `test('CST-SF-WISH-033: unpublished or deleted saved product remains as an item with null product')` — Persisted preference is not silently deleted.
- `test('CST-SF-WISH-034: one unresolved federated product does not fail the complete items connection')` — Partial federation resilience.

## `customer-comparisons.spec.ts`

- `test('CST-SF-CMP-001: customer adds a published concrete variant to comparisons')` — New persisted revision and Catalog-owned presentation can be refetched.
- `test('CST-SF-CMP-002: adding a second variant preserves deterministic selection order')` — Positions stable.
- `test('CST-SF-CMP-003: adding an already selected variant is idempotent')` — No duplicate item or unexpected revision.
- `test('CST-SF-CMP-004: missing deleted unpublished parent-product foreign-store and malformed variants are rejected')` — `VARIANT_NOT_AVAILABLE`.
- `test('CST-SF-CMP-005: customer removes a selected variant')` — Revision increments and presentation updates.
- `test('CST-SF-CMP-006: removing an unselected variant is rejected')` — `VARIANT_NOT_SELECTED` without revision change.
- `test('CST-SF-CMP-007: customer clears all selected variants in one category')` — Only current category members removed atomically.
- `test('CST-SF-CMP-008: clearing an empty valid category has deterministic no-op semantics')` — Revision behavior explicit.
- `test('CST-SF-CMP-009: missing foreign-store and malformed category IDs are rejected')` — `CATEGORY_NOT_FOUND`/ID validation.
- `test('CST-SF-CMP-010: stale expected revision rejects add remove and category clear')` — `REVISION_CONFLICT`, `retryable: true`.
- `test('CST-SF-CMP-011: non-positive fractional and unsafe comparison revisions are rejected')` — `INVALID_REVISION`.
- `test('CST-SF-CMP-012: retrying each comparison mutation with the same idempotency key is side-effect free')` — Original result/revision returned.
- `test('CST-SF-CMP-013: reusing a comparison idempotency key with another payload is rejected')` — Payload binding.
- `test('CST-SF-CMP-014: concurrent comparison writes with one revision allow exactly one winner')` — Ordered set remains consistent.
- `test('CST-SF-CMP-015: Catalog outage is retryable and never changes persisted selection')` — `CATALOG_UNAVAILABLE`.
- `test('CST-SF-CMP-016: comparison selection is isolated by customer and store')` — Same variant choices do not share state.
- `test('CST-SF-CMP-017: Catalog federation presents saved comparisons grouped by current primary category')` — End-to-end Customers persistence + Catalog read model.
- `test('CST-SF-CMP-018: category changes and unavailable variants do not expose another store or corrupt selection')` — Reclassification edge case remains fail-closed.

## `relay-pagination.spec.ts`

- `test('CST-SF-PAGE-001: every customer connection returns matching nodes and edge nodes')` — Addresses, tax IDs/exemptions, requests, wishlists/items.
- `test('CST-SF-PAGE-002: every empty customer connection has canonical empty pageInfo')` — Empty arrays, null cursors, false flags, zero count.
- `test('CST-SF-PAGE-003: every customer connection supports first after last and before')` — Shared table-driven Relay contract.
- `test('CST-SF-PAGE-004: every customer connection preserves deterministic order when timestamps tie')` — ID tie-breaker.
- `test('CST-SF-PAGE-005: inserting or deleting around a cursor does not duplicate already returned nodes')` — Keyset stability.
- `test('CST-SF-PAGE-006: cursors cannot be reused across connection types customers stores or owners')` — Safe malformed/mismatch behavior.
- `test('CST-SF-PAGE-007: invalid negative zero excessive and contradictory pagination arguments are rejected')` — Boundary matrix.

## Общие критерии для реализации

- Каждая mutation проверяет success payload, полный `CustomerUserError`, persisted state, customer revision/updatedAt и отсутствие частичного commit.
- Каждая mutation с `idempotencyKey` проверяет exact retry, concurrent retry, reuse с другим payload и отсутствие повторных side effects.
- Все optimistic concurrency inputs проверяются current, stale, malformed, zero, negative, fractional и unsafe values.
- Все ownership inputs проверяются current customer, another customer in same store, another store, missing ID, wrong global-ID type и malformed ID.
- Все строки проверяются на empty, whitespace-only, Unicode normalization, exact maximum и maximum+1; даты — до, ровно на и после boundary.
- Federation scenarios проверяются с available, unpublished/deleted, foreign-store, unresolved и temporarily unavailable Catalog/Media entities.
