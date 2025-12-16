export { CasdoorClient } from "./client.js";
export { CasdoorSdk } from "./sdk.js";
export { CasdoorLogin } from "./login.js";
export * from "./types.js";

import { CasdoorClient } from "./client.js";
import { CasdoorSdk } from "./sdk.js";
import { CasdoorLogin } from "./login.js";
import type { CasdoorConfig } from "./types.js";

/**
 * Create a complete Casdoor service with all features
 */
export function createCasdoorService(config: CasdoorConfig) {
  const client = new CasdoorClient(config);
  const sdk = new CasdoorSdk(client);
  const login = new CasdoorLogin(client);

  return {
    client,
    sdk,
    login,

    // Convenience methods from client
    getOAuthPasswordCredentialsToken: client.getOAuthPasswordCredentialsToken.bind(client),
    getOAuthClientCredentialsToken: client.getOAuthClientCredentialsToken.bind(client),
    parseUserIdByJwtToken: client.parseUserIdByJwtToken.bind(client),
    parseJwtToken: client.parseJwtToken.bind(client),
    loadCert: client.loadCert.bind(client),
    getUserName: client.getUserName.bind(client),

    // Convenience methods from SDK
    getOwnPaginationUsers: sdk.getOwnPaginationUsers.bind(sdk),
    getOwnUser: sdk.getOwnUser.bind(sdk),
    getOwnUserByEmail: sdk.getOwnUserByEmail.bind(sdk),
    getOwnUserByPhone: sdk.getOwnUserByPhone.bind(sdk),
    getOwnUserByUserId: sdk.getOwnUserByUserId.bind(sdk),
    requestPasswordRecovery: sdk.requestPasswordRecovery.bind(sdk),
    resetPassword: sdk.resetPassword.bind(sdk),
    verifyEmail: sdk.verifyEmail.bind(sdk),
    addUser: sdk.addUser.bind(sdk),
    updateUser: sdk.updateUser.bind(sdk),
    deleteUser: sdk.deleteUser.bind(sdk),

    // Convenience methods from login
    signIn: login.signIn.bind(login),
    signUpWithOAuth2Provider: login.signUpWithOAuth2Provider.bind(login),
    signInWithOAuth2Provider: login.signInWithOAuth2Provider.bind(login),
    getOAuthAuthorizationUrl: login.getOAuthAuthorizationUrl.bind(login),
  };
}

export type CasdoorService = ReturnType<typeof createCasdoorService>;
