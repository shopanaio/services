import type { WorkflowPort } from "@src/application/workflows/port";

export class NoopWorkflowClient implements WorkflowPort {
  async startCreateCheckoutWorkflow(_input: {
    streamId: string;
    projectId: string;
    currencyCode: string;
    salesChannel: string;
    displayCurrencyCode: string | null;
    displayExchangeRate: number | null;
    idempotencyKey: string;
  }): Promise<void> {
    return;
  }

  async startAddItemWorkflow(_input: {
    streamId: string;
    unitPrice: number;
    quantity: number;
    unitCompareAtPrice: number | null;
    purchasableType: string | null;
    purchasableSnapshotId: string | null;
  }): Promise<void> {
    return;
  }
}
