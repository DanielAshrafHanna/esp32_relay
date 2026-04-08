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
    .device-stack {
      display: grid;
      gap: 18px;
    }
    .site-stack {
      display: grid;
      gap: 16px;
    }
    .site-section {
      border: 1px solid rgba(24, 32, 39, 0.08);
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(245, 251, 250, 0.88), rgba(255,255,255,0.72)),
        repeating-linear-gradient(135deg, rgba(19,93,102,0.028), rgba(19,93,102,0.028) 10px, transparent 10px, transparent 20px);
      padding: 16px;
    }
    .site-section[open] {
      background:
        linear-gradient(180deg, rgba(239, 249, 248, 0.92), rgba(255,255,255,0.82)),
        repeating-linear-gradient(135deg, rgba(19,93,102,0.036), rgba(19,93,102,0.036) 10px, transparent 10px, transparent 20px);
    }
    .site-toggle {
      list-style: none;
      cursor: pointer;
    }
    .site-toggle::-webkit-details-marker {
      display: none;
    }
    .site-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .site-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .site-summary span {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 0.84rem;
      font-weight: 700;
    }
    .filter-strip {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .compact-note {
      font-size: 0.86rem;
      color: var(--muted);
      margin-bottom: 12px;
    }
    details.advanced-tools {
      border: 1px solid rgba(24, 32, 39, 0.08);
      border-radius: 18px;
      background: rgba(255,255,255,0.56);
      padding: 14px 16px;
    }
    details.advanced-tools summary {
      cursor: pointer;
      font-weight: 700;
      color: var(--ink);
      list-style: none;
    }
    details.advanced-tools summary::-webkit-details-marker {
      display: none;
    }
    .advanced-copy {
      margin: 10px 0 14px;
      color: var(--muted);
      font-size: 0.92rem;
    }
    .site-manager {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }
    .site-row {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) auto auto auto;
      gap: 10px;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid rgba(24, 32, 39, 0.08);
      border-radius: 14px;
      background: rgba(255,255,255,0.7);
    }
    .site-row-meta {
      font-size: 0.84rem;
      color: var(--muted);
      white-space: nowrap;
    }
    .discovery-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .device-section {
      border: 1px solid rgba(24, 32, 39, 0.08);
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,248,242,0.92)),
        radial-gradient(circle at top right, rgba(19,93,102,0.05), transparent 35%);
      padding: 0;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
    }
    .device-section[open] {
      border-color: rgba(19,93,102,0.16);
    }
    .device-toggle {
      list-style: none;
      cursor: pointer;
      padding: 16px;
    }
    .device-toggle::-webkit-details-marker {
      display: none;
    }
    .device-content {
      padding: 0 16px 16px;
      border-top: 1px solid rgba(24, 32, 39, 0.08);
      background: linear-gradient(180deg, rgba(255,255,255,0.76), rgba(248,244,236,0.68));
    }
    .device-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .device-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .device-meta span {
      display: inline-block;
      padding: 6px 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255,255,255,0.82);
      color: var(--muted);
      font-size: 0.84rem;
    }
    .device-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .device-summary span {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(19,93,102,0.08);
      color: var(--accent);
      font-size: 0.82rem;
      font-weight: 700;
    }
    .toggle-line {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.92rem;
      color: var(--ink);
    }
    .toggle-line input {
      width: auto;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.87rem;
    }
    .mini-btn {
      padding: 8px 10px;
      font-size: 0.84rem;
    }
    .muted { color: var(--muted); }
    @media (max-width: 980px) {
      .hero, .grid-4, .grid-3, .grid-2, .filter-strip { grid-template-columns: 1fr; }
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
        <p>Operator console for the cloud relay backend. Use this page to log in, inspect relay boards, switch each relay between <strong>gate</strong>, <strong>light</strong>, <strong>cover</strong>, <strong>switch</strong>, or <strong>generic relay</strong>, and trigger actions through the same middleware the app uses.</p>
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
      <div id="auth-status" class="status">No active admin session yet. Load Devices fetches board-level records and discovered MQTT boards. Load Outputs fetches the per-relay rows, profiles, and last known states for claimed boards.</div>
    </section>

    <section class="card" style="margin-bottom:20px;">
      <div class="toolbar">
        <h2>Sites</h2>
        <div class="muted">Keep clubs organized with simple location groups, then assign boards into them.</div>
      </div>
      <div class="grid-4">
        <div>
          <label for="new-site-name">New Site Name</label>
          <input id="new-site-name" placeholder="Downtown Club">
        </div>
        <div style="display:flex; align-items:end;">
          <button id="create-site-btn">Create Site</button>
        </div>
        <div style="grid-column: span 2;">
          <label>Current Sites</label>
          <div id="site-list" class="site-manager">
            <div class="muted">Load Devices to list sites.</div>
          </div>
        </div>
      </div>
      <div id="site-status" class="status">Create a site first if you want boards grouped somewhere other than the default Main Site.</div>
    </section>

    <section class="card" style="margin-bottom:20px;">
      <div class="toolbar">
        <h2>Discovered Boards</h2>
        <div class="muted">This is the normal board onboarding flow. Unknown ESP boards that connect to MQTT appear here so you can claim them into the right site.</div>
      </div>
      <div class="discovery-toolbar">
        <div id="discovery-summary" class="compact-note" style="margin:0;">Load Devices to refresh discovered MQTT boards.</div>
        <label class="toggle-line">
          <input type="checkbox" id="show-stale-discovery">
          Show stale discovered boards
        </label>
      </div>
      <div id="discovery-list"></div>
      <div id="discovery-status" class="status">Load Devices to refresh discovered MQTT boards.</div>
    </section>

    <section class="card" style="margin-bottom:20px;">
      <details class="advanced-tools">
        <summary>Advanced Tools</summary>
        <div class="advanced-copy">Use these only if discovery is unavailable or you want to test webhook behavior directly. Manual add flow: create the site first, enter the board MQTT hostname exactly as the ESP uses it, optionally keep the device key the same, choose the site, create the board, then paste the returned bootstrap line into <span class="mono">MQTT_BOOTSTRAP_USERS</span> before connecting the ESP.</div>

        <div class="toolbar">
          <h2>Manual Board Add</h2>
          <div class="muted">Fallback only. Discovery and claim is the preferred path.</div>
        </div>
        <div class="grid-4">
          <div>
            <label for="new-board-title">Board Title</label>
            <input id="new-board-title" placeholder="Dany Main Board">
          </div>
          <div>
            <label for="new-board-hostname">MQTT Hostname</label>
            <input id="new-board-hostname" placeholder="dany">
          </div>
          <div>
            <label for="new-board-device-key">Device Key</label>
            <input id="new-board-device-key" placeholder="Optional, defaults to MQTT hostname">
          </div>
          <div>
            <label for="new-board-site">Site</label>
            <select id="new-board-site">
              <option value="">Default site</option>
            </select>
          </div>
          <div>
            <label for="new-board-channels">Channel Count</label>
            <input id="new-board-channels" type="number" min="1" max="8" value="8">
          </div>
        </div>
        <div class="actions" style="margin-top:12px;">
          <button id="create-board-btn">Create Board</button>
        </div>
        <div id="provisioning-status" class="status">Manual board add returns the MQTT credential line you still need to paste into <span class="mono">MQTT_BOOTSTRAP_USERS</span>.</div>

        <div class="toolbar" style="margin-top:18px;">
          <h2>Webhook Tester</h2>
          <div class="muted">Useful for debugging entity mappings and compatibility calls.</div>
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
      </details>
    </section>

    <section class="card">
      <div class="toolbar">
        <h2>Relay Boards</h2>
        <div class="muted">Grouped by site, with lightweight filters so many clubs stay easy to scan.</div>
      </div>
      <div class="filter-strip">
        <div>
          <label for="board-search">Search Boards / Entities</label>
          <input id="board-search" placeholder="Search by board title, MQTT hostname, entity, or device key">
        </div>
        <div>
          <label for="site-filter">Site</label>
          <select id="site-filter">
            <option value="">All sites</option>
          </select>
        </div>
        <div>
          <label for="availability-filter">Availability</label>
          <select id="availability-filter">
            <option value="">All boards</option>
            <option value="online">Online only</option>
            <option value="offline">Offline only</option>
            <option value="unknown">Unknown only</option>
          </select>
        </div>
      </div>
      <div id="board-summary" class="compact-note">Load devices to organize boards by site.</div>
      <div class="actions" style="margin-bottom:12px;">
        <button class="secondary mini-btn" id="expand-sites-btn">Expand All Sites</button>
        <button class="secondary mini-btn" id="collapse-sites-btn">Collapse All Sites</button>
      </div>
      <div id="device-sections" class="device-stack"></div>
      <div id="outputs-status" class="status">Load outputs to begin.</div>
    </section>
  </div>

  <script>
    const state = {
      token: localStorage.getItem("solace_admin_token") || "",
      serviceToken: localStorage.getItem("solace_service_token") || "",
      outputs: [],
      devices: [],
      discoveredBoards: [],
      sites: [],
      siteCollapse: JSON.parse(localStorage.getItem("solace_site_collapse") || "{}"),
      boardCollapse: JSON.parse(localStorage.getItem("solace_board_collapse") || "{}")
    };

    const authStatus = document.getElementById("auth-status");
    const webhookStatus = document.getElementById("webhook-status");
    const provisioningStatus = document.getElementById("provisioning-status");
    const discoveryStatus = document.getElementById("discovery-status");
    const discoveryList = document.getElementById("discovery-list");
    const discoverySummary = document.getElementById("discovery-summary");
    const outputsStatus = document.getElementById("outputs-status");
    const deviceSections = document.getElementById("device-sections");
    const serviceTokenInput = document.getElementById("service-token");
    const siteStatus = document.getElementById("site-status");
    const boardSearchInput = document.getElementById("board-search");
    const siteFilterInput = document.getElementById("site-filter");
    const availabilityFilterInput = document.getElementById("availability-filter");
    const boardSummary = document.getElementById("board-summary");
    const newBoardSiteInput = document.getElementById("new-board-site");
    const siteList = document.getElementById("site-list");
    const showStaleDiscoveryInput = document.getElementById("show-stale-discovery");

    if (serviceTokenInput instanceof HTMLInputElement) {
      serviceTokenInput.value = state.serviceToken;
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function setStatus(node, message, kind) {
      node.textContent = message;
      node.className = "status" + (kind ? " " + kind : "");
    }

    function normalizedSiteName(device) {
      return (device.siteName && device.siteName.trim()) || "Unassigned Site";
    }

    function isSiteExpanded(siteName) {
      return state.siteCollapse[siteName] !== false;
    }

    function persistSiteCollapse() {
      localStorage.setItem("solace_site_collapse", JSON.stringify(state.siteCollapse));
    }

    function boardCollapseKey(device) {
      return device.id || device.mqttHostname || device.deviceKey;
    }

    function isBoardExpanded(device) {
      return state.boardCollapse[boardCollapseKey(device)] !== false;
    }

    function persistBoardCollapse() {
      localStorage.setItem("solace_board_collapse", JSON.stringify(state.boardCollapse));
    }

    function boardMatchesFilters(device, outputs) {
      const search = boardSearchInput instanceof HTMLInputElement ? boardSearchInput.value.trim().toLowerCase() : "";
      const siteFilter = siteFilterInput instanceof HTMLSelectElement ? siteFilterInput.value : "";
      const availabilityFilter = availabilityFilterInput instanceof HTMLSelectElement ? availabilityFilterInput.value : "";
      const siteName = normalizedSiteName(device);

      if (siteFilter && siteName !== siteFilter) {
        return false;
      }

      if (availabilityFilter && device.availability !== availabilityFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        device.displayName,
        device.deviceKey,
        device.mqttHostname,
        device.customerName || "",
        siteName,
        ...outputs.flatMap((output) => [output.displayName, output.compatEntityId || "", output.profileType])
      ].join(" ").toLowerCase();

      return haystack.includes(search);
    }

    function refreshSiteFilterOptions() {
      if (!(siteFilterInput instanceof HTMLSelectElement)) {
        return;
      }

      const currentValue = siteFilterInput.value;
      const siteNames = Array.from(new Set(state.devices.map((device) => normalizedSiteName(device)))).sort((a, b) => a.localeCompare(b));
      siteFilterInput.innerHTML = '<option value="">All sites</option>' + siteNames.map((siteName) =>
        '<option value="' + siteName.replace(/"/g, "&quot;") + '">' + siteName + '</option>'
      ).join("");

      if (siteNames.includes(currentValue)) {
        siteFilterInput.value = currentValue;
      }
    }

    function formatSiteLabel(site) {
      return site.customerName ? site.name + " (" + site.customerName + ")" : site.name;
    }

    function siteOptionsMarkup(selectedValue, placeholderLabel) {
      const options = [];
      if (placeholderLabel) {
        options.push('<option value="">' + escapeHtml(placeholderLabel) + '</option>');
      }

      for (const site of state.sites) {
        const selected = selectedValue === site.id ? " selected" : "";
        options.push('<option value="' + escapeHtml(site.id) + '"' + selected + '>' + escapeHtml(formatSiteLabel(site)) + '</option>');
      }

      return options.join("");
    }

    function renderSiteList() {
      if (!(siteList instanceof HTMLElement)) {
        return;
      }

      if (!state.sites.length) {
        siteList.innerHTML = '<div class="muted">No sites yet.</div>';
        return;
      }

      siteList.innerHTML = state.sites.map((site) => {
        return '<div class="site-row">' +
          '<input data-site-field="name" data-site-id="' + escapeHtml(site.id) + '" value="' + escapeHtml(site.name) + '">' +
          '<div class="site-row-meta">' + escapeHtml(site.customerName || "No customer") + '</div>' +
          '<div class="site-row-meta">' + site.boardCount + ' board(s)</div>' +
          '<div class="actions">' +
            '<button class="secondary mini-btn save-site-btn" data-site-id="' + escapeHtml(site.id) + '">Save</button>' +
            '<button class="warn mini-btn delete-site-btn" data-site-id="' + escapeHtml(site.id) + '" data-site-name="' + escapeHtml(site.name) + '">Delete</button>' +
          '</div>' +
        '</div>';
      }).join("");
    }

    function refreshSiteSelectors() {
      if (newBoardSiteInput instanceof HTMLSelectElement) {
        const currentValue = newBoardSiteInput.value;
        newBoardSiteInput.innerHTML = siteOptionsMarkup(currentValue, "Default site");
        if (state.sites.some((site) => site.id === currentValue)) {
          newBoardSiteInput.value = currentValue;
        }
      }

      renderSiteList();
    }

    function parseIsoTime(value) {
      if (!value) {
        return null;
      }
      const ms = Date.parse(value);
      return Number.isNaN(ms) ? null : ms;
    }

    function isStaleDiscovery(board) {
      const lastSeen = parseIsoTime(board.lastSeenAt);
      if (lastSeen === null) {
        return true;
      }

      const staleAfterMs = 15 * 60 * 1000;
      return board.availability !== "online" && (Date.now() - lastSeen) > staleAfterMs;
    }

    function formatLatency(ms) {
      if (ms === null || ms === undefined || Number.isNaN(ms)) {
        return "n/a";
      }
      return ms + " ms";
    }

    function buildLatencySummary(command) {
      const trace = command.resultPayload && typeof command.resultPayload === "object"
        ? (command.resultPayload.trace || {})
        : {};
      const createdAt = parseIsoTime(command.createdAt);
      const startedAt = parseIsoTime(command.startedAt);
      const publishAckAt = parseIsoTime(trace.last_publish_ack_at);
      const completedAt = parseIsoTime(command.completedAt);

      const pickupLatency = createdAt !== null && startedAt !== null ? startedAt - createdAt : null;
      const publishLatency = createdAt !== null && publishAckAt !== null ? publishAckAt - createdAt : null;
      const completionLatency = createdAt !== null && completedAt !== null ? completedAt - createdAt : null;

      return [
        "Command " + command.id,
        "Status: " + command.status,
        "Created -> gateway start: " + formatLatency(pickupLatency),
        "Created -> MQTT publish ack: " + formatLatency(publishLatency),
        "Created -> completed: " + formatLatency(completionLatency)
      ].join("\\n");
    }

    function buildDeviceTraceSummary(command) {
      const output = state.outputs.find((item) => item.id === command.outputId);
      if (!output) {
        return "";
      }

      const device = state.devices.find((item) => item.id === output.deviceId);
      if (!device || !device.lastTrace || device.lastTrace.relay !== output.channel) {
        return "";
      }

      const receivedAt = parseIsoTime(device.lastTrace.receivedAt);
      const createdAt = parseIsoTime(command.createdAt);
      const backendToDeviceTrace = createdAt !== null && receivedAt !== null ? receivedAt - createdAt : null;

      return [
        "Latest device trace:",
        "Device event: " + (device.lastTrace.eventType || "unknown"),
        "Created -> device trace received: " + formatLatency(backendToDeviceTrace),
        "Trace relay: " + (device.lastTrace.relay ?? "--"),
        "Trace payload: " + (device.lastTrace.commandPayload || "--"),
        "Trace state after: " + (device.lastTrace.stateAfter || "--")
      ].join("\\n");
    }

    async function fetchCommandTrace(commandId, attempts = 12) {
      if (!state.token) {
        return null;
      }

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const response = await fetch("/v1/commands/" + commandId, {
          headers: authHeaders(true)
        });
        if (!response.ok) {
          return null;
        }

        const command = await response.json();
        const trace = command.resultPayload && typeof command.resultPayload === "object"
          ? (command.resultPayload.trace || {})
          : {};

        if (command.startedAt || trace.last_publish_ack_at || command.completedAt) {
          return command;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      return null;
    }

    function saveSession() {
      if (state.token) {
        localStorage.setItem("solace_admin_token", state.token);
      } else {
        localStorage.removeItem("solace_admin_token");
      }

      if (state.serviceToken) {
        localStorage.setItem("solace_service_token", state.serviceToken);
      } else {
        localStorage.removeItem("solace_service_token");
      }
    }

    function authHeaders(useAdmin = true, withJson = true) {
      const headers = {};
      if (!useAdmin) {
        if (withJson) {
          headers["Content-Type"] = "application/json";
        }
        headers["Authorization"] = "Bearer " + (serviceTokenInput instanceof HTMLInputElement ? serviceTokenInput.value.trim() : "");
        return headers;
      }
      if (withJson) {
        headers["Content-Type"] = "application/json";
      }
      headers["Authorization"] = "Bearer " + state.token;
      return headers;
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

    function defaultCompatDomain(profileType) {
      if (profileType === "light") return "light";
      if (profileType === "gate") return "lock";
      if (profileType === "cover") return "cover";
      return "switch";
    }

    function defaultCompatEntityId(output, profileType) {
      return defaultCompatDomain(profileType) + "." + output.mqttHostname + ".relay" + output.channel;
    }

    function isDefaultStyleEntityId(output, entityId) {
      if (!output || !entityId) {
        return entityId === "";
      }

      const normalized = entityId.trim();
      if (!normalized) {
        return true;
      }

      const profileTypes = ["generic_relay", "switch", "light", "gate", "cover"];
      if (normalized === output.compatEntityId) {
        return true;
      }

      return profileTypes.some((profileType) => normalized === defaultCompatEntityId(output, profileType));
    }

    function formatTelemetryUptime(seconds) {
      if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) {
        return "Uptime: --";
      }

      const total = Number(seconds);
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      if (days > 0) {
        return "Uptime: " + days + "d " + hours + "h";
      }
      if (hours > 0) {
        return "Uptime: " + hours + "h " + minutes + "m";
      }
      return "Uptime: " + minutes + "m";
    }

    function formatBytes(bytes) {
      if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) {
        return "--";
      }
      const value = Number(bytes);
      if (value >= 1024 * 1024) {
        return (value / (1024 * 1024)).toFixed(1) + " MB";
      }
      if (value >= 1024) {
        return Math.round(value / 1024) + " KB";
      }
      return value + " B";
    }

    function telemetryBadges(device) {
      const telemetry = device.telemetry || {};
      return [
        formatTelemetryUptime(telemetry.uptimeS),
        "RSSI: " + (telemetry.wifiRssi ?? "--"),
        "Heap: " + formatBytes(telemetry.freeHeap),
        "MQTT: " + (telemetry.mqttConnected === null || telemetry.mqttConnected === undefined ? "--" : (telemetry.mqttConnected ? "connected" : "down"))
      ];
    }

    function getCurrentProfileType(id) {
      const select = document.querySelector('[data-field="profile_type"][data-id="' + id + '"]');
      if (select instanceof HTMLSelectElement) {
        return select.value;
      }
      const output = state.outputs.find((item) => item.id === id);
      return output ? output.profileType : "generic_relay";
    }

    function getCurrentEntityId(id) {
      const input = document.querySelector('[data-field="compat_entity_id"][data-id="' + id + '"]');
      if (input instanceof HTMLInputElement && input.value.trim()) {
        return input.value.trim();
      }

      const output = state.outputs.find((item) => item.id === id);
      if (!output) {
        return "";
      }

      return defaultCompatEntityId(output, getCurrentProfileType(id));
    }

    function applyWebhookPreview(spec) {
      document.getElementById("webhook-domain").value = spec.domain;
      document.getElementById("webhook-service").value = spec.service;
      document.getElementById("webhook-entity").value = spec.entityId;
      document.getElementById("webhook-body").value = JSON.stringify({ entity_id: spec.entityId });
    }

    function buildWebhookSpec(outputId, domain, service) {
      const entityId = getCurrentEntityId(outputId);
      const token = serviceTokenInput instanceof HTMLInputElement ? serviceTokenInput.value.trim() : "";
      const authToken = token || "<SERVICE_TOKEN>";
      const spec = {
        domain,
        service,
        entityId,
      };

      return {
        ...spec,
        curl:
          "curl -X POST " +
          window.location.origin +
          "/api/services/" +
          domain +
          "/" +
          service +
          ' -H "Authorization: Bearer ' +
          authToken +
          '" -H "Content-Type: application/json" -d ' +
          "'" +
          JSON.stringify({ entity_id: entityId }) +
          "'"
      };
    }

    function renderActionControls(outputId, profileType) {
      const actions = profileActions(profileType);
      const actionButtons = actions
        .map((action) => '<button data-action="' + action.service + '" data-domain="' + action.domain + '" data-id="' + outputId + '" class="trigger-btn secondary mini-btn">' + action.label + '</button>')
        .join("");
      const copyButtons = actions
        .map((action) => '<button data-action="' + action.service + '" data-domain="' + action.domain + '" data-id="' + outputId + '" class="copy-webhook-btn secondary mini-btn">Copy ' + action.label + ' cURL</button>')
        .join("");

      return '<div class="actions" style="margin-bottom:8px;">' + actionButtons + '</div>' +
        '<div class="actions" style="margin-bottom:8px;">' + copyButtons + '</div>' +
        '<div class="actions"><button class="save-btn" data-id="' + outputId + '">Save Relay</button></div>';
    }

    function updateActionControlsForOutput(id) {
      const cell = document.querySelector('[data-actions-cell="' + id + '"]');
      if (!(cell instanceof HTMLElement)) {
        return;
      }

      cell.innerHTML = renderActionControls(id, getCurrentProfileType(id));
    }

    async function copyWebhookSpec(outputId, domain, service) {
      const spec = buildWebhookSpec(outputId, domain, service);
      applyWebhookPreview(spec);
      await navigator.clipboard.writeText(spec.curl);
      setStatus(webhookStatus, 'Copied ' + domain + '.' + service + ' webhook for ' + spec.entityId + '.', "ok");
    }

    function renderOutputs() {
      deviceSections.innerHTML = "";
      if (!state.outputs.length && !state.devices.length) {
        deviceSections.innerHTML = '<div class="muted">No outputs loaded yet.</div>';
        if (boardSummary) {
          boardSummary.textContent = "Load devices to organize boards by site.";
        }
        return;
      }

      const outputsByDevice = new Map();
      for (const output of state.outputs) {
        if (!outputsByDevice.has(output.deviceId)) {
          outputsByDevice.set(output.deviceId, []);
        }
        outputsByDevice.get(output.deviceId).push(output);
      }

      const devices = state.devices.length
        ? state.devices
        : Array.from(outputsByDevice.entries()).map(([deviceId, outputs]) => ({
            id: deviceId,
            customerName: null,
            siteName: "Unassigned Site",
            displayName: outputs[0].deviceDisplayName,
            deviceKey: outputs[0].deviceKey,
            mqttHostname: outputs[0].mqttHostname,
            availability: "unknown",
            desiredEnabled: outputs[0].deviceDesiredEnabled
          }));

      refreshSiteFilterOptions();

      const filteredDevices = devices.filter((device) => {
        const outputs = (outputsByDevice.get(device.id) || []).sort((a, b) => a.channel - b.channel);
        return boardMatchesFilters(device, outputs);
      });

      if (boardSummary) {
        const siteCount = new Set(filteredDevices.map((device) => normalizedSiteName(device))).size;
        boardSummary.textContent = "Showing " + filteredDevices.length + " board(s) across " + siteCount + " site(s).";
      }

      if (!filteredDevices.length) {
        deviceSections.innerHTML = '<div class="muted">No boards match the current filters.</div>';
        return;
      }

      const devicesBySite = new Map();
      for (const device of filteredDevices) {
        const siteName = normalizedSiteName(device);
        if (!devicesBySite.has(siteName)) {
          devicesBySite.set(siteName, []);
        }
        devicesBySite.get(siteName).push(device);
      }

      deviceSections.className = "site-stack";

      for (const [siteName, siteDevices] of Array.from(devicesBySite.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
        const siteExpanded = isSiteExpanded(siteName);

        const onlineCount = siteDevices.filter((device) => device.availability === "online").length;
        const offlineCount = siteDevices.filter((device) => device.availability === "offline").length;
        const siteCustomerNames = Array.from(new Set(siteDevices.map((device) => device.customerName).filter(Boolean)));

        const siteBoards = siteDevices.map((device) => {
          const outputs = (outputsByDevice.get(device.id) || []).sort((a, b) => a.channel - b.channel);
          const boardExpanded = isBoardExpanded(device);
          const boardKey = boardCollapseKey(device);

          const rows = outputs.map((output) => {
            return \`
              <tr>
                <td><strong>\${output.channel}</strong><div class="mono muted">\${output.id.slice(0, 8)}</div></td>
                <td><span class="\${output.lastKnownState === "ON" ? "state-on" : "state-off"}">\${output.lastKnownState}</span></td>
                <td><input data-field="display_name" data-id="\${output.id}" value="\${output.displayName}"></td>
                <td>
                  <select data-field="profile_type" data-id="\${output.id}">
                    <option value="generic_relay" \${output.profileType === "generic_relay" ? "selected" : ""}>generic relay</option>
                    <option value="light" \${output.profileType === "light" ? "selected" : ""}>light</option>
                    <option value="switch" \${output.profileType === "switch" ? "selected" : ""}>switch</option>
                    <option value="gate" \${output.profileType === "gate" ? "selected" : ""}>gate</option>
                    <option value="cover" \${output.profileType === "cover" ? "selected" : ""}>cover</option>
                  </select>
                </td>
                <td><input class="mono" data-field="compat_entity_id" data-id="\${output.id}" value="\${output.compatEntityId || ""}"></td>
                <td><input data-field="pulse_ms" data-id="\${output.id}" type="number" value="\${output.pulseMs || ""}" placeholder="2000"></td>
                <td data-actions-cell="\${output.id}">
                  \${renderActionControls(output.id, output.profileType)}
                </td>
              </tr>
            \`;
          }).join("");

          return \`
            <details class="device-section" data-device-key="\${escapeHtml(boardKey)}" \${boardExpanded ? "open" : ""}>
              <summary class="device-toggle">
                <div class="device-head">
                  <div>
                    <h3>\${device.displayName || device.deviceKey}</h3>
                    <div class="device-meta">
                      <span class="mono">MQTT: \${device.mqttHostname}</span>
                      <span>Availability: \${device.availability}</span>
                      <span>Key: \${device.deviceKey}</span>
                      \${telemetryBadges(device).map((badge) => '<span>' + badge + '</span>').join("")}
                    </div>
                    <div class="device-summary">
                      <span>\${outputs.length} relay row(s)</span>
                      <span>\${boardExpanded ? "Expanded" : "Collapsed"}</span>
                    </div>
                  </div>
                </div>
              </summary>
              <div class="device-content">
                <div class="device-head">
                  <div></div>
                  <div style="min-width:320px;">
                    <label>Board Title</label>
                    <input data-device-field="display_name" data-device-id="\${device.id}" value="\${device.displayName || ""}" placeholder="Front Gate Board">
                    <label style="margin-top:10px;">Site</label>
                    <select data-device-field="site_id" data-device-id="\${device.id}">
                      \${siteOptionsMarkup(device.siteId || "", "Unassigned")}
                    </select>
                    <div class="actions" style="margin-top:10px; align-items:center;">
                      <label class="toggle-line">
                        <input type="checkbox" data-device-field="desired_enabled" data-device-id="\${device.id}" \${device.desiredEnabled ? "checked" : ""}>
                        Enable this relay board for webhook/API commands
                      </label>
                      <button class="secondary save-device-btn" data-device-id="\${device.id}">Save Board</button>
                      <button class="warn delete-device-btn" data-device-id="\${device.id}" data-device-name="\${device.displayName || device.deviceKey}">Delete Board</button>
                    </div>
                  </div>
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
                    <tbody>\${rows || '<tr><td colspan="7" class="muted">No outputs for this device.</td></tr>'}</tbody>
                  </table>
                </div>
              </div>
            </details>
          \`;
        }).join("");

        const siteMarkup = \`
          <details class="site-section" data-site-name="\${escapeHtml(siteName)}" \${siteExpanded ? "open" : ""}>
            <summary class="site-toggle">
              <div class="site-head">
                <div>
                  <h3>\${siteName}</h3>
                  <div class="muted">\${siteCustomerNames.join(" · ") || "No customer label"}</div>
                </div>
                <div class="site-summary">
                  <span>\${siteDevices.length} board(s)</span>
                  <span>\${onlineCount} online</span>
                  <span>\${offlineCount} offline</span>
                  <span>\${siteExpanded ? "Expanded" : "Collapsed"}</span>
                </div>
              </div>
            </summary>
            <div class="device-stack">\${siteBoards}</div>
          </details>
        \`;

        deviceSections.insertAdjacentHTML("beforeend", siteMarkup);
      }
    }

    function renderDiscoveredBoards() {
      const showStale = showStaleDiscoveryInput instanceof HTMLInputElement ? showStaleDiscoveryInput.checked : false;
      const visibleBoards = state.discoveredBoards.filter((board) => showStale || !isStaleDiscovery(board));
      const staleCount = state.discoveredBoards.length - visibleBoards.length;

      if (discoverySummary instanceof HTMLElement) {
        discoverySummary.textContent = visibleBoards.length + " visible discovered board(s)" + (staleCount ? " · " + staleCount + " stale hidden" : "");
      }

      if (!visibleBoards.length) {
        discoveryList.innerHTML = '<div class="muted">No unclaimed MQTT boards discovered yet.</div>';
        return;
      }

      discoveryList.innerHTML = visibleBoards.map((board) => \`
        <div class="device-section" style="margin-bottom:12px;">
          <div class="device-head">
            <div>
              <h3>\${board.mqttHostname}</h3>
              <div class="device-meta">
                <span>Availability: \${board.availability}</span>
                <span>Highest Channel Seen: \${board.highestChannel || "unknown"}</span>
                <span class="mono">Last Seen: \${board.lastSeenAt}</span>
              </div>
            </div>
            <div style="min-width:340px;">
              <label>Board Title</label>
              <input data-discovery-field="display_name" data-mqtt-hostname="\${board.mqttHostname}" value="">
              <label style="margin-top:10px;">Device Key</label>
              <input data-discovery-field="device_key" data-mqtt-hostname="\${board.mqttHostname}" value="\${board.mqttHostname}">
              <label style="margin-top:10px;">Site</label>
              <select data-discovery-field="site_id" data-mqtt-hostname="\${board.mqttHostname}">
                \${siteOptionsMarkup("", "Default site")}
              </select>
              <div class="actions" style="margin-top:10px;">
                <button class="claim-board-btn" data-mqtt-hostname="\${board.mqttHostname}" data-channel-count="\${board.highestChannel || 8}">Claim Board</button>
                <button class="secondary dismiss-board-btn" data-mqtt-hostname="\${board.mqttHostname}">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      \`).join("");
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

    async function loadSites(silent = false) {
      const response = await fetch("/v1/sites", {
        headers: authHeaders(true),
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load sites");
      }

      state.sites = data.sites || [];
      refreshSiteSelectors();

      if (!silent) {
        setStatus(siteStatus, "Loaded " + state.sites.length + " site(s).", "ok");
      }
    }

    async function loadDevices(silent = false) {
      await loadSites(true);
      const response = await fetch("/v1/devices", {
        headers: authHeaders(true),
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load devices");
      }
      state.devices = data.devices || [];
      if (state.devices[0]) {
        document.getElementById("device-id").value = state.devices[0].id;
      }
      if (!silent) {
        setStatus(authStatus, "Loaded " + state.devices.length + " device(s).", "ok");
      }
      await loadDiscoveredBoards(true);
      renderOutputs();
    }

    async function loadDiscoveredBoards(silent = false) {
      const response = await fetch("/v1/discovery/boards", {
        headers: authHeaders(true),
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load discovered boards");
      }
      state.discoveredBoards = data.boards || [];
      renderDiscoveredBoards();
      if (!silent) {
        setStatus(discoveryStatus, "Loaded " + state.discoveredBoards.length + " discovered board(s).", "ok");
      }
    }

    async function loadOutputs() {
      if (!state.devices.length) {
        await loadDevices(true);
      }
      const response = await fetch("/v1/outputs", {
        headers: authHeaders(true),
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load outputs");
      }
      state.outputs = data.outputs || [];
      renderOutputs();
      setStatus(outputsStatus, "Loaded " + state.outputs.length + " output(s).", "ok");
    }

    async function autoLoadConsole() {
      if (!state.token) {
        return;
      }

      setStatus(authStatus, "Restored saved session. Loading sites, boards, and outputs...", "ok");
      try {
        await loadDevices(true);
        await loadOutputs();
        setStatus(authStatus, "Saved session restored. Boards and outputs are up to date.", "ok");
      } catch (error) {
        setStatus(authStatus, error.message || "Failed to auto-load console data.", "error");
      }
    }

    function collectDeviceValues(id) {
      const siteSelect = document.querySelector('[data-device-field="site_id"][data-device-id="' + id + '"]');
      return {
        display_name: document.querySelector('[data-device-field="display_name"][data-device-id="' + id + '"]').value.trim(),
        desired_enabled: document.querySelector('[data-device-field="desired_enabled"][data-device-id="' + id + '"]').checked,
        site_id: siteSelect instanceof HTMLSelectElement ? (siteSelect.value || null) : undefined
      };
    }

    async function saveDevice(id) {
      const response = await fetch("/v1/devices/" + id, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify(collectDeviceValues(id))
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save device");
      }
      state.devices = state.devices.map((device) => device.id === data.id ? data : device);
      state.outputs = state.outputs.map((output) => output.deviceId === data.id
        ? { ...output, deviceDisplayName: data.displayName, deviceDesiredEnabled: data.desiredEnabled }
        : output);
      await loadSites(true);
      refreshSiteSelectors();
      renderOutputs();
      setStatus(outputsStatus, "Saved board " + data.displayName + ".", "ok");
    }

    async function deleteDevice(id, name) {
      const confirmed = window.confirm('Delete board "' + name + '"? This removes the board, its relay outputs, credentials, and command history references tied by cascade.');
      if (!confirmed) {
        return;
      }

      const response = await fetch("/v1/devices/" + id, {
        method: "DELETE",
        headers: authHeaders(true, false)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete board");
      }

      await loadSites(true);
      await loadDevices(true);
      await loadOutputs();
      setStatus(outputsStatus, "Deleted board " + (data.deleted?.displayName || name) + ".", "ok");
    }

    function collectRowValues(id) {
      const output = state.outputs.find((item) => item.id === id);
      const displayName = document.querySelector('[data-field="display_name"][data-id="' + id + '"]').value.trim();
      const profileType = document.querySelector('[data-field="profile_type"][data-id="' + id + '"]').value;
      const compatEntityId = document.querySelector('[data-field="compat_entity_id"][data-id="' + id + '"]').value.trim();
      const pulseRaw = document.querySelector('[data-field="pulse_ms"][data-id="' + id + '"]').value.trim();
      const payload = {
        display_name: displayName,
        profile_type: profileType,
        pulse_ms: pulseRaw ? Number(pulseRaw) : null
      };

      if (!output) {
        payload.compat_entity_id = compatEntityId;
        return payload;
      }

      const shouldAutoRotateEntity =
        profileType !== output.profileType &&
        isDefaultStyleEntityId(output, compatEntityId);

      if (!shouldAutoRotateEntity) {
        payload.compat_entity_id = compatEntityId;
      }

      return payload;
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
      state.outputs = state.outputs.map((output) => output.id === id ? data : output);
      renderOutputs();
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

      let statusMessage = JSON.stringify(data, null, 2);
      if (data.commands && data.commands.length === 1 && data.commands[0].id) {
        const tracedCommand = await fetchCommandTrace(data.commands[0].id);
        if (tracedCommand) {
          await loadDevices(true);
          const deviceTraceSummary = buildDeviceTraceSummary(tracedCommand);
          statusMessage =
            buildLatencySummary(tracedCommand) +
            (deviceTraceSummary ? "\\n\\n" + deviceTraceSummary : "") +
            "\\n\\n" +
            JSON.stringify(tracedCommand, null, 2);
        }
      }

      setStatus(webhookStatus, statusMessage, "ok");
      setTimeout(loadOutputs, 800);
    }

    async function createBoard() {
      const displayName = document.getElementById("new-board-title").value.trim();
      const mqttHostname = document.getElementById("new-board-hostname").value.trim();
      const deviceKey = document.getElementById("new-board-device-key").value.trim();
      const channelCountRaw = document.getElementById("new-board-channels").value.trim();
      const siteId = newBoardSiteInput instanceof HTMLSelectElement ? (newBoardSiteInput.value || null) : null;
      const response = await fetch("/v1/provisioning/boards", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          display_name: displayName,
          mqtt_hostname: mqttHostname,
          device_key: deviceKey || undefined,
          site_id: siteId,
          channel_count: channelCountRaw ? Number(channelCountRaw) : 8
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create board");
      }

      state.devices.push(data.device);
      state.outputs = state.outputs
        .filter((output) => output.deviceId !== data.device.id)
        .concat(data.outputs || []);
      state.discoveredBoards = state.discoveredBoards.filter((board) => board.mqttHostname !== data.device.mqttHostname);
      await loadSites(true);
      renderOutputs();
      renderDiscoveredBoards();

      const bootstrapLine = data.mqttBootstrapEntry || "";
      const credentials = data.credentials || {};
      setStatus(
        provisioningStatus,
        [
          "Board created: " + (data.device.displayName || data.device.deviceKey),
          "Device ID: " + data.device.id,
          "MQTT username: " + (credentials.username || ""),
          "MQTT password: " + (credentials.password || ""),
          "Add this line to secure broker MQTT_BOOTSTRAP_USERS:",
          bootstrapLine
        ].join("\\n"),
        "ok"
      );

      document.getElementById("new-board-device-key").value = data.device.deviceKey || "";
      document.getElementById("new-board-hostname").value = data.device.mqttHostname || "";
    }

    async function claimDiscoveredBoard(mqttHostname, channelCount) {
      const displayName = document.querySelector('[data-discovery-field="display_name"][data-mqtt-hostname="' + mqttHostname + '"]').value.trim();
      const deviceKey = document.querySelector('[data-discovery-field="device_key"][data-mqtt-hostname="' + mqttHostname + '"]').value.trim();
      const siteSelect = document.querySelector('[data-discovery-field="site_id"][data-mqtt-hostname="' + mqttHostname + '"]');
      const response = await fetch("/v1/discovery/boards/" + encodeURIComponent(mqttHostname) + "/claim", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          display_name: displayName || undefined,
          device_key: deviceKey || undefined,
          site_id: siteSelect instanceof HTMLSelectElement ? (siteSelect.value || null) : null,
          channel_count: channelCount ? Number(channelCount) : 8
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to claim discovered board");
      }

      state.devices.push(data.device);
      state.outputs = state.outputs
        .filter((output) => output.deviceId !== data.device.id)
        .concat(data.outputs || []);
      state.discoveredBoards = state.discoveredBoards.filter((board) => board.mqttHostname !== mqttHostname);
      await loadSites(true);
      renderDiscoveredBoards();
      renderOutputs();

      const bootstrapLine = data.mqttBootstrapEntry || "";
      const credentials = data.credentials || {};
      setStatus(
        provisioningStatus,
        [
          "Claimed board: " + (data.device.displayName || data.device.deviceKey),
          "MQTT username: " + (credentials.username || ""),
          "MQTT password: " + (credentials.password || ""),
          "Add this line to secure broker MQTT_BOOTSTRAP_USERS:",
          bootstrapLine
        ].join("\\n"),
        "ok"
      );
      setStatus(discoveryStatus, "Claimed discovered board " + mqttHostname + ".", "ok");
    }

    async function dismissDiscoveredBoard(mqttHostname) {
      const response = await fetch("/v1/discovery/boards/" + encodeURIComponent(mqttHostname), {
        method: "DELETE",
        headers: authHeaders(true, false)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to dismiss discovered board");
      }

      state.discoveredBoards = state.discoveredBoards.filter((board) => board.mqttHostname !== mqttHostname);
      renderDiscoveredBoards();
      setStatus(discoveryStatus, "Dismissed discovered board " + (data.deleted?.mqttHostname || mqttHostname) + ".", "ok");
    }

    async function createSite() {
      const siteNameInput = document.getElementById("new-site-name");
      const siteName = siteNameInput instanceof HTMLInputElement ? siteNameInput.value.trim() : "";
      const response = await fetch("/v1/sites", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ name: siteName })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create site");
      }

      state.sites.push(data);
      state.sites.sort((a, b) => formatSiteLabel(a).localeCompare(formatSiteLabel(b)));
      refreshSiteSelectors();
      renderDiscoveredBoards();
      renderOutputs();

      if (siteNameInput instanceof HTMLInputElement) {
        siteNameInput.value = "";
      }
      if (newBoardSiteInput instanceof HTMLSelectElement) {
        newBoardSiteInput.value = data.id;
      }

      setStatus(siteStatus, "Created site " + data.name + ".", "ok");
    }

    async function saveSite(id) {
      const nameInput = document.querySelector('[data-site-field="name"][data-site-id="' + id + '"]');
      const response = await fetch("/v1/sites/" + id, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({
          name: nameInput instanceof HTMLInputElement ? nameInput.value.trim() : ""
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save site");
      }

      state.sites = state.sites.map((site) => site.id === data.id ? data : site);
      state.devices = state.devices.map((device) => device.siteId === data.id ? { ...device, siteName: data.name } : device);
      refreshSiteSelectors();
      renderOutputs();
      setStatus(siteStatus, "Saved site " + data.name + ".", "ok");
    }

    async function deleteSite(id, name) {
      const confirmed = window.confirm('Delete site "' + name + '"? This only works if the site has no boards assigned.');
      if (!confirmed) {
        return;
      }

      const response = await fetch("/v1/sites/" + id, {
        method: "DELETE",
        headers: authHeaders(true, false)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete site");
      }

      state.sites = state.sites.filter((site) => site.id !== id);
      refreshSiteSelectors();
      renderOutputs();
      setStatus(siteStatus, "Deleted site " + (data.deleted?.name || name) + ".", "ok");
    }

    function maybeRotateEntityIdForProfileChange(id) {
      const output = state.outputs.find((item) => item.id === id);
      if (!output) {
        return;
      }

      const profileSelect = document.querySelector('[data-field="profile_type"][data-id="' + id + '"]');
      const entityInput = document.querySelector('[data-field="compat_entity_id"][data-id="' + id + '"]');
      if (!(profileSelect instanceof HTMLSelectElement) || !(entityInput instanceof HTMLInputElement)) {
        return;
      }

      const currentValue = entityInput.value.trim();
      const shouldRotate = isDefaultStyleEntityId(output, currentValue);

      if (!shouldRotate) {
        return;
      }

      entityInput.value = defaultCompatEntityId(output, profileSelect.value);
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

    document.getElementById("create-board-btn").addEventListener("click", async () => {
      try {
        await createBoard();
      } catch (error) {
        setStatus(provisioningStatus, error.message, "error");
      }
    });

    document.getElementById("create-site-btn").addEventListener("click", async () => {
      try {
        await createSite();
      } catch (error) {
        setStatus(siteStatus, error.message, "error");
      }
    });

    document.getElementById("load-session").addEventListener("click", () => {
      state.token = localStorage.getItem("solace_admin_token") || "";
      state.serviceToken = localStorage.getItem("solace_service_token") || "";
      if (serviceTokenInput instanceof HTMLInputElement) {
        serviceTokenInput.value = state.serviceToken;
      }
      if (state.token) {
        autoLoadConsole();
      } else {
        setStatus(authStatus, "No saved admin session found.", "");
      }
    });

    document.getElementById("clear-session").addEventListener("click", () => {
      state.token = "";
      state.serviceToken = "";
      if (serviceTokenInput instanceof HTMLInputElement) {
        serviceTokenInput.value = "";
      }
      saveSession();
      setStatus(authStatus, "Cleared saved admin session and saved service token.", "ok");
    });

    if (serviceTokenInput instanceof HTMLInputElement) {
      serviceTokenInput.addEventListener("change", () => {
        state.serviceToken = serviceTokenInput.value.trim();
        saveSession();
      });
      serviceTokenInput.addEventListener("input", () => {
        state.serviceToken = serviceTokenInput.value.trim();
      });
    }

    if (boardSearchInput instanceof HTMLInputElement) {
      boardSearchInput.addEventListener("input", () => renderOutputs());
    }

    if (siteFilterInput instanceof HTMLSelectElement) {
      siteFilterInput.addEventListener("change", () => renderOutputs());
    }

    if (availabilityFilterInput instanceof HTMLSelectElement) {
      availabilityFilterInput.addEventListener("change", () => renderOutputs());
    }

    if (showStaleDiscoveryInput instanceof HTMLInputElement) {
      showStaleDiscoveryInput.addEventListener("change", () => renderDiscoveredBoards());
    }

    const expandSitesButton = document.getElementById("expand-sites-btn");
    if (expandSitesButton instanceof HTMLButtonElement) {
      expandSitesButton.addEventListener("click", () => {
        for (const siteName of new Set(state.devices.map((device) => normalizedSiteName(device)))) {
          state.siteCollapse[siteName] = true;
        }
        persistSiteCollapse();
        renderOutputs();
      });
    }

      const collapseSitesButton = document.getElementById("collapse-sites-btn");
      if (collapseSitesButton instanceof HTMLButtonElement) {
        collapseSitesButton.addEventListener("click", () => {
          for (const siteName of new Set(state.devices.map((device) => normalizedSiteName(device)))) {
            state.siteCollapse[siteName] = false;
        }
        persistSiteCollapse();
        renderOutputs();
      });
    }

      deviceSections.addEventListener("toggle", (event) => {
        const rawTarget = event.target;
      if (!(rawTarget instanceof HTMLDetailsElement)) {
        return;
      }

      if (rawTarget.matches(".site-section[data-site-name]")) {
        const siteName = rawTarget.dataset.siteName || "";
        if (!siteName) {
          return;
        }

        state.siteCollapse[siteName] = rawTarget.open;
        persistSiteCollapse();
        return;
      }

      if (rawTarget.matches(".device-section[data-device-key]")) {
        const deviceKey = rawTarget.dataset.deviceKey || "";
        if (!deviceKey) {
          return;
        }

        state.boardCollapse[deviceKey] = rawTarget.open;
        persistBoardCollapse();
      }
    }, true);

    deviceSections.addEventListener("change", (event) => {
      const rawTarget = event.target;
      if (!(rawTarget instanceof HTMLElement)) {
        return;
      }

      if (rawTarget.matches('select[data-field="profile_type"]')) {
        maybeRotateEntityIdForProfileChange(rawTarget.dataset.id);
        updateActionControlsForOutput(rawTarget.dataset.id);
      }
    });

    async function handleBoardActionClick(event) {
      const rawTarget = event.target;
      if (!(rawTarget instanceof HTMLElement)) {
        return;
      }

      const target = rawTarget.closest("button");
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      if (target.classList.contains("save-device-btn")) {
        try {
          await saveDevice(target.dataset.deviceId);
        } catch (error) {
          setStatus(outputsStatus, error.message, "error");
        }
      }

      if (target.classList.contains("delete-device-btn")) {
        try {
          await deleteDevice(target.dataset.deviceId, target.dataset.deviceName || "this board");
        } catch (error) {
          setStatus(outputsStatus, error.message, "error");
        }
      }

      if (target.classList.contains("claim-board-btn")) {
        try {
          await claimDiscoveredBoard(target.dataset.mqttHostname, target.dataset.channelCount);
        } catch (error) {
          setStatus(discoveryStatus, error.message, "error");
        }
      }

      if (target.classList.contains("dismiss-board-btn")) {
        try {
          await dismissDiscoveredBoard(target.dataset.mqttHostname);
        } catch (error) {
          setStatus(discoveryStatus, error.message, "error");
        }
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

      if (target.classList.contains("copy-webhook-btn")) {
        try {
          await copyWebhookSpec(target.dataset.id, target.dataset.domain, target.dataset.action);
        } catch (error) {
          setStatus(webhookStatus, error.message, "error");
        }
      }
    }

    deviceSections.addEventListener("click", handleBoardActionClick);
    discoveryList.addEventListener("click", handleBoardActionClick);
    if (siteList instanceof HTMLElement) {
      siteList.addEventListener("click", async (event) => {
        const rawTarget = event.target;
        if (!(rawTarget instanceof HTMLElement)) {
          return;
        }

        const target = rawTarget.closest("button");
        if (!(target instanceof HTMLButtonElement)) {
          return;
        }

        if (target.classList.contains("save-site-btn")) {
          try {
            await saveSite(target.dataset.siteId);
          } catch (error) {
            setStatus(siteStatus, error.message, "error");
          }
        }

        if (target.classList.contains("delete-site-btn")) {
          try {
            await deleteSite(target.dataset.siteId, target.dataset.siteName || "this site");
          } catch (error) {
            setStatus(siteStatus, error.message, "error");
          }
        }
      });
    }

    if (state.token) {
      autoLoadConsole();
    }
  </script>
</body>
</html>`;
}

export async function registerConsoleRoutes(app: FastifyInstance) {
  app.get("/", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    reply.type("text/html").send(consoleHtml());
  });

  app.get("/console", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    reply.type("text/html").send(consoleHtml());
  });
}
