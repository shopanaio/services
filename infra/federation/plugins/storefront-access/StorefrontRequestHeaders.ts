import { isIP } from "node:net";

const PUBLIC_HEADER = "x-shopana-storefront-access-token";
const PRIVATE_HEADER = "shopana-storefront-private-token";
const BUYER_IP_HEADER = "shopana-storefront-buyer-ip";

export function parseStorefrontRequest(request: Request): {
  readonly token: string;
  readonly mode: "PUBLIC" | "PRIVATE";
  readonly buyerIp?: string;
} {
  const publicToken = singleHeader(request, PUBLIC_HEADER);
  const privateToken = singleHeader(request, PRIVATE_HEADER);
  if (publicToken && privateToken) {
    throw requestError(
      400,
      "STOREFRONT_CREDENTIAL_AMBIGUOUS",
      "Send exactly one storefront credential",
    );
  }
  if (!publicToken && !privateToken) {
    throw requestError(
      401,
      "STOREFRONT_CREDENTIAL_REQUIRED",
      "A storefront credential is required",
    );
  }
  const token = publicToken ?? privateToken!;
  if (token.length > 128) {
    throw requestError(
      401,
      "STOREFRONT_CREDENTIAL_INVALID",
      "Invalid storefront credential",
    );
  }
  const buyerIp = privateToken
    ? singleHeader(request, BUYER_IP_HEADER)
    : trustedForwardedIp(request);
  if (buyerIp && isIP(buyerIp) === 0) {
    throw requestError(
      400,
      "STOREFRONT_BUYER_IP_INVALID",
      "Buyer IP is invalid",
    );
  }
  return {
    token,
    mode: publicToken ? "PUBLIC" : "PRIVATE",
    ...(buyerIp ? { buyerIp } : {}),
  };
}

export function parseRequestId(request: Request): string | undefined {
  const requestId = singleHeader(request, "x-request-id");
  if (requestId && requestId.length > 255) {
    throw requestError(
      400,
      "STOREFRONT_REQUEST_ID_INVALID",
      "Request ID is invalid",
    );
  }
  return requestId;
}

function trustedForwardedIp(request: Request): string | undefined {
  if (process.env.STOREFRONT_TRUST_PROXY_HEADERS !== "true") {
    return undefined;
  }
  const value = request.headers.get("x-forwarded-for");
  if (!value) return undefined;
  const first = value.split(",")[0]?.trim();
  return first && isIP(first) !== 0 ? first : undefined;
}

function singleHeader(request: Request, name: string): string | undefined {
  const value = request.headers.get(name)?.trim();
  if (!value) return undefined;
  if (value.includes(",")) {
    throw requestError(400, "STOREFRONT_HEADER_INVALID", "Invalid header");
  }
  return value;
}

export function requestError(
  status: number,
  code: string,
  message: string,
) {
  return Object.assign(new Error(message), { status, code });
}
