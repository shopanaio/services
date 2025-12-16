// Copyright 2022 The Casdoor Authors. All Rights Reserved.
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
import type { Provider, Response } from "./types.js";

/**
 * Get all providers
 */
export async function GetProviders(client: Client): Promise<Provider[]> {
  const queryMap = {
    owner: client.OrganizationName,
  };
  const url = client.GetUrl("get-providers", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Provider[];
}

/**
 * Get provider by name
 */
export async function GetProvider(
  client: Client,
  name: string
): Promise<Provider | null> {
  const queryMap = {
    id: `${client.OrganizationName}/${name}`,
  };
  const url = client.GetUrl("get-provider", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Provider | null;
}

/**
 * Get providers with pagination
 */
export async function GetPaginationProviders(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ providers: Provider[]; total: number }> {
  queryMap.owner = client.OrganizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.GetUrl("get-providers", queryMap);
  const response = await client.DoGetResponse<Provider[]>(url);

  const providers = response.data;
  const total = response.data2 as number;

  return { providers, total };
}

/**
 * Add provider
 */
export async function AddProvider(
  client: Client,
  provider: Partial<Provider>
): Promise<boolean> {
  const { affected } = await modifyProvider(client, "add-provider", provider, null);
  return affected;
}

/**
 * Update provider
 */
export async function UpdateProvider(
  client: Client,
  provider: Partial<Provider>
): Promise<boolean> {
  const { affected } = await modifyProvider(
    client,
    "update-provider",
    provider,
    null
  );
  return affected;
}

/**
 * Delete provider
 */
export async function DeleteProvider(
  client: Client,
  provider: Partial<Provider>
): Promise<boolean> {
  const { affected } = await modifyProvider(
    client,
    "delete-provider",
    provider,
    null
  );
  return affected;
}

// Internal function
async function modifyProvider(
  client: Client,
  action: string,
  provider: Partial<Provider>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const providerData = { ...provider };
  providerData.owner = client.OrganizationName;

  const queryMap: Record<string, string> = {
    id: `${providerData.owner}/${providerData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.DoPost(action, queryMap, providerData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
