import {
  createSchema,
  createQueryBuilder,
  type TypedSchemaInput,
  type TypedSchemaResult,
  type QueryBuilderConfig,
} from "@shopana/drizzle-gql-toolkit";
import { BaseRepository } from "./BaseRepository.js";
import { variant } from "./models/index.js";

const variantSchema = createSchema({
  table: variant,
  tableName: "inventory.variant",
  fields: {
    id: { column: "id" },
    projectId: { column: "project_id" },
    productId: { column: "product_id" },
    isDefault: { column: "is_default" },
    handle: { column: "handle" },
    sku: { column: "sku" },
    externalSystem: { column: "external_system" },
    externalId: { column: "external_id" },
    createdAt: { column: "created_at" },
    updatedAt: { column: "updated_at" },
    deletedAt: { column: "deleted_at" },
  },
});

type QueryInput = TypedSchemaInput<typeof variantSchema>;
type QueryResult = TypedSchemaResult<typeof variantSchema>;

const defaultConfig: QueryBuilderConfig = {
  maxLimit: 100,
  defaultLimit: 20,
};

export class VariantQueryRepository extends BaseRepository {
  private readonly qb = createQueryBuilder(variantSchema, defaultConfig);

  async getMany(input?: QueryInput) {
    return this.qb.query(this.connection, {
      ...input,
      where: {
        ...input?.where,
        projectId: this.projectId,
        deletedAt: { $is: null },
      },
    });
  }

  async getOne(id: string) {
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

  async getByProductId(productId: string, input?: Omit<QueryInput, "where">) {
    return this.qb.query(this.connection, {
      ...input,
      where: {
        productId,
        projectId: this.projectId,
        deletedAt: { $is: null },
      },
    });
  }

  async countByProductId(productId: string): Promise<number> {
    const results = await this.qb.query(this.connection, {
      where: {
        productId,
        projectId: this.projectId,
        deletedAt: { $is: null },
      },
    });
    return results.length;
  }
}
