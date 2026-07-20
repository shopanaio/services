import { ServiceLinkedResourceAuthorizationError } from "@shopana/rbac";
import {
  ActionRegistry,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { runWithContext } from "../context/index.js";
import { AuthProvider } from "../kernel/Authorizable.js";
import { AuthorizeScript } from "../scripts/organization/AuthorizeScript.js";
import { BatchAuthorizeScript } from "../scripts/organization/BatchAuthorizeScript.js";
import { authorizeInputSchema } from "../scripts/organization/dto/AuthorizeDto.js";
import { batchAuthorizeInputSchema } from "../scripts/organization/dto/BatchAuthorizeDto.js";

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

describe("service-linked resource authorization contract", () => {
  it("keeps protected resource context in broker authorize input", () => {
    const parsed = authorizeInputSchema.parse({
      subject: "platform-user",
      organizationId: protectedApplication.organizationId,
      domain: "org",
      resource: "org.applications",
      action: "write",
      protectedResource: protectedApplication,
    });

    expect(parsed.protectedResource).toEqual(protectedApplication);
  });

  it("keeps protected resource owner in broker authorize input", () => {
    const parsed = authorizeInputSchema.parse({
      subject: "platform-user",
      organizationId: protectedApplication.organizationId,
      domain: "org",
      resource: "org.applications",
      action: "write",
      protectedResource: protectedApplicationWithOwner,
    });

    expect(parsed.protectedResource).toEqual(protectedApplicationWithOwner);
  });

  it("rejects an invalid protected resource owner ID", () => {
    expect(() =>
      authorizeInputSchema.parse({
        subject: "platform-user",
        organizationId: protectedApplication.organizationId,
        domain: "org",
        resource: "org.applications",
        action: "write",
        protectedResource: {
          ...protectedApplication,
          ownerType: "store",
          ownerId: "not-a-uuid",
        },
      })
    ).toThrow();
  });

  it.each([
    { ownerType: "store" },
    { ownerId: protectedApplicationWithOwner.ownerId },
  ])("rejects an incomplete protected resource owner claim", (owner) => {
    expect(() =>
      authorizeInputSchema.parse({
        subject: "platform-user",
        organizationId: protectedApplication.organizationId,
        domain: "org",
        resource: "org.applications",
        action: "write",
        protectedResource: { ...protectedApplication, ...owner },
      })
    ).toThrow();
  });

  it("rejects linked-owner context in generic broker authorize input", () => {
    expect(() =>
      authorizeInputSchema.parse({
        subject: "platform-user",
        organizationId: protectedApplication.organizationId,
        domain: "org",
        resource: "org.applications",
        action: "write",
        protectedResource: protectedApplication,
        linkedOwner,
      })
    ).toThrow();
  });

  it("keeps protected resource context in broker batch authorize input", () => {
    const parsed = batchAuthorizeInputSchema.parse({
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
    });

    expect(parsed.requests[0]?.protectedResource).toEqual(protectedApplication);
  });

  it("rejects an incomplete protected resource owner claim in batch input", () => {
    expect(() =>
      batchAuthorizeInputSchema.parse({
        organizationId: protectedApplication.organizationId,
        requests: [
          {
            userId: "platform-user",
            domain: "org",
            resource: "org.applications",
            action: "write",
            protectedResource: {
              ...protectedApplication,
              ownerId: protectedApplicationWithOwner.ownerId,
            },
          },
        ],
      })
    ).toThrow();
  });

  it("rejects linked-owner context in generic broker batch authorize input", () => {
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
            linkedOwner,
          },
        ],
      })
    ).toThrow();
  });

  it("denies active service-linked resources through one bulk batch decision", async () => {
    const services = createServices({
      batchCasbinResults: [true, true],
      bindingsByResources: [linkedOwner],
    });

    await expect(
      runBatchAuthorizeScriptWithServices(services)
    ).resolves.toEqual({ results: [false, true] });

    expect(services.repository.casbin.batchEnforce).toHaveBeenCalledTimes(1);
    expect(
      services.repository.serviceLinkedResource.findActiveByResources
    ).toHaveBeenCalledWith([protectedApplication]);
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

  it("returns typed service-linked denial through broker authorize script", async () => {
    const services = createServices({
      bindingByResource: linkedOwner,
      organizationOwner: true,
    });

    await expect(runAuthorizeScriptWithServices(services, {
      protectedResource: protectedApplication,
    })).resolves.toMatchObject({
      allowed: false,
      deniedCode: "RESOURCE_SERVICE_LINKED",
      serviceLinkedDetails: linkedOwner,
    });

    expect(services.logger.error).not.toHaveBeenCalled();
  });

  it("denies matching linked-service writes when user RBAC denies", async () => {
    const services = createServices({
      bindingByResource: linkedOwner,
      casbinAllowed: false,
    });

    await expect(
      authorizeWithBrokerCaller(services, "project", {
        protectedResource: protectedApplicationWithOwner,
      })
    ).resolves.toBe(false);

    expect(services.repository.serviceLinkedResource.findActiveByResource)
      .not.toHaveBeenCalled();
    expect(services.repository.casbin.enforce).toHaveBeenCalledTimes(1);
  });

  it(
    "allows linked-service writes when both caller and user RBAC match",
    async () => {
      const services = createServices({
        bindingByResource: linkedOwner,
        casbinAllowed: true,
      });

      await expect(
        authorizeWithBrokerCaller(services, "project", {
          protectedResource: protectedApplicationWithOwner,
        })
      ).resolves.toBe(true);

      expect(services.repository.casbin.enforce).toHaveBeenCalledTimes(1);
      expect(services.repository.serviceLinkedResource.findActiveByResource)
        .toHaveBeenCalledWith(protectedApplicationWithOwner);
    }
  );

  it("allows matching event writes when user RBAC also matches", async () => {
    const services = createServices({
      bindingByResource: linkedOwner,
      casbinAllowed: true,
    });

    await expect(
      authorizeWithEventCaller(services, "project", {
        protectedResource: protectedApplicationWithOwner,
      })
    ).resolves.toBe(true);

    expect(services.repository.casbin.enforce).toHaveBeenCalledTimes(1);
  });

  it("denies a matching service when protected resource owner ID is missing", async () => {
    const services = createServices({
      bindingByResource: linkedOwner,
      casbinAllowed: true,
    });

    await expect(
      authorizeWithServices(
        services,
        { protectedResource: protectedApplication },
        { caller: { kind: "action", service: "project" } },
      )
    ).rejects.toBeInstanceOf(ServiceLinkedResourceAuthorizationError);
  });

  it("denies matching linked-service batch writes when user RBAC denies", async () => {
    const services = createServices({
      batchCasbinResults: [false, true],
      bindingsByResources: [linkedOwner],
    });

    await expect(
      runBatchAuthorizeScriptWithServices(services, "project")
    ).resolves.toEqual({ results: [false, true] });
  });

  it("denies matching linked-service batch writes when the owner type differs", async () => {
    const services = createServices({
      batchCasbinResults: [true, true],
      bindingsByResources: [linkedOwner],
    });

    await expect(
      runBatchAuthorizeScriptWithServices(services, "project", {
        ...protectedApplicationWithOwner,
        ownerType: "organization",
      })
    ).resolves.toEqual({ results: [false, true] });
  });

  it("denies a different broker caller for a service-linked resource", async () => {
    const services = createServices({
      bindingByResource: linkedOwner,
      casbinAllowed: true,
    });

    await expect(
      authorizeWithBrokerCaller(services, "catalog", {
        protectedResource: protectedApplicationWithOwner,
      })
    ).rejects.toBeInstanceOf(ServiceLinkedResourceAuthorizationError);
    expect(services.repository.casbin.enforce).toHaveBeenCalledTimes(1);
  });

  it("denies a matching service when the protected resource owner differs", async () => {
    const services = createServices({
      bindingByResource: linkedOwner,
      casbinAllowed: true,
    });

    await expect(
      authorizeWithBrokerCaller(services, "project", {
        protectedResource: {
          ...protectedApplicationWithOwner,
          ownerId: "018f8f6d-7980-7000-9000-000000000021",
        },
      })
    ).rejects.toBeInstanceOf(ServiceLinkedResourceAuthorizationError);
  });

  it("denies a matching service when the protected resource owner type differs", async () => {
    const services = createServices({
      bindingByResource: linkedOwner,
      casbinAllowed: true,
    });

    await expect(
      authorizeWithBrokerCaller(services, "project", {
        protectedResource: {
          ...protectedApplicationWithOwner,
          ownerType: "organization",
        },
      })
    ).rejects.toBeInstanceOf(ServiceLinkedResourceAuthorizationError);
  });

  it("denies linked-service writes for unrelated RBAC resources", async () => {
    const services = createServices({
      bindingByResource: linkedOwner,
      casbinAllowed: true,
    });

    await expect(
      authorizeWithBrokerCaller(services, "project", {
        protectedResource: protectedApplicationWithOwner,
        resource: "org.roles",
      })
    ).rejects.toBeInstanceOf(ServiceLinkedResourceAuthorizationError);
    expect(services.repository.casbin.enforce).toHaveBeenCalledTimes(1);
  });

  it.todo("external service provisioning creates application and binding in one transaction");
  it.todo("Application.management exposes read-only service-linked metadata");
  it.todo("application and organization repositories stay free of service-linked imports");
});

