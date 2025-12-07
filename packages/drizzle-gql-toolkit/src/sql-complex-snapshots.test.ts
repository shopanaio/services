import { describe, it, expect } from "vitest";
import { SQL } from "drizzle-orm";
import { PgDialect, pgTable, text, integer, boolean, timestamp, uuid, numeric } from "drizzle-orm/pg-core";
import { createQueryBuilder } from "./builder.js";
import { createSchema } from "./schema.js";

const dialect = new PgDialect();

function toSqlString(sqlObj: SQL): string {
  const query = dialect.sqlToQuery(sqlObj);
  return `SQL: ${query.sql}\nParams: ${JSON.stringify(query.params)}`;
}

// =============================================================================
// TABLE DEFINITIONS
// =============================================================================

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isVisible: boolean("is_visible").default(true),
});

const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: text("sku").notNull(),
  categoryId: uuid("category_id"),
  price: numeric("price", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

const translations = pgTable("translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  locale: text("locale").notNull(),
  field: text("field").notNull(),
  value: text("value"),
  searchValue: text("search_value"),
});

const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  status: text("status").default("pending"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
});

// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================

const ordersSchema = createSchema({
  table: orders,
  tableName: "orders",
  fields: {
    id: { column: "id" },
    userId: { column: "user_id" },
    status: { column: "status" },
    totalAmount: { column: "total_amount" },
    currency: { column: "currency" },
    createdAt: { column: "created_at" },
    completedAt: { column: "completed_at" },
  },
});

const usersSchema = createSchema({
  table: users,
  tableName: "users",
  fields: {
    id: { column: "id" },
    email: { column: "email" },
    name: { column: "name" },
    role: { column: "role" },
    isActive: { column: "is_active" },
    createdAt: { column: "created_at" },
  },
});

const translationsSchema = createSchema({
  table: translations,
  tableName: "translations",
  fields: {
    id: { column: "id" },
    entityType: { column: "entity_type" },
    entityId: { column: "entity_id" },
    locale: { column: "locale" },
    field: { column: "field" },
    value: { column: "value" },
    searchValue: { column: "search_value" },
  },
});

const categoriesSchema = createSchema({
  table: categories,
  tableName: "categories",
  fields: {
    id: { column: "id" },
    slug: { column: "slug" },
    parentId: { column: "parent_id" },
    sortOrder: { column: "sort_order" },
    isVisible: { column: "is_visible" },
  },
});

const orderItemsSchema = createSchema({
  table: orderItems,
  tableName: "order_items",
  fields: {
    id: { column: "id" },
    orderId: { column: "order_id" },
    productId: { column: "product_id" },
    quantity: { column: "quantity" },
    unitPrice: { column: "unit_price" },
  },
});

const productsSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    sku: { column: "sku" },
    categoryId: { column: "category_id" },
    price: { column: "price" },
    stock: { column: "stock" },
    isPublished: { column: "is_published" },
    deletedAt: { column: "deleted_at" },
    createdAt: { column: "created_at" },
  },
});

// Schema with join: Users -> Orders
const usersWithOrdersSchema = createSchema({
  table: users,
  tableName: "users",
  fields: {
    id: { column: "id" },
    email: { column: "email" },
    name: { column: "name" },
    role: { column: "role" },
    isActive: { column: "is_active" },
    orderStatus: {
      column: "id",
      join: { schema: () => ordersSchema, column: "userId", select: ["status"] },
    },
    orderTotal: {
      column: "id",
      join: { schema: () => ordersSchema, column: "userId", select: ["totalAmount"] },
    },
  },
});

// Schema with composite join: Products -> Translations
const productsWithTranslationsSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    sku: { column: "sku" },
    categoryId: { column: "category_id" },
    price: { column: "price" },
    stock: { column: "stock" },
    isPublished: { column: "is_published" },
    deletedAt: { column: "deleted_at" },
    title: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
        select: ["value"],
        composite: [{ field: "sku", column: "field" }],
      },
    },
    searchTitle: {
      column: "id",
      join: { schema: () => translationsSchema, column: "entityId", select: ["searchValue"] },
    },
  },
});

