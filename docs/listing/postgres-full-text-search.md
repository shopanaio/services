# Руководство разработчика Go по работе с расширенным поиском v2

> Документ объясняет, как:
> • применить полную миграцию поисковой системы;
> • использовать расширенные функции поиска (синонимы, опечатки, стоп-слова);
> • вызвать функции из Go-кода через пакет `sqlx`;
> • мониторить производительность и качество поиска.

---

## 1. Подготовка среды (PostgreSQL + переменные окружения)

1. Убедитесь, что в кластере PostgreSQL созданы нужные расширения (один раз
   на instance):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE EXTENSION IF NOT EXISTS unaccent;
   ```
2. Экспортируйте переменные окружения для подключения (или заполните `config.yaml` вашего сервиса):
   ```bash
   DB_HOST=localhost
   DB_NAME=portal
   DB_USER=portal
   DB_PASSWORD=secret
   ```

---

## 2. Применение миграции

Применение полной миграции:

```bash
# Применить все файлы миграции в правильном порядке
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/cmd/sql-0001/search/search_all.sql

# ИЛИ применить файлы по отдельности в указанном порядке:
# 1. search_lang_config.sql
# 2. search_v1.sql
# 3. searchKeyword.sql
# 4. suggestions.sql
# 5. search_synonyms.sql
# 6. search_levenshtein.sql
# 7. search_stopwords.sql
# 8. search_metrics.sql
```

После применения убедитесь, что созданы:

**Таблицы:**
* `translations_index` с колонкой `search_vector`
* `search_keywords`, `search_keyword_groups`
* `search_synonyms`, `project_stop_words`
* `search_language_configs`, `search_queries_log`

**Функции:**
* `advanced_search` - главная функция поиска с расширенными опциями
* `fuzzy_search_records`, `fuzzy_suggestions_records` - базовый поиск
* `fuzzy_search_with_typos` - поиск с опечатками
* `get_term_synonyms`, `expand_query_with_synonyms` - работа с синонимами
* `remove_stop_words` - фильтрация стоп-слов
* `analyze_search_quality` - анализ качества поиска

3. Для уже существующих записей единожды запустите back-fill, чтобы колонка
   `search_vector` наполнилась:
   ```sql
   UPDATE translations_index SET field_value = field_value WHERE TRUE;
   ```
   IDE покажет время выполнения – ориентир < 1 мин на 1 М записей.

---

## 3. Использование в Go-коде (sqlx)

Ниже приведены примеры вызова поиска с помощью популярной обёртки
[`jmoiron/sqlx`](https://github.com/jmoiron/sqlx).

### 3.1 Расширенный поиск с опциями

```go
type SearchRecord struct {
    SourceType     string          `db:"source_type"`
    SourceID       uuid.UUID       `db:"source_id"`
    RelevanceScore float64         `db:"relevance_score"`
    MatchedField   string          `db:"matched_field"`
    MatchedValue   string          `db:"matched_value"`
    MatchDetails   json.RawMessage `db:"match_details"`
}

// Опции поиска
options := map[string]interface{}{
    "use_synonyms":         true,
    "use_typos":           false,
    "use_stopwords":       true,
    "similarity_threshold": 0.3,
    "limit":               20,
}

optionsJSON, _ := json.Marshal(options)

var records []SearchRecord
err := dbx.SelectContext(ctx, &records, `
    SELECT * FROM advanced_search($1,$2,$3,$4);
`, projectID, query, locale, optionsJSON)
```

### 3.2 Базовый поиск (совместимость с v1)

```go
var records []SearchRecord
err := dbx.SelectContext(ctx, &records, `
    SELECT * FROM fuzzy_search_records($1,$2,$3,$4,$5);
`, projectID, query, locale, 0.3, 20)
```

### 3.2 Подсказки (suggestions)

```go
type Suggestion struct {
    Suggestion      string  `db:"suggestion"`
    SimilarityScore float64 `db:"similarity_score"`
    SuggestionType  string  `db:"suggestion_type"`
}

