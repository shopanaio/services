# Payments Checkout Pipeline Implementation Plan

## 1. Purpose

This document defines the implementation plan for the Payments-owned stage of
the checkout recalculation pipeline.

The stage is responsible for:

- discovering payment methods from installed payment provider Apps;
- normalizing provider-owned methods into platform-owned checkout methods;
- applying store-scoped payment method Commerce Functions;
- preserving an existing shopper selection or explicitly resetting it;
- persisting opaque method handles and their provider bindings;
- staging bindings for the potential committed checkout version without making
  bindings from a failed CAS attempt current;
- returning a deterministic, revisioned result to Checkout.

The target flow is:

```text
Checkout
  -> payments.getCheckoutAvailablePaymentMethods
      -> load active payment provider accounts
      -> resolve Apps payments.provider/getMethods routes
      -> invoke provider Apps
      -> validate, filter and normalize methods
      -> apply payment method Commerce Functions
      -> resolve the shopper selection
      -> persist the discovery snapshot and method bindings
      -> return a revisioned result
  -> Checkout validation
```

The implementation must preserve the service boundaries defined by the
project architecture:

- Checkout owns cart intent and pipeline orchestration.
- Pricing owns the final payable amount and currency.
- Delivery owns delivery grouping and selected delivery options.
- Apps owns App installation, routing, configuration and secrets.
- Payment provider Apps own provider-specific method discovery and payment
  protocol implementation.
- Payments owns provider accounts, normalized payment methods, opaque handles,
  payment state and financial invariants.

## 2. Scope

### 2.1 Included

This plan includes the complete `PAYMENT` recalculation stage:

- provider account configuration needed for method discovery;
- integration with the Apps `payments.provider` capability;
- `getMethods` fan-out;
- provider response validation;
- eligibility filtering and normalization;
- deterministic revisions;
- Commerce Function customization;
- payment method selection resolution;
- checkout-scoped method binding persistence;
- broker action registration;
- Checkout boundary integration;
- contract, repository, integration and end-to-end test scenarios.

### 2.2 Excluded

The following work belongs to the payment lifecycle milestone and is not
required to make the recalculation stage operational:

- creating a `PaymentCollection` during checkout completion;
- creating a `PaymentSession`;
- calling `createPayment`;
- redirects and buyer actions;
- authorization, capture, void and refund;
- asynchronous provider callbacks;
- reconciliation and disputes;
- inventory settlement confirmation;
- order-payment orchestration.

The discovery design must nevertheless persist enough binding information for
that later milestone to resolve a selected handle safely.

## 3. Existing Baseline

The repository already contains the main type-level boundaries:

- `PaymentsCheckoutActions.getAvailableMethods`;
- `GetCheckoutAvailablePaymentMethodsParams`;
- `GetCheckoutAvailablePaymentMethodsResult`;
- `PaymentsProviderAppsPort`;
- `PaymentProviderAccountsPort`;
- `PaymentMethodBindingsPort`;
- `PaymentProviderAppContract`;
- the Apps `executeCapability`, `listCapabilityRoutes`, and
  `listCommerceFunctionBindings` actions.

The existence of `apps.listCommerceFunctionBindings` is baseline context only;
the target Payments implementation does not use it as a business activation
source.

The existing implementation is scaffolding:

- `PaymentsModule` has no providers or infrastructure wiring;
- the checkout action is intentionally not registered;
- Payments has no migrations or repositories;
- provider discovery has no application implementation;
- Payments has no Commerce Function target;
- Checkout currently emits no issues from the payment stage.

The implementation must extend the existing contracts instead of introducing
a second provider protocol.

## 4. Architectural Decisions

### 4.1 Provider Apps are the source of payment methods

LiqPay, Stripe, WayForPay and similar integrations declare the standard App
capability:

```ts
{
  key: "payments.provider",
  assignmentMode: "store",
  operations: {
    validateConfiguration: "liqpay.validateConfiguration",
    getMethods: "liqpay.getMethods",
    createPayment: "liqpay.createPayment",
    confirmPayment: "liqpay.confirmPayment",
    cancel: "liqpay.cancel",
    capture: "liqpay.capture",
    refund: "liqpay.refund",
    reconcile: "liqpay.reconcile",
  },
}
```

Provider Apps are invoked with `executionKind: "STANDARD"`. They may discover
methods and, in the later lifecycle milestone, perform payment mutations.

### 4.2 Commerce Functions are not payment providers

Commerce Functions operate only on platform-normalized methods. They may hide,
move or rename methods, but they may not create an executable payment method.

This prevents a function from returning a method that has no provider account,
route or operation binding.

### 4.3 Provider secrets remain Apps-owned

Payments persists only the Apps installation identity and immutable route
snapshots. It must never persist:

