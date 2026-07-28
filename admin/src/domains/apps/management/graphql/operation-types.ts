import type {
  ApiAppDefinition,
  ApiAppInstallInput,
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
  | "installed"
  | "permissions"
> & {
  installation: Pick<
    ApiAppInstallation,
    "id" | "status" | "installedVersion" | "healthStatus"
  > | null;
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
