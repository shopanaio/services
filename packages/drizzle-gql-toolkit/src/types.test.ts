/**
 * Type-level tests for drizzle-gql-toolkit
 * These tests verify TypeScript type inference at compile time
 */

import { pgTable, text, integer, uuid, timestamp } from "drizzle-orm/pg-core";
import { createSchema, createQueryBuilder } from "./index.js";

// ============================================================================
// Test utilities
// ============================================================================

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

// ============================================================================
// Test tables
// ============================================================================

const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  age: integer("age"),
  createdAt: timestamp("created_at").notNull(),
});

const posts = pgTable("posts", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: uuid("author_id").notNull(),
  views: integer("views").default(0),
});

const translations = pgTable("translations", {
  id: uuid("id").primaryKey(),
  entityId: uuid("entity_id").notNull(),
  locale: text("locale").notNull(),
  value: text("value"),
});

// ============================================================================
// Schema type tests
// ============================================================================

// Test: Schema preserves table type
const userSchema = createSchema({
  table: users,
  tableName: "users",
  fields: {
    id: { column: "id" },
    name: { column: "name" },
    email: { column: "email" },
  },
});

type UserSchemaTable = typeof userSchema.table;
type _TestSchemaTable = Expect<Equal<UserSchemaTable, typeof users>>;

// Test: Schema with joins
const translationSchema = createSchema({
  table: translations,
  tableName: "translations",
  fields: {
    entityId: { column: "entity_id" },
    value: { column: "value" },
  },
});

const postSchema = createSchema({
  table: posts,
  tableName: "posts",
  fields: {
    id: { column: "id" },
    title: { column: "title" },
    translatedTitle: {
      column: "id",
      join: {
        schema: () => translationSchema,
        column: "entityId",
        select: ["value"],
      },
    },
  },
});

type PostSchemaTable = typeof postSchema.table;
type _TestPostSchemaTable = Expect<Equal<PostSchemaTable, typeof posts>>;

// ============================================================================
// QueryBuilder type tests
// ============================================================================

const userQb = createQueryBuilder(userSchema);

// Test: fromInput returns correct structure (type-level only)
type FromInputResult = ReturnType<typeof userQb.fromInput>;
type _TestFromInputHasWhere = Expect<
  Equal<FromInputResult["where"], import("drizzle-orm").SQL | undefined>
>;
type _TestFromInputHasLimit = Expect<Equal<FromInputResult["limit"], number>>;
type _TestFromInputHasOffset = Expect<Equal<FromInputResult["offset"], number>>;

// Test: pagination returns correct types
type PaginationResult = ReturnType<typeof userQb.pagination>;
type _TestPaginationLimit = Expect<Equal<PaginationResult["limit"], number>>;
type _TestPaginationOffset = Expect<Equal<PaginationResult["offset"], number>>;

// ============================================================================
// Input type tests
// ============================================================================

import type { Input, WhereInput, ColumnNames } from "./types.js";

// Test: ColumnNames extracts column names from table
type UserColumns = ColumnNames<typeof users>;
type _TestUserColumnsIncludesId = Expect<
  "id" extends UserColumns ? true : false
>;
type _TestUserColumnsIncludesName = Expect<
  "name" extends UserColumns ? true : false
>;
type _TestUserColumnsIncludesEmail = Expect<
  "email" extends UserColumns ? true : false
>;

// Test: WhereInput allows filtering on table columns
type UserWhereInput = WhereInput<typeof users>;
const _validUserWhere: UserWhereInput = {
  name: { $eq: "test" },
  age: { $gte: 18 },
  $or: [{ name: { $eq: "a" } }, { name: { $eq: "b" } }],
};

// Test: Input type structure
type UserInput = Input<typeof users>;
const _validUserInput: UserInput = {
  where: { name: { $eq: "test" } },
  select: ["id", "name"],
  limit: 10,
  offset: 0,
  order: "name:asc",
};

