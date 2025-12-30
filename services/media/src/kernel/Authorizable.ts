import type {
  AuthProvider as IAuthProvider,
  AuthorizeParams,
} from "@shopana/shared-kernel";
import type { MediaKernelServices } from "./types.js";
import { getContext } from "../context/index.js";

/**
 * Authorization provider for media service.
 *
 * Implements AuthProvider interface.
 * Delegates authorization to IAM service via broker.
 * Used by MediaType via composition (this.authProvider).
 * Gets kernel services from context automatically.
 */
export class AuthProvider implements IAuthProvider {
  private get services(): MediaKernelServices {
    return getContext().kernel.getServices();
  }

  /**
   * Current subject (user ID) for authorization checks.
   * Falls back to current user from context.
   */
  get subject(): string | null {
    return getContext().user?.id ?? null;
  }

  /**
   * Authorization check.
   *
   * Delegates to IAM service via broker.
   * Uses store context from ServiceContext for domain resolution.
   */
  async authorize(params: AuthorizeParams): Promise<boolean> {
    const subject = params.subject ?? this.subject;
    if (!subject) {
      return false;
    }

    const ctx = getContext();

    // Determine domain: explicit > store from context > default org
    const domain =
      params.domain ?? (ctx.hasStore ? `store:${ctx.store.id}` : "org");

    // Delegate to IAM service
    const result = (await this.services.broker.call("iam.authorize", {
      subject,
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      resource: params.resource,
      action: params.action,
      domain,
    })) as { allowed: boolean };

    return result.allowed;
  }
}
