import { Money } from "@shopana/shared-money";

export type CheckoutLineItemReadPortRow = {
  id: string;
  project_id: string;
  checkout_id: string;
  quantity: number;
  unit_id: string;
  unit_title: string;
  unit_price: bigint;
  unit_compare_at_price: bigint | null;
  unit_sku: string | null;
  unit_image_url: string | null;
  unit_snapshot: Record<string, unknown> | null;
  subtotal_amount: bigint;
  discount_amount: bigint;
  tax_amount: bigint;
  total_amount: bigint;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export interface CheckoutLineItemsReadPort {
  findByCheckoutId(checkoutId: string): Promise<CheckoutLineItemReadPortRow[]>;
}

export type CheckoutLineItemReadView = {
  id: string;
  projectId: string;
  checkoutId: string;
  quantity: number;
  unit: {
    id: string;
    title: string;
    price: Money;
    compareAtPrice: Money | null;
    sku: string | null;
    imageUrl: string | null;
    snapshot: Record<string, unknown> | null;
  };
  subtotalAmount: Money;
  discountAmount: Money;
  taxAmount: Money;
  totalAmount: Money;
  metadata: Record<string, unknown> | null;
  projectedVersion: bigint;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class CheckoutLineItemsReadRepository {
  private readonly port: CheckoutLineItemsReadPort;

  constructor(port: CheckoutLineItemsReadPort) {
    this.port = port;
  }

  async findByCheckoutId(
    checkoutId: string,
  ): Promise<CheckoutLineItemReadView[]> {
    const rows = await this.port.findByCheckoutId(checkoutId);

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      checkoutId: row.checkout_id,
      quantity: row.quantity,
      unit: {
        id: row.unit_id,
        title: row.unit_title,
        price: Money.fromMinor(row.unit_price),
        compareAtPrice: row.unit_compare_at_price
          ? Money.fromMinor(row.unit_compare_at_price)
          : null,
        sku: row.unit_sku,
        imageUrl: row.unit_image_url,
        snapshot: row.unit_snapshot,
      },
      subtotalAmount: Money.fromMinor(row.subtotal_amount),
      discountAmount: Money.fromMinor(row.discount_amount),
      taxAmount: Money.fromMinor(row.tax_amount),
      totalAmount: Money.fromMinor(row.total_amount),
      metadata: row.metadata,
      projectedVersion: 0n,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }));
  }
}
