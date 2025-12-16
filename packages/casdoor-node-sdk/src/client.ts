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

import type { AuthConfig, Response } from "./types.js";

/**
 * Casdoor SDK Client
 * TypeScript port of casdoor-go-sdk v1.5.0
 */
export class Client {
  public readonly endpoint: string;
  public readonly clientId: string;
  public readonly clientSecret: string;
  public certificate: string;
  public readonly organizationName: string;
  public readonly applicationName: string;

  constructor(config: AuthConfig) {
    this.endpoint = config.endpoint;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.certificate = config.certificate;
    this.organizationName = config.organizationName;
    this.applicationName = config.applicationName;
  }

  /**
   * getUrl builds API URL with query parameters
   */
  getUrl(action: string, queryMap: Record<string, string> | null = null): string {
    let query = "";
    if (queryMap) {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(queryMap)) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      }
      query = parts.join("&");
    }
    return `${this.endpoint}/api/${action}?${query}`;
  }

  /**
   * getId returns the full ID for a resource
   */
  getId(name: string): string {
    return `${this.organizationName}/${name}`;
  }

  /**
   * doGetResponse performs GET request and returns parsed Response
   */
  async doGetResponse<T = unknown>(url: string): Promise<Response<T>> {
    const respBytes = await this.doGetBytesRawWithoutCheck(url);
    const response = JSON.parse(respBytes) as Response<T>;

    if (response.status !== "ok") {
      throw new Error(response.msg);
    }

    return response;
  }

  /**
   * doGetBytes performs GET request and returns response.data as JSON string
   */
  async doGetBytes(url: string): Promise<string> {
    const response = await this.doGetResponse(url);
    return JSON.stringify(response.data);
  }

  /**
   * doGetBytesRaw performs GET request and returns raw response body
   */
  async doGetBytesRaw(url: string): Promise<string> {
    const respBytes = await this.doGetBytesRawWithoutCheck(url);

    try {
      const response = JSON.parse(respBytes) as Response;
      if (response.status === "error") {
        throw new Error(response.msg);
      }
    } catch {
      // Not JSON or no error status, return as-is
    }

    return respBytes;
  }

  /**
   * doPost performs POST request
   */
  async doPost<T = unknown>(
    action: string,
    queryMap: Record<string, string> | null,
    postData: unknown,
    isForm: boolean = false,
    isFile: boolean = false
  ): Promise<Response<T>> {
    const url = this.getUrl(action, queryMap);

    let contentType: string;
    let body: string | FormData | Uint8Array;

    if (isForm) {
      if (isFile && postData instanceof Uint8Array) {
        const formData = new FormData();
        formData.append("file", new Blob([postData]));
        body = formData;
        contentType = ""; // Let fetch set the boundary
      } else {
        const params = postData as Record<string, string>;
        const formData = new FormData();
        for (const [k, v] of Object.entries(params)) {
          formData.append(k, v);
        }
        body = formData;
        contentType = ""; // Let fetch set the boundary
      }
    } else {
      contentType = "text/plain;charset=UTF-8";
      body = JSON.stringify(postData);
    }

    const respBytes = await this.doPostBytesRaw(url, contentType, body);
    const response = JSON.parse(respBytes) as Response<T>;

    if (response.status !== "ok") {
      throw new Error(response.msg);
    }

    return response;
  }

  /**
   * doPostBytesRaw performs raw POST request
   */
  async doPostBytesRaw(
    url: string,
    contentType: string,
    body: string | FormData | Uint8Array
  ): Promise<string> {
    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
    };

    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    const respBytes = await resp.text();

    if (resp.status !== 200 && resp.status !== 403) {
      throw new Error(respBytes);
    }

    return respBytes;
  }

  /**
   * Internal: GET request without status check
   */
  private async doGetBytesRawWithoutCheck(url: string): Promise<string> {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
    });

    const respBytes = await resp.text();

    if (resp.status !== 200 && resp.status !== 403) {
      throw new Error(respBytes);
    }

    return respBytes;
  }
}

/**
 * Create a new Casdoor client
 */
export function createClient(
  endpoint: string,
  clientId: string,
  clientSecret: string,
  certificate: string,
  organizationName: string,
  applicationName: string
): Client {
  return new Client({
    endpoint,
    clientId,
    clientSecret,
    certificate,
    organizationName,
    applicationName,
  });
}

/**
 * Create a new Casdoor client with config object
 */
export function createClientWithConf(config: AuthConfig): Client {
  return new Client(config);
}

/**
 * Get current time in RFC3339 format
 */
export function getCurrentTime(): string {
  return new Date().toISOString();
}
