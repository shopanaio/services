import type { UserResultBase } from "./shared.js";

export interface UserUpdateEmailParams {
  newEmail: string;
}

export interface UserUpdateEmailResult extends UserResultBase {
  userId?: string;
}
