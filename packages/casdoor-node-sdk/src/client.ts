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

import type {
  AuthConfig,
  Response,
  OAuth2Token,
  Claims,
  User,
  Organization,
  Application,
  Role,
  Permission,
  Provider,
  Cert,
  Token,
  IntrospectTokenResult,
  Resource,
  Session,
  Group,
  CasdoorRecord,
} from "./types.js";
import * as auth from "./auth.js";
import * as user from "./user.js";
import * as organization from "./organization.js";
import * as application from "./application.js";
import * as role from "./role.js";
import * as permission from "./permission.js";
import * as provider from "./provider.js";
import * as cert from "./cert.js";
import * as token from "./token.js";
import * as resource from "./resource.js";
import * as email from "./email.js";
import * as sms from "./sms.js";
import * as session from "./session.js";
import * as group from "./group.js";
import * as record from "./record.js";

/**
 * Casdoor SDK Client
 * TypeScript port of casdoor-go-sdk v1.5.0
 */
export class Client {
  public readonly endpoint: string;
  public readonly clientId: string;
  public readonly clientSecret: string;
  public certificate: string;
  public readonly organizationName: string;
  public readonly applicationName: string;

  constructor(config: AuthConfig) {
    this.endpoint = config.endpoint;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.certificate = config.certificate;
    this.organizationName = config.organizationName;
    this.applicationName = config.applicationName;
  }

