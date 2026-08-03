export type OrderRecord = Readonly<{
  id: string;
  storeId: string;
  currencyCode: string;
}>;

export class Order {
  private constructor(private readonly record: OrderRecord) {}

  static fromRecord(record: OrderRecord): Order {
    return new Order(record);
  }

  getId(): string {
    return this.record.id;
  }

  getStoreId(): string {
    return this.record.storeId;
  }

  getCurrencyCode(): string {
    return this.record.currencyCode;
  }
}
