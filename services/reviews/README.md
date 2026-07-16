# Reviews Service

Shopana bounded context for product reviews and product Q&A.

The service uses handwritten PostgreSQL migrations executed by
`node-pg-migrate`. Runtime repositories use Drizzle, but the migration SQL is
the source of truth for the physical database layout.

## Model principles

- Every tenant-owned row carries `store_id`. Tenant scope is indexed but is not
  part of primary or foreign keys.
- All persisted UUIDs are UUIDv7. UUID references owned by another service do
  not have cross-service database foreign keys.
- `content_item` is the common UGC root. Reviews, review replies, product
  questions and question answers extend it through a local typed foreign key.
- Moderation eligibility and channel publication are separate concerns:
  `content_item.status` records the moderation result, while
  `content_publication` controls delivery to a locale/channel destination.
- Content supports optimistic concurrency through `revision`, soft deletion
  through `deleted_at`, and privacy redaction through `redacted_at`.
- Counters and product summaries are explicit read models. Database triggers do
  not maintain them.

## Entity relationships

```text
content_item
├── review
│   ├── review_rating
│   ├── review_media
│   ├── review_reply ────────────────> content_item (REVIEW_REPLY)
│   └── review_request
│       └── review_request_event
├── product_question
│   ├── question_answer ─────────────> content_item (QUESTION_ANSWER)
│   └── question_subscription
├── content_translation
├── content_publication
├── content_vote
├── content_report
├── content_metrics
├── moderation_case
│   └── moderation_event
├── content_revision
├── moderation_signal
└── content_external_reference

rating_criterion
├── rating_criterion_translation
├── rating_criterion_assignment
├── review_rating
└── product_rating_criterion_summary
```

## Configuration entities

### `store_configuration`

One configuration row per store. It controls whether reviews, questions, guest
submissions, customer answers and review requests are enabled. It also defines
moderation modes, verified-purchase requirements, duplicate-review policy,
request scheduling, edit windows and review/Q&A size limits.

The row has its own UUID identity; `store_id` is protected by a unique
constraint rather than used as the primary key.

### `rating_criterion`

Defines an optional detailed rating dimension such as quality, value, fit or
delivery experience. A criterion contains a stable store-local code, default
label and description, aggregation weight, required/active flags, default
catalog scope and display order.

The top-level `review.rating` remains the required overall 1–5 rating. Detailed
criteria complement it and do not replace it.

### `rating_criterion_translation`

Localized title and description for a rating criterion. A criterion has at most
one translation per locale.

### `rating_criterion_assignment`

Restricts a criterion to a catalog product or category and can override whether
the criterion is required and where it appears. `target_id` points to Catalog;
the Reviews database intentionally does not create a cross-service FK.

## Shared content entities

### `content_item`

Canonical UGC record shared by all public content types:

- `REVIEW`;
- `REVIEW_REPLY`;
- `PRODUCT_QUESTION`;
- `QUESTION_ANSWER`.

It owns the title where applicable, body, source locale, author snapshot,
optional Customers/IAM identities, source channel, idempotency key, moderation
status, moderator note, publication timestamps and optimistic revision.

The author snapshot allows imported and guest content to survive customer
profile changes. `author_customer_id` is used for federation when the author is
a Shopana customer; guest email can be removed during privacy redaction.

Status values are `PENDING`, `PUBLISHED` and `REJECTED`. Rejected content must
have a moderation note, and published content must have a publication timestamp.
Trigram indexes support case-insensitive Admin search over title and body.

### `content_translation`

Stores a human, machine or imported translation of a content item. Each
content/locale pair is unique and has its own moderation status, revision and
reviewer audit fields. The original text remains on `content_item`.

### `content_publication`

Tracks delivery of a content item to a channel and optional locale. It supports
draft, scheduled, published, unpublished and failed states, enabling separate
visibility for native storefronts, marketplaces and partner channels.

There can be only one publication state for a content/channel/locale
destination.

## Review entities

### `review`

Typed extension of `content_item` for a product review. It stores:

