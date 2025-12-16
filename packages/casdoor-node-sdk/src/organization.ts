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
import type { Organization, Response } from "./types.js";

/**
 * Get organization by name
 */
export async function GetOrganization(
  client: Client,
  name: string
): Promise<Organization | null> {
  const queryMap = {
    id: `admin/${name}`,
  };
  const url = client.GetUrl("get-organization", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Organization | null;
}

/**
 * Get all organizations
 */
export async function GetOrganizations(
  client: Client
): Promise<Organization[]> {
  const queryMap = {
    owner: client.OrganizationName,
  };
  const url = client.GetUrl("get-organizations", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Organization[];
}

/**
 * Get organization names
 */
export async function GetOrganizationNames(
  client: Client
): Promise<Organization[]> {
  const queryMap = {
    owner: client.OrganizationName,
  };
  const url = client.GetUrl("get-organization-names", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Organization[];
}

/**
 * Add organization
 */
export async function AddOrganization(
  client: Client,
  organization: Partial<Organization>
): Promise<boolean> {
  const { affected } = await modifyOrganization(
    client,
    "add-organization",
    organization,
    null
  );
  return affected;
}

/**
 * Update organization
 */
export async function UpdateOrganization(
  client: Client,
  organization: Partial<Organization>
): Promise<boolean> {
  const { affected } = await modifyOrganization(
    client,
    "update-organization",
    organization,
    null
  );
  return affected;
}

/**
 * Delete organization
 */
export async function DeleteOrganization(
  client: Client,
  organization: Partial<Organization>
): Promise<boolean> {
  const { affected } = await modifyOrganization(
    client,
    "delete-organization",
    organization,
    null
  );
  return affected;
}

// Internal function
async function modifyOrganization(
  client: Client,
  action: string,
  organization: Partial<Organization>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const orgData = { ...organization };
  if (!orgData.owner) {
    orgData.owner = "admin";
  }

  const queryMap: Record<string, string> = {
    id: `${orgData.owner}/${orgData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.DoPost(action, queryMap, orgData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
