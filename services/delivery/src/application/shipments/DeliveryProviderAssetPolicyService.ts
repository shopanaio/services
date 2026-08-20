import type { DeliveryProviderAssetPolicyPort } from "../../contracts/ports.js";
import type { ProviderAccountRepository } from "../../repositories/ProviderAccountRepository.js";
import { revision } from "../../domain/canonical.js";

export class DeliveryProviderAssetPolicyService implements DeliveryProviderAssetPolicyPort {
  constructor(private readonly accounts: ProviderAccountRepository) {}

  async resolve(input: Parameters<DeliveryProviderAssetPolicyPort["resolve"]>[0]) {
    const account = await this.accounts.getById(input.storeId, input.providerAccountId);
    const capability = account?.capabilityStates.shipmentProvider;
    if (
      !account ||
      account.installationId !== input.route.installationId ||
      !capability ||
      capability.status !== "ACTIVE"
    ) {
      throw new Error("DELIVERY_LABEL_ASSET_POLICY_UNAVAILABLE");
    }
    const policy = {
      allowedHosts: capability.capabilities.labelAssetHosts,
      allowedContentTypes: ["application/pdf", "image/png", "application/zpl"] as const,
      allowedPorts: [443] as const,
      maxRedirects: 0 as const,
      networkPolicy: "PUBLIC_IPS_ONLY_DNS_PINNED" as const,
      maxBytes: capability.capabilities.maxLabelBytes,
      fetchTimeoutMs: 15_000,
    };
    return { ...policy, revision: revision("dlpolicy_v1", policy) };
  }
}
