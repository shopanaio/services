import { and, desc, eq, inArray } from "drizzle-orm";
import {
  createLocalJWKSet,
  jwtVerify,
  type JSONWebKeySet,
} from "jose";
import type { Auth } from "../../auth/auth.js";
import type { Database } from "../../infrastructure/db/database.js";
import {
  applicationJwks,
  applicationSession,
  applicationUser,
  type ApplicationUser,
} from "../models/application-auth.js";
import {
  BetterAuthUserRepository,
  type JwtUserPayload,
  type ParseJwtResult,
} from "../user/BetterAuthUserRepository.js";

export interface ApplicationUserRepositoryOptions {
  applicationId: string;
  auth: Auth;
  issuer: string;
  audience: string;
}

export class ApplicationUserRepositoryFactory {
  constructor(private readonly db: Database) {}

  forApplication(
    options: ApplicationUserRepositoryOptions
  ): ApplicationUserRepository {
    return new ApplicationUserRepository(this.db, options);
  }
}

/**
 * Application-scoped user repository.
 *
 * Auth operations are inherited from the same Better Auth repository used by
 * global users. Only direct profile/session queries and JWT verification are
 * implemented here because they target application-specific tables.
 */
export class ApplicationUserRepository extends BetterAuthUserRepository<ApplicationUser> {
  private jwksCache: ReturnType<typeof createLocalJWKSet> | null = null;
  private jwksCacheTime = 0;
  private readonly jwksCacheTtl = 60 * 60 * 1000;

  readonly applicationId: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    private readonly db: Database,
    options: ApplicationUserRepositoryOptions
  ) {
    super(options.auth);
    this.applicationId = options.applicationId;
    this.issuer = options.issuer;
    this.audience = options.audience;
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
        issuer: this.issuer,
        audience: this.audience,
      });
      const jwtPayload = payload as JwtUserPayload;

      if (!jwtPayload.sub) {
        return { success: false, payload: null, error: "Invalid JWT payload" };
      }
      if (jwtPayload.application_id !== this.applicationId) {
        return {
          success: false,
          payload: null,
          error: "JWT application scope mismatch",
        };
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

  async findById(userId: string): Promise<ApplicationUser | null> {
    const [row] = await this.db
      .select()
      .from(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async findByIds(userIds: string[]): Promise<Map<string, ApplicationUser>> {
    if (userIds.length === 0) return new Map();

    const rows = await this.db
      .select()
      .from(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          inArray(applicationUser.id, userIds)
        )
      );
    return new Map(rows.map((row) => [row.id, row]));
  }

  async findByEmail(email: string): Promise<ApplicationUser | null> {
    const [row] = await this.db
      .select()
      .from(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.normalizedEmail, normalizeEmail(email))
        )
      )
      .limit(1);
    return row ?? null;
  }

  async updateProfile(
    userId: string,
    updates: {
      name?: string;
      firstName?: string;
      lastName?: string;
      image?: string | null;
    }
  ): Promise<ApplicationUser | null> {
    const [row] = await this.db
      .update(applicationUser)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId)
        )
      )
      .returning();
    return row ?? null;
  }

  async updateEmail(
    userId: string,
    newEmail: string
  ): Promise<ApplicationUser | null> {
    const email = newEmail.trim();
    const [row] = await this.db
      .update(applicationUser)
      .set({
        email,
        normalizedEmail: normalizeEmail(email),
        emailVerified: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId)
        )
      )
      .returning();
    return row ?? null;
  }

  async delete(userId: string): Promise<boolean> {
    const rows = await this.db
      .delete(applicationUser)
      .where(
        and(
          eq(applicationUser.applicationId, this.applicationId),
          eq(applicationUser.id, userId)
        )
      )
      .returning({ id: applicationUser.id });
    return rows.length > 0;
  }

  async getUserSessions(userId: string) {
    return this.db
      .select()
      .from(applicationSession)
      .where(
        and(
          eq(applicationSession.applicationId, this.applicationId),
          eq(applicationSession.userId, userId)
        )
      );
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const rows = await this.db
      .delete(applicationSession)
      .where(
        and(
          eq(applicationSession.applicationId, this.applicationId),
          eq(applicationSession.id, sessionId)
        )
      )
      .returning({ id: applicationSession.id });
    return rows.length > 0;
  }

  async revokeAllSessions(userId: string): Promise<number> {
    const rows = await this.db
      .delete(applicationSession)
      .where(
        and(
          eq(applicationSession.applicationId, this.applicationId),
          eq(applicationSession.userId, userId)
        )
      )
      .returning({ id: applicationSession.id });
    return rows.length;
  }

  protected mapAuthUser(value: unknown): ApplicationUser {
    const authUser = value as {
      id: string;
      email: string;
      name: string;
      firstName?: string | null;
      lastName?: string | null;
      emailVerified?: boolean;
      image?: string | null;
      createdAt: Date | string;
      updatedAt: Date | string;
    };

    return {
      id: authUser.id,
      applicationId: this.applicationId,
      email: authUser.email,
      normalizedEmail: normalizeEmail(authUser.email),
      name: authUser.name,
      firstName: authUser.firstName ?? null,
      lastName: authUser.lastName ?? null,
      emailVerified: authUser.emailVerified ?? false,
      image: authUser.image ?? null,
      createdAt: new Date(authUser.createdAt),
      updatedAt: new Date(authUser.updatedAt),
    };
  }

  private async getLocalJwks(): Promise<ReturnType<
    typeof createLocalJWKSet
  > | null> {
    const now = Date.now();
    if (this.jwksCache && now - this.jwksCacheTime < this.jwksCacheTtl) {
      return this.jwksCache;
    }

    const keys = await this.db
      .select()
      .from(applicationJwks)
      .where(eq(applicationJwks.applicationId, this.applicationId))
      .orderBy(desc(applicationJwks.createdAt));
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
