package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	_ "embed"

	"github.com/doug-martin/goqu/v9"
	"github.com/pressly/goose/v3"
	"github.com/repeale/fp-go"
)

//go:embed sql-0001/_init.sql
var platform string

//go:embed sql-0001/_rollback.sql
var rollback string

//go:embed sql-0001/customers.sql
var customers string

//go:embed sql-0001/groups.sql
var groups string

//go:embed sql-0001/translations.sql
var translations string

//go:embed sql-0001/discovery.sql
var discovery string

//go:embed sql-0001/reviews.sql
var reviews string

//go:embed sql-0001/_triggers.sql
var triggers string

//go:embed sql-0001/settings.sql
var settings string

//go:embed sql-0001/files.sql
var files string

//go:embed sql-0001/fileLinks.sql
var fileLinks string

//go:embed sql-0001/products.sql
var products string

//go:embed sql-0001/categories.sql
var categories string

//go:embed sql-0001/snapshot/products.sql
var productSnapshots string

//go:embed sql-0001/services.sql
var services string

//go:embed sql-0001/apps.sql
var apps string

//go:embed sql-0001/addresses.sql
var addresses string

//go:embed sql-0001/emails.sql
var emails string

//go:embed sql-0001/orders-crm.sql
var orderBoards string

//go:embed sql-0001/listingFilters.sql
var listingFilters string

//go:embed sql-0001/security.sql
var security string

//go:embed sql-0001/search/search_lang_config.sql
var searchLangConfig string

//go:embed sql-0001/search/search_v1.sql
var searchV1 string

//go:embed sql-0001/search/searchKeyword.sql
var searchKeyword string

//go:embed sql-0001/search/suggestions.sql
var suggestions string

//go:embed sql-0001/search/search_synonyms.sql
var searchSynonyms string

//go:embed sql-0001/search/search_levenshtein.sql
var searchLevenshtein string

//go:embed sql-0001/search/search_stopwords.sql
var searchStopwords string

//go:embed sql-0001/search/search_metrics.sql
var searchMetrics string

//go:embed sql-0001/search/search_all.sql
var searchAll string

//go:embed sql-0001/featureFlags.sql
var featureFlags string

//go:embed sql-0001/content.sql
var content string

//go:embed sql-0001/tagsAndLabels.sql
var tagsAndLabels string

//go:embed sql-0001/features.sql
var features string

//go:embed sql-0001/catalog_filters.sql
var catalogFilters string

//go:embed sql-0001/app_slots/slots.sql
var slots string

//go:embed sql-0001/checkout_v2/checkout.sql
var checkoutV2 string

//go:embed sql-0001/checkout_v2/idempotency.sql
var checkoutV2Idempotency string

//go:embed sql-0001/checkout_v2/orders.sql
var checkoutV2Orders string

//go:embed sql-0001/checkout_v2/orders_pii.sql
var checkoutV2OrdersPii string

func init() {
	goose.AddMigrationContext(Up0001, Down0001)
}

