import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  UserUpdatePasswordParams,
  UserUpdatePasswordResult,
} from "./dto/UserUpdatePasswordDto.js";

export class UserUpdatePasswordScript extends BaseScript<
  UserUpdatePasswordParams,
  UserUpdatePasswordResult
> {
  protected async execute(
    _params: UserUpdatePasswordParams
  ): Promise<UserUpdatePasswordResult> {
    // TODO: implement
    return {
      success: false,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "UserUpdatePasswordScript is not implemented yet",
        },
      ],
    };
  }

  protected handleError(_error: unknown): UserUpdatePasswordResult {
    return {
      success: false,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      ],
    };
  }
}
