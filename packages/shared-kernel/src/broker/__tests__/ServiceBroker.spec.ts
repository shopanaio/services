import { jest } from "@jest/globals";
import type { AuthorizeParams } from "@shopana/rbac";
import { z } from "zod";
import { ActionRegistry } from "../ActionRegistry";
import { ServiceBroker } from "../ServiceBroker";
import type { ActionCallContext, ActionHandler } from "../ActionRegistry";
import { BrokerActions } from "../BrokerActions";
import { Action } from "../../decorators/Action";
import { AuthorizationError, Policy } from "../../decorators/Authorize";
import { ZodSchema } from "../../decorators/ZodSchema";
import type { BrokerAdminContext } from "../WorkflowAuthorization";

class SecuredBrokerActions extends BrokerActions {
  readonly authProvider = {
    subject: "platform-user",
    authorize: jest.fn(async (_params: AuthorizeParams) => true),
  };

  @Action("securedAction", { readOnly: true })
  @ZodSchema(z.object({ value: z.string() }).strict())
  @Policy<{ value: string }>({
    resource: "org.stores",
    action: "read",
    organizationId: "018f8f6d-7980-7000-9000-000000000001",
  })
  async securedAction(
    params: { value: string },
    context: ActionCallContext,
  ): Promise<{ value: string; caller: ActionCallContext["caller"] }> {
    return { value: params.value, caller: context.caller };
  }
}

class SecuredWorkflow {
  @Policy<{ organizationId: string }>({
    resource: "org.stores",
    action: "read",
    organizationId: (_self, params) => params.organizationId,
  })
  @Policy<{ organizationId: string }>({
    resource: "org.roles",
    action: "write",
    organizationId: (_self, params) => params.organizationId,
  })
  async run(_params: { organizationId: string }): Promise<void> {}
}

class OrganizationNameScopedWorkflow {
  @Policy({
    resource: "org.stores",
    action: "read",
    organizationName: "another-organization",
  })
  async run(): Promise<void> {}
}

const createBroker = (options?: { registry?: ActionRegistry }) => {
  const registry = options?.registry ?? new ActionRegistry();
  return new ServiceBroker(registry, { serviceName: "payments" });
};

