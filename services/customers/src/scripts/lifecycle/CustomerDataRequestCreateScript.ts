import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type { CustomerDataRequest } from "../../repositories/models/index.js";

export interface CustomerDataRequestCreateParams {
  customerId: string;
  type: CustomerDataRequest["type"];
  legalBasis?: string | null;
  requestMetadata?: Record<string, unknown> | null;
  dueAt?: string | null;
}

export interface CustomerDataRequestCreateResult {
  dataRequest?: { id: string };
  userErrors: UserError[];
}

export class CustomerDataRequestCreateScript extends BaseScript<
  CustomerDataRequestCreateParams,
  CustomerDataRequestCreateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerDataRequestCreateParams,
  ): Promise<CustomerDataRequestCreateResult> {
    const errors = validateDataRequest(params);
    if (!(await this.repository.customer.exists(params.customerId))) {
      errors.push({
        message: "Customer not found",
        code: "NOT_FOUND",
        field: ["customerId"],
      });
    }
    if (errors.length > 0) {
      return { dataRequest: undefined, userErrors: errors };
    }

    const dataRequest = await this.repository.lifecycle.createDataRequest({
      customerId: params.customerId,
      type: params.type,
      requestedByType: this.context.hasUser ? "user" : "service",
      requestedById: this.context.hasUser ? this.currentUser.id : null,
      idempotencyKey: `${this.context.requestId}:customerDataRequestCreate`,
      legalBasis: params.legalBasis ?? null,
      requestMetadata: params.requestMetadata ?? {},
      dueAt: params.dueAt ?? null,
    });
    this.logger.info(
      { dataRequestId: dataRequest.id, customerId: params.customerId },
      "Customer data request created",
    );
    return { dataRequest: { id: dataRequest.id }, userErrors: [] };
  }

  protected handleError(_error: unknown): CustomerDataRequestCreateResult {
    return {
      dataRequest: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateDataRequest(params: CustomerDataRequestCreateParams): UserError[] {
  if (!params.dueAt) return [];
  const dueAt = Date.parse(params.dueAt);
  if (!Number.isFinite(dueAt)) {
    return [
      {
        message: "Due date must use ISO 8601 date-time format",
        code: "INVALID_DUE_AT",
        field: ["dueAt"],
      },
    ];
  }
  if (dueAt < Date.now()) {
    return [
      {
        message: "Due date cannot be in the past",
        code: "INVALID_DUE_AT",
        field: ["dueAt"],
      },
    ];
  }
  return [];
}
