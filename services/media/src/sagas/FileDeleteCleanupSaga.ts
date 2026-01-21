import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { Inventory } from "@shopana/broker-types";
import { Error as DBOSErrors } from "@dbos-inc/dbos-sdk";

export interface FileDeleteCleanupOutput {
  success: boolean;
  needsAttention?: boolean;
}

@Injectable()
export class FileDeleteCleanupSaga extends BrokerSaga<string, FileDeleteCleanupOutput> {
  constructor(@InjectBroker("media") broker: ServiceBroker) {
    super(broker);
  }

  /**
   * Deterministic workflow ID for deduplication.
   */
  static workflowID(fileId: string): string {
    return `file:cleanup:${fileId}`;
  }

  @Saga("fileDeleteCleanup")
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

  @SagaStep({
    retry: { maxAttempts: 10, intervalSeconds: 60, backoffRate: 2 },
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

  @SagaStep()
  private async markNeedsAttention(fileId: string, error: Error): Promise<void> {
    this.logger.error(
      { fileId, error: error.message },
      "File cleanup failed after max retries, needs manual attention"
    );
  }
}
