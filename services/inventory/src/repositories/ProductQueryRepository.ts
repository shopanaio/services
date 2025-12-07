import {
  createSchema,
  createQueryBuilder,
  type TypedSchemaInput,
  type TypedSchemaResult,
  type QueryBuilderConfig,
} from "@shopana/drizzle-gql-toolkit";
import { BaseRepository } from "./BaseRepository.js";
import { product } from "./models/index.js";

const productSchema = createSchema({
  table: product,
  tableName: "inventory.product",
  fields: {
    id: { column: "id" },
    projectId: { column: "project_id" },
    handle: { column: "handle" },
    publishedAt: { column: "published_at" },
    createdAt: { column: "created_at" },
    updatedAt: { column: "updated_at" },
    deletedAt: { column: "deleted_at" },
  },
});

type QueryInput = TypedSchemaInput<typeof productSchema>;
type QueryResult = TypedSchemaResult<typeof productSchema>;

const defaultConfig: QueryBuilderConfig = {
  maxLimit: 100,
  defaultLimit: 20,
};

export class ProductQueryRepository extends BaseRepository {
  private readonly qb = createQueryBuilder(productSchema, defaultConfig);

  async getMany(input?: QueryInput): Promise<QueryResult[]> {
    return this.qb.query(this.connection, {
      ...input,
      where: {
        ...input?.where,
        projectId: this.projectId,
        deletedAt: { $is: null },
      },
    });
  }

  async getOne(id: string): Promise<QueryResult | null> {
    const results = await this.qb.query(this.connection, {
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
