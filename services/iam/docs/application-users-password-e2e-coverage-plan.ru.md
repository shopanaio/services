# План полного e2e-покрытия password-аутентификации `application_users`

Статус: проект тестового контракта; готов к реализации после появления публичного application auth
runtime

Дата: 2026-07-19  
Сервис: `services/iam`  
Целевая область: password-аутентификация пользователей приложений и изоляция application realms

Связанные документы:

- [План реализации OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md);
- [Application auth OAuth/OIDC — operations](./application-users-oauth-oidc-integration.md);
- [План реализации Admin API для application auth](./application-auth-admin-api-implementation-plan.ru.md).

## 1. Назначение документа

Документ определяет полный набор e2e-сценариев первой волны для application auth, в которой разрешен
только способ входа `email/password`.

Проверки должны подтверждать поведение системы через ее внешние границы и покрывать весь security
layer: публичную HTTP-границу IAM, hosted UI, OAuth 2.1/OIDC flow, password signup/signin/reset,
email verification, application-scoped sessions, token lifecycle, rate limits, anti-enumeration,
audit/redaction и изоляцию applications.

GraphQL API управления application auth еще не считается готовым. Поэтому настоящий документ:

- описывает **что** требуется проверить, но не фиксирует GraphQL operation names, input types,
  selectors, fixture API или способ подготовки данных;
- допускает доверенную подготовку applications, OAuth clients, конфигураций и users до начала
  сценария;
- требует повторно использовать ту же матрицу после появления Admin GraphQL, заменив только способ
  подготовки состояния;
- не описывает реализацию тестов, маршрутов, резолверов или production-кода.

## 2. Границы первой волны

### 2.1. Входит в покрытие

- password signup;
- password signin;
- обязательная и необязательная email verification;
- forgot/reset password;
- Authorization Code flow с обязательным S256 PKCE;
- public и confidential OAuth clients, действующие только от имени `application_user`;
- application session, authorization context, access/ID/refresh tokens и logout;
- live-state проверки organization, application, OAuth client, user, session и token family;
- browser/web security публичного application auth слоя;
- application isolation и защита от IDOR/cross-realm substitution;
- безопасное поведение при отказах security-зависимостей;
- security events, audit и отсутствие секретов/PII в наблюдаемости.

### 2.2. Не входит в первую волну

- email OTP/passwordless;
- Google, Facebook и другие social providers;
- account linking/unlinking;
- MFA, passkeys, TOTP, recovery codes;
- phone/SMS authentication;
- SAML/LDAP/enterprise federation;
- machine-to-machine и `client_credentials` как положительный flow;
- проверка бизнес-авторизации resource-server сервисов;
- конкретный контракт будущего Admin GraphQL.

Выключенные способы и запрещенные grants все равно входят в негативное security-покрытие: они не
должны становиться доступны из-за неполного route manifest или ошибочной конфигурации.

## 3. Проверяемые инварианты

Каждый сценарий должен подтверждать один или несколько инвариантов:

1. `iam.application` является самостоятельным identity realm.
2. Доверенный application scope определяется серверным route/context, а не пользовательским input,
   cookie или token claim.
3. User, account, session, verification, authorization context, OAuth client, consent, signing key и
   token принадлежат ровно одной application.
4. Одинаковый email в разных applications обозначает разных пользователей.
5. Успешная password-аутентификация не является самостоятельным способом выдачи OAuth token: token
   появляется только через разрешенный Authorization Code flow.
6. Разрешены только Authorization Code и refresh token flows; PKCE нельзя отключить.
7. Password signup, signin и reset управляются независимыми server-side gates.
8. `registration_mode=disabled` запрещает создание нового user, но не запрещает разрешенный вход и
   reset существующего user.
9. Выключенный или неизвестный endpoint отклоняется до auth handler и не изменяет состояние.
10. Неактивное состояние organization/application/client/user/session/token family учитывается во
    время каждого security-sensitive flow.
11. Cookies, authorization contexts, codes, links и refresh tokens ограничены назначением, realm,
    TTL и одноразовостью.
12. Любая неоднозначность tenant, redirect, resource, route, credential или security parameter
    разрешается fail closed.
13. Пользовательские ответы не раскрывают существование account сверх явно разрешенного product
    contract.
14. Пароли, hashes, tokens, codes, reset/verification links и полные email не попадают в ответы,
    URL, browser storage, logs, traces, metrics и audit.

## 4. Обязательные состояния тестовой матрицы

Для покрытия необходимы как минимум следующие независимые состояния:

| Состояние                                           | Назначение                                               |
| --------------------------------------------------- | -------------------------------------------------------- |
| Organization A / Application A / Client A           | основной активный realm                                  |
| Organization B / Application B / Client B           | чужой realm для cross-application атак                   |
| Application A2 в Organization A                     | проверка изоляции applications внутри одной organization |
| Активный verified password user                     | положительные signin/OAuth flows                         |
| Активный unverified password user                   | политика email verification                              |
| Заблокированный user                                | live-state и session revocation                          |
| Existing user с email, отсутствующим в другом realm | anti-enumeration и tenant uniqueness                     |
| Public client                                       | Authorization Code + PKCE без client secret              |
| Confidential client                                 | Authorization Code + PKCE с client authentication        |
| Disabled OAuth client                               | live-state отказ                                         |
| Realm с закрытой регистрацией                       | разделение signup и signin/reset                         |
| Realm с независимо выключенными signup/signin/reset | effective security gates                                 |
| Disabled application и disabled organization        | аварийное отключение realm                               |

