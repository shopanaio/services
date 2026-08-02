import { createHash } from "node:crypto";
import type {
  AppHostContext,
  AppInstallInput,
  AppRuntimeHealth,
  AppUninstallInput,
  AppUpdateInput,
  ShopanaApp,
} from "@shopana/app-sdk";
import type { Delivery } from "@shopana/broker-types";

const SUPPORTED_COUNTRIES = [
  "AU",
  "CA",
  "DE",
  "FR",
  "GB",
  "JP",
  "PL",
  "UA",
  "US",
] as const;

const SUPPORTED_CURRENCIES = ["AUD", "CAD", "EUR", "GBP", "JPY", "PLN", "UAH", "USD"] as const;

export class TestFedexApp implements ShopanaApp {
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
    this.host.broker.register("validateCarrierServiceConfiguration", (input) =>
      this.validateConfiguration(input),
    );
    this.host.broker.register("quoteRates", (input) => this.quoteRates(input));
    this.host.broker.register("resolveCustomerInput", (input) =>
      this.resolveCustomerInput(input),
    );
  }

  start(): void {}

  stop(): void {
    this.host.logger.log("FedEx Test App stopped");
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
  }

  private validateConfiguration(
    input: unknown,
  ): Delivery.DeliveryProviderConfigurationValidationResult<"delivery.carrier-service"> {
    const request = requireInput<
      Delivery.DeliveryProviderConfigurationValidationRequest<"delivery.carrier-service">
    >(input);
    if (
      request.protocolVersion !== 2 ||
      request.capability !== "delivery.carrier-service"
    ) {
      throw new Error("Unsupported delivery provider protocol");
    }
    return {
      status: "READY",
      capability: "delivery.carrier-service",
      providerCode: "test-fedex",
      displayName: "FedEx Test",
      supportedCountryCodes: SUPPORTED_COUNTRIES,
      supportedCurrencyCodes: SUPPORTED_CURRENCIES,
      supportedOperations: [
        "validateCarrierServiceConfiguration",
        "quoteRates",
        "resolveCustomerInput",
      ],
      capabilities: { supportsServiceDiscovery: true },
      configurationRevision: "test-fedex-config-v1",
      failure: null,
    };
  }

  private quoteRates(input: unknown): Delivery.DeliveryCarrierServiceRateResult {
    const request = requireInput<Delivery.DeliveryCarrierServiceRateRequest>(input);
    const international =
      request.origin.address.countryCode !== request.destination.address.countryCode;
    const weightUnits = request.packages.reduce(
      (total, item) => total + Math.max(1, Math.ceil(item.weightGrams / 500)),
      0,
    );
    const effectiveAt = new Date(request.effectiveAt);
    const rates: Delivery.DeliveryCarrierServiceRate[] = [];

    if (!international) {
      rates.push(
        rate(request, effectiveAt, {
          serviceCode: "ground",
          serviceName: "FedEx Test Ground",
          description: "Economical domestic delivery for deterministic E2E scenarios.",
          amountMinor: 700 + weightUnits * 125,
          minDays: 3,
          maxDays: 5,
        }),
      );
    }

    rates.push(
      rate(request, effectiveAt, {
        serviceCode: "international-priority",
        serviceName: "FedEx Test International Priority",
        description: "Priority air delivery inspired by international express services.",
        amountMinor: (international ? 2_500 : 1_500) + weightUnits * 275,
        minDays: international ? 2 : 1,
        maxDays: international ? 3 : 2,
      }),
      rate(request, effectiveAt, {
        serviceCode: "international-economy",
        serviceName: "FedEx Test International Economy",
        description: "Lower-cost tracked delivery for less urgent international orders.",
        amountMinor: (international ? 1_300 : 900) + weightUnits * 175,
        minDays: international ? 5 : 3,
        maxDays: international ? 8 : 5,
      }),
    );

    return {
      quoteRequestId: request.quoteRequestId,
      revision: digest("test-fedex-rates-v1", {
        quoteRequestId: request.quoteRequestId,
        ratedFactsHash: request.ratedFactsHash,
        rates,
      }),
      rates,
      warnings: [],
    };
  }

  private resolveCustomerInput(
    input: unknown,
  ): Delivery.DeliveryProviderResolveCustomerInputResult {
    const request = requireInput<Delivery.DeliveryProviderResolveCustomerInputRequest>(input);
    return {
      status: "VALID",
      normalized: request.value,
      valueHash: digest("test-fedex-customer-input-v1", request.value),
      semanticRevision: "test-fedex-customer-input-v1",
      publicData: request.value ?? {},
    };
  }
}

function rate(
  request: Delivery.DeliveryCarrierServiceRateRequest,
  effectiveAt: Date,
  input: Readonly<{
    serviceCode: string;
    serviceName: string;
    description: string;
    amountMinor: number;
    minDays: number;
    maxDays: number;
  }>,
): Delivery.DeliveryCarrierServiceRate {
  return {
    serviceCode: input.serviceCode,
    serviceName: input.serviceName,
    description: input.description,
    cost: {
      amountMinor: String(input.amountMinor),
      currencyCode: request.currencyCode,
    },
    estimatedMinDeliveryAt: addDays(effectiveAt, input.minDays),
    estimatedMaxDeliveryAt: addDays(effectiveAt, input.maxDays),
    phoneRequired: true,
    customerInputContract: null,
    publicData: {
      carrier: "test-fedex",
      serviceLevel: input.serviceCode,
      trackingIncluded: true,
    },
  };
}

function addDays(value: Date, days: number): string {
  return new Date(value.getTime() + days * 86_400_000).toISOString();
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
