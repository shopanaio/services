-- Up Migration

CREATE TABLE "apps"."app_installation_manifest_snapshots" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "installation_id" uuid NOT NULL,
  "app_code" varchar(128) NOT NULL,
  "version" varchar(64) NOT NULL,
  "manifest_hash" varchar(64) NOT NULL,
  "manifest" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_installation_manifest_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "app_installation_manifest_snapshot_key"
    UNIQUE ("installation_id", "version", "manifest_hash"),
  CONSTRAINT "app_installation_manifest_snapshots_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);

CREATE INDEX "app_installation_manifest_installation_idx"
  ON "apps"."app_installation_manifest_snapshots" ("installation_id");

CREATE TABLE "apps"."app_installation_scopes" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "installation_id" uuid NOT NULL,
  "scope" varchar(255) NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  CONSTRAINT "app_installation_scopes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "app_installation_scope_key"
    UNIQUE ("installation_id", "scope"),
  CONSTRAINT "app_installation_scopes_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);

CREATE INDEX "app_installation_scopes_installation_idx"
  ON "apps"."app_installation_scopes" ("installation_id");

CREATE TABLE "apps"."app_installation_secrets" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "installation_id" uuid NOT NULL,
  "name" varchar(128) NOT NULL,
  "ciphertext" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_installation_secrets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "app_installation_secret_key"
    UNIQUE ("installation_id", "name"),
  CONSTRAINT "app_installation_secrets_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);

CREATE INDEX "app_installation_secrets_installation_idx"
  ON "apps"."app_installation_secrets" ("installation_id");