function authorizeWithServices(
  services: ReturnType<typeof createServices>,
  context: {
    protectedResource?:
      | typeof protectedApplication
      | typeof protectedApplicationWithOwner;
    resource?: string;
    action?: string;
  },
  brokerCallContext?: BrokerCallContext,
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

function authorizeWithBrokerCaller(
  services: ReturnType<typeof createServices>,
  callerService: string,
  context: {
    protectedResource: typeof protectedApplicationWithOwner;
    resource?: string;
    action?: string;
  }
) {
  const registry = new ActionRegistry();
  const iamBroker = new ServiceBroker(registry, { serviceName: "iam" });
  const callerBroker = new ServiceBroker(registry, {
    serviceName: callerService,
  });
  iamBroker.register("authorizeForTest", (_params, brokerCallContext) =>
    authorizeWithServices(services, context, brokerCallContext)
  );

  return callerBroker.call<boolean>("iam.authorizeForTest");
}

function authorizeWithEventCaller(
  services: ReturnType<typeof createServices>,
  producerService: string,
  context: {
    protectedResource: typeof protectedApplicationWithOwner;
    resource?: string;
    action?: string;
  }
) {
  const registry = new ActionRegistry();
  const iamBroker = new ServiceBroker(registry, { serviceName: "iam" });
  const eventsBroker = new ServiceBroker(registry, { serviceName: "events" });
  iamBroker.register("authorizeForTest", (_params, brokerCallContext) =>
    authorizeWithServices(services, context, brokerCallContext)
  );

  return eventsBroker.callEvent<boolean, undefined>(
    "iam.authorizeForTest",
    undefined,
    producerService
  );
}

function runAuthorizeScriptWithServices(
  services: ReturnType<typeof createServices>,
  context: {
    protectedResource?: typeof protectedApplication;
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
      new AuthorizeScript(services as never).run({
        subject: "platform-user",
        organizationId: protectedApplication.organizationId,
        domain: "org",
        resource: "org.applications",
        action: "write",
        ...context,
      })
  );
}

function runBatchAuthorizeScriptWithServices(
  services: ReturnType<typeof createServices>,
  callerService?: string,
  protectedResourceWithOwner: typeof protectedApplicationWithOwner =
    protectedApplicationWithOwner
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
      brokerCallContext: callerService
        ? { caller: { kind: "action", service: callerService } }
        : undefined,
    } as never,
    () =>
      new BatchAuthorizeScript(services as never).run({
        organizationId: protectedApplication.organizationId,
        requests: [
          {
            userId: "platform-user",
            domain: "org",
            resource: "org.applications",
            action: "write",
            protectedResource: callerService
              ? protectedResourceWithOwner
              : protectedApplication,
          },
          {
            userId: "platform-user",
            domain: "org",
            resource: "org.roles",
            action: "read",
          },
        ],
      } as never)
  );
}

function createServices(input: {
  bindingByResource?: typeof linkedOwner | null;
  casbinAllowed?: boolean;
  siteAdmin?: boolean;
  organizationOwner?: boolean;
  batchCasbinResults?: boolean[];
  bindingsByResources?: Array<typeof linkedOwner>;
}) {
  return {
    repository: {
      user: {
        isAdmin: jest.fn().mockResolvedValue(input.siteAdmin ?? false),
        findAdminUserIds: jest.fn().mockResolvedValue([]),
      },
      organization: {
        isOwner: jest.fn().mockResolvedValue(input.organizationOwner ?? false),
        findOwner: jest.fn().mockResolvedValue(
          input.organizationOwner ? { userId: "platform-user" } : null
        ),
      },
      casbin: {
        enforce: jest.fn().mockResolvedValue(input.casbinAllowed ?? false),
        batchEnforce: jest
          .fn()
          .mockResolvedValue(input.batchCasbinResults ?? []),
      },
      serviceLinkedResource: {
        findActiveByResource: jest
          .fn()
          .mockResolvedValue(input.bindingByResource ?? null),
        findActiveByResources: jest
          .fn()
          .mockResolvedValue(input.bindingsByResources ?? []),
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
