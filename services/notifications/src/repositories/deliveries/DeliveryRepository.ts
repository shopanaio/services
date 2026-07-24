import {
  and,
  asc,
  desc,
  eq,
  inArray,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import type {
  NotificationChannel,
  NotificationDefinitionKey,
  NotificationPurpose,
  NotificationRecipientSnapshot,
} from "@shopana/broker-types";
import { BaseRepository } from "../BaseRepository.js";
import {
  notificationDeliveries,
  notificationDeliveryAttempts,
  notificationOccurrences,
  notificationRecipients,
} from "../models/index.js";

export interface MaterializeDefinitionInput {
  organizationId: string;
  definitionKey: NotificationDefinitionKey;
  sourceEventId?: string;
  sourceEventType?: string;
  sourceService: string;
  sourceIdempotencyKey: string;
  subject: { type: string; id: string };
  correlationId: string;
  data: Record<string, unknown>;
  recipients: readonly NotificationRecipientSnapshot[];
  channels: readonly NotificationChannel[];
  targets?: ReadonlyArray<{
    recipient: NotificationRecipientSnapshot;
    channels: readonly NotificationChannel[];
  }>;
  purpose: NotificationPurpose;
  locale?: string;
}

export interface MaterializeDefinitionResult {
  occurrenceId: string;
  deliveryIds: string[];
  deduplicated: boolean;
}

export interface DeliveryBundle {
  delivery: typeof notificationDeliveries.$inferSelect;
  occurrence: typeof notificationOccurrences.$inferSelect;
  recipient: {
    id: string;
    recipientRef: string | null;
    customerId: string | null;
    userId: string | null;
    email?: string;
    phone?: string;
    locale: string | null;
    displayName: string | null;
  };
  data: Record<string, unknown>;
}

export class DeliveryRepository extends BaseRepository {
  async materialize(
    input: MaterializeDefinitionInput
  ): Promise<MaterializeDefinitionResult> {
    const occurrenceId = await this.generateUuidV7();
    const inserted = await this.connection
      .insert(notificationOccurrences)
      .values({
        id: occurrenceId,
        storeId: this.storeId,
        organizationId: input.organizationId,
        definitionKey: input.definitionKey,
        sourceEventId: input.sourceEventId,
        sourceEventType: input.sourceEventType,
        sourceService: input.sourceService,
        sourceIdempotencyKey: input.sourceIdempotencyKey,
        subjectType: input.subject.type,
        subjectId: input.subject.id,
        correlationId: input.correlationId,
        dataSnapshot: this.protection.encrypt(JSON.stringify(input.data)),
        status: input.recipients.length === 0 ? "SKIPPED" : "PROCESSING",
      })
      .onConflictDoNothing({
        target: [
          notificationOccurrences.storeId,
          notificationOccurrences.sourceIdempotencyKey,
          notificationOccurrences.definitionKey,
        ],
      })
      .returning({ id: notificationOccurrences.id });

    if (!inserted[0]) {
      const existing = (
        await this.connection
          .select({ id: notificationOccurrences.id })
          .from(notificationOccurrences)
          .where(
            and(
              eq(notificationOccurrences.storeId, this.storeId),
              eq(
                notificationOccurrences.sourceIdempotencyKey,
                input.sourceIdempotencyKey
              ),
              eq(
                notificationOccurrences.definitionKey,
                input.definitionKey
              )
            )
          )
          .limit(1)
      )[0];
      if (!existing) throw new Error("Failed to resolve deduplicated occurrence");
      const deliveries = await this.connection
        .select({ id: notificationDeliveries.id })
        .from(notificationDeliveries)
        .where(
          and(
            eq(notificationDeliveries.storeId, this.storeId),
            eq(notificationDeliveries.occurrenceId, existing.id)
          )
        );
      return {
        occurrenceId: existing.id,
        deliveryIds: deliveries.map((delivery) => delivery.id),
        deduplicated: true,
      };
    }

    const rawTargets =
      input.targets ??
      input.recipients.map((recipient) => ({
        recipient,
        channels: input.channels,
      }));
    const targetsByRecipient = new Map<
      string,
      {
        recipient: NotificationRecipientSnapshot;
        recipientRef: string;
        email?: string;
        phone?: string;
        addressHash?: string;
        channels: Set<NotificationChannel>;
      }
    >();
    for (const [index, target] of rawTargets.entries()) {
      const email = target.recipient.email?.trim().toLowerCase();
      const phone = target.recipient.phone?.trim();
      const addressHash = email
        ? this.protection.hash(email)
        : phone
          ? this.protection.hash(phone)
          : undefined;
      const recipientRef =
        target.recipient.recipientId ??
        target.recipient.customerId ??
        target.recipient.userId ??
        (addressHash ? `address:${addressHash}` : `recipient-${index}`);
      const existing = targetsByRecipient.get(recipientRef);
      if (existing) {
        for (const channel of target.channels) {
          existing.channels.add(channel);
        }
        continue;
      }
      targetsByRecipient.set(recipientRef, {
        recipient: target.recipient,
        recipientRef,
        email,
        phone,
        addressHash,
        channels: new Set(target.channels),
      });
    }
    const deliveryIds: string[] = [];
    for (const target of targetsByRecipient.values()) {
      const recipient = target.recipient;
      const recipientId = await this.generateUuidV7();
      const { email, phone } = target;
      await this.connection.insert(notificationRecipients).values({
        id: recipientId,
        storeId: this.storeId,
        occurrenceId,
        recipientRef: target.recipientRef,
        customerId: recipient.customerId,
        userId: recipient.userId,
        emailCiphertext: email
          ? this.protection.encrypt(email)
          : undefined,
        phoneCiphertext: phone
          ? this.protection.encrypt(phone)
          : undefined,
        addressHash: target.addressHash,
        locale: recipient.locale ?? input.locale,
        displayName: recipient.name,
      });

      for (const channel of target.channels) {
        const deliveryId = await this.generateUuidV7();
        const missingAddress =
          (channel === "EMAIL" && !email) ||
          (channel === "SMS" && !phone) ||
          (channel === "WEBHOOK" && !recipient.recipientId);
        const invalidAddress = Boolean(
          (channel === "EMAIL" && email && !isValidEmail(email)) ||
            (channel === "SMS" && phone && !isValidPhone(phone))
        );
        await this.connection.insert(notificationDeliveries).values({
          id: deliveryId,
          storeId: this.storeId,
          occurrenceId,
          recipientId,
          channel,
          purpose: input.purpose,
          status: missingAddress
            ? "SKIPPED"
            : invalidAddress
              ? "FAILED_PERMANENT"
              : "PENDING",
          locale: recipient.locale ?? input.locale,
          idempotencyKey: deliveryId,
          lastErrorKind: missingAddress
            ? "SKIPPED_MISSING_ADDRESS"
            : invalidAddress
              ? "VALIDATION"
              : undefined,
          lastErrorCode: invalidAddress
            ? "INVALID_RECIPIENT_ADDRESS"
            : undefined,
        });
        if (!missingAddress && !invalidAddress) deliveryIds.push(deliveryId);
      }
    }

    await this.refreshOccurrenceStatus(occurrenceId);
    return { occurrenceId, deliveryIds, deduplicated: false };
  }

  async getBundle(deliveryId: string): Promise<DeliveryBundle | null> {
    const rows = await this.connection
      .select({
        delivery: notificationDeliveries,
        occurrence: notificationOccurrences,
        recipient: notificationRecipients,
      })
      .from(notificationDeliveries)
      .innerJoin(
        notificationOccurrences,
        eq(notificationOccurrences.id, notificationDeliveries.occurrenceId)
      )
      .innerJoin(
        notificationRecipients,
        eq(notificationRecipients.id, notificationDeliveries.recipientId)
      )
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          eq(notificationDeliveries.id, deliveryId),
          eq(notificationOccurrences.storeId, this.storeId),
          eq(notificationRecipients.storeId, this.storeId)
        )
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      delivery: row.delivery,
      occurrence: row.occurrence,
      recipient: {
        id: row.recipient.id,
        recipientRef: row.recipient.recipientRef,
        customerId: row.recipient.customerId,
        userId: row.recipient.userId,
        email: row.recipient.emailCiphertext
          ? this.protection.decrypt(row.recipient.emailCiphertext)
          : undefined,
        phone: row.recipient.phoneCiphertext
          ? this.protection.decrypt(row.recipient.phoneCiphertext)
          : undefined,
        locale: row.recipient.locale,
        displayName: row.recipient.displayName,
      },
      data: JSON.parse(
        this.protection.decrypt(row.occurrence.dataSnapshot)
      ) as Record<string, unknown>,
    };
  }

  async claim(deliveryId: string): Promise<DeliveryBundle | null> {
    const activeAttempt = this.connection
      .select({ id: notificationDeliveryAttempts.id })
      .from(notificationDeliveryAttempts)
      .where(
        and(
          eq(
            notificationDeliveryAttempts.deliveryId,
            notificationDeliveries.id
          ),
          eq(notificationDeliveryAttempts.status, "STARTED")
        )
      );
    const rows = await this.connection
      .update(notificationDeliveries)
      .set({ status: "RENDERING", updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          eq(notificationDeliveries.id, deliveryId),
          or(
            inArray(notificationDeliveries.status, [
              "PENDING",
              "RETRY_SCHEDULED",
            ]),
            and(
              inArray(notificationDeliveries.status, [
                "RENDERING",
                "SENDING",
              ]),
              notExists(activeAttempt)
            )
          )
        )
      )
      .returning({ id: notificationDeliveries.id });
    if (!rows[0]) return null;
    return this.getBundle(deliveryId);
  }

  async recordRendered(input: {
    deliveryId: string;
    contentHash: string;
    renderedContent: Record<string, unknown>;
    templateRevisionId?: string;
    templateSourceVersion?: string;
    locale: string;
  }): Promise<void> {
    await this.connection
      .update(notificationDeliveries)
      .set({
        contentHash: input.contentHash,
        renderedContent: this.protection.encrypt(
          JSON.stringify(input.renderedContent)
        ),
        templateRevisionId: input.templateRevisionId,
        templateSourceVersion: input.templateSourceVersion,
        locale: input.locale,
        status: "SENDING",
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          eq(notificationDeliveries.id, input.deliveryId)
        )
      );
  }

  async createAttempt(input: {
    deliveryId: string;
    workflowId: string;
  }) {
    const bundle = await this.getBundle(input.deliveryId);
    if (!bundle) throw new Error("DELIVERY_NOT_FOUND");
    const attemptNumber = bundle.delivery.attemptCount + 1;
    const id = await this.generateUuidV7();
    await this.connection.insert(notificationDeliveryAttempts).values({
      id,
      storeId: this.storeId,
      deliveryId: input.deliveryId,
      attemptNumber,
      workflowId: input.workflowId,
    });
    await this.connection
      .update(notificationDeliveries)
      .set({
        attemptCount: attemptNumber,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          eq(notificationDeliveries.id, input.deliveryId)
        )
      );
    return { id, attemptNumber };
  }

  async recordSuccess(input: {
    deliveryId: string;
    attemptId: string;
    state: "ACCEPTED" | "DELIVERED";
    providerCode: string;
    providerSlotId: string;
    providerMessageId?: string;
    responseCode?: string;
  }): Promise<void> {
    const finishedAt = new Date().toISOString();
    await this.connection
      .update(notificationDeliveryAttempts)
      .set({
        status: input.state,
        providerCode: input.providerCode,
        providerSlotId: input.providerSlotId,
        providerMessageId: input.providerMessageId,
        providerResponseCode: input.responseCode,
        finishedAt,
      })
      .where(
        and(
          eq(notificationDeliveryAttempts.storeId, this.storeId),
          eq(notificationDeliveryAttempts.id, input.attemptId)
        )
      );
    const bundle = await this.getBundle(input.deliveryId);
    await this.connection
      .update(notificationDeliveries)
      .set({
        status: input.state,
        providerCode: input.providerCode,
        providerSlotId: input.providerSlotId,
        providerMessageId: input.providerMessageId,
        renderedContent:
          input.state === "DELIVERED" ? null : bundle?.delivery.renderedContent,
        nextAttemptAt: null,
        lastErrorKind: null,
        lastErrorCode: null,
        updatedAt: finishedAt,
      })
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          eq(notificationDeliveries.id, input.deliveryId)
        )
      );
    if (bundle) await this.refreshOccurrenceStatus(bundle.occurrence.id);
  }

  async recordPreflightFailure(input: {
    deliveryId: string;
    errorKind: string;
    errorCode: string;
  }): Promise<void> {
    const bundle = await this.getBundle(input.deliveryId);
    if (!bundle) return;
    await this.connection
      .update(notificationDeliveries)
      .set({
        status: "FAILED_PERMANENT",
        lastErrorKind: input.errorKind,
        lastErrorCode: input.errorCode,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          eq(notificationDeliveries.id, input.deliveryId)
        )
      );
    await this.refreshOccurrenceStatus(bundle.occurrence.id);
  }

  async recordFailure(input: {
    deliveryId: string;
    attemptId: string;
    status:
      | "RETRY_SCHEDULED"
      | "UNKNOWN"
      | "FAILED_PERMANENT"
      | "DEAD"
      | "BLOCKED_NO_PROVIDER";
    errorKind: string;
    errorCode?: string;
    providerCode?: string;
    providerSlotId?: string;
    providerMessageId?: string;
    nextAttemptAt?: string;
    diagnostics?: Record<string, unknown>;
  }): Promise<void> {
    const finishedAt = new Date().toISOString();
    await this.connection
      .update(notificationDeliveryAttempts)
      .set({
        status: input.status === "UNKNOWN" ? "UNKNOWN" : "FAILED",
        errorKind: input.errorKind,
        errorCode: input.errorCode,
        providerCode: input.providerCode,
        providerSlotId: input.providerSlotId,
        providerMessageId: input.providerMessageId,
        diagnostics: input.diagnostics ?? {},
        finishedAt,
      })
      .where(
        and(
          eq(notificationDeliveryAttempts.storeId, this.storeId),
          eq(notificationDeliveryAttempts.id, input.attemptId)
        )
      );
    const bundle = await this.getBundle(input.deliveryId);
    await this.connection
      .update(notificationDeliveries)
      .set({
        status: input.status,
        providerCode: input.providerCode,
        providerSlotId: input.providerSlotId,
        providerMessageId: input.providerMessageId,
        nextAttemptAt: input.nextAttemptAt,
        lastErrorKind: input.errorKind,
        lastErrorCode: input.errorCode,
        updatedAt: finishedAt,
      })
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          eq(notificationDeliveries.id, input.deliveryId)
        )
      );
    if (bundle) await this.refreshOccurrenceStatus(bundle.occurrence.id);
  }

  async prepareRetry(deliveryId: string): Promise<boolean> {
    const rows = await this.connection
      .update(notificationDeliveries)
      .set({
        status: "PENDING",
        nextAttemptAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          eq(notificationDeliveries.id, deliveryId),
          inArray(notificationDeliveries.status, [
            "RETRY_SCHEDULED",
            "FAILED_PERMANENT",
            "DEAD",
            "UNKNOWN",
            "BLOCKED_NO_PROVIDER",
          ])
        )
      )
      .returning({ id: notificationDeliveries.id });
    return rows.length === 1;
  }

  async cancel(deliveryId: string): Promise<boolean> {
    const rows = await this.connection
      .update(notificationDeliveries)
      .set({ status: "CANCELLED", updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          eq(notificationDeliveries.id, deliveryId),
          inArray(notificationDeliveries.status, [
            "PENDING",
            "RETRY_SCHEDULED",
          ])
        )
      )
      .returning({
        id: notificationDeliveries.id,
        occurrenceId: notificationDeliveries.occurrenceId,
      });
    if (rows[0]) await this.refreshOccurrenceStatus(rows[0].occurrenceId);
    return rows.length === 1;
  }

  async listDeliveries(limit = 100) {
    return this.connection
      .select({
        delivery: notificationDeliveries,
        definitionKey: notificationOccurrences.definitionKey,
        sourceEventType: notificationOccurrences.sourceEventType,
        correlationId: notificationOccurrences.correlationId,
      })
      .from(notificationDeliveries)
      .innerJoin(
        notificationOccurrences,
        eq(notificationOccurrences.id, notificationDeliveries.occurrenceId)
      )
      .where(eq(notificationDeliveries.storeId, this.storeId))
      .orderBy(desc(notificationDeliveries.createdAt))
      .limit(Math.min(Math.max(limit, 1), 500));
  }

  async listAttempts(deliveryId: string) {
    return this.connection
      .select()
      .from(notificationDeliveryAttempts)
      .where(
        and(
          eq(notificationDeliveryAttempts.storeId, this.storeId),
          eq(notificationDeliveryAttempts.deliveryId, deliveryId)
        )
      )
      .orderBy(desc(notificationDeliveryAttempts.attemptNumber));
  }

  async getOperationalSnapshot() {
    const activeStatuses = [
      "PENDING",
      "RENDERING",
      "SENDING",
      "RETRY_SCHEDULED",
      "UNKNOWN",
      "BLOCKED_NO_PROVIDER",
    ] as const;
    const activeStatusSet = new Set<string>(activeStatuses);
    const [counts, oldest] = await Promise.all([
      this.connection
        .select({
          status: notificationDeliveries.status,
          count: sql<number>`count(*)::int`,
        })
        .from(notificationDeliveries)
        .where(eq(notificationDeliveries.storeId, this.storeId))
        .groupBy(notificationDeliveries.status),
      this.connection
        .select({ createdAt: notificationDeliveries.createdAt })
        .from(notificationDeliveries)
        .where(
          and(
            eq(notificationDeliveries.storeId, this.storeId),
            inArray(notificationDeliveries.status, activeStatuses)
          )
        )
        .orderBy(asc(notificationDeliveries.createdAt))
        .limit(1),
    ]);
    return {
      counts,
      queueDepth: counts
        .filter(({ status }) => activeStatusSet.has(status))
        .reduce((total, entry) => total + Number(entry.count), 0),
      oldestPendingAt: oldest[0]?.createdAt ?? null,
    };
  }

  private async refreshOccurrenceStatus(occurrenceId: string): Promise<void> {
    const rows = await this.connection
      .select({
        total: sql<number>`count(*)::int`,
        succeeded: sql<number>`count(*) FILTER (WHERE ${notificationDeliveries.status} IN ('ACCEPTED', 'DELIVERED'))::int`,
        active: sql<number>`count(*) FILTER (WHERE ${notificationDeliveries.status} IN ('PENDING', 'RENDERING', 'SENDING', 'RETRY_SCHEDULED'))::int`,
        failed: sql<number>`count(*) FILTER (WHERE ${notificationDeliveries.status} IN ('UNKNOWN', 'FAILED_PERMANENT', 'DEAD', 'BLOCKED_NO_PROVIDER'))::int`,
      })
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          eq(notificationDeliveries.occurrenceId, occurrenceId)
        )
      );
    const counts = rows[0] ?? { total: 0, succeeded: 0, active: 0, failed: 0 };
    const status =
      counts.total === 0
        ? "SKIPPED"
        : counts.active > 0
          ? "PROCESSING"
          : counts.failed === 0
            ? counts.succeeded > 0
              ? "COMPLETED"
              : "SKIPPED"
            : counts.succeeded > 0
              ? "PARTIAL"
              : "FAILED";
    await this.connection
      .update(notificationOccurrences)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(notificationOccurrences.storeId, this.storeId),
          eq(notificationOccurrences.id, occurrenceId)
        )
      );
  }
}

function isValidEmail(value: string): boolean {
  return (
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function isValidPhone(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
