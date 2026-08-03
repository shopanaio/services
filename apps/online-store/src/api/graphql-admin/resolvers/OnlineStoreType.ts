import { BaseType, createExecutor } from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { OnlineStoreScope } from "../../../content/repositories/index.js";
import type { OnlineStoreResolverContext } from "./context.js";

/** Base resolver class for the Online Store App admin GraphQL layer. */
export abstract class OnlineStoreType<TValue, TData = unknown> extends BaseType<
  TValue,
  TData,
  OnlineStoreResolverContext
> {
  static executor = createExecutor<OnlineStoreResolverContext>({});

  protected get scope(): OnlineStoreScope {
    return {
      installationId: this.$ctx.app.installationId,
      storeId: this.$ctx.app.storeId,
    };
  }

  protected encodeId(id: string, type: GlobalIdType): string {
    return encodeGlobalIdByType(id, type);
  }

  protected decodeId(globalId: string, type: GlobalIdType): string {
    return decodeGlobalIdByType(globalId, type);
  }
}
