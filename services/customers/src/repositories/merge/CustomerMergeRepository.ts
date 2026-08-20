import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  customer,
  customerAddress,
  customerComparison,
  customerComparisonItem,
  customerConsent,
  customerConsentEvent,
  customerExternalReference,
  customerGroupMembership,
  customerMonetaryStatistics,
  customerOrderProjection,
  customerCheckoutProjection,
  customerRefundProjection,
  customerSegmentMembership,
  customerStatistics,
  customerTagAssignment,
  customerTaxExemption,
  customerTaxIdentifier,
  customerWishlist,
  customerWishlistItem,
  type Customer,
  type CustomerAddress,
  type CustomerConsent,
  type CustomerTaxIdentifier,
} from "../models/index.js";

export interface CustomerMergeConflictResolution {
  sourceId: string;
  targetId: string;
  strategy: string;
}

export interface CustomerMergeBucketResolution {
  transferred: number;
  deduplicated: number;
  conflicts: CustomerMergeConflictResolution[];
  details?: Record<string, number>;
}

export interface CustomerMergeLockedCustomers {
  source: Customer;
  target: Customer;
}

export interface CustomerMergeFinalizedCustomers {
  sourceRevisionBefore: number;
  sourceRevisionAfter: number;
  targetRevisionBefore: number;
  targetRevisionAfter: number;
}

const emptyResolution = (): CustomerMergeBucketResolution => ({
  transferred: 0,
  deduplicated: 0,
  conflicts: [],
});

/**
 * Cross-aggregate persistence used only by the customer merge processor.
 * Every method uses the ambient transaction opened by the process script.
 */