// ============================================================================
// Filter operators type tests
// ============================================================================

// Test: All operators are allowed in WhereInput
const _allOperators: UserWhereInput = {
  name: {
    $eq: "test",
    $ne: "other",
    $like: "%test%",
    $iLike: "%TEST%",
    $startsWith: "prefix",
    $endsWith: "suffix",
  },
  age: {
    $gt: 10,
    $gte: 18,
    $lt: 100,
    $lte: 65,
    $in: [18, 21, 25],
    $notIn: [0, -1],
    $isNull: true,
    $isNotNull: true,
  },
};

// ============================================================================
// Join type tests
// ============================================================================

import type { Join, JoinType } from "./schema.js";

// Test: JoinType includes all join types
type _TestJoinTypeLeft = Expect<"left" extends JoinType ? true : false>;
type _TestJoinTypeRight = Expect<"right" extends JoinType ? true : false>;
type _TestJoinTypeInner = Expect<"inner" extends JoinType ? true : false>;
type _TestJoinTypeFull = Expect<"full" extends JoinType ? true : false>;

// Test: Join structure
type TestJoin = Join;
const _validJoin: TestJoin = {
  type: "left",
  schema: () => translationSchema,
  column: "entityId",
  select: ["value"],
};

// ============================================================================
// Query method type tests
// ============================================================================

// Mock Drizzle db type for testing
type MockSelectQuery<T extends Table> = Promise<T["$inferSelect"][]> & {
  where: (condition: SQL) => MockSelectQuery<T>;
  orderBy: (...orders: SQL[]) => MockSelectQuery<T>;
  limit: (n: number) => MockSelectQuery<T>;
  offset: (n: number) => MockSelectQuery<T>;
  leftJoin: (table: SQL, on: SQL) => MockSelectQuery<T>;
};

type MockDb<T extends Table> = {
  select: () => { from: (table: T) => MockSelectQuery<T> };
};

// Test: query returns correctly typed results
// These tests are compile-time only - wrapped in a function that never executes
function _queryTypeTests(
  mockUserDb: MockDb<typeof users>,
  mockPostDb: MockDb<typeof posts>
) {
  const queryResult = userQb.query(mockUserDb, { limit: 10 });

  // The result should be a Promise of user rows
  type QueryResultType = typeof queryResult;
  type QueryResultAwaited = Awaited<QueryResultType>;

  // Each row should have the correct shape
  type ExpectedUserRow = {
    id: string;
    name: string;
    email: string;
    age: number | null;
    createdAt: Date;
  };

  type _TestQueryResultIsArray = Expect<
    QueryResultAwaited extends ExpectedUserRow[] ? true : false
  >;

  // Test: query with joins still returns parent table type
  const postQb = createQueryBuilder(postSchema);
  const postQueryResult = postQb.query(mockPostDb, {
    where: { translatedTitle: { $iLike: "%test%" } },
    limit: 10,
  });

  type PostQueryResultAwaited = Awaited<typeof postQueryResult>;
  type ExpectedPostRow = {
    id: string;
    title: string;
    content: string | null;
    authorId: string;
    views: number | null;
  };

  type _TestPostQueryResultIsArray = Expect<
    PostQueryResultAwaited extends ExpectedPostRow[] ? true : false
  >;

  // Suppress unused variable warning
  return { queryResult, postQueryResult };
}

// ============================================================================
// Complex join scenarios type tests
// ============================================================================

// Scenario 1: Multiple levels of joins
const categoryTable = pgTable("categories", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  parentId: uuid("parent_id"),
});

const productTable = pgTable("products", {
  id: uuid("id").primaryKey(),
  sku: text("sku").notNull(),
  price: integer("price").notNull(),
  categoryId: uuid("category_id"),
});

const productTranslationTable = pgTable("product_translations", {
  id: uuid("id").primaryKey(),
  productId: uuid("product_id").notNull(),
  locale: text("locale").notNull(),
  title: text("title"),
  description: text("description"),
});

