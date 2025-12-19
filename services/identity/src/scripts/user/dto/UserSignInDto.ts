import type { UserPayload } from "./shared.js";

export interface UserSignInParams {
  email: string;
  password: string;
}

export type UserSignInResult = UserPayload;
