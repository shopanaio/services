-- Initialize database for local development

-- Create portal schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS portal;

-- Grant permissions
GRANT ALL ON SCHEMA portal TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA portal TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA portal TO postgres;

-- Set default search path
ALTER DATABASE portal SET search_path TO portal, public;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'Database initialized successfully';
END $$;
