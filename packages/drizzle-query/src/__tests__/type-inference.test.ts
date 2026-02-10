/**
 * Type inference tests - compile-time validation
 * These tests verify that types are correctly inferred from schemas
 */
import { describe, it, expectTypeOf } from "vitest";
import { sql } from "drizzle-orm";
import { pgTable, pgView, text, uuid, integer, numeric } from "drizzle-orm/pg-core";
import { createQuery, field } from "../index.js";
import type { ResolvePathType, InferSelectResultFlat } from "../types.js";

// Test tables
const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  age: integer("age"),
});

const orders = pgTable("orders", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  status: text("status").notNull(),
  total: integer("total"),
});

const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey(),
  orderId: uuid("order_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
});

// Create queries using fluent API
const userQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  email: field(users.email),
  age: field(users.age),
});

const orderItemQuery = createQuery(orderItems, {
  id: field(orderItems.id),
  productName: field(orderItems.productName),
  quantity: field(orderItems.quantity),
});

const orderQuery = createQuery(orders, {
  id: field(orders.id),
  status: field(orders.status),
  total: field(orders.total),
  items: field(orders.id).leftJoin(orderItemQuery, orderItems.orderId),
});

describe("Type Inference", () => {
  describe("InferFieldTypes", () => {
    it("should infer types from table columns", () => {
      type UserTypes = typeof userQuery["__types"];

      // Basic field types
      expectTypeOf<UserTypes["id"]>().toEqualTypeOf<string>();
      expectTypeOf<UserTypes["name"]>().toEqualTypeOf<string>();
      expectTypeOf<UserTypes["email"]>().toEqualTypeOf<string>();
      expectTypeOf<UserTypes["age"]>().toEqualTypeOf<number | null>();
    });

    it("should infer nested types from joins", () => {
      type OrderTypes = typeof orderQuery["__types"];

      // Root fields
      expectTypeOf<OrderTypes["id"]>().toEqualTypeOf<string>();
      expectTypeOf<OrderTypes["status"]>().toEqualTypeOf<string>();
      expectTypeOf<OrderTypes["total"]>().toEqualTypeOf<number | null>();
    });

    it("should use field key as result key (like Drizzle)", () => {
      // Table with snake_case columns
      const categories = pgTable("categories", {
        id: uuid("id").primaryKey(),
        parent_id: uuid("parent_id"),
        is_visible: integer("is_visible"),
      });

      // Query with camelCase keys mapping to snake_case columns
      const categoryQuery = createQuery(categories, {
        id: field(categories.id),
        parentId: field(categories.parent_id),
        isVisible: field(categories.is_visible),
      });

      type CatTypes = typeof categoryQuery["__types"];

      // Keys should be the field key (not column name)
      expectTypeOf<CatTypes["id"]>().toEqualTypeOf<string>();
      expectTypeOf<CatTypes["parentId"]>().toEqualTypeOf<string | null>();
      expectTypeOf<CatTypes["isVisible"]>().toEqualTypeOf<number | null>();
    });
  });

  describe("ResolvePathType", () => {
    it("should resolve simple paths", () => {
      type UserTypes = typeof userQuery["__types"];

      type IdType = ResolvePathType<UserTypes, "id">;
      type NameType = ResolvePathType<UserTypes, "name">;
      type AgeType = ResolvePathType<UserTypes, "age">;

      expectTypeOf<IdType>().toEqualTypeOf<string>();
      expectTypeOf<NameType>().toEqualTypeOf<string>();
      expectTypeOf<AgeType>().toEqualTypeOf<number | null>();
    });
  });

  describe("InferSelectResultFlat", () => {
    it("should create result type from select paths", () => {
      type UserTypes = typeof userQuery["__types"];
      type SelectPaths = readonly ["id", "name"];

      type Result = InferSelectResultFlat<UserTypes, SelectPaths>;

      expectTypeOf<Result>().toEqualTypeOf<{
        id: string;
        name: string;
      }>();
    });
  });

  describe("FluentQueryBuilder.execute()", () => {
    it("should return typed results", () => {
      // execute() returns full Types
      type ExecuteResult = Awaited<ReturnType<typeof userQuery.execute>>;
      type SingleResult = ExecuteResult[number];

      expectTypeOf<SingleResult["id"]>().toEqualTypeOf<string>();
      expectTypeOf<SingleResult["name"]>().toEqualTypeOf<string>();
      expectTypeOf<SingleResult["age"]>().toEqualTypeOf<number | null>();
    });
  });
});

// ============ VIEW TYPE TESTS ============

// Test view with computed fields
const products = pgTable("products", {
  id: uuid("id").primaryKey(),
  sku: text("sku").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  stock: integer("stock"),
});

const productsView = pgView("products_view").as((qb) =>
  qb
    .select({
      id: products.id,
      sku: products.sku,
      price: products.price,
      stock: products.stock,
      displayName: sql<string>`UPPER(${products.sku})`.as("display_name"),
      priceRange: sql<string>`
        CASE
          WHEN ${products.price} < 100 THEN 'budget'
          WHEN ${products.price} < 500 THEN 'mid-range'
          ELSE 'premium'
        END
      `.as("price_range"),
    })
    .from(products)
);

