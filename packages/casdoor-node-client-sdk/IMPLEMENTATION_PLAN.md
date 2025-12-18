# @shopana/casdoor-nodejs-client-sdk - Implementation Plan

## Overview

Creating a unified Node.js SDK for Casdoor that combines:
1. **casdoor-nodejs-sdk** - official server-side SDK with user management, tokens, and resources methods
2. **casdoor-js-sdk** - client-side methods (OAuth flows, JWT parsing), adapted for Node.js

## Dependency Analysis

### casdoor-nodejs-sdk (server-side)
Provides:
- User management (CRUD)
- Authentication (`getAuthToken`, `refreshToken`, `parseJwtToken`)
- MFA methods
- Resource management (organizations, applications, roles, permissions, etc.)

### casdoor-js-sdk (browser-side)
Browser dependencies to remove:
| Dependency | File:line | Usage |
|-------------|-------------|---------------|
| `window.location.origin` | sdk.ts:184 | PKCE constructor |
| `window.location.href` | sdk.ts:332 | exchangeForAccessToken |
| `window.location.search` | sdk.ts:245,270 | signin, isSilentSigninRequested |
| `sessionStorage` | sdk.ts:193-204,209 | State management |
| `window.open` | sdk.ts:303 | popupSignin |
| `document.createElement` | sdk.ts:275 | silentSignin (iframe) |
| `window.addEventListener` | sdk.ts:280,294,324 | Post-message listeners |
| `window.location.assign` | sdk.ts:328 | signin_redirect |
| `fetch` | sdk.ts:263,336 | HTTP requests |

Methods to port to Node.js:
- `getSignupUrl()` - URL generation (redirectUri must be passed as parameter)
- `getSigninUrl()` - authorization URL generation
- `getUserProfileUrl()` - user profile URL
- `getMyProfileUrl()` - own profile URL
- `getUserInfo(accessToken)` - get user information
- `parseAccessToken(token)` - JWT token parsing
- `refreshAccessToken(token)` - token refresh
- `exchangeForAccessToken(code)` - exchange code for token

Methods NOT to port (browser-only):
- `signin()` - requires window.location.search
- `isSilentSigninRequested()` - requires URL params from browser
- `silentSignin()` - iframe + postMessage
- `popupSignin()` - popup window
- `signin_redirect()` - browser navigation

## Package Architecture

