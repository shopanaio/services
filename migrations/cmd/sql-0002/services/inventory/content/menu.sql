CREATE TABLE
	menus (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY,
		published_at timestamptz,
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		deleted_at timestamptz
	);

CREATE TABLE
	menu_item (
		id uuid PRIMARY KEY,
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		parent_id uuid REFERENCES menu_item (id),
		menu_id uuid REFERENCES menus (id) ON DELETE CASCADE NOT NULL,
		-- product, category, page, etc...
		entry_slug text REFERENCES record (slug) ON DELETE SET NULL,
		sort_index int NOT NULL DEFAULT 0
	);

CREATE INDEX idx_menus_deleted_at ON menus (deleted_at)
WHERE
	deleted_at IS NOT NULL;

ALTER TABLE menu_items
ADD CONSTRAINT idx_links_sort_index_unique UNIQUE (parent_id, sort_index) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_menu_items_parent_id ON menu_items (parent_id);

CREATE INDEX idx_menu_items_entry_id ON menu_items (entry_id);

CREATE INDEX idx_menu_items_menu_id ON menu_items (menu_id);
