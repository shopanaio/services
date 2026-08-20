# Listing Index Workflow History Retention

`listing_index_actions` хранит durable execution/history в DBOS system tables. Для high-volume
catalog streams retention должна настраиваться отдельно от business tables:

- completed listing index workflows можно удалять после operational audit window;
- failed workflows должны храниться дольше completed workflows для диагностики;
- cleanup job не должен удалять running/pending workflows;
- retention policy должна фильтровать workflow names: `listing.syncSellableItemIndex` и
  `listing.deleteSellableItemIndex`.

Рекомендуемые defaults для self-hosted/dev deployment:

- completed: 7 дней;
- failed/retries-exceeded: 30 дней;
- cleanup cadence: ежедневно.
