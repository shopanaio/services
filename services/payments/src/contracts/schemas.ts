import {
  PAYMENTS_PROVIDER_PROTOCOL_VERSION,
  PaymentsActions,
  type Payments,
} from "@shopana/broker-types";
import { z } from "zod";
import type { BrokerCallContext } from "@shopana/shared-kernel";
import type { PaymentProviderCompletionContext } from "./actions.js";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

const jsonObjectSchema = z.record(jsonValueSchema);
const identifierSchema = z.string().trim().min(1).max(255);
const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();

export const PaymentMoneySchema = z
  .object({
    amountMinor: z.string().regex(/^(0|[1-9]\d*)$/),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();

export const PaymentFailureSchema = z
  .object({
    category: z.enum([
      "DECLINED",
      "FRAUD_SUSPECTED",
      "INVALID_REQUEST",
      "NOT_SUPPORTED",
      "CONFIGURATION",
      "AUTHENTICATION",
      "PROVIDER_UNAVAILABLE",
      "TIMEOUT",
      "RATE_LIMITED",
      "CONFLICT",
      "UNKNOWN",
    ]),
    code: identifierSchema,
    message: z.string().trim().min(1).max(2_000),
    retryable: z.boolean(),
    providerCode: z.string().trim().min(1).max(255).nullable(),
  })
  .strict();

export const PaymentSettlementConfirmationSchema = z
  .discriminatedUnion("decision", [
    z.object({
      decision: z.literal("APPROVED"),
      confirmationId: identifierSchema,
      confirmedAt: timestampSchema,
      expiresAt: timestampSchema,
      checkoutVersion: z.number().int().safe().nonnegative(),
      finalQuoteRevision: identifierSchema,
      inventoryReservationRevision: identifierSchema.nullable(),
    }).strict(),
    z.object({
      decision: z.literal("REJECTED"),
      confirmationId: identifierSchema,
      confirmedAt: timestampSchema,
      failure: PaymentFailureSchema,
    }).strict(),
  ])
  .superRefine((confirmation, context) => {
    if (
      confirmation.decision === "APPROVED" &&
      Date.parse(confirmation.expiresAt) <= Date.parse(confirmation.confirmedAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "Settlement confirmation must expire after it was approved",
      });
    }
  });

const paymentInstrumentSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("CARD"),
      brand: identifierSchema,
      last4: z.string().regex(/^\d{4}$/),
      expiryMonth: z.number().int().min(1).max(12).nullable(),
      expiryYear: z.number().int().min(2_000).max(9_999).nullable(),
    })
    .strict(),
  z
    .object({
      type: z.literal("OTHER"),
      displayName: z.string().trim().min(1).max(255),
      reference: z.string().trim().min(1).max(512).nullable(),
    })
    .strict(),
]);

const paymentCustomerActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("REDIRECT"),
      url: z.string().url().startsWith("https://").max(2_048),
      expiresAt: nullableTimestampSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("INSTRUCTIONS"),
      title: z.string().trim().min(1).max(255),
      instructions: z.string().trim().min(1).max(8_192),
      expiresAt: nullableTimestampSchema,
      data: jsonObjectSchema.nullable(),
    })
    .strict(),
]);

const paymentPendingReasonSchema = z.enum([
  "BUYER_ACTION",
  "PROVIDER_PROCESSING",
  "PAYMENT_NETWORK",
  "MANUAL_REVIEW",
  "OFFLINE_PAYMENT",
  "UNKNOWN",
]);

const paymentProviderAddressSchema = z
  .object({
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    provinceCode: z.string().trim().min(1).max(64).nullable(),
    postalCode: z.string().trim().min(1).max(32).nullable(),
    city: z.string().trim().min(1).max(255).nullable(),
    addressLine1: z.string().trim().min(1).max(512).nullable(),
    addressLine2: z.string().trim().min(1).max(512).nullable(),
  })
  .strict();

const paymentProviderCustomerSchema = z
  .object({
    customerReference: z.string().trim().min(1).max(255).nullable(),
    email: z.string().email().max(320).nullable(),
    phone: z.string().trim().min(1).max(32).nullable(),
    billingAddress: paymentProviderAddressSchema.nullable(),
  })
  .strict();

