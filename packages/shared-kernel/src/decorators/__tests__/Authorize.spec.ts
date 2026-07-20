import type { AuthProvider, AuthorizeParams } from "@shopana/rbac";
import { Policy } from "../Authorize.js";

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

function createAuthProvider(): AuthProvider & {
  authorize: jest.MockedFunction<(params: AuthorizeParams) => Promise<boolean>>;
} {
  return {
    subject: "platform-user",
    authorize: jest.fn(async (_params: AuthorizeParams) => true),
    authorizeProtectedResource: jest.fn(async () => true),
  };
}
