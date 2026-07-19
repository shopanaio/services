import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export interface ApplicationOAuthClientConnectionResolverInput {
  organizationId: string;
  applicationId: string;
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: unknown;
  orderBy?: unknown;
}

/** ApplicationOAuthClientConnection resolver using the shared IAM Relay contract. */
export class ApplicationOAuthClientConnectionResolver extends BaseConnectionResolver<ApplicationOAuthClientConnectionResolverInput> {
  async $preload(): Promise<ConnectionData> {
    // TODO: Load the OAuth client connection from the repository.
    throw new Error("Application OAuth client connection resolver is not implemented");
  }

  protected createNodeResolver(_nodeId: string) {
    // TODO: Create the OAuth client node resolver.
    throw new Error("Application OAuth client node resolver creation is not implemented");
  }
}
