import {
  BaseType,
  Cache,
  createAuthorizationMiddleware,
  createExecutor,
  type Authorizable,
  type CacheStore,
} from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { ServiceContext } from "../../context/types.js";
import { AuthProvider } from "../../kernel/Authorizable.js";

export { Cache };

/**
 * Base resolver for the Apps admin control plane.
 */
export abstract class AppsType<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  readonly authProvider = new AuthProvider();

  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });

  protected getCache(): CacheStore {
    return {} as CacheStore;
  }

  protected encodeId(id: string, type: GlobalIdType): string {
    return encodeGlobalIdByType(id, type);
  }

  protected decodeId(globalId: string, type: GlobalIdType): string {
    return decodeGlobalIdByType(globalId, type);
  }
}
