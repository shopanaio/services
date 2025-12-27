import type { GraphQLResolveInfo } from "graphql";
import { parseGraphqlInfo } from "../utils/graphqlArgsParser.js";
import type { Executor } from "../executor.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor = new (...args: any[]) => any;

type BaseTypeClass = AnyConstructor & {
  executor?: Executor<unknown>;
};

/**
 * Creates Proxy handler for Apollo resolvers.
 * For each method call: creates instance with ctx, calls method with args,
 * then resolves result through executor.resolve() based on GraphQL query.
 */
function createResolverProxy<T extends BaseTypeClass>(Type: T): object {
  return new Proxy(
    {},
    {
      get(_, prop) {
        // Return wrapped method
        return async function (
          _parent: unknown,
          args: unknown,
          ctx: unknown,
          info: GraphQLResolveInfo
        ) {
          // Create instance
          const instance = new Type({}, ctx) as Record<string, unknown>;

          // Get method from instance
          const method = instance[prop as string];
          if (typeof method !== "function") {
            return method;
          }

          // Call method with args
          const result = await method.call(instance, args);

          // Parse GraphQL query and resolve through executor
          const query = parseGraphqlInfo(info);

          // Use static executor from Type
          if (!Type.executor) {
            throw new Error(`${Type.name} must have static executor set`);
          }

          // executor.resolve() handles all cases:
          // - BaseType → load()
          // - Array<BaseType> → loadMany()
          // - Plain object → resolveObject() recursively
          // - Scalar → return as is
          return Type.executor.resolve(result, query);
        };
      },
    }
  );
}

/**
 * Class decorator for root Query resolver.
 * Returns Proxy that creates new instance per request.
 *
 * @example
 * ```typescript
 * @ApolloQuery
 * class QueryResolver extends BaseType<{}, {}, Context> {
 *   storeQuery() {
 *     return new StoreQueryResolver({}, this.ctx);
 *   }
 * }
 *
 * const resolvers = {
 *   Query: QueryResolver
 * };
 * ```
 */
export function ApolloQuery<T extends BaseTypeClass>(Target: T): T {
  return createResolverProxy(Target) as unknown as T;
}

/**
 * Class decorator for root Mutation resolver.
 * Same as ApolloQuery - provided for semantic clarity.
 */
export const ApolloMutation = ApolloQuery;
