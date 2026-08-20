import { authorizeAdminContext } from "@shopana/shared-context";
import {
  throwIfBrokerAuthorizeDenied,
  type AuthProvider as AuthProviderContract,
  type AuthorizeParams,
  type BrokerAuthorizeResult,
  type ProtectedResourceAuthorizeParams,
} from "@shopana/shared-kernel";
import { getAdminGraphQLContext } from "./contextStorage.js";

export class AuthProvider implements AuthProviderContract {
  get subject(): string | null {
    const context = getAdminGraphQLContext();
    return context.hasUser ? context.user.id : null;
  }

  async authorize(params: AuthorizeParams): Promise<boolean> {
    const context = getAdminGraphQLContext();
    const subject = params.subject ?? this.subject;
    if (!subject) return false;
    return authorizeAdminContext(context.adminContext, {
      subject,
      organizationId: params.organizationId ?? context.store.organizationId,
      organizationName: params.organizationName,
      resource: params.resource,
      action: params.action,
      domain: params.domain ?? `store:${context.store.id}`,
    });
  }

  async authorizeProtectedResource(params: ProtectedResourceAuthorizeParams): Promise<boolean> {
    const result = await getAdminGraphQLContext().broker.call<BrokerAuthorizeResult>(
      "iam.authorizeProtectedResource",
      params,
    );
    throwIfBrokerAuthorizeDenied(result);
    return result.allowed;
  }
}
