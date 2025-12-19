import type { UserPayload } from "./shared.js";

export interface UserSignUpParams {
  email: string;
  password: string;
}

export type UserSignUpResult = UserPayload;
