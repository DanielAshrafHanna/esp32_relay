import cors from "@fastify/cors";
import Fastify from "fastify";
import { getEnv } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import { registerAuthRoutes } from "./http/routes/auth-routes.js";
import { registerCompatRoutes } from "./http/routes/compat-routes.js";
import { registerConsoleRoutes } from "./http/routes/console-routes.js";
import { registerDeviceRoutes } from "./http/routes/device-routes.js";
import type { HttpServices } from "./http/types.js";

export async function createApp(services: HttpServices) {
  const env = getEnv();
  const app = Fastify({
    logger: {
      level: env.logLevel,
    },
  });

  await app.register(cors, {
    origin: env.allowOrigin === "*" ? true : env.allowOrigin,
  });

  app.get("/health", async () => ({
    ok: true,
    service: "api",
    timestamp: new Date().toISOString(),
  }));

  await registerConsoleRoutes(app);
  await registerAuthRoutes(app, services);
  await registerDeviceRoutes(app, services);
  await registerCompatRoutes(app, services);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn({ err: error, code: error.code }, error.message);
      reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        details: error.details ?? null,
      });
      return;
    }

    request.log.error({ err: error }, "Unhandled request error");
    reply.status(500).send({
      error: "internal_error",
      message: "Internal server error",
    });
  });

  return app;
}
