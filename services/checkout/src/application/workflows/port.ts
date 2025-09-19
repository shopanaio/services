export interface WorkflowPort {
  startCreateCheckoutWorkflow(input: {
    streamId: string;
    projectId: string;
    currencyCode: string;
    salesChannel: string | null;
    displayCurrencyCode: string | null;
    displayExchangeRate: number | null;
    idempotencyKey: string;
  }): Promise<void>;

  startAddItemWorkflow(input: {
    streamId: string;
    unitPrice: number;
    quantity: number;
    unitCompareAtPrice: number | null;
    purchasableType: string | null;
    purchasableSnapshotId: string | null;
  }): Promise<void>;
}
