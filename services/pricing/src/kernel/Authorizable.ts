import type {
  AuthProvider as IAuthProvider,
  AuthorizeParams,
} from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";
import type { PricingKernelServices } from "./types.js";

export class AuthProvider implements IAuthProvider {
  private get services(): PricingKernelServices {
    return getContext().kernel.getServices();
  }

  get subject(): string | null {
    const context = getContext();
    return context.hasUser ? context.user.id : null;
  }

  async authorize(params: AuthorizeParams): Promise<boolean> {
    const subject = params.subject ?? this.subject;
    if (!subject) {
      return false;
    }

    const ctx = getContext();
    const domain = params.domain ?? `store:${ctx.store.id}`;

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
