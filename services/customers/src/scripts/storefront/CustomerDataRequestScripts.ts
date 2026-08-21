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
}

export type StorefrontCustomerDataRequestCancelResult = StorefrontCustomerDataRequestCreateResult;

export class StorefrontCustomerDataRequestCreateScript extends BaseScript<
  StorefrontCustomerDataRequestCreateParams,
  StorefrontCustomerDataRequestCreateResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerDataRequestCreateParams,
  ): Promise<StorefrontCustomerDataRequestCreateResult> {
    const errors = validateCreate(params);
    const customer = await this.repository.customer.findById(params.customerId);
    if (!customer || customer.lifecycleStatus !== "ACTIVE") {
      errors.push(
        storefrontError("CUSTOMER_UNAVAILABLE", "Customer is not available for privacy requests"),
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
        params.type === "CORRECTION" ? { correctionDetails: params.correctionDetails } : {},
      dueAt: null,
    });
    return { dataRequest: { id: dataRequest.id }, userErrors: [] };
  }

  protected handleError(_error: unknown): StorefrontCustomerDataRequestCreateResult {
    return failed(internalStorefrontError());
  }
}

export class StorefrontCustomerDataRequestCancelScript extends BaseScript<
  StorefrontCustomerDataRequestCancelParams,
  StorefrontCustomerDataRequestCancelResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerDataRequestCancelParams,
  ): Promise<StorefrontCustomerDataRequestCancelResult> {
    const result = await this.repository.lifecycle.cancelOwnedDataRequest({
      customerId: params.customerId,
      id: params.dataRequestId,
    });
    switch (result.status) {
      case "cancelled":
        return { dataRequest: { id: result.dataRequest.id }, userErrors: [] };
      case "not_found":
        return failed(
          storefrontError("NOT_FOUND", "Privacy request was not found", ["dataRequestId"]),
        );
      case "invalid_state":
        return failed(
          storefrontError("INVALID_STATE", "Only a pending privacy request can be cancelled", [
            "dataRequestId",
          ]),
        );
    }
  }

  protected handleError(_error: unknown): StorefrontCustomerDataRequestCancelResult {
    return failed(internalStorefrontError());
  }
}

function validateCreate(
  params: StorefrontCustomerDataRequestCreateParams,
): StorefrontCustomerUserError[] {
  const errors: StorefrontCustomerUserError[] = [];
  if (!["ACCESS", "EXPORT", "CORRECTION", "ERASURE"].includes(params.type)) {
    errors.push(storefrontError("INVALID_TYPE", "Unknown privacy request type", ["type"]));
  }
  if (params.type === "CORRECTION") {
    const correctionError = validateCorrectionDetails(params.correctionDetails);
    if (correctionError) {
      errors.push(
        storefrontError(
          correctionError === "missing"
            ? "CORRECTION_DETAILS_REQUIRED"
            : "INVALID_CORRECTION_DETAILS",
          correctionError === "missing"
            ? "Correction details are required for a correction request"
            : "Correction details are malformed or too large",
          ["correctionDetails"],
        ),
      );
    }
  } else if (params.correctionDetails != null) {
    errors.push(
      storefrontError(
        "CORRECTION_DETAILS_FORBIDDEN",
        "Correction details are allowed only for a correction request",
        ["correctionDetails"],
      ),
    );
  }
  return errors;
}

const CORRECTION_FIELDS = new Set([
  "email",
  "phoneE164",
  "prefix",
  "firstName",
  "middleName",
  "lastName",
  "suffix",
  "preferredLocale",
  "dateOfBirth",
  "gender",
  "companyName",
  "jobTitle",
]);

function validateCorrectionDetails(value: unknown): "missing" | "invalid" | null {
  if (value == null || (isRecord(value) && Object.keys(value).length === 0)) {
    return "missing";
  }
  if (!isRecord(value)) return "invalid";
  const fields = value.fields;
  if (!Array.isArray(fields) || fields.length === 0 || fields.length > 32) {
    return "invalid";
  }
  if (Object.keys(value).some((key) => key !== "fields" && key !== "reason")) {
    return "invalid";
  }
  if (
    value.reason !== undefined &&
    (typeof value.reason !== "string" || value.reason.trim().length > 2_000)
  ) {
    return "invalid";
  }
  const paths = new Set<string>();
  for (const field of fields) {
    if (!isRecord(field) || Object.keys(field).some((key) => !["path", "value"].includes(key))) {
      return "invalid";
    }
    if (
      typeof field.path !== "string" ||
      !CORRECTION_FIELDS.has(field.path) ||
      paths.has(field.path) ||
      (field.value !== null && typeof field.value !== "string") ||
      (typeof field.value === "string" && field.value.length > 4_000)
    ) {
      return "invalid";
    }
    paths.add(field.path);
  }
  try {
    return JSON.stringify(value).length <= 64_000 ? null : "invalid";
  } catch {
    return "invalid";
  }
}

function failed(
  ...userErrors: StorefrontCustomerUserError[]
): StorefrontCustomerDataRequestCreateResult {
  return { dataRequest: null, userErrors };
}
