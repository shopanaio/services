import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { DBOS } from "@dbos-inc/dbos-sdk";

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
      this.markNeedsAttention(input.fileId, error);
      return { success: false, needsAttention: true };
    }
  }

  private async emitFileHardDeleted(input: FileDeleteCleanupInput): Promise<void> {
    const { fileId, ownerId, ownerType } = input;

    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "fileHardDeleted",
        payload: { fileId },
        source: "media",
        context: {
          tenantId: ownerId,
        },
        subject: { type: "file", id: fileId },
        actor: { type: "service" },
        emitKey: `file:hardDeleted:${fileId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitFileHardDeleted",
        callId: fileId,
      },
    );

    this.logger.log({ fileId, ownerType, ownerId }, "FileHardDeleted event emitted");
  }

  private markNeedsAttention(fileId: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(
      { fileId, error: message },
      "File cleanup failed, needs manual attention"
    );
  }
}
