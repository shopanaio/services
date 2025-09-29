import { scalarResolvers } from "./scalars";
import checkoutResolvers from "./checkout";
export const resolvers = {
  ...scalarResolvers,
  ...checkoutResolvers,
};

export default resolvers;
