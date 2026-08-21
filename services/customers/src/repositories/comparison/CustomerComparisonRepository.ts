import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  customer,
  customerComparison,
  customerComparisonItem,
  type CustomerComparison,
  type CustomerComparisonItem,
} from "../models/index.js";

export interface CustomerComparisonSelection {
  comparison: CustomerComparison | null;
  items: CustomerComparisonItem[];
  revision: number;
}

export type CustomerComparisonAddResult =
  | {
      status: "applied";
      comparison: CustomerComparison;
      item: CustomerComparisonItem;
    }
  | {
      status: "already_selected";
      comparison: CustomerComparison;
      item: CustomerComparisonItem;
    }
  | { status: "customer_not_found" };

export type CustomerComparisonRemoveResult =
  | {
      status: "applied";
      comparison: CustomerComparison;
      removedItem: CustomerComparisonItem;
    }
  | { status: "not_selected" }
  | { status: "customer_not_found" };

export type CustomerComparisonClearResult =
  | {
      status: "applied";
      comparison: CustomerComparison | null;
      removedVariantIds: string[];
      revision: number;
    }
  | { status: "customer_not_found" };

/**
 * Persistence for the customer's single ordered comparison aggregate.
 *
 * Every write locks the owning active customer and comparison row. This makes
 * append positions, deletes, and position compaction one serialized
 * transaction per customer.
 */
export class CustomerComparisonRepository extends BaseRepository {
  @ReadOnly()
  async findById(id: string): Promise<CustomerComparison | null> {
    const rows = await this.connection
      .select({ comparison: customerComparison })
      .from(customerComparison)
      .innerJoin(
        customer,
        and(
          eq(customer.id, customerComparison.customerId),
          eq(customer.storeId, customerComparison.storeId),
        ),
      )
      .where(and(eq(customerComparison.storeId, this.storeId), eq(customerComparison.id, id)))
      .limit(1);
    return rows[0]?.comparison ?? null;
  }

