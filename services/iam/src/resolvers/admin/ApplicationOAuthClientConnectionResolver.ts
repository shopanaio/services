import type { ApplicationOAuthClientRelayInput } from "../../repositories/ApplicationOAuthClientRepository.js";
import type {
  ListOAuthClientsConnectionInput,
  OAuthClientConnection,
} from "../../services/ApplicationOAuthClientManagementService.js";
import { IAMType } from "./IAMType.js";
import { ApplicationOAuthClientResolver } from "./ApplicationOAuthClientResolver.js";

export type ApplicationOAuthClientConnectionResolverInput =
  ListOAuthClientsConnectionInput;

interface ApplicationOAuthClientConnectionGraphqlArgs {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: {
    search?: string | null;
    clientType?: readonly string[] | null;
    environment?: readonly string[] | null;
    disabled?: boolean | null;
    archived?: boolean | null;
  } | null;
  orderBy?: readonly {
    field: string;
    direction: "asc" | "desc";
  }[] | null;
}

/** ApplicationOAuthClientConnection resolver using the shared IAM Relay contract. */
export class ApplicationOAuthClientConnectionResolver extends IAMType<
  ApplicationOAuthClientConnectionResolverInput,
  OAuthClientConnection
> {
  async $preload() {
    return this.$ctx.kernel.applicationOAuthClientManagement.getConnection(
      this.$props,
      {
        id: this.$ctx.currentUser?.id ?? "",
        requestId: this.$ctx.requestId,
      }
    );
  }

  async edges() {
    return (await this.$get("edges")).map(({ cursor, client }) => ({
      cursor,
      node: new ApplicationOAuthClientResolver(client, this.$ctx),
    }));
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount() {
    return this.$get("totalCount");
  }
}

export function mapApplicationOAuthClientConnectionInput(
  organizationId: string,
  applicationId: string,
  args: ApplicationOAuthClientConnectionGraphqlArgs = {}
): ApplicationOAuthClientConnectionResolverInput {
  const filters: NonNullable<ApplicationOAuthClientRelayInput["where"]>[] = [];
  const search = args.where?.search?.trim();
  if (search) {
    filters.push({
      _or: [
        { name: { _containsi: search } },
        { clientId: { _containsi: search } },
      ],
    });
  }
  const clientTypes = [...new Set(args.where?.clientType ?? [])];
  if (clientTypes.length === 1) {
    filters.push({ public: { _eq: clientTypes[0] === "PUBLIC" } });
  }
  const environments = [...new Set(args.where?.environment ?? [])];
  if (environments.length > 0) {
    filters.push({
      environment: {
        _in: environments.map((environment) => environment.toLowerCase()),
      },
    });
  }
  if (args.where?.disabled != null) {
    filters.push({ disabled: { _eq: args.where.disabled } });
  }
  filters.push({
    deletedAt:
      args.where?.archived === true ? { _isNot: null } : { _is: null },
  });

  return {
    organizationId,
    applicationId,
    first: args.first ?? undefined,
    after: args.after ?? undefined,
    last: args.last ?? undefined,
    before: args.before ?? undefined,
    where: { _and: filters },
    orderBy:
      args.orderBy?.map(({ field, direction }) => ({
        field: mapApplicationOAuthClientOrderField(field),
        direction,
      })) ?? undefined,
  };
}

function mapApplicationOAuthClientOrderField(
  field: string
): "name" | "createdAt" | "updatedAt" {
  switch (field) {
    case "NAME":
      return "name";
    case "CREATED_AT":
      return "createdAt";
    case "UPDATED_AT":
      return "updatedAt";
    default:
      throw new Error("Application OAuth client order field is invalid");
  }
}
