import { createHash } from "node:crypto";
import {
  compactVerify,
  importJWK,
  type JSONWebKeySet,
  type JWTPayload,
} from "jose";
import type { Logger } from "@shopana/shared-kernel";
import { z } from "zod";
import { createApplicationResource } from "../auth/applicationAuthConfiguration.js";
import { APPLICATION_OAUTH_SCOPES } from "../auth/applicationOAuthPolicy.js";
import type {
  ApplicationAuthLiveStateInvalidationBus,
  ApplicationAuthLiveStateInvalidationEvent,
} from "../events/application-auth/index.js";
import {
  ApplicationTokenValidationRepository,
  type ApplicationRefreshTokenRecord,
  type ApplicationTokenLiveStateRecord,
} from "../repositories/ApplicationTokenValidationRepository.js";

export type ApplicationTokenValidationReasonCategory =
  | "malformed"
  | "signature_invalid"
  | "expired"
  | "issuer_mismatch"
  | "audience_mismatch"
  | "application_inactive"
  | "client_inactive"
  | "user_inactive"
  | "session_inactive"
  | "token_family_revoked";

export interface ValidateApplicationTokenInput {
  token: string;
  expectedApplicationId: string;
  expectedAudience: string;
}

export interface ActiveApplicationTokenValidationResult {
  active: true;
  applicationId: string;
  userId: string;
  clientId: string;
  sessionId: string;
  tokenFamilyId: string;
  scopes: readonly string[];
  issuer: string;
  audience: string;
  issuedAt: Date;
  expiresAt: Date;
  actorType: "application_user";
  cacheUntil: Date;
}

export interface InactiveApplicationTokenValidationResult {
  active: false;
  reasonCategory: ApplicationTokenValidationReasonCategory;
  cacheUntil: Date;
}

export type ApplicationTokenValidationResult =
  | ActiveApplicationTokenValidationResult
  | InactiveApplicationTokenValidationResult;

export interface ApplicationRefreshGrantValidationInput {
  token: string;
  expectedApplicationId: string;
  expectedAudience: string;
  expectedClientId: string;
}

export interface RevokeApplicationTokenInput
  extends ApplicationRefreshGrantValidationInput {
  tokenTypeHint?: "access_token" | "refresh_token";
}

interface JwtClaimsContract extends JWTPayload {
  application_id: string;
  actor_type: "application_user";
  client_id: string;
  azp: string;
  sid: string;
  sub: string;
  token_family_id: string;
  scope: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

interface CacheEntry {
  result: ApplicationTokenValidationResult;
  applicationId: string;
  clientId?: string;
  userId?: string;
  sessionId?: string;
  tokenFamilyId?: string;
  expiresAtMs: number;
}

const POSITIVE_CACHE_TTL_MS = 30_000;
const NEGATIVE_CACHE_TTL_MS = 5_000;
const MAX_TOKEN_BYTES = 16 * 1024;
const MAX_CACHE_ENTRIES = 10_000;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const oauthScopeSet = new Set<string>(APPLICATION_OAUTH_SCOPES);
const applicationIdSchema = z.string().uuid();

/**
 * Owner of the IAM application-token validation semantics.
 *
 * Signature verification and every live-state read fail closed. Raw tokens
 * are hashed before they are used as cache keys and never enter logs/events.
 */
export class ApplicationTokenValidationService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly unsubscribeInvalidation: () => void;

  constructor(
    private readonly repository: ApplicationTokenValidationRepository,
    private readonly invalidation: ApplicationAuthLiveStateInvalidationBus,
    private readonly publicBaseUrl: string,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date()
  ) {
    this.publicBaseUrl = normalizePublicBaseUrl(publicBaseUrl);
    this.unsubscribeInvalidation = invalidation.subscribe((event) =>
      this.invalidate(event)
    );
  }

  async validate(
    input: ValidateApplicationTokenInput
  ): Promise<ApplicationTokenValidationResult> {
    const now = this.now();
    const boundary = validateBoundary(input);
    if (!boundary.success) {
      return this.inactive("malformed", now);
    }
    const cacheKey = createValidationCacheKey(boundary.data);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAtMs > now.getTime()) {
      this.touch(cacheKey, cached);
      return cached.result;
    }
    if (cached) this.cache.delete(cacheKey);

