import type { Payments } from "@shopana/broker-types";
import type {
  PaymentCustomizationBindingsPort,
  PaymentMethodBindingsPort,
  PaymentProviderAccountsPort,
  PaymentsProviderAppsPort,
} from "../contracts/ports.js";
import { contentRevision, paymentMethodHandle } from "./canonicalJson.js";
import { PaymentsCheckoutError } from "./errors.js";
import type { PaymentMethodCustomizationRunner } from "../commerce-functions/PaymentMethodCustomizationRunner.js";

type ProviderExecution = Readonly<{
  account: Payments.PaymentProviderAccountSnapshot;
  route: Payments.PaymentProviderRouteSnapshot | null;
  status: "SUCCEEDED" | "FAILED" | "TIMED_OUT" | "INELIGIBLE";
  classification: string | null;
  result: Payments.PaymentProviderMethodDiscoveryResult | null;
}>;

export class PaymentsCheckoutMethodsService {
  constructor(
    private readonly dependencies: {
      accounts: PaymentProviderAccountsPort;
      bindings: PaymentMethodBindingsPort;
      apps: PaymentsProviderAppsPort;
      customizationBindings: PaymentCustomizationBindingsPort;
      customization: PaymentMethodCustomizationRunner;
    },
  ) {}

  async getAvailableMethods(
    params: Payments.GetCheckoutAvailablePaymentMethodsParams,
  ): Promise<Payments.GetCheckoutAvailablePaymentMethodsResult> {
    const context = params.context;
    if (BigInt(params.payableAmount.amountMinor) === 0n) return this.persistZero(params);
    const baseSelection =
      params.selection === null
        ? null
        : await this.dependencies.bindings.resolveCommittedSelection({
            storeId: context.storeId,
            checkoutId: context.checkoutId,
            checkoutVersion: context.expectedCheckoutVersion,
            methodHandle: params.selection.methodHandle,
            effectiveAt: context.effectiveAt,
          });

    const accounts = (await this.dependencies.accounts.listActiveForStore(context.storeId)).filter(
      (account) => eligible(account, params),
    );
    const executions = await mapConcurrent(accounts, 8, (account) =>
      this.discover(account, params),
    );
    const successes = executions.filter((item) => item.status === "SUCCEEDED");
    if (
      successes.length === 0 &&
      executions.some((item) => item.status === "FAILED" || item.status === "TIMED_OUT")
    ) {
      const timedOut = executions.some((item) => item.status === "TIMED_OUT");
      throw new PaymentsCheckoutError(
        timedOut ? "PAYMENT_DISCOVERY_DEADLINE_EXCEEDED" : "PAYMENT_PROVIDER_DISCOVERY_UNAVAILABLE",
        "No eligible payment provider completed method discovery.",
        true,
      );
    }

    const issues: Payments.PaymentsCheckoutIssue[] = executions.flatMap((execution) =>
      execution.status === "SUCCEEDED"
        ? []
        : [
            {
              code:
                execution.status === "TIMED_OUT"
                  ? "PAYMENT_PROVIDER_DISCOVERY_TIMED_OUT"
                  : execution.status === "INELIGIBLE"
                    ? "PAYMENT_PROVIDER_CONFIGURATION_CHANGED"
                    : "PAYMENT_PROVIDER_DISCOVERY_FAILED",
              message:
                execution.status === "INELIGIBLE"
                  ? "A payment provider configuration changed and must be activated again."
                  : "A payment provider was unavailable during method discovery.",
              severity: "WARNING" as const,
              retryable: execution.status !== "INELIGIBLE",
            },
          ],
    );
    const candidates = normalize(executions, context.checkoutId);
    const discoveryRevision = contentRevision("payment-method-discovery", {
      checkoutId: context.checkoutId,
      basedOnCheckoutVersion: context.expectedCheckoutVersion,
      targetCheckoutVersion: context.targetCheckoutVersion,
      currencyCode: context.currencyCode,
      finalQuoteRevision: params.finalQuote.revision,
      loyaltyQuoteRevision: params.loyaltyRedemption?.quoteRevision ?? null,
      deliveryRevision: params.delivery.revision,
      amount: params.payableAmount,
      providers: executions.map((item) => ({
        providerAccountId: item.account.providerAccountId,
        configurationRevision: item.account.configurationRevision,
        routeRevision: item.route?.routeRevision ?? null,
        providerDiscoveryRevision: item.result?.revision ?? null,
        status: item.status,
        classification: item.classification,
      })),
      methods: candidates.map(({ method, binding }) => ({ method, binding })),
    });
    const active = await this.dependencies.customizationBindings.listActive(context.storeId);
    const customization = await this.dependencies.customization.run(
      customizationInput(
        params,
        candidates.map(({ method }) => method),
      ),
      active.bindings,
      active.bindingSetRevision,
      context.deadlineAt,
    );
    const allIssues = [...issues, ...customization.issues];
    const finalCandidates = customization.methods
      .map((method) => candidates.find((candidate) => candidate.method.handle === method.handle)!)
      .map((candidate, index) => ({
        method: customization.methods[index]!,
        binding: candidate.binding,
      }));
    const selection = resolveSelection(
      params.selection,
      baseSelection,
      candidates,
      finalCandidates,
      customization.hiddenHandles,
      executions,
    );
    const customizationRevision = contentRevision("payment-method-customization", {
      discoveryRevision,
      policyRevision: active.policyRevision,
      bindingSetRevision: active.bindingSetRevision,
      executionRevision: customization.executionRevision,
      methods: customization.methods,
    });
    const revision = contentRevision("payment-methods", {
      discoveryRevision,
      customizationRevision,
      methods: customization.methods,
      selection,
      issues: allIssues,
    });
    const result: Payments.GetCheckoutAvailablePaymentMethodsResult = {
      executionId: context.executionId,
      checkoutId: context.checkoutId,
      basedOnCheckoutVersion: context.expectedCheckoutVersion,
      currencyCode: context.currencyCode,
      revision,
      discoveryRevision,
      customizationRevision,
      basedOnFinalQuoteRevision: params.finalQuote.revision,
      basedOnLoyaltyQuoteRevision: params.loyaltyRedemption?.quoteRevision ?? null,
      basedOnDeliveryRevision: params.delivery.revision,
      methods: customization.methods,
      selection,
      issues: allIssues,
    };
    return (
      await this.dependencies.bindings.stageCheckoutSnapshot({
        storeId: context.storeId,
        checkoutId: context.checkoutId,
        basedOnCheckoutVersion: context.expectedCheckoutVersion,
        targetCheckoutVersion: context.targetCheckoutVersion,
        finalQuoteRevision: params.finalQuote.revision,
        deliveryRevision: params.delivery.revision,
        discoveryRevision,
        customizationRevision,
        paymentRevision: revision,
        result,
        methods: finalCandidates,
        executions: [...providerAudits(executions), ...customization.executions],
        retainUntil: retainUntil(context.deadlineAt),
      })
    ).result;
  }

