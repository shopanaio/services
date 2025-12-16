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
export async function getSessions(client: Client): Promise<Session[]> {
  const queryMap = {
    owner: client.organizationName,
  };
  const url = client.getUrl("get-sessions", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Session[];
}

/**
 * Get sessions with pagination
 */
export async function getPaginationSessions(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ sessions: Session[]; total: number }> {
  queryMap.owner = client.organizationName;
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.getUrl("get-sessions", queryMap);
  const response = await client.doGetResponse<Session[]>(url);

  const sessions = response.data;
  const total = response.data2 as number;

  return { sessions, total };
}

/**
 * Get session by name
 */
export async function getSession(
  client: Client,
  name: string
): Promise<Session | null> {
  const queryMap = {
    id: `${client.organizationName}/${name}`,
  };
  const url = client.getUrl("get-session", queryMap);
  const bytes = await client.doGetBytes(url);
  return JSON.parse(bytes) as Session | null;
}

/**
 * Add session
 */
export async function addSession(
  client: Client,
  session: Partial<Session>
): Promise<boolean> {
  const { affected } = await modifySession(client, "add-session", session, null);
  return affected;
}

/**
 * Update session
 */
export async function updateSession(
  client: Client,
  session: Partial<Session>
): Promise<boolean> {
  const { affected } = await modifySession(client, "update-session", session, null);
  return affected;
}

/**
 * Update session for specific columns
 */
export async function updateSessionForColumns(
  client: Client,
  session: Partial<Session>,
  columns: string[]
): Promise<boolean> {
  const { affected } = await modifySession(client, "update-session", session, columns);
  return affected;
}

/**
 * Delete session
 */
export async function deleteSession(
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
  sessionData.owner = client.organizationName;

  const queryMap: Record<string, string> = {
    id: `${sessionData.owner}/${sessionData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.doPost(action, queryMap, sessionData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
