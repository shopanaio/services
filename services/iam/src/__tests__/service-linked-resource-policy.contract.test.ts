import { ServiceLinkedResourceAuthorizationError } from "@shopana/rbac";
import { runWithContext } from "../context/index.js";
import { AuthProvider } from "../kernel/Authorizable.js";
import { authorizeInputSchema } from "../scripts/organization/dto/AuthorizeDto.js";

const protectedApplication = Object.freeze({
  organizationId: "018f8f6d-7980-7000-9000-000000000001",
  resourceKind: "application",
  resourceId: "018f8f6d-7980-7000-9000-000000000010",
});

const linkedOwner = Object.freeze({
  ...protectedApplication,
  linkedService: "project",
  linkedOwnerType: "store",
  linkedOwnerId: "018f8f6d-7980-7000-9000-000000000020",
});

describe("service-linked resource authorization contract", () => {
  it("keeps service-linked context in broker authorize input", () => {
    const parsed = authorizeInputSchema.parse({
      subject: "platform-user",
      organizationId: protectedApplication.organizationId,
      domain: "org",
      resource: "org.applications",
      action: "write",
      protectedResource: protectedApplication,
      linkedOwner,
    });

    expect(parsed.protectedResource).toEqual(protectedApplication);
    expect(parsed.linkedOwner).toEqual(linkedOwner);
  });

  it("allows generic admin writes when the protected resource has no active binding", async () => {
    const services = createServices({
      bindingByResource: null,
      casbinAllowed: true,
    });

    await expect(authorizeWithServices(services, {
      protectedResource: protectedApplication,
    })).resolves.toBe(true);

    expect(services.repository.serviceLinkedResource.findActiveByResource)
      .toHaveBeenCalledWith(protectedApplication);
  });

  it("rejects generic admin writes with RESOURCE_SERVICE_LINKED when an active binding exists", async () => {
    const services = createServices({
      bindingByResource: linkedOwner,
      organizationOwner: true,
    });

    await expect(authorizeWithServices(services, {
      protectedResource: protectedApplication,
    })).rejects.toBeInstanceOf(ServiceLinkedResourceAuthorizationError);

    expect(services.repository.casbin.enforce).not.toHaveBeenCalled();
  });

  it("allows service-aware linked owner writes only when the full owner predicate matches", async () => {
    const services = createServices({
      bindingByLinkedOwner: linkedOwner,
      casbinAllowed: false,
    });

    await expect(authorizeWithServices(services, {
      linkedOwner,
    })).resolves.toBe(true);

    expect(services.repository.serviceLinkedResource.findActiveLinkedOwner)
      .toHaveBeenCalledWith(linkedOwner);
    expect(services.repository.casbin.enforce).not.toHaveBeenCalled();
  });

  it("denies linked-owner writes for unrelated RBAC resources", async () => {
    const services = createServices({
      bindingByLinkedOwner: linkedOwner,
      casbinAllowed: false,
    });

    await expect(authorizeWithServices(services, {
      linkedOwner,
      resource: "org.roles",
      action: "write",
    })).resolves.toBe(false);

    expect(services.repository.serviceLinkedResource.findActiveLinkedOwner)
      .not.toHaveBeenCalled();
    expect(services.repository.casbin.enforce).not.toHaveBeenCalled();
  });

  it("denies linked-owner writes when protected resource identity differs", async () => {
    const mismatchedLinkedOwner = {
      ...linkedOwner,
      resourceId: "018f8f6d-7980-7000-9000-000000000011",
    };
    const services = createServices({
      bindingByLinkedOwner: mismatchedLinkedOwner,
      casbinAllowed: false,
    });

    await expect(authorizeWithServices(services, {
      protectedResource: protectedApplication,
      linkedOwner: mismatchedLinkedOwner,
    })).resolves.toBe(false);

    expect(services.repository.serviceLinkedResource.findActiveLinkedOwner)
      .not.toHaveBeenCalled();
  });

  it("denies service-aware linked owner writes when the owner predicate does not match", async () => {
    const services = createServices({
      bindingByLinkedOwner: null,
      casbinAllowed: true,
    });

    await expect(authorizeWithServices(services, {
      linkedOwner: {
        ...linkedOwner,
        linkedOwnerId: "018f8f6d-7980-7000-9000-000000000021",
      },
    })).resolves.toBe(false);
  });

  it.todo("external service provisioning creates application and binding in one transaction");
  it.todo("Application.management exposes read-only service-linked metadata");
  it.todo("application and organization repositories stay free of service-linked imports");
});

function authorizeWithServices(
  services: ReturnType<typeof createServices>,
  context: {
    protectedResource?: typeof protectedApplication;
    linkedOwner?: typeof linkedOwner;
    resource?: string;
    action?: string;
  }
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
    } as never,
    () =>
      new AuthProvider().authorize({
        subject: "platform-user",
        organizationId: protectedApplication.organizationId,
        domain: "org",
        resource: context.resource ?? "org.applications",
        action: context.action ?? "write",
        ...context,
      })
  );
}

function createServices(input: {
  bindingByResource?: typeof linkedOwner | null;
  bindingByLinkedOwner?: typeof linkedOwner | null;
  casbinAllowed?: boolean;
  siteAdmin?: boolean;
  organizationOwner?: boolean;
}) {
  return {
    repository: {
      user: {
        isAdmin: jest.fn().mockResolvedValue(input.siteAdmin ?? false),
      },
      organization: {
        isOwner: jest.fn().mockResolvedValue(input.organizationOwner ?? false),
      },
      casbin: {
        enforce: jest.fn().mockResolvedValue(input.casbinAllowed ?? false),
      },
      serviceLinkedResource: {
        findActiveByResource: jest
          .fn()
          .mockResolvedValue(input.bindingByResource ?? null),
        findActiveLinkedOwner: jest
          .fn()
          .mockResolvedValue(input.bindingByLinkedOwner ?? null),
      },
    },
    nameResolver: {
      resolveOrganizationId: jest.fn(),
    },
  };
}
