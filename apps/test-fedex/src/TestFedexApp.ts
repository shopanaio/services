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

const SUPPORTED_COUNTRIES = ["AU", "CA", "DE", "FR", "GB", "JP", "PL", "UA", "US"] as const;
const SUPPORTED_CURRENCIES = ["AUD", "CAD", "EUR", "GBP", "JPY", "PLN", "UAH", "USD"] as const;
const CUSTOMER_INPUT_CONTRACT = {
  schemaDialect: "https://json-schema.org/draft/2020-12/schema",
  schema: {
    type: "object",
    properties: {
      pickupPointId: { type: "string", minLength: 1, maxLength: 128 },
      deliveryInstructions: { type: "string", minLength: 1, maxLength: 500 },
    },
    additionalProperties: false,
  },
} as const satisfies Delivery.DeliveryProviderCustomerInputContract;

interface ShipmentRecord {
  storeId: string;
  shipmentId: string;
  providerAccountId: string;
  providerShipmentReference: string;
  state: Delivery.DeliveryProviderObservedShipmentState;
  parcels: Delivery.DeliveryProviderParcelObservation[];
  events: Delivery.DeliveryProviderTrackingEvent[];
  progression: Delivery.DeliveryProviderObservedShipmentState[];
  updatedAt: string;
  destination: Delivery.DeliveryProviderLocationAddress;
}

interface CachedResult {
  requestHash: string;
  result: unknown;
}

