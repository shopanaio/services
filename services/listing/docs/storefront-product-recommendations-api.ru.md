# Storefront API: Product Recommendations

## Назначение

Listing расширяет federation entity `Product` двумя read-only connections:

- `relatedProducts` — curated и автоматически дополненные связанные товары;
- `frequentlyBoughtTogether` — товары, связанные по подтверждённым совместным покупкам.

Storefront получает уже рассчитанный порядок и только отображает его, обычно в виде slider/carousel.
Storefront не рассчитывает score, не смешивает источники, не сортирует результат и не запускает
fallback.

## Related Products

```graphql
query ProductRelatedProducts($productId: ID!, $first: Int = 12, $after: Cursor) {
  product(id: $productId) {
    id
    relatedProducts(first: $first, after: $after) {
      nodes {
        source
        product {
          id
          title
          handle
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
}
```

## Frequently Bought Together

```graphql
query ProductFrequentlyBoughtTogether($productId: ID!, $first: Int = 3, $after: Cursor) {
  product(id: $productId) {
    id
    frequentlyBoughtTogether(first: $first, after: $after) {
      edges {
        cursor
        node {
          source
          product {
            id
            title
            handle
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
}
```

## Relay contract

- API поддерживает forward pagination через `first` и `after`.
- `first` должен быть целым числом от `1` до `100`.
- Default для `relatedProducts` — `12`, для `frequentlyBoughtTogether` — `3`.
- `after` является opaque cursor; клиент не должен декодировать или собирать его самостоятельно.
- Cursor привязан к immutable snapshot generation. Если между страницами был опубликован новый
  ranking, продолжение старого cursor не смешивает два порядка.
- `nodes` и `edges` отсортированы по опубликованному rank. Клиент не должен менять этот порядок.
- `totalCount` — число товаров из выбранного snapshot, которые остаются storefront-eligible на
  момент чтения.
- Пустой connection является нормальным результатом и должен отображаться как отсутствие блока, а не
  как ошибка.

## Presentation semantics

`ProductRecommendation.source` сообщает основной источник результата и может использоваться для
analytics attribution. Внутренние score, features, model version и source breakdown намеренно не
входят в storefront API.

Frequently Bought Together не означает:

- скидку или bundle promotion;
- совместимость товаров;
- зафиксированную цену;
- автоматическое добавление товаров в cart.

Для сценария `Add all` storefront выбирает конкретные variants и вызывает Checkout batch mutation.
Checkout повторно проверяет merchandise и availability, а Pricing независимо применяет подходящие
promotions.

## Read consistency

Listing обслуживает только опубликованные ranking snapshots. Во время чтения он повторно исключает
товары, которые стали unpublished или unavailable. Такая проверка не меняет сохранённый snapshot и
может уменьшить `totalCount` между двумя запросами.
