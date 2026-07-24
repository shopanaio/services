import { and, eq, inArray, lte } from "drizzle-orm";
import type { NotificationDefinitionKey, NotificationRecipientSnapshot } from "@shopana/broker-types";
import { BaseRepository } from "../BaseRepository.js";
import {
  staffNotificationRecipientEvents,
  staffNotificationRecipients,
  staffNotificationSchedules,
} from "../models/index.js";

export interface StaffRecipientView {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  locale: string;
  timezone: string;
  scope: "ALL_ORDERS";
  enabled: boolean;
  eventKeys: NotificationDefinitionKey[];
  createdAt: string;
  updatedAt: string;
}

export class StaffRepository extends BaseRepository {
  async list(): Promise<StaffRecipientView[]> {
    const recipients = await this.connection
      .select()
      .from(staffNotificationRecipients)
      .where(eq(staffNotificationRecipients.storeId, this.storeId));
    if (recipients.length === 0) return [];
    const events = await this.connection
      .select()
      .from(staffNotificationRecipientEvents)
      .where(
        and(
          eq(staffNotificationRecipientEvents.storeId, this.storeId),
          inArray(
            staffNotificationRecipientEvents.recipientId,
            recipients.map((recipient) => recipient.id)
          ),
          eq(staffNotificationRecipientEvents.enabled, true)
        )
      );
    return recipients.map((recipient) => ({
      id: recipient.id,
      userId: recipient.userId,
      name: recipient.name,
      email: this.protection.decrypt(recipient.emailCiphertext),
      locale: recipient.locale,
      timezone: recipient.timezone,
      scope: recipient.scope,
      enabled: recipient.enabled,
      eventKeys: events
        .filter((event) => event.recipientId === recipient.id)
        .map((event) => event.definitionKey as NotificationDefinitionKey),
      createdAt: recipient.createdAt,
      updatedAt: recipient.updatedAt,
    }));
  }

  async upsert(input: {
    id?: string;
    userId?: string;
    name: string;
    email: string;
    locale: string;
    timezone: string;
    enabled: boolean;
    eventKeys: readonly NotificationDefinitionKey[];
  }): Promise<StaffRecipientView> {
    const values = {
      storeId: this.storeId,
      userId: input.userId,
      name: input.name,
      emailCiphertext: this.protection.encrypt(input.email),
      emailHash: this.protection.hash(input.email),
      locale: input.locale,
      timezone: input.timezone,
      enabled: input.enabled,
      updatedAt: new Date().toISOString(),
    };
    let id = input.id;
    if (id) {
      const rows = await this.connection
        .update(staffNotificationRecipients)
        .set(values)
        .where(
          and(
            eq(staffNotificationRecipients.storeId, this.storeId),
            eq(staffNotificationRecipients.id, id)
          )
        )
        .returning({ id: staffNotificationRecipients.id });
      if (!rows[0]) throw new Error("STAFF_RECIPIENT_NOT_FOUND");
    } else {
      id = await this.generateUuidV7();
      await this.connection.insert(staffNotificationRecipients).values({
        ...values,
        id,
      });
    }
    await this.connection
      .delete(staffNotificationRecipientEvents)
      .where(
        and(
          eq(staffNotificationRecipientEvents.storeId, this.storeId),
          eq(staffNotificationRecipientEvents.recipientId, id)
        )
      );
    if (input.eventKeys.length > 0) {
      await this.connection.insert(staffNotificationRecipientEvents).values(
        input.eventKeys.map((definitionKey) => ({
          storeId: this.storeId,
          recipientId: id!,
          definitionKey,
          enabled: true,
        }))
      );
    }
    return (await this.list()).find((recipient) => recipient.id === id)!;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(staffNotificationRecipients)
      .where(
        and(
          eq(staffNotificationRecipients.storeId, this.storeId),
          eq(staffNotificationRecipients.id, id)
        )
      )
      .returning({ id: staffNotificationRecipients.id });
    return rows.length === 1;
  }