Критичные tenant-сценарии выполняются для пары applications из разных organizations и для пары
applications одной organization. Совпадение organization не должно ослаблять application boundary.

## 5. Матрица e2e-сценариев

### 5.1. Публичная граница и effective configuration

| ID            | Сценарий                                             | Что должно быть проверено                                                                                                 |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| PWD-BOUND-001 | Активный realm публикует только password-возможности | Пользователь видит только разрешенные password signin/signup/reset действия; OTP/social/MFA действия отсутствуют.         |
| PWD-BOUND-002 | Password signup выключен                             | Signup отсутствует в UI и недоступен прямым запросом; user/account/session не создаются.                                  |
| PWD-BOUND-003 | Password signin выключен                             | Signin отсутствует в UI и недоступен прямым запросом; существующие credentials не создают session.                        |
| PWD-BOUND-004 | Password reset выключен                              | Forgot/reset отсутствуют в UI, прямые request/complete обращения отклоняются, verification state и delivery не создаются. |
| PWD-BOUND-005 | Signup включен, signin выключен                      | Signup создает user/account без session и без автоматического продолжения OAuth flow; signin остается закрытым.           |
| PWD-BOUND-006 | Signup выключен, signin включен                      | Существующий user входит, новый user не может быть создан.                                                                |
| PWD-BOUND-007 | Закрытая регистрация при включенном signup           | Создание нового user отклоняется server-side; отсутствие signup в UI не является единственным барьером.                   |
| PWD-BOUND-008 | Закрытая регистрация для existing user               | Разрешенные signin и reset продолжают работать для существующего user.                                                    |
| PWD-BOUND-009 | Неизвестный auth path                                | Возвращается нейтральный отказ без вызова auth flow и без изменения состояния.                                            |
| PWD-BOUND-010 | Известный path с неверным HTTP method                | Запрос отклоняется до auth flow и не создает security state.                                                              |
| PWD-BOUND-011 | Запрещенные plugin-management endpoints              | Application user, даже с действующей session, не может читать/создавать/изменять OAuth clients или ротировать secrets.    |
| PWD-BOUND-012 | Выключенные OTP/social endpoints                     | Прямое обращение не активирует plugin behavior, delivery или provider redirect.                                           |
| PWD-BOUND-013 | Disabled application                                 | Discovery/hosted login/authorize/signin/reset/refresh не работают; существующие auth rows не удаляются.                   |
| PWD-BOUND-014 | Disabled organization                                | Все application auth flows дочернего realm прекращаются независимо от локальных флагов application.                       |
| PWD-BOUND-015 | Некорректный или неизвестный application identifier  | Запрос отклоняется одинаково безопасно и не позволяет определить внутреннее состояние другого realm.                      |

### 5.2. Password signup

| ID             | Сценарий                                            | Что должно быть проверено                                                                                                           |
| -------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| PWD-SIGNUP-001 | Успешная регистрация с допустимыми данными          | Создаются user и password account только в целевой application; пароль не возвращается и не сохраняется в открытом виде.            |
| PWD-SIGNUP-002 | Минимально допустимая длина пароля                  | Граничное допустимое значение принимается согласно server policy.                                                                   |
| PWD-SIGNUP-003 | Пароль короче минимума                              | Запрос отклоняется без создания user/account/session и без delivery side effect.                                                    |
| PWD-SIGNUP-004 | Пароль длиннее максимума                            | Запрос отклоняется контролируемо, без truncation и без частичного состояния.                                                        |
| PWD-SIGNUP-005 | Пустые/отсутствующие обязательные поля              | Возвращается безопасная validation error; записи не создаются.                                                                      |
| PWD-SIGNUP-006 | Malformed email                                     | Email отклоняется до создания identity state.                                                                                       |
| PWD-SIGNUP-007 | Нормализация email                                  | Эквивалентные формы email не создают дубликаты внутри одного realm согласно принятой normalization policy.                          |
| PWD-SIGNUP-008 | Повторная регистрация существующего email           | Ответ не раскрывает credential/account details; второй user/account не создается.                                                   |
| PWD-SIGNUP-009 | Одинаковый email в Application A и B                | В каждом realm создается независимый user с независимым password account.                                                           |
| PWD-SIGNUP-010 | Одинаковый email в A и A2 одной organization        | Users остаются независимыми, несмотря на общего владельца organization.                                                             |
| PWD-SIGNUP-011 | Signup с чужим application/client context           | Данные не создаются ни в route application, ни в application из подставленного контекста.                                           |
| PWD-SIGNUP-012 | Повторная отправка идентичного signup               | Не возникает двух users/accounts/sessions; результат согласован с idempotency/product contract.                                     |
| PWD-SIGNUP-013 | Конкурентный signup одного email                    | Ровно одна согласованная identity создается внутри realm; проигравший запрос не оставляет partial state.                            |
| PWD-SIGNUP-014 | Signup при обязательной verification                | User создается в непроверенном состоянии и не получает полноценную авторизованную session/token до verification.                    |
| PWD-SIGNUP-015 | Signup при необязательной verification              | Поведение session соответствует policy и не ослабляет PKCE/OAuth requirements.                                                      |
| PWD-SIGNUP-016 | Signup при отказе обязательной delivery-зависимости | Flow завершается fail closed либо остается в явно восстанавливаемом непроверенном состоянии; полноценная session/token не выдаются. |

