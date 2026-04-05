import pg from "pg";
import { getEnv } from "../config/env.js";

const { Pool } = pg;

export function createPool() {
  const env = getEnv();
  return new Pool({
    connectionString: env.databaseUrl,
  });
}
