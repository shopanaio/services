import {
  BaseType,
  createAuthorizationMiddleware,
  createExecutor,
  type Authorizable,
} from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { GraphQLContext } from "../../interfaces/gql-admin-api/context.js";
import { AuthProvider } from "../../interfaces/gql-admin-api/AuthProvider.js";

export abstract class OrdersType<TValue, TData = unknown>
  extends BaseType<TValue, TData, GraphQLContext>
  implements Authorizable
{
  readonly authProvider = new AuthProvider();

  static executor = createExecutor<GraphQLContext>({
    middleware: [createAuthorizationMiddleware()],
  });

  protected encodeId(id: string, type: GlobalIdType): string {
    return encodeGlobalIdByType(id, type);
  }

  protected decodeId(id: string, type: GlobalIdType): string {
    return decodeGlobalIdByType(id, type);
  }
}
