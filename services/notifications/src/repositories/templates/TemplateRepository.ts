import { and, eq, max, or } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { NotificationChannel, NotificationDefinitionKey } from "@shopana/broker-types";
import { BaseRepository } from "../BaseRepository.js";
import {
  notificationTemplateActiveRevisions,
  notificationTemplateRevisions,
} from "../models/index.js";

export class TemplateRepository extends BaseRepository {
  async createRevision(input: {
    key: NotificationDefinitionKey;
    channel: NotificationChannel;
    locale: string;
    subjectTemplate?: string;
    bodyTemplate: string;
    plainTextTemplate?: string;
    createdBy?: string;
  }) {
    const [aggregate] = await this.connection
      .select({ revision: max(notificationTemplateRevisions.revision) })
      .from(notificationTemplateRevisions)
      .where(
        and(
          eq(notificationTemplateRevisions.storeId, this.storeId),
          eq(notificationTemplateRevisions.definitionKey, input.key),
          eq(notificationTemplateRevisions.channel, input.channel),
          eq(notificationTemplateRevisions.locale, input.locale),
        ),
      );
    const revision = (aggregate?.revision ?? 0) + 1;
    const sourceHash = createHash("sha256")
      .update(
        JSON.stringify({
          subject: input.subjectTemplate,
          body: input.bodyTemplate,
          text: input.plainTextTemplate,
        }),
      )
      .digest("hex");
    const rows = await this.connection
      .insert(notificationTemplateRevisions)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        definitionKey: input.key,
        channel: input.channel,
        locale: input.locale,
        revision,
        subjectTemplate: input.subjectTemplate,
        bodyTemplate: input.bodyTemplate,
        plainTextTemplate: input.plainTextTemplate,
        sourceHash,
        validationStatus: "VALID",
        createdBy: input.createdBy,
      })
      .returning();
    return rows[0]!;
  }

  async findRevision(id: string) {
    const rows = await this.connection
      .select()
      .from(notificationTemplateRevisions)
      .where(
        and(
          eq(notificationTemplateRevisions.storeId, this.storeId),
          eq(notificationTemplateRevisions.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async activate(input: { revisionId: string; updatedBy?: string }) {
    const revision = await this.findRevision(input.revisionId);
    if (!revision) throw new Error("TEMPLATE_REVISION_NOT_FOUND");
    const identity = and(
      eq(notificationTemplateActiveRevisions.storeId, this.storeId),
      eq(notificationTemplateActiveRevisions.definitionKey, revision.definitionKey),
      eq(notificationTemplateActiveRevisions.channel, revision.channel),
      eq(notificationTemplateActiveRevisions.locale, revision.locale),
    );
    const current = (
      await this.connection
        .select()
        .from(notificationTemplateActiveRevisions)
        .where(identity)
        .limit(1)
    )[0];
    if (!current) {
      const rows = await this.connection
        .insert(notificationTemplateActiveRevisions)
        .values({
          storeId: this.storeId,
          definitionKey: revision.definitionKey,
          channel: revision.channel,
          locale: revision.locale,
          revisionId: revision.id,
          updatedBy: input.updatedBy,
        })
        .returning();
      return rows[0]!;
    }
    const rows = await this.connection
      .update(notificationTemplateActiveRevisions)
      .set({
        revisionId: revision.id,
        version: current.version + 1,
        updatedBy: input.updatedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(and(identity))
      .returning();
    if (!rows[0]) throw new Error("VERSION_CONFLICT");
    return rows[0];
  }

  async findActive(key: NotificationDefinitionKey, channel: NotificationChannel, locale: string) {
    const rows = await this.connection
      .select({
        revision: notificationTemplateRevisions,
        pointerVersion: notificationTemplateActiveRevisions.version,
      })
      .from(notificationTemplateActiveRevisions)
      .innerJoin(
        notificationTemplateRevisions,
        eq(notificationTemplateRevisions.id, notificationTemplateActiveRevisions.revisionId),
      )
      .where(
        and(
          eq(notificationTemplateActiveRevisions.storeId, this.storeId),
          eq(notificationTemplateActiveRevisions.definitionKey, key),
          eq(notificationTemplateActiveRevisions.channel, channel),
          eq(notificationTemplateActiveRevisions.locale, locale),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findActiveMany(
    keys: readonly {
      key: NotificationDefinitionKey;
      channel: NotificationChannel;
      locale: string;
    }[],
  ) {
    return this.connection
      .select({
        revision: notificationTemplateRevisions,
        pointerVersion: notificationTemplateActiveRevisions.version,
      })
      .from(notificationTemplateActiveRevisions)
      .innerJoin(
        notificationTemplateRevisions,
        eq(notificationTemplateRevisions.id, notificationTemplateActiveRevisions.revisionId),
      )
      .where(
        and(
          eq(notificationTemplateActiveRevisions.storeId, this.storeId),
          or(
            ...keys.map(({ key, channel, locale }) =>
              and(
                eq(notificationTemplateActiveRevisions.definitionKey, key),
                eq(notificationTemplateActiveRevisions.channel, channel),
                eq(notificationTemplateActiveRevisions.locale, locale),
              ),
            ),
          ),
        ),
      );
  }
}
