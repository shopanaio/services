import {
  BaseType,
  createAuthorizationMiddleware,
  createExecutor,
  type Authorizable,
  type CacheStore,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import { AuthProvider } from "../../kernel/Authorizable.js";
import { getResolverRegistry, type ResolverRegistry } from "./ResolverRegistry.js";

export abstract class NotificationsType<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  readonly authProvider = new AuthProvider();

  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });

  protected get resolvers(): ResolverRegistry {
    return getResolverRegistry(this.$ctx);
  }

  protected getCache(): CacheStore {
    return this.$ctx.kernel.cache as CacheStore;
  }
}
