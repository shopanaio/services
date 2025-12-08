import { describe, it, expect } from "vitest";
import { SQL } from "drizzle-orm";
import {
  PgDialect,
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  numeric,
} from "drizzle-orm/pg-core";
import { format } from "sql-formatter";
import { createQuery, field } from "../index.js";

const dialect = new PgDialect();

function toSqlString(sqlObj: SQL): string {
  const query = dialect.sqlToQuery(sqlObj);
  const formatted = format(query.sql, {
    language: "postgresql",
    tabWidth: 2,
    keywordCase: "upper",
  });
  return `${formatted}\n-- Params: ${JSON.stringify(query.params)}`;
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
// QUERY DEFINITIONS (Fluent API)
// =============================================================================

const ordersQuery = createQuery(orders, {
  id: field(orders.id),
  userId: field(orders.userId),
  status: field(orders.status),
  totalAmount: field(orders.totalAmount),
  currency: field(orders.currency),
  createdAt: field(orders.createdAt),
  completedAt: field(orders.completedAt),
});

const usersQuery = createQuery(users, {
  id: field(users.id),
  email: field(users.email),
  name: field(users.name),
  role: field(users.role),
  isActive: field(users.isActive),
  createdAt: field(users.createdAt),
});

const translationsQuery = createQuery(translations, {
  id: field(translations.id),
  entityType: field(translations.entityType),
  entityId: field(translations.entityId),
  locale: field(translations.locale),
  field: field(translations.field),
  value: field(translations.value),
  searchValue: field(translations.searchValue),
});

const categoriesQuery = createQuery(categories, {
  id: field(categories.id),
  slug: field(categories.slug),
  parentId: field(categories.parentId),
  sortOrder: field(categories.sortOrder),
  isVisible: field(categories.isVisible),
});

const orderItemsQuery = createQuery(orderItems, {
  id: field(orderItems.id),
  orderId: field(orderItems.orderId),
  productId: field(orderItems.productId),
  quantity: field(orderItems.quantity),
  unitPrice: field(orderItems.unitPrice),
});

const productsQuery = createQuery(products, {
  id: field(products.id),
  sku: field(products.sku),
  categoryId: field(products.categoryId),
  price: field(products.price),
  stock: field(products.stock),
  isPublished: field(products.isPublished),
  deletedAt: field(products.deletedAt),
  createdAt: field(products.createdAt),
});

// Query with join: Users -> Orders
const usersWithOrdersQuery = createQuery(users, {
  id: field(users.id),
  email: field(users.email),
  name: field(users.name),
  role: field(users.role),
  isActive: field(users.isActive),
  orders: field(users.id).leftJoin(ordersQuery, orders.userId),
});

// Query with composite join: Products -> Translations
const productsWithTranslationsQuery = createQuery(products, {
  id: field(products.id),
  sku: field(products.sku),
  categoryId: field(products.categoryId),
  price: field(products.price),
  stock: field(products.stock),
  isPublished: field(products.isPublished),
  deletedAt: field(products.deletedAt),
  translation: field(products.id).leftJoin(
    translationsQuery,
    translations.entityId
  ),
});

// Query with camelCase keys: Categories -> Translations
const categoriesWithTranslationsQuery = createQuery(categories, {
  id: field(categories.id),
  slug: field(categories.slug),
  parentId: field(categories.parentId),
  sortOrder: field(categories.sortOrder),
  isVisible: field(categories.isVisible),
  translation: field(categories.id).leftJoin(
    translationsQuery,
    translations.entityId
  ),
});

// Query with multiple joins: Orders -> Users + OrderItems
const ordersWithUserAndItemsQuery = createQuery(orders, {
  id: field(orders.id),
  status: field(orders.status),
  totalAmount: field(orders.totalAmount),
  currency: field(orders.currency),
  createdAt: field(orders.createdAt),
  user: field(orders.userId).leftJoin(usersQuery, users.id),
  items: field(orders.id).leftJoin(orderItemsQuery, orderItems.orderId),
});

// Query with chain joins: Products -> Translations + Categories
const productsFullQuery = createQuery(products, {
  id: field(products.id),
  sku: field(products.sku),
  price: field(products.price),
  stock: field(products.stock),
  isPublished: field(products.isPublished),
  deletedAt: field(products.deletedAt),
  createdAt: field(products.createdAt),
  translation: field(products.id).leftJoin(
    translationsQuery,
    translations.entityId
  ),
  category: field(products.categoryId).innerJoin(
    categoriesQuery,
    categories.id
  ),
});

// Nested Level 2: OrderItems -> Products
const orderItemsWithProductQuery = createQuery(orderItems, {
  id: field(orderItems.id),
  orderId: field(orderItems.orderId),
  productId: field(orderItems.productId),
  quantity: field(orderItems.quantity),
  unitPrice: field(orderItems.unitPrice),
  product: field(orderItems.productId).leftJoin(productsQuery, products.id),
});

// Nested Level 2 Query: Orders -> OrderItems -> Products
const ordersNestedLevel2Query = createQuery(orders, {
  id: field(orders.id),
  userId: field(orders.userId),
  status: field(orders.status),
  totalAmount: field(orders.totalAmount),
  currency: field(orders.currency),
  createdAt: field(orders.createdAt),
  user: field(orders.userId).leftJoin(usersQuery, users.id),
  items: field(orders.id).leftJoin(
    orderItemsWithProductQuery,
    orderItems.orderId
  ),
});

// Products -> Categories (for nested Level 3)
const productsWithCategoryQuery = createQuery(products, {
  id: field(products.id),
  sku: field(products.sku),
  categoryId: field(products.categoryId),
  price: field(products.price),
  stock: field(products.stock),
  isPublished: field(products.isPublished),
  deletedAt: field(products.deletedAt),
  category: field(products.categoryId).leftJoin(categoriesQuery, categories.id),
});

// OrderItems -> Products -> Categories
const orderItemsWithProductCategoryQuery = createQuery(orderItems, {
  id: field(orderItems.id),
  orderId: field(orderItems.orderId),
  productId: field(orderItems.productId),
  quantity: field(orderItems.quantity),
  unitPrice: field(orderItems.unitPrice),
  product: field(orderItems.productId).leftJoin(
    productsWithCategoryQuery,
    products.id
  ),
});

// Nested Level 3 Query: Orders -> OrderItems -> Products -> Categories
const ordersNestedLevel3Query = createQuery(orders, {
  id: field(orders.id),
  userId: field(orders.userId),
  status: field(orders.status),
  totalAmount: field(orders.totalAmount),
  currency: field(orders.currency),
  createdAt: field(orders.createdAt),
  items: field(orders.id).leftJoin(
    orderItemsWithProductCategoryQuery,
    orderItems.orderId
  ),
});

// Categories -> Translations (for nested Level 4)
const categoriesWithTranslationsNestedQuery = createQuery(categories, {
  id: field(categories.id),
  slug: field(categories.slug),
  parentId: field(categories.parentId),
  sortOrder: field(categories.sortOrder),
  isVisible: field(categories.isVisible),
  translation: field(categories.id).leftJoin(
    translationsQuery,
    translations.entityId
  ),
});

// Products -> Categories -> Translations
const productsWithCategoryTranslationsQuery = createQuery(products, {
  id: field(products.id),
  sku: field(products.sku),
  categoryId: field(products.categoryId),
  price: field(products.price),
  stock: field(products.stock),
  isPublished: field(products.isPublished),
  deletedAt: field(products.deletedAt),
  category: field(products.categoryId).leftJoin(
    categoriesWithTranslationsNestedQuery,
    categories.id
  ),
});

// OrderItems -> Products -> Categories -> Translations
const orderItemsLevel4Query = createQuery(orderItems, {
  id: field(orderItems.id),
  orderId: field(orderItems.orderId),
  productId: field(orderItems.productId),
  quantity: field(orderItems.quantity),
  unitPrice: field(orderItems.unitPrice),
  product: field(orderItems.productId).leftJoin(
    productsWithCategoryTranslationsQuery,
    products.id
  ),
});

// Nested Level 4 Query: Orders -> OrderItems -> Products -> Categories -> Translations
const ordersNestedLevel4Query = createQuery(orders, {
  id: field(orders.id),
  userId: field(orders.userId),
  status: field(orders.status),
  totalAmount: field(orders.totalAmount),
  currency: field(orders.currency),
  createdAt: field(orders.createdAt),
  items: field(orders.id).leftJoin(orderItemsLevel4Query, orderItems.orderId),
});

// =============================================================================
// TESTS
// =============================================================================

describe("Complex SQL Snapshot Tests", () => {
  describe("Single-level joins", () => {
    it("should filter users by order status and total (Users -> Orders)", () => {
      // Simple join filter using nested path
      expect(
        toSqlString(
          usersWithOrdersQuery.getSql({
            select: ["id", "email", "name", "role", "isActive"],
            where: {
              orders: { status: { $eq: "completed" } },
              isActive: { $eq: true },
            },
            limit: 50,
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."email" AS "email",
          "t0_users"."name" AS "name",
          "t0_users"."role" AS "role",
          "t0_users"."is_active" AS "isActive"
        FROM
          "users" AS "t0_users"
          LEFT JOIN "orders" AS "t1_orders" ON "t0_users"."id" = "t1_orders"."user_id"
        WHERE
          (
            "t1_orders"."status" = $1
            AND "t0_users"."is_active" = $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["completed",true,50,0]"
      `);

      // Complex OR with join fields using nested paths
      expect(
        toSqlString(
          usersWithOrdersQuery.getSql({
            select: ["id", "email", "name", "role"],
            where: {
              $or: [
                {
                  $and: [
                    { orders: { status: { $eq: "completed" } } },
                    { orders: { totalAmount: { $gte: 500 } } },
                  ],
                },
                {
                  $and: [
                    { orders: { status: { $eq: "pending" } } },
                    { role: { $eq: "vip" } },
                  ],
                },
              ],
            },
            limit: 100,
            offset: 50,
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."email" AS "email",
          "t0_users"."name" AS "name",
          "t0_users"."role" AS "role"
        FROM
          "users" AS "t0_users"
          LEFT JOIN "orders" AS "t1_orders" ON "t0_users"."id" = "t1_orders"."user_id"
        WHERE
          (
            (
              "t1_orders"."status" = $1
              AND "t1_orders"."total_amount" >= $2
            )
            OR (
              "t1_orders"."status" = $3
              AND "t0_users"."role" = $4
            )
          )
        LIMIT
          $5
        OFFSET
          $6
        -- Params: ["completed",500,"pending","vip",100,50]"
      `);
    });

    it("should filter products with translations", () => {
      expect(
        toSqlString(
          productsWithTranslationsQuery.getSql({
            select: ["id", "sku", "price", "stock", "isPublished"],
            where: {
              translation: { value: { $containsi: "smartphone" } },
              isPublished: { $eq: true },
              deletedAt: { $is: null },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."sku" AS "sku",
          "t0_products"."price" AS "price",
          "t0_products"."stock" AS "stock",
          "t0_products"."is_published" AS "isPublished"
        FROM
          "products" AS "t0_products"
          LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        WHERE
          (
            "t1_translations"."value" ILIKE $1
            AND "t0_products"."is_published" = $2
            AND "t0_products"."deleted_at" IS NULL
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["%smartphone%",true,20,0]"
      `);
    });

    it("should filter categories with translation fields", () => {
      expect(
        toSqlString(
          categoriesWithTranslationsQuery.getSql({
            select: ["id", "slug", "parentId", "isVisible"],
            where: {
              translation: { value: { $containsi: "electronics" } },
              isVisible: { $eq: true },
              parentId: { $isNot: null },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_categories"."id" AS "id",
          "t0_categories"."slug" AS "slug",
          "t0_categories"."parent_id" AS "parentId",
          "t0_categories"."is_visible" AS "isVisible"
        FROM
          "categories" AS "t0_categories"
          LEFT JOIN "translations" AS "t1_translations" ON "t0_categories"."id" = "t1_translations"."entity_id"
        WHERE
          (
            "t1_translations"."value" ILIKE $1
            AND "t0_categories"."is_visible" = $2
            AND "t0_categories"."parent_id" IS NOT NULL
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["%electronics%",true,20,0]"
      `);
    });

    it("should filter orders with multiple joins (users + items)", () => {
      expect(
        toSqlString(
          ordersWithUserAndItemsQuery.getSql({
            select: ["id", "status", "totalAmount", "currency"],
            where: {
              user: { email: { $endsWithi: "@gmail.com" } },
              items: { quantity: { $gte: 5 } },
              status: { $in: ["pending", "processing", "shipped"] },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "users" AS "t1_users" ON "t0_orders"."user_id" = "t1_users"."id"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
        WHERE
          (
            "t1_users"."email" ILIKE $1
            AND "t1_order_items"."quantity" >= $2
            AND "t0_orders"."status" IN ($3, $4, $5)
          )
        LIMIT
          $6
        OFFSET
          $7
        -- Params: ["%@gmail.com",5,"pending","processing","shipped",20,0]"
      `);
    });

    it("should filter products with chain joins (translations + categories)", () => {
      expect(
        toSqlString(
          productsFullQuery.getSql({
            select: ["id", "sku", "price", "stock", "isPublished"],
            where: {
              category: {
                slug: { $in: ["electronics", "computers", "phones"] },
              },
              isPublished: { $eq: true },
              deletedAt: { $is: null },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."sku" AS "sku",
          "t0_products"."price" AS "price",
          "t0_products"."stock" AS "stock",
          "t0_products"."is_published" AS "isPublished"
        FROM
          "products" AS "t0_products"
          INNER JOIN "categories" AS "t1_categories" ON "t0_products"."category_id" = "t1_categories"."id"
        WHERE
          (
            "t1_categories"."slug" IN ($1, $2, $3)
            AND "t0_products"."is_published" = $4
            AND "t0_products"."deleted_at" IS NULL
          )
        LIMIT
          $5
        OFFSET
          $6
        -- Params: ["electronics","computers","phones",true,20,0]"
      `);
    });

    it("should NOT add join when no nested fields used", () => {
      // Only using main table fields - no join needed
      expect(
        toSqlString(
          usersWithOrdersQuery.getSql({
            select: ["id", "email", "name"],
            where: {
              email: { $endsWithi: "@gmail.com" },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."email" AS "email",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."email" ILIKE $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["%@gmail.com",20,0]"
      `);
    });
  });

  describe("Nested joins (2-4 levels)", () => {
    it("should filter by nested t2 field (Orders -> OrderItems -> Products)", () => {
      expect(
        toSqlString(
          ordersNestedLevel2Query.getSql({
            select: ["id", "status", "totalAmount", "currency"],
            where: {
              status: { $eq: "pending" },
              items: { product: { sku: { $startsWith: "PHONE-" } } },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
        WHERE
          (
            "t0_orders"."status" = $1
            AND "t2_products"."sku" LIKE $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["pending","PHONE-%",20,0]"
      `);

      // Combine direct join and nested join
      expect(
        toSqlString(
          ordersNestedLevel2Query.getSql({
            select: ["id", "status", "totalAmount"],
            where: {
              $and: [
                { user: { email: { $endsWithi: "@company.com" } } },
                { status: { $in: ["pending", "processing"] } },
                {
                  $or: [
                    { items: { product: { sku: { $startsWith: "LAPTOP-" } } } },
                    { items: { product: { sku: { $startsWith: "PHONE-" } } } },
                  ],
                },
              ],
            },
            limit: 50,
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "users" AS "t1_users" ON "t0_orders"."user_id" = "t1_users"."id"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
        WHERE
          (
            "t1_users"."email" ILIKE $1
            AND "t0_orders"."status" IN ($2, $3)
            AND (
              "t2_products"."sku" LIKE $4
              OR "t2_products"."sku" LIKE $5
            )
          )
        LIMIT
          $6
        OFFSET
          $7
        -- Params: ["%@company.com","pending","processing","LAPTOP-%","PHONE-%",50,0]"
      `);
    });

    it("should filter by nested t3 field (Orders -> OrderItems -> Products -> Categories)", () => {
      expect(
        toSqlString(
          ordersNestedLevel3Query.getSql({
            select: ["id", "status", "totalAmount", "currency"],
            where: {
              status: { $eq: "completed" },
              items: {
                product: {
                  category: { slug: { $in: ["electronics", "computers"] } },
                },
              },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
          LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"
        WHERE
          (
            "t0_orders"."status" = $1
            AND "t3_categories"."slug" IN ($2, $3)
          )
        LIMIT
          $4
        OFFSET
          $5
        -- Params: ["completed","electronics","computers",20,0]"
      `);

      // Combine t1, t2, t3 conditions
      expect(
        toSqlString(
          ordersNestedLevel3Query.getSql({
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
                    { items: { product: { sku: { $startsWith: "VIP-" } } } },
                    { items: { product: { price: { $gte: 1000 } } } },
                  ],
                },
                {
                  $and: [
                    {
                      items: {
                        product: { category: { slug: { $eq: "premium" } } },
                      },
                    },
                    {
                      items: {
                        product: { category: { isVisible: { $eq: true } } },
                      },
                    },
                  ],
                },
              ],
            },
            limit: 100,
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
          LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"
        WHERE
          (
            (
              "t0_orders"."status" = $1
              AND "t1_order_items"."quantity" >= $2
            )
            OR (
              "t2_products"."sku" LIKE $3
              AND "t2_products"."price" >= $4
            )
            OR (
              "t3_categories"."slug" = $5
              AND "t3_categories"."is_visible" = $6
            )
          )
        LIMIT
          $7
        OFFSET
          $8
        -- Params: ["processing",5,"VIP-%",1000,"premium",true,100,0]"
      `);
    });

    it("should filter by nested t4 field (Orders -> OrderItems -> Products -> Categories -> Translations)", () => {
      expect(
        toSqlString(
          ordersNestedLevel4Query.getSql({
            select: ["id", "status", "totalAmount", "currency"],
            where: {
              status: { $eq: "completed" },
              items: {
                product: {
                  category: {
                    translation: { value: { $containsi: "Electronics" } },
                  },
                },
              },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
          LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"
          LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"
        WHERE
          (
            "t0_orders"."status" = $1
            AND "t4_translations"."value" ILIKE $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["completed","%Electronics%",20,0]"
      `);

      // Full 4-level conditions
      expect(
        toSqlString(
          ordersNestedLevel4Query.getSql({
            select: ["id", "status", "totalAmount"],
            where: {
              $and: [
                {
                  items: {
                    product: {
                      category: { translation: { locale: { $eq: "en" } } },
                    },
                  },
                },
                {
                  items: {
                    product: {
                      category: {
                        translation: { value: { $notContainsi: "test" } },
                      },
                    },
                  },
                },
                {
                  items: {
                    product: { category: { isVisible: { $eq: true } } },
                  },
                },
              ],
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
          LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"
          LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"
        WHERE
          (
            "t4_translations"."locale" = $1
            AND "t4_translations"."value" NOT ILIKE $2
            AND "t3_categories"."is_visible" = $3
          )
        LIMIT
          $4
        OFFSET
          $5
        -- Params: ["en","%test%",true,20,0]"
      `);
    });
  });

  describe("ORDER BY with nested joins", () => {
    it("should order by fields across different nesting levels", () => {
      // Order by t0 field - no join needed
      expect(
        toSqlString(
          ordersNestedLevel2Query.getSql({
            select: ["id", "status", "totalAmount", "currency"],
            where: { status: { $eq: "completed" } },
            order: ["totalAmount:desc"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency"
        FROM
          "orders" AS "t0_orders"
        WHERE
          "t0_orders"."status" = $1
        ORDER BY
          "t0_orders"."total_amount" DESC
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["completed",20,0]"
      `);

      // Order by t1 field - join added via order
      expect(
        toSqlString(
          ordersNestedLevel2Query.getSql({
            where: {
              status: { $eq: "pending" },
              items: { quantity: { $gte: 1 } },
            },
            order: ["items.quantity:desc"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."user_id" AS "userId",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency",
          "t0_orders"."created_at" AS "createdAt"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
        WHERE
          (
            "t0_orders"."status" = $1
            AND "t1_order_items"."quantity" >= $2
          )
        ORDER BY
          "t1_order_items"."quantity" DESC
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["pending",1,20,0]"
      `);

      // Order by t2 field - joins added via nested where and order
      expect(
        toSqlString(
          ordersNestedLevel2Query.getSql({
            where: { items: { product: { isPublished: { $eq: true } } } },
            order: ["items.product.price:desc"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."user_id" AS "userId",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency",
          "t0_orders"."created_at" AS "createdAt"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
        WHERE
          "t2_products"."is_published" = $1
        ORDER BY
          "t2_products"."price" DESC
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [true,20,0]"
      `);

      // Order by t3 field
      expect(
        toSqlString(
          ordersNestedLevel3Query.getSql({
            where: {
              items: { product: { category: { isVisible: { $eq: true } } } },
            },
            order: ["items.product.category.slug:asc"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."user_id" AS "userId",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency",
          "t0_orders"."created_at" AS "createdAt"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
          LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"
        WHERE
          "t3_categories"."is_visible" = $1
        ORDER BY
          "t3_categories"."slug" ASC
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [true,20,0]"
      `);

      // Order by t4 field
      expect(
        toSqlString(
          ordersNestedLevel4Query.getSql({
            where: {
              items: {
                product: {
                  category: { translation: { locale: { $eq: "en" } } },
                },
              },
            },
            order: ["items.product.category.translation.value:asc"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."user_id" AS "userId",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency",
          "t0_orders"."created_at" AS "createdAt"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
          LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"
          LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"
        WHERE
          "t4_translations"."locale" = $1
        ORDER BY
          "t4_translations"."value" ASC
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["en",20,0]"
      `);

      // Multiple fields across levels
      expect(
        toSqlString(
          ordersNestedLevel3Query.getSql({
            where: {
              status: { $neq: "cancelled" },
              items: { product: { category: { isVisible: { $eq: true } } } },
            },
            order: [
              "items.product.category.slug:asc",
              "items.product.price:desc",
              "items.quantity:desc",
              "totalAmount:desc",
            ],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."user_id" AS "userId",
          "t0_orders"."status" AS "status",
          "t0_orders"."total_amount" AS "totalAmount",
          "t0_orders"."currency" AS "currency",
          "t0_orders"."created_at" AS "createdAt"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
          LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"
        WHERE
          (
            "t0_orders"."status" <> $1
            AND "t3_categories"."is_visible" = $2
          )
        ORDER BY
          "t3_categories"."slug" ASC,
          "t2_products"."price" DESC,
          "t1_order_items"."quantity" DESC,
          "t0_orders"."total_amount" DESC
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["cancelled",true,20,0]"
      `);
    });
  });

  describe("SELECT with nested joins", () => {
    it("should select fields from different nesting levels", () => {
      // Select t0, t1 fields - join added via select
      expect(
        toSqlString(
          ordersNestedLevel2Query.getSql({
            where: { items: { quantity: { $gte: 1 } } },
            select: ["id", "status", "items.quantity", "items.unitPrice"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t1_order_items"."quantity" AS "items.quantity",
          "t1_order_items"."unit_price" AS "items.unitPrice"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
        WHERE
          "t1_order_items"."quantity" >= $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [1,20,0]"
      `);

      // Select t2 fields
      expect(
        toSqlString(
          ordersNestedLevel2Query.getSql({
            where: { items: { product: { isPublished: { $eq: true } } } },
            select: ["id", "items.product.sku", "items.product.price"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t2_products"."sku" AS "items.product.sku",
          "t2_products"."price" AS "items.product.price"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
        WHERE
          "t2_products"."is_published" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [true,20,0]"
      `);

      // Select t3 fields
      expect(
        toSqlString(
          ordersNestedLevel3Query.getSql({
            where: {
              items: { product: { category: { isVisible: { $eq: true } } } },
            },
            select: [
              "id",
              "status",
              "items.product.category.slug",
              "items.product.category.isVisible",
            ],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t3_categories"."slug" AS "items.product.category.slug",
          "t3_categories"."is_visible" AS "items.product.category.isVisible"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
          LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"
        WHERE
          "t3_categories"."is_visible" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [true,20,0]"
      `);

      // Select t4 fields
      expect(
        toSqlString(
          ordersNestedLevel4Query.getSql({
            where: {
              items: {
                product: {
                  category: { translation: { locale: { $eq: "en" } } },
                },
              },
            },
            select: [
              "id",
              "status",
              "items.product.category.translation.value",
              "items.product.category.translation.locale",
            ],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_orders"."id" AS "id",
          "t0_orders"."status" AS "status",
          "t4_translations"."value" AS "items.product.category.translation.value",
          "t4_translations"."locale" AS "items.product.category.translation.locale"
        FROM
          "orders" AS "t0_orders"
          LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"
          LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"
          LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"
          LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"
        WHERE
          "t4_translations"."locale" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["en",20,0]"
      `);
    });
  });

  describe("Edge cases", () => {
    it("should handle large IN clause", () => {
      const productSkus = Array.from(
        { length: 20 },
        (_, i) => `SKU-${String(i).padStart(4, "0")}`
      );

      expect(
        toSqlString(
          productsFullQuery.getSql({
            select: ["id", "sku", "isPublished"],
            where: { sku: { $in: productSkus }, isPublished: { $eq: true } },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."sku" AS "sku",
          "t0_products"."is_published" AS "isPublished"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."sku" IN (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12,
              $13,
              $14,
              $15,
              $16,
              $17,
              $18,
              $19,
              $20
            )
            AND "t0_products"."is_published" = $21
          )
        LIMIT
          $22
        OFFSET
          $23
        -- Params: ["SKU-0000","SKU-0001","SKU-0002","SKU-0003","SKU-0004","SKU-0005","SKU-0006","SKU-0007","SKU-0008","SKU-0009","SKU-0010","SKU-0011","SKU-0012","SKU-0013","SKU-0014","SKU-0015","SKU-0016","SKU-0017","SKU-0018","SKU-0019",true,20,0]"
      `);
    });

    it("should handle 10+ conditions with mixed operators and nested paths", () => {
      expect(
        toSqlString(
          productsFullQuery.getSql({
            select: ["id", "sku", "price", "stock", "isPublished"],

            where: {
              $and: [
                { id: { $neq: "00000000-0000-0000-0000-000000000000" } },
                { sku: { $startsWith: "" } },
                { sku: { $notContains: "TEST-" } },
                { price: { $gt: 0 } },
                { price: { $lt: 999999 } },
                { stock: { $gte: 0 } },
                { stock: { $lte: 10000 } },
                { isPublished: { $eq: true } },
                { deletedAt: { $is: null } },
                { category: { slug: { $in: ["a", "b", "c", "d", "e"] } } },
                { category: { isVisible: { $isNot: null } } },
                { translation: { value: { $containsi: "keyword" } } },
              ],
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."sku" AS "sku",
          "t0_products"."price" AS "price",
          "t0_products"."stock" AS "stock",
          "t0_products"."is_published" AS "isPublished"
        FROM
          "products" AS "t0_products"
          INNER JOIN "categories" AS "t1_categories" ON "t0_products"."category_id" = "t1_categories"."id"
          LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        WHERE
          (
            "t0_products"."id" <> $1
            AND "t0_products"."sku" LIKE $2
            AND "t0_products"."sku" NOT LIKE $3
            AND "t0_products"."price" > $4
            AND "t0_products"."price" < $5
            AND "t0_products"."stock" >= $6
            AND "t0_products"."stock" <= $7
            AND "t0_products"."is_published" = $8
            AND "t0_products"."deleted_at" IS NULL
            AND "t1_categories"."slug" IN ($9, $10, $11, $12, $13)
            AND "t1_categories"."is_visible" IS NOT NULL
            AND "t1_translations"."value" ILIKE $14
          )
        LIMIT
          $15
        OFFSET
          $16
        -- Params: ["00000000-0000-0000-0000-000000000000","%","%TEST-%",0,999999,0,10000,true,"a","b","c","d","e","%keyword%",20,0]"
      `);
    });

    it("should handle maxLimit and pagination without joins", () => {
      const limitedQuery = productsFullQuery.maxLimit(1000);
      expect(
        toSqlString(
          limitedQuery.getSql({
            select: ["id", "sku", "isPublished"],
            where: { isPublished: { $eq: true } },
            limit: 1000,
            offset: 99000,
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."sku" AS "sku",
          "t0_products"."is_published" AS "isPublished"
        FROM
          "products" AS "t0_products"
        WHERE
          "t0_products"."is_published" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [true,1000,99000]"
      `);
    });

    it("should handle deeply nested OR/AND (4+ levels) with nested paths", () => {
      expect(
        toSqlString(
          usersWithOrdersQuery.getSql({
            select: ["id", "email", "name", "role", "isActive"],
            where: {
              $or: [
                {
                  $and: [
                    { role: { $eq: "admin" } },
                    {
                      $or: [
                        { email: { $endsWithi: "@company.com" } },
                        { email: { $endsWithi: "@corp.com" } },
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
                            { orders: { status: { $eq: "completed" } } },
                            { orders: { totalAmount: { $gte: 1000 } } },
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
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."email" AS "email",
          "t0_users"."name" AS "name",
          "t0_users"."role" AS "role",
          "t0_users"."is_active" AS "isActive"
        FROM
          "users" AS "t0_users"
          LEFT JOIN "orders" AS "t1_orders" ON "t0_users"."id" = "t1_orders"."user_id"
        WHERE
          (
            (
              "t0_users"."role" = $1
              AND (
                "t0_users"."email" ILIKE $2
                OR "t0_users"."email" ILIKE $3
              )
            )
            OR (
              "t0_users"."role" = $4
              AND (
                (
                  "t1_orders"."status" = $5
                  AND "t1_orders"."total_amount" >= $6
                )
                OR (
                  "t0_users"."is_active" = $7
                  AND "t0_users"."name" IS NOT NULL
                )
              )
            )
          )
        LIMIT
          $8
        OFFSET
          $9
        -- Params: ["admin","%@company.com","%@corp.com","manager","completed",1000,true,20,0]"
      `);
    });
  });
});
