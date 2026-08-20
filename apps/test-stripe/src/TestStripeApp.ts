import { createHash } from "node:crypto";
import type {
  AppHostContext,
  AppInstallInput,
  AppRuntimeHealth,
  AppUninstallInput,
  AppUpdateInput,
  ShopanaApp,
} from "@shopana/app-sdk";
import type { Payments, Pricing } from "@shopana/broker-types";

const SUPPORTED_COUNTRIES = ["AU", "CA", "DE", "FR", "GB", "JP", "PL", "UA", "US"] as const;
const SUPPORTED_CURRENCIES = ["AUD", "CAD", "EUR", "GBP", "JPY", "PLN", "UAH", "USD"] as const;
const METHOD_KEYS = ["card", "card-3ds", "bank-transfer", "declined-card"] as const;

const CAPABILITIES = {
  supportsAsynchronousCompletion: true,
  supportsSettlementConfirmation: true,
  supportsPartialCapture: true,
  supportsMultipleCaptures: true,
  supportsPartialRefund: true,
  supportsMultipleRefunds: true,
  supportsReconciliation: true,
  supportsDisputes: false,
} as const satisfies Payments.PaymentProviderCapabilities;

type ReconciledState = Payments.PaymentProviderReconciledState;
type PendingStage = "ACTION" | "CONFIRMATION" | "OFFLINE" | null;
type ReconcileOutcome = "STAY_PENDING" | "SUCCEED" | "FAIL" | "EXPIRE";

interface PaymentRecord {
  providerReference: string;
  providerAccountId: string;
  paymentSessionId: string;
  kind: Payments.PaymentSessionKind;
  methodKey: string;
  state: ReconciledState;
  pendingStage: PendingStage;
  reconcileOutcome: ReconcileOutcome;
  requestedAmount: Pricing.PricingCheckoutMoney;
  authorizedAmount: Pricing.PricingCheckoutMoney;
  capturedAmount: Pricing.PricingCheckoutMoney;
  refundedAmount: Pricing.PricingCheckoutMoney;
  voidedAmount: Pricing.PricingCheckoutMoney;
  pendingExpiresAt: string;
}

interface CachedResult {
  requestHash: string;
  result: unknown;
}

export class TestStripeApp implements ShopanaApp {
  private readonly payments = new Map<string, PaymentRecord>();
  private readonly idempotentResults = new Map<string, CachedResult>();

  constructor(private readonly host: AppHostContext) {}

  register(): void {
    this.host.broker.registerWorkflow("install", {
      run: (input: unknown) => ({
        status: "installed",
        version: (input as AppInstallInput).version,
      }),
    });
    this.host.broker.registerWorkflow("update", {
      run: (input: unknown) => ({
        status: "updated",
        version: (input as AppUpdateInput).targetVersion,
      }),
    });
    this.host.broker.registerWorkflow("uninstall", {
      run: (input: unknown) => ({
        status: "uninstalled",
        version: (input as AppUninstallInput).version,
      }),
    });
    this.host.broker.register("suspend", () => ({ status: "suspended" }));
    this.host.broker.register("resume", () => ({ status: "active" }));
    this.host.broker.register("health", () => this.health());
    this.host.broker.register("validateConfiguration", (input) =>
      this.validateConfiguration(input),
    );
    this.host.broker.register("getMethods", (input) => this.getMethods(input));
    this.host.broker.register("createPayment", (input) => this.createPayment(input));
    this.host.broker.register("confirmPayment", (input) => this.confirmPayment(input));
    this.host.broker.register("cancel", (input) => this.cancel(input));
    this.host.broker.register("capture", (input) => this.capture(input));
    this.host.broker.register("void", (input) => this.voidPayment(input));
    this.host.broker.register("refund", (input) => this.refund(input));
    this.host.broker.register("reconcile", (input) => this.reconcile(input));
  }

  start(): void {}

  stop(): void {
    this.payments.clear();
    this.idempotentResults.clear();
    this.host.logger.log("Stripe Test App stopped");
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
  }

  private validateConfiguration(
    input: unknown,
  ): Payments.PaymentProviderConfigurationValidationResult {
    const request = requireInput<Payments.PaymentProviderConfigurationValidationRequest>(input);
    if (request.protocolVersion !== 1) throw new Error("Unsupported payment provider protocol");
    return {
      status: "READY",
      providerCode: "test-stripe",
      displayName: "Stripe Test",
      supportedCurrencyCodes: SUPPORTED_CURRENCIES,
      supportedCountryCodes: SUPPORTED_COUNTRIES,
      supportedSessionKinds: ["SALE", "AUTHORIZATION"],
      supportedOperations: [
        "validateConfiguration",
        "getMethods",
        "createPayment",
        "confirmPayment",
        "cancel",
        "capture",
        "void",
        "refund",
        "reconcile",
      ],
      capabilities: CAPABILITIES,
      failure: null,
      configurationRevision: "test-stripe-config-v2",
    };
  }

