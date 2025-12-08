import { createQuery } from "@shopana/drizzle-query";
import { BaseRepository } from "./BaseRepository.js";
import { product, type Product } from "./models/index.js";

const productQuery = createQuery(product).maxLimit(100).defaultLimit(20);

export class ProductQueryRepository extends BaseRepository {
  async getMany(input?: {
    where?: Record<string, unknown>;
    order?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    return productQuery.execute(this.connection, {
      ...input,
      // Default order by createdAt desc, id desc for stable pagination
      order: (input?.order as never) ?? ["createdAt:desc", "id:desc"],
      where: {
        ...input?.where,
        projectId: this.projectId,
        deletedAt: { $is: null },
      },
    });
  }

  async getOne(id: string): Promise<Product | null> {
    const results = await productQuery.execute(this.connection, {
      where: {
        id,
        projectId: this.projectId,
        deletedAt: { $is: null },
      },
      limit: 1,
    });

    return results[0] ?? null;
  }
}
