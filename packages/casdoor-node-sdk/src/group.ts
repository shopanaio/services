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
import type { Group, Response } from "./types.js";

/**
 * Get all groups
 */
export async function getGroups(client: Client): Promise<Group[]> {
  const queryMap = {
    owner: client.organizationName,
  };
  const url = client.getUrl("get-groups", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Group[];
}

/**
 * Get groups with pagination
 */
export async function getPaginationGroups(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ groups: Group[]; total: number }> {
  queryMap.owner = client.organizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.getUrl("get-groups", queryMap);
  const response = await client.doGetResponse<Group[]>(url);

  const groups = response.data;
  const total = response.data2 as number;

  return { groups, total };
}

/**
 * Get group by name
 */
export async function getGroup(client: Client, name: string): Promise<Group | null> {
  const queryMap = {
    id: `${client.organizationName}/${name}`,
  };
  const url = client.getUrl("get-group", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Group | null;
}

/**
 * Add group
 */
export async function addGroup(
  client: Client,
  group: Partial<Group>
): Promise<boolean> {
  const { affected } = await modifyGroup(client, "add-group", group, null);
  return affected;
}

/**
 * Update group
 */
export async function updateGroup(
  client: Client,
  group: Partial<Group>
): Promise<boolean> {
  const { affected } = await modifyGroup(client, "update-group", group, null);
  return affected;
}

/**
 * Delete group
 */
export async function deleteGroup(
  client: Client,
  group: Partial<Group>
): Promise<boolean> {
  const { affected } = await modifyGroup(client, "delete-group", group, null);
  return affected;
}

// Internal function
async function modifyGroup(
  client: Client,
  action: string,
  group: Partial<Group>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const groupData = { ...group };
  groupData.owner = client.organizationName;

  const queryMap: Record<string, string> = {
    id: `${groupData.owner}/${groupData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.doPost(action, queryMap, groupData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
