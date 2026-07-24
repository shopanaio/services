export interface GetStoreOrderSummaryParams {
  storeId: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
}

export interface GetStoreOrderSummaryResult {
  storeId: string;
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  totalAmount: number;
  currencyCode: string;
}
