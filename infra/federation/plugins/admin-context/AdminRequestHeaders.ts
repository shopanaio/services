export const ADMIN_REQUEST_ID_HEADER = "x-request-id";

export function parseAdminRequest(request: Request): {
  readonly accessToken?: string;
  readonly storeName?: string;
} {
  const authorization = singleHeader(request, "authorization");
  let accessToken: string | undefined;
  if (authorization) {
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match || match[1].length > 16_384) {
      throw requestError(
        401,
        "ADMIN_ACCESS_TOKEN_INVALID",
        "Invalid admin access token",
      );
    }
    accessToken = match[1];
  }

  const storeName = singleHeader(request, "x-store-name");
  if (
    storeName &&
    (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeName) ||
      storeName.length > 63)
  ) {
    throw requestError(
      400,
      "ADMIN_STORE_NAME_INVALID",
      "Invalid admin store name",
    );
  }
  return {
    ...(accessToken ? { accessToken } : {}),
    ...(storeName ? { storeName } : {}),
  };
}

export function parseAdminRequestId(
  request: Request,
): string | undefined {
  const requestId = singleHeader(request, ADMIN_REQUEST_ID_HEADER);
  if (requestId && requestId.length > 255) {
    throw requestError(
      400,
      "ADMIN_REQUEST_ID_INVALID",
      "Request ID is invalid",
    );
  }
  return requestId;
}

function singleHeader(
  request: Request,
  name: string,
): string | undefined {
  const value = request.headers.get(name)?.trim();
  if (!value) return undefined;
  if (value.includes(",")) {
    throw requestError(400, "ADMIN_HEADER_INVALID", "Invalid header");
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