- private keys;
- API passwords;
- webhook secrets;
- PAN or CVV;
- provider access tokens;
- raw Apps configuration containing secrets.

### 4.4 Checkout receives platform-owned methods

Checkout and Storefront receive:

- opaque `methodHandle`;
- platform code and title;
- public provider code;
- flow type;
- bounded public metadata.

They do not receive:

- `installationId`;
- `providerAccountId`;
- provider method keys;
- route IDs;
- configuration revisions;
- provider credentials.

### 4.5 Discovery is revisioned and idempotent

The same business input and the same dependency revisions must produce the
same observable snapshot. Concurrent identical executions must converge on a
single persisted snapshot and stable handles.

### 4.6 Payment bindings distinguish base and target checkout versions

Checkout recalculation reads the currently committed aggregate version `V` and
prepares a snapshot that may be committed as `V + 1`. Payments must therefore
use two explicit versions:

```text
basedOnCheckoutVersion = V
targetCheckoutVersion = V + 1
```

The versions have different meanings:

- source selection lookup uses the currently committed base version `V`;
- newly discovered method bindings are staged for target version `V + 1`;
- Checkout CAS failure leaves only an expiring staged snapshot for `V + 1`;
- payment lifecycle lookup uses the checkout version that was actually
  committed, which must equal the binding target version;
- bindings from previous committed versions remain immutable until TTL cleanup.

Payments does not read the Checkout database and does not participate in a
distributed transaction with Checkout.

## 5. End-to-End Discovery Algorithm

The application service must execute the following steps in order.

### Step 1: Parse and validate the request

Validate the complete broker payload at the Payments boundary, even though
Checkout also validates it.

Required checks:

- `checkoutId`, `storeId`, execution and correlation IDs are non-empty;
- `expectedCheckoutVersion` is non-negative;
- `targetCheckoutVersion === expectedCheckoutVersion + 1`;
- `deadlineAt` has not expired;
- final quote provenance matches the checkout context;
- delivery provenance matches the checkout context;
- final quote is based on the supplied delivery revision;
- all monetary values use the checkout currency;
- payable amount is a non-negative integer minor-unit string;
- identifiers and JSON payloads satisfy size limits;
- delivery destinations and groups are internally consistent.

Payments must own its Zod schemas. It must not import private schemas from the
Checkout service.

### Step 2: Handle a zero payable total

If `payableTotal.amountMinor` is zero:

- do not invoke provider Apps;
- do not invoke payment customization functions;
- return an empty method list;
- return `NONE` when there was no selection;
- return `RESET` when a selection existed;
- persist a deterministic zero-payment snapshot if binding snapshot history is
  required for audit consistency.

Suggested reset code: `PAYMENT_NOT_REQUIRED`.

### Step 3: Load eligible provider accounts

Load Payments-owned accounts for the request store.

An account is eligible only when:

- status is `ACTIVE`;
- its Apps installation is routable;
- configuration supports the checkout currency;
- configuration supports the relevant country context;
- it exposes the `getMethods` operation;
- its configuration revision is current.

No active accounts is a valid business result and produces an empty method
list. It is not an infrastructure error.

### Step 4: Resolve immutable Apps routes

For each eligible account:

1. Resolve the `payments.provider/getMethods` route for the exact
   `installationId`.
2. Verify the returned installation, App code and App version against the
   account.
3. Capture the route as a `PaymentProviderRouteSnapshot`.
4. Reject unsupported protocol versions.

A provider route must never be selected only by provider code. The exact Apps
installation is the authority.

### Step 5: Build the provider discovery request

The provider receives the existing PII-minimized request:

```ts
interface PaymentProviderMethodDiscoveryRequest {
  protocolVersion: 1;
  executionId: string;
  correlationId: string;
  deadlineAt: string;
  amount: PaymentMoney;
  localeCode: string | null;
  channelCode: string;
  buyerCountryCode: string | null;
  deliveryCountryCodes: readonly string[];
  selectedDeliveryCarrierCodes: readonly string[];
}
```

Arrays must be canonicalized and deduplicated before invocation.

The request must not contain contact data, full delivery addresses, cart
attributes, provider configuration or secrets.

### Step 6: Invoke provider Apps

Invoke `getMethods` through `apps.executeCapability` with:

- the exact installation;
- the checkout execution and correlation IDs;
- the pipeline deadline;
- the typed provider request.

Fan-out requirements:

- use bounded parallelism;
- never wait past the checkout deadline;
- preserve deterministic output ordering independently of completion order;
- classify route, timeout, provider validation and provider business failures;
- do not retry inside the ordinary recalculation request unless the retry fits
  inside a small, explicit retry budget and the same deadline;
- never register a late result after the stage deadline.

### Step 7: Validate provider responses

Validate every provider result before it enters platform state.

Checks include:

