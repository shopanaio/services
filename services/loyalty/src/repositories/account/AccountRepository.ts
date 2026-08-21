import { and, asc, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  accounts,
  accountBalances,
  tierMemberships,
  type Account,
  type NewAccount,
} from "../models/index.js";

const accountRelayQuery = createRelayQuery(
  createQuery(accounts).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "loyalty-account", tieBreaker: "id" },
);

type AccountRelayInput = InferRelayInput<typeof accountRelayQuery>;

export interface AccountConnectionInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  where?: {
    ids?: readonly string[];
    programIds?: readonly string[];
    customerIds?: readonly string[];
    statuses?: readonly Account["status"][];
    minimumAvailablePoints?: bigint;
    hasDebt?: boolean;
    tierIds?: readonly string[];
  };
}

export interface AccountConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class AccountRepository extends BaseRepository {
  async getConnection(input: AccountConnectionInput): Promise<AccountConnectionResult> {
    const { where, ...pagination } = input;
    const predicates = [eq(accounts.storeId, this.storeId)];
    if (where?.ids?.length) predicates.push(inArray(accounts.id, [...where.ids]));
    if (where?.programIds?.length)
      predicates.push(inArray(accounts.programId, [...where.programIds]));
    if (where?.customerIds?.length)
      predicates.push(inArray(accounts.customerId, [...where.customerIds]));
    if (where?.statuses?.length) predicates.push(inArray(accounts.status, [...where.statuses]));
    if (where?.minimumAvailablePoints !== undefined) {
      predicates.push(gte(accountBalances.availablePoints, where.minimumAvailablePoints));
    }
    if (where?.hasDebt === true) predicates.push(gt(accountBalances.debtPoints, 0n));
    if (where?.hasDebt === false) predicates.push(eq(accountBalances.debtPoints, 0n));
    if (where?.tierIds?.length)
      predicates.push(inArray(tierMemberships.tierId, [...where.tierIds]));

    const needsBalance =
      where?.minimumAvailablePoints !== undefined || where?.hasDebt !== undefined;
    const needsTier = Boolean(where?.tierIds?.length);
    let query = this.connection.selectDistinct({ id: accounts.id }).from(accounts).$dynamic();
    if (needsBalance) {
      query = query.innerJoin(
        accountBalances,
        and(
          eq(accountBalances.storeId, accounts.storeId),
          eq(accountBalances.accountId, accounts.id),
        ),
      );
    }
    if (needsTier) {
      query = query.innerJoin(
        tierMemberships,
        and(
          eq(tierMemberships.storeId, accounts.storeId),
          eq(tierMemberships.accountId, accounts.id),
          eq(tierMemberships.status, "ACTIVE"),
        ),
      );
    }
    const matchingIds = (await query.where(and(...predicates))).map(({ id }) => id);
    const relayWhere: AccountRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        {
          id: {
            _in: matchingIds.length > 0 ? matchingIds : ["00000000-0000-0000-0000-000000000000"],
          },
        },
      ],
    };
    const relayInput: AccountRelayInput = {
      ...pagination,
      where: relayWhere,
      orderBy: [
        { field: "openedAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      accountRelayQuery.execute(this.connection, relayInput),
      accountRelayQuery.count(this.connection, { where: relayWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }
  async findById(id: string): Promise<Account | null> {
    const rows = await this.connection
      .select()
      .from(accounts)
      .where(and(eq(accounts.storeId, this.storeId), eq(accounts.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async lockById(id: string): Promise<Account | null> {
    const rows = await this.connection
      .select()
      .from(accounts)
      .where(and(eq(accounts.storeId, this.storeId), eq(accounts.id, id)))
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async getByIds(ids: readonly string[]): Promise<Account[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(accounts)
      .where(and(eq(accounts.storeId, this.storeId), inArray(accounts.id, [...ids])));
  }

  async getByCustomerIdsAndProgramIds(
    customerIds: readonly string[],
    programIds: readonly string[],
  ): Promise<Account[]> {
    if (customerIds.length === 0 || programIds.length === 0) return [];
    return this.connection
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.storeId, this.storeId),
          inArray(accounts.customerId, [...customerIds]),
          inArray(accounts.programId, [...programIds]),
        ),
      );
  }

  async findByCustomerAndProgram(customerId: string, programId: string): Promise<Account | null> {
    const rows = await this.connection
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.storeId, this.storeId),
          eq(accounts.customerId, customerId),
          eq(accounts.programId, programId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listByCustomer(customerId: string): Promise<Account[]> {
    return this.connection
      .select()
      .from(accounts)
      .where(and(eq(accounts.storeId, this.storeId), eq(accounts.customerId, customerId)))
      .orderBy(desc(accounts.openedAt), desc(accounts.id));
  }

  async listForStore(limit = 100): Promise<Account[]> {
    return this.connection
      .select()
      .from(accounts)
      .where(eq(accounts.storeId, this.storeId))
      .orderBy(asc(accounts.id))
      .limit(limit)
      .for("update", { skipLocked: true });
  }

  async listAllForStore(): Promise<Account[]> {
    return this.connection
      .select()
      .from(accounts)
      .where(eq(accounts.storeId, this.storeId))
      .orderBy(asc(accounts.id));
  }

  async create(input: Omit<NewAccount, "storeId">): Promise<Account> {
    const rows = await this.connection
      .insert(accounts)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async createIfMissing(input: Omit<NewAccount, "storeId">): Promise<Account> {
    const rows = await this.connection
      .insert(accounts)
      .values({ ...input, storeId: this.storeId })
      .onConflictDoNothing()
      .returning();
    if (rows[0]) return rows[0];
    const existing = await this.findByCustomerAndProgram(input.customerId, input.programId);
    if (!existing) throw new Error("Loyalty account could not be created or resolved");
    return existing;
  }

  async updateState(
    id: string,
    input: Partial<
      Pick<
        NewAccount,
        "status" | "mergedIntoAccountId" | "suspendedReason" | "suspendedAt" | "closedAt"
      >
    >,
  ): Promise<Account | null> {
    const conditions = [eq(accounts.storeId, this.storeId), eq(accounts.id, id)];
    const rows = await this.connection
      .update(accounts)
      .set({
        ...input,
        revision: sql`${accounts.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(and(...conditions))
      .returning();
    return rows[0] ?? null;
  }
}
