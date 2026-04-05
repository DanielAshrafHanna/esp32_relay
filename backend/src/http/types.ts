import type { AuthService } from "../services/auth-service.js";
import type { CommandService } from "../services/command-service.js";
import type { OutputService } from "../services/output-service.js";
import type { ProvisioningService } from "../services/provisioning-service.js";

export interface HttpServices {
  authService: AuthService;
  outputService: OutputService;
  commandService: CommandService;
  provisioningService: ProvisioningService;
}
