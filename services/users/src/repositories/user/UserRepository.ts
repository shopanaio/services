import type { User, Client } from "@shopana/casdoor-node-sdk";

// Re-export User type from SDK
export type { User };

export interface UserCreateInput {
  email: string;
  password: string;
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  locale?: string;
}

export interface SignUpResult {
  success: boolean;
  user: User | null;
  token: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } | null;
  error?: string;
}

/**
 * Repository for admin users
 */
export class UserRepository {
  constructor(
    private readonly client: Client,
    private readonly organization: string,
    private readonly application: string
  ) {}

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.client.getUserByEmail(email);
  }

  /**
   * Find user by name (username)
   */
  async findByName(name: string): Promise<User | null> {
    return this.client.getUser(name);
  }

  /**
   * Sign up a new user
   */
  async signUp(input: UserCreateInput): Promise<SignUpResult> {
    const { email, password } = input;

    // Generate username from email (before @)
    const username = email.split("@")[0] + "_" + Date.now();

    const userData: Partial<User> = {
      owner: this.organization,
      name: username,
      email,
      password,
      displayName: username,
      signupApplication: this.application,
      type: "normal-user",
    };

    try {
      const success = await this.client.addUser(userData);

      if (!success) {
        return {
          success: false,
          user: null,
          token: null,
          error: "Failed to create user",
        };
      }

      // Get the created user
      const user = await this.client.getUserByEmail(email);

      if (!user) {
        return {
          success: false,
          user: null,
          token: null,
          error: "User created but not found",
        };
      }

      // Note: Token generation after signup would typically require
      // OAuth flow or direct API call to Casdoor's login endpoint
      // For now, we return user without token - client should call signIn after signUp
      return {
        success: true,
        user,
        token: null,
      };
    } catch (error) {
      return {
        success: false,
        user: null,
        token: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
