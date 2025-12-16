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
  user,
  type User,
  type NewUser,
} from "../models/index.js";

const userQuery = createQuery(user).maxLimit(100).defaultLimit(20);

export const userRelayQuery = createRelayQuery(
  createQuery(user).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "user", tieBreaker: "id" }
);

export type UserQueryInput = InferExecuteOptions<typeof userQuery>;
export type UserRelayInput = InferRelayInput<typeof userRelayQuery>;

export interface UserConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class UserRepository extends BaseRepository {
  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          eq(user.projectId, this.projectId),
          eq(user.id, id),
          isNull(user.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.connection
      .select()
      .from(user)
      .where(
        and(
          eq(user.projectId, this.projectId),
          eq(user.id, id),
          isNull(user.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.connection
      .select()
      .from(user)
      .where(
        and(
          eq(user.projectId, this.projectId),
          eq(user.email, email),
          isNull(user.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: { email: string }): Promise<User> {
    const id = randomUUID();
    const now = new Date();

    const newUser: NewUser = {
      projectId: this.projectId,
      id,
      email: data.email,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await this.connection
      .insert(user)
      .values(newUser)
      .returning();

    return result[0];
  }

  async touch(id: string): Promise<void> {
    await this.connection
      .update(user)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(user.projectId, this.projectId),
          eq(user.id, id)
        )
      );
  }

  async update(
    id: string,
    data: { email?: string }
  ): Promise<User | null> {
    const updateData: Partial<NewUser> = {
      updatedAt: new Date(),
    };

    if (data.email !== undefined) updateData.email = data.email;

    const result = await this.connection
      .update(user)
      .set(updateData)
      .where(
        and(
          eq(user.projectId, this.projectId),
          eq(user.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.connection
      .update(user)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(user.projectId, this.projectId),
          eq(user.id, id),
          isNull(user.deletedAt)
        )
      )
      .returning({ id: user.id });

    return result.length > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(user)
      .where(
        and(
          eq(user.projectId, this.projectId),
          eq(user.id, id)
        )
      )
      .returning({ id: user.id });

    return result.length > 0;
  }

  // ============ Query ============

  async count(): Promise<number> {
    const result = await this.connection
      .select({ count: count() })
      .from(user)
      .where(
        and(
          eq(user.projectId, this.projectId),
          isNull(user.deletedAt)
        )
      );
    return result[0]?.count ?? 0;
  }

  async getConnection(args: UserRelayInput): Promise<UserConnectionResult> {
    const { where, order, ...paginationArgs } = args;

    // Merge user-provided where with projectId and deletedAt filters
    const mergedWhere: UserRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.projectId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput: UserRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      order: order ?? [
        { field: "createdAt", order: "desc" },
        { field: "id", order: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      userRelayQuery.execute(this.connection, executeInput),
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

  async getMany(input?: UserQueryInput): Promise<User[]> {
    return userQuery.execute(this.connection, {
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

  async getOne(id: string): Promise<User | null> {
    const results = await userQuery.execute(this.connection, {
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

  async getByIds(userIds: readonly string[]): Promise<User[]> {
    return this.connection
      .select()
      .from(user)
      .where(
        and(
          eq(user.projectId, this.projectId),
          inArray(user.id, [...userIds]),
          isNull(user.deletedAt)
        )
      );
  }
}
