import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import type { CommandRecord } from "../types/domain.js";

test("compatibility service endpoint accepts HA-style entity requests", async () => {
  const app = await createApp({
    authService: {
      authenticate: async () => ({
        kind: "service_account",
        subjectId: "sa-1",
        customerIds: ["cust-1"],
        scopes: ["compat:write"],
      }),
      login: async () => {
        throw new Error("not implemented");
      },
    } as never,
    outputService: {} as never,
    commandService: {
      createCompatibilityCommand: async (
        _principal: { subjectId: string },
        domain: string,
        service: string,
        entityId: string,
      ) =>
        ({
          id: "cmd-1",
          customerId: "cust-1",
          outputId: "out-1",
          sourceType: "compat_ha",
          sourceId: "sa-1",
          clientRequestId: null,
          logicalAction: `${domain}.${service}`,
          requestedState: null,
          requestedDurationMs: 2000,
          status: "queued",
          transportVersion: "legacy_ha",
          steps: [],
          currentStep: 0,
          nextStepAt: new Date().toISOString(),
          expectedStepState: null,
          stepTimeoutAt: null,
          deadlineAt: null,
          lastError: null,
          resultPayload: { entityId },
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null,
        }) satisfies CommandRecord,
      getCommand: async () => {
        throw new Error("not implemented");
      },
      createNativeCommand: async () => {
        throw new Error("not implemented");
      },
    } as never,
    provisioningService: {} as never,
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/services/lock/unlock",
    headers: {
      authorization: "Bearer demo-token",
    },
    payload: {
      entity_id: "lock.aywanalocker_door",
    },
  });

  assert.equal(response.statusCode, 202);
  const body = response.json();
  assert.equal(body.accepted, 1);
  assert.equal(body.commands[0].logicalAction, "lock.unlock");
  assert.equal(body.commands[0].resultPayload.entityId, "lock.aywanalocker_door");

  await app.close();
});
