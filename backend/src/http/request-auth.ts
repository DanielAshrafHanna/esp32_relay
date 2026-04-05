import type { FastifyRequest } from "fastify";
import { UnauthorizedError } from "../lib/errors.js";
import type { AuthPrincipal } from "../types/domain.js";
import type { HttpServices } from "./types.js";

export async function requirePrincipal(request: FastifyRequest, services: HttpServices): Promise<AuthPrincipal> {
  const principal = await services.authService.authenticate(request.headers.authorization);
  if (!principal) {
    throw new UnauthorizedError();
  }

  return principal;
}
