import { and, asc, eq, gt, isNull, lte, ne, or } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  customer,
  customerSegment,
  customerSegmentMembership,
  type Customer,
  type CustomerSegmentMembership,
} from "../models/index.js";

export interface CustomerCheckoutEligibilityReadModel {
  customer: Readonly<{
    id: string;
    lifecycleStatus: Customer["lifecycleStatus"];
  }>;
  memberships: readonly Readonly<{
    membershipId: string;
    segmentId: string;
    source: CustomerSegmentMembership["source"];
    evaluatedAt: string;
    expiresAt: string | null;
    definitionRevision: number | null;
    evaluationGeneration: number | null;
  }>[];
}

export class CustomerCheckoutEligibilityRepository extends BaseRepository {
  @ReadOnly()
  async resolveBuyerEligibility(input: {
    customerId: string;
    effectiveAt: string;
  }): Promise<CustomerCheckoutEligibilityReadModel | null> {
    const rows = await this.connection
      .select({
        customerId: customer.id,
        lifecycleStatus: customer.lifecycleStatus,
        membershipId: customerSegmentMembership.id,
        segmentId: customerSegment.id,
        source: customerSegmentMembership.source,
        evaluatedAt: customerSegmentMembership.evaluatedAt,
        expiresAt: customerSegmentMembership.expiresAt,
        definitionRevision:
          customerSegmentMembership.evaluatedDefinitionRevision,
        evaluationGeneration:
          customerSegmentMembership.evaluatedGeneration,
      })
      .from(customer)
      .leftJoin(
        customerSegmentMembership,
        and(
          eq(customerSegmentMembership.storeId, customer.storeId),
          eq(customerSegmentMembership.customerId, customer.id),
          lte(customerSegmentMembership.evaluatedAt, input.effectiveAt),
          or(
            isNull(customerSegmentMembership.expiresAt),
            gt(customerSegmentMembership.expiresAt, input.effectiveAt)
          )
        )
      )
      .leftJoin(
        customerSegment,
        and(
          eq(customerSegment.storeId, customerSegmentMembership.storeId),
          eq(customerSegment.id, customerSegmentMembership.segmentId),
          eq(customerSegment.status, "ACTIVE"),
          isNull(customerSegment.deletedAt),
          or(
            and(
              eq(customerSegment.type, "MANUAL"),
              ne(customerSegmentMembership.source, "RULE"),
            ),
            and(
              eq(customerSegment.type, "DYNAMIC"),
              eq(customerSegment.materializationStatus, "READY"),
              eq(customerSegmentMembership.source, "RULE"),
              eq(
                customerSegmentMembership.evaluatedDefinitionRevision,
                customerSegment.definitionRevision
              ),
              eq(
                customerSegmentMembership.evaluatedGeneration,
                customerSegment.evaluationGeneration,
              ),
            )
          )
        )
      )
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, input.customerId),
          isNull(customer.deletedAt)
        )
      )
      .orderBy(
        asc(customerSegment.id),
        asc(customerSegmentMembership.id)
      );

    const first = rows[0];
    if (!first) return null;

    return {
      customer: {
        id: first.customerId,
        lifecycleStatus: first.lifecycleStatus,
      },
      memberships: rows.flatMap((row) =>
        row.membershipId &&
        row.segmentId &&
        row.source &&
        row.evaluatedAt
          ? [
              {
                membershipId: row.membershipId,
                segmentId: row.segmentId,
                source: row.source,
                evaluatedAt: row.evaluatedAt,
                expiresAt: row.expiresAt,
                definitionRevision: row.definitionRevision,
                evaluationGeneration: row.evaluationGeneration,
              },
            ]
          : []
      ),
    };
  }
}
