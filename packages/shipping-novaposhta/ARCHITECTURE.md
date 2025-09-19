### Nova Poshta Plugin Architecture

Briefly:
- Package `@shopana/shipping-novaposhta` implements `PluginModule` contract from `@shopana/shipping-plugin-kit`.
- Exports `plugin` with manifest, `zod` config schema and `create(ctx, cfg)`.
- Provider `NovaPoshtaProvider` uses contextual `HttpClient` to call Nova Poshta API and maps rates to `ShippingMethodDto[]`.

Files:
- `src/index.ts` — `configSchema`, `plugin` and export by contract.
- `src/provider.ts` — `ShippingProvider` implementation with `getMethods`.
- `src/client.ts` — thin-client Nova Poshta, delegates HTTP to `HttpClient` from context.
- `src/schemas.ts` — `zod` schemas for Nova Poshta responses (MVP: `getDocumentPrice`).
- `src/mappers.ts` — transformation of responses to `ShippingMethodDto[]`.

Manifest:
- `code: "novaposhta"`, `apiVersionRange: "^1.0.0"`, `domains: ["shipping"]`, `capabilities: ["rates"]`.

Slot config (example):
```
{
  "configVersion": "0.0.1",
  "baseUrl": "https://api.novaposhta.ua/v2.0/json/",
  "apiKey": { "$secret": "NP_API_KEY" },
  "senderCityRef": "00000000-0000-0000-0000-000000000000",
  "recipientCityRef": "11111111-1111-1111-1111-111111111111",
  "defaultWeightKg": 1,
  "defaultCost": 1000,
  "serviceTypes": ["WarehouseWarehouse", "DoorsDoors"]
}
```

Integration:
1) Add dependency to `apps/shipping/package.json`.
2) Run `yarn workspace shipping-service run generate:plugins` (or `build`).
3) Set `SHIPPING_PLUGINS_ALLOW=novaposhta` and `NP_API_KEY` in environment.
4) Call `getMethods` through service `PluginManager`.
