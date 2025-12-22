import type { User } from "../../../repositories/user/UserRepository.js";
import type { UserResultBase } from "./shared.js";

export interface UserSignUpParams {
  email: string;
  password: string;
  name?: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSignUpResult extends UserResultBase {
  user: User | null;
  token: AuthToken | null;
}
