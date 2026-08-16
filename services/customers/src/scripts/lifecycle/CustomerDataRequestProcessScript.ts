import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerPrivacyCorrection } from "../../repositories/customer/CustomerRepository.js";
import type { CustomerDataRequest } from "../../repositories/models/index.js";

export type CustomerDataRequestProcessParams =
  | Readonly<{ phase: "BEGIN"; dataRequestId: string }>
  | Readonly<{
      phase: "COMPLETE_ARTIFACT";
      dataRequestId: string;
      resultFileId: string;
    }>
  | Readonly<{ phase: "APPLY_CORRECTION"; dataRequestId: string }>
  | Readonly<{ phase: "APPLY_ERASURE"; dataRequestId: string }>
  | Readonly<{
      phase: "REJECT";
      dataRequestId: string;
      error: { code: string; message: string; failureId: string };
    }>;

export interface CustomerDataRequestProcessResult {
  dataRequestId: string;
  customerId: string;
  type: CustomerDataRequest["type"];
  status: CustomerDataRequest["status"];
  resultFileId?: string | null;
  completedAt?: string;
  rejectionReason?: string;
  erasedResources?: Record<string, number>;
  resultFileIdsToDelete?: string[];
  mediaEntitiesToDelete?: Array<{ entityType: string; entityId: string }>;
  customerRevision?: number;
}

export class CustomerDataRequestProcessError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "CustomerDataRequestProcessError";
  }
}

export class CustomerDataRequestProcessScript extends BaseScript<
  CustomerDataRequestProcessParams,
  CustomerDataRequestProcessResult
