#!/usr/bin/env node
/**
 * Casdoor Bootstrap Script
 *
 * Reads config.json and:
 * 1. Logs in as admin (cookie session)
 * 2. Creates organization
 * 3. Creates certificate (org_name + "_cert")
 * 4. Creates application
 * 5. Outputs configuration
 *
 * Usage: node casdoor/bootstrap.js
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  readFileSync(join(__dirname, "config.json"), "utf-8")
);

const ENDPOINT = "http://localhost:9011";
const DEFAULT_PASSWORD = "123";

const ORG_NAME = config.organization;
const CERT_NAME = `${ORG_NAME}_cert`;
const APP_NAME = ORG_NAME;

let sessionCookie = null;

async function login(username, password) {
  const res = await fetch(`${ENDPOINT}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      application: "app-built-in",
      organization: "built-in",
      username,
      password,
      type: "login",
    }),
  });

  const data = await res.json();
  if (data.status === "ok") {
    const cookie = res.headers.get("set-cookie");
    if (cookie) {
      sessionCookie = cookie.split(";")[0];
    }
    return true;
  }
  return false;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Cookie: sessionCookie,
  };
}

async function api(method, action, body = null) {
  const url = `${ENDPOINT}/api/${action}`;
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const data = await res.json();

  if (data.status !== "ok" && data.msg) {
    throw new Error(`API error: ${data.msg}`);
  }
  return data;
}

async function getResource(type, name, owner = "admin") {
  try {
    const res = await api("GET", `get-${type}?id=${owner}/${name}`);
    return res.data || null;
  } catch {
    return null;
  }
}

async function authenticate() {
  console.log("1. Authentication...");

  // Try configured password
  if (await login(config.user, config.password)) {
    console.log("   ✓ Logged in");
    return;
  }

  // Try default password
  if (await login(config.user, DEFAULT_PASSWORD)) {
    console.log("   ✓ Logged in (default password)");
    return;
  }

  throw new Error("Failed to authenticate");
}

async function main() {
  console.log("Casdoor Bootstrap Script");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Organization: ${ORG_NAME}\n`);

  // 1. Authenticate
  await authenticate();

  // 2. Create Organization
  console.log("2. Organization...");
  let org = await getResource("organization", ORG_NAME);
  if (!org) {
    console.log(`   Creating: ${ORG_NAME}`);
    await api("POST", "add-organization", {
      owner: "admin",
      name: ORG_NAME,
      displayName: ORG_NAME,
      websiteUrl: "",
      passwordType: "plain",
      countryCodes: ["US", "RU"],
      languages: ["en", "ru"],
      initScore: 0,
      enableSoftDeletion: false,
      isProfilePublic: false,
      useEmailAsUsername: true,
    });
    org = await getResource("organization", ORG_NAME);
    console.log("   ✓ Created");
  } else {
    console.log("   ✓ Exists");
  }

  // 3. Create Certificate
  console.log("3. Certificate...");
  let cert = await getResource("cert", CERT_NAME);
  if (!cert) {
    console.log(`   Creating: ${CERT_NAME}`);
    await api("POST", "add-cert", {
      owner: "admin",
      name: CERT_NAME,
      displayName: CERT_NAME,
      scope: "JWT",
      type: "x509",
      cryptoAlgorithm: "RS256",
      bitSize: 4096,
      expireInYears: 20,
    });
    cert = await getResource("cert", CERT_NAME);
    console.log("   ✓ Created");
  } else {
    console.log("   ✓ Exists");
  }

  // 4. Create Application
  console.log("4. Application...");
  let app = await getResource("application", APP_NAME);
  if (!app) {
    console.log(`   Creating: ${APP_NAME}`);
    await api("POST", "add-application", {
      owner: "admin",
      name: APP_NAME,
      displayName: APP_NAME,
      organization: ORG_NAME,
      cert: CERT_NAME,
      enablePassword: true,
      enableSignUp: true,
      enableSigninSession: true,
      redirectUris: ["http://localhost:3000/callback"],
      tokenFormat: "JWT-Custom",
      expireInHours: 168,
      refreshExpireInHours: 720,
      grantTypes: [
        "authorization_code",
        "password",
        "client_credentials",
        "refresh_token",
      ],
    });
    app = await getResource("application", APP_NAME);
    console.log("   ✓ Created");
  } else {
    console.log("   ✓ Exists");
  }

  // 4.1. Configure application (credentials + minimal JWT + org link)
  console.log("   Configuring...");
  app = await getResource("application", APP_NAME);

  // Link to organization
  app.organization = ORG_NAME;

  // Custom credentials
  if (config.clientId) app.clientId = config.clientId;
  if (config.clientSecret) app.clientSecret = config.clientSecret;

  // Minimal JWT claims
  app.tokenFormat = "JWT-Custom";
  app.tokenFields = ["sub", "iss", "aud", "exp", "iat", "email", "name", "owner"];

  await api("POST", `update-application?id=admin/${APP_NAME}`, app);
  console.log("   ✓ Configured (org, JWT-Custom, minimal claims)");

  // 5. Set default application
  console.log("5. Default application...");
  org = await getResource("organization", ORG_NAME);
  if (org && org.defaultApplication !== APP_NAME) {
    org.defaultApplication = APP_NAME;
    await api("POST", `update-organization?id=admin/${ORG_NAME}`, org);
    console.log("   ✓ Set");
  } else {
    console.log("   ✓ Already set");
  }

  // Output
  app = await getResource("application", APP_NAME);
  cert = await getResource("cert", CERT_NAME);

  console.log("\n========================================");
  console.log("ENV Configuration:");
  console.log("========================================\n");
  console.log(`CASDOOR_ENDPOINT=${ENDPOINT}`);
  console.log(`CASDOOR_ORGANIZATION=${ORG_NAME}`);
  console.log(`CASDOOR_APPLICATION=${APP_NAME}`);
  console.log(`CASDOOR_CERT=${CERT_NAME}`);
  console.log(`CASDOOR_CLIENT_ID=${app.clientId}`);
  console.log(`CASDOOR_CLIENT_SECRET=${app.clientSecret}`);

  console.log("\n========================================");
  console.log("Certificate:");
  console.log("========================================\n");
  console.log(cert.certificate);

  console.log("\n✓ Done!");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
