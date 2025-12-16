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
import type { CasdoorRecord } from "./types.js";

/**
 * Get all records
 */
export async function getRecords(client: Client): Promise<CasdoorRecord[]> {
  const queryMap: globalThis.Record<string, string> = {
    owner: client.organizationName,
  };
  const url = client.getUrl("get-records", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as CasdoorRecord[];
}

/**
 * Get records with pagination
 */
export async function getPaginationRecords(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: globalThis.Record<string, string> = {}
): Promise<{ records: CasdoorRecord[]; total: number }> {
  queryMap.owner = client.organizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.getUrl("get-records", queryMap);
  const response = await client.doGetResponse<CasdoorRecord[]>(url);

  const records = response.data;
  const total = response.data2 as number;

  return { records, total };
}

/**
 * Get record by name
 */
export async function getRecord(
  client: Client,
  name: string
): Promise<CasdoorRecord | null> {
  const queryMap: globalThis.Record<string, string> = {
    id: `${client.organizationName}/${name}`,
  };
  const url = client.getUrl("get-record", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as CasdoorRecord | null;
}

/**
 * Add record
 */
export async function addRecord(
  client: Client,
  record: Partial<CasdoorRecord>
): Promise<boolean> {
  const recordData = { ...record };
  if (!recordData.owner) {
    recordData.owner = client.organizationName;
  }

  const resp = await client.doPost("add-record", null, recordData, false, false);
  return resp.data === "Affected";
}