### 5.3. Email verification для password user

| ID             | Сценарий                                                      | Что должно быть проверено                                                                                                                |
| -------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| PWD-VERIFY-001 | Успешная verification по действующей ссылке                   | Проверяется только user целевой application; ссылка потребляется один раз.                                                               |
| PWD-VERIFY-002 | Повторное использование ссылки                                | Повтор не изменяет состояние и не создает новую session/authorization result.                                                            |
| PWD-VERIFY-003 | Истекшая ссылка                                               | Verification отклоняется без изменения user.                                                                                             |
| PWD-VERIFY-004 | Поврежденная/подмененная ссылка                               | Запрос fail closed; user не проверяется.                                                                                                 |
| PWD-VERIFY-005 | Verification token из A используется в B                      | Token не принимается, user A/B не изменяются.                                                                                            |
| PWD-VERIFY-006 | Verification link используется с client/context другого realm | Client/context substitution не переносит verification и не продолжает чужой OAuth flow.                                                  |
| PWD-VERIFY-007 | Повторный запрос verification                                 | Предыдущая и новая ссылки ведут себя согласно rotation contract; одновременно валидное неопределенное состояние исключено.               |
| PWD-VERIFY-008 | Verification уже verified user                                | Операция безопасна и не сбрасывает session/account state.                                                                                |
| PWD-VERIFY-009 | Signin unverified user при обязательной verification          | Полноценная application session, authorization code и tokens не выдаются.                                                                |
| PWD-VERIFY-010 | Signin verified user                                          | Verification gate больше не препятствует разрешенному password/OAuth flow.                                                               |
| PWD-VERIFY-011 | Delivery purpose verification                                 | Уходит только email verification link для правильной application и server-selected template; password reset/OTP purpose не используется. |
| PWD-VERIFY-012 | Секретность verification                                      | Link/token отсутствует в пользовательских ошибках, operational logs, audit, traces, metrics и browser storage.                           |

### 5.4. Password signin

| ID             | Сценарий                                                | Что должно быть проверено                                                                                                          |
| -------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| PWD-SIGNIN-001 | Успешный вход verified user                             | Создается session только в целевой application и продолжается только связанный authorization context.                              |
| PWD-SIGNIN-002 | Неверный пароль                                         | Session/code/token не создаются; ответ не раскрывает дополнительные account details.                                               |
| PWD-SIGNIN-003 | Несуществующий email                                    | Внешний status/schema/message эквивалентны неверному паролю существующего user в пределах утвержденного anti-enumeration contract. |
| PWD-SIGNIN-004 | Различный регистр/форма email                           | Identity разрешается строго по принятой normalization policy, без дубликата или обхода rate limit.                                 |
| PWD-SIGNIN-005 | Пароль Application A используется в B                   | Вход не происходит, даже если в B существует user с тем же email и другим паролем.                                                 |
| PWD-SIGNIN-006 | Пароль A и совпадающий email/password в B               | Создаются две независимые sessions, каждая принадлежит своему realm.                                                               |
| PWD-SIGNIN-007 | Заблокированный user                                    | Новый signin запрещен; session/code/token не создаются.                                                                            |
| PWD-SIGNIN-008 | User блокируется во время signin                        | Race разрешается fail closed: после применения блокировки действующая авторизация не завершается token issuance.                   |
| PWD-SIGNIN-009 | Disabled application/client/organization во время flow  | Продолжение flow отклоняется при live recheck; authorization result не выдается.                                                   |
| PWD-SIGNIN-010 | Malformed credential payload                            | Запрос отклоняется без auth side effect и без отражения входных секретов в ответе.                                                 |
| PWD-SIGNIN-011 | Duplicate security fields                               | Неоднозначный email/password/context не объединяется и отклоняется.                                                                |
| PWD-SIGNIN-012 | Повторная отправка signin form                          | Не создается неконтролируемое число sessions и не переиспользуется authorization context.                                          |
| PWD-SIGNIN-013 | Вход без OAuth context, если standalone signin разрешен | Возникает только application session; OAuth code/token без authorize flow не выдается.                                             |
| PWD-SIGNIN-014 | Platform/admin session на application auth route        | Platform identity не принимается как application user и не дает вход/consent/client management.                                    |

### 5.5. Forgot/reset password

