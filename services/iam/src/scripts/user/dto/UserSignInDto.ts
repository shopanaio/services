import type { User } from "../../../repositories/user/UserRepository.js";
import type { UserResultBase } from "./shared.js";
import type { AuthToken } from "./UserSignUpDto.js";

export interface UserSignInParams {
  email: string;
  password: string;
}

export interface UserSignInResult extends UserResultBase {
  user: User | null;
  token: AuthToken | null;
}
