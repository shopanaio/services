import { BaseType } from "@shopana/type-resolver";
import type {
  Authorizable,
  AuthorizeParams,
  AuthorizeResult,
} from "@shopana/shared-kernel";
import type { ServiceContext } from "../../context/types.js";

/**
 * Base resolver class with ServiceContext and Authorizable support.
 * Allows using @Authorize decorator on resolver field methods.
 *
 * @template TValue - The type of the input value passed to the constructor
 * @template TData - The type of the loaded data entity
 */
export abstract class BaseResolver<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  get userId(): string | null {
    return this.ctx.user?.id ?? null;
  }

  get organizationId(): string | null {
    return this.ctx.store?.organizationId ?? null;
  }

  async authorize(params: AuthorizeParams): Promise<AuthorizeResult> {
    const domain =
      params.domain ??
      (this.ctx.store ? `store:${this.ctx.store.id}` : undefined);

    // Use loaders.authorization for batched authorization checks
    const allowed = await this.ctx.loaders.authorization.load({
      userId: this.userId!,
      organizationId: params.organizationId,
      resource: params.resource,
      action: params.action,
      domain,
    });

    return { allowed };
  }

  protected getCache() {
    return this.ctx.kernel.cache;
  }
}