| ID            | Сценарий                                      | Что должно быть проверено                                                                                                                               |
| ------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PWD-RESET-001 | Reset request существующего user              | Возвращается generic response и создается одноразовый reset flow только в целевой application.                                                          |
| PWD-RESET-002 | Reset request несуществующего email           | Status/schema/message не раскрывают отсутствие account и не создают user.                                                                               |
| PWD-RESET-003 | Reset одного email в A и B                    | Каждая ссылка изменяет пароль только соответствующего realm.                                                                                            |
| PWD-RESET-004 | Reset token A используется в B                | Новый пароль не применяется ни к A, ни к B.                                                                                                             |
| PWD-RESET-005 | Успешное завершение reset                     | Старый пароль перестает работать, новый работает только в целевой application.                                                                          |
| PWD-RESET-006 | Повторное использование reset link            | Повтор отклоняется и не меняет пароль второй раз.                                                                                                       |
| PWD-RESET-007 | Истекшая reset link                           | Пароль и session state не изменяются.                                                                                                                   |
| PWD-RESET-008 | Поврежденная/подмененная reset link           | Операция fail closed без раскрытия user/token details.                                                                                                  |
| PWD-RESET-009 | Новый пароль нарушает policy                  | Reset не завершается, ссылка не приводит к слабому или усеченному паролю.                                                                               |
| PWD-RESET-010 | Новый пароль совпадает со старым              | Поведение соответствует утвержденной password policy и не создает ложного успешного результата.                                                         |
| PWD-RESET-011 | Конкурентное использование одной ссылки       | Только одно завершение может быть успешным; итоговый password state однозначен.                                                                         |
| PWD-RESET-012 | Повторный reset request                       | Rotation/invalidation предыдущей ссылки соответствует contract и не оставляет несколько неопределенно действующих secrets.                              |
| PWD-RESET-013 | Reset blocked user                            | Reset не становится способом снять блокировку или получить session/token.                                                                               |
| PWD-RESET-014 | Reset при закрытой регистрации                | Existing user может завершить разрешенный reset; новый user не создается.                                                                               |
| PWD-RESET-015 | Reset при disabled application/organization   | Request и completion прекращаются, ранее выданная ссылка не обходит disable.                                                                            |
| PWD-RESET-016 | Reset инвалидирует существующие sessions      | Все sessions, которые policy обязана отозвать после смены password, перестают проходить live validation; sessions других applications не затрагиваются. |
| PWD-RESET-017 | Delivery purpose reset                        | Уходит только password reset link с server-selected template правильной application; verification/OTP purpose не используется.                          |
| PWD-RESET-018 | Delivery timeout/rejection/malformed response | Пользователь получает generic временную ошибку; link/token не раскрывается, inline duplicate delivery не возникает.                                     |
| PWD-RESET-019 | Секретность reset                             | Email, link/token и новый password отсутствуют в URL после consumption, logs, traces, metrics, audit и browser storage.                                 |

### 5.6. Authorization Code + PKCE после password signin

| ID            | Сценарий                                       | Что должно быть проверено                                                                                                                                 |
| ------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PWD-OAUTH-001 | Public client: полный положительный flow       | Password signin приводит к одноразовому authorization code; code + S256 verifier выдают ожидаемые ID/access/refresh tokens.                               |
| PWD-OAUTH-002 | Confidential client: полный положительный flow | Требуются одновременно client authentication и S256 PKCE; password не передается OAuth client/token endpoint.                                             |
| PWD-OAUTH-003 | Отсутствующий PKCE challenge                   | Authorization не начинается/не завершается выдачей code.                                                                                                  |
| PWD-OAUTH-004 | Метод PKCE не S256                             | Запрос отклоняется.                                                                                                                                       |
| PWD-OAUTH-005 | Неверный/отсутствующий verifier                | Code exchange не выдает tokens и не делает code пригодным для обходного обмена.                                                                           |
| PWD-OAUTH-006 | Повторный обмен code                           | Второй обмен отклоняется.                                                                                                                                 |
| PWD-OAUTH-007 | Code A обменивается через issuer/client B      | Tokens не выдаются; code не мигрирует между realms.                                                                                                       |
| PWD-OAUTH-008 | Client A используется на issuer B              | Authorization отклоняется до password flow или до выдачи code.                                                                                            |
| PWD-OAUTH-009 | Redirect URI exact match                       | Разрешен только зарегистрированный URI; prefix, wildcard, case/encoding tricks и добавление query не принимаются как совпадение.                          |
| PWD-OAUTH-010 | Неверный redirect URI в ошибочном запросе      | Ошибка не перенаправляется на непроверенный URI.                                                                                                          |
| PWD-OAUTH-011 | State round trip                               | Успешный flow возвращает исходный state без подмены; mismatch не принимается клиентским flow.                                                             |
| PWD-OAUTH-012 | Nonce binding                                  | ID token содержит ожидаемый nonce; чужой/отсутствующий nonce не принимается.                                                                              |
| PWD-OAUTH-013 | Единственный canonical resource                | Authorize, code exchange и refresh требуют exact resource текущей application.                                                                            |
| PWD-OAUTH-014 | Missing/empty/duplicate/foreign resource       | Запрос возвращает `invalid_target`, не достигает token issuance и не создает opaque fallback.                                                             |
| PWD-OAUTH-015 | Resource A с issuer/client B                   | Access token не выдается и audience не расширяется.                                                                                                       |
| PWD-OAUTH-016 | Разрешенные scopes                             | Tokens содержат только фактически разрешенные и выданные scopes/claims.                                                                                   |
| PWD-OAUTH-017 | Неизвестный scope                              | Запрос отклоняется или scope не выдается строго по protocol policy; silent privilege expansion исключен.                                                  |
| PWD-OAUTH-018 | `client_credentials`                           | Ни public, ни confidential client не получает userless token.                                                                                             |
| PWD-OAUTH-019 | Password/implicit grant                        | Устаревшие grants не рекламируются и не выдают tokens.                                                                                                    |
| PWD-OAUTH-020 | Claims ID token                                | Проверяются signature, `iss`, client `aud`, `sub`, `exp`, `iat`, `auth_time`, nonce и допустимые email claims.                                            |
| PWD-OAUTH-021 | Claims access token                            | Проверяются signature, `iss`, exact resource `aud`, `sub`, `client_id`, scopes, `application_id`, `actor_type=application_user`, сроки и session binding. |
| PWD-OAUTH-022 | Отсутствие лишних claims                       | Tokens не содержат password/account secrets, provider tokens, platform/admin roles или claims другого application user.                                   |
| PWD-OAUTH-023 | JWKS isolation                                 | Token A валидируется ключами issuer A и не валидируется как token issuer B.                                                                               |
| PWD-OAUTH-024 | Consent binding                                | Consent относится к exact user/application/client/scopes/resource и не переносится в другой realm/client.                                                 |
| PWD-OAUTH-025 | Authorization context expiry                   | Истекший context не продолжает signin/consent/code issuance.                                                                                              |
| PWD-OAUTH-026 | Authorization context one-time use             | Повторное продолжение/submit не создает второй code.                                                                                                      |
| PWD-OAUTH-027 | Context substitution/fixation                  | Context другого browser, client или application не может быть присоединен к текущей password session.                                                     |
| PWD-OAUTH-028 | Application/client disable после code issuance | Обмен code выполняет live-state policy и не выдает tokens при уже запрещенном actor/client/realm.                                                         |
| PWD-OAUTH-029 | User block после code issuance                 | Code exchange не обходит блокировку user.                                                                                                                 |
| PWD-OAUTH-030 | Raw request ambiguity                          | Duplicate protocol parameters, malformed form, неверные encoding/content type и oversized body отклоняются без token issuance.                            |

