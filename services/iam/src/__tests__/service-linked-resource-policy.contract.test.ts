import { ServiceLinkedResourceAuthorizationError } from "@shopana/rbac";
import type { BrokerCallContext } from "@shopana/shared-kernel";
import { runWithContext } from "../context/index.js";
import { AuthProvider } from "../kernel/Authorizable.js";
import { BatchAuthorizeScript } from "../scripts/organization/BatchAuthorizeScript.js";
import { authorizeInputSchema } from "../scripts/organization/dto/AuthorizeDto.js";
import { batchAuthorizeInputSchema } from "../scripts/organization/dto/BatchAuthorizeDto.js";
import { protectedResourceAuthorizeInputSchema } from "../scripts/organization/dto/ProtectedResourceAuthorizeDto.js";

const protectedApplication = Object.freeze({
  organizationId: "018f8f6d-7980-7000-9000-000000000001",
  resourceKind: "application",
  resourceId: "018f8f6d-7980-7000-9000-000000000010",
});

const protectedApplicationWithOwner = Object.freeze({
  ...protectedApplication,
  ownerType: "store",
  ownerId: "018f8f6d-7980-7000-9000-000000000020",
});

const linkedOwner = Object.freeze({
  ...protectedApplication,
  linkedService: "project",
  linkedOwnerType: "store",
  linkedOwnerId: protectedApplicationWithOwner.ownerId,
});

describe("separate RBAC and protected-resource authorization contracts", () => {
  it("rejects protectedResource in the RBAC authorize input", () => {
    expect(() =>
      authorizeInputSchema.parse({
        subject: "platform-user",
        organizationId: protectedApplication.organizationId,
        domain: "org",
        resource: "org.applications",
        action: "write",
        protectedResource: protectedApplication,
      })
    ).toThrow();
  });

  it("rejects protectedResource in the RBAC batch input", () => {
    expect(() =>
      batchAuthorizeInputSchema.parse({
        organizationId: protectedApplication.organizationId,
        requests: [
          {
            userId: "platform-user",
            domain: "org",
            resource: "org.applications",
            action: "write",
            protectedResource: protectedApplication,
          },
        ],
      })
    ).toThrow();
  });

  it("accepts generic and owner-aware protected-resource inputs", () => {
    expect(
      protectedResourceAuthorizeInputSchema.parse({
        protectedResource: protectedApplication,
      }).protectedResource
    ).toEqual(protectedApplication);
    expect(
      protectedResourceAuthorizeInputSchema.parse({
        protectedResource: protectedApplicationWithOwner,
      }).protectedResource
    ).toEqual(protectedApplicationWithOwner);
  });

  it.each([
    { ownerType: "store" },
    { ownerId: protectedApplicationWithOwner.ownerId },
  ])("rejects an incomplete protected-resource owner claim", (owner) => {
    expect(() =>
      protectedResourceAuthorizeInputSchema.parse({
        protectedResource: { ...protectedApplication, ...owner },
      })
    ).toThrow();
  });

  it("keeps RBAC authorization independent from service-linked bindings", async () => {
    const services = createServices({
      bindingByResource: linkedOwner,
      casbinAllowed: true,
    });

    await expect(authorizeRbac(services)).resolves.toBe(true);
    expect(
      services.repository.serviceLinkedResource.findActiveByResource
    ).not.toHaveBeenCalled();
  });

  it("keeps batch RBAC authorization independent from service-linked bindings", async () => {
    const services = createServices({ batchCasbinResults: [true] });

    await expect(runBatchAuthorize(services)).resolves.toEqual({
      results: [true],
    });
    expect(
      services.repository.serviceLinkedResource.findActiveByResources
    ).not.toHaveBeenCalled();
  });

  it("allows an unbound admin-managed protected resource", async () => {
    const services = createServices({
      managementMode: "organization",
      bindingByResource: null,
    });

    await expect(
      authorizeProtectedResource(services, protectedApplication)
    ).resolves.toBe(true);
  });

  it("denies a service-linked resource when its binding is missing", async () => {
    const services = createServices({
      managementMode: "service",
      bindingByResource: null,
    });

    await expect(
      authorizeProtectedResource(services, protectedApplication)
    ).resolves.toBe(false);
  });

  it("denies an admin-managed resource with an unexpected binding", async () => {
    const services = createServices({
      managementMode: "organization",
      bindingByResource: linkedOwner,
    });

    await expect(
      authorizeProtectedResource(services, protectedApplication)
    ).resolves.toBe(false);
  });

  it("denies generic Admin access to a service-linked resource", async () => {
    const services = createServices({
      managementMode: "service",
      bindingByResource: linkedOwner,
    });

    await expect(
      authorizeProtectedResource(services, protectedApplication)
    ).rejects.toBeInstanceOf(ServiceLinkedResourceAuthorizationError);
  });

  it("allows the linked service with the matching owner type and ID", async () => {
    const services = createServices({
      managementMode: "service",
      bindingByResource: linkedOwner,
    });

    await expect(
      authorizeProtectedResource(
        services,
        protectedApplicationWithOwner,
        { caller: { kind: "action", service: "project" } }
      )
    ).resolves.toBe(true);
  });

  it.each([
    {
      resource: {
        ...protectedApplicationWithOwner,
        ownerType: "organization",
      },
      callerService: "project",
    },
    {
      resource: {
        ...protectedApplicationWithOwner,
        ownerId: "018f8f6d-7980-7000-9000-000000000021",
      },
      callerService: "project",
    },
    {
      resource: protectedApplicationWithOwner,
      callerService: "catalog",
    },
  ])("denies a mismatched linked-service claim", async ({ resource, callerService }) => {
    const services = createServices({
      managementMode: "service",
      bindingByResource: linkedOwner,
    });

    await expect(
      authorizeProtectedResource(services, resource, {
        caller: { kind: "action", service: callerService },
      })
    ).rejects.toBeInstanceOf(ServiceLinkedResourceAuthorizationError);
  });
});

