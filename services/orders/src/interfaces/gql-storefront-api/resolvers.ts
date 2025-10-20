import { scalarResolvers } from "./resolvers/scalars";
import resolversIndex from "./resolvers/index";

export const resolvers = {
  ...resolversIndex,
  ...scalarResolvers,
} as any;