- Catalog `product_id` and optional `variant_id`;
- optional Orders `order_id` and `order_line_id` evidence;
- required overall rating from 1 to 5;
- purchase verification state, method and timestamp;
- incentivized-review flag and required public disclosure.

Verification has three states: `UNVERIFIED`, `VERIFIED` and `REVOKED`.
Storefront `isVerifiedPurchase` is derived from the `VERIFIED` state. A revoked
verification preserves the original verification audit data.

### `review_rating`

Stores a review's 1–5 value for one detailed `rating_criterion`. The
review/criterion pair is unique. Deleting a review cascades to its values;
deleting a criterion is restricted while review evidence still references it.

### `review_media`

Associates a Media service `file_id` with a review. It owns display order,
caption and independent media moderation fields. This supports images and video
without copying file metadata into the Reviews database.

The review/file pair is unique. Maximum attachment count and allowed MIME/size
rules are enforced by the application using `store_configuration` and Media
metadata.

### `review_reply`

Typed extension of `content_item` for a merchant response to a review. It links
to the parent review, records whether the response is official and preserves
display order. Multiple replies are supported so imported partner threads and
reply history are not forced into a single mutable field.

Admin reply writes are owned by `reviewUpdate.operations.replies`; there are no
standalone reply create, update or delete mutations. Existing replies keep their
own content revision for nested update/delete conflict checks.

### `review_request`

Represents a post-purchase invitation to review an order line. It references
Customers, Orders and Catalog by UUID and records notification channel, locale,
idempotency key, secure access-token hash, provider message ID, attempts and
lifecycle timestamps.

Supported lifecycle states are scheduled, sent, delivered, opened, submitted,
expired, cancelled and failed. A submitted request must reference the resulting
review. The active review is protected from hard deletion by a local FK.

### `review_request_event`

Append-oriented delivery history for a review request. It captures provider
events such as sent, delivered, opened, clicked, submitted, bounced, complained,
failed, cancelled and expired. Provider event IDs are deduplicated per store.

The request row provides the current state; events preserve the integration and
conversion audit trail.

## Product Q&A entities

### `product_question`

Typed extension of `content_item` for a customer product question. It references
a Catalog product and optional variant. Author, body, status, revision and
moderation data are inherited from `content_item`.

`answerState` is a derived API value: a question is answered when its maintained
child count contains an eligible answer.

### `question_answer`

Typed extension of `content_item` linked to a product question. Answers can be
customer, seller or staff authored, official and/or accepted. At most one answer
can be accepted for a question. Each answer has independent moderation,
publication, revisions, reports and votes through the shared content tables.

Admin answer writes are owned by `productQuestionUpdate.operations.answers`;
there are no standalone answer create, update or delete mutations. Existing
answers keep their own content revision for nested update/delete conflict checks.

### `question_subscription`

Stores a customer's or guest subscriber's request to receive question updates.
It uses a stable `subscriber_key` for deduplication, optionally references a
Customers entity, selects a notification channel and locale, and tracks active,
paused or unsubscribed state plus the last notification time.

Notification destinations and message delivery belong to the notification
integration; this table records Reviews-domain subscription intent.

## Engagement entities

### `content_vote`

Stores one `LIKE` or `DISLIKE` vote per content item and stable voter key. The
optional `voter_customer_id` supports customer federation and abuse analysis,
while the voter key also supports authenticated guests without persisting a
browser/session UUID as an entity identity.

Updating a reaction changes the existing row instead of creating multiple votes.

### `content_report`

Abuse report against any content item. It stores reporter identity, reason,
details, assignment and resolution audit. Reasons cover spam, offensive content,
harassment, hate speech, fraud, personal information, illegal content,
intellectual-property issues, conflicts of interest, irrelevant content and an
extensible `OTHER` category.

Only one open/under-review report per content/reporter pair is allowed. Actioned
and dismissed reports must identify the resolver and resolution time.

### `content_metrics`

One denormalized counter row per content item. It supports Admin filtering and
sorting without repeatedly aggregating large engagement tables:

- like and dislike counts;
- total and currently open report counts;
- attached media count;
- child, official-child and accepted-child counts;
- timestamp of the latest child.

