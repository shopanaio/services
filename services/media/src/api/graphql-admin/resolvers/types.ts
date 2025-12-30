import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import { GraphQLUpload } from "graphql-upload-minimal";
import type { ServiceContext } from "../../../context/index.js";
import { FileResolver } from "../../../resolvers/admin/FileResolver.js";

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
      if ("provider" in obj) return "File";
      return null;
    },
  },

  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },

  // Upload scalar
  Upload: GraphQLUpload,
};
