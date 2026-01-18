import { DBOS } from "@shopana/workflows";
import { DBOSMaxStepRetriesError } from "@dbos-inc/dbos-sdk";
import { BaseWorkflow } from "./BaseWorkflow.js";

export class FileDeleteCleanupWorkflow extends BaseWorkflow {
  /**
   * Deterministic workflow ID for deduplication.
   */
  static workflowID(fileId: string): string {
    return `file:cleanup:${fileId}`;
  }

  @DBOS.workflow()
  async run(fileId: string): Promise<void> {
    try {
      await this.notifyInventory(fileId);
    } catch (error) {
      if (error instanceof DBOSMaxStepRetriesError) {
        await this.markNeedsAttention(fileId, error);
        return;
      }
      throw error;
    }
  }

  @DBOS.step({
    retriesAllowed: true,
    maxAttempts: 10,
    intervalSeconds: 60,
    backoffRate: 2,
  })
  async notifyInventory(fileId: string): Promise<void> {
    const result = await this.broker.call("inventory.fileHardDeleted", {
      fileId,
    });
    // Use DBOS.logger for proper context in step retries
    DBOS.logger.info(
      { fileId, deletedCount: result?.deletedCount },
      "Inventory notified"
    );
  }

  @DBOS.step()
  async markNeedsAttention(fileId: string, error: Error): Promise<void> {
    // Use DBOS.logger for proper context in step
    DBOS.logger.error(
      { fileId, error: error.message },
      "File cleanup failed after max retries, needs manual attention"
    );
  }
}
