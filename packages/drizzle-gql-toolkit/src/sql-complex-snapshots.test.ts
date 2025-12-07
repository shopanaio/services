import { describe, it, expect } from "vitest";
import { SQL } from "drizzle-orm";
import { PgDialect, pgTable, text, integer, boolean, timestamp, uuid, numeric } from "drizzle-orm/pg-core";
import { createQueryBuilder } from "./builder.js";
import { createSchema } from "./schema.js";

// Dialect for SQL serialization
const dialect = new PgDialect();

function toSqlString(sqlObj: SQL): string {
  const query = dialect.sqlToQuery(sqlObj);
  return `SQL: ${query.sql}\nParams: ${JSON.stringify(query.params)}`;
}

// =============================================================================
// SCHEMA DEFINITIONS - 5 interconnected tables
// =============================================================================

// 1. Users table
const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Categories table
const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isVisible: boolean("is_visible").default(true),
});

// 3. Products table
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

// 4. Translations table (polymorphic - for products, categories, etc.)
const translations = pgTable("translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(), // 'product', 'category'
  entityId: uuid("entity_id").notNull(),
  locale: text("locale").notNull(),
  field: text("field").notNull(), // 'title', 'description', 'meta_title'
  value: text("value"),
  searchValue: text("search_value"), // normalized for search
});

// 5. Orders table
const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  status: text("status").default("pending"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// 6. Order Items table (junction between orders and products)
const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
});

// =============================================================================
// SCHEMA 1: Users with Orders (simple join)
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

const usersWithOrdersSchema = createSchema({
  table: users,
  tableName: "users",
  fields: {
    id: { column: "id" },
    email: { column: "email" },
    name: { column: "name" },
    role: { column: "role" },
    isActive: { column: "is_active" },
    // Join to orders - filter users by their order status
    orderStatus: {
      column: "id",
      join: {
        schema: () => ordersSchema,
        column: "userId",
        select: ["status"],
      },
    },
    orderTotal: {
      column: "id",
      join: {
        schema: () => ordersSchema,
        column: "userId",
        select: ["totalAmount"],
      },
    },
  },
});

// =============================================================================
// SCHEMA 2: Products with Translations (polymorphic join with composite key)
// =============================================================================

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
    // Title from translations with composite join (entity_id + field='title')
    title: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
        select: ["value"],
        composite: [{ field: "sku", column: "field" }], // product.sku = translations.field (hack for demo)
      },
    },
    // Search value for full-text search
    searchTitle: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
        select: ["searchValue"],
      },
    },
  },
});

// =============================================================================
// SCHEMA 3: Categories with Translations and Self-Reference
// =============================================================================

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

const categoriesWithTranslationsSchema = createSchema({
  table: categories,
  tableName: "categories",
  fields: {
    id: { column: "id" },
    slug: { column: "slug" },
    parentId: { column: "parent_id", alias: "parentId" },
    sortOrder: { column: "sort_order" },
    isVisible: { column: "is_visible", alias: "isVisible" },
    // Category name from translations
    name: {
      column: "id",
      alias: "name",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
        select: ["value"],
      },
    },
  },
});

// =============================================================================
// SCHEMA 4: Orders with User and Items (multiple joins)
// =============================================================================

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

const ordersWithUserAndItemsSchema = createSchema({
  table: orders,
  tableName: "orders",
  fields: {
    id: { column: "id" },
    status: { column: "status" },
    totalAmount: { column: "total_amount", alias: "totalAmount" },
    currency: { column: "currency" },
    createdAt: { column: "created_at" },
    // Join to user
    userEmail: {
      column: "user_id",
      join: {
        schema: () => usersSchema,
        column: "id",
        select: ["email"],
      },
    },
    userName: {
      column: "user_id",
      join: {
        schema: () => usersSchema,
        column: "id",
        select: ["name"],
      },
    },
    // Join to order items
    itemQuantity: {
      column: "id",
      join: {
        schema: () => orderItemsSchema,
        column: "orderId",
        select: ["quantity"],
      },
    },
  },
});

// =============================================================================
// SCHEMA 5: Products with Category and Translations (chain of joins)
// =============================================================================

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
    // Product title
    title: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
        select: ["value"],
      },
    },
    // Category slug (via category_id)
    categorySlug: {
      column: "category_id",
      join: {
        type: "inner",
        schema: () => categoriesSchema,
        column: "id",
        select: ["slug"],
      },
    },
    // Category visibility
    categoryVisible: {
      column: "category_id",
      join: {
        schema: () => categoriesSchema,
        column: "id",
        select: ["isVisible"],
      },
    },
  },
});

// =============================================================================
// SCHEMA 6: Nested Joins - 2 Levels (Orders -> OrderItems -> Products)
// =============================================================================

// OrderItems schema that joins to Products (for nested join testing)
const orderItemsWithProductSchema = createSchema({
  table: orderItems,
  tableName: "order_items",
  fields: {
    id: { column: "id" },
    orderId: { column: "order_id" },
    productId: { column: "product_id" },
    quantity: { column: "quantity" },
    unitPrice: { column: "unit_price" },
    // Nested join to products
    productSku: {
      column: "product_id",
      join: {
        schema: () => productsSchema,
        column: "id",
        select: ["sku"],
      },
    },
    productPrice: {
      column: "product_id",
      join: {
        schema: () => productsSchema,
        column: "id",
        select: ["price"],
      },
    },
    productPublished: {
      column: "product_id",
      join: {
        schema: () => productsSchema,
        column: "id",
        select: ["isPublished"],
      },
    },
  },
});

// Base products schema for nested joins
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

// Orders schema with nested join: Orders -> OrderItems -> Products
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
    // Direct join to user
    userEmail: {
      column: "user_id",
      join: {
        schema: () => usersSchema,
        column: "id",
        select: ["email"],
      },
    },
    // Nested join: orders -> order_items -> products (2 levels)
    items: {
      column: "id",
      join: {
        schema: () => orderItemsWithProductSchema,
        column: "orderId",
      },
    },
  },
});

// =============================================================================
// SCHEMA 7: Nested Joins - 3 Levels (Orders -> OrderItems -> Products -> Categories)
// =============================================================================

// Products schema that joins to Categories
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
    // Nested join to categories
    categorySlug: {
      column: "category_id",
      join: {
        schema: () => categoriesSchema,
        column: "id",
        select: ["slug"],
      },
    },
    categoryVisible: {
      column: "category_id",
      join: {
        schema: () => categoriesSchema,
        column: "id",
        select: ["isVisible"],
      },
    },
  },
});

// OrderItems schema that joins to Products (which joins to Categories)
const orderItemsWithProductCategorySchema = createSchema({
  table: orderItems,
  tableName: "order_items",
  fields: {
    id: { column: "id" },
    orderId: { column: "order_id" },
    productId: { column: "product_id" },
    quantity: { column: "quantity" },
    unitPrice: { column: "unit_price" },
    // Nested join to products with category
    product: {
      column: "product_id",
      join: {
        schema: () => productsWithCategorySchema,
        column: "id",
      },
    },
  },
});

// Orders schema with 3-level nested join: Orders -> OrderItems -> Products -> Categories
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
    // Nested join: orders -> order_items -> products -> categories (3 levels)
    items: {
      column: "id",
      join: {
        schema: () => orderItemsWithProductCategorySchema,
        column: "orderId",
      },
    },
  },
});

// =============================================================================
// SCHEMA 8: Nested Joins - 4 Levels (Orders -> OrderItems -> Products -> Categories -> Translations)
// =============================================================================

// Categories schema that joins to Translations
const categoriesWithTranslationsNestedSchema = createSchema({
  table: categories,
  tableName: "categories",
  fields: {
    id: { column: "id" },
    slug: { column: "slug" },
    parentId: { column: "parent_id" },
    sortOrder: { column: "sort_order" },
    isVisible: { column: "is_visible" },
    // Nested join to translations
    translatedName: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
        select: ["value"],
      },
    },
    translatedLocale: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
        select: ["locale"],
      },
    },
  },
});

// Products schema that joins to Categories (which joins to Translations)
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
    // Nested join to categories with translations
    category: {
      column: "category_id",
      join: {
        schema: () => categoriesWithTranslationsNestedSchema,
        column: "id",
      },
    },
  },
});

// OrderItems schema for 4-level nesting
const orderItemsLevel4Schema = createSchema({
  table: orderItems,
  tableName: "order_items",
  fields: {
    id: { column: "id" },
    orderId: { column: "order_id" },
    productId: { column: "product_id" },
    quantity: { column: "quantity" },
    unitPrice: { column: "unit_price" },
    // Nested join to products with category translations
    product: {
      column: "product_id",
      join: {
        schema: () => productsWithCategoryTranslationsSchema,
        column: "id",
      },
    },
  },
});

