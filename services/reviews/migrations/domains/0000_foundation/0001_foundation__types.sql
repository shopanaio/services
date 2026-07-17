-- Up Migration

CREATE TYPE "reviews"."locale_code" AS ENUM('ak', 'sq', 'am', 'ar', 'hy', 'as', 'az', 'bm', 'bn', 'eu', 'be', 'bs', 'br', 'bg', 'my', 'ca', 'ckb', 'ce', 'zh-CN', 'zh-TW', 'kw', 'hr', 'cs', 'da', 'nl', 'dz', 'en', 'eo', 'et', 'ee', 'fo', 'fil', 'fi', 'fr', 'ff', 'gl', 'lg', 'ka', 'de', 'el', 'gu', 'ha', 'he', 'hi', 'hu', 'is', 'ig', 'id', 'ia', 'ga', 'it', 'ja', 'jv', 'kl', 'kn', 'ks', 'kk', 'km', 'ki', 'rw', 'ko', 'ku', 'ky', 'lo', 'lv', 'ln', 'lt', 'lu', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'gv', 'mr', 'mn', 'mi', 'ne', 'nd', 'se', 'no', 'nb', 'nn', 'or', 'om', 'os', 'ps', 'fa', 'pl', 'pt-BR', 'pt-PT', 'pa', 'qu', 'ro', 'rm', 'rn', 'ru', 'sg', 'sa', 'sc', 'gd', 'sr', 'sn', 'ii', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'bo', 'ti', 'to', 'tr', 'tk', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'fy', 'wo', 'xh', 'yi', 'yo', 'zu');

CREATE TYPE "reviews"."content_kind" AS ENUM (
  'REVIEW',
  'REVIEW_REPLY',
  'PRODUCT_QUESTION',
  'QUESTION_ANSWER'
);

CREATE TYPE "reviews"."content_status" AS ENUM (
  'PENDING',
  'PUBLISHED',
  'REJECTED'
);

CREATE TYPE "reviews"."content_author_type" AS ENUM (
  'CUSTOMER',
  'GUEST',
  'SELLER',
  'STAFF',
  'SYSTEM',
  'EXTERNAL'
);

CREATE TYPE "reviews"."moderation_mode" AS ENUM (
  'PREMODERATION',
  'POSTMODERATION',
  'AUTOMATED'
);

CREATE TYPE "reviews"."review_duplicate_policy" AS ENUM (
  'ONE_PER_PRODUCT',
  'ONE_PER_ORDER_LINE',
  'ALLOW_MULTIPLE'
);

CREATE TYPE "reviews"."rating_criterion_target_type" AS ENUM (
  'PRODUCT',
  'CATEGORY'
);

CREATE TYPE "reviews"."translation_source" AS ENUM (
  'HUMAN',
  'MACHINE',
  'IMPORT'
);

CREATE TYPE "reviews"."publication_status" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'UNPUBLISHED',
  'FAILED'
);

CREATE TYPE "reviews"."review_verification_status" AS ENUM (
  'UNVERIFIED',
  'VERIFIED',
  'REVOKED'
);

CREATE TYPE "reviews"."notification_channel" AS ENUM (
  'EMAIL',
  'SMS',
  'PUSH',
  'IN_APP'
);

CREATE TYPE "reviews"."review_request_status" AS ENUM (
  'SCHEDULED',
  'SENT',
  'DELIVERED',
  'OPENED',
  'SUBMITTED',
  'EXPIRED',
  'CANCELLED',
  'FAILED'
);

CREATE TYPE "reviews"."review_request_event_type" AS ENUM (
  'SCHEDULED',
  'SENT',
  'DELIVERED',
  'OPENED',
  'CLICKED',
  'SUBMITTED',
  'BOUNCED',
  'COMPLAINED',
  'FAILED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TYPE "reviews"."subscription_status" AS ENUM (
  'ACTIVE',
  'PAUSED',
  'UNSUBSCRIBED'
);

CREATE TYPE "reviews"."content_vote_type" AS ENUM (
  'LIKE',
  'DISLIKE'
);

CREATE TYPE "reviews"."report_reason" AS ENUM (
  'SPAM',
  'OFFENSIVE',
  'HARASSMENT',
  'HATE_SPEECH',
  'FRAUD_OR_SCAM',
  'PERSONAL_INFORMATION',
  'ILLEGAL_CONTENT',
  'INTELLECTUAL_PROPERTY',
  'CONFLICT_OF_INTEREST',
  'NOT_RELEVANT',
  'OTHER'
);

CREATE TYPE "reviews"."report_status" AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'ACTIONED',
  'DISMISSED'
);

CREATE TYPE "reviews"."moderation_case_status" AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'RESOLVED',
  'CANCELLED'
);

CREATE TYPE "reviews"."moderation_action" AS ENUM (
  'SUBMITTED',
  'AUTO_FLAGGED',
  'ASSIGNED',
  'PUBLISHED',
  'REJECTED',
  'RESTORED',
  'EDITED',
  'REDACTED',
  'DELETED'
);

CREATE TYPE "reviews"."moderation_verdict" AS ENUM (
  'PASS',
  'REVIEW',
  'BLOCK'
);

CREATE TYPE "reviews"."external_sync_direction" AS ENUM (
  'IMPORT',
  'EXPORT',
  'BIDIRECTIONAL'
);

CREATE TYPE "reviews"."external_sync_status" AS ENUM (
  'PENDING',
  'SYNCED',
  'FAILED',
  'DISABLED'
);