  private getMethods(input: unknown): Payments.PaymentProviderMethodDiscoveryResult {
    const request = requireInput<Payments.PaymentProviderMethodDiscoveryRequest>(input);
    const methods: Payments.PaymentProviderMethodDefinition[] = [
      method("card", "test-stripe-card", "Test card", "ONLINE", "REQUIRES_CONFIRMATION"),
      method("card-3ds", "test-stripe-card-3ds", "Test card · 3DS", "ONLINE", "REQUIRES_ACTION"),
      method(
        "bank-transfer",
        "test-stripe-bank-transfer",
        "Test bank transfer",
        "OFFLINE",
        "PENDING",
      ),
      method(
        "declined-card",
        "test-stripe-declined-card",
        "Test declined card",
        "ONLINE",
        "FAILED",
      ),
    ];
    return {
      revision: digest("test-stripe-methods-v2", {
        amount: request.amount,
        buyerCountryCode: request.buyerCountryCode,
        deliveryCountryCodes: request.deliveryCountryCodes,
        selectedDeliveryCarrierCodes: request.selectedDeliveryCarrierCodes,
        methods: methods.map(({ methodKey }) => methodKey),
      }),
      methods,
    };
  }

  private createPayment(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderCreatePaymentRequest>(input);
    return this.idempotent(request, () => {
      const providerReference = `pi_test_${digest("payment-v2", [request.providerAccountId, request.paymentSessionId]).slice(0, 24)}`;
      if (!METHOD_KEYS.includes(request.providerMethodKey as (typeof METHOD_KEYS)[number])) {
        return failed(
          providerReference,
          "NOT_SUPPORTED",
          "unknown_method",
          "The test payment method is not supported.",
        );
      }
      if (
        !SUPPORTED_CURRENCIES.includes(
          request.amount.currencyCode as (typeof SUPPORTED_CURRENCIES)[number],
        )
      ) {
        return failed(
          providerReference,
          "NOT_SUPPORTED",
          "unsupported_currency",
          "The test payment currency is not supported.",
        );
      }
      if (!isPositive(request.amount)) {
        return failed(
          providerReference,
          "INVALID_REQUEST",
          "invalid_amount",
          "Payment amount must be positive.",
        );
      }
      if (request.providerMethodKey === "declined-card") {
        return failed(
          providerReference,
          "DECLINED",
          "card_declined",
          "The test card was declined.",
        );
      }

      const existing = this.payments.get(providerReference);
      if (existing) {
        if (
          existing.providerAccountId !== request.providerAccountId ||
          existing.paymentSessionId !== request.paymentSessionId ||
          !sameMoney(existing.requestedAmount, request.amount)
        ) {
          return failed(
            providerReference,
            "CONFLICT",
            "payment_conflict",
            "The provider reference belongs to a different payment request.",
          );
        }
        return this.currentOperationResult(existing, request.operationId);
      }

      const zero = money("0", request.amount.currencyCode);
      const record: PaymentRecord = {
        providerReference,
        providerAccountId: request.providerAccountId,
        paymentSessionId: request.paymentSessionId,
        kind: request.kind,
        methodKey: request.providerMethodKey,
        state: "PENDING",
        pendingStage:
          request.providerMethodKey === "card-3ds"
            ? "ACTION"
            : request.providerMethodKey === "card"
              ? "CONFIRMATION"
              : "OFFLINE",
        reconcileOutcome: readReconcileOutcome(request.customerInput),
        requestedAmount: request.amount,
        authorizedAmount: zero,
        capturedAmount: zero,
        refundedAmount: zero,
        voidedAmount: zero,
        pendingExpiresAt: addMinutes(60),
      };
      this.payments.set(providerReference, record);
      return this.currentOperationResult(record, request.operationId);
    });
  }

