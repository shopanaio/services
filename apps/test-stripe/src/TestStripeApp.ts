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

interface PaymentRecord {
  providerReference: string;
  kind: Payments.PaymentSessionKind;
  methodKey: string;
  state: ReconciledState;
  authorizedAmount: Pricing.PricingCheckoutMoney;
  capturedAmount: Pricing.PricingCheckoutMoney;
  refundedAmount: Pricing.PricingCheckoutMoney;
  voidedAmount: Pricing.PricingCheckoutMoney;
}

export class TestStripeApp implements ShopanaApp {
  private readonly payments = new Map<string, PaymentRecord>();
  private readonly idempotentResults = new Map<
    string,
    Payments.PaymentProviderOperationResult
  >();

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
    if (request.protocolVersion !== 1) {
      throw new Error("Unsupported payment provider protocol");
    }
    return {
      status: "READY",
      providerCode: "test-stripe",
      displayName: "Stripe Test",
      supportedCurrencyCodes: ["AUD", "CAD", "EUR", "GBP", "JPY", "PLN", "UAH", "USD"],
      supportedCountryCodes: ["AU", "CA", "DE", "FR", "GB", "JP", "PL", "UA", "US"],
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
      configurationRevision: "test-stripe-config-v1",
    };
  }

  private getMethods(input: unknown): Payments.PaymentProviderMethodDiscoveryResult {
    const request = requireInput<Payments.PaymentProviderMethodDiscoveryRequest>(input);
    const methods: Payments.PaymentProviderMethodDefinition[] = [
      method("card", "test-stripe-card", "Test card", "ONLINE", "SUCCEEDED"),
      method("card-3ds", "test-stripe-card-3ds", "Test card · 3DS", "ONLINE", "REQUIRES_ACTION"),
      method("bank-transfer", "test-stripe-bank-transfer", "Test bank transfer", "OFFLINE", "PENDING"),
      method("declined-card", "test-stripe-declined-card", "Test declined card", "ONLINE", "FAILED"),
    ];
    return {
      revision: digest("test-stripe-methods-v1", {
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
      const providerReference = `pi_test_${digest("payment", request.paymentSessionId).slice(0, 24)}`;
      if (request.providerMethodKey === "declined-card") {
        return failed(providerReference, "card_declined", "The test card was declined.");
      }

      const zero = money("0", request.amount.currencyCode);
      const record: PaymentRecord = {
        providerReference,
        kind: request.kind,
        methodKey: request.providerMethodKey,
        state: "PENDING",
        authorizedAmount: zero,
        capturedAmount: zero,
        refundedAmount: zero,
        voidedAmount: zero,
      };
      this.payments.set(providerReference, record);

      if (request.providerMethodKey === "card-3ds") {
        return {
          status: "REQUIRES_ACTION",
          providerReference,
          customerAction: {
            type: "REDIRECT",
            url: `https://payments.test/3ds/${providerReference}`,
            expiresAt: addMinutes(15),
          },
          observedAt: now(),
          metadata: { testScenario: "requires_action" },
        };
      }
      if (request.providerMethodKey === "bank-transfer") {
        return {
          status: "PENDING",
          providerReference,
          customerAction: null,
          pendingReason: "OFFLINE_PAYMENT",
          pendingExpiresAt: addMinutes(60),
          nextReconcileAt: addMinutes(1),
          observedAt: now(),
          metadata: { testScenario: "pending" },
        };
      }

      settleCreated(record, request.amount);
      return succeeded(providerReference, {
        instrument: {
          type: "CARD",
          brand: "visa",
          last4: "4242",
          expiryMonth: 12,
          expiryYear: 2035,
        },
        authorizationExpiresAt:
          request.kind === "AUTHORIZATION" ? addMinutes(60 * 24 * 7) : null,
        testScenario: "succeeded",
      });
    });
  }

  private confirmPayment(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderConfirmRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request.providerReference);
      settleCreated(record, request.amount);
      return succeeded(record.providerReference, {
        instrument: {
          type: "CARD",
          brand: "visa",
          last4: "3220",
          expiryMonth: 12,
          expiryYear: 2035,
        },
        authorizationExpiresAt:
          record.kind === "AUTHORIZATION" ? addMinutes(60 * 24 * 7) : null,
        testScenario: "confirmed",
      });
    });
  }

  private cancel(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderCancelRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request.providerReference);
      record.state = "CANCELLED";
      return succeeded(record.providerReference, { testScenario: "cancelled" });
    });
  }

  private capture(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderCaptureRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request.providerReference);
      record.capturedAmount = addMoney(record.capturedAmount, request.amount);
      record.state =
        BigInt(record.capturedAmount.amountMinor) < BigInt(record.authorizedAmount.amountMinor)
          ? "PARTIALLY_CAPTURED"
          : "CAPTURED";
      return succeeded(record.providerReference, { testScenario: "captured" });
    });
  }

  private voidPayment(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderVoidRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request.providerReference);
      record.voidedAmount = money(
        (BigInt(record.authorizedAmount.amountMinor) - BigInt(record.capturedAmount.amountMinor)).toString(),
        record.authorizedAmount.currencyCode,
      );
      record.state = "VOIDED";
      return succeeded(record.providerReference, { testScenario: "voided" });
    });
  }

  private refund(input: unknown): Payments.PaymentProviderOperationResult {
    const request = requireInput<Payments.PaymentProviderRefundRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireRecord(request.providerReference);
      record.refundedAmount = addMoney(record.refundedAmount, request.amount);
      record.state =
        BigInt(record.refundedAmount.amountMinor) < BigInt(record.capturedAmount.amountMinor)
          ? "PARTIALLY_REFUNDED"
          : "REFUNDED";
      return succeeded(record.providerReference, { testScenario: "refunded" });
    });
  }

  private reconcile(input: unknown): Payments.PaymentProviderReconcileResult {
    const request = requireInput<Payments.PaymentProviderReconcileRequest>(input);
    const record = this.requireRecord(request.providerReference);
    return record.state === "PENDING"
      ? {
          status: "RECONCILED",
          state: "PENDING",
          providerReference: record.providerReference,
          authorizedAmount: record.authorizedAmount,
          capturedAmount: record.capturedAmount,
          refundedAmount: record.refundedAmount,
          voidedAmount: record.voidedAmount,
          networkTransactionId: null,
          pendingReason: record.methodKey === "bank-transfer" ? "OFFLINE_PAYMENT" : "BUYER_ACTION",
          pendingExpiresAt: addMinutes(60),
          observedAt: now(),
          metadata: { testScenario: "pending" },
        }
      : {
          status: "RECONCILED",
          state: record.state,
          providerReference: record.providerReference,
          authorizedAmount: record.authorizedAmount,
          capturedAmount: record.capturedAmount,
          refundedAmount: record.refundedAmount,
          voidedAmount: record.voidedAmount,
          networkTransactionId: `txn_test_${record.providerReference.slice(-16)}`,
          pendingReason: null,
          pendingExpiresAt: null,
          observedAt: now(),
          metadata: { testScenario: "reconciled" },
        };
  }

  private idempotent<T extends Payments.PaymentProviderOperationRequest>(
    request: T,
    execute: () => Payments.PaymentProviderOperationResult,
  ): Payments.PaymentProviderOperationResult {
    const key = `${request.providerAccountId}:${request.operation}:${request.idempotencyKey}`;
    const existing = this.idempotentResults.get(key);
    if (existing) return existing;
    const result = execute();
    this.idempotentResults.set(key, result);
    return result;
  }

  private requireRecord(providerReference: string): PaymentRecord {
    const record = this.payments.get(providerReference);
    if (!record) throw new Error(`Unknown test payment ${providerReference}`);
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

function settleCreated(record: PaymentRecord, amount: Pricing.PricingCheckoutMoney): void {
  record.authorizedAmount = amount;
  if (record.kind === "SALE") {
    record.capturedAmount = amount;
    record.state = "CAPTURED";
  } else {
    record.state = "AUTHORIZED";
  }
}

function succeeded(
  providerReference: string,
  options: Readonly<{
    instrument?: Payments.PaymentInstrumentSummary | null;
    authorizationExpiresAt?: string | null;
    testScenario: string;
  }>,
): Payments.PaymentProviderOperationResult {
  return {
    status: "SUCCEEDED",
    providerReference,
    networkTransactionId: `txn_test_${providerReference.slice(-16)}`,
    authorizationExpiresAt: options.authorizationExpiresAt ?? null,
    instrument: options.instrument ?? null,
    processedAt: now(),
    metadata: { testScenario: options.testScenario },
  };
}

function failed(
  providerReference: string,
  code: string,
  message: string,
): Payments.PaymentProviderOperationResult {
  return {
    status: "FAILED",
    providerReference,
    failure: {
      category: "DECLINED",
      code,
      message,
      retryable: false,
      providerCode: code,
    },
    failedAt: now(),
    metadata: { testScenario: "declined" },
  };
}

function addMoney(
  left: Pricing.PricingCheckoutMoney,
  right: Pricing.PricingCheckoutMoney,
): Pricing.PricingCheckoutMoney {
  if (left.currencyCode !== right.currencyCode) {
    throw new Error("Test payment currency mismatch");
  }
  return money(
    (BigInt(left.amountMinor) + BigInt(right.amountMinor)).toString(),
    left.currencyCode,
  );
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

function digest(namespace: string, value: unknown): string {
  return createHash("sha256")
    .update(namespace)
    .update(JSON.stringify(value))
    .digest("hex");
}

function requireInput<T>(input: unknown): T {
  if (!input || typeof input !== "object") {
    throw new Error("Provider input is required");
  }
  return input as T;
}
