import { scalarResolvers } from './resolvers/scalars';
import resolversIndex from './resolvers/index';

export const resolvers = {
  ...resolversIndex,
  Query: {
    ...(resolversIndex.Query || {}),
  },
  Mutation: {
    ...(resolversIndex.Mutation || {}),
  },
  ...(scalarResolvers as any),
} as any;