const idempotencyKeySchema = z.string().trim().min(1).max(255);
const correlationIdSchema = z.string().trim().min(1).max(255);
const expectedRevisionSchema = z.number().int().nonnegative();
const uuidSchema = z.string().uuid();
const paymentCustomizationStatusSchema = z.enum(["ACTIVE", "DISABLED"]);

/** Parse with these schemas before computing a PaymentIdempotencySnapshot. */
export const PaymentLifecycleActionSchemas = {
  configureProviderAccount: z
    .object({
      organizationId: identifierSchema,
      storeId: identifierSchema,
      installationId: identifierSchema,
      mode: z.enum(["TEST", "LIVE"]),
      captureMode: z.enum(["AUTOMATIC", "MANUAL"]),
      enabledMethodKeys: z.array(identifierSchema).max(128),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  setProviderAccountStatus: z
    .object({
      storeId: identifierSchema,
      providerAccountId: identifierSchema,
      expectedConfigurationRevision: identifierSchema,
      status: z.enum(["ACTIVE", "INACTIVE"]),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  configureMethodCustomization: z
    .object({
      storeId: uuidSchema,
      customizationId: uuidSchema,
      functionBindingId: uuidSchema,
      installationId: uuidSchema,
      functionKey: identifierSchema,
      contractVersion: z.literal(1),
      precedence: z.number().int().safe().nonnegative(),
      activationSequence: z.number().int().safe().nonnegative(),
      failureMode: z.enum(["REQUIRED", "OPTIONAL"]),
      configurationSnapshot: jsonObjectSchema,
      configurationRevision: identifierSchema,
      routeRevision: identifierSchema,
      customizationStatus: paymentCustomizationStatusSchema,
      bindingStatus: paymentCustomizationStatusSchema,
    })
    .strict(),
  setMethodCustomizationStatus: z
    .object({
      storeId: uuidSchema,
      customizationId: uuidSchema,
      status: paymentCustomizationStatusSchema,
    })
    .strict(),
  createCollection: z
    .object({
      organizationId: identifierSchema,
      storeId: identifierSchema,
      checkoutId: identifierSchema,
      orderId: identifierSchema,
      expectedCheckoutVersion: expectedRevisionSchema,
      finalQuoteRevision: identifierSchema,
      targetAmount: PaymentMoneySchema,
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  createSession: z
    .object({
      organizationId: identifierSchema,
      storeId: identifierSchema,
      checkoutId: identifierSchema,
      orderId: identifierSchema,
      paymentCollectionId: identifierSchema,
      expectedCheckoutVersion: expectedRevisionSchema,
      finalQuoteRevision: identifierSchema,
      paymentMethodsRevision: identifierSchema,
      methodHandle: identifierSchema,
      kind: z.enum(["SALE", "AUTHORIZATION"]),
      amount: PaymentMoneySchema,
      expiresAt: timestampSchema,
      returnUrl: z.string().url().startsWith("https://").max(2_048).nullable(),
      customer: paymentProviderCustomerSchema.nullable(),
      customerInput: jsonObjectSchema.nullable(),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  capture: z
    .object({
      storeId: identifierSchema,
      paymentSessionId: identifierSchema,
      expectedSessionRevision: expectedRevisionSchema,
      amount: PaymentMoneySchema,
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  cancel: z
    .object({
      storeId: identifierSchema,
      paymentSessionId: identifierSchema,
      expectedSessionRevision: expectedRevisionSchema,
      reason: z.string().trim().min(1).max(1_000).nullable(),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  void: z
    .object({
      storeId: identifierSchema,
      paymentSessionId: identifierSchema,
      expectedSessionRevision: expectedRevisionSchema,
      reason: z.string().trim().min(1).max(1_000).nullable(),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  refund: z
    .object({
      storeId: identifierSchema,
      paymentSessionId: identifierSchema,
      expectedSessionRevision: expectedRevisionSchema,
      amount: PaymentMoneySchema,
      reason: z.string().trim().min(1).max(1_000).nullable(),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  reconcile: z
    .object({
      storeId: identifierSchema,
      paymentSessionId: identifierSchema,
      expectedSessionRevision: expectedRevisionSchema,
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
  expire: z
    .object({
      organizationId: identifierSchema,
      storeId: identifierSchema,
      paymentSessionId: identifierSchema,
      expectedSessionRevision: expectedRevisionSchema,
      reason: z.string().trim().min(1).max(1_000),
      idempotencyKey: idempotencyKeySchema,
      correlationId: correlationIdSchema,
    })
    .strict(),
} as const;

export const PaymentProviderOperationResultSchema = z
  .discriminatedUnion("status", [
    z
      .object({
        status: z.literal("SUCCEEDED"),
        providerReference: identifierSchema,
        networkTransactionId: z.string().trim().min(1).max(512).nullable(),
        authorizationExpiresAt: nullableTimestampSchema,
        instrument: paymentInstrumentSchema.nullable(),
        processedAt: timestampSchema,
        metadata: jsonObjectSchema.nullable(),
      })
      .strict(),
    z
      .object({
        status: z.literal("PENDING"),
        providerReference: identifierSchema,
        customerAction: z.null(),
        pendingReason: paymentPendingReasonSchema,
        pendingExpiresAt: timestampSchema,
        nextReconcileAt: nullableTimestampSchema,
        observedAt: timestampSchema,
        metadata: jsonObjectSchema.nullable(),
      })
      .strict(),
    z
      .object({
        status: z.literal("REQUIRES_ACTION"),
        providerReference: identifierSchema,
        customerAction: paymentCustomerActionSchema,
        observedAt: timestampSchema,
        metadata: jsonObjectSchema.nullable(),
      })
      .strict(),
    z
      .object({
        status: z.literal("REQUIRES_CONFIRMATION"),
        providerReference: identifierSchema,
        confirmationExpiresAt: timestampSchema,
        observedAt: timestampSchema,
        metadata: jsonObjectSchema.nullable(),
      })
      .strict(),
    z
      .object({
        status: z.literal("FAILED"),
        providerReference: identifierSchema.nullable(),
        failure: PaymentFailureSchema,
        failedAt: timestampSchema,
        metadata: jsonObjectSchema.nullable(),
      })
      .strict(),
  ])
  .superRefine((result, context) => {
    if (
      result.status === "PENDING" &&
      Date.parse(result.pendingExpiresAt) <= Date.parse(result.observedAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pendingExpiresAt"],
        message: "pendingExpiresAt must be after observedAt",
      });
    }
    if (
      result.status === "PENDING" &&
      result.nextReconcileAt !== null &&
      Date.parse(result.nextReconcileAt) > Date.parse(result.pendingExpiresAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nextReconcileAt"],
        message: "nextReconcileAt must not be after pendingExpiresAt",
      });
    }
    if (
      result.status === "REQUIRES_CONFIRMATION" &&
      Date.parse(result.confirmationExpiresAt) <= Date.parse(result.observedAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmationExpiresAt"],
        message: "confirmationExpiresAt must be after observedAt",
      });
    }
  });

const reconcileBaseShape = {
  status: z.literal("RECONCILED"),
  providerReference: identifierSchema,
  authorizedAmount: PaymentMoneySchema,
  capturedAmount: PaymentMoneySchema,
  refundedAmount: PaymentMoneySchema,
  voidedAmount: PaymentMoneySchema,
  networkTransactionId: z.string().trim().min(1).max(512).nullable(),
  observedAt: timestampSchema,
  metadata: jsonObjectSchema.nullable(),
};

export const PaymentProviderReconcileResultSchema = z
  .discriminatedUnion("state", [
    z
      .object({
        ...reconcileBaseShape,
        state: z.literal("PENDING"),
        pendingReason: paymentPendingReasonSchema,
        pendingExpiresAt: timestampSchema,
      })
      .strict(),
    z
      .object({
        ...reconcileBaseShape,
        state: z.enum([
          "AUTHORIZED",
          "PARTIALLY_CAPTURED",
          "CAPTURED",
          "VOIDED",
          "PARTIALLY_REFUNDED",
          "REFUNDED",
          "CANCELLED",
          "EXPIRED",
          "FAILED",
        ]),
        pendingReason: z.null(),
        pendingExpiresAt: z.null(),
      })
      .strict(),
  ])
  .superRefine((result, context) => {
    const money = [
      result.authorizedAmount,
      result.capturedAmount,
      result.refundedAmount,
      result.voidedAmount,
    ];
    if (money.some((value) => value.currencyCode !== money[0]!.currencyCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capturedAmount", "currencyCode"],
        message: "All reconcile amounts must use the same currency",
      });
      return;
    }

    const authorized = BigInt(result.authorizedAmount.amountMinor);
    const captured = BigInt(result.capturedAmount.amountMinor);
    const refunded = BigInt(result.refundedAmount.amountMinor);
    const voided = BigInt(result.voidedAmount.amountMinor);

    if (captured > authorized || refunded > captured || captured + voided > authorized) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "Reconcile monetary totals are inconsistent",
      });
    }
    if (
      result.state === "PENDING" &&
      Date.parse(result.pendingExpiresAt) <= Date.parse(result.observedAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pendingExpiresAt"],
        message: "pendingExpiresAt must be after observedAt",
      });
    }
    if (
      result.state === "PARTIALLY_CAPTURED" &&
      !(captured > 0n && captured < authorized && refunded === 0n)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "PARTIALLY_CAPTURED requires capturedAmount between zero and authorizedAmount",
      });
    }
    if (
      result.state === "AUTHORIZED" &&
      !(authorized > 0n && captured === 0n && refunded === 0n && voided === 0n)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "AUTHORIZED requires a positive authorization and no settlement totals",
      });
    }
    if (
      result.state === "CAPTURED" &&
      !(captured > 0n && captured === authorized && refunded === 0n && voided === 0n)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "CAPTURED requires the full authorized amount to be captured",
      });
    }
    if (
      result.state === "VOIDED" &&
      !(authorized > 0n && captured === 0n && refunded === 0n && voided === authorized)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "VOIDED requires the uncaptured authorization to be fully released",
      });
    }
    if (
      result.state === "PARTIALLY_REFUNDED" &&
      !(refunded > 0n && refunded < captured)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "PARTIALLY_REFUNDED requires refundedAmount between zero and capturedAmount",
      });
    }
    if (
      result.state === "REFUNDED" &&
      !(captured > 0n && refunded === captured && captured + voided === authorized)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "REFUNDED requires all captured funds refunded and any remainder released",
      });
    }
    if (
      ["PENDING", "CANCELLED", "EXPIRED", "FAILED"].includes(result.state) &&
      (authorized !== 0n || captured !== 0n || refunded !== 0n || voided !== 0n)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: `${result.state} cannot contain financial settlement totals`,
      });
    }
  });

