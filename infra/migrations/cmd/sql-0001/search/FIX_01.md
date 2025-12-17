# FIX_01 – Изменения миграций поиска

## Причины исправлений
1. Ошибки при выполнении миграций:
   * `function setweight(tsvector, text/character)` – неверный вес и тип.
   * `generation expression is not immutable` – использование функций `STABLE`/`VOLATILE` в GENERATED-колонках.
   * `functions in index expression must be marked IMMUTABLE` – `unaccent()` в индексах.
   * Ошибки циклов `FOR … IN` без `record`-переменных.
   * Конфликт «cannot change routine kind» для процедуры `cleanup_old_search_logs`.

## Ключевые изменения
| Файл | Шаги |
|------|------|
| **search_lang_config.sql** | • `Z` → `D` в `setweight` <br/>• `get_ts_config` → `STABLE` <br/>• GENERATED-колонка заменена на обычную + триггер <br/>• Пересоздан GIN-индекс |
| **searchKeyword.sql** | • Убрана GENERATED-колонка, добавлен триггер <br/>• trigram-индекс теперь `lower(keyword)` |
| **search_synonyms.sql** | • trigram-индексы на `lower()` <br/>• объявлена `v_synonym record` <br/>• сравнения через `lower()` |
| **search_all.sql** | • Объявлены переменные `r record` в двух блоках `DO` |
| **search_metrics.sql** | • Процедура `cleanup_old_search_logs` преобразована в функцию `cleanup_old_search_logs()` |

## Дополнительно
* Все tsvector-колонки теперь поддерживаются триггерами.
* Миграции проходят успешно командой:
  ```bash
  docker compose -f docker-compose.migrate.yml up --build --abort-on-container-exit
  ```

---
### Что нужно учесть в коде/документации
* Для очистки логов теперь используется функция:
  ```sql
  SELECT cleanup_old_search_logs(90);  -- сохранить 90 дней
  ```
  вместо вызова процедуры `CALL ...`.
