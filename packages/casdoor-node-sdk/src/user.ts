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

export const MFA_RECOVERY_CODES_SESSION = "mfa_recovery_codes";

/**
 * Get user ID
 */
export function getUserId(user: User): string {
  return `${user.owner}/${user.name}`;
}

/**
 * Get all global users
 */
export async function getGlobalUsers(client: Client): Promise<User[]> {
  const url = client.getUrl("get-global-users", null);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as User[];
}

/**
 * Get users for the organization
 */
export async function getUsers(client: Client): Promise<User[]> {
  const queryMap = {
    owner: client.organizationName,
  };
  const url = client.getUrl("get-users", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as User[];
}

/**
 * Get sorted users
 */
export async function getSortedUsers(
  client: Client,
  sorter: string,
  limit: number
): Promise<User[]> {
  const queryMap = {
    owner: client.organizationName,
    sorter,
    limit: String(limit),
  };
  const url = client.getUrl("get-sorted-users", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as User[];
}

/**
 * Get users with pagination
 */
export async function getPaginationUsers(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ users: User[]; total: number }> {
  queryMap.owner = client.organizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.getUrl("get-users", queryMap);
  const response = await client.doGetResponse<User[]>(url);

  const users = response.data;
  const total = response.data2 as number;

  return { users, total };
}

/**
 * Get user count
 */
export async function getUserCount(
  client: Client,
  isOnline: string = ""
): Promise<number> {
  const queryMap = {
    owner: client.organizationName,
    isOnline,
  };
  const url = client.getUrl("get-user-count", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as number;
}

/**
 * Get user by name
 */
export async function getUser(client: Client, name: string): Promise<User | null> {
  const queryMap = {
    id: `${client.organizationName}/${name}`,
  };
  const url = client.getUrl("get-user", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as User | null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(
  client: Client,
  email: string
): Promise<User | null> {
  const queryMap = {
    owner: client.organizationName,
    email,
  };
  const url = client.getUrl("get-user", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as User | null;
}

/**
 * Get user by phone
 */
export async function getUserByPhone(
  client: Client,
  phone: string
): Promise<User | null> {
  const queryMap = {
    owner: client.organizationName,
    phone,
  };
  const url = client.getUrl("get-user", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as User | null;
}

/**
 * Get user by user ID
 */
export async function getUserByUserId(
  client: Client,
  userId: string
): Promise<User | null> {
  const queryMap = {
    owner: client.organizationName,
    userId,
  };
  const url = client.getUrl("get-user", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as User | null;
}

/**
 * Set user password
 * Note: oldPassword is not required, if you don't need it, pass an empty string
 */
export async function setPassword(
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

  const resp = await client.doPost("set-password", null, param, true, false);
  return resp.status === "ok";
}

/**
 * Update user by ID
 */
export async function updateUserById(
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
export async function updateUser(
  client: Client,
  user: Partial<User>
): Promise<boolean> {
  const { affected } = await modifyUser(client, "update-user", user, null);
  return affected;
}

/**
 * Update user for specific columns
 */
export async function updateUserForColumns(
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
export async function addUser(
  client: Client,
  user: Partial<User>
): Promise<boolean> {
  const { affected } = await modifyUser(client, "add-user", user, null);
  return affected;
}

/**
 * Delete user
 */
export async function deleteUser(
  client: Client,
  user: Partial<User>
): Promise<boolean> {
  const { affected } = await modifyUser(client, "delete-user", user, null);
  return affected;
}

/**
 * Check user password
 */
export async function checkUserPassword(
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
    userData.owner = client.organizationName;
  }

  const resp = await client.doPost(action, queryMap, userData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
