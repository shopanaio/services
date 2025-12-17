CREATE TABLE
  locales (
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    code VARCHAR(16) NOT NULL REFERENCES locale_codes (code),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, code)
  );

CREATE TABLE
  currencies (
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    code CHAR(3) NOT NULL REFERENCES currency_codes (code),
    exchange_rate NUMERIC NOT NULL CHECK (exchange_rate > 0),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    rate_updated_at TIMESTAMPTZ,
    PRIMARY KEY (project_id, code)
  );

CREATE TABLE
  project_settings (
    id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    phone_number VARCHAR(255),
    email VARCHAR(255),
    unit_system VARCHAR(255) NOT NULL,
    weight_unit VARCHAR(255) NOT NULL,
    timezone VARCHAR(32) NOT NULL CHECK (length(timezone) > 0),
    country_code VARCHAR(255) NOT NULL CHECK (length(country_code) > 0),
    locale_code VARCHAR(16) NOT NULL,
    display_currency_code CHAR(3) NOT NULL,
    base_currency_code CHAR(3) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id, locale_code) REFERENCES locales (project_id, code),
    FOREIGN KEY (id, display_currency_code) REFERENCES currencies (project_id, code),
    FOREIGN KEY (id, base_currency_code) REFERENCES currencies (project_id, code)
  );
