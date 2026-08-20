import { sql } from "drizzle-orm";
import { orderAddresses, orderRecipients, orderContacts } from "@src/repositories/models/index";
import { BaseRepository } from "@src/repositories/BaseRepository";

export type OrderContactPII = {
  storeId: string;
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
  storeId: string;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
};

export class OrdersPiiRepository extends BaseRepository {
  async upsertOrderContacts(input: OrderContactPII): Promise<void> {
    const values = {
      storeId: input.storeId,
      orderId: input.orderId,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      middleName: input.middleName ?? null,
      type: "SHIPPING",
      email: input.customerEmail,
      phoneE164: input.customerPhoneE164,
      customerNote: input.customerNote,
      countryCode: input.countryCode ?? null,
      metadata: input.metadata ?? {},
      expiresAt: input.expiresAt?.toISOString() ?? null,
    };

    await this.connection
      .insert(orderContacts)
      .values(values)
      .onConflictDoUpdate({
        target: [orderContacts.storeId, orderContacts.orderId],
        set: { ...values, updatedAt: sql`now()` },
      });
  }

  async insertDeliveryAddresses(
    storeId: string,
    orderId: string,
    addresses: DeliveryAddressPII[],
  ): Promise<string[]> {
    if (addresses.length === 0) return [];
    await this.connection.insert(orderAddresses).values(
      addresses.map((address) => ({
        id: address.id,
        storeId,
        orderId,
        type: "SHIPPING",
        address1: address.address1,
        address2: address.address2 ?? null,
        city: address.city,
        countryCode: address.countryCode,
        provinceCode: address.provinceCode ?? null,
        postalCode: address.postalCode ?? null,
        metadata: address.metadata ?? {},
      })),
    );
    return addresses.map(({ id }) => id);
  }

  async insertRecipients(orderId: string, recipients: RecipientPII[]): Promise<string[]> {
    if (recipients.length === 0) return [];
    await this.connection.insert(orderRecipients).values(
      recipients.map((recipient) => ({
        id: recipient.id,
        storeId: recipient.storeId,
        orderId,
        firstName: recipient.firstName ?? null,
        lastName: recipient.lastName ?? null,
        middleName: recipient.middleName ?? null,
        email: recipient.email ?? null,
        phone: recipient.phone ?? null,
        metadata: recipient.metadata ?? {},
      })),
    );
    return recipients.map(({ id }) => id);
  }
}