### 5.7. Session, refresh, revoke и logout

| ID           | Сценарий                                                  | Что должно быть проверено                                                                                               |
| ------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| PWD-SESS-001 | Session cookie после signin                               | Cookie имеет ожидаемые Secure/HttpOnly/SameSite/host-only/path attributes и ограничена текущим realm.                   |
| PWD-SESS-002 | Cookie A отправляется в B                                 | Session A не аутентифицирует user в B и не изменяется в результате запроса B.                                           |
| PWD-SESS-003 | Одновременные sessions A и B                              | Logout/revoke/rotation в одном realm не уничтожают session другого realm.                                               |
| PWD-SESS-004 | Session expiry                                            | Истекшая session не продолжает authorize/consent и не проходит live validation.                                         |
| PWD-SESS-005 | Session revoke                                            | Отозванная session немедленно или в пределах зафиксированного SLA становится неактивной.                                |
| PWD-SESS-006 | User block                                                | Все sessions заблокированного user целевой application отзываются; одноименный user другого realm не затрагивается.     |
| PWD-SESS-007 | Realm secret rotation                                     | Sessions/contexts/verifications/token families целевой application отзываются; другие applications продолжают работать. |
| PWD-SESS-008 | Refresh success                                           | Новый access token сохраняет user, issuer, audience, client и scopes исходного grant.                                   |
| PWD-SESS-009 | Refresh rotation                                          | Использованный refresh token больше не принимается.                                                                     |
| PWD-SESS-010 | Refresh replay                                            | Replay не выдает новый token и обрабатывается согласно family revocation policy.                                        |
| PWD-SESS-011 | Refresh token A на issuer/client B                        | Token не принимается и family A не переносится в B.                                                                     |
| PWD-SESS-012 | Refresh без exact resource                                | Запрос отклоняется до rotation; существующий refresh token не расходуется ошибочно.                                     |
| PWD-SESS-013 | Disabled client/application/organization/user при refresh | Новый access token не выдается.                                                                                         |
| PWD-SESS-014 | Revoke refresh token                                      | Последующий refresh невозможен; token другого realm остается действующим.                                               |
| PWD-SESS-015 | End-session с зарегистрированным URI                      | Сессия целевого realm завершается и redirect выполняется только на зарегистрированный URI.                              |
| PWD-SESS-016 | End-session с чужим/незарегистрированным URI              | Open redirect отсутствует; чужая session не завершается.                                                                |
| PWD-SESS-017 | Logout A при активной B                                   | Cookie/session B остается действующей.                                                                                  |
| PWD-SESS-018 | Несколько `Set-Cookie`                                    | Все security cookies устанавливаются/очищаются независимо и не схлопываются transport layer.                            |

### 5.8. Полная application isolation

Каждый класс security artifact должен проходить одинаковую матрицу
`create/use/read/update/revoke/consume` с подстановкой application A → B и A → A2.