export class TestFedexApp implements ShopanaApp {
  private readonly shipments = new Map<string, ShipmentRecord>();
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
    this.host.broker.register("validateCarrierServiceConfiguration", (input) =>
      this.validateCarrierConfiguration(input),
    );
    this.host.broker.register("quoteRates", (input) => this.quoteRates(input));
    this.host.broker.register("resolveCustomerInput", (input) => this.resolveCustomerInput(input));
    this.host.broker.register("validateShipmentConfiguration", (input) =>
      this.validateShipmentConfiguration(input),
    );
    this.host.broker.register("createShipment", (input) => this.createShipment(input));
    this.host.broker.register("cancelShipment", (input) => this.cancelShipment(input));
    this.host.broker.register("getShipment", (input) => this.getShipment(input));
    this.host.broker.register("reconcileShipment", (input) => this.reconcileShipment(input));
  }

  start(): void {}

  stop(): void {
    this.shipments.clear();
    this.idempotentResults.clear();
    this.host.logger.log("FedEx Test App stopped");
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
  }

  private validateCarrierConfiguration(
    input: unknown,
  ): Delivery.DeliveryProviderConfigurationValidationResult<"delivery.carrier-service"> {
    const request =
      requireInput<
        Delivery.DeliveryProviderConfigurationValidationRequest<"delivery.carrier-service">
      >(input);
    if (request.protocolVersion !== 2 || request.capability !== "delivery.carrier-service")
      throw new Error("Unsupported delivery provider protocol");
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
      configurationRevision: "test-fedex-carrier-v2",
      failure: null,
    };
  }

  private quoteRates(input: unknown): Delivery.DeliveryCarrierServiceRateResult {
    const request = requireInput<Delivery.DeliveryCarrierServiceRateRequest>(input);
    const unsupportedCurrency = !SUPPORTED_CURRENCIES.includes(
      request.currencyCode as (typeof SUPPORTED_CURRENCIES)[number],
    );
    const unsupportedRoute = [
      request.origin.address.countryCode,
      request.destination.address.countryCode,
    ].some(
      (countryCode) =>
        !SUPPORTED_COUNTRIES.includes(countryCode as (typeof SUPPORTED_COUNTRIES)[number]),
    );
    if (unsupportedCurrency || unsupportedRoute) {
      const reason = unsupportedCurrency
        ? `Currency ${request.currencyCode} is not supported.`
        : "The requested route is not supported.";
      return {
        quoteRequestId: request.quoteRequestId,
        revision: digest("test-fedex-no-service-v2", [request.ratedFactsHash, reason]),
        rates: [],
        warnings: [{ code: "TEST_FEDEX_NO_SERVICE", message: reason }],
      };
    }

    const international =
      request.origin.address.countryCode !== request.destination.address.countryCode;
    const weightUnits = request.packages.reduce(
      (total, item) => total + Math.max(1, Math.ceil(item.weightGrams / 500)),
      0,
    );
    const effectiveAt = requireTimestamp(request.effectiveAt);
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
      revision: digest("test-fedex-rates-v2", {
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
    if (request.value === null) return validCustomerInput(null);
    const pickupPointId = optionalTrimmedString(request.value.pickupPointId);
    const deliveryInstructions = optionalTrimmedString(request.value.deliveryInstructions);
    const issues: { path: string; code: string; message: string }[] = [];
    if (
      request.value.pickupPointId !== undefined &&
      (!pickupPointId || pickupPointId.length > 128)
    ) {
      issues.push({
        path: "pickupPointId",
        code: "INVALID_PICKUP_POINT",
        message: "pickupPointId must contain 1 to 128 characters.",
      });
    }
    if (
      request.value.deliveryInstructions !== undefined &&
      (!deliveryInstructions || deliveryInstructions.length > 500)
    ) {
      issues.push({
        path: "deliveryInstructions",
        code: "INVALID_DELIVERY_INSTRUCTIONS",
        message: "deliveryInstructions must contain 1 to 500 characters.",
      });
    }
    const unknownKeys = Object.keys(request.value).filter(
      (key) => key !== "pickupPointId" && key !== "deliveryInstructions",
    );
    for (const key of unknownKeys)
      issues.push({
        path: key,
        code: "UNKNOWN_FIELD",
        message: `Unknown FedEx Test customer input field ${key}.`,
      });
    if (issues.length > 0) return { status: "INVALID", issues };
    return validCustomerInput({
      ...(pickupPointId ? { pickupPointId } : {}),
      ...(deliveryInstructions ? { deliveryInstructions } : {}),
    });
  }

  private validateShipmentConfiguration(
    input: unknown,
  ): Delivery.DeliveryProviderConfigurationValidationResult<"delivery.shipment-provider"> {
    const request =
      requireInput<
        Delivery.DeliveryProviderConfigurationValidationRequest<"delivery.shipment-provider">
      >(input);
    if (request.protocolVersion !== 2 || request.capability !== "delivery.shipment-provider")
      throw new Error("Unsupported delivery shipment protocol");
    return {
      status: "READY",
      capability: "delivery.shipment-provider",
      providerCode: "test-fedex",
      displayName: "FedEx Test",
      supportedCountryCodes: SUPPORTED_COUNTRIES,
      supportedCurrencyCodes: SUPPORTED_CURRENCIES,
      supportedOperations: [
        "validateShipmentConfiguration",
        "createShipment",
        "cancelShipment",
        "getShipment",
        "reconcileShipment",
      ],
      capabilities: {
        supportsLabels: false,
        labelAssetHosts: [],
        maxLabelBytes: 4 * 1024 * 1024,
        supportsMultipleParcels: true,
        supportsCancellation: true,
        supportsTracking: true,
        supportsReconciliation: true,
        supportsAsyncCompletion: false,
      },
      configurationRevision: "test-fedex-shipments-v2",
      failure: null,
    };
  }

  private createShipment(
    input: unknown,
  ): Delivery.DeliveryProviderShipmentOperationResult<"CREATE"> {
    const request = requireInput<Delivery.DeliveryProviderCreateShipmentRequest>(input);
    return this.idempotent(request, () => {
      const providerShipmentReference = digest("test-fedex-shipment-v2", [
        request.storeId,
        request.providerAccountId,
        request.shipmentId,
      ]);
      const existing = this.shipments.get(providerShipmentReference);
      if (existing) return createResult(existing);

      const processedAt = now();
      const estimatedDeliveryAt = addDays(
        processedAt,
        serviceDays(request.selectedRate.serviceCode),
      );
      const parcels = request.packages.map<Delivery.DeliveryProviderParcelObservation>((item) => {
        const providerParcelReference = digest("test-fedex-parcel-v2", [
          providerShipmentReference,
          item.packageId,
        ]);
        return {
          providerParcelReference,
          packageIds: [item.packageId],
          state: "ACCEPTED",
          tracking: [
            {
              company: "FedEx Test",
              number: providerParcelReference.slice(0, 20).toUpperCase(),
              url: `https://tracking.test/fedex/${providerParcelReference}`,
            },
          ],
          labels: [],
          estimatedDeliveryAt,
          deliveredAt: null,
        };
      });
      const record: ShipmentRecord = {
        storeId: request.storeId,
        shipmentId: request.shipmentId,
        providerAccountId: request.providerAccountId,
        providerShipmentReference,
        state: "ACCEPTED",
        parcels,
        events: [],
        progression: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
        updatedAt: processedAt,
        destination: request.destination.address,
      };
      record.events.push(
        trackingEvent(record, request.operationId, "ACCEPTED", request.origin.address),
      );
      this.shipments.set(providerShipmentReference, record);
      return createResult(record);
    });
  }

  private cancelShipment(
    input: unknown,
  ): Delivery.DeliveryProviderShipmentOperationResult<"CANCEL"> {
    const request = requireInput<Delivery.DeliveryProviderCancelShipmentRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireShipment(request);
      if (record.state === "DELIVERED" || record.state === "RETURNED") {
        return {
          operation: "CANCEL",
          status: "FAILED",
          providerShipmentReference: record.providerShipmentReference,
          failure: {
            category: "CONFLICT",
            code: "shipment_not_cancellable",
            message: `A ${record.state.toLowerCase()} shipment cannot be cancelled.`,
            retryable: false,
            acceptedByProvider: false,
            providerCode: "shipment_not_cancellable",
          },
          failedAt: now(),
          metadata: { simulator: true },
        };
      }
      if (record.state !== "CANCELLED") {
        record.state = "CANCELLED";
        record.progression = [];
        record.updatedAt = now();
        record.parcels = record.parcels.map((parcel) => ({
          ...parcel,
          state: "CANCELLED",
        }));
        record.events.push(
          trackingEvent(record, request.operationId, "CANCELLED", null, request.reason),
        );
      }
      return cancelResult(record);
    });
  }

  private getShipment(input: unknown): Delivery.DeliveryProviderReconcileShipmentResult {
    const request = requireInput<Delivery.DeliveryProviderGetShipmentRequest>(input);
    return reconcileResult(this.requireShipment(request));
  }

  private reconcileShipment(input: unknown): Delivery.DeliveryProviderReconcileShipmentResult {
    const request = requireInput<Delivery.DeliveryProviderReconcileShipmentRequest>(input);
    return this.idempotent(request, () => {
      const record = this.requireShipment(request);
      const nextState = record.progression.shift();
      if (nextState) {
        record.state = nextState;
        record.updatedAt = now();
        record.parcels = record.parcels.map((parcel) => ({
          ...parcel,
          state: nextState,
          deliveredAt: nextState === "DELIVERED" ? record.updatedAt : parcel.deliveredAt,
        }));
        record.events.push(
          trackingEvent(record, request.operationId, nextState, record.destination),
        );
      }
      return reconcileResult(record);
    });
  }

  private idempotent<TResult>(
    request:
      | Delivery.DeliveryProviderCreateShipmentRequest
      | Delivery.DeliveryProviderCancelShipmentRequest
      | Delivery.DeliveryProviderReconcileShipmentRequest,
    execute: () => TResult,
  ): TResult {
    const key = `${request.providerAccountId}:${request.operation}:${request.idempotencyKey}`;
    const existing = this.idempotentResults.get(key);
    if (existing) {
      if (existing.requestHash !== request.idempotencyRequestHash)
        throw new Error(`Test FedEx idempotency conflict for ${request.operation}`);
      return existing.result as TResult;
    }
    const result = execute();
    this.idempotentResults.set(key, {
      requestHash: request.idempotencyRequestHash,
      result,
    });
    return result;
  }

  private requireShipment(request: {
    storeId: string;
    shipmentId: string;
    providerAccountId: string;
    providerShipmentReference: string;
  }): ShipmentRecord {
    const record = this.shipments.get(request.providerShipmentReference);
    if (
      !record ||
      record.storeId !== request.storeId ||
      record.shipmentId !== request.shipmentId ||
      record.providerAccountId !== request.providerAccountId
    ) {
      throw new Error(`Unknown test shipment ${request.providerShipmentReference}`);
    }
    return record;
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
    estimatedMinDeliveryAt: addDays(effectiveAt.toISOString(), input.minDays),
    estimatedMaxDeliveryAt: addDays(effectiveAt.toISOString(), input.maxDays),
    phoneRequired: true,
    customerInputContract: CUSTOMER_INPUT_CONTRACT,
    publicData: {
      carrier: "test-fedex",
      serviceLevel: input.serviceCode,
      trackingIncluded: true,
    },
  };
}