For reviews, media and child counters represent attachments and replies. For
questions, child counters represent answers. Mutation transactions or durable
projection handlers must update this row together with source changes.

## Moderation and audit entities

### `moderation_case`

Operational moderation queue item for a content record. It carries status,
priority, reason, assignee, SLA due time and resolution audit. A content item can
have only one active `OPEN`/`IN_REVIEW` case, while completed cases remain as
history.

Indexes support store queues, assignee queues and overdue-case scans.

### `moderation_event`

Append-only moderation timeline for submissions, automated flags, assignments,
publishing, rejection, restoration, edits, redaction and deletion. It records
optional status transitions, actor, reason, note and structured metadata and can
be linked to a moderation case.

### `content_revision`

Immutable JSON snapshot of a content aggregate at a specific optimistic
revision. It records who changed the aggregate and why. The content/revision pair
is unique, allowing moderators to inspect edits and restore prior data without
overloading the current-state tables.

The snapshot should contain the root and relevant typed-extension fields needed
to reproduce that version.

### `moderation_signal`

Evidence emitted by automated moderation, fraud or policy providers. A signal
records provider, category, optional normalized score, `PASS`/`REVIEW`/`BLOCK`
verdict, model version and structured evidence. Signals are immutable inputs to
moderation decisions rather than the decision itself.

## Integration entity

### `content_external_reference`

Maps a content item to an external review/Q&A provider or marketplace identity.
It supports import, export and bidirectional sync, current sync status, external
URL, ETag/checksum, last error and provider metadata.

External identities are unique per store/system/type. A content item can have
one active reference for a given system and external type. Soft deletion keeps
historical integration mappings available for audit while allowing a later
replacement.

## Read-model entities

### `product_review_summary`

One storefront projection per Catalog product over currently published,
non-deleted reviews. It stores review, verified-review and media-review counts,
rating sum, complete 1–5 star breakdown, generated average rating and the latest
review timestamp.

Database checks guarantee that the star buckets equal the review count and that
their weighted total equals `rating_sum`.

### `product_rating_criterion_summary`

Per-product aggregate for one detailed rating criterion. It stores review count,
rating sum, 1–5 breakdown and generated average. This powers Adobe-like detailed
rating displays without aggregating every `review_rating` row on storefront
requests.

### `product_question_summary`

One storefront projection per Catalog product over currently published,
non-deleted questions and answers. It stores question count, answered count,
generated unanswered count, total and official answer counts, and latest
question/answer timestamps.

## Cross-service references

The following UUID columns are references by contract, not PostgreSQL FKs:

| Reviews column | Owning service |
| --- | --- |
| `store_id` | Project/store context |
| `product_id`, `variant_id`, criterion assignment `target_id` | Catalog |
| author, reporter, voter, subscriber and request `customer_id` | Customers |
| `order_id`, `order_line_id` | Orders |
| `file_id` | Media |
| principal identifiers | IAM |

Local Reviews relationships always use database FKs. Cross-service existence and
tenant consistency must be validated through service context, federation or
event-fed reference validation; the Reviews service must not join another
service's database schema in application code.

## Projection ownership

`content_metrics`, `product_review_summary`,
`product_rating_criterion_summary` and `product_question_summary` are read
models. Application transactions or durable projection handlers must update them
together with source mutations. Rebuild handlers must be idempotent so these
tables can be regenerated from the canonical content, engagement, media and
rating tables.

## Migration layout

```text
migrations/domains/
├── 0000_foundation/    schema, enums and PostgreSQL extensions
├── 0100_configuration/ store configuration and rating criteria
├── 0200_content/       shared content, translations and publications
├── 0300_reviews/       reviews, ratings, media, replies and requests
├── 0400_questions/     product questions, answers and subscriptions
├── 0500_engagement/    votes, reports and counters
├── 0600_moderation/    cases, events, revisions and automated signals
├── 0700_integrations/  external provider references
└── 9000_read_models/   product review and Q&A projections
```

Migration basenames are globally unique because the runner loads domain files in
glob mode and tracks them in `reviews.pgmigrations`.

GraphQL operations and Drizzle models remain separate follow-up work.
