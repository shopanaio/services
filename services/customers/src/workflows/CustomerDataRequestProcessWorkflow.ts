import { Injectable } from "@nestjs/common";
import type { IAM, Media } from "@shopana/broker-types";
import type {
  CustomerDataRequestStatusChangedEvent,
  CustomerRedactedEvent,
  CustomerUpdatedEvent,
} from "@shopana/events";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  CustomerDataRequestArtifactScript,
  CustomerDataRequestIamLinkScript,
  CustomerDataRequestNotificationSnapshotScript,
  CustomerDataRequestProcessError,
  CustomerDataRequestProcessScript,
  type CustomerDataRequestProcessResult,
} from "../scripts/lifecycle/index.js";

export interface CustomerDataRequestProcessWorkflowContext {
  organizationId: string;
  storeId: string;
  locale?: string;
  userId?: string;
  requestId: string;
}

export interface CustomerDataRequestProcessWorkflowInput {
  dataRequestId: string;
  context: CustomerDataRequestProcessWorkflowContext;
}

export type CustomerDataRequestProcessWorkflowResult = CustomerDataRequestProcessResult;

@Injectable()
export class CustomerDataRequestProcessWorkflow extends BrokerWorkflows<
  CustomerDataRequestProcessWorkflowInput,
  CustomerDataRequestProcessWorkflowResult