var suggests []Suggestion
err := dbx.SelectContext(ctx, &suggests, `
    SELECT * FROM fuzzy_suggestions_records($1,$2,$3);
`, projectID, query, locale)
```

Что попадает в `suggests.type`:

| type            | источник                                   |
|-----------------|---------------------------------------------|
| title_prefix    | title начинается с query                    |
| keyword_prefix  | keyword начинается с query                  |
| popular         | частый прошлый запрос (top-100)             |
| translation     | fuzzy-совпадение в title/description        |
| keyword         | fuzzy-совпадение в keywords                 |

### 3.3 Логирование поисковых запросов

После успешного поиска вызовите:

```go
_, _ = dbx.ExecContext(ctx, `SELECT record_search_query($1,$2,$3);`,
    projectID, locale, query)
```

Ночной cron выполняет:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_suggestions;
```

так что блок «popular» в подсказках всегда содержит свежие топ-запросы.

### 3.4 Пример UI-обработки

```ts
switch (suggestion.suggestion_type) {
  case 'title_prefix':   highlightBold(); break;
  case 'popular':        addFireIcon();   break;
}
```

### 3.5 Пример JOIN с сущностями

Используйте полученные `source_type` и `source_id`, чтобы подгрузить данные
конкретной сущности.

```go
for _, rec := range records {
    switch rec.SourceType {
    case "PRODUCT":
        // query product table by rec.SourceID
    case "PAGE":
        // query page table
    }
}
```

### 3.6 Работа с синонимами

```go
// Добавление синонимов
_, err := dbx.ExecContext(ctx, `
    INSERT INTO search_synonyms (project_id, locale_code, term, synonym, weight)
    VALUES ($1, $2, $3, $4, $5)
`, projectID, "ru", "телефон", "смартфон", 0.9)

// Получение синонимов для термина
type Synonym struct {
    Synonym string  `db:"synonym"`
    Weight  float64 `db:"weight"`
}

var synonyms []Synonym
err = dbx.SelectContext(ctx, &synonyms, `
    SELECT * FROM get_term_synonyms($1, $2, $3)
`, projectID, locale, "телефон")
```

### 3.7 Управление стоп-словами

```go
// Добавление кастомных стоп-слов
stopWords := []string{"the", "a", "an", "and", "or"}
_, err := dbx.ExecContext(ctx, `
    SELECT bulk_load_stop_words($1, $2, $3)
`, projectID, locale, pq.Array(stopWords))

// Загрузка дефолтных стоп-слов для проекта
_, err = dbx.ExecContext(ctx, `
    SELECT load_default_stop_words($1)
`, projectID)
```

### 3.8 Мониторинг и метрики

```go
// Анализ качества поиска
type SearchMetric struct {
    MetricName        string  `db:"metric_name"`
    MetricValue       float64 `db:"metric_value"`
    MetricDescription string  `db:"metric_description"`
}

var metrics []SearchMetric
err := dbx.SelectContext(ctx, &metrics, `
    SELECT * FROM analyze_search_quality($1, $2, $3, $4)
`, projectID, locale, timeFrom, timeTo)

// Получение рекомендаций по оптимизации
type OptimizationHint struct {
    HintType    string `db:"hint_type"`
    HintMessage string `db:"hint_message"`
    Severity    string `db:"severity"`
}

var hints []OptimizationHint
err = dbx.SelectContext(ctx, &hints, `
    SELECT * FROM get_search_optimization_hints($1)
`, projectID)
```

---

## 4. Проверка и профилирование

1. Снимите план выполнения через `EXPLAIN ANALYZE` в `psql`:
   ```sql
   EXPLAIN ANALYZE SELECT *
     FROM fuzzy_search_records('11111111-…', 'iphone', 'en', 0.3, 10);
   ```
