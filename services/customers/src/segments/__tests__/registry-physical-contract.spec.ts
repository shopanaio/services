import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CUSTOMER_SEGMENT_REGISTRY } from "../registry.js";

describe("customer segment registry physical contract", () => {
  const migrations = readSqlTree(
    fileURLToPath(new URL("../../../migrations/domains", import.meta.url)),
  );

  it("does not publish an AVAILABLE descriptor without every declared index", () => {
    for (const descriptor of CUSTOMER_SEGMENT_REGISTRY.values()) {
      if (descriptor.availability !== "AVAILABLE") continue;
      for (const indexName of descriptor.indexContract) {
        expect(migrations).toContain(`"${indexName}"`);
      }
    }
  });

  it.each([
    "email_domain_normalized",
    "preferred_locale_normalized",
    "company_name_normalized",
    "birthday_month_day",
    "region_key",
    "city_key",
    "postal_code_normalized",
    "completed_orders_count",
    "evaluation_generation",
    "evaluated_generation",
  ])("contains the required physical column %s", (columnName) => {
    expect(migrations).toContain(`"${columnName}"`);
  });

  it("indexes completed-time order evaluation", () => {
    expect(migrations).toContain('"customer_order_projection_customer_status_idx"');
    expect(migrations).toContain(
      '("store_id", "customer_id", "status", "created_at", "completed_at", "cancelled_at", "order_id")',
    );
  });
});

function readSqlTree(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const target = join(directory, entry.name);
      return entry.isDirectory()
        ? readSqlTree(target)
        : entry.name.endsWith(".sql")
          ? readFileSync(target, "utf8")
          : "";
    })
    .join("\n");
}
