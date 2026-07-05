import {
  BaseType,
  Cache,
  createAuthorizationMiddleware,
  createExecutor,
  type Authorizable,
  type CacheStore,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import { AuthProvider } from "../../kernel/Authorizable.js";
import {
  getServiceResolverRegistry,
  type ServiceResolverRegistry,
} from "./ServiceResolverRegistry.js";

export { Cache };

export abstract class ServiceType<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  readonly authProvider = new AuthProvider();

  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });

  protected get resolvers(): ServiceResolverRegistry {
    return getServiceResolverRegistry(this.$ctx);
  }

  protected getCache(): CacheStore {
    return {} as CacheStore;
  }
}
