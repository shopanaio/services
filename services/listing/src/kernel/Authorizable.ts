import { authorizeAdminContext } from "@shopana/shared-context";
import {
  throwIfBrokerAuthorizeDenied,
  type AuthProvider as IAuthProvider,
  type AuthorizeParams,
  type BrokerAuthorizeResult,
  type ProtectedResourceAuthorizeParams,
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
    const domain = params.domain ?? (ctx.store?.id ? `store:${ctx.store.id}` : "org");

    return authorizeAdminContext(ctx.adminContext, {
      subject,
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      resource: params.resource,
      action: params.action,
      domain,
    });
  }

  async authorizeProtectedResource(params: ProtectedResourceAuthorizeParams): Promise<boolean> {
    const result = (await this.services.broker.call(
      "iam.authorizeProtectedResource",
      params,
    )) as BrokerAuthorizeResult;
    throwIfBrokerAuthorizeDenied(result);
    return result.allowed;
  }
}