```
packages/casdoor-node-client-sdk/
├── src/
│   ├── index.ts              # Main export
│   ├── client.ts             # Unified CasdoorClient class
│   ├── auth/
│   │   ├── index.ts
│   │   ├── sign-in.ts        # signIn, signInWithPassword, signInWithOAuthProvider
│   │   ├── sign-up.ts        # signUp, signUpWithOAuthProvider
│   │   └── oauth-providers.ts # getOAuthProviderUrl, handleOAuthCallback
│   ├── oauth/
│   │   ├── index.ts
│   │   ├── pkce.ts           # PKCE flow for Node.js (no browser deps)
│   │   ├── urls.ts           # URL builders (getSigninUrl, getSignupUrl, etc.)
│   │   └── token.ts          # Token operations (exchange, refresh, parse)
│   ├── api/
│   │   ├── index.ts
│   │   ├── user-info.ts      # getUserInfo method
│   │   └── http-client.ts    # Base HTTP client (fetch/undici)
│   ├── types/
│   │   ├── index.ts
│   │   ├── config.ts         # SdkConfig interface
│   │   ├── account.ts        # Account, Role, Permission interfaces
│   │   ├── jwt.ts            # JwtPayload, JwtHeader interfaces
│   │   └── auth.ts           # SignInResult, SignUpResult interfaces
│   └── storage/
│       ├── index.ts
│       └── memory.ts         # In-memory state storage (replaces sessionStorage)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Detailed Implementation Plan

### Stage 1: Basic Package Structure

1. **package.json**
   ```json
   {
     "name": "@shopana/casdoor-nodejs-client-sdk",
     "version": "1.0.0",
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "import": "./dist/index.js",
         "types": "./dist/index.d.ts"
       }
     },
     "dependencies": {
       "casdoor-nodejs-sdk": "^1.34.0",
       "jwt-decode": "^4.0.0"
     },
     "devDependencies": {
       "typescript": "^5.0.0",
       "vitest": "^1.0.0"
     }
   }
   ```

2. **tsconfig.json** - standard configuration for monorepo

### Stage 2: Types and Interfaces

1. **types/config.ts** - SDK configuration
   ```typescript
   export interface CasdoorClientConfig {
     // From casdoor-nodejs-sdk
     endpoint: string;        // Casdoor server URL
     clientId: string;
     clientSecret: string;
     certificate: string;     // JWT verification cert
     orgName: string;
     appName: string;

     // Additional for OAuth flows
     redirectUri?: string;    // Instead of window.location.origin
     scope?: string;          // default: "profile"
     signinPath?: string;     // default: "/api/signin"
   }
   ```

2. **types/account.ts** - copy from casdoor-js-sdk:
   - `Account`
   - `Role`
   - `Permission`

3. **types/jwt.ts** - from casdoor-js-sdk:
   - `JwtPayload`
   - `JwtHeader`
   - `ITokenResponse`

4. **types/auth.ts** - authentication results:
   ```typescript
   export interface SignInResult {
     success: boolean;
     accessToken?: string;
     refreshToken?: string;
     expiresIn?: number;
     user?: JwtPayload;
     error?: string;
   }

   export interface SignUpResult {
     success: boolean;
     user?: {
       id: string;
       username: string;
       email?: string;
     };
     error?: string;
     // If email/phone verification is required
     requiresVerification?: boolean;
     verificationType?: 'email' | 'phone';
   }
   ```

### Stage 3: Storage Abstraction

1. **storage/index.ts** - interface
   ```typescript
   export interface StateStorage {
     getState(): string | null;
     setState(state: string): void;
     clearState(): void;
   }
   ```

2. **storage/memory.ts** - in-memory implementation
   ```typescript
   export class MemoryStateStorage implements StateStorage {
     private state: string | null = null;
     // ... implementation
   }
   ```

### Stage 4: OAuth Module

1. **oauth/urls.ts** - URL builders (no browser deps)
   ```typescript
   export function getSignupUrl(config: CasdoorClientConfig, enablePassword?: boolean): string;
   export function getSigninUrl(config: CasdoorClientConfig, state: string): string;
   export function getUserProfileUrl(config: CasdoorClientConfig, userName: string, accessToken?: string): string;
   export function getMyProfileUrl(config: CasdoorClientConfig, accessToken?: string, returnUrl?: string): string;
   export function getAuthorizationUrl(config: CasdoorClientConfig, state: string, codeChallenge?: string): string;
   ```

2. **oauth/pkce.ts** - PKCE flow for Node.js
   ```typescript
   export class NodePKCE {
     generateCodeVerifier(): string;
     generateCodeChallenge(verifier: string): Promise<string>;
     getAuthorizationUrl(state: string): string;
     exchangeCodeForToken(code: string, codeVerifier: string): Promise<ITokenResponse>;
     refreshToken(refreshToken: string): Promise<ITokenResponse>;
   }
   ```

   Implementation via native Node.js `crypto` module instead of js-pkce.

3. **oauth/token.ts** - token operations
   ```typescript
   export function parseAccessToken(token: string): { header: JwtHeader; payload: JwtPayload };
   export async function exchangeForAccessToken(config: CasdoorClientConfig, code: string, codeVerifier?: string): Promise<ITokenResponse>;
   export async function refreshAccessToken(config: CasdoorClientConfig, refreshToken: string): Promise<ITokenResponse>;
   ```

### Stage 5: API Module

1. **api/http-client.ts** - base HTTP client (axios)
   ```typescript
   import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

   export class HttpClient {
     private client: AxiosInstance;

     constructor(config: {
       baseURL: string;
       clientId: string;
       clientSecret: string;
       timeout?: number;
     }) {
       this.client = axios.create({
         baseURL: config.baseURL,
         timeout: config.timeout || 60000,
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
         },
       });
     }

     async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
       const response = await this.client.get(url, config);
       return response.data;
     }

     async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
       const response = await this.client.post(url, data, config);
       return response.data;
     }

     async postForm<T>(url: string, data: URLSearchParams, config?: AxiosRequestConfig): Promise<T> {
       const response = await this.client.post(url, data.toString(), {
         ...config,
         headers: {
           ...config?.headers,
           'Content-Type': 'application/x-www-form-urlencoded',
         },
       });
       return response.data;
     }
   }
   ```
   Using axios as in the official `casdoor-nodejs-sdk`.

2. **api/user-info.ts**
   ```typescript
   export async function getUserInfo(config: CasdoorClientConfig, accessToken: string): Promise<JwtPayload>;
   ```

### Stage 5.5: Auth Module

#### How Authentication Methods Work (Casdoor API)

**1. signIn (OAuth Authorization Code Flow)**
```
Flow:
1. Frontend redirects user to: GET {serverUrl}/login/oauth/authorize?client_id=...&redirect_uri=...&state=...
2. User logs in on Casdoor UI
3. Casdoor redirects back to: {redirectUri}?code=xxx&state=xxx
4. Backend calls signIn() with code & state

