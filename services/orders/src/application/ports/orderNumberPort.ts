export interface OrderNumberPort {
  reserve(storeId: string): Promise<number>;
}