export class CustomerMergeRepository extends BaseRepository {
  async lockCustomers(
    sourceCustomerId: string,
    targetCustomerId: string,
  ): Promise<CustomerMergeLockedCustomers | null> {
    const rows = await this.connection
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          inArray(customer.id, [sourceCustomerId, targetCustomerId]),
          isNull(customer.deletedAt),
        ),
      )
      .orderBy(asc(customer.id))
      .for("update");
    if (rows.length !== 2) return null;

    const source = rows.find((row) => row.id === sourceCustomerId);
    const target = rows.find((row) => row.id === targetCustomerId);
    return source && target ? { source, target } : null;
  }

  async mergeAddresses(
    sourceCustomerId: string,
    targetCustomerId: string,
    now: string,
  ): Promise<CustomerMergeBucketResolution> {
    const rows = await this.connection
      .select()
      .from(customerAddress)
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          inArray(customerAddress.customerId, [sourceCustomerId, targetCustomerId]),
        ),
      )
      .orderBy(asc(customerAddress.createdAt), asc(customerAddress.id));
    const targetRows = rows.filter(
      (row) => row.customerId === targetCustomerId && row.deletedAt === null,
    );
    const targetBySignature = new Map(targetRows.map((row) => [addressSignature(row), row]));
    let hasShippingDefault = targetRows.some((row) => row.isDefaultShipping);
    let hasBillingDefault = targetRows.some((row) => row.isDefaultBilling);
    const resolution = emptyResolution();

    for (const source of rows.filter((row) => row.customerId === sourceCustomerId)) {
      if (source.deletedAt !== null) {
        await this.moveAddress(source.id, targetCustomerId, {});
        resolution.transferred += 1;
        continue;
      }

      const duplicate = targetBySignature.get(addressSignature(source));
      if (duplicate) {
        const inheritShipping = source.isDefaultShipping && !hasShippingDefault;
        const inheritBilling = source.isDefaultBilling && !hasBillingDefault;
        if (inheritShipping || inheritBilling) {
          await this.connection
            .update(customerAddress)
            .set({
              ...(inheritShipping ? { isDefaultShipping: true } : {}),
              ...(inheritBilling ? { isDefaultBilling: true } : {}),
              updatedAt: now,
            })
            .where(
              and(eq(customerAddress.storeId, this.storeId), eq(customerAddress.id, duplicate.id)),
            );
          hasShippingDefault ||= inheritShipping;
          hasBillingDefault ||= inheritBilling;
        }
        await this.moveAddress(source.id, targetCustomerId, {
          isDefaultShipping: false,
          isDefaultBilling: false,
          deletedAt: now,
          updatedAt: now,
        });
        resolution.deduplicated += 1;
        resolution.conflicts.push({
          sourceId: source.id,
          targetId: duplicate.id,
          strategy: "TARGET_PRESERVED_SOURCE_ARCHIVED",
        });
        continue;
      }

      const isDefaultShipping = source.isDefaultShipping && !hasShippingDefault;
      const isDefaultBilling = source.isDefaultBilling && !hasBillingDefault;
      await this.moveAddress(source.id, targetCustomerId, {
        isDefaultShipping,
        isDefaultBilling,
        updatedAt: now,
      });
      hasShippingDefault ||= isDefaultShipping;
      hasBillingDefault ||= isDefaultBilling;
      targetBySignature.set(addressSignature(source), {
        ...source,
        customerId: targetCustomerId,
        isDefaultShipping,
        isDefaultBilling,
      });
      resolution.transferred += 1;
    }
    return resolution;
  }

  async mergeTaxIdentifiers(
    sourceCustomerId: string,
    targetCustomerId: string,
    now: string,
  ): Promise<CustomerMergeBucketResolution> {
    const rows = await this.connection
      .select()
      .from(customerTaxIdentifier)
      .where(
        and(
          eq(customerTaxIdentifier.storeId, this.storeId),
          inArray(customerTaxIdentifier.customerId, [sourceCustomerId, targetCustomerId]),
        ),
      )
      .orderBy(asc(customerTaxIdentifier.createdAt), asc(customerTaxIdentifier.id));
    const targetRows = rows.filter(
      (row) => row.customerId === targetCustomerId && row.deletedAt === null,
    );
    const targetByKey = new Map(targetRows.map((row) => [taxIdentifierKey(row), row]));
    let hasPrimary = targetRows.some((row) => row.isPrimary);
    const resolution = emptyResolution();

    for (const source of rows.filter((row) => row.customerId === sourceCustomerId)) {
      if (source.deletedAt !== null) {
        await this.moveTaxIdentifier(source.id, targetCustomerId, {});
        resolution.transferred += 1;
        continue;
      }
      const duplicate = targetByKey.get(taxIdentifierKey(source));
      if (duplicate) {
        const inheritPrimary = source.isPrimary && !hasPrimary;
        if (inheritPrimary) {
          await this.connection
            .update(customerTaxIdentifier)
            .set({ isPrimary: true, updatedAt: now })
            .where(
              and(
                eq(customerTaxIdentifier.storeId, this.storeId),
                eq(customerTaxIdentifier.id, duplicate.id),
              ),
            );
          hasPrimary = true;
        }
        await this.moveTaxIdentifier(source.id, targetCustomerId, {
          isPrimary: false,
          deletedAt: now,
          updatedAt: now,
        });
        resolution.deduplicated += 1;
        resolution.conflicts.push({
          sourceId: source.id,
          targetId: duplicate.id,
          strategy: "TARGET_PRESERVED_SOURCE_ARCHIVED",
        });
        continue;
      }
      const isPrimary = source.isPrimary && !hasPrimary;
      await this.moveTaxIdentifier(source.id, targetCustomerId, {
        isPrimary,
        updatedAt: now,
      });
      hasPrimary ||= isPrimary;
      targetByKey.set(taxIdentifierKey(source), {
        ...source,
        customerId: targetCustomerId,
        isPrimary,
      });
      resolution.transferred += 1;
    }
    return resolution;
  }

  async mergeTaxExemptions(
    sourceCustomerId: string,
    targetCustomerId: string,
    now: string,
  ): Promise<CustomerMergeBucketResolution> {
    const rows = await this.connection
      .select()
      .from(customerTaxExemption)
      .where(
        and(
          eq(customerTaxExemption.storeId, this.storeId),
          inArray(customerTaxExemption.customerId, [sourceCustomerId, targetCustomerId]),
        ),
      )
      .orderBy(asc(customerTaxExemption.createdAt), asc(customerTaxExemption.id));
    const targetByKey = new Map(
      rows
        .filter((row) => row.customerId === targetCustomerId && row.deletedAt === null)
        .map((row) => [taxExemptionKey(row), row]),
    );
    const resolution = emptyResolution();
    for (const source of rows.filter((row) => row.customerId === sourceCustomerId)) {
      const duplicate =
        source.deletedAt === null ? targetByKey.get(taxExemptionKey(source)) : undefined;
      if (duplicate) {
        await this.connection
          .update(customerTaxExemption)
          .set({ customerId: targetCustomerId, deletedAt: now, updatedAt: now })
          .where(
            and(
              eq(customerTaxExemption.storeId, this.storeId),
              eq(customerTaxExemption.id, source.id),
            ),
          );
        resolution.deduplicated += 1;
        resolution.conflicts.push({
          sourceId: source.id,
          targetId: duplicate.id,
          strategy: "TARGET_PRESERVED_SOURCE_ARCHIVED",
        });
      } else {
        await this.connection
          .update(customerTaxExemption)
          .set({ customerId: targetCustomerId, updatedAt: now })
          .where(
            and(
              eq(customerTaxExemption.storeId, this.storeId),
              eq(customerTaxExemption.id, source.id),
            ),
          );
        if (source.deletedAt === null) {
          targetByKey.set(taxExemptionKey(source), {
            ...source,
            customerId: targetCustomerId,
          });
        }
        resolution.transferred += 1;
      }
    }
    return resolution;
  }

  async mergeConsents(
    sourceCustomerId: string,
    targetCustomerId: string,
    now: string,
  ): Promise<CustomerMergeBucketResolution> {
    const rows = await this.connection
      .select()
      .from(customerConsent)
      .where(
        and(
          eq(customerConsent.storeId, this.storeId),
          inArray(customerConsent.customerId, [sourceCustomerId, targetCustomerId]),
        ),
      )
      .orderBy(asc(customerConsent.createdAt), asc(customerConsent.id));
    const targetByChannel = new Map(
      rows.filter((row) => row.customerId === targetCustomerId).map((row) => [row.channel, row]),
    );
    const resolution = emptyResolution();
    let evidenceTransferred = 0;

    for (const source of rows.filter((row) => row.customerId === sourceCustomerId)) {
      const duplicate = targetByChannel.get(source.channel);
      if (!duplicate) {
        await this.connection
          .update(customerConsent)
          .set({ customerId: targetCustomerId, updatedAt: now })
          .where(and(eq(customerConsent.storeId, this.storeId), eq(customerConsent.id, source.id)));
        const events = await this.connection
          .update(customerConsentEvent)
          .set({ customerId: targetCustomerId })
          .where(
            and(
              eq(customerConsentEvent.storeId, this.storeId),
              eq(customerConsentEvent.consentId, source.id),
            ),
          )
          .returning({ id: customerConsentEvent.id });
        evidenceTransferred += events.length;
        targetByChannel.set(source.channel, {
          ...source,
          customerId: targetCustomerId,
        });
        resolution.transferred += 1;
        continue;
      }

      const winner = consentWinner(source, duplicate);
      if (winner === source) {
        await this.connection
          .update(customerConsent)
          .set({
            state: source.state,
            optInLevel: source.optInLevel,
            contactPoint: source.contactPoint,
            source: source.source,
            sourceLocationId: source.sourceLocationId,
            sourceIp: source.sourceIp,
            userAgent: source.userAgent,
            consentedAt: source.consentedAt,
            withdrawnAt: source.withdrawnAt,
            updatedAt: now,
          })
          .where(
            and(eq(customerConsent.storeId, this.storeId), eq(customerConsent.id, duplicate.id)),
          );
      }
      const events = await this.connection
        .update(customerConsentEvent)
        .set({ customerId: targetCustomerId, consentId: duplicate.id })
        .where(
          and(
            eq(customerConsentEvent.storeId, this.storeId),
            eq(customerConsentEvent.consentId, source.id),
          ),
        )
        .returning({ id: customerConsentEvent.id });
      evidenceTransferred += events.length;
      await this.connection
        .delete(customerConsent)
        .where(and(eq(customerConsent.storeId, this.storeId), eq(customerConsent.id, source.id)));
      resolution.deduplicated += 1;
      resolution.conflicts.push({
        sourceId: source.id,
        targetId: duplicate.id,
        strategy: "MOST_RESTRICTIVE_THEN_LATEST_EVIDENCE_PRESERVED",
      });
    }
    resolution.details = { evidenceTransferred };
    return resolution;
  }

  async mergeGroups(
    sourceCustomerId: string,
    targetCustomerId: string,
  ): Promise<CustomerMergeBucketResolution> {
    const rows = await this.connection
      .select()
      .from(customerGroupMembership)
      .where(
        and(
          eq(customerGroupMembership.storeId, this.storeId),
          inArray(customerGroupMembership.customerId, [sourceCustomerId, targetCustomerId]),
        ),
      )
      .orderBy(asc(customerGroupMembership.assignedAt), asc(customerGroupMembership.id));
    const targets = rows.filter((row) => row.customerId === targetCustomerId);
    const targetByGroup = new Map(targets.map((row) => [row.groupId, row]));
    let hasPrimary = targets.some((row) => row.isPrimary && row.expiresAt === null);
    const resolution = emptyResolution();

    for (const source of rows.filter((row) => row.customerId === sourceCustomerId)) {
      const duplicate = targetByGroup.get(source.groupId);
      if (duplicate) {
        const expiresAt = mergeExpiration(duplicate.expiresAt, source.expiresAt);
        const inheritPrimary = source.isPrimary && expiresAt === null && !hasPrimary;
        const isPrimary =
          expiresAt === null
            ? (duplicate.isPrimary && duplicate.expiresAt === null) || inheritPrimary
            : duplicate.isPrimary;
        if (isPrimary !== duplicate.isPrimary || expiresAt !== duplicate.expiresAt) {
          await this.connection
            .update(customerGroupMembership)
            .set({
              expiresAt,
              isPrimary,
            })
            .where(
              and(
                eq(customerGroupMembership.storeId, this.storeId),
                eq(customerGroupMembership.id, duplicate.id),
              ),
            );
          hasPrimary ||= isPrimary && expiresAt === null;
        }
        await this.connection
          .delete(customerGroupMembership)
          .where(
            and(
              eq(customerGroupMembership.storeId, this.storeId),
              eq(customerGroupMembership.id, source.id),
            ),
          );
        resolution.deduplicated += 1;
        resolution.conflicts.push({
          sourceId: source.id,
          targetId: duplicate.id,
          strategy: "TARGET_MEMBERSHIP_PRESERVED",
        });
        continue;
      }
      const isPrimary = source.isPrimary && (source.expiresAt !== null || !hasPrimary);
      await this.connection
        .update(customerGroupMembership)
        .set({ customerId: targetCustomerId, isPrimary })
        .where(
          and(
            eq(customerGroupMembership.storeId, this.storeId),
            eq(customerGroupMembership.id, source.id),
          ),
        );
      hasPrimary ||= isPrimary && source.expiresAt === null;
      targetByGroup.set(source.groupId, {
        ...source,
        customerId: targetCustomerId,
        isPrimary,
      });
      resolution.transferred += 1;
    }
    return resolution;
  }

  async mergeTags(
    sourceCustomerId: string,
    targetCustomerId: string,
  ): Promise<CustomerMergeBucketResolution> {
    const rows = await this.connection
      .select()
      .from(customerTagAssignment)
      .where(
        and(
          eq(customerTagAssignment.storeId, this.storeId),
          inArray(customerTagAssignment.customerId, [sourceCustomerId, targetCustomerId]),
        ),
      )
      .orderBy(asc(customerTagAssignment.assignedAt), asc(customerTagAssignment.id));
    return this.mergeSimpleAssignments({
      rows,
      sourceCustomerId,
      targetCustomerId,
      key: (row) => row.tagId,
      move: async (id) => {
        await this.connection
          .update(customerTagAssignment)
          .set({ customerId: targetCustomerId })
          .where(
            and(eq(customerTagAssignment.storeId, this.storeId), eq(customerTagAssignment.id, id)),
          );
      },
      remove: async (id) => {
        await this.connection
          .delete(customerTagAssignment)
          .where(
            and(eq(customerTagAssignment.storeId, this.storeId), eq(customerTagAssignment.id, id)),
          );
      },
    });
  }

  async mergeSegments(
    sourceCustomerId: string,
    targetCustomerId: string,
  ): Promise<CustomerMergeBucketResolution> {
    const rows = await this.connection
      .select()
      .from(customerSegmentMembership)
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          inArray(customerSegmentMembership.customerId, [sourceCustomerId, targetCustomerId]),
        ),
      )
      .orderBy(asc(customerSegmentMembership.evaluatedAt), asc(customerSegmentMembership.id));
    const targetBySegment = new Map(
      rows.filter((row) => row.customerId === targetCustomerId).map((row) => [row.segmentId, row]),
    );
    const resolution = emptyResolution();
    for (const source of rows.filter((row) => row.customerId === sourceCustomerId)) {
      const duplicate = targetBySegment.get(source.segmentId);
      if (!duplicate) {
        await this.connection
          .update(customerSegmentMembership)
          .set({ customerId: targetCustomerId })
          .where(
            and(
              eq(customerSegmentMembership.storeId, this.storeId),
              eq(customerSegmentMembership.id, source.id),
            ),
          );
        targetBySegment.set(source.segmentId, {
          ...source,
          customerId: targetCustomerId,
        });
        resolution.transferred += 1;
        continue;
      }
      const expiresAt = mergeExpiration(duplicate.expiresAt, source.expiresAt);
      if (expiresAt !== duplicate.expiresAt) {
        await this.connection
          .update(customerSegmentMembership)
          .set({ expiresAt })
          .where(
            and(
              eq(customerSegmentMembership.storeId, this.storeId),
              eq(customerSegmentMembership.id, duplicate.id),
            ),
          );
      }
      await this.connection
        .delete(customerSegmentMembership)
        .where(
          and(
            eq(customerSegmentMembership.storeId, this.storeId),
            eq(customerSegmentMembership.id, source.id),
          ),
        );
      resolution.deduplicated += 1;
      resolution.conflicts.push({
        sourceId: source.id,
        targetId: duplicate.id,
        strategy: "TARGET_MEMBERSHIP_PRESERVED_LONGEST_EXPIRY",
      });
    }
    return resolution;
  }

  async mergeExternalReferences(
    sourceCustomerId: string,
    targetCustomerId: string,
    now: string,
  ): Promise<CustomerMergeBucketResolution> {
    const rows = await this.connection
      .select()
      .from(customerExternalReference)
      .where(
        and(
          eq(customerExternalReference.storeId, this.storeId),
          inArray(customerExternalReference.customerId, [sourceCustomerId, targetCustomerId]),
        ),
      )
      .orderBy(asc(customerExternalReference.createdAt), asc(customerExternalReference.id));
    const targetByOwnerKey = new Map(
      rows
        .filter((row) => row.customerId === targetCustomerId && row.deletedAt === null)
        .map((row) => [externalReferenceOwnerKey(row), row]),
    );
    const resolution = emptyResolution();
    for (const source of rows.filter((row) => row.customerId === sourceCustomerId)) {
      const duplicate =
        source.deletedAt === null
          ? targetByOwnerKey.get(externalReferenceOwnerKey(source))
          : undefined;
      const deletedAt = duplicate ? now : source.deletedAt;
      await this.connection
        .update(customerExternalReference)
        .set({ customerId: targetCustomerId, deletedAt, updatedAt: now })
        .where(
          and(
            eq(customerExternalReference.storeId, this.storeId),
            eq(customerExternalReference.id, source.id),
          ),
        );
      if (duplicate) {
        resolution.deduplicated += 1;
        resolution.conflicts.push({
          sourceId: source.id,
          targetId: duplicate.id,
          strategy: "TARGET_REFERENCE_PRESERVED_SOURCE_ARCHIVED",
        });
      } else {
        resolution.transferred += 1;
        if (source.deletedAt === null) {
          targetByOwnerKey.set(externalReferenceOwnerKey(source), {
            ...source,
            customerId: targetCustomerId,
          });
        }
      }
    }
    return resolution;
  }

  async mergeWishlists(
    sourceCustomerId: string,
    targetCustomerId: string,
    now: string,
  ): Promise<CustomerMergeBucketResolution> {
    const wishlists = await this.connection
      .select()
      .from(customerWishlist)
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          inArray(customerWishlist.customerId, [sourceCustomerId, targetCustomerId]),
        ),
      )
      .orderBy(asc(customerWishlist.createdAt), asc(customerWishlist.id));
    const ids = wishlists.map((row) => row.id);
    const items = ids.length
      ? await this.connection
          .select()
          .from(customerWishlistItem)
          .where(
            and(
              eq(customerWishlistItem.storeId, this.storeId),
              inArray(customerWishlistItem.wishlistId, ids),
            ),
          )
          .orderBy(asc(customerWishlistItem.addedAt), asc(customerWishlistItem.id))
      : [];
    const targetRows = wishlists.filter((row) => row.customerId === targetCustomerId);
    const targetByName = new Map(targetRows.map((row) => [row.normalizedName, row]));
    let hasDefault = targetRows.some((row) => row.isDefault);
    const resolution = emptyResolution();
    let itemsTransferred = 0;
    let itemsDeduplicated = 0;

    for (const source of wishlists.filter((row) => row.customerId === sourceCustomerId)) {
      const duplicate = targetByName.get(source.normalizedName);
      if (!duplicate) {
        const isDefault = source.isDefault && !hasDefault;
        await this.connection
          .update(customerWishlist)
          .set({ customerId: targetCustomerId, isDefault, updatedAt: now })
          .where(
            and(eq(customerWishlist.storeId, this.storeId), eq(customerWishlist.id, source.id)),
          );
        hasDefault ||= isDefault;
        targetByName.set(source.normalizedName, {
          ...source,
          customerId: targetCustomerId,
          isDefault,
        });
        resolution.transferred += 1;
        itemsTransferred += items.filter((item) => item.wishlistId === source.id).length;
        continue;
      }

      const duplicateProducts = new Set(
        items.filter((item) => item.wishlistId === duplicate.id).map((item) => item.productId),
      );
      for (const item of items.filter((row) => row.wishlistId === source.id)) {
        if (duplicateProducts.has(item.productId)) {
          await this.connection
            .delete(customerWishlistItem)
            .where(
              and(
                eq(customerWishlistItem.storeId, this.storeId),
                eq(customerWishlistItem.id, item.id),
              ),
            );
          itemsDeduplicated += 1;
        } else {
          await this.connection
            .update(customerWishlistItem)
            .set({ wishlistId: duplicate.id })
            .where(
              and(
                eq(customerWishlistItem.storeId, this.storeId),
                eq(customerWishlistItem.id, item.id),
              ),
            );
          duplicateProducts.add(item.productId);
          itemsTransferred += 1;
        }
      }
      if (source.isDefault && !hasDefault) {
        await this.connection
          .update(customerWishlist)
          .set({ isDefault: true, updatedAt: now })
          .where(
            and(eq(customerWishlist.storeId, this.storeId), eq(customerWishlist.id, duplicate.id)),
          );
        hasDefault = true;
      }
      await this.connection
        .delete(customerWishlist)
        .where(and(eq(customerWishlist.storeId, this.storeId), eq(customerWishlist.id, source.id)));
      resolution.deduplicated += 1;
      resolution.conflicts.push({
        sourceId: source.id,
        targetId: duplicate.id,
        strategy: "WISHLIST_NAME_MERGED_PRODUCTS_DEDUPLICATED",
      });
    }
    resolution.details = { itemsTransferred, itemsDeduplicated };
    return resolution;
  }

  async mergeComparisons(
    sourceCustomerId: string,
    targetCustomerId: string,
    now: string,
  ): Promise<CustomerMergeBucketResolution> {
    const comparisons = await this.connection
      .select()
      .from(customerComparison)
      .where(
        and(
          eq(customerComparison.storeId, this.storeId),
          inArray(customerComparison.customerId, [sourceCustomerId, targetCustomerId]),
        ),
      )
      .orderBy(asc(customerComparison.id))
      .for("update");
    const source = comparisons.find((row) => row.customerId === sourceCustomerId);
    if (!source) return emptyResolution();
    const target = comparisons.find((row) => row.customerId === targetCustomerId);
    const resolution = emptyResolution();

    if (!target) {
      await this.connection
        .update(customerComparison)
        .set({
          customerId: targetCustomerId,
          revision: sql`${customerComparison.revision} + 1`,
          updatedAt: now,
        })
        .where(
          and(eq(customerComparison.storeId, this.storeId), eq(customerComparison.id, source.id)),
        );
      const itemRows = await this.connection
        .select({ id: customerComparisonItem.id })
        .from(customerComparisonItem)
        .where(
          and(
            eq(customerComparisonItem.storeId, this.storeId),
            eq(customerComparisonItem.comparisonId, source.id),
          ),
        );
      resolution.transferred = 1;
      resolution.details = { itemsTransferred: itemRows.length, itemsDeduplicated: 0 };
      return resolution;
    }

    const items = await this.connection
      .select()
      .from(customerComparisonItem)
      .where(
        and(
          eq(customerComparisonItem.storeId, this.storeId),
          inArray(customerComparisonItem.comparisonId, [source.id, target.id]),
        ),
      )
      .orderBy(asc(customerComparisonItem.position), asc(customerComparisonItem.id));
    const targetVariants = new Set(
      items.filter((item) => item.comparisonId === target.id).map((item) => item.variantId),
    );
    let position = items
      .filter((item) => item.comparisonId === target.id)
      .reduce((value, item) => Math.max(value, item.position), -1);
    let itemsTransferred = 0;
    let itemsDeduplicated = 0;
    for (const item of items.filter((row) => row.comparisonId === source.id)) {
      if (targetVariants.has(item.variantId)) {
        await this.connection
          .delete(customerComparisonItem)
          .where(
            and(
              eq(customerComparisonItem.storeId, this.storeId),
              eq(customerComparisonItem.id, item.id),
            ),
          );
        itemsDeduplicated += 1;
      } else {
        position += 1;
        await this.connection
          .update(customerComparisonItem)
          .set({ comparisonId: target.id, position, updatedAt: now })
          .where(
            and(
              eq(customerComparisonItem.storeId, this.storeId),
              eq(customerComparisonItem.id, item.id),
            ),
          );
        targetVariants.add(item.variantId);
        itemsTransferred += 1;
      }
    }
    await this.connection
      .delete(customerComparison)
      .where(
        and(eq(customerComparison.storeId, this.storeId), eq(customerComparison.id, source.id)),
      );
    await this.connection
      .update(customerComparison)
      .set({
        revision: sql`${customerComparison.revision} + 1`,
        updatedAt: now,
      })
      .where(
        and(eq(customerComparison.storeId, this.storeId), eq(customerComparison.id, target.id)),
      );
    resolution.deduplicated = 1;
    resolution.conflicts.push({
      sourceId: source.id,
      targetId: target.id,
      strategy: "TARGET_ORDER_PRESERVED_SOURCE_VARIANTS_APPENDED",
    });
    resolution.details = { itemsTransferred, itemsDeduplicated };
    return resolution;
  }

  async mergeStatistics(
    sourceCustomerId: string,
    targetCustomerId: string,
  ): Promise<CustomerMergeBucketResolution> {
    const orders = await this.connection
      .update(customerOrderProjection)
      .set({ customerId: targetCustomerId })
      .where(
        and(
          eq(customerOrderProjection.storeId, this.storeId),
          eq(customerOrderProjection.customerId, sourceCustomerId),
        ),
      )
      .returning({ id: customerOrderProjection.orderId });
    const checkouts = await this.connection
      .update(customerCheckoutProjection)
      .set({ customerId: targetCustomerId })
      .where(
        and(
          eq(customerCheckoutProjection.storeId, this.storeId),
          eq(customerCheckoutProjection.customerId, sourceCustomerId),
        ),
      )
      .returning({ id: customerCheckoutProjection.checkoutId });
    const refunds = await this.connection
      .update(customerRefundProjection)
      .set({ customerId: targetCustomerId })
      .where(
        and(
          eq(customerRefundProjection.storeId, this.storeId),
          eq(customerRefundProjection.customerId, sourceCustomerId),
        ),
      )
      .returning({ id: customerRefundProjection.refundId });
    await this.connection
      .delete(customerStatistics)
      .where(
        and(
          eq(customerStatistics.storeId, this.storeId),
          eq(customerStatistics.customerId, sourceCustomerId),
        ),
      );
    const monetary = await this.connection
      .delete(customerMonetaryStatistics)
      .where(
        and(
          eq(customerMonetaryStatistics.storeId, this.storeId),
          eq(customerMonetaryStatistics.customerId, sourceCustomerId),
        ),
      )
      .returning({ id: customerMonetaryStatistics.id });
    return {
      transferred: orders.length + checkouts.length + refunds.length,
      deduplicated: 0,
      conflicts: [],
      details: {
        orders: orders.length,
        checkouts: checkouts.length,
        refunds: refunds.length,
        sourceMonetaryRowsRemoved: monetary.length,
      },
    };
  }

  async finalizeCustomers(
    locked: CustomerMergeLockedCustomers,
    targetCustomerId: string,
    now: string,
  ): Promise<CustomerMergeFinalizedCustomers> {
    const targetRows = await this.connection
      .update(customer)
      .set({
        revision: sql`${customer.revision} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, locked.target.id),
          eq(customer.revision, locked.target.revision),
          isNull(customer.deletedAt),
        ),
      )
      .returning({ revision: customer.revision });
    const sourceRows = await this.connection
      .update(customer)
      .set({
        lifecycleStatus: "MERGED",
        mergedIntoCustomerId: targetCustomerId,
        blockedReason: null,
        iamLifecycleDisabled: false,
        revision: sql`${customer.revision} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, locked.source.id),
          eq(customer.revision, locked.source.revision),
          isNull(customer.deletedAt),
        ),
      )
      .returning({ revision: customer.revision });
    const sourceRevisionAfter = sourceRows[0]?.revision;
    const targetRevisionAfter = targetRows[0]?.revision;
    if (sourceRevisionAfter === undefined || targetRevisionAfter === undefined) {
      throw new Error("Customer merge revisions changed while rows were locked");
    }
    return {
      sourceRevisionBefore: locked.source.revision,
      sourceRevisionAfter,
      targetRevisionBefore: locked.target.revision,
      targetRevisionAfter,
    };
  }

  private async mergeSimpleAssignments<T extends { id: string; customerId: string }>(input: {
    rows: T[];
    sourceCustomerId: string;
    targetCustomerId: string;
    key: (row: T) => string;
    move: (id: string) => Promise<unknown>;
    remove: (id: string) => Promise<unknown>;
  }): Promise<CustomerMergeBucketResolution> {
    const targetByKey = new Map(
      input.rows
        .filter((row) => row.customerId === input.targetCustomerId)
        .map((row) => [input.key(row), row]),
    );
    const resolution = emptyResolution();
    for (const source of input.rows.filter((row) => row.customerId === input.sourceCustomerId)) {
      const duplicate = targetByKey.get(input.key(source));
      if (duplicate) {
        await input.remove(source.id);
        resolution.deduplicated += 1;
        resolution.conflicts.push({
          sourceId: source.id,
          targetId: duplicate.id,
          strategy: "TARGET_MEMBERSHIP_PRESERVED",
        });
      } else {
        await input.move(source.id);
        targetByKey.set(input.key(source), {
          ...source,
          customerId: input.targetCustomerId,
        });
        resolution.transferred += 1;
      }
    }
    return resolution;
  }

  private moveAddress(id: string, targetCustomerId: string, patch: Partial<CustomerAddress>) {
    return this.connection
      .update(customerAddress)
      .set({ ...patch, customerId: targetCustomerId })
      .where(and(eq(customerAddress.storeId, this.storeId), eq(customerAddress.id, id)));
  }

  private moveTaxIdentifier(
    id: string,
    targetCustomerId: string,
    patch: Partial<CustomerTaxIdentifier>,
  ) {
    return this.connection
      .update(customerTaxIdentifier)
      .set({ ...patch, customerId: targetCustomerId })
      .where(
        and(eq(customerTaxIdentifier.storeId, this.storeId), eq(customerTaxIdentifier.id, id)),
      );
  }
}

