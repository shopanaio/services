import { and, eq, inArray, or } from "drizzle-orm";
import type { NotificationChannel, NotificationDefinitionKey } from "@shopana/broker-types";
import { BaseRepository } from "../BaseRepository.js";
import { notificationChannelSettings, notificationDefinitionSettings } from "../models/index.js";

export class SettingsRepository extends BaseRepository {
  async getDefinitionSetting(key: NotificationDefinitionKey) {
    const rows = await this.connection
      .select()
      .from(notificationDefinitionSettings)
      .where(
        and(
          eq(notificationDefinitionSettings.storeId, this.storeId),
          eq(notificationDefinitionSettings.definitionKey, key),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listDefinitionSettings() {
    return this.connection
      .select()
      .from(notificationDefinitionSettings)
      .where(eq(notificationDefinitionSettings.storeId, this.storeId));
  }

  async getDefinitionSettings(keys: readonly NotificationDefinitionKey[]) {
    return this.connection
      .select()
      .from(notificationDefinitionSettings)
      .where(
        and(
          eq(notificationDefinitionSettings.storeId, this.storeId),
          inArray(notificationDefinitionSettings.definitionKey, [...keys]),
        ),
      );
  }

  async setDefinitionEnabled(input: {
    key: NotificationDefinitionKey;
    enabled: boolean;

    updatedBy?: string;
  }) {
    const current = await this.getDefinitionSetting(input.key);
    if (!current) {
      const rows = await this.connection
        .insert(notificationDefinitionSettings)
        .values({
          storeId: this.storeId,
          definitionKey: input.key,
          enabled: input.enabled,
          updatedBy: input.updatedBy,
        })
        .returning();
      return rows[0]!;
    }
    const rows = await this.connection
      .update(notificationDefinitionSettings)
      .set({
        enabled: input.enabled,
        version: current.version + 1,
        updatedBy: input.updatedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(notificationDefinitionSettings.storeId, this.storeId),
          eq(notificationDefinitionSettings.definitionKey, input.key),
        ),
      )
      .returning();
    if (!rows[0]) throw new Error("VERSION_CONFLICT");
    return rows[0];
  }

  async getChannelSetting(key: NotificationDefinitionKey, channel: NotificationChannel) {
    const rows = await this.connection
      .select()
      .from(notificationChannelSettings)
      .where(
        and(
          eq(notificationChannelSettings.storeId, this.storeId),
          eq(notificationChannelSettings.definitionKey, key),
          eq(notificationChannelSettings.channel, channel),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listChannelSettings(key?: NotificationDefinitionKey) {
    const where = key
      ? and(
          eq(notificationChannelSettings.storeId, this.storeId),
          eq(notificationChannelSettings.definitionKey, key),
        )
      : eq(notificationChannelSettings.storeId, this.storeId);
    return this.connection.select().from(notificationChannelSettings).where(where);
  }

  async getChannelSettings(
    keys: readonly {
      key: NotificationDefinitionKey;
      channel: NotificationChannel;
    }[],
  ) {
    return this.connection
      .select()
      .from(notificationChannelSettings)
      .where(
        and(
          eq(notificationChannelSettings.storeId, this.storeId),
          or(
            ...keys.map(({ key, channel }) =>
              and(
                eq(notificationChannelSettings.definitionKey, key),
                eq(notificationChannelSettings.channel, channel),
              ),
            ),
          ),
        ),
      );
  }

  async setChannelEnabled(input: {
    key: NotificationDefinitionKey;
    channel: NotificationChannel;
    enabled: boolean;

    senderName?: string;
    senderEmail?: string;
    replyTo?: string;
  }) {
    const current = await this.getChannelSetting(input.key, input.channel);
    if (!current) {
      const rows = await this.connection
        .insert(notificationChannelSettings)
        .values({
          storeId: this.storeId,
          definitionKey: input.key,
          channel: input.channel,
          enabled: input.enabled,
          senderName: input.senderName,
          senderEmail: input.senderEmail,
          replyTo: input.replyTo,
        })
        .returning();
      return rows[0]!;
    }
    const rows = await this.connection
      .update(notificationChannelSettings)
      .set({
        enabled: input.enabled,
        senderName: input.senderName ?? current.senderName,
        senderEmail: input.senderEmail ?? current.senderEmail,
        replyTo: input.replyTo ?? current.replyTo,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(notificationChannelSettings.storeId, this.storeId),
          eq(notificationChannelSettings.definitionKey, input.key),
          eq(notificationChannelSettings.channel, input.channel),
        ),
      )
      .returning();
    if (!rows[0]) throw new Error("VERSION_CONFLICT");
    return rows[0];
  }
}
