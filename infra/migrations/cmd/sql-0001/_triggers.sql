CREATE
OR REPLACE FUNCTION update_timestamp () RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    rec RECORD;
    trigger_name TEXT;
    cur_schema TEXT := current_schema();
BEGIN
    -- Перебираем все таблицы в текущей схеме
    FOR rec IN
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema = cur_schema
          AND table_type = 'BASE TABLE'
    LOOP
        trigger_name := 'trg_update_timestamp_' || rec.table_name;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = rec.table_schema
              AND table_name = rec.table_name
              AND column_name = 'updated_at'
        ) THEN
            -- Проверяем, существует ли уже триггер с таким именем
            IF NOT EXISTS (
                SELECT 1 FROM pg_trigger
                WHERE tgname = trigger_name
            ) THEN
                RAISE NOTICE 'Creating trigger for table %.%', rec.table_schema, rec.table_name;
                EXECUTE format(
                    'CREATE TRIGGER %I BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION update_timestamp();',
                    trigger_name, rec.table_schema, rec.table_name
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;
