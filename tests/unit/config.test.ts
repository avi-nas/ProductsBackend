import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ConfigError, loadConfig, type AppEnvironment } from "../../src/config.js";

const valuesByEnvironment = {
  dev: "development",
  stage: "production",
  prod: "production",
} as const;

function environmentFile(
  appEnvironment: AppEnvironment,
  overrides: Readonly<Record<string, string>> = {},
): string {
  const values: Record<string, string> = {
    NODE_ENV: valuesByEnvironment[appEnvironment],
    HOST: "127.0.0.1",
    PORT: "3000",
    FAKE_STORE_BASE_URL: "https://fakestoreapi.com",
    FAKE_STORE_TIMEOUT_MS: "5000",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "1025",
    SMTP_SECURE: "false",
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    SMTP_FROM: "products@example.test",
    SALES_EMAIL: "sales@example.test",
    ...overrides,
  };

  return `${Object.entries(values)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n")}\n`;
}

describe("loadConfig", () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "products-backend-config-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function writeEnvironment(
    appEnvironment: AppEnvironment,
    overrides: Readonly<Record<string, string>> = {},
  ): void {
    writeFileSync(
      join(directory, `.env.${appEnvironment}`),
      environmentFile(appEnvironment, overrides),
    );
  }

  it.each(["dev", "stage", "prod"] as const)(
    "loads and validates the selected %s environment file",
    (appEnvironment) => {
      writeEnvironment(appEnvironment, { PORT: appEnvironment === "dev" ? "3000" : "8080" });

      const config = loadConfig({ APP_ENV: appEnvironment }, directory);

      expect(config.appEnvironment).toBe(appEnvironment);
      expect(config.nodeEnvironment).toBe(valuesByEnvironment[appEnvironment]);
      expect(config.port).toBe(appEnvironment === "dev" ? 3000 : 8080);
      expect(config.smtpSecure).toBe(false);
    },
  );

  it("loads only the selected environment file", () => {
    writeEnvironment("dev", { PORT: "3001" });
    writeEnvironment("stage", { PORT: "4001" });

    expect(loadConfig({ APP_ENV: "stage" }, directory).port).toBe(4001);
  });

  it("lets runtime environment variables override file values", () => {
    writeEnvironment("prod", { PORT: "8080", SMTP_SECURE: "true" });

    const config = loadConfig({ APP_ENV: "prod", PORT: "9090" }, directory);

    expect(config.port).toBe(9090);
    expect(config.smtpSecure).toBe(true);
  });

  it("requires an explicit supported environment", () => {
    expect(() => loadConfig({}, directory)).toThrow(ConfigError);
    expect(() => loadConfig({ APP_ENV: "test" }, directory)).toThrow(ConfigError);
  });

  it("fails when the selected environment file does not exist", () => {
    expect(() => loadConfig({ APP_ENV: "prod" }, directory)).toThrow("Unable to load .env.prod.");
  });

  it.each([
    ["PORT", "0"],
    ["PORT", "65536"],
    ["SMTP_PORT", "invalid"],
    ["FAKE_STORE_TIMEOUT_MS", "-1"],
    ["SMTP_SECURE", "yes"],
  ])("rejects invalid %s values", (name, value) => {
    writeEnvironment("dev", { [name]: value });

    expect(() => loadConfig({ APP_ENV: "dev" }, directory)).toThrow(ConfigError);
  });

  it("rejects a mismatched NODE_ENV", () => {
    writeEnvironment("stage", { NODE_ENV: "development" });

    expect(() => loadConfig({ APP_ENV: "stage" }, directory)).toThrow(
      "NODE_ENV must be production when APP_ENV is stage.",
    );
  });

  it("requires SMTP credentials as a pair", () => {
    writeEnvironment("prod", { SMTP_USER: "mailer" });

    expect(() => loadConfig({ APP_ENV: "prod" }, directory)).toThrow(
      "SMTP_USER and SMTP_PASSWORD must either both be set or both be empty.",
    );
  });

  it("rejects a non-HTTP product source URL", () => {
    writeEnvironment("dev", { FAKE_STORE_BASE_URL: "file:///tmp/products.json" });

    expect(() => loadConfig({ APP_ENV: "dev" }, directory)).toThrow(ConfigError);
  });
});