  private confirmPayment(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderConfirmRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request);
      if (
        record.state !== "PENDING" ||
        (record.pendingStage !== "ACTION" && record.pendingStage !== "CONFIRMATION")
      ) {
        return invalidState(record, request.operationId, "confirm");
      }
      if (!sameMoney(record.requestedAmount, request.amount)) {
        return failed(
          record.providerReference,
          "INVALID_REQUEST",
          "confirmation_amount_mismatch",
          "Confirmation amount must match the original payment amount.",
        );
      }
      settleCreated(record);
      record.pendingStage = null;
      return succeeded(
        record.providerReference,
        request.operationId,
        "confirmed",
        cardInstrument("3220"),
        record.kind === "AUTHORIZATION" ? addMinutes(60 * 24 * 7) : null,
      );
    });
  }

  private cancel(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderCancelRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request);
      if (record.state === "CANCELLED")
        return succeeded(
          record.providerReference,
          request.operationId,
          "already_cancelled",
          null,
          null,
          false,
        );
      if (record.state !== "PENDING") return invalidState(record, request.operationId, "cancel");
      record.state = "CANCELLED";
      record.pendingStage = null;
      return succeeded(
        record.providerReference,
        request.operationId,
        "cancelled",
        null,
        null,
        false,
      );
    });
  }

  private capture(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderCaptureRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request);
      if (
        record.kind !== "AUTHORIZATION" ||
        (record.state !== "AUTHORIZED" && record.state !== "PARTIALLY_CAPTURED")
      ) {
        return invalidState(record, request.operationId, "capture");
      }
      const amountFailure = validateIncrement(
        request.amount,
        record.authorizedAmount,
        record.capturedAmount,
        "capture",
      );
      if (amountFailure)
        return failed(
          record.providerReference,
          "INVALID_REQUEST",
          amountFailure.code,
          amountFailure.message,
        );
      record.capturedAmount = addMoney(record.capturedAmount, request.amount);
      record.state =
        compareMoney(record.capturedAmount, record.authorizedAmount) < 0
          ? "PARTIALLY_CAPTURED"
          : "CAPTURED";
      return succeeded(record.providerReference, request.operationId, "captured");
    });
  }

  private voidPayment(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderVoidRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request);
      if (record.state === "VOIDED")
        return succeeded(
          record.providerReference,
          request.operationId,
          "already_voided",
          null,
          null,
          false,
        );
      if (record.kind !== "AUTHORIZATION" || record.state !== "AUTHORIZED")
        return invalidState(record, request.operationId, "void");
      record.voidedAmount = subtractMoney(record.authorizedAmount, record.capturedAmount);
      record.state = "VOIDED";
      return succeeded(record.providerReference, request.operationId, "voided", null, null, false);
    });
  }

  private refund(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderRefundRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request);
      if (
        record.state !== "PARTIALLY_CAPTURED" &&
        record.state !== "CAPTURED" &&
        record.state !== "PARTIALLY_REFUNDED"
      ) {
        return invalidState(record, request.operationId, "refund");
      }
      const amountFailure = validateIncrement(
        request.amount,
        record.capturedAmount,
        record.refundedAmount,
        "refund",
      );
      if (amountFailure)
        return failed(
          record.providerReference,
          "INVALID_REQUEST",
          amountFailure.code,
          amountFailure.message,
        );
      record.refundedAmount = addMoney(record.refundedAmount, request.amount);
      if (compareMoney(record.refundedAmount, record.capturedAmount) < 0) {
        record.state = "PARTIALLY_REFUNDED";
      } else {
        record.voidedAmount = subtractMoney(record.authorizedAmount, record.capturedAmount);
        record.state = "REFUNDED";
      }
      return succeeded(record.providerReference, request.operationId, "refunded");
    });
  }

  private reconcile(input: unknown): Payments.PaymentProviderReconcileResult {
    const request = requireInput<Payments.PaymentProviderReconcileRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request);
      if (record.state === "PENDING") {
        if (record.reconcileOutcome === "SUCCEED") {
          settleCreated(record);
          record.pendingStage = null;
        } else if (record.reconcileOutcome === "FAIL") {
          record.state = "FAILED";
          record.pendingStage = null;
        } else if (record.reconcileOutcome === "EXPIRE") {
          record.state = "EXPIRED";
          record.pendingStage = null;
        }
      }
      return reconciled(record);
    });
  }

  private currentOperationResult(
    record: PaymentRecord,
    operationId: string,
  ): Payments.PaymentProviderOperationResult {
    if (record.pendingStage === "ACTION") {
      return {
        status: "REQUIRES_ACTION",
        providerReference: record.providerReference,
        customerAction: {
          type: "REDIRECT",
          url: `https://payments.test/3ds/${record.providerReference}`,
          expiresAt: addMinutes(15),
        },
        observedAt: now(),
        metadata: { testScenario: "requires_action" },
      };
    }
    if (record.pendingStage === "CONFIRMATION") {
      return {
        status: "REQUIRES_CONFIRMATION",
        providerReference: record.providerReference,
        confirmationExpiresAt: addMinutes(5),
        observedAt: now(),
        metadata: { testScenario: "requires_confirmation" },
      };
    }
    if (record.state === "PENDING") {
      return {
        status: "PENDING",
        providerReference: record.providerReference,
        customerAction: null,
        pendingReason: "OFFLINE_PAYMENT",
        pendingExpiresAt: record.pendingExpiresAt,
        nextReconcileAt: addMinutes(1),
        observedAt: now(),
        metadata: {
          testScenario: "pending",
          reconcileOutcome: record.reconcileOutcome,
        },
      };
    }
    return succeeded(record.providerReference, operationId, "existing_payment");
  }

  private idempotent<TResult>(
    request: Payments.PaymentProviderOperationRequest,
    execute: () => TResult,
  ): TResult {
    const key = `${request.providerAccountId}:${request.operation}:${request.idempotencyKey}`;
    const existing = this.idempotentResults.get(key);
    if (existing) {
      if (existing.requestHash !== request.idempotencyRequestHash)
        throw new Error(`Test Stripe idempotency conflict for ${request.operation}`);
      return existing.result as TResult;
    }
    const result = execute();
    this.idempotentResults.set(key, {
      requestHash: request.idempotencyRequestHash,
      result,
    });
    return result;
  }

  private requireRecord(request: {
    providerReference: string;
    providerAccountId: string;
  }): PaymentRecord {
    const record = this.payments.get(request.providerReference);
    if (!record || record.providerAccountId !== request.providerAccountId)
      throw new Error(`Unknown test payment ${request.providerReference}`);
    return record;
  }
}

