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
export async function getProviders(client: Client): Promise<Provider[]> {
  const queryMap = {
    owner: client.organizationName,
  };
  const url = client.getUrl("get-providers", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Provider[];
}

/**
 * Get provider by name
 */
export async function getProvider(
  client: Client,
  name: string
): Promise<Provider | null> {
  const queryMap = {
    id: `${client.organizationName}/${name}`,
  };
  const url = client.getUrl("get-provider", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Provider | null;
}

/**
 * Get providers with pagination
 */
export async function getPaginationProviders(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ providers: Provider[]; total: number }> {
  queryMap.owner = client.organizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.getUrl("get-providers", queryMap);
  const response = await client.doGetResponse<Provider[]>(url);

  const providers = response.data;
  const total = response.data2 as number;

  return { providers, total };
}

/**
 * Add provider
 */
export async function addProvider(
  client: Client,
  provider: Partial<Provider>
): Promise<boolean> {
  const { affected } = await modifyProvider(client, "add-provider", provider, null);
  return affected;
}

/**
 * Update provider
 */
export async function updateProvider(
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
export async function deleteProvider(
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
  providerData.owner = client.organizationName;

  const queryMap: Record<string, string> = {
    id: `${providerData.owner}/${providerData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.doPost(action, queryMap, providerData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
