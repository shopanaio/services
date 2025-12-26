import { z } from "zod";
import type { User } from "../../../repositories/user/UserRepository.js";
import type { UserResultBase } from "./shared.js";

export const getCurrentUserInputSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
});

export type GetCurrentUserInput = z.infer<typeof getCurrentUserInputSchema>;

export interface GetCurrentUserParams {
  /** Session access token */
  accessToken: string;
}

export interface GetCurrentUserResult extends UserResultBase {
  user: User | null;
}
