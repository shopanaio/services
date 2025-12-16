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
import type { Session, Response } from "./types.js";

/**
 * Get all sessions
 */
export async function GetSessions(client: Client): Promise<Session[]> {
  const queryMap = {
    owner: client.OrganizationName,
  };
  const url = client.GetUrl("get-sessions", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Session[];
}

/**
 * Get sessions with pagination
 */
export async function GetPaginationSessions(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ sessions: Session[]; total: number }> {
  queryMap.owner = client.OrganizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.GetUrl("get-sessions", queryMap);
  const response = await client.DoGetResponse<Session[]>(url);

  const sessions = response.data;
  const total = response.data2 as number;

  return { sessions, total };
}

/**
 * Get session by name
 */
export async function GetSession(
  client: Client,
  name: string
): Promise<Session | null> {
  const queryMap = {
    id: `${client.OrganizationName}/${name}`,
  };
  const url = client.GetUrl("get-session", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Session | null;
}

/**
 * Add session
 */
export async function AddSession(
  client: Client,
  session: Partial<Session>
): Promise<boolean> {
  const { affected } = await modifySession(client, "add-session", session, null);
  return affected;
}

/**
 * Update session
 */
export async function UpdateSession(
  client: Client,
  session: Partial<Session>
): Promise<boolean> {
  const { affected } = await modifySession(client, "update-session", session, null);
  return affected;
}

/**
 * Delete session
 */
export async function DeleteSession(
  client: Client,
  session: Partial<Session>
): Promise<boolean> {
  const { affected } = await modifySession(client, "delete-session", session, null);
  return affected;
}

// Internal function
async function modifySession(
  client: Client,
  action: string,
  session: Partial<Session>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const sessionData = { ...session };
  sessionData.owner = client.OrganizationName;

  const queryMap: Record<string, string> = {
    id: `${sessionData.owner}/${sessionData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.DoPost(action, queryMap, sessionData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