- response matches `PaymentProviderMethodDiscoveryResult`;
- revision is non-empty and bounded;
- method keys are unique within the provider account;
- titles, codes and metadata respect limits;
- supported session kinds are valid;
- supported capture modes are valid;
- method capabilities are internally consistent;
- metadata is JSON-only and below the configured byte/depth limits.

Provider output is untrusted input even when the App is installed by the
merchant.

### Step 8: Filter and normalize methods

Filter provider definitions against:

- `enabledMethodKeys` on the provider account;
- provider configuration currencies and countries;
- provider account capture mode;
- platform-supported session kinds;
- required provider operations;
- platform metadata policy.

Normalize each surviving method into:

```ts
interface PaymentsCheckoutMethod {
  handle: string;
  code: string;
  title: string;
  provider: string;
  flow: "ONLINE" | "OFFLINE" | "ON_DELIVERY";
  metadata: JsonObject | null;
}
```

Provider method code collisions are allowed across different provider
accounts. Identity is the opaque handle, not the public code.

### Step 9: Allocate opaque handles

The platform must allocate handles, for example `pmh_<uuidv7>`.

Handle requirements:

- not derived from a Storefront-provided value;
- not reversible into provider identities;
- unique within a store and checkout snapshot;
- stable for an idempotently reused snapshot;
- changed when its provider binding becomes stale.

Separate semantic handle identity from version-scoped binding identity.

The semantic identity used to decide whether an existing handle may be reused
is:

```text
storeId
+ checkoutId
+ providerAccountId
+ providerMethodKey
+ configurationRevision
+ discoveryRouteRevision
+ providerDiscoveryRevision
```

The staged binding identity additionally includes:

```text
storeId
+ checkoutId
+ basedOnCheckoutVersion
+ targetCheckoutVersion
+ finalQuoteRevision
+ methodHandle
```

When a base-version binding has the exact same semantic identity, Payments
reuses its opaque handle in the target snapshot. Otherwise it allocates a new
`pmh_<uuidv7>` handle. This preserves a valid shopper selection across ordinary
recalculations while still changing the handle when provider configuration,
route or discovered method semantics become stale.

On a target-snapshot uniqueness conflict, the repository returns the already
staged binding only when its complete canonical payload matches; otherwise it
reports a persistence conflict.

Handle allocation is idempotent within the staged target snapshot. Reusing the
same opaque handle in another version is not rebinding: each binding row remains
version-scoped and immutable, and lifecycle resolution always supplies the
committed checkout version.

### Step 10: Compute the discovery revision

Use canonical JSON and SHA-256:

```text
payment-method-discovery:v1:sha256:<hash>
```

The canonical payload includes:

- checkout provenance;
- final quote revision;
- delivery revision;
- payable amount and currency;
- normalized eligibility facts;
- ordered provider account IDs and configuration revisions;
- ordered route revisions;
- ordered provider discovery revisions;
- normalized pre-customization methods;
- provider execution classifications.

It must exclude timestamps that do not affect business output, log metadata
and raw exception messages.

### Step 11: Run Commerce Functions

Execute active bindings for:

```text
cart.payment-methods.transform.run
```

Functions run after provider normalization and handle allocation, and before
selection resolution.

Allowed operations:

```ts
type PaymentMethodCustomizationOperation =
  | {
      type: "HIDE";
      methodHandle: string;
      reasonCode: string;
    }
  | {
      type: "MOVE";
      methodHandle: string;
      index: number;
    }
  | {
      type: "RENAME";
      methodHandle: string;
      title: string;
    };
```

Functions may not:

- add methods;
- change handles;
- change provider bindings;
- change flow or capabilities;
- change amount or currency;
- select a method;
- return secrets;
- call payment mutation actions.

### Step 12: Apply customization policy

The Payments-owned policy validates function output.

Initial policy:

- maximum 25 executions;
- maximum 250 operations across all executions;
- maximum title and reason-code lengths;
- unknown handles are invalid;
- repeated conflicting operations are rejected or resolved by documented
  precedence;
- implicit selection policy is `NONE`;
- `allowHideAllMethods` is `false` by default;
- function ordering is `(precedence, activationSequence, functionBindingId)`.

Failure behavior:

- `OPTIONAL` failure: skip the output and append a warning;
- `REQUIRED` failure: fail the payment stage;
- invalid output: classify separately from runtime failure;
- late output: discard it and classify as deadline exceeded.

### Step 13: Resolve the shopper selection

Selection resolution happens only after customization.

Before applying the rules below, Payments resolves the input handle only from
the currently committed base version `expectedCheckoutVersion`. It then checks
that the same handle and immutable provider binding are present in the newly
calculated post-customization candidate set for `targetCheckoutVersion`.

Rules:

- no input selection produces `NONE`;
- an input handle still present produces `SELECTED`;
- an unavailable input handle produces `RESET`;
- `customerInput` is copied byte-for-byte at the JSON value level;
- Payments never substitutes another method;
- Payments never fabricates shopper input.