function normalized(value: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function addressSignature(row: CustomerAddress): string {
  return JSON.stringify([
    normalized(row.prefix),
    normalized(row.firstName),
    normalized(row.middleName),
    normalized(row.lastName),
    normalized(row.suffix),
    normalized(row.companyName),
    normalized(row.phoneE164),
    normalized(row.address1),
    normalized(row.address2),
    normalized(row.city),
    normalized(row.regionName),
    normalized(row.regionCode),
    normalized(row.postalCode),
    row.countryCode.toUpperCase(),
  ]);
}

function taxIdentifierKey(row: {
  identifierType: string;
  countryCode: string | null;
  normalizedValue: string;
}): string {
  return JSON.stringify([row.identifierType.trim(), row.countryCode ?? "", row.normalizedValue]);
}

function taxExemptionKey(row: {
  code: string;
  countryCode: string | null;
  regionCode: string | null;
}): string {
  return JSON.stringify([row.code, row.countryCode ?? "", row.regionCode ?? ""]);
}

function consentWinner(source: CustomerConsent, target: CustomerConsent): CustomerConsent {
  const rank: Record<CustomerConsent["state"], number> = {
    SUBSCRIBED: 1,
    PENDING: 2,
    NOT_SUBSCRIBED: 3,
    UNSUBSCRIBED: 4,
    INVALID: 5,
    REDACTED: 6,
  };
  if (rank[source.state] !== rank[target.state]) {
    return rank[source.state] > rank[target.state] ? source : target;
  }
  return source.updatedAt > target.updatedAt ? source : target;
}

function externalReferenceOwnerKey(row: { externalSystem: string; externalType: string }): string {
  return JSON.stringify([row.externalSystem, row.externalType]);
}

function mergeExpiration(target: string | null, source: string | null): string | null {
  if (target === null || source === null) return null;
  return target >= source ? target : source;
}
