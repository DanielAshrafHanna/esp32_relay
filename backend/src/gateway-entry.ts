import { createPool } from "./db/pool.js";
import { DeviceGateway } from "./gateway/device-gateway.js";

async function main() {
  const pool = createPool();
  const gateway = new DeviceGateway(pool);
  await gateway.start();

  const shutdown = async () => {
    await gateway.stop();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
