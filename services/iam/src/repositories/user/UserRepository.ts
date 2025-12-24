import { eq, desc } from "drizzle-orm";
import {
  createLocalJWKSet,
  jwtVerify,
  type JWTPayload,
  type JSONWebKeySet,
} from "jose";
import type { Database } from "../../db/database.js";
import { user, session, jwks } from "../models/auth.js";
import type { Auth } from "../../auth/auth.js";

interface JwtUserPayload extends JWTPayload {
  sub: string;
  email: string;
  name: string;
}

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
  // Cache for JWKS to avoid repeated database queries
  private jwksCache: ReturnType<typeof createLocalJWKSet> | null = null;
  private jwksCacheTime: number = 0;
  private readonly JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(private readonly db: Database, private readonly auth: Auth) {}

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
   * Get current user from token (JWT access token or session token)
   * Tries JWT verification first, falls back to session validation
   */
  async getCurrentUser(token: string): Promise<GetCurrentUserResult> {
    console.log(
      "[IAM UserRepository.getCurrentUser] Token:",
      token.slice(0, 30) + "..."
    );

    // Try JWT verification first (for access tokens)
    const jwtResult = await this.verifyJwtToken(token);

    if (jwtResult.success && jwtResult.user) {
      return jwtResult;
    }

    // Fall back to session token validation (for refresh tokens or legacy)
    try {
      const result = await this.auth.api.getSession({
        headers: {
          authorization: `Bearer ${token}`,
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
        error:
          error instanceof Error ? error.message : "Session validation failed",
      };
    }
  }

  /**
   * Verify JWT access token and extract user info
   */
  private async verifyJwtToken(token: string): Promise<GetCurrentUserResult> {
    try {
      // Check if it looks like a JWT (has 3 parts separated by dots)
      if (!token.includes(".") || token.split(".").length !== 3) {
        return { success: false, user: null, error: "Not a JWT token" };
      }

      const issuer = process.env.JWT_ISSUER || "shopana-iam";
      const audience = process.env.JWT_AUDIENCE || "shopana-api";

      // Get JWKS from database (with caching)
      const JWKS = await this.getLocalJWKS();
      if (!JWKS) {
        console.log("[IAM verifyJwtToken] JWKS not available");
        return { success: false, user: null, error: "JWKS not available" };
      }

      const { payload } = await jwtVerify(token, JWKS, {
        issuer,
        audience,
      });

      const jwtPayload = payload as JwtUserPayload;

      if (!jwtPayload.sub) {
        return { success: false, user: null, error: "Invalid JWT payload" };
      }

      // Fetch full user data from database
      const userRecord = await this.findById(jwtPayload.sub);
      if (!userRecord) {
        return { success: false, user: null, error: "User not found" };
      }

      return {
        success: true,
        user: userRecord,
      };
    } catch (error) {
      return {
        success: false,
        user: null,
        error:
          error instanceof Error ? error.message : "JWT verification failed",
      };
    }
  }

  /**
   * Get JWKS from database for local JWT verification
   */
  private async getLocalJWKS(): Promise<ReturnType<
    typeof createLocalJWKSet
  > | null> {
    const now = Date.now();

    // Return cached JWKS if still valid
    if (this.jwksCache && now - this.jwksCacheTime < this.JWKS_CACHE_TTL) {
      return this.jwksCache;
    }

    try {
      // Fetch all valid JWKS keys from database
      const keys = await this.db
        .select()
        .from(jwks)
        .orderBy(desc(jwks.createdAt));

      if (keys.length === 0) {
        return null;
      }

      // Parse public keys and create JWKS
      const jwksKeys = keys
        .map((key) => {
          try {
            const parsed = JSON.parse(key.publicKey);
            // Add kid from database record ID if not present in JSON
            if (!parsed.kid) {
              parsed.kid = key.id;
            }
            return parsed;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      if (jwksKeys.length > 0) {
      }

      if (jwksKeys.length === 0) {
        return null;
      }

      const jwksSet: JSONWebKeySet = { keys: jwksKeys };
      this.jwksCache = createLocalJWKSet(jwksSet);
      this.jwksCacheTime = now;

      return this.jwksCache;
    } catch (error) {
      return null;
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
    const [result] = await this.db.select().from(user).where(eq(user.id, id));

    return result ? this.mapDbUser(result) : null;
  }

  /**
   * Find multiple users by IDs
   */
  async findByIds(ids: string[]): Promise<Map<string, User>> {
    if (ids.length === 0) {
      return new Map();
    }

    const { inArray } = await import("drizzle-orm");
    const results = await this.db
      .select()
      .from(user)
      .where(inArray(user.id, ids));

    const userMap = new Map<string, User>();
    for (const u of results) {
      userMap.set(u.id, this.mapDbUser(u));
    }
    return userMap;
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
