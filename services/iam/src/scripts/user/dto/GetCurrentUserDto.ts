import type { User } from "../../../repositories/user/UserRepository.js";
import type { UserResultBase } from "./shared.js";

export interface GetCurrentUserParams {
  /** Session access token */
  accessToken: string;
}

export interface GetCurrentUserResult extends UserResultBase {
  user: User | null;
}
