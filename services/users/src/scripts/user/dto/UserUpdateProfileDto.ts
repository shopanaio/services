import type { UserResultBase } from "./shared.js";

export interface UserUpdateProfileParams {
  firstName?: string;
  lastName?: string;
  language?: string;
}

export interface UserUpdateProfileResult extends UserResultBase {
  userId?: string;
}
