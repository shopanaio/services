import { DELIVERY_PROVIDER_PROTOCOL_VERSION, type Apps, type Delivery } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { DeliveryProviderAppsPort } from "../../contracts/ports.js";
import { parseDeliveryCarrierServiceRateExchange, parseDeliveryProviderConfigurationValidationResult, parseDeliveryProviderResolveCustomerInputResult, parseDeliveryProviderSearchCustomerInputOptionsResult } from "../../contracts/schemas.js";

export class BrokerDeliveryProviderAppsAdapter implements DeliveryProviderAppsPort {
  private readonly storeByRouteId = new Map<string, string>();
  constructor(private readonly broker: ServiceBroker) {}

  async listRoutes(params: Apps.ListDeliveryProviderRoutesParams): Promise<readonly Delivery.DeliveryProviderRouteSnapshot[]> {
    const result = await this.broker.call<Apps.ListCapabilityRoutesResult>("apps.listCapabilityRoutes", params);
    return result.routes.map((route) => {
      this.storeByRouteId.set(route.capabilityRouteId, params.storeId);
      return ({
      protocolVersion: DELIVERY_PROVIDER_PROTOCOL_VERSION,
      capability: params.capability,
      operation: params.operation,
      capabilityRouteId: route.capabilityRouteId,
      installationId: route.installationId,
      appCode: route.appCode,
      appVersion: route.appVersion,
      routeRevision: route.routeRevision,
      } as Delivery.DeliveryProviderRouteSnapshot);
    });
  }

  async resolveRoute<T extends Apps.ListDeliveryProviderRoutesParams>(input: T & { installationId: string }): Promise<(Delivery.DeliveryProviderRouteSnapshot & Pick<T, "capability" | "operation">) | null> {
    const routes = await this.listRoutes(input);
    return (routes.find((route) => route.installationId === input.installationId) as (Delivery.DeliveryProviderRouteSnapshot & Pick<T, "capability" | "operation">) | undefined) ?? null;
  }

  async resolvePinnedRoute(input: { storeId: string; pinned: Delivery.DeliveryProviderRouteSnapshot; allowCompatibleAppUpgrade: boolean }) {
    const current = await this.resolveRoute({ storeId: input.storeId, capability: input.pinned.capability, operation: input.pinned.operation, installationId: input.pinned.installationId } as Apps.ListDeliveryProviderRoutesParams & { installationId: string });
    if (!current) return { status: "UNAVAILABLE" as const, code: "ROUTE_REMOVED" as const };
    if (current.routeRevision === input.pinned.routeRevision) return { status: "EXACT" as const, route: current };
    if (input.allowCompatibleAppUpgrade && current.protocolVersion === input.pinned.protocolVersion) return { status: "COMPATIBLE_UPGRADE" as const, route: current, previous: input.pinned };
    return { status: "UNAVAILABLE" as const, code: "PROTOCOL_INCOMPATIBLE" as const };
  }

  async validateCarrierServiceConfiguration(route: any, request: Delivery.DeliveryProviderConfigurationValidationRequest<"delivery.carrier-service">): Promise<Delivery.DeliveryProviderConfigurationValidationResult<"delivery.carrier-service">> { return parseDeliveryProviderConfigurationValidationResult(request, await this.execute(route, request)) as Delivery.DeliveryProviderConfigurationValidationResult<"delivery.carrier-service">; }
  async validateShipmentConfiguration(route: any, request: Delivery.DeliveryProviderConfigurationValidationRequest<"delivery.shipment-provider">): Promise<Delivery.DeliveryProviderConfigurationValidationResult<"delivery.shipment-provider">> { return parseDeliveryProviderConfigurationValidationResult(request, await this.execute(route, request)) as Delivery.DeliveryProviderConfigurationValidationResult<"delivery.shipment-provider">; }
  async quoteRates(route: any, request: Delivery.DeliveryCarrierServiceRateRequest): Promise<Delivery.DeliveryCarrierServiceRateResult> { return parseDeliveryCarrierServiceRateExchange(request, await this.execute(route, request)); }
  async resolveCustomerInput(route: any, request: Delivery.DeliveryProviderResolveCustomerInputRequest): Promise<Delivery.DeliveryProviderResolveCustomerInputResult> { return parseDeliveryProviderResolveCustomerInputResult(await this.execute(route, request)); }
  async searchCustomerInputOptions(route: any, request: Delivery.DeliveryProviderSearchCustomerInputOptionsRequest): Promise<Delivery.DeliveryProviderSearchCustomerInputOptionsResult> { return parseDeliveryProviderSearchCustomerInputOptionsResult(await this.execute(route, request)); }
  createShipment(route: any, request: Delivery.DeliveryProviderCreateShipmentRequest): Promise<Delivery.DeliveryProviderShipmentOperationResult<"CREATE">> { return this.execute(route, request); }
  cancelShipment(route: any, request: Delivery.DeliveryProviderCancelShipmentRequest): Promise<Delivery.DeliveryProviderShipmentOperationResult<"CANCEL">> { return this.execute(route, request); }
  getShipment(route: any, request: Delivery.DeliveryProviderGetShipmentRequest): Promise<Delivery.DeliveryProviderReconcileShipmentResult> { return this.execute(route, request); }
  reconcileShipment(route: any, request: Delivery.DeliveryProviderReconcileShipmentRequest): Promise<Delivery.DeliveryProviderReconcileShipmentResult> { return this.execute(route, request); }

  private async execute<T>(route: Delivery.DeliveryProviderRouteSnapshot, input: unknown): Promise<T> {
    const result = await this.broker.call<Apps.ExecuteCapabilityResult<T>>("apps.executeCapability", {
      storeId: (input as { storeId?: string }).storeId ?? this.storeByRouteId.get(route.capabilityRouteId),
      capability: route.capability,
      operation: route.operation,
      installationId: route.installationId,
      input,
      correlationId: (input as { correlationId?: string }).correlationId,
      executionId: (input as { executionId?: string }).executionId,
      deadlineAt: (input as { deadlineAt?: string }).deadlineAt,
    });
    if (result.installationId !== route.installationId || result.capabilityRouteId !== route.capabilityRouteId || result.routeRevision !== route.routeRevision || result.appCode !== route.appCode || result.appVersion !== route.appVersion) {
      throw new Error("Apps returned a delivery provider route identity mismatch");
    }
    return result.data;
  }
}
