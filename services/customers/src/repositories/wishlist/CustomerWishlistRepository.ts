import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  normalizeRelayPagination,
  type RelayPaginationInput,
  type RepositoryConnectionResult,
} from "../connection.js";
import {
  customer,
  customerWishlist,
  customerWishlistItem,
  type CustomerWishlist,
  type CustomerWishlistItem,
  type NewCustomerWishlist,
  type NewCustomerWishlistItem,
} from "../models/index.js";

const wishlistRelayQuery = createRelayQuery(
  createQuery(customerWishlist).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "customerWishlist", tieBreaker: "id" },
);

const wishlistItemRelayQuery = createRelayQuery(
  createQuery(customerWishlistItem).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "customerWishlistItem", tieBreaker: "id" },
);

type WishlistRelayInput = InferRelayInput<typeof wishlistRelayQuery>;
type WishlistItemRelayInput = InferRelayInput<typeof wishlistItemRelayQuery>;

export type CustomerWishlistConnectionInput = RelayPaginationInput & {
  customerId: string;
};

export type CustomerWishlistItemConnectionInput = RelayPaginationInput & {
  customerId: string;
  wishlistId: string;
};

export type WishlistOptimisticMutationResult<T> =
  | { status: "applied"; value: T }
  | { status: "not_found" }
  | { status: "name_taken" }
  | { status: "conflict"; value: CustomerWishlist }
  | { status: "default_protected"; value: CustomerWishlist };

export type WishlistCreateRepositoryResult =
  | { status: "created"; value: CustomerWishlist }
  | { status: "customer_not_found" }
  | { status: "name_taken" };

const EMPTY_PAGE_INFO: PageInfo = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
};

/**
 * Customer-owned wishlist persistence. Every public method scopes reads and
 * writes by the trusted Store plus the explicit owning Customer.
 */