// Orders schema with 4-level nested join
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
    // Nested join: orders -> order_items -> products -> categories -> translations (4 levels)
    items: {
      column: "id",
      join: {
        schema: () => orderItemsLevel4Schema,
        column: "orderId",
      },
    },
  },
});

// =============================================================================
// TESTS
// =============================================================================

describe("Complex SQL Snapshot Tests", () => {
  describe("Schema 1: Users with Orders", () => {
    it("should filter users by order status with LEFT JOIN", () => {
      const qb = createQueryBuilder(usersWithOrdersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "email", "name", "role", "isActive", "orderStatus"],
        where: {
          orderStatus: { $eq: "completed" },
          isActive: { $eq: true },
        },
        limit: 50,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."email", "t0_users"."name", "t0_users"."role", "t0_users"."is_active", "t1_orders"."status" FROM "users" AS "t0_users" LEFT JOIN "orders" AS "t1_orders" ON "t0_users"."id" = "t1_orders"."user_id"WHERE ("t1_orders"."status" = $1 and "t0_users"."is_active" = $2) LIMIT $3 OFFSET $4
        Params: ["completed",true,50,0]"
      `);
    });

    it("should filter users by order total range", () => {
      const qb = createQueryBuilder(usersWithOrdersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "email", "name", "role", "orderTotal"],
        where: {
          $and: [
            { orderTotal: { $gte: 100 } },
            { orderTotal: { $lte: 1000 } },
            { role: { $eq: "customer" } },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."email", "t0_users"."name", "t0_users"."role", "t1_orders"."total_amount" FROM "users" AS "t0_users" LEFT JOIN "orders" AS "t1_orders" ON "t0_users"."id" = "t1_orders"."user_id"WHERE ("t1_orders"."total_amount" >= $1 and "t1_orders"."total_amount" <= $2 and "t0_users"."role" = $3) LIMIT $4 OFFSET $5
        Params: [100,1000,"customer",20,0]"
      `);
    });

    it("should combine multiple order filters with OR", () => {
      const qb = createQueryBuilder(usersWithOrdersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "email", "name", "role", "orderStatus", "orderTotal"],
        where: {
          $or: [
            { $and: [{ orderStatus: { $eq: "completed" } }, { orderTotal: { $gte: 500 } }] },
            { $and: [{ orderStatus: { $eq: "pending" } }, { role: { $eq: "vip" } }] },
          ],
        },
        limit: 100,
        offset: 50,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."email", "t0_users"."name", "t0_users"."role", "t1_orders"."status", "t1_orders"."total_amount" FROM "users" AS "t0_users" LEFT JOIN "orders" AS "t1_orders" ON "t0_users"."id" = "t1_orders"."user_id"WHERE (("t1_orders"."status" = $1 and "t1_orders"."total_amount" >= $2) or ("t1_orders"."status" = $3 and "t0_users"."role" = $4)) LIMIT $5 OFFSET $6
        Params: ["completed",500,"pending","vip",100,50]"
      `);
    });
  });

  describe("Schema 2: Products with Translations (composite join)", () => {
    it("should filter products by translated title with ILIKE", () => {
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "sku", "price", "stock", "isPublished", "title"],
        where: {
          title: { $iLike: "%smartphone%" },
          isPublished: { $eq: true },
          deletedAt: { $is: null },
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t0_products"."stock", "t0_products"."is_published", "t1_translations"."value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id" AND "t0_products"."sku" = "t1_translations"."field"WHERE ("t1_translations"."value" ILIKE $1 and "t0_products"."is_published" = $2 and "t0_products"."deleted_at" IS NULL) LIMIT $3 OFFSET $4
        Params: ["%smartphone%",true,20,0]"
      `);
    });

    it("should search products by normalized search value", () => {
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "sku", "price", "searchTitle"],
        where: {
          $or: [
            { searchTitle: { $iLike: "%iphone%" } },
            { searchTitle: { $iLike: "%apple%" } },
            { sku: { $like: "APL-%" } },
          ],
        },
        limit: 20,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t1_translations"."search_value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE ("t1_translations"."search_value" ILIKE $1 or "t1_translations"."search_value" ILIKE $2 or "t0_products"."sku" LIKE $3) LIMIT $4 OFFSET $5
        Params: ["%iphone%","%apple%","APL-%",20,0]"
      `);
    });

    it("should filter products with price range and stock check", () => {
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "sku", "price", "stock", "title"],
        where: {
          $and: [
            { price: { $gte: 99.99 } },
            { price: { $lte: 999.99 } },
            { stock: { $gt: 0 } },
            { title: { $notILike: "%refurbished%" } },
            { deletedAt: { $is: null } },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t0_products"."stock", "t1_translations"."value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id" AND "t0_products"."sku" = "t1_translations"."field"WHERE ("t0_products"."price" >= $1 and "t0_products"."price" <= $2 and "t0_products"."stock" > $3 and "t1_translations"."value" NOT ILIKE $4 and "t0_products"."deleted_at" IS NULL) LIMIT $5 OFFSET $6
        Params: [99.99,999.99,0,"%refurbished%",20,0]"
      `);
    });
  });

  describe("Schema 3: Categories with Translations", () => {
    it("should filter visible categories by translated name", () => {
      const qb = createQueryBuilder(categoriesWithTranslationsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "slug", "parentId", "isVisible", "name"],
        where: {
          name: { $iLike: "%electronics%" },
          isVisible: { $eq: true },
          parentId: { $isNot: null },
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_categories"."id", "t0_categories"."slug", "t0_categories"."parent_id" AS "parentId", "t0_categories"."is_visible" AS "isVisible", "t1_translations"."value" AS "name" FROM "categories" AS "t0_categories" LEFT JOIN "translations" AS "t1_translations" ON "t0_categories"."id" = "t1_translations"."entity_id"WHERE ("t1_translations"."value" ILIKE $1 and "t0_categories"."is_visible" = $2 and "t0_categories"."parent_id" IS NOT NULL) LIMIT $3 OFFSET $4
        Params: ["%electronics%",true,20,0]"
      `);
    });

    it("should filter root categories (no parent) with name search", () => {
      const qb = createQueryBuilder(categoriesWithTranslationsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "slug", "parentId", "isVisible", "name"],
        where: {
          $and: [
            { parentId: { $is: null } },
            { isVisible: { $eq: true } },
            {
              $or: [
                { name: { $iLike: "%home%" } },
                { name: { $iLike: "%garden%" } },
                { slug: { $in: ["featured", "bestsellers", "new-arrivals"] } },
              ],
            },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_categories"."id", "t0_categories"."slug", "t0_categories"."parent_id" AS "parentId", "t0_categories"."is_visible" AS "isVisible", "t1_translations"."value" AS "name" FROM "categories" AS "t0_categories" LEFT JOIN "translations" AS "t1_translations" ON "t0_categories"."id" = "t1_translations"."entity_id"WHERE ("t0_categories"."parent_id" IS NULL and "t0_categories"."is_visible" = $1 and ("t1_translations"."value" ILIKE $2 or "t1_translations"."value" ILIKE $3 or "t0_categories"."slug" IN ($4, $5, $6))) LIMIT $7 OFFSET $8
        Params: [true,"%home%","%garden%","featured","bestsellers","new-arrivals",20,0]"
      `);
    });
  });

  describe("Schema 4: Orders with User and Items (multiple joins)", () => {
    it("should filter orders by user email and item quantity", () => {
      const qb = createQueryBuilder(ordersWithUserAndItemsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency", "userEmail", "itemQuantity"],
        where: {
          userEmail: { $iLike: "%@gmail.com" },
          itemQuantity: { $gte: 5 },
          status: { $in: ["pending", "processing", "shipped"] },
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount" AS "totalAmount", "t0_orders"."currency", "t1_users"."email", "t1_order_items"."quantity" FROM "orders" AS "t0_orders" LEFT JOIN "users" AS "t1_users" ON "t0_orders"."user_id" = "t1_users"."id" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"WHERE ("t1_users"."email" ILIKE $1 and "t1_order_items"."quantity" >= $2 and "t0_orders"."status" IN ($3, $4, $5)) LIMIT $6 OFFSET $7
        Params: ["%@gmail.com",5,"pending","processing","shipped",20,0]"
      `);
    });

    it("should filter high-value orders with user name search", () => {
      const qb = createQueryBuilder(ordersWithUserAndItemsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency", "userName", "userEmail"],
        where: {
          $and: [
            { totalAmount: { $gte: 1000 } },
            { currency: { $eq: "USD" } },
            {
              $or: [
                { userName: { $iLike: "%john%" } },
                { userEmail: { $like: "vip-%" } },
              ],
            },
            { status: { $neq: "cancelled" } },
          ],
        },
        limit: 25,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount" AS "totalAmount", "t0_orders"."currency", "t1_users"."name", "t1_users"."email" FROM "orders" AS "t0_orders" LEFT JOIN "users" AS "t1_users" ON "t0_orders"."user_id" = "t1_users"."id"WHERE ("t0_orders"."total_amount" >= $1 and "t0_orders"."currency" = $2 and ("t1_users"."name" ILIKE $3 or "t1_users"."email" LIKE $4) and "t0_orders"."status" <> $5) LIMIT $6 OFFSET $7
        Params: [1000,"USD","%john%","vip-%","cancelled",25,0]"
      `);
    });

    it("should build monster query with deeply nested conditions", () => {
      const qb = createQueryBuilder(ordersWithUserAndItemsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency", "userName", "userEmail", "itemQuantity"],
        where: {
          $or: [
            {
              $and: [
                { status: { $eq: "completed" } },
                { totalAmount: { $gte: 500 } },
                {
                  $or: [
                    { userName: { $iLike: "%premium%" } },
                    { userEmail: { $iLike: "%enterprise%" } },
                  ],
                },
              ],
            },
            {
              $and: [
                { status: { $in: ["pending", "processing"] } },
                { itemQuantity: { $gte: 10 } },
                { currency: { $in: ["USD", "EUR", "GBP"] } },
              ],
            },
            {
              $and: [
                { totalAmount: { $gte: 10000 } },
                { status: { $notIn: ["cancelled", "refunded"] } },
              ],
            },
          ],
        },
        limit: 100,
        offset: 200,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount" AS "totalAmount", "t0_orders"."currency", "t1_users"."name", "t1_users"."email", "t1_order_items"."quantity" FROM "orders" AS "t0_orders" LEFT JOIN "users" AS "t1_users" ON "t0_orders"."user_id" = "t1_users"."id" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"WHERE (("t0_orders"."status" = $1 and "t0_orders"."total_amount" >= $2 and ("t1_users"."name" ILIKE $3 or "t1_users"."email" ILIKE $4)) or ("t0_orders"."status" IN ($5, $6) and "t1_order_items"."quantity" >= $7 and "t0_orders"."currency" IN ($8, $9, $10)) or ("t0_orders"."total_amount" >= $11 and "t0_orders"."status" NOT IN ($12, $13))) LIMIT $14 OFFSET $15
        Params: ["completed",500,"%premium%","%enterprise%","pending","processing",10,"USD","EUR","GBP",10000,"cancelled","refunded",100,200]"
      `);
    });
  });

  describe("Schema 5: Products Full (chain of joins)", () => {
    it("should filter products by category slug with INNER JOIN", () => {
      const qb = createQueryBuilder(productsFullSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "sku", "price", "stock", "isPublished", "categorySlug"],
        where: {
          categorySlug: { $in: ["electronics", "computers", "phones"] },
          isPublished: { $eq: true },
          deletedAt: { $is: null },
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t0_products"."stock", "t0_products"."is_published", "t1_categories"."slug" FROM "products" AS "t0_products" INNER JOIN "categories" AS "t1_categories" ON "t0_products"."category_id" = "t1_categories"."id"WHERE ("t1_categories"."slug" IN ($1, $2, $3) and "t0_products"."is_published" = $4 and "t0_products"."deleted_at" IS NULL) LIMIT $5 OFFSET $6
        Params: ["electronics","computers","phones",true,20,0]"
      `);
    });

    it("should filter products in visible categories with title search", () => {
      const qb = createQueryBuilder(productsFullSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "sku", "price", "stock", "isPublished", "title", "categoryVisible"],
        where: {
          $and: [
            { categoryVisible: { $eq: true } },
            { title: { $iLike: "%gaming%" } },
            { price: { $gte: 100 } },
            { price: { $lte: 2000 } },
            { stock: { $gt: 0 } },
            { isPublished: { $eq: true } },
            { deletedAt: { $is: null } },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t0_products"."stock", "t0_products"."is_published", "t1_translations"."value", "t1_categories"."is_visible" FROM "products" AS "t0_products" LEFT JOIN "categories" AS "t1_categories" ON "t0_products"."category_id" = "t1_categories"."id" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE ("t1_categories"."is_visible" = $1 and "t1_translations"."value" ILIKE $2 and "t0_products"."price" >= $3 and "t0_products"."price" <= $4 and "t0_products"."stock" > $5 and "t0_products"."is_published" = $6 and "t0_products"."deleted_at" IS NULL) LIMIT $7 OFFSET $8
        Params: [true,"%gaming%",100,2000,0,true,20,0]"
      `);
    });

    it("should build complex product search with category and title filters", () => {
      const qb = createQueryBuilder(productsFullSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "sku", "price", "stock", "isPublished", "title", "categorySlug"],
        where: {
          $and: [
            { deletedAt: { $is: null } },
            { isPublished: { $eq: true } },
            {
              $or: [
                {
                  $and: [
                    { categorySlug: { $eq: "laptops" } },
                    { price: { $gte: 500 } },
                    { title: { $iLike: "%pro%" } },
                  ],
                },
                {
                  $and: [
                    { categorySlug: { $eq: "phones" } },
                    { price: { $lte: 1000 } },
                    { title: { $notILike: "%refurbished%" } },
                  ],
                },
                {
                  $and: [
                    { categorySlug: { $in: ["accessories", "peripherals"] } },
                    { stock: { $gte: 10 } },
                  ],
                },
              ],
            },
          ],
        },
        limit: 50,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t0_products"."stock", "t0_products"."is_published", "t1_translations"."value", "t1_categories"."slug" FROM "products" AS "t0_products" INNER JOIN "categories" AS "t1_categories" ON "t0_products"."category_id" = "t1_categories"."id" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE ("t0_products"."deleted_at" IS NULL and "t0_products"."is_published" = $1 and (("t1_categories"."slug" = $2 and "t0_products"."price" >= $3 and "t1_translations"."value" ILIKE $4) or ("t1_categories"."slug" = $5 and "t0_products"."price" <= $6 and "t1_translations"."value" NOT ILIKE $7) or ("t1_categories"."slug" IN ($8, $9) and "t0_products"."stock" >= $10))) LIMIT $11 OFFSET $12
        Params: [true,"laptops",500,"%pro%","phones",1000,"%refurbished%","accessories","peripherals",10,50,0]"
      `);
    });

    it("should handle all operator types in single query", () => {
      const qb = createQueryBuilder(productsFullSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "sku", "price", "stock", "isPublished", "title", "categorySlug", "categoryVisible"],
        where: {
          // Direct equality
          isPublished: true,
          // Null checks
          deletedAt: { $is: null },
          // Comparison operators
          price: { $gte: 10, $lte: 10000 },
          stock: { $gt: 0 },
          // String operators
          sku: { $like: "PRD-%" },
          title: { $iLike: "%search term%" },
          // NOT operators
          categorySlug: { $notIn: ["archived", "hidden", "test"] },
          // Array operators
          categoryVisible: { $eq: true },
        },
        limit: 100,
        offset: 0,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t0_products"."stock", "t0_products"."is_published", "t1_translations"."value", "t1_categories"."slug", "t1_categories"."is_visible" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id" INNER JOIN "categories" AS "t1_categories" ON "t0_products"."category_id" = "t1_categories"."id"WHERE ("t0_products"."is_published" = $1 and "t0_products"."deleted_at" IS NULL and "t0_products"."price" >= $2 and "t0_products"."price" <= $3 and "t0_products"."stock" > $4 and "t0_products"."sku" LIKE $5 and "t1_translations"."value" ILIKE $6 and "t1_categories"."slug" NOT IN ($7, $8, $9) and "t1_categories"."is_visible" = $10) LIMIT $11 OFFSET $12
        Params: [true,10,10000,0,"PRD-%","%search term%","archived","hidden","test",true,100,0]"
      `);
    });
  });

  describe("Edge Cases and Stress Tests", () => {
    it("should handle 10+ conditions with mixed operators", () => {
      const qb = createQueryBuilder(productsFullSchema);
      const sqlObj = qb.buildSelectSql({
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
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."price", "t0_products"."stock", "t0_products"."is_published", "t1_translations"."value", "t1_categories"."slug", "t1_categories"."is_visible" FROM "products" AS "t0_products" INNER JOIN "categories" AS "t1_categories" ON "t0_products"."category_id" = "t1_categories"."id" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE ("t0_products"."id" <> $1 and "t0_products"."sku" LIKE $2 and "t0_products"."sku" NOT LIKE $3 and "t0_products"."price" > $4 and "t0_products"."price" < $5 and "t0_products"."stock" >= $6 and "t0_products"."stock" <= $7 and "t0_products"."is_published" = $8 and "t0_products"."deleted_at" IS NULL and "t1_categories"."slug" IN ($9, $10, $11, $12, $13) and "t1_categories"."is_visible" IS NOT NULL and "t1_translations"."value" ILIKE $14) LIMIT $15 OFFSET $16
        Params: ["00000000-0000-0000-0000-000000000000","%","TEST-%",0,999999,0,10000,true,"a","b","c","d","e","%keyword%",20,0]"
      `);
    });

    it("should handle deeply nested OR with AND branches (4 levels)", () => {
      const qb = createQueryBuilder(usersWithOrdersSchema);
      const sqlObj = qb.buildSelectSql({
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
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."email", "t0_users"."name", "t0_users"."role", "t0_users"."is_active", "t1_orders"."status", "t1_orders"."total_amount" FROM "users" AS "t0_users" LEFT JOIN "orders" AS "t1_orders" ON "t0_users"."id" = "t1_orders"."user_id"WHERE (("t0_users"."role" = $1 and ("t0_users"."email" ILIKE $2 or "t0_users"."email" ILIKE $3)) or ("t0_users"."role" = $4 and (("t1_orders"."status" = $5 and "t1_orders"."total_amount" >= $6) or ("t0_users"."is_active" = $7 and "t0_users"."name" IS NOT NULL)))) LIMIT $8 OFFSET $9
        Params: ["admin","%@company.com","%@corp.com","manager","completed",1000,true,20,0]"
      `);
    });

    it("should handle large IN clause", () => {
      const qb = createQueryBuilder(productsFullSchema);
      const skus = Array.from({ length: 20 }, (_, i) => `SKU-${String(i).padStart(4, "0")}`);

      const sqlObj = qb.buildSelectSql({
        select: ["id", "sku", "isPublished"],
        where: {
          sku: { $in: skus },
          isPublished: { $eq: true },
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."is_published" FROM "products" AS "t0_products" WHERE ("t0_products"."sku" IN ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) and "t0_products"."is_published" = $21) LIMIT $22 OFFSET $23
        Params: ["SKU-0000","SKU-0001","SKU-0002","SKU-0003","SKU-0004","SKU-0005","SKU-0006","SKU-0007","SKU-0008","SKU-0009","SKU-0010","SKU-0011","SKU-0012","SKU-0013","SKU-0014","SKU-0015","SKU-0016","SKU-0017","SKU-0018","SKU-0019",true,20,0]"
      `);
    });

    it("should handle query with maximum pagination", () => {
      const qb = createQueryBuilder(productsFullSchema, { maxLimit: 1000 });
      const sqlObj = qb.buildSelectSql({
        select: ["id", "sku", "isPublished"],
        where: {
          isPublished: { $eq: true },
        },
        limit: 1000,
        offset: 99000,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."sku", "t0_products"."is_published" FROM "products" AS "t0_products" WHERE "t0_products"."is_published" = $1 LIMIT $2 OFFSET $3
        Params: [true,1000,99000]"
      `);
    });
  });

  // ===========================================================================
  // NESTED JOIN TESTS - 2, 3, 4 LEVELS DEEP (t2, t3, t4 tables)
  // ===========================================================================

  describe("Schema 6: Nested Joins - 2 Levels (t0 -> t1 -> t2)", () => {
    it("should filter orders by nested product SKU (orders -> order_items -> products)", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          status: { $eq: "pending" },
          items: {
            productSku: { $like: "PHONE-%" },
          },
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"WHERE ("t0_orders"."status" = $1 and "t2_products"."sku" LIKE $2) LIMIT $3 OFFSET $4
        Params: ["pending","PHONE-%",20,0]"
      `);
    });

    it("should filter orders by nested product price range", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount"],
        where: {
          $and: [
            { totalAmount: { $gte: 100 } },
            { items: { productPrice: { $gte: 50 } } },
            { items: { productPrice: { $lte: 500 } } },
            { items: { productPublished: { $eq: true } } },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"WHERE ("t0_orders"."total_amount" >= $1 and "t2_products"."price" >= $2 and "t2_products"."price" <= $3 and "t2_products"."is_published" = $4) LIMIT $5 OFFSET $6
        Params: [100,50,500,true,20,0]"
      `);
    });

    it("should combine direct join and nested join conditions", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
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
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t1_users"."email" FROM "orders" AS "t0_orders" LEFT JOIN "users" AS "t1_users" ON "t0_orders"."user_id" = "t1_users"."id" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"WHERE ("t1_users"."email" ILIKE $1 and "t0_orders"."status" IN ($2, $3) and ("t2_products"."sku" LIKE $4 or "t2_products"."sku" LIKE $5)) LIMIT $6 OFFSET $7
        Params: ["%@company.com","pending","processing","LAPTOP-%","PHONE-%",50,0]"
      `);
    });

    it("should handle complex nested conditions with multiple t2 fields", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          $or: [
            {
              $and: [
                { status: { $eq: "completed" } },
                { items: { productSku: { $iLike: "%premium%" } } },
                { items: { productPrice: { $gte: 1000 } } },
              ],
            },
            {
              $and: [
                { status: { $eq: "pending" } },
                { items: { productPublished: { $eq: true } } },
                { currency: { $eq: "USD" } },
              ],
            },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"WHERE (("t0_orders"."status" = $1 and "t2_products"."sku" ILIKE $2 and "t2_products"."price" >= $3) or ("t0_orders"."status" = $4 and "t2_products"."is_published" = $5 and "t0_orders"."currency" = $6)) LIMIT $7 OFFSET $8
        Params: ["completed","%premium%",1000,"pending",true,"USD",20,0]"
      `);
    });
  });

  describe("Schema 7: Nested Joins - 3 Levels (t0 -> t1 -> t2 -> t3)", () => {
    it("should filter orders by category slug at 3rd level", () => {
      const qb = createQueryBuilder(ordersNestedLevel3Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          status: { $eq: "completed" },
          items: {
            product: {
              categorySlug: { $in: ["electronics", "computers"] },
            },
          },
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE ("t0_orders"."status" = $1 and "t3_categories"."slug" IN ($2, $3)) LIMIT $4 OFFSET $5
        Params: ["completed","electronics","computers",20,0]"
      `);
    });

    it("should filter orders by visible categories at t3 level", () => {
      const qb = createQueryBuilder(ordersNestedLevel3Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount"],
        where: {
          $and: [
            { totalAmount: { $gte: 500 } },
            { items: { product: { categoryVisible: { $eq: true } } } },
            { items: { product: { categorySlug: { $notIn: ["hidden", "archived"] } } } },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE ("t0_orders"."total_amount" >= $1 and "t3_categories"."is_visible" = $2 and "t3_categories"."slug" NOT IN ($3, $4)) LIMIT $5 OFFSET $6
        Params: [500,true,"hidden","archived",20,0]"
      `);
    });

    it("should combine t1, t2, t3 conditions with OR", () => {
      const qb = createQueryBuilder(ordersNestedLevel3Schema);
      const sqlObj = qb.buildSelectSql({
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
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE (("t0_orders"."status" = $1 and "t1_order_items"."quantity" >= $2) or ("t2_products"."sku" LIKE $3 and "t2_products"."price" >= $4) or ("t3_categories"."slug" = $5 and "t3_categories"."is_visible" = $6)) LIMIT $7 OFFSET $8
        Params: ["processing",5,"VIP-%",1000,"premium",true,100,0]"
      `);
    });

    it("should handle deeply nested conditions across all 3 levels", () => {
      const qb = createQueryBuilder(ordersNestedLevel3Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          $and: [
            { status: { $neq: "cancelled" } },
            { currency: { $in: ["USD", "EUR"] } },
            {
              $or: [
                {
                  $and: [
                    { items: { quantity: { $gte: 10 } } },
                    { items: { unitPrice: { $lte: 100 } } },
                    { items: { product: { stock: { $gt: 0 } } } },
                  ],
                },
                {
                  $and: [
                    { items: { product: { isPublished: { $eq: true } } } },
                    { items: { product: { categorySlug: { $iLike: "%sale%" } } } },
                  ],
                },
              ],
            },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE ("t0_orders"."status" <> $1 and "t0_orders"."currency" IN ($2, $3) and (("t1_order_items"."quantity" >= $4 and "t1_order_items"."unit_price" <= $5 and "t2_products"."stock" > $6) or ("t2_products"."is_published" = $7 and "t3_categories"."slug" ILIKE $8))) LIMIT $9 OFFSET $10
        Params: ["cancelled","USD","EUR",10,100,0,true,"%sale%",20,0]"
      `);
    });
  });

  describe("Schema 8: Nested Joins - 4 Levels (t0 -> t1 -> t2 -> t3 -> t4)", () => {
    it("should filter orders by category translation at 4th level", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema);
      const sqlObj = qb.buildSelectSql({
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
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t0_orders"."status" = $1 and "t4_translations"."value" ILIKE $2) LIMIT $3 OFFSET $4
        Params: ["completed","%Electronics%",20,0]"
      `);
    });

    it("should filter by translation locale at t4 level", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount"],
        where: {
          $and: [
            { items: { product: { category: { translatedLocale: { $eq: "en" } } } } },
            { items: { product: { category: { translatedName: { $notILike: "%test%" } } } } },
            { items: { product: { category: { isVisible: { $eq: true } } } } },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t4_translations"."locale" = $1 and "t4_translations"."value" NOT ILIKE $2 and "t3_categories"."is_visible" = $3) LIMIT $4 OFFSET $5
        Params: ["en","%test%",true,20,0]"
      `);
    });

    it("should combine all 4 levels with complex conditions", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          $or: [
            {
              $and: [
                { status: { $eq: "completed" } },
                { totalAmount: { $gte: 1000 } },
                { items: { quantity: { $gte: 2 } } },
                { items: { product: { price: { $gte: 100 } } } },
                { items: { product: { category: { slug: { $eq: "premium" } } } } },
                { items: { product: { category: { translatedName: { $iLike: "%luxury%" } } } } },
              ],
            },
            {
              $and: [
                { status: { $in: ["pending", "processing"] } },
                { items: { product: { category: { isVisible: { $eq: true } } } } },
                { items: { product: { category: { translatedLocale: { $in: ["en", "de", "fr"] } } } } },
              ],
            },
          ],
        },
        limit: 50,
        offset: 100,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE (("t0_orders"."status" = $1 and "t0_orders"."total_amount" >= $2 and "t1_order_items"."quantity" >= $3 and "t2_products"."price" >= $4 and "t3_categories"."slug" = $5 and "t4_translations"."value" ILIKE $6) or ("t0_orders"."status" IN ($7, $8) and "t3_categories"."is_visible" = $9 and "t4_translations"."locale" IN ($10, $11, $12))) LIMIT $13 OFFSET $14
        Params: ["completed",1000,2,100,"premium","%luxury%","pending","processing",true,"en","de","fr",50,100]"
      `);
    });

    it("should handle monster query with conditions on all tables t0-t4", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          $and: [
            // t0: orders conditions
            { id: { $neq: "00000000-0000-0000-0000-000000000000" } },
            { status: { $notIn: ["cancelled", "refunded"] } },
            { currency: { $eq: "USD" } },
            { totalAmount: { $gte: 100 } },
            // t1: order_items conditions
            { items: { quantity: { $gte: 1 } } },
            { items: { unitPrice: { $gt: 0 } } },
            // t2: products conditions
            { items: { product: { sku: { $notLike: "TEST-%" } } } },
            { items: { product: { isPublished: { $eq: true } } } },
            { items: { product: { deletedAt: { $is: null } } } },
            // t3: categories conditions
            { items: { product: { category: { isVisible: { $eq: true } } } } },
            { items: { product: { category: { slug: { $notIn: ["hidden", "draft"] } } } } },
            // t4: translations conditions
            { items: { product: { category: { translatedLocale: { $eq: "en" } } } } },
            { items: { product: { category: { translatedName: { $isNot: null } } } } },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t0_orders"."id" <> $1 and "t0_orders"."status" NOT IN ($2, $3) and "t0_orders"."currency" = $4 and "t0_orders"."total_amount" >= $5 and "t1_order_items"."quantity" >= $6 and "t1_order_items"."unit_price" > $7 and "t2_products"."sku" NOT LIKE $8 and "t2_products"."is_published" = $9 and "t2_products"."deleted_at" IS NULL and "t3_categories"."is_visible" = $10 and "t3_categories"."slug" NOT IN ($11, $12) and "t4_translations"."locale" = $13 and "t4_translations"."value" IS NOT NULL) LIMIT $14 OFFSET $15
        Params: ["00000000-0000-0000-0000-000000000000","cancelled","refunded","USD",100,1,0,"TEST-%",true,true,"hidden","draft","en",20,0]"
      `);
    });

    it("should handle deeply nested OR branches across 4 levels", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          $or: [
            // Branch 1: High-value completed orders with premium products
            {
              $and: [
                { status: { $eq: "completed" } },
                { totalAmount: { $gte: 5000 } },
                {
                  $or: [
                    { items: { product: { category: { translatedName: { $iLike: "%premium%" } } } } },
                    { items: { product: { category: { translatedName: { $iLike: "%luxury%" } } } } },
                  ],
                },
              ],
            },
            // Branch 2: Pending orders with visible categories in specific locales
            {
              $and: [
                { status: { $eq: "pending" } },
                { items: { product: { category: { isVisible: { $eq: true } } } } },
                {
                  $or: [
                    { items: { product: { category: { translatedLocale: { $eq: "en" } } } } },
                    { items: { product: { category: { translatedLocale: { $eq: "de" } } } } },
                  ],
                },
              ],
            },
            // Branch 3: Orders with specific category slugs regardless of status
            {
              $and: [
                { items: { product: { category: { slug: { $in: ["featured", "bestseller"] } } } } },
                { items: { product: { category: { translatedName: { $notILike: "%test%" } } } } },
              ],
            },
          ],
        },
        limit: 200,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE (("t0_orders"."status" = $1 and "t0_orders"."total_amount" >= $2 and ("t4_translations"."value" ILIKE $3 or "t4_translations"."value" ILIKE $4)) or ("t0_orders"."status" = $5 and "t3_categories"."is_visible" = $6 and ("t4_translations"."locale" = $7 or "t4_translations"."locale" = $8)) or ("t3_categories"."slug" IN ($9, $10) and "t4_translations"."value" NOT ILIKE $11)) LIMIT $12 OFFSET $13
        Params: ["completed",5000,"%premium%","%luxury%","pending",true,"en","de","featured","bestseller","%test%",100,0]"
      `);
    });

    it("should handle ULTRA complex query with 5-level nested $and/$or across all t0-t4 tables", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema, { maxLimit: 500 });
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          $and: [
            // === TOP LEVEL FILTERS (t0: orders) ===
            { id: { $neq: "00000000-0000-0000-0000-000000000000" } },
            { status: { $notIn: ["cancelled", "refunded", "failed"] } },
            { currency: { $in: ["USD", "EUR", "GBP", "JPY"] } },
            { totalAmount: { $gte: 50 } },
            { totalAmount: { $lte: 100000 } },

            // === MEGA OR BRANCH ===
            {
              $or: [
                // ─────────────────────────────────────────────────────────────
                // BRANCH A: High-value completed orders with premium electronics
                // ─────────────────────────────────────────────────────────────
                {
                  $and: [
                    { status: { $eq: "completed" } },
                    { totalAmount: { $gte: 5000 } },
                    // t1: order_items
                    { items: { quantity: { $gte: 1 } } },
                    { items: { unitPrice: { $gte: 100 } } },
                    // t2: products
                    { items: { product: { isPublished: { $eq: true } } } },
                    { items: { product: { deletedAt: { $is: null } } } },
                    { items: { product: { stock: { $gt: 0 } } } },
                    {
                      $or: [
                        { items: { product: { sku: { $like: "ELEC-%" } } } },
                        { items: { product: { sku: { $like: "COMP-%" } } } },
                        { items: { product: { sku: { $like: "PHONE-%" } } } },
                      ],
                    },
                    // t3: categories
                    { items: { product: { category: { isVisible: { $eq: true } } } } },
                    {
                      $or: [
                        { items: { product: { category: { slug: { $eq: "electronics" } } } } },
                        { items: { product: { category: { slug: { $eq: "computers" } } } } },
                        { items: { product: { category: { slug: { $eq: "smartphones" } } } } },
                      ],
                    },
                    // t4: translations - multilingual premium search
                    {
                      $or: [
                        {
                          $and: [
                            { items: { product: { category: { translatedLocale: { $eq: "en" } } } } },
                            {
                              $or: [
                                { items: { product: { category: { translatedName: { $iLike: "%premium%" } } } } },
                                { items: { product: { category: { translatedName: { $iLike: "%professional%" } } } } },
                                { items: { product: { category: { translatedName: { $iLike: "%enterprise%" } } } } },
                              ],
                            },
                          ],
                        },
                        {
                          $and: [
                            { items: { product: { category: { translatedLocale: { $eq: "de" } } } } },
                            { items: { product: { category: { translatedName: { $iLike: "%profi%" } } } } },
                          ],
                        },
                        {
                          $and: [
                            { items: { product: { category: { translatedLocale: { $eq: "fr" } } } } },
                            { items: { product: { category: { translatedName: { $iLike: "%professionnel%" } } } } },
                          ],
                        },
                      ],
                    },
                  ],
                },

                // ─────────────────────────────────────────────────────────────
                // BRANCH B: Pending/processing orders with sale items
                // ─────────────────────────────────────────────────────────────
                {
                  $and: [
                    { status: { $in: ["pending", "processing"] } },
                    { totalAmount: { $gte: 100 } },
                    { totalAmount: { $lte: 2000 } },
                    // t1: bulk orders
                    { items: { quantity: { $gte: 3 } } },
                    // t2: products on sale
                    { items: { product: { price: { $lte: 500 } } } },
                    { items: { product: { isPublished: { $eq: true } } } },
                    { items: { product: { sku: { $notLike: "TEST-%" } } } },
                    { items: { product: { sku: { $notLike: "SAMPLE-%" } } } },
                    // t3: visible non-archived categories
                    { items: { product: { category: { isVisible: { $eq: true } } } } },
                    { items: { product: { category: { slug: { $notIn: ["archived", "hidden", "draft", "test"] } } } } },
                    // t4: search in any locale
                    { items: { product: { category: { translatedName: { $isNot: null } } } } },
                    {
                      $or: [
                        { items: { product: { category: { translatedName: { $iLike: "%sale%" } } } } },
                        { items: { product: { category: { translatedName: { $iLike: "%discount%" } } } } },
                        { items: { product: { category: { translatedName: { $iLike: "%offer%" } } } } },
                        { items: { product: { category: { translatedName: { $iLike: "%deal%" } } } } },
                      ],
                    },
                  ],
                },

                // ─────────────────────────────────────────────────────────────
                // BRANCH C: VIP orders (any status) with luxury products
                // ─────────────────────────────────────────────────────────────
                {
                  $and: [
                    { totalAmount: { $gte: 10000 } },
                    // t1: high-value items
                    { items: { unitPrice: { $gte: 500 } } },
                    // t2: luxury products
                    { items: { product: { price: { $gte: 1000 } } } },
                    {
                      $or: [
                        { items: { product: { sku: { $like: "LUX-%" } } } },
                        { items: { product: { sku: { $like: "PREM-%" } } } },
                        { items: { product: { sku: { $like: "VIP-%" } } } },
                        { items: { product: { sku: { $like: "GOLD-%" } } } },
                      ],
                    },
                    // t3: luxury categories
                    { items: { product: { category: { slug: { $in: ["luxury", "premium", "exclusive", "limited-edition"] } } } } },
                    // t4: luxury translations
                    { items: { product: { category: { translatedLocale: { $in: ["en", "fr", "it", "jp"] } } } } },
                    {
                      $or: [
                        { items: { product: { category: { translatedName: { $iLike: "%luxury%" } } } } },
                        { items: { product: { category: { translatedName: { $iLike: "%exclusive%" } } } } },
                        { items: { product: { category: { translatedName: { $iLike: "%limited%" } } } } },
                        { items: { product: { category: { translatedName: { $iLike: "%collector%" } } } } },
                        { items: { product: { category: { translatedName: { $iLike: "%luxe%" } } } } },
                        { items: { product: { category: { translatedName: { $iLike: "%prestige%" } } } } },
                      ],
                    },
                  ],
                },

                // ─────────────────────────────────────────────────────────────
                // BRANCH D: New arrivals (shipped recently)
                // ─────────────────────────────────────────────────────────────
                {
                  $and: [
                    { status: { $eq: "shipped" } },
                    // t1: recent items
                    { items: { quantity: { $lte: 5 } } },
                    // t2: new products
                    { items: { product: { stock: { $gte: 10 } } } },
                    { items: { product: { isPublished: { $eq: true } } } },
                    { items: { product: { deletedAt: { $is: null } } } },
                    // t3: featured categories
                    { items: { product: { category: { slug: { $in: ["new-arrivals", "just-in", "trending", "featured"] } } } } },
                    { items: { product: { category: { isVisible: { $eq: true } } } } },
                    // t4: check translations exist
                    { items: { product: { category: { translatedName: { $notILike: "%coming soon%" } } } } },
                    { items: { product: { category: { translatedLocale: { $neq: "test" } } } } },
                  ],
                },
              ],
            },

            // === FINAL EXCLUSIONS (applied to all branches) ===
            { items: { product: { category: { translatedName: { $notILike: "%deprecated%" } } } } },
            { items: { product: { category: { slug: { $neq: "discontinued" } } } } },
          ],
        },
        limit: 500,
        offset: 0,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t0_orders"."id" <> $1 and "t0_orders"."status" NOT IN ($2, $3, $4) and "t0_orders"."currency" IN ($5, $6, $7, $8) and "t0_orders"."total_amount" >= $9 and "t0_orders"."total_amount" <= $10 and (("t0_orders"."status" = $11 and "t0_orders"."total_amount" >= $12 and "t1_order_items"."quantity" >= $13 and "t1_order_items"."unit_price" >= $14 and "t2_products"."is_published" = $15 and "t2_products"."deleted_at" IS NULL and "t2_products"."stock" > $16 and ("t2_products"."sku" LIKE $17 or "t2_products"."sku" LIKE $18 or "t2_products"."sku" LIKE $19) and "t3_categories"."is_visible" = $20 and ("t3_categories"."slug" = $21 or "t3_categories"."slug" = $22 or "t3_categories"."slug" = $23) and (("t4_translations"."locale" = $24 and ("t4_translations"."value" ILIKE $25 or "t4_translations"."value" ILIKE $26 or "t4_translations"."value" ILIKE $27)) or ("t4_translations"."locale" = $28 and "t4_translations"."value" ILIKE $29) or ("t4_translations"."locale" = $30 and "t4_translations"."value" ILIKE $31))) or ("t0_orders"."status" IN ($32, $33) and "t0_orders"."total_amount" >= $34 and "t0_orders"."total_amount" <= $35 and "t1_order_items"."quantity" >= $36 and "t2_products"."price" <= $37 and "t2_products"."is_published" = $38 and "t2_products"."sku" NOT LIKE $39 and "t2_products"."sku" NOT LIKE $40 and "t3_categories"."is_visible" = $41 and "t3_categories"."slug" NOT IN ($42, $43, $44, $45) and "t4_translations"."value" IS NOT NULL and ("t4_translations"."value" ILIKE $46 or "t4_translations"."value" ILIKE $47 or "t4_translations"."value" ILIKE $48 or "t4_translations"."value" ILIKE $49)) or ("t0_orders"."total_amount" >= $50 and "t1_order_items"."unit_price" >= $51 and "t2_products"."price" >= $52 and ("t2_products"."sku" LIKE $53 or "t2_products"."sku" LIKE $54 or "t2_products"."sku" LIKE $55 or "t2_products"."sku" LIKE $56) and "t3_categories"."slug" IN ($57, $58, $59, $60) and "t4_translations"."locale" IN ($61, $62, $63, $64) and ("t4_translations"."value" ILIKE $65 or "t4_translations"."value" ILIKE $66 or "t4_translations"."value" ILIKE $67 or "t4_translations"."value" ILIKE $68 or "t4_translations"."value" ILIKE $69 or "t4_translations"."value" ILIKE $70)) or ("t0_orders"."status" = $71 and "t1_order_items"."quantity" <= $72 and "t2_products"."stock" >= $73 and "t2_products"."is_published" = $74 and "t2_products"."deleted_at" IS NULL and "t3_categories"."slug" IN ($75, $76, $77, $78) and "t3_categories"."is_visible" = $79 and "t4_translations"."value" NOT ILIKE $80 and "t4_translations"."locale" <> $81)) and "t4_translations"."value" NOT ILIKE $82 and "t3_categories"."slug" <> $83) LIMIT $84 OFFSET $85
        Params: ["00000000-0000-0000-0000-000000000000","cancelled","refunded","failed","USD","EUR","GBP","JPY",50,100000,"completed",5000,1,100,true,0,"ELEC-%","COMP-%","PHONE-%",true,"electronics","computers","smartphones","en","%premium%","%professional%","%enterprise%","de","%profi%","fr","%professionnel%","pending","processing",100,2000,3,500,true,"TEST-%","SAMPLE-%",true,"archived","hidden","draft","test","%sale%","%discount%","%offer%","%deal%",10000,500,1000,"LUX-%","PREM-%","VIP-%","GOLD-%","luxury","premium","exclusive","limited-edition","en","fr","it","jp","%luxury%","%exclusive%","%limited%","%collector%","%luxe%","%prestige%","shipped",5,10,true,"new-arrivals","just-in","trending","featured",true,"%coming soon%","test","%deprecated%","discontinued",500,0]"
      `);
    });
  });

  // ===========================================================================
  // ORDER BY TESTS - with nested fields across t0-t4 tables
  // ===========================================================================

  describe("ORDER BY with nested joins", () => {
    it("should order by main table field (t0)", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "currency"],
        where: {
          status: { $eq: "completed" },
        },
        order: ["totalAmount:desc"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency" FROM "orders" AS "t0_orders" WHERE "t0_orders"."status" = $1 ORDER BY "t0_orders"."total_amount" DESC LIMIT $2 OFFSET $3
        Params: ["completed",20,0]"
      `);
    });

    it("should order by multiple main table fields", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "status", "totalAmount", "createdAt"],
        where: {
          status: { $in: ["pending", "completed"] },
        },
        order: ["status:asc", "totalAmount:desc", "createdAt:desc"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."created_at" FROM "orders" AS "t0_orders" WHERE "t0_orders"."status" IN ($1, $2) ORDER BY "t0_orders"."status" ASC, "t0_orders"."total_amount" DESC, "t0_orders"."created_at" DESC LIMIT $3 OFFSET $4
        Params: ["pending","completed",20,0]"
      `);
    });

    it("should order by nested t1 field (items.quantity)", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          status: { $eq: "pending" },
          items: { quantity: { $gte: 1 } },
        },
        order: ["items.quantity:desc"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"WHERE ("t0_orders"."status" = $1 and "t1_order_items"."quantity" >= $2) ORDER BY "t1_order_items"."quantity" DESC LIMIT $3 OFFSET $4
        Params: ["pending",1,20,0]"
      `);
    });

    it("should order by nested t2 field (items.product.price)", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          items: { productPublished: { $eq: true } },
        },
        order: ["items.productPrice:desc"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"WHERE "t2_products"."is_published" = $1 ORDER BY "t2_products"."price" DESC LIMIT $2 OFFSET $3
        Params: [true,20,0]"
      `);
    });

    it("should order by t3 field (items.product.category.slug)", () => {
      const qb = createQueryBuilder(ordersNestedLevel3Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          items: { product: { categoryVisible: { $eq: true } } },
        },
        order: ["items.product.categorySlug:asc"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE "t3_categories"."is_visible" = $1 ORDER BY "t3_categories"."slug" ASC LIMIT $2 OFFSET $3
        Params: [true,20,0]"
      `);
    });

    it("should order by t4 field (items.product.category.translatedName)", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          items: { product: { category: { translatedLocale: { $eq: "en" } } } },
        },
        order: ["items.product.category.translatedName:asc"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE "t4_translations"."locale" = $1 ORDER BY "t4_translations"."value" ASC LIMIT $2 OFFSET $3
        Params: ["en",20,0]"
      `);
    });

    it("should order by multiple fields across different nesting levels (t0, t1, t2, t3)", () => {
      const qb = createQueryBuilder(ordersNestedLevel3Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          status: { $neq: "cancelled" },
          items: { product: { categoryVisible: { $eq: true } } },
        },
        order: [
          "items.product.categorySlug:asc",
          "items.product.price:desc",
          "items.quantity:desc",
          "totalAmount:desc",
        ],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE ("t0_orders"."status" <> $1 and "t3_categories"."is_visible" = $2) ORDER BY "t3_categories"."slug" ASC, "t2_products"."price" DESC, "t1_order_items"."quantity" DESC, "t0_orders"."total_amount" DESC LIMIT $3 OFFSET $4
        Params: ["cancelled",true,20,0]"
      `);
    });

    it("should combine complex where with multi-level order by (t0-t4)", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema, { maxLimit: 200 });
      const sqlObj = qb.buildSelectSql({
        where: {
          $and: [
            { status: { $in: ["completed", "shipped"] } },
            { totalAmount: { $gte: 100 } },
            { items: { quantity: { $gte: 1 } } },
            { items: { product: { isPublished: { $eq: true } } } },
            { items: { product: { category: { isVisible: { $eq: true } } } } },
            { items: { product: { category: { translatedLocale: { $eq: "en" } } } } },
          ],
        },
        order: [
          "items.product.category.translatedName:asc",
          "items.product.category.slug:asc",
          "items.product.price:desc",
          "totalAmount:desc",
          "createdAt:desc",
        ],
        limit: 100,
        offset: 50,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t0_orders"."status" IN ($1, $2) and "t0_orders"."total_amount" >= $3 and "t1_order_items"."quantity" >= $4 and "t2_products"."is_published" = $5 and "t3_categories"."is_visible" = $6 and "t4_translations"."locale" = $7) ORDER BY "t4_translations"."value" ASC, "t3_categories"."slug" ASC, "t2_products"."price" DESC, "t0_orders"."total_amount" DESC, "t0_orders"."created_at" DESC LIMIT $8 OFFSET $9
        Params: ["completed","shipped",100,1,true,true,"en",100,50]"
      `);
    });

    it("should handle MEGA complex query with WHERE on t0-t4 + ORDER BY on t0-t4", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema, { maxLimit: 500 });
      const sqlObj = qb.buildSelectSql({
        where: {
          $and: [
            // t0
            { id: { $neq: "00000000-0000-0000-0000-000000000000" } },
            { status: { $notIn: ["cancelled", "refunded"] } },
            { currency: { $in: ["USD", "EUR"] } },
            { totalAmount: { $gte: 50 } },
            // t1
            { items: { quantity: { $gte: 1 } } },
            { items: { unitPrice: { $gt: 0 } } },
            // t2
            { items: { product: { isPublished: { $eq: true } } } },
            { items: { product: { deletedAt: { $is: null } } } },
            { items: { product: { stock: { $gte: 1 } } } },
            // t3
            { items: { product: { category: { isVisible: { $eq: true } } } } },
            { items: { product: { category: { slug: { $notIn: ["hidden", "archived"] } } } } },
            // t4
            { items: { product: { category: { translatedLocale: { $in: ["en", "de"] } } } } },
            { items: { product: { category: { translatedName: { $isNot: null } } } } },
            {
              $or: [
                { items: { product: { category: { translatedName: { $iLike: "%electronics%" } } } } },
                { items: { product: { category: { translatedName: { $iLike: "%computers%" } } } } },
              ],
            },
          ],
        },
        order: [
          "items.product.category.translatedName:asc",
          "items.product.category.slug:asc",
          "items.product.sku:asc",
          "items.product.price:desc",
          "items.unitPrice:desc",
          "items.quantity:desc",
          "totalAmount:desc",
          "status:asc",
          "createdAt:desc",
        ],
        limit: 250,
        offset: 0,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders".* FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t0_orders"."id" <> $1 and "t0_orders"."status" NOT IN ($2, $3) and "t0_orders"."currency" IN ($4, $5) and "t0_orders"."total_amount" >= $6 and "t1_order_items"."quantity" >= $7 and "t1_order_items"."unit_price" > $8 and "t2_products"."is_published" = $9 and "t2_products"."deleted_at" IS NULL and "t2_products"."stock" >= $10 and "t3_categories"."is_visible" = $11 and "t3_categories"."slug" NOT IN ($12, $13) and "t4_translations"."locale" IN ($14, $15) and "t4_translations"."value" IS NOT NULL and ("t4_translations"."value" ILIKE $16 or "t4_translations"."value" ILIKE $17)) ORDER BY "t4_translations"."value" ASC, "t3_categories"."slug" ASC, "t2_products"."sku" ASC, "t2_products"."price" DESC, "t1_order_items"."unit_price" DESC, "t1_order_items"."quantity" DESC, "t0_orders"."total_amount" DESC, "t0_orders"."status" ASC, "t0_orders"."created_at" DESC LIMIT $18 OFFSET $19
        Params: ["00000000-0000-0000-0000-000000000000","cancelled","refunded","USD","EUR",50,1,0,true,1,true,"hidden","archived","en","de","%electronics%","%computers%",250,0]"
      `);
    });
  });

  // ===========================================================================
  // SELECT TESTS - with nested fields across t0-t4 tables
  // ===========================================================================

  describe("SELECT with nested joins", () => {
    it("should select specific main table fields (t0)", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          status: { $eq: "completed" },
        },
        select: ["id", "status", "totalAmount"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount" FROM "orders" AS "t0_orders" WHERE "t0_orders"."status" = $1 LIMIT $2 OFFSET $3
        Params: ["completed",20,0]"
      `);
    });

    it("should select nested t1 fields (items.quantity)", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          items: { quantity: { $gte: 1 } },
        },
        select: ["id", "status", "items.quantity", "items.unitPrice"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t1_order_items"."quantity", "t1_order_items"."unit_price" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id"WHERE "t1_order_items"."quantity" >= $1 LIMIT $2 OFFSET $3
        Params: [1,20,0]"
      `);
    });

    it("should select nested t2 fields (items.product.*)", () => {
      const qb = createQueryBuilder(ordersNestedLevel2Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          items: { productPublished: { $eq: true } },
        },
        select: ["id", "items.productSku", "items.productPrice"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t2_products"."sku", "t2_products"."price" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id"WHERE "t2_products"."is_published" = $1 LIMIT $2 OFFSET $3
        Params: [true,20,0]"
      `);
    });

    it("should select nested t3 fields (items.product.category.*)", () => {
      const qb = createQueryBuilder(ordersNestedLevel3Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          items: { product: { categoryVisible: { $eq: true } } },
        },
        select: ["id", "status", "items.product.categorySlug", "items.product.categoryVisible"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t3_categories"."slug", "t3_categories"."is_visible" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id"WHERE "t3_categories"."is_visible" = $1 LIMIT $2 OFFSET $3
        Params: [true,20,0]"
      `);
    });

    it("should select nested t4 fields (items.product.category.translated*)", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          items: { product: { category: { translatedLocale: { $eq: "en" } } } },
        },
        select: ["id", "items.product.category.translatedName", "items.product.category.translatedLocale"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t4_translations"."value", "t4_translations"."locale" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE "t4_translations"."locale" = $1 LIMIT $2 OFFSET $3
        Params: ["en",20,0]"
      `);
    });

    it("should select fields from all levels t0-t4", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema);
      const sqlObj = qb.buildSelectSql({
        where: {
          status: { $eq: "completed" },
          items: { product: { category: { translatedLocale: { $eq: "en" } } } },
        },
        select: [
          // t0: orders
          "id",
          "status",
          "totalAmount",
          // t1: order_items
          "items.quantity",
          "items.unitPrice",
          // t2: products
          "items.product.sku",
          "items.product.price",
          // t3: categories
          "items.product.category.slug",
          "items.product.category.isVisible",
          // t4: translations
          "items.product.category.translatedName",
          "items.product.category.translatedLocale",
        ],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t1_order_items"."quantity", "t1_order_items"."unit_price", "t2_products"."sku", "t2_products"."price", "t3_categories"."slug", "t3_categories"."is_visible", "t4_translations"."value", "t4_translations"."locale" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t0_orders"."status" = $1 and "t4_translations"."locale" = $2) LIMIT $3 OFFSET $4
        Params: ["completed","en",20,0]"
      `);
    });

    it("should combine SELECT + WHERE + ORDER BY across all levels", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema, { maxLimit: 200 });
      const sqlObj = qb.buildSelectSql({
        where: {
          $and: [
            { status: { $in: ["completed", "shipped"] } },
            { items: { quantity: { $gte: 1 } } },
            { items: { product: { isPublished: { $eq: true } } } },
            { items: { product: { category: { isVisible: { $eq: true } } } } },
            { items: { product: { category: { translatedLocale: { $eq: "en" } } } } },
          ],
        },
        select: [
          "id",
          "status",
          "totalAmount",
          "items.quantity",
          "items.product.sku",
          "items.product.price",
          "items.product.category.slug",
          "items.product.category.translatedName",
        ],
        order: [
          "items.product.category.translatedName:asc",
          "items.product.price:desc",
          "totalAmount:desc",
        ],
        limit: 100,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t1_order_items"."quantity", "t2_products"."sku", "t2_products"."price", "t3_categories"."slug", "t4_translations"."value" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t0_orders"."status" IN ($1, $2) and "t1_order_items"."quantity" >= $3 and "t2_products"."is_published" = $4 and "t3_categories"."is_visible" = $5 and "t4_translations"."locale" = $6) ORDER BY "t4_translations"."value" ASC, "t2_products"."price" DESC, "t0_orders"."total_amount" DESC LIMIT $7 OFFSET $8
        Params: ["completed","shipped",1,true,true,"en",100,0]"
      `);
    });

    it("should handle MEGA query with SELECT + WHERE + ORDER BY on all t0-t4 tables", () => {
      const qb = createQueryBuilder(ordersNestedLevel4Schema, { maxLimit: 500 });
      const sqlObj = qb.buildSelectSql({
        where: {
          $and: [
            // t0
            { status: { $notIn: ["cancelled", "refunded"] } },
            { currency: { $in: ["USD", "EUR"] } },
            { totalAmount: { $gte: 100 } },
            // t1
            { items: { quantity: { $gte: 1 } } },
            // t2
            { items: { product: { isPublished: { $eq: true } } } },
            { items: { product: { deletedAt: { $is: null } } } },
            // t3
            { items: { product: { category: { isVisible: { $eq: true } } } } },
            // t4
            { items: { product: { category: { translatedLocale: { $in: ["en", "de"] } } } } },
            { items: { product: { category: { translatedName: { $iLike: "%electronics%" } } } } },
          ],
        },
        select: [
          // t0
          "id", "status", "totalAmount", "currency", "createdAt",
          // t1
          "items.quantity", "items.unitPrice",
          // t2
          "items.product.sku", "items.product.price", "items.product.stock",
          // t3
          "items.product.category.slug", "items.product.category.isVisible",
          // t4
          "items.product.category.translatedName", "items.product.category.translatedLocale",
        ],
        order: [
          "items.product.category.translatedName:asc",
          "items.product.category.slug:asc",
          "items.product.price:desc",
          "items.quantity:desc",
          "totalAmount:desc",
          "createdAt:desc",
        ],
        limit: 250,
        offset: 50,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_orders"."id", "t0_orders"."status", "t0_orders"."total_amount", "t0_orders"."currency", "t0_orders"."created_at", "t1_order_items"."quantity", "t1_order_items"."unit_price", "t2_products"."sku", "t2_products"."price", "t2_products"."stock", "t3_categories"."slug", "t3_categories"."is_visible", "t4_translations"."value", "t4_translations"."locale" FROM "orders" AS "t0_orders" LEFT JOIN "order_items" AS "t1_order_items" ON "t0_orders"."id" = "t1_order_items"."order_id" LEFT JOIN "products" AS "t2_products" ON "t1_order_items"."product_id" = "t2_products"."id" LEFT JOIN "categories" AS "t3_categories" ON "t2_products"."category_id" = "t3_categories"."id" LEFT JOIN "translations" AS "t4_translations" ON "t3_categories"."id" = "t4_translations"."entity_id"WHERE ("t0_orders"."status" NOT IN ($1, $2) and "t0_orders"."currency" IN ($3, $4) and "t0_orders"."total_amount" >= $5 and "t1_order_items"."quantity" >= $6 and "t2_products"."is_published" = $7 and "t2_products"."deleted_at" IS NULL and "t3_categories"."is_visible" = $8 and "t4_translations"."locale" IN ($9, $10) and "t4_translations"."value" ILIKE $11) ORDER BY "t4_translations"."value" ASC, "t3_categories"."slug" ASC, "t2_products"."price" DESC, "t1_order_items"."quantity" DESC, "t0_orders"."total_amount" DESC, "t0_orders"."created_at" DESC LIMIT $12 OFFSET $13
        Params: ["cancelled","refunded","USD","EUR",100,1,true,true,"en","de","%electronics%",250,50]"
      `);
    });
  });
});
