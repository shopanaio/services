import {
  throwIfBrokerAuthorizeDenied,
  type AuthProvider as AuthProviderContract,
  type AuthorizeParams,
  type BrokerAuthorizeResult,
  type ProtectedResourceAuthorizeParams,
} from "@shopana/shared-kernel";
import { getContext } from "../context/index.js";

/**
 * Authorization provider used by Apps admin resolvers.
 */
export class AuthProvider implements AuthProviderContract {
  get subject(): string | null {
    const context = getContext();
    return context.hasUser ? context.user.id : null;
  }

  async authorize(params: AuthorizeParams): Promise<boolean> {
    const subject = params.subject ?? this.subject;
    if (!subject) {
      return false;
    }

    const context = getContext();
    const result = (await context.broker.call("iam.authorize", {
      subject,
      organizationId:
        params.organizationId ?? context.store.organizationId,
      organizationName: params.organizationName,
      resource: params.resource,
      action: params.action,
      domain: params.domain ?? `store:${context.store.id}`,
    })) as BrokerAuthorizeResult;

    throwIfBrokerAuthorizeDenied(result);
    return result.allowed;
  }

  async authorizeProtectedResource(
    params: ProtectedResourceAuthorizeParams,
  ): Promise<boolean> {
    const result = (await getContext().broker.call(
      "iam.authorizeProtectedResource",
      params,
    )) as BrokerAuthorizeResult;

    throwIfBrokerAuthorizeDenied(result);
    return result.allowed;
  }
}
