import { describe, expect, test } from "@jest/globals";
import {
  parseAdminOrderBulkSelection,
  parseAdminOrderWhere,
} from "./AdminOrderBulkSelection.js";

const id = "018f3f8d-0e6d-7a74-8f80-123456789abc";

describe("AdminOrderBulkSelection", () => {
  test("rejects explicit filters without an effective predicate", () => {
    expect(() => parseAdminOrderBulkSelection({ selection: { where: { status: {} } } })).toThrow(
      "ORDER_BULK_FILTER_EMPTY",
    );
    expect(() => parseAdminOrderBulkSelection({ selection: { where: { and: [] } } })).toThrow(
      "ORDER_BULK_FILTER_EMPTY",
    );
  });

  test("preserves every operator as an implicit AND", () => {
    const selection = parseAdminOrderBulkSelection({
      selection: { where: { status: { eq: "OPEN", in: ["OPEN", "CLOSED"] } } },
    });

    expect(selection.predicate).toEqual({
      kind: "and",
      predicates: [
        { kind: "comparison", field: "status", operator: "eq", value: "OPEN" },
        {
          kind: "comparison",
          field: "status",
          operator: "in",
          value: ["OPEN", "CLOSED"],
        },
      ],
    });
  });

  test("accepts the complete composable order filter shape", () => {
    const selection = parseAdminOrderBulkSelection({
      selection: {
        ids: [id],
        where: {
          and: [
            { customerId: { eq: id } },
            { archived: false },
            {
              or: [
                { paymentStatus: { in: ["PAID", "PARTIALLY_PAID"] } },
                { trackingNumber: { startsWith: "NP-" } },
              ],
            },
          ],
        },
      },
    });

    expect(selection.ids).toEqual([id]);
    expect(selection.predicate).not.toBeNull();
  });

  test("parses every Admin list filter without dropping operators", () => {
    const predicate = parseAdminOrderWhere({
      id: { eq: id, in: [id], notIn: [id] },
      number: { eq: "1001", gt: "1000", gte: "1001", lt: "2000", lte: "1999" },
      status: { eq: "OPEN", in: ["OPEN", "CLOSED"] },
      paymentStatus: { eq: "PAID", in: ["PAID"] },
      fulfillmentStatus: { eq: "UNFULFILLED", in: ["UNFULFILLED"] },
      deliveryStatus: { eq: "NOT_SHIPPED", in: ["NOT_SHIPPED"] },
      returnStatus: { eq: "NONE", in: ["NONE"] },
      placementStatus: { eq: "CONFIRMED", in: ["CONFIRMED"] },
      customerId: { eq: id, in: [id], notIn: [id] },
      customerName: { contains: "Ada", startsWith: "A" },
      customerEmail: { eq: "ada@example.test" },
      customerPhone: { startsWith: "+380" },
      externalId: { eq: "erp-1" },
      sourceCode: { in: ["admin", "erp"] },
      totalAmount: { gt: "10.50", lte: "100.00" },
      currencyCode: { eq: "USD" },
      shippingCountry: { eq: "UA" },
      deliveryMethodCode: { contains: "express" },
      paymentMethodCode: { startsWith: "card" },
      tag: { in: ["vip"] },
      trackingNumber: { startsWith: "NP-" },
      hasTracking: true,
      archived: false,
      createdAt: { gte: "2026-01-01T00:00:00.000Z" },
      updatedAt: { lte: "2026-12-31T23:59:59.999Z" },
      placedAt: { gt: "2026-02-01T00:00:00.000Z" },
    });

    expect(predicate.kind).toBe("and");
    if (predicate.kind === "and") expect(predicate.predicates.length).toBeGreaterThan(25);
  });
});