  private async discover(
    account: Payments.PaymentProviderAccountSnapshot,
    params: Payments.GetCheckoutAvailablePaymentMethodsParams,
  ): Promise<ProviderExecution> {
    let route: Payments.PaymentProviderRouteSnapshot | null = null;
    try {
      const validationRoute = await beforeDeadline(
        this.dependencies.apps.resolveRoute({
          storeId: params.context.storeId,
          installationId: account.installationId,
          operation: "validateConfiguration",
        }),
        params.context.deadlineAt,
      );
      if (
        !validationRoute ||
        validationRoute.appCode !== account.appCode ||
        validationRoute.appVersion !== account.appVersion
      )
        return {
          account,
          route,
          status: "FAILED",
          classification: "ROUTE_UNAVAILABLE",
          result: null,
        };
      const validation = await beforeDeadline(
        this.dependencies.apps.validateConfiguration(validationRoute, {
          protocolVersion: 1,
          correlationId: params.context.correlationId,
          deadlineAt: params.context.deadlineAt,
          mode: account.mode,
        }),
        params.context.deadlineAt,
      );
      if (
        validation.status === "INVALID" ||
        validation.configurationRevision !== account.configurationRevision
      )
        return {
          account,
          route,
          status: "INELIGIBLE",
          classification: "CONFIGURATION_CHANGED",
          result: null,
        };
      route = await beforeDeadline(
        this.dependencies.apps.resolveRoute({
          storeId: params.context.storeId,
          installationId: account.installationId,
          operation: "getMethods",
        }),
        params.context.deadlineAt,
      );
      if (!route || route.appCode !== account.appCode || route.appVersion !== account.appVersion)
        return {
          account,
          route,
          status: "FAILED",
          classification: "ROUTE_UNAVAILABLE",
          result: null,
        };
      const request: Payments.PaymentProviderMethodDiscoveryRequest = {
        protocolVersion: 1,
        executionId: params.context.executionId,
        correlationId: params.context.correlationId,
        deadlineAt: params.context.deadlineAt,
        amount: params.payableAmount,
        localeCode: params.context.localeCode,
        channelCode: params.context.channelCode,
        buyerCountryCode: params.context.buyerEligibility?.countryCode ?? null,
        deliveryCountryCodes: canonical(
          params.delivery.destinations.map((item) => item.location.countryCode),
        ),
        selectedDeliveryCarrierCodes: canonical(
          params.delivery.groups.flatMap((group) =>
            group.selectedOption?.carrierCode ? [group.selectedOption.carrierCode] : [],
          ),
        ),
      };
      const result = await beforeDeadline(
        this.dependencies.apps.getMethods(route, request),
        params.context.deadlineAt,
      );
      return { account, route, status: "SUCCEEDED", classification: null, result };
    } catch (error) {
      const timeout =
        (error instanceof PaymentsCheckoutError &&
          error.code === "PAYMENT_DISCOVERY_DEADLINE_EXCEEDED") ||
        Date.now() >= Date.parse(params.context.deadlineAt);
      return {
        account,
        route,
        status: timeout ? "TIMED_OUT" : "FAILED",
        classification: timeout
          ? "DEADLINE_EXCEEDED"
          : error instanceof Error && error.name === "ZodError"
            ? "INVALID_RESPONSE"
            : route === null
              ? "ROUTE_UNAVAILABLE"
              : "PROVIDER_ERROR",
        result: null,
      };
    }
  }

