import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import postgres from "postgres";

const serviceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsRoot = join(serviceRoot, "migrations", "domains");
const modelsRoot = join(serviceRoot, "src", "repositories", "models");
const requiredTables = [
  "orders",
  "order_events",
  "idempotency_records",
  "order_operations",
  "order_operation_attempts",
  "order_checkout_placements",
  "order_checkout_commitments",
  "order_edit_sessions",
  "order_edit_changes",
  "order_payment_methods",
  "order_payment_attempts",
  "order_payment_transactions",
  "order_payment_transaction_fees",
  "order_payment_disputes",
  "order_refunds",
  "order_refund_lines",
  "order_refund_transaction_allocations",
  "order_fulfillment_orders",
  "order_fulfillment_order_lines",
  "order_fulfillment_holds",
  "order_fulfillment_service_requests",
  "order_fulfillments",
  "order_fulfillment_lines",
  "order_shipments",
  "order_shipment_packages",
  "order_shipment_package_lines",
  "order_shipment_tracking_numbers",
  "order_shipment_tracking_events",
  "order_shipment_provider_operations",
  "order_fulfillment_event_inbox",
  "order_return_requests",
  "order_return_request_lines",
  "order_return_shipments",
  "order_return_tracking_events",
  "order_exchanges",
  "order_exchange_inbound_lines",
  "order_exchange_outbound_lines",
  "order_external_references",
  "order_integration_links",
  "order_integration_sync_attempts",
  "order_integration_event_inbox",
  "order_activity",
  "order_tags",
  "order_admin_notes",
] as const;
const forbiddenTables = [
  "order_items",
  "order_outbox",
  "delivery_fulfillment_snapshots",
  "delivery_fulfillment_updates",
];

const sqlFiles = (await walk(migrationsRoot)).filter((path) => path.endsWith(".sql")).sort();
const modelFiles = (await walk(modelsRoot)).filter((path) => path.endsWith(".ts")).sort();
const sqlSource = (await Promise.all(sqlFiles.map((path) => readFile(path, "utf8")))).join("\n");
const modelSource = (await Promise.all(modelFiles.map((path) => readFile(path, "utf8")))).join(
  "\n",
);
const sqlTables = new Set(
  [...sqlSource.matchAll(/CREATE TABLE "orders"\."([^"]+)"/g)].map((match) => match[1]),
);
const modelTables = new Set(
  [...modelSource.matchAll(/ordersSchema\.table\((?:\n\s*)?["`]([^"`]+)["`]/g)].map(
    (match) => match[1],
  ),
);

for (const table of requiredTables)
  assert(sqlTables.has(table), `Required SQL table is missing: ${table}`);
for (const table of forbiddenTables)
  assert(!sqlTables.has(table), `Forbidden legacy SQL table remains: ${table}`);
for (const table of sqlTables) assert(modelTables.has(table), `Drizzle table is missing: ${table}`);
for (const table of modelTables)
  assert(sqlTables.has(table), `Drizzle table has no SQL table: ${table}`);
assert(
  /"version" integer NOT NULL DEFAULT 1/.test(sqlSource),
  "orders.version concurrency token is missing",
);
const ordersBody = sqlSource.match(/CREATE TABLE "orders"\."orders" \(([\s\S]*?)\n\);/)?.[1] ?? "";
assert(!/"revision"/.test(ordersBody), "orders.revision must not exist");
assert(
  /order_events[\s\S]*"order_version" integer NOT NULL/.test(sqlSource),
  "order_events.order_version is missing",
);
assert(
  /order_events[\s\S]*"global_position" bigint GENERATED ALWAYS AS IDENTITY/.test(sqlSource),
  "order_events.global_position is missing",
);
assert(/redact_order_pii/.test(sqlSource), "PII redaction function is missing");
assert(
  /protect_finalized_payment_transaction/.test(sqlSource),
  "Finalized payment protection is missing",
);
for (const invariant of [
  "orders_total_formula_check",
  "orders_zero_total_payment_check",
  "order_lines_quantity_check",
  "order_lines_total_formula_check",
  "order_return_request_lines_quantities_check",
  "order_shipment_package_lines_quantity_check",
  "order_exchange_outbound_lines_values_check",
]) {
  assert(
    sqlSource.includes(invariant),
    `Required financial/quantity invariant is missing: ${invariant}`,
  );
}
for (const table of sqlTables) {
  const body = sqlSource.match(
    new RegExp(`CREATE TABLE "orders"\\."${table}" \\(([\\s\\S]*?)\\n\\);`),
  )?.[1];
  assert(body, `Cannot inspect SQL table body: ${table}`);
  assert(/"store_id" uuid NOT NULL/.test(body), `Store tenant key is missing: ${table}`);
}

dotenv.config({ path: join(serviceRoot, ".env") });
const databaseUrl = process.env.DATABASE_URL;
if (!process.argv.includes("--static")) {
  assert(databaseUrl, "DATABASE_URL is required for clean-chain validation");
  const validationSchema = `orders_validation_${randomUUID().replaceAll("-", "")}`;
  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  const rollback = new Error("ROLLBACK_VALIDATION");

  try {
    await client.begin(async (transaction) => {
      for (const path of sqlFiles) {
        const source = (await readFile(path, "utf8"))
          .replaceAll('"orders"', `"${validationSchema}"`)
          .replaceAll("orders.", `${validationSchema}.`);
        await transaction.unsafe(source);
      }
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await client.end();
  }
}

process.stdout.write(
  `Validated ${sqlFiles.length} migrations, ${sqlTables.size} SQL tables, and the Drizzle table contract.\n`,
);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function walk(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(root, entry.name);
      return entry.isDirectory() ? walk(path) : Promise.resolve([path]);
    }),
  );
  return nested.flat();
}
