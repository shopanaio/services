import {
  BaseType,
  Cache,
  createExecutor,
  type CacheStore,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import {
  getServiceResolverRegistry,
  type ServiceResolverRegistry,
} from "./ServiceResolverRegistry.js";

export { Cache };

export abstract class ServiceType<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
{
  static executor = createExecutor<ServiceContext>({});

  protected get resolvers(): ServiceResolverRegistry {
    return getServiceResolverRegistry(this.$ctx);
  }

  protected getCache(): CacheStore {
    return {} as CacheStore;
  }
}