> {
  @Transactional()
  protected async execute(
    params: CustomerDataRequestProcessParams,
  ): Promise<CustomerDataRequestProcessResult> {
    switch (params.phase) {
      case "BEGIN":
        return this.begin(params.dataRequestId);
      case "COMPLETE_ARTIFACT":
        return this.completeArtifact(params.dataRequestId, params.resultFileId);
      case "APPLY_CORRECTION":
        return this.applyCorrection(params.dataRequestId);
      case "APPLY_ERASURE":
        return this.applyErasure(params.dataRequestId);
      case "REJECT":
        return this.reject(params.dataRequestId, params.error);
    }
  }

  protected handleError(error: unknown): CustomerDataRequestProcessResult {
    throw error;
  }

  private async begin(
    dataRequestId: string,
  ): Promise<CustomerDataRequestProcessResult> {
    const request = await this.requireLockedRequest(dataRequestId);
    if (isTerminal(request.status)) return toResult(request);
    const processing = record(record(request.requestMetadata).processing);
    if (
      request.status === "PROCESSING" &&
      processing.owner === "CUSTOMER_DATA_REQUEST_PROCESSOR"
    ) {
      return toResult(request);
    }
    if (request.status !== "PENDING") {
      throw invalidState(request, "begin processing");
    }

    const customer = await this.repository.customer.lockForPrivacyRequest(
      request.customerId,
    );
    if (!customer) {
      throw new CustomerDataRequestProcessError(
        "Customer was not found",
        "CUSTOMER_DATA_REQUEST_CUSTOMER_NOT_FOUND",
      );
    }
    if (["MERGED", "REDACTED"].includes(customer.lifecycleStatus)) {
      throw new CustomerDataRequestProcessError(
        `Customer cannot process a privacy request from ${customer.lifecycleStatus}`,
        "CUSTOMER_DATA_REQUEST_CUSTOMER_INVALID_STATE",
      );
    }

    const now = new Date().toISOString();
    const updated = await this.repository.lifecycle.updateDataRequestStatus(
      dataRequestId,
      {
        status: "PROCESSING",
        rejectionReason: null,
        requestMetadata: {
          ...record(request.requestMetadata),
          processing: {
            owner: "CUSTOMER_DATA_REQUEST_PROCESSOR",
            startedAt: now,
          },
        },
        transitionedAt: now,
        expectedStatuses: ["PENDING"],
        expectedUpdatedAt: request.updatedAt,
      },
    );
    if (!updated) throw persistenceError(dataRequestId);
    return toResult(updated);
  }

  private async completeArtifact(
    dataRequestId: string,
    resultFileId: string,
  ): Promise<CustomerDataRequestProcessResult> {
    const request = await this.requireLockedRequest(dataRequestId);
    if (request.status === "COMPLETED") return toResult(request);
    this.requireOwnedProcessing(request, ["ACCESS", "EXPORT"]);
    const completedAt = new Date().toISOString();
    const completed = await this.repository.lifecycle.updateDataRequestStatus(
      dataRequestId,
      {
        status: "COMPLETED",
        resultFileId,
        rejectionReason: null,
        requestMetadata: {
          schemaVersion: 1,
          artifact: {
            mediaFileId: resultFileId,
            format: "application/json",
          },
          processing: {
            owner: "CUSTOMER_DATA_REQUEST_PROCESSOR",
            completedAt,
          },
        },
        transitionedAt: completedAt,
        expectedStatuses: ["PROCESSING"],
        expectedUpdatedAt: request.updatedAt,
      },
    );
    if (!completed) throw persistenceError(dataRequestId);
    return toResult(completed);
  }

  private async applyCorrection(
    dataRequestId: string,
  ): Promise<CustomerDataRequestProcessResult> {
    const request = await this.requireLockedRequest(dataRequestId);
    if (request.status === "COMPLETED") return toResult(request);
    this.requireOwnedProcessing(request, ["CORRECTION"]);
    const correction = parseCorrection(
      record(request.requestMetadata).correctionDetails,
    );
    const customer = await this.repository.customer.applyPrivacyCorrection(
      request.customerId,
      correction,
    );
    if (!customer) {
      throw new CustomerDataRequestProcessError(
        "Customer is not active for correction",
        "CUSTOMER_DATA_REQUEST_CORRECTION_CUSTOMER_UNAVAILABLE",
      );
    }
    const completedAt = new Date().toISOString();
    const completed = await this.repository.lifecycle.updateDataRequestStatus(
      dataRequestId,
      {
        status: "COMPLETED",
        rejectionReason: null,
        requestMetadata: {
          schemaVersion: 1,
          correction: { fields: Object.keys(correction).sort() },
          processing: {
            owner: "CUSTOMER_DATA_REQUEST_PROCESSOR",
            completedAt,
          },
        },
        transitionedAt: completedAt,
        expectedStatuses: ["PROCESSING"],
        expectedUpdatedAt: request.updatedAt,
      },
    );
    if (!completed) throw persistenceError(dataRequestId);
    return toResult(completed);
  }

  private async applyErasure(
    dataRequestId: string,
  ): Promise<CustomerDataRequestProcessResult> {
    const request = await this.requireLockedRequest(dataRequestId);
    if (request.status === "COMPLETED") return toResult(request);
    this.requireOwnedProcessing(request, ["ERASURE"]);
    const customer = await this.repository.customer.lockForPrivacyRequest(
      request.customerId,
    );
    if (!customer) {
      throw new CustomerDataRequestProcessError(
        "Customer was not found",
        "CUSTOMER_DATA_REQUEST_CUSTOMER_NOT_FOUND",
      );
    }

    const redactedAt = new Date().toISOString();
    const taxExemptions = await this.repository.taxExemption.redactForCustomer(
      request.customerId,
      redactedAt,
    );
    const resources: Record<string, number> = {
      addresses: await this.repository.address.redactForCustomer(
        request.customerId,
        redactedAt,
      ),
      consents: await this.repository.consent.redactForCustomer(
        request.customerId,
        redactedAt,
      ),
      taxIdentifiers: await this.repository.taxIdentifier.redactForCustomer(
        request.customerId,
        redactedAt,
      ),
      taxExemptions: taxExemptions.length,
      externalReferences:
        await this.repository.externalReference.deleteForCustomer(
          request.customerId,
        ),
      groupMemberships:
        await this.repository.group.deleteMembershipsForCustomer(
          request.customerId,
        ),
      tagAssignments: await this.repository.tag.deleteAssignmentsForCustomer(
        request.customerId,
      ),
      segmentMemberships:
        await this.repository.segment.deleteMembershipsForCustomer(
          request.customerId,
        ),
      wishlists: await this.repository.wishlist.deleteForCustomer(
        request.customerId,
      ),
      comparisons: await this.repository.comparison.deleteForCustomer(
        request.customerId,
      ),
    };
    const statistics = await this.repository.statistics.deleteForCustomer(
      request.customerId,
    );
    for (const [key, value] of Object.entries(statistics)) {
      resources[key] = value;
    }
    const lifecycle = await this.repository.lifecycle.redactForCustomer(
      request.customerId,
      dataRequestId,
      redactedAt,
    );
    resources.dataRequests = lifecycle.dataRequests;
    resources.merges = lifecycle.merges;
    const redacted = await this.repository.customer.redact(
      request.customerId,
      redactedAt,
    );
    if (!redacted) {
      throw new CustomerDataRequestProcessError(
        "Customer redaction could not be persisted",
        "CUSTOMER_DATA_REQUEST_REDACTION_FAILED",
        true,
      );
    }
    const completed = await this.repository.lifecycle.updateDataRequestStatus(
      dataRequestId,
      {
        status: "COMPLETED",
        resultFileId: null,
        rejectionReason: null,
        requestMetadata: {
          schemaVersion: 1,
          redacted: true,
          resources,
          processing: {
            owner: "CUSTOMER_DATA_REQUEST_PROCESSOR",
            completedAt: redactedAt,
          },
        },
        transitionedAt: redactedAt,
        expectedStatuses: ["PROCESSING"],
      },
    );
    if (!completed) throw persistenceError(dataRequestId);

    return {
      ...toResult(completed),
      erasedResources: resources,
      resultFileIdsToDelete: [
        ...lifecycle.resultFileIds,
        ...taxExemptions.flatMap((exemption) =>
          exemption.certificateFileId ? [exemption.certificateFileId] : [],
        ),
      ],
      mediaEntitiesToDelete: [
        { entityType: "customer", entityId: request.customerId },
        ...taxExemptions.map((exemption) => ({
          entityType: "customer_tax_exemption",
          entityId: exemption.id,
        })),
      ],
      customerRevision: redacted.revision,
    };
  }

  private async reject(
    dataRequestId: string,
    error: { code: string; message: string; failureId: string },
  ): Promise<CustomerDataRequestProcessResult> {
    const request = await this.requireLockedRequest(dataRequestId);
    if (isTerminal(request.status)) return toResult(request);
    const rejectedAt = new Date().toISOString();
    const reason = safeRejectionReason(error.message);
    const rejected = await this.repository.lifecycle.updateDataRequestStatus(
      dataRequestId,
      {
        status: "REJECTED",
        resultFileId: null,
        rejectionReason: reason,
        requestMetadata: {
          schemaVersion: 1,
          failure: {
            failureId: error.failureId,
            code: error.code,
            failedAt: rejectedAt,
          },
        },
        transitionedAt: rejectedAt,
        expectedStatuses: ["PENDING", "PROCESSING"],
        expectedUpdatedAt: request.updatedAt,
      },
    );
    if (!rejected) throw persistenceError(dataRequestId);
    return { ...toResult(rejected), rejectionReason: reason };
  }

  private async requireLockedRequest(
    dataRequestId: string,
  ): Promise<CustomerDataRequest> {
    const request = await this.repository.lifecycle.lockDataRequestById(
      dataRequestId,
    );
    if (!request) {
      throw new CustomerDataRequestProcessError(
        `Customer data request ${dataRequestId} was not found`,
        "CUSTOMER_DATA_REQUEST_NOT_FOUND",
      );
    }
    return request;
  }

  private requireOwnedProcessing(
    request: CustomerDataRequest,
    types: readonly CustomerDataRequest["type"][],
  ): void {
    if (!types.includes(request.type)) {
      throw new CustomerDataRequestProcessError(
        `Customer data request ${request.id} has unexpected type ${request.type}`,
        "CUSTOMER_DATA_REQUEST_TYPE_MISMATCH",
      );
    }
    if (request.status !== "PROCESSING") {
      throw invalidState(request, "apply processing result");
    }
    const processing = record(record(request.requestMetadata).processing);
    if (processing.owner !== "CUSTOMER_DATA_REQUEST_PROCESSOR") {
      throw new CustomerDataRequestProcessError(
        `Customer data request ${request.id} is owned by another processor`,
        "CUSTOMER_DATA_REQUEST_PROCESSOR_OWNERSHIP_LOST",
      );
    }
  }
}

