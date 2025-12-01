/*

TODO:
Разделить features на features и options. И убрать лишние поля.

*/

CREATE TABLE
	feature_swatches (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY ,
		color_one varchar(32),
		color_two varchar(32),
		image_id uuid REFERENCES files (id) ON DELETE SET NULL,
		swatch_type varchar(32) NOT NULL
	);

CREATE TABLE
	product_feature_groups (
		id uuid PRIMARY KEY ,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		container_id uuid REFERENCES product_containers (id) ON DELETE CASCADE NOT NULL,
		slug varchar(255) NOT NULL,
		feature_style_type varchar(32) NOT NULL,
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		UNIQUE (project_id, container_id, slug)
	);

CREATE TABLE
	product_feature_sources (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		product_feature_group_id uuid REFERENCES product_feature_groups (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY
	);

-- Быстрый доступ к источникам фич по группе
CREATE INDEX IF NOT EXISTS idx_product_feature_sources_group_id ON product_feature_sources (product_feature_group_id);

CREATE TABLE
	product_features (
		feature_id uuid REFERENCES product_feature_sources (id) ON DELETE CASCADE,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
		slug varchar(255) NOT NULL,
		product_feature_group_id uuid NOT NULL REFERENCES product_feature_groups (id) ON DELETE CASCADE,
		feature_swatch_id uuid REFERENCES feature_swatches (id) ON DELETE SET NULL,
		is_option boolean NOT NULL,
		option_sort_index int NOT NULL,
		is_attribute boolean NOT NULL,
		attribute_sort_index int NOT NULL,
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		PRIMARY KEY (project_id, variant_id, feature_id),
		-- This index might be redundant
		UNIQUE (
			project_id,
			product_feature_group_id,
			variant_id,
			slug
		)
	);

CREATE INDEX idx_product_features_product_feature_group_id ON product_features (product_feature_group_id);

-- fast lookup by product
CREATE INDEX idx_product_features_project_variant_id ON product_features (project_id, variant_id);

-- partial indexes by attribute / option flags
CREATE INDEX idx_product_features_is_attribute_true ON product_features (variant_id, attribute_sort_index)
WHERE
	is_attribute = true;

CREATE INDEX idx_product_features_is_option_true ON product_features (variant_id, option_sort_index)
WHERE
	is_option = true;