Stable reset codes:

- `PAYMENT_NOT_REQUIRED`;
- `PAYMENT_METHOD_UNAVAILABLE`;
- `PAYMENT_METHOD_HIDDEN`;
- `PAYMENT_METHOD_SNAPSHOT_EXPIRED`;
- `PAYMENT_PROVIDER_CONFIGURATION_CHANGED`.

### Step 14: Compute the customization and final revisions

Compute:

```text
payment-method-customization:v1:sha256:<hash>
payment-methods:v1:sha256:<hash>
```

The customization hash includes:

- discovery revision;
- customization policy revision;
- ordered binding revisions;
- ordered execution status and operation hashes;
- final customized method list.

The final payment methods hash includes:

- discovery revision;
- customization revision;
- final methods;
- selection resolution;
- externally observable issues.

### Step 15: Persist atomically

Within one Payments database transaction:

1. Insert or reuse the discovery snapshot.
2. Stage the complete checkout method binding snapshot for
   `targetCheckoutVersion`.
3. Persist normalized public method projections.
4. Persist provider/function execution audit metadata.
5. Set the expiry time.
6. Return the canonical persisted result.

No broker or provider call may occur inside the database transaction.
Staging never deletes bindings for earlier committed versions. A conflicting
revision for the same `(store, checkout, target version)` is rejected rather
than overwritten.

## 6. Checkout Version Contract

Extend the canonical payment request contract with a Payments-specific context:

```ts
interface PaymentsCheckoutEvaluationContext
  extends PricingCheckoutEvaluationContext {
  targetCheckoutVersion: number;
}

interface GetCheckoutAvailablePaymentMethodsParams {
  context: PaymentsCheckoutEvaluationContext;
  selection: PaymentsCheckoutMethodSelectionIntent | null;
  finalQuote: FinalizeCheckoutPricingQuoteResult;
  delivery: PaymentsCheckoutDeliverySnapshot;
}
```

Contract invariants:

- create uses `expectedCheckoutVersion = 0` and `targetCheckoutVersion = 1`;
- update uses `targetCheckoutVersion = expectedCheckoutVersion + 1`;
- final quote and delivery provenance remain based on the base version;
- returned payment provenance remains based on the base version because it
  describes the recalculation input;
- persisted bindings additionally carry the target version because they are
  intended for the potential committed snapshot.

Do not add `targetCheckoutVersion` to the common Pricing context: quote
snapshots describe an attempt based on `V`, while executable selection bindings
need the additional `V + 1` identity.

Replace the ambiguous binding write/read port with staged operations:

```ts
interface PaymentMethodBindingsPort {
  resolveCommittedSelection(input: {
    storeId: string;
    checkoutId: string;
    checkoutVersion: number; // committed base V
    methodHandle: string;
    effectiveAt: string;
  }): Promise<PaymentMethodBindingSnapshot | null>;

  stageCheckoutSnapshot(input: {
    storeId: string;
    checkoutId: string;
    basedOnCheckoutVersion: number;
    targetCheckoutVersion: number;
    finalQuoteRevision: string;
    deliveryRevision: string;
    paymentRevision: string;
    methods: readonly PaymentMethodBindingSnapshot[];
    retainUntil: string;
  }): Promise<StagedPaymentMethodSnapshot>;
}
```

`stageCheckoutSnapshot` inserts or reuses one immutable complete target
snapshot. It never replaces a previous committed version.

## 7. Commerce Function Contract

### 7.1 Manifest capability

```ts
interface PaymentMethodCustomizationAppManifestCapability {
  key: "commerce.function";
  assignmentMode: "store";
  routingMode: "broadcast";
  operations: {
    "cart.payment-methods.transform.run": string;
  };
}
```

### 7.2 Function input

The input should contain only eligibility and presentation facts:

```ts
interface PaymentMethodCustomizationFunctionInput {
  schemaVersion: 1;
  executionId: string;
  storeId: string;
  checkoutId: string;
  basedOnCheckoutVersion: number;
  targetCheckoutVersion: number;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  effectiveAt: string;
  buyer: {
    customerId: string | null;
    countryCode: string | null;
    marketId: string | null;
    companyId: string | null;
    segmentIds: readonly string[];
  } | null;
  delivery: {
    countryCodes: readonly string[];
    selectedCarrierCodes: readonly string[];
  };
  amount: PaymentMoney;
  methods: readonly PaymentsCheckoutMethod[];
}
```

The function must not receive email, phone, full address, provider route data
or provider account IDs.

### 7.3 Function result

```ts
interface PaymentMethodCustomizationFunctionResult {
  operations: readonly PaymentMethodCustomizationOperation[];
}
```

### 7.4 Audit snapshot

