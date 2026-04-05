import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../lib/errors.js";
import type { CompatibilityDomain, CompatibilityService } from "../../types/domain.js";
import { requirePrincipal } from "../request-auth.js";
import type { HttpServices } from "../types.js";

const allowedDomains = new Set<CompatibilityDomain>(["lock", "switch", "light", "cover"]);
const allowedServices = new Set<CompatibilityService>([
  "unlock",
  "lock",
  "turn_on",
  "turn_off",
  "toggle",
  "open_cover",
  "close_cover",
  "stop_cover",
]);

export async function registerCompatRoutes(app: FastifyInstance, services: HttpServices) {
  const handler = async (
    request: FastifyRequest<{ Params: { domain: CompatibilityDomain; service: CompatibilityService }; Body: { entity_id?: string | string[] } }>,
    reply: FastifyReply,
  ) => {
    const principal = await requirePrincipal(request, services);
    const params = request.params;
    const body = request.body ?? {};

    if (!allowedDomains.has(params.domain) || !allowedServices.has(params.service)) {
      throw new AppError("Unsupported compatibility endpoint", 404, "unsupported_compat_route");
    }

    const entityIds = Array.isArray(body.entity_id) ? body.entity_id : body.entity_id ? [body.entity_id] : [];
    if (!entityIds.length) {
      throw new AppError("entity_id is required", 400, "missing_entity_id");
    }

    const commands = await Promise.all(
      entityIds.map((entityId) => services.commandService.createCompatibilityCommand(principal, params.domain, params.service, entityId)),
    );

    reply.code(202);
    return {
      commands,
      accepted: commands.length,
    };
  };

  app.post("/compat/ha/api/services/:domain/:service", handler);
  app.post("/api/services/:domain/:service", handler);
}
