export type CasdoorStatus = "ok" | "error";

export interface CasdoorApiResponse<TData = unknown, TData2 = unknown, TData3 = unknown> {
  status: CasdoorStatus;
  msg?: string;
  data?: TData;
  data2?: TData2;
  data3?: TData3;
}

export interface CasdoorHttpResult<T> {
  data: T;
  status: number;
  headers: Record<string, unknown>;
  setCookie?: string[];
}

export interface RequestContext {
  cookie?: string;
  acceptLanguage?: string;
  ip?: string;
  userAgent?: string;
}

export interface CookieJarLike {
  getCookieString(url: string): string | Promise<string>;
  setCookie(cookie: string, url: string): void | Promise<void>;
}

export type CookieStrategy =
  | { mode: "forward" }
  | { mode: "jar"; getJar: (ctx: RequestContext) => CookieJarLike };

