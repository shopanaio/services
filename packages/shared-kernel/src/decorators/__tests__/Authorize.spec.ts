import type { AuthProvider, AuthorizeParams } from "@shopana/rbac";
import { WORKFLOW_METADATA_KEY } from "@shopana/dbos";
import {
  authorizePolicies,
  Policy,
} from "../Authorize.js";

describe("Policy RBAC contract", () => {
  it("passes only RBAC context to the authorization provider", async () => {
    const script = new PolicyScript();

    await expect(script.run({ organizationId: "org-id" })).resolves.toBe(
      "executed"
    );
    expect(script.authProvider.authorize).toHaveBeenCalledWith({
      resource: "org.applications",
      action: "write",
      organizationId: "org-id",
      organizationName: undefined,
      domain: undefined,
      subject: undefined,
    });
  });

  it("uses an explicit subject when the provider has no ambient subject", async () => {
    const script = new ExplicitSubjectPolicyScript();

    await expect(script.run({ organizationId: "org-id" })).resolves.toBe(
      "executed"
    );
    expect(script.authProvider.authorize).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "explicit-user" })
    );
  });

  it("evaluates every policy declared on a workflow entrypoint", async () => {
    const workflow = new MultiPolicyWorkflow();

    await authorizePolicies(workflow, "run", {
      organizationId: "org-id",
    });

    expect(workflow.authProvider.authorize).toHaveBeenCalledTimes(2);
    expect(workflow.authProvider.authorize).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        resource: "org.roles",
        action: "update",
      })
    );
    expect(workflow.authProvider.authorize).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        resource: "org.stores",
        action: "read",
      })
    );
  });

  it("does not repeat a preflight policy inside DBOS execution", async () => {
    const workflow = new WorkflowEntrypoint();

    await expect(
      workflow.run({ organizationId: "org-id" })
    ).resolves.toBe("executed");
    expect(workflow.authProvider.authorize).not.toHaveBeenCalled();
  });
});

class PolicyScript {
  readonly authProvider = createAuthProvider();

  @Policy<{ organizationId: string }, PolicyScript>({
    resource: "org.applications",
    action: "write",
    organizationId: (_self, params) => params.organizationId,
  })
  async run(_params: { organizationId: string }): Promise<string> {
    return "executed";
  }
}

class ExplicitSubjectPolicyScript {
  readonly authProvider = createAuthProvider(null);

  @Policy<{ organizationId: string }, ExplicitSubjectPolicyScript>({
    resource: "org.applications",
    action: "write",
    organizationId: (_self, params) => params.organizationId,
    subject: "explicit-user",
  })
  async run(_params: { organizationId: string }): Promise<string> {
    return "executed";
  }
}

class MultiPolicyWorkflow {
  readonly authProvider = createAuthProvider();

  @Policy<{ organizationId: string }>({
    resource: "org.stores",
    action: "read",
    organizationId: (_self, params) => params.organizationId,
  })
  @Policy<{ organizationId: string }>({
    resource: "org.roles",
    action: "update",
    organizationId: (_self, params) => params.organizationId,
  })
  async run(_params: { organizationId: string }): Promise<void> {}
}

class WorkflowEntrypoint {
  readonly authProvider = createAuthProvider();

  @Policy<{ organizationId: string }>({
    resource: "org.stores",
    action: "update",
    organizationId: (_self, params) => params.organizationId,
  })
  async run(_params: { organizationId: string }): Promise<string> {
    return "executed";
  }
}

Reflect.defineMetadata(
  WORKFLOW_METADATA_KEY,
  { name: "workflowEntrypoint" },
  WorkflowEntrypoint.prototype,
  "run"
);

function createAuthProvider(
  subject: string | null = "platform-user"
): AuthProvider & {
  authorize: jest.MockedFunction<(params: AuthorizeParams) => Promise<boolean>>;
} {
  return {
    subject,
    authorize: jest.fn(async (_params: AuthorizeParams) => true),
    authorizeProtectedResource: jest.fn(async () => true),
  };
}
