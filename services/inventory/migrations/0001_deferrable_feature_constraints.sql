ALTER TABLE "inventory"."product_feature" DROP CONSTRAINT "product_feature_parent_id_product_feature_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" DROP CONSTRAINT "product_feature_value_feature_id_product_feature_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" DROP CONSTRAINT "product_feature_product_id_index_uniq";
--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" ADD CONSTRAINT "product_feature_parent_id_product_feature_id_fk" FOREIGN KEY ("parent_id") REFERENCES "inventory"."product_feature"("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" DROP CONSTRAINT "product_feature_value_feature_id_index_uniq";
--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" ADD CONSTRAINT "product_feature_value_feature_id_product_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "inventory"."product_feature"("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" ADD CONSTRAINT "product_feature_product_id_index_uniq" UNIQUE ("product_id", "index") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" ADD CONSTRAINT "product_feature_value_feature_id_index_uniq" UNIQUE ("feature_id", "index") DEFERRABLE INITIALLY DEFERRED;