function validCustomerInput(
  value: Record<string, string> | null,
): Delivery.DeliveryProviderResolveCustomerInputResult {
  return {
    status: "VALID",
    normalized: value,
    valueHash: digest("test-fedex-customer-input-v2", value),
    semanticRevision: "test-fedex-customer-input-v2",
    publicData: value?.pickupPointId ? { pickupPointId: value.pickupPointId } : {},
  };
}

function createResult(
  record: ShipmentRecord,
): Delivery.DeliveryProviderShipmentOperationResult<"CREATE"> {
  return {
    operation: "CREATE",
    status: "SUCCEEDED",
    providerShipmentReference: record.providerShipmentReference,
    shipmentState: record.state,
    parcels: snapshotParcels(record),
    events: snapshotEvents(record),
    processedAt: record.updatedAt,
    metadata: { simulator: true },
  };
}

function cancelResult(
  record: ShipmentRecord,
): Delivery.DeliveryProviderShipmentOperationResult<"CANCEL"> {
  return {
    operation: "CANCEL",
    status: "SUCCEEDED",
    providerShipmentReference: record.providerShipmentReference,
    shipmentState: "CANCELLED",
    parcels: snapshotParcels(record),
    events: snapshotEvents(record),
    processedAt: record.updatedAt,
    metadata: { simulator: true },
  };
}

