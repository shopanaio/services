CREATE TABLE
	topics (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY ,
		slug varchar(255) NOT NULL,
		cover_id uuid REFERENCES files (id),
		status varchar(16) NOT NULL,
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		deleted_at timestamptz
	);

CREATE UNIQUE INDEX idx_topics_slug ON topics (project_id, slug)
WHERE
	deleted_at IS NULL;

CREATE INDEX idx_topics_status ON topics (status);

CREATE INDEX idx_topics_cover_id ON topics (cover_id);

CREATE INDEX idx_topics_created_at ON topics (created_at);

CREATE INDEX idx_topics_updated_at ON topics (updated_at);

CREATE INDEX idx_topics_deleted_at ON topics (deleted_at)
WHERE
	deleted_at IS NOT NULL;


-- articles
CREATE TABLE
  posts (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY,
    slug varchar(255) NOT NULL,
    cover_id uuid REFERENCES files (id),
    status varchar(16) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE UNIQUE INDEX idx_posts_slug ON posts (project_id, slug)
WHERE
  deleted_at IS NULL;

CREATE INDEX idx_posts_status ON posts (status);

CREATE INDEX idx_posts_cover_id ON posts (cover_id);

CREATE INDEX idx_posts_created_at ON posts (created_at);

CREATE INDEX idx_posts_updated_at ON posts (updated_at);

CREATE INDEX idx_posts_deleted_at ON posts (deleted_at)
WHERE
  deleted_at IS NOT NULL;

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
