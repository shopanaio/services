import { Money } from "@shopana/shared-money";
import { ChildPriceType } from "@src/domain/checkout/types";

export type CheckoutLineItemReadPortRow = {
  id: string;
  project_id: string;
  checkout_id: string;
  parent_line_item_id: string | null;
  tag_id: string | null;
  tag_slug: string | null;
  tag_is_unique: boolean | null;
  tag_created_at: Date | null;
  tag_updated_at: Date | null;
  // Price config
  price_type: string | null;
  price_amount: bigint | null;
  price_percent: number | null;
  quantity: number;
  unit_id: string;
  unit_title: string;
  unit_price: bigint;
  unit_original_price: bigint | null;
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

/**
 * Price configuration for child items in read view
 */
export type CheckoutLinePriceConfigView = {
  type: ChildPriceType;
  amount: number | null;
  percent: number | null;
};

export type CheckoutLineItemReadView = {
  id: string;
  projectId: string;
  checkoutId: string;
  parentLineId: string | null;
  priceConfig: CheckoutLinePriceConfigView | null;
  quantity: number;
  tag: {
    id: string;
    slug: string;
    isUnique: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  unit: {
    id: string;
    title: string;
    price: Money;
    originalPrice: Money;
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
  /** Child line items (built from flat list in adapter) */
  children: CheckoutLineItemReadView[];
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
    return this.buildLinesHierarchy(rows);
  }

  /**
   * Maps a single row to a view object (without children)
   */
  private mapRowToView(row: CheckoutLineItemReadPortRow): Omit<CheckoutLineItemReadView, "children"> {
    const originalPrice = row.unit_original_price ?? row.unit_price;

    return {
      id: row.id,
      projectId: row.project_id,
      checkoutId: row.checkout_id,
      parentLineId: row.parent_line_item_id,
      priceConfig: row.price_type
        ? {
            type: row.price_type as ChildPriceType,
            amount: row.price_amount != null ? Number(row.price_amount) : null,
            percent: row.price_percent,
          }
        : null,
      quantity: row.quantity,
      tag: row.tag_id
        ? {
            id: row.tag_id,
            slug: row.tag_slug ?? "",
            isUnique: row.tag_is_unique ?? false,
            createdAt: row.tag_created_at ?? new Date(0),
            updatedAt: row.tag_updated_at ?? new Date(0),
          }
        : null,
      unit: {
        id: row.unit_id,
        title: row.unit_title,
        price: Money.fromMinor(row.unit_price),
        originalPrice: Money.fromMinor(originalPrice),
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
    };
  }

  /**
   * Builds parent-child hierarchy from flat rows.
   * Returns only root items (parentLineId === null) with children populated.
   */
  private buildLinesHierarchy(
    rows: CheckoutLineItemReadPortRow[]
  ): CheckoutLineItemReadView[] {
    const linesMap = new Map<string, CheckoutLineItemReadView>();
    const rootLines: CheckoutLineItemReadView[] = [];

    // First pass: create all items with empty children array
    for (const row of rows) {
      linesMap.set(row.id, {
        ...this.mapRowToView(row),
        children: [],
      });
    }

    // Second pass: build hierarchy
    for (const row of rows) {
      const line = linesMap.get(row.id)!;
      if (row.parent_line_item_id) {
        const parent = linesMap.get(row.parent_line_item_id);
        if (parent) {
          parent.children.push(line);
        }
      } else {
        rootLines.push(line);
      }
    }

    // Sort children by created_at
    for (const line of linesMap.values()) {
      line.children.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
    }

    return rootLines;
  }
}