API Call:
POST {serverUrl}/api/login/oauth/access_token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(clientId:clientSecret)

Body:
  grant_type=authorization_code
  code={code}
  redirect_uri={redirectUri}

Response:
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "xxx",
  "scope": "profile"
}
```

**2. signInWithPassword (Resource Owner Password Credentials)**
```
API Call:
POST {serverUrl}/api/login/oauth/access_token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(clientId:clientSecret)

Body:
  grant_type=password
  username={username}
  password={password}
  scope=profile

Response:
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "xxx"
}
```

**3. signUp (User Registration)**
```
API Call:
POST {serverUrl}/api/signup
Content-Type: application/json
Authorization: Basic base64(clientId:clientSecret)

Body:
{
  "application": "{appName}",
  "organization": "{orgName}",
  "username": "john_doe",
  "email": "john@example.com",
  "password": "xxx",
  "name": "John Doe",
  "firstName": "John",
  "lastName": "Doe"
}

Response:
{
  "status": "ok",
  "data": "Affected"
}
or
{
  "status": "error",
  "msg": "username already exists"
}
```

**4. signInWithOAuthProvider / signUpWithOAuthProvider**
```
Flow:
1. Get provider auth URL: GET {serverUrl}/api/get-app-login?clientId=...&provider=google
2. Redirect user to provider (Google, GitHub, etc.)
3. Provider redirects back with code
4. Exchange code for Casdoor token

API Call (after provider callback):
POST {serverUrl}/api/login/oauth/access_token
Content-Type: application/x-www-form-urlencoded

Body:
  grant_type=authorization_code
  code={providerCode}
  redirect_uri={redirectUri}
  provider={providerName}