const CORRECTION_FIELDS = [
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
] as const satisfies readonly (keyof CustomerPrivacyCorrection)[];

function parseCorrection(value: unknown): CustomerPrivacyCorrection {
  const source = record(value);
  const correction: CustomerPrivacyCorrection = {};
  for (const field of CORRECTION_FIELDS) {
    if (!(field in source)) continue;
    const fieldValue = source[field];
    if (fieldValue !== null && typeof fieldValue !== "string") {
      throw new CustomerDataRequestProcessError(
        `Correction field ${field} must be a string or null`,
        "CUSTOMER_DATA_REQUEST_CORRECTION_INVALID",
      );
    }
    Object.assign(correction, { [field]: fieldValue });
  }
  const unsupported = Object.keys(source).filter(
    (field) => !(CORRECTION_FIELDS as readonly string[]).includes(field),
  );
  if (unsupported.length > 0 || Object.keys(correction).length === 0) {
    throw new CustomerDataRequestProcessError(
      unsupported.length > 0
        ? `Unsupported correction fields: ${unsupported.sort().join(", ")}`
        : "Correction details contain no supported fields",
      "CUSTOMER_DATA_REQUEST_CORRECTION_INVALID",
    );
  }
  if (
    correction.phoneE164 &&
    !/^\+[1-9][0-9]{6,14}$/.test(correction.phoneE164)
  ) {
    throw new CustomerDataRequestProcessError(
      "Correction phoneE164 must use E.164 format",
      "CUSTOMER_DATA_REQUEST_CORRECTION_INVALID",
    );
  }
  if (
    correction.dateOfBirth &&
    !/^\d{4}-\d{2}-\d{2}$/.test(correction.dateOfBirth)
  ) {
    throw new CustomerDataRequestProcessError(
      "Correction dateOfBirth must use YYYY-MM-DD format",
      "CUSTOMER_DATA_REQUEST_CORRECTION_INVALID",
    );
  }
  return correction;
}