// Schema with alias: Categories -> Translations
const categoriesWithTranslationsSchema = createSchema({
  table: categories,
  tableName: "categories",
  fields: {
    id: { column: "id" },
    slug: { column: "slug" },
    parentId: { column: "parent_id", alias: "parentId" },
    sortOrder: { column: "sort_order" },
    isVisible: { column: "is_visible", alias: "isVisible" },
    name: {
      column: "id",
      alias: "name",
      join: { schema: () => translationsSchema, column: "entityId", select: ["value"] },
    },
  },
});

// Schema with multiple joins: Orders -> Users + OrderItems
const ordersWithUserAndItemsSchema = createSchema({
  table: orders,
  tableName: "orders",
  fields: {
    id: { column: "id" },
    status: { column: "status" },
    totalAmount: { column: "total_amount", alias: "totalAmount" },
    currency: { column: "currency" },
    createdAt: { column: "created_at" },
    userEmail: {
      column: "user_id",
      join: { schema: () => usersSchema, column: "id", select: ["email"] },
    },
    userName: {
      column: "user_id",
      join: { schema: () => usersSchema, column: "id", select: ["name"] },
    },
    itemQuantity: {
      column: "id",
      join: { schema: () => orderItemsSchema, column: "orderId", select: ["quantity"] },
    },
  },
});

// Schema with chain joins: Products -> Translations + Categories
const productsFullSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    sku: { column: "sku" },
    price: { column: "price" },
    stock: { column: "stock" },
    isPublished: { column: "is_published" },
    deletedAt: { column: "deleted_at" },
    createdAt: { column: "created_at" },
    title: {
      column: "id",
      join: { schema: () => translationsSchema, column: "entityId", select: ["value"] },
    },
    categorySlug: {
      column: "category_id",
      join: { type: "inner", schema: () => categoriesSchema, column: "id", select: ["slug"] },
    },
    categoryVisible: {
      column: "category_id",
      join: { schema: () => categoriesSchema, column: "id", select: ["isVisible"] },
    },
  },
});

// Nested Level 2: OrderItems -> Products
const orderItemsWithProductSchema = createSchema({
  table: orderItems,
  tableName: "order_items",
  fields: {
    id: { column: "id" },
    orderId: { column: "order_id" },
    productId: { column: "product_id" },
    quantity: { column: "quantity" },
    unitPrice: { column: "unit_price" },
    productSku: {
      column: "product_id",
      join: { schema: () => productsSchema, column: "id", select: ["sku"] },
    },
    productPrice: {
      column: "product_id",
      join: { schema: () => productsSchema, column: "id", select: ["price"] },
    },
    productPublished: {
      column: "product_id",
      join: { schema: () => productsSchema, column: "id", select: ["isPublished"] },
    },
  },
});

// Nested Level 2 Schema: Orders -> OrderItems -> Products
const ordersNestedLevel2Schema = createSchema({
  table: orders,
  tableName: "orders",
  fields: {
    id: { column: "id" },
    userId: { column: "user_id" },
    status: { column: "status" },
    totalAmount: { column: "total_amount" },
    currency: { column: "currency" },
    createdAt: { column: "created_at" },
    userEmail: {
      column: "user_id",
      join: { schema: () => usersSchema, column: "id", select: ["email"] },
    },
    items: {
      column: "id",
      join: { schema: () => orderItemsWithProductSchema, column: "orderId" },
    },
  },
});

// Products -> Categories (for nested Level 3)
const productsWithCategorySchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    sku: { column: "sku" },
    categoryId: { column: "category_id" },
    price: { column: "price" },
    stock: { column: "stock" },
    isPublished: { column: "is_published" },
    deletedAt: { column: "deleted_at" },
    categorySlug: {
      column: "category_id",
      join: { schema: () => categoriesSchema, column: "id", select: ["slug"] },
    },
    categoryVisible: {
      column: "category_id",
      join: { schema: () => categoriesSchema, column: "id", select: ["isVisible"] },
    },
  },
});

// OrderItems -> Products -> Categories
const orderItemsWithProductCategorySchema = createSchema({
  table: orderItems,
  tableName: "order_items",
  fields: {
    id: { column: "id" },
    orderId: { column: "order_id" },
    productId: { column: "product_id" },
    quantity: { column: "quantity" },
    unitPrice: { column: "unit_price" },
    product: {
      column: "product_id",
      join: { schema: () => productsWithCategorySchema, column: "id" },
    },
  },
});

