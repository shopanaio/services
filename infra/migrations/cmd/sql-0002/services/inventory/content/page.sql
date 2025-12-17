CREATE TABLE
	pages (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY,
		published_at timestamptz,
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		deleted_at timestamptz
	);

CREATE INDEX idx_pages_created_at ON pages (created_at);

CREATE INDEX idx_pages_updated_at ON pages (updated_at);

CREATE INDEX idx_pages_deleted_at ON pages (deleted_at)
WHERE
	deleted_at IS NOT NULL;
