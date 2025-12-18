import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { CasdoorApiResponse, CasdoorHttpResult, CookieStrategy, RequestContext } from "../types/api.js";
import { CasdoorApiError, CasdoorHttpError, CasdoorInvalidResponseError } from "./errors.js";

function toRecordHeaders(headers: unknown): Record<string, unknown> {
  if (headers && typeof headers === "object") return headers as Record<string, unknown>;
  return {};
}

function extractSetCookie(headers: Record<string, unknown>): string[] | undefined {
  const raw = headers["set-cookie"];
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
  if (typeof raw === "string") return [raw];
  return undefined;
}

function isCasdoorApiResponse(value: unknown): value is CasdoorApiResponse {
  return !!value && typeof value === "object" && "status" in (value as any) && (value as any).status !== undefined;
}

export interface CasdoorHttpClientConfig {
  casdoorBaseUrl: string;
  defaultHeaders?: Record<string, string>;
  cookie: CookieStrategy;
  axios?: AxiosRequestConfig;
  throwOnApiError?: boolean;
}

export class CasdoorHttpClient {
  private readonly casdoorBaseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly cookie: CookieStrategy;
  private readonly throwOnApiError: boolean;
  private readonly client: AxiosInstance;

  constructor(config: CasdoorHttpClientConfig) {
    this.casdoorBaseUrl = config.casdoorBaseUrl.replace(/\/+$/, "");
    this.defaultHeaders = config.defaultHeaders ?? {};
    this.cookie = config.cookie;
    this.throwOnApiError = config.throwOnApiError ?? true;

    this.client = axios.create({
      baseURL: this.casdoorBaseUrl,
      timeout: 60_000,
      ...(config.axios ?? {}),
    });
  }

  async get<T>(ctx: RequestContext, path: string, config?: AxiosRequestConfig): Promise<CasdoorHttpResult<T>> {
    return this.request<T>(ctx, { ...(config ?? {}), method: "GET", url: path });
  }

  async post<T>(ctx: RequestContext, path: string, data?: unknown, config?: AxiosRequestConfig): Promise<CasdoorHttpResult<T>> {
    return this.request<T>(ctx, { ...(config ?? {}), method: "POST", url: path, data });
  }

  async request<T>(ctx: RequestContext, req: AxiosRequestConfig): Promise<CasdoorHttpResult<T>> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(req.headers as Record<string, string> | undefined),
    };

    if (ctx.acceptLanguage && !headers["Accept-Language"] && !headers["accept-language"]) {
      headers["Accept-Language"] = ctx.acceptLanguage;
    }

    const urlForCookies = new URL(req.url ?? "/", this.casdoorBaseUrl).toString();
    if (this.cookie.mode === "forward") {
      if (ctx.cookie) headers["Cookie"] = ctx.cookie;
    } else {
      const jar = this.cookie.getJar(ctx);
      const cookieString = await jar.getCookieString(urlForCookies);
      if (cookieString) headers["Cookie"] = cookieString;
    }

    let res: AxiosResponse<T>;
    try {
      res = await this.client.request<T>({ ...req, headers });
    } catch (err: any) {
      const status = err?.response?.status as number | undefined;
      const responseHeaders = toRecordHeaders(err?.response?.headers);
      const responseBody = err?.response?.data;
      throw new CasdoorHttpError("Casdoor HTTP request failed", {
        status,
        headers: responseHeaders,
        responseBody,
        cause: err,
      });
    }

    const responseHeaders = toRecordHeaders(res.headers);
    const setCookie = extractSetCookie(responseHeaders);

    if (this.cookie.mode === "jar" && setCookie?.length) {
      const jar = this.cookie.getJar(ctx);
      await Promise.all(setCookie.map((c) => jar.setCookie(c, urlForCookies)));
    }

    const result: CasdoorHttpResult<T> = {
      data: res.data,
      status: res.status,
      headers: responseHeaders,
      setCookie,
    };

    if (!isCasdoorApiResponse(result.data)) {
      return result;
    }

    const apiRes = result.data;
    if (this.throwOnApiError && apiRes.status === "error") {
      throw new CasdoorApiError(apiRes.msg ?? "Casdoor API error", apiRes);
    }

    return result;
  }

  expectApiResponse<TData = unknown, TData2 = unknown, TData3 = unknown>(
    result: CasdoorHttpResult<unknown>,
  ): CasdoorHttpResult<CasdoorApiResponse<TData, TData2, TData3>> {
    if (!isCasdoorApiResponse(result.data)) {
      throw new CasdoorInvalidResponseError("Expected CasdoorApiResponse", result.data);
    }
    return result as CasdoorHttpResult<CasdoorApiResponse<TData, TData2, TData3>>;
  }
}

