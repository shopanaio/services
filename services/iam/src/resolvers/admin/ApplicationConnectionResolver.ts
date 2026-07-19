import { TypePolicy } from "@shopana/type-resolver";
import type {
  ApplicationConnectionInput,
  ApplicationRelayInput,
} from "../../repositories/ApplicationRepository.js";
import { ApplicationResolver } from "./ApplicationResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type ApplicationConnectionResolverInput = ApplicationConnectionInput;

interface ApplicationConnectionGraphqlArgs {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: {
    search?: string | null;
    status?: readonly string[] | null;
  } | null;
  orderBy?: readonly {
    field: string;
    direction: "asc" | "desc";
  }[] | null;
}

@TypePolicy<ApplicationConnectionResolver>({
  organizationId: (resolver) => resolver.$props.organizationId,
  domain: "org",
  resource: "org.applications",
  action: "read",
})
export class ApplicationConnectionResolver extends BaseConnectionResolver<ApplicationConnectionResolverInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.application.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return new ApplicationResolver(
      {
        id: nodeId,
        organizationId: this.$props.organizationId,
        applicationsReadAuthorized: true,
      },
      this.$ctx
    );
  }
}

export function mapApplicationConnectionInput(
  organizationId: string,
  args: ApplicationConnectionGraphqlArgs = {}
): ApplicationConnectionResolverInput {
  const filters: NonNullable<ApplicationRelayInput["where"]>[] = [];
  const search = args.where?.search?.trim();
  if (search) {
    filters.push({
      _or: [
        { name: { _containsi: search } },
        { displayName: { _containsi: search } },
      ],
    });
  }
  const statuses = [...new Set(args.where?.status ?? [])];
  if (statuses.length === 1) {
    filters.push(
      statuses[0] === "ARCHIVED"
        ? { deletedAt: { _isNot: null } }
        : { deletedAt: { _is: null } }
    );
  }

  return {
    organizationId,
    first: args.first ?? undefined,
    after: args.after ?? undefined,
    last: args.last ?? undefined,
    before: args.before ?? undefined,
    where: filters.length > 0 ? { _and: filters } : undefined,
    orderBy:
      args.orderBy?.map(({ field, direction }) => ({
        field: mapApplicationOrderField(field),
        direction,
      })) ?? undefined,
  };
}

function mapApplicationOrderField(
  field: string
): "name" | "displayName" | "createdAt" | "updatedAt" {
  switch (field) {
    case "NAME":
      return "name";
    case "DISPLAY_NAME":
      return "displayName";
    case "UPDATED_AT":
      return "updatedAt";
    case "CREATED_AT":
      return "createdAt";
    default:
      throw new Error("Application order field is invalid");
  }
}
