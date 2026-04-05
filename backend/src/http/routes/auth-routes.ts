import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors.js";
import { requirePrincipal } from "../request-auth.js";
import type { HttpServices } from "../types.js";

export async function registerAuthRoutes(app: FastifyInstance, services: HttpServices) {
  app.post("/v1/auth/login", async (request) => {
    const body = request.body as { email?: string; password?: string } | undefined;
    if (!body?.email || !body.password) {
      throw new AppError("Email and password are required", 400, "invalid_credentials");
    }

    return services.authService.login(body.email, body.password);
  });

  app.get("/v1/me", async (request) => {
    const principal = await requirePrincipal(request, services);
    return {
      kind: principal.kind,
      subject_id: principal.subjectId,
      customer_ids: principal.customerIds,
      scopes: principal.scopes,
      email: principal.email,
      display_name: principal.displayName,
      memberships: principal.memberships ?? {},
    };
  });
}