  /**
   * getUrl builds API URL with query parameters
   */
  getUrl(action: string, queryMap: Record<string, string> | null = null): string {
    let query = "";
    if (queryMap) {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(queryMap)) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      }
      query = parts.join("&");
    }
    return `${this.endpoint}/api/${action}?${query}`;
  }

  /**
   * getId returns the full ID for a resource
   */
  getId(name: string): string {
    return `${this.organizationName}/${name}`;
  }

  /**
   * doGetResponse performs GET request and returns parsed Response
   */
  async doGetResponse<T = unknown>(url: string): Promise<Response<T>> {
    const respBytes = await this.doGetBytesRawWithoutCheck(url);
    const response = JSON.parse(respBytes) as Response<T>;

    if (response.status !== "ok") {
      throw new Error(response.msg);
    }

    return response;
  }

  /**
   * doGetBytes performs GET request and returns response.data as JSON string
   */
  async doGetBytes(url: string): Promise<string> {
    const response = await this.doGetResponse(url);
    return JSON.stringify(response.data);
  }

  /**
   * doGetBytesRaw performs GET request and returns raw response body
   */
  async doGetBytesRaw(url: string): Promise<string> {
    const respBytes = await this.doGetBytesRawWithoutCheck(url);

    try {
      const response = JSON.parse(respBytes) as Response;
      if (response.status === "error") {
        throw new Error(response.msg);
      }
    } catch {
      // Not JSON or no error status, return as-is
    }

    return respBytes;
  }

  /**
   * doPost performs POST request
   */
  async doPost<T = unknown>(
    action: string,
    queryMap: Record<string, string> | null,
    postData: unknown,
    isForm: boolean = false,
    isFile: boolean = false
  ): Promise<Response<T>> {
    const url = this.getUrl(action, queryMap);

    let contentType: string;
    let body: string | FormData | Uint8Array;

    if (isForm) {
      if (isFile && postData instanceof Uint8Array) {
        const formData = new FormData();
        formData.append("file", new Blob([postData]));
        body = formData;
        contentType = ""; // Let fetch set the boundary
      } else {
        const params = postData as Record<string, string>;
        const formData = new FormData();
        for (const [k, v] of Object.entries(params)) {
          formData.append(k, v);
        }
        body = formData;
        contentType = ""; // Let fetch set the boundary
      }
    } else {
      contentType = "text/plain;charset=UTF-8";
      body = JSON.stringify(postData);
    }

    const respBytes = await this.doPostBytesRaw(url, contentType, body);
    const response = JSON.parse(respBytes) as Response<T>;

    if (response.status !== "ok") {
      throw new Error(response.msg);
    }

    return response;
  }

  /**
   * doPostBytesRaw performs raw POST request
   */
  async doPostBytesRaw(
    url: string,
    contentType: string,
    body: string | FormData | Uint8Array
  ): Promise<string> {
    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
    };

    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    const respBytes = await resp.text();

    if (resp.status !== 200 && resp.status !== 403) {
      throw new Error(respBytes);
    }

    return respBytes;
  }

  /**
   * Internal: GET request without status check
   */
  private async doGetBytesRawWithoutCheck(url: string): Promise<string> {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
    });

    const respBytes = await resp.text();

    if (resp.status !== 200 && resp.status !== 403) {
      throw new Error(respBytes);
    }

    return respBytes;
  }

  // ==================== Auth Methods ====================

  getOAuthToken(code: string, state: string): Promise<OAuth2Token> {
    return auth.getOAuthToken(this, code, state);
  }

  refreshOAuthToken(refreshToken: string): Promise<OAuth2Token> {
    return auth.refreshOAuthToken(this, refreshToken);
  }

  parseJwtToken(token: string): Claims {
    return auth.parseJwtToken(this, token);
  }

  parseJwtTokenWithoutVerify(token: string): Claims {
    return auth.parseJwtTokenWithoutVerify(token);
  }

  isRefreshToken(claims: Claims): boolean {
    return auth.isRefreshToken(claims);
  }

  getSigninUrl(redirectUri: string, state: string = ""): string {
    return auth.getSigninUrl(this, redirectUri, state);
  }

  getSignupUrl(redirectUri: string, state: string = ""): string {
    return auth.getSignupUrl(this, redirectUri, state);
  }

  getUserProfileUrl(username: string, accessToken: string | null = null): string {
    return auth.getUserProfileUrl(this, username, accessToken);
  }

  getMyProfileUrl(accessToken: string | null = null): string {
    return auth.getMyProfileUrl(this, accessToken);
  }

  // ==================== User Methods ====================

  getGlobalUsers(): Promise<User[]> {
    return user.getGlobalUsers(this);
  }

  getUsers(): Promise<User[]> {
    return user.getUsers(this);
  }

  getSortedUsers(sorter: string, limit: number): Promise<User[]> {
    return user.getSortedUsers(this, sorter, limit);
  }

  getPaginationUsers(p: number, pageSize: number, queryMap: Record<string, string> = {}): Promise<{ users: User[]; total: number }> {
    return user.getPaginationUsers(this, p, pageSize, queryMap);
  }

  getUserCount(isOnline: string = ""): Promise<number> {
    return user.getUserCount(this, isOnline);
  }

  getUser(name: string): Promise<User | null> {
    return user.getUser(this, name);
  }

  getUserByEmail(email: string): Promise<User | null> {
    return user.getUserByEmail(this, email);
  }

  getUserByPhone(phone: string): Promise<User | null> {
    return user.getUserByPhone(this, phone);
  }

  getUserByUserId(userId: string): Promise<User | null> {
    return user.getUserByUserId(this, userId);
  }

  setPassword(owner: string, name: string, oldPassword: string, newPassword: string): Promise<boolean> {
    return user.setPassword(this, owner, name, oldPassword, newPassword);
  }

  updateUserById(id: string, userData: Partial<User>): Promise<boolean> {
    return user.updateUserById(this, id, userData);
  }

  updateUser(userData: Partial<User>): Promise<boolean> {
    return user.updateUser(this, userData);
  }

  updateUserForColumns(userData: Partial<User>, columns: string[]): Promise<boolean> {
    return user.updateUserForColumns(this, userData, columns);
  }

  addUser(userData: Partial<User>): Promise<boolean> {
    return user.addUser(this, userData);
  }

  deleteUser(userData: Partial<User>): Promise<boolean> {
    return user.deleteUser(this, userData);
  }

  checkUserPassword(userData: Partial<User>): Promise<boolean> {
    return user.checkUserPassword(this, userData);
  }

  // ==================== Organization Methods ====================

  getOrganization(name: string): Promise<Organization | null> {
    return organization.getOrganization(this, name);
  }

  getOrganizations(): Promise<Organization[]> {
    return organization.getOrganizations(this);
  }

  getOrganizationNames(): Promise<Organization[]> {
    return organization.getOrganizationNames(this);
  }

  addOrganization(org: Partial<Organization>): Promise<boolean> {
    return organization.addOrganization(this, org);
  }

  updateOrganization(org: Partial<Organization>): Promise<boolean> {
    return organization.updateOrganization(this, org);
  }

  deleteOrganization(org: Partial<Organization>): Promise<boolean> {
    return organization.deleteOrganization(this, org);
  }

  // ==================== Application Methods ====================

  getApplications(): Promise<Application[]> {
    return application.getApplications(this);
  }

  getOrganizationApplications(): Promise<Application[]> {
    return application.getOrganizationApplications(this);
  }

  getApplication(name: string): Promise<Application | null> {
    return application.getApplication(this, name);
  }

  addApplication(app: Partial<Application>): Promise<boolean> {
    return application.addApplication(this, app);
  }

  updateApplication(app: Partial<Application>): Promise<boolean> {
    return application.updateApplication(this, app);
  }

  deleteApplication(app: Partial<Application>): Promise<boolean> {
    return application.deleteApplication(this, app);
  }

  // ==================== Role Methods ====================

  getRoles(): Promise<Role[]> {
    return role.getRoles(this);
  }

  getPaginationRoles(p: number, pageSize: number, queryMap: Record<string, string> = {}): Promise<{ roles: Role[]; total: number }> {
    return role.getPaginationRoles(this, p, pageSize, queryMap);
  }

  getRole(name: string): Promise<Role | null> {
    return role.getRole(this, name);
  }

  addRole(roleData: Partial<Role>): Promise<boolean> {
    return role.addRole(this, roleData);
  }

  updateRole(roleData: Partial<Role>): Promise<boolean> {
    return role.updateRole(this, roleData);
  }

  updateRoleForColumns(roleData: Partial<Role>, columns: string[]): Promise<boolean> {
    return role.updateRoleForColumns(this, roleData, columns);
  }

  deleteRole(roleData: Partial<Role>): Promise<boolean> {
    return role.deleteRole(this, roleData);
  }

  // ==================== Permission Methods ====================

  getPermissions(): Promise<Permission[]> {
    return permission.getPermissions(this);
  }

  getPermissionsByRole(name: string): Promise<Permission[]> {
    return permission.getPermissionsByRole(this, name);
  }

  getPaginationPermissions(p: number, pageSize: number, queryMap: Record<string, string> = {}): Promise<{ permissions: Permission[]; total: number }> {
    return permission.getPaginationPermissions(this, p, pageSize, queryMap);
  }

  getPermission(name: string): Promise<Permission | null> {
    return permission.getPermission(this, name);
  }

  addPermission(perm: Partial<Permission>): Promise<boolean> {
    return permission.addPermission(this, perm);
  }

  updatePermission(perm: Partial<Permission>): Promise<boolean> {
    return permission.updatePermission(this, perm);
  }

  updatePermissionForColumns(perm: Partial<Permission>, columns: string[]): Promise<boolean> {
    return permission.updatePermissionForColumns(this, perm, columns);
  }

  deletePermission(perm: Partial<Permission>): Promise<boolean> {
    return permission.deletePermission(this, perm);
  }

  // ==================== Provider Methods ====================

  getProviders(): Promise<Provider[]> {
    return provider.getProviders(this);
  }

  getProvider(name: string): Promise<Provider | null> {
    return provider.getProvider(this, name);
  }

  getPaginationProviders(p: number, pageSize: number, queryMap: Record<string, string> = {}): Promise<{ providers: Provider[]; total: number }> {
    return provider.getPaginationProviders(this, p, pageSize, queryMap);
  }

  addProvider(prov: Partial<Provider>): Promise<boolean> {
    return provider.addProvider(this, prov);
  }

  updateProvider(prov: Partial<Provider>): Promise<boolean> {
    return provider.updateProvider(this, prov);
  }

  deleteProvider(prov: Partial<Provider>): Promise<boolean> {
    return provider.deleteProvider(this, prov);
  }

  // ==================== Cert Methods ====================

  getGlobalCerts(): Promise<Cert[]> {
    return cert.getGlobalCerts(this);
  }

  getCerts(): Promise<Cert[]> {
    return cert.getCerts(this);
  }

  getCert(name: string): Promise<Cert | null> {
    return cert.getCert(this, name);
  }

  addCert(certData: Partial<Cert>): Promise<boolean> {
    return cert.addCert(this, certData);
  }

  updateCert(certData: Partial<Cert>): Promise<boolean> {
    return cert.updateCert(this, certData);
  }

  deleteCert(certData: Partial<Cert>): Promise<boolean> {
    return cert.deleteCert(this, certData);
  }

  // ==================== Token Methods ====================

  getTokens(): Promise<Token[]> {
    return token.getTokens(this);
  }

  getPaginationTokens(p: number, pageSize: number, queryMap: Record<string, string> = {}): Promise<{ tokens: Token[]; total: number }> {
    return token.getPaginationTokens(this, p, pageSize, queryMap);
  }

  getToken(name: string): Promise<Token | null> {
    return token.getToken(this, name);
  }

  addToken(tokenData: Partial<Token>): Promise<boolean> {
    return token.addToken(this, tokenData);
  }

  updateToken(tokenData: Partial<Token>): Promise<boolean> {
    return token.updateToken(this, tokenData);
  }

  updateTokenForColumns(tokenData: Partial<Token>, columns: string[]): Promise<boolean> {
    return token.updateTokenForColumns(this, tokenData, columns);
  }

  deleteToken(tokenData: Partial<Token>): Promise<boolean> {
    return token.deleteToken(this, tokenData);
  }

  introspectToken(tokenStr: string, tokenTypeHint: string): Promise<IntrospectTokenResult> {
    return token.introspectToken(this, tokenStr, tokenTypeHint);
  }

  // ==================== Resource Methods ====================

  getResource(id: string): Promise<Resource | null> {
    return resource.getResource(this, id);
  }

  getResourceEx(owner: string, name: string): Promise<Resource | null> {
    return resource.getResourceEx(this, owner, name);
  }

  getResources(owner: string, user: string, field: string, value: string, sortField: string, sortOrder: string): Promise<Resource[]> {
    return resource.getResources(this, owner, user, field, value, sortField, sortOrder);
  }

  getPaginationResources(owner: string, user: string, field: string, value: string, pageSize: number, page: number, sortField: string, sortOrder: string): Promise<Resource[]> {
    return resource.getPaginationResources(this, owner, user, field, value, pageSize, page, sortField, sortOrder);
  }

  uploadResource(user: string, tag: string, parent: string, fullFilePath: string, fileBytes: Uint8Array): Promise<{ fileUrl: string; name: string }> {
    return resource.uploadResource(this, user, tag, parent, fullFilePath, fileBytes);
  }

  uploadResourceEx(user: string, tag: string, parent: string, fullFilePath: string, fileBytes: Uint8Array, createdTime: string, description: string): Promise<{ fileUrl: string; name: string }> {
    return resource.uploadResourceEx(this, user, tag, parent, fullFilePath, fileBytes, createdTime, description);
  }

  deleteResource(res: Partial<Resource>): Promise<boolean> {
    return resource.deleteResource(this, res);
  }

  // ==================== Email Methods ====================

  sendEmail(title: string, content: string, sender: string, ...receivers: string[]): Promise<void> {
    return email.sendEmail(this, title, content, sender, ...receivers);
  }

  sendEmailByProvider(title: string, content: string, sender: string, providerName: string, ...receivers: string[]): Promise<void> {
    return email.sendEmailByProvider(this, title, content, sender, providerName, ...receivers);
  }

  // ==================== SMS Methods ====================

  sendSms(content: string, ...receivers: string[]): Promise<void> {
    return sms.sendSms(this, content, ...receivers);
  }

  sendSmsByProvider(content: string, providerName: string, ...receivers: string[]): Promise<void> {
    return sms.sendSmsByProvider(this, content, providerName, ...receivers);
  }

  // ==================== Session Methods ====================

  getSessions(): Promise<Session[]> {
    return session.getSessions(this);
  }

  getPaginationSessions(p: number, pageSize: number, queryMap: Record<string, string> = {}): Promise<{ sessions: Session[]; total: number }> {
    return session.getPaginationSessions(this, p, pageSize, queryMap);
  }

  getSession(name: string): Promise<Session | null> {
    return session.getSession(this, name);
  }

  addSession(sess: Partial<Session>): Promise<boolean> {
    return session.addSession(this, sess);
  }

  updateSession(sess: Partial<Session>): Promise<boolean> {
    return session.updateSession(this, sess);
  }

  updateSessionForColumns(sess: Partial<Session>, columns: string[]): Promise<boolean> {
    return session.updateSessionForColumns(this, sess, columns);
  }

  deleteSession(sess: Partial<Session>): Promise<boolean> {
    return session.deleteSession(this, sess);
  }

  // ==================== Group Methods ====================

  getGroups(): Promise<Group[]> {
    return group.getGroups(this);
  }

  getPaginationGroups(p: number, pageSize: number, queryMap: Record<string, string> = {}): Promise<{ groups: Group[]; total: number }> {
    return group.getPaginationGroups(this, p, pageSize, queryMap);
  }

  getGroup(name: string): Promise<Group | null> {
    return group.getGroup(this, name);
  }

  addGroup(grp: Partial<Group>): Promise<boolean> {
    return group.addGroup(this, grp);
  }

  updateGroup(grp: Partial<Group>): Promise<boolean> {
    return group.updateGroup(this, grp);
  }

  deleteGroup(grp: Partial<Group>): Promise<boolean> {
    return group.deleteGroup(this, grp);
  }

  // ==================== Record Methods ====================

  getRecords(): Promise<CasdoorRecord[]> {
    return record.getRecords(this);
  }

  getPaginationRecords(p: number, pageSize: number, queryMap: Record<string, string> = {}): Promise<{ records: CasdoorRecord[]; total: number }> {
    return record.getPaginationRecords(this, p, pageSize, queryMap);
  }

  getRecord(name: string): Promise<CasdoorRecord | null> {
    return record.getRecord(this, name);
  }

  addRecord(rec: Partial<CasdoorRecord>): Promise<boolean> {
    return record.addRecord(this, rec);
  }
}

/**
 * Create a new Casdoor client
 */
export function createClient(
  endpoint: string,
  clientId: string,
  clientSecret: string,
  certificate: string,
  organizationName: string,
  applicationName: string
): Client {
  return new Client({
    endpoint,
    clientId,
    clientSecret,
    certificate,
    organizationName,
    applicationName,
  });
}

/**
 * Create a new Casdoor client with config object
 */
export function createClientWithConf(config: AuthConfig): Client {
  return new Client(config);
}

/**
 * Get current time in RFC3339 format
 */
export function getCurrentTime(): string {
  return new Date().toISOString();
}
