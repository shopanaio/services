-- product_feature
CREATE TABLE IF NOT EXISTS platform.product_feature (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    product_id UUID NOT NULL,
    slug TEXT NOT NULL,
    sort_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, product_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_feature_product
ON platform.product_feature(project_id, product_id);

-- product_feature_value
CREATE TABLE IF NOT EXISTS platform.product_feature_value (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    feature_id UUID NOT NULL REFERENCES platform.product_feature(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    sort_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, feature_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_feature_value_feature
ON platform.product_feature_value(project_id, feature_id);

-- product_option_swatch
CREATE TABLE IF NOT EXISTS platform.product_option_swatch (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    color_one TEXT,
    color_two TEXT,
    image_id UUID,
    swatch_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- product_option
CREATE TABLE IF NOT EXISTS platform.product_option (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    product_id UUID NOT NULL,
    slug TEXT NOT NULL,
    sort_index INT NOT NULL DEFAULT 0,
    display_type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, product_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_option_product
ON platform.product_option(project_id, product_id);

-- product_option_value
CREATE TABLE IF NOT EXISTS platform.product_option_value (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    option_id UUID NOT NULL REFERENCES platform.product_option(id) ON DELETE CASCADE,
    swatch_id UUID REFERENCES platform.product_option_swatch(id) ON DELETE SET NULL,
    slug TEXT NOT NULL,
    sort_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, option_id, slug),
    UNIQUE (option_id, id)
);

CREATE INDEX IF NOT EXISTS idx_product_option_value_option
ON platform.product_option_value(project_id, option_id);

-- product_option_variant_link
CREATE TABLE IF NOT EXISTS platform.product_option_variant_link (
    project_id UUID NOT NULL,
    variant_id UUID NOT NULL REFERENCES platform.product_variants(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES platform.product_option(id) ON DELETE CASCADE,
    option_value_id UUID NOT NULL,
    PRIMARY KEY (project_id, variant_id, option_id),

    CONSTRAINT fk_link_option_value
        FOREIGN KEY (option_id, option_value_id)
        REFERENCES platform.product_option_value(option_id, id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_option_variant_link_variant
ON platform.product_option_variant_link(project_id, variant_id);

CREATE INDEX IF NOT EXISTS idx_product_option_variant_link_option
ON platform.product_option_variant_link(project_id, option_id);