| ID          | Сценарий                                | Что должно быть проверено                                                                                                |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| PWD-ISO-001 | User ID substitution                    | User A нельзя получить, изменить, проверить, заблокировать или использовать из realm B через публичный auth flow.        |
| PWD-ISO-002 | Account ID substitution                 | Password account A не читается и не используется adapter/context B.                                                      |
| PWD-ISO-003 | Session ID/cookie substitution          | Session A не принимается, не продлевается и не отзывается как session B.                                                 |
| PWD-ISO-004 | Verification token substitution         | Verification/reset artifact A не потребляется в B.                                                                       |
| PWD-ISO-005 | Authorization context substitution      | Context A не продолжается и не раскрывается в B.                                                                         |
| PWD-ISO-006 | Authorization code substitution         | Code A не обменивается в B или client B.                                                                                 |
| PWD-ISO-007 | Access token substitution               | Token A не проходит validation при expected application/audience B.                                                      |
| PWD-ISO-008 | Refresh token/family substitution       | Refresh/revoke в B не действует на family A и не выдает token B.                                                         |
| PWD-ISO-009 | Consent substitution                    | Consent A не устраняет consent и не расширяет scopes клиента B.                                                          |
| PWD-ISO-010 | OAuth client substitution               | Client A не используется через issuer/route B.                                                                           |
| PWD-ISO-011 | Signing key substitution                | Key/JWKS A не подписывает и не валидирует issuer B.                                                                      |
| PWD-ISO-012 | Canonical resource substitution         | Resource A всегда отклоняется в B; resources детерминированы и различны.                                                 |
| PWD-ISO-013 | Route/input/JWT disagreement            | Любое расхождение application identity между route, client, context и token отклоняется fail closed.                     |
| PWD-ISO-014 | Cache isolation                         | Успешный/негативный auth или validation cache A не влияет на user/token с тем же идентификатором в B.                    |
| PWD-ISO-015 | Rate-limit isolation                    | Активность identity в A не расходует identity quota одноименного user в B, кроме явно глобальной IP-защиты.              |
| PWD-ISO-016 | Delivery isolation                      | Verification/reset message использует profile/template/branding только целевой application.                              |
| PWD-ISO-017 | Audit isolation                         | Security event содержит правильные organization/application/client bindings и не смешивает actor/artifact другого realm. |
| PWD-ISO-018 | Same-organization applications          | Все предыдущие запреты сохраняются между A и A2 без исключений для общего organization owner.                            |
| PWD-ISO-019 | Ошибка/timeout repository или cache     | Система не делает permissive fallback без application scope.                                                             |
| PWD-ISO-020 | Массовая параллельная активность realms | Между concurrent flows A/B не возникает утечки cookie, context, code, token, key или delivery payload.                   |

### 5.9. Browser и transport security

| ID          | Сценарий                                         | Что должно быть проверено                                                                                                                             |
| ----------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| PWD-WEB-001 | CSRF на signup/signin/reset/consent/logout forms | Cross-site или отсутствующий/повторно использованный token отклоняется без изменения состояния.                                                       |
| PWD-WEB-002 | Origin enforcement                               | Разрешен только exact configured origin; wildcard, sibling subdomain и похожий origin не принимаются.                                                 |
| PWD-WEB-003 | Host header poisoning                            | Host/forwarded host не меняют issuer, callback, link origin, metadata или cookie realm.                                                               |
| PWD-WEB-004 | Недоверенные proxy headers                       | Не влияют на canonical URL и не позволяют обойти IP rate limit.                                                                                       |
| PWD-WEB-005 | Path normalization attacks                       | Encoded slash/backslash, duplicate slash, dot-segment, invalid UTF-8, NUL и double encoding не обходят default-deny policy.                           |
| PWD-WEB-006 | Content type/encoding policy                     | Неожиданный content type, charset, content encoding или malformed form отклоняется до credential processing.                                          |
| PWD-WEB-007 | Body size limit                                  | Oversized auth request отклоняется контролируемо и не достигает credential/token processing.                                                          |
| PWD-WEB-008 | Security headers hosted UI                       | Проверяются CSP, `frame-ancestors`, `base-uri`, `form-action`, `nosniff`, `no-referrer` и `no-store`.                                                 |
| PWD-WEB-009 | Clickjacking                                     | Hosted auth pages нельзя встроить во внешний frame.                                                                                                   |
| PWD-WEB-010 | Branding injection                               | Текст, logo URL и color values не позволяют внедрить HTML/JS/CSS или изменить form destination.                                                       |
| PWD-WEB-011 | Browser storage                                  | Password, tokens, authorization code/verifier, verification/reset link не появляются в local/session storage, IndexedDB или browser-readable cookies. |
| PWD-WEB-012 | URL leakage                                      | Password, reset/verification token после consumption, access/refresh token и code verifier не остаются в URL/history/referrer.                        |
| PWD-WEB-013 | Cache behavior                                   | HTML/form/error responses с auth context и PII не кэшируются browser/proxy.                                                                           |
| PWD-WEB-014 | CORS preflight/response                          | Только разрешенные origins, methods и headers получают положительный CORS contract; credentials не сочетаются с wildcard.                             |
| PWD-WEB-015 | Admin/public boundary                            | Публичный application user/session не получает доступ к internal Admin GraphQL из-за общего listener.                                                 |
| PWD-WEB-016 | Well-known boundary                              | Разрешенные metadata paths работают, широкие/неизвестные `/.well-known/*` paths не публикуются.                                                       |
| PWD-WEB-017 | Error rendering                                  | Введенные email/branding/protocol values экранируются и не создают reflected XSS.                                                                     |
| PWD-WEB-018 | Locale fallback                                  | Неизвестная locale безопасно переходит на allowlisted fallback без внешнего executable bundle.                                                        |

### 5.10. Rate limits, brute force и anti-enumeration