Persist for each execution:

- sequence;
- function binding ID;
- capability route ID;
- App code and version;
- configuration revision;
- status: `APPLIED | SKIPPED | FAILED`;
- operation hash;
- stable failure classification;
- no raw stack traces or sensitive configuration.

## 8. Apps Service Changes

### 8.1 Provider and function routing

The current Apps capability boundary already supports provider routing.
Payments needs an adapter that maps:

- `apps.listCapabilityRoutes` to typed payment route snapshots;
- `apps.executeCapability` to typed provider operations;
- `apps.listCapabilityRoutes` to exact Commerce Function route confirmation for
  Payments-owned bindings.

No payment-provider-specific action should be added to Apps.

### 8.2 Apps is not the business binding source

Payments, like Pricing and Delivery, owns Commerce Function business
activation. Apps owns installation lifecycle, capability routes and execution,
but does not decide that a payment customization is active.

Therefore:

- do not use `apps.listCommerceFunctionBindings` as the Payments business
  source;
- an active App route alone never creates or activates a payment
  customization;
- Payments loads active owners/bindings from its own database;
- `apps.listCapabilityRoutes` confirms the exact pinned installation/function
  route at execution planning time;
- route revision mismatch is a function failure and never silently rewrites a
  Payments binding;
- `apps.executeCapability` remains the only execution boundary.

### 8.3 Trusted invocation context

Apps must continue to create trusted context for App execution:

- provider invocations use `STANDARD`;
- Commerce Functions use `COMMERCE_FUNCTION`;
- Commerce Functions cannot call Payments mutation actions;
- asynchronous provider callbacks must originate through Apps and carry the
  installation/App/tenant identity created by broker infrastructure.

## 9. Payments Data Model

### 9.1 Migration domains

Suggested migration structure:

```text
services/payments/migrations/domains/
  0000_foundation/
    0000_foundation__schema.sql
    0001_foundation__types.sql
  0100_provider_accounts/
    0100_provider_accounts__accounts.sql
  0150_customizations/
    0150_customizations__owners.sql
    0151_customizations__bindings.sql
  0200_checkout_discovery/
    0200_checkout_discovery__snapshots.sql
    0201_checkout_discovery__methods.sql
    0202_checkout_discovery__bindings.sql
    0203_checkout_discovery__executions.sql
```

### 9.2 Payment customization owners and bindings

Add Payments-owned business activation persistence:

```text
payments.payment_customizations
  id uuid primary key
  store_id uuid not null
  status ACTIVE | DISABLED
  policy_revision text not null
  created_at / updated_at timestamptz

payments.payment_customization_bindings
  id uuid primary key
  store_id uuid not null
  customization_id uuid not null
  installation_id uuid not null
  function_key text not null
  contract_version integer not null
  precedence integer not null
  activation_sequence bigint not null
  failure_mode REQUIRED | OPTIONAL
  configuration_snapshot jsonb not null
  configuration_revision text not null
  route_revision text not null
  status ACTIVE | DISABLED
  created_at / updated_at timestamptz
```

Invariants:

- every binding belongs to exactly one Payments customization owner;
- all uniqueness and reads are store-scoped;
- installation identity and route revision are snapshots, not cross-service
  foreign keys;
- activation validates target, configuration and current Apps route;
- execution re-confirms the pinned route without mutating the binding;
- deterministic order is
  `(precedence, activationSequence, functionBindingId)`.

### 9.3 Provider account invariants

- one account per store and Apps installation for v1;
- account tenant identity is immutable;
- status transitions are validated in the application layer;
- configuration revision changes invalidate old discovery bindings;
- only `ACTIVE` accounts participate in discovery;
- uninstall or suspension makes the route unavailable immediately.

### 9.4 Snapshot and binding invariants

- snapshot is immutable after completion;
- one final result per canonical business input;
- method handles cannot be rebound;
- expired snapshots cannot start a payment session;
- snapshot revisions and stored payload must agree;
- every returned method has exactly one stored binding;
- each binding stores both `based_on_checkout_version` and
  `target_checkout_version`;
- `target_checkout_version = based_on_checkout_version + 1`;
- uniqueness includes
  `(store_id, checkout_id, target_checkout_version, method_handle)`;
- the snapshot table has one immutable row per
  `(store_id, checkout_id, target_checkout_version)` and stores the complete
  payment revision/digest;
- staging another payment revision for an existing target snapshot is a
  conflict;
- source selection lookup is scoped to the committed base version;
- hidden methods may remain in internal discovery audit data but not in the
  final binding set usable by Checkout.

### 9.5 Transaction behavior

Repositories use the project transaction manager and never bypass the active
transaction connection.

All tenant-qualified uniqueness constraints include `store_id`.

## 10. Application Components

Suggested Payments components:

