CREATE TABLE "catalog"."facet_source_handle" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"facet_id" uuid NOT NULL,
	"facet_type" varchar(32) NOT NULL,
	"source_handle" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facet_source_handle_project_facet_source_uniq" UNIQUE("project_id","facet_id","source_handle"),
	CONSTRAINT "facet_source_handle_project_type_source_uniq" UNIQUE("project_id","facet_type","source_handle")
);
--> statement-breakpoint
ALTER TABLE "catalog"."facet_source_handle" ADD CONSTRAINT "facet_source_handle_facet_id_facet_id_fk" FOREIGN KEY ("facet_id") REFERENCES "catalog"."facet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_facet_source_handle_project_facet" ON "catalog"."facet_source_handle" USING btree ("project_id","facet_id");--> statement-breakpoint
CREATE INDEX "idx_facet_source_handle_project_type_source" ON "catalog"."facet_source_handle" USING btree ("project_id","facet_type","source_handle");--> statement-breakpoint
INSERT INTO "catalog"."facet_source_handle" (
	"id",
	"project_id",
	"facet_id",
	"facet_type",
	"source_handle",
	"created_at"
)
SELECT
	gen_random_uuid(),
	source."project_id",
	source."facet_id",
	source."facet_type",
	split_part(source."source_handle", ':', 1),
	now()
FROM (
	SELECT DISTINCT
		"project_id",
		"facet_id",
		"facet_type",
		"source_handle"
	FROM "catalog"."facet_value_source_handle"
	WHERE "facet_type" IN ('feature', 'option')
) source
ON CONFLICT ("project_id", "facet_type", "source_handle") DO NOTHING;
