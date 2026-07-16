import { ReadOnly } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  customerExternalReference,
  type CustomerExternalReference,
  type NewCustomerExternalReference,
} from "../models/index.js";

export type CustomerExternalReferenceUpsertData = Omit<
  NewCustomerExternalReference,
  "id" | "storeId" | "createdAt" | "updatedAt" | "deletedAt"
>;

export class CustomerExternalReferenceRepository extends BaseRepository {
  @ReadOnly()
  async findById(id: string): Promise<CustomerExternalReference | null> {
    const rows = await this.connection
      .select()
      .from(customerExternalReference)
      .where(
        and(
          eq(customerExternalReference.storeId, this.storeId),
          eq(customerExternalReference.id, id),
          isNull(customerExternalReference.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findByExternalKey(input: {
    externalSystem: string;
    externalType?: string;
    externalId: string;
  }): Promise<CustomerExternalReference | null> {
    const rows = await this.connection
      .select()
      .from(customerExternalReference)
      .where(
        and(
          eq(customerExternalReference.storeId, this.storeId),
          eq(customerExternalReference.externalSystem, input.externalSystem),
          eq(customerExternalReference.externalType, input.externalType ?? "customer"),
          eq(customerExternalReference.externalId, input.externalId),
          isNull(customerExternalReference.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByCustomerIds(
    customerIds: readonly string[]
  ): Promise<CustomerExternalReference[]> {
    if (customerIds.length === 0) return [];
    return this.connection
      .select()
      .from(customerExternalReference)
      .where(
        and(
          eq(customerExternalReference.storeId, this.storeId),
          inArray(customerExternalReference.customerId, [...new Set(customerIds)]),
          isNull(customerExternalReference.deletedAt)
        )
      );
  }

  async upsert(
    data: CustomerExternalReferenceUpsertData
  ): Promise<CustomerExternalReference> {
    const now = new Date().toISOString();
    const current = await this.findByExternalKey(data);
    const row: NewCustomerExternalReference = {
      ...data,
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      externalSystem: data.externalSystem.trim(),
      externalType: data.externalType?.trim() || "customer",
      externalId: data.externalId.trim(),
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const rows = current
      ? await this.connection
        .update(customerExternalReference)
        .set({
          customerId: row.customerId,
          metadata: row.metadata,
          deletedAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(customerExternalReference.storeId, this.storeId),
            eq(customerExternalReference.id, current.id)
          )
        )
        .returning()
      : await this.connection
        .insert(customerExternalReference)
        .values(row)
        .returning();
    return rows[0];
  }

  async softDelete(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(customerExternalReference)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(customerExternalReference.storeId, this.storeId),
          eq(customerExternalReference.id, id),
          isNull(customerExternalReference.deletedAt)
        )
      )
      .returning({ id: customerExternalReference.id });
    return rows.length > 0;
  }
}
