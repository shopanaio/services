import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/types.js";
import { AppCapabilityBindingResolver } from "../../../resolvers/admin/AppCapabilityBindingResolver.js";
import { AppInstallationResolver } from "../../../resolvers/admin/AppInstallationResolver.js";
import { AppLifecycleOperationResolver } from "../../../resolvers/admin/AppLifecycleOperationResolver.js";
import { AppManifestSnapshotResolver } from "../../../resolvers/admin/AppManifestSnapshotResolver.js";
import type { Resolvers } from "../../../resolvers/admin/generated/types.js";

export const typeResolvers: Partial<Resolvers> = {
  Node: {
    __resolveType: (value: unknown) => {
      if (value instanceof AppInstallationResolver) {
        return "AppInstallation";
      }
      if (value instanceof AppCapabilityBindingResolver) {
        return "AppCapabilityBinding";
      }
      if (value instanceof AppLifecycleOperationResolver) {
        return "AppLifecycleOperation";
      }
      if (value instanceof AppManifestSnapshotResolver) {
        return "AppManifestSnapshot";
      }

      if (typeof value !== "object" || value === null) {
        return null;
      }
      const record = value as Record<string, unknown>;
      if ("capability" in record && "targetAction" in record) {
        return "AppCapabilityBinding";
      }
      if ("workflowId" in record && "targetVersion" in record) {
        return "AppLifecycleOperation";
      }
      if ("manifest" in record && "manifestHash" in record) {
        return "AppManifestSnapshot";
      }
      if ("appCode" in record && "configurationVersion" in record) {
        return "AppInstallation";
      }
      return null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },

  AppInstallation: {
    __resolveReference: (
      reference: { __typename: "AppInstallation"; id: string },
      context: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      AppInstallationResolver.load(
        decodeGlobalIdByType(
          reference.id,
          GlobalIdEntity.AppInstallation,
        ),
        parseGraphqlInfo(info),
        context,
      ),
  },

  AppCapabilityBinding: {
    __resolveReference: (
      reference: {
        __typename: "AppCapabilityBinding";
        id: string;
      },
      context: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      AppCapabilityBindingResolver.load(
        decodeGlobalIdByType(
          reference.id,
          GlobalIdEntity.AppCapabilityBinding,
        ),
        parseGraphqlInfo(info),
        context,
      ),
  },

  AppLifecycleOperation: {
    __resolveReference: (
      reference: {
        __typename: "AppLifecycleOperation";
        id: string;
      },
      context: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      AppLifecycleOperationResolver.load(
        decodeGlobalIdByType(
          reference.id,
          GlobalIdEntity.AppLifecycleOperation,
        ),
        parseGraphqlInfo(info),
        context,
      ),
  },

  AppManifestSnapshot: {
    __resolveReference: (
      reference: {
        __typename: "AppManifestSnapshot";
        id: string;
      },
      context: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      AppManifestSnapshotResolver.load(
        decodeGlobalIdByType(
          reference.id,
          GlobalIdEntity.AppManifestSnapshot,
        ),
        parseGraphqlInfo(info),
        context,
      ),
  },
};
