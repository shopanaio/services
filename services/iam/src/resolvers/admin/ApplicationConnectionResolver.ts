import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export interface ApplicationConnectionResolverInput {
  organizationId: string;
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: unknown;
  orderBy?: unknown;
}

/** ApplicationConnection resolver using the shared IAM Relay contract. */
export class ApplicationConnectionResolver extends BaseConnectionResolver<ApplicationConnectionResolverInput> {
  async $preload(): Promise<ConnectionData> {
    // TODO: Load the application connection from the repository.
    throw new Error("Application connection resolver is not implemented");
  }

  protected createNodeResolver(_nodeId: string) {
    // TODO: Create the application node resolver.
    throw new Error("Application node resolver creation is not implemented");
  }
}