function method(
  methodKey: string,
  code: string,
  title: string,
  flow: Payments.PaymentProviderMethodDefinition["flow"],
  scenario: string,
): Payments.PaymentProviderMethodDefinition {
  return {
    methodKey,
    code,
    title,
    flow,
    supportedSessionKinds: ["SALE", "AUTHORIZATION"],
    supportedCaptureModes: ["AUTOMATIC", "MANUAL"],
    capabilities: CAPABILITIES,
    metadata: { testScenario: scenario },
  };
}

function settleCreated(record: PaymentRecord): void {
  record.authorizedAmount = record.requestedAmount;
  if (record.kind === "SALE") {
    record.capturedAmount = record.requestedAmount;
    record.state = "CAPTURED";
  } else {
    record.state = "AUTHORIZED";
  }
}

function reconciled(record: PaymentRecord): Payments.PaymentProviderReconcileResult {
  const base = {
    status: "RECONCILED" as const,
    providerReference: record.providerReference,
    authorizedAmount: record.authorizedAmount,
    capturedAmount: record.capturedAmount,
    refundedAmount: record.refundedAmount,
    voidedAmount: record.voidedAmount,
    networkTransactionId:
      record.state === "PENDING" ||
      record.state === "CANCELLED" ||
      record.state === "EXPIRED" ||
      record.state === "FAILED"
        ? null
        : `txn_test_${record.providerReference.slice(-16)}`,
    observedAt: now(),
    metadata: {
      testScenario: "reconciled",
      reconcileOutcome: record.reconcileOutcome,
    },
  };
  return record.state === "PENDING"
    ? {
        ...base,
        state: "PENDING",
        pendingReason: record.pendingStage === "OFFLINE" ? "OFFLINE_PAYMENT" : "BUYER_ACTION",
        pendingExpiresAt: record.pendingExpiresAt,
      }
    : {
        ...base,
        state: record.state,
        pendingReason: null,
        pendingExpiresAt: null,
      };
}

function invalidState(
  record: PaymentRecord,
  operationId: string,
  operation: string,
): Payments.PaymentProviderOperationResult {
  return failed(
    record.providerReference,
    "CONFLICT",
    `invalid_state_for_${operation}`,
    `Cannot ${operation} a test payment in ${record.state} state.`,
    operationId,
  );
}

function succeeded(
  providerReference: string,
  operationId: string,
  testScenario: string,
  instrument: Payments.PaymentInstrumentSummary | null = null,
  authorizationExpiresAt: string | null = null,
  networkTransaction = true,
): Payments.PaymentProviderOperationResult {
  return {
    status: "SUCCEEDED",
    providerReference,
    networkTransactionId: networkTransaction
      ? `txn_test_${digest("transaction-v2", [providerReference, operationId]).slice(0, 24)}`
      : null,
    authorizationExpiresAt,
    instrument,
    processedAt: now(),
    metadata: { testScenario },
  };
}

