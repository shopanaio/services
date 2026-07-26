-- Up Migration

CREATE UNIQUE INDEX "idx_application_verification_password_reset_user"
ON "iam"."application_verification" USING btree ("application_id", "value")
WHERE "identifier" LIKE 'reset-password:%';
