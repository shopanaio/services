import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  UserUpdateEmailParams,
  UserUpdateEmailResult,
} from "./dto/UserUpdateEmailDto.js";

export class UserUpdateEmailScript extends BaseScript<
  UserUpdateEmailParams,
  UserUpdateEmailResult
> {
  protected async execute(
    _params: UserUpdateEmailParams
  ): Promise<UserUpdateEmailResult> {
    // TODO: implement
    return {
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "UserUpdateEmailScript is not implemented yet",
        },
      ],
    };
  }

  protected handleError(_error: unknown): UserUpdateEmailResult {
    return {
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      ],
    };
  }
}
