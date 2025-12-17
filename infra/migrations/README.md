## RLS

1. Migrate policy.sql
2. Create a user with NOBYPASSRLS

```sql
-- create role with password, can login
CREATE USER postgres_user WITH LOGIN PASSWORD 'postgres';

-- allow platform schema
GRANT USAGE ON SCHEMA platform TO postgres_user;

-- allow operations on platform
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA platform TO postgres_user;

-- allow feature tables
ALTER DEFAULT PRIVILEGES IN SCHEMA platform
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO postgres_user;
```
