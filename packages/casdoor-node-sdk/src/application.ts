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
import type { Application, Response } from "./types.js";

/**
 * Get all applications
 */
export async function getApplications(client: Client): Promise<Application[]> {
  const queryMap = {
    owner: "admin",
  };
  const url = client.getUrl("get-applications", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Application[];
}

/**
 * Get organization applications
 */
export async function getOrganizationApplications(
  client: Client
): Promise<Application[]> {
  const queryMap = {
    owner: "admin",
    organization: client.organizationName,
  };
  const url = client.getUrl("get-organization-applications", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Application[];
}

/**
 * Get application by name
 */
export async function getApplication(
  client: Client,
  name: string
): Promise<Application | null> {
  const queryMap = {
    id: `admin/${name}`,
  };
  const url = client.getUrl("get-application", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Application | null;
}

/**
 * Add application
 */
export async function addApplication(
  client: Client,
  application: Partial<Application>
): Promise<boolean> {
  const { affected } = await modifyApplication(
    client,
    "add-application",
    application,
    null
  );
  return affected;
}

/**
 * Update application
 */
export async function updateApplication(
  client: Client,
  application: Partial<Application>
): Promise<boolean> {
  const { affected } = await modifyApplication(
    client,
    "update-application",
    application,
    null
  );
  return affected;
}

/**
 * Delete application
 */
export async function deleteApplication(
  client: Client,
  application: Partial<Application>
): Promise<boolean> {
  const { affected } = await modifyApplication(
    client,
    "delete-application",
    application,
    null
  );
  return affected;
}

// Internal function
async function modifyApplication(
  client: Client,
  action: string,
  application: Partial<Application>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const appData = { ...application };
  if (!appData.owner) {
    appData.owner = "admin";
  }

  const queryMap: Record<string, string> = {
    id: `${appData.owner}/${appData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.doPost(action, queryMap, appData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
