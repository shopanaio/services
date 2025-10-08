import type { SQLExecutor } from "@event-driven-io/dumbo";
import { rawSql } from "@event-driven-io/dumbo";
import { knex } from "@src/infrastructure/db/knex";
import { dumboPool } from "@src/infrastructure/db/dumbo";

export type OrderContactPII = {
  projectId: string;
  orderId: string;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  customerId?: string | null;
  customerEmail: string | null;
  customerPhoneE164: string | null;
  customerNote: string | null;
  countryCode?: string | null;
  metadata?: Record<string, unknown> | null;
  expiresAt?: Date | null;
};

export type DeliveryAddressPII = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  countryCode: string;
  provinceCode?: string | null;
  postalCode?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type RecipientPII = {
  id: string;
  projectId: string;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
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
   * Upserts per-order contact PII (customer identity).
   */
  async upsertOrderContacts(input: OrderContactPII): Promise<void> {
    const q = knex
      .withSchema("platform")
      .table("orders_pii_records")
      .insert({
        project_id: input.projectId,
        order_id: input.orderId,
        first_name: input.firstName ?? null,
        last_name: input.lastName ?? null,
        middle_name: input.middleName ?? null,
        customer_id: input.customerId ?? null,
        customer_email: input.customerEmail,
        customer_phone_e164: input.customerPhoneE164,
        customer_note: input.customerNote,
        country_code: input.countryCode ?? null,
        metadata: knex.raw("?::jsonb", [JSON.stringify(input.metadata ?? {})]),
        expires_at: input.expiresAt ?? null,
      })
      .onConflict(["order_id"])
      .merge({
        first_name: knex.raw("EXCLUDED.first_name"),
        last_name: knex.raw("EXCLUDED.last_name"),
        middle_name: knex.raw("EXCLUDED.middle_name"),
        customer_id: knex.raw("EXCLUDED.customer_id"),
        customer_email: knex.raw("EXCLUDED.customer_email"),
        customer_phone_e164: knex.raw("EXCLUDED.customer_phone_e164"),
        customer_note: knex.raw("EXCLUDED.customer_note"),
        country_code: knex.raw("EXCLUDED.country_code"),
        metadata: knex.raw("EXCLUDED.metadata"),
        expires_at: knex.raw("EXCLUDED.expires_at"),
        updated_at: knex.raw("now()"),
      })
      .toString();
    await this.execute.command(rawSql(q));
  }

  /**
   * Inserts delivery addresses (without PII personal data).
   */
  async insertDeliveryAddresses(
    addresses: DeliveryAddressPII[]
  ): Promise<string[]> {
    if (addresses.length === 0) return [];

    const rows = addresses.map((a) => ({
      id: a.id,
      address1: a.address1,
      address2: a.address2 ?? null,
      city: a.city,
      country_code: a.countryCode,
      province_code: a.provinceCode ?? null,
      postal_code: a.postalCode ?? null,
      metadata: knex.raw("?::jsonb", [JSON.stringify(a.metadata ?? {})]),
    }));

    const q = knex
      .withSchema("platform")
      .table("order_delivery_addresses")
      .insert(rows)
      .toString();
    await this.execute.command(rawSql(q));

    return addresses.map((a) => a.id);
  }

  /**
   * Inserts recipients (PII personal data).
   */
  async insertRecipients(recipients: RecipientPII[]): Promise<string[]> {
    if (recipients.length === 0) return [];

    const rows = recipients.map((r) => ({
      id: r.id,
      project_id: r.projectId,
      first_name: r.firstName ?? null,
      last_name: r.lastName ?? null,
      middle_name: r.middleName ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      metadata: knex.raw("?::jsonb", [JSON.stringify(r.metadata ?? {})]),
    }));

    const q = knex
      .withSchema("platform")
      .table("order_recipients")
      .insert(rows)
      .toString();
    await this.execute.command(rawSql(q));

    return recipients.map((r) => r.id);
  }
}
