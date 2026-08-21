import type { Payments } from "@shopana/broker-types";
import type { PaymentMethodBindingsPort } from "../../contracts/ports.js";
import { PaymentsCheckoutMethodsService } from "../PaymentsCheckoutMethodsService.js";

describe("PaymentsCheckoutMethodsService revisions", () => {
  it("keeps zero-payment business revisions stable across execution retries", async () => {
    const bindings: PaymentMethodBindingsPort = {
      resolveCommittedSelection: jest.fn(async () => null),
      stageCheckoutSnapshot: jest.fn(async (input) => ({
        result: input.result,
        reused: false,
      })),
    };
    const service = new PaymentsCheckoutMethodsService({
      accounts: {} as never,
      bindings,
      apps: {} as never,
      customizationBindings: {} as never,
      customization: {} as never,
    });

    const first = await service.getAvailableMethods(request("execution-1"));
    const retry = await service.getAvailableMethods(request("execution-2"));

    expect(retry.executionId).toBe("execution-2");
    expect(retry.discoveryRevision).toBe(first.discoveryRevision);
    expect(retry.customizationRevision).toBe(first.customizationRevision);
    expect(retry.revision).toBe(first.revision);
  });

  it("keeps provider discovery revisions stable across execution retries", async () => {
    const bindings: PaymentMethodBindingsPort = {
      resolveCommittedSelection: jest.fn(async () => null),
      stageCheckoutSnapshot: jest.fn(async (input) => ({
        result: input.result,
        reused: false,
      })),
    };
    const account = providerAccount();
    const service = new PaymentsCheckoutMethodsService({
      accounts: {
        listActiveForStore: jest.fn(async () => [account]),
      } as never,
      bindings,
      apps: {
        resolveRoute: jest.fn(async (input: { operation: string }) =>
          providerRoute(input.operation as Payments.PaymentProviderOperation),
        ),
        validateConfiguration: jest.fn(async () => ({
          status: "READY",
          providerCode: account.providerCode,
          displayName: account.displayName,
          supportedCurrencyCodes: ["USD"],
          supportedCountryCodes: [],
          supportedSessionKinds: ["SALE"],
          supportedOperations: ["getMethods", "createPayment"],
          capabilities: capabilities(),
          failure: null,
          configurationRevision: account.configurationRevision,
        })),
        getMethods: jest.fn(async () => ({
          revision: "provider-discovery-v1",
          methods: [
            {
              methodKey: "card",
              code: "card",
              title: "Card",
              flow: "ONLINE",
              supportedSessionKinds: ["SALE"],
              supportedCaptureModes: ["AUTOMATIC"],
              capabilities: capabilities(),
              metadata: null,
            },
          ],
        })),
      } as never,
      customizationBindings: {
        listActive: jest.fn(async () => ({
          policyRevision: "policy-v1",
          bindingSetRevision: "bindings-v1",
          bindings: [],
        })),
      } as never,
      customization: {
        run: jest.fn(async (input: { methods: Payments.PaymentsCheckoutMethod[] }) => ({
          methods: input.methods,
          hiddenHandles: [],
          issues: [],
          executionRevision: "function-executions-v1",
          executions: [],
        })),
      } as never,
    });

    const first = await service.getAvailableMethods(positiveRequest("execution-1"));
    const retry = await service.getAvailableMethods(positiveRequest("execution-2"));

    expect(first.methods).toHaveLength(1);
    expect(retry.discoveryRevision).toBe(first.discoveryRevision);
    expect(retry.customizationRevision).toBe(first.customizationRevision);
    expect(retry.revision).toBe(first.revision);
  });
});

