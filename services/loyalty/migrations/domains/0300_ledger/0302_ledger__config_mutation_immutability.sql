CREATE TRIGGER "loyalty_config_mutation_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."config_mutation"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();
