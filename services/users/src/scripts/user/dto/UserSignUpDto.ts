import type { User } from "@shopana/casdoor-node-sdk";
import type { UserResultBase } from "./shared.js";

export interface UserSignUpParams {
  email: string;
  password: string;
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
