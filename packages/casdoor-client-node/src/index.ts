// Copyright 2021 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Casdoor SDK for Node.js
 * TypeScript port of casdoor-go-sdk v1.5.0
 */

// Re-export all types
export * from "./types.js";

// Re-export client
export { Client, NewClient, NewClientWithConf, GetCurrentTime } from "./client.js";

// Re-export auth methods
export {
  GetOAuthToken,
  RefreshOAuthToken,
  ParseJwtToken,
  ParseJwtTokenWithoutVerify,
  IsRefreshToken,
  GetSigninUrl,
  GetSignupUrl,
  GetUserProfileUrl,
  GetMyProfileUrl,
} from "./auth.js";

// Re-export user methods
export {
  MfaRecoveryCodesSession,
  GetUserId,
  GetGlobalUsers,
  GetUsers,
  GetSortedUsers,
  GetPaginationUsers,
  GetUserCount,
  GetUser,
  GetUserByEmail,
  GetUserByPhone,
  GetUserByUserId,
  SetPassword,
  UpdateUserById,
  UpdateUser,
  UpdateUserForColumns,
  AddUser,
  DeleteUser,
  CheckUserPassword,
} from "./user.js";

// Re-export organization methods
export {
  GetOrganization,
  GetOrganizations,
  GetOrganizationNames,
  AddOrganization,
  UpdateOrganization,
  DeleteOrganization,
} from "./organization.js";

// Re-export application methods
export {
  GetApplications,
  GetOrganizationApplications,
  GetApplication,
  AddApplication,
  UpdateApplication,
  DeleteApplication,
} from "./application.js";

// Re-export role methods
export {
  GetRoles,
  GetPaginationRoles,
  GetRole,
  AddRole,
  UpdateRole,
  UpdateRoleForColumns,
  DeleteRole,
} from "./role.js";

// Re-export permission methods
export {
  GetPermissions,
  GetPermissionsByRole,
  GetPaginationPermissions,
  GetPermission,
  AddPermission,
  UpdatePermission,
  UpdatePermissionForColumns,
  DeletePermission,
} from "./permission.js";

// Re-export provider methods
export {
  GetProviders,
  GetProvider,
  GetPaginationProviders,
  AddProvider,
  UpdateProvider,
  DeleteProvider,
} from "./provider.js";

// Re-export cert methods
export {
  GetGlobalCerts,
  GetCerts,
  GetCert,
  AddCert,
  UpdateCert,
  DeleteCert,
} from "./cert.js";

// Re-export token methods
export {
  GetTokens,
  GetPaginationTokens,
  GetToken,
  AddToken,
  UpdateToken,
  UpdateTokenForColumns,
  DeleteToken,
  IntrospectToken,
} from "./token.js";

// Re-export resource methods
export {
  GetResource,
  GetResourceEx,
  GetResources,
  GetPaginationResources,
  UploadResource,
  UploadResourceEx,
  DeleteResource,
} from "./resource.js";

// Re-export email methods
export { SendEmail, SendEmailByProvider } from "./email.js";

// Re-export sms methods
export { SendSms, SendSmsByProvider } from "./sms.js";

// Re-export session methods
export {
  GetSessions,
  GetPaginationSessions,
  GetSession,
  AddSession,
  UpdateSession,
  DeleteSession,
} from "./session.js";

// Re-export group methods
export {
  GetGroups,
  GetPaginationGroups,
  GetGroup,
  AddGroup,
  UpdateGroup,
  DeleteGroup,
} from "./group.js";

// Re-export record methods
export { GetRecords, GetPaginationRecords, GetRecord } from "./record.js";

// Re-export CasdoorRecord type alias for backward compatibility
export { CasdoorRecord as Record } from "./types.js";

// Global client instance (optional, for compatibility with Go SDK)
let globalClient: import("./client.js").Client | null = null;

/**
 * Initialize global client (for compatibility with Go SDK)
 */
export function InitConfig(
  endpoint: string,
  clientId: string,
  clientSecret: string,
  certificate: string,
  organizationName: string,
  applicationName: string
): void {
  const { NewClient } = require("./client.js");
  globalClient = NewClient(
    endpoint,
    clientId,
    clientSecret,
    certificate,
    organizationName,
    applicationName
  );
}

/**
 * Get global client instance
 */
export function GetGlobalClient(): import("./client.js").Client | null {
  return globalClient;
}
