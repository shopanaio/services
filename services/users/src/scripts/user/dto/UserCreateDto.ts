import type { User } from "../../../repositories/models/index.js";
import type { UserResultBase } from "./shared.js";

export interface UserCreateParams {
  readonly email: string;
}

export interface UserCreateResult extends UserResultBase {
  user?: User;
}
