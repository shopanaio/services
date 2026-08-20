import type { AuthProvider, AuthorizeParams } from "@shopana/rbac";
import { WORKFLOW_METADATA_KEY } from "@shopana/dbos";
import { authorizePolicies, authorizePoliciesWithIam, Policy } from "../Authorize.js";

describe("Policy RBAC contract", () => {
  it("passes only RBAC context to the authorization provider", async () => {
    const script = new PolicyScript();

    await expect(script.run({ organizationId: "org-id" })).resolves.toBe("executed");
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

    await expect(script.run({ organizationId: "org-id" })).resolves.toBe("executed");
    expect(script.authProvider.authorize).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "explicit-user" }),
    );
  });

  it("reports a missing subject without referring to workflow context", async () => {
    const script = new MissingSubjectPolicyScript();

    await expect(script.run({ organizationId: "org-id" })).rejects.toMatchObject({
      errors: [
        {
          code: "UNAUTHENTICATED",
          message: "Access denied: Subject is missing",
          field: null,
        },
      ],
    });
    expect(script.authProvider.authorize).not.toHaveBeenCalled();
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
        action: "write",
      }),
    );
    expect(workflow.authProvider.authorize).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        resource: "org.stores",
        action: "read",
      }),
    );
  });

  it("does not repeat a preflight policy inside DBOS execution", async () => {
    const workflow = new WorkflowEntrypoint();

    await expect(workflow.run({ organizationId: "org-id" })).resolves.toBe("executed");
    expect(workflow.authProvider.authorize).not.toHaveBeenCalled();
  });

  it("revalidates every workflow policy through iam.authorize on recovery", async () => {
    const workflow = new MultiPolicyWorkflow();
    const call = jest.fn(async (_action: string, _params?: unknown) => ({ allowed: true }));
    const broker = {
      call<TResult = unknown, TParams = unknown>(
        action: string,
        params?: TParams,
      ): Promise<TResult> {
        return call(action, params) as unknown as Promise<TResult>;
      },
    };

    await authorizePoliciesWithIam(
      workflow,
      "run",
      { organizationId: "org-id" },
      {
        authorization: {
          kind: "admin",
          subject: "platform-user",
          organizationId: "org-id",
        },
      },
      broker,
    );

    expect(call).toHaveBeenCalledTimes(2);
    expect(call).toHaveBeenCalledWith(
      "iam.authorize",
      expect.objectContaining({
        subject: "platform-user",
        organizationId: "org-id",
      }),
    );
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

class MissingSubjectPolicyScript {
  readonly authProvider = createAuthProvider(null);

  @Policy<{ organizationId: string }, MissingSubjectPolicyScript>({
    resource: "org.applications",
    action: "write",
    organizationId: (_self, params) => params.organizationId,
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
    action: "write",
    organizationId: (_self, params) => params.organizationId,
  })
  async run(_params: { organizationId: string }): Promise<void> {}
}

class WorkflowEntrypoint {
  readonly authProvider = createAuthProvider();

  @Policy<{ organizationId: string }>({
    resource: "org.stores",
    action: "write",
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
  "run",
);

function createAuthProvider(subject: string | null = "platform-user"): AuthProvider & {
  authorize: jest.MockedFunction<(params: AuthorizeParams) => Promise<boolean>>;
} {
  return {
    subject,
    authorize: jest.fn(async (_params: AuthorizeParams) => true),
    authorizeProtectedResource: jest.fn(async () => true),
  };
}
