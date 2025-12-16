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
import type { Token, IntrospectTokenResult, Response } from "./types.js";

/**
 * Get all tokens
 */
export async function GetTokens(client: Client): Promise<Token[]> {
  const queryMap = {
    owner: "admin",
  };
  const url = client.GetUrl("get-tokens", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Token[];
}

/**
 * Get tokens with pagination
 */
export async function GetPaginationTokens(
  client: Client,
  p: number,
  pageSize: number,
  queryMap: Record<string, string> = {}
): Promise<{ tokens: Token[]; total: number }> {
  queryMap.owner = "admin";
  queryMap.p = String(p);
  queryMap.pageSize = String(pageSize);

  const url = client.GetUrl("get-tokens", queryMap);
  const response = await client.DoGetResponse<Token[]>(url);

  const tokens = response.data;
  const total = response.data2 as number;

  return { tokens, total };
}

/**
 * Get token by name
 */
export async function GetToken(client: Client, name: string): Promise<Token | null> {
  const queryMap = {
    id: `admin/${name}`,
  };
  const url = client.GetUrl("get-token", queryMap);
  const bytes = await client.DoGetBytes(url);
  return JSON.parse(bytes) as Token | null;
}

/**
 * Add token
 */
export async function AddToken(
  client: Client,
  token: Partial<Token>
): Promise<boolean> {
  const { affected } = await modifyToken(client, "add-token", token, null);
  return affected;
}

/**
 * Update token
 */
export async function UpdateToken(
  client: Client,
  token: Partial<Token>
): Promise<boolean> {
  const { affected } = await modifyToken(client, "update-token", token, null);
  return affected;
}

/**
 * Update token for specific columns
 */
export async function UpdateTokenForColumns(
  client: Client,
  token: Partial<Token>,
  columns: string[]
): Promise<boolean> {
  const { affected } = await modifyToken(client, "update-token", token, columns);
  return affected;
}

/**
 * Delete token
 */
export async function DeleteToken(
  client: Client,
  token: Partial<Token>
): Promise<boolean> {
  const { affected } = await modifyToken(client, "delete-token", token, null);
  return affected;
}

/**
 * Introspect token (OAuth2 token introspection)
 */
export async function IntrospectToken(
  client: Client,
  token: string,
  tokenTypeHint: string
): Promise<IntrospectTokenResult> {
  const formData = new FormData();
  formData.append("token", token);
  formData.append("token_type_hint", tokenTypeHint);

  const url = client.GetUrl("login/oauth/introspect", null);

  const respBytes = await client.DoPostBytesRaw(url, "", formData);
  return JSON.parse(respBytes) as IntrospectTokenResult;
}

// Internal function
async function modifyToken(
  client: Client,
  action: string,
  token: Partial<Token>,
  columns: string[] | null
): Promise<{ response: Response; affected: boolean }> {
  const tokenData = { ...token };
  tokenData.owner = "admin";

  const queryMap: Record<string, string> = {
    id: `${tokenData.owner}/${tokenData.name}`,
  };

  if (columns && columns.length > 0) {
    queryMap.columns = columns.join(",");
  }

  const resp = await client.DoPost(action, queryMap, tokenData, false, false);
  return { response: resp, affected: resp.data === "Affected" };
}
