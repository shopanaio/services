import { describe, expect, it } from "@jest/globals";
import type { ValueProvider } from "@nestjs/common";
import {
  DATABASE_CONNECTION_OPTIONS,
  DatabaseModule,
  type DatabaseConnectionOptions,
} from "./DatabaseModule.js";

describe("DatabaseModule connection options", () => {
  it("exports immutable normalized connection options", () => {
    const module = DatabaseModule.forRoot({
      db: {
        host: "database.internal",
        port: 5433,
        user: "shopana",
        password: "secret",
        database: "portal",
        schema: "catalog",
      },
      pool: {
        max: 17,
        idle_timeout: 11,
        connect_timeout: 13,
        max_lifetime: 101,
      },
    });

    const provider = module.providers?.find(
      (candidate): candidate is ValueProvider<DatabaseConnectionOptions> =>
        typeof candidate === "object" &&
        candidate !== null &&
        "provide" in candidate &&
        candidate.provide === DATABASE_CONNECTION_OPTIONS,
    );

    expect(provider).toBeDefined();
    expect(provider?.useValue).toEqual({
      host: "database.internal",
      port: 5433,
      username: "shopana",
      password: "secret",
      database: "portal",
      max: 17,
      idle_timeout: 11,
      connect_timeout: 13,
      max_lifetime: 101,
    });
    expect(Object.isFrozen(provider?.useValue)).toBe(true);
    expect(module.exports).toContain(DATABASE_CONNECTION_OPTIONS);
  });
});