  private async persistZero(params: Payments.GetCheckoutAvailablePaymentMethodsParams) {
    const { context } = params;
    const discoveryRevision = contentRevision("payment-method-discovery", {
      checkoutId: context.checkoutId,
      basedOnCheckoutVersion: context.expectedCheckoutVersion,
      targetCheckoutVersion: context.targetCheckoutVersion,
      currencyCode: context.currencyCode,
      finalQuoteRevision: params.finalQuote.revision,
      loyaltyQuoteRevision: params.loyaltyRedemption?.quoteRevision ?? null,
      deliveryRevision: params.delivery.revision,
      amount: params.payableAmount,
      providers: [],
      methods: [],
    });
    const customizationRevision = contentRevision("payment-method-customization", {
      discoveryRevision,
      executions: [],
      methods: [],
    });
    const selection: Payments.PaymentsCheckoutMethodSelectionResolution =
      params.selection === null
        ? { status: "NONE" }
        : {
            status: "RESET",
            previousMethodHandle: params.selection.methodHandle,
            customerInput: params.selection.customerInput,
            reason: {
              code: "PAYMENT_NOT_REQUIRED",
              message: "Payment is not required for a zero payable total.",
            },
          };
    const revision = contentRevision("payment-methods", {
      discoveryRevision,
      customizationRevision,
      methods: [],
      selection,
      issues: [],
    });
    const result: Payments.GetCheckoutAvailablePaymentMethodsResult = {
      executionId: context.executionId,
      checkoutId: context.checkoutId,
      basedOnCheckoutVersion: context.expectedCheckoutVersion,
      currencyCode: context.currencyCode,
      revision,
      discoveryRevision,
      customizationRevision,
      basedOnFinalQuoteRevision: params.finalQuote.revision,
      basedOnLoyaltyQuoteRevision: params.loyaltyRedemption?.quoteRevision ?? null,
      basedOnDeliveryRevision: params.delivery.revision,
      methods: [],
      selection,
      issues: [],
    };
    return (
      await this.dependencies.bindings.stageCheckoutSnapshot({
        storeId: context.storeId,
        checkoutId: context.checkoutId,
        basedOnCheckoutVersion: context.expectedCheckoutVersion,
        targetCheckoutVersion: context.targetCheckoutVersion,
        finalQuoteRevision: params.finalQuote.revision,
        deliveryRevision: params.delivery.revision,
        discoveryRevision,
        customizationRevision,
        paymentRevision: revision,
        result,
        methods: [],
        executions: [],
        retainUntil: retainUntil(context.deadlineAt),
      })
    ).result;
  }
}

