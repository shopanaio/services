import {
  createQuery,
  createRelayQuery,
  InvalidCursorError,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly } from "@shopana/shared-kernel";
import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import {
  and,
  eq,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  normalizeRelayPagination,
  type RepositoryConnectionResult,
  IMPOSSIBLE_UUID,
} from "../connection.js";
import {
  decodeCustomerGlobalId,
  mapGraphQlBigInt,
} from "../global-id-where-mappers.js";
import {
  customer,
  customerAddress,
  customerComparison,
  customerConsent,
  customerExternalReference,
  customerGroupMembership,
  customerListView,
  customerMonetaryStatistics,
  customerOrderProjection,
  customerCheckoutProjection,
  customerRefundProjection,
  customerSegmentMembership,
  customerSegment,
  customerStatistics,
  customerTagAssignment,
  customerTaxExemption,
  customerTaxIdentifier,
  customerWishlist,
  type Customer,
  type NewCustomer,
} from "../models/index.js";
import {
  normalizeBirthdayMonthDay,
  normalizeCustomerSource,
  normalizeEmailDomain,
  normalizePreferredLocale,
  normalizeUnicodeSearchValue,
} from "../../segments/normalization.js";

const customerQuery = createQuery(customer)
  .mapWhereFields({
    id: decodeCustomerGlobalId,
    mergedIntoCustomerId: decodeCustomerGlobalId,
  })
  .maxLimit(100)
  .defaultLimit(20);

