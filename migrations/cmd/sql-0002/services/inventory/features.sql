CREATE TABLE
	product_feature (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		product_id uuid REFERENCES product (id) ON DELETE CASCADE NOT NULL,
		slug varchar(255) NOT NULL,
		UNIQUE (project_id, product_id, slug)
	);

CREATE TABLE
	product_feature_value (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		feature_id uuid NOT NULL REFERENCES product_feature (id) ON DELETE CASCADE,
		slug varchar(255) NOT NULL,
		sort_index int NOT NULL
	);