```

**5. getOAuthProviderUrl**
```
Returns URL for OAuth provider redirect:
{serverUrl}/login/oauth/authorize?client_id={clientId}&response_type=code&redirect_uri={redirectUri}&scope=profile&state={state}&provider={provider}
```

#### Module Implementation

1. **auth/sign-in.ts** - sign-in methods
   ```typescript
   // OAuth callback handling (code + state -> token)
   export async function signIn(
     config: CasdoorClientConfig,
     httpClient: HttpClient,
     params: { code: string; state: string; expectedState?: string }
   ): Promise<SignInResult> {
     // 1. Validate state (CSRF protection)
     if (params.expectedState && params.state !== params.expectedState) {
       return { success: false, error: 'Invalid state parameter' };
     }

     // 2. Exchange code for token
     const tokenResponse = await httpClient.post(
       '/api/login/oauth/access_token',
       new URLSearchParams({
         grant_type: 'authorization_code',
         code: params.code,
         redirect_uri: config.redirectUri,
       }),
       { Authorization: `Basic ${base64(config.clientId + ':' + config.clientSecret)}` }
     );

     // 3. Parse JWT to get user info
     const user = parseJwt(tokenResponse.access_token);

     return {
       success: true,
       accessToken: tokenResponse.access_token,
       refreshToken: tokenResponse.refresh_token,
       expiresIn: tokenResponse.expires_in,
       user,
     };
   }

   // Password sign-in (Resource Owner Password Credentials Grant)
   export async function signInWithPassword(
     config: CasdoorClientConfig,
     httpClient: HttpClient,
     params: { username: string; password: string }
   ): Promise<SignInResult> {
     const tokenResponse = await httpClient.post(
       '/api/login/oauth/access_token',
       new URLSearchParams({
         grant_type: 'password',
         username: params.username,
         password: params.password,
         scope: 'profile',
       }),
       { Authorization: `Basic ${base64(config.clientId + ':' + config.clientSecret)}` }
     );

     const user = parseJwt(tokenResponse.access_token);
     return { success: true, accessToken: tokenResponse.access_token, user, ... };
   }

   // Sign-in via OAuth provider (Google, GitHub, etc.)
   export async function signInWithOAuthProvider(
     config: CasdoorClientConfig,
     httpClient: HttpClient,
     params: { provider: string; code: string; state?: string }
   ): Promise<SignInResult>;
   ```

2. **auth/sign-up.ts** - registration methods
   ```typescript
   // New user registration
   export async function signUp(
     config: CasdoorClientConfig,
     httpClient: HttpClient,
     params: {
       username: string;
       email?: string;
       phone?: string;
       password: string;
       displayName?: string;
       firstName?: string;
       lastName?: string;
     }
   ): Promise<SignUpResult> {
     const response = await httpClient.post('/api/signup', {
       application: config.appName,
       organization: config.orgName,
       username: params.username,
       email: params.email,
       phone: params.phone,
       password: params.password,
       name: params.displayName || params.username,
       firstName: params.firstName,
       lastName: params.lastName,
     });

     if (response.status === 'error') {
       return { success: false, error: response.msg };
     }

     return {
       success: true,
       user: { id: response.data, username: params.username, email: params.email },
       requiresVerification: response.data2?.requiresVerification,
       verificationType: response.data2?.verificationType,
     };
   }

   // Registration via OAuth provider
   export async function signUpWithOAuthProvider(...): Promise<SignInResult>;
   ```

3. **auth/oauth-providers.ts** - working with OAuth providers
   ```typescript
   // Get URL for OAuth provider
   export function getOAuthProviderUrl(
     config: CasdoorClientConfig,
     params: { provider: string; redirectUri: string; state?: string }
   ): string {
     const state = params.state || crypto.randomUUID();
     return `${config.endpoint}/login/oauth/authorize?` +
       `client_id=${config.clientId}` +
       `&response_type=code` +
       `&redirect_uri=${encodeURIComponent(params.redirectUri)}` +
       `&scope=profile` +
       `&state=${state}` +
       `&provider=${params.provider}`;
   }
   ```

### Stage 6: Unified Client

**client.ts** - main class combining everything
```typescript
import { SDK as CasdoorNodeSDK } from 'casdoor-nodejs-sdk';

export class CasdoorClient {
  private nodeSDK: CasdoorNodeSDK;
  private config: CasdoorClientConfig;
  private storage: StateStorage;
  private pkce: NodePKCE;

  constructor(config: CasdoorClientConfig, storage?: StateStorage);

  // === Methods from casdoor-nodejs-sdk (proxied) ===

  // Auth
  getAuthToken(code: string): Promise<string>;
  refreshToken(refreshToken: string, scope?: string): Promise<any>;
  parseJwtToken(token: string): JwtPayload;

  // User Management
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User>;
  getUserCount(isOnline: boolean): Promise<number>;
  addUser(user: User): Promise<any>;
  updateUser(user: User): Promise<any>;
  deleteUser(user: User): Promise<any>;
  setPassword(data: SetPassword): Promise<any>;

