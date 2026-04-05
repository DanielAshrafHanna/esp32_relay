import { AppError } from "../lib/errors.js";
import type {
  CommandPlan,
  CompatibilityDomain,
  CompatibilityService,
  NativeAction,
  OutputRecord,
  OutputState,
  TransportStep,
} from "../types/domain.js";

function assertAllowed(output: OutputRecord, action: string) {
  if (!output.allowedActions.includes(action)) {
    throw new AppError(
      `Action '${action}' is not allowed for output '${output.displayName}'`,
      422,
      "action_not_allowed",
    );
  }
}

function normalizeDesiredState(desiredState: "ON" | "OFF", invertRelay: boolean): "ON" | "OFF" {
  if (!invertRelay) {
    return desiredState;
  }

  return desiredState === "ON" ? "OFF" : "ON";
}

export function normalizeReportedState(state: string, invertRelay: boolean): OutputState {
  if (state !== "ON" && state !== "OFF") {
    return "UNKNOWN";
  }

  return normalizeDesiredState(state, invertRelay);
}

function buildLegacyStep(output: OutputRecord, desiredState: "ON" | "OFF", delayAfterMs?: number): TransportStep {
  return {
    type: "publish",
    topic: `homeassistant/switch/${output.mqttHostname}/relay${output.channel}/set`,
    payload: normalizeDesiredState(desiredState, output.invertRelay),
    expectState: desiredState,
    delayAfterMs,
  };
}

function buildSetPlan(output: OutputRecord, state: "ON" | "OFF", logicalAction: string): CommandPlan {
  return {
    logicalAction,
    requestedState: state,
    requestedDurationMs: null,
    expectedFinalState: state,
    transportVersion: output.transportVersion,
    steps: [buildLegacyStep(output, state)],
  };
}

function buildPulsePlan(output: OutputRecord, durationMs: number): CommandPlan {
  return {
    logicalAction: "pulse",
    requestedState: "ON",
    requestedDurationMs: durationMs,
    expectedFinalState: "OFF",
    transportVersion: output.transportVersion,
    steps: [
      buildLegacyStep(output, "ON", durationMs),
      buildLegacyStep(output, "OFF"),
    ],
  };
}

export function buildNativePlan(
  output: OutputRecord,
  action: NativeAction,
  currentState: OutputState,
  durationMs?: number,
): CommandPlan {
  switch (action) {
    case "set_on":
      assertAllowed(output, "turn_on");
      return buildSetPlan(output, "ON", action);
    case "set_off":
      assertAllowed(output, "turn_off");
      return buildSetPlan(output, "OFF", action);
    case "toggle": {
      assertAllowed(output, "toggle");
      if (currentState === "UNKNOWN") {
        throw new AppError("Cannot toggle output without a known current state", 409, "state_required");
      }
      return buildSetPlan(output, currentState === "ON" ? "OFF" : "ON", action);
    }
    case "pulse":
      assertAllowed(output, "pulse");
      return buildPulsePlan(output, durationMs ?? output.pulseMs ?? 2000);
    default:
      throw new AppError(`Unsupported action '${action}'`, 422, "unsupported_action");
  }
}

function lookupServiceOverride(output: OutputRecord, domain: CompatibilityDomain, service: CompatibilityService): string | undefined {
  return output.serviceMap[`${domain}.${service}`] ?? output.serviceMap[service];
}

export function buildCompatibilityPlan(
  output: OutputRecord,
  domain: CompatibilityDomain,
  service: CompatibilityService,
  currentState: OutputState,
): CommandPlan {
  const override = lookupServiceOverride(output, domain, service);
  if (override === "pulse") {
    return buildNativePlan(output, "pulse", currentState, output.pulseMs ?? 2000);
  }

  switch (`${domain}.${service}`) {
    case "light.turn_on":
    case "switch.turn_on":
      return buildNativePlan(output, "set_on", currentState);
    case "light.turn_off":
    case "switch.turn_off":
      return buildNativePlan(output, "set_off", currentState);
    case "light.toggle":
    case "switch.toggle":
      return buildNativePlan(output, "toggle", currentState);
    case "lock.unlock":
      assertAllowed(output, "unlock");
      return buildPulsePlan(output, output.pulseMs ?? 2000);
    case "lock.lock":
      assertAllowed(output, "lock");
      throw new AppError("Lock service is not configured for this output", 422, "unsupported_mapping");
    case "cover.open_cover":
      assertAllowed(output, "open");
      return buildPulsePlan(output, output.pulseMs ?? 2000);
    case "cover.close_cover":
      assertAllowed(output, "close");
      return buildPulsePlan(output, output.pulseMs ?? 2000);
    case "cover.stop_cover":
      assertAllowed(output, "stop");
      return buildNativePlan(output, "set_off", currentState);
    default:
      throw new AppError(`Unsupported compatibility service '${domain}.${service}'`, 422, "unsupported_service");
  }
}