function eligible(
  account: Payments.PaymentProviderAccountSnapshot,
  params: Payments.GetCheckoutAvailablePaymentMethodsParams,
): boolean {
  const countries = new Set(
    [
      params.context.buyerEligibility?.countryCode,
      ...params.delivery.destinations.map((item) => item.location.countryCode),
    ].filter((value): value is string => value !== null),
  );
  return (
    account.status === "ACTIVE" &&
    account.supportedCurrencyCodes.includes(params.context.currencyCode) &&
    (account.supportedCountryCodes.length === 0 ||
      [...countries].every((country) => account.supportedCountryCodes.includes(country))) &&
    account.supportedOperations.includes("getMethods") &&
    account.supportedOperations.includes("createPayment") &&
    (account.captureMode !== "MANUAL" || account.supportedOperations.includes("capture"))
  );
}

function normalize(executions: readonly ProviderExecution[], checkoutId: string) {
  return executions
    .flatMap((execution) =>
      execution.status !== "SUCCEEDED" || !execution.result || !execution.route
        ? []
        : execution.result.methods
            .filter(
              (definition) =>
                (execution.account.enabledMethodKeys.length === 0 ||
                  execution.account.enabledMethodKeys.includes(definition.methodKey)) &&
                definition.supportedCaptureModes.includes(execution.account.captureMode) &&
                definition.supportedSessionKinds.some((kind) =>
                  execution.account.supportedSessionKinds.includes(kind),
                ),
            )
            .map((definition) => {
              const semantic = {
                storeId: execution.account.storeId,
                checkoutId,
                providerAccountId: execution.account.providerAccountId,
                providerMethodKey: definition.methodKey,
                configurationRevision: execution.account.configurationRevision,
                discoveryRouteRevision: execution.route!.routeRevision,
                providerDiscoveryRevision: execution.result!.revision,
              };
              const handle = paymentMethodHandle(semantic);
              const metadata =
                definition.metadata === null ? null : projectMetadata(definition.metadata);
              return {
                method: {
                  handle,
                  code: definition.code,
                  title: definition.title,
                  provider: execution.account.providerCode,
                  flow: definition.flow,
                  metadata,
                } satisfies Payments.PaymentsCheckoutMethod,
                binding: {
                  methodHandle: handle,
                  providerAccountId: execution.account.providerAccountId,
                  providerCode: execution.account.providerCode,
                  providerMethodKey: definition.methodKey,
                  discoveryRoute: execution.route!,
                  configurationRevision: execution.account.configurationRevision,
                  providerDiscoveryRevision: execution.result!.revision,
                } satisfies Payments.PaymentMethodBindingSnapshot,
              };
            }),
    )
    .sort(
      (a, b) =>
        a.binding.providerAccountId.localeCompare(b.binding.providerAccountId) ||
        a.binding.providerMethodKey.localeCompare(b.binding.providerMethodKey),
    );
}