| ID            | Сценарий                                        | Что должно быть проверено                                                                                                            |
| ------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| PWD-ABUSE-001 | Identity limit password signin                  | После baseline лимита дальнейшие попытки ограничиваются для application + normalized identity без раскрытия account existence.       |
| PWD-ABUSE-002 | IP limit password signin                        | Распределенные попытки по разным email с одного IP достигают IP limit.                                                               |
| PWD-ABUSE-003 | Нормализация rate-limit identity                | Варианты регистра/нормализации email не обходят identity limit.                                                                      |
| PWD-ABUSE-004 | Realm-scoped limiter key                        | Попытки в A не расходуют identity limit B; key не содержит raw email.                                                                |
| PWD-ABUSE-005 | Shared limiter across replicas                  | Чередование запросов между replicas не увеличивает допустимый baseline.                                                              |
| PWD-ABUSE-006 | Reset identity/hour limit                       | Повторные reset requests ограничиваются согласно baseline.                                                                           |
| PWD-ABUSE-007 | Reset IP/hour и identity/day limits             | Распределенные запросы не обходят совокупные окна.                                                                                   |
| PWD-ABUSE-008 | Rate-limit response                             | Возвращается generic error и корректный `Retry-After` без account enumeration.                                                       |
| PWD-ABUSE-009 | Limiter unavailable для reset                   | Reset fail closed; message/link не создается и не раскрывается наличие account.                                                      |
| PWD-ABUSE-010 | Limiter unavailable для signin                  | Применяется утвержденная аварийная policy без permissive unlimited fallback и создается operational signal.                          |
| PWD-ABUSE-011 | Existing vs absent email response               | Signin failure и reset request не различаются по status/schema/message в пределах contract.                                          |
| PWD-ABUSE-012 | Timing anti-enumeration                         | После прогрева не возникает практически значимого стабильного различия между existing/absent identity сверх утвержденного threshold. |
| PWD-ABUSE-013 | Locked/disabled/unverified identity enumeration | Публичная ошибка не раскрывает внутреннюю причину больше, чем допускает product contract.                                            |
| PWD-ABUSE-014 | Parallel brute force                            | Конкурентные запросы атомарно учитываются и не превышают limit из-за races.                                                          |
| PWD-ABUSE-015 | Successful signin и counters                    | Успех не позволяет сбросить независимые IP/abuse counters способом, создающим brute-force bypass.                                    |

### 5.11. Live validation и fail-closed behavior

| ID           | Сценарий                                  | Что должно быть проверено                                                                                            |
| ------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| PWD-LIVE-001 | Валидный token и активный state           | Validation возвращает active только при совпадении signature/issuer/audience/application/user/client/session/family. |
| PWD-LIVE-002 | User block/unblock                        | Block делает tokens/sessions inactive в пределах SLA; unblock не оживляет отозванные artifacts автоматически.        |
| PWD-LIVE-003 | Session revoke                            | Связанный token перестает проходить validation согласно policy.                                                      |
| PWD-LIVE-004 | Client disable                            | Tokens/refresh client перестают считаться active; другой client того же realm не затрагивается.                      |
| PWD-LIVE-005 | Realm/application disable                 | Все tokens realm становятся inactive без удаления users; другой realm продолжает работать.                           |
| PWD-LIVE-006 | Organization disable                      | Tokens всех дочерних applications inactive; unrelated organization не затронута.                                     |
| PWD-LIVE-007 | Token family revoke                       | Семейство inactive, соседнее семейство остается согласованным с policy.                                              |
| PWD-LIVE-008 | Потеря invalidation event                 | Database revision fallback применяет запрет не позднее предельного SLA.                                              |
| PWD-LIVE-009 | Database/cache timeout                    | Validation возвращает inactive, а не cached permissive success за пределами разрешенного TTL.                        |
| PWD-LIVE-010 | Unknown signing/encryption key version    | Startup/request/validation fail closed; default secret/key не используется.                                          |
| PWD-LIVE-011 | Token с отсутствующим обязательным claim  | Validation inactive.                                                                                                 |
| PWD-LIVE-012 | Token с неверным actor type или без `sub` | Userless/non-application actor не принимается.                                                                       |
| PWD-LIVE-013 | Expected application/audience mismatch    | Token криптографически валиден, но возвращается inactive.                                                            |
| PWD-LIVE-014 | Внешний introspection error               | Внешний ответ не раскрывает внутреннюю reason category или tenant details.                                           |

### 5.12. Delivery, audit и redaction