func Up0001(ctx context.Context, tx *sql.Tx) error {
	log.Println("Starting migration")

	if _, err := tx.Exec(`CREATE SCHEMA IF NOT EXISTS platform;`); err != nil {
		fmt.Println("Error creating schema platform")
		return err
	}

	if _, err := tx.Exec(`CREATE SCHEMA fn;`); err != nil {
		fmt.Println("Error creating schema fn")
		return err
	}

	// Setting search path (this will make all tables created in this transaction to be created in the new schema)
	if _, err := tx.Exec(`SET search_path TO platform;`); err != nil {
		fmt.Println("Error setting search path")
		return err
	}

	keys := []string{
		"platform",
		"settings",
		"tagsAndLabels",
		"addresses",
		"customers",
		"files",
		"categories",
		"products",
		"features",
		"catalogFilters",
		"listingFilters",
		"content",
		"groups",
		"services",
		"apps",

		// checkout core (порядок важен) — исключаем/удалены отсутствующие
		"slots",
		"productSnapshots",

		// прочее
		"emails",
		"fileLinks",
		"translations",
		"search",
		"discovery",
		"reviews",
		"security",
		"featureFlags",
		"triggers",
		"searchLangConfig",
		"searchKeyword",
		"searchV1",
		"suggestions",
		"searchSynonyms",
		"searchLevenshtein",
		"searchStopwords",
		"searchMetrics",
		"searchAll",

		// checkout v2 (новый агрегат)
		"checkoutV2",
		"checkoutV2Idempotency",
		"checkoutV2OrdersPii",
		"checkoutV2Orders",
		"orderBoards",
	}

	migrations := map[string]string{
		"platform":          platform,
		"settings":          settings,
		"customers":         customers,
		"files":             files,
		"products":          products,
		"categories":        categories,
		"catalogFilters":    catalogFilters,
		"listingFilters":    listingFilters,
		"content":           content,
		"groups":            groups,
		"services":          services,
		"apps":              apps,
		"productSnapshots":  productSnapshots,
		"addresses":         addresses,
		"emails":            emails,
		"orderBoards":       orderBoards,
		"fileLinks":         fileLinks,
		"translations":      translations,
		"discovery":         discovery,
		"reviews":           reviews,
		"security":          security,
		"triggers":          triggers,
		"searchLangConfig":  searchLangConfig,
		"searchV1":          searchV1,
		"searchKeyword":     searchKeyword,
		"suggestions":       suggestions,
		"searchSynonyms":    searchSynonyms,
		"searchLevenshtein": searchLevenshtein,
		"searchStopwords":   searchStopwords,
		"searchMetrics":     searchMetrics,
		"searchAll":         searchAll,
		"featureFlags":      featureFlags,
		"tagsAndLabels":     tagsAndLabels,
		"features":          features,
		"slots":             slots,

		// checkout v2
		"checkoutV2":            checkoutV2,
		"checkoutV2Idempotency": checkoutV2Idempotency,
		"checkoutV2Orders":      checkoutV2Orders,
		"checkoutV2OrdersPii":   checkoutV2OrdersPii,
	}

	for _, key := range keys {
		if _, err := tx.Exec(migrations[key]); err != nil {
			log.Printf("scheme migration failed: %s", key)
			return err
		}
	}

	if err := insertInitialData(ctx, tx); err != nil {
		log.Printf("Error inserting initial data: %s", err)
		return err
	}

	if _, err := tx.Exec(`SET search_path TO public;`); err != nil {
		fmt.Println("Error restoring search path")
		return err
	}

	log.Println("Migration finished")
	return nil
}

func Down0001(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, rollback)
	return err
}

func insertInitialData(ctx context.Context, tx *sql.Tx) error {
	localeRecords := fp.Map(func(l LocaleCode) goqu.Record {
		return goqu.Record{
			"code":      l,
			"is_active": true,
		}
	})(AllLocaleCode)

	currencyRecords := fp.Map(func(c CurrencyCode) goqu.Record {
		return goqu.Record{
			"code":      c,
			"is_active": true,
		}
	})(AllCurrencyCode)

	insertLocaleCodes, args, _ := goqu.Dialect("postgres").
		Insert("locale_codes").
		Rows(localeRecords).
		ToSQL()

	insertCurrencyCodes, args, _ := goqu.Dialect("postgres").
		Insert("currency_codes").
		Rows(currencyRecords).
		ToSQL()
	if _, err := tx.ExecContext(ctx, insertLocaleCodes, args...); err != nil {
		log.Printf("Error inserting locale codes: %s", err)
		return err
	}

	if _, err := tx.ExecContext(ctx, insertCurrencyCodes, args...); err != nil {
		log.Printf("Error inserting currency codes: %s", err)
		return err
	}

	return nil
}
