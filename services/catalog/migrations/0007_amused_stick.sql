ALTER TABLE "catalog"."facet" ADD COLUMN "lexo_rank" varchar(64) NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_facet_rank" ON "catalog"."facet" USING btree ("project_id","lexo_rank");--> statement-breakpoint
ALTER TABLE "catalog"."facet" DROP COLUMN "sort_index";