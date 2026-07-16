-- Up Migration

CREATE VIEW "reviews"."content_list_view" AS
SELECT
  content.store_id,
  content.id,
  content.kind,
  content.title,
  content.body,
  content.locale,
  content.author_type,
  content.author_customer_id,
  content.author_display_name,
  content.source_channel,
  content.status,
  content.revision,
  content.created_at,
  content.updated_at,
  content.published_at,
  content.deleted_at,
  content.redacted_at,
  COALESCE(metrics.like_count, 0)::integer AS like_count,
  COALESCE(metrics.dislike_count, 0)::integer AS dislike_count,
  COALESCE(metrics.report_count, 0)::integer AS report_count,
  COALESCE(metrics.open_report_count, 0)::integer AS open_report_count,
  COALESCE(metrics.media_count, 0)::integer AS media_count,
  COALESCE(metrics.child_count, 0)::integer AS child_count,
  COALESCE(metrics.official_child_count, 0)::integer AS official_child_count,
  COALESCE(metrics.accepted_child_count, 0)::integer AS accepted_child_count
FROM "reviews"."content_item" content
LEFT JOIN "reviews"."content_metrics" metrics
  ON metrics.store_id = content.store_id
 AND metrics.content_id = content.id;

CREATE VIEW "reviews"."review_list_view" AS
SELECT
  content_list.*,
  review.product_id,
  review.variant_id,
  review.order_id,
  review.order_line_id,
  review.rating::integer AS rating,
  review.verification_status,
  review.is_incentivized
FROM "reviews"."content_list_view" content_list
INNER JOIN "reviews"."review" review
  ON review.store_id = content_list.store_id
 AND review.id = content_list.id;

CREATE VIEW "reviews"."review_reply_list_view" AS
SELECT
  content.store_id,
  content.id,
  content.body,
  content.locale,
  content.author_type,
  content.author_customer_id,
  content.status,
  content.revision,
  content.created_at,
  content.updated_at,
  content.deleted_at,
  reply.review_id,
  reply.is_official,
  reply.sort_index
FROM "reviews"."content_item" content
INNER JOIN "reviews"."review_reply" reply
  ON reply.store_id = content.store_id
 AND reply.id = content.id;

CREATE VIEW "reviews"."product_question_list_view" AS
SELECT
  content.store_id,
  content.id,
  question.product_id,
  question.variant_id,
  content.body,
  content.locale,
  content.author_type,
  content.author_customer_id,
  content.author_display_name,
  content.source_channel,
  content.status,
  CASE
    WHEN COALESCE(metrics.child_count, 0) > 0 THEN 'ANSWERED'
    ELSE 'UNANSWERED'
  END::varchar(16) AS answer_state,
  content.revision,
  content.created_at,
  content.updated_at,
  content.published_at,
  content.deleted_at,
  COALESCE(metrics.child_count, 0)::integer AS answer_count,
  COALESCE(metrics.official_child_count, 0)::integer AS official_answer_count,
  COALESCE(metrics.accepted_child_count, 0)::integer AS accepted_answer_count,
  COALESCE(metrics.report_count, 0)::integer AS report_count
FROM "reviews"."content_item" content
INNER JOIN "reviews"."product_question" question
  ON question.store_id = content.store_id
 AND question.id = content.id
LEFT JOIN "reviews"."content_metrics" metrics
  ON metrics.store_id = content.store_id
 AND metrics.content_id = content.id;

CREATE VIEW "reviews"."product_question_answer_list_view" AS
SELECT
  content.store_id,
  content.id,
  content.body,
  content.locale,
  content.author_type,
  content.author_customer_id,
  content.status,
  content.revision,
  content.created_at,
  content.updated_at,
  content.deleted_at,
  answer.question_id,
  answer.is_official,
  answer.is_accepted,
  answer.sort_index
FROM "reviews"."content_item" content
INNER JOIN "reviews"."question_answer" answer
  ON answer.store_id = content.store_id
 AND answer.id = content.id;
