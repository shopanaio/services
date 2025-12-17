-- WIP
CREATE TABLE
	bundles (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		-- type of the bundle
		type varchar(16) NOT NULL,
		status varchar(16) NOT NULL
	);

CREATE TABLE
	bundle_items (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
		bundle_id uuid NOT NULL REFERENCES bundles (id) ON DELETE CASCADE,
		product_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
		sort_index int NOT NULL DEFAULT 0
	);

ALTER TABLE bundle_items
ADD CONSTRAINT idx_bundle_items_sort_index UNIQUE (bundle_id, sort_index) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_bundle_items_product_id ON bundle_items (product_id);

CREATE INDEX idx_bundle_items_bundle_id ON bundle_items (bundle_id);

CREATE TABLE
	product_bundles_links (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		product_id uuid NOT NULL REFERENCES product_containers (id) ON DELETE CASCADE,
		bundle_id uuid NOT NULL REFERENCES bundles (id) ON DELETE CASCADE,
		sort_index int NOT NULL,
		PRIMARY KEY (product_id, bundle_id)
	);

ALTER TABLE product_bundles_links
ADD CONSTRAINT idx_product_bundles_links_sort_index UNIQUE (product_id, sort_index) DEFERRABLE INITIALLY DEFERRED;
