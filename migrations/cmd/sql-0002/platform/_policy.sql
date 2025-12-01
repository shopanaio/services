DO $$
DECLARE
  tbl RECORD;
  action TEXT;
  cur_schema TEXT := current_schema();
BEGIN
  FOR tbl IN
    SELECT table_schema, table_name
      FROM information_schema.columns
     WHERE column_name = 'project_id'
       AND table_schema = cur_schema
     GROUP BY table_schema, table_name
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', tbl.table_schema, tbl.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', tbl.table_schema, tbl.table_name);

    -- Create index
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_project_id ON %I.%I(project_id);',
      tbl.table_name,
      tbl.table_schema, tbl.table_name
    );

    -- Create policies including SELECT
    -- SELECT
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I.%I;', tbl.table_name, tbl.table_schema, tbl.table_name);
    EXECUTE format(
      'CREATE POLICY %I_select ON %I.%I FOR SELECT USING (project_id = current_setting(''app.current_project'')::uuid);',
      tbl.table_name,
      tbl.table_schema,
      tbl.table_name
    );

    -- INSERT/UPDATE/DELETE
    FOREACH action IN ARRAY ARRAY['INSERT','UPDATE','DELETE']::text[] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I_%s ON %I.%I;', tbl.table_name, lower(action), tbl.table_schema, tbl.table_name);
      EXECUTE format(
        'CREATE POLICY %I_%s ON %I.%I FOR %s %s;',
        tbl.table_name,
        lower(action),
        tbl.table_schema,
        tbl.table_name,
        action,
        CASE
          WHEN action = 'INSERT' THEN
            'WITH CHECK (project_id = current_setting(''app.current_project'')::uuid)'
          ELSE
            'USING (project_id = current_setting(''app.current_project'')::uuid)'
        END
      );
    END LOOP;
  END LOOP;
END
$$;
