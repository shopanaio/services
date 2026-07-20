import type {
  AuthProvider,
  AuthorizeParams,
  ProtectedResourceRef,
} from "@shopana/rbac";
import { Policy } from "../Authorize.js";

const protectedApplication: ProtectedResourceRef & { ownerId: string } = {
  organizationId: "018f8f6d-7980-7000-9000-000000000001",
  resourceKind: "application",
  resourceId: "018f8f6d-7980-7000-9000-000000000010",
  ownerId: "018f8f6d-7980-7000-9000-000000000020",
};

describe("Policy protected resource contract", () => {
  it("fails closed when a required protected resource is missing", async () => {
    const script = new RequiredProtectedResourceScript(null);

    await expect(script.run()).rejects.toMatchObject({
      errors: [
        expect.objectContaining({ code: "PROTECTED_RESOURCE_REQUIRED" }),
      ],
    });
    expect(script.authProvider.authorize).not.toHaveBeenCalled();
  });

  it("passes a required protected resource to the authorization provider", async () => {
    const script = new RequiredProtectedResourceScript(protectedApplication);

    await expect(script.run()).resolves.toBe("executed");
    expect(script.authProvider.authorize).toHaveBeenCalledWith(
      expect.objectContaining({ protectedResource: protectedApplication })
    );
  });

  it("fails closed when a required protected resource owner is missing", async () => {
    const script = new RequiredProtectedResourceScript({
      organizationId: protectedApplication.organizationId,
      resourceKind: protectedApplication.resourceKind,
      resourceId: protectedApplication.resourceId,
    } as ProtectedResourceRef & { ownerId: string });

    await expect(script.run()).rejects.toMatchObject({
      errors: [
        expect.objectContaining({ code: "PROTECTED_RESOURCE_REQUIRED" }),
      ],
    });
    expect(script.authProvider.authorize).not.toHaveBeenCalled();
  });

  it("keeps collection-level policies valid without a protected resource", async () => {
    const script = new CollectionPolicyScript();

    await expect(script.run()).resolves.toBe("executed");
    expect(script.authProvider.authorize).toHaveBeenCalledWith(
      expect.objectContaining({ protectedResource: undefined })
    );
  });
});

class RequiredProtectedResourceScript {
  readonly authProvider = createAuthProvider();

  constructor(
    private readonly protectedResource:
      | (ProtectedResourceRef & { ownerId: string })
      | null
  ) {}

  @Policy<void, RequiredProtectedResourceScript>({
    resource: "org.applications",
    action: "write",
    organizationId: (self) =>
      self.protectedResource?.organizationId ??
      "018f8f6d-7980-7000-9000-000000000001",
    protectedResourceMode: "required",
    protectedResource: (self) => self.protectedResource,
  })
  async run(): Promise<string> {
    return "executed";
  }
}

class CollectionPolicyScript {
  readonly authProvider = createAuthProvider();

  @Policy<void, CollectionPolicyScript>({
    resource: "org.applications",
    action: "write",
    organizationId: "018f8f6d-7980-7000-9000-000000000001",
  })
  async run(): Promise<string> {
    return "executed";
  }
}

function createAuthProvider(): AuthProvider & {
  authorize: jest.MockedFunction<(params: AuthorizeParams) => Promise<boolean>>;
} {
  return {
    subject: "platform-user",
    authorize: jest.fn(async (_params: AuthorizeParams) => true),
  };
}
