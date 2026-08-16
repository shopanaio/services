import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerDataRequest } from "../../repositories/models/index.js";
import {
  internalStorefrontError,
  isRecord,
  storefrontError,
  type StorefrontCustomerUserError,
} from "./types.js";

export interface StorefrontCustomerDataRequestCreateParams {
  customerId: string;
  type: CustomerDataRequest["type"];
  correctionDetails?: Record<string, unknown> | null;
  idempotencyKey: string;
}

export interface StorefrontCustomerDataRequestCreateResult {
  dataRequest: { id: string } | null;
  userErrors: StorefrontCustomerUserError[];
}

export interface StorefrontCustomerDataRequestCancelParams {
  customerId: string;
  dataRequestId: string;
  expectedUpdatedAt: string;
}

export type StorefrontCustomerDataRequestCancelResult =
  StorefrontCustomerDataRequestCreateResult;

export class StorefrontCustomerDataRequestCreateScript extends BaseScript<
  StorefrontCustomerDataRequestCreateParams,
  StorefrontCustomerDataRequestCreateResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerDataRequestCreateParams
  ): Promise<StorefrontCustomerDataRequestCreateResult> {
    const errors = validateCreate(params);
    const customer = await this.repository.customer.findById(params.customerId);
    if (!customer || customer.lifecycleStatus !== "ACTIVE") {
      errors.push(
        storefrontError(
          "CUSTOMER_UNAVAILABLE",
          "Customer is not available for privacy requests"
        )
      );
    }
    if (errors.length > 0) return failed(...errors);

    const dataRequest = await this.repository.lifecycle.createDataRequest({
      customerId: params.customerId,
      type: params.type,
      requestedByType: "customer",
      requestedById: params.customerId,
      idempotencyKey: `storefront:${params.customerId}:${params.idempotencyKey}`,
      legalBasis: "customer_request",
      requestMetadata:
        params.type === "CORRECTION"
          ? { correctionDetails: params.correctionDetails }
          : {},
      dueAt: null,
    });
    return { dataRequest: { id: dataRequest.id }, userErrors: [] };
  }

  protected handleError(
    _error: unknown
  ): StorefrontCustomerDataRequestCreateResult {
    return failed(internalStorefrontError());
  }
}

export class StorefrontCustomerDataRequestCancelScript extends BaseScript<
  StorefrontCustomerDataRequestCancelParams,
  StorefrontCustomerDataRequestCancelResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerDataRequestCancelParams
  ): Promise<StorefrontCustomerDataRequestCancelResult> {
    if (!isValidTimestamp(params.expectedUpdatedAt)) {
      return failed(
        storefrontError(
          "INVALID_UPDATED_AT",
          "Expected update timestamp is invalid",
          ["expectedUpdatedAt"]
        )
      );
    }
    const result = await this.repository.lifecycle.cancelOwnedDataRequest({
      customerId: params.customerId,
      id: params.dataRequestId,
      expectedUpdatedAt: params.expectedUpdatedAt,
    });
    switch (result.status) {
      case "cancelled":
        return { dataRequest: { id: result.dataRequest.id }, userErrors: [] };
      case "not_found":
        return failed(
          storefrontError(
            "NOT_FOUND",
            "Privacy request was not found",
            ["dataRequestId"]
          )
        );
      case "invalid_state":
        return failed(
          storefrontError(
            "INVALID_STATE",
            "Only a pending privacy request can be cancelled",
            ["dataRequestId"]
          )
        );
      case "conflict":
        return failed(
          storefrontError(
            "UPDATED_AT_CONFLICT",
            "Privacy request was modified by another request",
            ["expectedUpdatedAt"]
          )
        );
    }
  }

  protected handleError(
    _error: unknown
  ): StorefrontCustomerDataRequestCancelResult {
    return failed(internalStorefrontError());
  }
}

function validateCreate(
  params: StorefrontCustomerDataRequestCreateParams
): StorefrontCustomerUserError[] {
  const errors: StorefrontCustomerUserError[] = [];
  if (!["ACCESS", "EXPORT", "CORRECTION", "ERASURE"].includes(params.type)) {
    errors.push(
      storefrontError("INVALID_TYPE", "Unknown privacy request type", ["type"])
    );
  }
  if (params.type === "CORRECTION") {
    if (!isRecord(params.correctionDetails)) {
      errors.push(
        storefrontError(
          "CORRECTION_DETAILS_REQUIRED",
          "Correction details are required for a correction request",
          ["correctionDetails"]
        )
      );
    }
  } else if (params.correctionDetails != null) {
    errors.push(
      storefrontError(
        "CORRECTION_DETAILS_FORBIDDEN",
        "Correction details are allowed only for a correction request",
        ["correctionDetails"]
      )
    );
  }
  return errors;
}

function isValidTimestamp(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function failed(
  ...userErrors: StorefrontCustomerUserError[]
): StorefrontCustomerDataRequestCreateResult {
  return { dataRequest: null, userErrors };
}
