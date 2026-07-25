import {
  BaseType,
  createExecutor,
} from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { HeadlessResolverContext } from "./context.js";
import type { HeadlessStorefrontScope } from "../../../storefront-access/repositories/index.js";

export abstract class HeadlessType<TValue, TData = unknown>
  extends BaseType<TValue, TData, HeadlessResolverContext>
{
  static executor = createExecutor<HeadlessResolverContext>({});

  protected get scope(): HeadlessStorefrontScope {
    return {
      installationId: this.$ctx.app.installationId,
      organizationId: this.$ctx.app.organizationId,
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
