CREATE TABLE
  orders_tags_links (
    -- Идентификатор проекта
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- Ссылка на заказ
    order_id uuid REFERENCES orders (id) ON DELETE CASCADE,
    -- Ссылка на тег
    tag_id uuid REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (order_id, tag_id)
  );

CREATE INDEX idx_orders_tags_links_order_id ON orders_tags_links (order_id);

CREATE INDEX idx_orders_tags_links_tag_id ON orders_tags_links (tag_id);

CREATE TABLE
  orders_labels_links (
    -- Идентификатор проекта
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- Ссылка на заказ
    order_id uuid REFERENCES orders (id) ON DELETE CASCADE,
    -- Ссылка на метку (label)
    label_id uuid REFERENCES labels (id) ON DELETE CASCADE,
    PRIMARY KEY (order_id, label_id)
  );

CREATE INDEX idx_orders_labels_links_order_id ON orders_labels_links (order_id);

CREATE INDEX idx_orders_labels_links_label_id ON orders_labels_links (label_id);