// Nested Level 3 Schema: Orders -> OrderItems -> Products -> Categories
const ordersNestedLevel3Schema = createSchema({
  table: orders,
  tableName: "orders",
  fields: {
    id: { column: "id" },
    userId: { column: "user_id" },
    status: { column: "status" },
    totalAmount: { column: "total_amount" },
    currency: { column: "currency" },
    createdAt: { column: "created_at" },
    items: {
      column: "id",
      join: { schema: () => orderItemsWithProductCategorySchema, column: "orderId" },
    },
  },
});

// Categories -> Translations (for nested Level 4)
const categoriesWithTranslationsNestedSchema = createSchema({
  table: categories,
  tableName: "categories",
  fields: {
    id: { column: "id" },
    slug: { column: "slug" },
    parentId: { column: "parent_id" },
    sortOrder: { column: "sort_order" },
    isVisible: { column: "is_visible" },
    translatedName: {
      column: "id",
      join: { schema: () => translationsSchema, column: "entityId", select: ["value"] },
    },
    translatedLocale: {
      column: "id",
      join: { schema: () => translationsSchema, column: "entityId", select: ["locale"] },
    },
  },
});

// Products -> Categories -> Translations
const productsWithCategoryTranslationsSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    sku: { column: "sku" },
    categoryId: { column: "category_id" },
    price: { column: "price" },
    stock: { column: "stock" },
    isPublished: { column: "is_published" },
    deletedAt: { column: "deleted_at" },
    category: {
      column: "category_id",
      join: { schema: () => categoriesWithTranslationsNestedSchema, column: "id" },
    },
  },
});

// OrderItems -> Products -> Categories -> Translations
const orderItemsLevel4Schema = createSchema({
  table: orderItems,
  tableName: "order_items",
  fields: {
    id: { column: "id" },
    orderId: { column: "order_id" },
    productId: { column: "product_id" },
    quantity: { column: "quantity" },
    unitPrice: { column: "unit_price" },
    product: {
      column: "product_id",
      join: { schema: () => productsWithCategoryTranslationsSchema, column: "id" },
    },
  },
});

// Nested Level 4 Schema: Orders -> OrderItems -> Products -> Categories -> Translations
const ordersNestedLevel4Schema = createSchema({
  table: orders,
  tableName: "orders",
  fields: {
    id: { column: "id" },
    userId: { column: "user_id" },
    status: { column: "status" },
    totalAmount: { column: "total_amount" },
    currency: { column: "currency" },
    createdAt: { column: "created_at" },
    items: {
      column: "id",
      join: { schema: () => orderItemsLevel4Schema, column: "orderId" },
    },
  },
});

// =============================================================================
// TESTS
// =============================================================================

