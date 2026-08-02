import type { Apps, Payments } from "@shopana/broker-types";
import { PAYMENTS_PROVIDER_CAPABILITY, PAYMENTS_PROVIDER_PROTOCOL_VERSION } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { PaymentsProviderAppsPort } from "../../contracts/ports.js";
import { providerConfigurationResultSchema, providerDiscoveryResultSchema } from "../../checkout-pipeline/schemas.js";
import { PaymentsCheckoutError } from "../../checkout-pipeline/errors.js";
import { parseProviderOperationResult } from "../../contracts/schemas.js";

export class BrokerPaymentsProviderAppsAdapter implements PaymentsProviderAppsPort {
  private readonly routeStores = new Map<string, string>();
  constructor(private readonly broker: ServiceBroker) {}

  async listRoutes(params: Apps.ListPaymentProviderRoutesParams) {
    const result = await this.broker.call<Apps.ListCapabilityRoutesResult, Apps.ListCapabilityRoutesParams>("apps.listCapabilityRoutes", params);
    return result.routes.map((route) => {
      this.routeStores.set(route.capabilityRouteId, params.storeId);
      return this.snapshot(route, params.operation);
    });
  }

  async resolveRoute(input: { storeId: string; installationId: string; operation: Payments.PaymentProviderOperation }) {
    const routes = await this.listRoutes({ storeId: input.storeId, capability: PAYMENTS_PROVIDER_CAPABILITY, operation: input.operation });
    return routes.find((route) => route.installationId === input.installationId) ?? null;
  }

  async validateConfiguration(route: Payments.PaymentProviderRouteSnapshot, request: Payments.PaymentProviderConfigurationValidationRequest) {
    return providerConfigurationResultSchema.parse((await this.execute(route, request)).data) as Payments.PaymentProviderConfigurationValidationResult;
  }
  async getMethods(route: Payments.PaymentProviderRouteSnapshot, request: Payments.PaymentProviderMethodDiscoveryRequest) { return providerDiscoveryResultSchema.parse((await this.execute(route, request)).data) as Payments.PaymentProviderMethodDiscoveryResult; }
  async createPayment(route: Payments.PaymentProviderRouteSnapshot, request: Payments.PaymentProviderCreatePaymentRequest) { return parseProviderOperationResult((await this.execute(route, request)).data); }
  async confirmPayment(route: Payments.PaymentProviderRouteSnapshot, request: Payments.PaymentProviderConfirmRequest) { return (await this.execute(route, request)).data as Payments.PaymentProviderOperationResult; }
  async cancel(route: Payments.PaymentProviderRouteSnapshot, request: Payments.PaymentProviderCancelRequest) { return (await this.execute(route, request)).data as Payments.PaymentProviderOperationResult; }
  async capture(route: Payments.PaymentProviderRouteSnapshot, request: Payments.PaymentProviderCaptureRequest) { return (await this.execute(route, request)).data as Payments.PaymentProviderOperationResult; }
  async void(route: Payments.PaymentProviderRouteSnapshot, request: Payments.PaymentProviderVoidRequest) { return (await this.execute(route, request)).data as Payments.PaymentProviderOperationResult; }
  async refund(route: Payments.PaymentProviderRouteSnapshot, request: Payments.PaymentProviderRefundRequest) { return (await this.execute(route, request)).data as Payments.PaymentProviderOperationResult; }
  async reconcile(route: Payments.PaymentProviderRouteSnapshot, request: Payments.PaymentProviderReconcileRequest) { return (await this.execute(route, request)).data as Payments.PaymentProviderReconcileResult; }

  private async execute<T>(route: Payments.PaymentProviderRouteSnapshot, input: T): Promise<Apps.ExecuteCapabilityResult> {
    const storeId = this.routeStores.get(route.capabilityRouteId);
    if (!storeId) throw new PaymentsCheckoutError("PAYMENT_PROVIDER_ROUTE_UNAVAILABLE", "Payment provider route is not attached to a store.", false);
    const envelope = input as { correlationId?: string; executionId?: string; deadlineAt?: string };
    const result = await this.broker.call<Apps.ExecuteCapabilityResult, Apps.ExecuteCapabilityParams>("apps.executeCapability", { storeId, capability: PAYMENTS_PROVIDER_CAPABILITY, operation: route.operation, installationId: route.installationId, input, correlationId: envelope.correlationId, executionId: envelope.executionId, deadlineAt: envelope.deadlineAt });
    if (result.installationId !== route.installationId || result.appCode !== route.appCode || result.appVersion !== route.appVersion || result.capabilityRouteId !== route.capabilityRouteId || result.routeRevision !== route.routeRevision) throw new PaymentsCheckoutError("PAYMENT_PROVIDER_ROUTE_UNAVAILABLE", "Apps returned a different payment provider route.", false);
    return result;
  }

  private snapshot(route: Apps.CapabilityRoute, operation: Payments.PaymentProviderOperation): Payments.PaymentProviderRouteSnapshot {
    return { protocolVersion: PAYMENTS_PROVIDER_PROTOCOL_VERSION, capabilityRouteId: route.capabilityRouteId, installationId: route.installationId, appCode: route.appCode, appVersion: route.appVersion, operation, routeRevision: route.routeRevision };
  }
}