function customizationInput(
  params: Payments.GetCheckoutAvailablePaymentMethodsParams,
  methods: readonly Payments.PaymentsCheckoutMethod[],
): Payments.PaymentMethodCustomizationFunctionInput {
  const buyer = params.context.buyerEligibility;
  return {
    schemaVersion: 1,
    executionId: params.context.executionId,
    storeId: params.context.storeId,
    checkoutId: params.context.checkoutId,
    basedOnCheckoutVersion: params.context.expectedCheckoutVersion,
    targetCheckoutVersion: params.context.targetCheckoutVersion,
    currencyCode: params.context.currencyCode,
    localeCode: params.context.localeCode,
    channelCode: params.context.channelCode,
    effectiveAt: params.context.effectiveAt,
    buyer:
      buyer === null
        ? null
        : {
            customerId: buyer.customerId,
            countryCode: buyer.countryCode,
            marketId: buyer.marketId,
            companyId: buyer.companyId,
            segmentIds: buyer.segmentIds,
          },
    delivery: {
      countryCodes: canonical(
        params.delivery.destinations.map((item) => item.location.countryCode),
      ),
      selectedCarrierCodes: canonical(
        params.delivery.groups.flatMap((group) =>
          group.selectedOption?.carrierCode ? [group.selectedOption.carrierCode] : [],
        ),
      ),
    },
    amount: params.payableAmount,
    methods,
  };
}
function resolveSelection(
  intent: Payments.PaymentsCheckoutMethodSelectionIntent | null,
  base: Payments.PaymentMethodBindingSnapshot | null,
  before: readonly {
    method: Payments.PaymentsCheckoutMethod;
    binding: Payments.PaymentMethodBindingSnapshot;
  }[],
  after: readonly {
    method: Payments.PaymentsCheckoutMethod;
    binding: Payments.PaymentMethodBindingSnapshot;
  }[],
  hidden: readonly string[],
  executions: readonly ProviderExecution[],
): Payments.PaymentsCheckoutMethodSelectionResolution {
  if (!intent) return { status: "NONE" };
  const candidate = after.find((item) => item.method.handle === intent.methodHandle);
  if (base && candidate && sameBinding(base, candidate.binding))
    return {
      status: "SELECTED",
      methodHandle: intent.methodHandle,
      customerInput: intent.customerInput,
    };
  let code = hidden.includes(intent.methodHandle)
    ? "PAYMENT_METHOD_HIDDEN"
    : "PAYMENT_METHOD_UNAVAILABLE";
  if (!base) code = "PAYMENT_METHOD_SNAPSHOT_EXPIRED";
  else if (!hidden.includes(intent.methodHandle)) {
    const rediscovered = before.find(
      (item) =>
        item.binding.providerAccountId === base.providerAccountId &&
        item.binding.providerMethodKey === base.providerMethodKey,
    );
    if (
      (rediscovered && !sameBinding(base, rediscovered.binding)) ||
      executions.some(
        (execution) =>
          execution.account.providerAccountId === base.providerAccountId &&
          execution.classification === "CONFIGURATION_CHANGED",
      )
    )
      code = "PAYMENT_PROVIDER_CONFIGURATION_CHANGED";
  }
  return {
    status: "RESET",
    previousMethodHandle: intent.methodHandle,
    customerInput: intent.customerInput,
    reason: { code, message: "The selected payment method is no longer available." },
  };
}
function sameBinding(
  a: Payments.PaymentMethodBindingSnapshot,
  b: Payments.PaymentMethodBindingSnapshot,
) {
  return (
    a.providerAccountId === b.providerAccountId &&
    a.providerMethodKey === b.providerMethodKey &&
    a.configurationRevision === b.configurationRevision &&
    a.discoveryRoute.routeRevision === b.discoveryRoute.routeRevision &&
    a.providerDiscoveryRevision === b.providerDiscoveryRevision
  );
}
function canonical(values: readonly string[]) {
  return [...new Set(values)].sort();
}
function projectMetadata(
  value: Payments.PaymentsCheckoutMethod["metadata"],
): Payments.PaymentsCheckoutMethod["metadata"] {
  if (value === null) return null;
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, child]) =>
        !/(secret|token|password|credential|private|cvv|pan)/i.test(key) && safePublicJson(child),
    ),
  ) as Payments.PaymentsCheckoutMethod["metadata"];
}
function safePublicJson(value: unknown): boolean {
  if (value === null || typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string") return value.length <= 2_048 && !/<\/?[a-z!][^>]*>/i.test(value);
  if (Array.isArray(value)) return value.every(safePublicJson);
  if (typeof value === "object")
    return Object.entries(value as Record<string, unknown>).every(
      ([key, child]) =>
        !/(secret|token|password|credential|private|cvv|pan)/i.test(key) && safePublicJson(child),
    );
  return false;
}
function retainUntil(deadlineAt: string) {
  return new Date(Math.max(Date.parse(deadlineAt), Date.now()) + 30 * 60_000).toISOString();
}
function providerAudits(executions: readonly ProviderExecution[]) {
  return executions.map((item) => ({
    kind: "PROVIDER" as const,
    ownerId: item.account.providerAccountId,
    status: item.status,
    classification: item.classification,
    revision: item.result?.revision ?? null,
    audit: {
      capabilityRouteId: item.route?.capabilityRouteId ?? null,
      appCode: item.route?.appCode ?? item.account.appCode,
      appVersion: item.route?.appVersion ?? item.account.appVersion,
      configurationRevision: item.account.configurationRevision,
      routeRevision: item.route?.routeRevision ?? null,
    },
  }));
}
async function beforeDeadline<T>(promise: Promise<T>, deadlineAt: string): Promise<T> {
  const remaining = Date.parse(deadlineAt) - Date.now();
  if (remaining <= 0)
    throw new PaymentsCheckoutError(
      "PAYMENT_DISCOVERY_DEADLINE_EXCEEDED",
      "Payment discovery deadline exceeded.",
      true,
    );
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new PaymentsCheckoutError(
            "PAYMENT_DISCOVERY_DEADLINE_EXCEEDED",
            "Payment discovery deadline exceeded.",
            true,
          ),
        ),
      remaining,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  map: (item: T) => Promise<R>,
): Promise<R[]> {
  const result = Array.from({ length: items.length }, () => undefined as R);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        result[index] = await map(items[index]!);
      }
    }),
  );
  return result;
}
