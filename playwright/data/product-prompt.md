

**Task:** Create JSON files for new products in the `e2e/data/seed-json/products/` directory.

**Context and rules:**

1.  **File name:** File name should be in `kebab-case` and match the `slug` field value in JSON. For example, for a product with `slug: "new-cool-product"` the file name will be `new-cool-product.json`.

2.  **JSON structure:** Each JSON file must strictly follow the structure below. Pay attention to field names (`title`, `slug`, `featureGroups`) and data types.

    ```json
    {
      "title": "Product name",
      "slug": "product-slug-in-kebab-case",
      "description": "Detailed product description.",
      "category": "category-slug",
      "price": 123.45,
      "tags": ["tag-slug-1", "tag-slug-2"],
      "featureGroups": [
        {
          "slug": "feature-group-slug-1",
          "values": ["Value 1", "Value 2"]
        },
        {
          "slug": "feature-group-slug-2",
          "values": ["Another value"]
        }
      ],
      "groups": [
        {
          "title": "Group name",
          "isMultiple": false,
          "isRequired": true,
          "sortIndex": 0,
          "items": [
            {
              "productSlug": "component-product-slug",
              "featureValues": ["Feature value"],
              "sortIndex": 0,
              "priceType": "BASE",
              "priceAmountValue": 100
            }
          ]
        }
      ]
    }
    ```

3.  **Fields:**
    *   `title` (string): Human-readable product name.
    *   `slug` (string): Unique identifier in `kebab-case`. **Must match the file name (without .json)**.
    *   `description` (string): Product description.
    *   `category` (string): `slug` of an existing category. To see available categories, check files in `e2e/data/seed-json/categories/`.
    *   `price` (number): Product price (number).
    *   `tags` (array of strings): Array of existing tag `slug`s. To see available tags, check files in `e2e/data/seed-json/tags/`.
    *   `featureGroups` (array of objects): Array of feature groups.
        *   `slug` (string): `slug` of an existing feature group. To see available groups, check files in `e2e/data/seed-json/feature-groups/`.
        *   `values` (array of strings): Array of possible string values for this feature.
    *   `groups` (array of objects, optional): Array of component groups for composite products.
        *   `title` (string): Group name (DO NOT use deprecated fields `slug`, `name` or `required`).
        *   `isMultiple` (boolean): Whether multiple components can be selected from the group.
        *   `isRequired` (boolean): Whether the group is required for selection.
        *   `sortIndex` (number): Group sort order.
        *   `items` (array of objects): Components in the group.
            *   `productSlug` (string): Component product `slug`.
            *   `featureValues` (array of strings, optional): Array of feature values to select a specific component variant. Used for products with `featureGroups`. Order of values must match the order of `featureGroups` in the component product.
              *Example*: for product `pizza-component-sauce` with `featureGroups` containing `sauce-type`, to select "Tomato" variant, use `"featureValues": ["Tomato"]`.
              *For products with multiple features*: `"featureValues": ["Grey", "Velour"]` (color and material).
              *For simple products without features*: don't specify `featureValues` at all.
            *   `sortIndex` (number): Item sort order in the group.
            *   `priceType` (string): Price type (`BASE`, `FREE`, `BASE_ADJUST_AMOUNT`, `BASE_ADJUST_PERCENT`).
            *   `priceAmountValue` (number, optional): Price adjustment value for `BASE_ADJUST_AMOUNT` (in cents/kopecks).
            *   `pricePercentageValue` (number, optional): Adjustment percentage for `BASE_ADJUST_PERCENT`.

4.  **Important:** Before creating a new product, **always** study existing files in directories:
    *   `e2e/data/seed-json/products/` (for examples)
    *   `e2e/data/seed-json/categories/` (for available categories)
    *   `e2e/data/seed-json/tags/` (for available tags)
    *   `e2e/data/seed-json/feature-groups/` (for available features)

    This will help avoid structure errors and use correct `slug`s for categories, tags and features.

**Example request:**

> Create 5 new products for the `clothing` category in `e2e/data/seed-json/products/`. Use existing tags and features.

---

**⚠️ IMPORTANT: Updated group structure**

If you see old examples in the code, **DO NOT use** deprecated fields:
- ❌ `"slug"` in groups (field removed)
- ❌ `"name"` instead of `"title"` in groups
- ❌ `"required"` instead of `"isRequired"` in groups
- ❌ `"variantSlug"` in items (replaced with `"featureValues"`)
- ❌ `"price": {"amount": "..."}` in items (replaced with `"priceType"` + `"priceAmountValue"`)

✅ **Use ONLY the current structure** from the example above!
