import test from "node:test";
import assert from "node:assert/strict";
import { buildCompatibilityPlan, buildNativePlan, normalizeReportedState } from "../domain/actions.js";
import type { OutputRecord } from "../types/domain.js";

const baseOutput: OutputRecord = {
  id: "out-1",
  customerId: "cust-1",
  deviceId: "dev-1",
  deviceKey: "relay-demo-01",
  deviceDisplayName: "Board 1",
  deviceDesiredEnabled: true,
  mqttHostname: "esp32-relay",
  transportVersion: "legacy_ha",
  channel: 2,
  profileType: "gate",
  displayName: "Gate",
  pulseMs: 2000,
  invertRelay: false,
  defaultState: "OFF",
  allowedActions: ["unlock", "pulse", "turn_on", "turn_off", "toggle"],
  compatDomain: "lock",
  compatEntityId: "lock.aywanalocker_door",
  serviceMap: {},
  customerStatus: "active",
  lastKnownState: "OFF",
  lastStateAt: null,
};

test("lock.unlock maps to a persisted two-step pulse plan", () => {
  const plan = buildCompatibilityPlan(baseOutput, "lock", "unlock", "OFF");

  assert.equal(plan.logicalAction, "pulse");
  assert.equal(plan.steps.length, 2);
  assert.deepEqual(
    plan.steps.map((step) => ({ payload: step.payload, expectState: step.expectState, delayAfterMs: step.delayAfterMs ?? 0 })),
    [
      { payload: "ON", expectState: "ON", delayAfterMs: 2000 },
      { payload: "OFF", expectState: "OFF", delayAfterMs: 0 },
    ],
  );
});

test("toggle resolves against the current logical state", () => {
  const plan = buildNativePlan({ ...baseOutput, profileType: "light" }, "toggle", "ON");
  assert.equal(plan.steps[0].payload, "OFF");
  assert.equal(plan.expectedFinalState, "OFF");
});

test("reported state is normalized through invert_relay", () => {
  assert.equal(normalizeReportedState("ON", true), "OFF");
  assert.equal(normalizeReportedState("OFF", true), "ON");
});

test("switch.turn_on can map to a pulse plan through service overrides", () => {
  const switchOutput: OutputRecord = {
    ...baseOutput,
    profileType: "switch",
    compatDomain: "switch",
    compatEntityId: "switch.dany.relay1",
    allowedActions: ["turn_on", "turn_off", "toggle", "pulse"],
    serviceMap: {
      "switch.turn_on": "pulse",
    },
  };

  const plan = buildCompatibilityPlan(switchOutput, "switch", "turn_on", "OFF");
  assert.equal(plan.logicalAction, "pulse");
  assert.equal(plan.steps.length, 2);
  assert.equal(plan.steps[0].expectState, "ON");
  assert.equal(plan.steps[1].expectState, "OFF");
});
