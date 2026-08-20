import { ReadOnly } from "@shopana/shared-kernel";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  customer,
  customerAddress,
  customerCheckoutProjection,
  customerComparison,
  customerComparisonItem,
  customerConsent,
  customerConsentEvent,
  customerDataRequest,
  customerExternalReference,
  customerGroup,
  customerGroupMembership,
  customerMerge,
  customerMonetaryStatistics,
  customerOrderProjection,
  customerRefundProjection,
  customerSegment,
  customerSegmentMembership,
  customerStatistics,
  customerTag,
  customerTagAssignment,
  customerTaxExemption,
  customerTaxIdentifier,
  customerWishlist,
  customerWishlistItem,
} from "../models/index.js";

export interface CustomerPrivacySnapshot {
  schemaVersion: 1;
  generatedAt: string;
  customer: typeof customer.$inferSelect;
  addresses: Array<typeof customerAddress.$inferSelect>;
  taxIdentifiers: Array<typeof customerTaxIdentifier.$inferSelect>;
  taxExemptions: Array<typeof customerTaxExemption.$inferSelect>;
  consents: Array<typeof customerConsent.$inferSelect>;
  consentEvents: Array<typeof customerConsentEvent.$inferSelect>;
  groups: Array<{
    membership: typeof customerGroupMembership.$inferSelect;
    group: Pick<typeof customerGroup.$inferSelect, "id" | "code" | "name">;
  }>;
  tags: Array<{
    assignment: typeof customerTagAssignment.$inferSelect;
    tag: Pick<typeof customerTag.$inferSelect, "id" | "name">;
  }>;
  segments: Array<{
    membership: typeof customerSegmentMembership.$inferSelect;
    segment: Pick<typeof customerSegment.$inferSelect, "id" | "name" | "type" | "status">;
  }>;
  externalReferences: Array<typeof customerExternalReference.$inferSelect>;
  statistics: typeof customerStatistics.$inferSelect | null;
  monetaryStatistics: Array<typeof customerMonetaryStatistics.$inferSelect>;
  orderProjections: Array<typeof customerOrderProjection.$inferSelect>;
  checkoutProjections: Array<typeof customerCheckoutProjection.$inferSelect>;
  refundProjections: Array<typeof customerRefundProjection.$inferSelect>;
  wishlists: Array<{
    wishlist: typeof customerWishlist.$inferSelect;
    items: Array<typeof customerWishlistItem.$inferSelect>;
  }>;
  comparison: {
    comparison: typeof customerComparison.$inferSelect;
    items: Array<typeof customerComparisonItem.$inferSelect>;
  } | null;
  dataRequests: Array<
    Pick<
      typeof customerDataRequest.$inferSelect,
      | "id"
      | "type"
      | "status"
      | "legalBasis"
      | "requestMetadata"
      | "resultFileId"
      | "rejectionReason"
      | "requestedAt"
      | "dueAt"
      | "startedAt"
      | "finishedAt"
      | "updatedAt"
    >
  >;
  merges: Array<
    Pick<
      typeof customerMerge.$inferSelect,
      | "id"
      | "sourceCustomerId"
      | "targetCustomerId"
      | "status"
      | "reason"
      | "requestedAt"
      | "startedAt"
      | "finishedAt"
      | "updatedAt"
    >
  >;
}

