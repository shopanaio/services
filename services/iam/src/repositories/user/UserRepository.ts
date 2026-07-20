import { and, desc, eq, inArray } from "drizzle-orm";
import {
  createLocalJWKSet,
  jwtVerify,
  type JSONWebKeySet,
} from "jose";
import type { Auth } from "../../auth/auth.js";
import type { Database } from "../../infrastructure/db/database.js";
import type { AuthSessionRepositoryFactory } from "../auth-session/AuthSessionRepository.js";
import { jwks, user } from "../models/auth.js";
import {
  BetterAuthUserRepository,
  type AuthUser,
  type GetCurrentUserResult as BetterAuthGetCurrentUserResult,
  type JwtUserPayload,
  type ParseJwtResult,
  type SignInResult as BetterAuthSignInResult,
  type SignUpResult as BetterAuthSignUpResult,
} from "./BetterAuthUserRepository.js";

export type {
  AuthTokenResult,
  RefreshTokenResult,
  RequestHeaders,
  UserCreateInput,
} from "./BetterAuthUserRepository.js";

export interface User extends AuthUser {
  admin: boolean;
}

export type SignInResult = BetterAuthSignInResult<User>;
export type SignUpResult = BetterAuthSignUpResult<User>;
export type GetCurrentUserResult = BetterAuthGetCurrentUserResult<User>;

export interface ValidatedAccessJwt {
  payload: JwtUserPayload;
  sessionId: string;
  user: User;
}

/**
 * Global IAM user repository.
 *
 * Authentication flows are inherited and shared with application users. This
 * class only owns global-table reads, profile mutations and global JWT checks.
 */
export class UserRepository extends BetterAuthUserRepository<User> {
  private jwksCache: ReturnType<typeof createLocalJWKSet> | null = null;
  private jwksCacheTime = 0;
  private readonly jwksCacheTtl = 60 * 60 * 1000;

  constructor(
    private readonly db: Database,
    auth: Auth,
    private readonly authSession: AuthSessionRepositoryFactory
  ) {
    super(auth);
  }

  /** Validate an access JWT against its current session and user records. */
  async validateAccessJwt(token: string): Promise<ValidatedAccessJwt | null> {
    const result = await this.parseJwt(token);
    if (!result.success || !result.payload?.sub) {
      return null;
    }

    const sessionId = result.payload.sid;
    if (typeof sessionId !== "string" || !sessionId) {
      return null;
    }

    const validatedSession = await this.authSession
      .forPlatform()
      .validate(result.payload.sub, sessionId);
    if (!validatedSession || validatedSession.kind !== "platform") {
      return null;
    }

    return {
      payload: result.payload,
      sessionId,
      user: this.mapDbUser(validatedSession.user),
    };
  }

  override async getCurrentUser(token: string): Promise<GetCurrentUserResult> {
    if (token.split(".").length !== 3) {
      return super.getCurrentUser(token);
    }

    const validated = await this.validateAccessJwt(token);
    if (!validated) {
      return {
        success: false,
        user: null,
        error: "Invalid, expired, or revoked access token",
      };
    }

    return { success: true, user: validated.user };
  }

  async parseJwt(token: string): Promise<ParseJwtResult> {
    try {
      if (!token.includes(".") || token.split(".").length !== 3) {
        return { success: false, payload: null, error: "Not a JWT token" };
      }

      const localJwks = await this.getLocalJwks();
      if (!localJwks) {
        return { success: false, payload: null, error: "JWKS not available" };
      }

      const { payload } = await jwtVerify(token, localJwks, {
        issuer: process.env.JWT_ISSUER || "shopana-iam",
        audience: process.env.JWT_AUDIENCE || "shopana-api",
      });
      const jwtPayload = payload as JwtUserPayload;

      if (!jwtPayload.sub) {
        return { success: false, payload: null, error: "Invalid JWT payload" };
      }

      return { success: true, payload: jwtPayload };
    } catch (error) {
      return {
        success: false,
        payload: null,
        error:
          error instanceof Error ? error.message : "JWT verification failed",
      };
    }
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(user).where(eq(user.id, id));
    return row ? this.mapDbUser(row) : null;
  }

  async findByIds(ids: string[]): Promise<Map<string, User>> {
    if (ids.length === 0) return new Map();

    const rows = await this.db
      .select()
      .from(user)
      .where(inArray(user.id, ids));

    return new Map(rows.map((row) => [row.id, this.mapDbUser(row)]));
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(user)
      .where(eq(user.email, normalizeEmail(email)));
    return row ? this.mapDbUser(row) : null;
  }

  async updateProfile(
    userId: string,
    updates: {
      name?: string;
      firstName?: string;
      lastName?: string;
      image?: string | null;
    }
  ): Promise<User | null> {
    const [row] = await this.db
      .update(user)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();
    return row ? this.mapDbUser(row) : null;
  }

  async updateEmail(userId: string, newEmail: string): Promise<User | null> {
    const [row] = await this.db
      .update(user)
      .set({
        email: normalizeEmail(newEmail),
        emailVerified: false,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning();
    return row ? this.mapDbUser(row) : null;
  }

  async delete(userId: string): Promise<boolean> {
    const rows = await this.db
      .delete(user)
      .where(eq(user.id, userId))
      .returning({ id: user.id });
    return rows.length > 0;
  }

  async setAdmin(userId: string, admin: boolean): Promise<User | null> {
    const [row] = await this.db
      .update(user)
      .set({ admin, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();
    return row ? this.mapDbUser(row) : null;
  }

  async isAdmin(userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ admin: user.admin })
      .from(user)
      .where(eq(user.id, userId));
    return row?.admin ?? false;
  }

  async findAdminUserIds(userIds: readonly string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await this.db
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          inArray(user.id, [...new Set(userIds)]),
          eq(user.admin, true)
        )
      );
    return rows.map(({ id }) => id);
  }

  protected mapAuthUser(value: unknown): User {
    const authUser = value as {
      id: string;
      email: string;
      name: string;
      firstName?: string | null;
      lastName?: string | null;
      emailVerified?: boolean;
      image?: string | null;
      admin?: boolean;
      createdAt: Date | string;
      updatedAt: Date | string;
    };

    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      firstName: authUser.firstName ?? null,
      lastName: authUser.lastName ?? null,
      emailVerified: authUser.emailVerified ?? false,
      image: authUser.image ?? null,
      admin: authUser.admin ?? false,
      createdAt: new Date(authUser.createdAt),
      updatedAt: new Date(authUser.updatedAt),
    };
  }

  private mapDbUser(row: typeof user.$inferSelect): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      firstName: row.firstName,
      lastName: row.lastName,
      emailVerified: row.emailVerified,
      image: row.image,
      admin: row.admin,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async getLocalJwks(): Promise<ReturnType<
    typeof createLocalJWKSet
  > | null> {
    const now = Date.now();
    if (this.jwksCache && now - this.jwksCacheTime < this.jwksCacheTtl) {
      return this.jwksCache;
    }

    const keys = await this.db.select().from(jwks).orderBy(desc(jwks.createdAt));
    if (keys.length === 0) return null;

    const publicKeys = keys.flatMap((key) => {
      try {
        const parsed = JSON.parse(key.publicKey) as Record<string, unknown>;
        return [{ ...parsed, kid: parsed.kid ?? key.id }];
      } catch {
        return [];
      }
    });
    if (publicKeys.length === 0) return null;

    this.jwksCache = createLocalJWKSet({ keys: publicKeys } as JSONWebKeySet);
    this.jwksCacheTime = now;
    return this.jwksCache;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
