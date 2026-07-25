import type { AdminAppUiDescriptor } from "../../runtime/descriptor-schema";

export interface AdminUiAppsQueryData {
  appsQuery: {
    adminUiApps: AdminAppUiDescriptor[];
  };
}

