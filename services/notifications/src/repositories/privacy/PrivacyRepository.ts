import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  notLike,
  or,
  sql,
} from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  notificationDeliveries,
  notificationOccurrences,
  notificationRecipients,
  webhookSecretVersions,
} from "../models/index.js";

const RETENTION_BATCH_SIZE = 500;

export interface RetentionCleanupResult {
  occurrencesPurged: number;
  renderedDeliveriesPurged: number;
  webhookSecretsPurged: number;
}

export class PrivacyRepository extends BaseRepository {
  async purgeCustomer(customerId: string): Promise<number> {
    const occurrences = await this.connection
      .select({ id: notificationRecipients.occurrenceId })
      .from(notificationRecipients)
      .where(
        and(
          eq(notificationRecipients.storeId, this.storeId),
          eq(notificationRecipients.customerId, customerId)
        )
      );
    const occurrenceIds = [...new Set(occurrences.map(({ id }) => id))];
    if (occurrenceIds.length === 0) return 0;

    await this.connection
      .update(notificationDeliveries)
      .set({ renderedContent: null, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(notificationDeliveries.storeId, this.storeId),
          inArray(notificationDeliveries.occurrenceId, occurrenceIds)
        )
      );
    await this.connection
      .update(notificationRecipients)
      .set({
        recipientRef: sql<string>`'purged:' || ${notificationRecipients.id}::text`,
        customerId: null,
        userId: null,
        emailCiphertext: null,
        phoneCiphertext: null,
        addressHash: null,
        displayName: null,
        suppressionResult: "PII_PURGED_CUSTOMER_DELETED",
      })
      .where(
        and(
          eq(notificationRecipients.storeId, this.storeId),
          eq(notificationRecipients.customerId, customerId)
        )
      );
    await this.connection
      .update(notificationOccurrences)
      .set({
        dataSnapshot: this.redactedSnapshot("customer_deleted"),
        piiPurgedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(notificationOccurrences.storeId, this.storeId),
          inArray(notificationOccurrences.id, occurrenceIds)
        )
      );
    return occurrenceIds.length;
  }

  async runRetentionCleanup(input: {
    authenticationCutoff: string;
    defaultCutoff: string;
    authenticationRenderedCutoff: string;
    defaultRenderedCutoff: string;
  }): Promise<RetentionCleanupResult> {
    const occurrences = await this.connection
      .select({ id: notificationOccurrences.id })
      .from(notificationOccurrences)
      .where(
        and(
          isNull(notificationOccurrences.piiPurgedAt),
          or(
            and(
              like(
                notificationOccurrences.definitionKey,
                "customer.auth.%"
              ),
              lte(notificationOccurrences.createdAt, input.authenticationCutoff)
            ),
            and(
              notLike(
                notificationOccurrences.definitionKey,
                "customer.auth.%"
              ),
              lte(notificationOccurrences.createdAt, input.defaultCutoff)
            )
          )
        )
      )
      .limit(RETENTION_BATCH_SIZE);
    const occurrenceIds = occurrences.map(({ id }) => id);
    let renderedWithExpiredOccurrence = 0;
    if (occurrenceIds.length > 0) {
      await this.connection
        .update(notificationRecipients)
        .set({
          recipientRef: sql<string>`'purged:' || ${notificationRecipients.id}::text`,
          customerId: null,
          userId: null,
          emailCiphertext: null,
          phoneCiphertext: null,
          addressHash: null,
          displayName: null,
          suppressionResult: "PII_PURGED_RETENTION",
        })
        .where(inArray(notificationRecipients.occurrenceId, occurrenceIds));
      const clearedDeliveries = await this.connection
        .update(notificationDeliveries)
        .set({ renderedContent: null, updatedAt: new Date().toISOString() })
        .where(
          and(
            inArray(notificationDeliveries.occurrenceId, occurrenceIds),
            isNotNull(notificationDeliveries.renderedContent)
          )
        )
        .returning({ id: notificationDeliveries.id });
      renderedWithExpiredOccurrence = clearedDeliveries.length;
      await this.connection
        .update(notificationOccurrences)
        .set({
          dataSnapshot: this.redactedSnapshot("retention_expired"),
          piiPurgedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(inArray(notificationOccurrences.id, occurrenceIds));
    }

    const rendered = await this.connection
      .select({ id: notificationDeliveries.id })
      .from(notificationDeliveries)
      .innerJoin(
        notificationOccurrences,
        eq(notificationOccurrences.id, notificationDeliveries.occurrenceId)
      )
      .where(
        and(
          isNull(notificationOccurrences.piiPurgedAt),
          isNotNull(notificationDeliveries.renderedContent),
          or(
            and(
              like(
                notificationOccurrences.definitionKey,
                "customer.auth.%"
              ),
              lte(
                notificationDeliveries.createdAt,
                input.authenticationRenderedCutoff
              )
            ),
            and(
              notLike(
                notificationOccurrences.definitionKey,
                "customer.auth.%"
              ),
              lte(
                notificationDeliveries.createdAt,
                input.defaultRenderedCutoff
              )
            )
          )
        )
      )
      .limit(RETENTION_BATCH_SIZE);
    const renderedIds = rendered.map(({ id }) => id);
    if (renderedIds.length > 0) {
      await this.connection
        .update(notificationDeliveries)
        .set({ renderedContent: null, updatedAt: new Date().toISOString() })
        .where(inArray(notificationDeliveries.id, renderedIds));
    }

    const expiredSecrets = await this.connection
      .delete(webhookSecretVersions)
      .where(
        and(
          eq(webhookSecretVersions.active, false),
          lte(webhookSecretVersions.graceExpiresAt, new Date().toISOString())
        )
      )
      .returning({ id: webhookSecretVersions.id });

    return {
      occurrencesPurged: occurrenceIds.length,
      renderedDeliveriesPurged:
        renderedWithExpiredOccurrence + renderedIds.length,
      webhookSecretsPurged: expiredSecrets.length,
    };
  }

  private redactedSnapshot(reason: string): string {
    return this.protection.encrypt(
      JSON.stringify({ redacted: true, reason })
    );
  }
}
