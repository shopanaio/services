import { BaseType, createExecutor } from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { SmtpConnectionScope } from "../../../connections/index.js";
import type { SmtpResolverContext } from "./context.js";

export abstract class SmtpType<TValue, TData = unknown> extends BaseType<
  TValue,
  TData,
  SmtpResolverContext
> {
  static executor = createExecutor<SmtpResolverContext>({});

  protected get scope(): SmtpConnectionScope {
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