function toResult(
  request: CustomerDataRequest,
): CustomerDataRequestProcessResult {
  return {
    dataRequestId: request.id,
    customerId: request.customerId,
    type: request.type,
    status: request.status,
    resultFileId: request.resultFileId,
    ...(request.finishedAt ? { completedAt: request.finishedAt } : {}),
    ...(request.rejectionReason
      ? { rejectionReason: request.rejectionReason }
      : {}),
  };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isTerminal(status: CustomerDataRequest["status"]): boolean {
  return ["COMPLETED", "REJECTED", "CANCELLED"].includes(status);
}

function invalidState(
  request: CustomerDataRequest,
  operation: string,
): CustomerDataRequestProcessError {
  return new CustomerDataRequestProcessError(
    `Customer data request ${request.id} cannot ${operation} from ${request.status}`,
    "CUSTOMER_DATA_REQUEST_INVALID_STATE",
  );
}

function persistenceError(dataRequestId: string): CustomerDataRequestProcessError {
  return new CustomerDataRequestProcessError(
    `Customer data request ${dataRequestId} could not be persisted`,
    "CUSTOMER_DATA_REQUEST_PERSISTENCE_FAILED",
    true,
  );
}

function safeRejectionReason(message: string): string {
  const normalized = message.replace(/[\r\n\t]+/g, " ").trim();
  return normalized.length > 0
    ? normalized.slice(0, 512)
    : "Customer data request processing failed";
}
