CREATE TABLE
	listing_filters (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY ,
		-- reference to smart category
		category_id uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
		operator varchar(16) NOT NULL,
		-- For in/notIn/between operators: 0.1, 0.2, 0.3, etc.
		filter_sort_rank varchar(255) NOT NULL,
		filter_type varchar(32) NOT NULL,
		-- can be price, uuid, string, etc.
		filter_value varchar(255) NOT NULL
	);

CREATE INDEX idx_listing_filters_project_id ON listing_filters (project_id);

CREATE INDEX idx_listing_filters_category_id ON listing_filters (category_id);

CREATE INDEX idx_listing_filters_filter_type ON listing_filters (filter_type);

-- TODO: Add triggers to remove filters when target items are deleted
