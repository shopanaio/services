CREATE EXTENSION IF NOT EXISTS btree_gin SCHEMA platform;

CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA platform;

CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA platform;

CREATE EXTENSION IF NOT EXISTS pg_uuidv7 SCHEMA platform;

CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA platform;

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch SCHEMA platform;

-- email/ci текстовые поля
CREATE EXTENSION IF NOT EXISTS citext;


-- -------------------------------------------------
-- Тип enum для политики публикации отзывов в проекте
-- -------------------------------------------------
CREATE TYPE review_policy AS ENUM (
  'PURCHASED_ONLY',
  'REGISTERED_USERS',
  'ANONYMOUS'
);

CREATE TABLE
  users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    -- When user deletes account we store a hash of their email to keep track of them
    -- and prevent them from creating a new account with the same email
    email_hash_no_salt varchar(255) NOT NULL UNIQUE,
    external_id varchar(255) UNIQUE, -- keykloak, auth0, etc
    auth_provider varchar(255) NOT NULL, -- keykloak, auth0, etc
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  );

CREATE TABLE
  projects (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    name varchar(255) NOT NULL,
    slug varchar(32) NOT NULL UNIQUE,
    status varchar(255) NOT NULL,
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'DELETED')),
    db_version float NOT NULL DEFAULT 1.0,
    version float NOT NULL DEFAULT 1.0,
    -- политика публикации отзывов
    review_policy review_policy NOT NULL DEFAULT 'PURCHASED_ONLY',
    created_by uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- dates
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  );

CREATE TABLE
  project_infra (
    id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    s3_bucket_name varchar(255) NOT NULL UNIQUE,
    db_schema_name varchar(255) NOT NULL,
    casdoor_organization varchar(255) NOT NULL UNIQUE,
    casdoor_application varchar(255) NOT NULL UNIQUE,
    meta json NOT NULL,
    PRIMARY KEY (id)
  );

CREATE TABLE
  api_keys (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    api_key_hash varchar(255) UNIQUE NOT NULL,
    name varchar(255) NOT NULL,
    created_by uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    is_banned boolean NOT NULL DEFAULT false,
    last_used_at timestamp, -- todo: update this field in a batch
    created_at timestamp NOT NULL DEFAULT now(),
    due_date timestamp
  );

ALTER TABLE api_keys
ADD CONSTRAINT api_keys_project_name_key UNIQUE (name, project_id);

CREATE TABLE
  users_projects (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, project_id)
  );

CREATE TABLE
  invited_users (
    id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invited_by uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    invited_at timestamp NOT NULL DEFAULT now(),
    email varchar(255) NOT NULL UNIQUE
  );

CREATE TABLE
  app_config (
    id int PRIMARY KEY,
    CHECK (id = 1),
    initialized boolean NOT NULL,
    initialized_by uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    initialized_at timestamp NOT NULL DEFAULT now(),
    app_version float NOT NULL DEFAULT 1.0
  );

CREATE TABLE
  locale_codes (
    code varchar(16) PRIMARY KEY,
    is_active boolean NOT NULL DEFAULT false
  );

CREATE TABLE
  currency_codes (
    code char(3) PRIMARY KEY,
    is_active boolean NOT NULL DEFAULT false
  );
