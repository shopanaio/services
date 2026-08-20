import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ordersSource = resolve(here, "../..");
const repository = readFileSync(
  resolve(ordersSource, "repositories/admin/AdminOrderCommandRepository.ts"),
  "utf8",
);
const workflows = readFileSync(resolve(here, "AdminOrderCommandWorkflows.ts"), "utf8");
const service = readFileSync(resolve(ordersSource, "orders.nest-service.ts"), "utf8");
const paymentProjection = readFileSync(
  resolve(ordersSource, "handlers/OrderPaymentEventHandlers.ts"),
  "utf8",
);
const providerWorkflows = readFileSync(
  resolve(here, "../integration/OrderProviderCallbackWorkflows.ts"),
  "utf8",
);

describe("Orders Admin phase 3 architecture gate", () => {
  test("routes every Admin write through ServiceBroker and a policy-protected workflow", () => {
    expect(service).toContain("this.broker.runWorkflow(");
    expect(workflows).toContain("@Workflow(command");
    expect(workflows).toContain("@Policy<AdminOrderCommandInput>");
    expect(workflows).toContain("Workflow authorization context is required");
    expect(`${service}\n${workflows}`).not.toContain("WorkflowRegistry");
  });

  test("separates transactional writes from checkpointed external effects", () => {
    expect(workflows).toContain("@TransactionalStep({");
    expect(workflows).toContain("@WorkflowStep()");
    expect(workflows).toContain("this.broker.call(effect.route, effect.params)");
    expect(repository).toContain("order_operation_attempts");
  });

  test("keeps idempotency, concurrency and resulting-version audit in the repository boundary", () => {
    expect(repository).toContain("IDEMPOTENCY_KEY_PARAMETER_MISMATCH");
    expect(repository).toContain("ORDER_VERSION_CONFLICT");
    expect(repository).toContain("INSERT INTO orders.idempotency_records");
    expect(repository).toContain("INSERT INTO orders.order_revisions");
    expect(repository).toContain("INSERT INTO orders.order_events");
    expect(repository).toContain("INSERT INTO orders.order_status_history");
    expect(repository).toContain("INSERT INTO orders.order_activity");
  });

  test("uses the canonical payment projection version columns", () => {
    expect(paymentProjection).toContain("order_version");
    expect(paymentProjection).not.toContain("order_revision");
    expect(paymentProjection).not.toContain("aggregate_revision");
  });

  test("does not introduce a local delivery queue or lease/poller state", () => {
    const combined = `${repository}\n${workflows}`;
    expect(combined).not.toMatch(/outbox|local_queue|lease_until|poller/i);
  });

  test("publishes only after commit and checkpoints provider delivery", () => {
    expect(workflows).toContain("await this.commit(input, workflowId)");
    expect(workflows).toContain("await this.publishCommandEvent(input, result, workflowId)");
    expect(workflows).toContain('"events.emit"');
    expect(workflows).toContain("@WorkflowStep()\n  private publishCommandEvent");
  });

  test("persists shipment packages and orchestrates return restock/refund", () => {
    expect(repository).toContain("INSERT INTO orders.order_shipment_packages");
    expect(repository).toContain("INSERT INTO orders.order_shipment_package_lines");
    expect(repository).toContain("inventory.restockOrderReturnInventory");
    expect(repository).toContain("payments.refundPayment");
    expect(repository).toContain("INSERT INTO orders.order_return_shipments");
  });

  test("uses content-idempotent provider callback workflows", () => {
    expect(providerWorkflows).toContain('@Workflow("completeOrderFulfillmentServiceOperationV1"');
    expect(providerWorkflows).toContain('@Workflow("applyOrderIntegrationEventV1"');
    expect(providerWorkflows).toContain('idempotencyStrategy: "content"');
    expect(providerWorkflows).toContain("@TransactionalStep({");
  });
});
