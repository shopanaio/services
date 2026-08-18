import type { Delivery } from "@shopana/broker-types";
import type { DeliveryOptionBindingsPort, DeliveryProviderAccountsPort, DeliveryProviderAppsPort } from "../../contracts/ports.js";

export class DeliverySelectionCommitService {
  constructor(private readonly dependencies: {
    bindings: DeliveryOptionBindingsPort;
    providerAccounts: DeliveryProviderAccountsPort;
    apps: DeliveryProviderAppsPort;
  }) {}

  async commit(params: Delivery.CommitCheckoutDeliverySelectionsParams): Promise<Delivery.CommitCheckoutDeliverySelectionsResult> {
    const commitments: Delivery.DeliveryCommittedGroupSnapshot[] = [];
    let duplicate = params.selections.length > 0;
    for (const selection of params.selections) {
      const resolved = await this.dependencies.bindings.resolve({
        storeId: params.storeId,
        checkoutId: params.checkoutId,
        checkoutVersion: params.checkoutVersion,
        groupId: selection.groupId,
        optionHandle: selection.optionHandle,
        effectiveAt: params.committedAt,
      });
      if (resolved.status !== "FOUND") throw new Error(`DELIVERY_BINDING_${resolved.status}`);
      if (resolved.deliveryRevision !== params.deliveryRevision) throw new Error("DELIVERY_REVISION_MISMATCH");

      let customerInput = selection.customerInput;
      let shipmentProvider: { providerAccountId: string; configurationRevision: string } | null = null;
      if (resolved.binding.source === "CARRIER_SERVICE") {
        const account = await this.dependencies.providerAccounts.getById(params.storeId, resolved.binding.carrierServiceAccountId);
        if (!account || account.organizationId !== params.organizationId) throw new Error("DELIVERY_PROVIDER_ACCOUNT_NOT_FOUND");
        const carrier = account.capabilityStates.carrierService;
        if (carrier?.status !== "ACTIVE" || carrier.configurationRevision !== resolved.binding.carrierServiceConfigurationRevision) {
          throw new Error("DELIVERY_CARRIER_CONFIGURATION_REVISION_CONFLICT");
        }
        const shipment = account.capabilityStates.shipmentProvider;
        if (shipment?.status === "ACTIVE" && account.supportedOperations.includes("createShipment")) {
          shipmentProvider = { providerAccountId: account.providerAccountId, configurationRevision: shipment.configurationRevision };
        }
        if (resolved.binding.customerInputContract !== null) {
          const route = await this.dependencies.apps.resolveRoute({
            storeId: params.storeId,
            capability: "delivery.carrier-service",
            operation: "resolveCustomerInput",
            installationId: account.installationId,
          });
          if (!route || route.operation !== "resolveCustomerInput" || route.appCode !== account.appCode) throw new Error("DELIVERY_CUSTOMER_INPUT_ROUTE_UNAVAILABLE");
          const semantic = await this.dependencies.apps.resolveCustomerInput(route, {
            protocolVersion: 2,
            correlationId: `${params.idempotencyKey}:${selection.groupId}`,
            deadlineAt: new Date(Date.parse(params.committedAt) + 30_000).toISOString(),
            effectiveAt: params.committedAt,
            storeId: params.storeId,
            providerAccountId: account.providerAccountId,
            serviceCode: resolved.binding.serviceCode,
            customerInputContractHash: resolved.binding.customerInputContract.schemaHash,
            value: customerInput,
          });
          if (semantic.status !== "VALID") throw new Error("DELIVERY_CUSTOMER_INPUT_INVALID");
          customerInput = semantic.normalized;
        }
      }

      const result = await this.dependencies.bindings.commitSelection({
        organizationId: params.organizationId,
        storeId: params.storeId,
        checkoutId: params.checkoutId,
        checkoutVersion: params.checkoutVersion,
        groupId: selection.groupId,
        optionHandle: selection.optionHandle,
        deliveryRevision: params.deliveryRevision,
        customerInput,
        recipient: selection.recipient,
        shipmentProvider,
        effectiveAt: params.committedAt,
        idempotencyKey: params.idempotencyKey,
      });
      if (result.status !== "COMMITTED") throw new Error(result.code);
      commitments.push(result.commitment);
      duplicate = duplicate && result.duplicate;
    }
    return { commitments, duplicate };
  }

  async release(params: Delivery.ReleaseCheckoutDeliverySelectionsParams): Promise<Delivery.ReleaseCheckoutDeliverySelectionsResult> {
    const releasedGroupIds = await this.dependencies.bindings.releaseCommitments({
      storeId: params.storeId,
      checkoutId: params.checkoutId,
      checkoutVersion: params.checkoutVersion,
      groupIds: params.groupIds,
      releasedAt: params.releasedAt,
    });
    return { releasedGroupIds };
  }
}
