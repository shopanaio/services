import { authorizeAdminContext } from "@shopana/shared-context";
import {
  throwIfBrokerAuthorizeDenied,
  type AuthProvider as AuthProviderContract,
  type AuthorizeParams,
  type BrokerAuthorizeResult,
  type ProtectedResourceAuthorizeParams,
} from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";

export class AuthProvider implements AuthProviderContract {
  get subject(): string | null {
    const ctx = getContext();
    return ctx.hasUser ? ctx.user.id : null;
  }

  async authorize(params: AuthorizeParams): Promise<boolean> {
    const subject = params.subject ?? this.subject;
    if (!subject) return false;
    const ctx = getContext();
    return authorizeAdminContext(ctx.adminContext, {
      subject,
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      resource: params.resource,
      action: params.action,
      domain: params.domain ?? `store:${ctx.store.id}`,
    });
  }

  async authorizeProtectedResource(params: ProtectedResourceAuthorizeParams): Promise<boolean> {
    const result = await getContext()
      .kernel.getServices()
      .broker.call<BrokerAuthorizeResult, ProtectedResourceAuthorizeParams>(
        "iam.authorizeProtectedResource",
        params,
      );
    throwIfBrokerAuthorizeDenied(result);
    return result.allowed;
  }
}
