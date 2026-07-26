import {
  createAuthorizationLoader,
  type AuthorizationLoader,
} from "./AuthorizationLoader.js";
import type { AdminContextClaims } from "@shopana/shared-context";

/**
 * Aggregates all DataLoaders for the project service.
 * Create one instance per request for proper batching within request scope.
 */
export class Loader {
  /** Authorization loader for batched permission checks */
  public readonly authorization: AuthorizationLoader;

  constructor(adminContext?: AdminContextClaims) {
    this.authorization = createAuthorizationLoader(adminContext);
  }
}
