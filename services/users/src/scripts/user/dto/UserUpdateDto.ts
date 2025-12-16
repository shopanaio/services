import type { User } from "../../../repositories/models/index.js";
import type { UserResultBase } from "./shared.js";

export interface UserUpdateParams {
  readonly id: string;
  readonly email?: string;
}

export interface UserUpdateResult extends UserResultBase {
  user?: User;
}
