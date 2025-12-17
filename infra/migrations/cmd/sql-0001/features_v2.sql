-- Product Features (Attributes)
CREATE TABLE
	product_feature (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		product_id uuid REFERENCES product (id) ON DELETE CASCADE NOT NULL,
		slug varchar(255) NOT NULL,
		sort_index int NOT NULL DEFAULT 0,
		created_at timestamp NOT NULL DEFAULT NOW(),
		updated_at timestamp NOT NULL DEFAULT NOW(),
		UNIQUE (project_id, product_id, slug)
	);

-- Index for efficient batch loading by product IDs (used by DataLoaders)
CREATE INDEX idx_product_feature_product ON product_feature(project_id, product_id);

-- Product Feature Values
CREATE TABLE
	product_feature_value (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		feature_id uuid NOT NULL REFERENCES product_feature (id) ON DELETE CASCADE,
		slug varchar(255) NOT NULL,
		sort_index int NOT NULL DEFAULT 0,
		created_at timestamp NOT NULL DEFAULT NOW(),
		updated_at timestamp NOT NULL DEFAULT NOW(),
		UNIQUE (project_id, feature_id, slug)
	);

-- Index for efficient batch loading by feature IDs (used by DataLoaders)
CREATE INDEX idx_product_feature_value_feature ON product_feature_value(project_id, feature_id);

-- Product Option Swatches (for visual representation of options)
CREATE TABLE
	product_option_swatch (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		color_one varchar(32),
		color_two varchar(32),
		image_id uuid REFERENCES files (id) ON DELETE SET NULL,
		swatch_type varchar(32) NOT NULL,
		-- Data for external systems when swatch_type is EXTERNAL
		metadata jsonb,
		created_at timestamp NOT NULL DEFAULT NOW(),
		updated_at timestamp NOT NULL DEFAULT NOW()
	);

-- Product Options (like color, material, size)
CREATE TABLE
	product_option (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		product_id uuid REFERENCES product (id) ON DELETE CASCADE NOT NULL,
		slug varchar(255) NOT NULL,
		sort_index int NOT NULL DEFAULT 0,
		display_type varchar(32) NOT NULL,
		created_at timestamp NOT NULL DEFAULT NOW(),
		updated_at timestamp NOT NULL DEFAULT NOW(),
		UNIQUE (project_id, product_id, slug)
	);

-- Index for efficient batch loading by product IDs (used by DataLoaders)
CREATE INDEX idx_product_option_product ON product_option(project_id, product_id);

-- Product Option Values (like red, blue, small, large)
CREATE TABLE
	product_option_value (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		option_id uuid REFERENCES product_option (id) ON DELETE CASCADE NOT NULL,
		swatch_id uuid REFERENCES product_option_swatch (id) ON DELETE SET NULL,
		slug varchar(255) NOT NULL,
		sort_index int NOT NULL DEFAULT 0,
		created_at timestamp NOT NULL DEFAULT NOW(),
		updated_at timestamp NOT NULL DEFAULT NOW(),
		UNIQUE (project_id, option_id, slug)
	);

-- Index for efficient batch loading by option IDs (used by DataLoaders)
CREATE INDEX idx_product_option_value_option ON product_option_value(project_id, option_id);

-- Product Option Variant Links (which option values are assigned to which variants)
CREATE TABLE
	product_option_variant_link (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
		option_id uuid NOT NULL REFERENCES product_option (id) ON DELETE CASCADE,
		option_value_id uuid REFERENCES product_option_value (id) ON DELETE CASCADE,
		container_id uuid NOT NULL,
		sort_index int NOT NULL DEFAULT 0,
		is_default_value boolean NOT NULL DEFAULT false,
		created_at timestamp NOT NULL DEFAULT NOW(),
		updated_at timestamp NOT NULL DEFAULT NOW(),
		UNIQUE (project_id, variant_id, option_id)
	);

-- Index for efficient batch loading by variant IDs (used by DataLoaders)
CREATE INDEX idx_product_option_variant_link_variant ON product_option_variant_link(project_id, variant_id);
-- Index for loading by option_id (used for aggregating available options)
CREATE INDEX idx_product_option_variant_link_option ON product_option_variant_link(project_id, option_id);
-- Index for loading by container_id (used for aggregating available options)
CREATE INDEX idx_product_option_variant_link_container ON product_option_variant_link(project_id, container_id);
