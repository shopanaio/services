import { describe, expect, it } from "@jest/globals";
import {
  AdminContextAuthorizer,
  adminContextAllows,
  authorizeAdminContext,
  type AdminAuthorizationContext,
} from "../index.js";

const ORGANIZATION_ID = "organization-1";
const STORE_ID = "550e8400-e29b-41d4-a716-446655440000";

function createContext(
  overrides: Partial<AdminAuthorizationContext> = {},
): AdminAuthorizationContext {
  return {
    user: { id: "user-1" },
    organizationId: ORGANIZATION_ID,
    store: {
      id: STORE_ID,
      organizationId: ORGANIZATION_ID,
    },
    permissions: [
      {
        domain: `store:${STORE_ID}`,
        resource: "store.profile",
        action: "read",
      },
    ],
    isSiteAdmin: false,
    isOrganizationOwner: false,
    ...overrides,
  };
}

describe("Admin Context authorization", () => {
  it("allows an exact permission bound to subject, organization and store", () => {
    expect(
      authorizeAdminContext(createContext(), {
        subject: "user-1",
        organizationId: ORGANIZATION_ID,
        domain: `store:${STORE_ID}`,
        resource: "store.profile",
        action: "read",
      }),
    ).toBe(true);
  });

  it("rejects a different subject, organization or selected store", () => {
    const context = createContext();
    const base = {
      subject: "user-1",
      organizationId: ORGANIZATION_ID,
      domain: `store:${STORE_ID}`,
      resource: "store.profile",
      action: "read",
    } as const;

    expect(authorizeAdminContext(context, { ...base, subject: "user-2" })).toBe(false);
    expect(
      authorizeAdminContext(context, {
        ...base,
        organizationId: "organization-2",
      }),
    ).toBe(false);
    expect(
      authorizeAdminContext(context, {
        ...base,
        domain: "store:7f4fba87-ff62-45ff-b9e8-936ef8b69dce",
      }),
    ).toBe(false);
  });

  it("rejects organization names because the snapshot cannot resolve them", () => {
    expect(
      authorizeAdminContext(createContext(), {
        subject: "user-1",
        organizationId: ORGANIZATION_ID,
        organizationName: "another-organization",
        domain: "org",
        resource: "org.profile",
        action: "read",
      }),
    ).toBe(false);
  });

  it("rejects an internally inconsistent store binding", () => {
    expect(
      authorizeAdminContext(
        createContext({
          store: {
            id: STORE_ID,
            organizationId: "organization-2",
          },
        }),
        {
          subject: "user-1",
          organizationId: ORGANIZATION_ID,
          domain: `store:${STORE_ID}`,
          resource: "store.profile",
          action: "read",
        },
      ),
    ).toBe(false);
  });

  it("validates permission shape before applying admin bypasses", () => {
    const context = createContext({ isSiteAdmin: true });

    expect(
      adminContextAllows(context, {
        domain: "invalid",
        resource: "store.profile",
        action: "read",
      }),
    ).toBe(false);
    expect(
      adminContextAllows(context, {
        domain: "org",
        resource: "org.profile",
        action: "read",
      }),
    ).toBe(true);
  });

  it("exposes the same decision through the shared Authorizer contract", async () => {
    const authorizer = new AdminContextAuthorizer(createContext());

    await expect(
      authorizer.authorize({
        subject: "user-1",
        organizationId: ORGANIZATION_ID,
        domain: `store:${STORE_ID}`,
        resource: "store.profile",
        action: "read",
      }),
    ).resolves.toBe(true);
  });
});