// Category schema
const categorySchema = createSchema({
  table: categoryTable,
  tableName: "categories",
  fields: {
    id: { column: "id" },
    name: { column: "name" },
    parentId: { column: "parent_id" },
  },
});

// Product translation schema
const productTranslationSchema = createSchema({
  table: productTranslationTable,
  tableName: "product_translations",
  fields: {
    productId: { column: "product_id" },
    locale: { column: "locale" },
    title: { column: "title" },
    description: { column: "description" },
  },
});

// Product schema with multiple joins
const productSchemaComplex = createSchema({
  table: productTable,
  tableName: "products",
  fields: {
    id: { column: "id" },
    sku: { column: "sku" },
    price: { column: "price" },
    // Join to category
    category: {
      column: "category_id",
      join: {
        schema: () => categorySchema,
        column: "id",
      },
    },
    // Join to translations with select
    title: {
      column: "id",
      join: {
        type: "left",
        schema: () => productTranslationSchema,
        column: "productId",
        select: ["title", "description"],
      },
    },
  },
});

// Test: Complex schema preserves table type
type ProductSchemaTable = typeof productSchemaComplex.table;
type _TestProductSchemaTable = Expect<
  Equal<ProductSchemaTable, typeof productTable>
>;

// Test: Query builder for complex schema (compile-time only)
function _productQueryTypeTests(mockProductDb: MockDb<typeof productTable>) {
  const productQb = createQueryBuilder(productSchemaComplex);

  const productQueryResult = productQb.query(mockProductDb, {
    where: {
      sku: { $startsWith: "SKU-" },
      price: { $gte: 100, $lte: 1000 },
      title: { $iLike: "%phone%" },
    },
    limit: 50,
  });

  type ProductQueryResultAwaited = Awaited<typeof productQueryResult>;
  type ExpectedProductRow = {
    id: string;
    sku: string;
    price: number;
    categoryId: string | null;
  };

  type _TestProductQueryResult = Expect<
    ProductQueryResultAwaited extends ExpectedProductRow[] ? true : false
  >;

  return productQueryResult;
}

// Scenario 2: Self-referencing join (e.g., category -> parent category)
// Note: Self-referencing schemas require explicit type to avoid circular inference
import type { ObjectSchema } from "./schema.js";

type CategoryFields = "id" | "name" | "parent";
const categorySchemaWithParent: ObjectSchema<typeof categoryTable, CategoryFields> = createSchema({
  table: categoryTable,
  tableName: "categories",
  fields: {
    id: { column: "id" },
    name: { column: "name" },
    parent: {
      column: "parent_id",
      join: {
        schema: () => categorySchemaWithParent,
        column: "id",
        self: true,
      },
    },
  },
});

type CategoryWithParentTable = typeof categorySchemaWithParent.table;
type _TestSelfRefSchema = Expect<
  Equal<CategoryWithParentTable, typeof categoryTable>
>;

// Scenario 3: Composite key join
const orderItemTable = pgTable("order_items", {
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
});

const orderItemPriceTable = pgTable("order_item_prices", {
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id").notNull(),
  currency: text("currency").notNull(),
  amount: integer("amount").notNull(),
});

const orderItemPriceSchema = createSchema({
  table: orderItemPriceTable,
  tableName: "order_item_prices",
  fields: {
    orderId: { column: "order_id" },
    productId: { column: "product_id" },
    currency: { column: "currency" },
    amount: { column: "amount" },
  },
});

const orderItemSchema = createSchema({
  table: orderItemTable,
  tableName: "order_items",
  fields: {
    orderId: { column: "order_id" },
    productId: { column: "product_id" },
    quantity: { column: "quantity" },
    price: {
      column: "order_id",
      join: {
        schema: () => orderItemPriceSchema,
        column: "orderId",
        composite: [{ field: "product_id", column: "productId" }],
        select: ["amount"],
      },
    },
  },
});