function request(executionId: string): Payments.GetCheckoutAvailablePaymentMethodsParams {
  const zero = { amountMinor: "0", currencyCode: "USD" };
  return {
    context: {
      executionId,
      checkoutId: "00000000-0000-0000-0000-000000000001",
      currencyCode: "USD",
      correlationId: `correlation-${executionId}`,
      deadlineAt: "2099-01-01T00:00:00.000Z",
      requestedAt: "2026-01-01T00:00:00.000Z",
      storeId: "00000000-0000-0000-0000-000000000002",
      localeCode: "en",
      channelCode: "web",
      effectiveAt: "2026-01-01T00:00:00.000Z",
      buyerEligibility: null,
    },
    selection: null,
    finalQuote: {
      executionId,
      checkoutId: "00000000-0000-0000-0000-000000000001",
      currencyCode: "USD",
      quoteId: "quote",
      revision: "quote-v1",
      discountEvaluationRevision: "discount-v1",
      basedOnPreliminaryDiscountEvaluationRevision: "discount-v0",
      basedOnPreliminaryRevision: "preliminary-v1",
      basedOnDeliveryRevision: "delivery-v1",
      lines: [],
      appliedDiscounts: [],
      discountCodeResolutions: [],
      usageRequirements: [],
      totals: {
        merchandiseSubtotal: zero,
        merchandiseDiscountTotal: zero,
        merchandiseTotal: zero,
        taxTotal: zero,
        deliverySubtotal: zero,
        deliveryDiscountTotal: zero,
        deliveryTotal: zero,
        payableTotal: zero,
      },
    },
    payableAmount: zero,
    loyaltyRedemption: null,
    delivery: {
      executionId,
      checkoutId: "00000000-0000-0000-0000-000000000001",
      currencyCode: "USD",
      revision: "delivery-v1",
      basedOnPreliminaryRevision: "preliminary-v1",
      destinations: [],
      groups: [],
    },
  };
}

function positiveRequest(executionId: string): Payments.GetCheckoutAvailablePaymentMethodsParams {
  const value = request(executionId);
  const amount = { amountMinor: "100", currencyCode: "USD" };
  return {
    ...value,
    payableAmount: amount,
    finalQuote: {
      ...value.finalQuote,
      totals: {
        ...value.finalQuote.totals,
        merchandiseSubtotal: amount,
        merchandiseTotal: amount,
        payableTotal: amount,
      },
    },
  };
}

function providerAccount(): Payments.PaymentProviderAccountSnapshot {
  const timestamp = "2026-08-02T00:00:00.000Z";
  return {
    providerAccountId: "00000000-0000-0000-0000-000000000010",
    organizationId: "00000000-0000-0000-0000-000000000011",
    storeId: "00000000-0000-0000-0000-000000000002",
    installationId: "00000000-0000-0000-0000-000000000012",
    appCode: "provider-app",
    appVersion: "1.0.0",
    providerCode: "provider",
    displayName: "Provider",
    status: "ACTIVE",
    mode: "TEST",
    captureMode: "AUTOMATIC",
    capabilities: capabilities(),
    configurationRevision: "configuration-v1",
    supportedCurrencyCodes: ["USD"],
    supportedCountryCodes: [],
    supportedSessionKinds: ["SALE"],
    supportedOperations: ["getMethods", "createPayment"],
    enabledMethodKeys: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function providerRoute(
  operation: Payments.PaymentProviderOperation,
): Payments.PaymentProviderRouteSnapshot {
  return {
    protocolVersion: 1,
    capabilityRouteId: `route-${operation}`,
    installationId: "00000000-0000-0000-0000-000000000012",
    appCode: "provider-app",
    appVersion: "1.0.0",
    operation,
    routeRevision: `route-${operation}-v1`,
  };
}

function capabilities(): Payments.PaymentProviderCapabilities {
  return {
    supportsAsynchronousCompletion: false,
    supportsSettlementConfirmation: false,
    supportsPartialCapture: false,
    supportsMultipleCaptures: false,
    supportsPartialRefund: false,
    supportsMultipleRefunds: false,
    supportsReconciliation: false,
    supportsDisputes: false,
  };
}
