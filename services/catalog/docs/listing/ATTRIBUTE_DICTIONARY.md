# Attribute Dictionary (project-level)

Словарь атрибутов — справочник имён опций и характеристик на уровне проекта. Два типа: `option` и `feature`. Теги не входят.

Словарь — это просто справочник: slug + name. Без переводов, без UI-настроек, без swatch.

---

## Database schema

```sql
catalog.attribute_dictionary (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  type              varchar(16) NOT NULL,  -- 'option' | 'feature'
  slug              varchar(255) NOT NULL,
  name              text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE(project_id, slug)
)

catalog.attribute_dictionary_value (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  dictionary_id     uuid NOT NULL REFERENCES catalog.attribute_dictionary(id) ON DELETE CASCADE,
  slug              varchar(255) NOT NULL,
  name              text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE(dictionary_id, slug)
)
```

- Slug уникален в рамках проекта поверх обоих типов — нельзя иметь option "color" и feature "color" одновременно
- `name` — человекочитаемое имя, одно поле

---

## Связь с per-product сущностями

Мягкие FK — обратная совместимость, существующие опции/фичи без словаря продолжают работать:

```sql
ALTER TABLE catalog.product_option
  ADD COLUMN dictionary_id uuid REFERENCES catalog.attribute_dictionary(id) ON DELETE SET NULL;

ALTER TABLE catalog.product_option_value
  ADD COLUMN dictionary_value_id uuid REFERENCES catalog.attribute_dictionary_value(id) ON DELETE SET NULL;

ALTER TABLE catalog.product_feature
  ADD COLUMN dictionary_id uuid REFERENCES catalog.attribute_dictionary(id) ON DELETE SET NULL;

ALTER TABLE catalog.product_feature_value
  ADD COLUMN dictionary_value_id uuid REFERENCES catalog.attribute_dictionary_value(id) ON DELETE SET NULL;
```

---

## Связь с фасетами и search index

- `facet.source_handle` соответствует `attribute_dictionary.slug`
- Композиты в search index: `dictionary.slug:value.slug`

---

## GraphQL

```graphql
type AttributeDictionary implements Node {
  id: ID!
  type: AttributeDictionaryType!
  slug: String!
  name: String!
  values: [AttributeDictionaryValue!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum AttributeDictionaryType { OPTION FEATURE }

type AttributeDictionaryValue implements Node {
  id: ID!
  slug: String!
  name: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input AttributeDictionaryCreateInput { type: AttributeDictionaryType!, slug: String!, name: String! }
input AttributeDictionaryUpdateInput { id: ID!, slug: String, name: String }
input AttributeDictionaryDeleteInput { id: ID! }

input AttributeDictionaryValueCreateInput { dictionaryId: ID!, slug: String!, name: String! }
input AttributeDictionaryValueUpdateInput { id: ID!, slug: String, name: String }
input AttributeDictionaryValueDeleteInput { id: ID! }

type AttributeDictionaryCreatePayload { attributeDictionary: AttributeDictionary, userErrors: [GenericUserError!]! }
type AttributeDictionaryUpdatePayload { attributeDictionary: AttributeDictionary, userErrors: [GenericUserError!]! }
type AttributeDictionaryDeletePayload { deletedAttributeDictionaryId: ID, userErrors: [GenericUserError!]! }

type AttributeDictionaryValueCreatePayload { attributeDictionaryValue: AttributeDictionaryValue, userErrors: [GenericUserError!]! }
type AttributeDictionaryValueUpdatePayload { attributeDictionaryValue: AttributeDictionaryValue, userErrors: [GenericUserError!]! }
type AttributeDictionaryValueDeletePayload { deletedAttributeDictionaryValueId: ID, userErrors: [GenericUserError!]! }
```

CatalogQuery:
```graphql
attributeDictionary(id: ID!): AttributeDictionary
attributeDictionaries(type: AttributeDictionaryType): [AttributeDictionary!]!
attributeDictionaryValue(id: ID!): AttributeDictionaryValue
```

CatalogMutation:
```graphql
attributeDictionaryCreate(input: AttributeDictionaryCreateInput!): AttributeDictionaryCreatePayload!
attributeDictionaryUpdate(input: AttributeDictionaryUpdateInput!): AttributeDictionaryUpdatePayload!
attributeDictionaryDelete(input: AttributeDictionaryDeleteInput!): AttributeDictionaryDeletePayload!
attributeDictionaryValueCreate(input: AttributeDictionaryValueCreateInput!): AttributeDictionaryValueCreatePayload!
attributeDictionaryValueUpdate(input: AttributeDictionaryValueUpdateInput!): AttributeDictionaryValueUpdatePayload!
attributeDictionaryValueDelete(input: AttributeDictionaryValueDeleteInput!): AttributeDictionaryValueDeletePayload!
```

---

## Implementation order

Phase 0: dictionary tables, FK columns, repository, CRUD scripts, GraphQL.
