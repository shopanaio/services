import type { AxiosRequestConfig } from "axios";
import type { SDK } from "casdoor-nodejs-sdk";
import type { CookieStrategy } from "./api.js";

export type CasdoorSdkConfig = ConstructorParameters<typeof SDK>[0];

export interface CasdoorNodeClientConfig {
  casdoorBaseUrl: string;
  sdkConfig: CasdoorSdkConfig;
  cookie: CookieStrategy;
  defaultHeaders?: Record<string, string>;
  axios?: AxiosRequestConfig;
  throwOnApiError?: boolean;
}
