import { DBOS } from "@shopana/shared-kernel";
import type { Inventory } from "@shopana/broker-types";
import { Error as DBOSErrors } from "@dbos-inc/dbos-sdk";
import { BaseSaga } from "./BaseSaga.js";

export class FileDeleteCleanupSaga extends BaseSaga {
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
      if (error instanceof DBOSErrors.DBOSMaxStepRetriesError) {
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
    const result = await this.broker.call<Inventory.FileHardDeletedResult, Inventory.FileHardDeletedParams>(
      "inventory.fileHardDeleted",
      { fileId },
    );
    this.logger.info(
      { fileId, deletedCount: result.deletedCount },
      "Inventory notified"
    );
  }

  @DBOS.step()
  async markNeedsAttention(fileId: string, error: Error): Promise<void> {
    this.logger.error(
      { fileId, error: error.message },
      "File cleanup failed after max retries, needs manual attention"
    );
  }
}
