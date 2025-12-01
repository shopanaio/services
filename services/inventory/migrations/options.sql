CREATE TABLE
	product_option_swatch (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY,
		color_one varchar(32),
		color_two varchar(32),
		image_id uuid REFERENCES files (id) ON DELETE SET NULL,
		swatch_type varchar(32) NOT NULL,
		-- Data for external systems when swatch_type is EXTERNAL
		metadata jsonb
	);

CREATE INDEX idx_product_option_swatch_project_id ON product_option_swatch (project_id);

-- Options like color, material, size
CREATE TABLE
	product_option (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		product_id uuid REFERENCES product (id) ON DELETE CASCADE NOT NULL,
		slug varchar(255) NOT NULL,
		display_type varchar(32) NOT NULL,
		UNIQUE (product_id, slug)
	);

-- Option values like red, blue, small, large
CREATE TABLE
	product_option_value (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		option_id uuid REFERENCES product_option (id) ON DELETE CASCADE NOT NULL,
		swatch_id uuid REFERENCES product_option_swatch (id) ON DELETE SET NULL,
		-- Human-readable value
		slug varchar(255) NOT NULL,
		sort_index int NOT NULL,
		UNIQUE (option_id, slug)
	);

CREATE INDEX idx_product_option_product_id ON product_option (product_id);

CREATE INDEX idx_product_option_value_option_id ON product_option_value (option_id);

-- Option value links assigned to variants
CREATE TABLE
	product_option_variant_link (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		variant_id uuid NOT NULL REFERENCES variant (id) ON DELETE CASCADE,
		option_id uuid NOT NULL REFERENCES product_option (id) ON DELETE CASCADE,
		option_value_id uuid REFERENCES product_option_value (id) ON DELETE CASCADE,
		PRIMARY KEY (variant_id, option_id)
	);

CREATE INDEX idx_product_option_variant_link_project_id ON product_option_variant_link (project_id);
