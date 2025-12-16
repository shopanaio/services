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
export { Client, createClient, createClientWithConf, getCurrentTime } from "./client.js";

// Re-export auth methods
export {
  getOAuthToken,
  refreshOAuthToken,
  parseJwtToken,
  parseJwtTokenWithoutVerify,
  isRefreshToken,
  getSigninUrl,
  getSignupUrl,
  getUserProfileUrl,
  getMyProfileUrl,
} from "./auth.js";

// Re-export user methods
export {
  MFA_RECOVERY_CODES_SESSION,
  getUserId,
  getGlobalUsers,
  getUsers,
  getSortedUsers,
  getPaginationUsers,
  getUserCount,
  getUser,
  getUserByEmail,
  getUserByPhone,
  getUserByUserId,
  setPassword,
  updateUserById,
  updateUser,
  updateUserForColumns,
  addUser,
  deleteUser,
  checkUserPassword,
} from "./user.js";

// Re-export organization methods
export {
  getOrganization,
  getOrganizations,
  getOrganizationNames,
  addOrganization,
  updateOrganization,
  deleteOrganization,
} from "./organization.js";

// Re-export application methods
export {
  getApplications,
  getOrganizationApplications,
  getApplication,
  addApplication,
  updateApplication,
  deleteApplication,
} from "./application.js";

// Re-export role methods
export {
  getRoles,
  getPaginationRoles,
  getRole,
  addRole,
  updateRole,
  updateRoleForColumns,
  deleteRole,
} from "./role.js";

// Re-export permission methods
export {
  getPermissions,
  getPermissionsByRole,
  getPaginationPermissions,
  getPermission,
  addPermission,
  updatePermission,
  updatePermissionForColumns,
  deletePermission,
} from "./permission.js";

// Re-export provider methods
export {
  getProviders,
  getProvider,
  getPaginationProviders,
  addProvider,
  updateProvider,
  deleteProvider,
} from "./provider.js";

// Re-export cert methods
export {
  getGlobalCerts,
  getCerts,
  getCert,
  addCert,
  updateCert,
  deleteCert,
} from "./cert.js";

// Re-export token methods
export {
  getTokens,
  getPaginationTokens,
  getToken,
  addToken,
  updateToken,
  updateTokenForColumns,
  deleteToken,
  introspectToken,
} from "./token.js";

// Re-export resource methods
export {
  getResource,
  getResourceEx,
  getResources,
  getPaginationResources,
  uploadResource,
  uploadResourceEx,
  deleteResource,
} from "./resource.js";

// Re-export email methods
export { sendEmail, sendEmailByProvider } from "./email.js";

// Re-export sms methods
export { sendSms, sendSmsByProvider } from "./sms.js";

// Re-export session methods
export {
  getSessions,
  getPaginationSessions,
  getSession,
  addSession,
  updateSession,
  updateSessionForColumns,
  deleteSession,
} from "./session.js";

// Re-export group methods
export {
  getGroups,
  getPaginationGroups,
  getGroup,
  addGroup,
  updateGroup,
  deleteGroup,
} from "./group.js";

// Re-export record methods
export { getRecords, getPaginationRecords, getRecord, addRecord } from "./record.js";

// Re-export CasdoorRecord type alias for backward compatibility
export { CasdoorRecord as Record } from "./types.js";

// Global client instance (optional, for compatibility with Go SDK)
let globalClient: import("./client.js").Client | null = null;

/**
 * Initialize global client (for compatibility with Go SDK)
 */
export function initConfig(
  endpoint: string,
  clientId: string,
  clientSecret: string,
  certificate: string,
  organizationName: string,
  applicationName: string
): void {
  const { createClient } = require("./client.js");
  globalClient = createClient(
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
export function getGlobalClient(): import("./client.js").Client | null {
  return globalClient;
}
