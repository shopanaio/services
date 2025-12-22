import { eq } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import { user, session } from "../models/auth.js";
import type { Auth } from "../../auth/auth.js";

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  email: string;
  password: string;
  name?: string;
}

export interface AuthTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignInResult {
  success: boolean;
  user: User | null;
  token: AuthTokenResult | null;
  error?: string;
}

export interface SignUpResult extends SignInResult {}

export interface GetCurrentUserResult {
  success: boolean;
  user: User | null;
  error?: string;
}

// ============================================================================
// Repository
// ============================================================================

/**
 * Repository for user authentication and management.
 * Uses Better Auth for auth operations and Drizzle for direct DB access.
 */
export class UserRepository {
  constructor(
    private readonly db: Database,
    private readonly auth: Auth
  ) {}

  // ==========================================================================
  // Auth Operations (via Better Auth API)
  // ==========================================================================

  /**
   * Sign in a user with email and password
   */
  async signIn(input: UserCreateInput): Promise<SignInResult> {
    const { email, password } = input;

    try {
      const result = await this.auth.api.signInEmail({
        body: {
          email,
          password,
        },
      });

      if (!result.user || !result.token) {
        return {
          success: false,
          user: null,
          token: null,
          error: "Invalid credentials",
        };
      }

      // Get JWT access token using the session token
      const jwtResult = await this.auth.api.getToken({
        headers: {
          authorization: `Bearer ${result.token}`,
        },
      });

      // Access token expires in 15 minutes (900 seconds)
      const accessTokenExpiresIn = 60 * 15;

      return {
        success: true,
        user: this.mapUser(result.user),
        token: {
          accessToken: jwtResult.token, // Short-lived JWT
          refreshToken: result.token, // Session token as refresh token
          expiresIn: accessTokenExpiresIn,
        },
      };
    } catch (error) {
      return {
        success: false,
        user: null,
        token: null,
        error: error instanceof Error ? error.message : "Sign in failed",
      };
    }
  }

  /**
   * Sign up a new user
   */
  async signUp(input: UserCreateInput): Promise<SignUpResult> {
    const { email, password, name } = input;

    try {
      const result = await this.auth.api.signUpEmail({
        body: {
          email,
          password,
          name: name || email.split("@")[0], // Default name from email
        },
      });

      if (!result.user) {
        return {
          success: false,
          user: null,
          token: null,
          error: "Sign up failed",
        };
      }

      // If we have a session token, get JWT access token
      let tokenResult: AuthTokenResult | null = null;
      if (result.token) {
        const jwtResult = await this.auth.api.getToken({
          headers: {
            authorization: `Bearer ${result.token}`,
          },
        });

        // Access token expires in 15 minutes (900 seconds)
        const accessTokenExpiresIn = 60 * 15;

        tokenResult = {
          accessToken: jwtResult.token, // Short-lived JWT
          refreshToken: result.token, // Session token as refresh token
          expiresIn: accessTokenExpiresIn,
        };
      }

      return {
        success: true,
        user: this.mapUser(result.user),
        token: tokenResult,
      };
    } catch (error) {
      return {
        success: false,
        user: null,
        token: null,
        error: error instanceof Error ? error.message : "Sign up failed",
      };
    }
  }

  /**
   * Get current user from session token
   */
  async getCurrentUser(sessionToken: string): Promise<GetCurrentUserResult> {
    try {
      const result = await this.auth.api.getSession({
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!result || !result.user) {
        return {
          success: false,
          user: null,
          error: "Invalid or expired session",
        };
      }

      return {
        success: true,
        user: this.mapUser(result.user),
      };
    } catch (error) {
      return {
        success: false,
        user: null,
        error: error instanceof Error ? error.message : "Session validation failed",
      };
    }
  }

  /**
   * Sign out - revoke session
   */
  async signOut(sessionToken: string): Promise<boolean> {
    try {
      await this.auth.api.signOut({
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Refresh access token using refresh token (session token)
   */
  async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    token: AuthTokenResult | null;
    error?: string;
  }> {
    try {
      // Validate the session token first
      const sessionResult = await this.auth.api.getSession({
        headers: {
          authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!sessionResult || !sessionResult.session) {
        return {
          success: false,
          token: null,
          error: "Invalid or expired refresh token",
        };
      }

      // Get new JWT access token
      const jwtResult = await this.auth.api.getToken({
        headers: {
          authorization: `Bearer ${refreshToken}`,
        },
      });

      // Access token expires in 15 minutes (900 seconds)
      const accessTokenExpiresIn = 60 * 15;

      return {
        success: true,
        token: {
          accessToken: jwtResult.token,
          refreshToken: refreshToken, // Same refresh token (session persists)
          expiresIn: accessTokenExpiresIn,
        },
      };
    } catch (error) {
      return {
        success: false,
        token: null,
        error: error instanceof Error ? error.message : "Token refresh failed",
      };
    }
  }

  // ==========================================================================
  // Direct DB Operations (via Drizzle)
  // ==========================================================================

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const [result] = await this.db
      .select()
      .from(user)
      .where(eq(user.id, id));

    return result ? this.mapDbUser(result) : null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const [result] = await this.db
      .select()
      .from(user)
      .where(eq(user.email, email.toLowerCase()));

    return result ? this.mapDbUser(result) : null;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: { name?: string; image?: string }
  ): Promise<User | null> {
    const [result] = await this.db
      .update(user)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();

    return result ? this.mapDbUser(result) : null;
  }

  /**
   * Update user email
   */
  async updateEmail(userId: string, newEmail: string): Promise<User | null> {
    const [result] = await this.db
      .update(user)
      .set({
        email: newEmail.toLowerCase(),
        emailVerified: false,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning();

    return result ? this.mapDbUser(result) : null;
  }

  /**
   * Delete user and all associated data
   */
  async delete(userId: string): Promise<boolean> {
    // Cascade delete handles sessions and accounts
    const result = await this.db.delete(user).where(eq(user.id, userId));
    return (result as any).rowCount > 0;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string) {
    return this.db.select().from(session).where(eq(session.userId, userId));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    const result = await this.db
      .delete(session)
      .where(eq(session.id, sessionId));
    return (result as any).rowCount > 0;
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.db
      .delete(session)
      .where(eq(session.userId, userId));
    return (result as any).rowCount ?? 0;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private mapUser(u: any): User {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      emailVerified: u.emailVerified ?? false,
      image: u.image ?? null,
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.updatedAt),
    };
  }

  private mapDbUser(u: typeof user.$inferSelect): User {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      emailVerified: u.emailVerified,
      image: u.image,
      createdAt: u.createdAt!,
      updatedAt: u.updatedAt!,
    };
  }
}