describe("Complex SQL Snapshot Tests", () => {
  describe("Single-level joins", () => {
    it("should filter users by order status and total (Users -> Orders)", () => {
      const qb = createQueryBuilder(usersWithOrdersSchema);

      // Simple join filter
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "email", "name", "role", "isActive", "orderStatus"],
        where: {
          orderStatus: { $eq: "completed" },
          isActive: { $eq: true },
        },
        limit: 50,
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."email", "t0_users"."name", "t0_users"."role", "t0_users"."is_active", "t1_orders"."status" FROM "users" AS "t0_users" LEFT JOIN "orders" AS "t1_orders" ON "t0_users"."id" = "t1_orders"."user_id"WHERE ("t1_orders"."status" = $1 and "t0_users"."is_active" = $2) LIMIT $3 OFFSET $4
        Params: ["completed",true,50,0]"
      `);

      // Complex OR with join fields
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "email", "name", "role", "orderStatus", "orderTotal"],
        where: {
          $or: [
            { $and: [{ orderStatus: { $eq: "completed" } }, { orderTotal: { $gte: 500 } }] },
            { $and: [{ orderStatus: { $eq: "pending" } }, { role: { $eq: "vip" } }] },
          ],
        },
        limit: 100,
        offset: 50,
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."email", "t0_users"."name", "t0_users"."role", "t1_orders"."status", "t1_orders"."total_amount" FROM "users" AS "t0_users" LEFT JOIN "orders" AS "t1_orders" ON "t0_users"."id" = "t1_orders"."user_id"WHERE (("t1_orders"."status" = $1 and "t1_orders"."total_amount" >= $2) or ("t1_orders"."status" = $3 and "t0_users"."role" = $4)) LIMIT $5 OFFSET $6
        Params: ["completed",500,"pending","vip",100,50]"
      `);
    });

    it("should filter products with composite join and translations", () => {
      const qb = createQueryBuilder(productsWithTranslationsSchema);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "sku", "price", "stock", "isPublished", "title"],
        where: {
          title: { $iLike: "%smartphone%" },
          isPublished: { $eq: true },
          deletedAt: { $is: null },
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t0_products"."stock", "t0_products"."is_published", "t1_translations"."value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id" AND "t0_products"."sku" = "t1_translations"."field"WHERE ("t1_translations"."value" ILIKE $1 and "t0_products"."is_published" = $2 and "t0_products"."deleted_at" IS NULL) LIMIT $3 OFFSET $4
        Params: ["%smartphone%",true,20,0]"
      `);
    });

    it("should filter categories with alias fields", () => {
      const qb = createQueryBuilder(categoriesWithTranslationsSchema);
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "slug", "parentId", "isVisible", "name"],
        where: {
          name: { $iLike: "%electronics%" },
          isVisible: { $eq: true },
          parentId: { $isNot: null },
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_categories"."id", "t0_categories"."slug", "t0_categories"."parent_id" AS "parentId", "t0_categories"."is_visible" AS "isVisible", "t1_translations"."value" AS "name" FROM "categories" AS "t0_categories" LEFT JOIN "translations" AS "t1_translations" ON "t0_categories"."id" = "t1_translations"."entity_id"WHERE ("t1_translations"."value" ILIKE $1 and "t0_categories"."is_visible" = $2 and "t0_categories"."parent_id" IS NOT NULL) LIMIT $3 OFFSET $4
        Params: ["%electronics%",true,20,0]"
      `);
    });

    it("should filter orders with multiple joins (users + items)", () => {
      const qb = createQueryBuilder(ordersWithUserAndItemsSchema);
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency", "userEmail", "itemQuantity"],
        where: {
          userEmail: { $iLike: "%@gmail.com" },
          itemQuantity: { $gte: 5 },
          status: { $in: ["pending", "processing", "shipped"] },
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount" AS "totalAmount", "t0_orders"."currency", "t1_users"."email", "t1_order_items"."quantity" FROM "orders" AS "t0_orders" LEFT JOIN "users" AS "t1_users" ON "t0_orders"."user_id" = "t1_users"."id" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"WHERE ("t1_users"."email" ILIKE $1 and "t1_order_items"."quantity" >= $2 and "t0_orders"."status" IN ($3, $4, $5)) LIMIT $6 OFFSET $7
        Params: ["%@gmail.com",5,"pending","processing","shipped",20,0]"
      `);
    });

    it("should filter products with chain joins (translations + categories)", () => {
      const qb = createQueryBuilder(productsFullSchema);
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "sku", "price", "stock", "isPublished", "categorySlug"],
        where: {
          categorySlug: { $in: ["electronics", "computers", "phones"] },
          isPublished: { $eq: true },
          deletedAt: { $is: null },
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t0_products"."stock", "t0_products"."is_published", "t1_categories"."slug" FROM "products" AS "t0_products" INNER JOIN "categories" AS "t1_categories" ON "t0_products"."category_id" = "t1_categories"."id"WHERE ("t1_categories"."slug" IN ($1, $2, $3) and "t0_products"."is_published" = $4 and "t0_products"."deleted_at" IS NULL) LIMIT $5 OFFSET $6
        Params: ["electronics","computers","phones",true,20,0]"
      `);
    });
  });

  describe("Nested joins (2-4 levels)", () => {
    it("should filter by nested t2 field (Orders -> OrderItems -> Products)", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          status: { $eq: "pending" },
          items: { productSku: { $like: "PHONE-%" } },
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"WHERE ("t0_orders"."status" = $1 and "t2_products"."sku" LIKE $2) LIMIT $3 OFFSET $4
        Params: ["pending","PHONE-%",20,0]"
      `);

      // Combine direct join and nested join
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "userEmail"],
        where: {
          $and: [
            { userEmail: { $iLike: "%@company.com" } },
            { status: { $in: ["pending", "processing"] } },
            {
              $or: [
                { items: { productSku: { $like: "LAPTOP-%" } } },
                { items: { productSku: { $like: "PHONE-%" } } },
              ],
            },
          ],
        },
        limit: 50,
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t1_users"."email" FROM "orders" AS "t0_orders" LEFT JOIN "users" AS "t1_users" ON "t0_orders"."user_id" = "t1_users"."id" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"WHERE ("t1_users"."email" ILIKE $1 and "t0_orders"."status" IN ($2, $3) and ("t2_products"."sku" LIKE $4 or "t2_products"."sku" LIKE $5)) LIMIT $6 OFFSET $7
        Params: ["%@company.com","pending","processing","LAPTOP-%","PHONE-%",50,0]"
      `);
    });

    it("should filter by nested t3 field (Orders -> OrderItems -> Products -> Categories)", () => {
      const qb = createQueryBuilder(ordersNestedLevel3Schema);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          status: { $eq: "completed" },
          items: {
            product: {
              categorySlug: { $in: ["electronics", "computers"] },
            },
          },
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE ("t0_orders"."status" = $1 and "t3_categories"."slug" IN ($2, $3)) LIMIT $4 OFFSET $5
        Params: ["completed","electronics","computers",20,0]"
      `);

      // Combine t1, t2, t3 conditions
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          $or: [
            {
              $and: [
                { status: { $eq: "processing" } },
                { items: { quantity: { $gte: 5 } } },
              ],
            },
            {
              $and: [
                { items: { product: { sku: { $like: "VIP-%" } } } },
                { items: { product: { price: { $gte: 1000 } } } },
              ],
            },
            {
              $and: [
                { items: { product: { categorySlug: { $eq: "premium" } } } },
                { items: { product: { categoryVisible: { $eq: true } } } },
              ],
            },
          ],
        },
        limit: 100,
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE (("t0_orders"."status" = $1 and "t1_order_items"."quantity" >= $2) or ("t2_products"."sku" LIKE $3 and "t2_products"."price" >= $4) or ("t3_categories"."slug" = $5 and "t3_categories"."is_visible" = $6)) LIMIT $7 OFFSET $8
        Params: ["processing",5,"VIP-%",1000,"premium",true,100,0]"
      `);
    });

    it("should filter by nested t4 field (Orders -> OrderItems -> Products -> Categories -> Translations)", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          status: { $eq: "completed" },
          items: {
            product: {
              category: {
                translatedName: { $iLike: "%Electronics%" },
              },
            },
          },
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t0_orders"."status" = $1 and "t4_translations"."value" ILIKE $2) LIMIT $3 OFFSET $4
        Params: ["completed","%Electronics%",20,0]"
      `);

      // Full 4-level conditions
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "status", "totalAmount"],
        where: {
          $and: [
            { items: { product: { category: { translatedLocale: { $eq: "en" } } } } },
            { items: { product: { category: { translatedName: { $notILike: "%test%" } } } } },
            { items: { product: { category: { isVisible: { $eq: true } } } } },
          ],
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t4_translations"."locale" = $1 and "t4_translations"."value" NOT ILIKE $2 and "t3_categories"."is_visible" = $3) LIMIT $4 OFFSET $5
        Params: ["en","%test%",true,20,0]"
      `);
    });
  });

  describe("ORDER BY with nested joins", () => {
    it("should order by fields across different nesting levels", () => {
      // Order by t0 field
      expect(toSqlString(createQueryBuilder(ordersNestedLevel2Schema).buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: { status: { $eq: "completed" } },
        order: ["totalAmount:desc"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" WHERE "t0_orders"."status" = $1 ORDER BY "t0_orders"."total_amount" DESC LIMIT $2 OFFSET $3
        Params: ["completed",20,0]"
      `);

      // Order by t1 field
      expect(toSqlString(createQueryBuilder(ordersNestedLevel2Schema).buildSelectSql({
        where: { status: { $eq: "pending" }, items: { quantity: { $gte: 1 } } },
        order: ["items.quantity:desc"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"WHERE ("t0_orders"."status" = $1 and "t1_order_items"."quantity" >= $2) ORDER BY "t1_order_items"."quantity" DESC LIMIT $3 OFFSET $4
        Params: ["pending",1,20,0]"
      `);

      // Order by t2 field
      expect(toSqlString(createQueryBuilder(ordersNestedLevel2Schema).buildSelectSql({
        where: { items: { productPublished: { $eq: true } } },
        order: ["items.productPrice:desc"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"WHERE "t2_products"."is_published" = $1 ORDER BY "t2_products"."price" DESC LIMIT $2 OFFSET $3
        Params: [true,20,0]"
      `);

      // Order by t3 field
      expect(toSqlString(createQueryBuilder(ordersNestedLevel3Schema).buildSelectSql({
        where: { items: { product: { categoryVisible: { $eq: true } } } },
        order: ["items.product.categorySlug:asc"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE "t3_categories"."is_visible" = $1 ORDER BY "t3_categories"."slug" ASC LIMIT $2 OFFSET $3
        Params: [true,20,0]"
      `);

      // Order by t4 field
      expect(toSqlString(createQueryBuilder(ordersNestedLevel4Schema).buildSelectSql({
        where: { items: { product: { category: { translatedLocale: { $eq: "en" } } } } },
        order: ["items.product.category.translatedName:asc"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE "t4_translations"."locale" = $1 ORDER BY "t4_translations"."value" ASC LIMIT $2 OFFSET $3
        Params: ["en",20,0]"
      `);

      // Multiple fields across levels
      expect(toSqlString(createQueryBuilder(ordersNestedLevel3Schema).buildSelectSql({
        where: { status: { $neq: "cancelled" }, items: { product: { categoryVisible: { $eq: true } } } },
        order: [
          "items.product.categorySlug:asc",
          "items.product.price:desc",
          "items.quantity:desc",
          "totalAmount:desc",
        ],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE ("t0_orders"."status" <> $1 and "t3_categories"."is_visible" = $2) ORDER BY "t3_categories"."slug" ASC, "t2_products"."price" DESC, "t1_order_items"."quantity" DESC, "t0_orders"."total_amount" DESC LIMIT $3 OFFSET $4
        Params: ["cancelled",true,20,0]"
      `);
    });
  });

  describe("SELECT with nested joins", () => {
    it("should select fields from different nesting levels", () => {
      // Select t0, t1 fields
      expect(toSqlString(createQueryBuilder(ordersNestedLevel2Schema).buildSelectSql({
        where: { items: { quantity: { $gte: 1 } } },
        select: ["id", "status", "items.quantity", "items.unitPrice"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t1_order_items"."quantity", "t1_order_items"."unit_price" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"WHERE "t1_order_items"."quantity" >= $1 LIMIT $2 OFFSET $3
        Params: [1,20,0]"
      `);

      // Select t2 fields
      expect(toSqlString(createQueryBuilder(ordersNestedLevel2Schema).buildSelectSql({
        where: { items: { productPublished: { $eq: true } } },
        select: ["id", "items.productSku", "items.productPrice"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t2_products"."sku", "t2_products"."price" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"WHERE "t2_products"."is_published" = $1 LIMIT $2 OFFSET $3
        Params: [true,20,0]"
      `);

      // Select t3 fields
      expect(toSqlString(createQueryBuilder(ordersNestedLevel3Schema).buildSelectSql({
        where: { items: { product: { categoryVisible: { $eq: true } } } },
        select: ["id", "status", "items.product.categorySlug", "items.product.categoryVisible"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t3_categories"."slug", "t3_categories"."is_visible" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE "t3_categories"."is_visible" = $1 LIMIT $2 OFFSET $3
        Params: [true,20,0]"
      `);

      // Select t4 fields
      expect(toSqlString(createQueryBuilder(ordersNestedLevel4Schema).buildSelectSql({
        where: { items: { product: { category: { translatedLocale: { $eq: "en" } } } } },
        select: ["id", "status", "items.product.category.translatedName", "items.product.category.translatedLocale"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t4_translations"."value", "t4_translations"."locale" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE "t4_translations"."locale" = $1 LIMIT $2 OFFSET $3
        Params: ["en",20,0]"
      `);
    });
  });

  describe("Edge cases", () => {
    it("should handle large IN clause", () => {
      const qb = createQueryBuilder(productsFullSchema);
      const skus = Array.from({ length: 20 }, (_, i) => `SKU-${String(i).padStart(4, "0")}`);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "sku", "isPublished"],
        where: { sku: { $in: skus }, isPublished: { $eq: true } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."is_published" FROM "products" AS "t0_products" WHERE ("t0_products"."sku" IN ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) and "t0_products"."is_published" = $21) LIMIT $22 OFFSET $23
        Params: ["SKU-0000","SKU-0001","SKU-0002","SKU-0003","SKU-0004","SKU-0005","SKU-0006","SKU-0007","SKU-0008","SKU-0009","SKU-0010","SKU-0011","SKU-0012","SKU-0013","SKU-0014","SKU-0015","SKU-0016","SKU-0017","SKU-0018","SKU-0019",true,20,0]"
      `);
    });

    it("should handle 10+ conditions with mixed operators", () => {
      const qb = createQueryBuilder(productsFullSchema);
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "sku", "price", "stock", "isPublished", "title", "categorySlug", "categoryVisible"],
        where: {
          $and: [
            { id: { $neq: "00000000-0000-0000-0000-000000000000" } },
            { sku: { $like: "%" } },
            { sku: { $notLike: "TEST-%" } },
            { price: { $gt: 0 } },
            { price: { $lt: 999999 } },
            { stock: { $gte: 0 } },
            { stock: { $lte: 10000 } },
            { isPublished: { $eq: true } },
            { deletedAt: { $is: null } },
            { categorySlug: { $in: ["a", "b", "c", "d", "e"] } },
            { categoryVisible: { $isNot: null } },
            { title: { $iLike: "%keyword%" } },
          ],
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t0_products"."stock", "t0_products"."is_published", "t1_translations"."value", "t1_categories"."slug", "t1_categories"."is_visible" FROM "products" AS "t0_products" INNER JOIN "categories" AS "t1_categories" ON "t0_products"."category_id" = "t1_categories"."id" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE ("t0_products"."id" <> $1 and "t0_products"."sku" LIKE $2 and "t0_products"."sku" NOT LIKE $3 and "t0_products"."price" > $4 and "t0_products"."price" < $5 and "t0_products"."stock" >= $6 and "t0_products"."stock" <= $7 and "t0_products"."is_published" = $8 and "t0_products"."deleted_at" IS NULL and "t1_categories"."slug" IN ($9, $10, $11, $12, $13) and "t1_categories"."is_visible" IS NOT NULL and "t1_translations"."value" ILIKE $14) LIMIT $15 OFFSET $16
        Params: ["00000000-0000-0000-0000-000000000000","%","TEST-%",0,999999,0,10000,true,"a","b","c","d","e","%keyword%",20,0]"
      `);
    });

    it("should handle maxLimit and pagination", () => {
      const qb = createQueryBuilder(productsFullSchema, { maxLimit: 1000 });
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "sku", "isPublished"],
        where: { isPublished: { $eq: true } },
        limit: 1000,
        offset: 99000,
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."is_published" FROM "products" AS "t0_products" WHERE "t0_products"."is_published" = $1 LIMIT $2 OFFSET $3
        Params: [true,1000,99000]"
      `);
    });

    it("should handle deeply nested OR/AND (4+ levels)", () => {
      const qb = createQueryBuilder(usersWithOrdersSchema);
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "email", "name", "role", "isActive", "orderStatus", "orderTotal"],
        where: {
          $or: [
            {
              $and: [
                { role: { $eq: "admin" } },
                {
                  $or: [
                    { email: { $iLike: "%@company.com" } },
                    { email: { $iLike: "%@corp.com" } },
                  ],
                },
              ],
            },
            {
              $and: [
                { role: { $eq: "manager" } },
                {
                  $or: [
                    {
                      $and: [
                        { orderStatus: { $eq: "completed" } },
                        { orderTotal: { $gte: 1000 } },
                      ],
                    },
                    {
                      $and: [
                        { isActive: { $eq: true } },
                        { name: { $isNot: null } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."email", "t0_users"."name", "t0_users"."role", "t0_users"."is_active", "t1_orders"."status", "t1_orders"."total_amount" FROM "users" AS "t0_users" LEFT JOIN "orders" AS "t1_orders" ON "t0_users"."id" = "t1_orders"."user_id"WHERE (("t0_users"."role" = $1 and ("t0_users"."email" ILIKE $2 or "t0_users"."email" ILIKE $3)) or ("t0_users"."role" = $4 and (("t1_orders"."status" = $5 and "t1_orders"."total_amount" >= $6) or ("t0_users"."is_active" = $7 and "t0_users"."name" IS NOT NULL)))) LIMIT $8 OFFSET $9
        Params: ["admin","%@company.com","%@corp.com","manager","completed",1000,true,20,0]"
      `);
    });
  });
});