type OrderItemSchemaTable = typeof orderItemSchema.table;
type _TestCompositeJoinSchema = Expect<
  Equal<OrderItemSchemaTable, typeof orderItemTable>
>;

// ============================================================================
// WhereInput with joins type tests
// ============================================================================

import type { SQL } from "drizzle-orm";
import type { Table } from "drizzle-orm";

// Test: WhereInput allows nested join field filters
type ProductWhereInput = WhereInput<typeof productTable>;

const _complexProductWhere: ProductWhereInput = {
  sku: { $eq: "test" },
  price: { $gte: 0 },
  $and: [
    { sku: { $startsWith: "A" } },
    { price: { $lt: 1000 } },
  ],
  $or: [
    { sku: { $endsWith: "-sale" } },
    { price: { $eq: 0 } },
  ],
};

// ============================================================================
// Input validation type tests
// ============================================================================

// Test: Input.select only accepts valid column names
type ProductInput = Input<typeof productTable>;

const _validProductInput: ProductInput = {
  select: ["id", "sku", "price"], // ✓ Valid columns
  where: { sku: { $eq: "test" } },
  limit: 10,
};

// This would be a type error (uncomment to verify):
// const _invalidProductInput: ProductInput = {
//   select: ["id", "invalidColumn"], // ✗ Type error
// };

// ============================================================================
// Runtime tests (Jest)
// ============================================================================

import { describe, it, expect } from "vitest";

