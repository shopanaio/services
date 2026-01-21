import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Error as DBOSErrors } from "@dbos-inc/dbos-sdk";
import type { Inventory } from "@shopana/broker-types";

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
  static workflowID(fileId: string): string {
    return `file:cleanup:${fileId}`;
  }

  @Workflow("fileDeleteCleanup")
  async run(fileId: string): Promise<FileDeleteCleanupOutput> {
    try {
      await this.notifyInventory(fileId);
      return { success: true };
    } catch (error) {
      if (error instanceof DBOSErrors.DBOSMaxStepRetriesError) {
        await this.markNeedsAttention(fileId, error);
        return { success: false, needsAttention: true };
      }
      throw error;
    }
  }

  @WorkflowStep({
    maxAttempts: 10,
    intervalSeconds: 60,
    backoffRate: 2,
  })
  private async notifyInventory(fileId: string): Promise<void> {
    const result = await this.broker.call<Inventory.FileHardDeletedResult, Inventory.FileHardDeletedParams>(
      "inventory.fileHardDeleted",
      { fileId },
    );
    this.logger.log(
      { fileId, deletedCount: result.deletedCount },
      "Inventory notified"
    );
  }

  @WorkflowStep()
  private async markNeedsAttention(fileId: string, error: Error): Promise<void> {
    this.logger.error(
      { fileId, error: error.message },
      "File cleanup failed after max retries, needs manual attention"
    );
  }
}
