import type {
  AuthProvider,
  AuthorizeParams,
  ProtectedResourceAuthorizeParams,
} from "@shopana/rbac";
import { Policy } from "../Authorize.js";
import { ProtectedResource } from "../ProtectedResource.js";

const protectedApplication = {
  organizationId: "018f8f6d-7980-7000-9000-000000000001",
  resourceKind: "application",
  resourceId: "018f8f6d-7980-7000-9000-000000000010",
  ownerType: "store",
  ownerId: "018f8f6d-7980-7000-9000-000000000020",
};

describe("ProtectedResource contract", () => {
  it("passes only protected-resource context to its provider", async () => {
    const boundary = new ProtectedBoundary();

    await expect(boundary.run(protectedApplication)).resolves.toBe("executed");
    expect(
      boundary.authProvider.authorizeProtectedResource
    ).toHaveBeenCalledWith({
      protectedResource: protectedApplication,
    });
    expect(boundary.authProvider.authorize).not.toHaveBeenCalled();
  });

  it("allows generic admin references without an owner claim", async () => {
    const boundary = new ProtectedBoundary();

    await expect(
      boundary.run({
        organizationId: protectedApplication.organizationId,
        resourceKind: protectedApplication.resourceKind,
        resourceId: protectedApplication.resourceId,
      })
    ).resolves.toBe("executed");
  });

  it("fails closed for an incomplete owner claim", async () => {
    const boundary = new ProtectedBoundary();

    await expect(
      boundary.run({
        organizationId: protectedApplication.organizationId,
        resourceKind: protectedApplication.resourceKind,
        resourceId: protectedApplication.resourceId,
        ownerId: protectedApplication.ownerId,
      })
    ).rejects.toMatchObject({
      errors: [
        expect.objectContaining({ code: "PROTECTED_RESOURCE_REQUIRED" }),
      ],
    });
    expect(
      boundary.authProvider.authorizeProtectedResource
    ).not.toHaveBeenCalled();
  });

  it.each(["organizationId", "resourceKind", "resourceId"] as const)(
    "fails closed when %s is empty",
    async (field) => {
      const boundary = new ProtectedBoundary();

      await expect(
        boundary.run({ ...protectedApplication, [field]: " " })
      ).rejects.toMatchObject({
        errors: [
          expect.objectContaining({ code: "PROTECTED_RESOURCE_REQUIRED" }),
        ],
      });
      expect(
        boundary.authProvider.authorizeProtectedResource
      ).not.toHaveBeenCalled();
    }
  );

  it("composes after Policy so RBAC is checked first", async () => {
    const boundary = new CombinedBoundary();

    await expect(boundary.run(protectedApplication)).resolves.toBe("executed");
    expect(boundary.authProvider.authorize).toHaveBeenCalledTimes(1);
    expect(
      boundary.authProvider.authorizeProtectedResource
    ).toHaveBeenCalledTimes(1);
    expect(
      boundary.authProvider.authorize.mock.invocationCallOrder[0] ??
        Number.MAX_SAFE_INTEGER
    ).toBeLessThan(
      boundary.authProvider.authorizeProtectedResource.mock
        .invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
    );
  });
});

class ProtectedBoundary {
  readonly authProvider = createAuthProvider();

  @ProtectedResource<
    [ProtectedResourceAuthorizeParams["protectedResource"]],
    ProtectedBoundary
  >((resource) => resource)
  async run(
    _resource: ProtectedResourceAuthorizeParams["protectedResource"]
  ): Promise<string> {
    return "executed";
  }
}

class CombinedBoundary {
  readonly authProvider = createAuthProvider();

  @Policy<
    ProtectedResourceAuthorizeParams["protectedResource"],
    CombinedBoundary
  >({
    resource: "org.applications",
    action: "write",
    organizationId: (_self, resource) => resource.organizationId,
  })
  @ProtectedResource<
    [ProtectedResourceAuthorizeParams["protectedResource"]],
    CombinedBoundary
  >((resource) => resource)
  async run(
    _resource: ProtectedResourceAuthorizeParams["protectedResource"]
  ): Promise<string> {
    return "executed";
  }
}

function createAuthProvider(): AuthProvider & {
  authorize: jest.MockedFunction<
    (params: AuthorizeParams) => Promise<boolean>
  >;
  authorizeProtectedResource: jest.MockedFunction<
    (params: ProtectedResourceAuthorizeParams) => Promise<boolean>
  >;
} {
  return {
    subject: "platform-user",
    authorize: jest.fn(async (_params: AuthorizeParams) => true),
    authorizeProtectedResource: jest.fn(
      async (_params: ProtectedResourceAuthorizeParams) => true
    ),
  };
}
