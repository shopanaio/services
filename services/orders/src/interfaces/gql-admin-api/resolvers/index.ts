import { scalarResolvers } from "./scalars";
import orderResolvers from "./order";

export const resolvers = {
  ...scalarResolvers,
  ...orderResolvers,
};

export default resolvers;
