import { sql } from "drizzle-orm";
import {
  check,
  index,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { storeSchema } from "./schema.js";

/** Store-owned brand presentation settings. Media IDs belong to Media service. */
export const storeBrand = storeSchema.table(
  "store_brand",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    defaultLogoMediaId: uuid("default_logo_media_id"),
    squareLogoMediaId: uuid("square_logo_media_id"),
    coverImageMediaId: uuid("cover_image_media_id"),
    primaryColor: varchar("primary_color", { length: 7 })
      .notNull()
      .default("#1677FF"),
    secondaryColor: varchar("secondary_color", { length: 7 })
      .notNull()
      .default("#101112"),
    slogan: varchar("slogan", { length: 255 }),
    shortDescription: varchar("short_description", { length: 500 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("store_brand_store_unique").on(table.storeId),
    check(
      "store_brand_primary_color_check",
      sql`${table.primaryColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    check(
      "store_brand_secondary_color_check",
      sql`${table.secondaryColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    check(
      "store_brand_slogan_not_blank_check",
      sql`${table.slogan} IS NULL OR btrim(${table.slogan}) <> ''`,
    ),
    check(
      "store_brand_short_description_not_blank_check",
      sql`${table.shortDescription} IS NULL OR btrim(${table.shortDescription}) <> ''`,
    ),
  ],
);

/** Ordered social profiles associated with a store brand. */
export const storeBrandSocialLink = storeSchema.table(
  "store_brand_social_link",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => storeBrand.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 32 }).notNull(),
    url: text("url").notNull(),
    position: smallint("position").notNull().default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("store_brand_social_link_platform_unique").on(
      table.brandId,
      table.platform,
    ),
    index("store_brand_social_link_store_position_idx").on(
      table.storeId,
      table.position,
      table.id,
    ),
    check(
      "store_brand_social_link_platform_format_check",
      sql`${table.platform} ~ '^[a-z][a-z0-9_-]{0,31}$'`,
    ),
    check(
      "store_brand_social_link_url_check",
      sql`${table.url} ~* '^https?://[^[:space:]]+$'`,
    ),
    check(
      "store_brand_social_link_position_check",
      sql`${table.position} >= 0`,
    ),
  ],
);

export type StoreBrand = typeof storeBrand.$inferSelect;
export type NewStoreBrand = typeof storeBrand.$inferInsert;
export type StoreBrandSocialLink = typeof storeBrandSocialLink.$inferSelect;
export type NewStoreBrandSocialLink =
  typeof storeBrandSocialLink.$inferInsert;

  Два прошлых замечания исправлены: saga-шаги теперь critical, а compensation больше не поглощает ошибки. Остались четыре прежних проблемы и появилась одна новая.

  ::code-comment{title="[P1] Compensation может затереть конкурентное обновление" body="Все restore-методы безусловно восстанавливают начальный snapshot. Два workflow одного store могут выполняться параллельно: если B успешно сохранит новое значение, а A затем упадёт, compensation A перезапишет результат B старым snapshot. Нужна сериализация по storeId либо optimistic version/CAS, проверяющий, что восстанавливается именно значение, записанное этим workflow." file="/Users/phl/Projects/shopana-io/services/services/project/src/repositories/storeSettings/StoreSettingsRepository.ts" start=298 end=307 priority=1}

  ::code-comment{title="[P1] Владелец media всё ещё не проверяется" body="В media.fileLink по-прежнему передаются только fileId и целевой entityRef. Media-сервис принимает любой активный файл независимо от его assetGroup owner, поэтому к бренду можно привязать файл другого магазина. Перед link нужно подтвердить принадлежность файла целевому store или разрешённой organization." file="/Users/phl/Projects/shopana-io/services/services/project/src/sagas/StoreUpdateSaga.ts" start=546 end=553 priority=1}

  ::code-comment{title="[P2] Инфраструктурный сбой превращается в NOT_FOUND" body="При result.success=false media-скрипт обычно возвращает fileExists=false, после чего код формирует MEDIA_FILE_NOT_FOUND и выбрасывает FatalError. Временная ошибка media поэтому не повторяется и выглядит как ошибка пользовательского ID. Обработайте !result.success отдельно как MEDIA_LINK_FAILED/RetryableError, а затем проверяйте exists и active." file="/Users/phl/Projects/shopana-io/services/services/project/src/sagas/StoreUpdateSaga.ts" start=554 end=565 priority=2}

  ::code-comment{title="[P2] Apollo cache остаётся устаревшим" body="StoreFields всё ещё не запрашивает contactDetails, address, brand, orderProcessing, defaults и currencySettings, а hook не выполняет refetchQueries/cache.modify. После mutation вложенные настройки в Apollo cache останутся прежними. Добавьте необходимые секции в ответ либо явно обновляйте cache." file="/Users/phl/Projects/shopana-io/services/admin/src/domains/workspace/graphql/mutations.ts" start=441 end=443 priority=2}

  ::code-comment{title="[P2] clientMutationId всё ещё не ключ идемпотентности" body="Content hash включает clientMutationId вместе с operations и userId. Одинаковый clientMutationId с изменённым payload создаст другой workflow и повторно применит mutation. Workflow ID должен выводиться из клиентского ключа, а повтор ключа с другим payload должен отклоняться." file="/Users/phl/Projects/shopana-io/services/services/project/src/resolvers/admin/StoreMutationResolver.ts" start=456 end=469 priority=2}

  Рабочее дерево чистое, `git diff --check` прошёл. Тесты, `tsc` и build не запускал по правилам проекта.
