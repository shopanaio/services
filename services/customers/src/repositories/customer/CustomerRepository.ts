import { and, eq, inArray, isNull, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferExecuteOptions,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  customer,
  type Customer,
  type NewCustomer,
} from "../models/index.js";

const customerQuery = createQuery(customer).maxLimit(100).defaultLimit(20);

export const customerRelayQuery = createRelayQuery(
  createQuery(customer).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "customer", tieBreaker: "id" }
);

export type CustomerQueryInput = InferExecuteOptions<typeof customerQuery>;
export type CustomerRelayInput = InferRelayInput<typeof customerRelayQuery>;

export interface CustomerConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class CustomerRepository extends BaseRepository {
  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: customer.id })
      .from(customer)
      .where(
        and(
          eq(customer.projectId, this.projectId),
          eq(customer.id, id),
          isNull(customer.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async findById(id: string): Promise<Customer | null> {
    const result = await this.connection
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.projectId, this.projectId),
          eq(customer.id, id),
          isNull(customer.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const result = await this.connection
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.projectId, this.projectId),
          eq(customer.email, email),
          isNull(customer.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: { email: string }): Promise<Customer> {
    const id = randomUUID();
    const now = new Date();

    const newCustomer: NewCustomer = {
      projectId: this.projectId,
      id,
      email: data.email,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await this.connection
      .insert(customer)
      .values(newCustomer)
      .returning();

    return result[0];
  }

  async touch(id: string): Promise<void> {
    await this.connection
      .update(customer)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(customer.projectId, this.projectId),
          eq(customer.id, id)
        )
      );
  }

  async update(
    id: string,
    data: { email?: string }
  ): Promise<Customer | null> {
    const updateData: Partial<NewCustomer> = {
      updatedAt: new Date(),
    };

    if (data.email !== undefined) updateData.email = data.email;

    const result = await this.connection
      .update(customer)
      .set(updateData)
      .where(
        and(
          eq(customer.projectId, this.projectId),
          eq(customer.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.connection
      .update(customer)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(customer.projectId, this.projectId),
          eq(customer.id, id),
          isNull(customer.deletedAt)
        )
      )
      .returning({ id: customer.id });

    return result.length > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(customer)
      .where(
        and(
          eq(customer.projectId, this.projectId),
          eq(customer.id, id)
        )
      )
      .returning({ id: customer.id });

    return result.length > 0;
  }

  // ============ Query ============

  async count(): Promise<number> {
    const result = await this.connection
      .select({ count: count() })
      .from(customer)
      .where(
        and(
          eq(customer.projectId, this.projectId),
          isNull(customer.deletedAt)
        )
      );
    return result[0]?.count ?? 0;
  }

  async getConnection(args: CustomerRelayInput): Promise<CustomerConnectionResult> {
    const { where, order, ...paginationArgs } = args;

    // Merge customer-provided where with projectId and deletedAt filters
    const mergedWhere: CustomerRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.projectId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput: CustomerRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      order: order ?? [
        { field: "createdAt", order: "desc" },
        { field: "id", order: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      customerRelayQuery.execute(this.connection, executeInput),
      this.count(),
    ]);

    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        nodeId: edge.node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  async getMany(input?: CustomerQueryInput): Promise<Customer[]> {
    return customerQuery.execute(this.connection, {
      ...input,
      order: input?.order ?? [
        { field: "createdAt", order: "desc" },
        { field: "id", order: "desc" },
      ],
      where: {
        ...input?.where,
        projectId: { _eq: this.projectId },
        deletedAt: { _is: null },
      },
    });
  }

  async getOne(id: string): Promise<Customer | null> {
    const results = await customerQuery.execute(this.connection, {
      where: {
        id: { _eq: id },
        projectId: { _eq: this.projectId },
        deletedAt: { _is: null },
      },
      limit: 1,
    });

    return results[0] ?? null;
  }

  // ============ Loader ============

  async getByIds(customerIds: readonly string[]): Promise<Customer[]> {
    return this.connection
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.projectId, this.projectId),
          inArray(customer.id, [...customerIds]),
          isNull(customer.deletedAt)
        )
      );
  }
}