const paymentOperationTypeSchema = z.enum([
  "SALE",
  "AUTHORIZE",
  "CONFIRM",
  "CANCEL",
  "CAPTURE",
  "VOID",
  "REFUND",
]);

export const CompleteProviderOperationParamsSchema = z.union([
  z
    .object({
      protocolVersion: z.literal(PAYMENTS_PROVIDER_PROTOCOL_VERSION),
      paymentSessionId: identifierSchema,
      operationId: identifierSchema,
      providerEventId: identifierSchema,
      occurredAt: timestampSchema,
      operationType: paymentOperationTypeSchema,
      result: PaymentProviderOperationResultSchema,
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(PAYMENTS_PROVIDER_PROTOCOL_VERSION),
      paymentSessionId: identifierSchema,
      operationId: identifierSchema,
      providerEventId: identifierSchema,
      occurredAt: timestampSchema,
      operationType: z.literal("RECONCILE"),
      result: PaymentProviderReconcileResultSchema,
    })
    .strict(),
]);

const paymentDisputeStateSchema = z.enum([
  "NEEDS_RESPONSE",
  "UNDER_REVIEW",
  "WON",
  "LOST",
  "ACCEPTED",
  "CLOSED",
]);

export const PaymentProviderExternalEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("PAYMENT_RECONCILED"),
      result: PaymentProviderReconcileResultSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("DISPUTE_CHANGED"),
      providerDisputeReference: identifierSchema,
      providerReference: identifierSchema,
      amount: PaymentMoneySchema,
      reasonCode: identifierSchema,
      state: paymentDisputeStateSchema,
      responseDueAt: nullableTimestampSchema,
      metadata: jsonObjectSchema.nullable(),
    })
    .strict(),
]);

