import type { UserError } from "../../../kernel/BaseScript.js";
import type { User } from "@zaytra/casdoor-node-client-ext";

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserPayload {
  user?: User | null;
  token?: AuthToken | null;
  userErrors: UserError[];
}
