import { Buffer } from "node:buffer";
import type { ApplicationOAuthClientRepository } from "../../../repositories/ApplicationOAuthClientRepository.js";
import {
  ApplicationAuthRequestError,
  parseRawSearchParams,
} from "./rawRequestBridge.js";

const DUPLICATE_SENSITIVE_PARAMETERS = [
  "grant_type",
  "client_id",
  "client_secret",
  "redirect_uri",
  "code",
  "code_verifier",
  "refresh_token",
  "resource",
  "scope",
] as const;

export class ApplicationOAuthResourcePolicyError extends Error {
  readonly statusCode = 400;
  readonly oauthError = "invalid_target";

  constructor(message = "The requested resource is invalid") {
    super(message);
    this.name = "ApplicationOAuthResourcePolicyError";
  }
}

export interface ApplicationOAuthResourcePolicyRequest {
  applicationId: string;
  resource: string;
  method: string;
  normalizedPath: string;
  rawQuery: string;
  rawBody: Buffer | undefined;
  authorizationHeader: string | undefined;
}

/**
 * Enforces the mandatory single-resource contract that OAuth Provider 1.6.23
 * does not persist with authorization codes or refresh-token families.
 */
export class ApplicationOAuthResourcePolicyGuard {
  constructor(
    private readonly clients: ApplicationOAuthClientRepository
  ) {}

  async assertRequest(
    request: ApplicationOAuthResourcePolicyRequest
  ): Promise<void> {
    if (
      request.method === "GET" &&
      request.normalizedPath === "/oauth2/authorize"
    ) {
      const params = parseRawSearchParams(request.rawQuery);
      assertNoDuplicateSensitiveParameters(params);
      await this.assertResourceAndClient(request, params, undefined);
      return;
    }

    if (
      request.method !== "POST" ||
      request.normalizedPath !== "/oauth2/token"
    ) {
      return;
    }
    if (!request.rawBody) {
      throw new ApplicationAuthRequestError("OAuth token body is required");
    }
    const params = parseRawSearchParams(request.rawBody.toString("utf8"));
    assertNoDuplicateSensitiveParameters(params);
    const grantType = getExactlyOne(params, "grant_type", false);
    if (
      grantType !== "authorization_code" &&
      grantType !== "refresh_token"
    ) {
      return;
    }
    const basicClientId = readBasicClientId(request.authorizationHeader);
    await this.assertResourceAndClient(request, params, basicClientId);
  }

  private async assertResourceAndClient(
    request: ApplicationOAuthResourcePolicyRequest,
    params: URLSearchParams,
    basicClientId: string | undefined
  ): Promise<void> {
    const requestedResource = getExactlyOne(params, "resource", true);
    if (requestedResource !== request.resource) {
      throw new ApplicationOAuthResourcePolicyError();
    }

    const formClientId = getZeroOrOne(params, "client_id");
    if (formClientId && basicClientId && formClientId !== basicClientId) {
      throw new ApplicationOAuthResourcePolicyError();
    }
    const clientId = formClientId ?? basicClientId;
    if (!clientId) {
      throw new ApplicationOAuthResourcePolicyError();
    }

    const client = await this.clients.findActivePolicy(
      request.applicationId,
      clientId
    );
    if (
      !client ||
      client.applicationId !== request.applicationId ||
      client.clientId !== clientId ||
      client.resource !== request.resource
    ) {
      throw new ApplicationOAuthResourcePolicyError();
    }
  }
}

function assertNoDuplicateSensitiveParameters(params: URLSearchParams): void {
  for (const parameter of DUPLICATE_SENSITIVE_PARAMETERS) {
    if (params.getAll(parameter).length > 1) {
      if (parameter === "resource") {
        throw new ApplicationOAuthResourcePolicyError();
      }
      throw new ApplicationAuthRequestError(
        `Duplicate OAuth parameter "${parameter}" is invalid`
      );
    }
  }
}

function getExactlyOne(
  params: URLSearchParams,
  name: string,
  resourceError: boolean
): string {
  const values = params.getAll(name);
  if (values.length !== 1 || values[0] === undefined || values[0] === "") {
    if (resourceError) throw new ApplicationOAuthResourcePolicyError();
    throw new ApplicationAuthRequestError(
      `OAuth parameter "${name}" is required`
    );
  }
  return values[0];
}

function getZeroOrOne(
  params: URLSearchParams,
  name: string
): string | undefined {
  const values = params.getAll(name);
  if (values.length === 0) return undefined;
  if (values.length !== 1 || !values[0]) {
    throw new ApplicationOAuthResourcePolicyError();
  }
  return values[0];
}

function readBasicClientId(
  authorizationHeader: string | undefined
): string | undefined {
  if (!authorizationHeader) return undefined;
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorizationHeader);
  if (!match) return undefined;

  let decoded: string;
  try {
    const bytes = Buffer.from(match[1]!, "base64");
    if (bytes.toString("base64").replace(/=+$/u, "") !== match[1]!.replace(/=+$/u, "")) {
      throw new Error("Non-canonical base64");
    }
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ApplicationAuthRequestError(
      "OAuth client authentication header is malformed"
    );
  }
  const separator = decoded.indexOf(":");
  if (separator < 1) {
    throw new ApplicationAuthRequestError(
      "OAuth client authentication header is malformed"
    );
  }
  try {
    const clientId = decodeURIComponent(decoded.slice(0, separator));
    if (!clientId || clientId.includes("\0")) throw new Error("Invalid client id");
    return clientId;
  } catch {
    throw new ApplicationAuthRequestError(
      "OAuth client authentication header is malformed"
    );
  }
}
