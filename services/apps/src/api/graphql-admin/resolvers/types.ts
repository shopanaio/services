export const typeResolvers = {
  UserError: {
    __resolveType: () => "GenericUserError",
  },
  SalesChannelConnection: {
    __resolveReference: async (
      reference: { id: string },
      context: import("../../../context/types.js").ServiceContext,
    ) => {
      const { decodeGlobalIdByType, GlobalIdEntity } = await import(
        "@shopana/shared-graphql-guid"
      );
      const { SalesChannelConnectionResolver } = await import(
        "../../../resolvers/admin/SalesChannelResolvers.js"
      );
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.SalesChannelConnection,
      );
      const row =
        await context.repository.salesChannelConnection.findByIdForStore(id);
      return row ? new SalesChannelConnectionResolver(row, context) : null;
    },
  },
};
