import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  accounts,
  type Account,
  type NewAccount,
} from "../models/index.js";

export class AccountRepository extends BaseRepository {
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
      .where(
        and(eq(accounts.storeId, this.storeId), inArray(accounts.id, [...ids])),
      );
  }

  async findByCustomerAndProgram(
    customerId: string,
    programId: string,
  ): Promise<Account | null> {
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
      .where(
        and(
          eq(accounts.storeId, this.storeId),
          eq(accounts.customerId, customerId),
        ),
      )
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
        | "status"
        | "mergedIntoAccountId"
        | "suspendedReason"
        | "suspendedAt"
        | "closedAt"
      >
    >,
    expectedRevision?: number,
  ): Promise<Account | null> {
    const conditions = [
      eq(accounts.storeId, this.storeId),
      eq(accounts.id, id),
    ];
    if (expectedRevision !== undefined) {
      conditions.push(eq(accounts.revision, expectedRevision));
    }
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
