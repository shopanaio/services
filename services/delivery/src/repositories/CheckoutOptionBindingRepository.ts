import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { Delivery } from "@shopana/broker-types";
import type { DeliveryOptionBindingCandidate, DeliveryOptionBindingResolution, DeliveryOptionBindingsPort } from "../contracts/ports.js";
import { BaseRepository } from "./BaseRepository.js";
import { checkoutOptionBindings } from "./models/index.js";

export class CheckoutOptionBindingRepository extends BaseRepository implements DeliveryOptionBindingsPort {
  async stageCheckoutSnapshot(input: {
    storeId: string; checkoutId: string; basedOnCheckoutVersion: number; targetCheckoutVersion: number;
    preliminaryRevision: string; deliveryRevision: string; options: readonly DeliveryOptionBindingCandidate[]; retainUntil: string;
  }) {
    if (input.targetCheckoutVersion !== input.basedOnCheckoutVersion + 1) {
      return { status: "STALE_CHECKOUT_VERSION" as const, currentCheckoutVersion: input.basedOnCheckoutVersion };
    }
    return this.connection.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.storeId}:${input.checkoutId}:${input.targetCheckoutVersion}`}, 0))`);
      const [current] = await tx.select({ deliveryRevision: checkoutOptionBindings.deliveryRevision })
        .from(checkoutOptionBindings).where(and(
          eq(checkoutOptionBindings.storeId, input.storeId),
          eq(checkoutOptionBindings.checkoutId, input.checkoutId),
          eq(checkoutOptionBindings.targetCheckoutVersion, input.targetCheckoutVersion),
        )).limit(1);
      if (current && current.deliveryRevision !== input.deliveryRevision) {
        return { status: "REVISION_CONFLICT" as const, currentDeliveryRevision: current.deliveryRevision };
      }
      for (const candidate of input.options) {
        const idRows = await tx.execute<{ id: string }>(sql`SELECT uuidv7() AS id`);
        const id = idRows[0]?.id;
        if (!id) throw new Error("PostgreSQL uuidv7() did not return an id");
        const binding: Delivery.DeliveryOptionBindingSnapshot = {
          ...candidate.binding,
          basedOnCheckoutVersion: input.basedOnCheckoutVersion,
          targetCheckoutVersion: input.targetCheckoutVersion,
        };
        await tx.insert(checkoutOptionBindings).values({
          id, storeId: input.storeId, checkoutId: input.checkoutId,
          basedOnCheckoutVersion: input.basedOnCheckoutVersion,
          targetCheckoutVersion: input.targetCheckoutVersion,
          groupId: binding.groupId, optionHandle: binding.optionHandle,
          preliminaryRevision: input.preliminaryRevision,
          deliveryRevision: input.deliveryRevision, snapshot: binding,
          expiresAt: input.retainUntil,
        }).onConflictDoUpdate({
          target: [checkoutOptionBindings.storeId, checkoutOptionBindings.checkoutId, checkoutOptionBindings.targetCheckoutVersion, checkoutOptionBindings.groupId, checkoutOptionBindings.optionHandle],
          set: { snapshot: binding, expiresAt: input.retainUntil },
        });
      }
      return { status: "STAGED" as const };
    });
  }

  async resolve(input: { storeId: string; checkoutId: string; checkoutVersion: number; groupId: string; optionHandle: string; effectiveAt: string }): Promise<DeliveryOptionBindingResolution> {
    const [row] = await this.connection.select({ snapshot: checkoutOptionBindings.snapshot, expiresAt: checkoutOptionBindings.expiresAt })
      .from(checkoutOptionBindings).where(and(
        eq(checkoutOptionBindings.storeId, input.storeId), eq(checkoutOptionBindings.checkoutId, input.checkoutId),
        eq(checkoutOptionBindings.targetCheckoutVersion, input.checkoutVersion), eq(checkoutOptionBindings.groupId, input.groupId),
        eq(checkoutOptionBindings.optionHandle, input.optionHandle),
      )).limit(1);
    if (!row) return { status: "NOT_FOUND" };
    if (Date.parse(row.expiresAt) <= Date.parse(input.effectiveAt)) return { status: "EXPIRED" };
    return { status: "FOUND", binding: row.snapshot };
  }

  async commitSelection(input: { storeId: string; checkoutId: string; checkoutVersion: number; groupId: string; optionHandle: string; deliveryRevision: string; customerInput: Record<string, unknown> | null; effectiveAt: string; idempotencyKey: string }) {
    const resolved = await this.resolve(input);
    if (resolved.status !== "FOUND") return { status: resolved.status, code: `DELIVERY_BINDING_${resolved.status}`, message: "Delivery option binding is unavailable." } as const;
    if (resolved.binding.customizationRevision !== input.deliveryRevision) {
      return { status: "DELIVERY_REVISION_MISMATCH" as const, code: "DELIVERY_REVISION_MISMATCH", message: "Delivery option binding revision is stale." };
    }
    throw new Error("Delivery selection commit belongs to the post-checkout fulfillment cutover");
  }

  async deleteExpired(now: string): Promise<number> {
    const rows = await this.connection.delete(checkoutOptionBindings).where(lt(checkoutOptionBindings.expiresAt, now)).returning({ id: checkoutOptionBindings.id });
    return rows.length;
  }
}
