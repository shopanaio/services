const configurationKey = "oauth.application.configuration";
const loginButton = document.querySelector('[data-testid="login-button"]');
const authenticatedSession = document.querySelector(
  '[data-testid="authenticated-session"]',
);
const oauthError = document.querySelector('[data-testid="oauth-error"]');

function readConfiguration() {
  const url = new URL(window.location.href);
  if (url.pathname === "/") {
    const configuration = {
      authorizeEndpoint: url.searchParams.get("authorize_endpoint"),
      tokenEndpoint: url.searchParams.get("token_endpoint"),
      userinfoEndpoint: url.searchParams.get("userinfo_endpoint"),
      clientId: url.searchParams.get("client_id"),
      redirectUri: url.searchParams.get("redirect_uri"),
      resource: url.searchParams.get("resource"),
    };
    if (Object.values(configuration).some((value) => !value)) {
      throw new Error("OAuth application configuration is incomplete");
    }
    sessionStorage.setItem(configurationKey, JSON.stringify(configuration));
    window.history.replaceState({}, "", "/");
    return configuration;
  }

  const stored = sessionStorage.getItem(configurationKey);
  if (!stored) {
    throw new Error("OAuth application configuration is missing");
  }
  return JSON.parse(stored);
}

function decodeJwtPayload(token) {
  const encoded = token.split(".")[1];
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(base64 + padding), (character) =>
        character.charCodeAt(0),
      ),
    ),
  );
}

function base64Url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

async function beginAuthorization(configuration) {
  const verifier =
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "");
  const state = crypto.randomUUID();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  sessionStorage.setItem("oauth.pkce.verifier", verifier);
  sessionStorage.setItem("oauth.state", state);

  const authorize = new URL(configuration.authorizeEndpoint);
  authorize.search = new URLSearchParams({
    client_id: configuration.clientId,
    response_type: "code",
    redirect_uri: configuration.redirectUri,
    scope: "openid profile email offline_access",
    state,
    nonce: crypto.randomUUID(),
    code_challenge: base64Url(digest),
    code_challenge_method: "S256",
    resource: configuration.resource,
  });
  window.location.assign(authorize);
}

async function finishAuthorization(configuration) {
  const callback = new URL(window.location.href);
  const code = callback.searchParams.get("code");
  if (!code) {
    return;
  }

  const expectedState = sessionStorage.getItem("oauth.state");
  const verifier = sessionStorage.getItem("oauth.pkce.verifier");
  if (!expectedState || callback.searchParams.get("state") !== expectedState) {
    throw new Error("OAuth state mismatch");
  }
  if (!verifier) {
    throw new Error("PKCE verifier is missing");
  }

  const tokenResponse = await fetch(configuration.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: configuration.clientId,
      redirect_uri: configuration.redirectUri,
      code_verifier: verifier,
      resource: configuration.resource,
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error("Authorization code exchange failed");
  }

  const tokens = await tokenResponse.json();
  const idTokenClaims = decodeJwtPayload(tokens.id_token);
  const accessTokenClaims = decodeJwtPayload(tokens.access_token);
  const userinfoResponse = await fetch(configuration.userinfoEndpoint, {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userinfoResponse.ok) {
    throw new Error("Userinfo request failed");
  }
  const user = await userinfoResponse.json();

  document.querySelector('[data-testid="user-id"]').textContent = user.sub;
  document.querySelector('[data-testid="session-id"]').textContent =
    idTokenClaims.sid;
  document
    .querySelector('[data-testid="id-token-claims"]')
    .setAttribute("data-claims", JSON.stringify(idTokenClaims));
  document
    .querySelector('[data-testid="access-token-claims"]')
    .setAttribute("data-claims", JSON.stringify(accessTokenClaims));

  loginButton.hidden = true;
  authenticatedSession.hidden = false;
  sessionStorage.removeItem("oauth.pkce.verifier");
  sessionStorage.removeItem("oauth.state");
  window.history.replaceState({}, "", callback.pathname);
}

function showError(error) {
  oauthError.textContent =
    error instanceof Error ? error.message : "OAuth authorization failed";
  oauthError.hidden = false;
}

try {
  const configuration = readConfiguration();
  loginButton.addEventListener("click", () => {
    beginAuthorization(configuration).catch(showError);
  });
  finishAuthorization(configuration).catch(showError);
} catch (error) {
  showError(error);
}
