import { BaseScript } from "../../kernel/BaseScript.js";

export interface CustomerDataRequestArtifactParams {
  dataRequestId: string;
}

export interface CustomerDataRequestArtifactResult {
  filename: string;
  mimeType: "application/json";
  contentBase64: string;
}

export class CustomerDataRequestArtifactScript extends BaseScript<
  CustomerDataRequestArtifactParams,
  CustomerDataRequestArtifactResult
> {
  protected async execute(
    params: CustomerDataRequestArtifactParams,
  ): Promise<CustomerDataRequestArtifactResult> {
    const request = await this.repository.lifecycle.findDataRequestById(params.dataRequestId);
    if (
      !request ||
      request.status !== "PROCESSING" ||
      !["ACCESS", "EXPORT"].includes(request.type)
    ) {
      throw new Error("Customer data request is not ready for an artifact");
    }
    const generatedAt = new Date().toISOString();
    const snapshot = await this.repository.privacy.getSnapshot(request.customerId, generatedAt);
    if (!snapshot) throw new Error("Customer privacy snapshot was not found");
    const envelope =
      request.type === "EXPORT"
        ? {
            export: {
              schemaVersion: 1,
              dataRequestId: request.id,
              generatedAt,
              format: "application/json",
            },
            data: snapshot,
          }
        : snapshot;
    const serialized = JSON.stringify(envelope, jsonReplacer, 2);
    return {
      filename: `customer-data-${request.type.toLowerCase()}-${request.id}.json`,
      mimeType: "application/json",
      contentBase64: Buffer.from(serialized, "utf8").toString("base64"),
    };
  }

  protected handleError(error: unknown): CustomerDataRequestArtifactResult {
    throw error;
  }
}

export interface CustomerDataRequestNotificationSnapshotParams {
  dataRequestId: string;
}

export interface CustomerDataRequestNotificationSnapshotResult {
  customerId: string;
  type: "ACCESS" | "EXPORT" | "CORRECTION" | "ERASURE";
  recipient: {
    customerId: string;
    email?: string;
    phone?: string;
    locale?: string;
    name?: string;
  } | null;
}

export class CustomerDataRequestNotificationSnapshotScript extends BaseScript<
  CustomerDataRequestNotificationSnapshotParams,
  CustomerDataRequestNotificationSnapshotResult
> {
  protected async execute(
    params: CustomerDataRequestNotificationSnapshotParams,
  ): Promise<CustomerDataRequestNotificationSnapshotResult> {
    const request = await this.repository.lifecycle.findDataRequestById(params.dataRequestId);
    if (!request) throw new Error("Customer data request was not found");
    const customer = await this.repository.customer.findByIdIncludingDeleted(request.customerId);
    const name = customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim()
      : "";
    const recipient =
      customer && (customer.email || customer.phoneE164)
        ? {
            customerId: customer.id,
            ...(customer.email ? { email: customer.email } : {}),
            ...(customer.phoneE164 ? { phone: customer.phoneE164 } : {}),
            ...(customer.preferredLocale ? { locale: customer.preferredLocale } : {}),
            ...(name ? { name } : {}),
          }
        : null;
    return { customerId: request.customerId, type: request.type, recipient };
  }

  protected handleError(error: unknown): CustomerDataRequestNotificationSnapshotResult {
    throw error;
  }
}

export interface CustomerDataRequestIamLinkParams {
  dataRequestId: string;
}

export type CustomerDataRequestIamLinkResult = {
  applicationId: string;
  principalId: string;
} | null;

export class CustomerDataRequestIamLinkScript extends BaseScript<
  CustomerDataRequestIamLinkParams,
  CustomerDataRequestIamLinkResult
> {
  protected async execute(
    params: CustomerDataRequestIamLinkParams,
  ): Promise<CustomerDataRequestIamLinkResult> {
    const request = await this.repository.lifecycle.findDataRequestById(params.dataRequestId);
    if (!request || request.type !== "ERASURE") {
      throw new Error("Customer erasure request was not found");
    }
    const customer = await this.repository.customer.findByIdIncludingDeleted(request.customerId);
    if (!customer?.iamPrincipalId) return null;
    const configuration = await this.repository.storefrontAuth.findByStoreId(this.context.store.id);
    if (!configuration) {
      throw new Error("Storefront IAM application configuration was not found");
    }
    if (configuration.organizationId !== this.context.store.organizationId) {
      throw new Error("Storefront IAM organization does not match request context");
    }
    return {
      applicationId: configuration.applicationId,
      principalId: customer.iamPrincipalId,
    };
  }

  protected handleError(error: unknown): CustomerDataRequestIamLinkResult {
    throw error;
  }
}

function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
