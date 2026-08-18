import { and, eq, lt, sql } from "drizzle-orm";
import type { Delivery, Pricing } from "@shopana/broker-types";
import type { DeliveryOptionBindingCandidate, DeliveryOptionBindingResolution, DeliveryOptionBindingsPort } from "../contracts/ports.js";
import { BaseRepository } from "./BaseRepository.js";
import { checkoutOptionBindings, checkoutSelectionCommitments } from "./models/index.js";
import { revision } from "../domain/canonical.js";

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
          deliveryRevision: input.deliveryRevision, option: candidate.option, snapshot: binding,
          expiresAt: input.retainUntil,
        }).onConflictDoUpdate({
          target: [checkoutOptionBindings.storeId, checkoutOptionBindings.checkoutId, checkoutOptionBindings.targetCheckoutVersion, checkoutOptionBindings.groupId, checkoutOptionBindings.optionHandle],
          set: { option: candidate.option, snapshot: binding, expiresAt: input.retainUntil },
        });
      }
      return { status: "STAGED" as const };
    });
  }

  async resolve(input: { storeId: string; checkoutId: string; checkoutVersion: number; groupId: string; optionHandle: string; effectiveAt: string }): Promise<DeliveryOptionBindingResolution> {
    const [row] = await this.connection.select({ snapshot: checkoutOptionBindings.snapshot, option: checkoutOptionBindings.option, deliveryRevision: checkoutOptionBindings.deliveryRevision, expiresAt: checkoutOptionBindings.expiresAt })
      .from(checkoutOptionBindings).where(and(
        eq(checkoutOptionBindings.storeId, input.storeId), eq(checkoutOptionBindings.checkoutId, input.checkoutId),
        eq(checkoutOptionBindings.targetCheckoutVersion, input.checkoutVersion), eq(checkoutOptionBindings.groupId, input.groupId),
        eq(checkoutOptionBindings.optionHandle, input.optionHandle),
      )).limit(1);
    if (!row) return { status: "NOT_FOUND" };
    if (Date.parse(row.expiresAt) <= Date.parse(input.effectiveAt)) return { status: "EXPIRED" };
    return { status: "FOUND", binding: row.snapshot, option: row.option, deliveryRevision: row.deliveryRevision };
  }

  async commitSelection(input: { organizationId: string; storeId: string; checkoutId: string; checkoutVersion: number; groupId: string; optionHandle: string; deliveryRevision: string; customerInput: Pricing.PricingCheckoutJsonObject | null; recipient: Delivery.DeliveryProviderContact; shipmentProvider: { providerAccountId: string; configurationRevision: string } | null; effectiveAt: string; idempotencyKey: string }) {
    return this.txManager.run(async () => {
      await this.connection.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.storeId}:${input.checkoutId}:${input.checkoutVersion}:${input.groupId}`}, 0))`);
      const resolved = await this.resolve(input);
      if (resolved.status !== "FOUND") return { status: resolved.status, code: `DELIVERY_BINDING_${resolved.status}`, message: "Delivery option binding is unavailable." } as const;
      if (resolved.deliveryRevision !== input.deliveryRevision) {
        return { status: "DELIVERY_REVISION_MISMATCH" as const, code: "DELIVERY_REVISION_MISMATCH", message: "Delivery option binding revision is stale." };
      }
      if (resolved.binding.customerInputContract === null && input.customerInput !== null) {
        return { status: "CUSTOMER_INPUT_INVALID" as const, code: "DELIVERY_CUSTOMER_INPUT_UNEXPECTED", message: "The selected delivery option does not accept customer input." };
      }
      if (resolved.option.phoneRequired && !input.recipient.phone?.trim()) {
        return { status: "CUSTOMER_INPUT_INVALID" as const, code: "DELIVERY_RECIPIENT_PHONE_REQUIRED", message: "The selected delivery option requires a recipient phone number." };
      }
      const requestHash = revision("dcommit_request_v1", {
        organizationId: input.organizationId, checkoutId: input.checkoutId, checkoutVersion: input.checkoutVersion, groupId: input.groupId,
        optionHandle: input.optionHandle, deliveryRevision: input.deliveryRevision, customerInput: input.customerInput,
        recipient: input.recipient, shipmentProvider: input.shipmentProvider,
      });
      const [existing] = await this.connection.select().from(checkoutSelectionCommitments).where(and(
        eq(checkoutSelectionCommitments.storeId, input.storeId), eq(checkoutSelectionCommitments.checkoutId, input.checkoutId),
        eq(checkoutSelectionCommitments.checkoutVersion, input.checkoutVersion), eq(checkoutSelectionCommitments.groupId, input.groupId),
      )).limit(1).for("update");
      if (existing) {
        if (existing.requestHash !== requestHash) return { status: "IDEMPOTENCY_CONFLICT" as const, code: "DELIVERY_COMMITMENT_CONFLICT", message: "The delivery selection was already committed with different input." };
        return { status: "COMMITTED" as const, commitment: existing.snapshot, duplicate: true };
      }
      if (resolved.option.deliveryMethodType === "NONE") {
        return { status: "CUSTOMER_INPUT_INVALID" as const, code: "DELIVERY_METHOD_NOT_SHIPPABLE", message: "A non-delivery option cannot be committed for fulfillment." };
      }
      const commitmentId = await this.generateUuidV7();
      const customerInputHash = input.customerInput === null ? null : revision("dcustomer_v1", input.customerInput);
      const common = {
        commitmentId, committedAt: input.effectiveAt, checkoutVersion: input.checkoutVersion, deliveryRevision: input.deliveryRevision,
        methodDefinitionId: resolved.binding.methodDefinitionId, code: resolved.option.code, presentedName: resolved.option.title,
        methodType: resolved.option.deliveryMethodType, cost: resolved.option.cost, estimatedMinDeliveryAt: resolved.option.estimatedMinDeliveryAt,
        estimatedMaxDeliveryAt: resolved.option.estimatedMaxDeliveryAt, ratedFactsHash: resolved.binding.ratedFactsHash,
        originalOptionHandle: input.optionHandle, customerInput: input.customerInput, customerInputHash,
        additionalInformation: resolved.option.publicData,
      } as const;
      const deliveryMethod: Delivery.DeliveryCommittedMethodSnapshot = resolved.binding.source === "MANUAL"
        ? { ...common, source: "MANUAL", serviceCode: resolved.option.code, carrierServiceAccountId: null, carrierCode: null, carrierServiceConfigurationRevision: null, quoteRevision: null }
        : { ...common, source: "CARRIER_SERVICE", serviceCode: resolved.binding.serviceCode, carrierServiceAccountId: resolved.binding.carrierServiceAccountId,
            carrierCode: resolved.binding.carrierCode, carrierServiceConfigurationRevision: resolved.binding.carrierServiceConfigurationRevision, quoteRevision: resolved.binding.quoteRevision };
      const commitment: Delivery.DeliveryCommittedGroupSnapshot = {
        groupId: input.groupId, lineIds: resolved.binding.fulfillment.lineIds, deliveryMethod, shipmentProvider: input.shipmentProvider,
        origin: resolved.binding.fulfillment.origin, destination: resolved.binding.fulfillment.destination, sender: resolved.binding.fulfillment.sender,
        recipient: input.recipient, packages: resolved.binding.fulfillment.packages,
      };
      await this.connection.insert(checkoutSelectionCommitments).values({
        id: commitmentId, organizationId: input.organizationId, storeId: input.storeId, checkoutId: input.checkoutId,
        checkoutVersion: input.checkoutVersion, groupId: input.groupId, idempotencyKey: input.idempotencyKey,
        requestHash, snapshot: commitment, committedAt: input.effectiveAt,
      });
      return { status: "COMMITTED" as const, commitment, duplicate: false };
    });
  }

  async deleteExpired(now: string): Promise<number> {
    const rows = await this.connection.delete(checkoutOptionBindings).where(lt(checkoutOptionBindings.expiresAt, now)).returning({ id: checkoutOptionBindings.id });
    return rows.length;
  }
}