export const ReportPaymentProviderEventParamsSchema = z
  .object({
    protocolVersion: z.literal(PAYMENTS_PROVIDER_PROTOCOL_VERSION),
    providerAccountId: identifierSchema,
    providerEventId: identifierSchema,
    occurredAt: timestampSchema,
    event: PaymentProviderExternalEventSchema,
  })
  .strict();

const providerOperationByPaymentOperation = {
  SALE: "createPayment",
  AUTHORIZE: "createPayment",
  CONFIRM: "confirmPayment",
  CANCEL: "cancel",
  CAPTURE: "capture",
  VOID: "void",
  REFUND: "refund",
  RECONCILE: "reconcile",
} as const satisfies Record<Payments.PaymentOperationType, Payments.PaymentProviderOperation>;

export interface ProviderCompletionBoundaryExpectation {
  context: PaymentProviderCompletionContext;
  route: Payments.PaymentProviderRouteSnapshot;
  session: Pick<
    Payments.PaymentSessionSnapshot,
    | "paymentSessionId"
    | "organizationId"
    | "storeId"
    | "providerReference"
  >;
  operation: Pick<
    Payments.PaymentOperationSnapshot,
    "operationId" | "type" | "state" | "confirmation"
  >;
}

export interface ProviderEventBoundaryExpectation {
  context: PaymentProviderCompletionContext;
  account: Pick<
    Payments.PaymentProviderAccountSnapshot,
    | "providerAccountId"
    | "installationId"
    | "appCode"
    | "appVersion"
    | "organizationId"
    | "storeId"
  >;
}