  @ReadOnly()
  async findByCustomerId(customerId: string): Promise<CustomerComparison | null> {
    const rows = await this.connection
      .select({ comparison: customerComparison })
      .from(customerComparison)
      .innerJoin(
        customer,
        and(
          eq(customer.id, customerComparison.customerId),
          eq(customer.storeId, customerComparison.storeId),
        ),
      )
      .where(
        and(
          eq(customerComparison.storeId, this.storeId),
          eq(customerComparison.customerId, customerId),
        ),
      )
      .limit(1);
    return rows[0]?.comparison ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<CustomerComparison[]> {
    if (ids.length === 0) return [];
    const rows = await this.connection
      .select({ comparison: customerComparison })
      .from(customerComparison)
      .innerJoin(
        customer,
        and(
          eq(customer.id, customerComparison.customerId),
          eq(customer.storeId, customerComparison.storeId),
        ),
      )
      .where(
        and(
          eq(customerComparison.storeId, this.storeId),
          inArray(customerComparison.id, [...new Set(ids)]),
        ),
      );
    return rows.map((row) => row.comparison);
  }

  @ReadOnly()
  async getByCustomerIds(customerIds: readonly string[]): Promise<CustomerComparison[]> {
    if (customerIds.length === 0) return [];
    const rows = await this.connection
      .select({ comparison: customerComparison })
      .from(customerComparison)
      .innerJoin(
        customer,
        and(
          eq(customer.id, customerComparison.customerId),
          eq(customer.storeId, customerComparison.storeId),
        ),
      )
      .where(
        and(
          eq(customerComparison.storeId, this.storeId),
          inArray(customerComparison.customerId, [...new Set(customerIds)]),
        ),
      );
    return rows.map((row) => row.comparison);
  }

  @ReadOnly()
  async getItemsByIds(itemIds: readonly string[]): Promise<CustomerComparisonItem[]> {
    if (itemIds.length === 0) return [];
    const rows = await this.connection
      .select({ item: customerComparisonItem })
      .from(customerComparisonItem)
      .innerJoin(
        customerComparison,
        and(
          eq(customerComparison.id, customerComparisonItem.comparisonId),
          eq(customerComparison.storeId, customerComparisonItem.storeId),
        ),
      )
      .where(
        and(
          eq(customerComparisonItem.storeId, this.storeId),
          inArray(customerComparisonItem.id, [...new Set(itemIds)]),
        ),
      );
    return rows.map((row) => row.item);
  }

  @ReadOnly()
  async getItemsByComparisonIds(
    comparisonIds: readonly string[],
  ): Promise<CustomerComparisonItem[]> {
    if (comparisonIds.length === 0) return [];
    const rows = await this.connection
      .select({ item: customerComparisonItem })
      .from(customerComparisonItem)
      .innerJoin(
        customerComparison,
        and(
          eq(customerComparison.id, customerComparisonItem.comparisonId),
          eq(customerComparison.storeId, customerComparisonItem.storeId),
        ),
      )
      .where(
        and(
          eq(customerComparisonItem.storeId, this.storeId),
          inArray(customerComparisonItem.comparisonId, [...new Set(comparisonIds)]),
        ),
      )
      .orderBy(
        asc(customerComparisonItem.comparisonId),
        asc(customerComparisonItem.position),
        asc(customerComparisonItem.id),
      );
    return rows.map((row) => row.item);
  }

  @ReadOnly()
  async getSelection(customerId: string): Promise<CustomerComparisonSelection> {
    const rows = await this.connection
      .select({
        comparison: customerComparison,
        item: customerComparisonItem,
      })
      .from(customerComparison)
      .innerJoin(
        customer,
        and(
          eq(customer.id, customerComparison.customerId),
          eq(customer.storeId, customerComparison.storeId),
        ),
      )
      .leftJoin(
        customerComparisonItem,
        and(
          eq(customerComparisonItem.storeId, customerComparison.storeId),
          eq(customerComparisonItem.comparisonId, customerComparison.id),
        ),
      )
      .where(
        and(
          eq(customerComparison.storeId, this.storeId),
          eq(customerComparison.customerId, customerId),
        ),
      )
      .orderBy(asc(customerComparisonItem.position), asc(customerComparisonItem.id));
    const comparison = rows[0]?.comparison ?? null;
    if (!comparison) {
      return { comparison: null, items: [], revision: 0 };
    }
    return {
      comparison,
      items: rows.flatMap((row) => (row.item ? [row.item] : [])),
      revision: comparison.revision,
    };
  }

  @Transactional()
  async addVariant(input: {
    customerId: string;
    productId: string;
    variantId: string;
  }): Promise<CustomerComparisonAddResult> {
    if (!(await this.lockActiveCustomer(input.customerId))) {
      return { status: "customer_not_found" };
    }

    let comparison = await this.lockComparison(input.customerId);
    if (!comparison) {
      comparison = await this.createComparison(input.customerId);
    }

    const existing = await this.findItemByVariantId(comparison.id, input.variantId);
    if (existing) {
      return { status: "already_selected", comparison, item: existing };
    }

    const lastItems = await this.connection
      .select({ position: customerComparisonItem.position })
      .from(customerComparisonItem)
      .where(
        and(
          eq(customerComparisonItem.storeId, this.storeId),
          eq(customerComparisonItem.comparisonId, comparison.id),
        ),
      )
      .orderBy(desc(customerComparisonItem.position))
      .limit(1);
    const now = new Date().toISOString();
    const inserted = await this.connection
      .insert(customerComparisonItem)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        comparisonId: comparison.id,
        productId: input.productId,
        variantId: input.variantId,
        position: (lastItems[0]?.position ?? -1) + 1,
        addedAt: now,
        updatedAt: now,
      })
      .returning();
    const item = inserted[0];
    if (!item) throw new Error("Comparison item insert returned no row");