describe("Type inference", () => {
  it("should infer table type from schema", () => {
    const schema = createSchema({
      table: users,
      tableName: "users",
      fields: { id: { column: "id" } },
    });

    // Runtime check that table is preserved
    expect(schema.table).toBe(users);
    expect(schema.tableName).toBe("users");
  });

  it("should create query builder with correct config", () => {
    const schema = createSchema({
      table: users,
      tableName: "users",
      fields: { id: { column: "id" } },
    });

    const qb = createQueryBuilder(schema);
    // Test pagination without where (doesn't need Drizzle internals)
    const result = qb.fromInput({ limit: 10 });

    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  it("should handle join schema references", () => {
    const childSchema = createSchema({
      table: translations,
      tableName: "translations",
      fields: {
        entityId: { column: "entity_id" },
        value: { column: "value" },
      },
    });

    const parentSchema = createSchema({
      table: posts,
      tableName: "posts",
      fields: {
        id: { column: "id" },
        title: {
          column: "id",
          join: {
            schema: () => childSchema,
            column: "entityId",
            select: ["value"],
          },
        },
      },
    });

    expect(parentSchema.hasJoin("title")).toBe(true);
    expect(parentSchema.getJoinSchema("title")).toBe(childSchema);
  });

  it("should resolve field config from schema", () => {
    const schema = createSchema({
      table: users,
      tableName: "users",
      fields: {
        id: { column: "id" },
        userName: { column: "name", alias: "user_name" },
      },
    });

    expect(schema.getField("id")).toEqual({ column: "id" });
    expect(schema.getField("userName")).toEqual({
      column: "name",
      alias: "user_name",
    });
    expect(schema.getField("nonexistent")).toBeUndefined();
  });
});

// ============================================================================
// Type-only compile tests
// ============================================================================

describe("Compile-time type checks", () => {
  it("types should compile correctly (this test just needs to not error)", () => {
    // If this file compiles, all type tests pass
    expect(true).toBe(true);
  });
});

// ============================================================================
// Nested Path Types Tests
// ============================================================================

import type {
  FieldsDef,
  NestedPaths,
  OrderPath,
  NestedWhereInput,
  NestedSchemaInput,
} from "./types.js";

// Define a 4-level nested structure for orders
type OrderFieldsDef = {
  id: true;
  userId: true;
  status: true;
  totalAmount: true;
  currency: true;
  createdAt: true;
  items: {
    id: true;
    quantity: true;
    unitPrice: true;
    product: {
      id: true;
      sku: true;
      price: true;
      category: {
        id: true;
        slug: true;
        isVisible: true;
        translation: {
          name: true;
          description: true;
        };
      };
    };
  };
};

// Test: NestedPaths generates all paths
type AllOrderPaths = NestedPaths<OrderFieldsDef>;

// Verify specific paths exist
type _TestTopLevel = Expect<Equal<"id" extends AllOrderPaths ? true : false, true>>;
type _TestLevel1 = Expect<Equal<"items" extends AllOrderPaths ? true : false, true>>;
type _TestLevel1Nested = Expect<Equal<"items.quantity" extends AllOrderPaths ? true : false, true>>;
type _TestLevel2 = Expect<Equal<"items.product" extends AllOrderPaths ? true : false, true>>;
type _TestLevel2Nested = Expect<Equal<"items.product.sku" extends AllOrderPaths ? true : false, true>>;
type _TestLevel3 = Expect<Equal<"items.product.category" extends AllOrderPaths ? true : false, true>>;
type _TestLevel3Nested = Expect<Equal<"items.product.category.slug" extends AllOrderPaths ? true : false, true>>;
type _TestLevel4 = Expect<Equal<"items.product.category.translation" extends AllOrderPaths ? true : false, true>>;
type _TestLevel4Nested = Expect<Equal<"items.product.category.translation.name" extends AllOrderPaths ? true : false, true>>;

// Test: OrderPath generates direction suffixes
type OrderPaths = OrderPath<"id" | "items.product.price">;
type _TestOrderAsc = Expect<Equal<"id:asc" extends OrderPaths ? true : false, true>>;
type _TestOrderDesc = Expect<Equal<"items.product.price:desc" extends OrderPaths ? true : false, true>>;
type _TestOrderPlain = Expect<Equal<"id" extends OrderPaths ? true : false, true>>;

// Test: NestedSchemaInput works with nested structure
type OrderInput = NestedSchemaInput<typeof orders, OrderFieldsDef>;

// These should compile without errors
const _validOrderInput: OrderInput = {
  limit: 10,
  offset: 0,
  order: "items.product.price:desc",
  multiOrder: ["createdAt:desc", "items.product.category.slug:asc"],
  select: ["id", "status", "items.product.sku", "items.product.category.translation.name"],
  where: {
    status: { $eq: "completed" },
    items: {
      quantity: { $gte: 1 },
      product: {
        price: { $lte: 100 },
        category: {
          isVisible: true,
          translation: {
            name: { $like: "%electronics%" },
          },
        },
      },
    },
  },
};

// Test: NestedWhereInput allows $and/$or at any level
const _complexNestedWhere: NestedWhereInput<OrderFieldsDef> = {
  $and: [
    { status: { $eq: "completed" } },
    {
      $or: [
        { totalAmount: { $gte: 100 } },
        {
          items: {
            product: {
              category: {
                slug: { $in: ["sale", "clearance"] },
              },
            },
          },
        },
      ],
    },
  ],
};

// Runtime test to verify types work
describe("Nested path types", () => {
  it("should allow nested paths in input objects", () => {
    const input: OrderInput = {
      order: "items.product.price:desc",
      select: ["id", "items.product.sku"],
      where: {
        items: {
          product: {
            price: { $gte: 0 },
          },
        },
      },
    };

    expect(input.order).toBe("items.product.price:desc");
    expect(input.select).toEqual(["id", "items.product.sku"]);
  });

  it("should allow 4-level deep nested where conditions", () => {
    const input: OrderInput = {
      where: {
        items: {
          product: {
            category: {
              translation: {
                name: { $like: "%test%" },
              },
            },
          },
        },
      },
    };

    expect(input.where?.items?.product?.category?.translation?.name).toEqual({
      $like: "%test%",
    });
  });
});
