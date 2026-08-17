ALTER TABLE "customers"."customer_group"
  ADD COLUMN "revision" integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT "customer_group_revision_nonnegative_check"
    CHECK ("revision" >= 1);