export function parseProviderOperationResult(
  input: unknown,
): Payments.PaymentProviderOperationResult {
  return PaymentProviderOperationResultSchema.parse(
    input,
  ) as Payments.PaymentProviderOperationResult;
}

export function parseProviderCompletionContext(
  context: BrokerCallContext,
): PaymentProviderCompletionContext {
  assertBoundary(
    context.caller.kind === "action" && context.caller.service === "apps",
    "Provider callback must originate from the Apps action broker",
  );
  assertBoundary(context.app !== undefined, "Trusted App context is required");
  assertBoundary(
    context.app.executionKind !== "COMMERCE_FUNCTION",
    "Commerce Functions cannot mutate payments",
  );
  return Object.freeze({
    callerService: "apps",
    installationId: context.app.installationId,
    appCode: context.app.appCode,
    appVersion: context.app.appVersion,
    appOperationId: context.app.operationId ?? null,
    executionKind: "STANDARD",
    organizationId: context.app.organizationId,
    storeId: context.app.storeId,
    correlationId: context.app.correlationId ?? null,
    grantedScopes: context.app.grantedScopes,
  });
}

export function parseProviderReconcileResult(
  input: unknown,
): Payments.PaymentProviderReconcileResult {
  return PaymentProviderReconcileResultSchema.parse(
    input,
  ) as Payments.PaymentProviderReconcileResult;
}

