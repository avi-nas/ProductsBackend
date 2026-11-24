import { resolve } from "node:path";

import { config as loadDotenv } from "dotenv";

export type AppEnvironment = "dev" | "stage" | "prod";
export type NodeEnvironment = "development" | "production";

export interface AppConfig {
  readonly appEnvironment: AppEnvironment;
  readonly nodeEnvironment: NodeEnvironment;
  readonly host: string;
  readonly port: number;
  readonly fakeStoreBaseUrl: string;
  readonly fakeStoreTimeoutMs: number;
  readonly smtpHost: string;
  readonly smtpPort: number;
  readonly smtpSecure: boolean;
  readonly smtpUser: string | undefined;
  readonly smtpPassword: string | undefined;
  readonly smtpFrom: string;
  readonly salesEmail: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const nodeEnvironmentByAppEnvironment: Readonly<Record<AppEnvironment, NodeEnvironment>> = {
  dev: "development",
  stage: "production",
  prod: "production",
};

function readAppEnvironment(value: string | undefined): AppEnvironment {
  const normalized = value?.trim();
  if (normalized === "dev" || normalized === "stage" || normalized === "prod") {
    return normalized;
  }

  throw new ConfigError("APP_ENV must be dev, stage, or prod.");
}

function readRequiredString(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new ConfigError(`${name} is required.`);
  }
  return normalized;
}

function readOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function readPositiveInteger(value: string | undefined, name: string, maximum: number): number {
  const normalized = readRequiredString(value, name);
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new ConfigError(`${name} must be a positive integer no greater than ${maximum}.`);
  }
  return parsed;
}

function readNodeEnvironment(
  value: string | undefined,
  appEnvironment: AppEnvironment,
): NodeEnvironment {
  const normalized = readRequiredString(value, "NODE_ENV");
  const expected = nodeEnvironmentByAppEnvironment[appEnvironment];
  if (normalized !== expected) {
    throw new ConfigError(`NODE_ENV must be ${expected} when APP_ENV is ${appEnvironment}.`);
  }
  return expected;
}

function readBoolean(value: string | undefined, name: string): boolean {
  const normalized = readRequiredString(value, name).toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  throw new ConfigError(`${name} must be true or false.`);
}

function readHttpUrl(value: string | undefined, name: string): string {
  const normalized = readRequiredString(value, name);

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported URL protocol.");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new ConfigError(`${name} must be a valid HTTP or HTTPS URL.`);
  }
}

function readEmail(value: string | undefined, name: string): string {
  const normalized = readRequiredString(value, name);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ConfigError(`${name} must be a valid email address.`);
  }
  return normalized;
}

function validateSmtpCredentials(
  user: string | undefined,
  password: string | undefined,
): void {
  if ((user === undefined) !== (password === undefined)) {
    throw new ConfigError("SMTP_USER and SMTP_PASSWORD must either both be set or both be empty.");
  }
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
  directory: string = process.cwd(),
): AppConfig {
  const appEnvironment = readAppEnvironment(environment.APP_ENV);
  const environmentFile = `.env.${appEnvironment}`;
  const result = loadDotenv({
    path: resolve(directory, environmentFile),
    processEnv: environment,
    override: false,
    quiet: true,
  });

  if (result.error) {
    throw new ConfigError(`Unable to load ${environmentFile}.`);
  }

  const smtpUser = readOptionalString(environment.SMTP_USER);
  const smtpPassword = readOptionalString(environment.SMTP_PASSWORD);
  validateSmtpCredentials(smtpUser, smtpPassword);

  return {
    appEnvironment,
    nodeEnvironment: readNodeEnvironment(environment.NODE_ENV, appEnvironment),
    host: readRequiredString(environment.HOST, "HOST"),
    port: readPositiveInteger(environment.PORT, "PORT", 65_535),
    fakeStoreBaseUrl: readHttpUrl(environment.FAKE_STORE_BASE_URL, "FAKE_STORE_BASE_URL"),
    fakeStoreTimeoutMs: readPositiveInteger(
      environment.FAKE_STORE_TIMEOUT_MS,
      "FAKE_STORE_TIMEOUT_MS",
      Number.MAX_SAFE_INTEGER,
    ),
    smtpHost: readRequiredString(environment.SMTP_HOST, "SMTP_HOST"),
    smtpPort: readPositiveInteger(environment.SMTP_PORT, "SMTP_PORT", 65_535),
    smtpSecure: readBoolean(environment.SMTP_SECURE, "SMTP_SECURE"),
    smtpUser,
    smtpPassword,
    smtpFrom: readEmail(environment.SMTP_FROM, "SMTP_FROM"),
    salesEmail: readEmail(environment.SALES_EMAIL, "SALES_EMAIL"),
  };
}
