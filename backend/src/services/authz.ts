import { ForbiddenError } from "../lib/errors.js";
import type { AuthPrincipal } from "../types/domain.js";

export function assertCustomerAccess(principal: AuthPrincipal, customerId: string) {
  if (!principal.customerIds.includes(customerId)) {
    throw new ForbiddenError("You do not have access to this customer");
  }
}

export function assertScope(principal: AuthPrincipal, scope: string) {
  if (principal.kind === "user") {
    return;
  }

  if (!principal.scopes.includes(scope)) {
    throw new ForbiddenError(`Missing required scope '${scope}'`);
  }
}
