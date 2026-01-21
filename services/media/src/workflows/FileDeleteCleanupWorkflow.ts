import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Error as DBOSErrors } from "@dbos-inc/dbos-sdk";

export interface FileDeleteCleanupInput {
  fileId: string;
  /** Owner ID from the asset group (organization/store/user) */
  ownerId: string;
  /** Owner type from the asset group */
  ownerType: string;
}

export interface FileDeleteCleanupOutput {
  success: boolean;
  needsAttention?: boolean;
}

@Injectable()
export class FileDeleteCleanupWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("media") broker: ServiceBroker) {
    super(broker);
  }

  /**
   * Deterministic workflow ID for deduplication.
   */
  static workflowID(input: FileDeleteCleanupInput): string {
    return `file:cleanup:${input.fileId}`;
  }

  @Workflow("fileDeleteCleanup")
  async run(input: FileDeleteCleanupInput): Promise<FileDeleteCleanupOutput> {
    try {
      await this.emitFileHardDeleted(input);
      return { success: true };
    } catch (error) {
      if (error instanceof DBOSErrors.DBOSMaxStepRetriesError) {
        await this.markNeedsAttention(input.fileId, error);
        return { success: false, needsAttention: true };
      }
      throw error;
    }
  }

  @WorkflowStep({
    retry: { maxAttempts: 10, intervalSeconds: 60, backoffRate: 2 },
  })
  private async emitFileHardDeleted(input: FileDeleteCleanupInput): Promise<void> {
    const { fileId, ownerId, ownerType } = input;

    await this.broker.emit("fileHardDeleted", {
      payload: { fileId },
      context: {
        tenantId: ownerId,
      },
      subject: { type: "file", id: fileId },
      actor: { type: "service" },
      emitKey: `file:hardDeleted:${fileId}`,
    });

    this.logger.log({ fileId, ownerType, ownerId }, "FileHardDeleted event emitted");
  }

  @WorkflowStep()
  private async markNeedsAttention(fileId: string, error: Error): Promise<void> {
    this.logger.error(
      { fileId, error: error.message },
      "File cleanup failed after max retries, needs manual attention"
    );
  }
}
