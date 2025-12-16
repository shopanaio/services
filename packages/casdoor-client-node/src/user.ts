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

import { Client } from "./client.js";
import type { User, Response } from "./types.js";

export const MfaRecoveryCodesSession = "mfa_recovery_codes";

/**
 * Get user ID
 */
export function GetUserId(user: User): string {
  return `${user.owner}/${user.name}`;
}

/**
 * Get all global users
 */
export async function GetGlobalUsers(client: Client): Promise<User[]> {
  const url = client.GetUrl("get-global-users", null);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as User[];
}

/**
 * Get users for the organization
 */
export async function GetUsers(client: Client): Promise<User[]> {
  const queryMap = {
    owner: client.OrganizationName,
  };
  const url = client.GetUrl("get-users", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as User[];
}

/**
 * Get sorted users
 */
export async function GetSortedUsers(
  client: Client,
  sorter: string,
  limit: number
): Promise<User[]> {
  const queryMap = {
    owner: client.OrganizationName,
    sorter,
    limit: String(limit),
  };
  const url = client.GetUrl("get-sorted-users", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as User[];
}

/**
 * Get users with pagination
 */
export async function GetPaginationUsers(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ users: User[]; total: number }> {
  queryMap.owner = client.OrganizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.GetUrl("get-users", queryMap);
  const response = await client.DoGetResponse<User[]>(url);

  const users = response.data;
  const total = response.data2 as number;

  return { users, total };
}

/**
 * Get user count
 */
export async function GetUserCount(
  client: Client,
  isOnline: string = ""
): Promise<number> {
  const queryMap = {
    owner: client.OrganizationName,
    isOnline,
  };
  const url = client.GetUrl("get-user-count", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as number;
}

/**
 * Get user by name
 */
export async function GetUser(client: Client, name: string): Promise<User | null> {
  const queryMap = {
    id: `${client.OrganizationName}/${name}`,
  };
  const url = client.GetUrl("get-user", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as User | null;
}

/**
 * Get user by email
 */
export async function GetUserByEmail(
  client: Client,
  email: string
): Promise<User | null> {
  const queryMap = {
    owner: client.OrganizationName,
    email,
  };
  const url = client.GetUrl("get-user", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as User | null;
}

/**
 * Get user by phone
 */
export async function GetUserByPhone(
  client: Client,
  phone: string
): Promise<User | null> {
  const queryMap = {
    owner: client.OrganizationName,
    phone,
  };
  const url = client.GetUrl("get-user", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as User | null;
}

/**
 * Get user by user ID
 */
export async function GetUserByUserId(
  client: Client,
  userId: string
): Promise<User | null> {
  const queryMap = {
    owner: client.OrganizationName,
    userId,
  };
  const url = client.GetUrl("get-user", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as User | null;
}

/**
 * Set user password
 * Note: oldPassword is not required, if you don't need it, pass an empty string
 */
export async function SetPassword(
  client: Client,
  owner: string,
  name: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  const param = {
    userOwner: owner,
    userName: name,
    oldPassword,
    newPassword,
  };

  const resp = await client.DoPost("set-password", null, param, true, false);
  return resp.status === "ok";
}

/**
 * Update user by ID
 */
export async function UpdateUserById(
  client: Client,
  id: string,
  user: Partial<User>
): Promise<boolean> {
  const { affected } = await modifyUserById(client, "update-user", id, user, null);
  return affected;
}

/**
 * Update user
 */
export async function UpdateUser(
  client: Client,
  user: Partial<User>
): Promise<boolean> {
  const { affected } = await modifyUser(client, "update-user", user, null);
  return affected;
}

/**
 * Update user for specific columns
 */
export async function UpdateUserForColumns(
  client: Client,
  user: Partial<User>,
  columns: string[]
): Promise<boolean> {
  const { affected } = await modifyUser(client, "update-user", user, columns);
  return affected;
}

/**
 * Add user
 */
export async function AddUser(
  client: Client,
  user: Partial<User>
): Promise<boolean> {
  const { affected } = await modifyUser(client, "add-user", user, null);
  return affected;
}

/**
 * Delete user
 */
export async function DeleteUser(
  client: Client,
  user: Partial<User>
): Promise<boolean> {
  const { affected } = await modifyUser(client, "delete-user", user, null);
  return affected;
}

/**
 * Check user password
 */
export async function CheckUserPassword(
  client: Client,
  user: Partial<User>
): Promise<boolean> {
  const { affected } = await modifyUser(client, "check-user-password", user, null);
  return affected;
}

// Internal function to modify user
async function modifyUser(
  client: Client,
  action: string,
  user: Partial<User>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const id = user.owner && user.name ? `${user.owner}/${user.name}` : "";
  return modifyUserById(client, action, id, user, columns);
}

// Internal function to modify user by ID
async function modifyUserById(
  client: Client,
  action: string,
  id: string,
  user: Partial<User>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const queryMap: Record<string, string> = { id };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const userData = { ...user };
  if (!userData.owner) {
    userData.owner = client.OrganizationName;
  }

  const resp = await client.DoPost(action, queryMap, userData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
