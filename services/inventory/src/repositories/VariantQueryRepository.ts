import { createQuery } from "@shopana/drizzle-query";
import { BaseRepository } from "./BaseRepository.js";
import { variant, type Variant } from "./models/index.js";

const variantQuery = createQuery(variant).maxLimit(100).defaultLimit(20);

export class VariantQueryRepository extends BaseRepository {
  async getMany(input?: {
    where?: Record<string, unknown>;
    order?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Variant[]> {
    return variantQuery.execute(this.connection, {
      ...input,
      order: input?.order as never,
      where: {
        ...input?.where,
        projectId: this.projectId,
        deletedAt: { $is: null },
      },
    });
  }

  async getOne(id: string): Promise<Variant | null> {
    const results = await variantQuery.execute(this.connection, {
      where: {
        id,
        projectId: this.projectId,
        deletedAt: { $is: null },
      },
      limit: 1,
    });

    return results[0] ?? null;
  }

  async getByProductId(
    productId: string,
    input?: { order?: string[]; limit?: number; offset?: number }
  ): Promise<Variant[]> {
    return variantQuery.execute(this.connection, {
      ...input,
      order: input?.order as never,
      where: {
        productId,
        projectId: this.projectId,
        deletedAt: { $is: null },
      },
    });
  }

  async countByProductId(productId: string): Promise<number> {
    const results = await variantQuery.execute(this.connection, {
      where: {
        productId,
        projectId: this.projectId,
        deletedAt: { $is: null },
      },
    });
    return results.length;
  }
}
