import type { User } from "@zaytra/casdoor-node-client-ext";
import type { UserResultBase } from "./shared.js";

export interface GetCurrentUserParams {
  /** JWT access token */
  accessToken: string;
}

export interface GetCurrentUserResult extends UserResultBase {
  user: User | null;
}
