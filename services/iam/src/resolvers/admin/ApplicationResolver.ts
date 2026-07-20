import {
  PreloadNotFoundError,
  SubgraphReference,
  TypeAuthorizationError,
} from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { ApplicationAdminRecord } from "../../repositories/ApplicationRepository.js";
import { ApplicationOAuthClientManagementError } from "../../services/ApplicationOAuthClientManagementService.js";
import { IAM_SERVICE_LINKED_RESOURCE_KIND } from "../../service-linked/resources.js";
import { IAMType } from "./IAMType.js";
import { ApplicationAuthConfigurationResolver } from "./ApplicationAuthResolver.js";
import {
  ApplicationOAuthClientConnectionResolver,
  mapApplicationOAuthClientConnectionInput,
} from "./ApplicationOAuthClientConnectionResolver.js";
import { ApplicationOAuthClientResolver } from "./ApplicationOAuthClientResolver.js";
import {
  ApplicationUserConnectionResolver,
  mapApplicationUserConnectionInput,
} from "./ApplicationUserConnectionResolver.js";
import { ApplicationUserResolver } from "./ApplicationUserResolver.js";

export interface ApplicationResolverInput {
  id: string;
  organizationId?: string | null;
  applicationsReadAuthorized?: boolean;
}

/** Application realm type resolver. */
@SubgraphReference((reference: { id: string }) => ({
  id: decodeGlobalIdByType(reference.id, GlobalIdEntity.Application),
}))
export class ApplicationResolver extends IAMType<
  ApplicationResolverInput,
  ApplicationAdminRecord
