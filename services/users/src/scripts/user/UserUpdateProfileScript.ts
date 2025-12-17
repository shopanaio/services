import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  UserUpdateProfileParams,
  UserUpdateProfileResult,
} from "./dto/UserUpdateProfileDto.js";

export class UserUpdateProfileScript extends BaseScript<
  UserUpdateProfileParams,
  UserUpdateProfileResult
> {
  protected async execute(
    _params: UserUpdateProfileParams
  ): Promise<UserUpdateProfileResult> {
    // TODO: implement
    return {
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "UserUpdateProfileScript is not implemented yet",
        },
      ],
    };
  }

  protected handleError(_error: unknown): UserUpdateProfileResult {
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
