import type { Delivery } from "@shopana/broker-types";
import type { DeliveryProviderAppsPort } from "../../contracts/ports.js";
import type { Repository } from "../../repositories/Repository.js";
import { v5 as uuidv5 } from "uuid";

const DELIVERY_PROVIDER_ACCOUNT_NAMESPACE = "f89fdcea-5b4b-52f0-9ea6-e73b0dc75441";

export function deterministicDeliveryProviderAccountId(
  storeId: string,
  installationId: string,
): string {
  return uuidv5(`${storeId}:${installationId}`, DELIVERY_PROVIDER_ACCOUNT_NAMESPACE);
}

export class DeliveryProviderAccountService {
  constructor(
    private readonly repository: Repository,
    private readonly apps: DeliveryProviderAppsPort,
  ) {}

  async isConfigured(
    params: Pick<Delivery.ConfigureDeliveryProviderAccountParams, "storeId" | "installationId">,
  ): Promise<boolean> {
    return (
      (await this.repository.providerAccounts.getByInstallation(
        params.storeId,
        params.installationId,
      )) !== null
    );
  }

  async configure(
    params: Delivery.ConfigureDeliveryProviderAccountParams,
    providerAccountId = deterministicDeliveryProviderAccountId(
      params.storeId,
      params.installationId,
    ),
  ): Promise<Delivery.ConfigureDeliveryProviderAccountResult> {
    const existing = await this.repository.providerAccounts.getByInstallation(
      params.storeId,
      params.installationId,
    );
    if (existing)
      return {
        providerAccountId: existing.providerAccountId,
        workflowId: `delivery-provider-account:${existing.providerAccountId}:${existing.revision}`,
        duplicate: true,
      };
    const results: Array<{
      route: Delivery.DeliveryProviderRouteSnapshot;
      result: Delivery.DeliveryProviderConfigurationValidationResult;
    }> = [];
    for (const capability of params.enabledCapabilities) {
      const operation =
        capability === "delivery.carrier-service"
          ? "validateCarrierServiceConfiguration"
          : "validateShipmentConfiguration";
      const route = await this.apps.resolveRoute({
        storeId: params.storeId,
        capability,
        operation,
        installationId: params.installationId,
      } as any);
      if (!route)
        throw new Error(`Delivery provider ${capability} validation route is unavailable`);
      const request = {
        protocolVersion: 2 as const,
        storeId: params.storeId,
        capability,
        correlationId: params.correlationId,
        deadlineAt: new Date(Date.now() + 30_000).toISOString(),
        mode: params.mode,
      };
      const result =
        capability === "delivery.carrier-service"
          ? await this.apps.validateCarrierServiceConfiguration(
              route as any,
              request as Delivery.DeliveryProviderConfigurationValidationRequest<"delivery.carrier-service">,
            )
          : await this.apps.validateShipmentConfiguration(
              route as any,
              request as Delivery.DeliveryProviderConfigurationValidationRequest<"delivery.shipment-provider">,
            );
      if (result.status === "INVALID")
        throw new Error(
          `Delivery provider configuration is invalid: ${result.failure?.code ?? "UNKNOWN"}`,
        );
      results.push({ route, result });
    }
    const first = results[0]!;
    if (
      results.some(
        ({ result }) =>
          result.providerCode !== first.result.providerCode ||
          result.displayName !== first.result.displayName,
      )
    )
      throw new Error("Delivery provider capabilities disagree on provider identity");
    const now = new Date().toISOString();
    const id = providerAccountId;
    const carrier = results.find(({ result }) => result.capability === "delivery.carrier-service")
      ?.result as
      | Delivery.DeliveryProviderConfigurationValidationResult<"delivery.carrier-service">
      | undefined;
    const shipment = results.find(
      ({ result }) => result.capability === "delivery.shipment-provider",
    )?.result as
      | Delivery.DeliveryProviderConfigurationValidationResult<"delivery.shipment-provider">
      | undefined;
    const account: Delivery.DeliveryProviderAccountSnapshot = {
      providerAccountId: id,
      organizationId: params.organizationId,
      storeId: params.storeId,
      installationId: params.installationId,
      appCode: first.route.appCode,
      appVersion: first.route.appVersion,
      providerCode: first.result.providerCode,
      displayName: first.result.displayName,
      mode: params.mode,
      revision: 1,
      supportedCountryCodes: [
        ...new Set(results.flatMap(({ result }) => result.supportedCountryCodes)),
      ].sort(),
      supportedCurrencyCodes: [
        ...new Set(results.flatMap(({ result }) => result.supportedCurrencyCodes)),
      ].sort(),
      supportedOperations: [
        ...new Set(results.flatMap(({ result }) => result.supportedOperations)),
      ].sort(),
      capabilityStates: {
        carrierService: carrier ? state(carrier) : null,
        shipmentProvider: shipment ? state(shipment) : null,
      },
      createdAt: now,
      updatedAt: now,
    };
    const saved = await this.repository.providerAccounts.save(account, null);
    if (saved.status !== "SAVED")
      throw new Error("Delivery provider account persistence conflicted");
    return {
      providerAccountId: id,
      workflowId: `delivery-provider-account:${id}:1`,
      duplicate: false,
    };
  }

  async setStatus(
    params: Delivery.SetDeliveryProviderCapabilityStatusParams,
  ): Promise<Delivery.SetDeliveryProviderCapabilityStatusResult> {
    const current = await this.repository.providerAccounts.getById(
      params.storeId,
      params.providerAccountId,
    );
    if (!current) throw new Error("Delivery provider account not found");
    if (current.revision !== params.expectedAccountRevision)
      throw new Error("Delivery provider account revision conflict");
    const key =
      params.capability === "delivery.carrier-service" ? "carrierService" : "shipmentProvider";
    const capability = current.capabilityStates[key];
    if (!capability || !["READY", "ACTIVE", "INACTIVE", "DEGRADED"].includes(capability.status))
      throw new Error("Delivery provider capability cannot transition to the requested status");
    const account = {
      ...current,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      capabilityStates: {
        ...current.capabilityStates,
        [key]: { ...capability, status: params.status, statusReason: null },
      },
    } as Delivery.DeliveryProviderAccountSnapshot;
    const saved = await this.repository.providerAccounts.save(account, current.revision);
    if (saved.status !== "SAVED") throw new Error("Delivery provider account revision conflict");
    return { account: saved.account };
  }
}

function state<T extends Delivery.DeliveryProviderCapability>(
  result: Delivery.DeliveryProviderConfigurationValidationResult<T>,
): Delivery.DeliveryProviderCapabilityState<any> {
  return result.status === "READY"
    ? {
        status: "READY",
        capabilities: result.capabilities,
        configurationRevision: result.configurationRevision,
        statusReason: null,
      }
    : {
        status: "DEGRADED",
        capabilities: result.capabilities,
        configurationRevision: result.configurationRevision,
        statusReason: { code: result.failure!.code, message: result.failure!.message },
      };
}