export class CustomerWishlistRepository extends BaseRepository {
  @ReadOnly()
  async findById(customerId: string, wishlistId: string): Promise<CustomerWishlist | null> {
    const rows = await this.connection
      .select({ wishlist: customerWishlist })
      .from(customerWishlist)
      .innerJoin(
        customer,
        and(
          eq(customer.id, customerWishlist.customerId),
          eq(customer.storeId, customerWishlist.storeId),
        ),
      )
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          eq(customerWishlist.customerId, customerId),
          eq(customerWishlist.id, wishlistId),
          eq(customer.lifecycleStatus, "ACTIVE"),
          isNull(customer.deletedAt),
        ),
      )
      .limit(1);
    return rows[0]?.wishlist ?? null;
  }

  @ReadOnly()
  async getByIds(customerId: string, wishlistIds: readonly string[]): Promise<CustomerWishlist[]> {
    if (wishlistIds.length === 0) return [];
    const rows = await this.connection
      .select({ wishlist: customerWishlist })
      .from(customerWishlist)
      .innerJoin(
        customer,
        and(
          eq(customer.id, customerWishlist.customerId),
          eq(customer.storeId, customerWishlist.storeId),
        ),
      )
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          eq(customerWishlist.customerId, customerId),
          inArray(customerWishlist.id, [...new Set(wishlistIds)]),
          eq(customer.lifecycleStatus, "ACTIVE"),
          isNull(customer.deletedAt),
        ),
      );
    return rows.map((row) => row.wishlist);
  }

  @ReadOnly()
  async getDefaultByCustomerIds(customerIds: readonly string[]): Promise<CustomerWishlist[]> {
    if (customerIds.length === 0) return [];
    const rows = await this.connection
      .select({ wishlist: customerWishlist })
      .from(customerWishlist)
      .innerJoin(
        customer,
        and(
          eq(customer.id, customerWishlist.customerId),
          eq(customer.storeId, customerWishlist.storeId),
        ),
      )
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          inArray(customerWishlist.customerId, [...new Set(customerIds)]),
          eq(customerWishlist.isDefault, true),
          eq(customer.lifecycleStatus, "ACTIVE"),
          isNull(customer.deletedAt),
        ),
      );
    return rows.map((row) => row.wishlist);
  }

  @ReadOnly()
  async findItemById(customerId: string, itemId: string): Promise<CustomerWishlistItem | null> {
    const rows = await this.connection
      .select({ item: customerWishlistItem })
      .from(customerWishlistItem)
      .innerJoin(
        customerWishlist,
        and(
          eq(customerWishlist.id, customerWishlistItem.wishlistId),
          eq(customerWishlist.storeId, customerWishlistItem.storeId),
        ),
      )
      .innerJoin(
        customer,
        and(
          eq(customer.id, customerWishlist.customerId),
          eq(customer.storeId, customerWishlist.storeId),
        ),
      )
      .where(
        and(
          eq(customerWishlistItem.storeId, this.storeId),
          eq(customerWishlist.customerId, customerId),
          eq(customerWishlistItem.id, itemId),
          eq(customer.lifecycleStatus, "ACTIVE"),
          isNull(customer.deletedAt),
        ),
      )
      .limit(1);
    return rows[0]?.item ?? null;
  }

  @ReadOnly()
  async getItemsByIds(
    customerId: string,
    itemIds: readonly string[],
  ): Promise<CustomerWishlistItem[]> {
    if (itemIds.length === 0) return [];
    const rows = await this.connection
      .select({ item: customerWishlistItem })
      .from(customerWishlistItem)
      .innerJoin(
        customerWishlist,
        and(
          eq(customerWishlist.id, customerWishlistItem.wishlistId),
          eq(customerWishlist.storeId, customerWishlistItem.storeId),
        ),
      )
      .innerJoin(
        customer,
        and(
          eq(customer.id, customerWishlist.customerId),
          eq(customer.storeId, customerWishlist.storeId),
        ),
      )
      .where(
        and(
          eq(customerWishlistItem.storeId, this.storeId),
          eq(customerWishlist.customerId, customerId),
          inArray(customerWishlistItem.id, [...new Set(itemIds)]),
          eq(customer.lifecycleStatus, "ACTIVE"),
          isNull(customer.deletedAt),
        ),
      );
    return rows.map((row) => row.item);
  }

  @Transactional()
  async create(data: {
    customerId: string;
    name: string;
    normalizedName: string;
  }): Promise<WishlistCreateRepositoryResult> {
    if (!(await this.lockActiveCustomer(data.customerId))) {
      return { status: "customer_not_found" };
    }
    const currentDefault = await this.findDefault(data.customerId);
    const created = await this.insert({
      ...data,
      isDefault: currentDefault === null,
    });
    return created ? { status: "created", value: created } : { status: "name_taken" };
  }

  @Transactional()
  async getOrCreateDefault(
    customerId: string,
    data: { name: string; normalizedName: string },
  ): Promise<CustomerWishlist | null> {
    if (!(await this.lockActiveCustomer(customerId))) return null;

    const existingDefault = await this.findDefault(customerId);
    if (existingDefault) return existingDefault;

    const existingWishlist = await this.connection
      .select()
      .from(customerWishlist)
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          eq(customerWishlist.customerId, customerId),
        ),
      )
      .orderBy(asc(customerWishlist.createdAt), asc(customerWishlist.id))
      .limit(1);
    if (existingWishlist[0]) {
      const promoted = await this.connection
        .update(customerWishlist)
        .set({
          isDefault: true,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(customerWishlist.storeId, this.storeId),
            eq(customerWishlist.customerId, customerId),
            eq(customerWishlist.id, existingWishlist[0].id),
          ),
        )
        .returning();
      return promoted[0] ?? null;
    }

    const created = await this.insert({
      customerId,
      ...data,
      isDefault: true,
    });
    if (created) return created;
    return this.findDefault(customerId);
  }

  @Transactional()
  async updateName(input: {
    customerId: string;
    wishlistId: string;
    expectedUpdatedAt: string;
    name: string;
    normalizedName: string;
  }): Promise<WishlistOptimisticMutationResult<CustomerWishlist>> {
    if (!(await this.lockActiveCustomer(input.customerId))) {
      return { status: "not_found" };
    }
    const current = await this.findById(input.customerId, input.wishlistId);
    if (!current) return { status: "not_found" };
    if (!sameInstant(current.updatedAt, input.expectedUpdatedAt)) {
      return { status: "conflict", value: current };
    }
    if (current.name === input.name && current.normalizedName === input.normalizedName) {
      return { status: "applied", value: current };
    }
    const duplicateName = await this.connection
      .select({ id: customerWishlist.id })
      .from(customerWishlist)
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          eq(customerWishlist.customerId, input.customerId),
          eq(customerWishlist.normalizedName, input.normalizedName),
          ne(customerWishlist.id, input.wishlistId),
        ),
      )
      .limit(1);
    if (duplicateName.length > 0) return { status: "name_taken" };

    const rows = await this.connection
      .update(customerWishlist)
      .set({
        name: input.name,
        normalizedName: input.normalizedName,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          eq(customerWishlist.customerId, input.customerId),
          eq(customerWishlist.id, input.wishlistId),
        ),
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };

    const latest = await this.findById(input.customerId, input.wishlistId);
    return latest ? { status: "conflict", value: latest } : { status: "not_found" };
  }

  @Transactional()
  async delete(input: {
    customerId: string;
    wishlistId: string;
    expectedUpdatedAt: string;
  }): Promise<WishlistOptimisticMutationResult<CustomerWishlist>> {
    if (!(await this.lockActiveCustomer(input.customerId))) {
      return { status: "not_found" };
    }
    const currentRows = await this.connection
      .select()
      .from(customerWishlist)
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          eq(customerWishlist.customerId, input.customerId),
          eq(customerWishlist.id, input.wishlistId),
        ),
      )
      .limit(1)
      .for("update");
    const current = currentRows[0];
    if (!current) return { status: "not_found" };
    if (current.isDefault) {
      return { status: "default_protected", value: current };
    }
    if (!sameInstant(current.updatedAt, input.expectedUpdatedAt)) {
      return { status: "conflict", value: current };
    }

    const deleted = await this.connection
      .delete(customerWishlist)
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          eq(customerWishlist.customerId, input.customerId),
          eq(customerWishlist.id, input.wishlistId),
        ),
      )
      .returning();
    return deleted[0] ? { status: "applied", value: deleted[0] } : { status: "not_found" };
  }

  @Transactional()
  async addItem(input: {
    customerId: string;
    wishlistId: string;
    productId: string;
  }): Promise<CustomerWishlistItem | null> {
    const wishlist = await this.findById(input.customerId, input.wishlistId);
    if (!wishlist) return null;

    const row: NewCustomerWishlistItem = {
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      wishlistId: wishlist.id,
      productId: input.productId,
      addedAt: new Date().toISOString(),
    };
    const inserted = await this.connection
      .insert(customerWishlistItem)
      .values(row)
      .onConflictDoNothing()
      .returning();
    if (inserted[0]) return inserted[0];

    const existing = await this.connection
      .select()
      .from(customerWishlistItem)
      .where(
        and(
          eq(customerWishlistItem.storeId, this.storeId),
          eq(customerWishlistItem.wishlistId, wishlist.id),
          eq(customerWishlistItem.productId, input.productId),
        ),
      )
      .limit(1);
    return existing[0] ?? null;
  }

  @Transactional()
  async removeItem(customerId: string, itemId: string): Promise<CustomerWishlistItem | null> {
    const item = await this.findItemById(customerId, itemId);
    if (!item) return null;
    const deleted = await this.connection
      .delete(customerWishlistItem)
      .where(
        and(
          eq(customerWishlistItem.storeId, this.storeId),
          eq(customerWishlistItem.id, item.id),
          eq(customerWishlistItem.wishlistId, item.wishlistId),
        ),
      )
      .returning();
    return deleted[0] ?? null;
  }

  @ReadOnly()
  async getConnection(input: CustomerWishlistConnectionInput): Promise<RepositoryConnectionResult> {
    if (!(await this.isActiveCustomer(input.customerId))) {
      return emptyConnection();
    }
    const normalized = normalizeRelayPagination(input);
    const { customerId, ...pagination } = normalized;
    const where: WishlistRelayInput["where"] = {
      _and: [{ storeId: { _eq: this.storeId } }, { customerId: { _eq: customerId } }],
    };
    const query: WishlistRelayInput = {
      ...pagination,
      where,
      orderBy: [
        { field: "createdAt", direction: "asc" },
        { field: "id", direction: "desc" },
      ],
      filters: { storeId: this.storeId, customerId },
    };
    const [result, totalCount] = await Promise.all([
      wishlistRelayQuery.execute(this.connection, query),
      wishlistRelayQuery.count(this.connection, { where }),
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

  @ReadOnly()
  async getItemConnection(
    input: CustomerWishlistItemConnectionInput,
  ): Promise<RepositoryConnectionResult> {
    if (!(await this.findById(input.customerId, input.wishlistId))) {
      return emptyConnection();
    }
    const normalized = normalizeRelayPagination(input);
    const { customerId: _customerId, wishlistId, ...pagination } = normalized;
    const where: WishlistItemRelayInput["where"] = {
      _and: [{ storeId: { _eq: this.storeId } }, { wishlistId: { _eq: wishlistId } }],
    };
    const query: WishlistItemRelayInput = {
      ...pagination,
      where,
      orderBy: [
        { field: "addedAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
      filters: { storeId: this.storeId, wishlistId },
    };
    const [result, totalCount] = await Promise.all([
      wishlistItemRelayQuery.execute(this.connection, query),
      wishlistItemRelayQuery.count(this.connection, { where }),
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

  async deleteForCustomer(customerId: string): Promise<number> {
    const rows = await this.connection
      .delete(customerWishlist)
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          eq(customerWishlist.customerId, customerId),
        ),
      )
      .returning({ id: customerWishlist.id });
    return rows.length;
  }

  private async insert(
    data: Pick<NewCustomerWishlist, "customerId" | "name" | "normalizedName" | "isDefault">,
  ): Promise<CustomerWishlist | null> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(customerWishlist)
      .values({
        ...data,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();
    return rows[0] ?? null;
  }

  private async findDefault(customerId: string): Promise<CustomerWishlist | null> {
    const rows = await this.connection
      .select()
      .from(customerWishlist)
      .where(
        and(
          eq(customerWishlist.storeId, this.storeId),
          eq(customerWishlist.customerId, customerId),
          eq(customerWishlist.isDefault, true),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  private async isActiveCustomer(customerId: string): Promise<boolean> {
    const rows = await this.connection
      .select({ id: customer.id })
      .from(customer)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, customerId),
          eq(customer.lifecycleStatus, "ACTIVE"),
          isNull(customer.deletedAt),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  private async lockActiveCustomer(customerId: string): Promise<boolean> {
    const rows = await this.connection
      .select({ id: customer.id })
      .from(customer)
      .where(
        and(
          eq(customer.storeId, this.storeId),
          eq(customer.id, customerId),
          eq(customer.lifecycleStatus, "ACTIVE"),
          isNull(customer.deletedAt),
        ),
      )
      .limit(1)
      .for("update");
    return rows.length > 0;
  }
}

function emptyConnection(): RepositoryConnectionResult {
  return {
    edges: [],
    pageInfo: EMPTY_PAGE_INFO,
    totalCount: 0,
  };
}

function sameInstant(left: string, right: string): boolean {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && leftTime === rightTime;
}
