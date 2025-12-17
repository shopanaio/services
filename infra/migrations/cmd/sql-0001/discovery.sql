CREATE TABLE
	product_recommendations (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		-- The source product
		source_id uuid REFERENCES product_containers (id) ON DELETE CASCADE,
		-- Recommended product
		target_id uuid REFERENCES product_containers (id) ON DELETE CASCADE,
		PRIMARY KEY (source_id, target_id)
	);

CREATE TABLE
	complementary_products (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		-- The source product
		source_id uuid REFERENCES product_containers (id) ON DELETE CASCADE,
		-- Complementary product
		target_id uuid REFERENCES product_containers (id) ON DELETE CASCADE,
		PRIMARY KEY (source_id, target_id)
	);

CREATE INDEX idx_product_recommendations_source_id ON product_recommendations (source_id);
CREATE INDEX idx_product_recommendations_target_id ON product_recommendations (target_id);

CREATE INDEX idx_complementary_products_source_id ON complementary_products (source_id);
CREATE INDEX idx_complementary_products_target_id ON complementary_products (target_id);