```text
src/
  checkout-pipeline/
    PaymentsCheckoutMethodsService.ts
    PaymentProviderDiscoveryService.ts
    PaymentMethodNormalizer.ts
    PaymentMethodSelectionResolver.ts
    PaymentDiscoveryRevision.ts
    PaymentCustomizationRevision.ts
    contracts.ts
    schemas.ts
    errors.ts
  commerce-functions/
    PaymentMethodCustomizationRunner.ts
    PaymentMethodCustomizationPolicy.ts
    PaymentMethodCustomizationContracts.ts
    PaymentCustomizationBindingRepository.ts
  application/
    provider-accounts/
      ConfigurePaymentProviderAccountService.ts
      SetPaymentProviderAccountStatusService.ts
  infrastructure/
    apps/
      BrokerPaymentsProviderAppsAdapter.ts
      BrokerPaymentFunctionRouteResolver.ts
    db/
      schema/
      repositories/
    broker/
      PaymentsCheckoutActions.ts
      PaymentsLifecycleActions.ts
  workflows/
    ConfigurePaymentProviderAccountWorkflow.ts
```

Exact names may follow the final Payments module conventions, but the
application/domain/infrastructure separation should remain explicit.

## 11. Broker Action Boundary

Register the action only when the complete implementation can return a valid
result:

```text
payments.getCheckoutAvailablePaymentMethods
```

The action handler must:

1. Parse the input with Payments-owned schemas.
2. Reject invalid caller/input combinations.
3. Call the application port.
4. Validate the output before returning it.
5. Map domain failures to stable error codes.
6. Avoid logging the complete request or `customerInput`.

Suggested error classes:

- `PAYMENT_DISCOVERY_REQUEST_INVALID`;
- `PAYMENT_PROVIDER_ROUTE_UNAVAILABLE`;
- `PAYMENT_PROVIDER_RESPONSE_INVALID`;
- `PAYMENT_PROVIDER_DISCOVERY_UNAVAILABLE`;
- `PAYMENT_CUSTOMIZATION_FAILED`;
- `PAYMENT_CUSTOMIZATION_OUTPUT_INVALID`;
- `PAYMENT_DISCOVERY_DEADLINE_EXCEEDED`;
- `PAYMENT_DISCOVERY_PERSISTENCE_CONFLICT`.

Each error declares whether retry is safe.

## 12. Failure Semantics

### 12.1 Business-empty result

Return a successful empty method list when:

- the payable total is zero;
- no provider account is active;
- every successfully contacted provider reports no eligible methods;
- all methods are filtered by valid business eligibility rules.

Checkout validation will turn a positive-total empty list into
`PAYMENT_METHODS_UNAVAILABLE`.

### 12.2 Partial provider degradation

If at least one provider returns a valid result:

- return methods from successful providers;
- record failed provider executions;
- append warning issues;
- include the execution classifications in the revision.

### 12.3 Total provider outage

If eligible providers exist but none returns a usable response because of
timeouts, route failures or transient provider errors:

- fail the payment stage;
- mark the error retryable when appropriate;
- do not misrepresent the outage as a business-empty result;
- do not persist an empty successful snapshot.

### 12.4 Configuration errors

An invalid provider configuration disables only that provider account. If
other providers succeed, the stage may still succeed with warnings.

### 12.5 Function failures

- optional failure: continue with previous methods and emit a warning;
- required failure: fail the stage;
- invalid output follows the binding failure mode;
- the output of a failed function is never partially applied.

## 13. Checkout Service Changes

Update Checkout to consume the extended payment result.

Required changes:

- parse new discovery/customization revisions;
- construct `targetCheckoutVersion = expectedCheckoutVersion + 1` and pass it
  in the Payments-specific evaluation context;
- validate that the final revision is based on the supplied quote and delivery
  revisions;
- map payment issues into `CheckoutPipelineIssue` with stage `PAYMENT`;
- replace the current hard-coded empty payment issue list;
- preserve existing method-handle uniqueness checks;
- preserve existing selection source checks;
- preserve Storefront hiding of `customerInput` and binding internals;
- include the final payment revision in the checkout result revision.

No direct Checkout-to-Apps dependency should be introduced.

## 14. Security and Privacy Requirements

### 14.1 PII minimization

Provider discovery may receive:

- buyer country;
- market/company/segment eligibility only when explicitly required by the
  platform contract;
- delivery countries and selected carriers.

It must not receive buyer contact data or full delivery addresses.

### 14.2 Logging

Do not log:

- complete provider payloads;
- `customerInput`;
- Apps configuration snapshots;
- provider metadata before sanitization;
- raw callback payloads;
- secrets or credentials.

Logs may contain stable IDs, revisions, execution status, duration and error
classification.

### 14.3 Output safety

Provider metadata must pass a Payments-owned projection policy before it is
included in Storefront output.

