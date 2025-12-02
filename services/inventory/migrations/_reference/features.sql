CREATE TABLE
	product_feature (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		product_id uuid REFERENCES product (id) ON DELETE CASCADE NOT NULL,
		slug varchar(255) NOT NULL,
		UNIQUE (product_id, slug)
	);

CREATE INDEX idx_product_feature_product_id ON product_feature (product_id);

CREATE TABLE
	product_feature_value (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		feature_id uuid NOT NULL REFERENCES product_feature (id) ON DELETE CASCADE,
		slug varchar(255) NOT NULL,
		sort_index int NOT NULL,
		UNIQUE (feature_id, slug)
	);

CREATE INDEX idx_product_feature_value_feature_id ON product_feature_value (feature_id);