export const customerRelayQuery = createRelayQuery(
  createQuery(customerListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerGlobalId,
      mergedIntoCustomerId: decodeCustomerGlobalId,
      totalSpentMinor: mapGraphQlBigInt,
      totalRefundedMinor: mapGraphQlBigInt,
      netSpentMinor: mapGraphQlBigInt,
      averageOrderValueMinor: mapGraphQlBigInt,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customer", tieBreaker: "id" }
);

type CustomerRelayInput = InferRelayInput<typeof customerRelayQuery>;
type CustomerRelayWhere = NonNullable<CustomerRelayInput["where"]>;
type SegmentIdFilter = {
  _eq?: string | null;
  _neq?: string | null;
  _in?: readonly string[] | null;
  _notIn?: readonly string[] | null;
  _is?: boolean | null;
  _isNot?: boolean | null;
};

export type CustomerConnectionWhere = Omit<
  CustomerRelayWhere,
  "_and" | "_or" | "_not"
> & {
  segmentId?: SegmentIdFilter | string | null;
  _and?: CustomerConnectionWhere[] | null;
  _or?: CustomerConnectionWhere[] | null;
  _not?: CustomerConnectionWhere | null;
};

export type CustomerConnectionInput = Omit<CustomerRelayInput, "where"> & {
  where?: CustomerConnectionWhere;
};

export interface CustomerCreateData {
  lifecycleStatus?: Customer["lifecycleStatus"];
  iamPrincipalId?: string | null;
  iamPrincipalStatus?: Customer["iamPrincipalStatus"];
  iamLifecycleDisabled?: boolean;
  accountStatus?: Customer["accountStatus"];
  email?: string | null;
  emailVerified?: boolean;
  phoneE164?: string | null;
  phoneVerified?: boolean;
  prefix?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  preferredLocale?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  note?: string | null;
  moderationNote?: string | null;
  source?: string;
  createdByUserId?: string | null;
}

export type CustomerPatch = Partial<
  Pick<
    NewCustomer,
    | "iamPrincipalId"
    | "iamPrincipalStatus"
    | "iamLifecycleDisabled"
    | "lifecycleStatus"
    | "accountStatus"
    | "email"
    | "emailVerified"
    | "phoneE164"
    | "phoneVerified"
    | "prefix"
    | "firstName"
    | "middleName"
    | "lastName"
    | "suffix"
    | "preferredLocale"
    | "dateOfBirth"
    | "gender"
    | "companyName"
    | "jobTitle"
    | "note"
    | "blockedReason"
    | "moderationNote"
    | "source"
    | "lastActivityAt"
    | "mergedIntoCustomerId"
    | "redactedAt"
  >
>;

export type CustomerPrivacyCorrection = Partial<
  Pick<
    NewCustomer,
    | "email"
    | "phoneE164"
    | "prefix"
    | "firstName"
    | "middleName"
    | "lastName"
    | "suffix"
    | "preferredLocale"
    | "dateOfBirth"
    | "gender"
    | "companyName"
    | "jobTitle"
  >
>;

export type CustomerRevisionAcquireResult =
  | { status: "acquired"; customer: Customer }
  | { status: "not_found" }
  | { status: "inactive" }
  | { status: "conflict"; actualRevision: number };

export class CustomerRepository extends BaseRepository {
  @ReadOnly()
  async scanIds(
    afterCursor: string | null,
    limit: number,
  ): Promise<readonly string[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
      throw new Error("Customer scan limit must be between 1 and 500");
    }
    const afterId = afterCursor ? decodeCustomerIdCursor(afterCursor) : null;
    const rows = await this.connection
      .select({ id: customer.id })
      .from(customer)
      .where(and(
        eq(customer.storeId, this.storeId),
        isNull(customer.deletedAt),
        afterId ? sql`${customer.id} > ${afterId}::uuid` : undefined,
      ))
      .orderBy(customer.id)
      .limit(limit);
    return rows.map((row) => row.id);
  }

  private get currency(): string {
    return this.ctx.currency ?? this.ctx.store.currencyCode;
  }

  @ReadOnly()
  async exists(id: string): Promise<boolean> {
    const rows = await this.connection
      .select({ id: customer.id })
      .from(customer)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, id),
          isNull(customer.deletedAt)
        )
      )
      .limit(1);
    return rows.length > 0;
  }

  @ReadOnly()
  async findById(id: string): Promise<Customer | null> {
    const rows = await this.connection
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, id),
          isNull(customer.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findByIdIncludingDeleted(id: string): Promise<Customer | null> {
    const rows = await this.connection
      .select()
      .from(customer)
      .where(and(eq(customer.storeId, this.storeId), eq(customer.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findByEmail(email: string): Promise<Customer | null> {
    const rows = await this.connection
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.normalizedEmail, normalizeEmail(email)),
          isNull(customer.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findByIamPrincipalId(iamPrincipalId: string): Promise<Customer | null> {
    return this.findByStoreAndIamPrincipalId(this.storeId, iamPrincipalId);
  }

  @ReadOnly()
  async findByStoreAndIamPrincipalId(
    storeId: string,
    iamPrincipalId: string,
  ): Promise<Customer | null> {
    const rows = await this.connection
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.storeId, storeId),
          eq(customer.iamPrincipalId, iamPrincipalId),
          isNull(customer.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findByIamPrincipalIdIncludingDeleted(
    iamPrincipalId: string,
  ): Promise<Customer | null> {
    const rows = await this.connection
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.iamPrincipalId, iamPrincipalId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<Customer[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          inArray(customer.id, [...new Set(ids)]),
          isNull(customer.deletedAt)
        )
      );
  }

  async create(data: CustomerCreateData): Promise<Customer> {
    const id = await this.generateUuidV7();
    const now = new Date().toISOString();
    const email = data.email?.trim() || null;
    const row: NewCustomer = {
      ...data,
      ...customerNormalizationProjection(data, email),
      id,
      storeId: this.storeId,
      email,
      normalizedEmail: email ? normalizeEmail(email) : null,
      accountStatus: data.accountStatus ?? "GUEST",
      emailVerified: data.emailVerified ?? false,
      phoneVerified: data.phoneVerified ?? false,
      source: normalizeCustomerSource(data.source),
      revision: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const rows = await this.connection.insert(customer).values(row).returning();
    return rows[0];
  }

  async createIfAbsent(data: CustomerCreateData): Promise<Customer | null> {
    const id = await this.generateUuidV7();
    const now = new Date().toISOString();
    const email = data.email?.trim() || null;
    const row: NewCustomer = {
      ...data,
      ...customerNormalizationProjection(data, email),
      id,
      storeId: this.storeId,
      email,
      normalizedEmail: email ? normalizeEmail(email) : null,
      accountStatus: data.accountStatus ?? "GUEST",
      emailVerified: data.emailVerified ?? false,
      phoneVerified: data.phoneVerified ?? false,
      source: normalizeCustomerSource(data.source),
      revision: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const rows = await this.connection
      .insert(customer)
      .values(row)
      .onConflictDoNothing()
      .returning();
    return rows[0] ?? null;
  }

  async claimIamPrincipal(
    id: string,
    data: {
      iamPrincipalId: string;
      iamStatus: "active" | "blocked";
      iamLifecycleDisabled: boolean;
      email: string;
      emailVerified: boolean;
    },
  ): Promise<Customer | null> {
    const rows = await this.connection
      .update(customer)
      .set({
        iamPrincipalId: data.iamPrincipalId,
        iamPrincipalStatus: data.iamStatus,
        iamLifecycleDisabled: data.iamLifecycleDisabled,
        ...(data.iamLifecycleDisabled ? { lifecycleStatus: "DISABLED" as const } : {}),
        accountStatus: "REGISTERED",
        email: data.email.trim(),
        normalizedEmail: normalizeEmail(data.email),
        emailDomainNormalized: normalizeEmailDomain(data.email),
        emailVerified: data.emailVerified,
        updatedAt: new Date().toISOString(),
        revision: sql`${customer.revision} + 1`,
      })
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, id),
          isNull(customer.iamPrincipalId),
          isNull(customer.deletedAt),
          eq(customer.lifecycleStatus, "ACTIVE"),
          inArray(customer.accountStatus, ["GUEST", "INVITED"]),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async update(
    id: string,
    patch: CustomerPatch,
    expectedRevision?: number
  ): Promise<Customer | null> {
    const now = new Date().toISOString();
    const update = {
      ...patch,
      ...customerPatchNormalizationProjection(patch),
      updatedAt: now,
      revision: sql`${customer.revision} + 1`,
    };

    if (patch.email !== undefined) {
      const email = patch.email?.trim() || null;
      Object.assign(update, {
        email,
        normalizedEmail: email ? normalizeEmail(email) : null,
        emailDomainNormalized: normalizeEmailDomain(email),
        ...(email === null ? { emailVerified: false } : {}),
      });
    }
    if (patch.phoneE164 === null) Object.assign(update, { phoneVerified: false });
    if (
      patch.lifecycleStatus !== undefined &&
      patch.iamLifecycleDisabled === undefined
    ) {
      Object.assign(update, { iamLifecycleDisabled: false });
    }

    const conditions = [
      eq(customer.storeId, this.storeId),
      eq(customer.id, id),
      isNull(customer.deletedAt),
    ];
    if (expectedRevision !== undefined) {
      conditions.push(eq(customer.revision, expectedRevision));
    }

    const rows = await this.connection
      .update(customer)
      .set(update)
      .where(and(...conditions))
      .returning();
    return rows[0] ?? null;
  }

  async lockForPrivacyRequest(id: string): Promise<Customer | null> {
    const rows = await this.connection
      .select()
      .from(customer)
      .where(and(eq(customer.storeId, this.storeId), eq(customer.id, id)))
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async applyPrivacyCorrection(
    id: string,
    correction: CustomerPrivacyCorrection,
  ): Promise<Customer | null> {
    const email =
      correction.email === undefined
        ? undefined
        : correction.email?.trim() || null;
    const rows = await this.connection
      .update(customer)
      .set({
        ...correction,
        ...customerPatchNormalizationProjection(correction),
        ...(email !== undefined
          ? {
              email,
              normalizedEmail: email ? normalizeEmail(email) : null,
              emailDomainNormalized: normalizeEmailDomain(email),
              emailVerified: false,
            }
          : {}),
        ...(correction.phoneE164 !== undefined
          ? { phoneVerified: false }
          : {}),
        updatedAt: new Date().toISOString(),
        revision: sql`${customer.revision} + 1`,
      })
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, id),
          eq(customer.lifecycleStatus, "ACTIVE"),
          isNull(customer.deletedAt),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async redact(id: string, redactedAt: string): Promise<Customer | null> {
    const rows = await this.connection
      .update(customer)
      .set({
        iamPrincipalId: null,
        iamPrincipalStatus: null,
        iamLifecycleDisabled: false,
        lifecycleStatus: "REDACTED",
        accountStatus: "GUEST",
        email: null,
        normalizedEmail: null,
        emailDomainNormalized: null,
        emailVerified: false,
        phoneE164: null,
        phoneVerified: false,
        prefix: null,
        firstName: null,
        middleName: null,
        lastName: null,
        suffix: null,
        preferredLocale: null,
        preferredLocaleNormalized: null,
        dateOfBirth: null,
        birthdayMonthDay: null,
        gender: null,
        companyName: null,
        companyNameNormalized: null,
        jobTitle: null,
        note: null,
        blockedReason: null,
        moderationNote: null,
        source: "privacy_redaction",
        createdByUserId: null,
        lastActivityAt: null,
        mergedIntoCustomerId: null,
        redactedAt,
        updatedAt: redactedAt,
        revision: sql`${customer.revision} + 1`,
      })
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, id),
          isNull(customer.deletedAt),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  /**
   * Atomically acquires the aggregate revision for an authenticated customer
   * command. Storefront writes are deliberately restricted to ACTIVE rows.
   */
  async acquireActiveRevision(
    id: string,
    expectedRevision: number
  ): Promise<CustomerRevisionAcquireResult> {
    const rows = await this.connection
      .update(customer)
      .set({
        updatedAt: new Date().toISOString(),
        revision: sql`${customer.revision} + 1`,
      })
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, id),
          eq(customer.lifecycleStatus, "ACTIVE"),
          eq(customer.revision, expectedRevision),
          isNull(customer.deletedAt)
        )
      )
      .returning();
    if (rows[0]) return { status: "acquired", customer: rows[0] };

    const current = await this.findById(id);
    if (!current) return { status: "not_found" };
    if (current.lifecycleStatus !== "ACTIVE") return { status: "inactive" };
    return { status: "conflict", actualRevision: current.revision };
  }

  /**
   * Apply fields after the aggregate revision has already been acquired by a
   * customer-scoped command. This deliberately does not increment revision.
   */
  async patchWithinRevision(
    id: string,
    patch: CustomerPatch
  ): Promise<Customer | null> {
    const update: Record<string, unknown> = {
      ...patch,
      ...customerPatchNormalizationProjection(patch),
      updatedAt: new Date().toISOString(),
    };

    if (patch.email !== undefined) {
      const email = patch.email?.trim() || null;
      Object.assign(update, {
        email,
        normalizedEmail: email ? normalizeEmail(email) : null,
        emailDomainNormalized: normalizeEmailDomain(email),
        ...(email === null ? { emailVerified: false } : {}),
      });
    }
    if (patch.phoneE164 === null) {
      Object.assign(update, { phoneVerified: false });
    }
    if (
      patch.lifecycleStatus !== undefined &&
      patch.iamLifecycleDisabled === undefined
    ) {
      Object.assign(update, { iamLifecycleDisabled: false });
    }

    const rows = await this.connection
      .update(customer)
      .set(update)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, id),
          isNull(customer.deletedAt)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  /** Release a revision reservation only when no later command acquired it. */
  async releaseRevision(id: string, acquiredRevision: number): Promise<boolean> {
    const rows = await this.connection
      .update(customer)
      .set({ revision: sql`${customer.revision} - 1` })
      .where(and(
        eq(customer.storeId, this.storeId),
        eq(customer.id, id),
        eq(customer.revision, acquiredRevision),
        isNull(customer.deletedAt),
      ))
      .returning({ id: customer.id });
    return rows.length === 1;
  }

  async softDelete(
    id: string,
    expectedRevision?: number
  ): Promise<Customer | null> {
    const now = new Date().toISOString();
    const conditions = [
      eq(customer.storeId, this.storeId),
      eq(customer.id, id),
      isNull(customer.deletedAt),
    ];
    if (expectedRevision !== undefined) {
      conditions.push(eq(customer.revision, expectedRevision));
    }
    const rows = await this.connection
      .update(customer)
      .set({
        deletedAt: now,
        updatedAt: now,
        revision: sql`${customer.revision} + 1`,
      })
      .where(and(...conditions))
      .returning();
    return rows[0] ?? null;
  }

  /**
   * Mirror the database's ON DELETE CASCADE policy for a soft-deleted customer.
   * Lifecycle records with restrictive foreign keys are intentionally retained.
   */
  async deleteCascadeOwnedEntities(customerId: string): Promise<void> {
    const ownedTables = [
      customerAddress,
      customerTaxIdentifier,
      customerTaxExemption,
      customerConsent,
      customerGroupMembership,
      customerTagAssignment,
      customerSegmentMembership,
      customerComparison,
      customerWishlist,
      customerExternalReference,
      customerStatistics,
      customerOrderProjection,
      customerCheckoutProjection,
      customerRefundProjection,
      customerMonetaryStatistics,
    ] as const;

    for (const table of ownedTables) {
      await this.connection
        .delete(table)
        .where(and(eq(table.storeId, this.storeId), eq(table.customerId, customerId)));
    }
  }

  @ReadOnly()
  async getConnection(
    input: CustomerConnectionInput
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { where, orderBy, ...pagination } = normalized;
    const resolvedWhere = await this.resolveSegmentWhere(where);
    const mergedWhere: CustomerRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { deletedAt: { _is: null } },
        {
          _or: [
            { currencyCode: { _eq: this.currency } },
            { currencyCode: { _is: null } },
          ],
        },
        ...(resolvedWhere ? [resolvedWhere] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [
      { field: "createdAt", direction: "desc" },
    ];
    const executeInput: CustomerRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: {
        storeId: this.storeId,
        currency: this.currency,
        where: resolvedWhere ?? null,
        orderBy: effectiveOrder,
      },
    };
    const cursorMeta = customerRelayQuery.getSql(executeInput).meta;
    if (cursorMeta.filtersChanged) {
      throw new InvalidCursorError("Cursor does not match the current filters");
    }
    const [result, totalCount] = await Promise.all([
      customerRelayQuery.execute(this.connection, executeInput),
      customerRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({
        cursor,
        nodeId: node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async resolveSegmentWhere(
    where: CustomerConnectionWhere | null | undefined
  ): Promise<CustomerRelayWhere | undefined> {
    if (!where) return undefined;
    const { segmentId, _and, _or, _not, ...fields } = where;
    const resolved: Record<string, unknown> = { ...fields };

    if (_and) {
      resolved._and = await Promise.all(
        _and.map((entry) => this.resolveSegmentWhere(entry))
      );
    }
    if (_or) {
      resolved._or = await Promise.all(
        _or.map((entry) => this.resolveSegmentWhere(entry))
      );
    }
    if (_not) resolved._not = await this.resolveSegmentWhere(_not);
    if (segmentId !== undefined && segmentId !== null) {
      const segmentWhere = await this.customerIdsForSegmentFilter(segmentId);
      resolved._and = [
        ...((resolved._and as unknown[] | undefined) ?? []),
        segmentWhere,
      ];
    }
    return resolved as CustomerRelayWhere;
  }

  private async customerIdsForSegmentFilter(
    filter: SegmentIdFilter | string
  ): Promise<CustomerRelayWhere> {
    const input: SegmentIdFilter = typeof filter === "string" ? { _eq: filter } : filter;
    const positive = [
      ...(input._eq ? [input._eq] : []),
      ...(input._in ?? []),
    ].map(decodeSegmentId);
    const negative = [
      ...(input._neq ? [input._neq] : []),
      ...(input._notIn ?? []),
    ].map(decodeSegmentId);
    const clauses: CustomerRelayWhere[] = [];

    if (positive.length > 0) {
      const ids = await this.findCurrentMemberCustomerIds(positive);
      clauses.push({ id: { _in: ids.length > 0 ? ids : [IMPOSSIBLE_UUID] } });
    }
    if (negative.length > 0) {
      const ids = await this.findCurrentMemberCustomerIds(negative);
      if (ids.length > 0) clauses.push({ id: { _notIn: ids } });
    }
    if (input._is === true || input._isNot === false) {
      const ids = await this.findCurrentMemberCustomerIds();
      if (ids.length > 0) clauses.push({ id: { _notIn: ids } });
    }
    if (input._is === false || input._isNot === true) {
      const ids = await this.findCurrentMemberCustomerIds();
      clauses.push({ id: { _in: ids.length > 0 ? ids : [IMPOSSIBLE_UUID] } });
    }

    if (clauses.length === 0) return {};
    return clauses.length === 1 ? clauses[0] : { _and: clauses };
  }

  private async findCurrentMemberCustomerIds(
    segmentIds?: readonly string[]
  ): Promise<string[]> {
    const active = or(
      isNull(customerSegmentMembership.expiresAt),
      sql`${customerSegmentMembership.expiresAt} > now()`
    );
    const rows = await this.connection
      .selectDistinct({ customerId: customerSegmentMembership.customerId })
      .from(customerSegmentMembership)
      .innerJoin(
        customerSegment,
        and(
          eq(customerSegment.storeId, customerSegmentMembership.storeId),
          eq(customerSegment.id, customerSegmentMembership.segmentId),
          isNull(customerSegment.deletedAt),
          or(
            and(
              eq(customerSegment.type, "MANUAL"),
              sql`${customerSegmentMembership.source} <> 'RULE'`,
            ),
            and(
              eq(customerSegment.type, "DYNAMIC"),
              eq(customerSegment.status, "ACTIVE"),
              eq(customerSegment.materializationStatus, "READY"),
              eq(customerSegmentMembership.source, "RULE"),
              eq(
                customerSegmentMembership.evaluatedDefinitionRevision,
                customerSegment.definitionRevision,
              ),
              eq(
                customerSegmentMembership.evaluatedGeneration,
                customerSegment.evaluationGeneration,
              ),
            ),
          ),
        ),
      )
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          active,
          sql`${customerSegmentMembership.evaluatedAt} <= transaction_timestamp()`,
          segmentIds && segmentIds.length > 0
            ? inArray(customerSegmentMembership.segmentId, [...segmentIds])
            : undefined
        )
      );
    return rows.map((row) => row.customerId);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function customerNormalizationProjection(
  data: Pick<CustomerCreateData, "preferredLocale" | "dateOfBirth" | "companyName">,
  email: string | null,
) {
  return {
    emailDomainNormalized: normalizeEmailDomain(email),
    preferredLocaleNormalized: normalizePreferredLocale(data.preferredLocale),
    birthdayMonthDay: normalizeBirthdayMonthDay(data.dateOfBirth),
    companyNameNormalized: data.companyName?.trim()
      ? normalizeUnicodeSearchValue(data.companyName)
      : null,
  };
}

function customerPatchNormalizationProjection(
  patch: Partial<Pick<NewCustomer, "preferredLocale" | "dateOfBirth" | "companyName" | "source">>,
): Record<string, unknown> {
  return {
    ...(patch.preferredLocale !== undefined
      ? { preferredLocaleNormalized: normalizePreferredLocale(patch.preferredLocale) }
      : {}),
    ...(patch.dateOfBirth !== undefined
      ? { birthdayMonthDay: normalizeBirthdayMonthDay(patch.dateOfBirth) }
      : {}),
    ...(patch.companyName !== undefined
      ? {
          companyNameNormalized: patch.companyName?.trim()
            ? normalizeUnicodeSearchValue(patch.companyName)
            : null,
        }
      : {}),
    ...(patch.source !== undefined ? { source: normalizeCustomerSource(patch.source) } : {}),
  };
}

function decodeSegmentId(id: string): string {
  try {
    return decodeGlobalIdByType(id, GlobalIdEntity.CustomerSegment);
  } catch {
    return id;
  }
}

export function encodeCustomerIdCursor(customerId: string): string {
  assertCustomerId(customerId);
  return Buffer.from(
    JSON.stringify({ version: 1, customerId: customerId.toLowerCase() }),
    "utf8",
  ).toString("base64url");
}

export function decodeCustomerIdCursor(cursor: string): string {
  try {
    const value = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as unknown;
    if (
      !value ||
      typeof value !== "object" ||
      (value as { version?: unknown }).version !== 1 ||
      typeof (value as { customerId?: unknown }).customerId !== "string"
    ) throw new Error("invalid");
    const customerId = (value as { customerId: string }).customerId;
    assertCustomerId(customerId);
    return customerId.toLowerCase();
  } catch {
    throw new Error("Invalid customer ID cursor");
  }
}

function assertCustomerId(customerId: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(customerId)) {
    throw new Error("Invalid customer ID cursor value");
  }
}