> {
  private applicationAuthReadAuthorization?: Promise<void>;

  async $preload() {
    const application = await this.$ctx.loaders.application.load({
      id: this.$props.id,
      organizationId: this.$props.organizationId,
    });
    if (!application) {
      throw new PreloadNotFoundError("Application not found");
    }
    if (!this.$props.applicationsReadAuthorized) {
      const authorized = await this.authProvider.authorize({
        organizationId: application.organizationId,
        domain: "org",
        resource: "org.applications",
        action: "read",
      });
      if (!authorized) {
        throw new PreloadNotFoundError("Application not found");
      }
    }
    return application;
  }

  id() {
    return encodeGlobalIdByType(this.$props.id, GlobalIdEntity.Application);
  }

  async organizationId() {
    return encodeGlobalIdByType(
      await this.$get("organizationId"),
      GlobalIdEntity.Organization
    );
  }

  async organization() {
    const { OrganizationResolver } = await import("./OrganizationResolver.js");
    return new OrganizationResolver(await this.$get("organizationId"), this.$ctx);
  }

  async name() {
    return this.$get("name");
  }

  async displayName() {
    return this.$get("displayName");
  }

  async description() {
    return this.$get("description");
  }

  async status() {
    return (await this.$get("status")).toUpperCase();
  }

  async resource() {
    await this.assertApplicationAuthReadAuthorized();
    return this.$get("resource");
  }

  async revision() {
    return this.$get("revision");
  }

  async management() {
    const binding = await this.$ctx.loaders.serviceLinkedResource.load({
      organizationId: await this.$get("organizationId"),
      resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
      resourceId: this.$props.id,
    });
    return new ResourceManagementResolver(
      binding
        ? {
            mode: "SERVICE_LINKED",
            linkedService: binding.linkedService,
            linkedOwnerType: binding.linkedOwnerType,
            linkedOwnerId: binding.linkedOwnerId,
            mutableFromOrganizationAdmin: false,
          }
        : {
            mode: "ADMIN",
            linkedService: null,
            linkedOwnerType: null,
            linkedOwnerId: null,
            mutableFromOrganizationAdmin: true,
          },
      this.$ctx
    );
  }

  async auth() {
    return new ApplicationAuthConfigurationResolver(
      {
        organizationId: await this.$get("organizationId"),
        applicationId: this.$props.id,
      },
      this.$ctx
    );
  }

  async oauthClient(args: { clientId: string }) {
    try {
      const client = await this.$ctx.kernel.applicationOAuthClientManagement.get(
        {
          organizationId: await this.$get("organizationId"),
          applicationId: this.$props.id,
          clientId: args.clientId,
        },
        this.adminActor()
      );
      return new ApplicationOAuthClientResolver(client, this.$ctx);
    } catch (error) {
      if (
        error instanceof ApplicationOAuthClientManagementError &&
        error.code === "OAUTH_CLIENT_NOT_FOUND"
      ) {
        return null;
      }
      throw error;
    }
  }

  async oauthClients(
    args: Parameters<typeof mapApplicationOAuthClientConnectionInput>[2]
  ) {
    return new ApplicationOAuthClientConnectionResolver(
      mapApplicationOAuthClientConnectionInput(
        await this.$get("organizationId"),
        this.$props.id,
        args
      ),
      this.$ctx
    );
  }

  async user(args: { id: string }) {
    return new ApplicationUserResolver(
      {
        organizationId: await this.$get("organizationId"),
        applicationId: this.$props.id,
        userId: decodeGlobalIdByType(args.id, GlobalIdEntity.ApplicationUser),
      },
      this.$ctx
    );
  }

  async users(args: Parameters<typeof mapApplicationUserConnectionInput>[2]) {
    return new ApplicationUserConnectionResolver(
      mapApplicationUserConnectionInput(
        await this.$get("organizationId"),
        this.$props.id,
        args
      ),
      this.$ctx
    );
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async archivedAt() {
    return this.$get("archivedAt");
  }

  private adminActor() {
    return {
      id: this.$ctx.currentUser?.id ?? "",
      requestId: this.$ctx.requestId,
    };
  }

  private assertApplicationAuthReadAuthorized(): Promise<void> {
    this.applicationAuthReadAuthorization ??= this.$get("organizationId")
      .then((organizationId) =>
        this.authProvider.authorize({
          organizationId,
          domain: "org",
          resource: "org.application-auth",
          action: "read",
        })
      )
      .then((authorized) => {
        if (!authorized) {
          throw new TypeAuthorizationError("org.application-auth", "read");
        }
      });
    return this.applicationAuthReadAuthorization;
  }
}

/** Application create payload resolver. */
interface ApplicationPayloadValue {
  application: ApplicationResolver | null;
  userErrors: readonly unknown[];
}

export class ApplicationCreatePayloadResolver extends IAMType<ApplicationPayloadValue> {
  application() {
    return this.$props.application;
  }

  userErrors() {
    return this.$props.userErrors;
  }
}

/** Application update payload resolver. */
export class ApplicationUpdatePayloadResolver extends IAMType<ApplicationPayloadValue> {
  application() {
    return this.$props.application;
  }

  userErrors() {
    return this.$props.userErrors;
  }
}

/** Application archive payload resolver. */
export class ApplicationArchivePayloadResolver extends IAMType<ApplicationPayloadValue> {
  application() {
    return this.$props.application;
  }

  userErrors() {
    return this.$props.userErrors;
  }
}

interface ResourceManagementValue {
  mode: "ADMIN" | "SERVICE_LINKED";
  linkedService: string | null;
  linkedOwnerType: string | null;
  linkedOwnerId: string | null;
  mutableFromOrganizationAdmin: boolean;
}

export class ResourceManagementResolver extends IAMType<ResourceManagementValue> {
  mode() {
    return this.$props.mode;
  }

  linkedService() {
    return this.$props.linkedService;
  }

  linkedOwnerType() {
    return this.$props.linkedOwnerType;
  }

  linkedOwnerId() {
    return this.$props.linkedOwnerId;
  }

  mutableFromOrganizationAdmin() {
    return this.$props.mutableFromOrganizationAdmin;
  }
}
