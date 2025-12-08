/**
 * Type inference tests - compile-time validation
 * These tests verify that types are correctly inferred from schemas
 */
import { describe, it, expectTypeOf } from "vitest";
import { pgTable, text, uuid, integer } from "drizzle-orm/pg-core";
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