/** Read-only point-in-time assembly for ACCESS and EXPORT requests. */
export class CustomerPrivacyRepository extends BaseRepository {
  @ReadOnly()
  async getSnapshot(
    customerId: string,
    generatedAt: string,
  ): Promise<CustomerPrivacySnapshot | null> {
    const customerRows = await this.connection
      .select()
      .from(customer)
      .where(and(eq(customer.storeId, this.storeId), eq(customer.id, customerId)))
      .limit(1);
    const profile = customerRows[0];
    if (!profile) return null;

    const [
      addresses,
      taxIdentifiers,
      taxExemptions,
      consents,
      consentEvents,
      groups,
      tags,
      segments,
      externalReferences,
      statisticsRows,
      monetaryStatistics,
      orderProjections,
      checkoutProjections,
      refundProjections,
      wishlistRows,
      comparisonRows,
      dataRequests,
      merges,
    ] = await Promise.all([
      this.connection
        .select()
        .from(customerAddress)
        .where(
          and(
            eq(customerAddress.storeId, this.storeId),
            eq(customerAddress.customerId, customerId),
            isNull(customerAddress.deletedAt),
          ),
        )
        .orderBy(asc(customerAddress.createdAt), asc(customerAddress.id)),
      this.connection
        .select()
        .from(customerTaxIdentifier)
        .where(
          and(
            eq(customerTaxIdentifier.storeId, this.storeId),
            eq(customerTaxIdentifier.customerId, customerId),
            isNull(customerTaxIdentifier.deletedAt),
          ),
        )
        .orderBy(asc(customerTaxIdentifier.createdAt), asc(customerTaxIdentifier.id)),
      this.connection
        .select()
        .from(customerTaxExemption)
        .where(
          and(
            eq(customerTaxExemption.storeId, this.storeId),
            eq(customerTaxExemption.customerId, customerId),
            isNull(customerTaxExemption.deletedAt),
          ),
        )
        .orderBy(asc(customerTaxExemption.createdAt), asc(customerTaxExemption.id)),
      this.connection
        .select()
        .from(customerConsent)
        .where(
          and(
            eq(customerConsent.storeId, this.storeId),
            eq(customerConsent.customerId, customerId),
          ),
        )
        .orderBy(asc(customerConsent.createdAt), asc(customerConsent.id)),
      this.connection
        .select()
        .from(customerConsentEvent)
        .where(
          and(
            eq(customerConsentEvent.storeId, this.storeId),
            eq(customerConsentEvent.customerId, customerId),
          ),
        )
        .orderBy(asc(customerConsentEvent.occurredAt), asc(customerConsentEvent.id)),
      this.connection
        .select({
          membership: customerGroupMembership,
          group: {
            id: customerGroup.id,
            code: customerGroup.code,
            name: customerGroup.name,
          },
        })
        .from(customerGroupMembership)
        .innerJoin(
          customerGroup,
          and(
            eq(customerGroup.id, customerGroupMembership.groupId),
            eq(customerGroup.storeId, customerGroupMembership.storeId),
          ),
        )
        .where(
          and(
            eq(customerGroupMembership.storeId, this.storeId),
            eq(customerGroupMembership.customerId, customerId),
          ),
        )
        .orderBy(asc(customerGroupMembership.assignedAt), asc(customerGroupMembership.id)),
      this.connection
        .select({
          assignment: customerTagAssignment,
          tag: { id: customerTag.id, name: customerTag.name },
        })
        .from(customerTagAssignment)
        .innerJoin(
          customerTag,
          and(
            eq(customerTag.id, customerTagAssignment.tagId),
            eq(customerTag.storeId, customerTagAssignment.storeId),
          ),
        )
        .where(
          and(
            eq(customerTagAssignment.storeId, this.storeId),
            eq(customerTagAssignment.customerId, customerId),
          ),
        )
        .orderBy(asc(customerTagAssignment.assignedAt), asc(customerTagAssignment.id)),
      this.connection
        .select({
          membership: customerSegmentMembership,
          segment: {
            id: customerSegment.id,
            name: customerSegment.name,
            type: customerSegment.type,
            status: customerSegment.status,
          },
        })
        .from(customerSegmentMembership)
        .innerJoin(
          customerSegment,
          and(
            eq(customerSegment.id, customerSegmentMembership.segmentId),
            eq(customerSegment.storeId, customerSegmentMembership.storeId),
          ),
        )
        .where(
          and(
            eq(customerSegmentMembership.storeId, this.storeId),
            eq(customerSegmentMembership.customerId, customerId),
          ),
        )
        .orderBy(asc(customerSegmentMembership.evaluatedAt), asc(customerSegmentMembership.id)),
      this.connection
        .select()
        .from(customerExternalReference)
        .where(
          and(
            eq(customerExternalReference.storeId, this.storeId),
            eq(customerExternalReference.customerId, customerId),
            isNull(customerExternalReference.deletedAt),
          ),
        )
        .orderBy(
          asc(customerExternalReference.externalSystem),
          asc(customerExternalReference.externalType),
          asc(customerExternalReference.id),
        ),
      this.connection
        .select()
        .from(customerStatistics)
        .where(
          and(
            eq(customerStatistics.storeId, this.storeId),
            eq(customerStatistics.customerId, customerId),
          ),
        )
        .limit(1),
      this.connection
        .select()
        .from(customerMonetaryStatistics)
        .where(
          and(
            eq(customerMonetaryStatistics.storeId, this.storeId),
            eq(customerMonetaryStatistics.customerId, customerId),
          ),
        )
        .orderBy(asc(customerMonetaryStatistics.currencyCode)),
      this.connection
        .select()
        .from(customerOrderProjection)
        .where(
          and(
            eq(customerOrderProjection.storeId, this.storeId),
            eq(customerOrderProjection.customerId, customerId),
          ),
        )
        .orderBy(asc(customerOrderProjection.createdAt), asc(customerOrderProjection.orderId)),
      this.connection
        .select()
        .from(customerCheckoutProjection)
        .where(
          and(
            eq(customerCheckoutProjection.storeId, this.storeId),
            eq(customerCheckoutProjection.customerId, customerId),
          ),
        )
        .orderBy(
          asc(customerCheckoutProjection.occurredAt),
          asc(customerCheckoutProjection.checkoutId),
        ),
      this.connection
        .select()
        .from(customerRefundProjection)
        .where(
          and(
            eq(customerRefundProjection.storeId, this.storeId),
            eq(customerRefundProjection.customerId, customerId),
          ),
        )
        .orderBy(asc(customerRefundProjection.refundedAt), asc(customerRefundProjection.refundId)),
      this.connection
        .select({ wishlist: customerWishlist, item: customerWishlistItem })
        .from(customerWishlist)
        .leftJoin(
          customerWishlistItem,
          and(
            eq(customerWishlistItem.storeId, customerWishlist.storeId),
            eq(customerWishlistItem.wishlistId, customerWishlist.id),
          ),
        )
        .where(
          and(
            eq(customerWishlist.storeId, this.storeId),
            eq(customerWishlist.customerId, customerId),
          ),
        )
        .orderBy(
          asc(customerWishlist.createdAt),
          asc(customerWishlist.id),
          asc(customerWishlistItem.addedAt),
          asc(customerWishlistItem.id),
        ),
      this.connection
        .select({ comparison: customerComparison, item: customerComparisonItem })
        .from(customerComparison)
        .leftJoin(
          customerComparisonItem,
          and(
            eq(customerComparisonItem.storeId, customerComparison.storeId),
            eq(customerComparisonItem.comparisonId, customerComparison.id),
          ),
        )
        .where(
          and(
            eq(customerComparison.storeId, this.storeId),
            eq(customerComparison.customerId, customerId),
          ),
        )
        .orderBy(asc(customerComparisonItem.position), asc(customerComparisonItem.id)),
      this.connection
        .select({
          id: customerDataRequest.id,
          type: customerDataRequest.type,
          status: customerDataRequest.status,
          legalBasis: customerDataRequest.legalBasis,
          requestMetadata: customerDataRequest.requestMetadata,
          resultFileId: customerDataRequest.resultFileId,
          rejectionReason: customerDataRequest.rejectionReason,
          requestedAt: customerDataRequest.requestedAt,
          dueAt: customerDataRequest.dueAt,
          startedAt: customerDataRequest.startedAt,
          finishedAt: customerDataRequest.finishedAt,
          updatedAt: customerDataRequest.updatedAt,
        })
        .from(customerDataRequest)
        .where(
          and(
            eq(customerDataRequest.storeId, this.storeId),
            eq(customerDataRequest.customerId, customerId),
          ),
        )
        .orderBy(asc(customerDataRequest.requestedAt), asc(customerDataRequest.id)),
      this.connection
        .select({
          id: customerMerge.id,
          sourceCustomerId: customerMerge.sourceCustomerId,
          targetCustomerId: customerMerge.targetCustomerId,
          status: customerMerge.status,
          reason: customerMerge.reason,
          requestedAt: customerMerge.requestedAt,
          startedAt: customerMerge.startedAt,
          finishedAt: customerMerge.finishedAt,
          updatedAt: customerMerge.updatedAt,
        })
        .from(customerMerge)
        .where(
          and(
            eq(customerMerge.storeId, this.storeId),
            or(
              eq(customerMerge.sourceCustomerId, customerId),
              eq(customerMerge.targetCustomerId, customerId),
            ),
          ),
        )
        .orderBy(asc(customerMerge.requestedAt), asc(customerMerge.id)),
    ]);

    const wishlists = new Map<
      string,
      {
        wishlist: typeof customerWishlist.$inferSelect;
        items: Array<typeof customerWishlistItem.$inferSelect>;
      }
    >();
    for (const row of wishlistRows) {
      const value = wishlists.get(row.wishlist.id) ?? {
        wishlist: row.wishlist,
        items: [],
      };
      if (row.item) value.items.push(row.item);
      wishlists.set(row.wishlist.id, value);
    }
    const comparison = comparisonRows[0]
      ? {
          comparison: comparisonRows[0].comparison,
          items: comparisonRows.flatMap((row) => (row.item ? [row.item] : [])),
        }
      : null;

    return {
      schemaVersion: 1,
      generatedAt,
      customer: profile,
      addresses,
      taxIdentifiers,
      taxExemptions,
      consents,
      consentEvents,
      groups,
      tags,
      segments,
      externalReferences,
      statistics: statisticsRows[0] ?? null,
      monetaryStatistics,
      orderProjections,
      checkoutProjections,
      refundProjections,
      wishlists: [...wishlists.values()],
      comparison,
      dataRequests,
      merges,
    };
  }
}
