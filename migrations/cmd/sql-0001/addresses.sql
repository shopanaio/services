-- addresses
CREATE TABLE
  addresses (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    --
    address1 varchar(255),
    address2 varchar(255),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    city varchar(255),
    country_code varchar(16),
    email varchar(255),
    first_name varchar(255),
    last_name varchar(255),
    middle_name varchar(255),
    latitude varchar(255),
    longitude varchar(255),
    phone varchar(255),
    region varchar(255),
    postal_code varchar(16)
  );