Recommended policy fields:

- allowed top-level keys;
- maximum JSON bytes;
- maximum depth;
- maximum string length;
- prohibition of credential-like keys;
- no HTML unless explicitly sanitized by a dedicated policy.

### 14.4 Tenant isolation

Every repository lookup, method resolution and Apps call is scoped by
`storeId`. A handle from another store or checkout is treated as unavailable,
not resolved globally.

## 15. Observability

Record metrics for:

- payment discovery duration;
- number of eligible provider accounts;
- provider success/failure/timeout counts;
- number of discovered and final methods;
- Commerce Function execution counts;
- selection reset counts by reason;
- snapshot idempotency conflicts;
- expired binding resolution attempts.

Trace fields:

- execution ID;
- correlation ID;
- checkout ID;
- store ID;
- provider account ID;
- App code/version;
- route revision;
- discovery/customization/final revisions.

Do not use high-cardinality raw error messages as metric labels.

## 16. Work Packages

### WP-01: Shared contract foundation

Deliverables:

- payment customization target and types;
- Payments-specific base/target checkout version contract;
- extended payment result and issue types;
- strict Zod schemas;
- canonical revision payload definitions;
- provider/function error classifications.

Completion criteria:

- all cross-service types have one canonical owner;
- no Checkout-private types are imported by Payments;
- provider and Commerce Function execution kinds are distinct.

### WP-02: Apps route confirmation support

Deliverables:

- typed payment provider route adapter support;
- exact Commerce Function route confirmation for Payments-owned bindings;
- trusted execution-context validation.

Completion criteria:

- Payments can resolve one exact provider installation;
- Payments can confirm one exact function route without treating Apps routes as
  business activation;
- Apps secrets are not exposed.

### WP-03: Payments foundation and persistence

Deliverables:

- migration domains;
- Drizzle schema and database wiring;
- transaction-aware repositories;
- provider account and Payments-owned customization persistence;
- staged target-version discovery and method binding persistence;
- idempotent handle allocation.

Completion criteria:

- concurrent identical snapshots converge;
- handles cannot be rebound;
- CAS base/target versions cannot be confused;
- an Apps route without a Payments binding is never executed;
- expired bindings are rejected.

### WP-04: Provider account configuration

Deliverables:

- configuration workflow;
- Apps `validateConfiguration` invocation;
- account transition policy;
- activate/deactivate action implementation.

Completion criteria:

- only validated accounts can become active;
- configuration revision changes invalidate discovery bindings.

### WP-05: Provider discovery engine

Deliverables:

- request parsing;
- account eligibility;
- bounded Apps fan-out;
- response validation;
- method filtering and normalization;
- discovery revision;
- partial/total failure semantics.

Completion criteria:

- an active LiqPay-like App can supply a checkout method;
- multiple provider completion orders produce the same method ordering.

### WP-06: Payment method customization

Deliverables:

- function input builder;
- Payments-owned binding repository and exact Apps route resolver;
- Commerce Function runner integration;
- HIDE/MOVE/RENAME policy;
- customization revision and audit executions.

Completion criteria:

- functions cannot fabricate executable methods;
- active Apps routes without active Payments bindings do not execute;
- optional and required failures behave differently;
- output is deterministic.

### WP-07: Selection and snapshot commit

Deliverables:

- selection resolver;
- stable reset codes;
- final revision computation;
- atomic snapshot and binding persistence;
- base-version selection lookup and target-version staging;
- expiry policy.

Completion criteria:

- Payments never changes shopper input;
- every returned method resolves to exactly one persisted binding;
- a binding staged by a failed Checkout CAS is not usable as a committed
  selection.

### WP-08: Broker and NestJS wiring

Deliverables:

- checkout broker action;
- module providers;
- database and Apps adapters;
- workflow registration;
- bootstrap integration;
- health visibility for the registered action.

Completion criteria:

- Checkout can call the registered action through `ServiceBroker`;
- the action is not registered with placeholder behavior.

### WP-09: Checkout integration

Deliverables:

- result schema updates;
- issue propagation;
- revision validation;
- Storefront projection checks;
- committed checkout compatibility within the new contract.

Completion criteria:

- PAYMENT succeeds with provider methods;
- native validation requires a selection for a positive total;
- stale selection produces a visible reset reason.

### WP-10: Verification artifacts

Deliverables:

- contract test cases;
- repository test cases;
- provider Apps adapter test cases;
- Commerce Function policy test cases;
- Checkout integration fixtures;
- end-to-end scenarios with a deterministic fake provider App.

Per project instructions, `build`, `test`, and `tsc` are not run merely for
verification. Development commands must use the project `shopana-cli` MCP
tools when execution is required.

## 17. Test Scenario Matrix

### Contract scenarios

