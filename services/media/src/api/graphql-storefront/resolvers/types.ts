import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/types.js";
import { ExternalVideoResolver } from "../../../resolvers/storefront/ExternalVideoResolver.js";
import { GenericFileResolver } from "../../../resolvers/storefront/GenericFileResolver.js";
import { ImageResolver } from "../../../resolvers/storefront/ImageResolver.js";
import { MediaImageResolver } from "../../../resolvers/storefront/MediaImageResolver.js";
import { Model3dResolver } from "../../../resolvers/storefront/Model3dResolver.js";
import type { Resolvers } from "../../../resolvers/storefront/generated/types.js";
import { VideoResolver } from "../../../resolvers/storefront/VideoResolver.js";

function decodeFileId(reference: { id: string }): string {
  return decodeGlobalIdByType(reference.id, GlobalIdEntity.File);
}

export const typeResolvers: Partial<Resolvers> = {
  Node: {
    __resolveType: (value) => {
      if (value instanceof GenericFileResolver) return "GenericFile";
      if (value instanceof MediaImageResolver) return "MediaImage";
      if (value instanceof VideoResolver) return "Video";
      if (value instanceof ExternalVideoResolver) return "ExternalVideo";
      if (value instanceof Model3dResolver) return "Model3d";
      return null;
    },
  },
  Media: {
    __resolveType: (value) => {
      if (value instanceof MediaImageResolver) return "MediaImage";
      if (value instanceof VideoResolver) return "Video";
      if (value instanceof ExternalVideoResolver) return "ExternalVideo";
      if (value instanceof Model3dResolver) return "Model3d";
      return null;
    },
  },
  Image: {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      ImageResolver.load(
        decodeFileId(reference),
        parseGraphqlInfo(info),
        ctx,
      ),
  },
  GenericFile: {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      GenericFileResolver.load(
        decodeFileId(reference),
        parseGraphqlInfo(info),
        ctx,
      ),
  },
  MediaImage: {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      MediaImageResolver.load(
        decodeFileId(reference),
        parseGraphqlInfo(info),
        ctx,
      ),
  },
  Video: {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      VideoResolver.load(
        decodeFileId(reference),
        parseGraphqlInfo(info),
        ctx,
      ),
  },
  ExternalVideo: {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      ExternalVideoResolver.load(
        decodeFileId(reference),
        parseGraphqlInfo(info),
        ctx,
      ),
  },
  Model3d: {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      Model3dResolver.load(
        decodeFileId(reference),
        parseGraphqlInfo(info),
        ctx,
      ),
  },
};
