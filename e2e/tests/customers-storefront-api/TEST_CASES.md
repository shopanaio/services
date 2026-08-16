# Customers Storefront API

## `authentication-and-isolation.spec.ts`

- `test('storefront channel credential without a customer session returns null customer')` — Channel authentication не подменяет customer identity.
- `test('missing storefront channel credential is rejected before Customers resolution')` — Gateway возвращает credential-required contract.
- `test('invalid customer bearer token is rejected')` — Возвращается customer-auth error без anonymous fallback.
- `test('expired revoked and malformed customer tokens are rejected identically')` — Нет token oracle и утечки claims.
- `test('valid session resolves only its linked active customer')` — Principal/store mapping однозначен.
- `test('customer token for store A cannot be used with store B storefront')` — Cross-store replay закрыт.
- `test('customer A cannot read customer B owned entities by global ID')` — Address, wishlist, data request и related nodes выглядят отсутствующими.
- `test('customer A cannot mutate customer B owned entities by global ID')` — Safe `NOT_FOUND`, обе записи неизменны.
- `test('blocked disabled merged and redacted customers cannot use self-service mutations')` — `CUSTOMER_UNAVAILABLE` и `retryable` корректны.
- `test('blocked disabled merged and redacted customers are not returned by customer query')` — Lifecycle fail-closed.
- `test('storefront never exposes admin-only PII notes moderation lifecycle IAM or statistics fields')` — Schema boundary проверена introspection/operation validation.
- `test('untrusted identity and store headers cannot replace gateway signed context')` — Forged selectors игнорируются/отклоняются.
- `test('malformed and wrong-type global IDs return safe field errors')` — Нет runtime/stack leak.
- `test('all user errors expose stable code field message and retryable values')` — Общий error contract для validation, conflict, ownership и dependency errors.

## `customer-query.spec.ts`

- `test('authenticated customer reads the complete storefront profile')` — Profile, account status, verified contacts, defaults, consents, tax, requests и timestamps.
- `test('customer query returns null when no customer is linked to the session')` — Валидный application user без projection не получает чужой профиль.
- `test('customer display name falls back deterministically for partial profiles')` — Name/company/contact fallback не раскрывает скрытые поля.
- `test('email and phone projections preserve IAM verification state')` — Verified flags синхронизированы, credentials не экспонируются.
- `test('customer query batches nested fields without cross-customer cache leakage')` — Loader cache scoped to request/customer/store.
- `test('recently committed self-service writes are visible in the mutation response and next query')` — Loader invalidation/read-your-writes.

## `customer-update.spec.ts`

- `test('customer updates every editable profile field')` — Все non-auth fields round-trip, revision grows once.
- `test('omitted profile fields remain unchanged')` — Patch semantics.
- `test('nullable profile fields can be cleared explicitly')` — Null clear semantics.
- `test('customer cannot update email phone verification account status or admin-only fields')` — GraphQL schema rejects mass assignment.
- `test('customer update trims and normalizes supported strings')` — Display values и normalization contract.
- `test('empty and oversized profile values are rejected with precise fields')` — `INVALID_VALUE` and length boundaries.
- `test('valid supported BCP 47 locale is accepted')` — Locale persists canonically.
- `test('unsupported or malformed locale is rejected')` — `UNSUPPORTED_LOCALE`.
- `test('valid date of birth boundary is accepted')` — Leap day and documented age range.
- `test('future impossible and out-of-range date of birth is rejected')` — `INVALID_DATE_OF_BIRTH`.
- `test('stale expected revision rejects the entire profile update')` — `REVISION_CONFLICT`, `retryable: true`, no partial write.
- `test('non-positive fractional and unsafe expected revisions are rejected')` — `INVALID_REVISION`.
- `test('retry with the same idempotency key returns the original profile result')` — No second revision increment.
- `test('reusing an idempotency key with a different profile payload is rejected')` — Idempotency key cannot alias another command.
- `test('blank oversized and malformed idempotency keys are rejected')` — Field error before workflow start.
- `test('concurrent updates with one revision allow exactly one winner')` — Lost update impossible.

## `customer-addresses.spec.ts`

