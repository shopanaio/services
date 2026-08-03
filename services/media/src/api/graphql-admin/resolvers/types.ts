import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import { GraphQLUpload } from "graphql-upload-minimal";
import type { ServiceContext } from "../../../context/index.js";
import { FileResolver } from "../../../resolvers/admin/FileResolver.js";
import { CdnConfigurationResolver } from "../../../resolvers/admin/CdnConfigurationResolver.js";
import { CdnRoutingRuleResolver } from "../../../resolvers/admin/CdnRoutingRuleResolver.js";
import { decodeGlobalIdByType } from "@shopana/shared-graphql-guid";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

/**
 * Resolves file using FileResolver
 * @param fileId - The file id
 */
export async function resolveFile(
  fileId: string,
  ctx: ServiceContext,
  info: GraphQLResolveInfo,
  fieldPath?: string
): Promise<unknown> {
  const fieldInfo = fieldPath
    ? parseGraphqlInfo(info, fieldPath)
    : parseGraphqlInfo(info);
  return FileResolver.load(fileId, fieldInfo, ctx);
}

export const typeResolvers = {
  // Node interface resolver
  Node: {
    __resolveType: (obj: Record<string, unknown>) => {
      if (obj instanceof FileResolver) return "File";
      if (obj instanceof CdnConfigurationResolver) return "CdnConfiguration";
      if (obj instanceof CdnRoutingRuleResolver) return "CdnRoutingRule";
      if ("provider" in obj) return "File";
      if ("baseUrl" in obj) return "CdnConfiguration";
      if ("cdnConfigurationId" in obj && "conditions" in obj) {
        return "CdnRoutingRule";
      }
      return null;
    },
  },

  // File federation reference resolver
  File: {
    __resolveReference: async (
      reference: {
        __typename: "File";
        id: string;
      },
      ctx: ServiceContext,
      info: GraphQLResolveInfo
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const fileId = decodeGlobalIdByType(reference.id, GlobalIdEntity.File);
      return FileResolver.load(fileId, fieldInfo, ctx);
    },
  },

  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },

  // Upload scalar
  Upload: GraphQLUpload,
};
