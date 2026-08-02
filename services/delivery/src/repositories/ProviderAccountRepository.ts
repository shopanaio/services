import { and, eq } from "drizzle-orm";
import type { Delivery } from "@shopana/broker-types";
import { BaseRepository } from "./BaseRepository.js";
import { providerAccounts } from "./models/index.js";
import type { DeliveryProviderAccountsPort } from "../contracts/ports.js";

export class ProviderAccountRepository extends BaseRepository implements DeliveryProviderAccountsPort {
  async listActiveForStore(storeId: string, capability: Delivery.DeliveryProviderCapability) {
    const rows = await this.connection.select({ snapshot: providerAccounts.snapshot }).from(providerAccounts)
      .where(eq(providerAccounts.storeId, storeId));
    return rows.map(({ snapshot }) => snapshot).filter((account) => {
      const state = capability === "delivery.carrier-service"
        ? account.capabilityStates.carrierService
        : account.capabilityStates.shipmentProvider;
      return state?.status === "ACTIVE";
    });
  }

  async getById(storeId: string, providerAccountId: string) {
    const [row] = await this.connection.select({ snapshot: providerAccounts.snapshot }).from(providerAccounts)
      .where(and(eq(providerAccounts.storeId, storeId), eq(providerAccounts.id, providerAccountId))).limit(1);
    return row?.snapshot ?? null;
  }

  async getByInstallation(storeId: string, installationId: string) {
    const [row] = await this.connection.select({ snapshot: providerAccounts.snapshot }).from(providerAccounts)
      .where(and(eq(providerAccounts.storeId, storeId), eq(providerAccounts.installationId, installationId))).limit(1);
    return row?.snapshot ?? null;
  }

  async save(account: Delivery.DeliveryProviderAccountSnapshot, expectedAccountRevision: number | null) {
    const current = await this.getById(account.storeId, account.providerAccountId);
    if ((current === null && expectedAccountRevision !== null) ||
        (current !== null && current.revision !== expectedAccountRevision)) {
      if (current === null) throw new Error("Provider account revision conflict without a current snapshot");
      return { status: "REVISION_CONFLICT" as const, current };
    }
    const now = new Date().toISOString();
    await this.connection.insert(providerAccounts).values({
      id: account.providerAccountId,
      organizationId: account.organizationId,
      storeId: account.storeId,
      installationId: account.installationId,
      mode: account.mode,
      providerCode: account.providerCode,
      displayName: account.displayName,
      accountRevision: account.revision,
      supportedCountryCodes: account.supportedCountryCodes,
      supportedCurrencyCodes: account.supportedCurrencyCodes,
      supportedOperations: account.supportedOperations,
      snapshot: account,
      createdAt: account.createdAt,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: providerAccounts.id,
      set: { accountRevision: account.revision, supportedCountryCodes: account.supportedCountryCodes, supportedCurrencyCodes: account.supportedCurrencyCodes,
        supportedOperations: account.supportedOperations, snapshot: account, updatedAt: now },
    });
    return { status: "SAVED" as const, account };
  }
}
