CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS btree_gin;

CREATE TABLE listing.product_search_text (
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_doc_id int NOT NULL,
  locale "listing"."locale_code" NOT NULL,
  field varchar(32) NOT NULL,
  element_id uuid NOT NULL,
  prepared_text text NOT NULL,
  normalization_contract_version varchar(32) NOT NULL,
  normalization_profile_revision varchar(64) NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('pg_catalog.simple'::regconfig, prepared_text)
  ) STORED,
  indexed_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (product_id, locale, field, element_id),
  CONSTRAINT fk_product_search_text_product
    FOREIGN KEY (product_doc_id, product_id)
    REFERENCES listing.product_listing_index(product_doc_id, product_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_search_text_uuid_v7
    CHECK (
      substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(product_id::text FROM 15 FOR 1) = '7'
      AND substring(element_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_product_search_text_product_doc_positive CHECK (product_doc_id > 0),
  CONSTRAINT chk_product_search_text_field
    CHECK (field IN ('product_title', 'variant_title', 'vendor_name', 'category_name')),
  CONSTRAINT chk_product_search_text_prepared_text
    CHECK (prepared_text <> '' AND char_length(prepared_text) <= 8192),
  CONSTRAINT chk_product_search_text_contract
    CHECK (normalization_contract_version <> '' AND normalization_profile_revision <> '')
);

CREATE INDEX product_search_text_store_vector_gin
  ON listing.product_search_text USING gin (store_id, search_vector);

CREATE INDEX product_search_text_scope_idx
  ON listing.product_search_text (
    store_id,
    locale,
    normalization_contract_version,
    normalization_profile_revision,
    field
  );

CREATE INDEX product_search_text_product_doc_idx
  ON listing.product_search_text (store_id, product_doc_id, locale);

CREATE TABLE listing.product_search_identifier (
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_doc_id int NOT NULL,
  locale "listing"."locale_code" NOT NULL,
  element_id uuid NOT NULL,
  kind varchar(16) NOT NULL,
  normalized_value text NOT NULL,
  indexed_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (product_id, locale, kind, element_id),
  CONSTRAINT fk_product_search_identifier_product
    FOREIGN KEY (product_doc_id, product_id)
    REFERENCES listing.product_listing_index(product_doc_id, product_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_search_identifier_uuid_v7
    CHECK (
      substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(product_id::text FROM 15 FOR 1) = '7'
      AND substring(element_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_product_search_identifier_product_doc_positive CHECK (product_doc_id > 0),
  CONSTRAINT chk_product_search_identifier_kind CHECK (kind = 'SKU'),
  CONSTRAINT chk_product_search_identifier_value
    CHECK (normalized_value <> '' AND char_length(normalized_value) <= 255)
);

CREATE INDEX product_search_identifier_exact_idx
  ON listing.product_search_identifier (store_id, locale, kind, normalized_value, product_id);

CREATE INDEX product_search_identifier_prefix_idx
  ON listing.product_search_identifier (
    store_id,
    locale,
    kind,
    normalized_value text_pattern_ops,
    product_id
  );

CREATE INDEX product_search_identifier_product_doc_idx
  ON listing.product_search_identifier (store_id, product_doc_id, locale);

CREATE TABLE listing.search_term_dictionary (
  store_id uuid NOT NULL,
  locale "listing"."locale_code" NOT NULL,
  term text NOT NULL,
  code_point_length smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT search_term_dictionary_store_locale_term_unique
    UNIQUE (store_id, locale, term),
  CONSTRAINT chk_search_term_dictionary_store_uuid_v7
    CHECK (substring(store_id::text FROM 15 FOR 1) = '7'),
  CONSTRAINT chk_search_term_dictionary_term
    CHECK (term <> '' AND char_length(term) <= 128),
  CONSTRAINT chk_search_term_dictionary_code_point_length
    CHECK (
      code_point_length > 0
      AND code_point_length <= 128
      AND code_point_length = char_length(term)
    )
);

CREATE INDEX search_term_dictionary_store_term_trgm_gin
  ON listing.search_term_dictionary USING gin (store_id, term gin_trgm_ops);

CREATE INDEX search_term_dictionary_scope_idx
  ON listing.search_term_dictionary (store_id, locale, code_point_length);

CREATE INDEX search_term_dictionary_stale_idx
  ON listing.search_term_dictionary (store_id, locale, last_seen_at, term);

CREATE TABLE listing.search_settings (
  store_id uuid NOT NULL,
  enabled_fields jsonb NOT NULL,
  field_weights jsonb NOT NULL,
  typo_tolerance_enabled boolean NOT NULL DEFAULT false,
  out_of_stock_policy varchar(16) NOT NULL DEFAULT 'SHOW',
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT search_settings_store_unique UNIQUE (store_id),
  CONSTRAINT chk_search_settings_uuid_v7
    CHECK (substring(store_id::text FROM 15 FOR 1) = '7'),
  CONSTRAINT chk_search_settings_enabled_fields CHECK (jsonb_typeof(enabled_fields) = 'array'),
  CONSTRAINT chk_search_settings_field_weights CHECK (jsonb_typeof(field_weights) = 'object'),
  CONSTRAINT chk_search_settings_oos_policy
    CHECK (out_of_stock_policy IN ('SHOW', 'HIDE', 'PLACE_LAST'))
);

CREATE TABLE listing.search_synonym_group (
  store_id uuid NOT NULL,
  group_id uuid NOT NULL,
  locale "listing"."locale_code" NOT NULL,
  name varchar(128) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (group_id),
  CONSTRAINT search_synonym_group_store_id_unique UNIQUE (store_id, group_id),
  CONSTRAINT search_synonym_group_store_id_locale_unique UNIQUE (store_id, group_id, locale),
  CONSTRAINT search_synonym_group_store_locale_name_unique UNIQUE (store_id, locale, name),
  CONSTRAINT chk_search_synonym_group_uuid_v7
    CHECK (
      substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(group_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_search_synonym_group_name CHECK (name <> '')
);

CREATE TABLE listing.search_synonym_value (
  store_id uuid NOT NULL,
  group_id uuid NOT NULL,
  value_id uuid NOT NULL,
  position smallint NOT NULL,
  display_value text NOT NULL,
  normalized_value text NOT NULL,
  prepared_text text NOT NULL,
  normalization_contract_version varchar(32) NOT NULL,
  normalization_profile_revision varchar(64) NOT NULL,

  PRIMARY KEY (value_id),
  CONSTRAINT search_synonym_value_position_unique UNIQUE (store_id, group_id, position),
  CONSTRAINT search_synonym_value_normalized_unique UNIQUE (store_id, group_id, normalized_value),
  CONSTRAINT fk_search_synonym_value_group
    FOREIGN KEY (store_id, group_id)
    REFERENCES listing.search_synonym_group(store_id, group_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_search_synonym_value_uuid_v7
    CHECK (
      substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(group_id::text FROM 15 FOR 1) = '7'
      AND substring(value_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_search_synonym_value_position CHECK (position BETWEEN 1 AND 20),
  CONSTRAINT chk_search_synonym_value_lengths
    CHECK (
      display_value <> '' AND normalized_value <> ''
      AND prepared_text <> ''
      AND char_length(display_value) <= 128
      AND char_length(normalized_value) <= 128
      AND char_length(prepared_text) <= 512
    ),
  CONSTRAINT chk_search_synonym_value_contract
    CHECK (normalization_contract_version <> '' AND normalization_profile_revision <> '')
);

CREATE INDEX search_synonym_group_enabled_locale_idx
  ON listing.search_synonym_group (store_id, locale, group_id)
  WHERE enabled = true;

CREATE TABLE listing.search_synonym_claim (
  store_id uuid NOT NULL,
  locale "listing"."locale_code" NOT NULL,
  normalized_value text NOT NULL,
  group_id uuid NOT NULL,

  CONSTRAINT search_synonym_claim_store_locale_value_pk
    PRIMARY KEY (store_id, locale, normalized_value),
  CONSTRAINT fk_search_synonym_claim_group
    FOREIGN KEY (store_id, group_id, locale)
    REFERENCES listing.search_synonym_group(store_id, group_id, locale)
    ON DELETE CASCADE,
  CONSTRAINT chk_search_synonym_claim_uuid_v7
    CHECK (
      substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(group_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_search_synonym_claim_value
    CHECK (normalized_value <> '' AND char_length(normalized_value) <= 128)
);

CREATE TABLE listing.search_product_boost (
  store_id uuid NOT NULL,
  boost_id uuid NOT NULL,
  locale "listing"."locale_code" NOT NULL,
  name varchar(128) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (boost_id),
  CONSTRAINT search_product_boost_store_id_unique UNIQUE (store_id, boost_id),
  CONSTRAINT search_product_boost_store_locale_name_unique UNIQUE (store_id, locale, name),
  CONSTRAINT chk_search_product_boost_uuid_v7
    CHECK (
      substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(boost_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_search_product_boost_name CHECK (name <> '')
);

CREATE TABLE listing.search_product_boost_phrase (
  store_id uuid NOT NULL,
  boost_id uuid NOT NULL,
  phrase_id uuid NOT NULL,
  position smallint NOT NULL,
  display_phrase text NOT NULL,
  normalized_phrase text NOT NULL,
  normalization_contract_version varchar(32) NOT NULL,
  normalization_profile_revision varchar(64) NOT NULL,

  PRIMARY KEY (phrase_id),
  CONSTRAINT search_product_boost_phrase_position_unique UNIQUE (store_id, boost_id, position),
  CONSTRAINT search_product_boost_phrase_normalized_unique UNIQUE (store_id, boost_id, normalized_phrase),
  CONSTRAINT fk_search_product_boost_phrase_boost
    FOREIGN KEY (store_id, boost_id)
    REFERENCES listing.search_product_boost(store_id, boost_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_search_product_boost_phrase_uuid_v7
    CHECK (
      substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(boost_id::text FROM 15 FOR 1) = '7'
      AND substring(phrase_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_search_product_boost_phrase_position CHECK (position BETWEEN 1 AND 20),
  CONSTRAINT chk_search_product_boost_phrase_lengths
    CHECK (
      display_phrase <> '' AND normalized_phrase <> ''
      AND char_length(display_phrase) <= 128
      AND char_length(normalized_phrase) <= 128
    ),
  CONSTRAINT chk_search_product_boost_phrase_contract
    CHECK (normalization_contract_version <> '' AND normalization_profile_revision <> '')
);

CREATE INDEX search_product_boost_enabled_locale_idx
  ON listing.search_product_boost (store_id, locale, boost_id)
  WHERE enabled = true;

CREATE INDEX search_product_boost_phrase_lookup_idx
  ON listing.search_product_boost_phrase (store_id, normalized_phrase, boost_id);

CREATE TABLE listing.search_product_boost_product (
  store_id uuid NOT NULL,
  boost_id uuid NOT NULL,
  product_id uuid NOT NULL,
  position smallint NOT NULL,

  PRIMARY KEY (store_id, boost_id, product_id),
  CONSTRAINT search_product_boost_product_position_unique UNIQUE (store_id, boost_id, position),
  CONSTRAINT fk_search_product_boost_product_boost
    FOREIGN KEY (store_id, boost_id)
    REFERENCES listing.search_product_boost(store_id, boost_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_search_product_boost_product_uuid_v7
    CHECK (
      substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(boost_id::text FROM 15 FOR 1) = '7'
      AND substring(product_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_search_product_boost_product_position CHECK (position BETWEEN 1 AND 50)
);