2. Убедитесь, что план использует индексы `search_vector`, `idx_title_prefix_trgm`.
3. Сбор статистики вызовов функций:
   ```sql
   SELECT funcname, calls, total_time/calls AS avg_ms
   FROM pg_stat_user_functions
   WHERE funcname LIKE 'fuzzy_search_records%';
   ```

---

## 5. Советы по эксплуатации (runtime)

1. Не вызывайте поиск, пока пользователь не ввёл ≥ 2 символов.
2. Кэшируйте топ-запросы во внешнем Redis, TTL – 30 мин.
3. Раз в месяц делайте:
   ```sql
   REINDEX TABLE translations_index;
   ```

---

### FAQ
**Q:** Поиск стал медленным. Что делать?
**A:**
1. Проверьте метрики: `SELECT * FROM analyze_search_quality(project_id);`
2. Получите рекомендации: `SELECT * FROM get_search_optimization_hints(project_id);`
3. `VACUUM ANALYZE translations_index;`
4. Проверьте использование индексов: `SELECT * FROM get_search_index_stats();`
5. При необходимости — `REINDEX TABLE translations_index;`

**Q:** Как добавить новый язык?
**A:** Используйте функцию добавления языковой конфигурации:
```sql
SELECT add_language_config('pl', 'simple', 'Polski język');
```

**Q:** Как включить поиск с опечатками?
**A:** Передайте опцию в advanced_search:
```go
options := map[string]interface{}{
    "use_typos": true,
    "typo_threshold": 0.7,  // до 30% различий
}
```
> **Важно:** Поиск с опечатками (`levenshtein`) является ресурсоемкой операцией и может работать медленно на больших объемах данных, так как он не может использовать стандартные индексы для ускорения. Включайте эту опцию с осторожностью, например, как вторую попытку поиска, если обычный поиск не дал результатов.

**Q:** Много нерелевантных результатов при коротких запросах
**A:**
1. Убедитесь, что стоп-слова загружены: `SELECT load_default_stop_words(project_id);`
2. Увеличьте порог similarity для коротких запросов
3. Используйте префиксный поиск только для заголовков

**Q:** Как настроить синонимы для улучшения поиска?
**A:** Добавьте синонимы для часто используемых терминов:
```sql
INSERT INTO search_synonyms (project_id, locale_code, term, synonym)
VALUES
    (project_id, 'ru', 'ноутбук', 'лэптоп'),
    (project_id, 'ru', 'наушники', 'гарнитура');
```

**Q:** Как очистить старые логи поиска?
**A:** Используйте функцию очистки:
```sql
SELECT cleanup_old_search_logs(90);  -- сохранить последние 90 дней
```

---

## 6. Структура файлов миграции

| Файл | Описание |
|------|----------|
| `search_all.sql` | Главный файл, выполняет все миграции в правильном порядке |
| `search_lang_config.sql` | Кеширование языковых конфигураций |
| `search_v1.sql` | Основная схема полнотекстового поиска |
| `searchKeyword.sql` | Схема для ключевых слов |
| `suggestions.sql` | Логирование и популярные подсказки |
| `search_synonyms.sql` | Поддержка синонимов |
| `search_levenshtein.sql` | Поиск с опечатками |
| `search_stopwords.sql` | Управление стоп-словами |
| `search_metrics.sql` | Метрики и мониторинг |

---

## 7. Производительность

**Ожидаемые показатели:**
- Поиск по 1М записей: < 50мс (с индексами)
- Подсказки: < 20мс
- Поиск с опечатками: < 100мс (зависит от порога)

**Рекомендации:**
1. Регулярно обновляйте статистику: `ANALYZE;`
2. Мониторьте размер таблиц и индексов
3. Используйте партиционирование для больших таблиц (>10М записей)
4. Настройте `work_mem` и `maintenance_work_mem` в PostgreSQL
5. Рассмотрите использование `pg_stat_statements` для анализа медленных запросов
