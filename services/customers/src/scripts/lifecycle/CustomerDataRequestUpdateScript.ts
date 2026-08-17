import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type { CustomerDataRequestPatch } from "../../repositories/lifecycle/CustomerLifecycleRepository.js";
import type { CustomerDataRequest } from "../../repositories/models/index.js";

export interface CustomerDataRequestUpdateParams {
  id: string;
  operations: {
    customerId?: string | null;
    type?: CustomerDataRequest["type"] | null;
    legalBasis?: string | null;
    requestMetadata?: Record<string, unknown> | null;
    dueAt?: string | null;
    cancel?: { reason?: string | null } | null;
  };
}

export interface CustomerDataRequestUpdateResult {
  dataRequest?: { id: string };
  userErrors: UserError[];
}

export class CustomerDataRequestUpdateScript extends BaseScript<
  CustomerDataRequestUpdateParams,
  CustomerDataRequestUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerDataRequestUpdateParams
  ): Promise<CustomerDataRequestUpdateResult> {
    const current = await this.repository.lifecycle.findDataRequestById(
      params.id
    );
    if (!current) return notFound();

    const cancel = params.operations.cancel != null;
    if (current.status !== "PENDING") {
      return invalidState();
    }

    const errors: UserError[] = [];
    if (
      cancel &&
      Object.keys(params.operations).some(
        (field) => field !== "cancel" && hasOwn(params.operations, field),
      )
    ) {
      errors.push({
        message: "Cancel cannot be combined with request updates",
        code: "CONFLICTING_OPERATION",
        field: ["operations"],
      });
    }
    const customerId = hasOwn(params.operations, "customerId")
      ? params.operations.customerId
      : current.customerId;
    if (!customerId) {
      errors.push({
        message: "Customer cannot be null",
        code: "INVALID_VALUE",
        field: ["customerId"],
      });
    } else if (!(await this.repository.customer.exists(customerId))) {
      errors.push({
        message: "Customer not found",
        code: "NOT_FOUND",
        field: ["customerId"],
      });
    }
    if (hasOwn(params.operations, "type") && params.operations.type == null) {
      errors.push({
        message: "Request type cannot be null",
        code: "INVALID_VALUE",
        field: ["type"],
      });
    }
    if (
      hasOwn(params.operations, "requestMetadata") &&
      params.operations.requestMetadata !== null &&
      !isRecord(params.operations.requestMetadata)
    ) {
      errors.push({
        message: "Request metadata must be a JSON object",
        code: "INVALID_REQUEST_METADATA",
        field: ["requestMetadata"],
      });
    }
    if (params.operations.dueAt != null) {
      const dueAt = Date.parse(params.operations.dueAt);
      if (!Number.isFinite(dueAt) || dueAt < Date.now()) {
        errors.push({
          message: "Due date must be a future ISO 8601 date-time",
          code: "INVALID_DUE_AT",
          field: ["dueAt"],
        });
      }
    }
    if (errors.length > 0) {
      return { dataRequest: undefined, userErrors: errors };
    }

    const updated = await this.repository.lifecycle.updateDataRequest(
      params.id,
      requestPatch(params.operations),
      cancel,
      params.operations.cancel?.reason
    );
    if (!updated) return invalidState();
    this.logger.info(
      { dataRequestId: updated.id, cancelled: cancel },
      "Customer data request updated"
    );
    return { dataRequest: { id: updated.id }, userErrors: [] };
  }

  protected handleError(_error: unknown): CustomerDataRequestUpdateResult {
    return {
      dataRequest: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function requestPatch(
  operations: CustomerDataRequestUpdateParams["operations"]
): CustomerDataRequestPatch {
  const patch: CustomerDataRequestPatch = {};
  for (const field of [
    "customerId",
    "type",
    "legalBasis",
    "requestMetadata",
    "dueAt",
  ] as const) {
    if (!hasOwn(operations, field)) continue;
    const value =
      field === "requestMetadata" && operations[field] === null
        ? {}
        : operations[field];
    Object.assign(patch, { [field]: value });
  }
  return patch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function notFound(): CustomerDataRequestUpdateResult {
  return {
    dataRequest: undefined,
    userErrors: [
      {
        message: "Customer data request not found",
        field: ["dataRequestId"],
        code: "NOT_FOUND",
      },
    ],
  };
}

function invalidState(): CustomerDataRequestUpdateResult {
  return {
    dataRequest: undefined,
    userErrors: [
      {
        message: "Only a pending request can be updated or cancelled",
        field: ["dataRequestId"],
        code: "INVALID_STATE",
      },
    ],
  };
}
