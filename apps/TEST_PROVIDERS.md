# Checkout test provider Apps

The bundled `test-fedex` and `test-stripe` Apps are deterministic provider
simulators for checkout E2E tests. They never call external networks and must
not be used as production integrations.

`test-twilio` is an in-memory SMS gateway for authentication tests. It accepts
only the `SMS` notification channel, records delivered messages in its runtime
outbox, and never generates or verifies OTP codes itself.

## Delivery scenarios

`test-fedex` implements `delivery.carrier-service` protocol version 2.

- Domestic quotes expose Ground, International Priority, and International Economy.
- Cross-border quotes expose International Priority and International Economy.
- Prices depend only on route type and package weight.
- Delivery estimates are derived from the request's `effectiveAt` timestamp.

After installing the App for a store, configure a Delivery provider account
with the `delivery.carrier-service` capability and transition it to `ACTIVE`.

## Payment scenarios

`test-stripe` implements `payments.provider` protocol version 1.

| Method key | Checkout behavior |
| --- | --- |
| `card` | Succeeds immediately |
| `card-3ds` | Returns `REQUIRES_ACTION`; confirmation succeeds |
| `bank-transfer` | Remains `PENDING` and can be reconciled |
| `declined-card` | Fails with a non-retryable decline |

The simulator also implements cancel, capture, void, refund, and reconcile for
lifecycle E2E scenarios. State is intentionally in-memory and scoped to the App
runtime process.

After installing the App for a store, configure a Payments provider account
with the desired enabled method keys and transition it to `ACTIVE`.
