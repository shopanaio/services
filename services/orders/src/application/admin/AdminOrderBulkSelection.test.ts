import { describe, expect, test } from "@jest/globals";
import { parseAdminOrderBulkSelection } from "./AdminOrderBulkSelection.js";

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
});
