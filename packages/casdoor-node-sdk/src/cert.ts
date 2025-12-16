// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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
import type { Cert, Response } from "./types.js";

/**
 * Get all global certs
 */
export async function getGlobalCerts(client: Client): Promise<Cert[]> {
  const url = client.getUrl("get-global-certs", null);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Cert[];
}

/**
 * Get all certs
 */
export async function getCerts(client: Client): Promise<Cert[]> {
  const queryMap = {
    owner: client.organizationName,
  };
  const url = client.getUrl("get-certs", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Cert[];
}

/**
 * Get cert by name
 */
export async function getCert(client: Client, name: string): Promise<Cert | null> {
  const queryMap = {
    id: `${client.organizationName}/${name}`,
  };
  const url = client.getUrl("get-cert", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Cert | null;
}

/**
 * Add cert
 */
export async function addCert(
  client: Client,
  cert: Partial<Cert>
): Promise<boolean> {
  const { affected } = await modifyCert(client, "add-cert", cert, null);
  return affected;
}

/**
 * Update cert
 */
export async function updateCert(
  client: Client,
  cert: Partial<Cert>
): Promise<boolean> {
  const { affected } = await modifyCert(client, "update-cert", cert, null);
  return affected;
}

/**
 * Delete cert
 */
export async function deleteCert(
  client: Client,
  cert: Partial<Cert>
): Promise<boolean> {
  const { affected } = await modifyCert(client, "delete-cert", cert, null);
  return affected;
}

// Internal function
async function modifyCert(
  client: Client,
  action: string,
  cert: Partial<Cert>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const certData = { ...cert };
  if (!certData.owner) {
    certData.owner = client.organizationName;
  }

  const queryMap: Record<string, string> = {
    id: `${certData.owner}/${certData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.doPost(action, queryMap, certData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
