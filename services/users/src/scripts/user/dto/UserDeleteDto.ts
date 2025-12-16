import type { UserResultBase } from "./shared.js";

export interface UserDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface UserDeleteResult extends UserResultBase {
  deletedUserId?: string;
}