- reject mismatched checkout/quote/delivery provenance;
- reject `targetCheckoutVersion !== expectedCheckoutVersion + 1`;
- reject cross-currency amounts;
- reject duplicate provider method keys;
- reject oversized or non-JSON metadata;
- reject unsupported protocol versions;
- reject invalid Commerce Function operations;
- reject provider mutation callbacks from Commerce Functions.

### Provider discovery scenarios

- one active provider returns one method;
- multiple active providers return deterministic ordering;
- inactive provider is ignored;
- suspended/uninstalled App route is unavailable;
- provider returns zero methods;
- provider returns invalid output;
- one of several providers times out;
- every eligible provider times out;
- checkout deadline expires during fan-out;
- zero payable total does not invoke Apps.

### Customization scenarios

- hide a method;
- rename a method;
- move a method;
- operations from several functions respect precedence;
- optional function failure is skipped;
- required function failure fails the stage;
- unknown handle is rejected;
- function attempts to add a method;
- function attempts to hide every method when policy forbids it;
- two identical runs produce the same customization revision;
- installed/active App route without a Payments-owned binding is not executed;
- pinned route revision mismatch follows REQUIRED/OPTIONAL failure mode.

### Selection scenarios

- no source selection returns `NONE`;
- available source selection returns `SELECTED`;
- filtered provider method returns `RESET`;
- function-hidden method returns `RESET`;
- zero-payment checkout resets a previous selection;
- `customerInput` is preserved exactly;
- Payments never auto-selects the only available method.

### Persistence scenarios

- idempotent repeat returns the existing handles;
- concurrent identical discovery converges;
- one handle cannot point to two provider bindings;
- stale configuration revision cannot resolve;
- expired snapshot cannot resolve;
- cross-store handle lookup fails;
- transaction rollback leaves no partial snapshot;
- create stages bindings for `0 -> 1`;
- update stages bindings for `V -> V + 1`;
- selection lookup reads only the committed base version;
- conflicting payment revisions for one target version are rejected;
- Checkout CAS conflict leaves only an expiring staged target snapshot.

### Checkout integration scenarios

- payment methods appear in the committed Checkout snapshot;
- positive total and no methods emits `PAYMENT_METHODS_UNAVAILABLE`;
- positive total and no selection emits `PAYMENT_METHOD_REQUIRED`;
- reset selection emits `PAYMENT_METHOD_INVALID`;
- partial provider degradation appears as a payment warning;
- total provider outage fails PAYMENT and skips validation;
- Storefront never receives `customerInput` or provider binding data.

## 18. Definition of Done

The Payments checkout stage is complete when all of the following are true:

1. A store can activate a configured payment provider App.
2. Checkout invokes `payments.getCheckoutAvailablePaymentMethods` successfully.
3. Payments obtains methods through Apps, not through direct provider SDKs.
4. Returned methods use platform-owned opaque handles.
5. Every usable handle has an immutable persisted provider binding.
6. Every binding explicitly distinguishes base and target checkout versions.
7. Provider and function outputs are strictly validated.
8. Payments, not Apps, owns payment customization activation and bindings.
9. Commerce Functions can only hide, move or rename methods.
10. Shopper selection is preserved or explicitly reset.
11. Revisions are deterministic and tied to all relevant dependencies.
12. Partial provider degradation and total provider outage are distinguishable.
13. Checkout receives payment issues and validates the final result.
14. No provider credentials or prohibited PII cross service boundaries.
15. `PaymentsModule` registers real implementations rather than scaffolding.
16. Verification artifacts cover the scenario matrix.

## 19. Recommended Implementation Order

Implement in this dependency order:

```text
WP-01 Shared contracts
  -> WP-02 Apps route confirmation
  -> WP-03 Payments persistence and business bindings
  -> WP-04 Provider account configuration
  -> WP-05 Provider discovery
  -> WP-06 Commerce Functions
  -> WP-07 Selection and snapshot commit
  -> WP-08 Broker/module wiring
  -> WP-09 Checkout integration
  -> WP-10 Verification artifacts
```

The first usable vertical slice is complete after WP-05, WP-07, WP-08 and
WP-09 with Commerce Functions temporarily absent. The production-ready target
includes WP-06 and the full failure/audit behavior.

## 20. Follow-up Milestone: Payment Lifecycle

After this plan is complete, checkout completion can safely consume a selected
binding:

```text
selected methodHandle
  -> resolve the unexpired binding by committed target checkout version
  -> validate based-on version, target version and final quote revision
  -> create PaymentCollection
  -> create PaymentSession
  -> invoke pinned Apps createPayment route
  -> persist provider result
  -> process redirect/pending/authorized/captured state
```

That milestone should use the already defined payment lifecycle contracts,
DBOS workflows, idempotency snapshots, optimistic revisions and transactional
outbox events. It must not be folded into ordinary checkout recalculation.