// View query with auto-extracted fields
const productsViewQuery = createQuery(productsView);

// View query with explicit fields
const productsViewExplicitQuery = createQuery(productsView, {
  id: field(productsView.id),
  sku: field(productsView.sku),
  price: field(productsView.price),
  stock: field(productsView.stock),
  displayName: field(productsView.displayName),
  priceRange: field(productsView.priceRange),
});

// Translations for joins
const translations = pgTable("translations", {
  id: uuid("id").primaryKey(),
  entityId: uuid("entity_id").notNull(),
  value: text("value"),
});

const translationsQuery = createQuery(translations, {
  id: field(translations.id),
  entityId: field(translations.entityId),
  value: field(translations.value),
});

// View with join
const productsViewWithJoinQuery = createQuery(productsView, {
  id: field(productsView.id),
  sku: field(productsView.sku),
  priceRange: field(productsView.priceRange),
  translation: field(productsView.id).leftJoin(translationsQuery, translations.entityId),
});

describe("View Type Inference", () => {
  describe("Auto-extracted view fields", () => {
    it("should infer types from view columns", () => {
      type ViewTypes = typeof productsViewQuery["__types"];

      expectTypeOf<ViewTypes["id"]>().toEqualTypeOf<string>();
      expectTypeOf<ViewTypes["sku"]>().toEqualTypeOf<string>();
      expectTypeOf<ViewTypes["price"]>().toEqualTypeOf<string | null>(); // numeric is string
      expectTypeOf<ViewTypes["stock"]>().toEqualTypeOf<number | null>();
    });

    it("should infer types from computed/aliased view fields", () => {
      type ViewTypes = typeof productsViewQuery["__types"];

      // Computed fields should have correct types
      expectTypeOf<ViewTypes["displayName"]>().toEqualTypeOf<string>();
      expectTypeOf<ViewTypes["priceRange"]>().toEqualTypeOf<string>();
    });
  });

  describe("Explicit view fields", () => {
    it("should infer types from explicit field definitions", () => {
      type ViewTypes = typeof productsViewExplicitQuery["__types"];

      expectTypeOf<ViewTypes["id"]>().toEqualTypeOf<string>();
      expectTypeOf<ViewTypes["sku"]>().toEqualTypeOf<string>();
      expectTypeOf<ViewTypes["displayName"]>().toEqualTypeOf<string>();
      expectTypeOf<ViewTypes["priceRange"]>().toEqualTypeOf<string>();
    });
  });

  describe("View with joins", () => {
    it("should infer types from view fields and joined table fields", () => {
      type ViewTypes = typeof productsViewWithJoinQuery["__types"];

      // Base view fields
      expectTypeOf<ViewTypes["id"]>().toEqualTypeOf<string>();
      expectTypeOf<ViewTypes["sku"]>().toEqualTypeOf<string>();
      expectTypeOf<ViewTypes["priceRange"]>().toEqualTypeOf<string>();
    });
  });

  describe("ResolvePathType with views", () => {
    it("should resolve simple paths from view", () => {
      type ViewTypes = typeof productsViewQuery["__types"];

      type IdType = ResolvePathType<ViewTypes, "id">;
      type SkuType = ResolvePathType<ViewTypes, "sku">;
      type DisplayNameType = ResolvePathType<ViewTypes, "displayName">;

      expectTypeOf<IdType>().toEqualTypeOf<string>();
      expectTypeOf<SkuType>().toEqualTypeOf<string>();
      expectTypeOf<DisplayNameType>().toEqualTypeOf<string>();
    });
  });

  describe("InferSelectResultFlat with views", () => {
    it("should create result type from view select paths", () => {
      type ViewTypes = typeof productsViewQuery["__types"];
      type SelectPaths = readonly ["id", "sku", "priceRange"];

      type Result = InferSelectResultFlat<ViewTypes, SelectPaths>;

      expectTypeOf<Result>().toEqualTypeOf<{
        id: string;
        sku: string;
        priceRange: string;
      }>();
    });
  });

  describe("View execute() return types", () => {
    it("should return typed results from view query", () => {
      type ExecuteResult = Awaited<ReturnType<typeof productsViewQuery.execute>>;
      type SingleResult = ExecuteResult[number];

      expectTypeOf<SingleResult["id"]>().toEqualTypeOf<string>();
      expectTypeOf<SingleResult["sku"]>().toEqualTypeOf<string>();
      expectTypeOf<SingleResult["displayName"]>().toEqualTypeOf<string>();
      expectTypeOf<SingleResult["priceRange"]>().toEqualTypeOf<string>();
    });

    it("should return typed results from view with joins", () => {
      type ExecuteResult = Awaited<ReturnType<typeof productsViewWithJoinQuery.execute>>;
      type SingleResult = ExecuteResult[number];

      expectTypeOf<SingleResult["id"]>().toEqualTypeOf<string>();
      expectTypeOf<SingleResult["sku"]>().toEqualTypeOf<string>();
      expectTypeOf<SingleResult["priceRange"]>().toEqualTypeOf<string>();
    });
  });
});
