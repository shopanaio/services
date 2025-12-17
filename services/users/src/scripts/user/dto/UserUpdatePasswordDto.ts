import type { UserResultBase } from "./shared.js";

export interface UserUpdatePasswordParams {
  currentPassword: string;
  newPassword: string;
}

export interface UserUpdatePasswordResult extends UserResultBase {
  success: boolean;
}