    let result: ApplicationTokenValidationResult;
    let tags: Omit<CacheEntry, "result" | "expiresAtMs"> = {
      applicationId: boundary.data.expectedApplicationId,
    };
    try {
      if (looksLikeJwt(boundary.data.token)) {
        const verified = await this.verifyJwt(
          boundary.data,
          now
        );
        if (!verified.success) {
          result = this.inactive(verified.reasonCategory, now);
        } else {
          tags = tagsForClaims(verified.claims);
          result = await this.validateJwtLiveState(verified.claims, now);
        }
      } else {
        const refresh = await this.findRefreshToken(
          boundary.data.expectedApplicationId,
          boundary.data.token
        );
        if (!refresh) {
          result = this.inactive("malformed", now);
        } else {
          tags = tagsForRefresh(refresh);
          result = await this.validateRefreshLiveState(
            refresh,
            boundary.data.expectedAudience,
            now
          );
        }
      }
    } catch {
      this.logger.error(
        { applicationId: boundary.data.expectedApplicationId },
        "Application token validation dependency failed"
      );
      result = this.inactive("application_inactive", now);
    }

    this.cacheResult(cacheKey, result, tags);
    return result;
  }

  /**
   * Resource-server validation for Bearer access tokens. Refresh tokens are
   * opaque in v1 and must never authenticate a protected resource request.
   */
  async validateAccessToken(
    input: ValidateApplicationTokenInput
  ): Promise<ApplicationTokenValidationResult> {
    const now = this.now();
    const boundary = validateBoundary(input);
    if (!boundary.success || !looksLikeJwt(boundary.data.token)) {
      return this.inactive("malformed", now);
    }
    return this.validate(boundary.data);
  }

  async validateRefreshGrant(
    input: ApplicationRefreshGrantValidationInput
  ): Promise<ApplicationTokenValidationResult> {
    const validationInput = toValidationInput(input);
    const boundary = validateBoundary(validationInput);
    if (boundary.success) {
      this.cache.delete(createValidationCacheKey(boundary.data));
    }
    const result = await this.validate(validationInput);
    if (
      !result.active &&
      result.reasonCategory === "token_family_revoked"
    ) {
      const refresh = await this.findRefreshToken(
        input.expectedApplicationId,
        input.token
      );
      if (refresh?.clientId === input.expectedClientId) {
        await this.publishInvalidation({
          kind: "user",
          applicationId: refresh.applicationId,
          clientId: refresh.clientId,
          userId: refresh.userId,
        });
      }
    }
    if (!result.active || result.clientId !== input.expectedClientId) {
      return result.active
        ? this.inactive("client_inactive", this.now())
        : result;
    }
    return result;
  }

  /**
   * Completes RFC 7009 handling after OAuth Provider authenticated the caller.
   * JWT revocation tears down its refresh family, or its session when no
   * refresh family exists. Refresh-token persistence remains Better Auth-owned.
   */
  async recordProtocolRevocation(
    input: RevokeApplicationTokenInput
  ): Promise<void> {
    const now = this.now();
    if (
      input.tokenTypeHint !== "refresh_token" &&
      looksLikeJwt(input.token)
    ) {
      const verified = await this.verifyJwt(input, now);
      if (
        !verified.success ||
        verified.claims.client_id !== input.expectedClientId
      ) {
        return;
      }
      const claims = verified.claims;
      const scopes = parseScopes(claims.scope);
      if (scopes.includes("offline_access")) {
        await this.repository.revokeTokenFamily({
          applicationId: claims.application_id,
          clientId: claims.client_id,
          userId: claims.sub,
          sessionId: claims.sid,
          tokenFamilyId: claims.token_family_id,
          revokedAt: now,
        });
        await this.publishInvalidation({
          kind: "token_family",
          applicationId: claims.application_id,
          clientId: claims.client_id,
          userId: claims.sub,
          sessionId: claims.sid,
          tokenFamilyId: claims.token_family_id,
        });
      } else {
        await this.repository.revokeSession({
          applicationId: claims.application_id,
          userId: claims.sub,
          sessionId: claims.sid,
          revokedAt: now,
        });
        await this.publishInvalidation({
          kind: "session",
          applicationId: claims.application_id,
          userId: claims.sub,
          sessionId: claims.sid,
        });
      }
      return;
    }

    const refresh = await this.findRefreshToken(
      input.expectedApplicationId,
      input.token
    );
    if (!refresh || refresh.clientId !== input.expectedClientId) return;
    await this.publishInvalidation({
      kind: "user",
      applicationId: refresh.applicationId,
      clientId: refresh.clientId,
      userId: refresh.userId,
    });
  }

  invalidate(event: ApplicationAuthLiveStateInvalidationEvent): void {
    for (const [key, entry] of this.cache) {
      if (!matchesInvalidation(entry, event)) continue;
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  close(): void {
    this.unsubscribeInvalidation();
    this.clear();
  }

  private async verifyJwt(
    input: ValidateApplicationTokenInput,
    now: Date
  ): Promise<
    | { success: true; claims: JwtClaimsContract }
    | {
        success: false;
        reasonCategory: ApplicationTokenValidationReasonCategory;
      }
  > {
    const segments = input.token.split(".");
    if (segments.length !== 3) {
      return { success: false, reasonCategory: "malformed" };
    }
    let header: Record<string, unknown>;
    try {
      header = JSON.parse(decodeBase64Url(segments[0]!)) as Record<
        string,
        unknown
      >;
    } catch {
      return { success: false, reasonCategory: "malformed" };
    }
    if (header.alg !== "EdDSA" || typeof header.kid !== "string") {
      return { success: false, reasonCategory: "signature_invalid" };
    }
    const signingKey = await this.repository.findSigningKey(
      input.expectedApplicationId,
      header.kid
    );
    if (!signingKey) {
      return { success: false, reasonCategory: "signature_invalid" };
    }

    let payload: JWTPayload;
    try {
      const publicJwk = JSON.parse(signingKey.publicKey) as JSONWebKeySet["keys"][number];
      const key = await importJWK(publicJwk, "EdDSA");
      const verified = await compactVerify(input.token, key, {
        algorithms: ["EdDSA"],
      });
      payload = JSON.parse(UTF8_DECODER.decode(verified.payload)) as JWTPayload;
    } catch {
      return { success: false, reasonCategory: "signature_invalid" };
    }

    const expectedIssuer = this.issuer(input.expectedApplicationId);
    if (payload.iss !== expectedIssuer) {
      return { success: false, reasonCategory: "issuer_mismatch" };
    }
    if (payload.aud !== input.expectedAudience) {
      return { success: false, reasonCategory: "audience_mismatch" };
    }
    if (payload.application_id !== input.expectedApplicationId) {
      return { success: false, reasonCategory: "issuer_mismatch" };
    }
    if (!isJwtClaimsContract(payload)) {
      return { success: false, reasonCategory: "malformed" };
    }
    if (payload.exp * 1_000 <= now.getTime()) {
      return { success: false, reasonCategory: "expired" };
    }
    if (payload.iat * 1_000 > now.getTime() + 30_000) {
      return { success: false, reasonCategory: "malformed" };
    }
    return { success: true, claims: payload };
  }

  private async validateJwtLiveState(
    claims: JwtClaimsContract,
    now: Date
  ): Promise<ApplicationTokenValidationResult> {
    const scopes = parseScopes(claims.scope);
    if (!scopes.length || scopes.some((scope) => !oauthScopeSet.has(scope))) {
      return this.inactive("malformed", now);
    }
    const state = await this.repository.readLiveState({
      applicationId: claims.application_id,
      audience: claims.aud,
      clientId: claims.client_id,
      userId: claims.sub,
      sessionId: claims.sid,
      ...(scopes.includes("offline_access")
        ? { tokenFamilyId: claims.token_family_id }
        : {}),
      now,
    });
    const stateReason = liveStateReason(state, claims.aud, now, {
      requireTokenFamily: scopes.includes("offline_access"),
    });
    if (stateReason) return this.inactive(stateReason, now);
    return this.active({
      applicationId: claims.application_id,
      userId: claims.sub,
      clientId: claims.client_id,
      sessionId: claims.sid,
      tokenFamilyId: claims.token_family_id,
      scopes,
      issuer: claims.iss,
      audience: claims.aud,
      issuedAt: new Date(claims.iat * 1_000),
      expiresAt: new Date(claims.exp * 1_000),
      now,
    });
  }

  private async validateRefreshLiveState(
    refresh: ApplicationRefreshTokenRecord,
    expectedAudience: string,
    now: Date
  ): Promise<ApplicationTokenValidationResult> {
    if (refresh.revoked) {
      return this.inactive("token_family_revoked", now);
    }
    if (refresh.expiresAt.getTime() <= now.getTime()) {
      return this.inactive("expired", now);
    }
    if (!refresh.sessionId) return this.inactive("session_inactive", now);
    if (!refresh.referenceId) {
      return this.inactive("token_family_revoked", now);
    }
    if (
      !refresh.scopes.length ||
      new Set(refresh.scopes).size !== refresh.scopes.length ||
      refresh.scopes.some((scope) => !oauthScopeSet.has(scope))
    ) {
      return this.inactive("malformed", now);
    }
    const state = await this.repository.readLiveState({
      applicationId: refresh.applicationId,
      audience: expectedAudience,
      clientId: refresh.clientId,
      userId: refresh.userId,
      sessionId: refresh.sessionId,
      tokenFamilyId: refresh.referenceId,
      now,
    });
    const stateReason = liveStateReason(state, expectedAudience, now, {
      requireTokenFamily: true,
    });
    if (stateReason) return this.inactive(stateReason, now);
    return this.active({
      applicationId: refresh.applicationId,
      userId: refresh.userId,
      clientId: refresh.clientId,
      sessionId: refresh.sessionId,
      tokenFamilyId: refresh.referenceId,
      scopes: Object.freeze([...refresh.scopes]),
      issuer: this.issuer(refresh.applicationId),
      audience: expectedAudience,
      issuedAt: refresh.createdAt,
      expiresAt: refresh.expiresAt,
      now,
    });
  }

  private async findRefreshToken(
    applicationId: string,
    token: string
  ): Promise<ApplicationRefreshTokenRecord | null> {
    return this.repository.findRefreshTokenByHash(
      applicationId,
      hashSensitiveValue(token)
    );
  }

  private active(
    input: Omit<
      ActiveApplicationTokenValidationResult,
      "active" | "actorType" | "cacheUntil"
    > & { now: Date }
  ): ActiveApplicationTokenValidationResult {
    const cacheUntil = new Date(
      Math.min(
        input.expiresAt.getTime(),
        input.now.getTime() + POSITIVE_CACHE_TTL_MS
      )
    );
    return Object.freeze({
      active: true,
      applicationId: input.applicationId,
      userId: input.userId,
      clientId: input.clientId,
      sessionId: input.sessionId,
      tokenFamilyId: input.tokenFamilyId,
      scopes: Object.freeze([...input.scopes]),
      issuer: input.issuer,
      audience: input.audience,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      actorType: "application_user",
      cacheUntil,
    });
  }

  private inactive(
    reasonCategory: ApplicationTokenValidationReasonCategory,
    now: Date
  ): InactiveApplicationTokenValidationResult {
    return Object.freeze({
      active: false,
      reasonCategory,
      cacheUntil: new Date(now.getTime() + NEGATIVE_CACHE_TTL_MS),
    });
  }

  private cacheResult(
    key: string,
    result: ApplicationTokenValidationResult,
    tags: Omit<CacheEntry, "result" | "expiresAtMs">
  ): void {
    if (result.cacheUntil.getTime() <= this.now().getTime()) return;
    this.cache.set(key, {
      result,
      ...tags,
      expiresAtMs: result.cacheUntil.getTime(),
    });
    while (this.cache.size > MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.cache.delete(oldest);
    }
  }

  private touch(key: string, entry: CacheEntry): void {
    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  private issuer(applicationId: string): string {
    return `${this.publicBaseUrl}/auth/applications/${applicationId}`;
  }

  private async publishInvalidation(
    input: Omit<
      ApplicationAuthLiveStateInvalidationEvent,
      "schemaVersion" | "occurredAt"
    >
  ): Promise<void> {
    await this.invalidation.publish({
      schemaVersion: 1,
      ...input,
      occurredAt: this.now().toISOString(),
    });
  }
}

function validateBoundary(input: ValidateApplicationTokenInput) {
  return z
    .object({
      token: z.string().min(1).max(MAX_TOKEN_BYTES),
      expectedApplicationId: applicationIdSchema,
      expectedAudience: z.string().min(1).max(512),
    })
    .strict()
    .refine(
      (value) =>
        value.expectedAudience ===
        createApplicationResource(value.expectedApplicationId)
    )
    .safeParse(input);
}

function toValidationInput(
  input: ApplicationRefreshGrantValidationInput
): ValidateApplicationTokenInput {
  return {
    token: input.token,
    expectedApplicationId: input.expectedApplicationId,
    expectedAudience: input.expectedAudience,
  };
}

function isJwtClaimsContract(payload: JWTPayload): payload is JwtClaimsContract {
  return (
    typeof payload.application_id === "string" &&
    payload.actor_type === "application_user" &&
    typeof payload.client_id === "string" &&
    payload.client_id.length > 0 &&
    payload.client_id === payload.azp &&
    typeof payload.sid === "string" &&
    payload.sid.length > 0 &&
    typeof payload.sub === "string" &&
    payload.sub.length > 0 &&
    typeof payload.token_family_id === "string" &&
    payload.token_family_id.length > 0 &&
    typeof payload.scope === "string" &&
    typeof payload.iss === "string" &&
    typeof payload.aud === "string" &&
    Number.isSafeInteger(payload.iat) &&
    Number.isSafeInteger(payload.exp)
  );
}

function liveStateReason(
  state: ApplicationTokenLiveStateRecord,
  expectedAudience: string,
  now: Date,
  options: { requireTokenFamily: boolean }
): ApplicationTokenValidationReasonCategory | null {
  if (
    !state.applicationExists ||
    !state.realmEnabled ||
    state.applicationDeleted ||
    state.organizationDeleted ||
    state.resource !== expectedAudience
  ) {
    return "application_inactive";
  }
  if (
    !state.clientExists ||
    !state.clientActive ||
    state.clientResource !== expectedAudience
  ) {
    return "client_inactive";
  }
  if (!state.userExists || !state.userActive) return "user_inactive";
  if (
    !state.sessionExists ||
    !state.sessionExpiresAt ||
    state.sessionExpiresAt.getTime() <= now.getTime()
  ) {
    return "session_inactive";
  }
  if (options.requireTokenFamily && !state.tokenFamilyActive) {
    return "token_family_revoked";
  }
  return null;
}

function parseScopes(scope: string): string[] {
  const values = scope.split(" ").filter(Boolean);
  return new Set(values).size === values.length ? values : [];
}

function looksLikeJwt(token: string): boolean {
  return token.split(".").length === 3;
}

function decodeBase64Url(value: string): string {
  return UTF8_DECODER.decode(Buffer.from(value, "base64url"));
}

function hashSensitiveValue(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function createValidationCacheKey(input: ValidateApplicationTokenInput): string {
  return hashSensitiveValue(
    `${input.expectedApplicationId}\0${input.expectedAudience}\0${hashSensitiveValue(
      input.token
    )}`
  );
}

function tagsForClaims(
  claims: JwtClaimsContract
): Omit<CacheEntry, "result" | "expiresAtMs"> {
  return {
    applicationId: claims.application_id,
    clientId: claims.client_id,
    userId: claims.sub,
    sessionId: claims.sid,
    tokenFamilyId: claims.token_family_id,
  };
}

function tagsForRefresh(
  refresh: ApplicationRefreshTokenRecord
): Omit<CacheEntry, "result" | "expiresAtMs"> {
  return {
    applicationId: refresh.applicationId,
    clientId: refresh.clientId,
    userId: refresh.userId,
    ...(refresh.sessionId ? { sessionId: refresh.sessionId } : {}),
    ...(refresh.referenceId ? { tokenFamilyId: refresh.referenceId } : {}),
  };
}

function matchesInvalidation(
  entry: CacheEntry,
  event: ApplicationAuthLiveStateInvalidationEvent
): boolean {
  if (entry.applicationId !== event.applicationId) return false;
  if (event.kind === "application") return true;
  if (event.clientId && entry.clientId !== event.clientId) return false;
  if (event.userId && entry.userId !== event.userId) return false;
  if (event.sessionId && entry.sessionId !== event.sessionId) return false;
  if (
    event.tokenFamilyId &&
    entry.tokenFamilyId !== event.tokenFamilyId
  ) {
    return false;
  }
  return true;
}

function normalizePublicBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("IAM public base URL must not contain a path or query");
  }
  return url.origin;
}
