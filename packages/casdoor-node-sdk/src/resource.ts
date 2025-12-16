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
import type { Resource } from "./types.js";

/**
 * Get resource by ID
 */
export async function getResource(
  client: Client,
  id: string
): Promise<Resource | null> {
  const queryMap = {
    owner: client.organizationName,
    id,
  };
  const url = client.getUrl("get-resource", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Resource | null;
}

/**
 * Get resource by owner and name
 */
export async function getResourceEx(
  client: Client,
  owner: string,
  name: string
): Promise<Resource | null> {
  return getResource(client, `${owner}/${name}`);
}

/**
 * Get resources with filters
 */
export async function getResources(
  client: Client,
  owner: string,
  user: string,
  field: string,
  value: string,
  sortField: string,
  sortOrder: string
): Promise<Resource[]> {
  const queryMap = {
    owner,
    user,
    field,
    value,
    sortField,
    sortOrder,
  };
  const url = client.getUrl("get-resources", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Resource[];
}

/**
 * Get resources with pagination
 */
export async function getPaginationResources(
  client: Client,
  owner: string,
  user: string,
  field: string,
  value: string,
  pageSize: number,
  page: number,
  sortField: string,
  sortOrder: string
): Promise<Resource[]> {
  const queryMap = {
    owner,
    user,
    field,
    value,
    p: String(page),
    pageSize: String(pageSize),
    sortField,
    sortOrder,
  };
  const url = client.getUrl("get-resources", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Resource[];
}

/**
 * Upload resource
 */
export async function uploadResource(
  client: Client,
  user: string,
  tag: string,
  parent: string,
  fullFilePath: string,
  fileBytes: Uint8Array
): Promise<{ fileUrl: string; name: string }> {
  const queryMap = {
    owner: client.organizationName,
    user,
    application: client.applicationName,
    tag,
    parent,
    fullFilePath,
  };

  const resp = await client.doPost("upload-resource", queryMap, fileBytes, true, true);

  return {
    fileUrl: resp.data as string,
    name: resp.data2 as string,
  };
}

/**
 * Upload resource with extra parameters
 */
export async function uploadResourceEx(
  client: Client,
  user: string,
  tag: string,
  parent: string,
  fullFilePath: string,
  fileBytes: Uint8Array,
  createdTime: string,
  description: string
): Promise<{ fileUrl: string; name: string }> {
  const queryMap = {
    owner: client.organizationName,
    user,
    application: client.applicationName,
    tag,
    parent,
    fullFilePath,
    createdTime,
    description,
  };

  const resp = await client.doPost("upload-resource", queryMap, fileBytes, true, true);

  return {
    fileUrl: resp.data as string,
    name: resp.data2 as string,
  };
}

/**
 * Delete resource
 */
export async function deleteResource(
  client: Client,
  resource: Partial<Resource>
): Promise<boolean> {
  const resourceData = { ...resource };
  if (!resourceData.owner) {
    resourceData.owner = client.organizationName;
  }

  const resp = await client.doPost("delete-resource", null, resourceData, false, false);
  return resp.data === "Affected";
}
