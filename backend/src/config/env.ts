import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

let loaded = false;

function loadDotEnv() {
  if (loaded) {
    return;
  }
  loaded = true;

  const envPath = path.resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsed;
}

function readRequired(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export interface EnvConfig {
  port: number;
  logLevel: string;
  allowOrigin: string;
  jwtSecret: string;
  jwtIssuer: string;
  jwtExpirySeconds: number;
  databaseUrl: string;
  mqttUrl: string;
  mqttUsername?: string;
  mqttPassword?: string;
  mqttClientIdPrefix: string;
  commandPollIntervalMs: number;
  commandStepTimeoutMs: number;
  deviceRefreshIntervalMs: number;
}

export function getEnv(): EnvConfig {
  loadDotEnv();

  return {
    port: readNumber("PORT", 8080),
    logLevel: process.env.LOG_LEVEL ?? "info",
    allowOrigin: process.env.ALLOW_ORIGIN ?? "*",
    jwtSecret: readRequired("JWT_SECRET", "change-me"),
    jwtIssuer: process.env.JWT_ISSUER ?? "solace-backend",
    jwtExpirySeconds: readNumber("JWT_EXPIRY_SECONDS", 8 * 60 * 60),
    databaseUrl: readRequired("DATABASE_URL", "postgres://solace:solace@127.0.0.1:5432/solace_relay"),
    mqttUrl: readRequired("MQTT_URL", "mqtt://127.0.0.1:1883"),
    mqttUsername: process.env.MQTT_USERNAME,
    mqttPassword: process.env.MQTT_PASSWORD,
    mqttClientIdPrefix: process.env.MQTT_CLIENT_ID_PREFIX ?? "solace-backend",
    commandPollIntervalMs: readNumber("COMMAND_POLL_INTERVAL_MS", 150),
    commandStepTimeoutMs: readNumber("COMMAND_STEP_TIMEOUT_MS", 8000),
    deviceRefreshIntervalMs: readNumber("DEVICE_REFRESH_INTERVAL_MS", 30000),
  };
}