| ID          | Сценарий                                   | Что должно быть проверено                                                                                                                             |
| ----------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| PWD-OBS-001 | Signin success/failure events              | События имеют правильные realm/client/outcome bindings без raw email/password.                                                                        |
| PWD-OBS-002 | Reset/verification events                  | События не содержат link, token, recipient или template payload.                                                                                      |
| PWD-OBS-003 | Invalid redirect/state/nonce/PKCE/resource | Фиксируется безопасная reason category без полного URL/query/code/verifier.                                                                           |
| PWD-OBS-004 | Cross-tenant rejection                     | Создается security signal с A/B scope в allowlisted opaque форме без утечки artifacts.                                                                |
| PWD-OBS-005 | Rate-limit event/metric                    | Нет raw email, user ID, IP в недопустимом виде или high-cardinality secret labels.                                                                    |
| PWD-OBS-006 | Error response snapshot                    | Response не содержит stack trace, SQL, internal IDs, password hash, secrets или tenant configuration.                                                 |
| PWD-OBS-007 | Logs/traces/metrics snapshot               | Password, authorization code, verifier, access/refresh token, session cookie, reset/verification URL и client secret отсутствуют.                     |
| PWD-OBS-008 | Delivery routing                           | Verification и reset используют разные server-controlled purposes/templates и application delivery profile.                                           |
| PWD-OBS-009 | Delivery idempotency                       | Повтор/retry не создает неконтролируемые дубликаты; idempotency key не содержит PII/secret.                                                           |
| PWD-OBS-010 | Operational event sink unavailable         | Authentication behavior следует утвержденному contract; отказ наблюдаемости не раскрывает секреты и создает durable error signal, если предусмотрено. |

## 6. Комбинационная матрица обязательных прогонов

Не каждый сценарий требуется механически умножать на все параметры. Следующие комбинации
обязательны, потому что меняют security semantics:

| Измерение            | Обязательные значения                                         |
| -------------------- | ------------------------------------------------------------- |
| Application relation | другая organization; та же organization, другая application   |
| OAuth client         | public; confidential; disabled; чужой realm                   |
| Registration         | open; disabled                                                |
| Password flags       | `signup on/signin on`; `on/off`; `off/on`; `off/off`          |
| Password reset       | enabled; disabled                                             |
| Email verification   | required; not required                                        |
| User state           | absent; active verified; active unverified; blocked           |
| Realm state          | active; application disabled; organization disabled           |
| Artifact state       | valid; expired; consumed; revoked; malformed; foreign realm   |
| Request channel      | hosted browser flow; разрешенный direct public HTTP contract  |
| Concurrency          | single request; duplicate; parallel race; cross-replica limit |

## 7. Требования к результату каждого e2e-сценария

Каждый реализованный тест должен проверять не только HTTP/HTML success или error, но все применимые
последствия:

- внешний status, protocol error и безопасную форму ответа;
- redirect только на проверенный URI;
- наличие или отсутствие user/account/session/context/code/token/verification side effects;
- правильный `applicationId`, `organizationId`, `clientId`, user и resource binding;
- cookie и browser state;
- одноразовость, TTL, revoke/rotation semantics;
- delivery side effect и его purpose;
- security event/audit/metric без запрещенных данных;
- отсутствие изменений в чужой application;
- повторное поведение после ошибки или replay.

Положительный ответ без проверки состояния и отрицательный ответ без проверки отсутствия side
effects не считаются достаточным e2e-покрытием security contract.

## 8. Приоритет реализации

### P0 — блокирует включение password auth

- все `PWD-BOUND`, `PWD-SIGNIN`, `PWD-OAUTH`, `PWD-SESS` базовые positive/negative flows;
- вся `PWD-ISO` матрица;
- CSRF, redirect/resource/PKCE, cookie isolation и default-deny routes;
- signup/signin/reset flags и `registration_mode`;
- block/disable/revoke live-state flows;
- password/reset/verification secret redaction;
- signin/reset rate limits и anti-enumeration;
- fail-closed при недоступности limiter/key/database для security-sensitive операций.

### P1 — обязательно до release candidate

- полная verification/reset edge matrix;
- concurrency/replay/race scenarios;
- timing anti-enumeration;
- cross-replica limits и invalidation fallback SLA;
- полный observability snapshot;
- accessibility/locale/branding security cases.

## 9. Критерий полного покрытия

Password-аутентификация считается полностью покрытой e2e только если одновременно выполнены условия:

1. Все применимые P0 и P1 сценарии реализованы и стабильны.
2. Каждый security artifact проверен на cross-application substitution между разными и одинаковыми
   organizations.
3. Все отрицательные сценарии подтверждают отсутствие state changes и delivery/token side effects.
4. Полный public password OAuth flow проходит для public и confidential clients с S256 PKCE.
5. Ни один flow не выдает token через password grant, implicit flow или `client_credentials`.
6. Signup/signin/reset/verification gates нельзя обойти прямым HTTP запросом, stale UI, cookie или
   чужим context.
7. Block, revoke, application/client/organization disable и realm-secret rotation соблюдают
   заявленный propagation SLA.
8. Rate limits работают атомарно и одинаково через все IAM replicas.
9. Anti-enumeration contract подтвержден по response и timing.
10. Security headers, CSRF, cookie scope, CORS, redirect/resource policy и route normalization
    проверены негативной матрицей.
11. Logs, traces, metrics, audit, browser storage и error snapshots не содержат запрещенных
    credentials/tokens/PII.
12. После появления Admin GraphQL те же сценарии проходят с состоянием, подготовленным через
    поддерживаемый management contract, без изменения ожидаемого runtime поведения.

## 10. Отложенная привязка к GraphQL

Когда Admin GraphQL будет готов, для этого документа добавляется отдельная traceability-таблица:

```text
E2E case ID → management capability → GraphQL operation → permission → fixture
```

До этого момента запрещено привязывать security-кейсы к предположительным именам mutations/queries.
GraphQL должен лишь подготавливать или изменять состояние application auth; проверяемые
password/OAuth/security invariants из настоящего документа остаются транспортно независимыми.
