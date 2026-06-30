CREATE TABLE "catalog"."facet_source" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"facet_id" uuid NOT NULL,
	"facet_type" varchar(32) NOT NULL,
	"handle" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facet_source_project_facet_handle_uniq" UNIQUE("project_id","facet_id","handle"),
	CONSTRAINT "facet_source_project_type_handle_uniq" UNIQUE("project_id","facet_type","handle")
);
--> statement-breakpoint
CREATE TABLE "catalog"."facet_source_translation" (
	"facet_source_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "facet_source_translation_facet_source_id_locale_pk" PRIMARY KEY("facet_source_id","locale")
);
--> statement-breakpoint
ALTER TABLE "catalog"."facet_source" ADD CONSTRAINT "facet_source_facet_id_facet_id_fk" FOREIGN KEY ("facet_id") REFERENCES "catalog"."facet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."facet_source_translation" ADD CONSTRAINT "facet_source_translation_facet_source_id_facet_source_id_fk" FOREIGN KEY ("facet_source_id") REFERENCES "catalog"."facet_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_facet_source_project_facet" ON "catalog"."facet_source" USING btree ("project_id","facet_id");--> statement-breakpoint
CREATE INDEX "idx_facet_source_project_type_handle" ON "catalog"."facet_source" USING btree ("project_id","facet_type","handle");--> statement-breakpoint
CREATE INDEX "idx_facet_source_translation_project_locale" ON "catalog"."facet_source_translation" USING btree ("project_id","locale");--> statement-breakpoint
INSERT INTO "catalog"."facet_source" (
	"id",
	"project_id",
	"facet_id",
	"facet_type",
	"handle",
	"created_at"
)
SELECT
	gen_random_uuid(),
	source."project_id",
	source."facet_id",
	source."facet_type",
	source."handle",
	now()
FROM (
	SELECT DISTINCT
		"project_id",
		"facet_id",
		"facet_type",
		split_part("source_handle", ':', 1) AS "handle"
	FROM "catalog"."facet_value_source_handle"
	WHERE "facet_type" IN ('feature', 'option')
) source
ON CONFLICT ("project_id", "facet_type", "handle") DO NOTHING;--> statement-breakpoint
WITH source_names AS (
	SELECT
		source."id" AS "facet_source_id",
		option_translation."locale",
		source."project_id",
		option_translation."name"
	FROM "catalog"."facet_source" source
	INNER JOIN "catalog"."product_option" option
		ON option."project_id" = source."project_id"
		AND option."slug" = source."handle"
	INNER JOIN "catalog"."product_option_translation" option_translation
		ON option_translation."project_id" = source."project_id"
		AND option_translation."option_id" = option."id"
	WHERE source."facet_type" = 'option'
	UNION ALL
	SELECT
		source."id" AS "facet_source_id",
		feature_translation."locale",
		source."project_id",
		feature_translation."name"
	FROM "catalog"."facet_source" source
	INNER JOIN "catalog"."product_feature" feature
		ON feature."project_id" = source."project_id"
		AND feature."slug" = source."handle"
	INNER JOIN "catalog"."product_feature_translation" feature_translation
		ON feature_translation."project_id" = source."project_id"
		AND feature_translation."feature_id" = feature."id"
	WHERE source."facet_type" = 'feature'
),
deduped_source_names AS (
	SELECT DISTINCT ON ("facet_source_id", "locale")
		"facet_source_id",
		"locale",
		"project_id",
		"name"
	FROM source_names
	ORDER BY "facet_source_id", "locale", "name"
)
INSERT INTO "catalog"."facet_source_translation" (
	"facet_source_id",
	"locale",
	"project_id",
	"name"
)
SELECT
	"facet_source_id",
	"locale",
	"project_id",
	"name"
FROM deduped_source_names
ON CONFLICT ("facet_source_id", "locale") DO NOTHING;--> statement-breakpoint
INSERT INTO "catalog"."facet_source_translation" (
	"facet_source_id",
	"locale",
	"project_id",
	"name"
)
SELECT
	source."id",
	COALESCE(
		(
			SELECT facet_translation."locale"
			FROM "catalog"."facet_translation" facet_translation
			WHERE facet_translation."project_id" = source."project_id"
			LIMIT 1
		),
		'en'
	),
	source."project_id",
	source."handle"
FROM "catalog"."facet_source" source
WHERE source."facet_type" IN ('feature', 'option')
	AND NOT EXISTS (
		SELECT 1
		FROM "catalog"."facet_source_translation" translation
		WHERE translation."facet_source_id" = source."id"
	)
ON CONFLICT ("facet_source_id", "locale") DO NOTHING;
