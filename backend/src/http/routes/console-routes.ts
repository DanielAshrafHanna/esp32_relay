import type { FastifyInstance } from "fastify";

function consoleHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Solace Relay Middleware Console</title>
  <style>
    :root {
      --bg: #f4f1ea;
      --panel: #fffdf8;
      --ink: #182027;
      --muted: #66717d;
      --line: #d8d0c3;
      --accent: #135d66;
      --accent-soft: #e4f2f1;
      --warn: #9a3412;
      --ok: #166534;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top right, rgba(19,93,102,.14), transparent 28%),
        linear-gradient(180deg, #f7f4ee, #efe7d8 65%, #e7ddcb);
      color: var(--ink);
    }
    .wrap {
      max-width: 1300px;
      margin: 0 auto;
      padding: 24px;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.2fr .8fr;
      gap: 18px;
      margin-bottom: 20px;
    }
    .card {
      background: rgba(255, 253, 248, 0.92);
      border: 1px solid rgba(24, 32, 39, 0.08);
      border-radius: 20px;
      box-shadow: 0 16px 40px rgba(24, 32, 39, 0.07);
      padding: 20px;
      backdrop-filter: blur(10px);
    }
    h1, h2, h3 { margin: 0 0 10px; }
    h1 { font-size: 2rem; letter-spacing: -0.03em; }
    h2 { font-size: 1.1rem; }
    p { margin: 0 0 12px; color: var(--muted); }
    .pill {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 0.85rem;
      font-weight: 700;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    .grid-2, .grid-3, .grid-4 {
      display: grid;
      gap: 12px;
    }
    .grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    label {
      display: block;
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 11px 12px;
      background: white;
      color: var(--ink);
      font: inherit;
    }
    textarea { min-height: 118px; resize: vertical; }
    button {
      appearance: none;
      border: 0;
      border-radius: 12px;
      background: var(--accent);
      color: white;
      padding: 10px 14px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    button.secondary {
      background: white;
      color: var(--ink);
      border: 1px solid var(--line);
    }
    button.warn { background: var(--warn); }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .status {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: #fff;
      border: 1px solid var(--line);
      white-space: pre-wrap;
      color: var(--ink);
      min-height: 44px;
    }
    .status.ok { border-color: rgba(22, 101, 52, .2); background: rgba(22,101,52,.07); color: var(--ok); }
    .status.error { border-color: rgba(154, 52, 18, .2); background: rgba(154,52,18,.08); color: var(--warn); }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border-bottom: 1px solid rgba(24, 32, 39, 0.08);
      vertical-align: top;
      text-align: left;
      padding: 12px 10px;
      font-size: 0.95rem;
    }
    th {
      color: var(--muted);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .state-on { color: var(--ok); font-weight: 700; }
    .state-off { color: var(--muted); font-weight: 700; }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.87rem;
    }
    .muted { color: var(--muted); }
    @media (max-width: 980px) {
      .hero, .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; }
      table, thead, tbody, tr, th, td { display: block; width: 100%; }
      thead { display: none; }
      td { padding: 10px 0; }
      tr { border-bottom: 1px solid rgba(24, 32, 39, 0.08); padding: 12px 0; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <section class="card">
        <h1>Solace Relay Middleware</h1>
        <p>Operator console for the cloud relay backend. Use this page to log in, inspect all 16 outputs, switch a relay between <strong>gate</strong>, <strong>light</strong>, <strong>cover</strong>, or <strong>generic relay</strong>, and trigger actions through the same middleware the app uses.</p>
        <span class="pill">Compatibility Webhooks</span>
        <span class="pill">Native API</span>
        <span class="pill">MQTT Gateway</span>
      </section>
      <section class="card">
        <h2>Quick Defaults</h2>
        <p class="mono">Admin email: admin@solace.local</p>
        <p class="mono">Admin password: ChangeMe123!</p>
        <p class="mono">Enter the current service token for the environment you are using.</p>
        <p>For the current Railway test deployment, use <code>solace-railway-test-token</code>. For local development, use your local seeded token.</p>
      </section>
    </div>

    <section class="card" style="margin-bottom:20px;">
      <div class="toolbar">
        <h2>Auth & Session</h2>
        <div class="actions">
          <button class="secondary" id="load-session">Reload Saved Session</button>
          <button class="secondary" id="clear-session">Clear Session</button>
        </div>
      </div>
      <div class="grid-4">
        <div>
          <label for="email">Admin Email</label>
          <input id="email" value="admin@solace.local">
        </div>
        <div>
          <label for="password">Admin Password</label>
          <input id="password" type="password" value="ChangeMe123!">
        </div>
        <div>
          <label for="service-token">Webhook Service Token</label>
          <input id="service-token" value="" placeholder="Enter service token for this environment">
        </div>
        <div>
          <label for="device-id">Device ID</label>
          <input id="device-id" placeholder="Auto-load from /v1/devices">
        </div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button id="login-btn">Admin Login</button>
        <button class="secondary" id="load-devices">Load Devices</button>
        <button class="secondary" id="load-outputs">Load Outputs</button>
      </div>
      <div id="auth-status" class="status">No active admin session yet.</div>
    </section>

    <section class="card" style="margin-bottom:20px;">
      <div class="toolbar">
        <h2>Webhook Tester</h2>
      </div>
      <div class="grid-4">
        <div>
          <label for="webhook-domain">Domain</label>
          <select id="webhook-domain">
            <option value="lock">lock</option>
            <option value="light">light</option>
            <option value="switch">switch</option>
            <option value="cover">cover</option>
          </select>
        </div>
        <div>
          <label for="webhook-service">Service</label>
          <input id="webhook-service" value="unlock">
        </div>
        <div>
          <label for="webhook-entity">Entity ID</label>
          <input id="webhook-entity" value="lock.aywanalocker_door">
        </div>
        <div>
          <label for="webhook-body">Body Preview</label>
          <input id="webhook-body" value='{"entity_id":"lock.aywanalocker_door"}'>
        </div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button id="send-webhook">Send Compatibility Webhook</button>
      </div>
      <div id="webhook-status" class="status">Ready.</div>
    </section>

    <section class="card">
      <div class="toolbar">
        <h2>Relay Outputs</h2>
        <div class="muted">Each row can be edited and triggered independently.</div>
      </div>
      <div style="overflow:auto;">
        <table>
          <thead>
            <tr>
              <th>Channel</th>
              <th>State</th>
              <th>Display</th>
              <th>Profile</th>
              <th>Entity</th>
              <th>Pulse</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="outputs-body"></tbody>
        </table>
      </div>
      <div id="outputs-status" class="status">Load outputs to begin.</div>
    </section>
  </div>

  <script>
    const state = {
      token: localStorage.getItem("solace_admin_token") || "",
      outputs: [],
      devices: []
    };

    const authStatus = document.getElementById("auth-status");
    const webhookStatus = document.getElementById("webhook-status");
    const outputsStatus = document.getElementById("outputs-status");
    const outputsBody = document.getElementById("outputs-body");

    function setStatus(node, message, kind) {
      node.textContent = message;
      node.className = "status" + (kind ? " " + kind : "");
    }

    function saveSession() {
      if (state.token) {
        localStorage.setItem("solace_admin_token", state.token);
      } else {
        localStorage.removeItem("solace_admin_token");
      }
    }

    function authHeaders(useAdmin = true) {
      if (!useAdmin) {
        return {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + document.getElementById("service-token").value.trim()
        };
      }
      return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + state.token
      };
    }

    function profileActions(profileType) {
      if (profileType === "gate") {
        return [{ label: "Unlock", domain: "lock", service: "unlock" }];
      }
      if (profileType === "light") {
        return [
          { label: "On", domain: "light", service: "turn_on" },
          { label: "Off", domain: "light", service: "turn_off" },
          { label: "Toggle", domain: "light", service: "toggle" }
        ];
      }
      if (profileType === "cover") {
        return [
          { label: "Open", domain: "cover", service: "open_cover" },
          { label: "Close", domain: "cover", service: "close_cover" },
          { label: "Stop", domain: "cover", service: "stop_cover" }
        ];
      }
      return [
        { label: "On", domain: "switch", service: "turn_on" },
        { label: "Off", domain: "switch", service: "turn_off" },
        { label: "Toggle", domain: "switch", service: "toggle" }
      ];
    }

    function renderOutputs() {
      outputsBody.innerHTML = "";
      if (!state.outputs.length) {
        outputsBody.innerHTML = '<tr><td colspan="7" class="muted">No outputs loaded yet.</td></tr>';
        return;
      }

      for (const output of state.outputs) {
        const tr = document.createElement("tr");
        const actionButtons = profileActions(output.profileType)
          .map((action) => '<button data-action="' + action.service + '" data-domain="' + action.domain + '" data-id="' + output.id + '" class="trigger-btn secondary">' + action.label + '</button>')
          .join("");

        tr.innerHTML = \`
          <td><strong>\${output.channel}</strong><div class="mono muted">\${output.id.slice(0, 8)}</div></td>
          <td><span class="\${output.lastKnownState === "ON" ? "state-on" : "state-off"}">\${output.lastKnownState}</span></td>
          <td>
            <input data-field="display_name" data-id="\${output.id}" value="\${output.displayName}">
          </td>
          <td>
            <select data-field="profile_type" data-id="\${output.id}">
              <option value="generic_relay" \${output.profileType === "generic_relay" ? "selected" : ""}>generic relay</option>
              <option value="light" \${output.profileType === "light" ? "selected" : ""}>light</option>
              <option value="gate" \${output.profileType === "gate" ? "selected" : ""}>gate</option>
              <option value="cover" \${output.profileType === "cover" ? "selected" : ""}>cover</option>
            </select>
          </td>
          <td>
            <input class="mono" data-field="compat_entity_id" data-id="\${output.id}" value="\${output.compatEntityId || ""}">
          </td>
          <td>
            <input data-field="pulse_ms" data-id="\${output.id}" type="number" value="\${output.pulseMs || ""}" placeholder="2000">
          </td>
          <td>
            <div class="actions" style="margin-bottom:8px;">
              \${actionButtons}
            </div>
            <div class="actions">
              <button class="save-btn" data-id="\${output.id}">Save</button>
            </div>
          </td>
        \`;
        outputsBody.appendChild(tr);
      }
    }

    async function login() {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const response = await fetch("/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }
      state.token = data.token;
      saveSession();
      setStatus(authStatus, "Admin login successful.", "ok");
    }

    async function loadDevices() {
      const response = await fetch("/v1/devices", { headers: authHeaders(true) });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load devices");
      }
      state.devices = data.devices || [];
      if (state.devices[0]) {
        document.getElementById("device-id").value = state.devices[0].id;
      }
      setStatus(authStatus, "Loaded " + state.devices.length + " device(s).", "ok");
    }

    async function loadOutputs() {
      const response = await fetch("/v1/outputs", { headers: authHeaders(true) });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load outputs");
      }
      state.outputs = data.outputs || [];
      renderOutputs();
      setStatus(outputsStatus, "Loaded " + state.outputs.length + " output(s).", "ok");
    }

    function collectRowValues(id) {
      const displayName = document.querySelector('[data-field="display_name"][data-id="' + id + '"]').value.trim();
      const profileType = document.querySelector('[data-field="profile_type"][data-id="' + id + '"]').value;
      const compatEntityId = document.querySelector('[data-field="compat_entity_id"][data-id="' + id + '"]').value.trim();
      const pulseRaw = document.querySelector('[data-field="pulse_ms"][data-id="' + id + '"]').value.trim();
      return {
        display_name: displayName,
        profile_type: profileType,
        compat_entity_id: compatEntityId,
        pulse_ms: pulseRaw ? Number(pulseRaw) : null
      };
    }

    async function saveOutput(id) {
      const response = await fetch("/v1/outputs/" + id + "/profile", {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify(collectRowValues(id))
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save output");
      }
      await loadOutputs();
      setStatus(outputsStatus, "Saved output " + data.channel + ".", "ok");
    }

    async function triggerCompatibility(domain, service, entityId) {
      document.getElementById("webhook-domain").value = domain;
      document.getElementById("webhook-service").value = service;
      document.getElementById("webhook-entity").value = entityId;
      document.getElementById("webhook-body").value = JSON.stringify({ entity_id: entityId });

      const response = await fetch("/api/services/" + domain + "/" + service, {
        method: "POST",
        headers: authHeaders(false),
        body: JSON.stringify({ entity_id: entityId })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Webhook call failed");
      }
      setStatus(webhookStatus, JSON.stringify(data, null, 2), "ok");
      setTimeout(loadOutputs, 800);
    }

    document.getElementById("login-btn").addEventListener("click", async () => {
      try {
        await login();
      } catch (error) {
        setStatus(authStatus, error.message, "error");
      }
    });

    document.getElementById("load-devices").addEventListener("click", async () => {
      try {
        await loadDevices();
      } catch (error) {
        setStatus(authStatus, error.message, "error");
      }
    });

    document.getElementById("load-outputs").addEventListener("click", async () => {
      try {
        await loadOutputs();
      } catch (error) {
        setStatus(outputsStatus, error.message, "error");
      }
    });

    document.getElementById("send-webhook").addEventListener("click", async () => {
      try {
        const domain = document.getElementById("webhook-domain").value.trim();
        const service = document.getElementById("webhook-service").value.trim();
        const entityId = document.getElementById("webhook-entity").value.trim();
        await triggerCompatibility(domain, service, entityId);
      } catch (error) {
        setStatus(webhookStatus, error.message, "error");
      }
    });

    document.getElementById("load-session").addEventListener("click", () => {
      state.token = localStorage.getItem("solace_admin_token") || "";
      setStatus(authStatus, state.token ? "Loaded admin JWT from local storage." : "No saved admin session found.", state.token ? "ok" : "");
    });

    document.getElementById("clear-session").addEventListener("click", () => {
      state.token = "";
      saveSession();
      setStatus(authStatus, "Cleared saved admin session.", "ok");
    });

    outputsBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.classList.contains("save-btn")) {
        try {
          await saveOutput(target.dataset.id);
        } catch (error) {
          setStatus(outputsStatus, error.message, "error");
        }
      }

      if (target.classList.contains("trigger-btn")) {
        try {
          const output = state.outputs.find((item) => item.id === target.dataset.id);
          if (!output) {
            throw new Error("Output not found in current table");
          }
          await triggerCompatibility(target.dataset.domain, target.dataset.action, output.compatEntityId);
        } catch (error) {
          setStatus(webhookStatus, error.message, "error");
        }
      }
    });

    if (state.token) {
      setStatus(authStatus, "Admin JWT restored from local storage. Click Load Outputs when ready.", "ok");
    }
  </script>
</body>
</html>`;
}

export async function registerConsoleRoutes(app: FastifyInstance) {
  app.get("/", async (_request, reply) => {
    reply.type("text/html").send(consoleHtml());
  });

  app.get("/console", async (_request, reply) => {
    reply.type("text/html").send(consoleHtml());
  });
}
