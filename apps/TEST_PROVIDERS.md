# Checkout test provider Apps

The bundled `test-fedex` and `test-stripe` Apps are deterministic provider
simulators for checkout E2E tests. They never call external networks and must
not be used as production integrations.

`test-twilio` is an in-memory SMS gateway for authentication tests. It accepts
only the `SMS` notification channel, records delivered messages in its runtime
outbox, and never generates or verifies OTP codes itself.

E2E tests inspect that outbox through the test action proxy by invoking the
installed App's `notifications.getCapabilities` route with
`{ includeMessages: true, to }`. Production code calls the same capability
without inspection parameters and receives only the supported channel list.

## Delivery scenarios

`test-fedex` implements `delivery.carrier-service` and
`delivery.shipment-provider` protocol version 2.

- Domestic quotes expose Ground, International Priority, and International Economy.
- Cross-border quotes expose International Priority and International Economy.
- Prices depend only on route type and package weight.
- Delivery estimates are derived from the request's `effectiveAt` timestamp.
- Unsupported countries and currencies return a deterministic no-service result.
- Customer input accepts optional `pickupPointId` and `deliveryInstructions`
  fields and rejects malformed or unknown fields.

Shipment creation produces one tracked parcel per package and stores its state
in the App runtime. Each new idempotent reconcile operation advances the
shipment through `ACCEPTED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, and `DELIVERED`.
`getShipment` observes state without advancing it. Cancellation preserves the
parcel and tracking history, and a cancelled shipment stays cancelled during
later reads and reconciliations.

After installing the App for a store, configure a Delivery provider account
with the required carrier and/or shipment capabilities and transition them to
`ACTIVE`.

## Payment scenarios

`test-stripe` implements `payments.provider` protocol version 1.

| Method key      | Checkout behavior                                      |
| --------------- | ------------------------------------------------------ |
| `card`          | Returns `REQUIRES_CONFIRMATION`; confirmation succeeds |
| `card-3ds`      | Returns `REQUIRES_ACTION`; confirmation succeeds       |
| `bank-transfer` | Remains `PENDING` and can be reconciled                |
| `declined-card` | Fails with a non-retryable decline                     |

The simulator also implements strict cancel, capture, void, refund, and
reconcile state transitions. It rejects invalid operation states, currency
mismatches, non-positive amounts, over-capture, and over-refund. Reusing an
idempotency key with another canonical request hash is rejected by both test
providers.

For `bank-transfer`, the optional selected payment customer input field
`testReconcileOutcome` controls the first reconcile result:

| Value                     | Reconcile behavior                                                 |
| ------------------------- | ------------------------------------------------------------------ |
| `STAY_PENDING` or omitted | Remains `PENDING`                                                  |
| `SUCCEED`                 | Becomes `CAPTURED` for a sale or `AUTHORIZED` for an authorization |
| `FAIL`                    | Becomes `FAILED`                                                   |
| `EXPIRE`                  | Becomes `EXPIRED`                                                  |

Provider state and idempotency results are intentionally in-memory and scoped
to the App runtime process.

After installing the App for a store, configure a Payments provider account
with the desired enabled method keys and transition it to `ACTIVE`.
