import { createHash } from "node:crypto";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import type { Inventory } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import { inventoryItem, reservations, warehouseStock } from "../repositories/models/index.js";

export class CheckoutInventoryReservationService {
  constructor(private readonly kernel: Kernel) {}

  async reserve(
    params: Inventory.ReserveCheckoutInventoryParams,
  ): Promise<Inventory.ReserveCheckoutInventoryResult> {
    const expiresAt = futureTimestamp(params.expiresAt, "INVENTORY_RESERVATION_EXPIRY_INVALID");
    const lines = aggregateLines(params.lines);
    return this.kernel.repository.txManager.run(async () => {
      const db = this.kernel.repository.db;
      const variantIds = lines.map(({ variantId }) => variantId);
      const items =
        variantIds.length === 0
          ? []
          : await db
              .select()
              .from(inventoryItem)
              .where(
                and(
                  eq(inventoryItem.storeId, params.storeId),
                  inArray(inventoryItem.variantId, variantIds),
                ),
              );
      const byVariant = new Map(items.map((item) => [item.variantId, item]));
      const requiredLines = lines.filter((line) => {
        const item = byVariant.get(line.variantId);
        return item?.trackInventory && !item.continueSellingWhenOutOfStock;
      });
      const existing = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.storeId, params.storeId),
            eq(reservations.orderSystem, "shopana"),
            eq(reservations.orderId, params.orderId),
          ),
        )
        .orderBy(asc(reservations.variantId), asc(reservations.warehouseId))
        .for("update");
      if (existing.length > 0) {
        if (existing.some(({ status }) => status !== "ACTIVE")) {
          throw new Error("INVENTORY_RESERVATION_ALREADY_RELEASED");
        }
        assertExistingReservationMatches(requiredLines, existing);
        const expiring = existing.filter(({ expiresAt }) => expiresAt !== null);
        if (expiring.length > 0) {
          const renewedUntil = latestTimestamp([
            expiresAt,
            ...expiring.map(({ expiresAt }) => expiresAt!),
          ]);
          await db
            .update(reservations)
            .set({ expiresAt: renewedUntil })
            .where(
              inArray(
                reservations.id,
                expiring.map(({ id }) => id),
              ),
            );
        }
        return result(
          existing.map((row) => ({
            reservationId: row.id,
            lineId: lines.find((line) => line.variantId === row.variantId)?.lineId ?? row.variantId,
            variantId: row.variantId,
            warehouseId: row.warehouseId,
            quantity: row.quantity,
          })),
        );
      }

      const allocations: Inventory.CheckoutInventoryReservationAllocation[] = [];