function failed(
  providerReference: string | null,
  category: Payments.PaymentFailureCategory,
  code: string,
  message: string,
  operationId?: string,
): Payments.PaymentProviderOperationResult {
  return {
    status: "FAILED",
    providerReference,
    failure: { category, code, message, retryable: false, providerCode: code },
    failedAt: now(),
    metadata: { testScenario: "failed", operationId: operationId ?? null },
  };
}

function validateIncrement(
  amount: Pricing.PricingCheckoutMoney,
  limit: Pricing.PricingCheckoutMoney,
  current: Pricing.PricingCheckoutMoney,
  operation: "capture" | "refund",
): { code: string; message: string } | null {
  if (!isPositive(amount))
    return {
      code: `invalid_${operation}_amount`,
      message: `${capitalize(operation)} amount must be positive.`,
    };
  if (amount.currencyCode !== limit.currencyCode || current.currencyCode !== limit.currencyCode)
    return {
      code: `${operation}_currency_mismatch`,
      message: `${capitalize(operation)} currency must match the payment currency.`,
    };
  if (BigInt(current.amountMinor) + BigInt(amount.amountMinor) > BigInt(limit.amountMinor)) {
    return {
      code: `${operation}_amount_exceeded`,
      message: `${capitalize(operation)} total cannot exceed ${operation === "capture" ? "the authorization" : "the captured amount"}.`,
    };
  }
  return null;
}

function readReconcileOutcome(value: Pricing.PricingCheckoutJsonObject | null): ReconcileOutcome {
  const outcome = value?.testReconcileOutcome;
  return outcome === "SUCCEED" ||
    outcome === "FAIL" ||
    outcome === "EXPIRE" ||
    outcome === "STAY_PENDING"
    ? outcome
    : "STAY_PENDING";
}

function cardInstrument(last4: string): Payments.PaymentInstrumentSummary {
  return {
    type: "CARD",
    brand: "visa",
    last4,
    expiryMonth: 12,
    expiryYear: 2035,
  };
}

function addMoney(
  left: Pricing.PricingCheckoutMoney,
  right: Pricing.PricingCheckoutMoney,
): Pricing.PricingCheckoutMoney {
  if (left.currencyCode !== right.currencyCode) throw new Error("Test payment currency mismatch");
  return money(
    (BigInt(left.amountMinor) + BigInt(right.amountMinor)).toString(),
    left.currencyCode,
  );
}

function subtractMoney(
  left: Pricing.PricingCheckoutMoney,
  right: Pricing.PricingCheckoutMoney,
): Pricing.PricingCheckoutMoney {
  if (left.currencyCode !== right.currencyCode) throw new Error("Test payment currency mismatch");
  return money(
    (BigInt(left.amountMinor) - BigInt(right.amountMinor)).toString(),
    left.currencyCode,
  );
}

function compareMoney(
  left: Pricing.PricingCheckoutMoney,
  right: Pricing.PricingCheckoutMoney,
): number {
  if (left.currencyCode !== right.currencyCode) throw new Error("Test payment currency mismatch");
  const leftAmount = BigInt(left.amountMinor);
  const rightAmount = BigInt(right.amountMinor);
  return leftAmount < rightAmount ? -1 : leftAmount > rightAmount ? 1 : 0;
}

function sameMoney(
  left: Pricing.PricingCheckoutMoney,
  right: Pricing.PricingCheckoutMoney,
): boolean {
  return left.currencyCode === right.currencyCode && left.amountMinor === right.amountMinor;
}

function isPositive(value: Pricing.PricingCheckoutMoney): boolean {
  return BigInt(value.amountMinor) > 0n;
}

function money(amountMinor: string, currencyCode: string): Pricing.PricingCheckoutMoney {
  return { amountMinor, currencyCode };
}

function now(): string {
  return new Date().toISOString();
}

function addMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function capitalize(value: string): string {
  return `${value[0]!.toUpperCase()}${value.slice(1)}`;
}

function digest(namespace: string, value: unknown): string {
  return createHash("sha256").update(namespace).update(JSON.stringify(value)).digest("hex");
}

function requireInput<T>(input: unknown): T {
  if (!input || typeof input !== "object") throw new Error("Provider input is required");
  return input as T;
}
