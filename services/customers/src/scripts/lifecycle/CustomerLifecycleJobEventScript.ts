import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export type CustomerLifecycleJobEventParams =
  | Readonly<{
      operation: "DISPATCHED";
      jobType: "MERGE" | "DATA_REQUEST";
      aggregateId: string;
      jobId: string;
      occurredAt: string;
    }>
  | Readonly<{
      operation: "COMPLETED";
      jobType: "MERGE" | "DATA_REQUEST";
      aggregateId: string;
      jobId: string;
      occurredAt: string;
      outcome: "COMPLETED" | "FAILED" | "REJECTED";
      resolution?: Record<string, unknown>;
      resultFileId?: string | null;
      errorCode?: string | null;
      errorMessage?: string | null;
    }>;

export interface CustomerLifecycleJobEventResult {
  aggregateId: string;
  changed: boolean;
}

export class CustomerLifecycleJobEventError extends Error {
  readonly retryable = false;

  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "CustomerLifecycleJobEventError";
  }
}

export class CustomerLifecycleJobEventScript extends BaseScript<
  CustomerLifecycleJobEventParams,
  CustomerLifecycleJobEventResult
> {
  @Transactional()
  protected async execute(
    params: CustomerLifecycleJobEventParams,
  ): Promise<CustomerLifecycleJobEventResult> {
    requireOccurredAt(params.occurredAt);
    return params.jobType === "MERGE" ? this.applyMerge(params) : this.applyDataRequest(params);
  }

  protected handleError(error: unknown): CustomerLifecycleJobEventResult {
    throw error;
  }

  private async applyMerge(
    params: CustomerLifecycleJobEventParams,
  ): Promise<CustomerLifecycleJobEventResult> {
    const current = await this.repository.lifecycle.findMergeById(params.aggregateId);
    if (!current) throw notFound(params);
    const resolution = current.resolution as Record<string, unknown>;
    if (params.operation === "DISPATCHED") {
      if (current.status === "IN_PROGRESS") {
        if (resolution.jobId === params.jobId) return unchanged(params);
        throw jobMismatch(params);
      }
      if (current.status !== "REQUESTED") throw invalidState(params, current.status);
      const updated = await this.repository.lifecycle.updateMergeStatus(params.aggregateId, {
        status: "IN_PROGRESS",
        resolution: {
          ...resolution,
          jobId: params.jobId,
        },
        transitionedAt: params.occurredAt,
        expectedStatuses: ["REQUESTED"],
        expectedUpdatedAt: current.updatedAt,
      });
      return changed(params, updated !== null);
    }

    const status = params.outcome === "COMPLETED" ? "COMPLETED" : "FAILED";
    if (current.status === status) {
      if (resolution.jobId === params.jobId) return unchanged(params);
      throw jobMismatch(params);
    }
    if (current.status !== "IN_PROGRESS") throw invalidState(params, current.status);
    if (resolution.jobId !== params.jobId) throw jobMismatch(params);
    const updated = await this.repository.lifecycle.updateMergeStatus(params.aggregateId, {
      status,
      resolution: { ...params.resolution, jobId: params.jobId },
      errorCode: params.errorCode ?? null,
      errorMessage: params.errorMessage ?? null,
      transitionedAt: params.occurredAt,
      expectedStatuses: ["IN_PROGRESS"],
      expectedUpdatedAt: current.updatedAt,
    });
    return changed(params, updated !== null);
  }

  private async applyDataRequest(
    params: CustomerLifecycleJobEventParams,
  ): Promise<CustomerLifecycleJobEventResult> {
    const current = await this.repository.lifecycle.findDataRequestById(params.aggregateId);
    if (!current) throw notFound(params);
    const requestMetadata = current.requestMetadata as Record<string, unknown>;
    if (params.operation === "DISPATCHED") {
      if (current.status === "PROCESSING") {
        if (requestMetadata.lifecycleJobId === params.jobId) return unchanged(params);
        throw jobMismatch(params);
      }
      if (requestMetadata.lastLifecycleJobId === params.jobId) {
        return unchanged(params);
      }
      if (current.status !== "PENDING") throw invalidState(params, current.status);
      const updated = await this.repository.lifecycle.updateDataRequestStatus(params.aggregateId, {
        status: "PROCESSING",
        requestMetadata: {
          ...requestMetadata,
          lifecycleJobId: params.jobId,
        },
        transitionedAt: params.occurredAt,
      });
      return changed(params, updated !== null);
    }

    const status =
      params.outcome === "COMPLETED"
        ? "COMPLETED"
        : params.outcome === "REJECTED"
          ? "REJECTED"
          : "PENDING";
    if (current.status === status) {
      if (requestMetadata.lastLifecycleJobId === params.jobId) {
        return unchanged(params);
      }
      throw jobMismatch(params);
    }
    if (current.status !== "PROCESSING") throw invalidState(params, current.status);
    if (requestMetadata.lifecycleJobId !== params.jobId) throw jobMismatch(params);
    const updated = await this.repository.lifecycle.updateDataRequestStatus(params.aggregateId, {
      status,
      resultFileId: params.resultFileId ?? null,
      rejectionReason:
        status === "REJECTED"
          ? (params.errorMessage ?? "Customer data request was rejected")
          : null,
      requestMetadata: {
        ...requestMetadata,
        lifecycleJobId: null,
        lastLifecycleJobId: params.jobId,
        ...(status === "PENDING"
          ? {
              lifecycleJobErrorCode: params.errorCode ?? null,
              lifecycleJobErrorMessage: params.errorMessage ?? null,
            }
          : {
              lifecycleJobErrorCode: null,
              lifecycleJobErrorMessage: null,
            }),
      },
      transitionedAt: params.occurredAt,
    });
    return changed(params, updated !== null);
  }
}

function notFound(params: CustomerLifecycleJobEventParams) {
  return new CustomerLifecycleJobEventError(
    `${params.jobType} lifecycle aggregate was not found`,
    "CUSTOMER_LIFECYCLE_AGGREGATE_NOT_FOUND",
  );
}

function invalidState(params: CustomerLifecycleJobEventParams, status: string) {
  return new CustomerLifecycleJobEventError(
    `${params.jobType} lifecycle aggregate cannot apply ${params.operation} from ${status}`,
    "CUSTOMER_LIFECYCLE_INVALID_STATE",
  );
}

function jobMismatch(params: CustomerLifecycleJobEventParams) {
  return new CustomerLifecycleJobEventError(
    `${params.jobType} lifecycle event does not match the active job`,
    "CUSTOMER_LIFECYCLE_JOB_MISMATCH",
  );
}

function changed(
  params: CustomerLifecycleJobEventParams,
  value: boolean,
): CustomerLifecycleJobEventResult {
  return { aggregateId: params.aggregateId, changed: value };
}

function unchanged(params: CustomerLifecycleJobEventParams): CustomerLifecycleJobEventResult {
  return changed(params, false);
}

function requireOccurredAt(value: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new CustomerLifecycleJobEventError(
      "Customer lifecycle event occurredAt is invalid",
      "CUSTOMER_LIFECYCLE_EVENT_TIME_INVALID",
    );
  }
}