export function parseProviderCompletion(
  input: unknown,
  expected: ProviderCompletionBoundaryExpectation,
): Payments.CompleteProviderOperationParams {
  const parsed = CompleteProviderOperationParamsSchema.parse(
    input,
  ) as Payments.CompleteProviderOperationParams;
  assertTrustedAppContext(expected.context, PaymentsActions.completeProviderOperation);
  assertBoundary(
    parsed.paymentSessionId === expected.session.paymentSessionId,
    "Callback paymentSessionId does not match the persisted session",
  );
  assertBoundary(
    parsed.operationId === expected.operation.operationId &&
      parsed.operationType === expected.operation.type,
    "Callback operation does not match the persisted operation",
  );
  assertBoundary(
    expected.route.operation === providerOperationByPaymentOperation[parsed.operationType],
    "Callback operation does not match the persisted provider route",
  );
  if (parsed.operationType !== "RECONCILE") {
    assertOperationResultCompatibility(
      parsed.operationType,
      parsed.result as Payments.PaymentProviderOperationResult,
    );
  }
  const resultProviderReference = parsed.result.providerReference;
  assertBoundary(
    resultProviderReference === null ||
      expected.session.providerReference === null ||
      resultProviderReference === expected.session.providerReference,
    "Callback providerReference does not match the persisted session",
  );
  if (parsed.operationType === "CONFIRM" || parsed.operationType === "CAPTURE") {
    assertBoundary(
      expected.operation.confirmation?.decision === "APPROVED",
      `${parsed.operationType} operation requires a persisted approved settlement confirmation`,
    );
  }
  if (expected.operation.state === "REQUIRES_CONFIRMATION") {
    assertBoundary(
      parsed.result.status === "FAILED",
      "Only a failure may complete an operation that is awaiting platform confirmation",
    );
  }
  assertRouteIdentity(expected.context, expected.route);
  assertTenantIdentity(expected.context, expected.session);
  return parsed;
}

export function parseProviderEvent(
  input: unknown,
  expected: ProviderEventBoundaryExpectation,
): Payments.ReportPaymentProviderEventParams {
  const parsed = ReportPaymentProviderEventParamsSchema.parse(
    input,
  ) as Payments.ReportPaymentProviderEventParams;
  assertTrustedAppContext(expected.context, PaymentsActions.reportProviderEvent);
  assertBoundary(
    parsed.providerAccountId === expected.account.providerAccountId,
    "Provider event account does not match the persisted account",
  );
  assertBoundary(
    expected.context.installationId === expected.account.installationId,
    "Provider event installation does not own the persisted account",
  );
  assertBoundary(
    expected.context.appCode === expected.account.appCode &&
      expected.context.appVersion === expected.account.appVersion,
    "Provider event App identity does not match the persisted account",
  );
  assertTenantIdentity(expected.context, expected.account);
  return parsed;
}

function assertTrustedAppContext(
  context: PaymentProviderCompletionContext,
  permission: string,
): void {
  assertBoundary(context.callerService === "apps", "Provider callback must originate from Apps");
  assertBoundary(context.executionKind === "STANDARD", "Commerce Functions cannot mutate payments");
  assertBoundary(
    context.grantedScopes.includes(permission),
    `Provider App does not have the ${permission} permission`,
  );
}

function assertRouteIdentity(
  context: PaymentProviderCompletionContext,
  route: Payments.PaymentProviderRouteSnapshot,
): void {
  assertBoundary(context.installationId === route.installationId, "App installation does not own the route");
  assertBoundary(context.appCode === route.appCode, "App code does not match the route");
  assertBoundary(context.appVersion === route.appVersion, "App version does not match the pinned route");
  assertBoundary(
    route.protocolVersion === PAYMENTS_PROVIDER_PROTOCOL_VERSION,
    "Provider route protocol version is unsupported",
  );
}

function assertOperationResultCompatibility(
  operationType: Exclude<Payments.PaymentOperationType, "RECONCILE">,
  result: Payments.PaymentProviderOperationResult,
): void {
  if (result.status === "REQUIRES_CONFIRMATION") {
    assertBoundary(
      operationType === "SALE" || operationType === "AUTHORIZE",
      "Only an initial payment operation may require settlement confirmation",
    );
  }
}

function assertTenantIdentity(
  context: PaymentProviderCompletionContext,
  target: Readonly<{ organizationId: string; storeId: string }>,
): void {
  assertBoundary(context.organizationId === target.organizationId, "Organization boundary mismatch");
  assertBoundary(context.storeId === target.storeId, "Store boundary mismatch");
}

function assertBoundary(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invalid payment provider boundary: ${message}`);
  }
}