- `test('customer creates a complete international address')` — All portable fields, formatting, UNVALIDATED state and new customer revision.
- `test('customer creates a minimal valid address')` — Required-only input and nullable output defaults.
- `test('first address can become both shipping and billing default')` — Both default pointers consistent.
- `test('customer creates separate shipping and billing default addresses')` — Exactly one of each.
- `test('assigning a new default atomically clears the previous default')` — No transient duplicate defaults.
- `test('customer updates every address field')` — Full replacement and normalization.
- `test('address update can independently set or preserve default flags')` — Undefined differs from false.
- `test('customer deletes a non-default address')` — Deleted ID, revision and connection count.
- `test('deleting a default address clears the matching defaults consistently')` — Other default remains intact.
- `test('customer sets both defaults to one existing address atomically')` — `defaults: [SHIPPING, BILLING]`.
- `test('customer clears shipping billing and both defaults with null addressId')` — Clear semantics.
- `test('empty defaults list and duplicate defaults are rejected')` — `INVALID_DEFAULTS`/`DUPLICATE_DEFAULT`.
- `test('missing required address1 city or country code is rejected')` — GraphQL/Zod/`INVALID_VALUE` field paths.
- `test('whitespace-only and oversized address values are rejected')` — Boundary matrix.
- `test('unsupported country code is rejected')` — `INVALID_COUNTRY_CODE`.
- `test('invalid phone is rejected')` — `INVALID_PHONE` and no write.
- `test('formatted address output is deterministic across optional fields')` — `formatted`, `formattedArea`, country/province mappings.
- `test('address and defaults update reset or preserve validation metadata according to contract')` — Edited data cannot remain falsely VALID.
- `test('missing cross-customer cross-store malformed and wrong-type address IDs are safe')` — `NOT_FOUND`/`INVALID_ID`, no leak.
- `test('stale customer revision rejects create update delete and default set')` — Табличный conflict test.
- `test('retrying each address mutation with the same idempotency key is side-effect free')` — Create не дублируется, revisions stable.
- `test('concurrent default changes preserve the single-default invariants')` — Один revision winner.
- `test('customer reads one owned address and inaccessible IDs return null')` — `address(id)` contract.
- `test('addresses supports default stable forward and backward pagination')` — Creation order, nodes/edges/count/pageInfo.
- `test('addresses rejects invalid sizes cursors and pagination combinations')` — Empty/end pages and malformed/mismatched cursor.

## `customer-marketing-consents.spec.ts`

- `test('customer reads current marketing consent for every configured channel')` — EMAIL/SMS/WHATSAPP/PUSH list and contact-linked projections.
- `test('customer subscribes and unsubscribes email marketing')` — State, opt-in and timestamps.
- `test('customer subscribes and unsubscribes SMS and WhatsApp marketing')` — Phone contact point used.
- `test('customer subscribes and unsubscribes push marketing when a contact point exists')` — Channel-specific success path.
- `test('subscribe without the channel contact point is rejected')` — `CONTACT_POINT_UNAVAILABLE`.
- `test('invalid channel and non-selectable state are rejected')` — PENDING/INVALID cannot be client-selected.
- `test('repeated transition updates consent timestamps and preserves immutable evidence')` — Current record plus audit history.
- `test('stale and invalid revision reject consent changes')` — Correct conflict/retryable contract.
- `test('same idempotency key returns the original consent transition')` — No duplicate event.
- `test('concurrent opposite consent transitions allow one revision winner')` — Final state deterministic.
- `test('consent is isolated by customer and store even for identical contacts')` — No cross-account sharing.

## `customer-tax-identifiers.spec.ts`

- `test('customer creates an unverified tax identifier')` — Defaults, normalized persistence hidden from storefront, revision increment.
- `test('customer creates a primary tax identifier')` — Primary pointer semantics.
- `test('creating or updating a new primary identifier clears the old primary')` — At most one primary.
- `test('customer updates identifier type country and value')` — Returned object reflects normalized input.
- `test('changing identifier identity resets VERIFIED REJECTED or EXPIRED status to UNVERIFIED')` — Customer cannot retain merchant verification.
- `test('changing only isPrimary does not forge or unexpectedly reset verification')` — Status behavior explicit.
- `test('customer deletes an owned tax identifier')` — Deleted ID, revision and count.
- `test('blank invalid and oversized identifier type or value are rejected')` — `INVALID_IDENTIFIER_TYPE`/`INVALID_VALUE`.
- `test('invalid country code is rejected')` — `INVALID_COUNTRY_CODE`.
- `test('duplicate normalized tax identifier is rejected')` — `TAX_IDENTIFIER_ALREADY_EXISTS`.
- `test('customer cannot set status verification timestamps or exemption fields')` — Schema mass-assignment boundary.
- `test('missing cross-customer cross-store malformed and wrong-type tax IDs are safe')` — Ownership errors reveal nothing.
- `test('stale or invalid revision rejects create update and delete')` — Табличный optimistic-lock test.
- `test('retrying each tax mutation with the same idempotency key is side-effect free')` — No duplicates/revision inflation.
- `test('concurrent primary updates preserve one-primary invariant')` — One revision winner.
- `test('tax identifiers support stable forward and backward pagination')` — Nodes/edges/count/pageInfo and default page.
- `test('customer sees merchant-approved tax exemptions but cannot mutate them')` — All statuses/file refs readable, no storefront mutation surface.
- `test('tax exemptions and certificate files are isolated by customer and store')` — Foreign records absent.
- `test('unavailable certificate file resolves as null without failing the exemption connection')` — Federation degradation.

