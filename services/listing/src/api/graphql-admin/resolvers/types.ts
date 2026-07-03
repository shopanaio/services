export const typeResolvers = {
  Node: {
    __resolveType: (obj: unknown) => {
      const typename = (obj as { __typename?: string }).__typename;
      return typename ?? null;
    },
  },

  Listing: {
    __resolveType: (obj: unknown) => {
      const typename = (obj as { __typename?: string }).__typename;
      return typename === "Product" || typename === "Bundle" ? typename : null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
