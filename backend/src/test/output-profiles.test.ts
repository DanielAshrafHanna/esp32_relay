import test from "node:test";
import assert from "node:assert/strict";
import { resolveOutputProfileConfig } from "../domain/output-profiles.js";

test("gate profile resolves to lock domain and pulse behavior", () => {
  const config = resolveOutputProfileConfig({
    deviceKey: "relay-demo-01",
    channel: 5,
    profileType: "gate",
    displayName: "Workshop Gate",
  });

  assert.equal(config.compatDomain, "lock");
  assert.equal(config.compatEntityId, "lock.relay_demo_01_relay_5");
  assert.equal(config.pulseMs, 2000);
  assert.deepEqual(config.allowedActions, ["unlock", "pulse"]);
  assert.equal(config.serviceMap["lock.unlock"], "pulse");
});

test("light profile resolves to light domain and direct state actions", () => {
  const config = resolveOutputProfileConfig({
    deviceKey: "relay-demo-01",
    channel: 6,
    profileType: "light",
  });

  assert.equal(config.compatDomain, "light");
  assert.equal(config.compatEntityId, "light.relay_demo_01_relay_6");
  assert.equal(config.pulseMs, null);
  assert.deepEqual(config.allowedActions, ["turn_on", "turn_off", "toggle"]);
});
