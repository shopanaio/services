import { describe, expect, it, vi } from "vitest";
import type { AuthorizeParams } from "@shopana/rbac";
import { TypePolicy } from "./decorator.js";
import { TypeAuthorizationConfigurationError, TypeAuthorizationError } from "./error.js";
import { createAuthorizationMiddleware } from "./middleware.js";

function createPolicyType(onDeny: "throw" | "null" = "throw") {
  class PolicyType {}

  TypePolicy({
    resource: "store.profile",
    action: "read",
    organizationId: "organization-1",
    domain: "store:store-1",
    subject: "user-1",
    onDeny,
  })(PolicyType);

  return PolicyType;
}

async function authorize(Type: new () => object, instance: object): Promise<void | null> {
  const middleware = createAuthorizationMiddleware();
  return middleware.afterCreate?.({
    Type,
    instance,
    value: undefined,
    ctx: undefined,
  });
}

describe("createAuthorizationMiddleware", () => {
  it("authorizes through the shared Authorizer capability", async () => {
    const Type = createPolicyType();
    const authorizeCall = vi.fn(async (_params: AuthorizeParams): Promise<boolean> => true);

    await expect(
      authorize(Type, {
        authProvider: {
          authorize: authorizeCall,
        },
      }),
    ).resolves.toBeUndefined();

    expect(authorizeCall).toHaveBeenCalledWith({
      resource: "store.profile",
      action: "read",
      organizationId: "organization-1",
      domain: "store:store-1",
      subject: "user-1",
    });
  });

  it("returns null when authorization is denied with onDeny null", async () => {
    const Type = createPolicyType("null");

    await expect(
      authorize(Type, {
        authProvider: {
          authorize: async () => false,
        },
      }),
    ).resolves.toBeNull();
  });

  it("throws TypeAuthorizationError when authorization is denied", async () => {
    const Type = createPolicyType();

    await expect(
      authorize(Type, {
        authProvider: {
          authorize: async () => false,
        },
      }),
    ).rejects.toBeInstanceOf(TypeAuthorizationError);
  });

  it("fails closed when a policy type has no authorizer", async () => {
    const Type = createPolicyType("null");

    await expect(authorize(Type, {})).rejects.toBeInstanceOf(TypeAuthorizationConfigurationError);
  });

  it("does not require an authorizer when the type has no policy", async () => {
    class PublicType {}

    await expect(authorize(PublicType, {})).resolves.toBeUndefined();
  });
});