    comparison = await this.incrementRevision(comparison.id, now);
    return { status: "applied", comparison, item };
  }

  @Transactional()
  async removeVariant(input: {
    customerId: string;
    variantId: string;
  }): Promise<CustomerComparisonRemoveResult> {
    if (!(await this.lockActiveCustomer(input.customerId))) {
      return { status: "customer_not_found" };
    }
    const comparison = await this.lockComparison(input.customerId);
    if (!comparison) {
      return { status: "not_selected" };
    }

    const item = await this.findItemByVariantId(comparison.id, input.variantId);
    if (!item) {
      return { status: "not_selected" };
    }

    await this.connection
      .delete(customerComparisonItem)
      .where(
        and(
          eq(customerComparisonItem.storeId, this.storeId),
          eq(customerComparisonItem.comparisonId, comparison.id),
          eq(customerComparisonItem.id, item.id),
        ),
      );
    const now = new Date().toISOString();
    await this.compactPositions(comparison.id, now);
    const updated = await this.incrementRevision(comparison.id, now);
    return { status: "applied", comparison: updated, removedItem: item };
  }

  @Transactional()
  async clearVariants(input: {
    customerId: string;
    variantIds: readonly string[];
  }): Promise<CustomerComparisonClearResult> {
    if (!(await this.lockActiveCustomer(input.customerId))) {
      return { status: "customer_not_found" };
    }
    const comparison = await this.lockComparison(input.customerId);
    if (!comparison) {
      return {
        status: "applied",
        comparison: null,
        removedVariantIds: [],
        revision: 0,
      };
    }

    const variantIds = [...new Set(input.variantIds)];
    if (variantIds.length === 0) {
      return {
        status: "applied",
        comparison,
        removedVariantIds: [],
        revision: comparison.revision,
      };
    }
    const removable = await this.connection
      .select({ variantId: customerComparisonItem.variantId })
      .from(customerComparisonItem)
      .where(
        and(
          eq(customerComparisonItem.storeId, this.storeId),
          eq(customerComparisonItem.comparisonId, comparison.id),
          inArray(customerComparisonItem.variantId, variantIds),
        ),
      )
      .orderBy(asc(customerComparisonItem.position));
    if (removable.length === 0) {
      return {
        status: "applied",
        comparison,
        removedVariantIds: [],
        revision: comparison.revision,
      };
    }

    const removedVariantIds = removable.map((row) => row.variantId);
    await this.connection
      .delete(customerComparisonItem)
      .where(
        and(
          eq(customerComparisonItem.storeId, this.storeId),
          eq(customerComparisonItem.comparisonId, comparison.id),
          inArray(customerComparisonItem.variantId, removedVariantIds),
        ),
      );
    const now = new Date().toISOString();
    await this.compactPositions(comparison.id, now);
    const updated = await this.incrementRevision(comparison.id, now);
    return {
      status: "applied",
      comparison: updated,
      removedVariantIds,
      revision: updated.revision,
    };
  }

  async deleteForCustomer(customerId: string): Promise<number> {
    const rows = await this.connection
      .delete(customerComparison)
      .where(
        and(
          eq(customerComparison.storeId, this.storeId),
          eq(customerComparison.customerId, customerId),
        ),
      )
      .returning({ id: customerComparison.id });
    return rows.length;
  }

  private async lockActiveCustomer(customerId: string): Promise<boolean> {
    const rows = await this.connection
      .select({ id: customer.id })
      .from(customer)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, customerId),
          eq(customer.lifecycleStatus, "ACTIVE"),
          isNull(customer.deletedAt),
        ),
      )
      .limit(1)
      .for("update");
    return rows.length > 0;
  }

  private async lockComparison(customerId: string): Promise<CustomerComparison | null> {
    const rows = await this.connection
      .select()
      .from(customerComparison)
      .where(
        and(
          eq(customerComparison.storeId, this.storeId),
          eq(customerComparison.customerId, customerId),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  private async createComparison(customerId: string): Promise<CustomerComparison> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(customerComparison)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        customerId,
        revision: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const comparison = rows[0];
    if (!comparison) throw new Error("Comparison insert returned no row");
    return comparison;
  }

  private async findItemByVariantId(
    comparisonId: string,
    variantId: string,
  ): Promise<CustomerComparisonItem | null> {
    const rows = await this.connection
      .select()
      .from(customerComparisonItem)
      .where(
        and(
          eq(customerComparisonItem.storeId, this.storeId),
          eq(customerComparisonItem.comparisonId, comparisonId),
          eq(customerComparisonItem.variantId, variantId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  private async compactPositions(comparisonId: string, updatedAt: string): Promise<void> {
    const bounds = await this.connection
      .select({
        maxPosition: sql<number>`coalesce(max(${customerComparisonItem.position}), -1)`,
      })
      .from(customerComparisonItem)
      .where(
        and(
          eq(customerComparisonItem.storeId, this.storeId),
          eq(customerComparisonItem.comparisonId, comparisonId),
        ),
      );
    const offset = Number(bounds[0]?.maxPosition ?? -1) + 1;
    if (offset === 0) return;

    await this.connection
      .update(customerComparisonItem)
      .set({
        position: sql`${customerComparisonItem.position} + ${offset}`,
        updatedAt,
      })
      .where(
        and(
          eq(customerComparisonItem.storeId, this.storeId),
          eq(customerComparisonItem.comparisonId, comparisonId),
        ),
      );
    await this.connection.execute(sql`
      WITH ordered_items AS (
        SELECT
          id,
          (row_number() OVER (ORDER BY position ASC, id ASC) - 1)::integer
            AS next_position
        FROM ${customerComparisonItem}
        WHERE ${customerComparisonItem.storeId} = ${this.storeId}
          AND ${customerComparisonItem.comparisonId} = ${comparisonId}
      )
      UPDATE ${customerComparisonItem} AS comparison_item
      SET position = ordered_items.next_position,
          updated_at = ${updatedAt}
      FROM ordered_items
      WHERE comparison_item.id = ordered_items.id
    `);
  }

  private async incrementRevision(
    comparisonId: string,
    updatedAt: string,
  ): Promise<CustomerComparison> {
    const rows = await this.connection
      .update(customerComparison)
      .set({
        revision: sql`${customerComparison.revision} + 1`,
        updatedAt,
      })
      .where(
        and(eq(customerComparison.storeId, this.storeId), eq(customerComparison.id, comparisonId)),
      )
      .returning();
    const comparison = rows[0];
    if (!comparison) throw new Error("Comparison revision update returned no row");
    return comparison;
  }
}