describe("ServiceBroker", () => {
  it("qualifies local action names on register", () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });
    const handler: ActionHandler = jest.fn();

    broker.register("listMethods", handler);

    expect(registry.list()).toEqual(["payments.listMethods"]);
  });

  it("calls handlers via ActionRegistry", async () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });

    broker.register("listMethods", async (params?: { currency: string }) => {
      return { ok: params?.currency ?? "n/a" };
    });

    await expect(broker.call("payments.listMethods", { currency: "USD" })).resolves.toEqual({
      ok: "USD",
    });
  });

  it("assigns caller service identity outside the action payload", async () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });
    const handler: ActionHandler = jest.fn(async (_params, context) => context);

    broker.register("inspectCaller", handler);

    await expect(
      broker.call("payments.inspectCaller", {
        caller: { kind: "event", service: "forged" },
      }),
    ).resolves.toEqual({
      caller: { kind: "action", service: "payments" },
    });
  });

  it("preserves caller context through ZodSchema and Policy decorators", async () => {
    const registry = new ActionRegistry();
    const targetBroker = createBroker({ registry });
    const callerBroker = new ServiceBroker(registry, { serviceName: "project" });
    const actions = new SecuredBrokerActions(targetBroker);
    actions.onModuleInit();
    expect(targetBroker.getActionMetadata("payments.securedAction")).toEqual({ readOnly: true });

    await expect(callerBroker.call("payments.securedAction", { value: "ok" })).resolves.toEqual({
      value: "ok",
      caller: { kind: "action", service: "project" },
    });
  });

  it("uses the immediate service identity for nested broker calls", async () => {
    const registry = new ActionRegistry();
    const projectBroker = new ServiceBroker(registry, { serviceName: "project" });
    const catalogBroker = new ServiceBroker(registry, { serviceName: "catalog" });
    const iamBroker = new ServiceBroker(registry, { serviceName: "iam" });

    iamBroker.register("inspectCaller", async (_params, context) => context);
    catalogBroker.register("authorize", async () => catalogBroker.call("iam.inspectCaller"));

    await expect(projectBroker.call("catalog.authorize")).resolves.toEqual({
      caller: { kind: "action", service: "catalog" },
    });
  });

  it("assigns persisted producer identity to event handler calls", async () => {
    const registry = new ActionRegistry();
    const eventsBroker = new ServiceBroker(registry, { serviceName: "events" });
    const listingBroker = new ServiceBroker(registry, { serviceName: "listing" });

    listingBroker.register("productCreated", async (_params, context) => context);

    await expect(eventsBroker.callEvent("listing.productCreated", {}, "catalog")).resolves.toEqual({
      caller: { kind: "event", service: "catalog" },
    });
  });

  it("does not let ordinary service brokers forge event caller contexts", async () => {
    const broker = createBroker();

    await expect(broker.callEvent("payments.eventHandler", {}, "catalog")).rejects.toThrow(
      "Only events service can dispatch event broker calls",
    );
  });

  it("assigns event source from broker identity instead of workflow payload", async () => {
    const registry = new ActionRegistry();
    const workflow = {};
    const workflowRegistry = {
      getDescriptor: jest.fn(() => ({
        instance: workflow,
        metadata: { name: "emit" },
      })),
      start: jest.fn(async () => ({
        workflowId: "workflow-id",
        getResult: async () => ({ eventId: "event-id" }),
      })),
    };
    const broker = new ServiceBroker(
      registry,
      { serviceName: "catalog" },
      workflowRegistry as never,
    );

    await broker.runWorkflow(
      "events.emit",
      { eventType: "productCreated", source: "forged" },
      { source: "workflow", workflowId: "parent", stepId: "emit" },
    );

    expect(workflowRegistry.start).toHaveBeenCalledWith(
      "events.emit",
      { eventType: "productCreated", source: "catalog" },
      expect.any(Object),
      undefined,
      undefined,
    );
  });

  it.each(["runWorkflow", "startWorkflow", "runSaga"] as const)(
    "checks every workflow policy before %s starts DBOS",
    async (method) => {
      const registry = new ActionRegistry();
      const workflow = new SecuredWorkflow();
      const workflowRegistry = {
        getDescriptor: jest.fn(() => ({
          instance: workflow,
          metadata: { name: "secured" },
        })),
        start: jest.fn(async () => ({
          workflowId: "workflow-id",
          getResult: async () => ({ success: true }),
        })),
      };
      const broker = new ServiceBroker(
        registry,
        { serviceName: "payments" },
        workflowRegistry as never,
      );
      const params = { organizationId: "organization-id" };
      const idempotency = {
        source: "workflow" as const,
        workflowId: "parent",
        stepId: "secured",
      };
      const options = {
        adminContext: createAdminContext([
          { domain: "org", resource: "org.roles", action: "write" },
          { domain: "org", resource: "org.stores", action: "read" },
        ]),
      };

      if (method === "runWorkflow") {
        await broker.runWorkflow("payments.secured", params, idempotency, options);
      } else if (method === "startWorkflow") {
        await broker.startWorkflow("payments.secured", params, idempotency, options);
      } else {
        await broker.runSaga("payments.secured", params, idempotency, options);
      }

      expect(workflowRegistry.start).toHaveBeenCalledWith(
        "payments.secured",
        params,
        idempotency,
        undefined,
        {
          authorization: {
            kind: "admin",
            subject: "platform-user",
            organizationId: "organization-id",
          },
        },
      );
    },
  );

  it("does not start DBOS when any workflow policy is denied", async () => {
    const registry = new ActionRegistry();
    const workflow = new SecuredWorkflow();
    const workflowRegistry = {
      getDescriptor: jest.fn(() => ({
        instance: workflow,
        metadata: { name: "secured" },
      })),
      start: jest.fn(),
    };
    const broker = new ServiceBroker(
      registry,
      { serviceName: "payments" },
      workflowRegistry as never,
    );

    await expect(
      broker.runWorkflow(
        "payments.secured",
        { organizationId: "organization-id" },
        {
          source: "workflow",
          workflowId: "parent",
          stepId: "secured",
        },
        {
          adminContext: createAdminContext([
            { domain: "org", resource: "org.stores", action: "read" },
          ]),
        },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(workflowRegistry.start).not.toHaveBeenCalled();
  });

  it("does not bind an organizationName-only policy to the current organization ID", async () => {
    const registry = new ActionRegistry();
    const workflowRegistry = {
      getDescriptor: jest.fn(() => ({
        instance: new OrganizationNameScopedWorkflow(),
        metadata: { name: "nameScoped" },
      })),
      start: jest.fn(),
    };
    const broker = new ServiceBroker(
      registry,
      { serviceName: "payments" },
      workflowRegistry as never,
    );

    await expect(
      broker.runWorkflow(
        "payments.nameScoped",
        undefined,
        {
          source: "workflow",
          workflowId: "parent",
          stepId: "name-scoped",
        },
        {
          adminContext: createAdminContext([
            { domain: "org", resource: "org.stores", action: "read" },
          ]),
        },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(workflowRegistry.start).not.toHaveBeenCalled();
  });

  it("forwards minimal context to a nested workflow without repeating policies", async () => {
    const registry = new ActionRegistry();
    const workflowRegistry = {
      getDescriptor: jest.fn(() => ({
        instance: new SecuredWorkflow(),
        metadata: { name: "secured" },
      })),
      start: jest.fn(async () => ({
        workflowId: "nested-id",
        getResult: async () => undefined,
      })),
    };
    const broker = new ServiceBroker(
      registry,
      { serviceName: "payments" },
      workflowRegistry as never,
    );
    const workflowContext = {
      authorization: {
        kind: "admin" as const,
        subject: "platform-user",
        organizationId: "organization-id",
        permissions: ["must-not-reach-dbos"],
        jwt: "must-not-reach-dbos",
      },
    };

    await broker.runWorkflow(
      "payments.secured",
      { organizationId: "organization-id" },
      { source: "workflow", workflowId: "root", stepId: "nested" },
      { workflowContext },
    );

    expect(workflowRegistry.start).toHaveBeenCalledWith(
      "payments.secured",
      { organizationId: "organization-id" },
      expect.any(Object),
      undefined,
      {
        authorization: {
          kind: "admin",
          subject: "platform-user",
          organizationId: "organization-id",
        },
      },
    );
  });

  it("throws when call action lacks prefix", async () => {
    const broker = createBroker();

    await expect(broker.call("listMethods")).rejects.toThrow(
      'Action "listMethods" must include service prefix',
    );
  });

  it("deregisters actions on shutdown", async () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });

    broker.register("localAction", jest.fn());
    await broker.onModuleDestroy();

    expect(registry.list()).toEqual([]);
  });

  it("exposes action metadata and presence", () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });
    const handler: ActionHandler = jest.fn();

    broker.register("retryableAction", handler, {
      retryPolicy: { maxAttempts: 4, intervalSeconds: 3, backoffRate: 2 },
    });

    expect(broker.hasAction("payments.retryableAction")).toBe(true);
    expect(broker.getActionMetadata("payments.retryableAction")).toEqual({
      retryPolicy: { maxAttempts: 4, intervalSeconds: 3, backoffRate: 2 },
    });
  });

  it("isHealthy returns true", () => {
    const broker = createBroker();
    expect(broker.isHealthy()).toBe(true);
  });

  it("getHealth returns service info", () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });
    broker.register("testAction", jest.fn());

    const health = broker.getHealth();

    expect(health.serviceName).toBe("payments");
    expect(health.registeredActions).toContain("payments.testAction");
    expect(health.inFlight).toBe(0);
  });
});

function createAdminContext(permissions: BrokerAdminContext["permissions"]): BrokerAdminContext {
  return {
    user: { id: "platform-user" },
    organizationId: "organization-id",
    store: null,
    permissions,
    isSiteAdmin: false,
    isOrganizationOwner: false,
  };
}
