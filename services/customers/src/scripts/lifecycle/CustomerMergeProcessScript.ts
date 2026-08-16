import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerMerge } from "../../repositories/models/index.js";

export type CustomerMergeProcessParams =
  | Readonly<{ phase: "BEGIN"; mergeId: string }>
  | Readonly<{ phase: "APPLY"; mergeId: string }>
  | Readonly<{
      phase: "FAIL";
      mergeId: string;
      error: {
        failureId: string;
        code: string;
        message: string;
        retryable: boolean;
      };
    }>;

export interface CustomerMergeProcessResult {
  mergeId: string;
  status: CustomerMerge["status"];
  sourceCustomerId?: string;
  targetCustomerId?: string;
  mergeRevision?: number;
  sourceRevision?: number;
  targetRevision?: number;
  completedAt?: string;
  resolution?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export class CustomerMergeProcessError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "CustomerMergeProcessError";
  }
}

export class CustomerMergeProcessScript extends BaseScript<
  CustomerMergeProcessParams,
  CustomerMergeProcessResult
> {
  @Transactional()
  protected async execute(
    params: CustomerMergeProcessParams,
  ): Promise<CustomerMergeProcessResult> {
    if (params.phase === "BEGIN") return this.begin(params.mergeId);
    if (params.phase === "FAIL") return this.fail(params.mergeId, params.error);
    return this.apply(params.mergeId);
  }

  protected handleError(error: unknown): CustomerMergeProcessResult {
    throw error;
  }

  private async begin(mergeId: string): Promise<CustomerMergeProcessResult> {
    const current = await this.requireLockedMerge(mergeId);
    const resolution = asRecord(current.resolution);
    if (current.status === "COMPLETED" && hasProcessorResolution(resolution)) {
      return completedResult(current);
    }
    const processing = asRecord(resolution.processing);
    if (
      current.status === "IN_PROGRESS" &&
      processing.owner === "CUSTOMER_MERGE_PROCESSOR"
    ) {
      return { mergeId, status: "IN_PROGRESS" };
    }

    const now = new Date().toISOString();
    const attempt = integer(processing.attempt) + 1;
    const ownedResolution = { ...resolution };
    delete ownedResolution.jobId;
    const updated = await this.repository.lifecycle.updateMergeStatus(mergeId, {
      status: "IN_PROGRESS",
      resolution: {
        ...ownedResolution,
        processing: {
          owner: "CUSTOMER_MERGE_PROCESSOR",
          attempt,
          resumedFrom: current.status,
          startedAt: now,
        },
      },
      errorCode: null,
      errorMessage: null,
      transitionedAt: now,
      expectedStatuses: [current.status],
      expectedUpdatedAt: current.updatedAt,
    });
    if (!updated) throw persistenceError(mergeId);
    return { mergeId, status: "IN_PROGRESS" };
  }

  private async apply(mergeId: string): Promise<CustomerMergeProcessResult> {
    const current = await this.requireLockedMerge(mergeId);
    if (current.status === "COMPLETED") return completedResult(current);
    if (current.status !== "IN_PROGRESS") {
      throw new CustomerMergeProcessError(
        `Customer merge ${mergeId} cannot be applied from ${current.status}`,
        "CUSTOMER_MERGE_INVALID_STATE",
      );
    }
    if (
      asRecord(asRecord(current.resolution).processing).owner !==
      "CUSTOMER_MERGE_PROCESSOR"
    ) {
      throw new CustomerMergeProcessError(
        `Customer merge ${mergeId} is owned by another processor`,
        "CUSTOMER_MERGE_PROCESSOR_OWNERSHIP_LOST",
      );
    }

    const locked = await this.repository.merge.lockCustomers(
      current.sourceCustomerId,
      current.targetCustomerId,
    );
    if (!locked) {
      throw new CustomerMergeProcessError(
        "Source or target customer was not found",
        "CUSTOMER_MERGE_CUSTOMER_NOT_FOUND",
      );
    }
    if (["MERGED", "REDACTED"].includes(locked.source.lifecycleStatus)) {
      throw new CustomerMergeProcessError(
        `Source customer cannot be merged from ${locked.source.lifecycleStatus}`,
        "CUSTOMER_MERGE_SOURCE_INVALID_STATE",
      );
    }
    if (["MERGED", "REDACTED"].includes(locked.target.lifecycleStatus)) {
      throw new CustomerMergeProcessError(
        `Target customer cannot receive a merge from ${locked.target.lifecycleStatus}`,
        "CUSTOMER_MERGE_TARGET_INVALID_STATE",
      );
    }

    const now = new Date().toISOString();
    const resources = {
      addresses: await this.repository.merge.mergeAddresses(
        current.sourceCustomerId,
        current.targetCustomerId,
        now,
      ),
      taxIdentifiers: await this.repository.merge.mergeTaxIdentifiers(
        current.sourceCustomerId,
        current.targetCustomerId,
        now,
      ),
      taxExemptions: await this.repository.merge.mergeTaxExemptions(
        current.sourceCustomerId,
        current.targetCustomerId,
        now,
      ),
      consents: await this.repository.merge.mergeConsents(
        current.sourceCustomerId,
        current.targetCustomerId,
        now,
      ),
      groups: await this.repository.merge.mergeGroups(
        current.sourceCustomerId,
        current.targetCustomerId,
      ),
      tags: await this.repository.merge.mergeTags(
        current.sourceCustomerId,
        current.targetCustomerId,
      ),
      segments: await this.repository.merge.mergeSegments(
        current.sourceCustomerId,
        current.targetCustomerId,
      ),
      externalReferences: await this.repository.merge.mergeExternalReferences(
        current.sourceCustomerId,
        current.targetCustomerId,
        now,
      ),
      comparisons: await this.repository.merge.mergeComparisons(
        current.sourceCustomerId,
        current.targetCustomerId,
        now,
      ),
      wishlists: await this.repository.merge.mergeWishlists(
        current.sourceCustomerId,
        current.targetCustomerId,
        now,
      ),
      statistics: await this.repository.merge.mergeStatistics(
        current.sourceCustomerId,
        current.targetCustomerId,
      ),
    };
    await this.repository.statistics.rebuildForCustomer(current.targetCustomerId);
    if (current.sourceCustomerId < current.targetCustomerId) {
      await this.repository.segmentMaterialization.cleanupCustomer(
        current.sourceCustomerId,
      );
      await this.invalidateDynamicSegments(
        current.targetCustomerId,
        ["customer.any"],
        `merge:${mergeId}`,
        now,
      );
    } else {
      await this.invalidateDynamicSegments(
        current.targetCustomerId,
        ["customer.any"],
        `merge:${mergeId}`,
        now,
      );
      await this.repository.segmentMaterialization.cleanupCustomer(
        current.sourceCustomerId,
      );
    }
    const revisions = await this.repository.merge.finalizeCustomers(
      locked,
      current.targetCustomerId,
      now,
    );
    const previousResolution = asRecord(current.resolution);
    const resolution: Record<string, unknown> = {
      schemaVersion: 1,
      strategy: "TARGET_PRESERVED_SOURCE_DEDUPLICATED",
      sourceCustomerId: current.sourceCustomerId,
      targetCustomerId: current.targetCustomerId,
      // The source aggregate can be merged only once, so its terminal revision
      // is the monotonic revision of this merge for downstream consumers.
      mergeRevision: revisions.sourceRevisionAfter,
      revisions,
      resources,
      processing: {
        ...asRecord(previousResolution.processing),
        completedAt: now,
      },
      ...(Array.isArray(previousResolution.failures)
        ? { failures: previousResolution.failures }
        : {}),
      completedAt: now,
    };
    const completed = await this.repository.lifecycle.updateMergeStatus(mergeId, {
      status: "COMPLETED",
      resolution,
      errorCode: null,
      errorMessage: null,
      transitionedAt: now,
      expectedStatuses: ["IN_PROGRESS"],
      expectedUpdatedAt: current.updatedAt,
    });
    if (!completed) throw persistenceError(mergeId);

    this.logger.info(
      {
        mergeId,
        sourceCustomerId: current.sourceCustomerId,
        targetCustomerId: current.targetCustomerId,
        sourceRevision: revisions.sourceRevisionAfter,
        targetRevision: revisions.targetRevisionAfter,
      },
      "Customer merge completed",
    );
    return completedResult(completed);
  }

  private async fail(
    mergeId: string,
    error: {
      failureId: string;
      code: string;
      message: string;
      retryable: boolean;
    },
  ): Promise<CustomerMergeProcessResult> {
    const current = await this.requireLockedMerge(mergeId);
    if (current.status === "COMPLETED") return completedResult(current);
    const now = new Date().toISOString();
    const resolution = asRecord(current.resolution);
    const failures = Array.isArray(resolution.failures)
      ? resolution.failures.slice(-9)
      : [];
    if (
      current.status === "FAILED" &&
      failures.some(
        (failure) =>
          asRecord(failure).failureId === error.failureId,
      )
    ) {
      return {
        mergeId,
        status: "FAILED",
        errorCode: current.errorCode ?? error.code,
        errorMessage: current.errorMessage ?? error.message,
        resolution,
      };
    }
    const failed = await this.repository.lifecycle.updateMergeStatus(mergeId, {
      status: "FAILED",
      resolution: {
        ...resolution,
        failures: [
          ...failures,
          {
            failureId: error.failureId,
            code: error.code,
            message: error.message,
            retryable: error.retryable,
            failedAt: now,
          },
        ],
      },
      errorCode: error.code,
      errorMessage: error.message,
      transitionedAt: now,
      expectedStatuses: [current.status],
      expectedUpdatedAt: current.updatedAt,
    });
    if (!failed) throw persistenceError(mergeId);
    return {
      mergeId,
      status: "FAILED",
      errorCode: error.code,
      errorMessage: error.message,
      resolution: asRecord(failed.resolution),
    };
  }

  private async requireLockedMerge(mergeId: string): Promise<CustomerMerge> {
    const merge = await this.repository.lifecycle.lockMergeById(mergeId);
    if (!merge) {
      throw new CustomerMergeProcessError(
        `Customer merge ${mergeId} was not found`,
        "CUSTOMER_MERGE_NOT_FOUND",
      );
    }
    return merge;
  }
}

