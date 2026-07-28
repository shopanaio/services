import type {
  ApiAppDefinition,
  ApiAppInstallInput,
  ApiAppInstallationActionInput,
  ApiAppInstallation,
  ApiAppLifecycleOperation,
  ApiGenericUserError,
} from "@/graphql/types";
import type { AdminAppUiDescriptor } from "../../runtime/descriptor-schema";

export interface AdminUiAppsQueryData {
  appsQuery: {
    adminUiApps: AdminAppUiDescriptor[];
  };
}

export type ManagementAppListItem = Pick<
  ApiAppDefinition,
  | "code"
  | "displayName"
  | "description"
  | "version"
  | "runtimeStatus"
  | "runtimeHealth"
  | "installed"
  | "permissions"
  | "capabilities"
  | "graphql"
> & {
  installation: Pick<
    ApiAppInstallation,
    | "id"
    | "status"
    | "installedVersion"
    | "targetVersion"
    | "healthStatus"
    | "installedAt"
    | "suspendedAt"
    | "updatedAt"
    | "lastError"
  > & {
    lifecycleOperations: {
      totalCount: number;
      edges: Array<{
        node: Pick<
          ApiAppLifecycleOperation,
          | "id"
          | "type"
          | "status"
          | "targetVersion"
          | "actorType"
          | "startedAt"
          | "completedAt"
          | "createdAt"
          | "error"
        >;
      }>;
    };
  } | null;
};

export interface AppsManagementQueryData {
  appsQuery: {
    availableApps: ManagementAppListItem[];
  };
}

export interface AppInstallMutationData {
  appsMutation: {
    appInstall: {
      installation: Pick<
        ApiAppInstallation,
        "id" | "appCode" | "status" | "installedVersion" | "healthStatus"
      > | null;
      operation: Pick<ApiAppLifecycleOperation, "id" | "type" | "status"> | null;
      duplicate: boolean;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface AppInstallMutationVariables {
  input: ApiAppInstallInput;
}

export interface AppLifecycleActionMutationData {
  appsMutation: {
    appSuspend?: AppLifecycleMutationPayload;
    appResume?: AppLifecycleMutationPayload;
    appUninstall?: AppLifecycleMutationPayload;
  };
}

export interface AppLifecycleActionMutationVariables {
  input: ApiAppInstallationActionInput;
}

export interface AppLifecycleMutationPayload {
  installation: Pick<
    ApiAppInstallation,
    "id" | "status" | "installedVersion" | "healthStatus"
  > | null;
  operation: Pick<ApiAppLifecycleOperation, "id" | "type" | "status"> | null;
  duplicate: boolean;
  userErrors: ApiGenericUserError[];
}
