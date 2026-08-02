import { createHash } from "node:crypto";
import type { Payments } from "@shopana/broker-types";
import type { PaymentProviderAccountsPort, PaymentsProviderAppsPort } from "../contracts/ports.js";

export class PaymentProviderAccountService {
  constructor(private readonly accounts: PaymentProviderAccountsPort, private readonly apps: PaymentsProviderAppsPort) {}

  async configure(params: Payments.ConfigurePaymentProviderAccountParams, providerAccountId = deterministicProviderAccountId(params.storeId, params.installationId)): Promise<Payments.ConfigurePaymentProviderAccountResult> {
    const current = await this.accounts.getByInstallation(params.storeId, params.installationId);
    if (current && current.organizationId !== params.organizationId) throw new Error("PAYMENT_PROVIDER_ACCOUNT_TENANT_MISMATCH");
    const route = await this.apps.resolveRoute({ storeId: params.storeId, installationId: params.installationId, operation: "validateConfiguration" });
    if (!route) throw new Error("PAYMENT_PROVIDER_ROUTE_UNAVAILABLE");
    const validation = await this.apps.validateConfiguration(route, { protocolVersion: 1, correlationId: params.correlationId, deadlineAt: new Date(Date.now() + 10_000).toISOString(), mode: params.mode });
    if (validation.status === "INVALID") throw new Error("PAYMENT_PROVIDER_CONFIGURATION_INVALID");
    if (!validation.supportedOperations.includes("getMethods") || !validation.supportedOperations.includes("createPayment") || (params.captureMode === "MANUAL" && !validation.supportedOperations.includes("capture")) || validation.supportedCurrencyCodes.length === 0 || validation.supportedSessionKinds.length === 0) throw new Error("PAYMENT_PROVIDER_CONFIGURATION_UNSUPPORTED");
    const requiredOperations: Payments.PaymentProviderOperation[] = ["getMethods", "createPayment", ...(params.captureMode === "MANUAL" ? ["capture" as const] : [])];
    const requiredRoutes = await Promise.all(requiredOperations.map((operation) => this.apps.resolveRoute({ storeId: params.storeId, installationId: params.installationId, operation })));
    if (requiredRoutes.some((candidate) => candidate === null || candidate.appCode !== route.appCode || candidate.appVersion !== route.appVersion)) throw new Error("PAYMENT_PROVIDER_ROUTE_UNAVAILABLE");
    const now = new Date().toISOString();
    const account: Payments.PaymentProviderAccountSnapshot = {
      providerAccountId: current?.providerAccountId ?? providerAccountId, organizationId: params.organizationId, storeId: params.storeId,
      installationId: params.installationId, appCode: route.appCode, appVersion: route.appVersion,
      providerCode: validation.providerCode, displayName: validation.displayName,
      status: validation.status, mode: params.mode, captureMode: params.captureMode, capabilities: validation.capabilities,
      configurationRevision: validation.configurationRevision, supportedCurrencyCodes: [...new Set(validation.supportedCurrencyCodes)].sort(), supportedCountryCodes: [...new Set(validation.supportedCountryCodes)].sort(),
      supportedSessionKinds: [...new Set(validation.supportedSessionKinds)].sort(), supportedOperations: [...new Set(validation.supportedOperations)].sort(), enabledMethodKeys: [...new Set(params.enabledMethodKeys)].sort(),
      createdAt: current?.createdAt ?? now, updatedAt: now,
    };
    const saved = await this.accounts.save(account, current?.configurationRevision ?? null);
    if (saved.status === "REVISION_CONFLICT") throw new Error("PAYMENT_PROVIDER_CONFIGURATION_CONFLICT");
    return { providerAccountId: account.providerAccountId, workflowId: `payment-provider-configuration:${account.providerAccountId}:${account.configurationRevision}`, duplicate: current?.configurationRevision === account.configurationRevision };
  }

  async isConfigured(params: Payments.ConfigurePaymentProviderAccountParams): Promise<boolean> {
    const current = await this.accounts.getByInstallation(params.storeId, params.installationId);
    return current !== null && current.mode === params.mode && current.captureMode === params.captureMode && JSON.stringify([...current.enabledMethodKeys].sort()) === JSON.stringify([...new Set(params.enabledMethodKeys)].sort());
  }

  async setStatus(params: Payments.SetPaymentProviderAccountStatusParams): Promise<Payments.SetPaymentProviderAccountStatusResult> {
    const current = await this.accounts.getById(params.storeId, params.providerAccountId);
    if (!current) throw new Error("PAYMENT_PROVIDER_ACCOUNT_NOT_FOUND");
    if (current.configurationRevision !== params.expectedConfigurationRevision) throw new Error("PAYMENT_PROVIDER_CONFIGURATION_CONFLICT");
    if (params.status === "ACTIVE" && current.status !== "READY" && current.status !== "INACTIVE") throw new Error("PAYMENT_PROVIDER_ACCOUNT_NOT_READY");
    const saved = await this.accounts.save({ ...current, status: params.status, updatedAt: new Date().toISOString() }, current.configurationRevision);
    if (saved.status === "REVISION_CONFLICT") throw new Error("PAYMENT_PROVIDER_CONFIGURATION_CONFLICT");
    return { account: saved.account };
  }
}

export function deterministicProviderAccountId(storeId: string, installationId: string): string {
  const bytes = Buffer.from(createHash("sha256").update(`payment-provider-account:v1:${storeId}:${installationId}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
