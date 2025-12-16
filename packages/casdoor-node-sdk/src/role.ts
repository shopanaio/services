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
import type { Role, Response } from "./types.js";

/**
 * Get all roles
 */
export async function getRoles(client: Client): Promise<Role[]> {
  const queryMap = {
    owner: client.organizationName,
  };
  const url = client.getUrl("get-roles", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Role[];
}

/**
 * Get roles with pagination
 */
export async function getPaginationRoles(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ roles: Role[]; total: number }> {
  queryMap.owner = client.organizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.getUrl("get-roles", queryMap);
  const response = await client.doGetResponse<Role[]>(url);

  const roles = response.data;
  const total = response.data2 as number;

  return { roles, total };
}

/**
 * Get role by name
 */
export async function getRole(client: Client, name: string): Promise<Role | null> {
  const queryMap = {
    id: `${client.organizationName}/${name}`,
  };
  const url = client.getUrl("get-role", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Role | null;
}

/**
 * Add role
 */
export async function addRole(
  client: Client,
  role: Partial<Role>
): Promise<boolean> {
  const { affected } = await modifyRole(client, "add-role", role, null);
  return affected;
}

/**
 * Update role
 */
export async function updateRole(
  client: Client,
  role: Partial<Role>
): Promise<boolean> {
  const { affected } = await modifyRole(client, "update-role", role, null);
  return affected;
}

/**
 * Update role for specific columns
 */
export async function updateRoleForColumns(
  client: Client,
  role: Partial<Role>,
  columns: string[]
): Promise<boolean> {
  const { affected } = await modifyRole(client, "update-role", role, columns);
  return affected;
}

/**
 * Delete role
 */
export async function deleteRole(
  client: Client,
  role: Partial<Role>
): Promise<boolean> {
  const { affected } = await modifyRole(client, "delete-role", role, null);
  return affected;
}

// Internal function
async function modifyRole(
  client: Client,
  action: string,
  role: Partial<Role>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const roleData = { ...role };
  roleData.owner = client.organizationName;

  const queryMap: Record<string, string> = {
    id: `${roleData.owner}/${roleData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.doPost(action, queryMap, roleData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
