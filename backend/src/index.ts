import { createPool } from "./db/pool.js";
import { getEnv } from "./config/env.js";
import { createApp } from "./app.js";
import { AuditService } from "./services/audit-service.js";
import { AuthService } from "./services/auth-service.js";
import { CommandService } from "./services/command-service.js";
import { OutputService } from "./services/output-service.js";
import { ProvisioningService } from "./services/provisioning-service.js";

async function main() {
  const env = getEnv();
  const pool = createPool();
  const outputService = new OutputService(pool);
  const auditService = new AuditService(pool);
  const services = {
    authService: new AuthService(pool),
    outputService,
    commandService: new CommandService(pool, outputService, auditService),
    provisioningService: new ProvisioningService(pool, outputService, auditService),
  };

  const app = await createApp(services);
  await app.listen({
    host: "0.0.0.0",
    port: env.port,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
