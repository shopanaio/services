ALTER TABLE "catalog"."product_translation" RENAME COLUMN "excerpt" TO "excerpt_text";--> statement-breakpoint
ALTER TABLE "catalog"."category_translation" ADD COLUMN "excerpt_text" text;--> statement-breakpoint
ALTER TABLE "catalog"."category_translation" ADD COLUMN "excerpt_html" text;--> statement-breakpoint
ALTER TABLE "catalog"."category_translation" ADD COLUMN "excerpt_json" text;--> statement-breakpoint
ALTER TABLE "catalog"."product_translation" ADD COLUMN "excerpt_html" text;--> statement-breakpoint
ALTER TABLE "catalog"."product_translation" ADD COLUMN "excerpt_json" jsonb;--> statement-breakpoint
ALTER TABLE "catalog"."collection_translation" ADD COLUMN "excerpt_text" text;--> statement-breakpoint
ALTER TABLE "catalog"."collection_translation" ADD COLUMN "excerpt_html" text;--> statement-breakpoint
ALTER TABLE "catalog"."collection_translation" ADD COLUMN "excerpt_json" text;