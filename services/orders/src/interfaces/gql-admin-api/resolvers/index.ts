import { scalarResolvers } from "./scalars";
import type {
  ApiMutationResolvers,
  ApiOrdersMutation,
  ApiOrdersQuery,
  ApiQueryResolvers,
  ApiResolvers,
} from "../types";

export const resolvers = {
  ...scalarResolvers,
  Query: {
    ordersQuery: () => ({}) as ApiOrdersQuery,
  } satisfies ApiQueryResolvers,
  Mutation: {
    ordersMutation: () => ({}) as ApiOrdersMutation,
  } satisfies ApiMutationResolvers,
} satisfies Partial<ApiResolvers>;

export default resolvers;
