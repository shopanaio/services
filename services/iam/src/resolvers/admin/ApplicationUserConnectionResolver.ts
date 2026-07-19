import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export interface ApplicationUserConnectionResolverInput {
  organizationId: string;
  applicationId: string;
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: unknown;
  orderBy?: unknown;
}

/** ApplicationUserConnection resolver using the shared IAM Relay contract. */
export class ApplicationUserConnectionResolver extends BaseConnectionResolver<ApplicationUserConnectionResolverInput> {
  async $preload(): Promise<ConnectionData> {
    // TODO: Load the application user connection from the repository.
    throw new Error("Application user connection resolver is not implemented");
  }

  protected createNodeResolver(_nodeId: string) {
    // TODO: Create the application user node resolver.
    throw new Error("Application user node resolver creation is not implemented");
  }
}