function reconcileResult(record: ShipmentRecord): Delivery.DeliveryProviderReconcileShipmentResult {
  return {
    status: "RECONCILED",
    providerShipmentReference: record.providerShipmentReference,
    shipmentState: record.state,
    parcels: snapshotParcels(record),
    events: snapshotEvents(record),
    observedAt: record.updatedAt,
    metadata: { simulator: true },
  };
}

function snapshotParcels(
  record: ShipmentRecord,
): readonly [
  Delivery.DeliveryProviderParcelObservation,
  ...Delivery.DeliveryProviderParcelObservation[],
] {
  const parcels = record.parcels.map((parcel) => ({
    ...parcel,
    packageIds: [...parcel.packageIds] as [string, ...string[]],
    tracking: parcel.tracking.map((tracking) => ({ ...tracking })),
    labels: parcel.labels.map((label) => ({ ...label })),
  }));
  const [first, ...rest] = parcels;
  if (!first) throw new Error("Shipment record must contain at least one parcel");
  return [first, ...rest];
}

function snapshotEvents(record: ShipmentRecord): Delivery.DeliveryProviderTrackingEvent[] {
  return record.events.map((event) => ({
    ...event,
    location: event.location ? { ...event.location } : null,
  }));
}

function trackingEvent(
  record: ShipmentRecord,
  operationId: string,
  state: Delivery.DeliveryProviderObservedShipmentState,
  location: Delivery.DeliveryProviderLocationAddress | null,
  message?: string | null,
): Delivery.DeliveryProviderTrackingEvent {
  const sequence = String(record.events.length + 1);
  return {
    providerEventId: digest("test-fedex-event-v2", [
      record.providerShipmentReference,
      operationId,
      sequence,
      state,
    ]),
    providerShipmentSequence: sequence,
    providerParcelReference: null,
    statusCode: state.toLowerCase(),
    state,
    message: message ?? shipmentMessage(state),
    location,
    occurredAt: record.updatedAt,
  };
}

function shipmentMessage(state: Delivery.DeliveryProviderObservedShipmentState): string {
  return (
    {
      ACCEPTED: "Shipment accepted by FedEx Test",
      IN_TRANSIT: "Shipment is in transit",
      OUT_FOR_DELIVERY: "Shipment is out for delivery",
      DELIVERED: "Shipment delivered",
      CANCELLED: "Shipment cancelled",
      PENDING: "Shipment pending",
      DELIVERY_FAILED: "Delivery failed",
      RETURNING: "Shipment returning",
      RETURNED: "Shipment returned",
    } as const
  )[state];
}

function serviceDays(serviceCode: string): number {
  if (serviceCode === "international-priority") return 2;
  if (serviceCode === "international-economy") return 6;
  return 4;
}

function optionalTrimmedString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function requireTimestamp(value: string): Date {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error("Invalid provider effectiveAt timestamp");
  return parsed;
}

function now(): string {
  return new Date().toISOString();
}

function addDays(value: string, days: number): string {
  return new Date(new Date(value).getTime() + days * 86_400_000).toISOString();
}

function digest(namespace: string, value: unknown): string {
  return createHash("sha256").update(namespace).update(JSON.stringify(value)).digest("hex");
}

function requireInput<T>(input: unknown): T {
  if (!input || typeof input !== "object") throw new Error("Provider input is required");
  return input as T;
}
