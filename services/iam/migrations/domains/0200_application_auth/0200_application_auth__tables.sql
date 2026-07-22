-- Up Migration

CREATE TABLE "iam"."application_auth_configuration" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"realm_enabled" boolean DEFAULT false NOT NULL,
	"resource" text NOT NULL,
	"registration_mode" varchar(16) DEFAULT 'disabled' NOT NULL,
	"password_sign_up_enabled" boolean DEFAULT false NOT NULL,
	"password_sign_in_enabled" boolean DEFAULT false NOT NULL,
	"password_reset_enabled" boolean DEFAULT false NOT NULL,
	"email_verification_required" boolean DEFAULT true NOT NULL,
	"email_otp_sign_in_enabled" boolean DEFAULT false NOT NULL,
	"email_otp_sign_up_enabled" boolean DEFAULT false NOT NULL,
	"consent_mode" varchar(16) DEFAULT 'explicit' NOT NULL,
	"access_token_ttl_seconds" integer DEFAULT 900 NOT NULL,
	"id_token_ttl_seconds" integer DEFAULT 3600 NOT NULL,
	"refresh_token_ttl_seconds" integer DEFAULT 2592000 NOT NULL,
	"session_ttl_seconds" integer DEFAULT 2592000 NOT NULL,
	"secret_key_version" integer NOT NULL,
	"branding_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_locale" varchar(35) DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_auth_configuration_resource_check" CHECK ("iam"."application_auth_configuration"."resource" = 'urn:shopana:application:' || "iam"."application_auth_configuration"."application_id"::text),
	CONSTRAINT "application_auth_configuration_revision_check" CHECK ("iam"."application_auth_configuration"."revision" > 0),
	CONSTRAINT "application_auth_configuration_registration_mode_check" CHECK ("iam"."application_auth_configuration"."registration_mode" IN ('open', 'disabled')),
	CONSTRAINT "application_auth_configuration_consent_mode_check" CHECK ("iam"."application_auth_configuration"."consent_mode" = 'explicit'),
	CONSTRAINT "application_auth_configuration_otp_flags_check" CHECK (NOT "iam"."application_auth_configuration"."email_otp_sign_up_enabled" OR "iam"."application_auth_configuration"."email_otp_sign_in_enabled"),
	CONSTRAINT "application_auth_configuration_access_ttl_check" CHECK ("iam"."application_auth_configuration"."access_token_ttl_seconds" BETWEEN 300 AND 1800),
	CONSTRAINT "application_auth_configuration_id_ttl_check" CHECK ("iam"."application_auth_configuration"."id_token_ttl_seconds" BETWEEN 300 AND 3600),
	CONSTRAINT "application_auth_configuration_refresh_ttl_check" CHECK ("iam"."application_auth_configuration"."refresh_token_ttl_seconds" BETWEEN 86400 AND 2592000),
	CONSTRAINT "application_auth_configuration_session_ttl_check" CHECK ("iam"."application_auth_configuration"."session_ttl_seconds" BETWEEN 86400 AND 2592000),
	CONSTRAINT "application_auth_configuration_secret_version_check" CHECK ("iam"."application_auth_configuration"."secret_key_version" > 0),
	CONSTRAINT "application_auth_configuration_branding_check" CHECK (jsonb_typeof("iam"."application_auth_configuration"."branding_json") = 'object')
);
CREATE TABLE "iam"."application_auth_delivery_profile" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"transport_profile" varchar(128) NOT NULL,
	"sender_identity" varchar(320) NOT NULL,
	"email_verification_template_id" varchar(128) NOT NULL,
	"password_reset_template_id" varchar(128) NOT NULL,
	"email_otp_sign_in_template_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "application_auth_delivery_templates_distinct_check" CHECK ("iam"."application_auth_delivery_profile"."email_verification_template_id" <> "iam"."application_auth_delivery_profile"."password_reset_template_id" AND "iam"."application_auth_delivery_profile"."email_verification_template_id" <> "iam"."application_auth_delivery_profile"."email_otp_sign_in_template_id" AND "iam"."application_auth_delivery_profile"."password_reset_template_id" <> "iam"."application_auth_delivery_profile"."email_otp_sign_in_template_id")
);
CREATE TABLE "iam"."application_auth_origin" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"application_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_auth_origin_normalized_check" CHECK ("iam"."application_auth_origin"."origin" ~ '^https://[^/?#@]+$' OR "iam"."application_auth_origin"."origin" ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]{1,5})?$')
);
CREATE TABLE "iam"."application_auth_provider" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"application_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"encrypted_client_id" text NOT NULL,
	"encrypted_client_secret" text NOT NULL,
	"secret_key_version" integer NOT NULL,
	"scopes_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "application_auth_provider_name_check" CHECK ("iam"."application_auth_provider"."provider" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
	CONSTRAINT "application_auth_provider_ciphertext_check" CHECK ("iam"."application_auth_provider"."encrypted_client_id" LIKE 'iam-auth-keyring.v1.%' AND "iam"."application_auth_provider"."encrypted_client_secret" LIKE 'iam-auth-keyring.v1.%'),
	CONSTRAINT "application_auth_provider_secret_version_check" CHECK ("iam"."application_auth_provider"."secret_key_version" > 0 AND split_part("iam"."application_auth_provider"."encrypted_client_id", '.', 3) = "iam"."application_auth_provider"."secret_key_version"::text AND split_part("iam"."application_auth_provider"."encrypted_client_secret", '.', 3) = "iam"."application_auth_provider"."secret_key_version"::text),
	CONSTRAINT "application_auth_provider_scopes_check" CHECK (jsonb_typeof("iam"."application_auth_provider"."scopes_json") = 'array')
);
CREATE TABLE "iam"."application_authorization_context" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"redirect_uri_hash" text NOT NULL,
	"post_login_return_path_hash" text NOT NULL,
	"state" text NOT NULL,
	"nonce" text NOT NULL,
	"code_challenge" text NOT NULL,
	"code_challenge_method" varchar(8) DEFAULT 'S256' NOT NULL,
	"scopes" text[] NOT NULL,
	"resource" text NOT NULL,
	"current_step" varchar(16) DEFAULT 'login' NOT NULL,
	"session_id" text,
	"expires_at" timestamp with time zone DEFAULT now() + interval '10 minutes' NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_authorization_context_pkce_check" CHECK ("iam"."application_authorization_context"."code_challenge_method" = 'S256'),
	CONSTRAINT "application_authorization_context_step_check" CHECK ("iam"."application_authorization_context"."current_step" IN ('login', 'consent')),
	CONSTRAINT "application_authorization_context_ttl_check" CHECK ("iam"."application_authorization_context"."expires_at" = "iam"."application_authorization_context"."created_at" + interval '10 minutes'),
	CONSTRAINT "application_authorization_context_scopes_check" CHECK (cardinality("iam"."application_authorization_context"."scopes") > 0)
);
CREATE TABLE "iam"."application_oauth_access_token" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"token" text,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text,
	"reference_id" text,
	"refresh_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scopes" text[] NOT NULL
);
CREATE TABLE "iam"."application_oauth_client" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"skip_consent" boolean DEFAULT false NOT NULL,
	"enable_end_session" boolean DEFAULT true NOT NULL,
	"subject_type" text,
	"scopes" text[],
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"uri" text,
	"icon" text,
	"contacts" text[],
	"tos" text,
	"policy" text,
	"software_id" text,
	"software_version" text,
	"software_statement" text,
	"redirect_uris" text[] NOT NULL,
	"post_logout_redirect_uris" text[],
	"token_endpoint_auth_method" text NOT NULL,
	"grant_types" text[] DEFAULT ARRAY['authorization_code', 'refresh_token']::text[] NOT NULL,
	"response_types" text[] DEFAULT ARRAY['code']::text[] NOT NULL,
	"public" boolean NOT NULL,
	"type" text,
	"require_pkce" boolean DEFAULT true NOT NULL,
	"reference_id" text,
	"metadata" jsonb,
	"resource_audience" text NOT NULL,
	"protocol_policy_version" integer DEFAULT 1 NOT NULL,
	"environment" varchar(16) NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "application_oauth_client_environment_check" CHECK ("iam"."application_oauth_client"."environment" IN ('development', 'production')),
	CONSTRAINT "application_oauth_client_protocol_policy_check" CHECK ("iam"."application_oauth_client"."protocol_policy_version" = 1 AND "iam"."application_oauth_client"."grant_types" = ARRAY['authorization_code', 'refresh_token']::text[] AND "iam"."application_oauth_client"."response_types" = ARRAY['code']::text[] AND "iam"."application_oauth_client"."require_pkce"),
	CONSTRAINT "application_oauth_client_auth_method_check" CHECK ("iam"."application_oauth_client"."token_endpoint_auth_method" IN ('none', 'client_secret_basic', 'client_secret_post')),
	CONSTRAINT "application_oauth_client_secret_policy_check" CHECK (("iam"."application_oauth_client"."public" AND "iam"."application_oauth_client"."client_secret" IS NULL AND "iam"."application_oauth_client"."token_endpoint_auth_method" = 'none') OR (NOT "iam"."application_oauth_client"."public" AND "iam"."application_oauth_client"."client_secret" IS NOT NULL AND "iam"."application_oauth_client"."token_endpoint_auth_method" IN ('client_secret_basic', 'client_secret_post'))),
	CONSTRAINT "application_oauth_client_revision_check" CHECK ("iam"."application_oauth_client"."revision" > 0)
);
CREATE TABLE "iam"."application_oauth_consent" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text,
	"reference_id" text,
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "iam"."application_oauth_refresh_token" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"token" text NOT NULL,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text NOT NULL,
	"reference_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked" timestamp with time zone,
	"auth_time" timestamp with time zone,
	"scopes" text[] NOT NULL
);
CREATE UNIQUE INDEX "idx_application_auth_configuration_application_resource" ON "iam"."application_auth_configuration" USING btree ("application_id","resource");
CREATE UNIQUE INDEX "idx_application_oauth_client_application_client_id" ON "iam"."application_oauth_client" USING btree ("application_id","client_id");
CREATE UNIQUE INDEX "idx_application_oauth_refresh_token_application_id" ON "iam"."application_oauth_refresh_token" USING btree ("application_id","id");
ALTER TABLE "iam"."application_auth_configuration" ADD CONSTRAINT "application_auth_configuration_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_auth_delivery_profile" ADD CONSTRAINT "application_auth_delivery_profile_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_auth_origin" ADD CONSTRAINT "application_auth_origin_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_auth_provider" ADD CONSTRAINT "application_auth_provider_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_authorization_context" ADD CONSTRAINT "application_authorization_context_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_authorization_context" ADD CONSTRAINT "application_authorization_context_session_id_application_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "iam"."application_session"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iam"."application_authorization_context" ADD CONSTRAINT "application_authorization_context_client_fk" FOREIGN KEY ("application_id","client_id") REFERENCES "iam"."application_oauth_client"("application_id","client_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_authorization_context" ADD CONSTRAINT "application_authorization_context_session_scope_fk" FOREIGN KEY ("application_id","session_id") REFERENCES "iam"."application_session"("application_id","id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "iam"."application_authorization_context" ADD CONSTRAINT "application_authorization_context_resource_fk" FOREIGN KEY ("application_id","resource") REFERENCES "iam"."application_auth_configuration"("application_id","resource") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_access_token" ADD CONSTRAINT "application_oauth_access_token_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_access_token" ADD CONSTRAINT "application_oauth_access_token_session_id_application_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "iam"."application_session"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_access_token" ADD CONSTRAINT "application_oauth_access_token_client_fk" FOREIGN KEY ("application_id","client_id") REFERENCES "iam"."application_oauth_client"("application_id","client_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_access_token" ADD CONSTRAINT "application_oauth_access_token_session_scope_fk" FOREIGN KEY ("application_id","session_id") REFERENCES "iam"."application_session"("application_id","id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_access_token" ADD CONSTRAINT "application_oauth_access_token_user_fk" FOREIGN KEY ("application_id","user_id") REFERENCES "iam"."application_user"("application_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_access_token" ADD CONSTRAINT "application_oauth_access_token_refresh_fk" FOREIGN KEY ("application_id","refresh_id") REFERENCES "iam"."application_oauth_refresh_token"("application_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_client" ADD CONSTRAINT "application_oauth_client_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_client" ADD CONSTRAINT "application_oauth_client_user_id_application_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."application_user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_client" ADD CONSTRAINT "application_oauth_client_application_user_fk" FOREIGN KEY ("application_id","user_id") REFERENCES "iam"."application_user"("application_id","id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_client" ADD CONSTRAINT "application_oauth_client_resource_fk" FOREIGN KEY ("application_id","resource_audience") REFERENCES "iam"."application_auth_configuration"("application_id","resource") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_consent" ADD CONSTRAINT "application_oauth_consent_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_consent" ADD CONSTRAINT "application_oauth_consent_client_fk" FOREIGN KEY ("application_id","client_id") REFERENCES "iam"."application_oauth_client"("application_id","client_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_consent" ADD CONSTRAINT "application_oauth_consent_user_fk" FOREIGN KEY ("application_id","user_id") REFERENCES "iam"."application_user"("application_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_refresh_token" ADD CONSTRAINT "application_oauth_refresh_token_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_refresh_token" ADD CONSTRAINT "application_oauth_refresh_token_session_id_application_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "iam"."application_session"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_refresh_token" ADD CONSTRAINT "application_oauth_refresh_token_client_fk" FOREIGN KEY ("application_id","client_id") REFERENCES "iam"."application_oauth_client"("application_id","client_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_refresh_token" ADD CONSTRAINT "application_oauth_refresh_token_session_scope_fk" FOREIGN KEY ("application_id","session_id") REFERENCES "iam"."application_session"("application_id","id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "iam"."application_oauth_refresh_token" ADD CONSTRAINT "application_oauth_refresh_token_user_fk" FOREIGN KEY ("application_id","user_id") REFERENCES "iam"."application_user"("application_id","id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "idx_application_auth_configuration_resource" ON "iam"."application_auth_configuration" USING btree ("resource");
CREATE INDEX "idx_application_auth_configuration_active" ON "iam"."application_auth_configuration" USING btree ("realm_enabled","application_id");
CREATE UNIQUE INDEX "idx_application_auth_origin_application_origin" ON "iam"."application_auth_origin" USING btree ("application_id","origin");
CREATE INDEX "idx_application_auth_origin_application" ON "iam"."application_auth_origin" USING btree ("application_id");
CREATE UNIQUE INDEX "idx_application_auth_provider_application_provider" ON "iam"."application_auth_provider" USING btree ("application_id","provider");
CREATE INDEX "idx_application_auth_provider_application_enabled" ON "iam"."application_auth_provider" USING btree ("application_id","enabled");
CREATE INDEX "idx_application_authorization_context_application_client" ON "iam"."application_authorization_context" USING btree ("application_id","client_id");
CREATE INDEX "idx_application_authorization_context_cleanup" ON "iam"."application_authorization_context" USING btree ("expires_at","consumed_at");
CREATE UNIQUE INDEX "idx_application_oauth_access_token_token" ON "iam"."application_oauth_access_token" USING btree ("token");
CREATE INDEX "idx_application_oauth_access_token_application_client" ON "iam"."application_oauth_access_token" USING btree ("application_id","client_id");
CREATE INDEX "idx_application_oauth_access_token_application_user" ON "iam"."application_oauth_access_token" USING btree ("application_id","user_id");
CREATE INDEX "idx_application_oauth_access_token_application_refresh" ON "iam"."application_oauth_access_token" USING btree ("application_id","refresh_id");
CREATE INDEX "idx_application_oauth_access_token_expires" ON "iam"."application_oauth_access_token" USING btree ("application_id","expires_at");
CREATE UNIQUE INDEX "idx_application_oauth_client_client_id" ON "iam"."application_oauth_client" USING btree ("client_id");
CREATE UNIQUE INDEX "idx_application_oauth_client_application_id" ON "iam"."application_oauth_client" USING btree ("application_id","id");
CREATE INDEX "idx_application_oauth_client_application_state" ON "iam"."application_oauth_client" USING btree ("application_id","disabled","deleted_at");
CREATE INDEX "idx_application_oauth_client_application_user" ON "iam"."application_oauth_client" USING btree ("application_id","user_id");
CREATE UNIQUE INDEX "idx_application_oauth_consent_application_id" ON "iam"."application_oauth_consent" USING btree ("application_id","id");
CREATE INDEX "idx_application_oauth_consent_application_client" ON "iam"."application_oauth_consent" USING btree ("application_id","client_id");
CREATE INDEX "idx_application_oauth_consent_application_user" ON "iam"."application_oauth_consent" USING btree ("application_id","user_id");
CREATE UNIQUE INDEX "idx_application_oauth_refresh_token_token" ON "iam"."application_oauth_refresh_token" USING btree ("token");
CREATE INDEX "idx_application_oauth_refresh_token_application_client" ON "iam"."application_oauth_refresh_token" USING btree ("application_id","client_id");
CREATE INDEX "idx_application_oauth_refresh_token_application_user" ON "iam"."application_oauth_refresh_token" USING btree ("application_id","user_id");
CREATE INDEX "idx_application_oauth_refresh_token_expires" ON "iam"."application_oauth_refresh_token" USING btree ("application_id","expires_at");
ALTER TABLE "iam"."application_jwks" ADD CONSTRAINT "application_jwks_private_key_ciphertext_check" CHECK ("iam"."application_jwks"."private_key" LIKE 'iam-auth-keyring.v1.%' AND split_part("iam"."application_jwks"."private_key", '.', 3) = "iam"."application_jwks"."private_key_key_version"::text);
ALTER TABLE "iam"."application_jwks" ADD CONSTRAINT "application_jwks_private_key_version_check" CHECK ("iam"."application_jwks"."private_key_key_version" > 0);
CREATE FUNCTION "iam"."prevent_application_auth_resource_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.application_id IS DISTINCT FROM OLD.application_id
		OR NEW.resource IS DISTINCT FROM OLD.resource THEN
		RAISE EXCEPTION 'application auth resource is immutable' USING ERRCODE = '23514';
	END IF;
	RETURN NEW;
END;
$$;
CREATE TRIGGER "application_auth_configuration_resource_immutable"
BEFORE UPDATE OF "application_id", "resource"
ON "iam"."application_auth_configuration"
FOR EACH ROW
EXECUTE FUNCTION "iam"."prevent_application_auth_resource_update"();
CREATE FUNCTION "iam"."assert_application_auth_configuration_exists"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	target_application_id uuid;
BEGIN
	IF TG_TABLE_NAME = 'application' THEN
		target_application_id := NEW.id;
	ELSIF TG_OP = 'DELETE' THEN
		target_application_id := OLD.application_id;
	ELSE
		target_application_id := NEW.application_id;
	END IF;

	IF EXISTS (
		SELECT 1 FROM "iam"."application" WHERE "id" = target_application_id
	) AND NOT EXISTS (
		SELECT 1
		FROM "iam"."application_auth_configuration"
		WHERE "application_id" = target_application_id
	) THEN
		RAISE EXCEPTION 'application % requires an auth configuration', target_application_id
			USING ERRCODE = '23503';
	END IF;
	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER "application_auth_configuration_after_application_insert"
AFTER INSERT ON "iam"."application"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "iam"."assert_application_auth_configuration_exists"();
CREATE CONSTRAINT TRIGGER "application_auth_configuration_after_application_id_update"
AFTER UPDATE OF "id" ON "iam"."application"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "iam"."assert_application_auth_configuration_exists"();
CREATE CONSTRAINT TRIGGER "application_auth_configuration_after_configuration_delete"
AFTER DELETE ON "iam"."application_auth_configuration"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "iam"."assert_application_auth_configuration_exists"();
