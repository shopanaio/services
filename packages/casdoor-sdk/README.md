# `@zaytra/casdoor-node-client-ext`

Node.js (TypeScript) клиент‑расширение для Casdoor, построенный поверх `casdoor-nodejs-sdk`.

Задача пакета: закрыть “браузерные” `/api/*` endpoints (login/signup/logout, verification code, captcha, webauthn), **не дублируя** существующие методы официального SDK.

## Установка

```bash
npm i casdoor-nodejs-sdk axios form-data @zaytra/casdoor-node-client-ext
```

## Быстрый старт (BFF/proxy с прокидыванием cookies)

```ts
import { CasdoorNodeClient, ctxFromHeaders, applySetCookieHeader } from "@zaytra/casdoor-node-client-ext";

const client = new CasdoorNodeClient({
  casdoorBaseUrl: "https://door.example.com",
  cookie: { mode: "forward" },
  sdkConfig: {
    url: "https://door.example.com",
    clientId: "xxx",
    clientSecret: "yyy",
    certificate: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    orgName: "my-org",
    applicationName: "my-app",
  },
});

// Express-style handler:
export async function loginHandler(req: any, res: any) {
  const ctx = ctxFromHeaders(req.headers);
  const result = await client.auth.login(ctx, req.body);
  applySetCookieHeader(res, result.setCookie);
  res.status(result.status).json(result.data);
}
```

## Доступ к официальному SDK

Все методы `casdoor-nodejs-sdk` доступны как `client.sdk.*` и не оборачиваются:

```ts
const users = await client.sdk.getUsers();
```

## Cookie стратегии

- `cookie: { mode: "forward" }` — проброс `Cookie` клиента в Casdoor и возврат `Set-Cookie` обратно.
- `cookie: { mode: "jar", getJar }` — серверный cookie jar (любой объект с `getCookieString()`/`setCookie()`).

