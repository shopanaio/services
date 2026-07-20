import {
  throwIfBrokerAuthorizeDenied,
  type AuthProvider as IAuthProvider,
  type AuthorizeParams,
  type BrokerAuthorizeResult,
} from "@shopana/shared-kernel";
import type { ListingKernelServices } from "./types.js";
import { getContext } from "../context/index.js";

export class AuthProvider implements IAuthProvider {
  private get services(): ListingKernelServices {
    return getContext().kernel.getServices();
  }

  get subject(): string | null {
    return getContext().user?.id ?? null;
  }

  async authorize(params: AuthorizeParams): Promise<boolean> {
    const subject = params.subject ?? this.subject;
    if (!subject) {
      return false;
    }

    const ctx = getContext();
    const domain =
      params.domain ?? (ctx.store?.id ? `store:${ctx.store.id}` : "org");

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
