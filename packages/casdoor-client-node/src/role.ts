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
export async function GetRoles(client: Client): Promise<Role[]> {
  const queryMap = {
    owner: client.OrganizationName,
  };
  const url = client.GetUrl("get-roles", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Role[];
}

/**
 * Get roles with pagination
 */
export async function GetPaginationRoles(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ roles: Role[]; total: number }> {
  queryMap.owner = client.OrganizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.GetUrl("get-roles", queryMap);
  const response = await client.DoGetResponse<Role[]>(url);

  const roles = response.data;
  const total = response.data2 as number;

  return { roles, total };
}

/**
 * Get role by name
 */
export async function GetRole(client: Client, name: string): Promise<Role | null> {
  const queryMap = {
    id: `${client.OrganizationName}/${name}`,
  };
  const url = client.GetUrl("get-role", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Role | null;
}

/**
 * Add role
 */
export async function AddRole(
  client: Client,
  role: Partial<Role>
): Promise<boolean> {
  const { affected } = await modifyRole(client, "add-role", role, null);
  return affected;
}

/**
 * Update role
 */
export async function UpdateRole(
  client: Client,
  role: Partial<Role>
): Promise<boolean> {
  const { affected } = await modifyRole(client, "update-role", role, null);
  return affected;
}

/**
 * Update role for specific columns
 */
export async function UpdateRoleForColumns(
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
export async function DeleteRole(
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
  roleData.owner = client.OrganizationName;

  const queryMap: Record<string, string> = {
    id: `${roleData.owner}/${roleData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.DoPost(action, queryMap, roleData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
