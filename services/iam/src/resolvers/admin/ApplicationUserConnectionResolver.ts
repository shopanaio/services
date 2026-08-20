import { PreloadNotFoundError, TypePolicy } from "@shopana/type-resolver";
import type { ApplicationUserRelayInput } from "../../repositories/application-user/ApplicationUserRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";
import { ApplicationUserResolver } from "./ApplicationUserResolver.js";

export interface ApplicationUserConnectionResolverInput extends ApplicationUserRelayInput {
  organizationId: string;
  applicationId: string;
}

interface ApplicationUserConnectionGraphqlArgs {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: {
    search?: string | null;
    status?: readonly string[] | null;
    emailVerified?: boolean | null;
  } | null;
  orderBy?:
    | readonly {
        field: string;
        direction: "asc" | "desc";
      }[]
    | null;
}

/** ApplicationUserConnection resolver using the shared IAM Relay contract. */
@TypePolicy<ApplicationUserConnectionResolver>({
  organizationId: (resolver) => resolver.$props.organizationId,
  domain: "org",
  resource: "org.application-users",
  action: "read",
})
export class ApplicationUserConnectionResolver extends BaseConnectionResolver<ApplicationUserConnectionResolverInput> {
  async $preload(): Promise<ConnectionData> {
    const application = await this.$ctx.loaders.application.load({
      id: this.$props.applicationId,
      organizationId: this.$props.organizationId,
    });
    if (!application) {
      throw new PreloadNotFoundError("Application not found");
    }
    const { organizationId: _organizationId, applicationId, ...relayInput } = this.$props;
    return this.$ctx.kernel.repository.applicationUser
      .forApplication(applicationId)
      .getConnection(relayInput);
  }

  protected createNodeResolver(nodeId: string) {
    return new ApplicationUserResolver(
      {
        organizationId: this.$props.organizationId,
        applicationId: this.$props.applicationId,
        userId: nodeId,
        applicationUsersReadAuthorized: true,
      },
      this.$ctx,
    );
  }
}

export function mapApplicationUserConnectionInput(
  organizationId: string,
  applicationId: string,
  args: ApplicationUserConnectionGraphqlArgs = {},
): ApplicationUserConnectionResolverInput {
  const filters: NonNullable<ApplicationUserRelayInput["where"]>[] = [];
  const search = args.where?.search?.trim();
  if (search) {
    filters.push({
      _or: [
        { name: { _containsi: search } },
        { firstName: { _containsi: search } },
        { lastName: { _containsi: search } },
        { email: { _containsi: search } },
      ],
    });
  }
  const statuses = [...new Set(args.where?.status ?? [])];
  if (statuses.length > 0) {
    filters.push({
      status: { _in: statuses.map((status) => status.toLowerCase()) },
    });
  }
  if (args.where?.emailVerified != null) {
    filters.push({ emailVerified: { _eq: args.where.emailVerified } });
  }

  return {
    organizationId,
    applicationId,
    first: args.first ?? undefined,
    after: args.after ?? undefined,
    last: args.last ?? undefined,
    before: args.before ?? undefined,
    where: filters.length > 0 ? { _and: filters } : undefined,
    orderBy:
      args.orderBy?.map(({ field, direction }) => ({
        field: mapApplicationUserOrderField(field),
        direction,
      })) ?? undefined,
  };
}

function mapApplicationUserOrderField(field: string): "name" | "email" | "createdAt" | "updatedAt" {
  switch (field) {
    case "NAME":
      return "name";
    case "EMAIL":
      return "email";
    case "CREATED_AT":
      return "createdAt";
    case "UPDATED_AT":
      return "updatedAt";
    default:
      throw new Error("Application user order field is invalid");
  }
}