## `customer-data-requests.spec.ts`

- `test('customer creates an ACCESS request')` — PENDING, audit timestamps, no correction details.
- `test('customer creates an EXPORT request')` — Success and result-file lifecycle readiness.
- `test('customer creates a CORRECTION request with structured details')` — Details round-trip safely.
- `test('customer creates an ERASURE request')` — Success without forbidden details.
- `test('CORRECTION requires non-empty valid correction details')` — `CORRECTION_DETAILS_REQUIRED`.
- `test('non-correction request rejects correction details')` — `CORRECTION_DETAILS_FORBIDDEN`.
- `test('malformed or oversized correction details are rejected safely')` — JSON/size/depth boundary, no sensitive echo.
- `test('unknown request type is rejected')` — `INVALID_TYPE` where runtime validation applies.
- `test('customer cancels a pending privacy request')` — CANCELLED and finishedAt/updatedAt.
- `test('processing completed rejected and cancelled requests cannot be cancelled')` — `INVALID_STATE` matrix.
- `test('stale malformed and future expectedUpdatedAt are rejected')` — `UPDATED_AT_CONFLICT`/`INVALID_UPDATED_AT`.
- `test('missing cross-customer cross-store malformed and wrong-type request IDs are safe')` — No existence leak.
- `test('retrying create and cancel with the same idempotency key is side-effect free')` — No duplicate workflow/audit.
- `test('reusing an idempotency key for another privacy payload is rejected')` — Key/payload binding.
- `test('customer reads one owned data request and inaccessible IDs return null')` — `dataRequest(id)` contract.
- `test('data requests support stable forward and backward pagination')` — All statuses, nodes/edges/count/pageInfo.
- `test('customer can read a completed result file but not another customer result file')` — Media federation + ownership.
- `test('erasure completion removes customer self-service access and redacts PII')` — End-to-end privacy boundary.

## `customer-wishlists.spec.ts`

