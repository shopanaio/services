CREATE TABLE
	menus (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
		slug varchar(255) NOT NULL,
		status varchar(16) NOT NULL,
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		deleted_at timestamptz
	);

CREATE UNIQUE INDEX idx_menus_slug ON menus (project_id, slug)
WHERE deleted_at IS NULL;

CREATE INDEX idx_menus_status ON menus (status);

CREATE INDEX idx_menus_deleted_at ON menus (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE
	links (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
		-- product, category, page, etc...
		entry_id uuid,
		type varchar(32),
		slug varchar(255),
		sort_index int NOT NULL DEFAULT 0,
		parent_id uuid REFERENCES links (id),
		menu_id uuid REFERENCES menus (id) ON DELETE CASCADE NOT NULL
	);

ALTER TABLE links
ADD CONSTRAINT idx_links_sort_index_unique UNIQUE (parent_id, sort_index) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_links_parent_id ON links (parent_id);

CREATE INDEX idx_links_entry_id ON links (entry_id);

CREATE INDEX idx_links_menu_id ON links (menu_id);

CREATE TABLE
	pages (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
		slug varchar(255) NOT NULL,
		cover_id uuid REFERENCES files (id),
		status varchar(16) NOT NULL,
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		deleted_at timestamptz
	);

CREATE UNIQUE INDEX idx_pages_slug ON pages (project_id, slug)
WHERE deleted_at IS NULL;

CREATE INDEX idx_pages_status ON pages (status);

CREATE INDEX idx_pages_cover_id ON pages (cover_id);

CREATE INDEX idx_pages_created_at ON pages (created_at);

CREATE INDEX idx_pages_updated_at ON pages (updated_at);

CREATE INDEX idx_pages_deleted_at ON pages (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE
	topics (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
		slug varchar(255) NOT NULL,
		cover_id uuid REFERENCES files (id),
		status varchar(16) NOT NULL,
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		deleted_at timestamptz
	);

CREATE UNIQUE INDEX idx_topics_slug ON topics (project_id, slug)
WHERE deleted_at IS NULL;

CREATE INDEX idx_topics_status ON topics (status);

CREATE INDEX idx_topics_cover_id ON topics (cover_id);

CREATE INDEX idx_topics_created_at ON topics (created_at);

CREATE INDEX idx_topics_updated_at ON topics (updated_at);

CREATE INDEX idx_topics_deleted_at ON topics (deleted_at) WHERE deleted_at IS NOT NULL;

-- articles
CREATE TABLE
	posts (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
		slug varchar(255) NOT NULL,
		cover_id uuid REFERENCES files (id),
		status varchar(16) NOT NULL,
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		deleted_at timestamptz
	);

CREATE UNIQUE INDEX idx_posts_slug ON posts (project_id, slug)
WHERE deleted_at IS NULL;

CREATE INDEX idx_posts_status ON posts (status);

CREATE INDEX idx_posts_cover_id ON posts (cover_id);

CREATE INDEX idx_posts_created_at ON posts (created_at);

CREATE INDEX idx_posts_updated_at ON posts (updated_at);

CREATE INDEX idx_posts_deleted_at ON posts (deleted_at) WHERE deleted_at IS NOT NULL;

-- relation between posts and topics
CREATE TABLE
	posts_topics_links (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		post_id uuid REFERENCES posts (id) ON DELETE CASCADE,
		topic_id uuid REFERENCES topics (id) ON DELETE CASCADE,
		PRIMARY KEY (post_id, topic_id)
	);

CREATE INDEX idx_posts_topics_links_topic_id ON posts_topics_links (topic_id);

CREATE INDEX idx_posts_topics_links_post_id ON posts_topics_links (post_id);

CREATE TABLE
	pages_tags_links (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		page_id uuid REFERENCES pages (id) ON DELETE CASCADE,
		tag_id uuid REFERENCES tags (id) ON DELETE CASCADE,
		PRIMARY KEY (page_id, tag_id)
	);

CREATE TABLE
	pages_labels_links (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		page_id uuid REFERENCES pages (id) ON DELETE CASCADE,
		label_id uuid REFERENCES labels (id) ON DELETE CASCADE,
		PRIMARY KEY (page_id, label_id)
	);

CREATE TABLE
	post_tags_links (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		post_id uuid REFERENCES posts (id) ON DELETE CASCADE,
		tag_id uuid REFERENCES tags (id) ON DELETE CASCADE,
		PRIMARY KEY (post_id, tag_id)
	);

CREATE TABLE
	post_labels_links (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		post_id uuid REFERENCES posts (id) ON DELETE CASCADE,
		label_id uuid REFERENCES labels (id) ON DELETE CASCADE,
		PRIMARY KEY (post_id, label_id)
	);
