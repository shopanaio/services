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
import type { Permission, Response } from "./types.js";

/**
 * Get all permissions
 */
export async function GetPermissions(client: Client): Promise<Permission[]> {
  const queryMap = {
    owner: client.OrganizationName,
  };
  const url = client.GetUrl("get-permissions", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Permission[];
}

/**
 * Get permissions by role
 */
export async function GetPermissionsByRole(
  client: Client,
  name: string
): Promise<Permission[]> {
  const queryMap = {
    id: `${client.OrganizationName}/${name}`,
  };
  const url = client.GetUrl("get-permissions-by-role", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Permission[];
}

/**
 * Get permissions with pagination
 */
export async function GetPaginationPermissions(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ permissions: Permission[]; total: number }> {
  queryMap.owner = client.OrganizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.GetUrl("get-permissions", queryMap);
  const response = await client.DoGetResponse<Permission[]>(url);

  const permissions = response.data;
  const total = response.data2 as number;

  return { permissions, total };
}

/**
 * Get permission by name
 */
export async function GetPermission(
  client: Client,
  name: string
): Promise<Permission | null> {
  const queryMap = {
    id: `${client.OrganizationName}/${name}`,
  };
  const url = client.GetUrl("get-permission", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Permission | null;
}

/**
 * Add permission
 */
export async function AddPermission(
  client: Client,
  permission: Partial<Permission>
): Promise<boolean> {
  const { affected } = await modifyPermission(
    client,
    "add-permission",
    permission,
    null
  );
  return affected;
}

/**
 * Update permission
 */
export async function UpdatePermission(
  client: Client,
  permission: Partial<Permission>
): Promise<boolean> {
  const { affected } = await modifyPermission(
    client,
    "update-permission",
    permission,
    null
  );
  return affected;
}

/**
 * Update permission for specific columns
 */
export async function UpdatePermissionForColumns(
  client: Client,
  permission: Partial<Permission>,
  columns: string[]
): Promise<boolean> {
  const { affected } = await modifyPermission(
    client,
    "update-permission",
    permission,
    columns
  );
  return affected;
}

/**
 * Delete permission
 */
export async function DeletePermission(
  client: Client,
  permission: Partial<Permission>
): Promise<boolean> {
  const { affected } = await modifyPermission(
    client,
    "delete-permission",
    permission,
    null
  );
  return affected;
}

// Internal function
async function modifyPermission(
  client: Client,
  action: string,
  permission: Partial<Permission>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const permData = { ...permission };
  permData.owner = client.OrganizationName;

  const queryMap: Record<string, string> = {
    id: `${permData.owner}/${permData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.DoPost(action, queryMap, permData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