- `test('customer creates the first wishlist as the default')` — First-list invariant, trimmed name and timestamps.
- `test('customer creates additional non-default wishlists')` — Exactly one default remains.
- `test('wishlist names accept valid Unicode and preserve display form')` — NFKC normalization only affects uniqueness.
- `test('blank and whitespace-only wishlist names are rejected')` — `INVALID_NAME`.
- `test('wishlist name accepts 128 Unicode characters and rejects 129')` — Code-point boundary.
- `test('normalized case and Unicode-equivalent duplicate names are rejected')` — `WISHLIST_NAME_TAKEN`.
- `test('same normalized wishlist name is allowed for another customer or store')` — Ownership-scoped uniqueness.
- `test('customer renames default and non-default wishlists')` — expectedUpdatedAt and new timestamps.
- `test('rename to the same normalized name has deterministic no-op semantics')` — Timestamp/idempotency behavior fixed.
- `test('stale malformed and future expectedUpdatedAt reject rename and delete')` — `UPDATED_AT_CONFLICT`/`INVALID_UPDATED_AT`.
- `test('customer deletes a non-default empty wishlist')` — Deleted ID and connection count.
- `test('deleting a populated non-default wishlist removes its items atomically')` — No orphan items.
- `test('default wishlist cannot be deleted')` — `DEFAULT_WISHLIST_DELETE_FORBIDDEN`.
- `test('missing cross-customer cross-store malformed and wrong-type wishlist IDs are safe')` — `NOT_FOUND`/ID validation.
- `test('customer adds a published current-store product to a selected wishlist')` — Item and federated Product resolve.
- `test('omitting wishlistId adds the product to the default wishlist')` — Existing default is used.
- `test('omitting wishlistId creates or selects the default wishlist according to contract')` — Empty-account behavior explicit.
- `test('adding the same product twice returns the existing item without duplication')` — Unique item/idempotent business behavior.
- `test('missing deleted unpublished foreign-store and malformed products are rejected')` — `PRODUCT_NOT_FOUND`/`PRODUCT_NOT_PUBLISHED` with no saved row.
- `test('Catalog outage returns a retryable dependency error without saving an item')` — `CATALOG_UNAVAILABLE`.
- `test('customer removes an owned wishlist item')` — Deleted item ID and count.
- `test('missing cross-customer cross-store malformed and wrong-type wishlist item IDs are safe')` — No ownership leak.
- `test('retrying every wishlist mutation with the same idempotency key is side-effect free')` — Original success/error replayed consistently.
- `test('reusing a wishlist idempotency key with another payload is rejected')` — Payload binding.
- `test('concurrent same-name wishlist creates produce one wishlist')` — One success/existing result and no duplicate.
- `test('concurrent adds of one product produce one wishlist item')` — Unique relation invariant.
- `test('customer reads default wishlist and one owned wishlist')` — `defaultWishlist`/`wishlist(id)` consistency.
- `test('wishlists default to 20 and cap page size at 100')` — Default/max pagination contract.
- `test('wishlists support stable forward and backward pagination')` — createdAt+ID ascending, no duplicates/gaps.
- `test('wishlist items default to 20 and cap page size at 100')` — Default/max contract.
- `test('wishlist items support stable forward and backward pagination')` — addedAt+ID descending.
- `test('malformed mismatched and invalid pagination inputs are rejected safely')` — Cursor cannot cross wishlist/connection/owner.
- `test('unpublished or deleted saved product remains as an item with null product')` — Persisted preference is not silently deleted.
- `test('one unresolved federated product does not fail the complete items connection')` — Partial federation resilience.

## `customer-comparisons.spec.ts`

- `test('customer adds a published concrete variant to comparisons')` — New persisted revision and Catalog-owned presentation can be refetched.
- `test('adding a second variant preserves deterministic selection order')` — Positions stable.
- `test('adding an already selected variant is idempotent')` — No duplicate item or unexpected revision.
- `test('missing deleted unpublished parent-product foreign-store and malformed variants are rejected')` — `VARIANT_NOT_AVAILABLE`.
- `test('customer removes a selected variant')` — Revision increments and presentation updates.
- `test('removing an unselected variant is rejected')` — `VARIANT_NOT_SELECTED` without revision change.
- `test('customer clears all selected variants in one category')` — Only current category members removed atomically.
- `test('clearing an empty valid category has deterministic no-op semantics')` — Revision behavior explicit.
- `test('missing foreign-store and malformed category IDs are rejected')` — `CATEGORY_NOT_FOUND`/ID validation.
- `test('stale expected revision rejects add remove and category clear')` — `REVISION_CONFLICT`, `retryable: true`.
- `test('non-positive fractional and unsafe comparison revisions are rejected')` — `INVALID_REVISION`.
- `test('retrying each comparison mutation with the same idempotency key is side-effect free')` — Original result/revision returned.
- `test('reusing a comparison idempotency key with another payload is rejected')` — Payload binding.
- `test('concurrent comparison writes with one revision allow exactly one winner')` — Ordered set remains consistent.
- `test('Catalog outage is retryable and never changes persisted selection')` — `CATALOG_UNAVAILABLE`.
- `test('comparison selection is isolated by customer and store')` — Same variant choices do not share state.
- `test('Catalog federation presents saved comparisons grouped by current primary category')` — End-to-end Customers persistence + Catalog read model.
- `test('category changes and unavailable variants do not expose another store or corrupt selection')` — Reclassification edge case remains fail-closed.

## `relay-pagination.spec.ts`

- `test('every customer connection returns matching nodes and edge nodes')` — Addresses, tax IDs/exemptions, requests, wishlists/items.
- `test('every empty customer connection has canonical empty pageInfo')` — Empty arrays, null cursors, false flags, zero count.
- `test('every customer connection supports first after last and before')` — Shared table-driven Relay contract.
- `test('every customer connection preserves deterministic order when timestamps tie')` — ID tie-breaker.
- `test('inserting or deleting around a cursor does not duplicate already returned nodes')` — Keyset stability.
- `test('cursors cannot be reused across connection types customers stores or owners')` — Safe malformed/mismatch behavior.
- `test('invalid negative zero excessive and contradictory pagination arguments are rejected')` — Boundary matrix.