  // MFA
  initiateMfa(data: MfaData): Promise<any>;
  verifyMfa(data: MfaData, passcode: string): Promise<any>;
  enableMfa(data: MfaData): Promise<any>;
  deleteMfa(owner: string, name: string): Promise<any>;

  // ... other methods from nodejs-sdk

  // === Methods from casdoor-js-sdk (adapted) ===

  // URL Builders
  getSignupUrl(enablePassword?: boolean): string;
  getSigninUrl(): string;
  getUserProfileUrl(userName: string, accessToken?: string): string;
  getMyProfileUrl(accessToken?: string, returnUrl?: string): string;

  // === High-level authentication methods ===

  // SignIn - OAuth callback handling (code + state -> token)
  signIn(params: {
    code: string;
    state: string;
    expectedState?: string;  // for CSRF validation
  }): Promise<SignInResult>;

  // SignIn with password (Resource Owner Password Credentials)
  signInWithPassword(params: {
    username: string;  // or email
    password: string;
  }): Promise<SignInResult>;

  // SignUp - new user registration
  signUp(params: {
    username: string;
    email?: string;
    phone?: string;
    password: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<SignUpResult>;

  // SignUp via OAuth provider (Google, GitHub, etc.)
  signUpWithOAuthProvider(params: {
    provider: string;      // "google", "github", etc.
    code: string;          // OAuth code from provider
    state?: string;
  }): Promise<SignInResult>;

  // SignIn via OAuth provider
  signInWithOAuthProvider(params: {
    provider: string;
    code: string;
    state?: string;
  }): Promise<SignInResult>;

  // Get URL for OAuth provider
  getOAuthProviderUrl(params: {
    provider: string;
    redirectUri: string;
    state?: string;
  }): string;

  // OAuth Flow (low-level)
  getAuthorizationUrl(additionalParams?: Record<string, string>): { url: string; state: string; codeVerifier?: string };
  exchangeForAccessToken(code: string, codeVerifier?: string): Promise<ITokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<ITokenResponse>;

  // Token Operations
  parseAccessToken(token: string): { header: JwtHeader; payload: JwtPayload };

  // User Info
  getUserInfo(accessToken: string): Promise<JwtPayload>;

  // State Management
  getOrCreateState(): string;
  clearState(): void;
}
```

### Stage 7: Export and README

1. **index.ts**
   ```typescript
   export { CasdoorClient } from './client';
   export type { CasdoorClientConfig } from './types/config';
   export type { Account, Role, Permission } from './types/account';
   export type { JwtPayload, JwtHeader, ITokenResponse } from './types/jwt';
   export type { StateStorage } from './storage';
   export { MemoryStateStorage } from './storage/memory';
   ```

2. **README.md** - documentation with usage examples

## Usage

```typescript
import { CasdoorClient } from '@shopana/casdoor-nodejs-client-sdk';

const client = new CasdoorClient({
  endpoint: 'https://door.casdoor.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  certificate: 'your-certificate',
  orgName: 'your-org',
  appName: 'your-app',
  redirectUri: 'https://your-app.com/callback',
});

// ============================================
// SignUp - new user registration
// ============================================
const signUpResult = await client.signUp({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'securePassword123',
  displayName: 'John Doe',
});

if (signUpResult.requiresVerification) {
  // User must verify their email
  console.log('Please verify your email');
}

// ============================================
// SignIn - password authentication
// ============================================
const signInResult = await client.signInWithPassword({
  username: 'john@example.com',
  password: 'securePassword123',
});

if (signInResult.success) {
  console.log('Logged in!', signInResult.user);
  // signInResult.accessToken, signInResult.refreshToken
}

// ============================================
// SignIn - OAuth flow (for web applications)
// ============================================

// 1. Generate URL for user redirect
const signinUrl = client.getSigninUrl();
// -> Redirect user to signinUrl

// 2. After redirect back, handle callback
const result = await client.signIn({
  code: req.query.code,
  state: req.query.state,
  expectedState: savedState,  // from session/cookie
});

// ============================================
// SignIn via OAuth Provider (Google, GitHub)
// ============================================

// 1. Get URL for provider
const googleUrl = client.getOAuthProviderUrl({
  provider: 'google',
  redirectUri: 'https://your-app.com/oauth/google/callback',
  state: generatedState,
});

// 2. After callback from provider
const oauthResult = await client.signInWithOAuthProvider({
  provider: 'google',
  code: req.query.code,
  state: req.query.state,
});

// ============================================
// Working with tokens
// ============================================
const parsed = client.parseAccessToken(signInResult.accessToken);
const userInfo = await client.getUserInfo(signInResult.accessToken);

// Refresh token
const newTokens = await client.refreshAccessToken(signInResult.refreshToken);

// ============================================
// Methods from nodejs-sdk (user management)
// ============================================
const users = await client.getUsers();
const user = await client.getUser('user-id');
await client.updateUser({ ...user, displayName: 'New Name' });
await client.deleteUser(user);
```

## Execution Order

1. [ ] Create basic package structure (package.json, tsconfig.json)
2. [ ] Implement types/ module (config, account, jwt, auth)
3. [ ] Implement storage/ module
4. [ ] Implement api/http-client.ts
5. [ ] Implement oauth/urls.ts
6. [ ] Implement oauth/pkce.ts (Node.js PKCE without browser deps)
7. [ ] Implement oauth/token.ts
8. [ ] Implement api/user-info.ts
9. [ ] Implement auth/sign-in.ts (signIn, signInWithPassword, signInWithOAuthProvider)
10. [ ] Implement auth/sign-up.ts (signUp, signUpWithOAuthProvider)
11. [ ] Implement auth/oauth-providers.ts
12. [ ] Implement client.ts (unified client)
13. [ ] Write index.ts exports
14. [ ] Write tests
15. [ ] Write README.md

## Dependencies

```json
{
  "dependencies": {
    "casdoor-nodejs-sdk": "^1.34.0",
    "axios": "^1.7.0",
    "jwt-decode": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8",
    "@types/node": "^22.0.0"
  }
}
```

## Notes

- HTTP client: **axios** (as in the official `casdoor-nodejs-sdk`)
- All browser-specific methods (silentSignin, popupSignin, signin_redirect) will NOT be implemented
- State management via abstract StateStorage interface with default MemoryStateStorage
- PKCE flow implemented via native Node.js crypto module

---

## Advanced Use Cases (Future)

### Extended Methods from Casdoor Web UI

In the future, the SDK can be extended by taking logic from the Casdoor frontend (`casdoor/web/src/auth/`):

**Sources:**
- `https://github.com/casdoor/casdoor/tree/master/web/src/auth/LoginPage.js`
- `https://github.com/casdoor/casdoor/tree/master/web/src/auth/SignupPage.js`
- `https://github.com/casdoor/casdoor/tree/master/web/src/auth/ForgetPage.js`

**Potential methods:**

```typescript
// Email/phone verification
verifyCode(params: { type: 'email' | 'phone'; dest: string; code: string }): Promise<boolean>;
sendVerificationCode(params: { type: 'email' | 'phone'; dest: string }): Promise<void>;

// Password recovery
forgotPassword(params: { email: string }): Promise<void>;
resetPassword(params: { code: string; newPassword: string }): Promise<void>;

// MFA
setupMfa(params: { type: 'totp' | 'sms' }): Promise<{ secret: string; qrCode: string }>;
verifyMfa(params: { code: string }): Promise<boolean>;

// Linking OAuth providers with account
linkProvider(params: { provider: string; code: string }): Promise<void>;
unlinkProvider(params: { provider: string }): Promise<void>;

// WebAuthn / Passkeys
registerPasskey(): Promise<void>;
authenticateWithPasskey(): Promise<SignInResult>;
```

This will allow creating fully custom authentication forms on your own frontend, without redirecting to the Casdoor UI.
