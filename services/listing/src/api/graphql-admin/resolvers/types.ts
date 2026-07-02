export const typeResolvers = {
  Node: {
    __resolveType: () => null,
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