> {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("customerDataRequestProcess")
  async run(
    input: CustomerDataRequestProcessWorkflowInput,
  ): Promise<CustomerDataRequestProcessWorkflowResult> {
    let started: CustomerDataRequestProcessResult;
    try {
      started = await this.begin(input);
    } catch (error) {
      const rejected = await this.reject(input, serializeError(error));
      await this.emitStatusChanged(input, rejected);
      return rejected;
    }
    if (isTerminal(started.status)) return started;
    await this.emitStatusChanged(input, started);

    let result: CustomerDataRequestProcessResult = started;
    let cleanupErasureResult: CustomerDataRequestProcessResult | null = null;
    try {
      switch (started.type) {
        case "ACCESS":
        case "EXPORT": {
          const fileId = await this.createArtifact(input);
          result = await this.completeArtifact(input, fileId);
          break;
        }
        case "CORRECTION":
          result = await this.applyCorrection(input);
          break;
        case "ERASURE":
          await this.deleteIamPrincipal(input);
          result = await this.applyErasure(input);
          cleanupErasureResult = result;
          break;
      }
    } catch (error) {
      result = await this.reject(input, serializeError(error));
    }

    if (cleanupErasureResult?.status === "COMPLETED") {
      await this.cleanupErasureMedia(input, cleanupErasureResult);
      await this.emitCustomerRedacted(input, cleanupErasureResult);
    }
    if (result.type === "CORRECTION" && result.status === "COMPLETED") {
      await this.emitCustomerCorrected(input, result);
    }
    await this.emitStatusChanged(input, result);
    return result;
  }

  @WorkflowStep({
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private begin(input: CustomerDataRequestProcessWorkflowInput) {
    return this.kernel.runScript(
      CustomerDataRequestProcessScript,
      { phase: "BEGIN", dataRequestId: input.dataRequestId },
      toScriptContext(input.context),
    );
  }

  @WorkflowStep({
    timeoutMs: 60_000,
    retry: { maxAttempts: 5, intervalSeconds: 2, backoffRate: 2 },
  })
  private async createArtifact(input: CustomerDataRequestProcessWorkflowInput): Promise<string> {
    const artifact = await this.kernel.runScript(
      CustomerDataRequestArtifactScript,
      { dataRequestId: input.dataRequestId },
      toScriptContext(input.context),
    );
    const result = await this.broker.call<
      Media.UploadGeneratedFileResult,
      Media.UploadGeneratedFileParams
    >("media.uploadGeneratedFile", {
      owner: { type: "store", id: input.context.storeId },
      entityRef: {
        service: "customers",
        entityType: "customer_data_request",
        entityId: input.dataRequestId,
      },
      role: "privacy_result",
      filename: artifact.filename,
      mimeType: artifact.mimeType,
      contentBase64: artifact.contentBase64,
      idempotencyKey: `customer-data-request:${input.dataRequestId}:result:v1`,
    });
    if (!result.fileId || result.userErrors.length > 0) {
      throw new CustomerDataRequestProcessError(
        "Customer data request artifact upload failed",
        result.userErrors[0]?.code ?? "CUSTOMER_DATA_REQUEST_MEDIA_UPLOAD_FAILED",
        true,
      );
    }
    return result.fileId;
  }

  @WorkflowStep({
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private completeArtifact(input: CustomerDataRequestProcessWorkflowInput, resultFileId: string) {
    return this.kernel.runScript(
      CustomerDataRequestProcessScript,
      {
        phase: "COMPLETE_ARTIFACT",
        dataRequestId: input.dataRequestId,
        resultFileId,
      },
      toScriptContext(input.context),
    );
  }

  @WorkflowStep({
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private applyCorrection(input: CustomerDataRequestProcessWorkflowInput) {
    return this.kernel.runScript(
      CustomerDataRequestProcessScript,
      { phase: "APPLY_CORRECTION", dataRequestId: input.dataRequestId },
      toScriptContext(input.context),
    );
  }

  @WorkflowStep({
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async deleteIamPrincipal(input: CustomerDataRequestProcessWorkflowInput): Promise<void> {
    const link = await this.kernel.runScript(
      CustomerDataRequestIamLinkScript,
      { dataRequestId: input.dataRequestId },
      toScriptContext(input.context),
    );
    if (!link) return;
    const result = await this.broker.call<
      IAM.DeleteServiceLinkedApplicationUserResult,
      IAM.DeleteServiceLinkedApplicationUserParams
    >("iam.deleteServiceLinkedApplicationUser", {
      applicationId: link.applicationId,
      organizationId: input.context.organizationId,
      userId: link.principalId,
      requestId: input.dataRequestId,
      linkedOwner: {
        linkedOwnerType: "store",
        linkedOwnerId: input.context.storeId,
      },
    });
    if (!result.success) {
      throw new CustomerDataRequestProcessError(
        "IAM principal deletion failed",
        result.errorCode ?? "CUSTOMER_DATA_REQUEST_IAM_DELETE_FAILED",
        true,
      );
    }
  }

  @WorkflowStep({
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private applyErasure(input: CustomerDataRequestProcessWorkflowInput) {
    return this.kernel.runScript(
      CustomerDataRequestProcessScript,
      { phase: "APPLY_ERASURE", dataRequestId: input.dataRequestId },
      toScriptContext(input.context),
    );
  }

  @WorkflowStep({
    retry: { maxAttempts: 10, intervalSeconds: 1, backoffRate: 2 },
  })
  private reject(
    input: CustomerDataRequestProcessWorkflowInput,
    error: { code: string; message: string },
  ) {
    return this.kernel.runScript(
      CustomerDataRequestProcessScript,
      {
        phase: "REJECT",
        dataRequestId: input.dataRequestId,
        error: { ...error, failureId: DBOS.workflowID! },
      },
      toScriptContext(input.context),
    );
  }

  @WorkflowStep({
    retry: { maxAttempts: 10, intervalSeconds: 2, backoffRate: 2 },
  })
  private async cleanupErasureMedia(
    input: CustomerDataRequestProcessWorkflowInput,
    result: CustomerDataRequestProcessResult,
  ): Promise<void> {
    for (const entity of result.mediaEntitiesToDelete ?? []) {
      await this.broker.call<Media.EntityDeletedResult, Media.EntityDeletedParams>(
        "media.entityDeleted",
        {
          entityRef: {
            service: "customers",
            entityType: entity.entityType,
            entityId: entity.entityId,
          },
        },
      );
    }
    if ((result.resultFileIdsToDelete?.length ?? 0) === 0) return;
    const deleted = await this.broker.call<
      Media.DeleteOwnedFilesResult,
      Media.DeleteOwnedFilesParams
    >("media.deleteOwnedFiles", {
      owner: { type: "store", id: input.context.storeId },
      fileIds: result.resultFileIdsToDelete ?? [],
      permanent: true,
    });
    if (deleted.errors.some((error) => error.code !== "FILE_NOT_FOUND")) {
      throw new Error("Customer privacy media cleanup failed");
    }
  }

  private async emitStatusChanged(
    input: CustomerDataRequestProcessWorkflowInput,
    result: CustomerDataRequestProcessResult,
  ): Promise<void> {
    const status = result.status;
    if (!isEmittedStatus(status)) return;
    const emittedResult = { ...result, status };

    const payload = await this.prepareStatusChangedEvent(input, emittedResult);
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "customerDataRequestStatusChanged",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "customerDataRequest", id: input.dataRequestId },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : { type: "service" as const, id: "customers" },
        emitKey: `customer-data-request:${input.dataRequestId}:${result.status}`,
      },
      {
        source: "workflow",
        organizationId: input.context.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: `emitStatus:${result.status}`,
        callId: input.dataRequestId,
      },
    );
  }

  @WorkflowStep({
    retry: { maxAttempts: 10, intervalSeconds: 1, backoffRate: 2 },
  })
  private async prepareStatusChangedEvent(
    input: CustomerDataRequestProcessWorkflowInput,
    result: CustomerDataRequestProcessResult & {
      status: "PROCESSING" | "COMPLETED" | "REJECTED";
    },
  ): Promise<CustomerDataRequestStatusChangedEvent["payload"]> {
    const delivery = await this.kernel.runScript(
      CustomerDataRequestNotificationSnapshotScript,
      { dataRequestId: input.dataRequestId },
      toScriptContext(input.context),
    );
    const includeRecipient = delivery.type !== "ERASURE";
    const occurredAt = result.completedAt ?? new Date().toISOString();
    return {
      dataRequestId: input.dataRequestId,
      customerId: result.customerId,
      storeId: input.context.storeId,
      requestType: result.type,
      status: result.status,
      ...(result.resultFileId !== undefined ? { resultFileId: result.resultFileId } : {}),
      ...(result.rejectionReason ? { rejectionReason: result.rejectionReason } : {}),
      occurredAt,
      notification: {
        storeId: input.context.storeId,
        locale: delivery.recipient?.locale ?? input.context.locale,
        recipients: includeRecipient && delivery.recipient ? [delivery.recipient] : [],
        data: {
          request: {
            id: input.dataRequestId,
            type: result.type,
            status: result.status,
            ...(result.resultFileId !== undefined ? { resultFileId: result.resultFileId } : {}),
            ...(result.rejectionReason ? { rejectionReason: result.rejectionReason } : {}),
          },
        },
      },
    };
  }

  private async emitCustomerRedacted(
    input: CustomerDataRequestProcessWorkflowInput,
    result: CustomerDataRequestProcessResult,
  ): Promise<void> {
    if (
      result.type !== "ERASURE" ||
      result.status !== "COMPLETED" ||
      result.customerRevision === undefined ||
      !result.completedAt
    ) {
      return;
    }
    const payload: CustomerRedactedEvent["payload"] = {
      customerId: result.customerId,
      storeId: input.context.storeId,
      dataRequestId: input.dataRequestId,
      revision: result.customerRevision,
      redactedAt: result.completedAt,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "customerRedacted",
        payload,
        context: { organizationId: input.context.organizationId },
        subject: { type: "customer", id: result.customerId },
        actor: { type: "service" as const, id: "customers" },
        emitKey: `customer:${result.customerId}:redacted:${result.customerRevision}`,
      },
      {
        source: "workflow",
        organizationId: input.context.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "emitCustomerRedacted",
        callId: result.customerId,
      },
    );
  }

  private async emitCustomerCorrected(
    input: CustomerDataRequestProcessWorkflowInput,
    result: CustomerDataRequestProcessResult,
  ): Promise<void> {
    const payload: CustomerUpdatedEvent["payload"] = {
      customerId: result.customerId,
      storeId: input.context.storeId,
      reasons: ["contact", "profile"],
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "customerUpdated",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "customer", id: result.customerId },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : { type: "service" as const, id: "customers" },
        emitKey: `customer:${result.customerId}:privacy-correction:${input.dataRequestId}`,
      },
      {
        source: "workflow",
        organizationId: input.context.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "emitCustomerCorrected",
        callId: input.dataRequestId,
      },
    );
  }
}

function toScriptContext(context: CustomerDataRequestProcessWorkflowContext): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    locale: context.locale,
    userId: context.userId,
    requestId: context.requestId,
  };
}

function isTerminal(status: CustomerDataRequestProcessResult["status"]): boolean {
  return ["COMPLETED", "REJECTED", "CANCELLED"].includes(status);
}

function isEmittedStatus(
  status: CustomerDataRequestProcessResult["status"],
): status is "PROCESSING" | "COMPLETED" | "REJECTED" {
  return ["PROCESSING", "COMPLETED", "REJECTED"].includes(status);
}

function serializeError(error: unknown): { code: string; message: string } {
  if (error instanceof CustomerDataRequestProcessError) {
    return { code: error.code, message: error.message };
  }
  // DBOS may reconstruct an error thrown by a durable step, so its prototype
  // is not guaranteed to survive replay. Preserve only known, safe domain
  // failures by their closed code namespace.
  const value = error as { code?: unknown; message?: unknown };
  if (
    typeof value?.code === "string" &&
    value.code.startsWith("CUSTOMER_DATA_REQUEST_") &&
    typeof value.message === "string"
  ) {
    return { code: value.code, message: value.message };
  }
  return {
    code: "CUSTOMER_DATA_REQUEST_PROCESSING_FAILED",
    message: "Customer data request processing failed",
  };
}
