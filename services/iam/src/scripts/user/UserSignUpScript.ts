import { getServiceConfig } from "@shopana/shared-service-config";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  UserSignUpParams,
  UserSignUpResult,
} from "./dto/UserSignUpDto.js";

export class UserSignUpScript extends BaseScript<
  UserSignUpParams,
  UserSignUpResult
> {
  @Transactional()
  protected async execute(params: UserSignUpParams): Promise<UserSignUpResult> {
    const { email, password, headers } = params;

    // Check if user already exists
    const existingUser = await this.repository.user.findByEmail(email);
    if (existingUser) {
      return {
        user: null,
        token: null,
        userErrors: [
          {
            code: "EMAIL_ALREADY_EXISTS",
            message: "A user with this email already exists",
            field: ["email"],
          },
        ],
      };
    }

    // Create user
    const result = await this.repository.user.signUp({
      email,
      password,
      headers,
    });

    if (!result.success || !result.user) {
      return {
        user: null,
        token: null,
        userErrors: [
          {
            code: "SIGNUP_FAILED",
            message: result.error || "Failed to create user",
            field: null,
          },
        ],
      };
    }

    // Check if user should be admin based on email domain
    if (this.isAdminDomain(email)) {
      await this.repository.user.setAdmin(result.user.id, true);
      result.user.admin = true;
      this.logger.info({ userId: result.user.id, email }, "Set admin flag for user");
    }

    return {
      user: result.user,
      token: result.token,
      userErrors: [],
    };
  }

  private isAdminDomain(email: string): boolean {
    const { service } = getServiceConfig("iam");
    const domains = (service as any).super_admin_domains as string | undefined;
    return domains?.split(",").some((d) => email.endsWith(`@${d.trim()}`)) ?? false;
  }

  protected handleError(_error: unknown): UserSignUpResult {
    return {
      user: null,
      token: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          field: null,
        },
      ],
    };
  }
}
