CREATE TABLE
  locales (
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    code locale NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (project_id, code)
  );

CREATE TABLE
  currencies (
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    code currency NOT NULL,
    exchange_rate NUMERIC NOT NULL CHECK (exchange_rate > 0),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    rate_updated_at TIMESTAMPTZ,
    PRIMARY KEY (project_id, code)
  );

CREATE TABLE
  project_settings (
    id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    timezone VARCHAR(32) NOT NULL CHECK (length(timezone) > 0),
    country_code VARCHAR(255) NOT NULL CHECK (length(country_code) > 0),
    dimensions_unit VARCHAR(255) NOT NULL,
    weight_unit VARCHAR(255) NOT NULL,
    locale_code locale NOT NULL,
    currency_code currency NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id, locale_code) REFERENCES locales (project_id, code),
    FOREIGN KEY (id, currency_code) REFERENCES currencies (project_id, code)
  );
