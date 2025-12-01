CREATE TABLE
  order_boards (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    title varchar(255) NOT NULL DEFAULT '',
    slug varchar(255) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE TABLE
  order_board_columns (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    order_board_id uuid REFERENCES order_boards (id) ON DELETE CASCADE NOT NULL,
    title varchar(255) NOT NULL DEFAULT '',
    slug varchar(255) NOT NULL,
    sort_index int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE INDEX idx_order_board_columns_order_board_id ON order_board_columns (order_board_id);

CREATE UNIQUE INDEX idx_order_board_columns_slug ON order_board_columns (project_id, slug) WHERE deleted_at IS NULL;

CREATE TABLE
  order_board_columns_orders_links (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    order_id uuid REFERENCES orders (id) ON DELETE CASCADE,
    order_board_column_id uuid REFERENCES order_board_columns (id) ON DELETE CASCADE,
    sort_rank varchar(64) NOT NULL COLLATE "C",
    PRIMARY KEY (order_id, order_board_column_id)
  );
-- Soft delete helper indexes
CREATE INDEX idx_order_boards_deleted_at ON order_boards (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_order_board_columns_deleted_at ON order_board_columns (deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE order_board_columns_orders_links
ADD CONSTRAINT order_board_columns_orders_links_sort_rank_unique UNIQUE (order_board_column_id, sort_rank) DEFERRABLE INITIALLY DEFERRED;