function completedResult(merge: CustomerMerge): CustomerMergeProcessResult {
  const resolution = asRecord(merge.resolution);
  const revisions = asRecord(resolution.revisions);
  const mergeRevision = requiredInteger(resolution.mergeRevision, "mergeRevision");
  return {
    mergeId: merge.id,
    status: "COMPLETED",
    sourceCustomerId: merge.sourceCustomerId,
    targetCustomerId: merge.targetCustomerId,
    mergeRevision,
    sourceRevision: requiredInteger(
      revisions.sourceRevisionAfter,
      "sourceRevisionAfter",
    ),
    targetRevision: requiredInteger(
      revisions.targetRevisionAfter,
      "targetRevisionAfter",
    ),
    completedAt: requiredString(resolution.completedAt, "completedAt"),
    resolution,
  };
}

function hasProcessorResolution(resolution: Record<string, unknown>): boolean {
  const revisions = asRecord(resolution.revisions);
  return (
    resolution.schemaVersion === 1 &&
    resolution.strategy === "TARGET_PRESERVED_SOURCE_DEDUPLICATED" &&
    typeof resolution.completedAt === "string" &&
    typeof resolution.mergeRevision === "number" &&
    typeof revisions.sourceRevisionAfter === "number" &&
    typeof revisions.targetRevisionAfter === "number"
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function integer(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function requiredInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new CustomerMergeProcessError(
      `Completed customer merge resolution has invalid ${field}`,
      "CUSTOMER_MERGE_RESOLUTION_INVALID",
    );
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new CustomerMergeProcessError(
      `Completed customer merge resolution has invalid ${field}`,
      "CUSTOMER_MERGE_RESOLUTION_INVALID",
    );
  }
  return value;
}

function persistenceError(mergeId: string): CustomerMergeProcessError {
  return new CustomerMergeProcessError(
    `Customer merge ${mergeId} status could not be persisted`,
    "CUSTOMER_MERGE_PERSISTENCE_FAILED",
    true,
  );
}