function authorizeRbac(services: ReturnType<typeof createServices>) {
  return withIamContext(services, undefined, () =>
    new AuthProvider().authorize({
      subject: "platform-user",
      organizationId: protectedApplication.organizationId,
      domain: "org",
      resource: "org.applications",
      action: "write",
    })
  );
}

function authorizeProtectedResource(
  services: ReturnType<typeof createServices>,
  protectedResource:
    | typeof protectedApplication
    | typeof protectedApplicationWithOwner,
  brokerCallContext?: BrokerCallContext
) {
  return withIamContext(services, brokerCallContext, () =>
    new AuthProvider().authorizeProtectedResource({
      protectedResource,
    })
  );
}

function runBatchAuthorize(services: ReturnType<typeof createServices>) {
  return withIamContext(services, undefined, () =>
    new BatchAuthorizeScript(services as never).run({
      organizationId: protectedApplication.organizationId,
      requests: [
        {
          userId: "platform-user",
          domain: "org",
          resource: "org.applications",
          action: "write",
        },
      ],
    })
  );
}

function withIamContext<T>(
  services: ReturnType<typeof createServices>,
  brokerCallContext: BrokerCallContext | undefined,
  operation: () => Promise<T>
) {
  return runWithContext(
    {
      requestId: "test-request",
      kernel: { getServices: () => services },
      currentUser: {
        id: "platform-user",
        data: null,
        sessionId: null,
      },
      loaders: {},
      requestHeaders: {},
      brokerCallContext,
    } as never,
    operation
  );
}

function createServices(input: {
  managementMode?: "organization" | "service" | null;
  bindingByResource?: typeof linkedOwner | null;
  casbinAllowed?: boolean;
  batchCasbinResults?: boolean[];
}) {
  return {
    repository: {
      user: {
        isAdmin: jest.fn().mockResolvedValue(false),
        findAdminUserIds: jest.fn().mockResolvedValue([]),
      },
      organization: {
        isOwner: jest.fn().mockResolvedValue(false),
        findOwner: jest.fn().mockResolvedValue(null),
      },
      casbin: {
        enforce: jest.fn().mockResolvedValue(input.casbinAllowed ?? false),
        batchEnforce: jest
          .fn()
          .mockResolvedValue(input.batchCasbinResults ?? []),
      },
      serviceLinkedResource: {
        findManagementMode: jest
          .fn()
          .mockResolvedValue(input.managementMode ?? "organization"),
        findActiveByResource: jest
          .fn()
          .mockResolvedValue(input.bindingByResource ?? null),
        findActiveByResources: jest.fn().mockResolvedValue([]),
      },
    },
    nameResolver: {
      resolveOrganizationId: jest.fn(),
    },
    logger: {
      error: jest.fn(),
    },
  };
}
