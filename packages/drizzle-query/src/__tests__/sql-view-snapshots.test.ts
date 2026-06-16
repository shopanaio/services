import { describe, it, expect } from "vitest";
import { SQL, sql } from "drizzle-orm";
import {
  PgDialect,
  pgTable,
  pgView,
  pgMaterializedView,
  pgSchema,
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
// BASE TABLES
// =============================================================================

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
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

const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isVisible: boolean("is_visible").default(true),
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

const translations = pgTable("translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  locale: text("locale").notNull(),
  field: text("field").notNull(),
  value: text("value"),
  searchValue: text("search_value"),
});

// =============================================================================
// VIEWS - Basic
// =============================================================================

/**
 * Simple view: Active users with computed display name
 */
const activeUsersView = pgView("active_users_view").as((qb) =>
  qb
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      displayName: sql<string>`COALESCE(${users.name}, ${users.email})`.as("display_name"),
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`${users.isActive} = true`)
);

/**
 * View: Product statistics with aggregated data
 */
const productStatsView = pgView("product_stats_view").as((qb) =>
  qb
    .select({
      productId: orderItems.productId,
      totalQuantitySold: sql<number>`SUM(${orderItems.quantity})`.as("total_quantity_sold"),
      totalRevenue: sql<number>`SUM(${orderItems.quantity} * ${orderItems.unitPrice})`.as("total_revenue"),
      orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`.as("order_count"),
    })
    .from(orderItems)
    .groupBy(orderItems.productId)
);

/**
 * View: User order summary
 */
const userOrderSummaryView = pgView("user_order_summary_view").as((qb) =>
  qb
    .select({
      userId: orders.userId,
      totalOrders: sql<number>`COUNT(*)`.as("total_orders"),
      totalSpent: sql<number>`SUM(${orders.totalAmount})`.as("total_spent"),
      avgOrderValue: sql<number>`AVG(${orders.totalAmount})`.as("avg_order_value"),
      lastOrderDate: sql<Date>`MAX(${orders.createdAt})`.as("last_order_date"),
    })
    .from(orders)
    .groupBy(orders.userId)
);

/**
 * View: Category product count
 */
const categoryStatsView = pgView("category_stats_view").as((qb) =>
  qb
    .select({
      categoryId: products.categoryId,
      productCount: sql<number>`COUNT(*)`.as("product_count"),
      avgPrice: sql<number>`AVG(${products.price})`.as("avg_price"),
      minPrice: sql<number>`MIN(${products.price})`.as("min_price"),
      maxPrice: sql<number>`MAX(${products.price})`.as("max_price"),
      totalStock: sql<number>`SUM(${products.stock})`.as("total_stock"),
    })
    .from(products)
    .where(sql`${products.deletedAt} IS NULL AND ${products.isPublished} = true`)
    .groupBy(products.categoryId)
);

/**
 * View: Published products with price range
 */
const publishedProductsView = pgView("published_products_view").as((qb) =>
  qb
    .select({
      id: products.id,
      sku: products.sku,
      categoryId: products.categoryId,
      price: products.price,
      stock: products.stock,
      createdAt: products.createdAt,
      priceRange: sql<string>`
        CASE
          WHEN ${products.price} < 50 THEN 'budget'
          WHEN ${products.price} < 200 THEN 'mid-range'
          ELSE 'premium'
        END
      `.as("price_range"),
    })
    .from(products)
    .where(sql`${products.isPublished} = true AND ${products.deletedAt} IS NULL`)
);

// =============================================================================
// VIEWS - With Schema Qualification
// =============================================================================

const analyticsSchema = pgSchema("analytics");

const userActivityView = analyticsSchema.view("user_activity_view").as((qb) =>
  qb
    .select({
      userId: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      daysSinceCreation: sql<number>`EXTRACT(DAY FROM NOW() - ${users.createdAt})`.as("days_since_creation"),
    })
    .from(users)
);

// =============================================================================
// QUERIES - Basic Table Queries for Joins
// =============================================================================

const usersQuery = createQuery(users, {
  id: field(users.id),
  email: field(users.email),
  name: field(users.name),
  role: field(users.role),
  isActive: field(users.isActive),
  createdAt: field(users.createdAt),
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

const categoriesQuery = createQuery(categories, {
  id: field(categories.id),
  slug: field(categories.slug),
  parentId: field(categories.parentId),
  sortOrder: field(categories.sortOrder),
  isVisible: field(categories.isVisible),
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

// =============================================================================
// VIEW QUERIES - Auto-generated fields
// =============================================================================

// View query using automatic field extraction
const activeUsersViewQuery = createQuery(activeUsersView);

const productStatsViewQuery = createQuery(productStatsView);

const userOrderSummaryViewQuery = createQuery(userOrderSummaryView);

const categoryStatsViewQuery = createQuery(categoryStatsView);

const publishedProductsViewQuery = createQuery(publishedProductsView);

const userActivityViewQuery = createQuery(userActivityView);

// =============================================================================
// VIEW QUERIES - With Custom Fields
// =============================================================================

// View query with explicit field definitions
const activeUsersCustomQuery = createQuery(activeUsersView, {
  id: field(activeUsersView.id),
  email: field(activeUsersView.email),
  name: field(activeUsersView.name),
  role: field(activeUsersView.role),
  displayName: field(activeUsersView.displayName),
  createdAt: field(activeUsersView.createdAt),
});

// =============================================================================
// VIEW QUERIES - With JOINs to Tables
// =============================================================================

// View -> Table: Active users with their orders (LEFT JOIN to table)
const activeUsersWithOrdersQuery = createQuery(activeUsersView, {
  id: field(activeUsersView.id),
  email: field(activeUsersView.email),
  displayName: field(activeUsersView.displayName),
  role: field(activeUsersView.role),
  orders: field(activeUsersView.id).leftJoin(
    createQuery(orders, {
      id: field(orders.id),
      status: field(orders.status),
      totalAmount: field(orders.totalAmount),
      currency: field(orders.currency),
      createdAt: field(orders.createdAt),
    }),
    orders.userId
  ),
});

// Table -> View: Products with stats from view
const productsWithStatsQuery = createQuery(products, {
  id: field(products.id),
  sku: field(products.sku),
  price: field(products.price),
  stock: field(products.stock),
  isPublished: field(products.isPublished),
  deletedAt: field(products.deletedAt),
  stats: field(products.id).leftJoin(productStatsViewQuery, productStatsView.productId),
});

// Table -> View: Users with order summary from view
const usersWithSummaryQuery = createQuery(users, {
  id: field(users.id),
  email: field(users.email),
  name: field(users.name),
  role: field(users.role),
  isActive: field(users.isActive),
  summary: field(users.id).leftJoin(userOrderSummaryViewQuery, userOrderSummaryView.userId),
});

// =============================================================================
// VIEW QUERIES - With JOINs to Views (View -> View)
// =============================================================================

// View -> View: Published products with category stats
const publishedWithCategoryStatsQuery = createQuery(publishedProductsView, {
  id: field(publishedProductsView.id),
  sku: field(publishedProductsView.sku),
  price: field(publishedProductsView.price),
  priceRange: field(publishedProductsView.priceRange),
  categoryStats: field(publishedProductsView.categoryId).leftJoin(
    categoryStatsViewQuery,
    categoryStatsView.categoryId
  ),
});

// =============================================================================
// DEEP NESTED QUERIES - View chains
// =============================================================================

// Published products with category (Table)
const publishedWithCategoryQuery = createQuery(publishedProductsView, {
  id: field(publishedProductsView.id),
  sku: field(publishedProductsView.sku),
  price: field(publishedProductsView.price),
  priceRange: field(publishedProductsView.priceRange),
  category: field(publishedProductsView.categoryId).leftJoin(categoriesQuery, categories.id),
});

// Categories with translations
const categoriesWithTranslationsQuery = createQuery(categories, {
  id: field(categories.id),
  slug: field(categories.slug),
  parentId: field(categories.parentId),
  sortOrder: field(categories.sortOrder),
  isVisible: field(categories.isVisible),
  translation: field(categories.id).leftJoin(translationsQuery, translations.entityId),
});

// Deep: View -> Table -> Table (Published products -> Category -> Translation)
const publishedWithCategoryTranslationsQuery = createQuery(publishedProductsView, {
  id: field(publishedProductsView.id),
  sku: field(publishedProductsView.sku),
  price: field(publishedProductsView.price),
  priceRange: field(publishedProductsView.priceRange),
  category: field(publishedProductsView.categoryId).leftJoin(
    categoriesWithTranslationsQuery,
    categories.id
  ),
});

// Active users with order summary (View) and products stats (View)
const ordersWithProductStatsQuery = createQuery(orders, {
  id: field(orders.id),
  userId: field(orders.userId),
  status: field(orders.status),
  totalAmount: field(orders.totalAmount),
});

// Users with orders that have product stats
const usersDeepQuery = createQuery(users, {
  id: field(users.id),
  email: field(users.email),
  name: field(users.name),
  summary: field(users.id).leftJoin(userOrderSummaryViewQuery, userOrderSummaryView.userId),
});

// =============================================================================
// TESTS
// =============================================================================

describe("View SQL Snapshot Tests", () => {
  describe("Basic View SELECT", () => {
    it("should generate SELECT from view with auto-extracted fields", () => {
      expect(
        toSqlString(
          activeUsersViewQuery.getSql({
            select: ["id", "email", "displayName", "role"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_active_users_view"."id" AS "id",
          "t0_active_users_view"."email" AS "email",
          "t0_active_users_view"."display_name" AS "displayName",
          "t0_active_users_view"."role" AS "role"
        FROM
          "active_users_view" AS "t0_active_users_view"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });

    it("should generate SELECT from view with custom limit/offset", () => {
      expect(
        toSqlString(
          productStatsViewQuery.getSql({
            select: ["productId", "totalQuantitySold", "totalRevenue"],
            limit: 50,
            offset: 100,
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_product_stats_view"."product_id" AS "productId",
          "t0_product_stats_view"."total_quantity_sold" AS "totalQuantitySold",
          "t0_product_stats_view"."total_revenue" AS "totalRevenue"
        FROM
          "product_stats_view" AS "t0_product_stats_view"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [50,100]"
      `);
    });

    it("should generate SELECT from view with explicit field definitions", () => {
      expect(
        toSqlString(
          activeUsersCustomQuery.getSql({
            select: ["id", "email", "displayName"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_active_users_view"."id" AS "id",
          "t0_active_users_view"."email" AS "email",
          "t0_active_users_view"."display_name" AS "displayName"
        FROM
          "active_users_view" AS "t0_active_users_view"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });

    it("should generate SELECT from schema-qualified view", () => {
      expect(
        toSqlString(
          userActivityViewQuery.getSql({
            select: ["userId", "email", "role", "daysSinceCreation"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_user_activity_view"."id" AS "userId",
          "t0_user_activity_view"."email" AS "email",
          "t0_user_activity_view"."role" AS "role",
          "t0_user_activity_view"."days_since_creation" AS "daysSinceCreation"
        FROM
          "analytics"."user_activity_view" AS "t0_user_activity_view"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });
  });

  describe("View WHERE conditions", () => {
    it("should generate WHERE with equality operator on view", () => {
      expect(
        toSqlString(
          activeUsersViewQuery.getSql({
            select: ["id", "email", "role"],
            where: { role: { _eq: "admin" } },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_active_users_view"."id" AS "id",
          "t0_active_users_view"."email" AS "email",
          "t0_active_users_view"."role" AS "role"
        FROM
          "active_users_view" AS "t0_active_users_view"
        WHERE
          "t0_active_users_view"."role" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["admin",20,0]"
      `);
    });

    it("should generate WHERE with comparison operators on aggregated fields", () => {
      expect(
        toSqlString(
          productStatsViewQuery.getSql({
            select: ["productId", "totalQuantitySold", "totalRevenue", "orderCount"],
            where: {
              totalQuantitySold: { _gte: 100 },
              totalRevenue: { _gt: 5000 },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_product_stats_view"."product_id" AS "productId",
          "t0_product_stats_view"."total_quantity_sold" AS "totalQuantitySold",
          "t0_product_stats_view"."total_revenue" AS "totalRevenue",
          "t0_product_stats_view"."order_count" AS "orderCount"
        FROM
          "product_stats_view" AS "t0_product_stats_view"
        WHERE
          (
            "t0_product_stats_view"."total_quantity_sold" >= $1
            AND "t0_product_stats_view"."total_revenue" > $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: [100,5000,20,0]"
      `);
    });

    it("should generate WHERE with string operators on view fields", () => {
      expect(
        toSqlString(
          activeUsersViewQuery.getSql({
            select: ["id", "email", "displayName"],
            where: {
              email: { _endsWithi: "@gmail.com" },
              displayName: { _containsi: "john" },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_active_users_view"."id" AS "id",
          "t0_active_users_view"."email" AS "email",
          "t0_active_users_view"."display_name" AS "displayName"
        FROM
          "active_users_view" AS "t0_active_users_view"
        WHERE
          (
            "t0_active_users_view"."email" ILIKE $1
            AND "t0_active_users_view"."display_name" ILIKE $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["%@gmail.com","%john%",20,0]"
      `);
    });

    it("should generate WHERE with _in operator on view", () => {
      expect(
        toSqlString(
          publishedProductsViewQuery.getSql({
            select: ["id", "sku", "priceRange"],
            where: {
              priceRange: { _in: ["budget", "mid-range"] },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_published_products_view"."id" AS "id",
          "t0_published_products_view"."sku" AS "sku",
          "t0_published_products_view"."price_range" AS "priceRange"
        FROM
          "published_products_view" AS "t0_published_products_view"
        WHERE
          "t0_published_products_view"."price_range" IN ($1, $2)
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["budget","mid-range",20,0]"
      `);
    });

    it("should generate WHERE with _and/_or logical operators on view", () => {
      expect(
        toSqlString(
          userOrderSummaryViewQuery.getSql({
            select: ["userId", "totalOrders", "totalSpent", "avgOrderValue"],
            where: {
              _or: [
                { totalOrders: { _gte: 10 } },
                {
                  _and: [
                    { totalSpent: { _gte: 1000 } },
                    { avgOrderValue: { _gte: 100 } },
                  ],
                },
              ],
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_user_order_summary_view"."user_id" AS "userId",
          "t0_user_order_summary_view"."total_orders" AS "totalOrders",
          "t0_user_order_summary_view"."total_spent" AS "totalSpent",
          "t0_user_order_summary_view"."avg_order_value" AS "avgOrderValue"
        FROM
          "user_order_summary_view" AS "t0_user_order_summary_view"
        WHERE
          (
            "t0_user_order_summary_view"."total_orders" >= $1
            OR (
              "t0_user_order_summary_view"."total_spent" >= $2
              AND "t0_user_order_summary_view"."avg_order_value" >= $3
            )
          )
        LIMIT
          $4
        OFFSET
          $5
        -- Params: [10,1000,100,20,0]"
      `);
    });

    it("should generate WHERE with null checks on view", () => {
      expect(
        toSqlString(
          categoryStatsViewQuery.getSql({
            select: ["categoryId", "productCount", "avgPrice"],
            where: {
              categoryId: { _isNot: null },
              avgPrice: { _is: null },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_category_stats_view"."category_id" AS "categoryId",
          "t0_category_stats_view"."product_count" AS "productCount",
          "t0_category_stats_view"."avg_price" AS "avgPrice"
        FROM
          "category_stats_view" AS "t0_category_stats_view"
        WHERE
          (
            "t0_category_stats_view"."category_id" IS NOT NULL
            AND "t0_category_stats_view"."avg_price" IS NULL
          )
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });
  });

  describe("View ORDER BY", () => {
    it("should generate ORDER BY on view fields", () => {
      expect(
        toSqlString(
          productStatsViewQuery.getSql({
            select: ["productId", "totalRevenue", "orderCount"],
            order: [{ field: "totalRevenue", direction: "desc" }],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_product_stats_view"."product_id" AS "productId",
          "t0_product_stats_view"."total_revenue" AS "totalRevenue",
          "t0_product_stats_view"."order_count" AS "orderCount"
        FROM
          "product_stats_view" AS "t0_product_stats_view"
        ORDER BY
          "t0_product_stats_view"."total_revenue" DESC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });

    it("should generate multi-field ORDER BY on view", () => {
      expect(
        toSqlString(
          userOrderSummaryViewQuery.getSql({
            select: ["userId", "totalOrders", "totalSpent"],
            order: [
              { field: "totalSpent", direction: "desc" },
              { field: "totalOrders", direction: "desc" },
            ],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_user_order_summary_view"."user_id" AS "userId",
          "t0_user_order_summary_view"."total_orders" AS "totalOrders",
          "t0_user_order_summary_view"."total_spent" AS "totalSpent"
        FROM
          "user_order_summary_view" AS "t0_user_order_summary_view"
        ORDER BY
          "t0_user_order_summary_view"."total_spent" DESC,
          "t0_user_order_summary_view"."total_orders" DESC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });

    it("should generate ORDER BY on computed/aliased view fields", () => {
      expect(
        toSqlString(
          publishedProductsViewQuery.getSql({
            select: ["id", "sku", "priceRange"],
            order: [
              { field: "priceRange", direction: "asc" },
              { field: "price", direction: "desc" },
            ],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_published_products_view"."id" AS "id",
          "t0_published_products_view"."sku" AS "sku",
          "t0_published_products_view"."price_range" AS "priceRange"
        FROM
          "published_products_view" AS "t0_published_products_view"
        ORDER BY
          "t0_published_products_view"."price_range" ASC,
          "t0_published_products_view"."price" DESC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });
  });

  describe("View JOINs - View to Table", () => {
    it("should generate LEFT JOIN from view to table", () => {
      expect(
        toSqlString(
          activeUsersWithOrdersQuery.getSql({
            select: ["id", "email", "displayName", "orders.status", "orders.totalAmount"],
            where: {
              orders: { status: { _eq: "completed" } },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_active_users_view"."id" AS "id",
          "t0_active_users_view"."email" AS "email",
          "t0_active_users_view"."display_name" AS "displayName",
          "t1_orders"."status" AS "orders.status",
          "t1_orders"."total_amount" AS "orders.totalAmount"
        FROM
          "active_users_view" AS "t0_active_users_view"
          LEFT JOIN "orders" AS "t1_orders" ON "t0_active_users_view"."id" = "t1_orders"."user_id"
        WHERE
          "t1_orders"."status" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["completed",20,0]"
      `);
    });

    it("should generate LEFT JOIN from table to view", () => {
      expect(
        toSqlString(
          productsWithStatsQuery.getSql({
            select: ["id", "sku", "price", "stats.totalQuantitySold", "stats.totalRevenue"],
            where: {
              stats: { totalQuantitySold: { _gte: 50 } },
              isPublished: { _eq: true },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."sku" AS "sku",
          "t0_products"."price" AS "price",
          "t1_product_stats_view"."total_quantity_sold" AS "stats.totalQuantitySold",
          "t1_product_stats_view"."total_revenue" AS "stats.totalRevenue"
        FROM
          "products" AS "t0_products"
          LEFT JOIN "product_stats_view" AS "t1_product_stats_view" ON "t0_products"."id" = "t1_product_stats_view"."product_id"
        WHERE
          (
            "t1_product_stats_view"."total_quantity_sold" >= $1
            AND "t0_products"."is_published" = $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: [50,true,20,0]"
      `);
    });

    it("should generate complex WHERE with view join fields", () => {
      expect(
        toSqlString(
          usersWithSummaryQuery.getSql({
            select: ["id", "email", "name", "summary.totalOrders", "summary.totalSpent"],
            where: {
              _and: [
                { isActive: { _eq: true } },
                { role: { _in: ["admin", "manager"] } },
                {
                  _or: [
                    { summary: { totalOrders: { _gte: 5 } } },
                    { summary: { totalSpent: { _gte: 500 } } },
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
          "t1_user_order_summary_view"."total_orders" AS "summary.totalOrders",
          "t1_user_order_summary_view"."total_spent" AS "summary.totalSpent"
        FROM
          "users" AS "t0_users"
          LEFT JOIN "user_order_summary_view" AS "t1_user_order_summary_view" ON "t0_users"."id" = "t1_user_order_summary_view"."user_id"
        WHERE
          (
            "t0_users"."is_active" = $1
            AND "t0_users"."role" IN ($2, $3)
            AND (
              "t1_user_order_summary_view"."total_orders" >= $4
              OR "t1_user_order_summary_view"."total_spent" >= $5
            )
          )
        LIMIT
          $6
        OFFSET
          $7
        -- Params: [true,"admin","manager",5,500,20,0]"
      `);
    });
  });

  describe("View JOINs - View to View", () => {
    it("should generate LEFT JOIN from view to view", () => {
      expect(
        toSqlString(
          publishedWithCategoryStatsQuery.getSql({
            select: ["id", "sku", "priceRange", "categoryStats.productCount", "categoryStats.avgPrice"],
            where: {
              categoryStats: { productCount: { _gte: 5 } },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_published_products_view"."id" AS "id",
          "t0_published_products_view"."sku" AS "sku",
          "t0_published_products_view"."price_range" AS "priceRange",
          "t1_category_stats_view"."product_count" AS "categoryStats.productCount",
          "t1_category_stats_view"."avg_price" AS "categoryStats.avgPrice"
        FROM
          "published_products_view" AS "t0_published_products_view"
          LEFT JOIN "category_stats_view" AS "t1_category_stats_view" ON "t0_published_products_view"."category_id" = "t1_category_stats_view"."category_id"
        WHERE
          "t1_category_stats_view"."product_count" >= $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [5,20,0]"
      `);
    });

    it("should generate ORDER BY on joined view fields", () => {
      expect(
        toSqlString(
          publishedWithCategoryStatsQuery.getSql({
            select: ["id", "sku", "priceRange", "categoryStats.avgPrice"],
            order: [
              { field: "categoryStats.avgPrice", direction: "desc" },
              { field: "price", direction: "asc" },
            ],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_published_products_view"."id" AS "id",
          "t0_published_products_view"."sku" AS "sku",
          "t0_published_products_view"."price_range" AS "priceRange",
          "t1_category_stats_view"."avg_price" AS "categoryStats.avgPrice"
        FROM
          "published_products_view" AS "t0_published_products_view"
          LEFT JOIN "category_stats_view" AS "t1_category_stats_view" ON "t0_published_products_view"."category_id" = "t1_category_stats_view"."category_id"
        ORDER BY
          "t1_category_stats_view"."avg_price" DESC,
          "t0_published_products_view"."price" ASC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });
  });

  describe("Deep Nested JOINs with Views", () => {
    it("should generate View -> Table chain", () => {
      expect(
        toSqlString(
          publishedWithCategoryQuery.getSql({
            select: ["id", "sku", "priceRange", "category.slug", "category.isVisible"],
            where: {
              category: { isVisible: { _eq: true } },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_published_products_view"."id" AS "id",
          "t0_published_products_view"."sku" AS "sku",
          "t0_published_products_view"."price_range" AS "priceRange",
          "t1_categories"."slug" AS "category.slug",
          "t1_categories"."is_visible" AS "category.isVisible"
        FROM
          "published_products_view" AS "t0_published_products_view"
          LEFT JOIN "categories" AS "t1_categories" ON "t0_published_products_view"."category_id" = "t1_categories"."id"
        WHERE
          "t1_categories"."is_visible" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [true,20,0]"
      `);
    });

    it("should generate View -> Table -> Table deep chain", () => {
      expect(
        toSqlString(
          publishedWithCategoryTranslationsQuery.getSql({
            select: [
              "id",
              "sku",
              "priceRange",
              "category.slug",
              "category.translation.value",
              "category.translation.locale",
            ],
            where: {
              category: {
                isVisible: { _eq: true },
                translation: { locale: { _eq: "en" } },
              },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_published_products_view"."id" AS "id",
          "t0_published_products_view"."sku" AS "sku",
          "t0_published_products_view"."price_range" AS "priceRange",
          "t1_categories"."slug" AS "category.slug",
          "t2_translations"."value" AS "category.translation.value",
          "t2_translations"."locale" AS "category.translation.locale"
        FROM
          "published_products_view" AS "t0_published_products_view"
          LEFT JOIN "categories" AS "t1_categories" ON "t0_published_products_view"."category_id" = "t1_categories"."id"
          LEFT JOIN "translations" AS "t2_translations" ON "t1_categories"."id" = "t2_translations"."entity_id"
        WHERE
          (
            "t1_categories"."is_visible" = $1
            AND "t2_translations"."locale" = $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: [true,"en",20,0]"
      `);
    });

    it("should generate ORDER BY across deep nested view chain", () => {
      expect(
        toSqlString(
          publishedWithCategoryTranslationsQuery.getSql({
            select: ["id", "sku", "category.slug", "category.translation.value"],
            where: {
              category: { translation: { locale: { _eq: "en" } } },
            },
            order: [
              { field: "category.translation.value", direction: "asc" },
              { field: "category.slug", direction: "asc" },
              { field: "price", direction: "desc" },
            ],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_published_products_view"."id" AS "id",
          "t0_published_products_view"."sku" AS "sku",
          "t1_categories"."slug" AS "category.slug",
          "t2_translations"."value" AS "category.translation.value"
        FROM
          "published_products_view" AS "t0_published_products_view"
          LEFT JOIN "categories" AS "t1_categories" ON "t0_published_products_view"."category_id" = "t1_categories"."id"
          LEFT JOIN "translations" AS "t2_translations" ON "t1_categories"."id" = "t2_translations"."entity_id"
        WHERE
          "t2_translations"."locale" = $1
        ORDER BY
          "t2_translations"."value" ASC,
          "t1_categories"."slug" ASC,
          "t0_published_products_view"."price" DESC
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["en",20,0]"
      `);
    });
  });

  describe("View JOIN Types", () => {
    it("should generate INNER JOIN with view", () => {
      const productsWithStatsInnerQuery = createQuery(products, {
        id: field(products.id),
        sku: field(products.sku),
        price: field(products.price),
        stats: field(products.id).innerJoin(productStatsViewQuery, productStatsView.productId),
      });

      expect(
        toSqlString(
          productsWithStatsInnerQuery.getSql({
            select: ["id", "sku", "stats.totalRevenue"],
            where: { stats: { totalRevenue: { _gt: 1000 } } },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."sku" AS "sku",
          "t1_product_stats_view"."total_revenue" AS "stats.totalRevenue"
        FROM
          "products" AS "t0_products"
          INNER JOIN "product_stats_view" AS "t1_product_stats_view" ON "t0_products"."id" = "t1_product_stats_view"."product_id"
        WHERE
          "t1_product_stats_view"."total_revenue" > $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [1000,20,0]"
      `);
    });

    it("should generate RIGHT JOIN with view", () => {
      const productsWithStatsRightQuery = createQuery(products, {
        id: field(products.id),
        sku: field(products.sku),
        stats: field(products.id).rightJoin(productStatsViewQuery, productStatsView.productId),
      });

      expect(
        toSqlString(
          productsWithStatsRightQuery.getSql({
            select: ["id", "sku", "stats.orderCount"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."sku" AS "sku",
          "t1_product_stats_view"."order_count" AS "stats.orderCount"
        FROM
          "products" AS "t0_products"
          RIGHT JOIN "product_stats_view" AS "t1_product_stats_view" ON "t0_products"."id" = "t1_product_stats_view"."product_id"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });

    it("should generate FULL JOIN with view", () => {
      const productsWithStatsFullQuery = createQuery(products, {
        id: field(products.id),
        sku: field(products.sku),
        stats: field(products.id).fullJoin(productStatsViewQuery, productStatsView.productId),
      });

      expect(
        toSqlString(
          productsWithStatsFullQuery.getSql({
            select: ["id", "sku", "stats.totalQuantitySold"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."sku" AS "sku",
          "t1_product_stats_view"."total_quantity_sold" AS "stats.totalQuantitySold"
        FROM
          "products" AS "t0_products"
          FULL JOIN "product_stats_view" AS "t1_product_stats_view" ON "t0_products"."id" = "t1_product_stats_view"."product_id"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });
  });

  describe("Complex View Queries", () => {
    it("should generate complex query with WHERE, ORDER, and multiple JOINs on view", () => {
      expect(
        toSqlString(
          productsWithStatsQuery.getSql({
            select: ["id", "sku", "price", "stock", "stats.totalQuantitySold", "stats.totalRevenue"],
            where: {
              _and: [
                { isPublished: { _eq: true } },
                { deletedAt: { _is: null } },
                {
                  _or: [
                    { stats: { totalQuantitySold: { _gte: 100 } } },
                    { stats: { totalRevenue: { _gte: 10000 } } },
                  ],
                },
                { price: { _gte: 10, _lte: 1000 } },
              ],
            },
            order: [
              { field: "stats.totalRevenue", direction: "desc" },
              { field: "price", direction: "asc" },
            ],
            limit: 50,
            offset: 0,
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."sku" AS "sku",
          "t0_products"."price" AS "price",
          "t0_products"."stock" AS "stock",
          "t1_product_stats_view"."total_quantity_sold" AS "stats.totalQuantitySold",
          "t1_product_stats_view"."total_revenue" AS "stats.totalRevenue"
        FROM
          "products" AS "t0_products"
          LEFT JOIN "product_stats_view" AS "t1_product_stats_view" ON "t0_products"."id" = "t1_product_stats_view"."product_id"
        WHERE
          (
            "t0_products"."is_published" = $1
            AND "t0_products"."deleted_at" IS NULL
            AND (
              "t1_product_stats_view"."total_quantity_sold" >= $2
              OR "t1_product_stats_view"."total_revenue" >= $3
            )
            AND "t0_products"."price" >= $4
            AND "t0_products"."price" <= $5
          )
        ORDER BY
          "t1_product_stats_view"."total_revenue" DESC,
          "t0_products"."price" ASC
        LIMIT
          $6
        OFFSET
          $7
        -- Params: [true,100,10000,10,1000,50,0]"
      `);
    });

    it("should generate deeply nested OR/AND with view fields", () => {
      expect(
        toSqlString(
          usersWithSummaryQuery.getSql({
            select: ["id", "email", "name", "role"],
            where: {
              _or: [
                {
                  _and: [
                    { role: { _eq: "vip" } },
                    { summary: { totalSpent: { _gte: 10000 } } },
                  ],
                },
                {
                  _and: [
                    { role: { _eq: "regular" } },
                    {
                      _or: [
                        { summary: { totalOrders: { _gte: 50 } } },
                        {
                          _and: [
                            { summary: { avgOrderValue: { _gte: 200 } } },
                            { isActive: { _eq: true } },
                          ],
                        },
                      ],
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
          "t0_users"."id" AS "id",
          "t0_users"."email" AS "email",
          "t0_users"."name" AS "name",
          "t0_users"."role" AS "role"
        FROM
          "users" AS "t0_users"
          LEFT JOIN "user_order_summary_view" AS "t1_user_order_summary_view" ON "t0_users"."id" = "t1_user_order_summary_view"."user_id"
        WHERE
          (
            (
              "t0_users"."role" = $1
              AND "t1_user_order_summary_view"."total_spent" >= $2
            )
            OR (
              "t0_users"."role" = $3
              AND (
                "t1_user_order_summary_view"."total_orders" >= $4
                OR (
                  "t1_user_order_summary_view"."avg_order_value" >= $5
                  AND "t0_users"."is_active" = $6
                )
              )
            )
          )
        LIMIT
          $7
        OFFSET
          $8
        -- Params: ["vip",10000,"regular",50,200,true,100,0]"
      `);
    });

    it("should NOT add JOIN when only base view fields are used", () => {
      expect(
        toSqlString(
          publishedWithCategoryStatsQuery.getSql({
            select: ["id", "sku", "price", "priceRange"],
            where: {
              priceRange: { _eq: "premium" },
            },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_published_products_view"."id" AS "id",
          "t0_published_products_view"."sku" AS "sku",
          "t0_published_products_view"."price" AS "price",
          "t0_published_products_view"."price_range" AS "priceRange"
        FROM
          "published_products_view" AS "t0_published_products_view"
        WHERE
          "t0_published_products_view"."price_range" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["premium",20,0]"
      `);
    });
  });

  describe("View Configuration", () => {
    it("should respect maxLimit on view query", () => {
      const limitedViewQuery = activeUsersViewQuery.maxLimit(10);

      expect(
        toSqlString(
          limitedViewQuery.getSql({
            select: ["id", "email"],
            limit: 10,
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_active_users_view"."id" AS "id",
          "t0_active_users_view"."email" AS "email"
        FROM
          "active_users_view" AS "t0_active_users_view"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [10,0]"
      `);
    });

    it("should throw when limit exceeds maxLimit on view query", () => {
      const limitedViewQuery = activeUsersViewQuery.maxLimit(10);

      expect(() =>
        limitedViewQuery.getSql({
          select: ["id", "email"],
          limit: 100,
        })
      ).toThrow("Requested limit 100 exceeds maximum allowed limit 10");
    });

    it("should apply defaultOrder on view query", () => {
      const orderedViewQuery = productStatsViewQuery.defaultOrder({
        field: "totalRevenue",
        direction: "desc",
      });

      expect(
        toSqlString(
          orderedViewQuery.getSql({
            select: ["productId", "totalRevenue"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_product_stats_view"."product_id" AS "productId",
          "t0_product_stats_view"."total_revenue" AS "totalRevenue"
        FROM
          "product_stats_view" AS "t0_product_stats_view"
        ORDER BY
          "t0_product_stats_view"."total_revenue" DESC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });

    it("should apply defaultWhere on view query", () => {
      const filteredViewQuery = categoryStatsViewQuery.defaultWhere({
        productCount: { _gte: 1 },
      });

      expect(
        toSqlString(
          filteredViewQuery.getSql({
            select: ["categoryId", "productCount"],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_category_stats_view"."category_id" AS "categoryId",
          "t0_category_stats_view"."product_count" AS "productCount"
        FROM
          "category_stats_view" AS "t0_category_stats_view"
        WHERE
          "t0_category_stats_view"."product_count" >= $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [1,20,0]"
      `);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty WHERE on view", () => {
      expect(
        toSqlString(
          activeUsersViewQuery.getSql({
            select: ["id", "email"],
            where: {},
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_active_users_view"."id" AS "id",
          "t0_active_users_view"."email" AS "email"
        FROM
          "active_users_view" AS "t0_active_users_view"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });

    it("should handle undefined values in WHERE on view", () => {
      expect(
        toSqlString(
          activeUsersViewQuery.getSql({
            select: ["id", "email", "role"],
            where: { role: undefined, email: { _containsi: "test" } },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_active_users_view"."id" AS "id",
          "t0_active_users_view"."email" AS "email",
          "t0_active_users_view"."role" AS "role"
        FROM
          "active_users_view" AS "t0_active_users_view"
        WHERE
          "t0_active_users_view"."email" ILIKE $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["%test%",20,0]"
      `);
    });

    it("should handle large IN clause on view field", () => {
      const roles = Array.from({ length: 10 }, (_, i) => `role_${i}`);

      expect(
        toSqlString(
          activeUsersViewQuery.getSql({
            select: ["id", "email", "role"],
            where: { role: { _in: roles } },
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_active_users_view"."id" AS "id",
          "t0_active_users_view"."email" AS "email",
          "t0_active_users_view"."role" AS "role"
        FROM
          "active_users_view" AS "t0_active_users_view"
        WHERE
          "t0_active_users_view"."role" IN ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        LIMIT
          $11
        OFFSET
          $12
        -- Params: ["role_0","role_1","role_2","role_3","role_4","role_5","role_6","role_7","role_8","role_9",20,0]"
      `);
    });

    it("should handle multiple aggregated fields in ORDER", () => {
      expect(
        toSqlString(
          categoryStatsViewQuery.getSql({
            select: ["categoryId", "productCount", "avgPrice", "totalStock"],
            order: [
              { field: "productCount", direction: "desc" },
              { field: "avgPrice", direction: "desc" },
              { field: "totalStock", direction: "asc" },
            ],
          })
        )
      ).toMatchInlineSnapshot(`
        "SELECT
          "t0_category_stats_view"."category_id" AS "categoryId",
          "t0_category_stats_view"."product_count" AS "productCount",
          "t0_category_stats_view"."avg_price" AS "avgPrice",
          "t0_category_stats_view"."total_stock" AS "totalStock"
        FROM
          "category_stats_view" AS "t0_category_stats_view"
        ORDER BY
          "t0_category_stats_view"."product_count" DESC,
          "t0_category_stats_view"."avg_price" DESC,
          "t0_category_stats_view"."total_stock" ASC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });
  });
});