  async resolveRecipients(
    key: NotificationDefinitionKey
  ): Promise<NotificationRecipientSnapshot[]> {
    const rows = await this.connection
      .select({ recipient: staffNotificationRecipients })
      .from(staffNotificationRecipients)
      .innerJoin(
        staffNotificationRecipientEvents,
        eq(
          staffNotificationRecipientEvents.recipientId,
          staffNotificationRecipients.id
        )
      )
      .where(
        and(
          eq(staffNotificationRecipients.storeId, this.storeId),
          eq(staffNotificationRecipients.enabled, true),
          eq(staffNotificationRecipientEvents.storeId, this.storeId),
          eq(staffNotificationRecipientEvents.definitionKey, key),
          eq(staffNotificationRecipientEvents.enabled, true)
        )
      );
    return rows.map(({ recipient }) => ({
      recipientId: recipient.id,
      userId: recipient.userId ?? undefined,
      name: recipient.name,
      email: this.protection.decrypt(recipient.emailCiphertext),
      locale: recipient.locale,
    }));
  }

  async getSchedule(key: NotificationDefinitionKey) {
    const rows = await this.connection
      .select()
      .from(staffNotificationSchedules)
      .where(
        and(
          eq(staffNotificationSchedules.storeId, this.storeId),
          eq(staffNotificationSchedules.definitionKey, key)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async setSchedule(input: {
    organizationId: string;
    key: NotificationDefinitionKey;
    cron: string;
    timezone: string;
    enabled: boolean;
    nextRunAt: string | null;
    expectedVersion: number;
  }) {
    const current = await this.getSchedule(input.key);
    if (!current) {
      if (input.expectedVersion !== 0) throw new Error("VERSION_CONFLICT");
      const rows = await this.connection
        .insert(staffNotificationSchedules)
        .values({
          storeId: this.storeId,
          organizationId: input.organizationId,
          definitionKey: input.key,
          cron: input.cron,
          timezone: input.timezone,
          enabled: input.enabled,
          nextRunAt: input.nextRunAt,
        })
        .returning();
      return rows[0]!;
    }
    const rows = await this.connection
      .update(staffNotificationSchedules)
      .set({
        cron: input.cron,
        timezone: input.timezone,
        enabled: input.enabled,
        nextRunAt: input.nextRunAt,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(staffNotificationSchedules.storeId, this.storeId),
          eq(staffNotificationSchedules.definitionKey, input.key),
          eq(staffNotificationSchedules.version, input.expectedVersion)
        )
      )
      .returning();
    if (!rows[0]) throw new Error("VERSION_CONFLICT");
    return rows[0];
  }

  async findDueSchedules(now: string) {
    return this.connection
      .select()
      .from(staffNotificationSchedules)
      .where(
        and(
          eq(staffNotificationSchedules.enabled, true),
          lte(staffNotificationSchedules.nextRunAt, now)
        )
      );
  }

  async claimDueSchedule(input: {
    storeId: string;
    definitionKey: string;
    nextRunAt: string;
    expectedVersion: number;
  }) {
    if (!this.txManager.isInTransaction()) {
      throw new Error("claimDueSchedule requires an active transaction");
    }
    const rows = await this.connection
      .select()
      .from(staffNotificationSchedules)
      .where(
        and(
          eq(staffNotificationSchedules.storeId, input.storeId),
          eq(
            staffNotificationSchedules.definitionKey,
            input.definitionKey
          ),
          eq(staffNotificationSchedules.enabled, true),
          eq(staffNotificationSchedules.nextRunAt, input.nextRunAt),
          eq(staffNotificationSchedules.version, input.expectedVersion)
        )
      )
      .limit(1)
      .for("update", { skipLocked: true });
    return rows[0] ?? null;
  }

  async markScheduleDispatched(input: {
    storeId: string;
    definitionKey: string;
    lastRunAt: string;
    nextRunAt: string;
    expectedVersion: number;
  }): Promise<boolean> {
    const rows = await this.connection
      .update(staffNotificationSchedules)
      .set({
        lastRunAt: input.lastRunAt,
        nextRunAt: input.nextRunAt,
        version: input.expectedVersion + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(staffNotificationSchedules.storeId, input.storeId),
          eq(
            staffNotificationSchedules.definitionKey,
            input.definitionKey
          ),
          eq(staffNotificationSchedules.version, input.expectedVersion)
        )
      )
      .returning({ storeId: staffNotificationSchedules.storeId });
    return rows.length === 1;
  }
}