      for (const line of requiredLines) {
        const stocks = await db
          .select()
          .from(warehouseStock)
          .where(
            and(
              eq(warehouseStock.storeId, params.storeId),
              eq(warehouseStock.variantId, line.variantId),
            ),
          )
          .orderBy(asc(warehouseStock.warehouseId))
          .for("update");
        let remaining = line.quantity;
        for (const stock of stocks) {
          const available = stock.quantityOnHand - stock.reservedQty - stock.unavailableQty;
          const quantity = Math.min(remaining, Math.max(0, available));
          if (quantity === 0) continue;
          const change = await this.kernel.repository.stock.applyStockChange({
            variantId: line.variantId,
            warehouseId: stock.warehouseId,
            deltaOnHand: 0,
            deltaReserved: quantity,
            movementType: "RESERVE",
            sourceSystem: "checkout.placeOrder",
            sourceEventId: stockSourceEventId(
              "reserve",
              params.idempotencyKey,
              line.variantId,
              stock.warehouseId,
            ),
            correlationId: params.correlationId,
          });
          if (change.status === "REJECTED") throw new Error("INVENTORY_RESERVATION_REJECTED");
          const [reservation] = await db
            .insert(reservations)
            .values({
              storeId: params.storeId,
              variantId: line.variantId,
              warehouseId: stock.warehouseId,
              orderSystem: "shopana",
              orderId: params.orderId,
              quantity,
              status: "ACTIVE",
              expiresAt,
            })
            .returning();
          allocations.push({
            reservationId: reservation!.id,
            lineId: line.lineId,
            variantId: line.variantId,
            warehouseId: stock.warehouseId,
            quantity,
          });
          remaining -= quantity;
          if (remaining === 0) break;
        }
        if (remaining > 0) throw new Error("INVENTORY_INSUFFICIENT_STOCK");
      }
      return result(allocations);
    });
  }

  async renew(
    params: Inventory.RenewCheckoutInventoryParams,
  ): Promise<Inventory.RenewCheckoutInventoryResult> {
    const expiresAt = futureTimestamp(params.expiresAt, "INVENTORY_RESERVATION_EXPIRY_INVALID");
    return this.kernel.repository.txManager.run(async () => {
      const active = await this.kernel.repository.db
        .select({ id: reservations.id, expiresAt: reservations.expiresAt })
        .from(reservations)
        .where(
          and(
            eq(reservations.storeId, params.storeId),
            eq(reservations.orderSystem, "shopana"),
            eq(reservations.orderId, params.orderId),
            eq(reservations.status, "ACTIVE"),
            isNotNull(reservations.expiresAt),
          ),
        )
        .for("update");
      if (active.length > 0) {
        const renewedUntil = latestTimestamp([
          expiresAt,
          ...active.map(({ expiresAt }) => expiresAt!),
        ]);
        await this.kernel.repository.db
          .update(reservations)
          .set({ expiresAt: renewedUntil })
          .where(
            inArray(
              reservations.id,
              active.map(({ id }) => id),
            ),
          );
      }
      return { renewedReservationIds: active.map(({ id }) => id) };
    });
  }

  async confirm(
    params: Inventory.ConfirmCheckoutInventoryParams,
  ): Promise<Inventory.ConfirmCheckoutInventoryResult> {
    return this.kernel.repository.txManager.run(async () => {
      const active = await this.kernel.repository.db
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.storeId, params.storeId),
            eq(reservations.orderSystem, "shopana"),
            eq(reservations.orderId, params.orderId),
            eq(reservations.status, "ACTIVE"),
          ),
        )
        .for("update");
      if (active.length > 0) {
        await this.kernel.repository.db
          .update(reservations)
          .set({ expiresAt: null })
          .where(
            inArray(
              reservations.id,
              active.map(({ id }) => id),
            ),
          );
      }
      return { confirmedReservationIds: active.map(({ id }) => id) };
    });
  }

  async release(
    params: Inventory.ReleaseCheckoutInventoryParams,
  ): Promise<Inventory.ReleaseCheckoutInventoryResult> {
    return this.kernel.repository.txManager.run(async () => {
      const db = this.kernel.repository.db;
      const active = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.storeId, params.storeId),
            eq(reservations.orderSystem, "shopana"),
            eq(reservations.orderId, params.orderId),
            eq(reservations.status, "ACTIVE"),
          ),
        )
        .orderBy(asc(reservations.variantId), asc(reservations.warehouseId))
        .for("update");
      for (const reservation of active) {
        const change = await this.kernel.repository.stock.applyStockChange({
          variantId: reservation.variantId,
          warehouseId: reservation.warehouseId,
          deltaOnHand: 0,
          deltaReserved: -reservation.quantity,
          movementType: "RELEASE",
          sourceSystem: "checkout.placeOrder",
          sourceEventId: stockSourceEventId("release", params.idempotencyKey, reservation.id),
          correlationId: params.correlationId,
        });
        if (change.status === "REJECTED") throw new Error("INVENTORY_RELEASE_REJECTED");
      }
      if (active.length > 0) {
        await db
          .update(reservations)
          .set({
            status: "RELEASED",
            releasedAt: new Date().toISOString(),
          })
          .where(
            inArray(
              reservations.id,
              active.map(({ id }) => id),
            ),
          );
      }
      return { releasedReservationIds: active.map(({ id }) => id) };
    });
  }
}

function futureTimestamp(value: string, code: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) throw new Error(code);
  return new Date(timestamp).toISOString();
}

function latestTimestamp(values: readonly string[]): string {
  return new Date(Math.max(...values.map(Date.parse))).toISOString();
}

function stockSourceEventId(kind: string, ...parts: readonly string[]): string {
  const hash = createHash("sha256")
    .update(JSON.stringify([kind, ...parts]))
    .digest("hex");
  return `checkout-place-order:${hash}`;
}

function assertExistingReservationMatches(
  lines: readonly Readonly<{ variantId: string; quantity: number }>[],
  existing: readonly Readonly<{ variantId: string; quantity: number }>[],
): void {
  const expected = new Map(lines.map((line) => [line.variantId, line.quantity]));
  const actual = new Map<string, number>();
  for (const row of existing) {
    actual.set(row.variantId, (actual.get(row.variantId) ?? 0) + row.quantity);
  }
  if (
    expected.size !== actual.size ||
    [...expected].some(([variantId, quantity]) => actual.get(variantId) !== quantity)
  ) {
    throw new Error("INVENTORY_RESERVATION_IDEMPOTENCY_CONFLICT");
  }
}

function aggregateLines(lines: Inventory.ReserveCheckoutInventoryParams["lines"]) {
  const byVariant = new Map<string, { lineId: string; variantId: string; quantity: number }>();
  for (const line of [...lines].sort(
    (left, right) =>
      left.variantId.localeCompare(right.variantId) || left.lineId.localeCompare(right.lineId),
  )) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("INVENTORY_RESERVATION_QUANTITY_INVALID");
    }
    const current = byVariant.get(line.variantId);
    if (current) {
      current.quantity += line.quantity;
      if (!Number.isSafeInteger(current.quantity)) {
        throw new Error("INVENTORY_RESERVATION_QUANTITY_INVALID");
      }
    } else byVariant.set(line.variantId, { ...line });
  }
  return [...byVariant.values()];
}

function result(
  allocations: readonly Inventory.CheckoutInventoryReservationAllocation[],
): Inventory.ReserveCheckoutInventoryResult {
  const canonical = allocations.map((allocation) => ({
    lineId: allocation.lineId,
    variantId: allocation.variantId,
    warehouseId: allocation.warehouseId,
    quantity: allocation.quantity,
  }));
  return {
    revision: `inventory-reservation:v1:sha256:${createHash("sha256").update(JSON.stringify(canonical)).digest("hex")}`,
    allocations,
  };
}
