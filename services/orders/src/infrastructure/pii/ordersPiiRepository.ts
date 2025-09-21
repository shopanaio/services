import type { SQLExecutor } from "@event-driven-io/dumbo";
import { rawSql } from "@event-driven-io/dumbo";
import { knex } from "@src/infrastructure/db/knex";
import { dumboPool } from "@src/infrastructure/db/dumbo";

export type OrderContactPII = {
  projectId: string;
  orderId: string;
  customerEmail: string | null;
  customerPhoneE164: string | null;
  customerNote: string | null;
  expiresAt?: Date | null;
};

export type DeliveryAddressPII = {
  id: string; // pre-generated UUID (v7 recommended)
  projectId: string;
  orderId: string;
  deliveryGroupId: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  countryCode: string;
  provinceCode?: string | null;
  postalCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Repository to persist Order-related PII into dedicated tables.
 * Keeps PII out of event store payloads while allowing authorized read models to enrich views.
 */
export class OrdersPiiRepository {
  private readonly execute: SQLExecutor;

  constructor(executor: SQLExecutor = dumboPool.execute) {
    this.execute = executor;
  }

  /**
   * Upserts per-order contact PII (email/phone/note).
   */
  async upsertOrderContacts(input: OrderContactPII): Promise<void> {
    const q = knex
      .withSchema("platform")
      .table("orders_pii_records")
      .insert({
        project_id: input.projectId,
        order_id: input.orderId,
        customer_email: input.customerEmail,
        customer_phone_e164: input.customerPhoneE164,
        customer_note: input.customerNote,
        expires_at: input.expiresAt ?? null,
      })
      .onConflict(["order_id"]) // one row per order
      .merge({
        customer_email: knex.raw("EXCLUDED.customer_email"),
        customer_phone_e164: knex.raw("EXCLUDED.customer_phone_e164"),
        customer_note: knex.raw("EXCLUDED.customer_note"),
        expires_at: knex.raw("EXCLUDED.expires_at"),
        updated_at: knex.raw("now()"),
      })
      .toString();
    await this.execute.command(rawSql(q));
  }

  /**
   * Inserts delivery addresses for delivery groups and returns their ids mapping.
   */
  async insertDeliveryAddresses(
    addresses: DeliveryAddressPII[]
  ): Promise<{ id: string; deliveryGroupId: string | null }[]> {
    if (addresses.length === 0) return [];

    const rows = addresses.map((a) => ({
      id: a.id,
      project_id: a.projectId,
      order_id: a.orderId,
      delivery_group_id: a.deliveryGroupId,
      address1: a.address1,
      address2: a.address2 ?? null,
      city: a.city,
      country_code: a.countryCode,
      province_code: a.provinceCode ?? null,
      postal_code: a.postalCode ?? null,
      first_name: a.firstName ?? null,
      last_name: a.lastName ?? null,
      email: a.email ?? null,
      phone: a.phone ?? null,
      metadata: (a.metadata ?? null) as any,
    }));

    const q = knex
      .withSchema("platform")
      .table("order_delivery_addresses")
      .insert(rows)
      .toString();
    await this.execute.command(rawSql(q));

    return addresses.map((a) => ({ id: a.id, deliveryGroupId: a.deliveryGroupId }));
  }
}

