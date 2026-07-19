import { createHash, randomBytes } from "node:crypto";
import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";
import { assertApplicationId } from "../auth/AuthScope.js";
import type { Database } from "../infrastructure/db/database.js";
import { BaseRepository } from "./BaseRepository.js";
import {
  applicationAuthorizationContext,
  type ApplicationAuthorizationContext,
} from "./models/index.js";

const authorizationContextInputSchema = z
  .object({
    clientId: z.string().min(1).max(512),
    redirectUri: z.string().url().max(2048),
    postLoginReturnPath: z.string().min(1).max(2048),
    state: z.string().min(16).max(2048),
    nonce: z.string().min(16).max(2048),
    codeChallenge: z.string().min(43).max(128),
    codeChallengeMethod: z.literal("S256"),
    scopes: z.array(z.string().min(1).max(256)).min(1).max(32),
    resource: z.string().min(1).max(2048),
  })
  .strict();

export type CreateApplicationAuthorizationContextInput = z.infer<
  typeof authorizationContextInputSchema
>;

export interface CreatedApplicationAuthorizationContext {
  /** Raw value is returned once for the signed HttpOnly browser cookie. */
  opaqueId: string;
  context: ApplicationAuthorizationContext;
}

export class ApplicationAuthorizationContextRepository extends BaseRepository {
  constructor(db: Database, txManager: TransactionManager<Database>) {
    super(db, txManager);
  }

  @Transactional()
  async create(
    applicationId: string,
    input: CreateApplicationAuthorizationContextInput
  ): Promise<CreatedApplicationAuthorizationContext> {
    assertApplicationId(applicationId);
    const value = authorizationContextInputSchema.parse(input);
    if (new Set(value.scopes).size !== value.scopes.length) {
      throw new Error("Authorization context scopes must be unique");
    }
    const opaqueId = randomBytes(32).toString("base64url");
    const id = hashValue(opaqueId);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);
    const [context] = await this.connection
      .insert(applicationAuthorizationContext)
      .values({
        id,
        applicationId,
        clientId: value.clientId,
        redirectUriHash: hashValue(value.redirectUri),
        postLoginReturnPathHash: hashValue(value.postLoginReturnPath),
        state: value.state,
        nonce: value.nonce,
        codeChallenge: value.codeChallenge,
        codeChallengeMethod: value.codeChallengeMethod,
        scopes: value.scopes,
        resource: value.resource,
        currentStep: "login",
        createdAt,
        updatedAt: createdAt,
        expiresAt,
      })
      .returning();
    if (!context) {
      throw new Error("Authorization context could not be created");
    }
    return { opaqueId, context };
  }

  @ReadOnly()
  async findActive(
    applicationId: string,
    opaqueId: string
  ): Promise<ApplicationAuthorizationContext | null> {
    assertApplicationId(applicationId);
    const [context] = await this.connection
      .select()
      .from(applicationAuthorizationContext)
      .where(
        and(
          eq(applicationAuthorizationContext.applicationId, applicationId),
          eq(applicationAuthorizationContext.id, hashValue(opaqueId)),
          isNull(applicationAuthorizationContext.consumedAt),
          gt(applicationAuthorizationContext.expiresAt, new Date())
        )
      )
      .limit(1);
    return context ?? null;
  }

  @Transactional()
  async consume(
    applicationId: string,
    opaqueId: string
  ): Promise<ApplicationAuthorizationContext | null> {
    assertApplicationId(applicationId);
    const now = new Date();
    const [context] = await this.connection
      .update(applicationAuthorizationContext)
      .set({ consumedAt: now, updatedAt: now })
      .where(
        and(
          eq(applicationAuthorizationContext.applicationId, applicationId),
          eq(applicationAuthorizationContext.id, hashValue(opaqueId)),
          isNull(applicationAuthorizationContext.consumedAt),
          gt(applicationAuthorizationContext.expiresAt, now)
        )
      )
      .returning();
    return context ?? null;
  }

  @Transactional()
  async cleanup(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const rows = await this.connection
      .delete(applicationAuthorizationContext)
      .where(
        or(
          lt(applicationAuthorizationContext.expiresAt, cutoff),
          lt(applicationAuthorizationContext.consumedAt, cutoff)
        )
      )
      .returning({ id: applicationAuthorizationContext.id });
    return rows.length;
  }
}

function hashValue(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

