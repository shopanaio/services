import {
  throwIfBrokerAuthorizeDenied,
  type AuthProvider as IAuthProvider,
  type AuthorizeParams,
  type BrokerAuthorizeResult,
} from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";
import type { CustomersKernelServices } from "./types.js";

export class AuthProvider implements IAuthProvider {
  private get services(): CustomersKernelServices {
    return getContext().kernel.getServices();
  }

  get subject(): string | null {
    const context = getContext();
    return context.hasUser ? context.user.id : null;
  }

  async authorize(params: AuthorizeParams): Promise<boolean> {
    if ("linkedOwner" in params && params.linkedOwner) return false;
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
      protectedResource: params.protectedResource,
    })) as BrokerAuthorizeResult;

    throwIfBrokerAuthorizeDenied(result);
    return result.allowed;
  }
}
