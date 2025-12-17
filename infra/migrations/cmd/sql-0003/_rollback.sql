-- Drop tables in reverse order (to respect foreign key constraints)

DROP TABLE IF EXISTS platform.product_option_variant_link CASCADE;
DROP TABLE IF EXISTS platform.product_option_value CASCADE;
DROP TABLE IF EXISTS platform.product_option CASCADE;
DROP TABLE IF EXISTS platform.product_option_swatch CASCADE;
DROP TABLE IF EXISTS platform.product_feature_value CASCADE;
DROP TABLE IF EXISTS platform.product_feature CASCADE;
