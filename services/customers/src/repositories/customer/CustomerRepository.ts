import {
  createQuery,
  createRelayQuery,
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
  customerListView,
  customerSegmentMembership,
  type Customer,
  type NewCustomer,
} from "../models/index.js";

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
  iamPrincipalId?: string | null;
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

export class CustomerRepository extends BaseRepository {
  private get currency(): string {
    return this.ctx.currency ?? this.ctx.store.defaultCurrency;
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
    const rows = await this.connection
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.iamPrincipalId, iamPrincipalId),
          isNull(customer.deletedAt)
        )
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
      id,
      storeId: this.storeId,
      email,
      normalizedEmail: email ? normalizeEmail(email) : null,
      accountStatus: data.accountStatus ?? "GUEST",
      emailVerified: data.emailVerified ?? false,
      phoneVerified: data.phoneVerified ?? false,
      source: data.source ?? "unknown",
      revision: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const rows = await this.connection.insert(customer).values(row).returning();
    return rows[0];
  }

  async update(
    id: string,
    patch: CustomerPatch,
    expectedRevision?: number
  ): Promise<Customer | null> {
    const now = new Date().toISOString();
    const update = {
      ...patch,
      updatedAt: now,
      revision: sql`${customer.revision} + 1`,
    };

    if (patch.email !== undefined) {
      const email = patch.email?.trim() || null;
      Object.assign(update, {
        email,
        normalizedEmail: email ? normalizeEmail(email) : null,
        ...(email === null ? { emailVerified: false } : {}),
      });
    }
    if (patch.phoneE164 === null) Object.assign(update, { phoneVerified: false });

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

  async softDelete(id: string, expectedRevision?: number): Promise<boolean> {
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
      .returning({ id: customer.id });
    return rows.length > 0;
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
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          active,
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

function decodeSegmentId(id: string): string {
  try {
    return decodeGlobalIdByType(id, GlobalIdEntity.CustomerSegment);
  } catch {
    return id;
  }
}
