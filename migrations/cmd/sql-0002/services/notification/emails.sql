CREATE TABLE
  email_templates (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    is_active boolean NOT NULL DEFAULT false,
    type varchar(32) NOT NULL,
    subject varchar(988) NOT NULL DEFAULT '',
    template text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE UNIQUE INDEX idx_email_templates_type ON email_templates (
  project_id,
  type
);

CREATE TABLE
  email_settings (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    from_email varchar(255) NOT NULL,
    reply_to varchar(255),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE TABLE
  email_profiles (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    smtp_host varchar(255) NOT NULL,
    smtp_port int NOT NULL,
    smtp_username varchar(255) NOT NULL,
    smtp_password varchar(255) NOT NULL,
    sort_index int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE TABLE
  sms_templates (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    is_active boolean NOT NULL DEFAULT false,
    type varchar(32) NOT NULL,
    subject varchar(988) NOT NULL DEFAULT '',
    template text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE UNIQUE INDEX idx_sms_templates_type ON sms_templates (
  project_id,
  type
);

CREATE TABLE
  sms_settings (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    from_number varchar(255) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE TABLE
  sms_profiles (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    auth_username varchar(255) NOT NULL,
    auth_password varchar(255) NOT NULL,
    sort_index int NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
