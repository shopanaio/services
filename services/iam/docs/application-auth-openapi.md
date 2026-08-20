# Application authentication OpenAPI contract

Машинно-читаемый контракт генерируется командой:

```bash
yarn iam:openapi
```

Результат находится в [`application-auth.openapi.yaml`](./application-auth.openapi.yaml).

Файл результата вручную не редактируется. Генератор объединяет endpoint metadata установленной
версии Better Auth/OAuth Provider, публичный IAM route manifest и IAM-specific overrides из
`application-auth.openapi.overrides.yaml`, затем удаляет запрещенные routes.

Он описывает публичные JSON/protocol endpoints IAM для:

- OAuth 2.1 Authorization Code + PKCE и refresh token;
- OpenID Connect discovery, JWKS, UserInfo и RP-Initiated Logout;
- password signup/signin, verification и password reset;
- email OTP и social signin;
- просмотра, отзыва и завершения application sessions.

Hosted UI endpoints (`/login`, `/signup`, `/consent`, `/logout` и остальные HTML-страницы) намеренно
не включены как frontend REST API. В контракте есть только два session-bound OAuth continuation
endpoint, вызываемые самим hosted flow; они помечены `x-internal-flow: true`.

## Генерация типов для frontend

Минимальный вариант с `openapi-typescript`:

```bash
npx openapi-typescript \
  services/iam/docs/application-auth.openapi.yaml \
  -o admin/src/api/iam-application-auth.generated.ts
```

Для типобезопасного клиента поверх этих типов можно использовать `openapi-fetch`. Для готовых React
Query hooks подходит Orval:

```ts
import { defineConfig } from "orval";

export default defineConfig({
  applicationAuth: {
    input: "../services/iam/docs/application-auth.openapi.yaml",
    output: {
      target: "src/api/iam-application-auth.generated.ts",
      client: "react-query",
    },
  },
});
```

Не редактируйте generated-файлы вручную. После изменения route manifest, Better Auth endpoint
metadata или IAM overrides сначала выполните `yarn iam:openapi`, затем frontend codegen.

## Runtime-особенности

- Все операции изолированы через lowercase UUID `applicationId`.
- Password, verification, OTP и social routes зависят от effective policy. Выключенный route
  возвращает `404`, а не capability disclosure.
- OAuth authorization code использует только PKCE `S256`.
- `resource` обязателен на authorize, code exchange и каждом refresh и должен точно совпадать с
  immutable resource приложения.
- Protocol endpoints принимают form-urlencoded там, где этого требует OAuth.
- Browser session передается HttpOnly cookie `shopana_application_{applicationId}.session_token`;
  fetch-клиент должен использовать `credentials: "include"`.
- CORS разрешает credentials только для IAM public base URL и trusted origins приложения.
- OAuth client management и Dynamic Client Registration через public REST boundary запрещены.
  Клиентами управляет Admin GraphQL API.

## Синхронизация

При изменении публичных routes или request/response shapes одновременно обновляются:

1. `src/auth/applicationAuthRouteManifest.ts`;
2. IAM HTTP boundary policy;
3. `application-auth.openapi.overrides.yaml`, если изменился IAM-specific контракт поверх Better
   Auth metadata;
4. generated `application-auth.openapi.yaml` командой `yarn iam:openapi`;
5. сгенерированный frontend client.
