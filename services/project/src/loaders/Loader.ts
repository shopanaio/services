import {
  createAuthorizationLoader,
  type AuthorizationLoader,
} from "./AuthorizationLoader.js";

interface Broker {
  call(action: string, params: unknown): Promise<unknown>;
}

/**
 * Aggregates all DataLoaders for the project service.
 * Create one instance per request for proper batching within request scope.
 */
export class Loader {
  /** Authorization loader for batched permission checks */
  public readonly authorization: AuthorizationLoader;

  constructor(broker: Broker) {
    this.authorization = createAuthorizationLoader(broker);
  }
}
