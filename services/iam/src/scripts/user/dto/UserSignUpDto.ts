import type { User } from "../../../repositories/user/UserRepository.js";
import type { UserResultBase } from "./shared.js";
import type { RequestHeaders } from "../../../context/types.js";

export interface UserSignUpParams {
  email: string;
  password: string;
  name?: string;
  headers?: RequestHeaders;
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
